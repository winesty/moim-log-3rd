"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Place, StopKind, STOP_KIND_META } from "@/lib/types";
import { sortPlacesByName } from "@/lib/storage/searchHelper";

export default function AddStopForm({ meetingId, places, nextLabel }: { meetingId: string; places: Place[]; nextLabel: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(nextLabel);
  const [placeId, setPlaceId] = useState("");
  const [amount, setAmount] = useState("");
  // 직전 차수 성격과 상관없이 항상 "식사"로 시작한다 — 급하게 추가하는 다음 차수는
  // 오히려 직전과 성격이 다른 경우(활동 → 식사)가 많아서, 매번 바꾸는 수고를 더는 쪽이 낫다.
  const [kind, setKind] = useState<StopKind>("meal");
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
      body: JSON.stringify({ newStop: { label, placeId, amount: amount ? Number(amount) : undefined, kind } }),
    });
    setSaving(false);
    setOpen(false);
    setPlaceId("");
    setAmount("");
    setKind("meal");
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
        <select value={placeId} onChange={(e) => setPlaceId(e.target.value)} className="flex-1 min-w-0">
          <option value="">장소 선택...</option>
          {sortPlacesByName(places).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <label className="text-xs text-[#7a7768] block mb-1">이 차수의 성격</label>
      <div className="flex gap-1 mb-2 flex-wrap">
        {(Object.keys(STOP_KIND_META) as StopKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex-1 min-w-[64px] py-1.5 px-1 text-xs rounded-lg border ${
              kind === k ? "bg-[#2b2a26] text-white border-[#2b2a26]" : "bg-white text-[#2b2a26] border-[#ddd8ca]"
            }`}
          >
            {STOP_KIND_META[k].icon} {STOP_KIND_META[k].label}
          </button>
        ))}
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
