# Do‘stlik Kassa

Do‘stlik oilaviy restorani uchun kassa (POS) dasturi — Windows, sensorli ekran uchun.

- Kompyuterning o‘zida ishlaydi (internet uzilsa ham to‘xtamaydi), har kuni zaxira nusxa.
- Menyu sayt admin panelidan avtomatik olinadi (har 5 daqiqada); saytda yo‘q mahsulotlar kassa sozlamalaridan qo‘shiladi.
- Zallar va stollar, bir stolga bir nechta hisob, oshxonaga yuborish, to‘lov (naqd/karta/Click/Payme, aralash), chegirma, xizmat haqi.
- Olib ketish, yetkazib berish, stop-list, kirim/chiqim, hisobotlar, buyurtmalar tarixi.
- Xodimlar PIN bilan kiradi: ofitsiant, kassir, admin.
- Chek va oshxona printerlari (Sozlamalar → Printerlar).
- Avtomatik yangilanish: GitHub Releases orqali, foiz va tezlik ko‘rinadi.

## Birinchi kirish

Admin PIN: **0000** — kirgandan keyin Sozlamalar → Xodimlar bo‘limida o‘zgartiring va xodimlarni qo‘shing.

## Dasturchi uchun

```bash
npm install
npm run dev        # ishlab chiqish rejimi
npm test           # testlar
npm run dist       # mahalliy .exe (release/ papkasida)
```

### Yangi versiya chiqarish

```bash
npm version patch          # 1.0.0 → 1.0.1 (git teg ham yaratiladi)
git push --follow-tags     # GitHub Actions .exe yig‘ib, Releases’ga joylaydi
```

Kassadagi dastur 10 daqiqa ichida yangilanishni topadi, yuklab oladi va o‘rnatishni taklif qiladi.

Muallif: Sardor Arziqulov (Vector57)
