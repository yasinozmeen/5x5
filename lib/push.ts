import webpush from "web-push";
import { db } from "./db";

// VAPID anahtarları. Public key istemciye gömülü (public olması sorun değil),
// private key sunucuda env'den gelir. Env yoksa (lokal dev) push devre dışı.
export const VAPID_PUBLIC =
  process.env.VAPID_PUBLIC_KEY ||
  "BClbetpdbrJvvBVHG6IBRWo2FayDixcH1bIfozAbue2QGKC4kxbWl2f9yR7zgCyrCMajnvWd2DQUgP2P-tOs1kU";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:yasinozmeen3@gmail.com";

let configured = false;
function ensureConfigured(): boolean {
  if (!VAPID_PRIVATE) return false; // private key yoksa push gönderilemez
  if (!configured) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    configured = true;
  }
  return true;
}

export interface PushSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function saveSubscription(sub: PushSub) {
  db()
    .prepare(
      "INSERT INTO push_sub (endpoint, sub) VALUES (?, ?) ON CONFLICT(endpoint) DO UPDATE SET sub = excluded.sub"
    )
    .run(sub.endpoint, JSON.stringify(sub));
}

export function removeSubscription(endpoint: string) {
  db().prepare("DELETE FROM push_sub WHERE endpoint = ?").run(endpoint);
}

function allSubscriptions(): PushSub[] {
  const rows = db().prepare("SELECT sub FROM push_sub").all() as { sub: string }[];
  return rows.map((r) => JSON.parse(r.sub) as PushSub);
}

// Tüm abone cihazlara bildirim gönder. Ölü abonelikleri (404/410) temizler.
async function sendToAll(payload: Record<string, unknown>) {
  if (!ensureConfigured()) return;
  const data = JSON.stringify(payload);
  await Promise.all(
    allSubscriptions().map(async (sub) => {
      try {
        await webpush.sendNotification(sub, data);
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) removeSubscription(sub.endpoint);
      }
    })
  );
}

// ── Zamanlanmış dinlenme alarmı ───────────────────────────────
// Tek kullanıcı olduğu için tek bir global zamanlayıcı yeterli. Sayaç yeniden
// başlarsa önceki iptal edilir. Süre kısa (dakikalar) olduğundan sunucu
// setTimeout'u güvenilir; container yeniden başlarsa alarm düşer (kabul edilir).
let restTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleRestAlarm(seconds: number) {
  cancelRestAlarm();
  const ms = Math.max(1, Math.round(seconds)) * 1000;
  restTimer = setTimeout(() => {
    restTimer = null;
    void sendToAll({
      title: "Dinlenme bitti 💪",
      body: "Sıradaki set için hazırsın.",
      tag: "rest-timer",
    });
  }, ms);
}

export function cancelRestAlarm() {
  if (restTimer) {
    clearTimeout(restTimer);
    restTimer = null;
  }
}
