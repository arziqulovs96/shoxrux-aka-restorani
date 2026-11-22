import { build } from "esbuild";

const common = { bundle: true, platform: "node", target: "node20", sourcemap: false, external: ["electron", "electron-updater"], logLevel: "warning" };
await build({ ...common, entryPoints: ["electron/main.ts"], outfile: "dist-electron/main.js", format: "cjs" });
await build({ ...common, entryPoints: ["electron/preload.ts"], outfile: "dist-electron/preload.js", format: "cjs" });
console.log("electron: tayyor");
