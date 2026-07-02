/**
 * Spor Takip Sistemi - Google Sheets Apps Script
 * Telefon uyumlu, sidebar/toast YOK
 * 5x5 StrongLifts benzeri program takibi
 */

// ============================================
// SABİTLER
// ============================================
const ANTRENMAN_SHEET = "Antrenman";
const VERI_SHEET = "Veri";

// Veri sayfası hücre referansları
const AKTIF_GUN_CELL = "U1";
const AKTIF_HAREKET_CELL = "U2";
const AKTIF_SET_CELL = "U3";

// Antrenman sayfası input hücreleri
const GUN_DROPDOWN_CELL = "B1";
const AGIRLIK_INPUT_CELL = "B5";
const TEKRAR_INPUT_CELL = "B6";
const NOT_INPUT_CELL = "B7";
const CHECKBOX_CELL = "A9";
const HAREKET_DROPDOWN_CELL = "B2";

// ============================================
// ANA FONKSİYONLAR
// ============================================

/**
 * Spreadsheet açıldığında çalışır
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Spor Takip')
    .addItem('Sistemi Kur', 'sistemKur')
    .addItem('Antrenmanı Sıfırla', 'antrenmanSifirla')
    .addSeparator()
    .addItem('Trigger Kur (Checkbox Fix)', 'triggerKur')
    .addItem('Isınma Test (Debug)', 'testIsinma')
    .addToUi();
}

/**
 * Hücre düzenlendiğinde tetiklenir (Simple trigger)
 * NOT: Installable trigger kuruluysa bu çalışmaz
 */
function onEdit(e) {
  // Installable trigger varsa simple trigger'ı devre dışı bırak
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'onEditInstallable') {
      // Installable trigger var, simple trigger'ı kullanma
      return;
    }
  }

  try {
    onEditHandler(e);
  } catch (err) {
    console.log("onEdit error: " + err);
  }
}

/**
 * Installable trigger için handler
 */
function onEditInstallable(e) {
  onEditHandler(e);
}

/**
 * Ana edit handler
 */
function onEditHandler(e) {
  if (!e || !e.range) return;

  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const sheetName = sheet.getName();

  if (sheetName !== ANTRENMAN_SHEET) return;

  const cell = range.getA1Notation();

  // Gün dropdown değişti
  if (cell === GUN_DROPDOWN_CELL) {
    gunSec(range.getValue());
  }

  // Hareket dropdown değişti
  if (cell === HAREKET_DROPDOWN_CELL) {
    hareketSec(range.getValue());
  }

  // Checkbox işaretlendi - değeri direkt hücreden oku
  if (cell === CHECKBOX_CELL) {
    const checkboxValue = range.getValue();
    if (checkboxValue === true) {
      setTamamla();
    }
  }
}

/**
 * Gün seçildiğinde çağrılır
 */
function gunSec(gun) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);
  const antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);

  // Aktif durumu sıfırla
  veriSheet.getRange(AKTIF_GUN_CELL).setValue(gun);
  veriSheet.getRange(AKTIF_HAREKET_CELL).setValue(1);
  veriSheet.getRange(AKTIF_SET_CELL).setValue(1);

  // Checkbox'ı sıfırla
  antrenmanSheet.getRange(CHECKBOX_CELL).setValue(false);

  // Hareket alanı stilini sıfırla (önceki "TAMAM" yeşilini temizle)
  antrenmanSheet.getRange("A3").setBackground("#fff3e0");

  // Hareket dropdown'ını güncelle
  hareketDropdownGuncelle(gun);

  // Son ağırlığı yükle
  sonAgirligiYukle();

  // UI'ı güncelle
  uiGuncelle();
}

/**
 * Hareket dropdown'ını seçili güne göre günceller
 */
function hareketDropdownGuncelle(gun) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);
  const antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);

  // Gün indexini belirle
  const gunIndex = gun === "Salı" ? 0 : gun === "Perşembe" ? 1 : 2;

  // Günün hareketlerini al
  const programSutun = veriSheet.getRange(2, 7 + gunIndex, 10, 1).getValues();
  const hareketler = [];
  for (let i = 0; i < programSutun.length; i++) {
    if (programSutun[i][0] && programSutun[i][0] !== "") {
      hareketler.push(programSutun[i][0]);
    }
  }

  // Dropdown oluştur
  if (hareketler.length > 0) {
    const hareketRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(hareketler, true)
      .build();
    antrenmanSheet.getRange(HAREKET_DROPDOWN_CELL).setDataValidation(hareketRule);
    antrenmanSheet.getRange(HAREKET_DROPDOWN_CELL).setValue(hareketler[0]);
  }
}

/**
 * Hareket seçildiğinde çağrılır
 */
