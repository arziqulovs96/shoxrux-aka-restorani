import { useEffect, useState } from "react";
import { call } from "../api";
import emblem from "../assets/emblem.svg";
import zal from "../assets/zal.jpg";
import type { Actor } from "../shared/logic";
import type { PublicState } from "../shared/types";
import { Icon, Keypad, ROLE, hhmm, longDate, useClock } from "../ui";

export function Login({ s, onLogin }: { s: PublicState; onLogin: (a: Actor) => void }) {
  const now = useClock(5000);
  const [sel, setSel] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const staff = s.staff.filter((x) => x.active);
  const person = staff.find((x) => x.id === sel);
  const groups = (["kassir", "ofitsiant", "admin"] as const)
    .map((r) => ({ r, list: staff.filter((x) => x.role === r) }))
    .filter((g) => g.list.length);

  useEffect(() => {
    if (pin.length !== 4 || !sel) return;
    setBusy(true);
    call<Actor>("auth:login", sel, pin)
      .then(onLogin)
      .catch((e) => { setErr(e.message); setPin(""); })
      .finally(() => setBusy(false));
  }, [pin, sel, onLogin]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!sel) return;
      if (/^\d$/.test(e.key)) press(e.key);
      if (e.key === "Backspace") press("⌫");
      if (e.key === "Escape") { setSel(null); setPin(""); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const press = (k: string) => {
    setErr("");
    if (k === "⌫") setPin((p) => p.slice(0, -1));
    else if (k === "C") setPin("");
    else setPin((p) => (p.length < 4 ? p + k : p));
  };

  return (
    <div className="login" style={{ backgroundImage: `url(${zal})` }}>
      <div className="login-shade" />
      <div className="login-left">
        <div className="login-brand">
          <img src={emblem} alt="" />
          <div>
            <h1>Do‘stlik</h1>
            <p>oilaviy restorani · kassa</p>
          </div>
        </div>
        <div className="login-time">
          <div className="big-clock">{hhmm(now)}</div>
          <div className="date">{longDate(now)}</div>
        </div>
        <div className="login-foot">V57 · Sardor Arziqulov · versiya {s.appVersion}</div>
      </div>

      <div className="login-card">
        {!person ? (
          <>
            <h2>Kim ishlaydi?</h2>
            <p className="muted">Ismingizni tanlang</p>
            <div className="staff-groups">
              {groups.map((g) => (
                <div key={g.r}>
                  <div className="group-label">{ROLE[g.r]}lar</div>
                  <div className="staff-grid">
                    {g.list.map((p) => (
                      <button key={p.id} className={`staff ${p.role}`} onClick={() => { setSel(p.id); setPin(""); setErr(""); }}>
                        <span className="avatar lg">{p.name.slice(0, 1).toUpperCase()}</span>
                        <b>{p.name}</b>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="pin-box">
            <button className="link-btn" onClick={() => { setSel(null); setPin(""); }}><Icon name="back" size={18} /> Orqaga</button>
            <span className="avatar xl">{person.name.slice(0, 1).toUpperCase()}</span>
            <h2>{person.name}</h2>
            <span className={`role-chip ${person.role}`}>{ROLE[person.role]}</span>
            <div className={`pin-dots ${err ? "shake" : ""}`}>
              {[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? "on" : ""} />)}
            </div>
            <div className="pin-err">{busy ? "Tekshirilmoqda…" : err || "PIN kodni kiriting"}</div>
            <Keypad onKey={press} />
          </div>
        )}
      </div>
    </div>
  );
}
