"use client";

import { useState } from "react";
import Link from "next/link";

export default function ImportPlacesPage() {
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function runImport() {
    if (!csvText) return;
    setRunning(true);
    const res = await fetch("/api/import/places", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csvText }),
    });
    setResult(await res.json());
    setRunning(false);
  }

  return (
    <div>
      <h1 className="text-xl font-medium mb-2">구글 시트에서 장소 가져오기</h1>
      <p className="text-sm text-[#7a7768] mb-4">
        구글 시트를 파일 → 다운로드 → 쉼표로 구분된 값(.csv)으로 내보낸 뒤, 아래에서 업로드해주세요. 헤더 이름은{" "}
        <code className="bg-[#faf8f3] px-1 rounded">startDate, storeName, city, gu, street, tel, Category, menu, price, discount, remark</code> 을
        그대로 사용합니다.
      </p>

      <div className="bg-white border border-[#ddd8ca] rounded-2xl p-5 flex flex-col gap-4">
        <input type="file" accept=".csv" onChange={handleFile} />
        {fileName && <p className="text-xs text-[#a09c8c]">선택된 파일: {fileName}</p>}

        <button type="button" onClick={runImport} disabled={!csvText || running} className="w-full py-3 bg-[#2b2a26] text-white text-sm disabled:opacity-50">
          {running ? "가져오는 중..." : "가져오기 실행"}
        </button>

        {result && (
          <div className="bg-[#faf8f3] rounded-lg p-3 text-sm">
            <p>처리한 행: {result.rowsProcessed}건</p>
            <p>새로 만든 장소: {result.placesCreated}곳</p>
            <p>기존 장소에 정보 보완: {result.placesUpdated}곳</p>
            <p>추가된 메뉴 버전: {result.menuSnapshotsCreated}건</p>
            {result.skippedRows > 0 && <p className="text-[#a09c8c]">메뉴 정보가 없어 건너뛴 행: {result.skippedRows}건</p>}
            <Link href="/places" className="text-[#b4622f] inline-block mt-2">
              장소 목록에서 확인하기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
