// Kassa mantig‘i: sof funksiyalar (testlanadi). Main jarayon ma'lumotni shu orqali o‘zgartiradi.
import { MENU_SEED_VERSION, seedMenu } from "./menuSeed";
import type {
  CashEntry, Category, Check, Data, Line, Order, OrderType, Payment, Product, Settings, Staff,
} from "./types";

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const DEFAULT_SETTINGS: Settings = {
  restaurantName: "Do‘stlik oshxonasi",
  address: "",
  phone: "",
  serviceRate: 0,
  serviceOnTakeaway: false,
  apiUrl: "https://dostlik-res.netlify.app/api",
  receiptFooter: "Xaridingiz uchun rahmat!",
  receiptPrinter: "",
  kitchenPrinter: "",
  paperWidth: 80,
  printOnPay: true,
  printKitchen: false,
  zoom: 100,
  startBackground: "photo:zal",
  receiptNote: "",
  shashlikPrinter: "",
  siteSync: false,
  halls: [
    { id: "zal", name: "ZAL", tables: 14 },
    { id: "zal2", name: "ZAL 2", tables: 11 },
    { id: "karavat", name: "Karavot", tables: 2 },
    { id: "tashqari", name: "TASHQARI", tables: 8 },
    { id: "xona", name: "Xona", tables: 5 },
  ],
};

export function emptyData(): Data {
  return {
    version: 1,
    settings: structuredClone(DEFAULT_SETTINGS),
    staff: [{ id: "admin", name: "Administrator", role: "admin", pin: "0000", active: true }],
    site: { categories: [], products: [], syncedAt: null, error: null },
    local: { categories: [], products: [] },
    priceOverrides: {},
    stoplist: [],
    orders: [],
    cash: [],
    debts: [],
    recent: [],
    counter: 0,
  };
}

/** Eski yoki chala faylni joriy tuzilishga keltiradi */
export function normalize(raw: Partial<Data> | null | undefined): Data {
  const d = emptyData();
  if (!raw || typeof raw !== "object") return d;
  // 1.0.x dagi standart yozuvlar yangisiga almashtiriladi (o‘zgartirilgan bo‘lsa — tegilmaydi)
  if (raw.settings?.restaurantName === "Do‘stlik oilaviy restorani") raw.settings.restaurantName = d.settings.restaurantName;
  if (raw.settings?.receiptFooter === "Xaridingiz uchun rahmat! Yana kutib qolamiz.") raw.settings.receiptFooter = d.settings.receiptFooter;
  return {
    ...d,
    ...raw,
    settings: { ...d.settings, ...(raw.settings ?? {}) },
    site: { ...d.site, ...(raw.site ?? {}) },
    local: { ...d.local, ...(raw.local ?? {}) },
    staff: raw.staff?.length ? raw.staff : d.staff,
  } as Data;
}

// ───────── Menyu ─────────

export function menu(d: Pick<Data, "site" | "local" | "priceOverrides">): { categories: Category[]; products: Product[] } {
  const categories = [...d.site.categories, ...d.local.categories].sort((a, b) => a.sortOrder - b.sortOrder);
  const products = [...d.site.products, ...d.local.products]
    .map((p) => (d.priceOverrides[p.id] ? { ...p, price: d.priceOverrides[p.id] } : p))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return { categories, products };
}

interface SiteCategory { id: string; name: string; sortOrder?: number; active?: boolean }
interface SiteItem {
  id: string; categoryId: string; name: string; price: number; available?: boolean;
  sortOrder?: number; image?: { url?: string } | null;
}

/** Saytdan kelgan menyuni kassa ko‘rinishiga o‘tkazadi */
export function fromSite(cats: SiteCategory[], items: SiteItem[]) {
  const categories: Category[] = cats
    .filter((c) => c.active !== false)
    .map((c, i) => ({ id: c.id, name: c.name, sortOrder: c.sortOrder ?? i, source: "site" }));
  const ids = new Set(categories.map((c) => c.id));
  const products: Product[] = items
    .filter((p) => ids.has(p.categoryId) && p.available !== false && p.price > 0)
    .map((p, i) => ({
      id: p.id, categoryId: p.categoryId, name: p.name, price: p.price,
      image: p.image?.url ? cloudinarySmall(p.image.url) : null,
      sortOrder: p.sortOrder ?? i, source: "site", unit: "",
    }));
  return { categories, products };
}

