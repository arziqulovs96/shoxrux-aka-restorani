import { call } from "../api";
import type { Ctx } from "../App";
import { num, orderItemsCount, orderTotals } from "../shared/logic";
import { Icon, elapsed, hhmm, useClock, useToast } from "../ui";

export function OrdersList({ ctx, type }: { ctx: Ctx; type: "olib" | "yetkaz" }) {
  const { s, go } = ctx;
  const now = useClock(30_000);
  const toast = useToast();
  const list = s.orders.filter((o) => o.status === "open" && o.type === type).sort((a, b) => b.no - a.no);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const doneToday = s.orders.filter((o) => o.type === type && o.status === "paid" && o.closedAt && new Date(o.closedAt) >= today).length;

  const create = async () => {
    try {
      const id = await call<string>("order:open", { type });
      go({ name: "order", orderId: id, back: type });
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  return (
    <div className="list-screen">
      <div className="list-head">
        <h1>{type === "olib" ? "Olib ketish" : "Yetkazib berish"}</h1>
        <p className="muted">Ochiq: {list.length} · Bugun yopilgan: {doneToday}</p>
      </div>
      <div className="order-cards">
        <button className="ocard new" onClick={create}>
          <Icon name="plus" size={36} />
          <b>Yangi buyurtma</b>
        </button>
        {list.map((o) => {
          const unsent = o.checks.some((c) => c.lines.some((l) => l.qty > l.sent));
          return (
            <button key={o.id} className={`ocard ${type}`} onClick={() => go({ name: "order", orderId: o.id, back: type })}>
              <div className="ocard-top">
                <b>{o.no}</b>
                <span className="sum">{num(orderTotals(o).total)}</span>
              </div>
              <div className="ocard-line"><Icon name="user" size={14} /> {o.waiterName}</div>
              <div className="ocard-line"><Icon name="history" size={14} /> {hhmm(o.createdAt)} · {elapsed(o.createdAt, now)}</div>
              {(o.customer.phone || o.customer.name) && <div className="ocard-line"><Icon name="bike" size={14} /> {o.customer.name} {o.customer.phone}</div>}
              {(o.note || o.customer.address) && <div className="ocard-line"><Icon name="note" size={14} /> {o.note || o.customer.address}</div>}
              <div className="ocard-status">{!orderItemsCount(o) ? "Bo‘sh" : unsent ? "Oshxonaga yuborilmagan" : "Kutilmoqda"}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
