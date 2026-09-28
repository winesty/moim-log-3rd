"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePersonButton({
  personId,
  name,
  meetingCount,
  storyCount,
}: {
  personId: string;
  name: string;
  meetingCount?: number;
  storyCount?: number;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const detail =
      meetingCount != null && meetingCount > 0
        ? `모임 ${meetingCount}건, 이야기 ${storyCount ?? 0}건에 연결돼 있어요. 삭제해도 그 기록은 남지만, 이름 연결이 사라져서 "누구였는지" 알 수 없게 돼요.`
        : "연결된 모임이나 이야기는 없어요.";
    if (!confirm(`"${name}"을(를) 삭제할까요?\n\n${detail}`)) return;
    setDeleting(true);
    await fetch(`/api/people/${personId}`, { method: "DELETE" });
    router.push("/people");
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs px-2 py-1.5 border border-[#e0b3a3] text-[#a34a3a] bg-white disabled:opacity-50"
    >
      {deleting ? "삭제 중..." : "참석자 삭제"}
    </button>
  );
}
