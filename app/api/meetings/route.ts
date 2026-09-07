import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { Meeting } from "@/lib/types";
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

  const meeting: Meeting = {
    id: nanoid(),
    date: body.date,
    time: body.time,
    placeId: body.placeId,
    attendeeIds: body.attendeeIds ?? [],
    amount: body.amount,
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
  return NextResponse.json(saved, { status: 201 });
}
