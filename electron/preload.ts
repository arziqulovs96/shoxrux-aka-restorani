// Oyna bilan asosiy jarayon o‘rtasidagi xavfsiz ko‘prik
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("kassa", {
  call: (name: string, ...args: unknown[]) => ipcRenderer.invoke(name, ...args),
  on: (event: "state" | "update", cb: (v: unknown) => void) => {
    const l = (_e: unknown, v: unknown) => cb(v);
    ipcRenderer.on(event, l);
    return () => ipcRenderer.removeListener(event, l);
  },
});
