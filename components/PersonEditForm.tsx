"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Person } from "@/lib/types";

export default function PersonEditForm({ person }: { person: Person }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [companyTitle, setCompanyTitle] = useState(person.companyTitle ?? "");
  const [age, setAge] = useState(person.age ?? "");
  const [education, setEducation] = useState(person.education ?? "");
  const [career, setCareer] = useState(person.career ?? "");
  const [network, setNetwork] = useState(person.network ?? "");
  const [family, setFamily] = useState(person.family ?? "");
  const [hobby, setHobby] = useState(person.hobby ?? "");
  const [etc, setEtc] = useState(person.etc ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }
    setSaving(true);
    await fetch("/api/people", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: person.id, name: name.trim(), companyTitle, age, education, career, network, family, hobby, etc }),
    });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-xs text-[#b4622f] bg-transparent p-0">
        정보 수정
      </button>
    );
  }

  return (
    <div className="mt-2 border border-[#ddd8ca] rounded-lg p-3 bg-[#faf8f3] flex flex-col gap-2">
      <p className="text-sm font-medium mb-1">사람 정보 수정</p>

      <label className="text-xs text-[#7a7768] block">이름</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-[#7a7768] block">직함/회사</label>
          <input value={companyTitle} onChange={(e) => setCompanyTitle(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="text-xs text-[#7a7768] block">나이</label>
          <input value={age} onChange={(e) => setAge(e.target.value)} className="w-full" />
        </div>
      </div>

      <label className="text-xs text-[#7a7768] block">학력</label>
      <input value={education} onChange={(e) => setEducation(e.target.value)} className="w-full" />

      <label className="text-xs text-[#7a7768] block">커리어</label>
      <textarea value={career} onChange={(e) => setCareer(e.target.value)} className="w-full min-h-[60px]" />

      <label className="text-xs text-[#7a7768] block">주요 Network</label>
      <input value={network} onChange={(e) => setNetwork(e.target.value)} className="w-full" />

      <label className="text-xs text-[#7a7768] block">가족관계</label>
      <input value={family} onChange={(e) => setFamily(e.target.value)} className="w-full" />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-[#7a7768] block">취미</label>
          <input value={hobby} onChange={(e) => setHobby(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="text-xs text-[#7a7768] block">기타</label>
          <input value={etc} onChange={(e) => setEtc(e.target.value)} className="w-full" />
        </div>
      </div>

      <div className="flex gap-2 mt-1">
        <button type="button" onClick={() => setEditing(false)} className="flex-1 py-2 border border-[#ddd8ca] bg-white text-sm">
          취소
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-[#2b2a26] text-white text-sm disabled:opacity-50">
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </div>
  );
}
