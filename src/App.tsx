import { useCallback, useEffect, useRef, useState } from "react";
import { call, onState, onUpdate } from "./api";
import emblem from "./assets/emblem.svg";
import { openOrders, type Actor } from "./shared/logic";
import type { PublicState, UpdateState } from "./shared/types";
import { Icon, Modal, ROLE, hhmm, useClock, useToast } from "./ui";
import { Login } from "./screens/Login";
import { Tables } from "./screens/Tables";
import { OrderScreen } from "./screens/OrderScreen";
import { OrdersList } from "./screens/OrdersList";
import { Reports } from "./screens/Reports";
import { History } from "./screens/History";
import { Stoplist } from "./screens/Stoplist";
import { Cash } from "./screens/Cash";
import { Debts } from "./screens/Debts";
import { Settings } from "./screens/Settings";
import { UpdateDialog } from "./screens/UpdateDialog";

export type View =
  | { name: "tables" }
  | { name: "order"; orderId: string; back: "tables" | "olib" | "yetkaz" }
  | { name: "olib" }
  | { name: "yetkaz" }
  | { name: "reports" }
  | { name: "history" }
  | { name: "stoplist" }
  | { name: "cash" }
  | { name: "debts" }
  | { name: "settings" };

export interface Ctx {
  s: PublicState;
  me: Actor;
  go: (v: View) => void;
}

export function App() {
  const [s, setS] = useState<PublicState | null>(null);
  const [me, setMe] = useState<Actor | null>(null);
  const [view, setView] = useState<View>({ name: "tables" });
  const [upd, setUpd] = useState<UpdateState>({ phase: "idle" });
  const [updOpen, setUpdOpen] = useState(false);
  const toast = useToast();
  const shownFor = useRef("");

  useEffect(() => {
    call<PublicState>("state:get").then(setS);
    call<UpdateState>("update:state").then(setUpd);
    const a = onState(setS);
    const b = onUpdate((u) => {
      setUpd(u);
      // Yangi versiya topilishi (va tayyor bo‘lishi) bilan oyna avtomatik ochiladi — har bosqichda bir marta
      const key = `${u.version}:${u.phase === "ready" ? "ready" : "dl"}`;
      if ((u.phase === "available" || u.phase === "downloading" || u.phase === "ready") && shownFor.current !== key) {
        shownFor.current = key;
        setUpdOpen(true);
      }
    });
    return () => { a(); b(); };
  }, []);

  const lock = useCallback(async () => {
    await call("auth:logout");
    setMe(null);
    setView({ name: "tables" });
  }, []);

  // 10 daqiqa harakatsiz qolsa — avtomatik qulflanadi
  const idle = useRef(Date.now());
  useEffect(() => {
    const bump = () => { idle.current = Date.now(); };
    window.addEventListener("pointerdown", bump);
    window.addEventListener("keydown", bump);
    const t = setInterval(() => { if (me && Date.now() - idle.current > 10 * 60_000) lock(); }, 30_000);
    return () => { window.removeEventListener("pointerdown", bump); window.removeEventListener("keydown", bump); clearInterval(t); };
  }, [me, lock]);

  if (!s) return <div className="splash"><img src={emblem} alt="" /></div>;

  const updateBadge = upd.phase === "available" || upd.phase === "downloading" || upd.phase === "ready";

  if (!me) {
    return (
      <>
        <Login s={s} onLogin={(a) => { setMe(a); setView({ name: "tables" }); toast(`Xush kelibsiz, ${a.name}!`); }} />
        {updOpen && <UpdateDialog u={upd} onClose={() => setUpdOpen(false)} />}
      </>
    );
  }

  const ctx: Ctx = { s, me, go: setView };
  const open = openOrders(s);
  const counts = {
    zal: open.filter((o) => o.type === "zal").length,
    olib: open.filter((o) => o.type === "olib").length,
    yetkaz: open.filter((o) => o.type === "yetkaz").length,
  };
  const tab = view.name === "order" ? view.back : view.name;

  return (
    <div className="app">
      <TopBar
        ctx={ctx}
        tab={tab}
        counts={counts}
        onLock={lock}
        updateBadge={updateBadge}
        upd={upd}
        onUpdate={() => setUpdOpen(true)}
      />
      <main className="main">
        {view.name === "tables" && <Tables ctx={ctx} />}
        {view.name === "order" && <OrderScreen key={view.orderId} ctx={ctx} orderId={view.orderId} back={view.back} />}
        {(view.name === "olib" || view.name === "yetkaz") && <OrdersList key={view.name} ctx={ctx} type={view.name} />}
        {view.name === "reports" && <Reports ctx={ctx} />}
        {view.name === "history" && <History ctx={ctx} />}
        {view.name === "stoplist" && <Stoplist ctx={ctx} />}
        {view.name === "cash" && <Cash ctx={ctx} />}
        {view.name === "debts" && <Debts ctx={ctx} />}
        {view.name === "settings" && <Settings ctx={ctx} upd={upd} onUpdate={() => setUpdOpen(true)} />}
      </main>
      <StatusBar s={s} />
      {updOpen && <UpdateDialog u={upd} onClose={() => setUpdOpen(false)} />}
    </div>
  );
}

