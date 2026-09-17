"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Person, Place, StoryCategory, MenuSnapshot, Group, formatMeetingDuration, derivePresentGroups } from "@/lib/types";
import { findPlacesByName, sortPlacesByName } from "@/lib/storage/searchHelper";

type StoryDraft = { tempId: string; personId: string; content: string };
type OrderRow = { name: string; price: string; qty: string };
type StopDraft = {
  tempId: string;
  label: string;
  placeId: string;
  showNewPlace: boolean;
  newPlaceName: string;
  currentMenu: MenuSnapshot | null;
  orderQty: Record<string, string>;
  newOrderRows: OrderRow[];
  amount: string;
};

function makeStopDraft(label: string): StopDraft {
  return {
    tempId: crypto.randomUUID(),
    label,
    placeId: "",
    showNewPlace: false,
    newPlaceName: "",
    currentMenu: null,
    orderQty: {},
    newOrderRows: [],
    amount: "",
  };
}

function computeStopTotal(stop: Pick<StopDraft, "currentMenu" | "orderQty" | "newOrderRows">): number {
  let total = 0;
  if (stop.currentMenu) {
    for (const item of stop.currentMenu.items) {
      const qty = Number(stop.orderQty[item.id] || 0);
      if (qty > 0 && item.price) total += item.price * qty;
    }
  }
  for (const row of stop.newOrderRows) {
    const qty = Number(row.qty || 0);
    const price = Number(row.price || 0);
    if (qty > 0 && price > 0) total += price * qty;
  }
  return total;
}

function buildOrderedItemsForStop(stop: StopDraft) {
  const items: { name: string; price?: number; quantity: number }[] = [];
  if (stop.currentMenu) {
    for (const item of stop.currentMenu.items) {
      const qty = Number(stop.orderQty[item.id] || 0);
      if (qty > 0) items.push({ name: item.name, price: item.price, quantity: qty });
    }
  }
  for (const row of stop.newOrderRows) {
    const qty = Number(row.qty || 0);
    if (qty > 0 && row.name.trim()) {
      items.push({ name: row.name.trim(), price: row.price ? Number(row.price) : undefined, quantity: qty });
    }
  }
  return items;
}

