// Kassa dasturining umumiy turlari (main va oyna ikkalasi ham ishlatadi)

export type Role = "admin" | "kassir" | "ofitsiant";
export type OrderType = "zal" | "olib" | "yetkaz";
/** "karta" — eski versiyadan qolgan nom (Terminal deb ko‘rsatiladi) */
export type PayMethod = "naqd" | "terminal" | "qr" | "click" | "payme" | "qarz" | "karta";

export interface Staff {
  id: string;
  name: string;
  role: Role;
  pin: string;
  active: boolean;
}

export interface Hall {
  id: string;
  name: string;
  tables: number;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  /** "site" — sayt admin panelidan; "local" — faqat kassada qo‘shilgan */
  source: "site" | "local";
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  /** Rasm manzili (sayt) yoki kassa papkasidagi fayl */
  image: string | null;
  sortOrder: number;
  source: "site" | "local";
  /** Birlik: dona, porsiya, kg ... */
  unit: string;
}

export interface Line {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  /** Oshxonaga yuborilgan miqdor */
  sent: number;
  note: string;
}

export interface Payment {
  method: PayMethod;
  amount: number;
}

export interface Check {
  id: string;
  name: string;
  lines: Line[];
  paid: boolean;
  payments: Payment[];
  paidAt: string | null;
  total: number;
  /** To‘lovni qabul qilgan kassir */
  paidBy?: string;
}

export interface Order {
  id: string;
  no: number;
  type: OrderType;
  hallId: string | null;
  table: number | null;
  waiterId: string;
  waiterName: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  status: "open" | "paid" | "cancelled";
  serviceRate: number;
  discount: number;
  checks: Check[];
  customer: { name: string; phone: string; address: string };
  cancelReason: string;
  /** Buyurtmaga izoh (masalan, "2-qavatga") */
  note?: string;
}

export interface Debt {
  id: string;
  orderId: string;
  orderNo: number;
  amount: number;
  customerName: string;
  phone: string;
  reason: string;
  createdAt: string;
  cashierName: string;
  paidAt: string | null;
  paidMethod: PayMethod | null;
  paidBy: string;
}

export interface CashEntry {
  id: string;
  type: "kirim" | "chiqim";
  amount: number;
  note: string;
  at: string;
  staffName: string;
}

export interface Settings {
  restaurantName: string;
  address: string;
  phone: string;
  serviceRate: number;
  /** Xizmat haqi olib ketish/yetkazishda ham olinadimi */
  serviceOnTakeaway: boolean;
  apiUrl: string;
  receiptFooter: string;
  receiptPrinter: string;
  kitchenPrinter: string;
  paperWidth: 58 | 80;
  printOnPay: boolean;
  printKitchen: boolean;
  zoom: number;
  halls: Hall[];
  /** Kirish ekrani foni: "photo:zal", "color:#123456", "grad:a,b" yoki rasm manzili */
  startBackground: string;
  /** Chek ostidagi katta yozuv (telefonlar va h.k.) */
  receiptNote: string;
}

export interface Data {
  version: 1;
  settings: Settings;
  staff: Staff[];
  site: { categories: Category[]; products: Product[]; syncedAt: string | null; error: string | null };
  local: { categories: Category[]; products: Product[] };
  /** Kassaga mahalliy narx (saytdagidan farqli bo‘lsa) */
  priceOverrides: Record<string, number>;
  stoplist: string[];
  orders: Order[];
  cash: CashEntry[];
  debts: Debt[];
  /** Oxirgi kirganlar (kirish ekranida "Yaqinda") */
  recent: string[];
  counter: number;
}

/** Oynaga yuboriladigan holat (PIN kodlarsiz) */
export interface PublicState extends Omit<Data, "staff"> {
  staff: Omit<Staff, "pin">[];
  appVersion: string;
}

export interface UpdateState {
  phase: "idle" | "checking" | "available" | "downloading" | "ready" | "none" | "error";
  version?: string;
  notes?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  speed?: number;
  error?: string;
}

export interface PrinterInfo {
  name: string;
  displayName: string;
  isDefault: boolean;
}
