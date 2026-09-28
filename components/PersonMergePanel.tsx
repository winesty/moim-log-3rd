"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Person } from "@/lib/types";
import { personLabels } from "@/lib/personDisplay";

const FIELD_LABELS: { key: keyof Person; label: string }[] = [
  { key: "companyTitle", label: "직함/회사" },
  { key: "age", label: "나이" },
  { key: "education", label: "학력" },
  { key: "career", label: "커리어" },
  { key: "network", label: "주요 Network" },
  { key: "family", label: "가족관계" },
  { key: "hobby", label: "취미" },
  { key: "etc", label: "기타" },
];

export default function PersonMergePanel({ person, initialTargetId }: { person: Person; initialTargetId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(!!initialTargetId);
  const [candidates, setCandidates] = useState<Person[]>([]);
  const [targetId, setTargetId] = useState(initialTargetId ?? "");
  const [other, setOther] = useState<Person | null>(null);
  const [otherStats, setOtherStats] = useState<{ meetings: number; stories: number } | null>(null);
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    fetch("/api/people")
      .then((r) => r.json())
      .then((all: Person[]) => setCandidates(all.filter((p) => p.id !== person.id)));
  }, [open, person.id]);

  useEffect(() => {
    if (!targetId) {
      setOther(null);
      setOtherStats(null);
      return;
    }
    fetch(`/api/people/${targetId}`)
      .then((r) => r.json())
      .then((data) => {
        setOther(data.person);
        const storyCount = (data.meetings ?? []).reduce(
          (sum: number, m: any) => sum + (m.stories?.filter((s: any) => s.personId === targetId).length ?? 0),
          0
        );
        setOtherStats({ meetings: data.meetings?.length ?? 0, stories: storyCount });
        setResolved({});
      });
  }, [targetId]);

  const labels = personLabels(candidates.length ? [person, ...candidates] : [person]);
  const conflicts = other
    ? FIELD_LABELS.filter(({ key }) => person[key] && other[key] && person[key] !== other[key])
    : [];

  async function handleMerge() {
    if (!other) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/people/merge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ keepId: person.id, removeId: other.id, overrides: resolved }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "합치기에 실패했습니다.");
      return;
    }
    router.replace(`/people/${person.id}`);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-[#b4622f] bg-transparent p-0">
        다른 사람과 합치기
      </button>
    );
  }

  return (
    <div className="mt-2 border border-[#ddd8ca] rounded-lg p-3 bg-[#faf8f3] flex flex-col gap-3">
      <p className="text-sm font-medium">
        {person.name}에 다른 사람 합치기 — 합친 뒤에는 <b>{person.name}</b>만 남고 상대는 사라져요.
      </p>

      <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="w-full">
        <option value="">합칠 사람 선택...</option>
        {candidates
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name, "ko"))
          .map((p) => (
            <option key={p.id} value={p.id}>
              {labels.get(p.id) ?? p.name}
            </option>
          ))}
      </select>

      {other && otherStats && (
        <>
          <p className="text-xs text-[#a34a3a]">
            &quot;{other.name}&quot;의 모임 {otherStats.meetings}건, 이야기 {otherStats.stories}건이 &quot;{person.name}&quot;쪽으로 옮겨져요. &quot;
            {other.name}&quot;은(는) 지워져요.
          </p>

          {conflicts.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-[#7a7768]">두 사람의 값이 서로 달라요. 어느 쪽을 쓸지 골라주세요.</p>
              {conflicts.map(({ key, label }) => (
                <div key={key} className="text-sm">
                  <p className="text-xs text-[#7a7768] mb-1">{label}</p>
                  <div className="flex flex-col gap-1">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`merge-${key}`}
                        checked={(resolved[key] ?? person[key]) === person[key]}
                        onChange={() => setResolved((prev) => ({ ...prev, [key]: person[key] as string }))}
                      />
                      {person[key]}
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
