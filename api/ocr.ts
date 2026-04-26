export const config = {
  runtime: 'edge',
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const allowedMediaTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST, OPTIONS" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: "GEMINI_API_KEY 未設定" }, 500);
  }

  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "請提供有效 JSON" }, 400);
    }

    const { image, mediaType, targetCurrency } = body;
    if (!image) {
      return json({ error: "未提供圖片" }, 400);
    }

    const mimeType = mediaType || "image/webp";
    if (!allowedMediaTypes.has(mimeType)) {
      return json({ error: `不支援的圖片格式：${mimeType}` }, 415);
    }

    const prompt = `收據辨識：
${targetCurrency ? `幣別：${targetCurrency}` : ""}
1. 提取商品、單價、數量。
2. 折扣記錄為單項且價格為負。
3. total_amount 需與 items 加總一致。
4. 日期：YYYY-MM-DD。

格式 (JSON)：
{
  "currency": "代碼",
  "total_amount": 數字,
  "date": "YYYY-MM-DD",
  "items": [ { "name": "名稱", "price": 價格, "quantity": 數量 } ]
}`;

    // 使用速度更快的 gemini-2.5-flash 或 gemini-2.0-flash-lite
    // 這裡預設使用最新高速度的 2.5 flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: image } }, { text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096, responseMimeType: "application/json" },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
          ],
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
        return json({ error: data.error?.message || "API 錯誤" }, response.status);
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) {
        return json({ error: `AI 回應為空 (${data.candidates?.[0]?.finishReason})` }, 500);
    }

    try {
      const receipt = JSON.parse(text);
      return json(receipt);
    } catch (e) {
      return json({ error: "解析 JSON 失敗", raw: text.substring(0, 100) }, 500);
    }
  } catch (error: any) {
    console.error("OCR handler error:", error);
    return json({ error: error.message || "伺服器錯誤" }, 500);
  }
}
