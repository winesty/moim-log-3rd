import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { Person } from "@/lib/types";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

function daysBetween(fromDateStr: string, to: Date): number {
  const from = new Date(`${fromDateStr}T00:00:00`);
  const toMidnight = new Date(`${to.toISOString().slice(0, 10)}T00:00:00`);
  return Math.round((toMidnight.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(req: NextRequest) {
  const storage = await getStorage();
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  const [people, meetings] = await Promise.all([storage.listPeople(), storage.listMeetings()]);
  const filtered = q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;

  // 참석자별 가장 최근 모임 일자 계산 (한 번에 전체 모임을 훑어 집계 - O(모임 수))
  const lastMeetingByPerson = new Map<string, string>();
  for (const m of meetings) {
    for (const personId of m.attendeeIds) {
      const prev = lastMeetingByPerson.get(personId);
      if (!prev || m.date > prev) lastMeetingByPerson.set(personId, m.date);
    }
  }

  const now = new Date();
  const withStats = filtered.map((p) => {
    const lastMeetingDate = lastMeetingByPerson.get(p.id) ?? null;
    return {
      ...p,
      lastMeetingDate,
      daysSinceLastMeeting: lastMeetingDate ? daysBetween(lastMeetingDate, now) : null,
    };
  });

  return NextResponse.json(withStats);
}

export async function POST(req: NextRequest) {
  const storage = await getStorage();
  const body = await req.json();
  const now = new Date().toISOString();

  const existing = body.id ? await storage.getPerson(body.id) : null;

  const person: Person = {
    id: body.id ?? nanoid(),
    name: body.name,
    age: body.age,
    education: body.education,
    family: body.family,
    career: body.career,
    companyTitle: body.companyTitle,
    network: body.network,
    hobby: body.hobby,
    etc: body.etc,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const saved = await storage.upsertPerson(person);
  return NextResponse.json(saved, { status: existing ? 200 : 201 });
}
