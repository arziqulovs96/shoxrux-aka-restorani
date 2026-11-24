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

export function seedMenu(): { categories: Category[]; products: Product[] } {
  const categories: Category[] = [];
  const products: Product[] = [];
  MENU.forEach((c, ci) => {
    categories.push({ id: `zz-${c.id}`, name: c.name, sortOrder: ci, source: "local", print: c.print ?? "none" });
    c.items.forEach(([name, price, unit, image], pi) => {
      products.push({
        id: `zz-${c.id}-${pi + 1}`, categoryId: `zz-${c.id}`, name, price, unit,
        image: image ? `menu/${image}.jpg` : null, sortOrder: pi, source: "local",
      });
    });
  });
  return { categories, products };
}
