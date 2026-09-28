"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PersonGroup = { key: string; people: { id: string; name: string; legacyMgmtNo?: string; firstMetDate?: string; meetingCount: number }[] };
type PlaceGroup = { key: string; places: { id: string; name: string; meetingCount: number }[] };

export default function DuplicatesPage() {
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState<PersonGroup[]>([]);
  const [places, setPlaces] = useState<PlaceGroup[]>([]);

  useEffect(() => {
    fetch("/api/duplicates")
      .then((r) => r.json())
      .then((data) => {
        setPeople(data.people ?? []);
        setPlaces(data.places ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href="/settings" className="text-xs text-[#b4622f]">
          ← 설정
        </Link>
      </div>
      <h1 className="text-xl font-medium mb-1">중복 후보</h1>
      <p className="text-sm text-[#7a7768] mb-4">이름이 같은 사람, 이름이 겹치는 장소를 모아 보여줘요. 실제로 같은 대상이면 합쳐주세요.</p>

      {loading && <p className="text-sm text-[#7a7768]">확인하는 중...</p>}

      {!loading && (
        <>
          <section className="mb-6">
            <h2 className="text-sm font-medium mb-2">사람 ({people.length}쌍)</h2>
            {people.length === 0 && <p className="text-sm text-[#a09c8c]">이름이 같은 사람이 없어요.</p>}
            <ul className="flex flex-col gap-2">
              {people.map((g) => (
                <li key={g.key} className="bg-white border border-[#ddd8ca] rounded-xl p-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                    {g.people.map((p) => (
                      <span key={p.id} className="text-sm">
                        {p.name} · {p.firstMetDate ?? "최초 만난 일자 없음"} · 모임 {p.meetingCount}건
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.people.slice(1).map((p) => (
                      <Link
                        key={p.id}
                        href={`/people/${g.people[0].id}?merge=${p.id}`}
                        className="text-xs px-2 py-1 border border-[#ddd8ca] bg-[#faf8f3] no-underline text-[#2b2a26]"
                      >
                        {g.people[0].name}에 {p.name} 합치기
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-medium mb-2">장소 ({places.length}쌍)</h2>
            {places.length === 0 && <p className="text-sm text-[#a09c8c]">이름이 겹치는 장소가 없어요.</p>}
            <ul className="flex flex-col gap-2">
              {places.map((g) => (
                <li key={g.key} className="bg-white border border-[#ddd8ca] rounded-xl p-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
                    {g.places.map((p) => (
                      <span key={p.id} className="text-sm">
                        {p.name} · 모임 {p.meetingCount}건
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {g.places.slice(1).map((p) => (
                      <Link
                        key={p.id}
                        href={`/places/${g.places[0].id}?merge=${p.id}`}
                        className="text-xs px-2 py-1 border border-[#ddd8ca] bg-[#faf8f3] no-underline text-[#2b2a26]"
                      >
                        {g.places[0].name}에 {p.name} 합치기
                      </Link>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
