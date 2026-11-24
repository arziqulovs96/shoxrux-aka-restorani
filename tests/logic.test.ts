import { describe, expect, it } from "vitest";
import * as L from "../src/shared/logic";
import { kitchenHtml, receiptHtml, reportHtml } from "../src/shared/receipt";
import type { Data } from "../src/shared/types";

const admin: L.Actor = { id: "admin", name: "Admin", role: "admin" };
const waiter: L.Actor = { id: "w1", name: "Shoxrux", role: "ofitsiant" };

function seed(): Data {
  const d = L.emptyData();
  const m = L.fromSite(
    [{ id: "c1", name: "Salatlar", sortOrder: 1 }, { id: "c2", name: "Yashirin", active: false }],
    [
      { id: "p1", categoryId: "c1", name: "Sezar", price: 35000, image: { url: "https://res.cloudinary.com/x/image/upload/v1/a.jpg" } },
      { id: "p2", categoryId: "c1", name: "Olivye", price: 25000 },
      { id: "p3", categoryId: "c1", name: "Tugagan", price: 10000, available: false },
      { id: "p4", categoryId: "c2", name: "Yashirin taom", price: 1000 },
    ],
  );
  d.site = { ...m, syncedAt: null, error: null };
  return d;
}

describe("menyu", () => {
  it("saytdan faqat faol bo‘lim va mavjud taomlarni oladi, rasmni kichraytiradi", () => {
    const d = seed();
    expect(d.site.categories.map((c) => c.id)).toEqual(["c1"]);
    expect(d.site.products.map((p) => p.id)).toEqual(["p1", "p2"]);
    expect(d.site.products[0].image).toContain("/upload/w_360,h_270");
  });
  it("kassa narxi saytdagidan ustun", () => {
    const d = seed();
    d.priceOverrides.p1 = 40000;
    expect(L.menu(d).products.find((p) => p.id === "p1")?.price).toBe(40000);
  });
});

describe("buyurtma", () => {
  it("stol ochish, taom qo‘shish, bir xil taom miqdori oshadi, bitta stolga bitta buyurtma", () => {
    const d = seed();
    const o = L.openOrder(d, { type: "zal", hallId: "zal", table: 3 }, waiter);
    expect(L.openOrder(d, { type: "zal", hallId: "zal", table: 3 }, waiter).id).toBe(o.id);
    const c = o.checks[0].id;
    L.addLine(d, o.id, c, "p1");
    L.addLine(d, o.id, c, "p1");
    L.addLine(d, o.id, c, "p2");
    expect(o.checks[0].lines).toHaveLength(2);
    expect(o.checks[0].lines[0].qty).toBe(2);
    expect(L.orderTotals(o).total).toBe(95000);
  });

  it("oshxonaga yuborilgandan keyin yangi qo‘shilgani alohida qator bo‘ladi va faqat yangisi yuboriladi", () => {
    const d = seed();
    const o = L.openOrder(d, { type: "zal", hallId: "zal", table: 1 }, waiter);
    const c = o.checks[0].id;
    L.addLine(d, o.id, c, "p1", 2);
    expect(L.sendKitchen(d, o.id).items).toEqual([{ name: "Sezar", qty: 2, note: "" }]);
    L.addLine(d, o.id, c, "p1");
    expect(o.checks[0].lines).toHaveLength(2);
    expect(L.sendKitchen(d, o.id).items).toEqual([{ name: "Sezar", qty: 1, note: "" }]);
    expect(L.sendKitchen(d, o.id).items).toEqual([]);
  });

  it("ofitsiant yuborilgan taomni kamaytira olmaydi, kassir/admin oladi", () => {
    const d = seed();
    const o = L.openOrder(d, { type: "zal", hallId: "zal", table: 1 }, waiter);
    const c = o.checks[0].id;
    L.addLine(d, o.id, c, "p1");
    L.sendKitchen(d, o.id);
    const l = o.checks[0].lines[0].id;
    expect(() => L.changeQty(d, o.id, c, l, -1, waiter)).toThrow(/kassir/);
    L.changeQty(d, o.id, c, l, -1, admin);
    expect(o.checks[0].lines).toHaveLength(0);
  });

  it("stop-listdagi taom qo‘shilmaydi", () => {
    const d = seed();
    const o = L.openOrder(d, { type: "olib" }, waiter);
    L.toggleStop(d, "p2");
    expect(() => L.addLine(d, o.id, o.checks[0].id, "p2")).toThrow(/stop/);
  });

  it("xizmat haqi va chegirma hisoblanadi; olib ketishda xizmat haqi yo‘q", () => {
    const d = seed();
    d.settings.serviceRate = 10;
    const o = L.openOrder(d, { type: "zal", hallId: "zal", table: 2 }, waiter);
    L.addLine(d, o.id, o.checks[0].id, "p1", 2); // 70 000
    L.setDiscount(d, o.id, 10, admin);
    expect(L.checkTotals(o, o.checks[0])).toEqual({ sub: 70000, service: 7000, discount: 7700, total: 69300 });
    expect(() => L.setDiscount(d, o.id, 50, waiter)).toThrow();
    expect(L.openOrder(d, { type: "olib" }, waiter).serviceRate).toBe(0);
  });
});

