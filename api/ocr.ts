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

  const prompt = `你是一個專業的收據辨識助手。請仔細分析這張收據圖片，提取詳細資訊。
特別注意：除大類別外，請務必精確列出每一項購買的商品名稱（例如：不只是「餐飲」，而是「全麥麵包」、「珍珠奶茶」）。

回傳格式（只回傳 JSON，不要加標記）：
{
  "currency": "幣別代碼（TWD, JPY, USD 等）",
  "total_amount": 總金額數字,
  "category": "分類（餐飲、交通、日用品、娛樂、醫療、學習、其他）",
  "items": [
    { "name": "商品具體名稱（麵包、飲料等）", "price": 單價, "quantity": 數量 }
  ]
}

規則：
1. 商品名稱請務必從英文/日文翻譯成中文，並盡量具體。
2. 金額必須是數字。
3. total_amount 必須等於收據最終付款金額。
4. 如果無法辨識或不是收據，回傳 {"error": "無法辨識"}。`;

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
      console.error("Gemini API error:", JSON.stringify(data));
      return res.status(response.status).json({
        error: data.error?.message || "Gemini API 呼叫失敗",
      });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) {
      // 檢查是否被安全性攔截
      const reason = data.candidates?.[0]?.finishReason;
      return res.status(500).json({ error: `AI 拒絕辨識或內容為空 (原因: ${reason || "未知"})` });
    }

    // 更加強健的 JSON 提取邏輯
    let cleanedText = text.trim();
    if (cleanedText.includes("```")) {
      cleanedText = cleanedText.replace(/```(?:json)?([\s\S]*?)```/g, "$1").trim();
    }
    
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const receipt = JSON.parse(jsonMatch[0]);
        if (receipt.error) {
          return res.status(400).json({ error: receipt.error });
        }
        return res.status(200).json(receipt);
      } catch (parseErr) {
        console.error("JSON 解析失敗，原始文字:", text);
        return res.status(500).json({ error: "辨識格式不正確，請再試一次" });
      }
    }

    return res.status(500).json({ error: `無法從 AI 回應中提取資料。AI 說了: ${text.substring(0, 50)}...` });
  } catch (error: any) {
    console.error("OCR handler error:", error);
    return res.status(500).json({ error: error.message || "伺服器錯誤" });
  }
}
