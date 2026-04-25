import { ChangeEvent, FormEvent, useState } from "react";

interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

interface ReceiptData {
  currency: string;
  total_amount: number;
  category: string;
  icon: string;
  items: ReceiptItem[];
}

type InputMode = "camera" | "manual";

interface ManualFormState {
  amount: string;
  currency: "TWD" | "JPY" | "USD";
  category: "餐飲" | "交通" | "日用品" | "娛樂" | "醫療" | "學習" | "其他";
}

const categoryIconMap: Record<ManualFormState["category"], string> = {
  餐飲: "🍔",
  交通: "🚌",
  日用品: "🛒",
  娛樂: "🎮",
  醫療: "💊",
  學習: "📚",
  其他: "🧾",
};

const mockOcrReceipt: ReceiptData = {
  currency: "JPY",
  total_amount: 3980,
  category: "日用品",
  icon: "🛒",
  items: [
    { name: "尿布", price: 2480, quantity: 1 },
    { name: "副食品", price: 300, quantity: 3 },
    { name: "濕紙巾", price: 600, quantity: 1 },
  ],
};

const currencySymbols: Record<string, string> = {
  TWD: "NT$",
  JPY: "¥",
  USD: "$",
};

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "#f1f5f9",
    padding: "env(safe-area-inset-top, 16px) 16px env(safe-area-inset-bottom, 16px)",
    paddingTop: "max(env(safe-area-inset-top), 24px)",
  },
  wrap: { maxWidth: 440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 },
  card: { background: "#fff", borderRadius: 24, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  tabWrap: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, background: "#f1f5f9", borderRadius: 18, padding: 4 },
  tabActive: { borderRadius: 14, padding: "11px 8px", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", background: "#2563eb", color: "#fff", boxShadow: "0 1px 4px rgba(37,99,235,0.3)" },
  tabInactive: { borderRadius: 14, padding: "11px 8px", fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer", background: "transparent", color: "#475569" },
  uploadZone: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 180, border: "2px dashed #cbd5e1", borderRadius: 20, background: "#f8fafc", cursor: "pointer", padding: "24px 16px", textAlign: "center", gap: 8 },
  btn: { width: "100%", borderRadius: 16, padding: "14px 16px", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer" },
  input: { width: "100%", border: "1.5px solid #e2e8f0", background: "#f8fafc", borderRadius: 14, padding: "12px 16px", fontSize: 15, outline: "none", color: "#1e293b", fontFamily: "inherit" },
  label: { fontSize: 13, fontWeight: 500, color: "#475569", display: "block", marginBottom: 6 },
};

export default function ReceiptRecorderCard() {
  const [inputMode, setInputMode] = useState<InputMode>("camera");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(0.21);
  const [manualForm, setManualForm] = useState<ManualFormState>({ amount: "", currency: "TWD", category: "餐飲" });
  const [selectedImageName, setSelectedImageName] = useState<string>("");

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedImageName(e.target.files?.[0]?.name ?? "");
  };

  const handleMockOCR = () => setReceipt(mockOcrReceipt);

  const handleManualSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = Number(manualForm.amount);
    if (!amount || amount <= 0) return;
    setReceipt({
      currency: manualForm.currency,
      total_amount: amount,
      category: manualForm.category,
      icon: categoryIconMap[manualForm.category],
      items: [{ name: "手動記帳", price: amount, quantity: 1 }],
    });
  };

  const convertedTwd =
    receipt && receipt.currency !== "TWD"
      ? Math.round(receipt.total_amount * exchangeRate)
      : null;

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        {/* Tab */}
        <div style={s.card}>
          <div style={s.tabWrap}>
            <button style={inputMode === "camera" ? s.tabActive : s.tabInactive} onClick={() => setInputMode("camera")}>
              📸 拍照辨識
            </button>
            <button style={inputMode === "manual" ? s.tabActive : s.tabInactive} onClick={() => setInputMode("manual")}>
              ✍️ 手動輸入
            </button>
          </div>
        </div>

        {/* Input Panel */}
        <div style={s.card}>
          {inputMode === "camera" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={s.uploadZone}>
                <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: "none" }} />
                <span style={{ fontSize: 48 }}>📷</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>點擊拍照或上傳收據</span>
                <span style={{ fontSize: 13, color: "#94a3b8" }}>支援手機相機與相簿選取</span>
                {selectedImageName && (
                  <span style={{ fontSize: 12, color: "#64748b", background: "#fff", borderRadius: 999, padding: "4px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
                    已選擇：{selectedImageName}
                  </span>
                )}
              </label>
              <button style={{ ...s.btn, background: "#f59e0b", color: "#fff" }} onClick={handleMockOCR}>
                🤖 模擬 AI 辨識
              </button>
            </div>
          ) : (
            <form style={{ display: "flex", flexDirection: "column", gap: 14 }} onSubmit={handleManualSubmit}>
              <div>
                <label style={s.label}>總金額</label>
                <input
                  type="number" min="0" step="0.01" placeholder="請輸入金額"
                  style={s.input} value={manualForm.amount}
                  onChange={(e) => setManualForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={s.label}>幣別</label>
                  <select style={s.input} value={manualForm.currency}
                    onChange={(e) => setManualForm((p) => ({ ...p, currency: e.target.value as ManualFormState["currency"] }))}>
                    <option value="TWD">TWD</option>
                    <option value="JPY">JPY</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>分類</label>
                  <select style={s.input} value={manualForm.category}
                    onChange={(e) => setManualForm((p) => ({ ...p, category: e.target.value as ManualFormState["category"] }))}>
                    {Object.keys(categoryIconMap).map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" style={{ ...s.btn, background: "#059669", color: "#fff" }}>✅ 確認新增</button>
            </form>
          )}
        </div>

        {/* Receipt */}
        {receipt && (
          <div style={{ ...s.card, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 56, lineHeight: 1 }}>{receipt.icon}</div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>{receipt.category}</div>
            </div>

            <div style={{ background: "#f8fafc", borderRadius: 16, padding: 16, textAlign: "center" }}>
              {receipt.currency !== "TWD" ? (
                <>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#ef4444" }}>NT$ {convertedTwd?.toLocaleString()}</div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#94a3b8" }}>
                    原始金額：{currencySymbols[receipt.currency]}{receipt.total_amount.toLocaleString()} {receipt.currency}
                  </div>
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "#64748b" }}>匯率</span>
                    <input type="number" step="0.01" value={exchangeRate}
                      onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
                      style={{ width: 88, borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff", padding: "6px 10px", textAlign: "center", fontSize: 14, outline: "none", fontFamily: "inherit" }}
                    />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 30, fontWeight: 900, color: "#ef4444" }}>NT$ {receipt.total_amount.toLocaleString()}</div>
              )}
            </div>

            <div style={{ border: "1.5px solid #f1f5f9", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#475569", borderBottom: "1.5px solid #f1f5f9" }}>消費明細</div>
              {receipt.items.map((item, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: i < receipt.items.length - 1 ? "1px solid #f8fafc" : "none" }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</span>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>
                    {currencySymbols[receipt.currency]}{item.price.toLocaleString()} x {item.quantity}
                  </span>
                </div>
              ))}
            </div>

            <button style={{ ...s.btn, background: "#2563eb", color: "#fff" }}
              onClick={() => console.log("save", receipt)}>
              確認儲存至資料庫
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
