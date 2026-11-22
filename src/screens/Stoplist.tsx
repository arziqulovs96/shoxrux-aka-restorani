import { useMemo, useState } from "react";
import { call } from "../api";
import type { Ctx } from "../App";
import emblem from "../assets/emblem.svg";
import { menu, num } from "../shared/logic";
import { Icon, useToast } from "../ui";

export function Stoplist({ ctx }: { ctx: Ctx }) {
  const { s } = ctx;
  const toast = useToast();
  const [q, setQ] = useState("");
  const { categories, products } = useMemo(() => menu(s), [s.site, s.local, s.priceOverrides]);
  const stop = new Set(s.stoplist);
  const toggle = (id: string, name: string) =>
    call("stop:toggle", id).then(() => toast(stop.has(id) ? `${name} — yana sotuvda` : `${name} — stop-listga qo‘shildi`)).catch((e) => toast(e.message, "err"));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Stop-list</h1>
        <p className="muted">Tugagan taomni bosing — kassada sotilmaydi. Yana bosilsa qaytadi.</p>
        <span className="grow" />
        <div className="search sm"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish" /></div>
      </div>
      {s.stoplist.length > 0 && <div className="stop-summary"><Icon name="ban" size={18} /> Stop-listda: {s.stoplist.length} ta taom</div>}
      {categories.map((c) => {
        const list = products.filter((p) => p.categoryId === c.id && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
        if (!list.length) return null;
        return (
          <section key={c.id} className="stop-sec">
            <h3>{c.name}</h3>
            <div className="stop-grid">
              {list.map((p) => (
                <button key={p.id} className={`stop-item ${stop.has(p.id) ? "on" : ""}`} onClick={() => toggle(p.id, p.name)}>
                  <img src={p.image || emblem} alt="" className={p.image ? "" : "ph"} />
                  <span><b>{p.name}</b><small>{num(p.price)} so‘m</small></span>
                  <i className="switch" />
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
