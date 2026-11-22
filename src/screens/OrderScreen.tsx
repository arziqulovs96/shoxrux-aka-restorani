import { useEffect, useMemo, useRef, useState } from "react";
import { call } from "../api";
import type { Ctx } from "../App";
import emblem from "../assets/emblem.svg";
import { checkTotals, menu, num, orderTotals } from "../shared/logic";
import type { Check, Line, Order, PayMethod, Payment, Product } from "../shared/types";
import { Icon, Keypad, METHOD, Modal, elapsed, useClock, useToast } from "../ui";

type Dialog = null | "pay" | "move" | "cancel" | "discount" | "customer" | { note: Line } | { moveLine: Line } | { preview: string };

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
        else toast(r.printed ? `Oshxonaga yuborildi va chop etildi (${r.count})` : `Oshxonaga yuborildi (${r.count} ta)`);
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
          {order.type !== "zal" && (
            <button className="chip-btn" onClick={() => setDlg("customer")}>
              <Icon name="user" size={16} /> {order.customer.phone || order.customer.name || "Mijoz"}
            </button>
          )}
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

        <div className="ticket-actions">
          <button className={`act ${unsent ? "hot" : ""}`} onClick={kitchen}><Icon name="chef" /> Oshxonaga</button>
          <button className="act" onClick={bill} disabled={!check.lines.length}><Icon name="printer" /> Hisob</button>
          {canCash && <button className="act" onClick={() => setDlg("discount")}><Icon name="percent" /> Chegirma</button>}
          {order.type === "zal" && <button className="act" onClick={() => setDlg("move")}><Icon name="swap" /> Ko‘chirish</button>}
          <button className="act danger" onClick={() => setDlg("cancel")}><Icon name="trash" /> Bekor</button>
        </div>
        <button className="pay-btn" disabled={!check.lines.length || !canCash} onClick={() => setDlg("pay")}>
          <Icon name="wallet" size={24} />
          {canCash ? <>To‘lov · {num(t.total)} so‘m</> : "To‘lovni kassir qabul qiladi"}
        </button>
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
      {dlg && typeof dlg === "object" && "note" in dlg && (
        <NoteDialog line={dlg.note} onClose={() => setDlg(null)} onSave={(n) => { run(call("order:note", order.id, check.id, dlg.note.id, n)); setDlg(null); }} />
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

function PayDialog({ order, check, onClose, onDone }: { order: Order; check: Check; onClose: () => void; onDone: (r: { change: number; printError: string }) => void }) {
  const total = checkTotals(order, check).total;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [method, setMethod] = useState<PayMethod>("naqd");
  const [input, setInput] = useState(String(total));
  const [fresh, setFresh] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const paid = payments.reduce((x, p) => x + p.amount, 0);
  const amount = Number(input) || 0;
  const sum = paid + amount;
  const rest = Math.max(0, total - sum);
  const change = Math.max(0, sum - total);

  const press = (k: string) => {
    setErr("");
    if (k === "⌫") { setInput((v) => (fresh ? "" : v.slice(0, -1))); setFresh(false); return; }
    if (k === "00") { setInput((v) => (fresh ? "" : v) + "00"); setFresh(false); return; }
    setInput((v) => ((fresh ? "" : v) + k).replace(/^0+(?=\d)/, "").slice(0, 10));
    setFresh(false);
  };

  const pick = (m: PayMethod) => {
    setMethod(m);
    setInput(String(Math.max(0, total - paid)));
    setFresh(true);
  };

  const split = () => {
    if (!amount) return;
    setPayments((p) => [...p, { method, amount }]);
    setInput(String(Math.max(0, total - paid - amount)));
    setFresh(true);
    setMethod(method === "naqd" ? "karta" : "naqd");
  };

  const finish = async () => {
    const list = amount ? [...payments, { method, amount }] : payments;
    setBusy(true);
    try {
      const r = await call<{ change: number; printError: string }>("order:pay", order.id, check.id, list);
      onDone(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const quick = [total, Math.ceil(total / 50000) * 50000, Math.ceil(total / 100000) * 100000, Math.ceil(total / 100000) * 100000 + 100000]
    .filter((v, i, a) => v >= total && a.indexOf(v) === i)
    .slice(0, 4);

  return (
    <Modal title={`To‘lov — ${check.name}`} onClose={onClose} width={860}>
      <div className="pay">
        <div className="pay-left">
          <div className="pay-total">
            <small>To‘lanishi kerak</small>
            <b>{num(total)} <span>so‘m</span></b>
          </div>
          <div className="methods">
            {(["naqd", "karta", "click", "payme"] as PayMethod[]).map((m) => (
              <button key={m} className={`method ${m} ${method === m ? "on" : ""}`} onClick={() => pick(m)}>
                <Icon name={m === "naqd" ? "cash" : "wallet"} size={22} />
                {METHOD[m]}
              </button>
            ))}
          </div>
          {payments.length > 0 && (
            <div className="pay-list">
              {payments.map((p, i) => (
                <div key={i}>
                  <span>{METHOD[p.method]}</span>
                  <b>{num(p.amount)}</b>
                  <button className="icon-btn ghost sm" onClick={() => setPayments((x) => x.filter((_, j) => j !== i))}><Icon name="x" size={14} /></button>
                </div>
              ))}
            </div>
          )}
          <div className="pay-sum">
            <div><span>{METHOD[method]} summasi</span><b className="pay-input">{num(amount)}</b></div>
            {rest > 0 && <div className="rest"><span>Yetishmaydi</span><b>{num(rest)}</b></div>}
            {change > 0 && <div className="change"><span>Qaytim</span><b>{num(change)}</b></div>}
          </div>
          {method === "naqd" && (
            <div className="quick">
              {quick.map((v) => <button key={v} onClick={() => { setInput(String(Math.max(0, v - paid))); setFresh(true); }}>{num(v)}</button>)}
            </div>
          )}
          {err && <div className="form-err">{err}</div>}
        </div>
        <div className="pay-right">
          <Keypad onKey={press} extra="00" />
          <div className="pay-buttons">
            <button className="btn ghost" onClick={split} disabled={!amount || sum >= total}>
              <Icon name="split" size={18} /> Aralash to‘lov
            </button>
            <button className="btn primary big" onClick={finish} disabled={busy || sum < total || (method !== "naqd" && change > 0 && !payments.length)}>
              <Icon name="check" size={22} /> {busy ? "Saqlanmoqda…" : "To‘lovni yakunlash"}
            </button>
          </div>
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
  const toast = useToast();
  return (
    <Modal
      title="Mijoz ma'lumotlari"
      onClose={onClose}
      width={480}
      footer={<button className="btn primary" onClick={() => call("order:customer", order.id, c).then(onClose).catch((e) => toast(e.message, "err"))}>Saqlash</button>}
    >
      <label className="lbl">Ismi</label>
      <input className="input" value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
      <label className="lbl">Telefon</label>
      <input className="input" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} placeholder="+998 __ ___ __ __" />
      {order.type === "yetkaz" && (
        <>
          <label className="lbl">Manzil</label>
          <textarea className="input" rows={2} value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} />
        </>
      )}
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
