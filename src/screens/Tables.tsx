import { useState } from "react";
import { call } from "../api";
import type { Ctx } from "../App";
import { num, orderItemsCount, orderTotals } from "../shared/logic";
import type { Order } from "../shared/types";
import { Icon, elapsed, useClock, useToast } from "../ui";

export function Tables({ ctx }: { ctx: Ctx }) {
  const { s, go } = ctx;
  const [hall, setHall] = useState<string>("all");
  const now = useClock(30_000);
  const toast = useToast();
  const open = s.orders.filter((o) => o.status === "open" && o.type === "zal");
  const byTable = new Map(open.map((o) => [`${o.hallId}:${o.table}`, o]));
  const halls = hall === "all" ? s.settings.halls : s.settings.halls.filter((h) => h.id === hall);
  const busyTotal = open.reduce((t, o) => t + orderTotals(o).total, 0);

  const openTable = async (hallId: string, table: number) => {
    try {
      const id = await call<string>("order:open", { type: "zal", hallId, table });
      go({ name: "order", orderId: id, back: "tables" });
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  return (
    <div className="tables-screen">
      <aside className="side">
        <button className={`side-btn ${hall === "all" ? "on" : ""}`} onClick={() => setHall("all")}>
          <Icon name="table" /> Barcha
          {open.length > 0 && <i className="count">{open.length}</i>}
        </button>
        {s.settings.halls.map((h) => {
          const n = open.filter((o) => o.hallId === h.id).length;
          return (
            <button key={h.id} className={`side-btn ${hall === h.id ? "on" : ""}`} onClick={() => setHall(h.id)}>
              {h.name}
              {n > 0 && <i className="count">{n}</i>}
            </button>
          );
        })}
        <div className="side-sum">
          <small>Band stollar</small>
          <b>{open.length}</b>
          <small>Ochiq summa</small>
          <b>{num(busyTotal)}</b>
        </div>
      </aside>
      <div className="tables-scroll">
        {halls.map((h) => (
          <section key={h.id} className="hall">
            <h2># {h.name}</h2>
            <div className="table-grid">
              {Array.from({ length: h.tables }, (_, i) => i + 1).map((t) => {
                const o = byTable.get(`${h.id}:${t}`);
                return <TableCard key={t} n={t} o={o} now={now} onClick={() => openTable(h.id, t)} />;
              })}
            </div>
          </section>
        ))}
        {!s.settings.halls.length && <div className="empty">Zallar yo‘q. Sozlamalar → Zallar bo‘limidan qo‘shing.</div>}
      </div>
    </div>
  );
}

function TableCard({ n, o, now, onClick }: { n: number; o?: Order; now: Date; onClick: () => void }) {
  if (!o) {
    return (
      <button className="tcard free" onClick={onClick}>
        <span className="tno">{n}</span>
        <span className="plus"><Icon name="plus" size={22} /></span>
        <small>Bo‘sh</small>
      </button>
    );
  }
  const t = orderTotals(o);
  const unsent = o.checks.some((c) => c.lines.some((l) => l.qty > l.sent));
  const partly = o.checks.some((c) => c.paid);
  return (
    <button className={`tcard busy ${unsent ? "unsent" : ""}`} onClick={onClick}>
      <div className="tcard-top">
        <span className="tno">{n}</span>
        <b className="tsum">{num(t.total)}</b>
      </div>
      <div className="tmeta">
        <span><Icon name="user" size={13} /> {o.waiterName}</span>
        <span><Icon name="history" size={13} /> {elapsed(o.createdAt, now)}</span>
      </div>
      <div className="ttags">
        <span>{orderItemsCount(o)} ta taom</span>
        {o.checks.length > 1 && <span>{o.checks.length} hisob</span>}
        {unsent && <span className="warn">Yuborilmagan</span>}
        {partly && <span>Qisman to‘langan</span>}
      </div>
    </button>
  );
}
