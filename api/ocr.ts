import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY 未設定" });
  }

  const { image, mediaType, targetCurrency } = req.body;
  if (!image) {
    return res.status(400).json({ error: "未提供圖片" });
  }

  const prompt = `你是一個專業的收據辨識助手。請仔細分析這張收據圖片，提取詳細資訊。
${targetCurrency ? `提示：這張收據很可能是 ${targetCurrency} 幣別。` : ""}
特別注意：請列出每一項商品的具體名稱。

回傳格式（只回傳純 JSON）：
{
  "currency": "幣別代碼",
  "total_amount": 總額數字,
  "category": "分類",
  "items": [ { "name": "名稱", "price": 單價, "quantity": 數量 } ]
}
分類：餐飲、交通、日用品、娛樂、醫療、學習、其他`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: mediaType || "image/jpeg", data: image } }, { text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
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

    // 提取與修補 JSON
    let cleaned = text.trim();
    if (cleaned.includes("```")) cleaned = cleaned.replace(/```(?:json)?([\s\S]*?)```/g, "$1").trim();
    
    // 如果發現有 { 但沒有 }，嘗試補上（雖然不一定能 parse 成功，但增加機會）
    if (cleaned.includes("{") && !cleaned.includes("}")) cleaned += "]}"; 

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1) {
      const jsonStr = end !== -1 ? cleaned.substring(start, end + 1) : cleaned.substring(start);
      try {
        const receipt = JSON.parse(jsonStr);
        return res.status(200).json(receipt);
      } catch (e) {
        // 嘗試補齊截斷的 JSON (針對 items 列表截斷)
        try {
          const fixed = jsonStr.endsWith(",") ? jsonStr.substring(0, jsonStr.length - 1) : jsonStr;
          return res.status(200).json(JSON.parse(fixed + "]}")); 
        } catch (e2) {
          return res.status(500).json({ error: `解析失敗。AI 回應: ${text.substring(0, 100)}` });
        }
      }
    }
    return res.status(500).json({ error: `找不到 JSON。內容: ${text.substring(0, 50)}` });
  } catch (error: any) {
    console.error("OCR handler error:", error);
    return res.status(500).json({ error: error.message || "伺服器錯誤" });
  }
}
