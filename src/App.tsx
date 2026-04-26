import { useCallback, useEffect, useState, useMemo } from "react";
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
  const [currentTrip, setCurrentTrip] = useState<string>("本次行程");

  // Load last used trip from local storage if available
  useEffect(() => {
    const last = localStorage.getItem("last_trip");
    if (last) setCurrentTrip(last);
  }, []);

  const saveCurrentTrip = (name: string) => {
    setCurrentTrip(name);
    localStorage.setItem("last_trip", name);
  };
  const loadReceipts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchReceipts();
      setReceipts(data);
    } catch (err: any) {
      console.error("Failed to fetch receipts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const existingNotes = useMemo(() => {
    const notes = new Set<string>();
    receipts.forEach(r => {
      if (r.note) notes.add(r.note);
      r.items?.forEach((i: any) => {
        if (i.note) notes.add(i.note);
      });
    });
    return Array.from(notes);
  }, [receipts]);

  const allTripNames = useMemo(() => {
    const trips = new Set<string>();
    receipts.forEach(r => trips.add(r.trip_name || "本次行程"));
    // Ensure currentTrip is in the list
    trips.add(currentTrip);
    return Array.from(trips).sort();
  }, [receipts, currentTrip]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter(r => (r.trip_name || "本次行程") === currentTrip);
  }, [receipts, currentTrip]);

  const handleCreateTrip = () => {
    const name = prompt("請輸入新行程名稱（例如：2024 日本行）：");
    if (name && name.trim()) {
      saveCurrentTrip(name.trim());
    }
  };

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

      {/* Trip Selector Header */}
      <header style={{
        padding: "12px 16px",
        background: "#fff",
        borderBottom: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        gap: 10,
        position: "sticky",
        top: 0,
        zIndex: 150
      }}>
        <div style={{ fontSize: 18 }}>🗺️</div>
        <select 
          style={{ 
            flex: 1, padding: "6px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", 
            background: "#f8fafc", fontSize: 14, fontWeight: 700 
          }}
          value={currentTrip}
          onChange={(e) => saveCurrentTrip(e.target.value)}
        >
          {allTripNames.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button 
          onClick={handleCreateTrip}
          style={{ border: "none", background: "#f1f5f9", padding: "6px 12px", borderRadius: 10, fontSize: 12, fontWeight: 800, color: "#2563eb", cursor: "pointer" }}
        >
          + 新行程
        </button>
      </header>

      {/* Tab Content */}
      <div style={{ display: tab === "record" ? "block" : "none" }}>
        <ReceiptRecorderCard onSaved={handleSaved} receiptCount={filteredReceipts.length} existingNotes={existingNotes} currentTrip={currentTrip} />
      </div>
      <div style={{ display: tab === "list" ? "block" : "none" }}>
        <ReceiptList receipts={filteredReceipts} loading={loading} onDelete={handleSaved} existingNotes={existingNotes} />
      </div>
      <div style={{ display: tab === "stats" ? "block" : "none" }}>
        <ReceiptStats receipts={filteredReceipts} loading={loading} />
      </div>
      <div style={{ display: tab === "settlement" ? "block" : "none" }}>
        <SettlementView receipts={filteredReceipts} fullReceipts={receipts} loading={loading} tripName={currentTrip} onRefresh={handleSaved} />
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