function hareketSec(secilenHareket) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);
  const antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);

  const aktifGun = veriSheet.getRange(AKTIF_GUN_CELL).getValue();
  const gunIndex = aktifGun === "Salı" ? 0 : aktifGun === "Perşembe" ? 1 : 2;

  // Seçilen hareketin index'ini bul
  const programSutun = veriSheet.getRange(2, 7 + gunIndex, 10, 1).getValues();
  let hareketIndex = 1;

  for (let i = 0; i < programSutun.length; i++) {
    if (programSutun[i][0] === secilenHareket) {
      hareketIndex = i + 1;
      break;
    }
  }

  // Aktif hareketi güncelle
  veriSheet.getRange(AKTIF_HAREKET_CELL).setValue(hareketIndex);
  veriSheet.getRange(AKTIF_SET_CELL).setValue(1);

  // Checkbox'ı sıfırla
  antrenmanSheet.getRange(CHECKBOX_CELL).setValue(false);

  // Hareket alanı stilini sıfırla
  antrenmanSheet.getRange("A3").setBackground("#fff3e0");

  // Son ağırlığı yükle
  sonAgirligiYukle();

  // UI'ı güncelle
  uiGuncelle();
}

/**
 * Set tamamlandığında çağrılır
 */
function setTamamla() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);
  const antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);

  // Çift tetikleme kontrolü - checkbox hala true mu?
  const checkboxDeger = antrenmanSheet.getRange(CHECKBOX_CELL).getValue();
  if (checkboxDeger !== true) {
    // Zaten işlenmiş veya false, hiçbir şey yapma
    return;
  }

  // Checkbox'ı HEMEN false yap (çift tetiklemeyi önle)
  antrenmanSheet.getRange(CHECKBOX_CELL).setValue(false);

  // Mevcut değerleri al
  const aktifGun = veriSheet.getRange(AKTIF_GUN_CELL).getValue();
  const aktifHareketIndex = veriSheet.getRange(AKTIF_HAREKET_CELL).getValue();
  const aktifSet = veriSheet.getRange(AKTIF_SET_CELL).getValue();

  // Antrenman zaten tamamlanmış mı kontrol et
  const hareketSayisi = getGununHareketSayisi(aktifGun);
  if (aktifHareketIndex > hareketSayisi) {
    // Antrenman bitti, hiçbir şey yapma
    return;
  }

  // Hareket adını PROGRAM TABLOSUNDAN al (A3'ten değil - case tutarlılığı için)
  const gunIndex = aktifGun === "Salı" ? 0 : aktifGun === "Perşembe" ? 1 : 2;
  const hareket = String(veriSheet.getRange(aktifHareketIndex + 1, 7 + gunIndex).getValue()).trim();

  const agirlik = antrenmanSheet.getRange(AGIRLIK_INPUT_CELL).getValue();
  const tekrar = antrenmanSheet.getRange(TEKRAR_INPUT_CELL).getValue();
  const not = antrenmanSheet.getRange(NOT_INPUT_CELL).getValue();

  // Hedef set sayısını al
  const hedefSet = getHedefSet(hareket);

  // Kaydı yap
  kaydet(aktifGun, hareket, aktifSet, tekrar, agirlik, not);

  // Not alanını sıfırla
  antrenmanSheet.getRange(NOT_INPUT_CELL).setValue("");

  // Set sayacını kontrol et
  if (aktifSet >= hedefSet) {
    // Son set tamamlandı, sonraki harekete geç
    sonrakiHareket();
  } else {
    // Set sayacını artır
    veriSheet.getRange(AKTIF_SET_CELL).setValue(aktifSet + 1);
  }

  // UI'ı güncelle
  uiGuncelle();
}

/**
 * Sonraki harekete geçer
 */
function sonrakiHareket() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);
  const antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);

  const aktifGun = veriSheet.getRange(AKTIF_GUN_CELL).getValue();
  const aktifHareketIndex = veriSheet.getRange(AKTIF_HAREKET_CELL).getValue();

  // Günün hareket sayısını al
  const hareketSayisi = getGununHareketSayisi(aktifGun);

  if (aktifHareketIndex >= hareketSayisi) {
    // Son hareket de tamamlandı - index'i hareket sayısının üstüne çıkar
    veriSheet.getRange(AKTIF_HAREKET_CELL).setValue(hareketSayisi + 1);
    veriSheet.getRange(AKTIF_SET_CELL).setValue(0);
  } else {
    // Sonraki harekete geç
    veriSheet.getRange(AKTIF_HAREKET_CELL).setValue(aktifHareketIndex + 1);
    veriSheet.getRange(AKTIF_SET_CELL).setValue(1);

    // Yeni hareketin son ağırlığını yükle
    sonAgirligiYukle();
  }
}

