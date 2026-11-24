// Zim-Zim'dagi menyu (2026-11-24 rasmlardan ko'chirildi). Rasmi aniq bo'lmagan taomlar — logotip bilan.
import type { Category, Product } from "./types";

type Row = [name: string, price: number, unit: string, image?: string];

const MENU: { id: string; name: string; print?: "shashlik"; items: Row[] }[] = [
  { id: "salat", name: "Salat", items: [
    ["Sezar", 35000, "porsiya"], ["Zagadka", 35000, "porsiya"], ["Majnuntol", 35000, "porsiya"], ["Smak", 35000, "porsiya"],
    ["Yaponcha", 35000, "porsiya"], ["Aziya", 35000, "porsiya"], ["Oliviya", 35000, "porsiya"], ["Kapriz", 35000, "porsiya"],
    ["Fransuzcha salat", 35000, "porsiya"],
  ] },
  { id: "birinchi", name: "Birinchi taom", items: [
    ["Shi", 25000, "dona", "shi"], ["Borsh", 25000, "dona"], ["Tiftel sho‘rva", 30000, "dona"], ["Lag‘mon", 30000, "dona", "lagmon"],
    ["Grechka", 30000, "dona"], ["Olibqochar", 45000, "dona"], ["Sho‘rva", 40000, "porsiya"], ["Kalla pocha", 50000, "porsiya"],
    ["Qo‘y sho‘rva", 50000, "porsiya"], ["Kalla pocha 100 g", 10000, "100 g"],
  ] },
  { id: "asosiy", name: "Asosiy taomlar", items: [
    ["Manti (1 porsiya, 5 dona)", 45000, "porsiya", "manti"], ["Manti (dona)", 9000, "dona", "manti"],
    ["Virezka + Chips (1 kg)", 280000, "kg", "virezka"], ["Virezka 100 g", 28000, "100 g", "virezka"],
    ["Tabaka (yumshoq jo‘ja)", 60000, "dona", "tabaka"], ["Tabaka 0.5", 30000, "dona", "tabaka"],
    ["Qanotcha (1 kg)", 100000, "kg", "qanotcha"], ["Qanotcha 100 g", 10000, "100 g", "qanotcha"],
    ["Koreyka (qo‘y biqinchasi)", 30000, "dona"], ["Qozon kabob", 50000, "porsiya", "qozon-kabob"], ["Kartoshka fri", 15000, "porsiya"],
  ] },
  { id: "shashlik", name: "Shashlik", print: "shashlik", items: [
    ["Moloti", 16000, "dona", "shashlik-moloti"], ["Kuskavoy", 35000, "dona", "kuskavoy"], ["Kuskavoy mol go‘shtli", 35000, "dona", "kuskavoy"],
    ["Tovuq qanoti", 25000, "dona", "tovuq-shashlik"], ["Jigar shashlik", 25000, "dona"], ["Dumbali moloti", 17000, "dona", "dumbali-moloti"],
  ] },
  { id: "maxsus", name: "Maxsus taomlar", items: [
    ["Moloti + Buxanka", 75000, "dona"], ["Katta moloti", 20000, "dona", "katta-moloti"],
  ] },
  { id: "asosiy-salat", name: "Asosiy salat", items: [
    ["Pamidor salat", 10000, "dona"], ["Pamidor salat (katta)", 15000, "dona"], ["Chiroqchi salat", 20000, "dona"], ["Qatiq", 5000, "dona"],
    ["Non", 5000, "dona"], ["Bo‘lka", 4000, "dona"], ["Choy ko‘k", 3000, "dona", "choy"], ["Limon choy", 10000, "dona"],
    ["Non 0.5", 3000, "dona"], ["Bo‘lka 0.5", 2000, "dona"], ["Turk choy", 20000, "l"], ["Bir kishilik salat", 7000, "dona"],
    ["Somsa 10 000", 10000, "dona"], ["Somsa 15 000", 15000, "dona"], ["Shashlik kombo set (4 kishilik)", 299000, "porsiya"],
    ["Xalades", 15000, "dona"], ["Salonni karam", 10000, "porsiya"], ["Meva assorti", 50000, "porsiya"], ["Karam salat katta", 15000, "porsiya"],
    ["Patir 1", 12000, "dona", "patir"], ["Patir 0.5", 6000, "dona", "patir"], ["Limon", 5000, "dona"], ["Desert", 15000, "dona"],
    ["Pista 10", 10000, "dona"],
  ] },
  { id: "ichimlik", name: "Ichimliklar", items: [
    ["Gazli suv 0.5", 3000, "dona"], ["Cola 0.5", 8000, "dona"], ["Cola 1 l", 12000, "dona"], ["7UP", 12000, "dona"], ["Cola 2 l", 22000, "dona"],
    ["Sochnaya Dolina", 15000, "dona"], ["Fuse tea 1.5", 16000, "dona"], ["Fuse tea 1 l", 12000, "dona"], ["Colacha butilka", 5000, "dona"],
    ["Suv 1 l", 5000, "dona"], ["Obi Hayot", 15000, "dona"], ["Fuse tea banka", 10000, "dona"], ["Sting banka", 10000, "dona"],
    ["Adrenalin", 11000, "dona"], ["Adrenalin katta", 17000, "dona"], ["Rockstar", 12000, "dona"], ["Pepsi 0.5", 8000, "dona"],
    ["Suv 0.5", 3000, "dona"], ["Lipton 1 l", 10000, "dona"], ["Pepsi 1 l", 13000, "dona"], ["Pepsi 1.5", 16000, "dona"],
    ["Pepsi 2 l", 22000, "dona"], ["Fanta 1.5", 16000, "dona"], ["Fanta 1 l", 13000, "dona"], ["Kola 1.5", 16000, "dona"],
  ] },
];

