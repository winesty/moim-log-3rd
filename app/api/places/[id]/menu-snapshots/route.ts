import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { MenuSnapshot } from "@/lib/types";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const storage = await getStorage();
  const snapshots = await storage.listMenuSnapshots(params.id);
  return NextResponse.json(snapshots);
}

// POST /api/places/:id/menu-snapshots - 새 날짜 기준 메뉴 버전 추가
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const storage = await getStorage();
  const body = await req.json();

  const snapshot: MenuSnapshot = {
    id: nanoid(),
    placeId: params.id,
    effectiveDate: body.effectiveDate,
    items: (body.items ?? []).map((it: any) => ({
      id: nanoid(),
      name: it.name,
      price: it.price,
    })),
    promotion: body.promotion,
    createdAt: new Date().toISOString(),
  };

  const saved = await storage.upsertMenuSnapshot(snapshot);
  return NextResponse.json(saved, { status: 201 });
}