describe("to‘lov", () => {
  it("naqd to‘lov qaytim bilan, buyurtma yopiladi; ofitsiant to‘lov qabul qilolmaydi", () => {
    const d = seed();
    const o = L.openOrder(d, { type: "zal", hallId: "zal", table: 5 }, waiter);
    L.addLine(d, o.id, o.checks[0].id, "p1"); // 35 000
    expect(() => L.pay(d, o.id, o.checks[0].id, [{ method: "naqd", amount: 50000 }], waiter)).toThrow();
    expect(() => L.pay(d, o.id, o.checks[0].id, [{ method: "naqd", amount: 30000 }], admin)).toThrow(/yetarli/);
    const r = L.pay(d, o.id, o.checks[0].id, [{ method: "naqd", amount: 50000 }], admin);
    expect(r.change).toBe(15000);
    expect(o.status).toBe("paid");
    expect(o.checks[0].payments).toEqual([{ method: "naqd", amount: 35000 }]);
    expect(L.tableOrder(d, "zal", 5)).toBeUndefined();
  });

  it("karta orqali ortiqcha olib bo‘lmaydi; aralash to‘lov ishlaydi", () => {
    const d = seed();
    const o = L.openOrder(d, { type: "olib" }, waiter);
    L.addLine(d, o.id, o.checks[0].id, "p1");
    expect(() => L.pay(d, o.id, o.checks[0].id, [{ method: "terminal", amount: 40000 }], admin)).toThrow(/Naqdsiz/);
    const r = L.pay(d, o.id, o.checks[0].id, [{ method: "terminal", amount: 20000 }, { method: "naqd", amount: 20000 }], admin);
    expect(r.change).toBe(5000);
    expect(o.checks[0].payments).toEqual([{ method: "terminal", amount: 20000 }, { method: "naqd", amount: 15000 }]);
  });

  it("alohida hisoblar: birinchisi to‘langanda stol ochiq qoladi, hammasi to‘langanda yopiladi", () => {
    const d = seed();
    const o = L.openOrder(d, { type: "zal", hallId: "zal", table: 7 }, waiter);
    const c2 = L.addCheck(d, o.id);
    L.addLine(d, o.id, o.checks[0].id, "p1");
    L.addLine(d, o.id, c2.id, "p2");
    L.pay(d, o.id, o.checks[0].id, [{ method: "naqd", amount: 35000 }], admin);
    expect(o.status).toBe("open");
    expect(L.orderTotals(o).total).toBe(60000);
    L.pay(d, o.id, c2.id, [{ method: "click", amount: 25000 }], admin);
    expect(o.status).toBe("paid");
  });
});

