import { useState, useMemo } from "react";
import { type Receipt } from "../lib/supabase";
import { receiptSettlementItems } from "../lib/receiptLogic";

const s: Record<string, React.CSSProperties> = {
  container: { padding: 16, display: "flex", flexDirection: "column", gap: 16, animation: "fadeSlideUp 0.4s ease-out" },
  header: { textAlign: "center", marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 800, color: "#1e3a8a", marginBottom: 4 },
  sub: { fontSize: 14, color: "#64748b" },
  card: { background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 4px 15px rgba(0,0,0,0.05)" },
  selectBox: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 },
  label: { fontSize: 14, fontWeight: 700, color: "#475569" },
  totalCard: { 
    background: "linear-gradient(135deg, #fef2f2 0%, #fff 100%)", 
    border: "2px solid #ef4444", 
    borderRadius: 20, 
    padding: "24px 16px", 
    textAlign: "center",
    boxShadow: "0 10px 25px rgba(239, 68, 68, 0.1)"
  },
  totalLabel: { fontSize: 15, fontWeight: 700, color: "#ef4444", marginBottom: 8, letterSpacing: 1 },
  totalAmount: { fontSize: 36, fontWeight: 900, color: "#ef4444" },
  itemList: { display: "flex", flexDirection: "column", gap: 12 },
  itemRow: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "flex-start", 
    paddingBottom: 10, 
    borderBottom: "1px solid #f1f5f9" 
  },
  itemInfo: { display: "flex", flexDirection: "column", gap: 4 },
  itemName: { fontSize: 15, fontWeight: 700, color: "#1e293b" },
  itemDate: { fontSize: 12, color: "#94a3b8" },
  itemPrice: { textAlign: "right" },
  twdPrice: { fontSize: 15, fontWeight: 800, color: "#1e293b" },
  origPrice: { fontSize: 12, color: "#94a3b8" },
  empty: { textAlign: "center", padding: "40px 20px", color: "#94a3b8" },
};

interface Props {
  receipts: Receipt[];
  loading: boolean;
}

export default function SettlementView({ receipts, loading }: Props) {
  const [selectedPerson, setSelectedPerson] = useState<string>("我 (我自己)");

  const allItems = useMemo(() => {
    return receipts.flatMap(receiptSettlementItems);
  }, [receipts]);

  const people = useMemo(() => {
    return Array.from(new Set(allItems.map(i => i.effectiveNote))).sort((a, b) => {
      if (a === "我 (我自己)") return -1;
      if (b === "我 (我自己)") return 1;
      return a.localeCompare(b);
    });
  }, [allItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter(i => i.effectiveNote === selectedPerson);
  }, [allItems, selectedPerson]);

  const totalTwd = useMemo(() => {
    return filteredItems.reduce((sum, i) => sum + i.itemTwd, 0);
  }, [filteredItems]);

  const personTotals = useMemo(() => {
    const map = new Map<string, number>();
    allItems.forEach(i => {
      map.set(i.effectiveNote, (map.get(i.effectiveNote) || 0) + i.itemTwd);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allItems]);

  if (loading) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 50 }}><div className="spinner" /></div>;
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.title}>🤝 成員統計</div>
        <div style={s.sub}>核對分帳明細與結算金額</div>
      </div>

      <div style={s.card}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#1e3a8a", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          👥 所有人總覽
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {personTotals.map(([name, total]) => (
            <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 4px", borderBottom: "1px dotted #e2e8f0" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: name === "我 (我自己)" ? "#2563eb" : "#475569" }}>{name}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1e293b" }}>NT$ {total.toLocaleString()}</div>
            </div>
          ))}
          {personTotals.length === 0 && <div style={s.empty}>暫無資料</div>}
        </div>
      </div>

      <div style={s.card}>
        <div style={s.selectBox}>
          <label style={s.label}>🔍 查看明細：</label>
          <select 
            style={{ 
              width: "100%", padding: "12px 16px", borderRadius: 14, 
              border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 16, fontWeight: 700
            }}
            value={selectedPerson}
            onChange={(e) => setSelectedPerson(e.target.value)}
          >
            {people.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div style={s.totalCard}>
        <div style={s.totalLabel}>{selectedPerson} 的消費總計</div>
        <div style={s.totalAmount}>NT$ {totalTwd.toLocaleString()}</div>
      </div>

      <div style={s.card}>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#1e3a8a", marginBottom: 16 }}>消費清單 ({filteredItems.length} 筆項目)</div>
        <div style={s.itemList}>
          {filteredItems.length === 0 ? (
            <div style={s.empty}>目前沒有該成員的紀錄</div>
          ) : (
            filteredItems.map((item, idx) => (
              <div key={`${item.receiptId}-${idx}`} style={s.itemRow}>
                <div style={s.itemInfo}>
                  <div style={s.itemName}>
                    {item.name}
                  </div>
                  <div style={s.itemDate}>
                    {new Date(item.date).toLocaleDateString()}
                  </div>
                </div>
                <div style={s.itemPrice}>
                  <div style={s.twdPrice}>NT$ {item.itemTwd.toLocaleString()}</div>
                  {item.currency !== "TWD" && (
                    <div style={s.origPrice}>{item.price.toLocaleString()} x {item.quantity} {item.currency}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
