"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/new", label: "새 모임" },
  { href: "/meetings", label: "모임" },
  { href: "/places", label: "장소" },
  { href: "/people", label: "사람" },
  { href: "/categories", label: "카테고리" },
];

// "모임" 메뉴는 목록 페이지(/meetings)뿐 아니라 모임 상세 페이지(/meeting/[id], 단수)에
// 들어가 있을 때도 켜진 상태로 보여준다. 두 경로가 이름이 비슷해 보이지만 서로 다른 라우트다.
function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (pathname.startsWith(`${href}/`)) return true;
  if (href === "/meetings" && pathname.startsWith("/meeting/")) return true;
  return false;
}

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-4 text-sm">
      {links.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`no-underline ${active ? "text-[#b4622f] font-medium" : "text-[#2b2a26] hover:text-[#b4622f]"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