/**
 * Geçmiş tablosuna kayıt ekler
 */
function kaydet(gun, hareket, set, tekrar, agirlik, not) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);

  // Geçmiş bölümünün son satırını bul (K sütunundan başlıyor)
  const gecmisBaslangic = 1; // Header satırı
  const sonSatir = veriSheet.getRange("K:K").getValues().filter(String).length + 1;

  // Yeni kayıt ekle
  const tarih = new Date();
  const yeniKayit = [
    tarih,           // K - Tarih
    gun,             // L - Gün
    hareket,         // M - Hareket
    set,             // N - Set
    tekrar,          // O - Tekrar
    agirlik,         // P - Ağırlık
    true,            // Q - Tamamlandı
    not              // R - Not
  ];

  veriSheet.getRange(sonSatir, 11, 1, 8).setValues([yeniKayit]);
}

// ============================================
// YARDIMCI FONKSİYONLAR
// ============================================

/**
 * Hareketin hedef set sayısını döndürür
 */
function getHedefSet(hareket) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);

  // Hareketler tablosundan bul (A:B)
  const hareketler = veriSheet.getRange("A2:B10").getValues();

  for (let i = 0; i < hareketler.length; i++) {
    if (hareketler[i][0] === hareket) {
      return hareketler[i][1];
    }
  }
  return 5; // Varsayılan
}

/**
 * Günün toplam hareket sayısını döndürür
 */
function getGununHareketSayisi(gun) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);

  // Program tablosunu kontrol et (G:I)
  const gunIndex = gun === "Salı" ? 0 : gun === "Perşembe" ? 1 : 2;
  const programSutun = veriSheet.getRange(2, 7 + gunIndex, 10, 1).getValues();

  let sayac = 0;
  for (let i = 0; i < programSutun.length; i++) {
    if (programSutun[i][0] && programSutun[i][0] !== "") {
      sayac++;
    }
  }
  return sayac;
}

/**
 * Aktif hareketin son ağırlığını bulur ve yükler
 */
function sonAgirligiYukle() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);
  const antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);

  // Aktif hareketi al
  const aktifGun = veriSheet.getRange(AKTIF_GUN_CELL).getValue();
  const aktifHareketIndex = veriSheet.getRange(AKTIF_HAREKET_CELL).getValue();

  const gunIndex = aktifGun === "Salı" ? 0 : aktifGun === "Perşembe" ? 1 : 2;
  const hareket = veriSheet.getRange(aktifHareketIndex + 1, 7 + gunIndex).getValue();

  // Geçmiş kayıtlardan son ağırlığı bul
  const gecmis = veriSheet.getRange("K2:P500").getValues();
  let sonAgirlik = 20; // Varsayılan (boş bar)

  for (let i = gecmis.length - 1; i >= 0; i--) {
    if (gecmis[i][2] === hareket && gecmis[i][5] > 0) {
      sonAgirlik = gecmis[i][5];
      break;
    }
  }

  // Ağırlık inputuna yükle
  antrenmanSheet.getRange(AGIRLIK_INPUT_CELL).setValue(sonAgirlik);
}

/**
 * UI'ı güncel verilerle günceller
 */
function uiGuncelle() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);
  const antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);

  // Aktif değerleri al
  const aktifGun = veriSheet.getRange(AKTIF_GUN_CELL).getValue();
  const aktifHareketIndex = veriSheet.getRange(AKTIF_HAREKET_CELL).getValue();
  const aktifSet = veriSheet.getRange(AKTIF_SET_CELL).getValue();

  // Gün indexini belirle
  const gunIndex = aktifGun === "Salı" ? 0 : aktifGun === "Perşembe" ? 1 : 2;

  // Günün hareket sayısını al
  const hareketSayisi = getGununHareketSayisi(aktifGun);

  // Antrenman bitti mi kontrol et
  if (aktifHareketIndex > hareketSayisi) {
    antrenmanSheet.getRange("A3").setValue("✓ ANTRENMAN TAMAM!")
      .setFontSize(18)
      .setFontWeight("bold")
      .setBackground("#4caf50");
    antrenmanSheet.getRange("B4").setValue("");
    antrenmanSheet.getRange("A17").setValue("");
    antrenmanSheet.getRange("B17").setValue("Tebrikler!");
    antrenmanSheet.getRange("A9").setValue(false); // Checkbox'ı gizle/deaktif

    // Isınma alanını temizle
    antrenmanSheet.getRange("A12:A15").clearContent();
    antrenmanSheet.getRange("C11").setValue("");

    // Özeti güncelle
    ozetGuncelle();
    return;
  }

  // Aktif hareketi al
  const hareket = veriSheet.getRange(aktifHareketIndex + 1, 7 + gunIndex).getValue();

  if (!hareket || hareket === "") {
    antrenmanSheet.getRange("A3").setValue("✓ ANTRENMAN TAMAM!");
    ozetGuncelle();
    return;
  }

  // Hareket bilgilerini al
  const hedefSet = getHedefSet(hareket);
  const hedefTekrar = getHedefTekrar(hareket);

  // Hareket adını güncelle (trim ile boşlukları temizle)
  antrenmanSheet.getRange("A3").setValue(String(hareket).trim());

  // Hareket dropdown'ını senkronize et
  antrenmanSheet.getRange(HAREKET_DROPDOWN_CELL).setValue(String(hareket).trim());

  // Set sayacını güncelle
  antrenmanSheet.getRange("B4").setValue(aktifSet + "/" + hedefSet);

  // Hedef tekrarı güncelle
  antrenmanSheet.getRange("C6").setValue("/" + hedefTekrar);
  antrenmanSheet.getRange(TEKRAR_INPUT_CELL).setValue(hedefTekrar);

  // Isınma setlerini güncelle
  isinmaGuncelle();

  // Sıradaki hareketi güncelle
  siradakiGuncelle(aktifGun, aktifHareketIndex);

  // Özet panelini güncelle
  ozetGuncelle();
}

