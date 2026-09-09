"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Person } from "@/lib/types";

export default function PeoplePage() {
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
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

  return (
    <div>
      <h1 className="text-xl font-medium mb-4">사람</h1>

      <div className="flex gap-2 mb-4">
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

      {!loading && people.length === 0 && <p className="text-sm text-[#7a7768]">등록된 참석자가 없습니다.</p>}

      <ul className="flex flex-col gap-2">
        {people.map((p) => (
          <li key={p.id}>
            <Link href={`/people/${p.id}`} className="block border border-[#ddd8ca] rounded-lg p-3 bg-white no-underline text-[#2b2a26]">
              <span className="font-medium">{p.name}</span>
              {p.career && <span className="text-sm text-[#7a7768]"> · {p.career}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
