import { NextResponse } from "next/server";

// 미들웨어를 한 번 거치게 해서 로그인 유지 시간을 늘려주기 위한 빈 API
export const dynamic = "force-dynamic";
export async function GET() {
  return NextResponse.json({ ok: true });
}