/**
 * Hareketin hedef tekrar sayısını döndürür
 */
function getHedefTekrar(hareket) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);

  const hareketler = veriSheet.getRange("A2:C10").getValues();

  for (let i = 0; i < hareketler.length; i++) {
    if (hareketler[i][0] === hareket) {
      return hareketler[i][2];
    }
  }
  return 5;
}

/**
 * Isınma önerisini günceller
 * Tek satır: "Son: Xkg → Isınma: Ykg (%80)"
 */
function isinmaGuncelle() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);
  const antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);

  // Aktif hareketi PROGRAM TABLOSUNDAN al (tutarlılık için)
  const aktifGun = veriSheet.getRange(AKTIF_GUN_CELL).getValue();
  const aktifHareketIndex = veriSheet.getRange(AKTIF_HAREKET_CELL).getValue();
  const gunIndex = aktifGun === "Salı" ? 0 : aktifGun === "Perşembe" ? 1 : 2;
  const hareket = veriSheet.getRange(aktifHareketIndex + 1, 7 + gunIndex).getValue();

  // Önceki antrenmanın maks ağırlığını bul
  const oncekiMaks = getOncekiMaksAgirlik(hareket);

  // Isınma hedefi = önceki maks * %80 (2.5kg'a yuvarla)
  const yuvarla = (val) => Math.max(20, Math.round(val / 2.5) * 2.5);
  const isinmaAgirlik = yuvarla(oncekiMaks * 0.8);

  // Tek satır özet - 20kg de geçerli (bar ağırlığı)
  // Kayıt var mı kontrol et
  const kayitVar = gecmisKayitVarMi(hareket);

  if (kayitVar) {
    antrenmanSheet.getRange("A12").setValue("Son: " + oncekiMaks + "kg → Isınma: " + isinmaAgirlik + "kg");
  } else {
    antrenmanSheet.getRange("A12").setValue("İlk antrenman - bar ile başla (20kg)");
  }

  // Eski satırları temizle
  antrenmanSheet.getRange("A13:A15").clearContent();
  antrenmanSheet.getRange("C11").setValue("");
}

/**
 * Hareket için geçmiş kayıt var mı kontrol eder
 */
function gecmisKayitVarMi(hareket) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);

  const hareketLower = String(hareket).trim().toLowerCase();
  if (!hareketLower || hareketLower === "") return false;

  const gecmis = veriSheet.getRange("M2:M500").getValues();

  for (let i = 0; i < gecmis.length; i++) {
    if (gecmis[i][0]) {
      const kayitHareket = String(gecmis[i][0]).trim().toLowerCase();
      if (kayitHareket === hareketLower) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Hareketin önceki antrenmanındaki maksimum ağırlığı döndürür
 * Günden bağımsız - tüm geçmişe bakar
 */
function getOncekiMaksAgirlik(hareket) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);

  // Hareket adını temizle ve lowercase yap
  const hareketLower = String(hareket).trim().toLowerCase();

  // Boş hareket kontrolü
  if (!hareketLower || hareketLower === "" || hareketLower === "undefined") {
    return 20;
  }

  const gecmis = veriSheet.getRange("K2:P500").getValues();
  let maksAgirlik = 20; // Varsayılan (boş bar)

  // Tüm kayıtları tara (günden bağımsız)
  for (let i = 0; i < gecmis.length; i++) {
    // Boş satırları atla
    if (!gecmis[i][2]) continue;

    const kayitHareket = String(gecmis[i][2]).trim().toLowerCase();
    const kayitAgirlik = Number(gecmis[i][5]) || 0;

    if (kayitHareket === hareketLower && kayitAgirlik > maksAgirlik) {
      maksAgirlik = kayitAgirlik;
    }
  }

  return maksAgirlik;
}

