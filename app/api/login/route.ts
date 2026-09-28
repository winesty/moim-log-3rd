import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { AUTH_COOKIE_NAME, authCookieOptions } from "@/lib/authConfig";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: "서버에 APP_PASSWORD가 설정되어 있지 않습니다." }, { status: 500 });
  }
  if (password !== expected) {
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  const token = createHash("sha256").update(expected).digest("hex");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions());
  return res;
}

// 로그아웃 (필요할 때를 위해 같이 만들어둠)
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE_NAME);
  return res;
}
