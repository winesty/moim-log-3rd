"use client";

import { useEffect, useState } from "react";
import { StoryCategory } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<StoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/categories");
    setCategories(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(c: StoryCategory) {
    setEditingId(c.id);
    setEditValue(c.label);
  }

  async function saveEdit(id: string) {
    if (!editValue.trim()) return;
    setBusyId(id);
    await fetch(`/api/categories/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label: editValue.trim() }),
    });
    setBusyId(null);
    setEditingId(null);
    load();
  }

  async function remove(c: StoryCategory) {
    if (!confirm(`"#${c.label}" 카테고리를 삭제할까요? 기존 모임 기록에서도 이 태그가 함께 제거됩니다.`)) return;
    setBusyId(c.id);
    await fetch(`/api/categories/${c.id}`, { method: "DELETE" });
    setBusyId(null);
    load();
  }

  return (
    <div>
      <h1 className="text-xl font-medium mb-2">카테고리</h1>
      <p className="text-sm text-[#7a7768] mb-4">
        이야기에 붙이는 #태그 목록이에요. 이름을 바꾸거나 삭제하면 기존 모임 기록에도 그대로 반영돼요.
      </p>

      {loading && <p className="text-sm text-[#7a7768]">불러오는 중...</p>}

      <ul className="flex flex-col gap-2">
        {categories.map((c) => (
          <li key={c.id} className="border border-[#ddd8ca] rounded-lg p-3 bg-white flex items-center gap-2">
            {editingId === c.id ? (
              <>
                <input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="flex-1" />
                <button
                  type="button"
                  onClick={() => saveEdit(c.id)}
                  disabled={busyId === c.id}
                  className="px-3 py-1.5 bg-[#2b2a26] text-white text-xs disabled:opacity-50"
                >
                  저장
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-[#ddd8ca] bg-white text-xs">
                  취소
                </button>
              </>
            ) : (
              <>
                <span className="flex-1">
                  #{c.label} {c.isDefault && <span className="text-xs text-[#a09c8c]">(기본)</span>}
                </span>
                <button type="button" onClick={() => startEdit(c)} className="px-3 py-1.5 border border-[#ddd8ca] bg-white text-xs">
                  이름 변경
                </button>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  disabled={busyId === c.id}
                  className="px-3 py-1.5 border border-[#e0b3a3] text-[#a34a3a] bg-white text-xs disabled:opacity-50"
                >
                  삭제
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
