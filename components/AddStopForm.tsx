"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Place } from "@/lib/types";

export default function AddStopForm({ meetingId, places, nextLabel }: { meetingId: string; places: Place[]; nextLabel: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(nextLabel);
  const [placeId, setPlaceId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!placeId) {
      alert("장소를 선택해주세요.");
      return;
    }
    setSaving(true);
    await fetch(`/api/meetings/${meetingId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ newStop: { label, placeId, amount: amount ? Number(amount) : undefined } }),
    });
    setSaving(false);
    setOpen(false);
    setPlaceId("");
    setAmount("");
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="px-3 py-2 border border-dashed border-[#ddd8ca] bg-white text-sm">
        + {nextLabel} 추가
      </button>
    );
  }

  return (
    <div className="border border-[#ddd8ca] rounded-lg p-3 bg-[#faf8f3]">
      <p className="text-sm font-medium mb-2">차수 추가</p>
      <div className="flex gap-2 mb-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-20 text-sm" />
        <select value={placeId} onChange={(e) => setPlaceId(e.target.value)} className="flex-1">
          <option value="">장소 선택...</option>
          {places.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <input type="number" placeholder="금액 (선택, 나중에 메뉴 추가로도 채울 수 있어요)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full mb-2" />
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 border border-[#ddd8ca] bg-white text-sm">
          취소
        </button>
        <button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 py-2 bg-[#2b2a26] text-white text-sm disabled:opacity-50">
          {saving ? "저장 중..." : "추가"}
        </button>
      </div>
    </div>
  );
}
