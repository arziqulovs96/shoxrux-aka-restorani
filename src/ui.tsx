// Kichik umumiy komponentlar: ikonlar, modal, toast, PIN klaviatura
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const P: Record<string, string> = {
  table: "M3 10h18M5 10v9M19 10v9M7 6h10l2 4H5l2-4Z",
  bag: "M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2",
  bike: "M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm14 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12 18l-3-7h5l3 4M14 7h3l2 4",
  lock: "M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5V11Z",
  sync: "M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3M20 4v4h-4M4 20v-4h4",
  search: "m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  x: "M6 6l12 12M18 6 6 18",
  back: "M15 18l-6-6 6-6",
  chef: "M7 14h10v6H7v-6Zm-1-1a4 4 0 0 1 2.5-7.5 4 4 0 0 1 7 0A4 4 0 0 1 18 13",
  printer: "M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7v-7Z",
  wallet: "M3 7h15a3 3 0 0 1 3 3v8H3V7Zm0 0 12-4v4M16 13h2",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  ban: "M5.6 5.6l12.8 12.8M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  cash: "M3 6h18v12H3V6Zm9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  zoom: "M11 8v6M8 11h6m7 10-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z",
  download: "M12 3v12m0 0-4-4m4 4 4-4M4 21h16",
  logout: "M15 4h4v16h-4M10 17l5-5-5-5M15 12H3",
  swap: "M7 7h13l-3-3M17 17H4l3 3",
  split: "M12 3v18M5 8h4M5 12h4M15 12h4M15 16h4",
  note: "M4 4h16v12l-4 4H4V4Zm12 16v-4h4",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  check: "M5 12l5 5L20 7",
  wifi: "M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M2 9a15 15 0 0 1 20 0",
  wifiOff: "M3 3l18 18M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M5 12.5a10 10 0 0 1 5-2.7M2 9a15 15 0 0 1 4.6-2.9",
  percent: "M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm11 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  backspace: "M21 5H8l-6 7 6 7h13V5Zm-9 4 6 6m0-6-6 6",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
  image: "M4 5h16v14H4V5Zm0 11 4-4 4 4 3-3 5 5M15 9h.01",
  fullscreen: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  power: "M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0",
  folder: "M3 6h6l2 2h10v11H3V6Z",
};

export function Icon({ name, size = 20, stroke = 2, className }: { name: keyof typeof P | string; size?: number; stroke?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={P[name] ?? ""} />
    </svg>
  );
}

export function Modal({ title, onClose, children, width = 520, footer }: { title: ReactNode; onClose?: () => void; children: ReactNode; width?: number; footer?: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ width }}>
        <div className="modal-head">
          <h3>{title}</h3>
          {onClose && <button className="icon-btn ghost" onClick={onClose} aria-label="Yopish"><Icon name="x" /></button>}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

type ToastKind = "ok" | "err" | "info";
const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [list, setList] = useState<{ id: number; msg: string; kind: ToastKind }[]>([]);
  const push = useCallback((msg: string, kind: ToastKind = "ok") => {
    const id = Date.now() + Math.random();
    setList((l) => [...l.slice(-3), { id, msg, kind }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), kind === "err" ? 4500 : 2500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">
        {list.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <Icon name={t.kind === "err" ? "x" : t.kind === "ok" ? "check" : "note"} size={18} />
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Raqamli klaviatura (PIN, summa) */
export function Keypad({ onKey, extra }: { onKey: (k: string) => void; extra?: string }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", extra ?? "C", "0", "⌫"];
  return (
    <div className="keypad">
      {keys.map((k) => (
        <button key={k} className={`key ${k === "⌫" || k === "C" ? "muted" : ""}`} onClick={() => onKey(k)}>
          {k === "⌫" ? <Icon name="backspace" size={24} /> : k}
        </button>
      ))}
    </div>
  );
}

export function useClock(ms = 15_000) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export const hhmm = (d: Date | string) => {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
};

export const elapsed = (iso: string, now: Date) => {
  const m = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m} daq` : `${Math.floor(m / 60)} soat ${m % 60} daq`;
};

const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
const DAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
export const longDate = (d: Date) => `${DAYS[d.getDay()]}, ${d.getDate()}-${MONTHS[d.getMonth()]}`;

export const ROLE: Record<string, string> = { admin: "Admin", kassir: "Kassir", ofitsiant: "Ofitsiant" };
export const METHOD: Record<string, string> = { naqd: "Naqd", karta: "Karta", click: "Click", payme: "Payme" };
