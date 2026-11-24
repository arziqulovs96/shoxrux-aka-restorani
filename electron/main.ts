// Do'stlik Kassa — asosiy jarayon
import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from "electron";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as L from "../src/shared/logic";
import { kitchenHtml, receiptHtml, reportHtml, testHtml } from "../src/shared/receipt";
import type { Data, PublicState, Settings, Staff } from "../src/shared/types";
import { listPrinters, printHtml } from "./printer";
import * as store from "./store";
import { check as checkUpdate, initUpdater, install as installUpdate, updateState } from "./updater";

let win: BrowserWindow | null = null;
let actor: L.Actor | null = null;

protocol.registerSchemesAsPrivileged([{ scheme: "kassa-img", privileges: { standard: true, secure: true, supportFetchAPI: true } }]);

// Sinov uchun: boshqa ma'lumotlar papkasi
if (process.env.KASSA_DATA_DIR) app.setPath("userData", process.env.KASSA_DATA_DIR);

if (!app.requestSingleInstanceLock()) app.quit();
app.on("second-instance", () => {
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});

const imagesDir = () => path.join(app.getPath("userData"), "rasmlar");

function publicState(): PublicState {
  const d = store.get();
  return { ...d, staff: d.staff.map(({ pin: _pin, ...s }) => s), appVersion: app.getVersion() };
}

function broadcast() {
  win?.webContents.send("state", publicState());
}

/** O‘zgartiruvchi amal: bajariladi, saqlanadi va oynaga yuboriladi */
function mutate<T>(fn: (d: Data) => T): T {
  const r = fn(store.get());
  store.save();
  broadcast();
  return r;
}

function need(roles?: Staff["role"][]): L.Actor {
  if (!actor) throw new L.KassaError("Avval tizimga kiring");
  if (roles && !roles.includes(actor.role)) throw new L.KassaError("Bu amal uchun ruxsatingiz yo‘q");
  return actor;
}

type Handler = (...args: never[]) => unknown;
function handle(name: string, fn: Handler) {
  ipcMain.handle(name, async (_e, ...args) => {
    try {
      return { ok: true, value: await (fn as (...a: unknown[]) => unknown)(...args) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!(e instanceof L.KassaError)) console.error(name, e);
      return { ok: false, error: msg };
    }
  });
}

// ───────── Menyu sinxronlash (sayt admin panelidan) ─────────
let syncing = false;
async function syncMenu() {
  if (syncing) return;
  const d = store.get();
  if (!d.settings.siteSync) return; // menyu faqat kassada
  syncing = true;
  const base = d.settings.apiUrl.replace(/\/+$/, "");
  try {
    const get = async (p: string) => {
      const r = await net.fetch(`${base}${p}`, { headers: { accept: "application/json" } });
      if (!r.ok) throw new Error(`Server javobi: ${r.status}`);
      return r.json();
    };
    const [cats, items] = await Promise.all([get("/public/categories"), get("/public/menu")]);
    const m = L.fromSite(cats, items);
    mutate((x) => { x.site = { ...m, syncedAt: new Date().toISOString(), error: null }; });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    mutate((x) => { x.site.error = /fetch|net::|ENOTFOUND/i.test(msg) ? "Internet yo‘q — oxirgi saqlangan menyu ishlatilmoqda" : msg; });
  } finally {
    syncing = false;
  }
}

// ───────── Chop etish ─────────
async function printOrPreview(html: string, printer: string) {
  const d = store.get();
  if (!printer) return { printed: false, html };
  await printHtml(html, printer, d.settings.paperWidth);
  return { printed: true, html };
}

