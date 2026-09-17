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

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const storage = await getStorage();
  await storage.deletePerson(params.id);

  // 소속되어 있던 그룹에서도 함께 빼준다 (유령 멤버 방지)
  const groups = await storage.listGroups();
  for (const g of groups) {
    if (g.memberIds.includes(params.id)) {
      await storage.upsertGroup({ ...g, memberIds: g.memberIds.filter((id) => id !== params.id), updatedAt: new Date().toISOString() });
    }
  }

  return NextResponse.json({ ok: true });
}
