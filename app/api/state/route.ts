import { NextResponse } from "next/server";
import { getFullState } from "@/lib/logic";
import { isAuthed } from "@/lib/require-auth";

export async function GET() {
  if (!(await isAuthed())) return NextResponse.json({ error: "auth" }, { status: 401 });
  return NextResponse.json(getFullState());
}
