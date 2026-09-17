"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePersonButton({ personId, name }: { personId: string; name: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`"${name}"을(를) 삭제할까요? 이미 기록된 모임/이야기는 남아있지만 이름 연결이 사라집니다.`)) return;
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
