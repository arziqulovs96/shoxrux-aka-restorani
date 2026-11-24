// Kirish ekrani: to‘liq ekranli fon, restoran nomi, "Kirish" tugmasi → xodim va PIN
import { useEffect, useState } from "react";
import { call } from "../api";
import davra from "../assets/davra.jpg";
import emblem from "../assets/emblem.svg";
import salatlar from "../assets/salatlar.jpg";
import zal from "../assets/zal.jpg";
import type { Actor } from "../shared/logic";
import type { PublicState } from "../shared/types";
import { Icon, Keypad, ROLE, hhmm, longDate, useClock } from "../ui";

const PHOTOS: Record<string, string> = { zal, davra, salatlar };
const COLORS = ["#1f2a3a", "#0f3b2e", "#7a1020", "#1b3c78"];
const GRADS = ["#ff512f,#dd2476", "#f7971e,#d1311a", "#2b5876,#4e4376", "#11998e,#38ef7d", "#4568dc,#b06ab3", "#141e30,#243b55"];

export function bgStyle(v: string): React.CSSProperties {
  if (v.startsWith("photo:")) return { backgroundImage: `url(${PHOTOS[v.slice(6)] ?? zal})` };
  if (v.startsWith("color:")) return { background: v.slice(6) };
  if (v.startsWith("grad:")) return { background: `linear-gradient(135deg, ${v.slice(5)})` };
  if (v) return { backgroundImage: `url("${v}")` };
  return { backgroundImage: `url(${zal})` };
}

export function Login({ s, onLogin }: { s: PublicState; onLogin: (a: Actor) => void }) {
  const now = useClock(5000);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<null | "bg" | "power">(null);
  const [sel, setSel] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const staff = s.staff.filter((x) => x.active);
  const recent = s.recent.map((id) => staff.find((x) => x.id === id)).filter(Boolean) as typeof staff;
  const groups = [
    { t: "Yaqinda", list: recent },
    { t: "Kassirlar", list: staff.filter((x) => x.role === "kassir") },
    { t: "Ofitsiantlar", list: staff.filter((x) => x.role === "ofitsiant") },
    { t: "Administratorlar", list: staff.filter((x) => x.role === "admin") },
  ].filter((g) => g.list.length);
  const person = staff.find((x) => x.id === sel) ?? null;

  // Bitta xodim bo‘lsa yoki yaqinda kirgan bo‘lsa — avtomatik tanlanadi
  useEffect(() => {
    if (open && !sel) setSel(recent[0]?.id ?? staff[0]?.id ?? null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (p = pin) => {
    if (!sel || p.length !== 4 || busy) return;
    setBusy(true);
    call<Actor>("auth:login", sel, p)
      .then(onLogin)
      .catch((e) => { setErr(e.message); setPin(""); })
      .finally(() => setBusy(false));
  };

  useEffect(() => { if (pin.length === 4) submit(pin); }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  const press = (k: string) => {
    setErr("");
    if (k === "⌫") setPin((p) => p.slice(0, -1));
    else if (k === "C") setPin("");
    else setPin((p) => (p.length < 4 ? p + k : p));
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!open) { if (e.key === "Enter" || e.key === " ") setOpen(true); return; }
      if (/^\d$/.test(e.key)) press(e.key);
      if (e.key === "Backspace") press("⌫");
      if (e.key === "Escape") { setOpen(false); setPin(""); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const bg = s.settings.startBackground;
  const power = (what: "quit" | "shutdown" | "restart") => call("power", what);

  return (
    <div className="start" style={bgStyle(bg)}>
      <div className="start-shade" />
      <div className="start-top">
        <button className="icon-btn" title="Fonni o‘zgartirish" onClick={() => setPanel(panel === "bg" ? null : "bg")}><Icon name="image" /></button>
        <button className="icon-btn" title="O‘chirish" onClick={() => setPanel(panel === "power" ? null : "power")}><Icon name="power" /></button>
      </div>
      {panel === "bg" && (
        <div className="bg-panel">
          <b>Fonni o‘zgartirish</b>
          <h4>Rasmlar</h4>
          <div className="bg-grid">
            {Object.keys(PHOTOS).map((k) => (
              <button key={k} className={bg === `photo:${k}` ? "on" : ""} style={{ backgroundImage: `url(${PHOTOS[k]})` }} onClick={() => call("bg:set", `photo:${k}`)} />
            ))}
          </div>
          <h4>Ranglar</h4>
          <div className="bg-grid">
            {GRADS.map((g) => <button key={g} className={bg === `grad:${g}` ? "on" : ""} style={{ background: `linear-gradient(135deg, ${g})` }} onClick={() => call("bg:set", `grad:${g}`)} />)}
            {COLORS.map((c) => <button key={c} className={bg === `color:${c}` ? "on" : ""} style={{ background: c }} onClick={() => call("bg:set", `color:${c}`)} />)}
          </div>
          <button className="btn" onClick={() => call("bg:pick")}><Icon name="folder" size={18} /> O‘z rasmingizni tanlash</button>
        </div>
      )}
      {panel === "power" && (
        <div className="power-panel">
          <button className="btn blue" onClick={() => power("quit")}>Dasturni yopish</button>
          <button className="btn danger" onClick={() => power("restart")}>Kompyuterni qayta yoqish</button>
          <button className="btn danger" onClick={() => power("shutdown")}>Kompyuterni o‘chirish</button>
        </div>
      )}

      <div className="start-center" onClick={() => setPanel(null)}>
        <img src={emblem} alt="" />
        <h1>{s.settings.restaurantName}</h1>
        <button className="kirish" onClick={() => setOpen(true)}>Kirish</button>
      </div>

      <div className="start-foot">
        <div className="sup">
          <b>Do‘stlik Kassa</b> · versiya {s.appVersion}<br />
          Texnik yordam: Sardor Arziqulov · +998 77 079 49 04
        </div>
        <div className="start-clock">
          <b>{hhmm(now)}</b>
          <span>{longDate(now)}</span>
        </div>
      </div>

      {open && (
        <div className="login-layer" onMouseDown={(e) => { if (e.target === e.currentTarget) { setOpen(false); setPin(""); } }}>
          <div className="people">
            {groups.map((g) => (
              <div key={g.t}>
                <h4>{g.t}</h4>
                {g.list.map((p) => (
                  <button key={g.t + p.id} className={`person ${sel === p.id ? "on" : ""}`} onClick={() => { setSel(p.id); setPin(""); setErr(""); }} style={{ marginBottom: 8, width: "100%" }}>
                    <span className={`avatar ${p.role}`}>{p.name.slice(0, 1).toUpperCase()}</span>
                    <span>{p.name}<small>{ROLE[p.role]}</small></span>
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className="pin-card">
            <button className="icon-btn ghost sm x" onClick={() => { setOpen(false); setPin(""); }}><Icon name="x" size={18} /></button>
            {person ? (
              <>
                <span className={`avatar lg ${person.role}`}>{person.name.slice(0, 1).toUpperCase()}</span>
                <h3>{person.name}</h3>
              </>
            ) : <h3>Xodimni tanlang</h3>}
            <div className={`pin-dots ${err ? "shake" : ""}`}>
              {[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? "on" : ""} />)}
            </div>
            <div className={`pin-err ${err ? "bad" : ""}`}>{busy ? "Tekshirilmoqda…" : err || "PIN kodni kiriting"}</div>
            <Keypad onKey={press} />
            <button className="btn primary big" disabled={!person || pin.length !== 4} onClick={() => submit()}>Kirish</button>
          </div>
        </div>
      )}
    </div>
  );
}
