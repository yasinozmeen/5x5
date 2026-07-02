# 5×5

5x5 (StrongLifts tarzı) antrenman takip uygulaması. Google Sheets + Apps Script tabanlı bir takip sisteminin Next.js + SQLite portu.

## Özellikler

- A/B gün döngüsü, hareket başına set sayacı, otomatik son ağırlık yükleme
- Isınma önerisi (önceki maksın %80'i, 2.5kg'a yuvarlanır)
- Günün özeti ve önceki antrenmanın tüm setleri
- RIR (Reps in Reserve) ve not girişi
- Veri sayfası: kayıt listesi, düzenleme, silme
- Tek kullanıcılı şifreli giriş

## Stack

Next.js 15 (standalone) · better-sqlite3 · Tailwind v4

## Çalıştırma

```bash
npm install
APP_PASSWORD=sifre AUTH_SECRET=$(openssl rand -hex 24) npm run dev
```

Veritabanı `data/5x5.db` içinde oluşur (`DATA_DIR` ile değiştirilebilir).
İlk şema ve program (Squat/Bench/OHP/Barfiks/Dips/Row/Deadlift) otomatik kurulur.

Eski Sheets verisini almak için: `data/history.json` (gog sheets get çıktısı) koyup `npm run db:import`.

## Deploy

`main`'e push → self-hosted runner Docker imajını build edip container'ı yeniler
(`.github/workflows/deploy.yml`). Repo secrets: `APP_PASSWORD`, `AUTH_SECRET`.
