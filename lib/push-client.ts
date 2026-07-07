// Tarayıcı tarafı Web Push yardımcıları (istemci).

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export type PushDurum = "unsupported" | "default" | "granted" | "denied";

export function pushDurumu(): PushDurum {
  if (
    typeof window === "undefined" ||
    typeof Notification === "undefined" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  )
    return "unsupported";
  return Notification.permission as PushDurum;
}

// İzin iste + abone ol. Bir kullanıcı dokunuşu içinde çağrılmalı (iOS şartı).
export async function pushAc(): Promise<PushDurum> {
  if (pushDurumu() === "unsupported") return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm as PushDurum;

  const reg = await navigator.serviceWorker.ready;
  const { key } = await (await fetch("/api/push")).json();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    });
  }
  await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "subscribe", sub: sub.toJSON() }),
  });
  return "granted";
}

// Dinlenme süresi (saniye) sonunda push gönderilmesini planla.
export async function pushPlanla(seconds: number) {
  if (pushDurumu() !== "granted") return;
  try {
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "schedule", seconds }),
    });
  } catch {
    /* ağ hatası — sessizce geç */
  }
}

export async function pushIptal() {
  if (pushDurumu() !== "granted") return;
  try {
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
  } catch {
    /* ağ hatası — sessizce geç */
  }
}
