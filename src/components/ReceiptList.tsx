import { useState } from "react";
import type { Receipt } from "../lib/supabase";

/* ── Helpers ── */
const currencySymbols: Record<string, string> = {
  TWD: "NT$", JPY: "¥", USD: "$", EUR: "€",
};

const categoryColors: Record<string, string> = {
  餐飲: "#f97316", 交通: "#3b82f6", 日用品: "#10b981",
  娛樂: "#8b5cf6", 醫療: "#ef4444", 學習: "#06b6d4", 其他: "#64748b",
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);
  const rDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

  if (rDay.getTime() === todayStart.getTime()) return `今天 ${time}`;
  if (rDay.getTime() === yesterdayStart.getTime()) return `昨天 ${time}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}

function groupByDate(receipts: Receipt[]): { label: string; items: Receipt[] }[] {
  const map = new Map<string, { label: string; items: Receipt[] }>();
  const now = new Date();
  const todayKey = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime().toString();
  const yesterdayKey = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime().toString();

  for (const r of receipts) {
    const d = new Date(r.created_at);
    const dayKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime().toString();
    let label = `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
    if (dayKey === todayKey) label = "今天";
    else if (dayKey === yesterdayKey) label = "昨天";

    if (!map.has(dayKey)) map.set(dayKey, { label, items: [] });
    map.get(dayKey)!.items.push(r);
  }
  return [...map.values()];
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "linear-gradient(135deg, #667eea11 0%, #764ba211 100%), #f1f5f9",
    padding: "max(env(safe-area-inset-top), 20px) 16px calc(80px + env(safe-area-inset-bottom, 16px))",
  },
  wrap: { maxWidth: 440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 },
  title: {
    fontSize: 22, fontWeight: 800, textAlign: "center", padding: "4px 0",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  card: {
    background: "#fff", borderRadius: 20, padding: 14,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03)",
  },
  groupLabel: {
    fontSize: 13, fontWeight: 700, color: "#64748b", padding: "12px 4px 6px",
  },
  receiptRow: {
    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
    borderRadius: 16, background: "#fff", marginBottom: 8,
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    cursor: "pointer", transition: "transform 0.1s",
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 14, display: "flex",
    alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
  },
  detailPanel: {
    background: "#f8fafc", borderRadius: 14, padding: 12, marginTop: 8, marginBottom: 8,
    marginLeft: 4, marginRight: 4,
    animation: "fadeSlideUp 0.2s ease-out",
  },
  deleteBtn: {
    border: "none", background: "#fee2e2", color: "#dc2626",
    borderRadius: 10, padding: "8px 16px", fontSize: 13,
    fontWeight: 600, cursor: "pointer", width: "100%", marginTop: 8,
  },
};

/* ── Props ── */
interface Props {
  receipts: Receipt[];
  loading: boolean;
  onDelete: () => void;
}

export default function ReceiptList({ receipts, loading, onDelete }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("確定要刪除這筆記錄嗎？")) return;
    setDeleting(id);
    try {
      const { deleteReceipt } = await import("../lib/supabase");
      await deleteReceipt(id);
      onDelete();
    } catch (err: any) {
      alert(err.message || "刪除失敗");
    } finally {
      setDeleting(null);
    }
  };

  const groups = groupByDate(receipts);

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.title}>📋 消費清單</div>
        <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
          共 {receipts.length} 筆記錄
        </div>

        {loading ? (
          <div style={{ ...s.card, textAlign: "center", padding: 40 }}>
            <span className="spinner" style={{ borderColor: "#e2e8f0", borderTopColor: "#2563eb" }} />
            <div style={{ marginTop: 12, fontSize: 14, color: "#94a3b8" }}>載入中...</div>
          </div>
        ) : receipts.length === 0 ? (
          <div style={{ ...s.card, textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48 }}>🧾</div>
            <div style={{ marginTop: 12, fontSize: 15, fontWeight: 600, color: "#64748b" }}>
              還沒有任何記錄
            </div>
            <div style={{ marginTop: 4, fontSize: 13, color: "#94a3b8" }}>
              拍照或手動新增你的第一筆消費吧！
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div style={s.groupLabel}>{group.label}</div>
              {group.items.map((r) => {
                const isExpanded = expandedId === r.id;
                const color = categoryColors[r.category] || "#64748b";
                return (
                  <div key={r.id}>
                    <div
                      style={{
                        ...s.receiptRow,
                        ...(isExpanded ? { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 } : {}),
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    >
                      <div style={{ ...s.iconCircle, background: `${color}15`, color }}>
                        {r.icon || "🧾"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 15, fontWeight: 600 }}>{r.category}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                          {formatDate(r.created_at)} · {r.items?.length || 0} 項
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 700 }}>
                          NT${r.twd_amount?.toLocaleString() || r.total_amount?.toLocaleString()}
                        </div>
                        {r.currency !== "TWD" && (
                          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                            {currencySymbols[r.currency] || ""}{r.total_amount?.toLocaleString()} {r.currency}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#cbd5e1", flexShrink: 0 }}>
                        {isExpanded ? "▲" : "▼"}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={s.detailPanel}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                          消費明細
                        </div>
                        {(r.items || []).map((item, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex", justifyContent: "space-between",
                              padding: "6px 0",
                              borderBottom: i < (r.items?.length || 0) - 1 ? "1px solid #e2e8f0" : "none",
                            }}
                          >
                            <span style={{ fontSize: 13 }}>{item.name}</span>
                            <span style={{ fontSize: 13, color: "#64748b" }}>
                              {currencySymbols[r.currency] || ""}{item.price?.toLocaleString()} × {item.quantity}
                            </span>
                          </div>
                        ))}
                        {r.currency !== "TWD" && r.exchange_rate && (
                          <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>
                            匯率：{r.exchange_rate}
                          </div>
                        )}
                        <button
                          style={{ ...s.deleteBtn, opacity: deleting === r.id ? 0.5 : 1 }}
                          onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                          disabled={deleting === r.id}
                        >
                          {deleting === r.id ? "刪除中..." : "🗑️ 刪除此筆記錄"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
