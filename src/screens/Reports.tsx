import { useMemo, useState } from "react";
import { call } from "../api";
import type { Ctx } from "../App";
import { num, report } from "../shared/logic";
import { Icon, METHOD, useToast } from "../ui";
import { ReceiptPreview } from "./OrderScreen";

const RANGES = [
  { id: "today", label: "Bugun" },
  { id: "yesterday", label: "Kecha" },
  { id: "week", label: "7 kun" },
  { id: "month", label: "Shu oy" },
  { id: "custom", label: "Tanlash" },
] as const;

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
  const [a, setA] = useState(iso(new Date()));
  const [b, setB] = useState(iso(new Date()));
  const [preview, setPreview] = useState<string | null>(null);
  const [from, to] = range(rid, a, b);
  const r = useMemo(() => report(s, from, to), [s, from.getTime(), to.getTime()]);
  const title = `Hisobot: ${RANGES.find((x) => x.id === rid)?.label}`;
  const maxP = Math.max(1, ...r.products.map((p) => p.sum));

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
        <button className="btn" onClick={print}><Icon name="printer" size={18} /> Chop etish</button>
      </div>

      <div className="kpis">
        <div className="kpi main"><small>Tushum</small><b>{num(r.revenue)}</b><span>so‘m</span></div>
        <div className="kpi"><small>Buyurtmalar</small><b>{r.orders}</b><span>{r.checks} chek</span></div>
        <div className="kpi"><small>O‘rtacha chek</small><b>{num(r.avgCheck)}</b><span>so‘m</span></div>
        <div className="kpi"><small>Kassadagi naqd</small><b>{num(r.cashInDrawer)}</b><span>kirim {num(r.cashIn)} · chiqim {num(r.cashOut)}</span></div>
      </div>

      <div className="report-grid">
        <div className="card">
          <h3>To‘lov turlari</h3>
          {Object.keys(r.byMethod).length ? Object.entries(r.byMethod).map(([m, v]) => (
            <div className="rrow" key={m}><span>{METHOD[m] ?? m}</span><b>{num(v)}</b></div>
          )) : <p className="muted">Hali to‘lov yo‘q</p>}
          <hr />
          <div className="rrow"><span>Zal</span><b>{num(r.byType.zal ?? 0)}</b></div>
          <div className="rrow"><span>Olib ketish</span><b>{num(r.byType.olib ?? 0)}</b></div>
          <div className="rrow"><span>Yetkazish</span><b>{num(r.byType.yetkaz ?? 0)}</b></div>
          <hr />
          <div className="rrow"><span>Xizmat haqi</span><b>{num(r.service)}</b></div>
          <div className="rrow"><span>Chegirmalar</span><b>{num(r.discount)}</b></div>
          <div className="rrow"><span>Bekor qilingan</span><b>{r.cancelled}</b></div>
        </div>
        <div className="card">
          <h3>Ofitsiantlar</h3>
          {r.byWaiter.length ? r.byWaiter.map((w) => (
            <div className="rrow" key={w.name}><span>{w.name} <small className="muted">({w.orders})</small></span><b>{num(w.sum)}</b></div>
          )) : <p className="muted">Ma'lumot yo‘q</p>}
        </div>
        <div className="card wide">
          <h3>Taomlar bo‘yicha</h3>
          {r.products.length ? r.products.map((p) => (
            <div className="bar-row" key={p.name}>
              <span className="bar-name">{p.name}</span>
              <div className="bar"><i style={{ width: `${(p.sum / maxP) * 100}%` }} /></div>
              <span className="bar-qty">× {p.qty}</span>
              <b>{num(p.sum)}</b>
            </div>
          )) : <p className="muted">Ma'lumot yo‘q</p>}
        </div>
      </div>
      {preview && <ReceiptPreview html={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