/**
 * Son antrenman bilgisini günceller
 */
function sonAntrenmanGuncelle(hareket) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);
  const antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);

  const gecmis = veriSheet.getRange("K2:R500").getValues();

  // Bu harekete ait son antrenmanı bul
  let sonKayitlar = [];
  let sonTarih = null;

  for (let i = gecmis.length - 1; i >= 0; i--) {
    if (gecmis[i][2] === hareket && gecmis[i][0]) {
      const tarih = gecmis[i][0];
      if (!sonTarih) {
        sonTarih = tarih;
      }

      // Aynı tarihteki tüm setleri topla
      if (tarih.getTime && sonTarih.getTime && tarih.getTime() === sonTarih.getTime()) {
        sonKayitlar.push({
          agirlik: gecmis[i][5],
          tekrar: gecmis[i][4]
        });
      } else if (!tarih.getTime || !sonTarih.getTime) {
        // Tarih karşılaştırması yapılamıyorsa string olarak kontrol et
        if (String(tarih) === String(sonTarih)) {
          sonKayitlar.push({
            agirlik: gecmis[i][5],
            tekrar: gecmis[i][4]
          });
        }
      }
    }
  }

  if (sonKayitlar.length === 0) {
    antrenmanSheet.getRange("A18").setValue("İlk antrenman");
    return;
  }

  // Formatla
  const tarihStr = Utilities.formatDate(new Date(sonTarih), "Europe/Istanbul", "dd/MM");
  const agirlik = sonKayitlar[0].agirlik;
  const tekrarlar = sonKayitlar.reverse().map(k => k.tekrar).join(",");

  antrenmanSheet.getRange("A18").setValue(tarihStr + " - " + agirlik + "kg x " + tekrarlar + " ✓");
}

/**
 * Sıradaki hareketi günceller
 */
function siradakiGuncelle(gun, aktifHareketIndex) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);
  const antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);

  const gunIndex = gun === "Salı" ? 0 : gun === "Perşembe" ? 1 : 2;
  const siradaki = veriSheet.getRange(aktifHareketIndex + 2, 7 + gunIndex).getValue();

  if (siradaki && siradaki !== "") {
    antrenmanSheet.getRange("A17").setValue("SIRADAKİ:");
    antrenmanSheet.getRange("B17").setValue(siradaki);
  } else {
    antrenmanSheet.getRange("A17").setValue("");
    antrenmanSheet.getRange("B17").setValue("Son hareket");
  }
}

/**
 * Günün özet panelini günceller (E sütunu)
 */
