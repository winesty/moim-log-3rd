import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { getStorage } from "@/lib/storage";
import { Place, MenuSnapshot } from "@/lib/types";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

// "2/6/2024" 같은 M/D/YYYY(또는 YYYY-MM-DD) 형태를 YYYY-MM-DD로 정규화
function normalizeDate(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const v = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, mm, dd, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  const d = new Date(v);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function normalizePrice(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw.replace(/[^0-9.]/g, ""));
  return isNaN(n) || n === 0 ? undefined : n;
}

interface SheetRow {
  startDate?: string;
  storeName?: string;
  city?: string;
  gu?: string;
  street?: string;
  tel?: string;
  Category?: string;
  menu?: string;
  price?: string;
  discount?: string;
  remark?: string;
}

// POST /api/import/places  body: { csvText: string }
export async function POST(req: NextRequest) {
  const storage = await getStorage();
  const { csvText } = await req.json();
  if (!csvText) return NextResponse.json({ error: "csvText가 없습니다." }, { status: 400 });

  const parsed = Papa.parse<SheetRow>(csvText, { header: true, skipEmptyLines: true });
  const rows = parsed.data.filter((r) => r.storeName && r.storeName.trim());

  const existingPlaces = await storage.listPlaces();
  const placeKey = (name: string, city?: string, gu?: string, street?: string) =>
    [name, city, gu, street].map((v) => (v ?? "").trim()).join("|");

  const placesByKey = new Map(existingPlaces.map((p) => [placeKey(p.name, p.city, p.gu, p.street), p]));

  let placesCreated = 0;
  let placesUpdated = 0;
  let menuSnapshotsCreated = 0;
  let skippedRows = 0;

  for (const row of rows) {
    const name = row.storeName!.trim();
    const city = row.city?.trim() || undefined;
    const gu = row.gu?.trim() || undefined;
    const street = row.street?.trim() || undefined;
    const key = placeKey(name, city, gu, street);
    const startDate = normalizeDate(row.startDate) ?? new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    let place = placesByKey.get(key);
    if (!place) {
      place = {
        id: nanoid(),
        name,
        city,
        gu,
        street,
        tel: row.tel?.trim() || undefined,
        category: row.Category?.trim() || undefined,
        operatingStatus: "unconfirmed",
        note: row.remark?.trim() || undefined,
        createdAt: `${startDate}T00:00:00.000Z`,
        updatedAt: now,
      };
      await storage.upsertPlace(place);
      placesByKey.set(key, place);
      placesCreated++;
    } else {
      // 새 정보가 있으면 채워넣기 (기존 값은 유지)
      const updated: Place = {
        ...place,
        tel: place.tel ?? (row.tel?.trim() || undefined),
        category: place.category ?? (row.Category?.trim() || undefined),
        note: row.remark?.trim() || place.note,
        updatedAt: now,
      };
      await storage.upsertPlace(updated);
      placesByKey.set(key, updated);
      placesUpdated++;
    }

    const menuName = row.menu?.trim();
    if (menuName) {
      const snapshot: MenuSnapshot = {
        id: nanoid(),
        placeId: place.id,
        effectiveDate: startDate,
        items: [{ id: nanoid(), name: menuName, price: normalizePrice(row.price) }],
        promotion: row.discount?.trim() || undefined,
        createdAt: now,
      };
      await storage.upsertMenuSnapshot(snapshot);
      menuSnapshotsCreated++;
    } else {
      skippedRows++;
    }
  }

  return NextResponse.json({
    rowsProcessed: rows.length,
    placesCreated,
    placesUpdated,
    menuSnapshotsCreated,
    skippedRows,
  });
}
