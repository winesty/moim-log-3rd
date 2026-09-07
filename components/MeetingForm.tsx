"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Person, Place, StoryCategory, MenuSnapshot } from "@/lib/types";

type StoryDraft = { tempId: string; personId: string; content: string };

export default function MeetingForm({
  initialPeople,
  initialPlaces,
  initialCategories,
}: {
  initialPeople: Person[];
  initialPlaces: Place[];
  initialCategories: StoryCategory[];
}) {
  const router = useRouter();

  const [people, setPeople] = useState(initialPeople);
  const [places, setPlaces] = useState(initialPlaces);
  const [categories, setCategories] = useState(initialCategories);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("19:00");
  const [amount, setAmount] = useState<string>("");

  const [placeId, setPlaceId] = useState("");
  const [showNewPlace, setShowNewPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [currentMenu, setCurrentMenu] = useState<MenuSnapshot | null>(null);

  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [attendeePick, setAttendeePick] = useState("");
  const [newPersonName, setNewPersonName] = useState("");

  const [stories, setStories] = useState<StoryDraft[]>([]);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedPlace = places.find((p) => p.id === placeId) ?? null;

  // 장소 선택 시 현재 메뉴 불러오기
  useEffect(() => {
    if (!placeId) {
      setCurrentMenu(null);
      return;
    }
    fetch(`/api/places/${placeId}`)
      .then((res) => res.json())
      .then((data) => setCurrentMenu(data.currentMenu ?? null))
      .catch(() => setCurrentMenu(null));
  }, [placeId]);

  async function addPlace() {
    if (!newPlaceName.trim()) return;
    const res = await fetch("/api/places", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newPlaceName }),
    });
    const created: Place = await res.json();
    setPlaces((prev) => [...prev, created]);
    setPlaceId(created.id);
    setShowNewPlace(false);
    setNewPlaceName("");
  }

  function addAttendeeFromPick() {
    if (!attendeePick || attendeeIds.includes(attendeePick)) return;
    setAttendeeIds((prev) => [...prev, attendeePick]);
    setStories((prev) => [...prev, { tempId: crypto.randomUUID(), personId: attendeePick, content: "" }]);
    setAttendeePick("");
  }

  async function addNewPerson() {
    if (!newPersonName.trim()) return;
    const res = await fetch("/api/people", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newPersonName }),
    });
    const created: Person = await res.json();
    setPeople((prev) => [...prev, created]);
    setAttendeeIds((prev) => [...prev, created.id]);
    setStories((prev) => [...prev, { tempId: crypto.randomUUID(), personId: created.id, content: "" }]);
    setNewPersonName("");
  }

  function removeAttendee(id: string) {
    setAttendeeIds((prev) => prev.filter((x) => x !== id));
    setStories((prev) => prev.filter((s) => s.personId !== id));
  }

  function addStoryBlock() {
    const defaultPerson = attendeeIds[0] ?? "";
    setStories((prev) => [...prev, { tempId: crypto.randomUUID(), personId: defaultPerson, content: "" }]);
  }

  function updateStory(tempId: string, patch: Partial<StoryDraft>) {
    setStories((prev) => prev.map((s) => (s.tempId === tempId ? { ...s, ...patch } : s)));
  }

  function removeStory(tempId: string) {
    setStories((prev) => prev.filter((s) => s.tempId !== tempId));
  }

  function insertTag(tempId: string, label: string) {
    setStories((prev) =>
      prev.map((s) => (s.tempId === tempId ? { ...s, content: `${s.content}${s.content && !s.content.endsWith(" ") ? " " : ""}#${label} ` } : s))
    );
  }

  async function addCategory(tempId?: string) {
    if (!newCategoryLabel.trim()) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: newCategoryLabel.trim() }),
    });
    const created: StoryCategory = await res.json();
    setCategories((prev) => [...prev, created]);
    if (tempId) insertTag(tempId, created.label);
    setNewCategoryLabel("");
  }

  function categoryIdsInContent(content: string): string[] {
    return categories.filter((c) => content.includes(`#${c.label}`)).map((c) => c.id);
  }

  async function handleSubmit() {
    if (!placeId || attendeeIds.length === 0) {
      alert("장소와 참석자를 선택해주세요.");
      return;
    }
    setSaving(true);
    const payload = {
      date,
      time,
      placeId,
      attendeeIds,
      amount: amount ? Number(amount) : undefined,
      stories: stories
        .filter((s) => s.content.trim())
        .map((s) => ({
          personId: s.personId,
          content: s.content.trim(),
          categoryIds: categoryIdsInContent(s.content),
        })),
    };
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) router.push("/");
    else alert("저장에 실패했습니다.");
  }

  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? "";
  const addressOf = (p: Place) => [p.city, p.gu, p.street].filter(Boolean).join(" ");

  return (
    <div className="bg-white border border-[#ddd8ca] rounded-2xl p-5 flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#7a7768] block mb-1">일자</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full" />
        </div>
        <div>
          <label className="text-xs text-[#7a7768] block mb-1">시간</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full" />
        </div>
      </div>

      {/* 장소 */}
      <div>
        <label className="text-xs text-[#7a7768] block mb-1">장소</label>
        <div className="flex gap-2">
          <select value={placeId} onChange={(e) => setPlaceId(e.target.value)} className="flex-1">
            <option value="">기존 장소에서 선택...</option>
            {places.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setShowNewPlace((v) => !v)} className="px-3 py-2 border border-[#ddd8ca] bg-white text-sm">
            + 새 장소
          </button>
        </div>

        {showNewPlace && (
          <div className="mt-2 p-3 bg-[#faf8f3] rounded-lg flex flex-col gap-2">
            <input placeholder="장소 이름" value={newPlaceName} onChange={(e) => setNewPlaceName(e.target.value)} />
            <p className="text-xs text-[#a09c8c]">
              주소·전화번호·메뉴는 저장 후{" "}
              <Link href="/places" className="text-[#b4622f]">
                장소 관리
              </Link>
              에서 채워주세요.
            </p>
            <button type="button" onClick={addPlace} className="self-start px-3 py-2 bg-[#2b2a26] text-white text-sm">
              장소 추가
            </button>
          </div>
        )}

        {selectedPlace && (
          <div className="mt-2 p-3 bg-[#faf8f3] rounded-lg text-sm text-[#7a7768]">
            {addressOf(selectedPlace) && <div>주소: {addressOf(selectedPlace)}</div>}
            <div>
              메뉴:{" "}
              {currentMenu
                ? currentMenu.items.map((m) => `${m.name}${m.price ? `(${m.price.toLocaleString()}원)` : ""}`).join(", ")
                : "등록된 메뉴 없음"}
            </div>
            <Link href={`/places/${selectedPlace.id}`} className="text-xs text-[#b4622f]">
              장소 상세/메뉴 갱신
            </Link>
          </div>
        )}
      </div>

      {/* 참석자 */}
      <div>
        <label className="text-xs text-[#7a7768] block mb-1">참석자</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {attendeeIds.map((id) => (
            <span key={id} className="flex items-center gap-1 bg-[#f1e9e0] text-[#8a4a26] text-xs px-3 py-1 rounded-full">
              {nameOf(id)}
              <button type="button" onClick={() => removeAttendee(id)} aria-label={`${nameOf(id)} 제거`} className="text-[#8a4a26]">
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <select value={attendeePick} onChange={(e) => setAttendeePick(e.target.value)} className="flex-1">
            <option value="">기존 참석자에서 선택...</option>
            {people
              .filter((p) => !attendeeIds.includes(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <button type="button" onClick={addAttendeeFromPick} className="px-3 py-2 border border-[#ddd8ca] bg-white text-sm">
            추가
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          <input placeholder="새 참석자 이름" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} className="flex-1" />
          <button type="button" onClick={addNewPerson} className="px-3 py-2 border border-[#ddd8ca] bg-white text-sm">
            새 참석자 추가
          </button>
        </div>
      </div>

      {/* 이야기 */}
      {attendeeIds.length > 0 && (
        <div className="border border-[#ddd8ca] rounded-lg p-3">
          <p className="text-sm font-medium mb-2">참석자별 나눈 이야기</p>
          <div className="flex flex-col gap-3">
            {stories.map((s) => (
              <div key={s.tempId} className="bg-[#faf8f3] rounded-lg p-3">
                {attendeeIds.length > 1 && (
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs text-[#7a7768]">대상</label>
                    <select value={s.personId} onChange={(e) => updateStory(s.tempId, { personId: e.target.value })} className="flex-1">
                      {attendeeIds.map((id) => (
                        <option key={id} value={id}>
                          {nameOf(id)}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeStory(s.tempId)} className="text-xs text-[#7a7768]">
                      삭제
                    </button>
                  </div>
                )}
                <textarea
                  placeholder="나눈 이야기를 적어주세요 (#카테고리 형태로 태그를 붙일 수 있어요)"
                  value={s.content}
                  onChange={(e) => updateStory(s.tempId, { content: e.target.value })}
                  className="w-full min-h-[60px] text-sm"
                />
                <div className="flex flex-wrap gap-2 mt-2 items-center">
                  <span className="text-xs text-[#7a7768] mr-1">카테고리 삽입</span>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => insertTag(s.tempId, c.label)}
                      className="bg-[#f1e9e0] text-[#8a4a26] text-xs px-2 py-1 rounded-full border-none"
                    >
                      #{c.label}
                    </button>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      placeholder="새 카테고리"
                      value={newCategoryLabel}
                      onChange={(e) => setNewCategoryLabel(e.target.value)}
                      className="text-xs w-24 py-1"
                    />
                    <button
                      type="button"
                      onClick={() => addCategory(s.tempId)}
                      className="text-xs px-2 py-1 border border-dashed border-[#ddd8ca] bg-white"
                    >
                      + 추가
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addStoryBlock} className="mt-3 w-full text-sm py-2 border border-[#ddd8ca] bg-white">
            + 이야기 추가
          </button>
        </div>
      )}

      <div>
        <label className="text-xs text-[#7a7768] block mb-1">금액</label>
        <input type="number" placeholder="120000" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full" />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="w-full py-3 bg-[#2b2a26] text-white text-sm disabled:opacity-50"
      >
        {saving ? "저장 중..." : "모임 저장"}
      </button>
    </div>
  );
}
