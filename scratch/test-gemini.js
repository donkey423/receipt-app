const apiKey = "AIzaSyAdR5-bIHRMHYSr_wLySSWIbJKjYml6w6o";
const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

async function testGemini() {
  console.log("正在測試 Gemini 1.5 Flash (v1 endpoint)...");
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "這是一個測試，請回傳 'OK'。" }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log("✅ 測試成功！");
      console.log("回應內容:", data.candidates?.[0]?.content?.parts?.[0]?.text);
    } else {
      console.error("❌ 測試失敗！");
      console.error("錯誤狀態代碼:", response.status);
      console.error("錯誤訊息:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("💥 發生異常:", error.message);
  }
}

testGemini();
