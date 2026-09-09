import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { Person } from "@/lib/types";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const storage = await getStorage();
  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  const people = await storage.listPeople();
  const filtered = q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
  return NextResponse.json(filtered);
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
