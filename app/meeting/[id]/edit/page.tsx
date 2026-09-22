import { getStorage } from "@/lib/storage";
import { notFound } from "next/navigation";
import MeetingForm, { EditableMeetingDraft } from "@/components/MeetingForm";

export const dynamic = "force-dynamic";

export default async function EditMeetingPage({ params }: { params: { id: string } }) {
  const storage = await getStorage();
  const meeting = await storage.getMeeting(params.id);
  if (!meeting) notFound();

  const [people, places, categories, groups] = await Promise.all([
    storage.listPeople(),
    storage.listPlaces(),
    storage.listCategories(),
    storage.listGroups(),
  ]);

  const initialDraft: EditableMeetingDraft = {
    date: meeting.date,
    time: meeting.time || "19:00",
    endDate: meeting.endDate,
    endTime: meeting.endTime,
    attendeeIds: meeting.attendeeIds,
    stops: meeting.stops.map((s) => ({
      label: s.label,
      placeId: s.placeId,
      amount: s.amount,
      orderedItems: s.orderedItems ?? [],
    })),
    stories: meeting.stories.map((s) => ({ id: s.id, personId: s.personId, content: s.content, createdAt: s.createdAt })),
  };

  return (
    <div>
      <div className="bg-[#f6e6d5] border border-[#e0b98a] text-[#8a5a1e] text-sm rounded-lg px-4 py-3 mb-4">
        이 모임을 편집하고 있습니다. 날짜·시간·참석자·차수(장소·메뉴)·이야기를 자유롭게 고치고, 아래 "수정 저장"을 눌러야 실제로 반영돼요.
      </div>
      <h1 className="text-xl font-medium mb-4">
        {meeting.date} {meeting.time} 모임 편집
      </h1>
      <MeetingForm
        initialPeople={people}
        initialPlaces={places}
        initialCategories={categories}
        initialGroups={groups}
        mode="edit"
        meetingId={meeting.id}
        initialMeetingCreatedAt={meeting.createdAt}
        initialDraft={initialDraft}
      />
    </div>
  );
}
