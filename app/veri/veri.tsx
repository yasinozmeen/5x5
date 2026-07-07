"use client";

import { useState } from "react";
import Link from "next/link";
import type { SetRecord } from "@/lib/logic";

export default function Veri({ initial }: { initial: SetRecord[] }) {
  const [rows, setRows] = useState<SetRecord[]>(initial);
  const [editing, setEditing] = useState<SetRecord | null>(null);
  const [limit, setLimit] = useState(60);
  const [busy, setBusy] = useState(false);

  async function reload(l = limit) {
    const res = await fetch(`/api/kayitlar?limit=${l}`);
    if (res.ok) setRows(await res.json());
  }

  async function dahaFazla() {
    const l = limit + 100;
    setLimit(l);
    await reload(l);
  }

  async function sil(id: number) {
    if (!confirm("Bu kayıt silinsin mi?")) return;
    setBusy(true);
    await fetch(`/api/kayitlar?id=${id}`, { method: "DELETE" });
    await reload();
    setBusy(false);
  }

  async function kaydet(r: SetRecord) {
    setBusy(true);
    await fetch("/api/kayitlar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: r.id,
        fields: {
          ts: r.ts,
          day: r.day,
          exercise: r.exercise,
          set_no: r.set_no,
          reps: r.reps,
          weight: r.weight,
          rir: r.rir,
          note: r.note,
        },
      }),
    });
    setEditing(null);
    await reload();
    setBusy(false);
  }

  // Tarihe göre grupla
  const gruplar: { tarih: string; kayitlar: SetRecord[] }[] = [];
  for (const r of rows) {
    const t = r.ts.slice(0, 10);
    const g = gruplar[gruplar.length - 1];
    if (g && g.tarih === t) g.kayitlar.push(r);
    else gruplar.push({ tarih: t, kayitlar: [r] });
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-5 md:max-w-2xl">
      <header className="rise mb-5 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl tracking-wide text-accent">VERİ</h1>
          <span className="font-num text-sm text-muted">{rows.length} kayıt</span>
        </div>
        <Link
          href="/"
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-muted transition-colors hover:text-ink"
        >
          ← Antrenman
        </Link>
      </header>

      <div className="rise space-y-5" style={{ animationDelay: "60ms" }}>
        {gruplar.map((g) => (
          <section key={g.tarih} className="rounded-2xl border border-line bg-surface p-4">
            <h2 className="mb-3 flex items-baseline justify-between">
              <span className="font-num text-sm font-bold text-ink">
                {g.tarih.split("-").reverse().join(".")}
              </span>
              <span className="text-xs text-muted">{g.kayitlar[0].day}</span>
            </h2>
            <ul>
              {g.kayitlar.map((r, i) => {
                // Bir önceki satır farklı hareketse belirgin ayraç + boşluk;
                // aynı hareketin setleri arasında ince çizgi kalır.
                const prev = i > 0 ? g.kayitlar[i - 1] : null;
                const yeniHareket = prev !== null && prev.exercise !== r.exercise;
                return (
                <li
                  key={r.id}
                  className={`flex items-center gap-2 text-sm ${
                    i === 0
                      ? "pb-2"
                      : yeniHareket
                        ? "mt-2.5 border-t-2 border-white/15 pt-3 pb-2"
                        : "border-t border-line pt-2 pb-2"
                  }`}
                >
                  <span className="font-num w-10 shrink-0 text-xs text-muted">
                    {r.ts.slice(11, 16)}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {r.exercise}
                    {r.note && (
                      <span className="ml-1.5 text-xs italic text-muted">“{r.note}”</span>
                    )}
                  </span>
                  <span className="font-num shrink-0 text-xs text-muted">S{r.set_no}</span>
                  <span className="font-num shrink-0 font-bold">
                    {r.weight === 0 ? "beden" : `${r.weight}kg`}
                    <span className="text-muted">×{r.reps}</span>
                  </span>
                  {r.rir !== null && (
                    <span className="font-num shrink-0 text-xs text-accent">R{r.rir}</span>
                  )}
                  <button
                    onClick={() => setEditing({ ...r })}
                    className="shrink-0 rounded-md border border-line px-2 py-1 text-xs text-muted transition-colors hover:text-ink"
                  >
                    Düzenle
                  </button>
                </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <button
        onClick={dahaFazla}
        className="mt-5 w-full rounded-xl border border-line bg-surface py-3 text-sm font-semibold text-muted transition-colors hover:text-ink"
      >
        Daha fazla göster
      </button>

      {/* ── Düzenleme paneli ── */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:items-center"
          onClick={() => setEditing(null)}
        >
          <div
            className="rise w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 md:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 font-display text-xl tracking-wide">
              KAYIT #{editing.id}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Alan label="Tarih & saat">
                <input
                  value={editing.ts}
                  onChange={(e) => setEditing({ ...editing, ts: e.target.value })}
                  className="alan font-num"
                />
              </Alan>
              <Alan label="Gün">
                <select
                  value={editing.day}
                  onChange={(e) => setEditing({ ...editing, day: e.target.value })}
                  className="alan"
                >
                  {["A", "B", editing.day]
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                </select>
              </Alan>
              <Alan label="Hareket">
                <input
                  value={editing.exercise}
                  onChange={(e) => setEditing({ ...editing, exercise: e.target.value })}
                  className="alan"
                />
              </Alan>
              <Alan label="Set no">
                <input
                  type="number"
                  value={editing.set_no}
                  onChange={(e) => setEditing({ ...editing, set_no: Number(e.target.value) })}
                  className="alan font-num"
                />
              </Alan>
              <Alan label="Ağırlık (kg)">
                <input
                  type="number"
                  step="0.5"
                  value={editing.weight}
                  onChange={(e) => setEditing({ ...editing, weight: Number(e.target.value) })}
                  className="alan font-num"
                />
              </Alan>
              <Alan label="Tekrar">
                <input
                  type="number"
                  value={editing.reps}
                  onChange={(e) => setEditing({ ...editing, reps: Number(e.target.value) })}
                  className="alan font-num"
                />
              </Alan>
              <Alan label="RIR (boş = yok)">
                <input
                  type="number"
                  value={editing.rir ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      rir: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="alan font-num"
                />
              </Alan>
              <Alan label="Not">
                <input
                  value={editing.note ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, note: e.target.value || null })
                  }
                  className="alan"
                />
              </Alan>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => sil(editing.id)}
                disabled={busy}
                className="rounded-xl border border-red-500/40 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
              >
                Sil
              </button>
              <button
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold text-muted"
              >
                Vazgeç
              </button>
              <button
                onClick={() => kaydet(editing)}
                disabled={busy}
                className="flex-1 rounded-xl bg-accent py-3 font-display text-lg tracking-wider text-black transition-transform active:scale-[0.97] disabled:opacity-40"
              >
                KAYDET
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}

function Alan({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}
