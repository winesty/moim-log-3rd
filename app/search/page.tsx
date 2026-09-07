"use client";

import { useState } from "react";
import Link from "next/link";
import { MeetingSearchResult } from "@/lib/types";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<MeetingSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function runSearch() {
    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/meetings?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setResults(data);
    setLoading(false);
  }

  return (
    <div>
      <div className="flex gap-2 mb-1">
        <input
          placeholder="이름, 날짜, 장소, 메뉴로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
          className="flex-1"
        />
        <button type="button" onClick={runSearch} className="px-4 py-2 bg-[#2b2a26] text-white text-sm">
          검색
        </button>
      </div>
      {searched && !loading && <p className="text-xs text-[#7a7768] mb-4">"{q}" 검색 결과 {results.length}건 (모임 일자순)</p>}

      <div className="flex flex-col gap-3">
        {results.map((m) => (
          <div key={m.id} className="bg-white border border-[#ddd8ca] rounded-xl p-4">
            <div className="flex justify-between items-baseline mb-1">
              <span className="font-medium">
                {m.date} {m.time}
              </span>
              {m.amount != null && <span className="text-sm text-[#7a7768]">{m.amount.toLocaleString()}원</span>}
            </div>
            <p className="text-sm text-[#7a7768] mb-1">
              <Link href={`/places/${m.place?.id}`} className="text-[#b4622f]">
                {m.place?.name}
              </Link>
              {[m.place?.city, m.place?.gu].filter(Boolean).length > 0 && ` · ${[m.place?.city, m.place?.gu].filter(Boolean).join(" ")}`}
            </p>
            <p className="text-sm text-[#7a7768] mb-2">{m.attendees.map((a) => a.name).join(", ")}</p>

            {m.attendees.map((person) => {
              const stories = m.stories.filter((s) => s.personId === person.id);
              if (stories.length === 0) return null;
              return (
                <div key={person.id} className="border-t border-[#ddd8ca] pt-2 mt-2">
                  <p className="text-xs text-[#7a7768] mb-1">{person.name}과 나눈 이야기</p>
                  {stories
                    .slice()
                    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
                    .map((s) => (
                      <div key={s.id} className="bg-[#faf8f3] rounded-lg p-2 mb-1">
                        <p className="text-[11px] text-[#a09c8c] mb-0.5">
                          {s.createdAt.slice(0, 10)} 작성{s.createdAt.slice(0, 10) !== m.date ? " · 나중에 추가됨" : ""}
                        </p>
                        <p className="text-sm">{s.content}</p>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        ))}
        {searched && !loading && results.length === 0 && <p className="text-sm text-[#7a7768]">검색 결과가 없습니다.</p>}
      </div>
    </div>
  );
}
