"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Group, Person } from "@/lib/types";

export default function GroupsPanel({ people }: { people: Person[] }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addPick, setAddPick] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const res = await fetch("/api/groups");
    setGroups(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? "(삭제된 사람)";

  async function createGroup() {
    if (!newGroupName.trim()) return;
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newGroupName.trim(), memberIds: [] }),
    });
    const created: Group = await res.json();
    setGroups((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "ko")));
    setNewGroupName("");
    setExpandedId(created.id);
  }

  async function addMember(group: Group) {
    const personId = addPick[group.id];
    if (!personId || group.memberIds.includes(personId)) return;
    const updated = { ...group, memberIds: [...group.memberIds, personId] };
    await fetch("/api/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: group.id, name: group.name, memberIds: updated.memberIds }),
    });
    setGroups((prev) => prev.map((g) => (g.id === group.id ? updated : g)));
    setAddPick((prev) => ({ ...prev, [group.id]: "" }));
  }

  async function removeMember(group: Group, personId: string) {
    const updated = { ...group, memberIds: group.memberIds.filter((id) => id !== personId) };
    await fetch("/api/groups", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: group.id, name: group.name, memberIds: updated.memberIds }),
    });
    setGroups((prev) => prev.map((g) => (g.id === group.id ? updated : g)));
  }

  async function deleteGroup(group: Group) {
    if (!confirm(`"${group.name}" 그룹을 삭제할까요? (소속된 사람들의 기록은 그대로 남아요)`)) return;
    await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
    setGroups((prev) => prev.filter((g) => g.id !== group.id));
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <input
          placeholder="새 그룹 이름 (예: 가나다)"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createGroup()}
          className="flex-1"
        />
        <button type="button" onClick={createGroup} className="px-4 py-2 bg-[#2b2a26] text-white text-sm">
          + 새 그룹
        </button>
      </div>

      {!loading && groups.length === 0 && <p className="text-sm text-[#7a7768]">등록된 그룹이 없습니다.</p>}

      <ul className="flex flex-col gap-2">
        {groups.map((g) => (
          <li key={g.id} className="border border-[#ddd8ca] rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => setExpandedId(expandedId === g.id ? null : g.id)} className="font-medium bg-transparent p-0 text-left">
                {g.name} <span className="text-xs text-[#a09c8c]">({g.memberIds.length}명)</span>
              </button>
              <button type="button" onClick={() => deleteGroup(g)} className="text-xs text-[#a34a3a] bg-transparent p-0">
                그룹 삭제
              </button>
            </div>

            <div className="flex flex-wrap gap-1 mb-2">
              {g.memberIds.map((id) => (
                <Link
                  key={id}
                  href={`/people/${id}`}
                  className="flex items-center gap-1 bg-[#f1e9e0] text-[#8a4a26] text-xs px-3 py-1 rounded-full no-underline"
                >
                  {nameOf(id)}
                </Link>
              ))}
              {g.memberIds.length === 0 && <span className="text-xs text-[#a09c8c]">아직 소속된 사람이 없어요.</span>}
            </div>

            {expandedId === g.id && (
              <div className="border-t border-[#ddd8ca] pt-2 mt-2 flex flex-col gap-2">
                <div className="flex gap-2">
                  <select
                    value={addPick[g.id] ?? ""}
                    onChange={(e) => setAddPick((prev) => ({ ...prev, [g.id]: e.target.value }))}
                    className="flex-1 text-sm"
                  >
                    <option value="">사람 추가...</option>
                    {people
                      .filter((p) => !g.memberIds.includes(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                  <button type="button" onClick={() => addMember(g)} className="px-3 py-1.5 border border-[#ddd8ca] bg-white text-sm">
                    추가
                  </button>
                </div>
                {g.memberIds.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {g.memberIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => removeMember(g, id)}
                        className="text-xs px-2 py-1 border border-[#e0b3a3] text-[#a34a3a] bg-white"
                      >
                        {nameOf(id)} 빼기
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
