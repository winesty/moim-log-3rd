import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

// GET /api/backup → 지금 데이터 전체를 담은 백업 파일(JSON)을 다운로드로 내려준다.
export async function GET() {
  const storage = await getStorage();
  const data = await storage.exportAll();
  const filename = `moim-log-backup-${data.exportedAt.slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
