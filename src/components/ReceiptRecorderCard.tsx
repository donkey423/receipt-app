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

interface ImageFile {
  file: File;
  previewUrl: string;
  base64: string;
  mediaType: string;
}

interface OcrResult {
  image: ImageFile;
  receipt: ReceiptData | null;
  error: string;
  saving: boolean;
  saved: boolean;
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
  TWD: "NT$", JPY: "¥", USD: "$", EUR: "€", HKD: "HK$", THB: "฿", KRW: "₩",
  CHF: "Fr.", ISK: "kr.", VND: "₫", SGD: "S$", CNY: "¥", GBP: "£", AUD: "A$",
};

const DESTINATIONS = [
  { id: "jp", name: "🇯🇵 日本", currency: "JPY", rate: 0.22 },
  { id: "hk", name: "🇭🇰 香港", currency: "HKD", rate: 4.1 },
  { id: "kr", name: "🇰🇷 韓國", currency: "KRW", rate: 0.024 },
  { id: "th", name: "🇹🇭 泰國", currency: "THB", rate: 0.92 },
  { id: "ch", name: "🇨🇭 瑞士", currency: "CHF", rate: 35.5 },
  { id: "is", name: "🇮🇸 冰島", currency: "ISK", rate: 0.23 },
  { id: "vn", name: "🇻🇳 越南", currency: "VND", rate: 0.0013 },
  { id: "sg", name: "🇸🇬 新加坡", currency: "SGD", rate: 24.1 },
  { id: "eu", name: "🇪🇺 歐洲", currency: "EUR", rate: 35.5 },
  { id: "gb", name: "🇬🇧 英國", currency: "GBP", rate: 41.5 },
  { id: "us", name: "🇺🇸 美國", currency: "USD", rate: 32.2 },
  { id: "au", name: "🇦🇺 澳洲", currency: "AUD", rate: 21.5 },
  { id: "cn", name: "🇨🇳 中國", currency: "CNY", rate: 4.5 },
  { id: "tw", name: "🇹🇼 台灣", currency: "TWD", rate: 1 },
];

/* ── Image Resize ── */
function resizeImage(file: File, maxDim = 1000): Promise<{ base64: string; mediaType: string; previewUrl: string }> {
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
  btn: {
    width: "100%", borderRadius: 16, padding: "14px 16px", fontSize: 15,
    fontWeight: 700, border: "none", cursor: "pointer", transition: "transform 0.1s, box-shadow 0.2s",
  },
  input: {
    width: "100%", border: "1.5px solid #e2e8f0", background: "#f8fafc", borderRadius: 14,
    padding: "12px 16px", fontSize: 15, outline: "none", color: "#1e293b", fontFamily: "inherit",
  },
  label: { fontSize: 13, fontWeight: 500, color: "#475569", display: "block", marginBottom: 6 },
};

/* ── Props ── */
interface Props {
  onSaved?: () => void;
  receiptCount?: number;
}