export default function MeetingForm({
  initialPeople,
  initialPlaces,
  initialCategories,
  initialGroups,
}: {
  initialPeople: Person[];
  initialPlaces: Place[];
  initialCategories: StoryCategory[];
  initialGroups: Group[];
}) {
  const router = useRouter();

  const [people, setPeople] = useState(initialPeople);
  const [places, setPlaces] = useState(initialPlaces);
  const [categories, setCategories] = useState(initialCategories);
  const [groups] = useState(initialGroups);

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("19:00");
  const [showDuration, setShowDuration] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  const [stops, setStops] = useState<StopDraft[]>([makeStopDraft("1차")]);
  const [activeStopIdx, setActiveStopIdx] = useState(0);

  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [attendeePick, setAttendeePick] = useState("");
  const [newPersonName, setNewPersonName] = useState("");

  const [stories, setStories] = useState<StoryDraft[]>([]);
  const [newCategoryLabel, setNewCategoryLabel] = useState("");
  const [saving, setSaving] = useState(false);

  function updateStop(idx: number, patch: Partial<StopDraft>) {
    setStops((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  }

  function addStop() {
    setStops((prev) => {
      const next = [...prev, makeStopDraft(`${prev.length + 1}차`)];
      setActiveStopIdx(next.length - 1);
      return next;
    });
  }

  function removeStop(idx: number) {
    if (stops.length <= 1) return;
    if (!confirm(`"${stops[idx].label}"를 이 모임에서 뺄까요?`)) return;
    setStops((prev) => prev.filter((_, i) => i !== idx));
    setActiveStopIdx((prev) => Math.max(0, prev >= idx ? prev - 1 : prev));
  }

  async function selectPlaceForStop(idx: number, newPlaceId: string) {
    updateStop(idx, { placeId: newPlaceId, orderQty: {}, newOrderRows: [], currentMenu: null, amount: "" });
    if (!newPlaceId) return;
    const res = await fetch(`/api/places/${newPlaceId}`);
    const data = await res.json();
    updateStop(idx, { currentMenu: data.currentMenu ?? null });
  }

  function setOrderQty(idx: number, itemId: string, value: string) {
    setStops((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        const orderQty = { ...s.orderQty, [itemId]: value };
        const total = computeStopTotal({ ...s, orderQty });
        return { ...s, orderQty, amount: total > 0 ? String(total) : s.amount };
      })
    );
  }

  function addOrderRow(idx: number) {
    updateStop(idx, { newOrderRows: [...stops[idx].newOrderRows, { name: "", price: "", qty: "1" }] });
  }
  function updateOrderRow(idx: number, rowIdx: number, patch: Partial<OrderRow>) {
    setStops((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        const newOrderRows = s.newOrderRows.map((r, ri) => (ri === rowIdx ? { ...r, ...patch } : r));
        const total = computeStopTotal({ ...s, newOrderRows });
        return { ...s, newOrderRows, amount: total > 0 ? String(total) : s.amount };
      })
    );
  }
  function removeOrderRow(idx: number, rowIdx: number) {
    updateStop(idx, { newOrderRows: stops[idx].newOrderRows.filter((_, ri) => ri !== rowIdx) });
  }

  async function addPlaceForStop(idx: number) {
    const name = stops[idx].newPlaceName.trim();
    if (!name) return;

    const duplicates = findPlacesByName(places, name);
    if (duplicates.length > 0) {
      const target = duplicates[0];
      const addressHint = [target.city, target.gu, target.street].filter(Boolean).join(" ") || "주소 미등록";
      const useExisting = confirm(
        `"${name}" 이름의 장소가 이미 있어요 (${addressHint}).\n\n확인 → 기존 장소를 사용할게요\n취소 → 그래도 새 장소로 등록할게요`
      );
      if (useExisting) {
        updateStop(idx, { showNewPlace: false, newPlaceName: "" });
        await selectPlaceForStop(idx, target.id);
        return;
      }
    }

    const res = await fetch("/api/places", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const created: Place = await res.json();
    setPlaces((prev) => [...prev, created]);
    updateStop(idx, { showNewPlace: false, newPlaceName: "" });
    await selectPlaceForStop(idx, created.id);
  }

  function addAttendeeFromPick() {
    if (!attendeePick) return;
    const [kind, id] = attendeePick.split(":");
    const idsToAdd: string[] = kind === "group" ? groups.find((g) => g.id === id)?.memberIds ?? [] : [id];
    const newIds = idsToAdd.filter((pid) => !attendeeIds.includes(pid));
    if (newIds.length === 0) {
      setAttendeePick("");
      return;
    }
    setAttendeeIds((prev) => [...prev, ...newIds]);
    setStories((prev) => [...prev, ...newIds.map((pid) => ({ tempId: crypto.randomUUID(), personId: pid, content: "" }))]);
    setAttendeePick("");
  }

  async function addNewPerson() {
    if (!newPersonName.trim()) return;
    try {
      const res = await fetch("/api/people", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newPersonName.trim() }),
      });
      if (!res.ok) {
        alert("참석자 추가에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }
      const created: Person = await res.json();
      setPeople((prev) => [...prev, created]);
      setAttendeeIds((prev) => [...prev, created.id]);
      setStories((prev) => [...prev, { tempId: crypto.randomUUID(), personId: created.id, content: "" }]);
      setNewPersonName("");
    } catch (err) {
      alert("참석자 추가 중 오류가 발생했습니다. 인터넷 연결을 확인해주세요.");
    }
  }

  function removeAttendee(id: string) {
    setAttendeeIds((prev) => prev.filter((x) => x !== id));
    setStories((prev) => prev.filter((s) => s.personId !== id));
  }

  function removeGroup(group: Group) {
    setAttendeeIds((prev) => prev.filter((x) => !group.memberIds.includes(x)));
    setStories((prev) => prev.filter((s) => !group.memberIds.includes(s.personId)));
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
    if (stops.some((s) => !s.placeId)) {
      alert("모든 차수에 장소를 선택해주세요.");
      return;
    }
    if (attendeeIds.length === 0) {
      alert("참석자를 선택해주세요.");
      return;
    }
    setSaving(true);
    const payload = {
      date,
      time,
      endDate: endDate || undefined,
      endTime: endTime || undefined,
      attendeeIds,
      stops: stops.map((s) => ({
        label: s.label,
        placeId: s.placeId,
        amount: s.amount ? Number(s.amount) : undefined,
        orderedItems: buildOrderedItemsForStop(s),
      })),
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
  const presentGroups = derivePresentGroups(attendeeIds, groups);
  const coveredByGroup = new Set(presentGroups.flatMap((g) => g.memberIds));
  const soloAttendeeIds = attendeeIds.filter((id) => !coveredByGroup.has(id));
  const sortedGroups = groups.slice().sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const sortedPeople = people.slice().sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const activeStop = stops[activeStopIdx];
  const activeStopIndexInArray = activeStopIdx;
  const activePlace = places.find((p) => p.id === activeStop.placeId) ?? null;
  const activeTotal = computeStopTotal(activeStop);

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

      <div>
        {!showDuration ? (
          <button type="button" onClick={() => setShowDuration(true)} className="text-xs text-[#b4622f] bg-transparent p-0">
            + 기간(몇 시간 / 몇 박) 추가
          </button>
        ) : (
          <div className="border border-[#ddd8ca] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#7a7768]">종료 일시 (몇 시간짜리 모임인지, 며칠 여행인지 자동 계산돼요)</p>
              <button
                type="button"
                onClick={() => {
                  setShowDuration(false);
                  setEndDate("");
                  setEndTime("");
                }}
                className="text-xs text-[#a09c8c] bg-transparent p-0"
              >
                지우기
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#7a7768] block mb-1">종료 일자</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full" />
              </div>
              <div>
                <label className="text-xs text-[#7a7768] block mb-1">종료 시간 (선택)</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full" />
              </div>
            </div>
            {(() => {
              const duration = formatMeetingDuration({ date, time, endDate, endTime });
              return duration ? <p className="text-xs text-[#b4622f] mt-2">기간: {duration}</p> : null;
            })()}
          </div>
        )}
      </div>

      {/* 차수 탭 */}
      <div>
        <label className="text-xs text-[#7a7768] block mb-1">장소 (같은 모임에서 2차, 3차로 이어질 수 있어요)</label>
        <div className="flex gap-1 mb-2 flex-wrap">
          {stops.map((s, idx) => (
            <button
              key={s.tempId}
              type="button"
              onClick={() => setActiveStopIdx(idx)}
              className={`px-3 py-1.5 text-sm rounded-t-lg border-b-2 ${
                idx === activeStopIdx ? "border-[#b4622f] text-[#b4622f] font-medium bg-white" : "border-transparent text-[#7a7768] bg-[#faf8f3]"
              }`}
            >
              {s.label}
              {places.find((p) => p.id === s.placeId) ? ` · ${places.find((p) => p.id === s.placeId)!.name}` : ""}
            </button>
          ))}
          <button type="button" onClick={addStop} className="px-3 py-1.5 text-sm text-[#7a7768] bg-white border border-dashed border-[#ddd8ca] rounded-lg">
            + 차수 추가
          </button>
        </div>

        <div className="border border-[#ddd8ca] rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              value={activeStop.label}
              onChange={(e) => updateStop(activeStopIndexInArray, { label: e.target.value })}
              className="text-sm font-medium w-20"
            />
            {stops.length > 1 && (
              <button type="button" onClick={() => removeStop(activeStopIndexInArray)} className="text-xs text-[#a34a3a] bg-transparent p-0 ml-auto">
                이 차수 삭제
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <select
              value={activeStop.placeId}
              onChange={(e) => selectPlaceForStop(activeStopIndexInArray, e.target.value)}
              className="flex-1"
            >
              <option value="">기존 장소에서 선택...</option>
              {sortPlacesByName(places).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => updateStop(activeStopIndexInArray, { showNewPlace: !activeStop.showNewPlace })}
              className="px-3 py-2 border border-[#ddd8ca] bg-white text-sm whitespace-nowrap"
            >
              + 새 장소
            </button>
          </div>

          {activeStop.showNewPlace && (
            <div className="mt-2 p-3 bg-[#faf8f3] rounded-lg flex flex-col gap-2">
              <input
                placeholder="장소 이름"
                value={activeStop.newPlaceName}
                onChange={(e) => updateStop(activeStopIndexInArray, { newPlaceName: e.target.value })}
              />
              <p className="text-xs text-[#a09c8c]">
                주소·전화번호는 저장 후{" "}
                <Link href="/places" className="text-[#b4622f]">
                  장소 관리
                </Link>
                에서 채워주세요.
              </p>
              <button type="button" onClick={() => addPlaceForStop(activeStopIndexInArray)} className="self-start px-3 py-2 bg-[#2b2a26] text-white text-sm">
                장소 추가
              </button>
            </div>
          )}

          {activePlace && (
            <div className="mt-2 p-3 bg-[#faf8f3] rounded-lg text-sm text-[#7a7768]">
              <div className="flex items-center justify-between mb-2">
                {addressOf(activePlace) ? <div>주소: {addressOf(activePlace)}</div> : <div />}
                <button
                  type="button"
                  onClick={() => selectPlaceForStop(activeStopIndexInArray, "")}
                  className="text-xs text-[#7a7768] bg-transparent p-0"
                >
                  선택 해제
                </button>
              </div>

              <p className="text-xs font-medium text-[#2b2a26] mb-1">메뉴 주문 (수량 선택 시 금액 자동 계산)</p>
              {activeStop.currentMenu && activeStop.currentMenu.items.length > 0 ? (
                <div className="flex flex-col gap-1 mb-2">
                  {activeStop.currentMenu.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="flex-1 text-xs">
                        {item.name} {item.price ? `(${item.price.toLocaleString()}원)` : ""}
                      </span>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={activeStop.orderQty[item.id] ?? ""}
                        onChange={(e) => setOrderQty(activeStopIndexInArray, item.id, e.target.value)}
                        className="w-16 text-xs"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs mb-2">등록된 메뉴가 없습니다.</p>
              )}

              {activeStop.newOrderRows.map((row, ri) => (
                <div key={ri} className="flex items-center gap-2 mb-1">
                  <input
                    placeholder="메뉴명"
                    value={row.name}
                    onChange={(e) => updateOrderRow(activeStopIndexInArray, ri, { name: e.target.value })}
                    className="flex-1 text-xs"
                  />
                  <input
                    type="number"
                    placeholder="가격"
                    value={row.price}
                    onChange={(e) => updateOrderRow(activeStopIndexInArray, ri, { price: e.target.value })}
                    className="w-20 text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="수량"
                    value={row.qty}
                    onChange={(e) => updateOrderRow(activeStopIndexInArray, ri, { qty: e.target.value })}
                    className="w-14 text-xs"
                  />
                  <button type="button" onClick={() => removeOrderRow(activeStopIndexInArray, ri)} className="text-xs text-[#a09c8c] bg-transparent p-0">
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOrderRow(activeStopIndexInArray)}
                className="text-xs px-2 py-1 border border-dashed border-[#ddd8ca] bg-white mb-2"
              >
                + 메뉴에 없는 항목 추가
              </button>

              {activeTotal > 0 && <p className="text-xs text-[#b4622f]">주문 합계: {activeTotal.toLocaleString()}원 (아래 금액에 자동 반영됨)</p>}

              <Link href={`/places/${activePlace.id}`} className="text-xs text-[#b4622f] block mt-2">
                장소 상세/메뉴 갱신
              </Link>
            </div>
          )}

          <div className="mt-3">
            <label className="text-xs text-[#7a7768] block mb-1">{activeStop.label} 금액 (메뉴 선택 시 자동 계산, 직접 수정도 가능)</label>
            <input
              type="number"
              placeholder="120000"
              value={activeStop.amount}
              onChange={(e) => updateStop(activeStopIndexInArray, { amount: e.target.value })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* 참석자 */}
      <div>
        <label className="text-xs text-[#7a7768] block mb-1">참석자</label>
        <div className="flex flex-col gap-2 mb-2">
          {presentGroups.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center gap-1 bg-[#e4dcc9] rounded-lg px-2 py-1.5">
              <span className="text-xs font-medium text-[#5c5330] mr-1">{g.name} 그룹</span>
              {g.memberIds.map((id) => (
                <span key={id} className="flex items-center gap-1 bg-white text-[#5c5330] text-[11px] px-2 py-0.5 rounded-full">
                  {nameOf(id)}
                  <button type="button" onClick={() => removeAttendee(id)} aria-label={`${nameOf(id)} 개별 제거`} className="text-[#5c5330]">
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => removeGroup(g)}
                className="text-[11px] text-[#5c5330] underline bg-transparent p-0 ml-1"
              >
                그룹 전체 빼기
              </button>
            </div>
          ))}
          {soloAttendeeIds.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {soloAttendeeIds.map((id) => (
                <span key={id} className="flex items-center gap-1 bg-[#f1e9e0] text-[#8a4a26] text-xs px-3 py-1 rounded-full">
                  {nameOf(id)}
                  <button type="button" onClick={() => removeAttendee(id)} aria-label={`${nameOf(id)} 제거`} className="text-[#8a4a26]">
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <select value={attendeePick} onChange={(e) => setAttendeePick(e.target.value)} className="flex-1">
            <option value="">그룹 또는 참석자 선택...</option>
            {groups.length > 0 && (
              <optgroup label="그룹 (전원 추가)">
                {sortedGroups.map((g) => (
                  <option key={g.id} value={`group:${g.id}`}>
                    {g.name} ({g.memberIds.length}명)
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="참석자">
              {sortedPeople
                .filter((p) => !attendeeIds.includes(p.id))
                .map((p) => (
                  <option key={p.id} value={`person:${p.id}`}>
                    {p.name}
                  </option>
                ))}
            </optgroup>
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

      {stops.length > 1 && (
        <p className="text-sm text-[#7a7768]">
          전체 합계: {stops.reduce((sum, s) => sum + (Number(s.amount) || 0), 0).toLocaleString()}원 ({stops.map((s) => s.label).join(" → ")})
        </p>
      )}

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
