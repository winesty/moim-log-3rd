"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Person, StoryCategory } from "@/lib/types";

export default function AddStoryForm({
  meetingId,
  attendees,
  categories,
}: {
  meetingId: string;
  attendees: Person[];
  categories: StoryCategory[];
}) {
  const router = useRouter();
  const [personId, setPersonId] = useState(attendees[0]?.id ?? "");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  function insertTag(label: string) {
    setContent((prev) => `${prev}${prev && !prev.endsWith(" ") ? " " : ""}#${label} `);
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    setSaving(true);
    await fetch(`/api/meetings/${meetingId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newStories: [{ personId, content: content.trim() }] }),
    });
    setSaving(false);
    setContent("");
    router.refresh();
  }

  return (
    <div className="border border-[#ddd8ca] rounded-lg p-3 bg-[#faf8f3]">
      <p className="text-sm font-medium mb-2">이야기 추가</p>
      {attendees.length > 1 && (
        <select value={personId} onChange={(e) => setPersonId(e.target.value)} className="w-full mb-2">
          {attendees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
      <textarea
        placeholder="나중에 나눈 이야기를 추가로 기록해보세요 (#카테고리 사용 가능)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full min-h-[60px] text-sm"
      />
      <div className="flex flex-wrap gap-2 mt-2">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => insertTag(c.label)}
            className="bg-[#f1e9e0] text-[#8a4a26] text-xs px-2 py-1 rounded-full border-none"
          >
            #{c.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={handleSubmit} disabled={saving} className="mt-3 px-4 py-2 bg-[#2b2a26] text-white text-sm disabled:opacity-50">
        {saving ? "저장 중..." : "이야기 저장"}
      </button>
    </div>
  );
}