/** Cloudinary rasmini kichik o‘lchamda olish (kassa tez ishlashi uchun) */
export function cloudinarySmall(url: string) {
  return url.includes("res.cloudinary.com") && url.includes("/upload/") && !url.includes("/upload/w_")
    ? url.replace("/upload/", "/upload/w_360,h_270,c_fill,q_auto,f_jpg/")
    : url;
}

// ───────── Hisob-kitob ─────────

export const lineSum = (l: Line) => l.price * l.qty;
export const checkSubtotal = (c: Check) => c.lines.reduce((s, l) => s + lineSum(l), 0);

export function checkTotals(o: Order, c: Check) {
  const sub = checkSubtotal(c);
  const service = Math.round((sub * o.serviceRate) / 100);
  const discount = Math.round(((sub + service) * o.discount) / 100);
  return { sub, service, discount, total: sub + service - discount };
}

export function orderTotals(o: Order) {
  return o.checks.reduce(
    (a, c) => {
      const t = checkTotals(o, c);
      const total = c.paid ? c.total : t.total;
      return { sub: a.sub + t.sub, service: a.service + t.service, discount: a.discount + t.discount, total: a.total + total };
    },
    { sub: 0, service: 0, discount: 0, total: 0 },
  );
}

export const orderItemsCount = (o: Order) => o.checks.reduce((s, c) => s + c.lines.reduce((x, l) => x + l.qty, 0), 0);

export const openOrders = (d: Pick<Data, "orders">) => d.orders.filter((o) => o.status === "open");

export function tableOrder(d: Pick<Data, "orders">, hallId: string, table: number) {
  return d.orders.find((o) => o.status === "open" && o.type === "zal" && o.hallId === hallId && o.table === table);
}

// ───────── Amallar ─────────

export class KassaError extends Error {}

function findOrder(d: Data, id: string) {
  const o = d.orders.find((x) => x.id === id);
  if (!o) throw new KassaError("Buyurtma topilmadi");
  return o;
}
function findCheck(o: Order, id: string) {
  const c = o.checks.find((x) => x.id === id);
  if (!c) throw new KassaError("Hisob topilmadi");
  if (c.paid) throw new KassaError("Bu hisob allaqachon to‘langan");
  return c;
}
const touch = (o: Order) => { o.updatedAt = new Date().toISOString(); };
const newCheck = (n: number): Check => ({ id: uid(), name: `Hisob-${n}`, lines: [], paid: false, payments: [], paidAt: null, total: 0 });

export interface Actor { id: string; name: string; role: Staff["role"] }

export function openOrder(d: Data, a: { type: OrderType; hallId?: string | null; table?: number | null }, by: Actor): Order {
  if (a.type === "zal") {
    if (!a.hallId || !a.table) throw new KassaError("Stol tanlanmagan");
    const ex = tableOrder(d, a.hallId, a.table);
    if (ex) return ex;
  }
  const now = new Date().toISOString();
  const s = d.settings;
  const o: Order = {
    id: uid(), no: ++d.counter, type: a.type,
    hallId: a.type === "zal" ? a.hallId! : null, table: a.type === "zal" ? a.table! : null,
    waiterId: by.id, waiterName: by.name, createdAt: now, updatedAt: now, closedAt: null, status: "open",
    serviceRate: a.type === "zal" || s.serviceOnTakeaway ? s.serviceRate : 0,
    discount: 0, checks: [newCheck(1)], customer: { name: "", phone: "", address: "" }, cancelReason: "",
  };
  d.orders.push(o);
  return o;
}

export function addLine(d: Data, orderId: string, checkId: string, productId: string, qty = 1) {
  if (d.stoplist.includes(productId)) throw new KassaError("Bu taom stop-listda (tugagan)");
  const p = menu(d).products.find((x) => x.id === productId);
  if (!p) throw new KassaError("Taom topilmadi");
  const o = findOrder(d, orderId);
  const c = findCheck(o, checkId);
  // Yuborilmagan bir xil taom bo‘lsa — miqdorini oshiramiz
  const ex = c.lines.find((l) => l.productId === productId && l.qty > l.sent && !l.note);
  if (ex) ex.qty += qty;
  else c.lines.push({ id: uid(), productId, name: p.name, price: p.price, qty, sent: 0, note: "" });
  touch(o);
}

