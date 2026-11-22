// Avtomatik yangilanish (GitHub Releases). Holat oynaga yuboriladi: foiz, tezlik, hajm.
import { app, type BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import type { UpdateState } from "../src/shared/types";

let state: UpdateState = { phase: "idle" };
let win: BrowserWindow | null = null;

function set(s: UpdateState) {
  state = s;
  win?.webContents.send("update", state);
}
export const updateState = () => state;

const notesText = (n: unknown) =>
  typeof n === "string"
    ? n.replace(/<[^>]+>/g, "").trim()
    : Array.isArray(n)
      ? n.map((x: { note?: string }) => (x.note ?? "").replace(/<[^>]+>/g, "")).join("\n").trim()
      : "";

export function initUpdater(w: BrowserWindow) {
  win = w;
  if (!app.isPackaged) {
    set({ phase: "none", error: "Dasturchi rejimi — yangilanish faqat o‘rnatilgan dasturda ishlaydi" });
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on("checking-for-update", () => set({ ...state, phase: "checking" }));
  autoUpdater.on("update-available", (i) => set({ phase: "available", version: i.version, notes: notesText(i.releaseNotes), percent: 0 }));
  autoUpdater.on("update-not-available", () => set({ phase: "none" }));
  autoUpdater.on("download-progress", (p) =>
    set({ ...state, phase: "downloading", percent: p.percent, transferred: p.transferred, total: p.total, speed: p.bytesPerSecond }),
  );
  autoUpdater.on("update-downloaded", (i) => set({ ...state, phase: "ready", version: i.version, percent: 100 }));
  autoUpdater.on("error", (e) => set({ ...state, phase: "error", error: friendly(e) }));

  setTimeout(check, 8_000);
  setInterval(check, 30 * 60_000);
}

function friendly(e: Error) {
  const m = e?.message ?? String(e);
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|net::/i.test(m)) return "Internet yo‘q — keyinroq yana tekshiriladi";
  if (/404/.test(m)) return "Yangilanishlar sahifasi topilmadi (GitHub reliz hali yo‘q)";
  return m.split("\n")[0].slice(0, 200);
}

export function check() {
  if (!app.isPackaged) return set({ phase: "none", error: "Dasturchi rejimi — yangilanish faqat o‘rnatilgan dasturda ishlaydi" });
  if (state.phase === "downloading" || state.phase === "ready") return;
  autoUpdater.checkForUpdates().catch((e) => set({ ...state, phase: "error", error: friendly(e) }));
}

export function install() {
  if (state.phase !== "ready") return;
  setImmediate(() => autoUpdater.quitAndInstall(true, true));
}