function registerIpc() {
  handle("state:get", () => publicState());

  handle("auth:login", (staffId: string, pin: string) => {
    const s = store.get().staff.find((x) => x.id === staffId && x.active);
    if (!s || s.pin !== String(pin)) throw new L.KassaError("PIN kod noto‘g‘ri");
    actor = { id: s.id, name: s.name, role: s.role };
    mutate((d) => L.remember(d, s.id));
    return actor;
  });
  handle("auth:logout", () => { actor = null; });

  handle("order:open", (a: Parameters<typeof L.openOrder>[1]) => mutate((d) => L.openOrder(d, a, need())).id);
  handle("order:add", (o: string, c: string, p: string) => mutate((d) => L.addLine(d, o, c, p)));
  handle("order:qty", (o: string, c: string, l: string, delta: number) => mutate((d) => L.changeQty(d, o, c, l, delta, need())));
  handle("order:lineNote", (o: string, c: string, l: string, note: string) => mutate((d) => L.setNote(d, o, c, l, note)));
  handle("order:addCheck", (o: string) => mutate((d) => L.addCheck(d, o)).id);
  handle("order:removeCheck", (o: string, c: string) => mutate((d) => L.removeCheck(d, o, c)));
  handle("order:moveLine", (o: string, f: string, t: string, l: string) => mutate((d) => L.moveLine(d, o, f, t, l)));
  handle("order:discount", (o: string, v: number) => mutate((d) => L.setDiscount(d, o, v, need())));
  handle("order:service", (o: string, v: number) => mutate((d) => L.setService(d, o, v, need())));
  handle("order:customer", (o: string, c: Partial<Data["orders"][0]["customer"]>) => mutate((d) => L.setCustomer(d, o, c)));
  handle("order:moveTable", (o: string, h: string, t: number) => mutate((d) => L.moveTable(d, o, h, t)).id);
  handle("order:cancel", (o: string, reason: string) => mutate((d) => L.cancelOrder(d, o, reason, need())));
  handle("order:waiter", (o: string, staffId: string) => {
    const by = need();
    const st = store.get().staff.find((x) => x.id === staffId && x.active);
    if (!st) throw new L.KassaError("Xodim topilmadi");
    mutate((d) => L.setWaiter(d, o, { id: st.id, name: st.name }, by));
  });
  handle("order:type", (o: string, t: "olib" | "yetkaz") => { need(); mutate((d) => L.setType(d, o, t)); });
  handle("order:note", (o: string, n: string) => { need(); mutate((d) => L.setOrderNote(d, o, n)); });
  handle("debt:pay", (id: string, method: Parameters<typeof L.payDebt>[2]) => {
    const by = need(["admin", "kassir"]);
    mutate((d) => L.payDebt(d, id, method, by));
  });
  handle("order:dropIfEmpty", (o: string) => mutate((d) => L.dropIfEmpty(d, o)));

  handle("order:kitchen", async (orderId: string) => {
    need();
    const { order, items } = mutate((d) => L.sendKitchen(d, orderId));
    const d = store.get();
    const groups: { station: L.Station; printer: string; label: string }[] = [
      { station: "shashlik", printer: d.settings.shashlikPrinter, label: "SHASHLIKXONA" },
      { station: "kitchen", printer: d.settings.printKitchen ? d.settings.kitchenPrinter : "", label: "OSHXONA" },
    ];
    const printed: string[] = [];
    const errors: string[] = [];
    for (const g of groups) {
      const list = items.filter((i) => i.station === g.station);
      if (!list.length || !g.printer) continue;
      try {
        await printHtml(kitchenHtml(d, order, list, g.label), g.printer, d.settings.paperWidth);
        printed.push(g.label.toLowerCase());
      } catch (e) {
        errors.push(`${g.label}: ${e instanceof Error ? e.message : e}`);
      }
    }
    return { count: items.length, printed, errors };
  });

  handle("order:pay", async (orderId: string, checkId: string, payments: Parameters<typeof L.pay>[3], debtor?: L.Debtor) => {
    const by = need(["admin", "kassir"]);
    const r = mutate((d) => L.pay(d, orderId, checkId, payments, by, debtor));
    const d = store.get();
    let printed = false;
    let printError = "";
    if (d.settings.printOnPay && d.settings.receiptPrinter) {
      try {
        await printHtml(receiptHtml(d, r.order, [r.check], true, r.change), d.settings.receiptPrinter, d.settings.paperWidth);
        printed = true;
      } catch (e) {
        printError = e instanceof Error ? e.message : String(e);
      }
    }
    return { change: r.change, closed: r.order.status === "paid", printed, printError };
  });

  handle("print:bill", async (orderId: string, checkId: string | null, final: boolean) => {
    need();
    const d = store.get();
    const o = d.orders.find((x) => x.id === orderId);
    if (!o) throw new L.KassaError("Buyurtma topilmadi");
    const checks = checkId ? o.checks.filter((c) => c.id === checkId) : o.checks.filter((c) => c.lines.length);
    return printOrPreview(receiptHtml(d, o, checks, final), d.settings.receiptPrinter);
  });
  handle("print:html", async (html: string, which: "receipt" | "kitchen") => {
    const d = store.get();
    const p = which === "kitchen" ? d.settings.kitchenPrinter : d.settings.receiptPrinter;
    if (!p) {
      // Printer tanlanmagan — Windows chop etish oynasi ochiladi
      const w = new BrowserWindow({ show: false });
      await w.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
      await new Promise<void>((res) => w.webContents.print({ silent: false, printBackground: true }, () => res()));
      w.destroy();
      return { printed: true };
    }
    await printHtml(html, p, d.settings.paperWidth);
    return { printed: true };
  });
  handle("print:test", async (which: "receipt" | "kitchen" | "shashlik") => {
    const d = store.get();
    const p = which === "kitchen" ? d.settings.kitchenPrinter : which === "shashlik" ? d.settings.shashlikPrinter : d.settings.receiptPrinter;
    if (!p) throw new L.KassaError("Avval printerni tanlang");
    await printHtml(testHtml(d), p, d.settings.paperWidth);
  });
  handle("print:report", (from: string, to: string, title: string) => {
    need(["admin", "kassir"]);
    const d = store.get();
    const html = reportHtml(d, L.report(d, new Date(from), new Date(to)), title);
    return printOrPreview(html, d.settings.receiptPrinter);
  });
  handle("printers:list", () => (win ? listPrinters(win) : []));

  handle("data:clear", () => {
    need(["admin"]);
    mutate((d) => L.clearData(d));
  });
  handle("stop:toggle", (productId: string) => { need(["admin", "kassir"]); mutate((d) => L.toggleStop(d, productId)); });
  handle("cash:add", (e: { type: "kirim" | "chiqim"; amount: number; note: string }) => {
    const by = need(["admin", "kassir"]);
    mutate((d) => L.addCash(d, { ...e, staffName: by.name }));
  });

  // ── Sozlamalar (faqat admin) ──
  handle("settings:save", (s: Partial<Settings>) => {
    need(["admin"]);
    mutate((d) => {
      d.settings = { ...d.settings, ...s };
      if (s.apiUrl !== undefined) d.settings.apiUrl = s.apiUrl.trim() || L.DEFAULT_SETTINGS.apiUrl;
    });
    if (s.zoom && win) win.webContents.setZoomFactor(s.zoom / 100);
  });
  handle("zoom:set", (z: number) => {
    need();
    const v = Math.max(70, Math.min(150, Math.round(z)));
    mutate((d) => { d.settings.zoom = v; });
    win?.webContents.setZoomFactor(v / 100);
  });
  handle("staff:save", (s: Partial<Staff> & { name: string; role: Staff["role"] }) => {
    need(["admin"]);
    if (!s.name.trim()) throw new L.KassaError("Ismni kiriting");
    if (s.pin !== undefined && s.pin !== "" && !/^\d{4}$/.test(s.pin)) throw new L.KassaError("PIN 4 ta raqam bo‘lishi kerak");
    mutate((d) => {
      const ex = s.id ? d.staff.find((x) => x.id === s.id) : undefined;
      if (s.pin && d.staff.some((x) => x.pin === s.pin && x.id !== s.id && x.active)) throw new L.KassaError("Bu PIN boshqa xodimda bor");
      if (ex) {
        if (ex.role === "admin" && s.role !== "admin" && d.staff.filter((x) => x.role === "admin" && x.active).length === 1)
          throw new L.KassaError("Kamida bitta admin qolishi kerak");
        Object.assign(ex, { name: s.name.trim(), role: s.role, active: s.active ?? ex.active, ...(s.pin ? { pin: s.pin } : {}) });
      } else {
        if (!s.pin) throw new L.KassaError("PIN kiriting");
        d.staff.push({ id: L.uid(), name: s.name.trim(), role: s.role, pin: s.pin, active: true });
      }
    });
  });
  handle("staff:delete", (id: string) => {
    need(["admin"]);
    mutate((d) => {
      const s = d.staff.find((x) => x.id === id);
      if (!s) return;
      if (s.role === "admin" && d.staff.filter((x) => x.role === "admin" && x.active).length === 1)
        throw new L.KassaError("Oxirgi adminni o‘chirib bo‘lmaydi");
      if (actor?.id === id) throw new L.KassaError("O‘zingizni o‘chira olmaysiz");
      d.staff = d.staff.filter((x) => x.id !== id);
    });
  });

  handle("local:saveCategory", (c: { id?: string; name: string; print?: "none" | "shashlik" | "kitchen" }) => {
    need(["admin"]);
    if (!c.name.trim()) throw new L.KassaError("Nomini kiriting");
    return mutate((d) => {
      const ex = c.id && d.local.categories.find((x) => x.id === c.id);
      if (ex) { ex.name = c.name.trim(); ex.print = c.print ?? ex.print ?? "none"; return ex.id; }
      const id = "loc-" + L.uid();
      d.local.categories.push({ id, name: c.name.trim(), sortOrder: 1000 + d.local.categories.length, source: "local", print: c.print ?? "none" });
      return id;
    });
  });
  handle("local:deleteCategory", (id: string) => {
    need(["admin"]);
    mutate((d) => {
      d.local.categories = d.local.categories.filter((x) => x.id !== id);
      d.local.products = d.local.products.filter((x) => x.categoryId !== id);
    });
  });
  handle("local:saveProduct", (p: { id?: string; categoryId: string; name: string; price: number; image: string | null; unit: string }) => {
    need(["admin"]);
    if (!p.name.trim()) throw new L.KassaError("Nomini kiriting");
    if (!(p.price > 0)) throw new L.KassaError("Narxini kiriting");
    if (!L.menu(store.get()).categories.some((c) => c.id === p.categoryId)) throw new L.KassaError("Bo‘limni tanlang");
    mutate((d) => {
      const ex = p.id && d.local.products.find((x) => x.id === p.id);
      const v = { categoryId: p.categoryId, name: p.name.trim(), price: Math.round(p.price), image: p.image, unit: p.unit || "" };
      if (ex) Object.assign(ex, v);
      else d.local.products.push({ id: "loc-" + L.uid(), ...v, sortOrder: d.local.products.length, source: "local" });
    });
  });
  handle("local:deleteProduct", (id: string) => {
    need(["admin"]);
    mutate((d) => { d.local.products = d.local.products.filter((x) => x.id !== id); });
  });
  handle("price:override", (id: string, price: number | null) => {
    need(["admin"]);
    mutate((d) => {
      if (price && price > 0) d.priceOverrides[id] = Math.round(price);
      else delete d.priceOverrides[id];
    });
  });

  handle("image:pick", async () => {
    need(["admin"]);
    if (!win) return null;
    const r = await dialog.showOpenDialog(win, { title: "Rasm tanlang", properties: ["openFile"], filters: [{ name: "Rasm", extensions: ["jpg", "jpeg", "png", "webp"] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    fs.mkdirSync(imagesDir(), { recursive: true });
    const src = r.filePaths[0];
    const name = crypto.createHash("sha1").update(fs.readFileSync(src)).digest("hex").slice(0, 16) + path.extname(src).toLowerCase();
    fs.copyFileSync(src, path.join(imagesDir(), name));
    return `kassa-img://r/${name}`;
  });

  handle("menu:sync", () => syncMenu());
  // Kirish ekrani foni — kirmasdan ham o‘zgartirish mumkin (Zim-Zim'dagidek)
  handle("bg:set", (v: string) => mutate((d) => { d.settings.startBackground = String(v).slice(0, 300); }));
  handle("bg:pick", async () => {
    if (!win) return null;
    const r = await dialog.showOpenDialog(win, { title: "Fon rasmini tanlang", properties: ["openFile"], filters: [{ name: "Rasm", extensions: ["jpg", "jpeg", "png", "webp"] }] });
    if (r.canceled || !r.filePaths[0]) return null;
    fs.mkdirSync(imagesDir(), { recursive: true });
    const src = r.filePaths[0];
    const name = "fon-" + crypto.createHash("sha1").update(fs.readFileSync(src)).digest("hex").slice(0, 12) + path.extname(src).toLowerCase();
    fs.copyFileSync(src, path.join(imagesDir(), name));
    const v = `kassa-img://r/${name}`;
    mutate((d) => { d.settings.startBackground = v; });
    return v;
  });
  handle("power", (what: "quit" | "shutdown" | "restart") => {
    store.writeNow();
    if (what === "quit") return app.quit();
    if (process.platform !== "win32") return app.quit();
    spawn("shutdown", what === "shutdown" ? ["/s", "/t", "0"] : ["/r", "/t", "0"], { detached: true, stdio: "ignore" }).unref();
    app.quit();
  });
  handle("update:check", () => checkUpdate());
  handle("update:install", () => installUpdate());
  handle("update:state", () => updateState());
  handle("app:openData", () => shell.openPath(store.paths.dir()));
  handle("app:quit", () => { need(["admin"]); app.quit(); });
  handle("app:fullscreen", () => { if (win) win.setFullScreen(!win.isFullScreen()); });
}

function createWindow() {
  const d = store.get();
  win = new BrowserWindow({
    width: 1366,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    backgroundColor: "#0f3b2e",
    autoHideMenuBar: true,
    title: "Do'stlik Kassa",
    icon: path.join(__dirname, "../dist/icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });
  win.setMenu(null);
  win.once("ready-to-show", () => {
    win!.maximize();
    win!.show();
    win!.webContents.setZoomFactor(d.settings.zoom / 100);
  });
  // Tashqi havolalar brauzerda ochiladi, oyna ichida emas
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
  win.webContents.on("will-navigate", (e, url) => { if (!url.startsWith("http://localhost:5173") && !url.startsWith("file:")) e.preventDefault(); });
  win.webContents.on("before-input-event", (_e, input) => {
    if (input.type === "keyDown" && input.key === "F11") win!.setFullScreen(!win!.isFullScreen());
    if (input.type === "keyDown" && input.key === "F12" && !app.isPackaged) win!.webContents.toggleDevTools();
  });

  if (process.env.VITE_DEV) win.loadURL("http://localhost:5173");
  else win.loadFile(path.join(__dirname, "../dist/index.html"));
  win.on("closed", () => { win = null; });
}

app.whenReady().then(() => {
  protocol.handle("kassa-img", (req) => {
    const name = path.basename(new URL(req.url).pathname);
    return net.fetch(pathToFileURL(path.join(imagesDir(), name)).toString());
  });
  store.load();
  registerIpc();
  createWindow();
  initUpdater(win!);
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: true });
  syncMenu();
  setInterval(syncMenu, 5 * 60_000);
});

app.on("before-quit", () => store.writeNow());
app.on("window-all-closed", () => app.quit());
