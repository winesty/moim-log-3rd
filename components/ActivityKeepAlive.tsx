"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const PING_EVERY_MS = 5 * 60 * 1000; // 활동 중이면 5분에 한 번만 서버에 알린다

/**
 * 화면을 보면서 실제로 뭔가 하고 있는 동안(마우스·키보드·터치)에는 로그인 유지 시간을 늘려준다.
 * 모임을 오래 입력하다가 저장 직전에 로그아웃되는 일을 막기 위해서다.
 * 이미 로그인이 만료됐다면 화면을 바꾸지 않고(입력 중인 내용 보존) 안내만 띄운다.
 */
export default function ActivityKeepAlive() {
  const pathname = usePathname();
  const lastActivity = useRef(Date.now());
  const lastPing = useRef(Date.now());
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (pathname === "/login") return;

    const markActive = () => {
      lastActivity.current = Date.now();
    };
    const events = ["mousemove", "keydown", "touchstart", "scroll", "click"];
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

    const timer = setInterval(async () => {
      const now = Date.now();
      const activeSinceLastPing = lastActivity.current > lastPing.current;
      if (!activeSinceLastPing || now - lastPing.current < PING_EVERY_MS) return;
      lastPing.current = now;
      try {
        const res = await fetch("/api/ping", { cache: "no-store" });
        setExpired(res.status === 401);
      } catch {
        // 네트워크 문제는 무시 (다음 활동 때 다시 시도)
      }
    }, 30 * 1000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActive));
      clearInterval(timer);
    };
  }, [pathname]);

  if (!expired || pathname === "/login") return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)] bg-[#2b2a26] text-white text-sm rounded-xl px-4 py-3 shadow-lg">
      로그인이 만료됐어요. 입력 중인 내용은 그대로 있으니,{" "}
      <a href="/login" target="_blank" rel="noreferrer" className="underline text-[#f0c9a8]">
        새 탭에서 다시 로그인
      </a>
      한 뒤 이 화면으로 돌아와 저장해 주세요.
    </div>
  );
}
