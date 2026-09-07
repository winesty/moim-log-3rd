import { getStorage } from "@/lib/storage";
import MeetingForm from "@/components/MeetingForm";

export const dynamic = "force-dynamic";

export default async function NewMeetingPage() {
  const storage = await getStorage();
  const [people, places, categories] = await Promise.all([
    storage.listPeople(),
    storage.listPlaces(),
    storage.listCategories(),
  ]);

  return (
    <div>
      <h1 className="text-xl font-medium mb-4">새 모임 기록</h1>
      <MeetingForm initialPeople={people} initialPlaces={places} initialCategories={categories} />
    </div>
  );
}
