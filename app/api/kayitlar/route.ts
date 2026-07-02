import { NextRequest, NextResponse } from "next/server";
import { getKayitlar, kayitGuncelle, kayitSil } from "@/lib/logic";
import { isAuthed } from "@/lib/require-auth";

export async function GET(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const limit = Math.min(500, Number(req.nextUrl.searchParams.get("limit")) || 60);
  return NextResponse.json(getKayitlar(limit));
}

export async function PATCH(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const body = await req.json();
  const id = Number(body.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id" }, { status: 400 });
  kayitGuncelle(id, body.fields ?? {});
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthed())) return NextResponse.json({ error: "auth" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "id" }, { status: 400 });
  kayitSil(id);
  return NextResponse.json({ ok: true });
}
