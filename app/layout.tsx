import type { Metadata } from "next";
import Link from "next/link";
import NavLinks from "@/components/NavLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: "모임 기록",
  description: "모임과 사람, 나눈 이야기를 기록하는 개인 아카이브",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="max-w-2xl mx-auto px-4">
          <header className="flex items-center justify-between py-5 border-b border-[#ddd8ca]">
            <Link href="/" className="text-lg font-medium text-[#2b2a26] no-underline">
              모임 기록
            </Link>
            <NavLinks />
          </header>
          <main className="py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
