import { NextRequest, NextResponse } from "next/server";
import { IDLE_COOKIE_NAME, IDLE_OPTIONS_MINUTES } from "@/lib/authConfig";

export const dynamic = "force-dynamic";

// POST { minutes } → 이 기기의 "활동 없을 때 로그아웃까지 시간"을 저장한다.
export async function POST(req: NextRequest) {
  const { minutes } = await req.json().catch(() => ({ minutes: 0 }));
  if (!(IDLE_OPTIONS_MINUTES as readonly number[]).includes(Number(minutes))) {
    return NextResponse.json({ error: "선택할 수 없는 시간입니다." }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, minutes: Number(minutes) });
  res.cookies.set(IDLE_COOKIE_NAME, String(minutes), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
