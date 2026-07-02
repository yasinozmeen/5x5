import { db } from "./db";

export type Day = "A" | "B";

export interface SetRecord {
  id: number;
  ts: string;
  day: string;
  exercise: string;
  set_no: number;
  reps: number;
  weight: number;
  rir: number | null;
  note: string | null;
}

export interface ExerciseDef {
  name: string;
  target_sets: number;
  target_reps: number;
  type: string;
}

// ── Durum (Sheets "Veri" U1:U3 karşılığı) ─────────────────────

function getState(key: string): string {
  const row = db().prepare("SELECT value FROM state WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? "";
}

function setState(key: string, value: string) {
  db()
    .prepare(
      "INSERT INTO state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(key, value);
}

export function istanbulNow(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" })
  );
}

function istanbulTodayPrefix(): string {
  const n = istanbulNow();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())}`;
}

// ── Program / hareket sorguları ───────────────────────────────

export function getProgram(day: Day): string[] {
  return (
    db()
      .prepare("SELECT exercise FROM program WHERE day = ? ORDER BY position")
      .all(day) as { exercise: string }[]
  ).map((r) => r.exercise);
}

export function getExercise(name: string): ExerciseDef {
  const row = db()
    .prepare("SELECT * FROM exercises WHERE name = ?")
    .get(name) as ExerciseDef | undefined;
  return row ?? { name, target_sets: 5, target_reps: 5, type: "Ana" };
}

// Son kaydedilen ağırlık (Sheets sonAgirligiYukle karşılığı)
export function getSonAgirlik(exercise: string): number {
  const row = db()
    .prepare(
      "SELECT weight FROM sets WHERE exercise = ? AND weight > 0 ORDER BY ts DESC, id DESC LIMIT 1"
    )
    .get(exercise) as { weight: number } | undefined;
  return row?.weight ?? 20;
}

// Geçmişteki maksimum ağırlık (Sheets getOncekiMaksAgirlik karşılığı)
export function getMaksAgirlik(exercise: string): number {
  const row = db()
    .prepare("SELECT MAX(weight) AS m FROM sets WHERE exercise = ?")
    .get(exercise) as { m: number | null };
  return Math.max(20, row.m ?? 20);
}

// Isınma önerisi: önceki maksın %80'i, 2.5kg'a yuvarlı (Sheets isinmaGuncelle)
export function getIsinma(exercise: string): { son: number; isinma: number; ilkAntrenman: boolean } {
  const kayitVar = !!db()
    .prepare("SELECT 1 FROM sets WHERE exercise = ? LIMIT 1")
    .get(exercise);
  const son = getMaksAgirlik(exercise);
  const isinma = Math.max(20, Math.round((son * 0.8) / 2.5) * 2.5);
  return { son, isinma, ilkAntrenman: !kayitVar };
}

// Önceki antrenmanın tüm setleri (Sheets oncekiAntrenmanGuncelle karşılığı)
export function getOncekiAntrenman(exercise: string): { tarih: string; setler: SetRecord[] } | null {
  const bugun = istanbulTodayPrefix();
  const last = db()
    .prepare(
      "SELECT substr(ts, 1, 10) AS d FROM sets WHERE exercise = ? AND substr(ts, 1, 10) < ? ORDER BY d DESC LIMIT 1"
    )
    .get(exercise, bugun) as { d: string } | undefined;
  if (!last) return null;
  const setler = db()
    .prepare(
      "SELECT * FROM sets WHERE exercise = ? AND substr(ts, 1, 10) = ? ORDER BY set_no"
    )
    .all(exercise, last.d) as SetRecord[];
  return { tarih: last.d, setler };
}

// Bugün bu günde (A/B) yapılan setler (Sheets ozetGuncelle karşılığı)
export function getBugunSetler(day: Day): Record<string, number> {
  const bugun = istanbulTodayPrefix();
  const rows = db()
    .prepare(
      "SELECT exercise, COUNT(*) AS c FROM sets WHERE day = ? AND substr(ts, 1, 10) = ? GROUP BY exercise"
    )
    .all(day, bugun) as { exercise: string; c: number }[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.exercise] = r.c;
  return out;
}

// ── Ana durum nesnesi (UI'ın tek seferde çektiği her şey) ─────

export function getFullState() {
  const day = (getState("aktif_gun") || "A") as Day;
  const hareketIdx = parseInt(getState("aktif_hareket") || "1", 10);
  const setNo = parseInt(getState("aktif_set") || "1", 10);

  const program = getProgram(day);
  const tamam = hareketIdx > program.length;
  const aktifHareket = tamam ? null : program[hareketIdx - 1];
  const def = aktifHareket ? getExercise(aktifHareket) : null;
  const bugunSetler = getBugunSetler(day);

  return {
    day,
    hareketIdx,
    setNo,
    program: program.map((name, i) => {
      const d = getExercise(name);
      return {
        name,
        position: i + 1,
        targetSets: d.target_sets,
        targetReps: d.target_reps,
        yapilan: bugunSetler[name] ?? 0,
        maksAgirlik: getMaksAgirlik(name),
      };
    }),
    antrenmanTamam: tamam,
    aktif: aktifHareket
      ? {
          hareket: aktifHareket,
          setNo,
          hedefSet: def!.target_sets,
          hedefTekrar: def!.target_reps,
          sonAgirlik: getSonAgirlik(aktifHareket),
          isinma: getIsinma(aktifHareket),
          onceki: getOncekiAntrenman(aktifHareket),
        }
      : null,
    siradaki: !tamam && hareketIdx < program.length ? program[hareketIdx] : null,
    oncekiler: program.map((name) => ({
      hareket: name,
      data: getOncekiAntrenman(name),
    })),
  };
}

export type FullState = ReturnType<typeof getFullState>;

// ── Eylemler ──────────────────────────────────────────────────

// Gün seçimi (Sheets gunSec karşılığı)
export function gunSec(day: Day) {
  setState("aktif_gun", day);
  setState("aktif_hareket", "1");
  setState("aktif_set", "1");
}

// Hareket seçimi (Sheets hareketSec karşılığı)
export function hareketSec(exercise: string) {
  const day = (getState("aktif_gun") || "A") as Day;
  const program = getProgram(day);
  const idx = program.indexOf(exercise);
  if (idx === -1) return;
  setState("aktif_hareket", String(idx + 1));
  setState("aktif_set", "1");
}

// Set tamamlama (Sheets setTamamla + kaydet + sonrakiHareket karşılığı)
export function setTamamla(input: {
  weight: number;
  reps: number;
  rir: number | null;
  note: string;
}) {
  const day = (getState("aktif_gun") || "A") as Day;
  const hareketIdx = parseInt(getState("aktif_hareket") || "1", 10);
  const setNo = parseInt(getState("aktif_set") || "1", 10);

  const program = getProgram(day);
  if (hareketIdx > program.length) return; // antrenman zaten bitti

  const hareket = program[hareketIdx - 1];
  const def = getExercise(hareket);

  const n = istanbulNow();
  const p = (x: number) => String(x).padStart(2, "0");
  const ts = `${n.getFullYear()}-${p(n.getMonth() + 1)}-${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`;

  db()
    .prepare(
      "INSERT INTO sets (ts, day, exercise, set_no, reps, weight, rir, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(ts, day, hareket, setNo, input.reps, input.weight, input.rir, input.note || null);

  if (setNo >= def.target_sets) {
    // son set → sonraki hareket (son hareketse index tavana çıkar = TAMAM)
    setState("aktif_hareket", String(hareketIdx + 1));
    setState("aktif_set", hareketIdx >= program.length ? "0" : "1");
  } else {
    setState("aktif_set", String(setNo + 1));
  }
}

// Antrenmanı sıfırla (Sheets antrenmanSifirla karşılığı)
export function antrenmanSifirla() {
  setState("aktif_hareket", "1");
  setState("aktif_set", "1");
}

// ── Veri sayfası (kayıt listesi + düzenleme) ──────────────────

export function getKayitlar(limit = 60): SetRecord[] {
  return db()
    .prepare("SELECT * FROM sets ORDER BY ts DESC, id DESC LIMIT ?")
    .all(limit) as SetRecord[];
}

export function kayitGuncelle(
  id: number,
  fields: { ts?: string; day?: string; exercise?: string; set_no?: number; reps?: number; weight?: number; rir?: number | null; note?: string | null }
) {
  const allowed = ["ts", "day", "exercise", "set_no", "reps", "weight", "rir", "note"] as const;
  const keys = allowed.filter((k) => fields[k] !== undefined);
  if (keys.length === 0) return;
  const setSql = keys.map((k) => `${k} = ?`).join(", ");
  const vals = keys.map((k) => fields[k]);
  db().prepare(`UPDATE sets SET ${setSql} WHERE id = ?`).run(...vals, id);
}

export function kayitSil(id: number) {
  db().prepare("DELETE FROM sets WHERE id = ?").run(id);
}
