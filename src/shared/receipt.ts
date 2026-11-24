// Chek matnlari (HTML) — printerga ham, ekrandagi ko‘rinishga ham.
// Kenglik qog‘ozga moslashadi (100%), shuning uchun 58 mm va 80 mm printerda ham kesilmaydi.
import { checkTotals, num, type Report } from "./logic";
import type { Check, Data, Order } from "./types";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const dt = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const METHOD_LABEL: Record<string, string> = {
  naqd: "Naqd", terminal: "Terminal", karta: "Terminal", qr: "QR kod", click: "Click", payme: "Payme", qarz: "Qarzga",
};
const TYPE: Record<string, string> = { zal: "Zalda", olib: "Olib ketish", yetkaz: "Yetkazib berish" };

type D = Pick<Data, "settings">;

function page(width: 58 | 80, body: string) {
  const small = width === 58;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @page { margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { width: 100%; padding: 1mm ${small ? "1.5mm" : "3mm"} 8mm; font: ${small ? 11 : 12.5}px/1.3 "Segoe UI", Arial, sans-serif; color: #000; }
  .c { text-align: center; } .b { font-weight: 700; } .r { text-align: right; }
  .title { font-size: ${small ? 17 : 21}px; font-weight: 900; text-transform: uppercase; text-align: center; letter-spacing: .02em; line-height: 1.15; margin: 1mm 0 1.5mm; }
  .sub { font-size: ${small ? 10 : 11}px; text-align: center; }
  .kv { display: flex; justify-content: space-between; gap: 6px; }
  .kv span:first-child { white-space: nowrap; }
  .kv span:last-child { text-align: right; word-break: break-word; }
  hr { border: 0; border-top: 1px dashed #000; margin: 1.5mm 0; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th { font-size: ${small ? 10 : 11}px; font-weight: 700; text-align: right; padding-bottom: 1mm; border-bottom: 1px solid #000; }
  th:first-child, td:first-child { text-align: left; }
  td { vertical-align: top; text-align: right; padding: 0.8mm 0 0.8mm 1mm; word-break: break-word; }
  td:not(:first-child), th:not(:first-child) { white-space: nowrap; }
  ${small ? "table { font-size: 10px; }" : ""}
  col.n { width: auto; } col.q { width: ${small ? 8 : 10}%; } col.p { width: ${small ? 22 : 19}%; } col.s { width: ${small ? 26 : 21}%; }
  .note { font-size: 10.5px; font-style: italic; }
  .total { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; font-size: ${small ? 16 : 21}px; font-weight: 900; margin: 1.5mm 0; white-space: nowrap; }
  .foot { font-size: ${small ? 14 : 17}px; font-weight: 900; text-transform: uppercase; text-align: center; line-height: 1.25; margin-top: 2mm; word-break: break-word; }
  .big { font-size: ${small ? 18 : 22}px; font-weight: 900; }
  .kitem { display: flex; justify-content: space-between; gap: 8px; font-size: ${small ? 15 : 18}px; font-weight: 800; margin: 1mm 0; }
  </style></head><body>${body}</body></html>`;
}

const kv = (a: string, b: string, cls = "") => `<div class="kv ${cls}"><span>${a}</span><span>${b}</span></div>`;

function head(d: D, o: Order, checks: Check[], final: boolean) {
  const s = d.settings;
  const hall = s.halls.find((h) => h.id === o.hallId)?.name ?? "";
  const paidAt = checks.map((c) => c.paidAt).filter(Boolean).sort().pop();
  const cashier = checks.map((c) => c.paidBy).filter(Boolean).pop();
  let h = `<div class="title">${esc(s.restaurantName)}</div>`;
  if (s.address) h += `<div class="sub">${esc(s.address)}</div>`;
  if (s.phone) h += `<div class="sub">${esc(s.phone)}</div>`;
  h += `<hr>${kv("Buyurtma raqami", `<b>${o.no}</b>`)}${kv("Ochilgan", dt(o.createdAt))}`;
  h += kv(final ? "Yopilgan" : "Sana", dt(final && paidAt ? paidAt : new Date().toISOString()));
  h += kv("Buyurtma turi", TYPE[o.type]);
  if (o.type === "zal") h += kv("Stol", `${esc(hall)} · ${o.table}`);
  h += kv("Ofitsiant", esc(o.waiterName));
  if (final && cashier) h += kv("Kassir", esc(cashier));
  if (o.customer.name) h += kv("Mijoz", esc(o.customer.name));
  if (o.customer.phone) h += kv("Telefon", esc(o.customer.phone));
  if (o.customer.address) h += kv("Manzil", esc(o.customer.address));
  if (o.note) h += kv("Izoh", esc(o.note));
  return h;
}

/** Mijoz cheki. final=false — "hisob" (to‘lovdan oldin), true — to‘lov cheki */
export function receiptHtml(d: D, o: Order, checks: Check[], final: boolean, change = 0) {
  let body = head(d, o, checks, final);
  let grand = 0;
  for (const c of checks) {
    if (o.checks.length > 1) body += `<hr><div class="b">${esc(c.name)}</div>`;
    body += `<table><colgroup><col class="n"><col class="q"><col class="p"><col class="s"></colgroup>
      <tr><th>Taom</th><th>Soni</th><th>Narxi</th><th>Summa</th></tr>`;
    for (const l of c.lines) {
      body += `<tr><td>${esc(l.name)}${l.note ? `<div class="note">${esc(l.note)}</div>` : ""}</td><td>${l.qty}</td><td>${num(l.price)}</td><td>${num(l.qty * l.price)}</td></tr>`;
    }
    body += `</table>`;
    const t = checkTotals(o, c);
    const total = c.paid ? c.total : t.total;
    grand += total;
    body += "<hr>";
    if (t.service || t.discount) body += kv("Mahsulotlar", num(t.sub));
    if (t.service) body += kv(`Xizmat haqi ${o.serviceRate}%`, num(t.service));
    if (t.discount) body += kv(`Chegirma ${o.discount}%`, `−${num(t.discount)}`);
    if (final) for (const p of c.payments) body += kv(METHOD_LABEL[p.method] ?? p.method, num(p.amount));
  }
  body += `<div class="total"><span>Jami:</span><span>${num(grand)} UZS</span></div>`;
  if (final && change > 0) body += kv("Qaytim", `<b>${num(change)} UZS</b>`);
  if (!final) body += `<div class="c b">To‘lanmagan hisob</div>`;
  body += `<div class="foot">${esc(d.settings.receiptFooter)}${d.settings.receiptNote ? `<br>${esc(d.settings.receiptNote)}` : ""}</div>`;
  return page(d.settings.paperWidth, body);
}

/** Oshxona cheki — faqat yangi qo‘shilgan taomlar, narxsiz, katta harf */
export function kitchenHtml(d: D, o: Order, items: { name: string; qty: number; note: string }[], station = "OSHXONA") {
  const where = o.type === "zal"
    ? `${esc(d.settings.halls.find((h) => h.id === o.hallId)?.name ?? "")} · ${o.table}-STOL`
    : TYPE[o.type].toUpperCase();
  let body = `<div class="c b">${esc(station)}</div><div class="c big">${where}</div><div class="c">№${o.no} · ${esc(o.waiterName)} · ${dt(new Date().toISOString())}</div>`;
  if (o.note) body += `<div class="c b">${esc(o.note)}</div>`;
  body += "<hr>";
  for (const i of items) {
    body += `<div class="kitem"><span>${esc(i.name)}</span><span>× ${i.qty}</span></div>${i.note ? `<div class="note">${esc(i.note)}</div>` : ""}`;
  }
  return page(d.settings.paperWidth, body + "<hr>");
}

/** Z-hisobot (smena / kun yakuni) */
export function reportHtml(d: D, r: Report, title: string) {
  const M = (rec: Record<string, number>) => Object.entries(rec).map(([m, v]) => kv(METHOD_LABEL[m] ?? m, num(v))).join("");
  let body = `<div class="title">${esc(d.settings.restaurantName)}</div><div class="c b">${esc(title)}</div>
  <div class="sub">${dt(r.from)} — ${dt(r.to)}</div><hr>`;
  body += `<div class="b">Buyurtma turlari bo‘yicha</div>`;
  for (const [t, v] of Object.entries(r.byType)) body += kv(`${TYPE[t]} (${v.count})`, num(v.sum));
  body += kv(`Jami (${r.orders})`, num(r.revenue), "b");
  body += kv("O‘rtacha chek", num(r.avgCheck)) + kv("Xizmat haqi", num(r.service)) + kv("Chegirmalar", num(r.discount)) + kv("Bekor qilingan", String(r.cancelled));
  body += `<hr><div class="b">To‘lov turlari</div>${M(r.byMethod)}`;
  for (const c of r.byCashier) body += `<hr><div class="b">Kassir: ${esc(c.name)}</div>${M(c.byMethod)}${kv("Jami tushum", num(c.sum), "b")}`;
  if (Object.keys(r.debtPaid).length) body += `<hr><div class="b">Qaytarilgan qarzlar</div>${M(r.debtPaid)}`;
  body += `<hr>${kv("Kassaga kirim", num(r.cashIn))}${kv("Kassadan chiqim", num(r.cashOut))}`;
  body += `<div class="total"><span>Kassada naqd:</span><span>${num(r.cashInDrawer)}</span></div>`;
  if (r.byWaiter.length) {
    body += "<hr><div class='b'>Ofitsiantlar</div>";
    for (const w of r.byWaiter) body += kv(`${esc(w.name)} (${w.orders})`, num(w.sum));
  }
  if (r.products.length) {
    body += `<hr><table><colgroup><col class="n"><col class="q"><col class="s"></colgroup><tr><th>Taom</th><th>Soni</th><th>Summa</th></tr>`;
    for (const p of r.products) body += `<tr><td>${esc(p.name)}</td><td>${p.qty}</td><td>${num(p.sum)}</td></tr>`;
    body += "</table>";
  }
  return page(d.settings.paperWidth, body);
}

export function testHtml(d: D) {
  const w = d.settings.paperWidth;
  return page(w, `<div class="title">SINOV CHEKI</div><div class="c">${esc(d.settings.restaurantName)}</div><hr>
  <div style="border:2px solid #000;padding:2mm;text-align:center;font-weight:700">Shu ramka to‘liq chiqsa — chek kengligi to‘g‘ri (${w} mm)</div>
  <div class="kv b" style="margin-top:2mm"><span>|← chap</span><span>o‘ng →|</span></div><hr>
  <div class="c">${dt(new Date().toISOString())}</div>`);
}
