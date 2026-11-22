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
        <div>
          <h1>{type === "olib" ? "Olib ketish" : "Yetkazib berish"}</h1>
          <p className="muted">Ochiq: {list.length} · Bugun yopilgan: {doneToday}</p>
        </div>
      </div>
      <div className="order-cards">
        <button className="ocard new" onClick={create}>
          <Icon name="plus" size={36} />
          <b>Yangi buyurtma</b>
        </button>
        {list.map((o) => (
          <button key={o.id} className="ocard" onClick={() => go({ name: "order", orderId: o.id, back: type })}>
            <div className="ocard-top">
              <b>№{o.no}</b>
              <span className="muted">{hhmm(o.createdAt)} · {elapsed(o.createdAt, now)}</span>
            </div>
            <div className="ocard-sum">{num(orderTotals(o).total)} so‘m</div>
            <div className="muted">{orderItemsCount(o)} ta taom · {o.waiterName}</div>
            {(o.customer.name || o.customer.phone) && <div className="ocard-cust"><Icon name="user" size={14} /> {o.customer.name} {o.customer.phone}</div>}
            {o.customer.address && <div className="ocard-addr">{o.customer.address}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
