import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { latestMenuSnapshot } from "@/lib/storage/searchHelper";
import { Meeting, MenuItem, OrderedItem } from "@/lib/types";
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

export async function POST(req: NextRequest) {
  const storage = await getStorage();
  const body = await req.json();
  const now = new Date().toISOString();

  const orderedItems: OrderedItem[] = (body.orderedItems ?? []).filter(
    (it: OrderedItem) => it.name?.trim() && it.quantity > 0
  );

  const meeting: Meeting = {
    id: nanoid(),
    date: body.date,
    time: body.time,
    placeId: body.placeId,
    attendeeIds: body.attendeeIds ?? [],
    amount: body.amount,
    orderedItems,
    stories: (body.stories ?? []).map((s: any) => ({
      id: nanoid(),
      personId: s.personId,
      content: s.content,
      categoryIds: s.categoryIds ?? [],
      createdAt: now,
    })),
    createdAt: now,
    updatedAt: now,
  };

  const saved = await storage.upsertMeeting(meeting);

  // 주문한 메뉴가 있으면, 장소의 메뉴를 이번 모임 일자를 기준으로 갱신한다.
  // 기존 메뉴는 그대로 이어가고(날짜만 갱신), 목록에 없던 항목은 새로 추가한다.
  if (orderedItems.length > 0 && meeting.placeId) {
    const existingSnapshots = await storage.listMenuSnapshots(meeting.placeId);
    const current = latestMenuSnapshot(existingSnapshots, meeting.placeId);
    const mergedItems: MenuItem[] = current ? current.items.map((it) => ({ ...it })) : [];

    for (const ordered of orderedItems) {
      const match = mergedItems.find((it) => it.name.trim() === ordered.name.trim());
      if (match) {
        if (ordered.price != null) match.price = ordered.price;
      } else {
        mergedItems.push({ id: nanoid(), name: ordered.name.trim(), price: ordered.price });
      }
    }

    await storage.upsertMenuSnapshot({
      id: nanoid(),
      placeId: meeting.placeId,
      effectiveDate: meeting.date,
      items: mergedItems,
      createdAt: now,
    });
  }

  return NextResponse.json(saved, { status: 201 });
}
