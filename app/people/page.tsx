"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Person } from "@/lib/types";
import GroupsPanel from "@/components/GroupsPanel";
import { personLabels } from "@/lib/personDisplay";

type PersonWithStats = Person & { lastMeetingDate: string | null; daysSinceLastMeeting: number | null };

export default function PeoplePage() {
  const [tab, setTab] = useState<"people" | "groups">("people");
  const [sortBy, setSortBy] = useState<"name" | "overdue">("name");
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<PersonWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(query?: string) {
    setLoading(true);
    const res = await fetch(`/api/people${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setPeople(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const labels = personLabels(people);
  // 이름순은 가나다순, "오래 못 만난 순"은 안 만난 날짜가 긴 사람부터 (아직 한 번도 안 만난 사람은 맨 뒤)
  const sortedPeople = people.slice().sort((a, b) => {
    if (sortBy === "overdue") {
      if (a.daysSinceLastMeeting == null && b.daysSinceLastMeeting == null) return a.name.localeCompare(b.name, "ko");
      if (a.daysSinceLastMeeting == null) return 1;
      if (b.daysSinceLastMeeting == null) return -1;
      return b.daysSinceLastMeeting - a.daysSinceLastMeeting;
    }
    return a.name.localeCompare(b.name, "ko");
  });

  async function remove(p: PersonWithStats) {
    if (!confirm(`"${p.name}"을(를) 삭제할까요? 이미 기록된 모임/이야기는 남아있지만 이름 연결이 사라집니다.`)) return;
    await fetch(`/api/people/${p.id}`, { method: "DELETE" });
    load(q);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-medium">사람</h1>
        <Link href="/people/import" className="text-xs text-[#b4622f] mr-auto ml-3">
          시트에서 가져오기
        </Link>
        <Link href="/people/new" className="text-sm px-3 py-2 bg-[#2b2a26] text-white rounded-lg no-underline mr-2">
          + 새 사람
        </Link>
        <div className="flex text-sm border border-[#ddd8ca] rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setTab("people")}
            className={`px-3 py-1.5 ${tab === "people" ? "bg-[#2b2a26] text-white" : "bg-white text-[#2b2a26]"}`}
          >
            전체
          </button>
          <button
            type="button"
            onClick={() => setTab("groups")}
            className={`px-3 py-1.5 ${tab === "groups" ? "bg-[#2b2a26] text-white" : "bg-white text-[#2b2a26]"}`}
          >
            그룹별
          </button>
        </div>
      </div>

      {tab === "people" ? (
        <>
          <div className="flex gap-2 mb-2">
            <input
              placeholder="이름으로 검색"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(q)}
              className="flex-1"
            />
            <button type="button" onClick={() => load(q)} className="px-4 py-2 bg-[#2b2a26] text-white text-sm">
              검색
            </button>
          </div>
          <div className="flex text-xs border border-[#ddd8ca] rounded-lg overflow-hidden w-fit mb-4">
            <button
              type="button"
              onClick={() => setSortBy("name")}
              className={`px-3 py-1.5 ${sortBy === "name" ? "bg-[#2b2a26] text-white" : "bg-white text-[#2b2a26]"}`}
            >
              이름순
            </button>
            <button
              type="button"
              onClick={() => setSortBy("overdue")}
              className={`px-3 py-1.5 ${sortBy === "overdue" ? "bg-[#2b2a26] text-white" : "bg-white text-[#2b2a26]"}`}
            >
              오래 못 만난 순
            </button>
          </div>

          {!loading && people.length === 0 && <p className="text-sm text-[#7a7768]">등록된 참석자가 없습니다.</p>}

          <ul className="flex flex-col gap-2">
            {sortedPeople.map((p) => (
              <li key={p.id} className="border border-[#ddd8ca] rounded-lg p-3 bg-white flex items-center gap-2">
                <Link href={`/people/${p.id}`} className="flex-1 no-underline text-[#2b2a26]">
                  <div className="flex justify-between items-baseline">
                    <span className="font-medium">{labels.get(p.id) ?? p.name}</span>
                    {p.career && <span className="text-sm text-[#7a7768]">{p.career}</span>}
                  </div>
                  <p className="text-xs text-[#a09c8c] mt-1">
                    {p.lastMeetingDate ? (
                      <>
                        최근 모임 {p.lastMeetingDate} ({p.daysSinceLastMeeting === 0 ? "오늘" : `${p.daysSinceLastMeeting}일 경과`}) · 등록일{" "}
                        {p.createdAt.slice(0, 10)}
                      </>
                    ) : (
                      <>아직 모임 기록 없음 · 등록일 {p.createdAt.slice(0, 10)}</>
                    )}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => remove(p)}
                  className="text-xs px-2 py-1.5 border border-[#e0b3a3] text-[#a34a3a] bg-white whitespace-nowrap"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <GroupsPanel people={people} />
      )}
    </div>
  );
}
