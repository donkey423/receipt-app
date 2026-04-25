import { useMemo, useState } from "react";
import type { Receipt } from "../lib/supabase";

/* ── Constants ── */
const categoryColors: Record<string, string> = {
  餐飲: "#f97316", 交通: "#3b82f6", 日用品: "#10b981",
  娛樂: "#8b5cf6", 醫療: "#ef4444", 學習: "#06b6d4", 其他: "#64748b",
};

type Period = "week" | "month" | "all";

/* ── Helpers ── */
function filterByPeriod(receipts: Receipt[], period: Period): Receipt[] {
  if (period === "all") return receipts;
  const now = new Date();
  return receipts.filter((r) => {
    const d = new Date(r.created_at);
    if (period === "month") {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    // week: last 7 days
    const diff = now.getTime() - d.getTime();
    return diff <= 7 * 24 * 60 * 60 * 1000;
  });
}

function getCategoryStats(receipts: Receipt[]) {
  const map = new Map<string, { total: number; count: number; icon: string }>();
  for (const r of receipts) {
    const e = map.get(r.category) || { total: 0, count: 0, icon: r.icon || "🧾" };
    e.total += r.twd_amount || r.total_amount || 0;
    e.count += 1;
    map.set(r.category, e);
  }
  const grand = [...map.values()].reduce((s, v) => s + v.total, 0);
  return [...map.entries()]
    .map(([cat, v]) => ({
      category: cat,
      icon: v.icon,
      total: Math.round(v.total),
      count: v.count,
      pct: grand > 0 ? (v.total / grand) * 100 : 0,
      color: categoryColors[cat] || "#64748b",
    }))
    .sort((a, b) => b.total - a.total);
}

function getDailySpending(receipts: Receipt[]): { label: string; amount: number; dayNum: number }[] {
  const map = new Map<string, { amount: number; dayNum: number }>();
  for (const r of receipts) {
    const d = new Date(r.created_at);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    const existing = map.get(key) || { amount: 0, dayNum: d.getDate() };
    existing.amount += r.twd_amount || r.total_amount || 0;
    map.set(key, existing);
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, amount: Math.round(v.amount), dayNum: v.dayNum }))
    .sort((a, b) => a.dayNum - b.dayNum);
}

function getCurrencyDist(receipts: Receipt[]) {
  const map = new Map<string, number>();
  for (const r of receipts) {
    map.set(r.currency, (map.get(r.currency) || 0) + 1);
  }
  const total = receipts.length || 1;
  return [...map.entries()]
    .map(([cur, count]) => ({ currency: cur, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "linear-gradient(135deg, #667eea11 0%, #764ba211 100%), #f1f5f9",
    padding: "max(env(safe-area-inset-top), 20px) 16px calc(80px + env(safe-area-inset-bottom, 16px))",
  },
  wrap: { maxWidth: 440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12 },
  title: {
    fontSize: 22, fontWeight: 800, textAlign: "center", padding: "4px 0",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  card: {
    background: "#fff", borderRadius: 20, padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03)",
  },
  periodWrap: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4,
    background: "#f1f5f9", borderRadius: 14, padding: 3,
  },
  periodBtn: {
    borderRadius: 11, padding: "8px 6px", fontSize: 13, fontWeight: 600,
    border: "none", cursor: "pointer", transition: "all 0.2s",
  },
  summaryGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
  },
  summaryCard: {
    borderRadius: 16, padding: "14px 10px", textAlign: "center",
  },
};

/* ── Props ── */
interface Props {
  receipts: Receipt[];
  loading: boolean;
}