function TopBar({ ctx, tab, counts, onLock, updateBadge, upd, onUpdate }: {
  ctx: Ctx; tab: string; counts: Record<string, number>; onLock: () => void; updateBadge: boolean; upd: UpdateState; onUpdate: () => void;
}) {
  const { me, go, s } = ctx;
  const now = useClock();
  const [menuOpen, setMenuOpen] = useState(false);
  const toast = useToast();
  const [spin, setSpin] = useState(false);

  const sync = async () => {
    setSpin(true);
    await call("menu:sync");
    setSpin(false);
    toast("Menyu yangilandi");
  };

  const debtCount = s.debts.filter((x) => !x.paidAt).length;
  const [help, setHelp] = useState(false);

  const tabs = [
    { id: "tables", label: "Zal", icon: "table", n: counts.zal },
    { id: "olib", label: "Olib ketish", icon: "bag", n: counts.olib },
    { id: "yetkaz", label: "Yetkazish", icon: "bike", n: counts.yetkaz },
  ] as const;

  const items: { icon: string; label: string; act: () => void; roles?: string[] }[] = [
    { icon: "chart", label: "Hisobotlar", act: () => go({ name: "reports" }), roles: ["admin", "kassir"] },
    { icon: "history", label: "Buyurtmalar tarixi", act: () => go({ name: "history" }) },
    { icon: "ban", label: "Stop-list", act: () => go({ name: "stoplist" }), roles: ["admin", "kassir"] },
    { icon: "cash", label: "Kirim / Chiqim", act: () => go({ name: "cash" }), roles: ["admin", "kassir"] },
    { icon: "wallet", label: `Qarzlar${debtCount ? ` (${debtCount})` : ""}`, act: () => go({ name: "debts" }), roles: ["admin", "kassir"] },
    ...(s.settings.siteSync ? [{ icon: "sync", label: "Sinxronlash (menyu)", act: sync }] : []),
    { icon: "gear", label: "Sozlamalar", act: () => go({ name: "settings" }), roles: ["admin"] },
    { icon: "fullscreen", label: "To‘liq ekran (F11)", act: () => call("app:fullscreen") },
  ];

  return (
    <header className="topbar">
      <div className="brand" onClick={() => go({ name: "tables" })}>
        <img src={emblem} alt="" />
        <div>
          <b>Do‘stlik</b>
          <span>{ROLE[me.role]}</span>
        </div>
      </div>
      <nav className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => go({ name: t.id } as View)}>
            <Icon name={t.icon} size={22} />
            {t.label}
            {t.n > 0 && <i className="count">{t.n}</i>}
          </button>
        ))}
      </nav>
      <div className="top-right">
        {updateBadge && (
          <button className="upd-pill" onClick={onUpdate}>
            <Icon name="download" size={16} />
            {upd.phase === "downloading" ? `${Math.floor(upd.percent ?? 0)}%` : upd.phase === "ready" ? "O‘rnatish" : "Yangilanish"}
          </button>
        )}
        <div className="clock">{hhmm(now)}</div>
        {s.settings.siteSync && <button className="icon-btn" onClick={sync} title="Menyuni yangilash"><Icon name="sync" className={spin ? "spin" : ""} /></button>}
        <button className="icon-btn" onClick={onLock} title="Qulflash"><Icon name="lock" /></button>
        <div className="me-wrap">
          <button className="me" onClick={() => setMenuOpen((v) => !v)}>
            <span className={`avatar ${me.role}`}>{me.name.slice(0, 1).toUpperCase()}</span>
            <span className="me-txt"><b>{me.name}</b><small>{ROLE[me.role]}</small></span>
          </button>
          {menuOpen && (
            <>
              <div className="menu-bg" onClick={() => setMenuOpen(false)} />
              <div className="menu">
                <div className="menu-who">
                  <span className={`avatar lg ${me.role}`}>{me.name.slice(0, 1).toUpperCase()}</span>
                  <b>{me.name}</b>
                  <span className={`role-chip ${me.role}`}>{ROLE[me.role]}</span>
                </div>
                <div className="menu-zoom">
                  <span><Icon name="zoom" size={18} /> Masshtab</span>
                  <div>
                    <button onClick={() => call("zoom:set", s.settings.zoom - 5)}>−</button>
                    <b>{s.settings.zoom}%</b>
                    <button onClick={() => call("zoom:set", s.settings.zoom + 5)}>+</button>
                  </div>
                </div>
                {items.filter((i) => !i.roles || i.roles.includes(me.role)).map((i) => (
                  <button key={i.label} onClick={() => { setMenuOpen(false); i.act(); }}>
                    <Icon name={i.icon} size={19} /> {i.label}
                  </button>
                ))}
                <button onClick={() => { setMenuOpen(false); setHelp(true); }}>
                  <Icon name="user" size={19} /> Texnik yordam
                </button>
                <button onClick={() => { setMenuOpen(false); onUpdate(); }}>
                  <Icon name="download" size={19} /> Yangilanish
                  {updateBadge && <i className="dot" />}
                </button>
                <button className="danger" onClick={() => { setMenuOpen(false); onLock(); }}>
                  <Icon name="logout" size={19} /> Chiqish
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      {help && (
        <Modal title="Texnik yordam" onClose={() => setHelp(false)} width={440}>
          <div className="upd">
            <div className="upd-logo"><img src={emblem} alt="" /></div>
            <h2>Sardor Arziqulov</h2>
            <p className="muted">Dastur muallifi. Muammo yoki taklif bo‘lsa yozing:</p>
            <div className="rrow" style={{ width: "100%" }}><span>Telefon</span><b>+998 77 079 49 04</b></div>
            <div className="rrow" style={{ width: "100%" }}><span>Telegram</span><b>@Arzikhulov_4904</b></div>
            <div className="rrow" style={{ width: "100%" }}><span>Versiya</span><b>{s.appVersion}</b></div>
          </div>
        </Modal>
      )}
    </header>
  );
}

function StatusBar({ s }: { s: PublicState }) {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const a = () => setOnline(true), b = () => setOnline(false);
    window.addEventListener("online", a);
    window.addEventListener("offline", b);
    return () => { window.removeEventListener("online", a); window.removeEventListener("offline", b); };
  }, []);
  return (
    <footer className="statusbar">
      <span className={`net ${online ? "on" : "off"}`}><Icon name={online ? "wifi" : "wifiOff"} size={14} /> {online ? "Onlayn" : "Oflayn — ish davom etadi"}</span>
      <span>{!s.settings.siteSync ? "Menyu: kassada" : s.site.syncedAt ? `Menyu (sayt): ${hhmm(s.site.syncedAt)}` : "Menyu hali yuklanmagan"}{s.settings.siteSync && s.site.error ? ` · ${s.site.error}` : ""}</span>
      <span className="grow" />
      <span>Printer: {s.settings.receiptPrinter || "tanlanmagan"}</span>
      <span>Versiya {s.appVersion}</span>
      <span className="sig">V57 · Sardor Arziqulov</span>
    </footer>
  );
}
