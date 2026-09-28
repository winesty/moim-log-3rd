// 로그인 관련 공통 설정 (미들웨어, 로그인 API, 설정 화면이 같이 쓴다)
export const AUTH_COOKIE_NAME = "moim_auth";
// "이 기기는 몇 분 동안 활동이 없으면 로그아웃할지"를 기억해두는 쿠키 (설정 화면에서 고른 값)
export const IDLE_COOKIE_NAME = "moim_idle";

// 설정 화면에서 고를 수 있는 시간(분). 대화 내용이 있는 기록이라 최대 24시간으로 제한한다.
export const IDLE_OPTIONS_MINUTES = [10, 30, 60, 180, 480, 1440] as const;
export const MAX_IDLE_MINUTES = 1440;

/** 아직 아무것도 고르지 않은 기기의 기본값. Vercel 환경변수 APP_IDLE_MINUTES가 있으면 그 값, 없으면 60분. */
export function defaultIdleMinutes(): number {
  const minutes = Number(process.env.APP_IDLE_MINUTES);
  const safe = Number.isFinite(minutes) && minutes > 0 ? minutes : 60;
  return Math.min(MAX_IDLE_MINUTES, Math.max(10, Math.round(safe)));
}

/** 쿠키에 저장된 값이 허용된 선택지일 때만 쓰고, 아니면 기본값으로 돌아간다. */
export function resolveIdleMinutes(cookieValue?: string | null): number {
  const n = Number(cookieValue);
  if ((IDLE_OPTIONS_MINUTES as readonly number[]).includes(n)) return n;
  return defaultIdleMinutes();
}

export function formatIdleMinutes(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}시간`;
  return `${minutes}분`;
}

export function authCookieOptions(idleMinutes: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: idleMinutes * 60,
  };
}
