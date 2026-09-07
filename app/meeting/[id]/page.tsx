import { getStorage } from "@/lib/storage";
import { notFound } from "next/navigation";
import AddStoryForm from "@/components/AddStoryForm";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const storage = await getStorage();
  const meeting = await storage.getMeeting(params.id);
  if (!meeting) notFound();

  const [place, people, categories] = await Promise.all([
    storage.getPlace(meeting.placeId),
    storage.listPeople(),
    storage.listCategories(),
  ]);
  const attendees = people.filter((p) => meeting.attendeeIds.includes(p.id));

  return (
    <div>
      <h1 className="text-xl font-medium mb-1">
        {meeting.date} {meeting.time}
      </h1>
      <p className="text-sm text-[#7a7768] mb-4">
        {place?.name} · {attendees.map((a) => a.name).join(", ")}
      </p>

      <div className="flex flex-col gap-2 mb-6">
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
    </div>
  );
}
