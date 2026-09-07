import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { Place } from "@/lib/types";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

// GET /api/places?q=검색어
export async function GET(req: NextRequest) {
  const storage = await getStorage();
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const places = q ? await storage.searchPlaces({ q }) : await storage.listPlaces();
  return NextResponse.json(places);
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
