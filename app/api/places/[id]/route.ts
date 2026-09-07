import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { latestMenuSnapshot, pastMenuSnapshots } from "@/lib/storage/searchHelper";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const storage = await getStorage();
  const place = await storage.getPlace(params.id);
  if (!place) return NextResponse.json({ error: "not found" }, { status: 404 });

  const [menus, meetings] = await Promise.all([
    storage.listMenuSnapshots(params.id),
    storage.listMeetingsByPlace(params.id),
  ]);

  return NextResponse.json({
    place,
    currentMenu: latestMenuSnapshot(menus, params.id),
    pastMenus: pastMenuSnapshots(menus, params.id),
    meetings,
  });
}
