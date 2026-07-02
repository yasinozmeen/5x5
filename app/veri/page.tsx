import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/require-auth";
import { getKayitlar } from "@/lib/logic";
import Veri from "./veri";

export const dynamic = "force-dynamic";

export default async function VeriPage() {
  if (!(await isAuthed())) redirect("/login");
  const kayitlar = getKayitlar(60);
  return <Veri initial={kayitlar} />;
}
