"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IDLE_OPTIONS_MINUTES, formatIdleMinutes } from "@/lib/authConfig";

export default function SettingsPanel({ currentMinutes, defaultMinutes }: { currentMinutes: number; defaultMinutes: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentMinutes);
  const [message, setMessage] = useState("");

  async function chooseIdle(minutes: number) {
    setMessage("");
    const res = await fetch("/api/settings/idle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ minutes }),
    });
    if (!res.ok) {
      setMessage("저장하지 못했어요. 잠시 후 다시 시도해주세요.");
      return;
    }
    setSelected(minutes);
    // 새 시간이 지금 로그인 상태에도 바로 적용되도록, 서버에 한 번 알려서 로그인 유지 시간을 다시 계산하게 한다.
    await fetch("/api/ping", { cache: "no-store" });
    setMessage(`${formatIdleMinutes(minutes)}으로 저장됐어요. 지금부터 적용돼요.`);
  }

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="bg-white border border-[#ddd8ca] rounded-2xl p-5">
        <h2 className="text-sm font-medium mb-1">자동 로그아웃 시간</h2>
        <p className="text-xs text-[#7a7768] mb-3">앱을 쓰지 않고 이 시간이 지나면 자동으로 로그아웃돼요. 앱을 쓸 때마다 시간이 새로 시작돼요.</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {IDLE_OPTIONS_MINUTES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => chooseIdle(m)}
              className={`py-2 text-sm rounded-lg border ${
                selected === m ? "bg-[#2b2a26] text-white border-[#2b2a26]" : "bg-white text-[#2b2a26] border-[#ddd8ca]"
              }`}
            >
              {formatIdleMinutes(m)}
            </button>
          ))}
        </div>
        {message && <p className="text-xs text-[#3d7a4a] mb-2">{message}</p>}
        <p className="text-xs text-[#a09c8c]">
          이 기기(브라우저)에만 적용돼요. 휴대폰과 컴퓨터를 다르게 정할 수 있고, 브라우저 데이터를 지우면 기본값({formatIdleMinutes(defaultMinutes)})으로
          돌아가요.
        </p>
      </section>

      <section className="bg-white border border-[#ddd8ca] rounded-2xl p-5">
        <h2 className="text-sm font-medium mb-2">로그인</h2>
        <button type="button" onClick={logout} className="w-full py-3 border border-[#ddd8ca] bg-white text-sm">
          지금 로그아웃
        </button>
      </section>
    </div>
  );
}
