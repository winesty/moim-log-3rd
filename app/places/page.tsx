"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Place } from "@/lib/types";

export default function PlacesPage() {
  const [q, setQ] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  async function load(query?: string) {
    setLoading(true);
    const res = await fetch(`/api/places${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setPlaces(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(p: Place) {
    if (!confirm(`"${p.name}"을(를) 삭제할까요? 이 장소의 메뉴 이력도 함께 사라집니다. (이 장소가 연결된 모임 기록은 남아있지만 장소 정보가 비어보일 수 있어요)`)) return;
    await fetch(`/api/places/${p.id}`, { method: "DELETE" });
    load(q);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-medium">장소</h1>
        <div className="flex gap-2">
          <Link href="/places/import" className="text-sm px-3 py-2 border border-[#ddd8ca] bg-white rounded-lg no-underline text-[#2b2a26]">
            시트 가져오기
          </Link>
          <Link href="/places/new" className="text-sm px-3 py-2 bg-[#2b2a26] text-white rounded-lg no-underline">
            + 새 장소
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          placeholder="장소명, 지역, 메뉴로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(q)}
          className="flex-1"
        />
        <button type="button" onClick={() => load(q)} className="px-4 py-2 bg-[#2b2a26] text-white text-sm">
          검색
        </button>
      </div>

      {!loading && places.length === 0 && <p className="text-sm text-[#7a7768]">등록된 장소가 없습니다.</p>}

      <ul className="flex flex-col gap-2">
        {places.map((p) => (
          <li key={p.id} className="border border-[#ddd8ca] rounded-lg p-3 bg-white flex items-center gap-2">
            <Link href={`/places/${p.id}`} className="flex-1 no-underline text-[#2b2a26]">
              <div className="flex justify-between items-center">
                <span className="font-medium">{p.name}</span>
                {p.operatingStatus === "closed_suspected" && (
                  <span className="text-xs bg-[#f5e4de] text-[#8a4326] px-2 py-0.5 rounded-full">폐업 추정</span>
                )}
              </div>
              <p className="text-sm text-[#7a7768]">
                {[p.city, p.gu, p.street].filter(Boolean).join(" ") || "주소 미등록"}
                {p.category ? ` · ${p.category}` : ""}
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
    </div>
  );
}
