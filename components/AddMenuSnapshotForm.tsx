"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MenuRow = { name: string; price: string };

export default function AddMenuSnapshotForm({ placeId }: { placeId: string }) {
  const router = useRouter();
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<MenuRow[]>([{ name: "", price: "" }]);
  const [promotion, setPromotion] = useState("");
  const [saving, setSaving] = useState(false);

  function updateRow(idx: number, patch: Partial<MenuRow>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { name: "", price: "" }]);
  }

  async function handleSubmit() {
    const validRows = rows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      alert("메뉴를 하나 이상 입력해주세요.");
      return;
    }
    setSaving(true);
    await fetch(`/api/places/${placeId}/menu-snapshots`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        effectiveDate,
        items: validRows.map((r) => ({ name: r.name, price: r.price ? Number(r.price) : undefined })),
        promotion: promotion || undefined,
      }),
    });
    setSaving(false);
    setRows([{ name: "", price: "" }]);
    setPromotion("");
    router.refresh();
  }

  return (
    <div className="border border-[#ddd8ca] rounded-lg p-3 bg-[#faf8f3]">
      <p className="text-sm font-medium mb-2">메뉴 갱신</p>
      <div className="mb-2">
        <label className="text-xs text-[#7a7768] block mb-1">기준일</label>
        <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} className="w-full" />
      </div>
      {rows.map((row, idx) => (
        <div key={idx} className="flex gap-2 mb-2">
          <input placeholder="메뉴명" value={row.name} onChange={(e) => updateRow(idx, { name: e.target.value })} className="flex-1 text-sm" />
          <input type="number" placeholder="가격" value={row.price} onChange={(e) => updateRow(idx, { price: e.target.value })} className="w-28 text-sm" />
        </div>
      ))}
      <button type="button" onClick={addRow} className="text-xs px-2 py-1 border border-dashed border-[#ddd8ca] bg-white">
        + 메뉴 추가
      </button>
      <div className="mt-2">
        <input placeholder="할인/행사 정보 (선택)" value={promotion} onChange={(e) => setPromotion(e.target.value)} className="w-full text-sm" />
      </div>
      <button type="button" onClick={handleSubmit} disabled={saving} className="mt-3 px-4 py-2 bg-[#2b2a26] text-white text-sm disabled:opacity-50">
        {saving ? "저장 중..." : "새 버전 저장"}
      </button>
    </div>
  );
}
