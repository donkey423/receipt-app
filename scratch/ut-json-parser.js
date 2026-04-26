function extractJson(text) {
  let cleanedText = text.trim();
  if (cleanedText.includes("```")) {
    cleanedText = cleanedText.replace(/```(?:json)?([\s\S]*?)```/g, "$1").trim();
  }
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function runParsingTest() {
  console.log("--- 單元測試：JSON 解析邏輯 ---");
  
  const cases = [
    { 
      name: "標準 Markdown 格式",
      input: "這裡是你要求的資料：\n```json\n{\"currency\":\"TWD\",\"total_amount\":100}\n```\n希望有幫助。",
      expected: 100
    },
    {
      name: "只有 JSON 但有換行",
      input: "{\n  \"currency\": \"TWD\",\n  \"total_amount\": 250\n}",
      expected: 250
    },
    {
      name: "前後有說明的垃圾字",
      input: "好的，辨識結果如下：{\"currency\":\"HKD\",\"total_amount\":124} 以上就是資料。",
      expected: 124
    }
  ];

  cases.forEach(c => {
    const result = extractJson(c.input);
    const success = result && result.total_amount === c.expected;
    console.log(`測試 [${c.name}]: ${success ? "✅ 通過" : "❌ 失敗"}`);
    if (!success) console.log("   得到結果:", JSON.stringify(result));
  });
}

runParsingTest();
