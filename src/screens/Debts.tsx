import { useState } from "react";
import { call } from "../api";
import type { Ctx } from "../App";
import { num } from "../shared/logic";
import type { Debt, PayMethod } from "../shared/types";
import { Icon, METHOD, Modal, hhmm, useToast } from "../ui";

export function Debts({ ctx }: { ctx: Ctx }) {
  const { s } = ctx;
  const toast = useToast();
  const [tab, setTab] = useState<"open" | "paid">("open");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Debt | null>(null);
  const day = (iso: string) => new Date(iso).toLocaleDateString("ru-RU");
  const open = s.debts.filter((d) => !d.paidAt);
  const list = s.debts
    .filter((d) => (tab === "open" ? !d.paidAt : !!d.paidAt))
    .filter((d) => !q || `${d.customerName} ${d.phone} ${d.orderNo}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const pay = (m: PayMethod) =>
    sel && call("debt:pay", sel.id, m).then(() => { toast(`Qarz yopildi: ${num(sel.amount)} so‘m`); setSel(null); }).catch((e) => toast(e.message, "err"));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Qarzlar</h1>
        <div className="seg">
          <button className={tab === "open" ? "on" : ""} onClick={() => setTab("open")}>To‘lanmagan ({open.length})</button>
          <button className={tab === "paid" ? "on" : ""} onClick={() => setTab("paid")}>To‘langan</button>
        </div>
        <span className="grow" />
        <div className="search sm"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ism, telefon, №" /></div>
      </div>
      <div className="kpis">
        <div className="kpi main"><small>Jami qarz</small><b>{num(open.reduce((x, d) => x + d.amount, 0))}</b><span>{open.length} ta mijoz</span></div>
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Sana</th><th>Mijoz</th><th>Telefon</th><th>Buyurtma</th><th>Sabab</th><th>Kassir</th><th className="r">Summa</th>{tab === "paid" && <th>To‘landi</th>}</tr></thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id} className={tab === "open" ? "click" : ""} onClick={() => tab === "open" && setSel(d)}>
                <td>{day(d.createdAt)} {hhmm(d.createdAt)}</td>
                <td><b>{d.customerName || "—"}</b></td>
                <td>{d.phone}</td>
                <td>№{d.orderNo}</td>
                <td className="muted">{d.reason}</td>
                <td>{d.cashierName}</td>
                <td className="r"><b>{num(d.amount)}</b></td>
                {tab === "paid" && <td>{d.paidAt && `${day(d.paidAt)} · ${METHOD[d.paidMethod ?? ""] ?? ""}`}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        {!list.length && <div className="empty">{tab === "open" ? "Qarz yo‘q" : "Hali to‘langan qarz yo‘q"}</div>}
      </div>
      {sel && (
        <Modal title={`Qarzni yopish — ${sel.customerName || sel.phone}`} onClose={() => setSel(null)} width={460}>
          <div className="pay-top"><div><small>Qarz summasi</small><b>{num(sel.amount)} UZS</b></div></div>
          <p className="muted small" style={{ marginBottom: 12 }}>Mijoz qanday to‘ladi?</p>
          <div className="choice-list">
            {(["naqd", "terminal", "qr", "click", "payme"] as PayMethod[]).map((m) => (
              <button key={m} className="choice" onClick={() => pay(m)}>{METHOD[m]} <Icon name="check" /></button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
