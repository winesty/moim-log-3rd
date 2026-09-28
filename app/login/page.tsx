"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "로그인에 실패했습니다.");
      return;
    }
    router.replace(params.get("from") || "/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f4ec] px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xs bg-white border border-[#ddd8ca] rounded-2xl p-6 flex flex-col gap-4">
        <h1 className="text-lg font-medium text-[#2b2a26]">모임 기록</h1>
        <p className="text-sm text-[#7a7768]">비밀번호를 입력해주세요.</p>
        <input
          type="password"
          autoFocus
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full"
        />
        {error && <p className="text-sm text-[#a34a3a]">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-3 bg-[#2b2a26] text-white text-sm disabled:opacity-50">
          {loading ? "확인 중..." : "들어가기"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
