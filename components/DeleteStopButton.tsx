"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteStopButton({ meetingId, stopId, label }: { meetingId: string; stopId: string; label: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`"${label}"를 이 모임에서 뺄까요?`)) return;
    setDeleting(true);
    await fetch(`/api/meetings/${meetingId}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deleteStopId: stopId }),
    });
    setDeleting(false);
    router.refresh();
  }

  return (
    <button type="button" onClick={handleDelete} disabled={deleting} className="text-xs text-[#a34a3a] bg-transparent p-0 disabled:opacity-50">
      {deleting ? "삭제 중..." : "이 차수 삭제"}
    </button>
  );
}