export function changeQty(d: Data, orderId: string, checkId: string, lineId: string, delta: number, by: Actor) {
  const o = findOrder(d, orderId);
  const c = findCheck(o, checkId);
  const l = c.lines.find((x) => x.id === lineId);
  if (!l) return;
  const next = l.qty + delta;
  if (delta < 0 && next < l.sent && by.role === "ofitsiant") {
    throw new KassaError("Oshxonaga yuborilgan taomni faqat kassir yoki admin kamaytira oladi");
  }
  if (next <= 0) c.lines = c.lines.filter((x) => x.id !== lineId);
  else {
    l.qty = next;
    if (l.sent > next) l.sent = next;
  }
  touch(o);
}

export function setNote(d: Data, orderId: string, checkId: string, lineId: string, note: string) {
  const c = findCheck(findOrder(d, orderId), checkId);
  const l = c.lines.find((x) => x.id === lineId);
  if (l) l.note = note.slice(0, 120);
}

export function addCheck(d: Data, orderId: string): Check {
  const o = findOrder(d, orderId);
  const c = newCheck(o.checks.length + 1);
  o.checks.push(c);
  touch(o);
  return c;
}

export function removeCheck(d: Data, orderId: string, checkId: string) {
  const o = findOrder(d, orderId);
  const c = findCheck(o, checkId);
  if (c.lines.length) throw new KassaError("Hisobda taom bor — avval olib tashlang");
  if (o.checks.length === 1) return;
  o.checks = o.checks.filter((x) => x.id !== checkId);
}

/** Taom qatorini boshqa hisobga o‘tkazish */
export function moveLine(d: Data, orderId: string, fromId: string, toId: string, lineId: string) {
  const o = findOrder(d, orderId);
  const from = findCheck(o, fromId);
  const to = findCheck(o, toId);
  const l = from.lines.find((x) => x.id === lineId);
  if (!l) return;
  from.lines = from.lines.filter((x) => x.id !== lineId);
  to.lines.push(l);
  touch(o);
}

export type Station = "shashlik" | "kitchen";
export interface KitchenItem { name: string; qty: number; note: string; station: Station | null }

/** Tasdiqlash — yangi qo‘shilganlarni qaytaradi; har biri o‘z bo‘limi printeriga (shashlikxona/oshxona) */
export function sendKitchen(d: Data, orderId: string) {
  const o = findOrder(d, orderId);
  const { products, categories } = menu(d);
  const route = (productId: string): Station | null => {
    const p = products.find((x) => x.id === productId);
    const c = p && categories.find((x) => x.id === p.categoryId);
    return c?.print && c.print !== "none" ? c.print : null;
  };
  const items: KitchenItem[] = [];
  for (const c of o.checks) {
    for (const l of c.lines) {
      if (l.qty > l.sent) {
        items.push({ name: l.name, qty: l.qty - l.sent, note: l.note, station: route(l.productId) });
        l.sent = l.qty;
      }
    }
  }
  touch(o);
  return { order: o, items };
}

/** Sinov ma'lumotlarini tozalash: buyurtmalar, kassa, qarzlar (menyu, xodimlar, sozlamalar qoladi) */
export function clearData(d: Data) {
  d.orders = [];
  d.cash = [];
  d.debts = [];
  d.counter = 0;
  d.stoplist = [];
}

/** Zim-Zim menyusini o‘rnatish (bir marta): eski sinov ma'lumotlari ham tozalanadi */
export function applyMenuSeed(d: Data): boolean {
  if ((d.menuSeed ?? 0) >= MENU_SEED_VERSION) return false;
  clearData(d);
  d.local = seedMenu();
  d.site = { categories: [], products: [], syncedAt: null, error: null };
  d.priceOverrides = {};
  d.recent = [];
  d.settings.siteSync = false;
  d.menuSeed = MENU_SEED_VERSION;
  return true;
}

export function setDiscount(d: Data, orderId: string, discount: number, by: Actor) {
  if (by.role === "ofitsiant") throw new KassaError("Chegirmani faqat kassir yoki admin qo‘ya oladi");
  const o = findOrder(d, orderId);
  o.discount = Math.max(0, Math.min(100, Math.round(discount)));
  touch(o);
}

export function setService(d: Data, orderId: string, rate: number, by: Actor) {
  if (by.role === "ofitsiant") throw new KassaError("Xizmat haqini faqat kassir yoki admin o‘zgartira oladi");
  const o = findOrder(d, orderId);
  o.serviceRate = Math.max(0, Math.min(50, rate));
  touch(o);
}

