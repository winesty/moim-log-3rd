"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Place } from "@/lib/types";

declare global {
  interface Window {
    daum: any;
  }
}

export default function PlaceEditForm({ place }: { place: Place }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(place.name);
  const [city, setCity] = useState(place.city ?? "");
  const [gu, setGu] = useState(place.gu ?? "");
  const [street, setStreet] = useState(place.street ?? "");
  const [zonecode, setZonecode] = useState(place.zonecode ?? "");
  const [tel, setTel] = useState(place.tel ?? "");
  const [category, setCategory] = useState(place.category ?? "");
  const [saving, setSaving] = useState(false);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/places")
      .then((res) => res.json())
      .then((places: Place[]) => {
        const unique = Array.from(new Set(places.map((p) => p.category).filter(Boolean))) as string[];
        setExistingCategories(unique.sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {});
  }, []);

  function openAddressSearch() {
    if (!window.daum?.Postcode) {
      alert("주소 검색 스크립트를 아직 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        setCity(data.sido);
        setGu(data.sigungu);
        setStreet(`${data.roadAddress.replace(`${data.sido} ${data.sigungu} `, "")}`);
        setZonecode(data.zonecode);
      },
    }).open();
  }

  async function handleSave() {
    setSaving(true);
    await fetch("/api/places", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: place.id, name, city, gu, street, zonecode, tel, category }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-xs text-[#b4622f] bg-transparent p-0">
        정보 수정
      </button>
    );
  }

  return (
    <div className="mt-2 border border-[#ddd8ca] rounded-lg p-3 bg-[#faf8f3]">
      <p className="text-sm font-medium mb-2">장소 정보 수정</p>

      <label className="text-xs text-[#7a7768] block mb-1">장소명</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mb-2" />

      <label className="text-xs text-[#7a7768] block mb-1">주소</label>
      <div className="flex gap-2 mb-2">
        <input value={[city, gu, street].filter(Boolean).join(" ")} readOnly className="flex-1 bg-white" />
        <button type="button" onClick={openAddressSearch} className="px-3 py-2 border border-[#ddd8ca] bg-white text-sm whitespace-nowrap">
          주소 검색
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-xs text-[#7a7768] block mb-1">전화번호</label>
          <input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="02-1234-5678" className="w-full" />
        </div>
        <div>
          <label className="text-xs text-[#7a7768] block mb-1">분류</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="기존 분류 선택 또는 직접 입력" className="w-full" />
          {existingCategories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {existingCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`text-xs px-2 py-0.5 rounded-full border-none ${
                    category === c ? "bg-[#2b2a26] text-white" : "bg-[#f1e9e0] text-[#8a4a26]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setEditing(false)} className="flex-1 py-2 border border-[#ddd8ca] bg-white text-sm">
          취소
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-[#2b2a26] text-white text-sm disabled:opacity-50">
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
