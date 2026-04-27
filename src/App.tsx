import { lazy, Suspense, useState, useMemo } from "react";
import useSWR from "swr";
import { fetchReceipts, type Receipt } from "./lib/supabase";
import ReceiptRecorderCard from "./components/ReceiptRecorderCard";

const ReceiptList = lazy(() => import("./components/ReceiptList"));
const SettlementView = lazy(() => import("./components/SettlementView"));

type Tab = "record" | "list" | "settlement";

const tabConfig: { key: Tab; icon: string; label: string }[] = [
  { key: "record", icon: "📝", label: "記錄" },
  { key: "list", icon: "📋", label: "清單" },
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
  const [mountedTabs, setMountedTabs] = useState<Set<Tab>>(() => new Set(["record"]));
  
  const { data: receipts = [], mutate, isLoading: loading, error: fetchError } = useSWR<Receipt[]>('receipts', fetchReceipts);
  const error = fetchError ? fetchError.message : "";

  const changeTab = (nextTab: Tab) => {
    setTab(nextTab);
    setMountedTabs((prev) => {
      if (prev.has(nextTab)) return prev;
      const next = new Set(prev);
      next.add(nextTab);
      return next;
    });
  };

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
            onClick={() => mutate()}
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
        <ReceiptRecorderCard mutate={mutate} receiptCount={receipts.length} existingNotes={existingNotes} />
      </div>
      <Suspense fallback={<div style={{ display: "flex", justifyContent: "center", padding: 50 }}><div className="spinner" /></div>}>
        {mountedTabs.has("list") && (
          <div style={{ display: tab === "list" ? "block" : "none" }}>
            <ReceiptList receipts={receipts} loading={loading} mutate={mutate} existingNotes={existingNotes} />
          </div>
        )}
        {mountedTabs.has("settlement") && (
          <div style={{ display: tab === "settlement" ? "block" : "none" }}>
            <SettlementView receipts={receipts} loading={loading} />
          </div>
        )}
      </Suspense>

      {/* Bottom Nav */}
      <nav style={navStyle.bar}>
        {tabConfig.map((t) => (
          <button
            key={t.key}
            style={{
              ...navStyle.btn,
              color: tab === t.key ? "#2563eb" : "#94a3b8",
            }}
            onClick={() => changeTab(t.key)}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{t.icon}</span>
            <span style={{ fontSize: 10, fontWeight: tab === t.key ? 700 : 500 }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
