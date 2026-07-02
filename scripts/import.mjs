/**
 * Sheets "Veri!K:R" geçmişini SQLite'a aktarır.
 * Kaynak: scripts/history.json (gog sheets get çıktısı, FORMATTED_VALUE)
 * Tarih formatları: "dd.MM HH:mm" (yıl yok → kronolojik sıradan türetilir)
 *                   "dd.MM.yyyy HH:mm"
 */
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, "5x5.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    day TEXT NOT NULL,
    exercise TEXT NOT NULL,
    set_no INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    weight REAL NOT NULL,
    rir INTEGER,
    note TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sets_exercise_ts ON sets (exercise, ts);
`);

// history.json kişisel veri içerir — repoda tutulmaz (pi: ~/5x5-data/history.json)
const HISTORY = process.env.HISTORY_JSON || path.join(process.cwd(), "data", "history.json");
const raw = JSON.parse(fs.readFileSync(HISTORY));
const rows = raw.values.slice(1); // header'ı at

// İlk kaydın yılı: veri Ocak'ta başlıyor, bugün 2026 → 2026.
// Ay bir önceki kayıttan küçüğe düşerse yıl +1 (yıl dönümü).
let year = 2026;
let prevMonth = null;

const parsed = [];
for (const r of rows) {
  if (!r || !r[0] || !r[2]) continue;
  const [dPart, tPart = "00:00"] = String(r[0]).split(" ");
  const seg = dPart.split(".");
  let dd, mm;
  if (seg.length === 3) {
    dd = +seg[0]; mm = +seg[1]; year = +seg[2];
  } else {
    dd = +seg[0]; mm = +seg[1];
    if (prevMonth !== null && mm < prevMonth) year += 1;
  }
  prevMonth = mm;

  const p = (x) => String(x).padStart(2, "0");
  const ts = `${year}-${p(mm)}-${p(dd)} ${tPart.length === 5 ? tPart + ":00" : tPart}`;

  // Gün: "A Günü"/"B Günü" → "A"/"B"; eski haftagünü değerleri olduğu gibi kalır
  let day = String(r[1] ?? "").trim();
  if (day === "A Günü") day = "A";
  if (day === "B Günü") day = "B";

  // Not alanındaki "RIR:x | not" formatını ayrıştır
  let note = r[7] ? String(r[7]).trim() : null;
  let rir = null;
  if (note) {
    const m = note.match(/^RIR:(\d+)\s*(?:\|\s*(.*))?$/);
    if (m) {
      rir = +m[1];
      note = m[2]?.trim() || null;
    }
  }

  parsed.push({
    ts,
    day,
    exercise: String(r[2]).trim(),
    set_no: +r[3] || 0,
    reps: +r[4] || 0,
    weight: +String(r[5] ?? "0").replace(",", ".") || 0,
    rir,
    note,
  });
}

const existing = db.prepare("SELECT COUNT(*) AS c FROM sets").get().c;
if (existing > 0) {
  console.error(`sets tablosunda zaten ${existing} kayıt var — import atlandı.`);
  console.error("Yeniden almak için önce tabloyu boşalt: DELETE FROM sets;");
  process.exit(1);
}

const ins = db.prepare(
  "INSERT INTO sets (ts, day, exercise, set_no, reps, weight, rir, note) VALUES (@ts, @day, @exercise, @set_no, @reps, @weight, @rir, @note)"
);
db.transaction(() => parsed.forEach((r) => ins.run(r)))();

console.log(`${parsed.length} kayıt aktarıldı.`);
console.log("İlk:", parsed[0].ts, "Son:", parsed[parsed.length - 1].ts);
