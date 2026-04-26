const apiKey = "AIzaSyAdR5-bIHRMHYSr_wLySSWIbJKjYml6w6o";
const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash-001", "gemini-1.5-flash-002"];

async function runTests() {
  for (const model of models) {
    console.log(`--- 測試模型: ${model} (v1beta endpoint) ---`);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Hi" }] }]
        })
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`✅ ${model} 測試成功！`);
        break; 
      } else {
        console.log(`❌ ${model} 失敗: ${data.error?.message}`);
      }
    } catch (e) {
      console.log(`💥 ${model} 異常: ${e.message}`);
    }
  }
}

runTests();
