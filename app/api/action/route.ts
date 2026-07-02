import { NextRequest, NextResponse } from "next/server";
import {
  antrenmanSifirla,
  getFullState,
  gunSec,
  hareketSec,
  setTamamla,
} from "@/lib/logic";
import { isAuthed } from "@/lib/require-auth";

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = await req.json();

  switch (body.action) {
    case "gunSec":
      if (body.day !== "A" && body.day !== "B")
        return NextResponse.json({ error: "geçersiz gün" }, { status: 400 });
      gunSec(body.day);
      break;
    case "hareketSec":
      hareketSec(String(body.exercise ?? ""));
      break;
    case "setTamamla": {
      const weight = Number(body.weight);
      const reps = Number(body.reps);
      if (!Number.isFinite(weight) || weight < 0 || !Number.isInteger(reps) || reps < 0)
        return NextResponse.json({ error: "geçersiz ağırlık/tekrar" }, { status: 400 });
      const rir =
        body.rir === null || body.rir === undefined || body.rir === ""
          ? null
          : Number(body.rir);
      setTamamla({ weight, reps, rir, note: String(body.note ?? "").trim() });
      break;
    }
    case "sifirla":
      antrenmanSifirla();
      break;
    default:
      return NextResponse.json({ error: "bilinmeyen eylem" }, { status: 400 });
  }

  return NextResponse.json(getFullState());
}
