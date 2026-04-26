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
  existingNotes: string[];
}

export default function ReceiptList({ receipts, loading, onDelete, existingNotes }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editNote, setEditNote] = useState<string>("");
  const [editItems, setEditItems] = useState<any[]>([]);
  const [updating, setUpdating] = useState(false);

  const startEdit = (r: Receipt) => {
    setEditingId(r.id);
    setEditAmount(r.twd_amount);
    setEditNote(r.note || "");
    setEditItems([...(r.items || [])]);
  };

  const handleUpdate = async (id: string) => {
    setUpdating(true);
    try {
      const { updateReceipt } = await import("../lib/supabase");
      await updateReceipt(id, { 
        twd_amount: editAmount, 
        note: editNote || null,
        items: editItems
      });
      setEditingId(null);
      onDelete(); // 使用 onDelete 來觸發 App 重新載入列表
    } catch (err: any) {
      alert(err.message || "更新失敗");
    } finally {
      setUpdating(false);
    }
  };

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

  const handleDeleteAll = async () => {
    if (!confirm(`確定要刪除全部 ${receipts.length} 筆記錄嗎？\n\n此操作無法復原！`)) return;
    setDeletingAll(true);
    try {
      const { deleteAllReceipts } = await import("../lib/supabase");
      await deleteAllReceipts();
      onDelete();
    } catch (err: any) {
      alert(err.message || "全部刪除失敗");
    } finally {
      setDeletingAll(false);
    }
  };

  const handleExportCSV = () => {
    if (receipts.length === 0) return;
    
    let csv = "日期,時間,分類,幣別,外幣總額,台幣總額,匯率,備註,商品明細\n";
    
    receipts.forEach(r => {
      const d = new Date(r.created_at);
      const date = `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
      const time = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
      
      const itemsStr = (r.items || []).map(item => `${item.name} (${item.quantity})`).join(" + ");
      const safeItems = `"${itemsStr.replace(/"/g, '""')}"`;
      
      csv += `${date},${time},${r.category},${r.currency},${r.total_amount || 0},${r.twd_amount || r.total_amount || 0},${r.exchange_rate || 1},${r.note || "我"},${safeItems}\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    const today = new Date();
    const dateStr = `${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2,'0')}${today.getDate().toString().padStart(2,'0')}`;
    link.download = `記帳清單_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const groups = groupByDate(receipts);

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.title}>📋 消費清單</div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>共 {receipts.length} 筆</span>
          <div style={{ flex: 1 }} />
          {receipts.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                style={{
                  border: "none", background: "#dcfce7", color: "#16a34a",
                  borderRadius: 8, padding: "5px 12px", fontSize: 12,
                  fontWeight: 600, cursor: "pointer",
                }}
              >
                📊 下載 Excel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                style={{
                  border: "none", background: "#fee2e2", color: "#dc2626",
                  borderRadius: 8, padding: "5px 12px", fontSize: 12,
                  fontWeight: 600, cursor: "pointer", opacity: deletingAll ? 0.5 : 1,
                }}
              >
                {deletingAll ? "..." : "🗑️ 清空"}
              </button>
            </>
          )}
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
                        {r.note && (
                          <div style={{ display: "inline-flex", marginTop: 4, background: "#f1f5f9", padding: "2px 6px", borderRadius: 6, fontSize: 11, color: "#64748b", fontWeight: 700 }}>
                            👤 {r.note}
                          </div>
                        )}
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
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                          style={{ border: "none", background: "none", cursor: "pointer", fontSize: 16, padding: "4px" }}
                          title="刪除"
                        >
                          🗑️
                        </button>
                        <div style={{ fontSize: 12, color: "#cbd5e1" }}>
                          {isExpanded ? "▲" : "▼"}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={s.detailPanel}>
                        {editingId === r.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "4px 0" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1e3a8a" }}>✏️ 快速修改</div>
                            <div>
                              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>台幣金額 (TWD)</label>
                              <input 
                                type="number" 
                                style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 16, fontWeight: 700 }}
                                value={editAmount}
                                onChange={(e) => setEditAmount(Number(e.target.value))}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>備註 (人名)</label>
                              <input 
                                type="text" 
                                list="existing-notes"
                                style={{ width: "100%", padding: "10px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 14 }}
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                placeholder="如：姐姐"
                              />
                            </div>

                            <div style={{ marginTop: 8 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 6 }}>各品項備註：</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {editItems.map((item, idx) => (
                                  <div key={idx} style={{ background: "#f8fafc", padding: 8, borderRadius: 10, border: "1px solid #e2e8f0" }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>{item.name}</div>
                                    <input 
                                      type="text"
                                      list="existing-notes"
                                      placeholder="品項備註 (如：姐姐)"
                                      style={{ ...s.input, padding: "6px 10px", fontSize: 12, borderRadius: 8 }}
                                      value={item.note || ""}
                                      onChange={(e) => {
                                        const next = [...editItems];
                                        next[idx] = { ...item, note: e.target.value };
                                        setEditItems(next);
                                      }}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                              <button
                                onClick={() => setEditingId(null)}
                                style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", fontWeight: 600, cursor: "pointer" }}
                              >
                                取消
                              </button>
                              <button
                                onClick={() => handleUpdate(r.id)}
                                disabled={updating}
                                style={{ flex: 2, padding: "10px", borderRadius: 10, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: updating ? 0.7 : 1 }}
                              >
                                {updating ? "儲存中..." : "💾 儲存修改"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>消費明細</div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); startEdit(r); }}
                                style={{ border: "none", background: "#fff", color: "#2563eb", fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 8, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}
                              >
                                ✎ 修改金額/備註
                              </button>
                            </div>
                          </>
                        )}
                        {(r.items || []).map((item, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex", justifyContent: "space-between",
                              padding: "6px 0",
                              borderBottom: i < (r.items?.length || 0) - 1 ? "1px solid #e2e8f0" : "none",
                            }}
                          >
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                              {item.note && (
                                <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 700 }}>👤 {item.note}</span>
                              )}
                            </div>
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
      <datalist id="existing-notes">
        {existingNotes.map(n => <option key={n} value={n} />)}
      </datalist>
    </div>
  );
}
