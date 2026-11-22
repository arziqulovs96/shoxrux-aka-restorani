import { call } from "../api";
import emblem from "../assets/emblem.svg";
import type { UpdateState } from "../shared/types";
import { Icon, Modal } from "../ui";

const mb = (b = 0) => (b / 1048576).toFixed(1);

export function UpdateDialog({ u, onClose }: { u: UpdateState; onClose: () => void }) {
  const pct = Math.max(0, Math.min(100, u.percent ?? 0));
  const downloading = u.phase === "available" || u.phase === "downloading";
  const eta = u.speed && u.total && u.transferred ? Math.ceil((u.total - u.transferred) / u.speed) : null;

  return (
    <Modal title="Dastur yangilanishi" onClose={onClose} width={560}>
      <div className="upd">
        <div className={`upd-logo ${downloading ? "pulse" : ""}`}><img src={emblem} alt="" /></div>

        {u.phase === "checking" && <><h2>Tekshirilmoqda…</h2><p className="muted">Yangi versiya bor-yo‘qligi tekshirilmoqda</p></>}
        {(u.phase === "none" || u.phase === "idle") && (
          <>
            <h2>Eng so‘nggi versiya o‘rnatilgan</h2>
            <p className="muted">{u.error ?? "Yangilanish chiqsa, shu oyna o‘zi ochiladi."}</p>
            <button className="btn primary" onClick={() => call("update:check")}><Icon name="sync" size={18} /> Qayta tekshirish</button>
          </>
        )}
        {u.phase === "error" && (
          <>
            <h2>Yangilab bo‘lmadi</h2>
            <p className="muted">{u.error}</p>
            <button className="btn primary" onClick={() => call("update:check")}><Icon name="sync" size={18} /> Qayta urinish</button>
          </>
        )}
        {downloading && (
          <>
            <h2>Yangi versiya yuklanmoqda — v{u.version}</h2>
            <div className="progress"><i style={{ width: `${pct}%` }} /></div>
            <div className="progress-info">
              <b>{pct.toFixed(0)}%</b>
              <span>{mb(u.transferred)} / {mb(u.total)} MB</span>
              <span>{u.speed ? `${mb(u.speed)} MB/s` : "boshlanmoqda…"}</span>
              {eta !== null && <span>~{eta > 60 ? `${Math.ceil(eta / 60)} daq` : `${eta} son`} qoldi</span>}
            </div>
            <p className="muted small">Ishlashda davom etavering — yuklab bo‘lingach o‘rnatishni so‘raymiz.</p>
          </>
        )}
        {u.phase === "ready" && (
          <>
            <h2>v{u.version} tayyor!</h2>
            <div className="progress done"><i style={{ width: "100%" }} /></div>
            <p className="muted">O‘rnatish uchun dastur 10–20 soniyaga yopilib, o‘zi qayta ochiladi. Barcha buyurtmalar saqlanib qoladi.</p>
            <div className="row-gap center">
              <button className="btn ghost" onClick={onClose}>Keyinroq (yopilganda o‘rnatiladi)</button>
              <button className="btn primary big" onClick={() => call("update:install")}><Icon name="download" size={20} /> Hozir o‘rnatish</button>
            </div>
          </>
        )}
        {u.notes && (u.phase === "ready" || downloading) && (
          <div className="notes"><b>Nimalar yangi:</b><pre>{u.notes}</pre></div>
        )}
      </div>
    </Modal>
  );
}
