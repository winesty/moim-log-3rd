"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    daum: any;
  }
}

type MenuRow = { name: string; price: string };

export default function PlaceForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [gu, setGu] = useState("");
  const [street, setStreet] = useState("");
  const [zonecode, setZonecode] = useState("");
  const [tel, setTel] = useState("");
  const [category, setCategory] = useState("");

  const [menuRows, setMenuRows] = useState<MenuRow[]>([{ name: "", price: "" }]);
  const [saving, setSaving] = useState(false);

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

  function updateMenuRow(idx: number, patch: Partial<MenuRow>) {
    setMenuRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addMenuRow() {
    setMenuRows((prev) => [...prev, { name: "", price: "" }]);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      alert("장소명을 입력해주세요.");
      return;
    }
    setSaving(true);
    const placeRes = await fetch("/api/places", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, city, gu, street, zonecode, tel, category }),
    });
    const place = await placeRes.json();

    const validRows = menuRows.filter((r) => r.name.trim());
    if (validRows.length > 0) {
      await fetch(`/api/places/${place.id}/menu-snapshots`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          effectiveDate: new Date().toISOString().slice(0, 10),
          items: validRows.map((r) => ({ name: r.name, price: r.price ? Number(r.price) : undefined })),
        }),
      });
    }

    setSaving(false);
    router.push(`/places/${place.id}`);
  }

  return (
    <div className="bg-white border border-[#ddd8ca] rounded-2xl p-5 flex flex-col gap-5">
      <div>
        <label className="text-xs text-[#7a7768] block mb-1">장소명</label>
        <input placeholder="예: 을지로 노가리 골목" value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
      </div>

      <div>
        <label className="text-xs text-[#7a7768] block mb-1">주소</label>
        <div className="flex gap-2">
          <input value={[city, gu, street].filter(Boolean).join(" ")} readOnly placeholder="주소 검색을 눌러주세요" className="flex-1 bg-[#faf8f3]" />
          <button type="button" onClick={openAddressSearch} className="px-3 py-2 border border-[#ddd8ca] bg-white text-sm whitespace-nowrap">
            주소 검색
          </button>
        </div>
        {zonecode && <p className="text-xs text-[#a09c8c] mt-1">우편번호 {zonecode}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#7a7768] block mb-1">전화번호</label>
          <input placeholder="02-1234-5678" value={tel} onChange={(e) => setTel(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="text-xs text-[#7a7768] block mb-1">분류</label>
          <input placeholder="한식, Coffee 등" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full" />
        </div>
      </div>

      <div className="border border-[#ddd8ca] rounded-lg p-3">
        <p className="text-sm font-medium mb-1">메뉴</p>
        <p className="text-xs text-[#a09c8c] mb-2">오늘 날짜 기준으로 버전이 저장되고, 나중에 갱신해도 지금 입력한 내용은 이력으로 남습니다.</p>
        {menuRows.map((row, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input
              placeholder="메뉴명"
              value={row.name}
              onChange={(e) => updateMenuRow(idx, { name: e.target.value })}
              className="flex-1 text-sm"
            />
            <input
              type="number"
              placeholder="가격"
              value={row.price}
              onChange={(e) => updateMenuRow(idx, { price: e.target.value })}
              className="w-28 text-sm"
            />
          </div>
        ))}
        <button type="button" onClick={addMenuRow} className="text-xs px-2 py-1 border border-dashed border-[#ddd8ca] bg-white">
          + 메뉴 추가
        </button>
      </div>

      <button type="button" onClick={handleSubmit} disabled={saving} className="w-full py-3 bg-[#2b2a26] text-white text-sm disabled:opacity-50">
        {saving ? "저장 중..." : "장소 저장"}
      </button>
    </div>
  );
}
