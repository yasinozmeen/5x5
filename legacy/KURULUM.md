# Spor Takip Sistemi - Kurulum Rehberi

## Adım 1: Google Sheets Oluştur
1. [Google Sheets](https://sheets.google.com) aç
2. Yeni boş spreadsheet oluştur
3. İsim ver: "5x5 Spor Takip"

## Adım 2: Apps Script Ekle
1. **Uzantılar** > **Apps Script** menüsüne tıkla
2. Açılan editörde tüm varsayılan kodu sil
3. `/Users/yasin/5x5makro/spor_takip.gs` dosyasındaki kodu kopyala-yapıştır
4. **Ctrl+S** ile kaydet
5. Proje adını "Spor Takip Script" olarak değiştir

## Adım 3: Sistemi Kur
1. Apps Script editöründen Google Sheets'e dön
2. Sayfayı yenile (F5)
3. Menüde **Spor Takip** görünecek (30 saniye bekle)
4. **Spor Takip** > **Sistemi Kur** tıkla
5. İzin iste diyaloğu çıkarsa:
   - "Gelişmiş" tıkla
   - "[Proje adı] güvenli değil" linkine tıkla
   - "İzin ver" tıkla

## Adım 4: Kullanım

### Antrenman Başlatma
1. B1 hücresinden gün seç (Salı/Perşembe/Cumartesi)
2. Sistem otomatik olarak ilk hareketi yükler

### Set Tamamlama
1. **B5**: Ağırlık gir (kg)
2. **B6**: Tekrar sayısı (başarısız set için değiştir)
3. **B7**: Not ekle (isteğe bağlı)
4. **A9**: Checkbox'ı işaretle = Set kaydedilir

### Isınma
- Isınma setleri otomatik hesaplanır
- Tüm hareketler için gösterilir

### Akış
```
Set 1 tamamla → Set 2 → Set 3 → Set 4 → Set 5 → Sonraki Hareket
```

## Sayfa Yapısı

### "Antrenman" Sayfası (Ana UI)
- Telefon uyumlu dikey düzen
- Tüm kontroller hücrelerde

### "Veri" Sayfası (Database)
- A-D: Hareket listesi
- F-I: Günlük program
- K-R: Geçmiş kayıtlar
- T-U: Aktif durum

## Sorun Giderme

### Menü görünmüyor
- Sayfayı yenile
- 30 saniye bekle
- Apps Script'i tekrar aç/kapat

### Checkbox çalışmıyor
- onEdit trigger'ı kontrol et
- Apps Script editöründe "Çalıştır" > "testSetTamamla" dene

### İzin hatası
- Apps Script'te "Hizmetler" > "Sheets API" ekle
- İzinleri tekrar ver

## Özelleştirme

### Hareket Ekle/Değiştir
"Veri" sayfasında A2:D sütunlarını düzenle

### Program Değiştir
"Veri" sayfasında G2:I5 aralığını düzenle

### Ağırlık Artışı
C5 hücresindeki "+2.5" değerini değiştir
