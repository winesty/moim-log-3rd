import { getStorage } from "@/lib/storage";
import { personLabels } from "@/lib/personDisplay";
import { notFound } from "next/navigation";
import AddStoryForm from "@/components/AddStoryForm";
import AddOrderedItemForm from "@/components/AddOrderedItemForm";
import AddStopForm from "@/components/AddStopForm";
import DeleteStopButton from "@/components/DeleteStopButton";
import DeleteMeetingButton from "@/components/DeleteMeetingButton";
import { latestMenuSnapshot } from "@/lib/storage/searchHelper";
import { formatMeetingDuration, derivePresentGroups } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({ params }: { params: { id: string } }) {
  const storage = await getStorage();
  const meeting = await storage.getMeeting(params.id);
  if (!meeting) notFound();

  const [people, categories, places, groups] = await Promise.all([
    storage.listPeople(),
    storage.listCategories(),
    storage.listPlaces(),
    storage.listGroups(),
  ]);
  const labels = personLabels(people);
  const attendees = people.filter((p) => meeting.attendeeIds.includes(p.id));
  const presentGroups = derivePresentGroups(meeting.attendeeIds, groups);
  const coveredIds = new Set(presentGroups.flatMap((g) => g.memberIds));
  const soloAttendees = attendees.filter((a) => !coveredIds.has(a.id));
  const placesById = new Map(places.map((p) => [p.id, p]));

  const stopsWithMenu = await Promise.all(
    meeting.stops.map(async (stop) => {
      const menus = await storage.listMenuSnapshots(stop.placeId);
      return { stop, place: placesById.get(stop.placeId) ?? null, currentMenu: latestMenuSnapshot(menus, stop.placeId) };
    })
  );

  const totalAmount = meeting.stops.reduce((sum, s) => sum + (s.amount ?? 0), 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-xl font-medium">
          {meeting.date} {meeting.time}
        </h1>
        <DeleteMeetingButton meetingId={meeting.id} />
      </div>
      <p className="text-sm text-[#7a7768] mb-1">
        {[...presentGroups.map((g) => `${g.name} 그룹`), ...soloAttendees.map((a) => labels.get(a.id) ?? a.name)].join(", ")}
      </p>
      {formatMeetingDuration(meeting) && <p className="text-sm text-[#a09c8c] mb-1">기간: {formatMeetingDuration(meeting)}</p>}
      {totalAmount > 0 && <p className="text-sm text-[#a09c8c] mb-4">전체 금액: {totalAmount.toLocaleString()}원</p>}

      <div className="flex flex-col gap-4 mb-6">
        {stopsWithMenu.map(({ stop, place, currentMenu }) => (
          <div key={stop.id} className="bg-white border border-[#ddd8ca] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-sm">
                {stop.label} · {place?.name ?? "장소 미상"}
              </p>
              {meeting.stops.length > 1 && <DeleteStopButton meetingId={meeting.id} stopId={stop.id} label={stop.label} />}
            </div>
            {stop.orderedItems && stop.orderedItems.length > 0 && (
              <p className="text-xs text-[#a09c8c] mb-1">
                주문: {stop.orderedItems.map((it) => `${it.name} x${it.quantity}${it.price ? `(${it.price.toLocaleString()}원)` : ""}`).join(", ")}
              </p>
            )}
            {stop.amount != null && <p className="text-xs text-[#a09c8c] mb-2">금액: {stop.amount.toLocaleString()}원</p>}
            <AddOrderedItemForm meetingId={meeting.id} stopId={stop.id} currentMenu={currentMenu} />
          </div>
        ))}
      </div>

      <div className="mb-6">
        <AddStopForm meetingId={meeting.id} places={places} nextLabel={`${meeting.stops.length + 1}차`} />
      </div>

      <div className="flex flex-col gap-2 mb-2">
        {meeting.stories.map((s) => {
          const person = attendees.find((a) => a.id === s.personId);
          return (
            <div key={s.id} className="bg-white border border-[#ddd8ca] rounded-lg p-3">
              <p className="text-[11px] text-[#a09c8c] mb-1">
                {person ? labels.get(person.id) ?? person.name : ""} · {s.createdAt.slice(0, 10)} 작성
              </p>
              <p className="text-sm whitespace-pre-wrap">{s.content}</p>
            </div>
          );
        })}
      </div>

      <AddStoryForm meetingId={meeting.id} attendees={attendees} categories={categories} />
    </div>
  );
}
