import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY 未設定，請在環境變數中切換至新金鑰" });
  }

  const { image, mediaType, targetCurrency } = req.body;
  if (!image) {
    return res.status(400).json({ error: "未提供圖片" });
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

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: mediaType || "image/jpeg", data: image } }, { text: prompt }] }],
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
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "API 錯誤" });

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) return res.status(500).json({ error: `AI 回應為空 (${data.candidates?.[0]?.finishReason})` });

    try {
      const receipt = JSON.parse(text);
      return res.status(200).json(receipt);
    } catch (e) {
      return res.status(500).json({ error: "解析 JSON 失敗", raw: text.substring(0, 100) });
    }
  } catch (error: any) {
    console.error("OCR handler error:", error);
    return res.status(500).json({ error: error.message || "伺服器錯誤" });
  }
}
