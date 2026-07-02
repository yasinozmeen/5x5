import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/require-auth";
import { getFullState } from "@/lib/logic";
import Antrenman from "./antrenman";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await isAuthed())) redirect("/login");
  const state = getFullState();
  return <Antrenman initial={state} />;
}
