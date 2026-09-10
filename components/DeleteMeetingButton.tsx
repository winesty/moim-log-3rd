"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteMeetingButton({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("이 모임 기록을 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeleting(true);
    await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" });
    router.push("/");
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs px-2 py-1.5 border border-[#e0b3a3] text-[#a34a3a] bg-white disabled:opacity-50"
    >
      {deleting ? "삭제 중..." : "모임 삭제"}
    </button>
  );
}
