// 로그인 관련 공통 설정 (미들웨어와 로그인 API가 같이 쓴다)
export const AUTH_COOKIE_NAME = "moim_auth";

/**
 * 마지막으로 앱을 쓴 뒤 몇 분 동안 로그인이 유지되는지.
 * Vercel 환경변수 APP_IDLE_MINUTES로 바꿀 수 있고, 없으면 60분이다.
 * (모임을 길게 입력하는 도중에 끊기지 않도록 최소 10분으로 제한한다)
 */
export function getIdleSeconds(): number {
  const minutes = Number(process.env.APP_IDLE_MINUTES);
  const safe = Number.isFinite(minutes) && minutes > 0 ? Math.max(10, minutes) : 60;
  return Math.round(safe * 60);
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: getIdleSeconds(),
  };
}
