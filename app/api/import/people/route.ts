import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { buildImportPlan, ExistingData } from "@/lib/import/mtgCardImport";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function loadExisting(): Promise<ExistingData> {
  const storage = await getStorage();
  const [people, places, meetings, categories] = await Promise.all([
    storage.listPeople(),
    storage.listPlaces(),
    storage.listMeetings(),
    storage.listCategories(),
  ]);
  return { people, places, meetings, categories };
}

// GET /api/import/people  → 지금까지 가져온 내역(되돌리기용)
export async function GET() {
  const storage = await getStorage();
  return NextResponse.json(await storage.listImportBatches());
}

// POST /api/import/people  body: { csvText, action: "preview" | "commit", groupGatherings?: boolean }
export async function POST(req: NextRequest) {
  try {
    const { csvText, action, groupGatherings } = await req.json();
    if (!csvText || typeof csvText !== "string") {
      return NextResponse.json({ error: "csvText가 없습니다." }, { status: 400 });
    }
    const options = { groupGatherings: groupGatherings !== false };
    const existing = await loadExisting();
    const plan = buildImportPlan(csvText, existing, options);

    if (action !== "commit") {
      return NextResponse.json({ report: plan.report });
    }

    // 숫자 검증이 하나라도 맞지 않으면 아무것도 저장하지 않는다
    if (!plan.report.ok) {
      return NextResponse.json({ error: "숫자 검증에 실패해서 가져오지 않았습니다.", report: plan.report }, { status: 422 });
    }
    if (plan.report.nothingNew) {
      return NextResponse.json({ error: "새로 가져올 행이 없습니다.", report: plan.report }, { status: 409 });
    }

    const storage = await getStorage();
    await storage.bulkImport({
      categories: plan.categories,
      places: plan.places,
      people: plan.people,
      meetings: plan.meetings,
    });

    // 저장된 뒤에 다시 읽어서, 계획한 만큼 실제로 들어갔는지 확인
    const after = await storage.listImportBatches();
    const saved = after.find((b) => b.batchId === plan.batchId);
    const expected = {
      people: plan.people.length,
      places: plan.places.length,
      meetings: plan.meetings.length,
      categories: plan.categories.length,
    };
    const verified =
      !!saved &&
      saved.people === expected.people &&
      saved.places === expected.places &&
      saved.meetings === expected.meetings &&
      saved.categories === expected.categories;

    return NextResponse.json({
      batchId: plan.batchId,
      expected,
      saved: saved ?? { people: 0, places: 0, meetings: 0, categories: 0 },
      verified,
      report: plan.report,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "가져오기 중 오류가 발생했습니다." }, { status: 500 });
  }
}

// DELETE /api/import/people  body: { batchId, force?: boolean }  → 그 가져오기로 들어온 것만 되돌리기
export async function DELETE(req: NextRequest) {
  try {
    const { batchId, force } = await req.json();
    if (!batchId) return NextResponse.json({ error: "batchId가 없습니다." }, { status: 400 });
    const storage = await getStorage();
    const result = await storage.removeImportBatch(batchId, !!force);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "되돌리기 중 오류가 발생했습니다." }, { status: 500 });
  }
}
