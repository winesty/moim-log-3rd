import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "moim_auth";
// 로그인 화면 자체와, 구글이 직접 이 주소로 리디렉션해서 들어오는 구글 연동 경로는
// 비밀번호 검사 없이 열어둔다. (둘 다 사람·장소·모임 데이터를 보여주지 않는 경로들이다)
const PUBLIC_PATHS = ["/login", "/api/login", "/api/auth/google"];

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const password = process.env.APP_PASSWORD;
  if (!password) {
    // 비밀번호를 아직 설정하지 않았으면(로컬 개발 등) 막지 않는다.
    return NextResponse.next();
  }

  const expected = await sha256Hex(password);
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === expected) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

// _next(빌드 정적 파일)와 favicon은 검사할 필요가 없어서 매처에서 제외한다.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