export function setCustomer(d: Data, orderId: string, c: Partial<Order["customer"]>) {
  const o = findOrder(d, orderId);
  o.customer = { ...o.customer, ...c };
  touch(o);
}

export function moveTable(d: Data, orderId: string, hallId: string, table: number) {
  const o = findOrder(d, orderId);
  const busy = tableOrder(d, hallId, table);
  if (busy && busy.id !== o.id) {
    // Band stolga ko‘chirilsa — hisoblar birlashtiriladi
    for (const c of o.checks.filter((x) => !x.paid && x.lines.length)) {
      c.name = `Hisob-${busy.checks.length + 1}`;
      busy.checks.push(c);
    }
    o.checks = o.checks.filter((x) => x.paid);
    if (!o.checks.length) d.orders = d.orders.filter((x) => x.id !== o.id);
    else closeIfDone(o);
    touch(busy);
    return busy;
  }
  o.hallId = hallId;
  o.table = table;
  o.type = "zal";
  touch(o);
  return o;
}

function closeIfDone(o: Order) {
  const rest = o.checks.filter((c) => !c.paid && c.lines.length);
  if (!rest.length && o.checks.some((c) => c.paid)) {
    o.checks = o.checks.filter((c) => c.paid);
    o.status = "paid";
    o.closedAt = new Date().toISOString();
  }
}

export interface Debtor { name: string; phone: string; reason: string }

/** Karta/QR/Click kabi naqdsiz to‘lovlar — ortiqcha summa olinmaydi */
export const isCashless = (m: Payment["method"]) => m !== "naqd" && m !== "qarz";

export function pay(d: Data, orderId: string, checkId: string, payments: Payment[], by: Actor, debtor?: Debtor) {
  if (by.role === "ofitsiant") throw new KassaError("To‘lovni faqat kassir yoki admin qabul qiladi");
  const o = findOrder(d, orderId);
  const c = findCheck(o, checkId);
  if (!c.lines.length) throw new KassaError("Hisob bo‘sh");
  const { total } = checkTotals(o, c);
  const list = payments.filter((p) => p.amount > 0);
  const paid = list.reduce((s, p) => s + p.amount, 0);
  if (paid < total) throw new KassaError("To‘lov summasi yetarli emas");
  // Qaytim faqat naqddan beriladi: yozuvda aniq summa saqlanadi
  let extra = paid - total;
  const clean = list
    .map((p) => {
      if (p.method === "naqd" && extra > 0) {
        const cut = Math.min(extra, p.amount);
        extra -= cut;
        return { ...p, amount: p.amount - cut };
      }
      return p;
    })
    .filter((p) => p.amount > 0);
  if (extra > 0) throw new KassaError("Naqdsiz to‘lovda yoki qarzda ortiqcha summa bo‘lmaydi");
  const debt = clean.filter((p) => p.method === "qarz").reduce((s, p) => s + p.amount, 0);
  if (debt > 0) {
    if (!debtor || (!debtor.name.trim() && !debtor.phone.trim())) throw new KassaError("Qarzga yozish uchun mijoz ismi yoki telefonini kiriting");
    d.debts.push({
      id: uid(), orderId: o.id, orderNo: o.no, amount: debt, customerName: debtor.name.trim(), phone: debtor.phone.trim(),
      reason: debtor.reason.trim(), createdAt: new Date().toISOString(), cashierName: by.name, paidAt: null, paidMethod: null, paidBy: "",
    });
  }
  c.paid = true;
  c.payments = clean;
  c.total = total;
  c.paidAt = new Date().toISOString();
  c.paidBy = by.name;
  closeIfDone(o);
  touch(o);
  return { order: o, check: c, change: paid - total };
}

/** Qarzni to‘lash (mijoz keyin kelib to‘laganda) */
export function payDebt(d: Data, debtId: string, method: Payment["method"], by: Actor) {
  if (by.role === "ofitsiant") throw new KassaError("Qarzni faqat kassir yoki admin yopadi");
  if (method === "qarz") throw new KassaError("To‘lov turini tanlang");
  const x = d.debts.find((v) => v.id === debtId);
  if (!x) throw new KassaError("Qarz topilmadi");
  if (x.paidAt) throw new KassaError("Bu qarz allaqachon to‘langan");
  x.paidAt = new Date().toISOString();
  x.paidMethod = method;
  x.paidBy = by.name;
  return x;
}

