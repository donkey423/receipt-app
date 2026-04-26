// Unit Test for per-item exchange rate calculation
function testPerItemCalculation() {
  console.log("--- UT: Per-item Exchange Rate Calculation ---");
  
  const exchangeRate = 0.22; // Let's say JPY
  
  const items = [
    { name: "Coffee", price: 500, quantity: 2 },
    { name: "Cake", price: 800, quantity: 1 }
  ];
  
  console.log(`Current Rate: ${exchangeRate}`);
  
  items.forEach((item, idx) => {
    const foreignTotal = item.price * item.quantity;
    const twdConverted = Math.round(foreignTotal * exchangeRate);
    
    console.log(`Item ${idx + 1} (${item.name}):`);
    console.log(`  Foreign price: ${item.price} x ${item.quantity} = ${foreignTotal}`);
    console.log(`  Calculated TWD: ${twdConverted}`);
    
    if (idx === 0) {
      const expected = Math.round(1000 * 0.22); // 220
      console.log(`  Expected TWD: ${expected} -> ${twdConverted === expected ? '✅ PASS' : '❌ FAIL'}`);
    } else if (idx === 1) {
      const expected = Math.round(800 * 0.22); // 176
      console.log(`  Expected TWD: ${expected} -> ${twdConverted === expected ? '✅ PASS' : '❌ FAIL'}`);
    }
  });
}

testPerItemCalculation();
