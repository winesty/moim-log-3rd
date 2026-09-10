import { getStorage } from "@/lib/storage";
import { notFound } from "next/navigation";
import AddStoryForm from "@/components/AddStoryForm";
import AddOrderedItemForm from "@/components/AddOrderedItemForm";
import DeleteMeetingButton from "@/components/DeleteMeetingButton";
import { latestMenuSnapshot } from "@/lib/storage/searchHelper";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const storage = await getStorage();
  const meeting = await storage.getMeeting(params.id);
  if (!meeting) notFound();

  const [place, people, categories, menuSnapshots] = await Promise.all([
    storage.getPlace(meeting.placeId),
    storage.listPeople(),
    storage.listCategories(),
    storage.listMenuSnapshots(meeting.placeId),
  ]);
  const attendees = people.filter((p) => meeting.attendeeIds.includes(p.id));
  const currentMenu = latestMenuSnapshot(menuSnapshots, meeting.placeId);

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-xl font-medium">
          {meeting.date} {meeting.time}
        </h1>
        <DeleteMeetingButton meetingId={meeting.id} />
      </div>
      <p className="text-sm text-[#7a7768] mb-1">
        {place?.name} · {attendees.map((a) => a.name).join(", ")}
      </p>
      {meeting.orderedItems && meeting.orderedItems.length > 0 && (
        <p className="text-sm text-[#a09c8c] mb-1">
          주문: {meeting.orderedItems.map((it) => `${it.name} x${it.quantity}${it.price ? `(${it.price.toLocaleString()}원)` : ""}`).join(", ")}
        </p>
      )}
      {meeting.amount != null && <p className="text-sm text-[#a09c8c] mb-4">금액: {meeting.amount.toLocaleString()}원</p>}

      <div className="flex flex-col gap-2 mb-2">
        {meeting.stories.map((s) => {
          const person = attendees.find((a) => a.id === s.personId);
          return (
            <div key={s.id} className="bg-white border border-[#ddd8ca] rounded-lg p-3">
              <p className="text-[11px] text-[#a09c8c] mb-1">
                {person?.name} · {s.createdAt.slice(0, 10)} 작성
              </p>
              <p className="text-sm">{s.content}</p>
            </div>
          );
        })}
      </div>

      <AddStoryForm meetingId={meeting.id} attendees={attendees} categories={categories} />
      {place && <AddOrderedItemForm meetingId={meeting.id} currentMenu={currentMenu} />}
    </div>
  );
}
