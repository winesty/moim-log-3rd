import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

// POST { password, confirmText } → 모든 데이터를 영구 삭제한다. 휴지통을 거치지 않는다.
export async function POST(req: NextRequest) {
  const { password, confirmText } = await req.json().catch(() => ({}));

  if (confirmText !== "전체 삭제") {
    return NextResponse.json({ error: '"전체 삭제"라고 정확히 입력해야 진행돼요.' }, { status: 400 });
  }
  const appPassword = process.env.APP_PASSWORD;
  if (appPassword && password !== appPassword) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const storage = await getStorage();
  await storage.deleteAll();
  return NextResponse.json({ ok: true });
}