/* ── Component ── */
export default function ReceiptRecorderCard({ onSaved, receiptCount }: Props) {
  const [inputMode, setInputMode] = useState<InputMode>("camera");
  const [destinationId, setDestinationId] = useState("jp");
  const [exchangeRate, setExchangeRate] = useState(0.22);
  const [isRateLoading, setIsRateLoading] = useState(false);
  const [manualForm, setManualForm] = useState<ManualFormState>({ amount: "", currency: "JPY", category: "餐飲" });

  // Multi-image states
  const [images, setImages] = useState<ImageFile[]>([]);
  const [results, setResults] = useState<OcrResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // Manual mode states
  const [manualReceipt, setManualReceipt] = useState<ReceiptData | null>(null);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualSaved, setManualSaved] = useState(false);
  const [error, setError] = useState("");

  // Quota states (1500 per day for Gemini Flash Free)
  const [quota, setQuota] = useState(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem("gemini_quota");
    if (saved) {
      const { date, count } = JSON.parse(saved);
      if (date === today) return count;
    }
    return 0;
  });

  const updateQuota = (count: number) => {
    const today = new Date().toDateString();
    const newCount = quota + count;
    setQuota(newCount);
    localStorage.setItem("gemini_quota", JSON.stringify({ date: today, count: newCount }));
  };

  const fetchRate = async (destId: string) => {
    const dest = DESTINATIONS.find(d => d.id === destId);
    if (!dest || dest.currency === "TWD") {
      setExchangeRate(1);
      return;
    }
    
    setIsRateLoading(true);
    try {
      // 使用 open.er-api.com (無須 key)
      const res = await fetch(`https://open.er-api.com/v6/latest/TWD`);
      const data = await res.json();
      if (data.result === "success" && data.rates[dest.currency]) {
        // 1 TWD = N Foreign -> 1 Foreign = 1/N TWD
        const rate = 1 / data.rates[dest.currency];
        setExchangeRate(parseFloat(rate.toFixed(4)));
      }
    } catch (e) {
      console.error("無法取得即時匯率:", e);
    }
    setIsRateLoading(false);
  };

  /* ── Handlers ── */
  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError(""); setResults([]);

    try {
      const processed: ImageFile[] = [];
      for (const file of files) {
        const result = await resizeImage(file);
        processed.push({ file, ...result });
      }
      setImages(processed);
    } catch (err: any) {
      setError(err.message || "圖片處理失敗");
    }
    // Reset file input so same files can be re-selected
    e.target.value = "";
  };

  const handleOCR = async () => {
    if (images.length === 0) { setError("請先拍照或選取收據圖片"); return; }
    setLoading(true); setError(""); setResults([]);
    setProgress({ done: 0, total: images.length });

    const newResults: OcrResult[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        const dest = DESTINATIONS.find(d => d.id === destinationId);
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            image: img.base64, 
            mediaType: img.mediaType,
            targetCurrency: dest?.currency
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `辨識失敗 (${res.status})`);
        newResults.push({
          image: img,
          receipt: { ...data, icon: categoryIconMap[data.category] || "🧾" },
          error: "", saving: false, saved: false,
        });
      } catch (err: any) {
        newResults.push({
          image: img, receipt: null,
          error: err.message || "辨識失敗", saving: false, saved: false,
        });
      }
      setProgress({ done: i + 1, total: images.length });
      updateQuota(1);
    }

    setResults(newResults);
    setLoading(false);
  };

  const handleSaveOne = async (index: number) => {
    const r = results[index];
    if (!r?.receipt) return;

    setResults(prev => prev.map((p, i) => i === index ? { ...p, saving: true } : p));
    try {
      const receipt = r.receipt;
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
      setResults(prev => prev.map((p, i) => i === index ? { ...p, saving: false, saved: true } : p));
      onSaved?.();
    } catch (err: any) {
      setResults(prev => prev.map((p, i) => i === index ? { ...p, saving: false, error: err.message } : p));
    }
  };

  const handleSaveAll = async () => {
    const unsaved = results.filter((r, i) => r.receipt && !r.saved).map((_, i) => i);
    for (const idx of unsaved) {
      const realIdx = results.findIndex((r, i) => r.receipt && !r.saved && i >= idx);
      if (realIdx >= 0) await handleSaveOne(realIdx);
    }
  };

  const handleManualSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amount = Number(manualForm.amount);
    if (!amount || amount <= 0) return;
    setManualReceipt({
      currency: manualForm.currency, total_amount: amount,
      category: manualForm.category, icon: categoryIconMap[manualForm.category],
      items: [{ name: "手動記帳", price: amount, quantity: 1 }],
    });
    setManualSaved(false);
  };

  const handleResultEdit = (index: number, updates: Partial<ReceiptData>) => {
    setResults(prev => prev.map((r, i) => {
      if (i !== index || !r.receipt) return r;
      const newReceipt = { ...r.receipt, ...updates };
      
      // If items changed, recalculate total_amount
      if (updates.items) {
        newReceipt.total_amount = updates.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      }

      return {
        ...r,
        receipt: {
          ...newReceipt,
          icon: categoryIconMap[newReceipt.category] || "🧾"
        }
      };
    }));
  };

  const handleManualSave = async () => {
    if (!manualReceipt) return;
    setManualSaving(true); setError("");
    try {
      const twdAmount = manualReceipt.currency === "TWD"
        ? manualReceipt.total_amount
        : Math.round(manualReceipt.total_amount * exchangeRate);
      await createReceipt({
        currency: manualReceipt.currency, total_amount: manualReceipt.total_amount,
        twd_amount: twdAmount,
        exchange_rate: manualReceipt.currency !== "TWD" ? exchangeRate : null,
        category: manualReceipt.category, icon: manualReceipt.icon,
        items: manualReceipt.items,
      });
      setManualSaved(true);
      onSaved?.();
    } catch (err: any) {
      setError(err.message || "儲存失敗");
    } finally {
      setManualSaving(false);
    }
  };

  const handleReset = () => {
    setImages([]); setResults([]); setError("");
    setManualReceipt(null); setManualSaved(false);
    setManualForm({ amount: "", currency: "TWD", category: "餐飲" });
  };

  const successCount = results.filter(r => r.receipt && !r.error).length;
  const savedCount = results.filter(r => r.saved).length;
  const convertTwd = (receipt: ReceiptData) =>
    receipt.currency !== "TWD" ? Math.round(receipt.total_amount * exchangeRate) : null;

  /* ── Render ── */
  return (
    <div style={s.page}>
      <div style={s.wrap}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerTitle}>📱 收據記錄</div>

          {/* Destination Dropdown */}
          <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
            <div style={{ position: "relative", width: "100%", maxWidth: 280 }}>
              <label style={{ ...s.label, textAlign: "center" }}>🌍 選擇旅遊目的地</label>
              <select
                value={destinationId}
                onChange={(e) => {
                  const id = e.target.value;
                  const d = DESTINATIONS.find(x => x.id === id);
                  if (d) {
                    setDestinationId(id);
                    fetchRate(id);
                    setManualForm(prev => ({ ...prev, currency: d.currency as any }));
                  }
                }}
                style={{
                  ...s.input,
                  appearance: "none",
                  textAlign: "center",
                  background: "#fff",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                  cursor: "pointer",
                }}
              >
                {DESTINATIONS.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.currency})</option>
                ))}
              </select>
              <div style={{
                position: "absolute", right: 16, bottom: 14, pointerEvents: "none",
                fontSize: 12, color: "#94a3b8"
              }}>▼</div>
            </div>
          </div>

          <div style={{ marginTop: 14, fontSize: 13, color: "#2563eb", fontWeight: 700 }}>
            {isRateLoading ? (
              <span className="spinner" style={{ width: 14, height: 14, borderWeight: 2 }} />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <span>💰 1 {DESTINATIONS.find(d => d.id === destinationId)?.currency} =</span>
                <input
                  type="number"
                  step="0.0001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(Number(e.target.value) || 0)}
                  style={{
                    width: 90, border: "1px solid #e2e8f0", borderRadius: 8, padding: "4px 8px",
                    fontSize: 14, fontWeight: 800, textAlign: "center", background: "#f8fafc",
                    color: "#2563eb",
                  }}
                />
                <span>TWD</span>
              </div>
            )}
          </div>

          <div style={s.headerSub}>
            拍照即辨識 · 支援多張同時處理
            <div style={{ marginTop: 8, display: "flex", justifyContent: "center", gap: 12 }}>
              {(receiptCount ?? 0) > 0 && <span>🗂️ 已記錄 {receiptCount} 筆</span>}
              <span style={{ color: 1500 - quota < 50 ? "#ef4444" : "#10b981", fontWeight: 700 }}>
                🔋 今日剩餘 {Math.max(0, 1500 - quota)} 次
              </span>
            </div>
          </div>
        </div>

        {/* Tab */}
        <div style={s.card}>
          <div style={s.tabWrap}>
            <button style={inputMode === "camera" ? s.tabActive : s.tabInactive}
              onClick={() => { setInputMode("camera"); handleReset(); }}>
              📸 拍照辨識
            </button>
            <button style={inputMode === "manual" ? s.tabActive : s.tabInactive}
              onClick={() => { setInputMode("manual"); handleReset(); }}>
              ✍️ 手動輸入
            </button>
          </div>
        </div>

        {/* Input Panel */}
        <div style={s.card}>
          {inputMode === "camera" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={s.uploadZone}>
                <input type="file" accept="image/*" capture="environment" multiple
                  onChange={handleImageChange} style={{ display: "none" }} />
                {images.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: "100%" }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                      {images.map((img, i) => (
                        <img key={i} src={img.previewUrl} alt={`收據 ${i + 1}`}
                          style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 12, border: "2px solid #2563eb33" }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 13, color: "#2563eb", fontWeight: 600 }}>
                      已選 {images.length} 張 · 點擊重新選擇
                    </span>
                  </div>
                ) : (
                  <>
                    <span style={{ fontSize: 48 }}>📷</span>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "#1e293b" }}>點擊拍照或上傳收據</span>
                    <span style={{ fontSize: 13, color: "#94a3b8" }}>可一次選多張，每張各辨識一筆</span>
                  </>
                )}
              </label>
              <button
                style={{
                  ...s.btn,
                  background: loading ? "#94a3b8" : images.length > 0 ? "linear-gradient(135deg, #f59e0b, #f97316)" : "#cbd5e1",
                  color: "#fff",
                  boxShadow: images.length > 0 && !loading ? "0 4px 12px rgba(245,158,11,0.3)" : "none",
                  pointerEvents: loading || images.length === 0 ? "none" : "auto",
                }}
                onClick={handleOCR} disabled={loading || images.length === 0}
              >
                {loading ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span className="spinner" /> 辨識中 {progress.done}/{progress.total}...
                  </span>
                ) : images.length > 1 ? `🤖 辨識全部 ${images.length} 張` : "🤖 開始 AI 辨識"}
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
            <div style={{ flex: 1, fontSize: 13, color: "#dc2626" }}>{error}</div>
          </div>
        )}

        {/* OCR Results */}
        {results.length > 0 && (
          <>
            {/* Summary + Save All */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
              <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>
                辨識結果：{successCount}/{results.length} 成功
                {savedCount > 0 && ` · ${savedCount} 已儲存`}
              </span>
              {successCount > savedCount && (
                <button onClick={handleSaveAll} style={{
                  border: "none", background: "linear-gradient(135deg, #2563eb, #3b82f6)", color: "#fff",
                  borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>💾 全部儲存</button>
              )}
            </div>

            {results.map((r, i) => (
              <div key={i} style={{
                ...s.card, padding: 14, display: "flex", flexDirection: "column", gap: 10,
                animation: "fadeSlideUp 0.3s ease-out",
                opacity: r.saved ? 0.6 : 1,
                border: r.error && !r.receipt ? "1px solid #fecaca" : r.saved ? "1px solid #bbf7d0" : "none",
              }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <img src={r.image.previewUrl} alt="" style={{
                    width: 52, height: 52, objectFit: "cover", borderRadius: 12, flexShrink: 0,
                  }} />
                  {r.receipt ? (
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <select
                          style={{ ...s.input, padding: "4px 8px", fontSize: 13, width: "auto" }}
                          value={r.receipt.category}
                          onChange={(e) => handleResultEdit(i, { category: e.target.value })}
                        >
                          {Object.keys(categoryIconMap).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{currencySymbols[r.receipt.currency] || "$"}</span>
                          <input
                            type="number"
                            style={{ ...s.input, padding: "4px 8px", fontSize: 14, fontWeight: 800, color: "#ef4444" }}
                            value={r.receipt.total_amount}
                            onChange={(e) => handleResultEdit(i, { total_amount: Number(e.target.value) })}
                          />
                        </div>
                      </div>

                      {/* Items List (Editable) */}
                      <div style={{ background: "#f8fafc", borderRadius: 12, padding: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                        {r.receipt.items.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            <input
                              type="text"
                              style={{ ...s.input, padding: "2px 6px", fontSize: 12, flex: 2 }}
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...r.receipt!.items];
                                newItems[idx] = { ...item, name: e.target.value };
                                handleResultEdit(i, { items: newItems });
                              }}
                            />
                            <input
                              type="number"
                              style={{ ...s.input, padding: "2px 6px", fontSize: 12, flex: 1, textAlign: "right" }}
                              value={item.price}
                              onChange={(e) => {
                                const newItems = [...r.receipt!.items];
                                newItems[idx] = { ...item, price: Number(e.target.value) };
                                handleResultEdit(i, { items: newItems });
                              }}
                            />
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>x</span>
                            <input
                              type="number"
                              style={{ ...s.input, padding: "2px 6px", fontSize: 12, width: 35, textAlign: "center" }}
                              value={item.quantity}
                              onChange={(e) => {
                                const newItems = [...r.receipt!.items];
                                newItems[idx] = { ...item, quantity: Number(e.target.value) };
                                handleResultEdit(i, { items: newItems });
                              }}
                            />
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                          {r.receipt.currency === "TWD" ? "台幣計價" : `匯率後：NT$ ${convertTwd(r.receipt)?.toLocaleString()}`}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, fontSize: 13, color: "#dc2626" }}>❌ {r.error}</div>
                  )}

                  {r.receipt && (
                    <button
                      onClick={() => handleSaveOne(i)}
                      disabled={r.saved || r.saving}
                      style={{
                        border: "none", borderRadius: 12, padding: "8px 14px", fontSize: 13,
                        fontWeight: 600, cursor: "pointer", flexShrink: 0,
                        background: r.saved ? "#dcfce7" : r.saving ? "#e2e8f0" : "#2563eb",
                        color: r.saved ? "#16a34a" : r.saving ? "#94a3b8" : "#fff",
                      }}
                    >
                      {r.saving ? "..." : r.saved ? "✅" : "💾"}
                    </button>
                  )}
                </div>
              </div>
            ))}

            <button style={{ ...s.btn, background: "#f1f5f9", color: "#475569" }} onClick={handleReset}>
              🔄 重新開始
            </button>
          </>
        )}

        {/* Manual Receipt Result */}
        {manualReceipt && (
          <div style={{
            ...s.card, padding: 20, display: "flex", flexDirection: "column", gap: 14,
            animation: "fadeSlideUp 0.35s ease-out",
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 56, lineHeight: 1 }}>{manualReceipt.icon}</div>
              <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>{manualReceipt.category}</div>
            </div>
            <div style={{ background: "#f8fafc", borderRadius: 16, padding: 16, textAlign: "center" }}>
              {manualReceipt.currency !== "TWD" ? (
                <>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#ef4444" }}>
                    NT$ {convertTwd(manualReceipt)?.toLocaleString()}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "#94a3b8" }}>
                    {currencySymbols[manualReceipt.currency] || ""}{manualReceipt.total_amount.toLocaleString()} {manualReceipt.currency}
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
                  NT$ {manualReceipt.total_amount.toLocaleString()}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={{ ...s.btn, flex: 1, background: "#f1f5f9", color: "#475569" }} onClick={handleReset}>
                🔄 重新
              </button>
              <button
                style={{
                  ...s.btn, flex: 2,
                  background: manualSaved ? "linear-gradient(135deg, #059669, #10b981)" : "linear-gradient(135deg, #2563eb, #3b82f6)",
                  color: "#fff", pointerEvents: manualSaved || manualSaving ? "none" : "auto",
                  opacity: manualSaving ? 0.7 : 1,
                }}
                onClick={handleManualSave} disabled={manualSaved || manualSaving}
              >
                {manualSaving ? "儲存中..." : manualSaved ? "✅ 已儲存" : "💾 儲存"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
