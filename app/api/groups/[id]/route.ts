import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const storage = await getStorage();
  const group = await storage.getGroup(params.id);
  if (!group) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(group);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const storage = await getStorage();
  await storage.deleteGroup(params.id);
  return NextResponse.json({ ok: true });
}
