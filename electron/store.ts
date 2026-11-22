// Ma'lumotlar fayli: kompyuterning o‘zida (internet shart emas). Atomik yozish + kunlik zaxira.
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { normalize, splitOld } from "../src/shared/logic";
import type { Data } from "../src/shared/types";

const dir = () => app.getPath("userData");
const file = () => path.join(dir(), "kassa-data.json");
const backups = () => path.join(dir(), "zaxira");
const archive = () => path.join(dir(), "arxiv");

let data: Data;
let timer: NodeJS.Timeout | null = null;

export function load(): Data {
  fs.mkdirSync(dir(), { recursive: true });
  for (const f of [file(), file() + ".tmp", latestBackup()]) {
    if (!f || !fs.existsSync(f)) continue;
    try {
      data = normalize(JSON.parse(fs.readFileSync(f, "utf8")));
      archiveOld();
      return data;
    } catch {
      // buzilgan bo‘lsa keyingisini sinaymiz
    }
  }
  data = normalize(null);
  writeNow();
  return data;
}

export const get = () => data;

/** O‘zgarishdan keyin chaqiriladi: 150 ms ichida diskka yoziladi */
export function save() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(writeNow, 150);
}

export function writeNow() {
  if (timer) { clearTimeout(timer); timer = null; }
  const tmp = file() + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file());
  dailyBackup();
}

function dailyBackup() {
  const day = new Date().toISOString().slice(0, 10);
  const target = path.join(backups(), `kassa-${day}.json`);
  try {
    fs.mkdirSync(backups(), { recursive: true });
    fs.copyFileSync(file(), target);
    const all = fs.readdirSync(backups()).filter((f) => f.endsWith(".json")).sort();
    for (const f of all.slice(0, Math.max(0, all.length - 30))) fs.rmSync(path.join(backups(), f));
  } catch {
    /* zaxira ixtiyoriy */
  }
}

function latestBackup() {
  try {
    const all = fs.readdirSync(backups()).filter((f) => f.endsWith(".json")).sort();
    return all.length ? path.join(backups(), all[all.length - 1]) : null;
  } catch {
    return null;
  }
}

function archiveOld() {
  const old = splitOld(data);
  if (!old.length) return;
  fs.mkdirSync(archive(), { recursive: true });
  const byMonth = new Map<string, typeof old>();
  for (const o of old) {
    const m = (o.closedAt ?? o.createdAt).slice(0, 7);
    byMonth.set(m, [...(byMonth.get(m) ?? []), o]);
  }
  for (const [m, list] of byMonth) {
    const f = path.join(archive(), `buyurtmalar-${m}.json`);
    const prev = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : [];
    fs.writeFileSync(f, JSON.stringify([...prev, ...list]));
  }
  writeNow();
}

export const paths = { dir, file, backups, archive };
