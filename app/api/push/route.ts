import { NextRequest, NextResponse } from "next/server";
import { isAuthed } from "@/lib/require-auth";
import {
  VAPID_PUBLIC,
  saveSubscription,
  removeSubscription,
  scheduleRestAlarm,
  cancelRestAlarm,
  type PushSub,
} from "@/lib/push";

// Public VAPID anahtarını döndür (istemci abone olurken kullanır).
export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "auth" }, { status: 401 });
  return NextResponse.json({ key: VAPID_PUBLIC });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = await req.json();

  switch (body.action) {
    case "subscribe": {
      const sub = body.sub as PushSub | undefined;
      if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth)
        return NextResponse.json({ error: "geçersiz abonelik" }, { status: 400 });
      saveSubscription(sub);
      break;
    }
    case "unsubscribe": {
      const endpoint = String(body.endpoint ?? "");
      if (endpoint) removeSubscription(endpoint);
      break;
    }
    case "schedule": {
      // Dinlenme sayacı başladı/yeniden başladı — kalan saniye sonra push gönder.
      const seconds = Number(body.seconds);
      if (!Number.isFinite(seconds) || seconds <= 0)
        return NextResponse.json({ error: "geçersiz süre" }, { status: 400 });
      scheduleRestAlarm(seconds);
      break;
    }
    case "cancel":
      cancelRestAlarm();
      break;
    default:
      return NextResponse.json({ error: "bilinmeyen eylem" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