function ozetGuncelle() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);
  const antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);

  // Aktif değerleri al
  const aktifGun = veriSheet.getRange(AKTIF_GUN_CELL).getValue();
  const aktifHareketIndex = veriSheet.getRange(AKTIF_HAREKET_CELL).getValue();
  const aktifSet = veriSheet.getRange(AKTIF_SET_CELL).getValue();

  // Gün indexini belirle
  const gunIndex = aktifGun === "Salı" ? 0 : aktifGun === "Perşembe" ? 1 : 2;

  // Günün hareketlerini al
  const programSutun = veriSheet.getRange(2, 7 + gunIndex, 10, 1).getValues();
  const hareketler = [];
  for (let i = 0; i < programSutun.length; i++) {
    if (programSutun[i][0] && programSutun[i][0] !== "") {
      hareketler.push(programSutun[i][0]);
    }
  }

  // Bugünün geçmiş kayıtlarını al (tamamlanan setler)
  const bugun = new Date();
  const bugunGun = bugun.getDate();
  const bugunAy = bugun.getMonth();
  const bugunYil = bugun.getFullYear();
  const gecmis = veriSheet.getRange("K2:R500").getValues();

  // Her hareket için bugün kaç set yapıldı
  const tamamlananSetler = {};
  for (const hareket of hareketler) {
    tamamlananSetler[hareket] = 0;
  }

  for (let i = 0; i < gecmis.length; i++) {
    const kayitTarih = gecmis[i][0];
    if (kayitTarih && kayitTarih instanceof Date) {
      // Aynı gün mü kontrol et (gün/ay/yıl karşılaştırması)
      const ayniGun = kayitTarih.getDate() === bugunGun &&
                      kayitTarih.getMonth() === bugunAy &&
                      kayitTarih.getFullYear() === bugunYil;

      if (ayniGun && gecmis[i][1] === aktifGun) {
        const kayitHareket = String(gecmis[i][2]).toLowerCase();
        // Hareket listesinde ara (case-insensitive)
        for (const h of hareketler) {
          if (String(h).toLowerCase() === kayitHareket) {
            tamamlananSetler[h]++;
            break;
          }
        }
      }
    }
  }

  // E sütununu temizle (E3-E7)
  antrenmanSheet.getRange("E3:E7").clearContent();

  // Her hareket için satır oluştur
  let tamamlananHareket = 0;
  let toplamTamamlananSet = 0;
  let toplamHedefSet = 0;

  for (let i = 0; i < hareketler.length; i++) {
    const hareket = hareketler[i];
    const hedefSet = getHedefSet(hareket);
    const yapilanSet = tamamlananSetler[hareket];
    toplamHedefSet += hedefSet;
    toplamTamamlananSet += yapilanSet;

    let sembol = "○"; // Bekliyor
    let durum = "";
    let bgColor = "#ffffff";

    if (yapilanSet >= hedefSet) {
      // Tamamlandı
      sembol = "✓";
      durum = " (" + yapilanSet + "/" + hedefSet + ")";
      bgColor = "#c8e6c9"; // Yeşil
      tamamlananHareket++;
    } else if (i + 1 === aktifHareketIndex) {
      // Şu an aktif
      sembol = "▶";
      durum = " (" + yapilanSet + "/" + hedefSet + ") Set:" + aktifSet;
      bgColor = "#fff3e0"; // Turuncu
    } else if (yapilanSet > 0) {
      // Kısmen yapıldı
      sembol = "◐";
      durum = " (" + yapilanSet + "/" + hedefSet + ")";
      bgColor = "#fff9c4"; // Sarı
    } else {
      // Bekliyor
      durum = " (0/" + hedefSet + ")";
    }

    antrenmanSheet.getRange("E" + (3 + i))
      .setValue(sembol + " " + hareket + durum)
      .setBackground(bgColor);
  }

  // Alt bilgileri güncelle
  antrenmanSheet.getRange("E8").setValue("─────────────");
  antrenmanSheet.getRange("E9").setValue("Hareket: " + tamamlananHareket + "/" + hareketler.length);
  antrenmanSheet.getRange("E10").setValue("Set: " + toplamTamamlananSet + "/" + toplamHedefSet);

  // Antrenman tamamlandı mı?
  if (tamamlananHareket === hareketler.length) {
    antrenmanSheet.getRange("E1").setValue("✓ TAMAMLANDI!")
      .setBackground("#4caf50")
      .setFontColor("#ffffff");
  } else {
    antrenmanSheet.getRange("E1").setValue("GÜNÜN ÖZETİ")
      .setBackground("#e8f5e9")
      .setFontColor("#000000");
  }
}

// ============================================
// KURULUM FONKSİYONLARI
// ============================================

/**
 * Sistemi sıfırdan kurar
 */
function sistemKur() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Veri sayfasını oluştur veya al
  let veriSheet = ss.getSheetByName(VERI_SHEET);
  if (!veriSheet) {
    veriSheet = ss.insertSheet(VERI_SHEET);
  }
  veriSayfasiKur(veriSheet);

  // Antrenman sayfasını oluştur veya al
  let antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);
  if (!antrenmanSheet) {
    antrenmanSheet = ss.insertSheet(ANTRENMAN_SHEET, 0);
  }
  antrenmanSayfasiKur(antrenmanSheet);

  // Trigger'ı kur
  setupTrigger();

  SpreadsheetApp.getUi().alert('Sistem kuruldu! Gün seçerek başlayabilirsiniz.');
}

/**
 * Veri sayfasını kurar
 */
