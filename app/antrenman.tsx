"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { FullState } from "@/lib/logic";

const RIR_SECENEKLER = [0, 1, 2, 3, 4];

function bugunStr() {
  return new Date().toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Istanbul",
  });
}

function tarihKisa(iso: string) {
  // "2026-07-02" → "02.07"
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

export default function Antrenman({ initial }: { initial: FullState }) {
  const [s, setS] = useState<FullState>(initial);
  const [weight, setWeight] = useState<number>(initial.aktif?.sonAgirlik ?? 20);
  const [reps, setReps] = useState<number>(initial.aktif?.hedefTekrar ?? 5);
  const [rir, setRir] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);
  const hareketRef = useRef<string | null>(initial.aktif?.hareket ?? null);

  // Hareket değişince son ağırlığı ve hedef tekrarı yükle (Sheets davranışı)
  useEffect(() => {
    const h = s.aktif?.hareket ?? null;
    if (h !== hareketRef.current) {
      hareketRef.current = h;
      if (s.aktif) {
        setWeight(s.aktif.sonAgirlik);
        setReps(s.aktif.hedefTekrar);
      }
    }
  }, [s]);

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.ok) setS(await res.json());
    } finally {
      setBusy(false);
    }
  }

  async function tamamla() {
    if (!s.aktif) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 250);
    await act({ action: "setTamamla", weight, reps, rir, note });
    setRir(null);
    setNote("");
  }

  const aktif = s.aktif;

  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-5 md:max-w-2xl">
      {/* ── Üst bar ── */}
      <header className="rise mb-5 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-3xl tracking-wide text-accent">5×5</h1>
          <span className="font-num text-sm text-muted">{bugunStr()}</span>
        </div>
        <Link
          href="/veri"
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-muted transition-colors hover:text-ink"
        >
          Veri
        </Link>
      </header>

      {/* ── Gün seçimi (B1 dropdown karşılığı) ── */}
      <section className="rise mb-4 grid grid-cols-2 gap-2" style={{ animationDelay: "40ms" }}>
        {(["A", "B"] as const).map((d) => (
          <button
            key={d}
            disabled={busy}
            onClick={() => act({ action: "gunSec", day: d })}
            className={`rounded-xl border py-3 font-display text-lg tracking-wider transition-all active:scale-[0.97] ${
              s.day === d
                ? "border-accent bg-accent-soft text-accent"
                : "border-line bg-surface text-muted"
            }`}
          >
            {d} GÜNÜ
          </button>
        ))}
      </section>

      {aktif ? (
        <>
          {/* ── Aktif hareket kartı ── */}
          <section
            className="rise rounded-2xl border border-line bg-surface p-5"
            style={{ animationDelay: "80ms" }}
          >
            {/* Hareket seçici (B2 dropdown karşılığı) */}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {s.program.map((p) => (
                <button
                  key={p.name}
                  disabled={busy}
                  onClick={() => act({ action: "hareketSec", exercise: p.name })}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    p.name === aktif.hareket
                      ? "border-accent text-accent"
                      : "border-line text-muted"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <div className="flex items-end justify-between">
              <h2 className="font-display text-4xl uppercase leading-none tracking-wide">
                {aktif.hareket}
              </h2>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted">Set</div>
                <div className="font-num text-3xl font-bold leading-none text-accent">
                  {aktif.setNo}
                  <span className="text-lg text-muted">/{aktif.hedefSet}</span>
                </div>
              </div>
            </div>

            {/* Isınma satırı (A12 karşılığı) */}
            <p className="mt-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
              {aktif.isinma.ilkAntrenman
                ? "İlk antrenman — bar ile başla (20kg)"
                : `Son: ${aktif.isinma.son}kg → Isınma: ${aktif.isinma.isinma}kg`}
            </p>

            {/* Ağırlık + Tekrar (B5/B6 karşılığı) */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Stepper
                label="Ağırlık (kg)"
                value={weight}
                step={2.5}
                onChange={setWeight}
              />
              <Stepper label="Tekrar" value={reps} step={1} onChange={setReps} suffix={`/${aktif.hedefTekrar}`} />
            </div>

            {/* RIR (B8 karşılığı) */}
            <div className="mt-4">
              <div className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-muted">
                RIR — yedekte kalan tekrar
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {RIR_SECENEKLER.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRir(rir === r ? null : r)}
                    className={`rounded-lg border py-2 font-num text-sm font-bold transition-colors ${
                      rir === r
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-line bg-surface-2 text-muted"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Not (B7 karşılığı) */}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Not (isteğe bağlı)"
              className="mt-4 w-full rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
            />

            {/* SET TAMAMLA (A9 checkbox karşılığı) */}
            <button
              onClick={tamamla}
              disabled={busy}
              className={`mt-5 w-full rounded-xl bg-accent py-4 font-display text-2xl tracking-wider text-black shadow-[0_0_30px_rgba(255,107,53,0.25)] transition-transform active:scale-[0.97] disabled:opacity-50 ${
                flash ? "pop" : ""
              }`}
            >
              SET TAMAMLA
            </button>

            {/* Sıradaki (A17 karşılığı) */}
            {s.siradaki && (
              <p className="mt-3 text-center text-sm text-muted">
                Sıradaki: <span className="font-semibold text-ink">{s.siradaki}</span>
              </p>
            )}
          </section>

          {/* Önceki antrenman — aktif hareket */}
          {aktif.onceki && (
            <section
              className="rise mt-4 rounded-2xl border border-line bg-surface p-5"
              style={{ animationDelay: "120ms" }}
            >
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                Önceki {aktif.hareket} — {tarihKisa(aktif.onceki.tarih)}
              </h3>
              <SetTablosu setler={aktif.onceki.setler} />
            </section>
          )}
        </>
      ) : (
        /* ── ANTRENMAN TAMAM (A3 "TAMAM" karşılığı) ── */
        <section className="rise rounded-2xl border border-ok/40 bg-ok-soft p-8 text-center">
          <div className="font-display text-4xl tracking-wide text-ok">
            ✓ ANTRENMAN TAMAM
          </div>
          <p className="mt-2 text-sm text-muted">Tebrikler! Bugünlük bu kadar.</p>
          <button
            onClick={() => act({ action: "sifirla" })}
            className="mt-6 rounded-xl border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            Antrenmanı Sıfırla
          </button>
        </section>
      )}

      {/* ── Günün özeti (E sütunu karşılığı) ── */}
      <section
        className="rise mt-4 rounded-2xl border border-line bg-surface p-5"
        style={{ animationDelay: "160ms" }}
      >
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Günün Özeti — {s.day} Günü
        </h3>
        <ul className="space-y-2">
          {s.program.map((p) => {
            const durum =
              p.yapilan >= p.targetSets
                ? "tamam"
                : p.position === s.hareketIdx
                  ? "aktif"
                  : p.yapilan > 0
                    ? "kismen"
                    : "bekliyor";
            const ikon =
              durum === "tamam" ? "✓" : durum === "aktif" ? "▶" : durum === "kismen" ? "◐" : "○";
            const renk =
              durum === "tamam"
                ? "text-ok"
                : durum === "aktif"
                  ? "text-accent"
                  : durum === "kismen"
                    ? "text-warn"
                    : "text-muted";
            return (
              <li key={p.name} className="flex items-center justify-between text-sm">
                <span className={`flex items-center gap-2 ${durum === "bekliyor" ? "text-muted" : "text-ink"}`}>
                  <span className={`w-4 text-center font-num ${renk}`}>{ikon}</span>
                  {p.name}
                </span>
                <span className="font-num text-xs text-muted">
                  {p.yapilan}/{p.targetSets}
                  {p.maksAgirlik > 20 && (
                    <span className="ml-2 text-ink">@{p.maksAgirlik}kg</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Önceki antrenman paneli (A18+ karşılığı) ── */}
      <section
        className="rise mt-4 rounded-2xl border border-line bg-surface p-5"
        style={{ animationDelay: "200ms" }}
      >
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          Önceki Antrenman
        </h3>
        <div className="space-y-4">
          {s.oncekiler.map(({ hareket, data }) => (
            <div key={hareket}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-semibold">{hareket}</span>
                <span className="font-num text-xs text-muted">
                  {data ? tarihKisa(data.tarih) : "kayıt yok"}
                </span>
              </div>
              {data && <SetTablosu setler={data.setler} compact />}
            </div>
          ))}
        </div>
      </section>

      {aktif && (
        <button
          onClick={() => act({ action: "sifirla" })}
          className="rise mt-6 w-full text-center text-xs uppercase tracking-[0.2em] text-muted/60 transition-colors hover:text-muted"
          style={{ animationDelay: "240ms" }}
        >
          Antrenmanı sıfırla
        </button>
      )}
    </main>
  );
}

function Stepper({
  label,
  value,
  step,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] uppercase tracking-[0.2em] text-muted">{label}</div>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-line bg-surface-2">
        <button
          onClick={() => onChange(Math.max(0, Math.round((value - step) * 10) / 10))}
          className="w-11 shrink-0 text-lg text-muted transition-colors active:bg-surface active:text-ink"
        >
          −
        </button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent py-2.5 text-center font-num text-xl font-bold outline-none"
        />
        {suffix && (
          <span className="self-center pr-1 font-num text-sm text-muted">{suffix}</span>
        )}
        <button
          onClick={() => onChange(Math.round((value + step) * 10) / 10)}
          className="w-11 shrink-0 text-lg text-muted transition-colors active:bg-surface active:text-ink"
        >
          +
        </button>
      </div>
    </div>
  );
}

function SetTablosu({
  setler,
  compact,
}: {
  setler: { id: number; set_no: number; weight: number; reps: number; rir: number | null }[];
  compact?: boolean;
}) {
  return (
    <div className={`grid gap-1 ${compact ? "grid-cols-5" : "grid-cols-5"}`}>
      {setler.map((set) => (
        <div
          key={set.id}
          className="rounded-md border border-line bg-surface-2 px-1 py-1.5 text-center"
        >
          <div className="font-num text-sm font-bold">
            {set.weight === 0 ? "beden" : set.weight}
          </div>
          <div className="font-num text-[10px] text-muted">
            ×{set.reps}
            {set.rir !== null && <span className="ml-1 text-accent">R{set.rir}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
