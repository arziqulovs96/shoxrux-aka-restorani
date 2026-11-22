import { useState } from "react";
import { call } from "../api";
import type { Ctx } from "../App";
import { num } from "../shared/logic";
import { Icon, Keypad, hhmm, useToast } from "../ui";

export function Cash({ ctx }: { ctx: Ctx }) {
  const { s } = ctx;
  const toast = useToast();
  const [type, setType] = useState<"kirim" | "chiqim">("chiqim");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const list = [...s.cash].filter((e) => new Date(e.at) >= today).reverse();
  const tin = list.filter((e) => e.type === "kirim").reduce((x, e) => x + e.amount, 0);
  const tout = list.filter((e) => e.type === "chiqim").reduce((x, e) => x + e.amount, 0);
  const notes = type === "chiqim" ? ["Bozorlik", "Non", "Gaz / svet", "Ish haqi", "Yetkazib beruvchi"] : ["Smena boshi qoldiq", "Mayda pul", "Boshqa"];

  const press = (k: string) => {
    if (k === "⌫") setAmount((v) => v.slice(0, -1));
    else if (k === "00") setAmount((v) => (v ? v + "00" : v));
    else setAmount((v) => (v + k).replace(/^0+/, "").slice(0, 10));
  };
  const save = () =>
    call("cash:add", { type, amount: Number(amount), note })
      .then(() => { toast(type === "kirim" ? "Kirim yozildi" : "Chiqim yozildi"); setAmount(""); setNote(""); })
      .catch((e) => toast(e.message, "err"));

  return (
    <div className="page cash-page">
      <div className="cash-form card">
        <div className="cash-left">
        <h1>Kirim / Chiqim</h1>
        <div className="seg big">
          <button className={type === "chiqim" ? "on red" : ""} onClick={() => setType("chiqim")}>Chiqim (kassadan)</button>
          <button className={type === "kirim" ? "on" : ""} onClick={() => setType("kirim")}>Kirim (kassaga)</button>
        </div>
        <div className="cash-amount">{amount ? num(Number(amount)) : "0"} <span>so‘m</span></div>
        <div className="chips">{notes.map((n) => <button key={n} className={note === n ? "on" : ""} onClick={() => setNote(n)}>{n}</button>)}</div>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Izoh (nima uchun)" />
        </div>
        <div className="cash-right">
          <Keypad onKey={press} extra="00" />
          <button className="btn primary big" onClick={save} disabled={!Number(amount)}><Icon name="check" /> Saqlash</button>
        </div>
      </div>
      <div className="card cash-list">
        <h3>Bugun</h3>
        <div className="cash-totals">
          <div><small>Kirim</small><b className="green">+{num(tin)}</b></div>
          <div><small>Chiqim</small><b className="red">−{num(tout)}</b></div>
        </div>
        {list.map((e) => (
          <div key={e.id} className="cash-row">
            <span className={`dot ${e.type}`} />
            <div><b>{e.note || (e.type === "kirim" ? "Kirim" : "Chiqim")}</b><small className="muted">{hhmm(e.at)} · {e.staffName}</small></div>
            <b className={e.type === "kirim" ? "green" : "red"}>{e.type === "kirim" ? "+" : "−"}{num(e.amount)}</b>
          </div>
        ))}
        {!list.length && <p className="muted">Bugun yozuv yo‘q</p>}
      </div>
    </div>
  );
}