describe("qarz", () => {
  it("qarzga yozish mijozsiz bo‘lmaydi; qarz keyin to‘lanadi va kassaga tushadi", () => {
    const d = seed();
    const o = L.openOrder(d, { type: "olib" }, waiter);
    L.addLine(d, o.id, o.checks[0].id, "p1"); // 35 000
    expect(() => L.pay(d, o.id, o.checks[0].id, [{ method: "qarz", amount: 35000 }], admin)).toThrow(/mijoz/);
    expect(() => L.pay(d, o.id, o.checks[0].id, [{ method: "qarz", amount: 40000 }], admin, { name: "Ali", phone: "", reason: "" })).toThrow();
    L.pay(d, o.id, o.checks[0].id, [{ method: "naqd", amount: 15000 }, { method: "qarz", amount: 20000 }], admin, { name: "Ali aka", phone: "+998901234567", reason: "ertaga" });
    expect(o.status).toBe("paid");
    expect(d.debts).toHaveLength(1);
    expect(d.debts[0]).toMatchObject({ amount: 20000, customerName: "Ali aka", paidAt: null });
    const day = new Date(); day.setHours(0, 0, 0, 0);
    const end = new Date(day.getTime() + 86400_000);
    expect(L.report(d, day, end).debtNew).toBe(20000);
    expect(L.report(d, day, end).cashInDrawer).toBe(15000);
    expect(() => L.payDebt(d, d.debts[0].id, "naqd", waiter)).toThrow();
    L.payDebt(d, d.debts[0].id, "naqd", admin);
    expect(() => L.payDebt(d, d.debts[0].id, "naqd", admin)).toThrow(/allaqachon/);
    const r = L.report(d, day, end);
    expect(r.debtPaid).toEqual({ naqd: 20000 });
    expect(r.cashInDrawer).toBe(35000);
  });

  it("ofitsiant almashtirish, tur almashtirish, yaqinda kirganlar", () => {
    const d = seed();
    const o = L.openOrder(d, { type: "zal", hallId: "zal", table: 4 }, waiter);
    expect(() => L.setWaiter(d, o.id, { id: "w2", name: "Jasur" }, waiter)).toThrow();
    L.setWaiter(d, o.id, { id: "w2", name: "Jasur" }, admin);
    expect(o.waiterName).toBe("Jasur");
    L.setType(d, o.id, "olib");
    expect([o.type, o.table]).toEqual(["olib", null]);
    L.remember(d, "a"); L.remember(d, "b"); L.remember(d, "a");
    expect(d.recent).toEqual(["a", "b"]);
  });
});

describe("stol ko‘chirish, bekor qilish", () => {
  it("bo‘sh stolga ko‘chiradi, band stolga birlashtiradi", () => {
    const d = seed();
    const a = L.openOrder(d, { type: "zal", hallId: "zal", table: 1 }, waiter);
    L.addLine(d, a.id, a.checks[0].id, "p1");
    L.moveTable(d, a.id, "zal2", 4);
    expect(a.hallId).toBe("zal2");
    const b = L.openOrder(d, { type: "zal", hallId: "zal", table: 9 }, waiter);
    L.addLine(d, b.id, b.checks[0].id, "p2");
    const target = L.moveTable(d, b.id, "zal2", 4);
    expect(target.id).toBe(a.id);
    expect(a.checks).toHaveLength(2);
    expect(d.orders.find((o) => o.id === b.id)).toBeUndefined();
  });

  it("bo‘sh buyurtma butunlay o‘chadi, to‘lalari bekor bo‘ladi (sabab bilan)", () => {
    const d = seed();
    const a = L.openOrder(d, { type: "olib" }, waiter);
    L.dropIfEmpty(d, a.id);
    expect(d.orders).toHaveLength(0);
    const b = L.openOrder(d, { type: "olib" }, waiter);
    L.addLine(d, b.id, b.checks[0].id, "p1");
    L.sendKitchen(d, b.id);
    expect(() => L.cancelOrder(d, b.id, "x", waiter)).toThrow();
    L.cancelOrder(d, b.id, "Mijoz ketdi", admin);
    expect(b.status).toBe("cancelled");
    expect(b.cancelReason).toContain("Mijoz ketdi");
  });
});