export const MENU_SEED_VERSION = 1;

/** Internetdan (Openverse/Flickr, Wikimedia) olingan erkin litsenziyali rasmlar — mualliflar: public/menu/manbalar.json */
export const MENU_IMAGES_VERSION = 1;
export const MENU_IMAGES: Record<string, string> = {
  "zz-salat-1": "menu/zz-salat-1-6.jpg",
  "zz-salat-4": "menu/zz-salat-4-5.jpg",
  "zz-salat-5": "menu/zz-salat-5-7.jpg",
  "zz-salat-6": "menu/zz-salat-6-7.jpg",
  "zz-salat-7": "menu/zz-salat-7-5.jpg",
  "zz-salat-8": "menu/zz-salat-8-6.jpg",
  "zz-salat-9": "menu/zz-salat-9-2.jpg",
  "zz-birinchi-2": "menu/zz-birinchi-2-4.jpg",
  "zz-birinchi-3": "menu/zz-birinchi-3-4.jpg",
  "zz-birinchi-5": "menu/zz-birinchi-5-5.jpg",
  "zz-birinchi-6": "menu/zz-birinchi-6-3.jpg",
  "zz-birinchi-8": "menu/zz-birinchi-8-1.jpg",
  "zz-birinchi-10": "menu/zz-birinchi-10-4.jpg",
  "zz-asosiy-9": "menu/zz-asosiy-9-6.jpg",
  "zz-asosiy-11": "menu/zz-asosiy-11-2.jpg",
  "zz-maxsus-1": "menu/zz-maxsus-1-7.jpg",
  "zz-asosiy-salat-1": "menu/zz-asosiy-salat-1-0.jpg",
  "zz-asosiy-salat-2": "menu/zz-asosiy-salat-2-2.jpg",
  "zz-asosiy-salat-3": "menu/zz-asosiy-salat-3-2.jpg",
  "zz-asosiy-salat-4": "menu/zz-asosiy-salat-4-3.jpg",
  "zz-asosiy-salat-5": "menu/zz-asosiy-salat-5-5.jpg",
  "zz-asosiy-salat-6": "menu/zz-asosiy-salat-6-0.jpg",
  "zz-asosiy-salat-8": "menu/zz-asosiy-salat-8-1.jpg",
  "zz-asosiy-salat-9": "menu/zz-asosiy-salat-5-5.jpg",
  "zz-asosiy-salat-10": "menu/zz-asosiy-salat-10-0.jpg",
  "zz-asosiy-salat-11": "menu/zz-asosiy-salat-11-1.jpg",
  "zz-asosiy-salat-12": "menu/zz-asosiy-salat-12-4.jpg",
  "zz-asosiy-salat-13": "menu/zz-asosiy-salat-13-4.jpg",
  "zz-asosiy-salat-14": "menu/zz-asosiy-salat-14-6.jpg",
  "zz-asosiy-salat-15": "menu/zz-asosiy-salat-15-3.jpg",
  "zz-asosiy-salat-16": "menu/zz-asosiy-salat-16-2.jpg",
  "zz-asosiy-salat-17": "menu/zz-asosiy-salat-17-4.jpg",
  "zz-asosiy-salat-18": "menu/zz-asosiy-salat-18-1.jpg",
  "zz-asosiy-salat-19": "menu/zz-asosiy-salat-19-4.jpg",
  "zz-asosiy-salat-22": "menu/zz-asosiy-salat-22-1.jpg",
  "zz-asosiy-salat-23": "menu/zz-asosiy-salat-23-7.jpg",
  "zz-asosiy-salat-24": "menu/zz-asosiy-salat-24-7.jpg",
  "zz-ichimlik-1": "menu/zz-ichimlik-1-3.jpg",
  "zz-ichimlik-2": "menu/zz-ichimlik-2-5.jpg",
  "zz-ichimlik-3": "menu/zz-ichimlik-2-5.jpg",
  "zz-ichimlik-4": "menu/zz-ichimlik-4-5.jpg",
  "zz-ichimlik-5": "menu/zz-ichimlik-5-6.jpg",
  "zz-ichimlik-9": "menu/zz-ichimlik-9-6.jpg",
  "zz-ichimlik-10": "menu/zz-ichimlik-10-6.jpg",
  "zz-ichimlik-11": "menu/zz-ichimlik-11-7.jpg",
  "zz-ichimlik-13": "menu/zz-ichimlik-13-2.jpg",
  "zz-ichimlik-16": "menu/zz-ichimlik-16-6.jpg",
  "zz-ichimlik-17": "menu/zz-ichimlik-17-0.jpg",
  "zz-ichimlik-18": "menu/zz-ichimlik-10-6.jpg",
  "zz-ichimlik-20": "menu/zz-ichimlik-20-4.jpg",
  "zz-ichimlik-21": "menu/zz-ichimlik-20-4.jpg",
  "zz-ichimlik-22": "menu/zz-ichimlik-22-2.jpg",
  "zz-ichimlik-23": "menu/zz-ichimlik-23-0.jpg",
  "zz-ichimlik-24": "menu/zz-ichimlik-24-4.jpg",
  "zz-ichimlik-25": "menu/zz-ichimlik-25-5.jpg"
};

export function seedMenu(): { categories: Category[]; products: Product[] } {
  const categories: Category[] = [];
  const products: Product[] = [];
  MENU.forEach((c, ci) => {
    categories.push({ id: `zz-${c.id}`, name: c.name, sortOrder: ci, source: "local", print: c.print ?? "none" });
    c.items.forEach(([name, price, unit, image], pi) => {
      products.push({
        id: `zz-${c.id}-${pi + 1}`, categoryId: `zz-${c.id}`, name, price, unit,
        image: image ? `menu/${image}.jpg` : MENU_IMAGES[`zz-${c.id}-${pi + 1}`] ?? null, sortOrder: pi, source: "local",
      });
    });
  });
  return { categories, products };
}
