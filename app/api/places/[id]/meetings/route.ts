import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const storage = await getStorage();
  const meetings = await storage.listMeetingsByPlace(params.id);
  return NextResponse.json(meetings);
}
