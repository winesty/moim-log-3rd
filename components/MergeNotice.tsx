"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * 합치기가 끝난 뒤 이동해 온 화면 위에 결과를 한 번 보여준다.
 * 보여준 다음에는 주소에서 물음표 뒤 부분을 지워서, 새로고침해도 다시 뜨지 않게 한다.
 */
export default function MergeNotice() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const mergedFrom = searchParams.get("mergedFrom");
    if (!mergedFrom) return;
    const meetings = Number(searchParams.get("meetings") ?? 0);
    const stories = Number(searchParams.get("stories") ?? 0);
    const menus = Number(searchParams.get("menus") ?? 0);
    const into = searchParams.get("into") ?? "";

    const parts = [meetings > 0 ? `모임 ${meetings}건` : null, stories > 0 ? `이야기 ${stories}건` : null, menus > 0 ? `메뉴 이력 ${menus}건` : null].filter(
      Boolean
    );
    setNotice(
      `"${mergedFrom}"을(를) "${into}"에 합쳤어요.${parts.length > 0 ? ` ${parts.join(", ")}이 옮겨졌어요.` : ""}`
    );
    router.replace(pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!notice) return null;
  return <div className="bg-[#e8f0e6] border border-[#bcd8b8] text-[#3d5c3a] text-sm rounded-lg px-4 py-3 mb-4">{notice}</div>;
}