function veriSayfasiKur(sheet) {
  // Temizle
  sheet.clear();

  // Bölüm A: Hareketler (A1:D10)
  sheet.getRange("A1:D1").setValues([["Hareket", "Set", "Tekrar", "Tip"]]);
  sheet.getRange("A2:D8").setValues([
    ["Squat", 5, 5, "Ana"],
    ["Bench Press", 5, 5, "Ana"],
    ["OHP", 5, 5, "Ana"],
    ["Barfiks", 5, 5, "Yardımcı"],
    ["Dips", 5, 5, "Yardımcı"],
    ["Bentover Row", 5, 5, "Ana"],
    ["Sumo Deadlift", 1, 5, "Ana"]
  ]);

  // Bölüm B: Program (F1:I5)
  sheet.getRange("F1:I1").setValues([["Sıra", "Salı", "Perşembe", "Cumartesi"]]);
  sheet.getRange("F2:I5").setValues([
    [1, "Squat", "Squat", "Squat"],
    [2, "Bench Press", "OHP", "Bench Press"],
    [3, "Barfiks", "Dips", "Barfiks"],
    [4, "Sumo Deadlift", "Bentover Row", "Sumo Deadlift"]
  ]);

  // Bölüm C: Geçmiş başlıkları (K1:R1)
  sheet.getRange("K1:R1").setValues([["Tarih", "Gün", "Hareket", "Set", "Tekrar", "Ağırlık", "Tamamlandı", "Not"]]);

  // Bölüm D: Aktif Durum (T1:U4)
  sheet.getRange("T1:U4").setValues([
    ["AktifGün", "Salı"],
    ["AktifHareket", 1],
    ["AktifSet", 1],
    ["SonAğırlık", 20]
  ]);

  // Başlıkları kalın yap
  sheet.getRange("A1:D1").setFontWeight("bold");
  sheet.getRange("F1:I1").setFontWeight("bold");
  sheet.getRange("K1:R1").setFontWeight("bold");
  sheet.getRange("T1:U1").setFontWeight("bold");

  // Sütun genişliklerini ayarla
  sheet.setColumnWidth(1, 120); // A - Hareket
  sheet.setColumnWidth(11, 100); // K - Tarih
  sheet.setColumnWidth(13, 120); // M - Hareket
}

/**
 * Antrenman sayfasını kurar
 */
function antrenmanSayfasiKur(sheet) {
  // Temizle
  sheet.clear();

  // Sütun genişlikleri (telefon uyumlu)
  sheet.setColumnWidth(1, 120); // A
  sheet.setColumnWidth(2, 100); // B
  sheet.setColumnWidth(3, 80);  // C
  sheet.setColumnWidth(4, 20);  // D - boşluk
  sheet.setColumnWidth(5, 180); // E - özet

  // Row 1: Gün seçimi
  sheet.getRange("A1").setValue("GÜN:");
  sheet.getRange("B1").setValue("Salı");
  sheet.getRange("C1").setValue(new Date()).setNumberFormat("dd/MM");

  // Gün dropdown'ı
  const gunRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Salı", "Perşembe", "Cumartesi"], true)
    .build();
  sheet.getRange("B1").setDataValidation(gunRule);

  // Row 2: Hareket seçici
  sheet.getRange("A2").setValue("HAREKET:");
  const hareketRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Squat", "Bench Press", "Barfiks", "Sumo Deadlift"], true)
    .build();
  sheet.getRange("B2").setDataValidation(hareketRule);
  sheet.getRange("B2").setValue("Squat");
  sheet.getRange("A2:C2").setBackground("#e3f2fd");

  // Row 3: Hareket adı (merge KALDIRILDI - boşluk sorunu)
  sheet.getRange("A3").setValue("Squat")
    .setFontSize(18)
    .setFontWeight("bold");
  sheet.getRange("B3:C3").clearContent();

  // Row 4: Set sayacı
  sheet.getRange("A4").setValue("SET");
  sheet.getRange("B4").setValue("1/5");

  // Row 5: Ağırlık
  sheet.getRange("A5").setValue("AĞIRLIK");
  sheet.getRange("B5").setValue(20);
  sheet.getRange("C5").setValue("+2.5");

  // Row 6: Tekrar
  sheet.getRange("A6").setValue("TEKRAR");
  sheet.getRange("B6").setValue(5);
  sheet.getRange("C6").setValue("/5");

  // Row 7: Not
  sheet.getRange("A7").setValue("NOT:");
  sheet.getRange("B7:C7").merge();

  // Row 9: Checkbox (SET TAMAMLA)
  sheet.getRange("A9").insertCheckboxes();
  sheet.getRange("B9:C9").merge();
  sheet.getRange("B9").setValue("SET TAMAMLA")
    .setFontWeight("bold");

  // Row 11: Isınma başlığı
  sheet.getRange("A11:C11").merge();
  sheet.getRange("A11").setValue("═══ ISINMA ═══")
    .setFontWeight("bold")
    .setHorizontalAlignment("center");

  // Row 12-15: Isınma setleri
  sheet.getRange("A12").setValue("▪ 20kg x 10 (bar)");
  sheet.getRange("A13").setValue("▪ 10kg x 5");
  sheet.getRange("A14").setValue("▪ 15kg x 3");
  sheet.getRange("A15").setValue("▪ 18kg x 2");

  // Row 17: Sıradaki (Son antrenman kaldırıldı - özet paneli var)
  sheet.getRange("A17").setValue("SIRADAKİ:");
  sheet.getRange("B17").setValue("Bench Press");

  // Stil ayarları
  sheet.getRange("A1:C1").setBackground("#e3f2fd");
  sheet.getRange("A3:C3").setBackground("#fff3e0");
  sheet.getRange("A9:C9").setBackground("#c8e6c9");
  sheet.getRange("A11:C11").setBackground("#f5f5f5");

  // Input hücreleri vurgula
  sheet.getRange("B5").setBackground("#fffde7"); // Ağırlık input
  sheet.getRange("B6").setBackground("#fffde7"); // Tekrar input
  sheet.getRange("B7:C7").setBackground("#fffde7"); // Not input

  // Satır yüksekliklerini ayarla
  sheet.setRowHeight(3, 40); // Hareket adı
  sheet.setRowHeight(9, 35); // Checkbox

  // ============================================
  // E SÜTUNU: GÜNÜN ÖZETİ
  // ============================================
  sheet.getRange("E1").setValue("GÜNÜN ÖZETİ")
    .setFontWeight("bold")
    .setBackground("#e8f5e9");

  // Özet satırları (E3-E7)
  sheet.getRange("E3").setValue("○ Squat");
  sheet.getRange("E4").setValue("○ Bench Press");
  sheet.getRange("E5").setValue("○ Barfiks");
  sheet.getRange("E6").setValue("○ Sumo Deadlift");

  // Alt bilgi
  sheet.getRange("E8").setValue("─────────────");
  sheet.getRange("E9").setValue("Tamamlanan: 0/4");
  sheet.getRange("E10").setValue("Toplam Set: 0/16");
}