export function setWaiter(d: Data, orderId: string, staff: { id: string; name: string }, by: Actor) {
  if (by.role === "ofitsiant") throw new KassaError("Ofitsiantni faqat kassir yoki admin almashtiradi");
  const o = findOrder(d, orderId);
  o.waiterId = staff.id;
  o.waiterName = staff.name;
  touch(o);
}

/** Buyurtma turini almashtirish: olib ketish ↔ yetkazish, yoki zaldan olib ketishga */
export function setType(d: Data, orderId: string, type: "olib" | "yetkaz") {
  const o = findOrder(d, orderId);
  o.type = type;
  o.hallId = null;
  o.table = null;
  if (!d.settings.serviceOnTakeaway) o.serviceRate = 0;
  touch(o);
}

export function setOrderNote(d: Data, orderId: string, note: string) {
  const o = findOrder(d, orderId);
  o.note = note.slice(0, 200);
  touch(o);
}

export function remember(d: Data, staffId: string) {
  d.recent = [staffId, ...d.recent.filter((x) => x !== staffId)].slice(0, 4);
}

export function cancelOrder(d: Data, orderId: string, reason: string, by: Actor) {
  const o = findOrder(d, orderId);
  const sent = o.checks.some((c) => c.lines.some((l) => l.sent > 0));
  if (sent && by.role === "ofitsiant") throw new KassaError("Oshxonaga yuborilgan buyurtmani faqat kassir yoki admin bekor qiladi");
  if (o.checks.some((c) => c.paid)) throw new KassaError("To‘langan hisobi bor buyurtmani bekor qilib bo‘lmaydi");
  if (!orderItemsCount(o)) {
    d.orders = d.orders.filter((x) => x.id !== orderId);
    return;
  }
  o.status = "cancelled";
  o.cancelReason = `${reason || "Sababsiz"} — ${by.name}`;
  o.closedAt = new Date().toISOString();
}

/** Bo‘sh qolgan buyurtmani o‘chiradi (stol ochilib, hech narsa qo‘shilmagan bo‘lsa) */
export function dropIfEmpty(d: Data, orderId: string) {
  const o = d.orders.find((x) => x.id === orderId);
  if (o && o.status === "open" && !orderItemsCount(o) && !o.checks.some((c) => c.paid)) {
    d.orders = d.orders.filter((x) => x.id !== orderId);
  }
}

export function toggleStop(d: Data, productId: string) {
  d.stoplist = d.stoplist.includes(productId) ? d.stoplist.filter((x) => x !== productId) : [...d.stoplist, productId];
}

export function addCash(d: Data, e: Omit<CashEntry, "id" | "at">) {
  if (!(e.amount > 0)) throw new KassaError("Summani kiriting");
  d.cash.push({ ...e, id: uid(), at: new Date().toISOString() });
}

// ───────── Hisobot ─────────

export interface Report {
  from: string; to: string;
  revenue: number; orders: number; checks: number; avgCheck: number;
  service: number; discount: number; cancelled: number;
  byMethod: Record<string, number>;
  byWaiter: { name: string; orders: number; sum: number }[];
  byCashier: { name: string; checks: number; sum: number; byMethod: Record<string, number> }[];
  byType: Record<string, { count: number; sum: number }>;
  products: { name: string; qty: number; sum: number }[];
  cashIn: number; cashOut: number; cashInDrawer: number;
  debtNew: number; debtPaid: Record<string, number>;
  transactions: { at: string; kind: "tolov" | "qarz-tolov" | "kirim" | "chiqim"; method: string; amount: number; who: string; ref: string }[];
}

const normMethod = (m: string) => (m === "karta" ? "terminal" : m);

