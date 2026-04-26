// 模擬瀏覽器的 localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    clear: () => { store = {}; }
  };
})();

function testQuotaLogic() {
  console.log("--- 單元測試：配額邏輯 ---");
  const today = new Date().toDateString();
  
  // 1. 測試初始狀態
  let quota = 0;
  const saved = localStorageMock.getItem("gemini_quota");
  if (saved) {
    const { date, count } = JSON.parse(saved);
    if (date === today) quota = count;
  }
  console.log("初始配額計數:", quota, quota === 0 ? "✅" : "❌");

  // 2. 測試增加配額
  const newCount = quota + 5;
  localStorageMock.setItem("gemini_quota", JSON.stringify({ date: today, count: newCount }));
  
  const verified = JSON.parse(localStorageMock.getItem("gemini_quota"));
  console.log("更新後計數:", verified.count, verified.count === 5 ? "✅" : "❌");

  // 3. 測試跨日重置 (模擬)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  localStorageMock.setItem("gemini_quota", JSON.stringify({ date: yesterday.toDateString(), count: 100 }));
  
  let resetQuota = 0;
  const oldSaved = localStorageMock.getItem("gemini_quota");
  if (oldSaved) {
    const { date, count } = JSON.parse(oldSaved);
    if (date === today) resetQuota = count;
  }
  console.log("跨日後是否自動重置至 0:", resetQuota, resetQuota === 0 ? "✅" : "❌");
}

testQuotaLogic();
