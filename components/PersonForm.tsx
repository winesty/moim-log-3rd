"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Person } from "@/lib/types";

export default function PersonForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [companyTitle, setCompanyTitle] = useState("");
  const [age, setAge] = useState("");
  const [education, setEducation] = useState("");
  const [career, setCareer] = useState("");
  const [network, setNetwork] = useState("");
  const [family, setFamily] = useState("");
  const [hobby, setHobby] = useState("");
  const [etc, setEtc] = useState("");
  const [existingPeople, setExistingPeople] = useState<Person[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/people")
      .then((res) => res.json())
      .then(setExistingPeople)
      .catch(() => {});
  }, []);

  async function handleSubmit() {
    if (!name.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }

    const duplicates = existingPeople.filter((p) => p.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (duplicates.length > 0) {
      const goToExisting = confirm(
        `"${name.trim()}" 이름의 사람이 이미 있어요.\n\n확인 → 기존 사람으로 이동할게요\n취소 → 그래도 새로 등록할게요`
      );
      if (goToExisting) {
        router.push(`/people/${duplicates[0].id}`);
        return;
      }
    }

    setSaving(true);
    const res = await fetch("/api/people", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim(), companyTitle, age, education, career, network, family, hobby, etc }),
    });
    const person = await res.json();
    setSaving(false);
    router.push(`/people/${person.id}`);
  }

  return (
    <div className="bg-white border border-[#ddd8ca] rounded-2xl p-5 flex flex-col gap-5">
      <div>
        <label className="text-xs text-[#7a7768] block mb-1">이름</label>
        <input placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#7a7768] block mb-1">직함/회사</label>
          <input value={companyTitle} onChange={(e) => setCompanyTitle(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="text-xs text-[#7a7768] block mb-1">나이</label>
          <input value={age} onChange={(e) => setAge(e.target.value)} className="w-full" />
        </div>
      </div>

      <div>
        <label className="text-xs text-[#7a7768] block mb-1">학력</label>
        <input value={education} onChange={(e) => setEducation(e.target.value)} className="w-full" />
      </div>
      <div>
        <label className="text-xs text-[#7a7768] block mb-1">커리어</label>
        <textarea value={career} onChange={(e) => setCareer(e.target.value)} className="w-full min-h-[60px]" />
      </div>
      <div>
        <label className="text-xs text-[#7a7768] block mb-1">주요 Network</label>
        <input value={network} onChange={(e) => setNetwork(e.target.value)} className="w-full" />
      </div>
      <div>
        <label className="text-xs text-[#7a7768] block mb-1">가족관계</label>
        <input value={family} onChange={(e) => setFamily(e.target.value)} className="w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#7a7768] block mb-1">취미</label>
          <input value={hobby} onChange={(e) => setHobby(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="text-xs text-[#7a7768] block mb-1">기타</label>
          <input value={etc} onChange={(e) => setEtc(e.target.value)} className="w-full" />
        </div>
      </div>

      <button type="button" onClick={handleSubmit} disabled={saving} className="w-full py-3 bg-[#2b2a26] text-white text-sm disabled:opacity-50">
        {saving ? "저장 중..." : "사람 등록"}
      </button>
    </div>
  );
}