export default function ReceiptStats({ receipts, loading }: Props) {
  const [period, setPeriod] = useState<Period>("month");

  const filtered = useMemo(() => filterByPeriod(receipts, period), [receipts, period]);
  const catStats = useMemo(() => getCategoryStats(filtered), [filtered]);
  const dailyData = useMemo(() => getDailySpending(filtered), [filtered]);
  const currDist = useMemo(() => getCurrencyDist(filtered), [filtered]);

  const totalSpending = filtered.reduce((s, r) => s + (r.twd_amount || r.total_amount || 0), 0);
  const avgSpending = filtered.length > 0 ? totalSpending / filtered.length : 0;
  const maxDaily = Math.max(...dailyData.map((d) => d.amount), 1);
  const maxCat = catStats.length > 0 ? catStats[0].total : 1;

  const periodLabels: Record<Period, string> = { week: "本週", month: "本月", all: "全部" };

  if (loading) {
    return (
      <div style={s.page}>
        <div style={{ ...s.card, maxWidth: 440, margin: "0 auto", textAlign: "center", padding: 40 }}>
          <span className="spinner" style={{ borderColor: "#e2e8f0", borderTopColor: "#2563eb" }} />
          <div style={{ marginTop: 12, fontSize: 14, color: "#94a3b8" }}>載入中...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.title}>📊 消費統計</div>

        {/* Period Selector */}
        <div style={s.card}>
          <div style={s.periodWrap}>
            {(["week", "month", "all"] as Period[]).map((p) => (
              <button
                key={p}
                style={{
                  ...s.periodBtn,
                  background: period === p ? "linear-gradient(135deg, #2563eb, #3b82f6)" : "transparent",
                  color: period === p ? "#fff" : "#64748b",
                  boxShadow: period === p ? "0 2px 8px rgba(37,99,235,0.25)" : "none",
                }}
                onClick={() => setPeriod(p)}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div style={s.summaryGrid}>
          <div style={{ ...s.summaryCard, background: "linear-gradient(135deg, #eff6ff, #dbeafe)" }}>
            <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600 }}>總支出</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#1e40af", marginTop: 4 }}>
              {Math.round(totalSpending).toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: "#60a5fa" }}>NT$</div>
          </div>
          <div style={{ ...s.summaryCard, background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}>
            <div style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>筆數</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#15803d", marginTop: 4 }}>
              {filtered.length}
            </div>
            <div style={{ fontSize: 10, color: "#4ade80" }}>筆</div>
          </div>
          <div style={{ ...s.summaryCard, background: "linear-gradient(135deg, #fdf4ff, #fae8ff)" }}>
            <div style={{ fontSize: 11, color: "#a855f7", fontWeight: 600 }}>平均</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#7e22ce", marginTop: 4 }}>
              {Math.round(avgSpending).toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: "#c084fc" }}>NT$/筆</div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ ...s.card, textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 40 }}>📭</div>
            <div style={{ marginTop: 8, fontSize: 14, color: "#94a3b8" }}>
              {periodLabels[period]}還沒有消費記錄
            </div>
          </div>
        ) : (
          <>
            {/* Category Breakdown */}
            <div style={s.card}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#1e293b" }}>
                📂 分類支出
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {catStats.map((cat) => (
                  <div key={cat.category}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>
                        {cat.icon} {cat.category}
                        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>{cat.count}筆</span>
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: cat.color }}>
                        NT${cat.total.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${(cat.total / maxCat) * 100}%`,
                          background: `linear-gradient(90deg, ${cat.color}, ${cat.color}bb)`,
                          borderRadius: 4,
                          transition: "width 0.6s ease-out",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, textAlign: "right" }}>
                      {cat.pct.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Daily Spending Chart */}
            {dailyData.length > 1 && (
              <div style={s.card}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: "#1e293b" }}>
                  📈 每日消費
                </div>
                <div
                  style={{
                    display: "flex", alignItems: "flex-end", gap: 3,
                    height: 140, padding: "0 4px",
                  }}
                >
                  {dailyData.map((d, i) => {
                    const h = (d.amount / maxDaily) * 100;
                    return (
                      <div
                        key={i}
                        style={{
                          flex: 1, display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "flex-end", height: "100%",
                        }}
                      >
                        <div
                          style={{ fontSize: 9, color: "#64748b", fontWeight: 600, marginBottom: 2 }}
                        >
                          {d.amount >= 1000 ? `${(d.amount / 1000).toFixed(1)}k` : d.amount}
                        </div>
                        <div
                          style={{
                            width: "100%", maxWidth: 32,
                            height: `${Math.max(h, 4)}%`,
                            background: `linear-gradient(180deg, #3b82f6, #2563eb)`,
                            borderRadius: "6px 6px 2px 2px",
                            transition: "height 0.5s ease-out",
                          }}
                        />
                        <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4 }}>{d.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Currency Distribution */}
            {currDist.length > 1 && (
              <div style={s.card}>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#1e293b" }}>
                  💱 幣別分佈
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {currDist.map((c) => (
                    <div key={c.currency} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: "#1e293b", width: 40,
                      }}>{c.currency}</span>
                      <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${c.pct}%`,
                          background: "linear-gradient(90deg, #8b5cf6, #a78bfa)",
                          borderRadius: 3,
                        }} />
                      </div>
                      <span style={{ fontSize: 12, color: "#64748b", width: 50, textAlign: "right" }}>
                        {c.count}筆 ({c.pct.toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
