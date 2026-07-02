"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(true);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <form onSubmit={submit} className="rise w-full max-w-xs">
        <h1 className="font-display text-6xl tracking-wide text-accent">5×5</h1>
        <p className="mt-1 text-sm uppercase tracking-[0.25em] text-muted">
          Antrenman Takip
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Şifre"
          autoFocus
          className={`mt-8 w-full rounded-xl border bg-surface px-4 py-3.5 font-num text-lg outline-none transition-colors focus:border-accent ${
            error ? "border-red-500" : "border-line"
          }`}
        />
        {error && (
          <p className="mt-2 text-sm text-red-400">Şifre yanlış.</p>
        )}
        <button
          type="submit"
          disabled={busy || password.length === 0}
          className="mt-4 w-full rounded-xl bg-accent py-3.5 font-display text-xl tracking-wider text-black transition-transform active:scale-[0.97] disabled:opacity-40"
        >
          GİRİŞ
        </button>
      </form>
    </main>
  );
}
