import Link from "next/link";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const storage = await getStorage();
  const results = await storage.search({});
  const recent = results.slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-medium">최근 모임</h1>
        <Link href="/new" className="text-sm px-3 py-2 bg-[#2b2a26] text-white rounded-lg no-underline">
          + 새 모임 기록
        </Link>
      </div>

      {recent.length === 0 && (
        <p className="text-sm text-[#7a7768]">
          아직 기록된 모임이 없습니다. "새 모임 기록"으로 첫 모임을 남겨보세요.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {recent.map((m) => (
          <li key={m.id}>
            <Link href={`/meeting/${m.id}`} className="block border border-[#ddd8ca] rounded-xl p-4 bg-white no-underline text-[#2b2a26]">
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-medium">
                  {m.date} {m.time}
                </span>
                {m.amount != null && <span className="text-sm text-[#7a7768]">{m.amount.toLocaleString()}원</span>}
              </div>
              <p className="text-sm text-[#7a7768] mb-1">{m.place?.name}</p>
              <p className="text-sm text-[#7a7768]">{m.attendees.map((a) => a.name).join(", ")}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
