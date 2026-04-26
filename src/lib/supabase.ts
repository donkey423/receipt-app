/* ── Supabase REST API Wrapper ── */

const SUPABASE_URL = "https://xpwucjblikcyvxjilkna.supabase.co/rest/v1";
const SUPABASE_KEY = "sb_publishable_zelt3y4wwzk4mFCKD9fQWw_qeMHzSIz";

const headers: Record<string, string> = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

/* ── Types ── */
export interface ReceiptItem {
  name: string;
  price: number;
  quantity: number;
  note?: string | null;
}

export interface Receipt {
  id: string;
  created_at: string;
  currency: string;
  total_amount: number;
  twd_amount: number;
  exchange_rate: number | null;
  category: string;
  icon: string;
  items: ReceiptItem[];
  note: string | null;
  trip_name: string;
  is_archived: boolean;
}

export interface ReceiptInsert {
  currency: string;
  total_amount: number;
  twd_amount: number;
  exchange_rate?: number | null;
  category: string;
  icon: string;
  items: ReceiptItem[];
  created_at?: string;
  note?: string | null;
  trip_name?: string;
  is_archived?: boolean;
}

/* ── API Functions ── */

export async function fetchReceipts(): Promise<Receipt[]> {
  const res = await fetch(
    `${SUPABASE_URL}/receipts?order=created_at.desc&select=*`,
    { headers }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `無法載入收據 (${res.status})`);
  }
  return res.json();
}

export async function createReceipt(data: ReceiptInsert): Promise<Receipt[]> {
  const res = await fetch(`${SUPABASE_URL}/receipts`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `儲存失敗 (${res.status})`);
  }
  return res.json();
}

export async function deleteReceipt(id: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/receipts?id=eq.${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `刪除失敗 (${res.status})`);
  }
}

export async function deleteAllReceipts(): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/receipts?id=not.is.null`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `全部刪除失敗 (${res.status})`);
  }
}

export async function updateReceipt(id: string, data: Partial<ReceiptInsert>): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/receipts?id=eq.${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `更新失敗 (${res.status})`);
  }
}
export async function archiveTrip(tripName: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/receipts?trip_name=eq.${tripName}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ is_archived: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `歸檔失敗 (${res.status})`);
  }
}

export async function renameTrip(oldName: string, newName: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/receipts?trip_name=eq.${oldName}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ trip_name: newName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `更名失敗 (${res.status})`);
  }
}
