import { useEffect, useMemo, useRef, useState } from "react";
import { call } from "../api";
import type { Ctx } from "../App";
import emblem from "../assets/emblem.svg";
import { checkTotals, menu, num, orderTotals } from "../shared/logic";
import type { Check, Line, Order, PayMethod, Product } from "../shared/types";
import { Icon, Keypad, Modal, elapsed, useClock, useToast } from "../ui";

type Dialog = null | "pay" | "move" | "cancel" | "discount" | "customer" | "waiter" | "type" | { note: Line } | { moveLine: Line } | { preview: string };

export function OrderScreen({ ctx, orderId, back }: { ctx: Ctx; orderId: string; back: "tables" | "olib" | "yetkaz" }) {
  const { s, me, go } = ctx;
  const toast = useToast();
  const now = useClock(30_000);
  const order = s.orders.find((o) => o.id === orderId);
  const { categories, products } = useMemo(() => menu(s), [s.site, s.local, s.priceOverrides]);
  const [cat, setCat] = useState<string>("");
  const [q, setQ] = useState("");
  const [checkId, setCheckId] = useState<string>("");
  const [dlg, setDlg] = useState<Dialog>(null);
  const [selLine, setSelLine] = useState<string | null>(null);
  const linesRef = useRef<HTMLDivElement>(null);

  const activeCat = cat || categories[0]?.id || "";
  const check = order?.checks.find((c) => c.id === checkId && !c.paid) ?? order?.checks.find((c) => !c.paid);
  const stop = new Set(s.stoplist);

  // Yangi yetkazib berish buyurtmasida mijoz oynasi o‘zi ochiladi
  useEffect(() => {
    if (order?.type === "yetkaz" && !order.customer.phone && !order.checks.some((c) => c.lines.length)) setDlg("customer");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Chiqib ketganda bo‘sh qolgan buyurtma o‘chiriladi
  useEffect(() => () => { call("order:dropIfEmpty", orderId); }, [orderId]);

  // Buyurtma yopilsa (to‘liq to‘landi) yoki o‘chirilsa — orqaga
  useEffect(() => {
    if (!order || order.status !== "open") go({ name: back } as never);
  }, [order, back, go]);

  if (!order || order.status !== "open" || !check) return null;

  const run = async (p: Promise<unknown>, ok?: string) => {
    try {
      await p;
      if (ok) toast(ok);
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  const add = (p: Product) => {
    if (stop.has(p.id)) return toast(`${p.name} — tugagan (stop-list)`, "err");
    run(call("order:add", order.id, check.id, p.id));
    setTimeout(() => linesRef.current?.scrollTo({ top: 99999, behavior: "smooth" }), 30);
  };

  const shown = q.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
    : products.filter((p) => p.categoryId === activeCat);
  const inCheck = new Map<string, number>();
  for (const l of check.lines) inCheck.set(l.productId, (inCheck.get(l.productId) ?? 0) + l.qty);

  const t = checkTotals(order, check);
  const all = orderTotals(order);
  const unsent = order.checks.some((c) => c.lines.some((l) => l.qty > l.sent));
  const hall = s.settings.halls.find((h) => h.id === order.hallId);
  const title = order.type === "zal" ? `${order.table}-stol` : order.type === "olib" ? "Olib ketish" : "Yetkazib berish";
  const sub = order.type === "zal" ? hall?.name ?? "" : `№${order.no}`;
  const canCash = me.role !== "ofitsiant";

  const kitchen = () =>
    run(
      call<{ printed: boolean; count: number }>("order:kitchen", order.id).then((r) => {
        if (!r.count) toast("Yangi taom yo‘q — hammasi yuborilgan", "info");
        else toast(r.printed ? `Tasdiqlandi va oshxonaga chop etildi (${r.count})` : `Tasdiqlandi — oshxonaga yuborildi (${r.count} ta)`);
      }),
    );

  const billAll = () =>
    run(
      call<{ printed: boolean; html: string }>("print:bill", order.id, null, false).then((r) => {
        if (r.printed) toast("Umumiy chek chop etildi");
        else setDlg({ preview: r.html });
      }),
    );

  const bill = () =>
    run(
      call<{ printed: boolean; html: string }>("print:bill", order.id, order.checks.length > 1 ? check.id : null, false).then((r) => {
        if (r.printed) toast("Hisob cheki chop etildi");
        else setDlg({ preview: r.html });
      }),
    );

  return (
    <div className="order-screen">
      <aside className="side cats">
        <button className="side-btn back" onClick={() => go({ name: back } as never)}>
          <Icon name="back" /> Orqaga
        </button>
        {categories.map((c) => (
          <button key={c.id} className={`side-btn ${activeCat === c.id && !q ? "on" : ""}`} onClick={() => { setCat(c.id); setQ(""); }}>
            {c.name}
          </button>
        ))}
        {!categories.length && <div className="side-empty">Menyu yuklanmagan. Internetni tekshiring yoki tepadagi ↻ tugmasini bosing.</div>}
      </aside>

      <section className="products">
        <div className="search">
          <Icon name="search" size={20} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Taom qidirish…" />
          {q && <button className="icon-btn ghost sm" onClick={() => setQ("")}><Icon name="x" size={16} /></button>}
        </div>
        <div className="product-grid">
          {shown.map((p) => (
            <button key={p.id} className={`pcard ${stop.has(p.id) ? "stopped" : ""}`} onClick={() => add(p)}>
              <div className="pimg">
                {p.image ? <img src={p.image} alt="" loading="lazy" draggable={false} /> : <div className="pimg-ph"><img src={emblem} alt="" /></div>}
                {inCheck.get(p.id) ? <i className="pqty">{inCheck.get(p.id)}</i> : null}
                {stop.has(p.id) && <span className="stop-tag">Tugagan</span>}
              </div>
              <div className="pinfo">
                <b>{p.name}</b>
                <span>{num(p.price)} so‘m{p.unit ? ` / ${p.unit}` : ""}</span>
              </div>
            </button>
          ))}
          {!shown.length && <div className="empty">{q ? "Hech narsa topilmadi" : "Bu bo‘limda taom yo‘q"}</div>}
        </div>
      </section>

      <section className="ticket">
        <div className="ticket-head">
          <div>
            <h2>{title}</h2>
            <span className="muted">{sub} · {order.waiterName} · {elapsed(order.createdAt, now)}</span>
          </div>
          {order.type !== "zal" ? (
            <button className="chip-btn" onClick={() => setDlg("customer")}>
              <Icon name="user" size={16} /> {order.customer.phone || order.customer.name || "Mijoz"}
            </button>
          ) : order.note ? <span className="chip-btn" onClick={() => setDlg("customer")}><Icon name="note" size={16} /> {order.note}</span> : null}
        </div>

        <div className="checks">
          {order.checks.map((c) => (
            <button
              key={c.id}
              className={`check-tab ${c.id === check.id ? "on" : ""} ${c.paid ? "paid" : ""}`}
              disabled={c.paid}
              onClick={() => { setCheckId(c.id); setSelLine(null); }}
            >
              {c.paid && <Icon name="check" size={14} />} {c.name}
            </button>
          ))}
          <button className="check-tab add" onClick={() => run(call<string>("order:addCheck", order.id).then(setCheckId))} title="Yangi hisob">
            <Icon name="plus" size={16} />
          </button>
          {order.checks.length > 1 && !check.lines.length && (
            <button className="check-tab del" onClick={() => run(call("order:removeCheck", order.id, check.id))} title="Hisobni o‘chirish">
              <Icon name="trash" size={15} />
            </button>
          )}
        </div>

        <div className="lines-head"><span>Nomi</span><span>Soni</span><span>Summa</span></div>
        <div className="lines" ref={linesRef}>
          {check.lines.map((l) => (
            <div key={l.id} className={`line ${selLine === l.id ? "sel" : ""}`} onClick={() => setSelLine(selLine === l.id ? null : l.id)}>
              <div className="line-main">
                <div className="line-name">
                  <b>{l.name}</b>
                  <span className="muted">{num(l.price)} × {l.qty}</span>
                  {l.note && <span className="line-note"><Icon name="note" size={12} /> {l.note}</span>}
                </div>
                <div className="qty" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => run(call("order:qty", order.id, check.id, l.id, -1))}><Icon name="minus" size={18} /></button>
                  <b>{l.qty}</b>
                  <button onClick={() => run(call("order:qty", order.id, check.id, l.id, 1))}><Icon name="plus" size={18} /></button>
                </div>
                <div className="line-sum">
                  {num(l.price * l.qty)}
                  {l.sent > 0 && <span className={`sent ${l.sent >= l.qty ? "all" : ""}`}><Icon name="chef" size={12} /> {l.sent}</span>}
                </div>
              </div>
              {selLine === l.id && (
                <div className="line-actions" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setDlg({ note: l })}><Icon name="note" size={16} /> Izoh</button>
                  {order.checks.filter((c) => !c.paid).length > 1 && (
                    <button onClick={() => setDlg({ moveLine: l })}><Icon name="split" size={16} /> Boshqa hisobga</button>
                  )}
                  <button className="danger" onClick={() => run(call("order:qty", order.id, check.id, l.id, -l.qty))}><Icon name="trash" size={16} /> O‘chirish</button>
                </div>
              )}
            </div>
          ))}
          {!check.lines.length && (
            <div className="lines-empty">
              <Icon name="table" size={40} stroke={1.4} />
              <p>Taom qo‘shish uchun chapdagi menyudan tanlang</p>
            </div>
          )}
        </div>

        <div className="totals">
          <div><span>Mahsulotlar</span><span>{num(t.sub)}</span></div>
          <div className="clickable" onClick={() => canCash && setDlg("discount")}>
            <span>Xizmat haqi {order.serviceRate}%</span><span>{num(t.service)}</span>
          </div>
          {order.discount > 0 && <div className="disc"><span>Chegirma {order.discount}%</span><span>−{num(t.discount)}</span></div>}
          <div className="grand"><span>Jami{order.checks.length > 1 ? ` (${check.name})` : ""}</span><span>{num(t.total)} <small>so‘m</small></span></div>
          {order.checks.length > 1 && <div className="muted small"><span>Butun stol</span><span>{num(all.total)}</span></div>}
        </div>

        <div className="tools">
          <button className="tool" onClick={() => setDlg("type")}><Icon name={order.type === "zal" ? "table" : order.type === "olib" ? "bag" : "bike"} /> Turi</button>
          <button className="tool" onClick={() => setDlg("waiter")} disabled={!canCash}><Icon name="user" /> Ofitsiant</button>
          <button className="tool" onClick={bill} disabled={!check.lines.length}><Icon name="printer" /> Chek</button>
          {order.checks.length > 1 && <button className="tool" onClick={billAll}><Icon name="list" /> Umumiy chek</button>}
          {canCash && <button className="tool" onClick={() => setDlg("discount")}><Icon name="percent" /> Chegirma</button>}
          {order.type === "zal" && <button className="tool" onClick={() => setDlg("move")}><Icon name="swap" /> Ko‘chirish</button>}
          <button className="tool" onClick={() => setDlg("customer")}><Icon name="note" /> Izoh</button>
          <button className="tool danger" onClick={() => setDlg("cancel")}><Icon name="trash" /> Bekor</button>
        </div>
        <div className="big-actions">
          <button className={`confirm ${unsent ? "hot" : ""}`} onClick={kitchen} disabled={!unsent}>
            <Icon name="chef" size={22} /> Tasdiqlash
          </button>
          <button className="pay" disabled={!check.lines.length || !canCash} onClick={() => setDlg("pay")}>
            <Icon name="wallet" size={22} /> {canCash ? "To‘lov" : "Kassirda"}
          </button>
        </div>
      </section>

      {dlg === "pay" && <PayDialog order={order} check={check} onClose={() => setDlg(null)} onDone={(r) => {
        setDlg(null);
        toast(r.change > 0 ? `To‘landi ✓ Qaytim: ${num(r.change)} so‘m` : "To‘landi ✓");
        if (r.printError) toast(`Chek chop etilmadi: ${r.printError}`, "err");
      }} />}
      {dlg === "move" && <MoveDialog ctx={ctx} order={order} onClose={() => setDlg(null)} />}
      {dlg === "cancel" && <CancelDialog order={order} onClose={() => setDlg(null)} />}
      {dlg === "discount" && <DiscountDialog order={order} onClose={() => setDlg(null)} />}
      {dlg === "customer" && <CustomerDialog order={order} onClose={() => setDlg(null)} />}
      {dlg === "waiter" && (
        <Modal title="Ofitsiantni almashtirish" onClose={() => setDlg(null)} width={440}>
          <div className="choice-list">
            {s.staff.filter((x) => x.active && x.role !== "admin").map((x) => (
              <button key={x.id} className={`choice ${order.waiterId === x.id ? "on" : ""}`} onClick={() => { run(call("order:waiter", order.id, x.id), `Ofitsiant: ${x.name}`); setDlg(null); }}>
                {x.name} <span className="muted small">{x.role === "kassir" ? "Kassir" : "Ofitsiant"}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {dlg === "type" && (
        <Modal title="Buyurtma turi" onClose={() => setDlg(null)} width={440}>
          <div className="choice-list">
            <button className={`choice ${order.type === "zal" ? "on" : ""}`} onClick={() => setDlg("move")}><span><Icon name="table" /> Zalda (stol tanlash)</span></button>
            <button className={`choice ${order.type === "olib" ? "on" : ""}`} onClick={() => { run(call("order:type", order.id, "olib"), "Olib ketishga o‘tkazildi"); setDlg(null); }}><span><Icon name="bag" /> Olib ketish</span></button>
            <button className={`choice ${order.type === "yetkaz" ? "on" : ""}`} onClick={() => { run(call("order:type", order.id, "yetkaz"), "Yetkazib berishga o‘tkazildi"); setDlg("customer"); }}><span><Icon name="bike" /> Yetkazib berish</span></button>
          </div>
        </Modal>
      )}
      {dlg && typeof dlg === "object" && "note" in dlg && (
        <NoteDialog line={dlg.note} onClose={() => setDlg(null)} onSave={(n) => { run(call("order:lineNote", order.id, check.id, dlg.note.id, n)); setDlg(null); }} />
      )}
      {dlg && typeof dlg === "object" && "moveLine" in dlg && (
        <Modal title="Qaysi hisobga o‘tkazamiz?" onClose={() => setDlg(null)} width={420}>
          <div className="choice-list">
            {order.checks.filter((c) => !c.paid && c.id !== check.id).map((c) => (
              <button key={c.id} className="choice" onClick={() => { run(call("order:moveLine", order.id, check.id, c.id, dlg.moveLine.id)); setDlg(null); setSelLine(null); }}>
                {c.name} <span className="muted">{c.lines.length} ta taom</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {dlg && typeof dlg === "object" && "preview" in dlg && <ReceiptPreview html={dlg.preview} onClose={() => setDlg(null)} />}
    </div>
  );
}

export function ReceiptPreview({ html, onClose }: { html: string; onClose: () => void }) {
  const toast = useToast();
  return (
    <Modal
      title="Chek ko‘rinishi"
      onClose={onClose}
      width={460}
      footer={
        <>
          <span className="muted small">Printer tanlanmagan — Sozlamalar → Printerlar</span>
          <button className="btn primary" onClick={() => call("print:html", html, "receipt").then(() => toast("Chop etishga yuborildi")).catch((e) => toast(e.message, "err"))}>
            <Icon name="printer" size={18} /> Chop etish
          </button>
        </>
      }
    >
      <div className="receipt-frame"><iframe title="chek" srcDoc={html} /></div>
    </Modal>
  );
}

const METHODS: { m: PayMethod; label: string; icon: string }[] = [
  { m: "naqd", label: "Naqd", icon: "cash" },
  { m: "terminal", label: "Terminal (Uzcard / Humo)", icon: "wallet" },
  { m: "qr", label: "QR kod", icon: "zoom" },
  { m: "click", label: "Click", icon: "wallet" },
  { m: "payme", label: "Payme", icon: "wallet" },
];

function PayDialog({ order, check, onClose, onDone }: { order: Order; check: Check; onClose: () => void; onDone: (r: { change: number; printError: string }) => void }) {
  const total = checkTotals(order, check).total;
  const [amounts, setAmounts] = useState<Record<string, number>>({ naqd: total });
  const [active, setActive] = useState<PayMethod>("naqd");
  const [fresh, setFresh] = useState(true);
  const [debtor, setDebtor] = useState({ name: order.customer.name, phone: order.customer.phone, reason: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const sum = Object.values(amounts).reduce((x, v) => x + (v || 0), 0);
  const rest = Math.max(0, total - sum);
  const change = Math.max(0, sum - total);
  const hasDebt = (amounts.qarz ?? 0) > 0;

  const setAmt = (m: string, v: number) => setAmounts((a) => ({ ...a, [m]: Math.max(0, Math.min(v, 999_999_999)) }));
  const press = (k: string) => {
    setErr("");
    const cur = fresh ? "" : String(amounts[active] || "");
    if (k === "⌫") setAmt(active, Number(cur.slice(0, -1)) || 0);
    else if (k === "C") setAmt(active, 0);
    else setAmt(active, Number((cur + k).slice(0, 10)) || 0);
    setFresh(false);
  };
  /** Qatordagi "+" — qolgan summani shu turga yozadi */
  const fill = (m: PayMethod) => {
    const others = Object.entries(amounts).filter(([k]) => k !== m).reduce((x, [, v]) => x + (v || 0), 0);
    setAmt(m, Math.max(0, total - others));
    setActive(m);
    setFresh(true);
  };
  const pick = (m: PayMethod) => { setActive(m); setFresh(true); };

  const finish = async () => {
    const list = Object.entries(amounts).filter(([, v]) => v > 0).map(([method, amount]) => ({ method: method as PayMethod, amount }));
    setBusy(true);
    try {
      const r = await call<{ change: number; printError: string }>("order:pay", order.id, check.id, list, hasDebt ? debtor : undefined);
      onDone(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const quick = [Math.ceil(total / 10000) * 10000, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000, Math.ceil(total / 100000) * 100000 + 100000]
    .filter((v, i, a) => v > total && a.indexOf(v) === i)
    .slice(0, 3);

  return (
    <Modal title={`To‘lov — ${check.name} · №${order.no}`} onClose={onClose} width={900}>
      <div className="pay2">
        <div>
          <div className="pay-top">
            <div><small>Jami</small><b>{num(total)} UZS</b></div>
            <div className={`need ${change > 0 ? "change" : rest > 0 ? "lack" : ""}`}>
              <small>{change > 0 ? "Qaytim" : rest > 0 ? "To‘lash kerak" : "To‘liq"}</small>
              <b>{num(change > 0 ? change : rest)} UZS</b>
            </div>
          </div>
          <div className="mrows">
            {METHODS.map((x) => (
              <div key={x.m} role="button" className={`mrow ${active === x.m ? "on" : ""}`} onClick={() => pick(x.m)}>
                <span className="ic"><Icon name={x.icon} size={20} /></span>
                <b>{x.label}</b>
                <span className={`amt ${amounts[x.m] ? "" : "zero"}`}>{num(amounts[x.m] || 0)}</span>
                <button className="plus" onClick={(e) => { e.stopPropagation(); fill(x.m); }} title="Qolganini shu turga"><Icon name="plus" size={20} /></button>
              </div>
            ))}
            <div role="button" className={`mrow qarz ${active === "qarz" ? "on" : ""}`} onClick={() => pick("qarz")}>
              <span className="ic"><Icon name="note" size={20} /></span>
              <b>Qarzga yozish</b>
              <span className={`amt ${amounts.qarz ? "" : "zero"}`}>{num(amounts.qarz || 0)}</span>
              <button className="plus" onClick={(e) => { e.stopPropagation(); fill("qarz"); }}><Icon name="plus" size={20} /></button>
            </div>
          </div>
          {hasDebt && (
            <div className="debtor">
              <input className="input" placeholder="Mijoz ismi" value={debtor.name} onChange={(e) => setDebtor({ ...debtor, name: e.target.value })} />
              <input className="input" placeholder="Telefon" value={debtor.phone} onChange={(e) => setDebtor({ ...debtor, phone: e.target.value })} />
              <input className="input full" placeholder="Qarzga yozish sababi (ixtiyoriy)" value={debtor.reason} onChange={(e) => setDebtor({ ...debtor, reason: e.target.value })} />
            </div>
          )}
          {err && <div className="form-err">{err}</div>}
        </div>
        <div className="pay-right">
          <div className="pay-display"><span>{METHODS.find((x) => x.m === active)?.label ?? "Qarz"}</span><b>{num(amounts[active] || 0)}</b></div>
          {active === "naqd" && quick.length > 0 && (
            <div className="chips" style={{ margin: 0 }}>
              {quick.map((v) => <button key={v} onClick={() => { setAmt("naqd", v - Object.entries(amounts).filter(([k]) => k !== "naqd").reduce((x, [, y]) => x + (y || 0), 0)); setFresh(true); }}>{num(v)}</button>)}
            </div>
          )}
          <Keypad onKey={press} extra="C" />
          <button className="btn success big" onClick={finish} disabled={busy || sum < total}>
            <Icon name="check" size={22} /> {busy ? "Saqlanmoqda…" : "To‘lash"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function MoveDialog({ ctx, order, onClose }: { ctx: Ctx; order: Order; onClose: () => void }) {
  const { s, go } = ctx;
  const toast = useToast();
  const [hall, setHall] = useState(order.hallId ?? s.settings.halls[0]?.id);
  const h = s.settings.halls.find((x) => x.id === hall);
  const busy = new Set(s.orders.filter((o) => o.status === "open" && o.type === "zal" && o.hallId === hall).map((o) => o.table));
  const move = async (t: number) => {
    try {
      const id = await call<string>("order:moveTable", order.id, hall, t);
      toast(busy.has(t) ? `${t}-stol bilan birlashtirildi` : `${t}-stolga ko‘chirildi`);
      onClose();
      if (id !== order.id) go({ name: "order", orderId: id, back: "tables" });
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };
  return (
    <Modal title="Stolni ko‘chirish yoki birlashtirish" onClose={onClose} width={720}>
      <div className="seg">
        {s.settings.halls.map((x) => <button key={x.id} className={x.id === hall ? "on" : ""} onClick={() => setHall(x.id)}>{x.name}</button>)}
      </div>
      <div className="mini-tables">
        {h && Array.from({ length: h.tables }, (_, i) => i + 1).map((t) => {
          const self = order.hallId === hall && order.table === t;
          return (
            <button key={t} disabled={self} className={`mini ${busy.has(t) ? "busy" : ""} ${self ? "self" : ""}`} onClick={() => move(t)}>
              {t}
              <small>{self ? "Shu stol" : busy.has(t) ? "Birlashtirish" : "Bo‘sh"}</small>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function CancelDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const reasons = ["Mijoz ketib qoldi", "Xato kiritildi", "Mijoz voz kechdi", "Taom tugagan"];
  return (
    <Modal
      title={`Buyurtmani bekor qilish — №${order.no}`}
      onClose={onClose}
      width={480}
      footer={
        <>
          <button className="btn ghost" onClick={onClose}>Yo‘q</button>
          <button className="btn danger" onClick={() => call("order:cancel", order.id, reason).then(() => { toast("Buyurtma bekor qilindi"); onClose(); }).catch((e) => toast(e.message, "err"))}>
            Ha, bekor qilish
          </button>
        </>
      }
    >
      <p className="muted">Sababini tanlang yoki yozing — hisobotda ko‘rinadi.</p>
      <div className="chips">{reasons.map((r) => <button key={r} className={reason === r ? "on" : ""} onClick={() => setReason(r)}>{r}</button>)}</div>
      <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Sabab…" />
    </Modal>
  );
}

function DiscountDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const toast = useToast();
  const [d, setD] = useState(order.discount);
  const [sv, setSv] = useState(order.serviceRate);
  const save = () =>
    Promise.all([call("order:discount", order.id, d), call("order:service", order.id, sv)])
      .then(() => { toast("Saqlandi"); onClose(); })
      .catch((e) => toast(e.message, "err"));
  return (
    <Modal title="Chegirma va xizmat haqi" onClose={onClose} width={480} footer={<button className="btn primary" onClick={save}>Saqlash</button>}>
      <label className="lbl">Chegirma</label>
      <div className="chips">{[0, 5, 10, 15, 20, 30].map((v) => <button key={v} className={d === v ? "on" : ""} onClick={() => setD(v)}>{v}%</button>)}</div>
      <input className="input" type="number" min={0} max={100} value={d} onChange={(e) => setD(Number(e.target.value))} />
      <label className="lbl">Xizmat haqi</label>
      <div className="chips">{[0, 5, 10, 12, 15].map((v) => <button key={v} className={sv === v ? "on" : ""} onClick={() => setSv(v)}>{v}%</button>)}</div>
    </Modal>
  );
}

function CustomerDialog({ order, onClose }: { order: Order; onClose: () => void }) {
  const [c, setC] = useState(order.customer);
  const [note, setNote] = useState(order.note ?? "");
  const [field, setField] = useState<"phone" | "other">(order.type === "zal" ? "other" : "phone");
  const toast = useToast();
  const press = (k: string) => {
    if (k === "⌫") setC((x) => ({ ...x, phone: x.phone.slice(0, -1) }));
    else if (k === "C") setC((x) => ({ ...x, phone: "" }));
    else setC((x) => ({ ...x, phone: (x.phone || "+998 ") + k }));
  };
  const save = () =>
    Promise.all([order.type !== "zal" ? call("order:customer", order.id, c) : null, call("order:note", order.id, note)])
      .then(onClose)
      .catch((e) => toast(e.message, "err"));
  const title = order.type === "yetkaz" ? "Buyurtma yaratish — yetkazib berish" : order.type === "olib" ? "Olib ketish — mijoz" : "Buyurtmaga izoh";
  return (
    <Modal title={title} onClose={onClose} width={order.type === "zal" ? 480 : 820} footer={<button className="btn primary big" onClick={save}>Saqlash</button>}>
      <div className={order.type === "zal" ? "" : "form-keypad"}>
        <div>
          {order.type !== "zal" && (
            <>
              <label className="lbl">Telefon raqami</label>
              <input className={`input ${field === "phone" ? "focus" : ""}`} value={c.phone} onFocus={() => setField("phone")} onChange={(e) => setC({ ...c, phone: e.target.value })} placeholder="+998 __ ___ __ __" />
              <label className="lbl">Mijoz ismi</label>
              <input className="input" value={c.name} onFocus={() => setField("other")} onChange={(e) => setC({ ...c, name: e.target.value })} />
              {order.type === "yetkaz" && (
                <>
                  <label className="lbl">Manzil</label>
                  <input className="input" value={c.address} onFocus={() => setField("other")} onChange={(e) => setC({ ...c, address: e.target.value })} placeholder="Manzilni kiriting" />
                </>
              )}
            </>
          )}
          <label className="lbl">Izoh</label>
          <input className="input" value={note} onFocus={() => setField("other")} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: 2-qavatga, tezroq" />
        </div>
        {order.type !== "zal" && <Keypad onKey={press} />}
      </div>
    </Modal>
  );
}

function NoteDialog({ line, onClose, onSave }: { line: Line; onClose: () => void; onSave: (n: string) => void }) {
  const [n, setN] = useState(line.note);
  const quick = ["Achchiq", "Achchiqsiz", "Piyozsiz", "Tezroq", "Olib ketishga", "Kamroq tuz"];
  return (
    <Modal title={`Izoh — ${line.name}`} onClose={onClose} width={480} footer={<button className="btn primary" onClick={() => onSave(n)}>Saqlash</button>}>
      <div className="chips">{quick.map((x) => <button key={x} onClick={() => setN(n ? `${n}, ${x}` : x)}>{x}</button>)}</div>
      <input className="input" autoFocus value={n} onChange={(e) => setN(e.target.value)} placeholder="Oshpazga izoh…" />
    </Modal>
  );
}
