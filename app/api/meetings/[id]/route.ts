import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { syncPlaceMenuFromOrder } from "@/lib/storage/menuSync";
import { OrderedItem, Stop } from "@/lib/types";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const storage = await getStorage();
  const meeting = await storage.getMeeting(params.id);
  if (!meeting) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(meeting);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const storage = await getStorage();
  const existing = await storage.getMeeting(params.id);
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json();
  const now = new Date().toISOString();

  const appendedStories = (body.newStories ?? []).map((s: any) => ({
    id: nanoid(),
    personId: s.personId,
    content: s.content,
    categoryIds: s.categoryIds ?? [],
    createdAt: now,
    stopId: s.stopId || undefined,
  }));

  let stops = existing.stops;

  // 새 차수(2차/3차 등) 추가. 참석자를 따로 지정하지 않으면 직전 차수 인원을 그대로 데려온다
  // (차수마다 참석자가 달라질 수 있다는 걸 알기 전까지는 보통 같은 사람들이 이어서 가니까).
  if (body.newStop) {
    const newOrderedItems: OrderedItem[] = (body.newStop.orderedItems ?? []).filter(
      (it: OrderedItem) => it.name?.trim() && it.quantity > 0
    );
    const previousStop = stops[stops.length - 1];
    const newStop: Stop = {
      id: nanoid(),
      label: body.newStop.label?.trim() || `${stops.length + 1}차`,
      placeId: body.newStop.placeId,
      amount: body.newStop.amount,
      orderedItems: newOrderedItems,
      attendeeIds: body.newStop.attendeeIds ?? previousStop?.attendeeIds ?? existing.attendeeIds,
    };
    stops = [...stops, newStop];
    if (newOrderedItems.length > 0) {
      await syncPlaceMenuFromOrder(storage, newStop.placeId, body.date ?? existing.date, newOrderedItems);
    }
  }

  // 기존 차수에 메뉴 추가
  if (body.stopId && body.newOrderedItems) {
    const newOrderedItems: OrderedItem[] = (body.newOrderedItems ?? []).filter(
      (it: OrderedItem) => it.name?.trim() && it.quantity > 0
    );
    const addedAmount = newOrderedItems.reduce((sum, it) => sum + (it.price ?? 0) * it.quantity, 0);
    stops = stops.map((s) =>
      s.id === body.stopId
        ? { ...s, orderedItems: [...(s.orderedItems ?? []), ...newOrderedItems], amount: (s.amount ?? 0) + addedAmount }
        : s
    );
    const targetStop = stops.find((s) => s.id === body.stopId);
    if (targetStop && newOrderedItems.length > 0) {
      await syncPlaceMenuFromOrder(storage, targetStop.placeId, body.date ?? existing.date, newOrderedItems);
    }
  }

  // 차수 삭제 (최소 1개는 남겨야 함)
  if (body.deleteStopId && stops.length > 1) {
    stops = stops.filter((s) => s.id !== body.deleteStopId);
  }

  const updated = {
    ...existing,
    date: body.date ?? existing.date,
    time: body.time ?? existing.time,
    attendeeIds: body.attendeeIds ?? existing.attendeeIds,
    stops,
    stories: [...existing.stories, ...appendedStories],
    updatedAt: now,
  };

  const saved = await storage.upsertMeeting(updated);
  return NextResponse.json(saved);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const storage = await getStorage();
  await storage.deleteMeeting(params.id);
  return NextResponse.json({ ok: true });
}
