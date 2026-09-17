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
  const stops: Stop[] = rawStops.map((s, idx) => ({
    id: nanoid(),
    label: s.label?.trim() || `${idx + 1}차`,
    placeId: s.placeId,
    amount: s.amount,
    orderedItems: (s.orderedItems ?? []).filter((it: OrderedItem) => it.name?.trim() && it.quantity > 0),
  }));

  const meeting: Meeting = {
    id: nanoid(),
    date: body.date,
    time: body.time,
    endDate: body.endDate || undefined,
    endTime: body.endTime || undefined,
    attendeeIds: body.attendeeIds ?? [],
    stops,
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

  for (const stop of stops) {
    if (stop.orderedItems && stop.orderedItems.length > 0) {
      await syncPlaceMenuFromOrder(storage, stop.placeId, meeting.date, stop.orderedItems);
    }
  }

  return NextResponse.json(saved, { status: 201 });
}
