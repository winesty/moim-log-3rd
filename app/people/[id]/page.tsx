import { notFound } from "next/navigation";
import Link from "next/link";
import { getStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

function daysBetween(fromDateStr: string, toDate: Date): number {
  const from = new Date(`${fromDateStr}T00:00:00`);
  const to = new Date(toDate.toISOString().slice(0, 10) + "T00:00:00");
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function PersonDetailPage({ params }: { params: { id: string } }) {
  const storage = await getStorage();
  const person = await storage.getPerson(params.id);
  if (!person) notFound();

  const meetings = await storage.search({ personId: params.id }); // 이미 최신 일자순 정렬됨

  const stories = meetings
    .flatMap((m) => m.stories.filter((s) => s.personId === params.id).map((s) => ({ ...s, meetingDate: m.date, meetingId: m.id })))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const lastMeetingDate = meetings[0]?.date;
  const daysSinceLastMeeting = lastMeetingDate ? daysBetween(lastMeetingDate, new Date()) : null;

  return (
    <div>
      <h1 className="text-xl font-medium mb-1">{person.name}</h1>
      <p className="text-sm text-[#7a7768] mb-1">
        {[person.age && `${person.age}세`, person.career, person.companyTitle].filter(Boolean).join(" · ") || "등록된 프로필 정보 없음"}
      </p>
      {lastMeetingDate && daysSinceLastMeeting != null && (
        <p className="text-sm text-[#b4622f] mb-6">
          마지막 만남: {lastMeetingDate} ({daysSinceLastMeeting === 0 ? "오늘" : `${daysSinceLastMeeting}일 경과`})
        </p>
      )}
      {!lastMeetingDate && <p className="text-sm text-[#7a7768] mb-6">아직 함께한 모임이 없습니다.</p>}

      <div className="bg-white border border-[#ddd8ca] rounded-xl p-4 mb-4">
        <p className="text-xs text-[#a09c8c] mb-2">참석한 모임 ({meetings.length}건)</p>
        {meetings.length === 0 && <p className="text-sm text-[#7a7768]">아직 기록된 모임이 없습니다.</p>}
        <div className="flex flex-col gap-2">
          {meetings.map((m) => (
            <Link key={m.id} href={`/meeting/${m.id}`} className="block bg-[#faf8f3] rounded-lg p-2 text-sm no-underline text-[#2b2a26]">
              {m.date} · {m.place?.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white border border-[#ddd8ca] rounded-xl p-4">
        <p className="text-xs text-[#a09c8c] mb-2">{person.name}과 나눈 이야기 ({stories.length}건)</p>
        {stories.length === 0 && <p className="text-sm text-[#7a7768]">아직 기록된 이야기가 없습니다.</p>}
        <div className="flex flex-col gap-2">
          {stories.map((s) => (
            <div key={s.id} className="bg-[#faf8f3] rounded-lg p-3">
              <p className="text-[11px] text-[#a09c8c] mb-1">
                {s.createdAt.slice(0, 10)} 작성 · {s.meetingDate} 모임
              </p>
              <p className="text-sm">{s.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
