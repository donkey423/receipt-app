// 模擬 ReceiptRecorderCard 中的 handleResultEdit 邏輯
function simulateEdit(receipt, updates) {
  const newReceipt = { ...receipt, ...updates };
  
  // 核心邏輯：如果更新了 items，必須重新計算總額
  if (updates.items) {
    newReceipt.total_amount = updates.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }
  return newReceipt;
}

function testEditLogic() {
  console.log("--- 單元測試：編輯與自動計算邏輯 ---");
  
  const initialReceipt = {
    category: "餐飲",
    total_amount: 100,
    items: [
      { name: "麵包", price: 60, quantity: 1 },
      { name: "咖啡", price: 40, quantity: 1 }
    ]
  };

  // 測項 1: 修改數量，總額應變動
  const test1Items = [
    { name: "麵包", price: 60, quantity: 2 }, // 120
    { name: "咖啡", price: 40, quantity: 1 }  // 40
  ];
  const result1 = simulateEdit(initialReceipt, { items: test1Items });
  console.log("測試 1 (修改數量): 總額應為 160 -> 實際為:", result1.total_amount, result1.total_amount === 160 ? "✅" : "❌");

  // 測項 2: 修改單價
  const test2Items = [
    { name: "麵包", price: 70, quantity: 1 }, // 70
    { name: "咖啡", price: 40, quantity: 1 }  // 40
  ];
  const result2 = simulateEdit(initialReceipt, { items: test2Items });
  console.log("測試 2 (修改單價): 總額應為 110 -> 實際為:", result2.total_amount, result2.total_amount === 110 ? "✅" : "❌");

  // 測項 3: 直接修改大類別
  const result3 = simulateEdit(initialReceipt, { category: "其他" });
  console.log("測試 3 (修改類別): 類別應變為 '其他' -> 實際為:", result3.category, result3.category === "其他" ? "✅" : "❌");
}

testEditLogic();
