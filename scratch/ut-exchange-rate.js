// 模擬匯率 API 回傳資料處理邏輯
function processRateData(apiData, targetCurrency) {
    if (apiData.result === "success" && apiData.rates[targetCurrency]) {
      // 1 TWD = N Foreign -> 1 Foreign = 1/N TWD
      const rate = 1 / apiData.rates[targetCurrency];
      return parseFloat(rate.toFixed(4));
    }
    return null;
}

function testRateLogic() {
  console.log("--- 單元測試：即時匯率換算邏輯 ---");
  
  const mockApiData = {
    result: "success",
    rates: {
      JPY: 4.65,   // 1 TWD = 4.65 JPY
      HKD: 0.243,  // 1 TWD = 0.243 HKD
      CHF: 0.027   // 1 TWD = 0.027 CHF
    }
  };

  // 測項 1: 日圓
  const jpyRate = processRateData(mockApiData, "JPY");
  console.log("JPY -> TWD (應約 0.2151):", jpyRate, jpyRate === 0.2151 ? "✅" : "❌");

  // 測項 2: 港幣
  const hkdRate = processRateData(mockApiData, "HKD");
  console.log("HKD -> TWD (應約 4.1152):", hkdRate, hkdRate === 4.1152 ? "✅" : "❌");

  // 測項 3: 瑞士法郎
  const chfRate = processRateData(mockApiData, "CHF");
  console.log("CHF -> TWD (應約 37.037):", chfRate, chfRate === 37.037 ? "✅" : "❌");
}

testRateLogic();
