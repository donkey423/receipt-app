import { ChangeEvent, FormEvent, useState } from "react";
import { createReceipt } from "../lib/supabase";

/* ── Types ── */
interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
}

interface ReceiptData {
  currency: string;
  total_amount: number;
  category: string;
  icon: string;
  items: ReceiptItem[];
}

type InputMode = "camera" | "manual";

interface ManualFormState {
  amount: string;
  currency: "TWD" | "JPY" | "USD";
  category: "餐飲" | "交通" | "日用品" | "娛樂" | "醫療" | "學習" | "其他";
}

/* ── Constants ── */
const categoryIconMap: Record<string, string> = {
  餐飲: "🍔", 交通: "🚌", 日用品: "🛒",
  娛樂: "🎮", 醫療: "💊", 學習: "📚", 其他: "🧾",
};

const currencySymbols: Record<string, string> = {
  TWD: "NT$", JPY: "¥", USD: "$", EUR: "€",
};

/* ── Image Resize Utility ── */
function resizeImage(file: File, maxDim = 1200): Promise<{ base64: string; mediaType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        resolve({ base64: dataUrl.split(",")[1], mediaType: "image/jpeg", previewUrl: dataUrl });
      };
      img.onerror = () => reject(new Error("圖片載入失敗"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("檔案讀取失敗"));
    reader.readAsDataURL(file);
  });
}

/* ── Styles ── */
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100dvh",
    background: "linear-gradient(135deg, #667eea11 0%, #764ba211 100%), #f1f5f9",
    padding: "max(env(safe-area-inset-top), 20px) 16px calc(80px + env(safe-area-inset-bottom, 16px))",
  },
  wrap: { maxWidth: 440, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12, paddingBottom: 20 },
  header: { textAlign: "center", padding: "4px 0" },
  headerTitle: {
    fontSize: 22, fontWeight: 800,
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: 1,
  },
  headerSub: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  card: {
    background: "#fff", borderRadius: 24, padding: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03)",
  },
  tabWrap: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, background: "#f1f5f9", borderRadius: 18, padding: 4 },
  tabActive: {
    borderRadius: 14, padding: "11px 8px", fontSize: 14, fontWeight: 700,
    border: "none", cursor: "pointer", transition: "all 0.2s",
    background: "linear-gradient(135deg, #2563eb, #3b82f6)", color: "#fff",
    boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
  },
  tabInactive: {
    borderRadius: 14, padding: "11px 8px", fontSize: 14, fontWeight: 500,
    border: "none", cursor: "pointer", background: "transparent", color: "#475569", transition: "all 0.2s",
  },
  uploadZone: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    minHeight: 180, border: "2px dashed #cbd5e1", borderRadius: 20, background: "#f8fafc",
    cursor: "pointer", padding: "24px 16px", textAlign: "center", gap: 8,
  },
  uploadZoneWithImage: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    border: "2px solid #2563eb33", borderRadius: 20, background: "#eff6ff",
    cursor: "pointer", padding: 12, textAlign: "center", gap: 8,
  },
  btn: {
    width: "100%", borderRadius: 16, padding: "14px 16px", fontSize: 15,
    fontWeight: 700, border: "none", cursor: "pointer", transition: "transform 0.1s, box-shadow 0.2s",
  },
  input: {
    width: "100%", border: "1.5px solid #e2e8f0", background: "#f8fafc", borderRadius: 14,
    padding: "12px 16px", fontSize: 15, outline: "none", color: "#1e293b", fontFamily: "inherit",
  },
  label: { fontSize: 13, fontWeight: 500, color: "#475569", display: "block", marginBottom: 6 },
  preview: { width: "100%", maxHeight: 220, objectFit: "contain", borderRadius: 16 },
};

/* ── Props ── */
interface Props {
  onSaved?: () => void;
  receiptCount?: number;
}

