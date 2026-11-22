import { useEffect, useMemo, useState } from "react";
import { call } from "../api";
import type { Ctx } from "../App";
import emblem from "../assets/emblem.svg";
import { menu, num, uid } from "../shared/logic";
import type { Hall, PrinterInfo, Product, Role, Settings as S, UpdateState } from "../shared/types";
import { Icon, Modal, ROLE, hhmm, useToast } from "../ui";

const TABS = [
  { id: "general", label: "Umumiy", icon: "gear" },
  { id: "halls", label: "Zallar va stollar", icon: "table" },
  { id: "staff", label: "Xodimlar", icon: "user" },
  { id: "products", label: "Mahsulotlar", icon: "list" },
  { id: "printers", label: "Printerlar", icon: "printer" },
  { id: "update", label: "Yangilanish", icon: "download" },
] as const;

export function Settings({ ctx, upd, onUpdate }: { ctx: Ctx; upd: UpdateState; onUpdate: () => void }) {
  const [tab, setTab] = useState<string>("general");
  return (
    <div className="settings">
      <aside className="side">
        {TABS.map((t) => (
          <button key={t.id} className={`side-btn ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={19} /> {t.label}
          </button>
        ))}
      </aside>
      <div className="settings-body">
        {tab === "general" && <General ctx={ctx} />}
        {tab === "halls" && <Halls ctx={ctx} />}
        {tab === "staff" && <StaffTab ctx={ctx} />}
        {tab === "products" && <Products ctx={ctx} />}
        {tab === "printers" && <Printers ctx={ctx} />}
        {tab === "update" && <UpdateTab ctx={ctx} upd={upd} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}

function useSave() {
  const toast = useToast();
  return (patch: Partial<S>, msg = "Saqlandi") => call("settings:save", patch).then(() => toast(msg)).catch((e) => toast(e.message, "err"));
}

function General({ ctx }: { ctx: Ctx }) {
  const st = ctx.s.settings;
  const save = useSave();
  const [f, setF] = useState({ restaurantName: st.restaurantName, address: st.address, phone: st.phone, receiptFooter: st.receiptFooter, serviceRate: st.serviceRate, serviceOnTakeaway: st.serviceOnTakeaway, apiUrl: st.apiUrl });
  return (
    <div className="card form">
      <h2>Umumiy sozlamalar</h2>
      <div className="grid2">
        <label><span className="lbl">Restoran nomi (chekda)</span><input className="input" value={f.restaurantName} onChange={(e) => setF({ ...f, restaurantName: e.target.value })} /></label>
        <label><span className="lbl">Telefon (chekda)</span><input className="input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
        <label className="full"><span className="lbl">Manzil (chekda)</span><input className="input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></label>
        <label className="full"><span className="lbl">Chek ostidagi yozuv</span><input className="input" value={f.receiptFooter} onChange={(e) => setF({ ...f, receiptFooter: e.target.value })} /></label>
        <label><span className="lbl">Xizmat haqi, %</span><input className="input" type="number" min={0} max={50} value={f.serviceRate} onChange={(e) => setF({ ...f, serviceRate: Number(e.target.value) })} /></label>
        <label className="check-row"><input type="checkbox" checked={f.serviceOnTakeaway} onChange={(e) => setF({ ...f, serviceOnTakeaway: e.target.checked })} /> Olib ketish va yetkazishda ham xizmat haqi olinsin</label>
        <label className="full"><span className="lbl">Sayt manzili (menyu shu yerdan olinadi)</span><input className="input" value={f.apiUrl} onChange={(e) => setF({ ...f, apiUrl: e.target.value })} /></label>
      </div>
      <p className="muted small">Taom va narxlar sayt admin panelidan keladi (har 5 daqiqada yangilanadi). Saytda yo‘q mahsulotlarni “Mahsulotlar” bo‘limidan qo‘shing.</p>
      <div className="form-foot"><button className="btn primary" onClick={() => save(f)}>Saqlash</button></div>
    </div>
  );
}

function Halls({ ctx }: { ctx: Ctx }) {
  const save = useSave();
  const [halls, setHalls] = useState<Hall[]>(ctx.s.settings.halls);
  const busy = new Set(ctx.s.orders.filter((o) => o.status === "open" && o.type === "zal").map((o) => o.hallId));
  const upd = (i: number, p: Partial<Hall>) => setHalls(halls.map((h, j) => (j === i ? { ...h, ...p } : h)));
  const move = (i: number, d: number) => {
    const a = [...halls];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    setHalls(a);
  };
  return (
    <div className="card form">
      <h2>Zallar va stollar</h2>
      <div className="hall-list">
        {halls.map((h, i) => (
          <div key={h.id} className="hall-row">
            <div className="updown">
              <button onClick={() => move(i, -1)}>▲</button>
              <button onClick={() => move(i, 1)}>▼</button>
            </div>
            <input className="input" value={h.name} onChange={(e) => upd(i, { name: e.target.value })} />
            <div className="stepper">
              <button onClick={() => upd(i, { tables: Math.max(1, h.tables - 1) })}>−</button>
              <b>{h.tables}</b>
              <button onClick={() => upd(i, { tables: Math.min(100, h.tables + 1) })}>+</button>
              <span className="muted">stol</span>
            </div>
            <button className="icon-btn ghost" disabled={busy.has(h.id)} title={busy.has(h.id) ? "Ochiq stol bor" : "O‘chirish"} onClick={() => setHalls(halls.filter((_, j) => j !== i))}><Icon name="trash" size={18} /></button>
          </div>
        ))}
      </div>
      <button className="btn ghost" onClick={() => setHalls([...halls, { id: uid(), name: `Zal ${halls.length + 1}`, tables: 6 }])}><Icon name="plus" size={18} /> Zal qo‘shish</button>
      <div className="form-foot"><button className="btn primary" onClick={() => save({ halls: halls.filter((h) => h.name.trim()) })}>Saqlash</button></div>
    </div>
  );
}

function StaffTab({ ctx }: { ctx: Ctx }) {
  const toast = useToast();
  const [edit, setEdit] = useState<{ id?: string; name: string; role: Role; pin: string; active: boolean } | null>(null);
  const save = () =>
    edit && call("staff:save", edit).then(() => { toast("Saqlandi"); setEdit(null); }).catch((e) => toast(e.message, "err"));
  const del = (id: string) => call("staff:delete", id).then(() => { toast("O‘chirildi"); setEdit(null); }).catch((e) => toast(e.message, "err"));
  return (
    <div className="card form">
      <div className="row-between">
        <h2>Xodimlar</h2>
        <button className="btn primary" onClick={() => setEdit({ name: "", role: "ofitsiant", pin: "", active: true })}><Icon name="plus" size={18} /> Xodim qo‘shish</button>
      </div>
      <p className="muted small">Ofitsiant — buyurtma oladi. Kassir — to‘lov, chegirma, kirim/chiqim, hisobot. Admin — hammasi va sozlamalar.</p>
      <div className="staff-list">
        {ctx.s.staff.map((p) => (
          <button key={p.id} className={`staff-row ${p.active ? "" : "off"}`} onClick={() => setEdit({ id: p.id, name: p.name, role: p.role, pin: "", active: p.active })}>
            <span className="avatar">{p.name.slice(0, 1).toUpperCase()}</span>
            <b>{p.name}</b>
            <span className={`role-chip ${p.role}`}>{ROLE[p.role]}</span>
            {!p.active && <span className="muted">o‘chirilgan</span>}
          </button>
        ))}
      </div>
      {edit && (
        <Modal
          title={edit.id ? "Xodimni tahrirlash" : "Yangi xodim"}
          onClose={() => setEdit(null)}
          width={460}
          footer={
            <>
              {edit.id && <button className="btn danger" onClick={() => del(edit.id!)}>O‘chirish</button>}
              <span className="grow" />
              <button className="btn primary" onClick={save}>Saqlash</button>
            </>
          }
        >
          <label className="lbl">Ismi</label>
          <input className="input" autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
          <label className="lbl">Lavozimi</label>
          <div className="seg">
            {(["ofitsiant", "kassir", "admin"] as Role[]).map((r) => <button key={r} className={edit.role === r ? "on" : ""} onClick={() => setEdit({ ...edit, role: r })}>{ROLE[r]}</button>)}
          </div>
          <label className="lbl">{edit.id ? "Yangi PIN (o‘zgartirmasangiz bo‘sh qoldiring)" : "PIN kod (4 raqam)"}</label>
          <input className="input pin-input" inputMode="numeric" maxLength={4} value={edit.pin} onChange={(e) => setEdit({ ...edit, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="••••" />
          {edit.id && (
            <label className="check-row"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Faol (kirish ekranida ko‘rinadi)</label>
          )}
        </Modal>
      )}
    </div>
  );
}

function Products({ ctx }: { ctx: Ctx }) {
  const { s } = ctx;
  const toast = useToast();
  const { categories, products } = useMemo(() => menu(s), [s.site, s.local, s.priceOverrides]);
  const [edit, setEdit] = useState<(Partial<Product> & { categoryId: string; name: string; price: number }) | null>(null);
  const [price, setPrice] = useState<{ p: Product; v: string } | null>(null);
  const [cat, setCat] = useState<{ id?: string; name: string } | null>(null);
  const [q, setQ] = useState("");
  const run = (p: Promise<unknown>, ok: string, after?: () => void) => p.then(() => { toast(ok); after?.(); }).catch((e) => toast(e.message, "err"));
  const pick = () => call<string | null>("image:pick").then((img) => img && edit && setEdit({ ...edit, image: img }));

  return (
    <div className="card form">
      <div className="row-between">
        <h2>Mahsulotlar</h2>
        <div className="row-gap">
          <button className="btn ghost" onClick={() => setCat({ name: "" })}><Icon name="folder" size={18} /> Bo‘lim qo‘shish</button>
          <button className="btn primary" onClick={() => setEdit({ categoryId: categories[0]?.id ?? "", name: "", price: 0, image: null, unit: "" })} disabled={!categories.length}><Icon name="plus" size={18} /> Mahsulot qo‘shish</button>
        </div>
      </div>
      <p className="muted small">
        <span className="src site">Sayt</span> belgili taomlar sayt admin panelidan keladi — ularni o‘sha yerda tahrirlang (bu yerda faqat kassa narxini alohida qo‘yish mumkin).{" "}
        <span className="src local">Kassa</span> belgililar faqat kassada (masalan, ichimliklar, non).
      </p>
      <div className="search sm"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Qidirish" /></div>
      {categories.map((c) => {
        const list = products.filter((p) => p.categoryId === c.id && (!q || p.name.toLowerCase().includes(q.toLowerCase())));
        if (q && !list.length) return null;
        return (
          <section key={c.id} className="prod-sec">
            <h3>
              {c.name} <span className={`src ${c.source}`}>{c.source === "site" ? "Sayt" : "Kassa"}</span>
              {c.source === "local" && (
                <>
                  <button className="icon-btn ghost sm" onClick={() => setCat({ id: c.id, name: c.name })}><Icon name="note" size={15} /></button>
                  <button className="icon-btn ghost sm" onClick={() => run(call("local:deleteCategory", c.id), "Bo‘lim o‘chirildi")}><Icon name="trash" size={15} /></button>
                </>
              )}
            </h3>
            {list.map((p) => (
              <div key={p.id} className="prod-row">
                <img src={p.image || emblem} alt="" className={p.image ? "" : "ph"} />
                <b>{p.name}</b>
                <span className="grow" />
                {s.priceOverrides[p.id] && <span className="muted small">kassa narxi</span>}
                <b className="price">{num(p.price)}</b>
                {p.source === "local" ? (
                  <button className="btn sm ghost" onClick={() => setEdit({ ...p })}>Tahrirlash</button>
                ) : (
                  <button className="btn sm ghost" onClick={() => setPrice({ p, v: String(s.priceOverrides[p.id] ?? "") })}>Kassa narxi</button>
                )}
              </div>
            ))}
            {!list.length && <p className="muted small">Bo‘sh</p>}
          </section>
        );
      })}

      {cat && (
        <Modal title={cat.id ? "Bo‘lim nomi" : "Yangi bo‘lim (faqat kassada)"} onClose={() => setCat(null)} width={420}
          footer={<button className="btn primary" onClick={() => run(call("local:saveCategory", cat), "Saqlandi", () => setCat(null))}>Saqlash</button>}>
          <input className="input" autoFocus value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} placeholder="Masalan: Ichimliklar" />
        </Modal>
      )}
      {price && (
        <Modal title={`Kassa narxi — ${price.p.name}`} onClose={() => setPrice(null)} width={420}
          footer={
            <>
              <button className="btn ghost" onClick={() => run(call("price:override", price.p.id, null), "Sayt narxiga qaytarildi", () => setPrice(null))}>Sayt narxi</button>
              <button className="btn primary" onClick={() => run(call("price:override", price.p.id, Number(price.v)), "Saqlandi", () => setPrice(null))}>Saqlash</button>
            </>
          }>
          <p className="muted small">Bo‘sh qoldirsangiz yoki “Sayt narxi”ni bossangiz, saytdagi narx ishlatiladi.</p>
          <input className="input" type="number" autoFocus value={price.v} onChange={(e) => setPrice({ ...price, v: e.target.value })} />
        </Modal>
      )}
      {edit && (
        <Modal title={edit.id ? "Mahsulotni tahrirlash" : "Yangi mahsulot"} onClose={() => setEdit(null)} width={520}
          footer={
            <>
              {edit.id && <button className="btn danger" onClick={() => run(call("local:deleteProduct", edit.id), "O‘chirildi", () => setEdit(null))}>O‘chirish</button>}
              <span className="grow" />
              <button className="btn primary" onClick={() => run(call("local:saveProduct", edit), "Saqlandi", () => setEdit(null))}>Saqlash</button>
            </>
          }>
          <div className="prod-edit">
            <button className="img-pick" onClick={pick}>
              {edit.image ? <img src={edit.image} alt="" /> : <><Icon name="image" size={30} /><span>Rasm tanlash</span></>}
            </button>
            <div className="grow">
              <label className="lbl">Nomi</label>
              <input className="input" autoFocus value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Masalan: Coca-Cola 1 l" />
              <div className="grid2">
                <label><span className="lbl">Narxi (so‘m)</span><input className="input" type="number" value={edit.price || ""} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></label>
                <label><span className="lbl">Birligi</span><input className="input" value={edit.unit ?? ""} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} placeholder="dona, kg, porsiya" /></label>
              </div>
              <label className="lbl">Bo‘lim</label>
              <select className="input" value={edit.categoryId} onChange={(e) => setEdit({ ...edit, categoryId: e.target.value })}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Printers({ ctx }: { ctx: Ctx }) {
  const st = ctx.s.settings;
  const save = useSave();
  const toast = useToast();
  const [list, setList] = useState<PrinterInfo[] | null>(null);
  const load = () => call<PrinterInfo[]>("printers:list").then(setList).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  const test = (w: "receipt" | "kitchen") => call("print:test", w).then(() => toast("Sinov cheki yuborildi")).catch((e) => toast(e.message, "err"));
  const Sel = ({ value, field }: { value: string; field: "receiptPrinter" | "kitchenPrinter" }) => (
    <select className="input" value={value} onChange={(e) => save({ [field]: e.target.value })}>
      <option value="">— Tanlanmagan —</option>
      {list?.map((p) => <option key={p.name} value={p.name}>{p.displayName}{p.isDefault ? " (asosiy)" : ""}</option>)}
      {value && list && !list.some((p) => p.name === value) && <option value={value}>{value} (topilmadi)</option>}
    </select>
  );
  return (
    <div className="card form">
      <div className="row-between">
        <h2>Printerlar</h2>
        <button className="btn ghost" onClick={load}><Icon name="sync" size={18} /> Qayta qidirish</button>
      </div>
      <p className="muted small">Chek printerini kompyuterga ulab, Windows’da drayverini o‘rnating — keyin shu ro‘yxatda chiqadi. {list && !list.length && "Hozircha printer topilmadi."}</p>
      <div className="printer-box">
        <div className="printer-head"><Icon name="printer" /> <b>Mijoz cheki printeri</b></div>
        <Sel value={st.receiptPrinter} field="receiptPrinter" />
        <label className="check-row"><input type="checkbox" checked={st.printOnPay} onChange={(e) => save({ printOnPay: e.target.checked })} /> To‘lovdan keyin chek avtomatik chiqsin</label>
        <button className="btn sm" onClick={() => test("receipt")} disabled={!st.receiptPrinter}>Sinov cheki</button>
      </div>
      <div className="printer-box">
        <div className="printer-head"><Icon name="chef" /> <b>Oshxona printeri</b></div>
        <Sel value={st.kitchenPrinter} field="kitchenPrinter" />
        <label className="check-row"><input type="checkbox" checked={st.printKitchen} onChange={(e) => save({ printKitchen: e.target.checked })} /> “Oshxonaga” bosilganda oshxona cheki chiqsin</label>
        <button className="btn sm" onClick={() => test("kitchen")} disabled={!st.kitchenPrinter}>Sinov cheki</button>
      </div>
      <label className="lbl">Qog‘oz kengligi</label>
      <div className="seg">
        {([80, 58] as const).map((w) => <button key={w} className={st.paperWidth === w ? "on" : ""} onClick={() => save({ paperWidth: w })}>{w} mm</button>)}
      </div>
    </div>
  );
}

function UpdateTab({ ctx, upd, onUpdate }: { ctx: Ctx; upd: UpdateState; onUpdate: () => void }) {
  const PH: Record<string, string> = {
    idle: "Tekshirilmagan", checking: "Tekshirilmoqda…", available: `Yangi versiya: ${upd.version}`, downloading: `Yuklanmoqda: ${Math.floor(upd.percent ?? 0)}%`,
    ready: `v${upd.version} tayyor — o‘rnatish mumkin`, none: "Eng so‘nggi versiya o‘rnatilgan", error: "Xatolik",
  };
  return (
    <div className="card form">
      <h2>Yangilanish va ma'lumotlar</h2>
      <div className="ver-box">
        <img src={emblem} alt="" />
        <div>
          <b>Do‘stlik Kassa v{ctx.s.appVersion}</b>
          <span className="muted">{PH[upd.phase]}{upd.error ? ` — ${upd.error}` : ""}</span>
        </div>
        <span className="grow" />
        <button className="btn primary" onClick={() => { call("update:check"); onUpdate(); }}><Icon name="sync" size={18} /> Yangilanishni tekshirish</button>
      </div>
      <p className="muted small">Dastur har 30 daqiqada o‘zi tekshiradi. Yangi versiya chiqsa, oyna ochilib yuklanish foizi ko‘rinadi.</p>
      <h3>Ma'lumotlar</h3>
      <p className="muted small">Barcha buyurtmalar shu kompyuterda saqlanadi, har kuni zaxira nusxa olinadi (oxirgi 30 kun). Menyu oxirgi marta: {ctx.s.site.syncedAt ? hhmm(ctx.s.site.syncedAt) : "—"}.</p>
      <div className="row-gap">
        <button className="btn ghost" onClick={() => call("app:openData")}><Icon name="folder" size={18} /> Ma'lumotlar papkasini ochish</button>
        <button className="btn ghost danger" onClick={() => call("app:quit")}><Icon name="power" size={18} /> Dasturdan chiqish</button>
      </div>
    </div>
  );
}
