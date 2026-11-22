// Chek chop etish: yashirin oynada HTML ochib, tanlangan printerga jim (silent) yuboradi.
import { BrowserWindow } from "electron";
import type { PrinterInfo } from "../src/shared/types";

let probe: BrowserWindow | null = null;

export async function listPrinters(win: BrowserWindow): Promise<PrinterInfo[]> {
  const list = await win.webContents.getPrintersAsync();
  return list.map((p) => ({ name: p.name, displayName: p.displayName || p.name, isDefault: !!p.isDefault }));
}

export async function printHtml(html: string, deviceName: string, widthMm: 58 | 80): Promise<void> {
  const w = new BrowserWindow({ show: false, width: 400, height: 800, webPreferences: { sandbox: true, javascript: true } });
  try {
    await w.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));
    const hPx: number = await w.webContents.executeJavaScript("document.body.scrollHeight");
    const heightMicrons = Math.max(50_000, Math.ceil((hPx * 25.4 * 1000) / 96) + 8000);
    await new Promise<void>((resolve, reject) => {
      w.webContents.print(
        {
          silent: true,
          deviceName,
          printBackground: true,
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

export function disposeProbe() {
  probe?.destroy();
  probe = null;
}