/**
 * onEdit trigger'ını kurar (Installable)
 */
function setupTrigger() {
  // Mevcut trigger'ları temizle
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    const handler = trigger.getHandlerFunction();
    if (handler === 'onEditInstallable' || handler === 'onEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  }

  // Installable trigger ekle
  ScriptApp.newTrigger('onEditInstallable')
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  console.log("Installable trigger kuruldu!");
}

/**
 * Antrenmanı sıfırlar (aynı gün tekrar başlamak için)
 */
function antrenmanSifirla() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);
  const antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);

  const aktifGun = antrenmanSheet.getRange(GUN_DROPDOWN_CELL).getValue();

  // Sıfırla
  veriSheet.getRange(AKTIF_HAREKET_CELL).setValue(1);
  veriSheet.getRange(AKTIF_SET_CELL).setValue(1);

  // Checkbox'ı sıfırla
  antrenmanSheet.getRange(CHECKBOX_CELL).setValue(false);
  antrenmanSheet.getRange(NOT_INPUT_CELL).setValue("");

  // Hareket alanı stilini sıfırla
  antrenmanSheet.getRange("A3").setBackground("#fff3e0");

  // Son ağırlığı yükle ve UI'ı güncelle
  sonAgirligiYukle();
  uiGuncelle();

  SpreadsheetApp.getUi().alert('Antrenman sıfırlandı! İlk hareketten başlıyorsunuz.');
}

// ============================================
// TEST FONKSİYONLARI
// ============================================

/**
 * Manuel test için
 */
function testGunSec() {
  gunSec("Salı");
}

function testSetTamamla() {
  setTamamla();
}

/**
 * Trigger'ı manuel kur (checkbox çalışmıyorsa bunu çalıştır)
 */
function triggerKur() {
  setupTrigger();
  SpreadsheetApp.getUi().alert('Trigger kuruldu! Artık checkbox çalışmalı.');
}

/**
 * Isınma debug - geçmiş ağırlıkları kontrol et
 */
function testIsinma() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const veriSheet = ss.getSheetByName(VERI_SHEET);
  const antrenmanSheet = ss.getSheetByName(ANTRENMAN_SHEET);

  // A3'teki değer
  const a3Deger = antrenmanSheet.getRange("A3").getValue();
  const a3Temiz = String(a3Deger).trim().toLowerCase();

  // Test için Squat ağırlığını bul
  const maksSquat = getOncekiMaksAgirlik("Squat");

  // Geçmiş kayıtları detaylı incele
  const gecmis = veriSheet.getRange("K2:P20").getValues();
  let detay = "";
  let kayitSayisi = 0;

  for (let i = 0; i < gecmis.length; i++) {
    if (gecmis[i][2]) {
      kayitSayisi++;
      const hareketRaw = gecmis[i][2];
      const hareketTemiz = String(hareketRaw).trim().toLowerCase();
      const agirlik = gecmis[i][5];
      detay += (i+1) + ": [" + hareketRaw + "] → [" + hareketTemiz + "] = " + agirlik + "kg\n";
    }
  }

  SpreadsheetApp.getUi().alert(
    "A3 değeri: [" + a3Deger + "]\n" +
    "A3 temiz: [" + a3Temiz + "]\n" +
    "───────────────\n" +
    "Toplam kayıt: " + kayitSayisi + "\n" +
    "Squat maks: " + maksSquat + "kg\n" +
    "───────────────\n" +
    "İlk 5 kayıt:\n" + detay.substring(0, 500)
  );
}
