import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const storage = await getStorage();
  const person = await storage.getPerson(params.id);
  if (!person) return NextResponse.json({ error: "not found" }, { status: 404 });
  const meetings = await storage.search({ personId: params.id });
  return NextResponse.json({ person, meetings });
}
