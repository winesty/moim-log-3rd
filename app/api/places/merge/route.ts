import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

// POST { keepId, removeId, overrides? } → removeId를 keepId로 합치고 removeId는 지운다.
export async function POST(req: NextRequest) {
  const { keepId, removeId, overrides } = await req.json();
  if (!keepId || !removeId) return NextResponse.json({ error: "keepId, removeId가 필요합니다." }, { status: 400 });
  try {
    const storage = await getStorage();
    const result = await storage.mergePlaces(keepId, removeId, overrides ?? {});
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "합치기 중 오류가 발생했습니다." }, { status: 400 });
  }
}
