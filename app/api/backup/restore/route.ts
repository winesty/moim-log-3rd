import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST 백업 파일(JSON) 전체를 그대로 body로 받아, 지금 데이터를 통째로 그 내용으로 바꾼다.
export async function POST(req: NextRequest) {
  const data = await req.json().catch(() => null);
  if (!data || !Array.isArray(data.people) || !Array.isArray(data.places) || !Array.isArray(data.meetings)) {
    return NextResponse.json({ error: "올바른 백업 파일이 아닙니다." }, { status: 400 });
  }
  const storage = await getStorage();
  await storage.restoreAll(data);
  return NextResponse.json({
    ok: true,
    counts: {
      people: data.people.length,
      places: data.places.length,
      meetings: data.meetings.length,
      categories: data.categories?.length ?? 0,
      groups: data.groups?.length ?? 0,
    },
  });
}