describe("hisobot va chek", () => {
  it("tushum, to‘lov turlari, ofitsiant va taomlar bo‘yicha", () => {
    const d = seed();
    const o = L.openOrder(d, { type: "zal", hallId: "zal", table: 1 }, waiter);
    L.addLine(d, o.id, o.checks[0].id, "p1", 2);
    L.pay(d, o.id, o.checks[0].id, [{ method: "karta", amount: 70000 }], admin); // eski nom → terminal
    L.addCash(d, { type: "chiqim", amount: 10000, note: "Non", staffName: "Admin" });
    L.addCash(d, { type: "kirim", amount: 50000, note: "Qoldiq", staffName: "Admin" });
    const day = new Date(); day.setHours(0, 0, 0, 0);
    const r = L.report(d, day, new Date(day.getTime() + 86400_000));
    expect(r.revenue).toBe(70000);
    expect(r.byMethod).toEqual({ terminal: 70000 });
    expect(r.byCashier).toEqual([{ name: "Admin", checks: 1, sum: 70000, byMethod: { terminal: 70000 } }]);
    expect(r.byType.zal).toEqual({ count: 1, sum: 70000 });
    expect(r.transactions).toHaveLength(3);
    expect(r.byWaiter).toEqual([{ name: "Shoxrux", orders: 1, sum: 70000 }]);
    expect(r.products).toEqual([{ name: "Sezar", qty: 2, sum: 70000 }]);
    expect(r.cashInDrawer).toBe(40000);
    expect(reportHtml(d, r, "Bugun")).toContain("70 000");
  });

  it("chek HTML: taom, jami, qaytim; oshxona chekida narx yo‘q", () => {
    const d = seed();
    const o = L.openOrder(d, { type: "zal", hallId: "zal", table: 3 }, waiter);
    L.addLine(d, o.id, o.checks[0].id, "p1");
    const html = receiptHtml(d, o, o.checks, false);
    expect(html).toContain("Sezar");
    expect(html).toContain("35 000");
    expect(html).toContain("ZAL · 3");
    expect(html).toContain("Jami:");
    expect(html).toContain("width: 100%"); // qog‘oz kengligiga moslashadi — kesilmaydi
    const d58 = { settings: { ...d.settings, paperWidth: 58 as const, receiptNote: "+998 99 436 78 75" } };
    expect(receiptHtml(d58, o, o.checks, false)).toContain("+998 99 436 78 75");
    const k = kitchenHtml(d, o, [{ name: "Sezar", qty: 1, note: "Achchiq" }]);
    expect(k).toContain("3-STOL");
    expect(k).not.toContain("35 000");
  });

  it("90 kundan eski yopilgan buyurtmalar arxivga ajraladi, ochiqlari qoladi", () => {
    const d = seed();
    const old = L.openOrder(d, { type: "olib" }, waiter);
    old.status = "paid";
    old.closedAt = new Date(Date.now() - 100 * 86400_000).toISOString();
    L.openOrder(d, { type: "olib" }, waiter);
    expect(L.splitOld(d)).toHaveLength(1);
    expect(d.orders).toHaveLength(1);
  });

  it("normalize: buzuq/eski fayldan to‘g‘ri tuzilma", () => {
    const d = L.normalize({ settings: { serviceRate: 5 } } as never);
    expect(d.settings.serviceRate).toBe(5);
    expect(d.settings.halls.length).toBeGreaterThan(0);
    expect(d.staff[0].role).toBe("admin");
  });
});