/* ── Component ── */
export default function ReceiptRecorderCard({ onSaved, receiptCount }: Props) {
  const [inputMode, setInputMode] = useState<InputMode>("camera");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(0.22);
  const [manualForm, setManualForm] = useState<ManualFormState>({ amount: "", currency: "TWD", category: "餐飲" });

  // Image
  const [imagePreview, setImagePreview] = useState("");
  const [imageBase64, setImageBase64] = useState("");
  const [imageMediaType, setImageMediaType] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("");

  // Async
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  /* ── Handlers ── */
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setError(""); setReceipt(null); setSaved(false);
    try {
      const result = await resizeImage(file);
      setImagePreview(result.previewUrl);
      setImageBase64(result.base64);
      setImageMediaType(result.mediaType);
    } catch (err: any) {
      setError(err.message || "圖片處理失敗");
    }
  };

  const handleOCR = async () => {
    if (!imageBase64) { setError("請先拍照或選取收據圖片"); return; }
    setLoading(true); setError(""); setReceipt(null); setSaved(false);
    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64, mediaType: imageMediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `辨識失敗 (${res.status})`);
      setReceipt({ ...data, icon: categoryIconMap[data.category] || "🧾" });
    } catch (err: any) {
      setError(err.message || "辨識失敗，請重試");
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = Number(manualForm.amount);
    if (!amount || amount <= 0) return;
    setReceipt({
      currency: manualForm.currency, total_amount: amount,
      category: manualForm.category, icon: categoryIconMap[manualForm.category],
      items: [{ name: "手動記帳", price: amount, quantity: 1 }],
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!receipt) return;
    setSaving(true); setError("");
    try {
      const twdAmount = receipt.currency === "TWD"
        ? receipt.total_amount
        : Math.round(receipt.total_amount * exchangeRate);

      await createReceipt({
        currency: receipt.currency,
        total_amount: receipt.total_amount,
        twd_amount: twdAmount,
        exchange_rate: receipt.currency !== "TWD" ? exchangeRate : null,
        category: receipt.category,
        icon: receipt.icon,
        items: receipt.items,
      });
      setSaved(true);
      onSaved?.();
    } catch (err: any) {
      setError(err.message || "儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setReceipt(null); setImagePreview(""); setImageBase64("");
    setImageMediaType(""); setSelectedFileName("");
    setError(""); setSaved(false);
    setManualForm({ amount: "", currency: "TWD", category: "餐飲" });
  };

  const convertedTwd =
    receipt && receipt.currency !== "TWD"
      ? Math.round(receipt.total_amount * exchangeRate) : null;

  /* ── Render ── */
  return (
    <div style={s.page}>
      <div style={s.wrap}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerTitle}>📱 收據記錄</div>
          <div style={s.headerSub}>
            拍照即辨識 · AI 智慧分類
            {(receiptCount ?? 0) > 0 && <span> · 已記錄 {receiptCount} 筆</span>}
          </div>
        </div>

        {/* Tab */}
        <div style={s.card}>
          <div style={s.tabWrap}>
            <button style={inputMode === "camera" ? s.tabActive : s.tabInactive}
              onClick={() => { setInputMode("camera"); setReceipt(null); setSaved(false); }}>
              📸 拍照辨識
            </button>
            <button style={inputMode === "manual" ? s.tabActive : s.tabInactive}
              onClick={() => { setInputMode("manual"); setReceipt(null); setSaved(false); }}>
              ✍️ 手動輸入
            </button>
          </div>
        </div>

        {/* Input Panel */}
        <div style={s.card}>
          {inputMode === "camera" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={imagePreview ? s.uploadZoneWithImage : s.uploadZone}>
                <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} style={{ display: "none" }} />
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="收據預覽" style={s.preview} />
                    <span style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                      📎 {selectedFileName}
                      <span style={{ color: "#2563eb", fontWeight: 600, marginLeft: 8 }}>重新選擇</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 48 }}>📷</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>點擊拍照或上傳收據</span>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>支援手機相機與相簿選取</span>
                  </>
                )}
              </label>
              <button
                style={{
                  ...s.btn,
                  background: loading ? "#94a3b8" : imageBase64 ? "linear-gradient(135deg, #f59e0b, #f97316)" : "#cbd5e1",
                  color: "#fff",
                  boxShadow: imageBase64 && !loading ? "0 4px 12px rgba(245,158,11,0.3)" : "none",
                  pointerEvents: loading || !imageBase64 ? "none" : "auto",
                }}
                onClick={handleOCR} disabled={loading || !imageBase64}
              >
                {loading ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className="spinner" /> AI 辨識中...
                  </span>
                ) : "🤖 開始 AI 辨識"}
              </button>
            </div>
          ) : (
            <form style={{ display: "flex", flexDirection: "column", gap: 14 }} onSubmit={handleManualSubmit}>
              <div>
                <label style={s.label}>總金額</label>
                <input type="number" min="0" step="0.01" placeholder="請輸入金額"
                  style={s.input} value={manualForm.amount}
                  onChange={(e) => setManualForm((p) => ({ ...p, amount: e.target.value }))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={s.label}>幣別</label>
                  <select style={s.input} value={manualForm.currency}
                    onChange={(e) => setManualForm((p) => ({ ...p, currency: e.target.value as ManualFormState["currency"] }))}>
                    <option value="TWD">TWD 台幣</option>
                    <option value="JPY">JPY 日幣</option>
                    <option value="USD">USD 美元</option>
                  </select>
                </div>
                <div>
                  <label style={s.label}>分類</label>
                  <select style={s.input} value={manualForm.category}
                    onChange={(e) => setManualForm((p) => ({ ...p, category: e.target.value as ManualFormState["category"] }))}>
                    {Object.entries(categoryIconMap).map(([c, icon]) => (
                      <option key={c} value={c}>{icon} {c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" style={{
                ...s.btn, background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff",
                boxShadow: "0 4px 12px rgba(5,150,105,0.3)",
              }}>✅ 確認新增</button>
            </form>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            ...s.card, background: "#fef2f2", border: "1px solid #fecaca",
            display: "flex", alignItems: "center", gap: 10, padding: 14, borderRadius: 16,
          }}>
            <span style={{ fontSize: 20 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#dc2626" }}>操作失敗</div>
              <div style={{ fontSize: 13, color: "#b91c1c", marginTop: 2 }}>{error}</div>
            </div>
            {inputMode === "camera" && imageBase64 && (
              <button style={{
                border: "none", background: "#dc2626", color: "#fff", borderRadius: 10,
                padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }} onClick={handleOCR}>重試</button>
            )}
          </div>
        )}

        {/* Receipt Result */}
        {receipt && (
          <div style={{
            ...s.card, padding: 20, display: "flex", flexDirection: "column", gap: 14,
            animation: "fadeSlideUp 0.35s ease-out",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 56, lineHeight: 1 }}>{receipt.icon}</div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>{receipt.category}</div>
            </div>

            <div style={{ background: "#f8fafc", borderRadius: 16, padding: 16, textAlign: "center" }}>
              {receipt.currency !== "TWD" ? (
                <>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#ef4444" }}>
                    NT$ {convertedTwd?.toLocaleString()}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#94a3b8" }}>
                    原始金額：{currencySymbols[receipt.currency] || ""}{receipt.total_amount.toLocaleString()} {receipt.currency}
                  </div>
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, color: "#64748b" }}>匯率</span>
                    <input type="number" step="0.001" value={exchangeRate}
                      onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
                      style={{
                        width: 88, borderRadius: 12, border: "1.5px solid #e2e8f0", background: "#fff",
                        padding: "6px 10px", textAlign: "center", fontSize: 14, outline: "none", fontFamily: "inherit",
                      }} />
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 30, fontWeight: 900, color: "#ef4444" }}>
                  NT$ {receipt.total_amount.toLocaleString()}
                </div>
              )}
            </div>

            {/* Items Detail */}
            <div style={{ border: "1.5px solid #f1f5f9", borderRadius: 16, overflow: "hidden" }}>
              <div style={{
                padding: "12px 16px", fontSize: 13, fontWeight: 700, color: "#475569",
                borderBottom: "1.5px solid #f1f5f9", background: "#fafbfc",
              }}>消費明細（{receipt.items.length} 項）</div>
              {receipt.items.map((item, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 16px",
                  borderBottom: i < receipt.items.length - 1 ? "1px solid #f1f5f9" : "none",
                }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</span>
                  <span style={{ fontSize: 13, color: "#94a3b8", whiteSpace: "nowrap" }}>
                    {currencySymbols[receipt.currency] || ""}{item.price.toLocaleString()} × {item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...s.btn, flex: 1, background: "#f1f5f9", color: "#475569" }} onClick={handleReset}>
                🔄 重新
              </button>
              <button
                style={{
                  ...s.btn, flex: 2,
                  background: saved
                    ? "linear-gradient(135deg, #059669, #10b981)"
                    : "linear-gradient(135deg, #2563eb, #3b82f6)",
                  color: "#fff",
                  boxShadow: saved ? "none" : "0 4px 12px rgba(37,99,235,0.3)",
                  pointerEvents: saved || saving ? "none" : "auto",
                  opacity: saving ? 0.7 : 1,
                }}
                onClick={handleSave} disabled={saved || saving}
              >
                {saving ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className="spinner" /> 儲存中...
                  </span>
                ) : saved ? "✅ 已儲存" : "💾 儲存至資料庫"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
