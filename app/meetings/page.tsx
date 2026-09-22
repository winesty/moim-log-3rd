"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MeetingSearchResult } from "@/lib/types";

export default function MeetingsPage() {
  const [q, setQ] = useState("");
  const [meetings, setMeetings] = useState<MeetingSearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(query?: string) {
    setLoading(true);
    const res = await fetch(`/api/meetings${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setMeetings(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-medium">모임</h1>
        <Link href="/new" className="text-sm px-3 py-2 bg-[#2b2a26] text-white rounded-lg no-underline">
          + 새 모임 기록
        </Link>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          placeholder="이름, 날짜, 장소, 메뉴로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(q)}
          className="flex-1"
        />
        <button type="button" onClick={() => load(q)} className="px-4 py-2 bg-[#2b2a26] text-white text-sm">
          검색
        </button>
      </div>

      {!loading && meetings.length === 0 && (
        <p className="text-sm text-[#7a7768]">
          {q ? "검색 결과가 없습니다." : '아직 기록된 모임이 없습니다. "새 모임 기록"으로 첫 모임을 남겨보세요.'}
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {meetings.map((m) => {
          const totalAmount = m.stops.reduce((sum, s) => sum + (s.amount ?? 0), 0);
          return (
            <li key={m.id}>
              <Link href={`/meeting/${m.id}`} className="block border border-[#ddd8ca] rounded-xl p-4 bg-white no-underline text-[#2b2a26]">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-medium">
                    {m.date} {m.time}
                  </span>
                  {totalAmount > 0 && <span className="text-sm text-[#7a7768]">{totalAmount.toLocaleString()}원</span>}
                </div>
                <p className="text-sm text-[#7a7768] mb-1">{m.stops.map((s) => s.place?.name ?? "장소 미상").join(" → ")}</p>
                <p className="text-sm text-[#7a7768]">
                  {[...m.presentGroups.map((g) => `${g.name} 그룹`), ...m.soloAttendees.map((a) => a.name)].join(", ")}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
