import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "code가 없습니다." }, { status: 400 });

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env;
  const oAuth2Client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);

  const { tokens } = await oAuth2Client.getToken(code);

  return new NextResponse(
    `<html><body style="font-family: sans-serif; padding: 40px;">
      <h2>구글 드라이브 연동 완료</h2>
      <p>아래 refresh token을 복사해서 Vercel의 GOOGLE_REFRESH_TOKEN 환경변수 값으로 넣고 재배포하세요.</p>
      <pre style="background:#f4f1ea; padding:16px; border-radius:8px; white-space:pre-wrap;">${tokens.refresh_token ?? "(refresh_token이 발급되지 않았습니다. 구글 계정 설정에서 앱 연결을 해제한 뒤 다시 시도하세요.)"}</pre>
    </body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } }
  );
}
