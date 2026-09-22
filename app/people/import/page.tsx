"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Check = { label: string; expected: number | string; actual: number | string; ok: boolean };
type Report = {
  ok: boolean;
  nothingNew: boolean;
  counts: Record<string, number>;
  skipped: {
    emptyTemplateRowNos: string[];
    alreadyImportedRowNos: string[];
    invalid: { rowNo: string; reason: string }[];
  };
  review: { kind: string; message: string; details?: string[] }[];
  checks: Check[];
  peoplePreview: { name: string; legacyMgmtNo: string; firstMetDate?: string; meetings: number; isNew: boolean }[];
};
type Batch = { batchId: string; importedAt: string; people: number; places: number; meetings: number; categories: number };
type CommitResult = {
  batchId: string;
  expected: { people: number; places: number; meetings: number; categories: number };
  saved: { people: number; places: number; meetings: number; categories: number };
  verified: boolean;
};

export default function ImportPeoplePage() {
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [group, setGroup] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "preview" | "commit">("");
  const [result, setResult] = useState<CommitResult | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);

  async function loadBatches() {
    const res = await fetch("/api/import/people");
    if (res.ok) setBatches(await res.json());
  }
  useEffect(() => {
    loadBatches();
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setReport(null);
    setResult(null);
    setError("");
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function run(action: "preview" | "commit") {
    if (!csvText) return;
    setBusy(action);
    setError("");
    try {
      const res = await fetch("/api/import/people", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csvText, action, groupGatherings: group }),
      });
      const data = await res.json();
      if (data.report) setReport(data.report);
      if (!res.ok) setError(data.error ?? "오류가 발생했습니다.");
      else if (action === "commit") {
        setResult(data);
        loadBatches();
      }
    } catch {
      setError("서버와 연결하지 못했습니다.");
    }
    setBusy("");
  }

  async function undo(batchId: string, force = false) {
    if (!force && !confirm("이 가져오기로 들어온 사람·모임·이야기를 모두 지웁니다. 가져온 뒤에 직접 고치거나 추가한 내용도 함께 사라져요. 되돌릴까요?")) return;
    const res = await fetch("/api/import/people", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ batchId, force }),
    });
    const data = await res.json();
    if (data.blockedByMeetings) {
      if (confirm(`가져온 사람/장소를 쓰는 다른 모임이 ${data.blockedByMeetings}건 있어요. 그래도 지우면 그 모임에서 해당 사람이 빠지고 장소가 '장소 미상'이 됩니다. 계속할까요?`)) {
        return undo(batchId, true);
      }
      return;
    }
    if (data.error) {
      alert(data.error);
      return;
    }
    setResult(null);
    setReport(null);
    loadBatches();
    alert(`되돌렸어요. 모임 ${data.removed.meetings}건, 사람 ${data.removed.people}명, 장소 ${data.removed.places}곳을 지웠습니다.`);
  }

  const c = report?.counts;

  return (
    <div>
      <h1 className="text-xl font-medium mb-2">시트에서 사람·만남 가져오기</h1>
      <p className="text-sm text-[#7a7768] mb-4">
        예전 시트(mtgCard)를 CSV로 내려받아 올려주세요. 먼저 <b>미리보기</b>로 숫자를 확인하고, 이상이 없을 때만 실제로 가져옵니다. 원본 파일은 읽기만 해요.
      </p>

      <div className="bg-white border border-[#ddd8ca] rounded-2xl p-5 flex flex-col gap-4 mb-4">
        <input type="file" accept=".csv" onChange={handleFile} />
        {fileName && <p className="text-xs text-[#a09c8c]">선택된 파일: {fileName}</p>}

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={group} onChange={(e) => { setGroup(e.target.checked); setReport(null); setResult(null); }} className="mt-1" />
          <span>
            같은 날짜, 같은 장소에 여러 사람이 적혀 있으면 <b>한 번의 모임으로 묶기</b> (권장)
            <span className="block text-xs text-[#a09c8c]">끄면 시트의 각 행이 따로따로 모임이 됩니다. 장소가 비어 있는 행은 묶지 않아요.</span>
          </span>
        </label>

        <button type="button" onClick={() => run("preview")} disabled={!csvText || busy !== ""} className="w-full py-3 bg-[#2b2a26] text-white text-sm disabled:opacity-50">
          {busy === "preview" ? "확인하는 중..." : "미리보기 (아직 저장하지 않아요)"}
        </button>
      </div>

      {error && <p className="text-sm text-[#a34a3a] bg-[#fbeeea] rounded-lg p-3 mb-4">{error}</p>}

      {report && c && !result && (
        <div className="bg-white border border-[#ddd8ca] rounded-2xl p-5 flex flex-col gap-5 mb-4">
          <section>
            <p className="text-sm font-medium mb-2">가져올 내용</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-[#faf8f3] rounded-lg p-3">사람 <b>{c.newPeople}명</b>{c.linkedExistingPeople > 0 && <span className="text-xs text-[#a09c8c]"> (이미 있는 {c.linkedExistingPeople}명에 연결)</span>}</div>
              <div className="bg-[#faf8f3] rounded-lg p-3">모임 <b>{c.newMeetings}건</b></div>
              <div className="bg-[#faf8f3] rounded-lg p-3">이야기 <b>{c.newStories}건</b></div>
              <div className="bg-[#faf8f3] rounded-lg p-3">새 장소 <b>{c.newPlaces}곳</b>{c.reusedPlaces > 0 && <span className="text-xs text-[#a09c8c]"> (기존 {c.reusedPlaces}곳 재사용)</span>}</div>
            </div>
            {c.meetingsWithoutPlace > 0 && <p className="text-xs text-[#a09c8c] mt-2">장소가 비어 있는 모임 {c.meetingsWithoutPlace}건은 '장소 미상'으로 표시돼요.</p>}
          </section>

          <section>
            <p className="text-sm font-medium mb-2">숫자 검증 {report.ok ? <span className="text-[#3d7a4a]">— 모두 통과</span> : <span className="text-[#a34a3a]">— 맞지 않는 항목이 있어요</span>}</p>
            <ul className="text-sm flex flex-col gap-1">
              {report.checks.map((k, i) => (
                <li key={i} className="flex gap-2">
                  <span className={k.ok ? "text-[#3d7a4a]" : "text-[#a34a3a]"}>{k.ok ? "✓" : "✗"}</span>
                  <span className="flex-1">{k.label}</span>
                  <span className="text-[#7a7768] whitespace-nowrap">{k.expected === k.actual ? k.actual : `${k.expected} ≠ ${k.actual}`}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <p className="text-sm font-medium mb-2">건너뛰는 행 (원본 {c.fileRows}행 중)</p>
            <ul className="text-sm flex flex-col gap-1 text-[#2b2a26]">
              <li>빈 양식 행 {c.emptyTemplateRows}행{report.skipped.emptyTemplateRowNos.length > 0 && <span className="text-xs text-[#a09c8c]"> · No. {summarizeNos(report.skipped.emptyTemplateRowNos)}</span>}</li>
              <li>이미 가져온 행 {c.alreadyImportedRows}행</li>
              <li className={c.invalidRows > 0 ? "text-[#a34a3a]" : ""}>읽을 수 없는 행 {c.invalidRows}행</li>
            </ul>
            {report.skipped.invalid.length > 0 && (
              <ul className="text-xs text-[#a34a3a] mt-1">
                {report.skipped.invalid.map((r) => (
                  <li key={r.rowNo}>No. {r.rowNo}: {r.reason}</li>
                ))}
              </ul>
            )}
          </section>

          {report.review.length > 0 && (
            <section>
              <p className="text-sm font-medium mb-2">확인해 두면 좋은 것</p>
              <div className="flex flex-col gap-2">
                {report.review.map((r) => (
                  <details key={r.kind} className="bg-[#faf8f3] rounded-lg p-3 text-sm">
                    <summary className="cursor-pointer">{r.message}</summary>
                    <ul className="text-xs text-[#7a7768] mt-2 flex flex-col gap-1 max-h-60 overflow-auto">
                      {(r.details ?? []).map((d, i) => (
                        <li key={i} className="whitespace-pre-wrap">{d}</li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </section>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer font-medium">가져올 사람 목록 ({report.peoplePreview.length}명)</summary>
            <ul className="mt-2 text-xs text-[#7a7768] flex flex-col gap-1 max-h-72 overflow-auto">
              {report.peoplePreview.map((p) => (
                <li key={p.legacyMgmtNo}>
                  {p.name} · 최초 {p.firstMetDate ?? "미상"} · 만남 {p.meetings}건 · {p.legacyMgmtNo}{!p.isNew && " (이미 있음)"}
                </li>
              ))}
            </ul>
          </details>

          <button
            type="button"
            onClick={() => run("commit")}
            disabled={!report.ok || report.nothingNew || busy !== ""}
            className="w-full py-3 bg-[#b4622f] text-white text-sm disabled:opacity-50"
          >
            {report.nothingNew ? "새로 가져올 행이 없어요" : busy === "commit" ? "가져오는 중... (창을 닫지 마세요)" : "이 내용으로 가져오기"}
          </button>
        </div>
      )}

      {result && (
        <div className="bg-white border border-[#ddd8ca] rounded-2xl p-5 mb-4 text-sm">
          <p className="font-medium mb-2">{result.verified ? "가져오기가 끝났고, 저장된 개수도 확인했어요" : "가져오기는 끝났지만 저장된 개수가 계획과 달라요"}</p>
          <p>사람 {result.saved.people}/{result.expected.people}명 · 모임 {result.saved.meetings}/{result.expected.meetings}건 · 새 장소 {result.saved.places}/{result.expected.places}곳</p>
          {!result.verified && <p className="text-[#a34a3a] mt-1">아래 '되돌리기'로 이번 가져오기를 취소한 뒤 다시 시도해 주세요.</p>}
          <div className="flex gap-3 mt-3">
            <Link href="/people" className="text-[#b4622f]">사람 목록에서 확인하기</Link>
            <button type="button" onClick={() => undo(result.batchId)} className="text-[#a34a3a] underline">이번 가져오기 되돌리기</button>
          </div>
        </div>
      )}

      {batches.length > 0 && (
        <div className="bg-white border border-[#ddd8ca] rounded-2xl p-5">
          <p className="text-sm font-medium mb-2">지금까지 가져온 내역</p>
          <ul className="flex flex-col gap-2 text-sm">
            {batches.map((b) => (
              <li key={b.batchId} className="flex items-center justify-between gap-2">
                <span className="text-[#2b2a26]">
                  {b.importedAt.slice(0, 10)} · 사람 {b.people}명 · 모임 {b.meetings}건 · 장소 {b.places}곳
                </span>
                <button type="button" onClick={() => undo(b.batchId)} className="text-xs px-2 py-1.5 border border-[#e0b3a3] text-[#a34a3a] bg-white whitespace-nowrap">
                  되돌리기
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function summarizeNos(nos: string[]): string {
  if (nos.length <= 3) return nos.join(", ");
  return `${nos[0]} ~ ${nos[nos.length - 1]}`;
}
