// Chek chop etish: yashirin oynada HTML ochib, tanlangan printerga jim (silent) yuboradi.
// Oyna kengligi qog‘oz kengligiga teng qilinadi — matn xuddi qog‘ozdagidek joylashadi va
// balandlik aniq o‘lchanadi (chek yarmida kesilib qolmaydi).
import { app, BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { PrinterInfo } from "../src/shared/types";

export async function listPrinters(win: BrowserWindow): Promise<PrinterInfo[]> {
  const list = await win.webContents.getPrintersAsync();
  return list.map((p) => ({ name: p.name, displayName: p.displayName || p.name, isDefault: !!p.isDefault }));
}

const mmToPx = (mm: number) => Math.round((mm * 96) / 25.4);

export async function printHtml(html: string, deviceName: string, widthMm: 58 | 80): Promise<void> {
  const w = new BrowserWindow({
    show: false,
    width: mmToPx(widthMm),
    height: 600,
    useContentSize: true,
    webPreferences: { sandbox: true, javascript: true, zoomFactor: 1 },
  });
  try {
    // Vaqtinchalik faylga yozib ochamiz (data: manzilidan ishonchliroq)
    const f = path.join(app.getPath("temp"), `dostlik-chek-${process.pid}-${Date.now()}.html`);
    fs.writeFileSync(f, html, "utf8");
    try {
      await w.loadFile(f);
    } finally {
      setTimeout(() => fs.rm(f, { force: true }, () => {}), 60_000);
    }
    const hPx: number = await w.webContents.executeJavaScript("Math.ceil(document.documentElement.getBoundingClientRect().height)");
    // + 10 mm zaxira: printer chekni oxirigacha chiqarib, keyin kesadi
    const heightMicrons = Math.max(60_000, Math.ceil((hPx * 25.4 * 1000) / 96) + 10_000);
    await new Promise<void>((resolve, reject) => {
      w.webContents.print(
        {
          silent: true,
          deviceName,
          printBackground: true,
          color: false,
          landscape: false,
          scaleFactor: 100,
          margins: { marginType: "none" },
          pageSize: { width: widthMm * 1000, height: heightMicrons },
        },
        (ok, reason) => (ok ? resolve() : reject(new Error(reason || "Chop etilmadi"))),
      );
    });
  } finally {
    w.destroy();
  }
}
