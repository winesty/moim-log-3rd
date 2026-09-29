"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Place } from "@/lib/types";

const FIELD_LABELS: { key: keyof Place; label: string }[] = [
  { key: "city", label: "시/도" },
  { key: "gu", label: "시/군/구" },
  { key: "street", label: "도로명 주소" },
  { key: "detail", label: "상세주소" },
  { key: "tel", label: "전화번호" },
  { key: "category", label: "카테고리" },
  { key: "note", label: "메모" },
];

export default function PlaceMergePanel({ place, initialTargetId }: { place: Place; initialTargetId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(!!initialTargetId);
  const [candidates, setCandidates] = useState<Place[]>([]);
  const [targetId, setTargetId] = useState(initialTargetId ?? "");
  const [other, setOther] = useState<Place | null>(null);
  const [otherStats, setOtherStats] = useState<{ meetings: number; menus: number } | null>(null);
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/places")
      .then((r) => r.json())
      .then((all: Place[]) => setCandidates(all.filter((p) => p.id !== place.id)));
  }, [open, place.id]);

  useEffect(() => {
    if (!targetId) {
      setOther(null);
      setOtherStats(null);
      return;
    }
    fetch(`/api/places/${targetId}`)
      .then((r) => r.json())
      .then((data) => {
        setOther(data.place);
        const menuCount = (data.currentMenu ? 1 : 0) + (data.pastMenus?.length ?? 0);
        setOtherStats({ meetings: data.meetings?.length ?? 0, menus: menuCount });
        setResolved({});
      });
  }, [targetId]);

  const conflicts = other
    ? FIELD_LABELS.filter(({ key }) => place[key] && other[key] && place[key] !== other[key])
    : [];

  async function handleMerge() {
    if (!other) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/places/merge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keepId: place.id, removeId: other.id, overrides: resolved }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "합치기에 실패했습니다.");
      return;
    }
    const params = new URLSearchParams({
      mergedFrom: other.name,
      into: place.name,
      meetings: String(data.affectedMeetings ?? 0),
      menus: String(data.affectedMenus ?? 0),
    });
    router.replace(`/places/${place.id}?${params.toString()}`);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-[#b4622f] bg-transparent p-0">
        다른 장소와 합치기
      </button>
    );
  }

  return (
    <div className="mt-2 border border-[#ddd8ca] rounded-lg p-3 bg-[#faf8f3] flex flex-col gap-3">
      <p className="text-sm font-medium">
        {place.name}에 다른 장소 합치기 — 합친 뒤에는 <b>{place.name}</b>만 남고 상대는 사라져요.
      </p>

      <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full">
        <option value="">합칠 장소 선택...</option>
        {candidates
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, "ko"))
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </select>

      {other && otherStats && (
        <>
          <p className="text-xs text-[#a34a3a]">
            &quot;{other.name}&quot;의 모임 {otherStats.meetings}건, 메뉴 이력 {otherStats.menus}건이 &quot;{place.name}&quot;쪽으로 옮겨져요. &quot;
            {other.name}&quot;은(는) 지워져요.
          </p>

          {conflicts.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[#7a7768]">두 장소의 값이 서로 달라요. 어느 쪽을 쓸지 골라주세요.</p>
              {conflicts.map(({ key, label }) => (
                <div key={key} className="text-sm">
                  <p className="text-xs text-[#7a7768] mb-1">{label}</p>
                  <div className="flex flex-col gap-1">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`merge-${key}`}
                        checked={(resolved[key] ?? place[key]) === place[key]}
                        onChange={() => setResolved((prev) => ({ ...prev, [key]: place[key] as string }))}
                      />
                      {place[key]}
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`merge-${key}`}
                        checked={resolved[key] === other[key]}
                        onChange={() => setResolved((prev) => ({ ...prev, [key]: other[key] as string }))}
                      />
                      {other[key]}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-[#a34a3a]">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 border border-[#ddd8ca] bg-white text-sm">
              취소
            </button>
            <button type="button" onClick={handleMerge} disabled={saving} className="flex-1 py-2 bg-[#2b2a26] text-white text-sm disabled:opacity-50">
              {saving ? "합치는 중..." : "합치기"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