export function report(d: Pick<Data, "orders" | "cash" | "debts">, from: Date, to: Date): Report {
  const inRange = (iso: string | null) => !!iso && new Date(iso) >= from && new Date(iso) < to;
  const r: Report = {
    from: from.toISOString(), to: to.toISOString(), revenue: 0, orders: 0, checks: 0, avgCheck: 0, service: 0,
    discount: 0, cancelled: 0, byMethod: {}, byWaiter: [], byCashier: [], byType: {}, products: [], cashIn: 0, cashOut: 0,
    cashInDrawer: 0, debtNew: 0, debtPaid: {}, transactions: [],
  };
  const waiters = new Map<string, { name: string; orders: number; sum: number }>();
  const cashiers = new Map<string, { name: string; checks: number; sum: number; byMethod: Record<string, number> }>();
  const prods = new Map<string, { name: string; qty: number; sum: number }>();
  const ordersSeen = new Set<string>();
  for (const o of d.orders) {
    if (o.status === "cancelled" && inRange(o.closedAt)) r.cancelled++;
    for (const c of o.checks) {
      if (!c.paid || !inRange(c.paidAt)) continue;
      const t = checkTotals(o, c);
      r.revenue += c.total;
      r.service += t.service;
      r.discount += t.discount;
      r.checks++;
      if (!ordersSeen.has(o.id)) {
        ordersSeen.add(o.id);
        r.orders++;
        const bt = r.byType[o.type] ?? { count: 0, sum: 0 };
        bt.count++;
        r.byType[o.type] = bt;
      }
      r.byType[o.type].sum += c.total;
      const cashier = cashiers.get(c.paidBy ?? "—") ?? { name: c.paidBy ?? "—", checks: 0, sum: 0, byMethod: {} };
      cashier.checks++;
      cashier.sum += c.total;
      for (const p of c.payments) {
        const m = normMethod(p.method);
        r.byMethod[m] = (r.byMethod[m] ?? 0) + p.amount;
        cashier.byMethod[m] = (cashier.byMethod[m] ?? 0) + p.amount;
        if (m === "qarz") r.debtNew += p.amount;
        r.transactions.push({ at: c.paidAt!, kind: "tolov", method: m, amount: p.amount, who: c.paidBy ?? "", ref: `№${o.no}` });
      }
      cashiers.set(cashier.name, cashier);
      const w = waiters.get(o.waiterId) ?? { name: o.waiterName, orders: 0, sum: 0 };
      w.sum += c.total;
      waiters.set(o.waiterId, w);
      for (const l of c.lines) {
        const p = prods.get(l.productId + l.name) ?? { name: l.name, qty: 0, sum: 0 };
        p.qty += l.qty;
        p.sum += lineSum(l);
        prods.set(l.productId + l.name, p);
      }
    }
  }
  for (const o of d.orders) if (ordersSeen.has(o.id)) { const w = waiters.get(o.waiterId); if (w) w.orders++; }
  for (const x of d.debts ?? []) {
    if (!x.paidAt || !inRange(x.paidAt) || !x.paidMethod) continue;
    const m = normMethod(x.paidMethod);
    r.debtPaid[m] = (r.debtPaid[m] ?? 0) + x.amount;
    r.transactions.push({ at: x.paidAt, kind: "qarz-tolov", method: m, amount: x.amount, who: x.paidBy, ref: `Qarz №${x.orderNo} ${x.customerName}` });
  }
  for (const e of d.cash) {
    if (!inRange(e.at)) continue;
    if (e.type === "kirim") r.cashIn += e.amount;
    else r.cashOut += e.amount;
    r.transactions.push({ at: e.at, kind: e.type, method: "naqd", amount: e.amount, who: e.staffName, ref: e.note });
  }
  r.transactions.sort((a, b) => b.at.localeCompare(a.at));
  r.avgCheck = r.checks ? Math.round(r.revenue / r.checks) : 0;
  r.byWaiter = [...waiters.values()].sort((a, b) => b.sum - a.sum);
  r.byCashier = [...cashiers.values()].sort((a, b) => b.sum - a.sum);
  r.products = [...prods.values()].sort((a, b) => b.sum - a.sum);
  r.cashInDrawer = (r.byMethod.naqd ?? 0) + (r.debtPaid.naqd ?? 0) + r.cashIn - r.cashOut;
  return r;
}

/** 90 kundan eski yopilgan buyurtmalarni asosiy fayldan ajratadi (arxivga) */
export function splitOld(d: Data, now = new Date(), days = 90) {
  const limit = now.getTime() - days * 86400_000;
  const old = d.orders.filter((o) => o.status !== "open" && o.closedAt && new Date(o.closedAt).getTime() < limit);
  if (old.length) d.orders = d.orders.filter((o) => !old.includes(o));
  return old;
}

export const som = (n: number) => `${Math.round(n).toLocaleString("ru-RU").replace(/ /g, " ")} so‘m`;
export const num = (n: number) => Math.round(n).toLocaleString("ru-RU").replace(/ /g, " ");
