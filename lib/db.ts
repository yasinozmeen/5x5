import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "5x5.db");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  migrate(_db);
  return _db;
}

function migrate(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS exercises (
      name TEXT PRIMARY KEY,
      target_sets INTEGER NOT NULL DEFAULT 5,
      target_reps INTEGER NOT NULL DEFAULT 5,
      type TEXT NOT NULL DEFAULT 'Ana'
    );
    CREATE TABLE IF NOT EXISTS program (
      day TEXT NOT NULL,
      position INTEGER NOT NULL,
      exercise TEXT NOT NULL,
      PRIMARY KEY (day, position)
    );
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
    CREATE TABLE IF NOT EXISTS state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    -- Web Push abonelikleri (endpoint tekil). Tek kullanıcı ama birden çok
    -- cihaz/tarayıcı abone olabilir diye endpoint bazlı saklanır.
    CREATE TABLE IF NOT EXISTS push_sub (
      endpoint TEXT PRIMARY KEY,
      sub TEXT NOT NULL
    );
  `);

  const count = (d.prepare("SELECT COUNT(*) AS c FROM exercises").get() as { c: number }).c;
  if (count === 0) seed(d);
}

// Sheets "Veri" sayfasındaki A:D (hareketler) ve F:H (program) tablolarının birebir karşılığı
function seed(d: Database.Database) {
  const ex = d.prepare(
    "INSERT INTO exercises (name, target_sets, target_reps, type) VALUES (?, ?, ?, ?)"
  );
  ex.run("Squat", 5, 5, "Ana");
  ex.run("Bench Press", 5, 5, "Ana");
  ex.run("OHP", 5, 5, "Ana");
  ex.run("Barfiks", 5, 5, "Yardımcı");
  ex.run("Dips", 5, 5, "Yardımcı");
  ex.run("Bentover Row", 5, 5, "Ana");
  ex.run("Sumo Deadlift", 1, 5, "Ana");

  const pr = d.prepare("INSERT INTO program (day, position, exercise) VALUES (?, ?, ?)");
  const A = ["Squat", "Bench Press", "Sumo Deadlift", "Barfiks"];
  const B = ["Squat", "OHP", "Bentover Row", "Dips"];
  A.forEach((e, i) => pr.run("A", i + 1, e));
  B.forEach((e, i) => pr.run("B", i + 1, e));

  const st = d.prepare("INSERT INTO state (key, value) VALUES (?, ?)");
  st.run("aktif_gun", "A");
  st.run("aktif_hareket", "1");
  st.run("aktif_set", "1");
}
