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

  const { image, mediaType } = req.body;
  if (!image) {
    return res.status(400).json({ error: "未提供圖片" });
  }

  const prompt = `你是一個專業的收據辨識助手。請仔細分析這張收據圖片，提取以下資訊並以 JSON 格式回傳。

回傳格式（只回傳 JSON，不要加任何其他文字或 markdown 標記）：
{
  "currency": "幣別代碼（TWD、JPY、USD、EUR 等）",
  "total_amount": 總金額數字,
  "category": "分類",
  "items": [
    { "name": "品項名稱", "price": 單價, "quantity": 數量 }
  ]
}

分類必須是以下之一：餐飲、交通、日用品、娛樂、醫療、學習、其他

規則：
1. 只回傳純 JSON，不要加 \`\`\`json 或任何 markdown 標記
2. 金額必須是純數字，不要有逗號或貨幣符號
3. 如果品項名稱是外文，請翻譯成中文
4. 如果看不清某些品項，盡量推測
5. 如果圖片中有折扣、税金等，也列為 items
6. total_amount 應該是收據上的最終合計金額
7. 如果無法辨識為收據，回傳 {"error": "無法辨識此圖片為收據"}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mediaType || "image/jpeg",
                    data: image,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", JSON.stringify(data));
      return res.status(response.status).json({
        error: data.error?.message || "Gemini API 呼叫失敗",
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Try to parse JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const receipt = JSON.parse(jsonMatch[0]);
        if (receipt.error) {
          return res.status(400).json({ error: receipt.error });
        }
        return res.status(200).json(receipt);
      } catch (parseErr) {
        console.error("JSON parse error:", text);
        return res.status(500).json({ error: "辨識結果解析失敗，請重試" });
      }
    }

    return res.status(500).json({ error: "無法從回應中提取收據資料" });
  } catch (error: any) {
    console.error("OCR handler error:", error);
    return res.status(500).json({ error: error.message || "伺服器錯誤" });
  }
}
