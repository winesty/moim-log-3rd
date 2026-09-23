import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { syncPlaceMenuFromOrder } from "@/lib/storage/menuSync";
import { Meeting, Stop, OrderedItem } from "@/lib/types";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const storage = await getStorage();
  const params = req.nextUrl.searchParams;
  const query = {
    q: params.get("q") ?? undefined,
    personId: params.get("personId") ?? undefined,
    placeId: params.get("placeId") ?? undefined,
    categoryId: params.get("categoryId") ?? undefined,
    dateFrom: params.get("dateFrom") ?? undefined,
    dateTo: params.get("dateTo") ?? undefined,
  };
  const results = await storage.search(query);
  return NextResponse.json(results);
}

// body.stops: [{ label?, placeId, amount?, orderedItems? }, ...] 최소 1개
export async function POST(req: NextRequest) {
  const storage = await getStorage();
  const body = await req.json();
  const now = new Date().toISOString();

  const rawStops = (body.stops ?? []) as any[];
  // 클라이언트가 보낸 id를 그대로 써서(있으면), 이야기의 stopId 연결이 저장 후에도 유지되게 한다.
  const stops: Stop[] = rawStops.map((s, idx) => ({
    id: s.id || nanoid(),
    label: s.label?.trim() || `${idx + 1}차`,
    placeId: s.placeId,
    amount: s.amount,
    orderedItems: (s.orderedItems ?? []).filter((it: OrderedItem) => it.name?.trim() && it.quantity > 0),
    attendeeIds: s.attendeeIds ?? [],
  }));

  // 모임 전체 참석자는 차수별 참석자를 합친 값. 클라이언트가 계산해서 보내주지만, 혹시 빠졌으면 여기서도 한 번 더 합친다.
  const attendeeIds: string[] =
    body.attendeeIds ?? Array.from(new Set(stops.flatMap((s) => s.attendeeIds ?? [])));

  // body.id/body.createdAt이 있으면 기존 모임을 편집하는 것 (편집 화면에서 보냄). 없으면 새 모임.
  const meeting: Meeting = {
    id: body.id || nanoid(),
    date: body.date,
    time: body.time,
    endDate: body.endDate || undefined,
    endTime: body.endTime || undefined,
    attendeeIds,
    stops,
    // 이야기도 마찬가지: id가 딸려 온 건 원래 작성일을 그대로 지키고, id가 없는 새 이야기만 지금 시각으로 만든다.
    stories: (body.stories ?? []).map((s: any) => ({
      id: s.id || nanoid(),
      personId: s.personId,
      content: s.content,
      categoryIds: s.categoryIds ?? [],
      createdAt: s.createdAt || now,
      stopId: s.stopId || undefined,
    })),
    createdAt: body.createdAt || now,
    updatedAt: now,
  };

  const saved = await storage.upsertMeeting(meeting);

  for (const stop of stops) {
    if (stop.orderedItems && stop.orderedItems.length > 0) {
      await syncPlaceMenuFromOrder(storage, stop.placeId, meeting.date, stop.orderedItems);
    }
  }

  return NextResponse.json(saved, { status: 201 });
}
