import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { Place } from "@/lib/types";
import { sortPlacesByName } from "@/lib/storage/searchHelper";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

// GET /api/places?q=검색어
export async function GET(req: NextRequest) {
  const storage = await getStorage();
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const [places, meetings] = await Promise.all([
    q ? storage.searchPlaces({ q }) : sortPlacesByName(await storage.listPlaces()),
    storage.listMeetings(),
  ]);

  // 장소별 가장 최근 모임 일자 (사람 목록과 같은 방식으로 전체 모임을 한 번 훑어 집계)
  const lastMeetingByPlace = new Map<string, string>();
  for (const m of meetings) {
    for (const stop of m.stops) {
      if (!stop.placeId) continue;
      const prev = lastMeetingByPlace.get(stop.placeId);
      if (!prev || m.date > prev) lastMeetingByPlace.set(stop.placeId, m.date);
    }
  }

  const withStats = places.map((p) => ({ ...p, lastMeetingDate: lastMeetingByPlace.get(p.id) ?? null }));
  return NextResponse.json(withStats);
}

// POST /api/places - 새 장소 등록, 또는 body.id가 있으면 수정
export async function POST(req: NextRequest) {
  const storage = await getStorage();
  const body = await req.json();
  const now = new Date().toISOString();

  const existing = body.id ? await storage.getPlace(body.id) : null;

  const place: Place = {
    id: body.id ?? nanoid(),
    name: body.name,
    city: body.city,
    gu: body.gu,
    street: body.street,
    detail: body.detail,
    zonecode: body.zonecode,
    tel: body.tel,
    category: body.category,
    operatingStatus: body.operatingStatus ?? existing?.operatingStatus ?? "unconfirmed",
    lastCheckedAt: body.lastCheckedAt ?? existing?.lastCheckedAt,
    note: body.note ?? existing?.note,
    createdAt: existing?.createdAt ?? body.createdAt ?? now,
    updatedAt: now,
  };

  const saved = await storage.upsertPlace(place);
  return NextResponse.json(saved, { status: existing ? 200 : 201 });
}
