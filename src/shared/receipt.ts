// Chek matnlari (HTML) — printerga ham, ekrandagi ko‘rinishga ham.
import { checkTotals, num, type Report } from "./logic";
import type { Check, Data, Order } from "./types";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const dt = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const METHOD: Record<string, string> = { naqd: "Naqd", karta: "Karta", click: "Click", payme: "Payme" };
const TYPE: Record<string, string> = { zal: "Zal", olib: "Olib ketish", yetkaz: "Yetkazib berish" };

function page(width: 58 | 80, body: string) {
  const w = width === 58 ? 48 : 72; // chop etiladigan kenglik, mm
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body { margin: 0; width: ${w}mm; padding: 2mm 1mm 6mm; font: 12px/1.35 "Segoe UI", Arial, sans-serif; color: #000; }
  .c { text-align: center; } .b { font-weight: 700; } .big { font-size: 16px; } .huge { font-size: 20px; font-weight: 800; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .row span:last-child { white-space: nowrap; }
  hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
  .item { margin: 3px 0; } .muted { font-size: 11px; }
  .note { font-size: 11px; font-style: italic; padding-left: 8px; }
  </style></head><body>${body}</body></html>`;
}

function head(d: Data, o: Order, title: string) {
  const s = d.settings;
  const where = o.type === "zal"
    ? `${esc(d.settings.halls.find((h) => h.id === o.hallId)?.name ?? "")} — ${o.table}-stol`
    : TYPE[o.type];
  return `<div class="c b big">${esc(s.restaurantName)}</div>
  ${s.address ? `<div class="c muted">${esc(s.address)}</div>` : ""}
  ${s.phone ? `<div class="c muted">${esc(s.phone)}</div>` : ""}
  <hr><div class="c b">${title}</div>
  <div class="row"><span>Buyurtma №</span><span class="b">${o.no}</span></div>
  <div class="row"><span>Joy</span><span>${where}</span></div>
  <div class="row"><span>Ofitsiant</span><span>${esc(o.waiterName)}</span></div>
  <div class="row"><span>Vaqt</span><span>${dt(new Date().toISOString())}</span></div>
  ${o.customer.phone ? `<div class="row"><span>Mijoz</span><span>${esc(o.customer.name)} ${esc(o.customer.phone)}</span></div>` : ""}
  ${o.customer.address ? `<div class="muted">Manzil: ${esc(o.customer.address)}</div>` : ""}<hr>`;
}

/** Mijoz cheki. final=false — "hisob" (to‘lovdan oldin), true — to‘lov cheki */
export function receiptHtml(d: Data, o: Order, checks: Check[], final: boolean, change = 0) {
  let body = head(d, o, final ? "TO‘LOV CHEKI" : "HISOB");
  let grand = 0;
  for (const c of checks) {
    if (checks.length > 1 || o.checks.length > 1) body += `<div class="b">${esc(c.name)}</div>`;
    for (const l of c.lines) {
      body += `<div class="item"><div>${esc(l.name)}</div><div class="row muted"><span>${l.qty} × ${num(l.price)}</span><span>${num(l.qty * l.price)}</span></div>${l.note ? `<div class="note">${esc(l.note)}</div>` : ""}</div>`;
    }
    const t = checkTotals(o, c);
    const total = c.paid ? c.total : t.total;
    grand += total;
    body += `<hr><div class="row"><span>Mahsulotlar</span><span>${num(t.sub)}</span></div>`;
    if (t.service) body += `<div class="row"><span>Xizmat haqi ${o.serviceRate}%</span><span>${num(t.service)}</span></div>`;
    if (t.discount) body += `<div class="row"><span>Chegirma ${o.discount}%</span><span>−${num(t.discount)}</span></div>`;
    if (final) for (const p of c.payments) body += `<div class="row muted"><span>${METHOD[p.method]}</span><span>${num(p.amount)}</span></div>`;
  }
  body += `<div class="row huge"><span>JAMI</span><span>${num(grand)}</span></div>`;
  if (final && change > 0) body += `<div class="row b"><span>Qaytim</span><span>${num(change)}</span></div>`;
  body += `<hr><div class="c">${esc(d.settings.receiptFooter)}</div><div class="c muted">Iltimos, chekni olishni unutmang!</div>`;
  return page(d.settings.paperWidth, body);
}

/** Oshxona cheki — faqat yangi qo‘shilgan taomlar, narxsiz, katta harf */
export function kitchenHtml(d: Data, o: Order, items: { name: string; qty: number; note: string }[]) {
  const where = o.type === "zal"
    ? `${esc(d.settings.halls.find((h) => h.id === o.hallId)?.name ?? "")} · ${o.table}-STOL`
    : TYPE[o.type].toUpperCase();
  let body = `<div class="c huge">${where}</div><div class="c">№${o.no} · ${esc(o.waiterName)} · ${dt(new Date().toISOString())}</div><hr>`;
  for (const i of items) {
    body += `<div class="row big b"><span>${esc(i.name)}</span><span>× ${i.qty}</span></div>${i.note ? `<div class="note big">${esc(i.note)}</div>` : ""}`;
  }
  return page(d.settings.paperWidth, body + "<hr>");
}

export function reportHtml(d: Data, r: Report, title: string) {
  const row = (a: string, b: string, cls = "") => `<div class="row ${cls}"><span>${a}</span><span>${b}</span></div>`;
  let body = `<div class="c b big">${esc(d.settings.restaurantName)}</div><div class="c b">${esc(title)}</div>
  <div class="c muted">${dt(r.from)} — ${dt(r.to)}</div><hr>`;
  body += row("Tushum", num(r.revenue), "b big");
  body += row("Buyurtmalar", String(r.orders)) + row("Cheklar", String(r.checks)) + row("O‘rtacha chek", num(r.avgCheck));
  body += row("Xizmat haqi", num(r.service)) + row("Chegirmalar", num(r.discount)) + row("Bekor qilingan", String(r.cancelled));
  body += "<hr>";
  for (const [m, v] of Object.entries(r.byMethod)) body += row(METHOD[m] ?? m, num(v));
  body += "<hr>" + row("Kassaga kirim", num(r.cashIn)) + row("Kassadan chiqim", num(r.cashOut)) + row("Kassadagi naqd", num(r.cashInDrawer), "b");
  if (r.byWaiter.length) {
    body += "<hr><div class='b'>Ofitsiantlar</div>";
    for (const w of r.byWaiter) body += row(`${esc(w.name)} (${w.orders})`, num(w.sum));
  }
  if (r.products.length) {
    body += "<hr><div class='b'>Taomlar</div>";
    for (const p of r.products) body += row(`${esc(p.name)} × ${p.qty}`, num(p.sum), "muted");
  }
  return page(d.settings.paperWidth, body);
}

export function testHtml(d: Data) {
  return page(d.settings.paperWidth, `<div class="c huge">SINOV CHEKI</div><hr><div class="c">${esc(d.settings.restaurantName)}</div><div class="c">Printer to‘g‘ri ulangan ✓</div><div class="c muted">${dt(new Date().toISOString())}</div><hr>`);
}
