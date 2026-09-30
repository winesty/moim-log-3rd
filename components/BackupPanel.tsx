"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ParsedBackup = {
  exportedAt?: string;
  people?: unknown[];
  places?: unknown[];
  meetings?: unknown[];
  categories?: unknown[];
  groups?: unknown[];
};

export default function BackupPanel() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(false);
  const [done, setDone] = useState<{ people: number; places: number; meetings: number } | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setDone(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result ?? ""));
        if (!Array.isArray(data.people) || !Array.isArray(data.places) || !Array.isArray(data.meetings)) {
          setError("이 파일은 모임 기록 백업 파일이 아닌 것 같아요.");
          setParsed(null);
          return;
        }
        setParsed(data);
      } catch {
        setError("파일을 읽을 수 없어요. 올바른 백업 파일(.json)인지 확인해주세요.");
        setParsed(null);
      }
    };
    reader.readAsText(file);
  }

  async function handleRestore() {
    if (!parsed) return;
    setRestoring(true);
    setError("");
    const res = await fetch("/api/backup/restore", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed),
    });
    const data = await res.json().catch(() => ({}));
    setRestoring(false);
    if (!res.ok) {
      setError(data.error ?? "불러오기에 실패했습니다.");
      return;
    }
    setParsed(null);
    setFileName("");
    if (fileInput.current) fileInput.current.value = "";
    setDone(data.counts);
    router.refresh();
  }

  return (
    <section className="bg-white border border-[#ddd8ca] rounded-2xl p-5">
      <h2 className="text-sm font-medium mb-1">백업</h2>
      <p className="text-xs text-[#7a7768] mb-3">
        사람·장소·모임·이야기를 모두 담은 파일을 내려받아 보관하세요. 이 파일로 지금 상태를 그대로 되살릴 수 있어요.
      </p>
      <a
        href="/api/backup"
        className="block w-full py-3 bg-[#2b2a26] text-white text-sm text-center no-underline mb-4"
      >
        백업 파일 다운로드
      </a>

      <div className="pt-4 border-t border-[#ddd8ca]">
        <p className="text-sm font-medium mb-1">백업 파일 불러오기</p>
        <p className="text-xs text-[#a34a3a] mb-2">
          불러오면 <b>지금 있는 데이터는 전부 사라지고</b> 이 파일 내용으로 통째로 바뀌어요. 되돌릴 수 없으니, 먼저 위에서 지금 상태를 백업해두는 걸
          추천해요.
        </p>
        <input ref={fileInput} type="file" accept=".json,application/json" onChange={handleFile} className="mb-2" />

        {parsed && (
          <div className="bg-[#faf8f3] rounded-lg p-3 mb-2 text-sm">
            <p className="mb-2">
              <b>{fileName}</b> — 사람 {parsed.people?.length ?? 0}명, 장소 {parsed.places?.length ?? 0}곳, 모임{" "}
              {parsed.meetings?.length ?? 0}건이 들어있어요.
              {parsed.exportedAt && <span className="text-xs text-[#a09c8c]"> ({String(parsed.exportedAt).slice(0, 10)} 백업)</span>}
            </p>
            <button
              type="button"
              onClick={handleRestore}
              disabled={restoring}
              className="w-full py-2 bg-[#a34a3a] text-white text-sm disabled:opacity-50"
            >
              {restoring ? "불러오는 중..." : "이 내용으로 지금 데이터 덮어쓰기"}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-[#a34a3a] mb-2">{error}</p>}
        {done && (
          <p className="text-sm text-[#3d7a4a]">
            불러왔어요. 사람 {done.people}명, 장소 {done.places}곳, 모임 {done.meetings}건으로 바뀌었어요.
          </p>
        )}
      </div>
    </section>
  );
}
