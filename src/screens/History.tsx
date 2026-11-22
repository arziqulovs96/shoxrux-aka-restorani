import { useState } from "react";
import { call } from "../api";
import type { Ctx } from "../App";
import { num, orderTotals } from "../shared/logic";
import type { Order } from "../shared/types";
import { Icon, METHOD, Modal, hhmm, useToast } from "../ui";
import { ReceiptPreview } from "./OrderScreen";

const STATUS: Record<string, string> = { open: "Ochiq", paid: "To‘langan", cancelled: "Bekor qilingan" };
const TYPE: Record<string, string> = { zal: "Zal", olib: "Olib ketish", yetkaz: "Yetkazish" };

export function History({ ctx }: { ctx: Ctx }) {
  const { s, go } = ctx;
  const toast = useToast();
  const [q, setQ] = useState("");
  const [st, setSt] = useState("all");
  const [sel, setSel] = useState<Order | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const list = s.orders
    .filter((o) => st === "all" || o.status === st)
    .filter((o) => !q || String(o.no) === q.trim() || o.waiterName.toLowerCase().includes(q.toLowerCase()) || o.customer.phone.includes(q))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 300);
  const where = (o: Order) => (o.type === "zal" ? `${s.settings.halls.find((h) => h.id === o.hallId)?.name ?? ""} · ${o.table}-stol` : TYPE[o.type]);
  const day = (iso: string) => new Date(iso).toLocaleDateString("ru-RU");

  return (
    <div className="page">
      <div className="page-head">
        <h1>Buyurtmalar tarixi</h1>
        <div className="seg">
          {["all", "open", "paid", "cancelled"].map((x) => <button key={x} className={st === x ? "on" : ""} onClick={() => setSt(x)}>{x === "all" ? "Barchasi" : STATUS[x]}</button>)}
        </div>
        <span className="grow" />
        <div className="search sm"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="№, ofitsiant, telefon" /></div>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>№</th><th>Sana</th><th>Joy</th><th>Ofitsiant</th><th>Holat</th><th className="r">Summa</th></tr></thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id} onClick={() => setSel(o)}>
                <td><b>{o.no}</b></td>
                <td>{day(o.createdAt)} {hhmm(o.createdAt)}</td>
                <td>{where(o)}</td>
                <td>{o.waiterName}</td>
                <td><span className={`status ${o.status}`}>{STATUS[o.status]}</span></td>
                <td className="r"><b>{num(orderTotals(o).total)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <div className="empty">Buyurtma topilmadi</div>}
      </div>
      {sel && (
        <Modal
          title={`Buyurtma №${sel.no} — ${where(sel)}`}
          onClose={() => setSel(null)}
          width={560}
          footer={
            <>
              {sel.status === "open" && <button className="btn" onClick={() => { setSel(null); go({ name: "order", orderId: sel.id, back: sel.type === "zal" ? "tables" : sel.type }); }}>Ochish</button>}
              <button className="btn primary" onClick={() => call<{ printed: boolean; html: string }>("print:bill", sel.id, null, sel.status === "paid").then((r) => (r.printed ? toast("Chop etildi") : setPreview(r.html))).catch((e) => toast(e.message, "err"))}>
                <Icon name="printer" size={18} /> Chekni qayta chiqarish
              </button>
            </>
          }
        >
          <p className="muted">{day(sel.createdAt)} {hhmm(sel.createdAt)} · {sel.waiterName} · {STATUS[sel.status]}{sel.cancelReason ? ` — ${sel.cancelReason}` : ""}</p>
          {sel.checks.map((c) => (
            <div key={c.id} className="hist-check">
              {sel.checks.length > 1 && <h4>{c.name} {c.paid && <span className="status paid">To‘langan</span>}</h4>}
              {c.lines.map((l) => <div className="rrow" key={l.id}><span>{l.name} × {l.qty}</span><b>{num(l.qty * l.price)}</b></div>)}
              {c.payments.map((p, i) => <div className="rrow muted" key={i}><span>{METHOD[p.method]}</span><span>{num(p.amount)}</span></div>)}
            </div>
          ))}
          <div className="rrow grand"><span>Jami</span><b>{num(orderTotals(sel).total)} so‘m</b></div>
        </Modal>
      )}
      {preview && <ReceiptPreview html={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
