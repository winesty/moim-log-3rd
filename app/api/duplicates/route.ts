import { NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { findPersonDuplicates, findPlaceDuplicates } from "@/lib/duplicates";

export const dynamic = "force-dynamic";

export async function GET() {
  const storage = await getStorage();
  const [people, places, meetings] = await Promise.all([storage.listPeople(), storage.listPlaces(), storage.listMeetings()]);

  const meetingCountByPerson = new Map<string, number>();
  const meetingCountByPlace = new Map<string, number>();
  for (const m of meetings) {
    for (const id of m.attendeeIds) meetingCountByPerson.set(id, (meetingCountByPerson.get(id) ?? 0) + 1);
    for (const s of m.stops) if (s.placeId) meetingCountByPlace.set(s.placeId, (meetingCountByPlace.get(s.placeId) ?? 0) + 1);
  }

  return NextResponse.json({
    people: findPersonDuplicates(people, meetingCountByPerson),
    places: findPlaceDuplicates(places, meetingCountByPlace),
  });
}
