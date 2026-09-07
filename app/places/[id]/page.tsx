import { notFound } from "next/navigation";
import Link from "next/link";
import { getStorage } from "@/lib/storage";
import { latestMenuSnapshot, pastMenuSnapshots } from "@/lib/storage/searchHelper";
import AddMenuSnapshotForm from "@/components/AddMenuSnapshotForm";

export const dynamic = "force-dynamic";

export default async function PlaceDetailPage({ params }: { params: { id: string } }) {
  const storage = await getStorage();
  const place = await storage.getPlace(params.id);
  if (!place) notFound();

  const [menus, meetings] = await Promise.all([
    storage.listMenuSnapshots(params.id),
    storage.listMeetingsByPlace(params.id),
  ]);
  const currentMenu = latestMenuSnapshot(menus, params.id);
  const pastMenus = pastMenuSnapshots(menus, params.id);

  return (
    <div>
      <h1 className="text-xl font-medium mb-1">{place.name}</h1>
      <p className="text-sm text-[#7a7768] mb-1">{[place.city, place.gu, place.street].filter(Boolean).join(" ") || "주소 미등록"}</p>
      <p className="text-sm text-[#7a7768] mb-6">
        {place.tel || "전화번호 미등록"} {place.category ? `· ${place.category}` : ""}
      </p>

      <div className="bg-white border border-[#ddd8ca] rounded-xl p-4 mb-4">
        <p className="text-xs text-[#a09c8c] mb-2">현재 메뉴 {currentMenu ? `(${currentMenu.effectiveDate} 기준)` : ""}</p>
        {currentMenu ? (
          <div className="bg-[#faf8f3] rounded-lg p-3 mb-3">
            {currentMenu.items.map((it) => (
              <div key={it.id} className="flex justify-between text-sm mb-1">
                <span>{it.name}</span>
                <span>{it.price ? `${it.price.toLocaleString()}원` : ""}</span>
              </div>
            ))}
            {currentMenu.promotion && <p className="text-xs text-[#b4622f] mt-1">{currentMenu.promotion}</p>}
          </div>
        ) : (
          <p className="text-sm text-[#7a7768] mb-3">등록된 메뉴가 없습니다.</p>
        )}

        {pastMenus.length > 0 && (
          <details className="text-xs text-[#7a7768]">
            <summary>과거 메뉴 이력 보기 ({pastMenus.length}건)</summary>
            <div className="flex flex-col gap-2 mt-2">
              {pastMenus.map((m) => (
                <div key={m.id} className="bg-[#faf8f3] rounded-lg p-2">
                  <p className="text-[11px] text-[#a09c8c] mb-1">{m.effectiveDate} 버전</p>
                  <p className="text-sm">{m.items.map((it) => `${it.name}${it.price ? `(${it.price.toLocaleString()}원)` : ""}`).join(", ")}</p>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>

      <AddMenuSnapshotForm placeId={place.id} />

      <div className="bg-white border border-[#ddd8ca] rounded-xl p-4 mt-4">
        <p className="text-xs text-[#a09c8c] mb-2">이 장소에서의 모임 ({meetings.length}건)</p>
        {meetings.length === 0 && <p className="text-sm text-[#7a7768]">아직 기록된 모임이 없습니다.</p>}
        <div className="flex flex-col gap-2">
          {meetings.map((m) => (
            <Link
              key={m.id}
              href={`/meeting/${m.id}`}
              className="block bg-[#faf8f3] rounded-lg p-2 text-sm no-underline text-[#2b2a26]"
            >
              {m.date} · {m.attendees.map((a) => a.name).join(", ")}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
