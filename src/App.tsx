import { useCallback, useEffect, useState } from "react";
import { fetchReceipts, type Receipt } from "./lib/supabase";
import ReceiptRecorderCard from "./components/ReceiptRecorderCard";
import ReceiptList from "./components/ReceiptList";
import ReceiptStats from "./components/ReceiptStats";
import SettlementView from "./components/SettlementView";

type Tab = "record" | "list" | "stats" | "settlement";

const tabConfig: { key: Tab; icon: string; label: string }[] = [
  { key: "record", icon: "📝", label: "記錄" },
  { key: "list", icon: "📋", label: "清單" },
  { key: "stats", icon: "📊", label: "統計" },
  { key: "settlement", icon: "🤝", label: "成員" },
];

const navStyle: Record<string, React.CSSProperties> = {
  bar: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    display: "flex",
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderTop: "1px solid #e2e8f0",
    paddingBottom: "env(safe-area-inset-bottom, 0)",
    zIndex: 100,
  },
  btn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    padding: "8px 0 6px",
    border: "none",
    background: "none",
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "color 0.15s",
  },
};

export default function App() {
  const [tab, setTab] = useState<Tab>("record");
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadReceipts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchReceipts();
      setReceipts(data);
    } catch (err: any) {
      console.error("Failed to fetch receipts:", err);
      setError(err.message || "載入失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleSaved = () => {
    loadReceipts();
  };

  return (
    <>
      {/* Error banner */}
      {error && !loading && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            background: "#fef2f2",
            color: "#dc2626",
            padding: "10px 16px",
            fontSize: 13,
            textAlign: "center",
            zIndex: 200,
            borderBottom: "1px solid #fecaca",
          }}
        >
          ⚠️ {error}
          <button
            onClick={loadReceipts}
            style={{
              marginLeft: 10,
              border: "none",
              background: "#dc2626",
              color: "#fff",
              borderRadius: 6,
              padding: "3px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            重試
          </button>
        </div>
      )}

      {/* Tab Content */}
      <div style={{ display: tab === "record" ? "block" : "none" }}>
        <ReceiptRecorderCard onSaved={handleSaved} receiptCount={receipts.length} />
      </div>
      <div style={{ display: tab === "list" ? "block" : "none" }}>
        <ReceiptList receipts={receipts} loading={loading} onDelete={handleSaved} />
      </div>
      <div style={{ display: tab === "stats" ? "block" : "none" }}>
        <ReceiptStats receipts={receipts} loading={loading} />
      </div>
      <div style={{ display: tab === "settlement" ? "block" : "none" }}>
        <SettlementView receipts={receipts} loading={loading} />
      </div>

      {/* Bottom Nav */}
      <nav style={navStyle.bar}>
        {tabConfig.map((t) => (
          <button
            key={t.key}
            style={{
              ...navStyle.btn,
              color: tab === t.key ? "#2563eb" : "#94a3b8",
            }}
            onClick={() => setTab(t.key)}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab === t.key ? 700 : 500 }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
