import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { Group } from "@/lib/types";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function GET() {
  const storage = await getStorage();
  const groups = await storage.listGroups();
  return NextResponse.json(groups.sort((a, b) => a.name.localeCompare(b.name, "ko")));
}

// POST /api/groups - 새 그룹 생성, body.id가 있으면 수정(이름/멤버 갱신)
export async function POST(req: NextRequest) {
  const storage = await getStorage();
  const body = await req.json();
  const now = new Date().toISOString();

  const existing = body.id ? await storage.getGroup(body.id) : null;

  const group: Group = {
    id: body.id ?? nanoid(),
    name: body.name,
    memberIds: body.memberIds ?? existing?.memberIds ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const saved = await storage.upsertGroup(group);
  return NextResponse.json(saved, { status: existing ? 200 : 201 });
}
