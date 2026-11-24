import { useMemo, useState } from "react";
import { call } from "../api";
import type { Ctx } from "../App";
import { num, report } from "../shared/logic";
import { Icon, METHOD, hhmm, useToast } from "../ui";
import { ReceiptPreview } from "./OrderScreen";

const RANGES = [
  { id: "today", label: "Bugun" },
  { id: "yesterday", label: "Kecha" },
  { id: "week", label: "7 kun" },
  { id: "month", label: "Shu oy" },
  { id: "custom", label: "Tanlash" },
] as const;

const TABS = [
  { id: "sum", label: "Umumiy" },
  { id: "cashier", label: "Kassirlar bo‘yicha" },
  { id: "waiter", label: "Ofitsiantlar bo‘yicha" },
  { id: "menu", label: "Menyu bo‘yicha" },
  { id: "tx", label: "Tranzaksiyalar" },
] as const;

const TYPE: Record<string, string> = { zal: "Zalda", olib: "Olib ketish", yetkaz: "Yetkazish" };
const TX: Record<string, string> = { tolov: "To‘lov", "qarz-tolov": "Qarz to‘lovi", kirim: "Kirim", chiqim: "Chiqim" };

function range(id: string, a: string, b: string): [Date, Date] {
  const d0 = new Date(); d0.setHours(0, 0, 0, 0);
  const add = (d: Date, n: number) => new Date(d.getTime() + n * 86400_000);
  if (id === "yesterday") return [add(d0, -1), d0];
  if (id === "week") return [add(d0, -6), add(d0, 1)];
  if (id === "month") return [new Date(d0.getFullYear(), d0.getMonth(), 1), add(d0, 1)];
  if (id === "custom" && a && b) return [new Date(a + "T00:00"), add(new Date(b + "T00:00"), 1)];
  return [d0, add(d0, 1)];
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function Reports({ ctx }: { ctx: Ctx }) {
  const { s } = ctx;
  const toast = useToast();
  const [rid, setRid] = useState<string>("today");
  const [tab, setTab] = useState<string>("sum");
  const [a, setA] = useState(iso(new Date()));
  const [b, setB] = useState(iso(new Date()));
  const [preview, setPreview] = useState<string | null>(null);
  const [from, to] = range(rid, a, b);
  const r = useMemo(() => report(s, from, to), [s, from.getTime(), to.getTime()]);
  const title = `Z-hisobot: ${RANGES.find((x) => x.id === rid)?.label}`;
  const maxP = Math.max(1, ...r.products.map((p) => p.sum));
  const day = (v: string) => new Date(v).toLocaleDateString("ru-RU");

  const print = () =>
    call<{ printed: boolean; html: string }>("print:report", from.toISOString(), to.toISOString(), title)
      .then((x) => (x.printed ? toast("Hisobot chop etildi") : setPreview(x.html)))
      .catch((e) => toast(e.message, "err"));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Hisobotlar</h1>
        <div className="seg">
          {RANGES.map((x) => <button key={x.id} className={rid === x.id ? "on" : ""} onClick={() => setRid(x.id)}>{x.label}</button>)}
        </div>
        {rid === "custom" && (
          <div className="dates">
            <input type="date" className="input sm" value={a} onChange={(e) => setA(e.target.value)} />
            <span>—</span>
            <input type="date" className="input sm" value={b} onChange={(e) => setB(e.target.value)} />
          </div>
        )}
        <span className="grow" />
        <button className="btn primary" onClick={print}><Icon name="printer" size={18} /> Z-hisobot chop etish</button>
      </div>

      <div className="kpis">
        <div className="kpi main"><small>Tushum</small><b>{num(r.revenue)}</b><span>so‘m</span></div>
        <div className="kpi"><small>Buyurtmalar</small><b>{r.orders}</b><span>{r.checks} chek · o‘rtacha {num(r.avgCheck)}</span></div>
        <div className="kpi"><small>Yangi qarzlar</small><b>{num(r.debtNew)}</b><span>qaytarilgan: {num(Object.values(r.debtPaid).reduce((x, v) => x + v, 0))}</span></div>
        <div className="kpi"><small>Kassadagi naqd</small><b>{num(r.cashInDrawer)}</b><span>kirim {num(r.cashIn)} · chiqim {num(r.cashOut)}</span></div>
      </div>

      <div className="seg" style={{ marginBottom: 12 }}>
        {TABS.map((x) => <button key={x.id} className={tab === x.id ? "on" : ""} onClick={() => setTab(x.id)}>{x.label}</button>)}
      </div>

      {tab === "sum" && (
        <div className="report-grid">
          <div className="card">
            <h3>To‘lov turlari</h3>
            {Object.keys(r.byMethod).length ? Object.entries(r.byMethod).map(([m, v]) => (
              <div className="rrow" key={m}><span>{METHOD[m] ?? m}</span><b>{num(v)}</b></div>
            )) : <p className="muted">Hali to‘lov yo‘q</p>}
            <hr />
            <div className="rrow"><span>Xizmat haqi</span><b>{num(r.service)}</b></div>
            <div className="rrow"><span>Chegirmalar</span><b>{num(r.discount)}</b></div>
            <div className="rrow"><span>Bekor qilingan</span><b>{r.cancelled}</b></div>
          </div>
          <div className="card">
            <h3>Buyurtma turlari</h3>
            {(["zal", "olib", "yetkaz"] as const).map((t) => (
              <div className="rrow" key={t}><span>{TYPE[t]} <small className="muted">({r.byType[t]?.count ?? 0})</small></span><b>{num(r.byType[t]?.sum ?? 0)}</b></div>
            ))}
            <div className="rrow grand"><span>Jami</span><b>{num(r.revenue)}</b></div>
          </div>
        </div>
      )}

      {tab === "cashier" && (
        <div className="report-grid">
          {r.byCashier.map((c) => (
            <div className="card" key={c.name}>
              <h3>{c.name} <small className="muted">· {c.checks} chek</small></h3>
              {Object.entries(c.byMethod).map(([m, v]) => <div className="rrow" key={m}><span>{METHOD[m] ?? m}</span><b>{num(v)}</b></div>)}
              <div className="rrow grand"><span>Jami</span><b>{num(c.sum)}</b></div>
            </div>
          ))}
          {!r.byCashier.length && <div className="card"><p className="muted">Ma'lumot yo‘q</p></div>}
        </div>
      )}

      {tab === "waiter" && (
        <div className="card">
          {r.byWaiter.length ? r.byWaiter.map((w) => (
            <div className="rrow" key={w.name}><span>{w.name} <small className="muted">({w.orders} buyurtma)</small></span><b>{num(w.sum)}</b></div>
          )) : <p className="muted">Ma'lumot yo‘q</p>}
        </div>
      )}

      {tab === "menu" && (
        <div className="card">
          {r.products.length ? r.products.map((p) => (
            <div className="bar-row" key={p.name}>
              <span className="bar-name">{p.name}</span>
              <div className="bar"><i style={{ width: `${(p.sum / maxP) * 100}%` }} /></div>
              <span className="bar-qty">× {p.qty}</span>
              <b>{num(p.sum)}</b>
            </div>
          )) : <p className="muted">Ma'lumot yo‘q</p>}
        </div>
      )}

      {tab === "tx" && (
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Vaqt</th><th>Turi</th><th>To‘lov</th><th>Kim</th><th>Izoh</th><th className="r">Summa</th></tr></thead>
            <tbody>
              {r.transactions.map((t, i) => (
                <tr key={i}>
                  <td>{day(t.at)} {hhmm(t.at)}</td>
                  <td><span className={`status ${t.kind === "chiqim" ? "cancelled" : t.kind === "tolov" ? "paid" : "open"}`}>{TX[t.kind]}</span></td>
                  <td>{METHOD[t.method] ?? t.method}</td>
                  <td>{t.who}</td>
                  <td className="muted">{t.ref}</td>
                  <td className="r"><b className={t.kind === "chiqim" ? "red" : ""}>{t.kind === "chiqim" ? "−" : ""}{num(t.amount)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!r.transactions.length && <div className="empty">Tranzaksiya yo‘q</div>}
        </div>
      )}
      {preview && <ReceiptPreview html={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
