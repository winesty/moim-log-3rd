import { NextRequest, NextResponse } from "next/server";
import { getStorage } from "@/lib/storage";
import { StoryCategory } from "@/lib/types";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function GET() {
  const storage = await getStorage();
  const categories = await storage.listCategories();
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const storage = await getStorage();
  const body = await req.json();

  const category: StoryCategory = {
    id: nanoid(),
    label: body.label,
    isDefault: false,
    createdAt: new Date().toISOString(),
  };

  const saved = await storage.upsertCategory(category);
  return NextResponse.json(saved, { status: 201 });
}
