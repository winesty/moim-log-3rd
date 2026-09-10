"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MenuSnapshot } from "@/lib/types";

export default function AddOrderedItemForm({ meetingId, currentMenu }: { meetingId: string; currentMenu: MenuSnapshot | null }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, string>>({});
  const [customRows, setCustomRows] = useState<{ name: string; price: string; qty: string }[]>([]);
  const [saving, setSaving] = useState(false);

  function addCustomRow() {
    setCustomRows((prev) => [...prev, { name: "", price: "", qty: "1" }]);
  }
  function updateCustomRow(idx: number, patch: Partial<{ name: string; price: string; qty: string }>) {
    setCustomRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function handleSubmit() {
    const items: { name: string; price?: number; quantity: number }[] = [];
    if (currentMenu) {
      for (const item of currentMenu.items) {
        const q = Number(qty[item.id] || 0);
        if (q > 0) items.push({ name: item.name, price: item.price, quantity: q });
      }
    }
    for (const row of customRows) {
      const q = Number(row.qty || 0);
      if (q > 0 && row.name.trim()) items.push({ name: row.name.trim(), price: row.price ? Number(row.price) : undefined, quantity: q });
    }
    if (items.length === 0) {
      alert("추가할 메뉴를 하나 이상 선택하거나 입력해주세요.");
      return;
    }
    setSaving(true);
    await fetch(`/api/meetings/${meetingId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newOrderedItems: items }),
    });
    setSaving(false);
    setQty({});
    setCustomRows([]);
    router.refresh();
  }

  return (
    <div className="border border-[#ddd8ca] rounded-lg p-3 bg-[#faf8f3] mt-4">
      <p className="text-sm font-medium mb-1">메뉴 추가</p>
      <p className="text-xs text-[#a09c8c] mb-2">여기서 추가하면 장소의 메뉴에도 이번 모임 일자로 함께 반영돼요.</p>

      {currentMenu && currentMenu.items.length > 0 && (
        <div className="flex flex-col gap-1 mb-2">
          {currentMenu.items.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <span className="flex-1 text-xs">
                {item.name} {item.price ? `(${item.price.toLocaleString()}원)` : ""}
              </span>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={qty[item.id] ?? ""}
                onChange={(e) => setQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                className="w-16 text-xs"
              />
            </div>
          ))}
        </div>
      )}

      {customRows.map((row, idx) => (
        <div key={idx} className="flex items-center gap-2 mb-1">
          <input placeholder="메뉴명" value={row.name} onChange={(e) => updateCustomRow(idx, { name: e.target.value })} className="flex-1 text-xs" />
          <input type="number" placeholder="가격" value={row.price} onChange={(e) => updateCustomRow(idx, { price: e.target.value })} className="w-20 text-xs" />
          <input type="number" min={0} placeholder="수량" value={row.qty} onChange={(e) => updateCustomRow(idx, { qty: e.target.value })} className="w-14 text-xs" />
        </div>
      ))}
      <button type="button" onClick={addCustomRow} className="text-xs px-2 py-1 border border-dashed border-[#ddd8ca] bg-white mb-2">
        + 메뉴에 없는 항목 추가
      </button>

      <button type="button" onClick={handleSubmit} disabled={saving} className="block mt-2 px-4 py-2 bg-[#2b2a26] text-white text-sm disabled:opacity-50">
        {saving ? "저장 중..." : "메뉴 저장"}
      </button>
    </div>
  );
}
