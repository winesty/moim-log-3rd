import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// PUT /api/categories/:id - 카테고리 이름 변경, 기존 모임 이야기의 #태그 텍스트도 함께 갱신
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const storage = await getStorage();
  const body = await req.json();
  const newLabel = (body.label ?? "").trim();
  if (!newLabel) return NextResponse.json({ error: "label이 필요합니다." }, { status: 400 });

  const categories = await storage.listCategories();
  const category = categories.find((c) => c.id === params.id);
  if (!category) return NextResponse.json({ error: "not found" }, { status: 404 });

  const oldLabel = category.label;
  await storage.upsertCategory({ ...category, label: newLabel });

  if (oldLabel !== newLabel) {
    const meetings = await storage.listMeetings();
    const pattern = new RegExp(`#${escapeRegExp(oldLabel)}(?=\\s|$)`, "g");
    for (const meeting of meetings) {
      let changed = false;
      const stories = meeting.stories.map((s) => {
        if (!s.categoryIds.includes(params.id)) return s;
        const newContent = s.content.replace(pattern, `#${newLabel}`);
        if (newContent !== s.content) changed = true;
        return { ...s, content: newContent };
      });
      if (changed) {
        await storage.upsertMeeting({ ...meeting, stories, updatedAt: new Date().toISOString() });
      }
    }
  }

  return NextResponse.json({ ...category, label: newLabel });
}

// DELETE /api/categories/:id - 카테고리 삭제, 기존 모임 이야기에서 태그/연결 함께 제거
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const storage = await getStorage();
  const categories = await storage.listCategories();
  const category = categories.find((c) => c.id === params.id);
  if (!category) return NextResponse.json({ error: "not found" }, { status: 404 });

  await storage.deleteCategory(params.id);

  const pattern = new RegExp(`#${escapeRegExp(category.label)}(?=\\s|$)\\s?`, "g");
  const meetings = await storage.listMeetings();
  for (const meeting of meetings) {
    let changed = false;
    const stories = meeting.stories.map((s) => {
      if (!s.categoryIds.includes(params.id)) return s;
      changed = true;
      return {
        ...s,
        categoryIds: s.categoryIds.filter((id) => id !== params.id),
        content: s.content.replace(pattern, "").trim(),
      };
    });
    if (changed) {
      await storage.upsertMeeting({ ...meeting, stories, updatedAt: new Date().toISOString() });
    }
  }

  return NextResponse.json({ ok: true });
}
