import type { Receipt, ReceiptItem } from "./supabase";

export interface ReceiptData {
  currency: string;
  total_amount: number;
  category?: string;
  date?: string;
  icon?: string;
  items: ReceiptItem[];
  note?: string;
}

export interface NormalizedReceiptResult {
  receipt: ReceiptData;
  warning?: string;
}

export interface SettlementItem extends ReceiptItem {
  receiptId: string;
  date: string;
  effectiveNote: string;
  itemTwd: number;
  currency: string;
}

const SELF_LABEL = "我 (我自己)";

export const KNOWN_CURRENCIES = new Set([
  "TWD", "JPY", "USD", "EUR", "HKD", "THB", "KRW",
  "CHF", "ISK", "VND", "SGD", "CNY", "GBP", "AUD",
]);

export function todayISODate(now = new Date()): string {
  return now.toISOString().split("T")[0];
}

export function normalizeReceipt(raw: any, fallbackCurrency = "TWD", now = new Date()): NormalizedReceiptResult {
  const currency = typeof raw?.currency === "string" && KNOWN_CURRENCIES.has(raw.currency.toUpperCase())
    ? raw.currency.toUpperCase()
    : fallbackCurrency;

  let items: ReceiptItem[] = Array.isArray(raw?.items)
    ? raw.items.map((item: any) => ({
        name: String(item?.name || "未命名品項").trim(),
        price: Number(item?.price),
        quantity: Number(item?.quantity || 1),
        note: item?.note ? String(item.note).trim() : null,
      })).filter((item: ReceiptItem) => Number.isFinite(item.price) && Number.isFinite(item.quantity))
    : [];

  let totalAmount = Number(raw?.total_amount);
  const itemTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    totalAmount = itemTotal > 0 ? itemTotal : 0;
  }

  let warning: string | undefined;
  if (items.length === 0 && totalAmount > 0) {
    items = [{ name: "收據總額", price: totalAmount, quantity: 1 }];
    warning = "AI 未回傳品項，已先建立總額品項，儲存前可再補明細。";
  } else {
    const diff = Math.round((totalAmount - itemTotal) * 100) / 100;
    if (Math.abs(diff) > 1) {
      items = [...items, { name: "未分配差額", price: diff, quantity: 1 }];
      warning = `品項加總與總額相差 ${diff.toLocaleString()}，已新增差額項目，請確認。`;
    }
  }

  const date = typeof raw?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)
    ? raw.date
    : todayISODate(now);

  return {
    receipt: {
      currency,
      total_amount: totalAmount,
      date,
      items,
      note: raw?.note ? String(raw.note).trim() : undefined,
    },
    warning,
  };
}

export function receiptSettlementItems(receipt: Receipt): SettlementItem[] {
  const items = receipt.items || [];
  if (items.length === 0) return [];

  const baseValues = items.map(item => {
    const base = item.price * item.quantity;
    return receipt.currency === "TWD"
      ? base
      : base * (receipt.exchange_rate || 1);
  });

  const baseTotal = baseValues.reduce((sum, value) => sum + value, 0);
  const receiptTwd = Number.isFinite(receipt.twd_amount) && receipt.twd_amount > 0
    ? receipt.twd_amount
    : Math.round(baseTotal);

  let allocated = 0;
  return items.map((item, index) => {
    const isLast = index === items.length - 1;
    const itemTwd = isLast
      ? receiptTwd - allocated
      : Math.round(baseTotal > 0 ? (baseValues[index] / baseTotal) * receiptTwd : receiptTwd / items.length);
    allocated += itemTwd;

    return {
      ...item,
      receiptId: receipt.id,
      date: receipt.created_at,
      effectiveNote: item.note?.trim() || receipt.note?.trim() || SELF_LABEL,
      itemTwd,
      currency: receipt.currency,
    };
  });
}
