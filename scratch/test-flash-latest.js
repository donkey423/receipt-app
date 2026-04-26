const apiKey = "AIzaSyAdR5-bIHRMHYSr_wLySSWIbJKjYml6w6o";
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

async function testFinal() {
  console.log("正在測試 gemini-flash-latest...");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Hi" }] }] })
    });
    const data = await response.json();
    if (response.ok) {
        console.log("✅ 成功！這是你的 Key 可以使用的路徑。");
    } else {
        console.log("❌ 失敗:", data.error?.message);
    }
  } catch (e) { console.log("💥 異常:", e.message); }
}
testFinal();
