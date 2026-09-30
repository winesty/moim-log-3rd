"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CONFIRM_PHRASE = "전체 삭제";

export default function DangerZonePanel() {
  const router = useRouter();
  const [counts, setCounts] = useState<{ people: number; places: number; meetings: number } | null>(null);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/people"), fetch("/api/places"), fetch("/api/meetings")])
      .then((rs) => Promise.all(rs.map((r) => r.json())))
      .then(([people, places, meetings]) => setCounts({ people: people.length, places: places.length, meetings: meetings.length }));
  }, []);

  const canDelete = confirmText === CONFIRM_PHRASE;

  async function handleDelete() {
    if (!canDelete) return;
    if (!confirm("정말로 모든 데이터를 지울까요? 백업을 받아두지 않았다면 되돌릴 수 없어요.")) return;
    setDeleting(true);
    setError("");
    const res = await fetch("/api/data/delete-all", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, confirmText }),
    });
    setDeleting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "삭제에 실패했습니다.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <section className="bg-white border border-[#e0b3a3] rounded-2xl p-5">
      <h2 className="text-sm font-medium mb-1 text-[#a34a3a]">위험 구역</h2>
      <p className="text-xs text-[#7a7768] mb-3">
        모든 사람·장소·모임·이야기를 영구히 지워요. 휴지통을 거치지 않고 바로 지워지며 되돌릴 수 없어요.
      </p>
      {counts && (
        <p className="text-xs text-[#7a7768] mb-3">
          지금 사람 {counts.people}명, 장소 {counts.places}곳, 모임 {counts.meetings}건이 있어요.
        </p>
      )}

      <label className="text-xs text-[#7a7768] block mb-1">비밀번호</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mb-3" />

      <label className="text-xs text-[#7a7768] block mb-1">
        확인을 위해 <b>{CONFIRM_PHRASE}</b>라고 입력하세요
      </label>
      <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-full mb-3" />

      {error && <p className="text-sm text-[#a34a3a] mb-2">{error}</p>}

      <button
        type="button"
        onClick={handleDelete}
        disabled={!canDelete || deleting}
        className="w-full py-3 bg-[#a34a3a] text-white text-sm disabled:opacity-50"
      >
        {deleting ? "삭제하는 중..." : "모든 데이터 영구 삭제"}
      </button>
    </section>
  );
}
