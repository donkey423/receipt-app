import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] || "all";
const outDir = path.join(root, "scratch", "test-modules");

async function loadTs(relPath) {
  const absPath = path.join(root, relPath);
  const source = await readFile(absPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      isolatedModules: true,
    },
    fileName: absPath,
  }).outputText;

  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, relPath.replace(/[\\/]/g, "__").replace(/\.ts$/, ".mjs"));
  await writeFile(outPath, compiled, "utf8");
  return import(`${pathToFileURL(outPath).href}?t=${Date.now()}`);
}

async function runUnitTests() {
  const { normalizeReceipt, receiptSettlementItems } = await loadTs("src/lib/receiptLogic.ts");
  const fixedNow = new Date("2026-04-27T00:00:00.000Z");

  const normalized = normalizeReceipt({
    currency: "xxx",
    total_amount: 120,
    date: "bad-date",
    items: [
      { name: "拉麵", price: 80, quantity: 1 },
      { name: "折扣", price: -10, quantity: 1 },
    ],
  }, "JPY", fixedNow);

  assert.equal(normalized.receipt.currency, "JPY");
  assert.equal(normalized.receipt.date, "2026-04-27");
  assert.equal(normalized.receipt.items.at(-1).name, "未分配差額");
  assert.equal(
    normalized.receipt.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    120
  );
  assert.match(normalized.warning, /品項加總/);

  const emptyItems = normalizeReceipt({
    currency: "TWD",
    total_amount: 300,
    date: "2026-04-26",
    items: [],
  }, "TWD", fixedNow);
  assert.equal(emptyItems.receipt.items.length, 1);
  assert.equal(emptyItems.receipt.items[0].price, 300);

  const settlementItems = receiptSettlementItems({
    id: "r1",
    created_at: "2026-04-26T12:00:00.000Z",
    currency: "JPY",
    total_amount: 1000,
    twd_amount: 221,
    exchange_rate: 0.22,
    items: [
      { name: "A", price: 400, quantity: 1, note: "Amy" },
      { name: "B", price: 600, quantity: 1, note: "Ben" },
    ],
    note: null,
    trip_name: "關西",
    is_archived: false,
  });

  assert.deepEqual(settlementItems.map(item => item.itemTwd), [88, 133]);
  assert.equal(settlementItems.reduce((sum, item) => sum + item.itemTwd, 0), 221);
  assert.equal(settlementItems[0].effectiveNote, "Amy");
}

async function runIntegrationTests() {
  const { default: handler } = await loadTs("api/ocr.ts");
  const oldFetch = globalThis.fetch;
  const oldKey = process.env.GEMINI_API_KEY;

  try {
    process.env.GEMINI_API_KEY = "test-key";
    let geminiPayload = null;

    globalThis.fetch = async (_url, init) => {
      geminiPayload = JSON.parse(init.body);
      return new Response(JSON.stringify({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                currency: "JPY",
                total_amount: 1000,
                date: "2026-04-26",
                items: [{ name: "便當", price: 1000, quantity: 1 }],
              }),
            }],
          },
        }],
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const ok = await handler(new Request("https://example.test/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "base64-image", mediaType: "image/png", targetCurrency: "JPY" }),
    }));
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get("Access-Control-Allow-Origin"), "*");
    assert.equal(geminiPayload.contents[0].parts[0].inline_data.mime_type, "image/png");
    assert.equal((await ok.json()).total_amount, 1000);

    const options = await handler(new Request("https://example.test/api/ocr", { method: "OPTIONS" }));
    assert.equal(options.status, 200);
    assert.equal(options.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");

    const badJson = await handler(new Request("https://example.test/api/ocr", {
      method: "POST",
      body: "{bad",
    }));
    assert.equal(badJson.status, 400);

    const unsupported = await handler(new Request("https://example.test/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "base64-image", mediaType: "image/gif" }),
    }));
    assert.equal(unsupported.status, 415);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = oldKey;
  }
}

if (mode === "unit" || mode === "all") {
  await runUnitTests();
  console.log("UT passed");
}

if (mode === "integration" || mode === "all") {
  await runIntegrationTests();
  console.log("IT passed");
}
