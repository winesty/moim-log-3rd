import { StorageProvider } from "./StorageProvider";
import {
  Meeting,
  Person,
  Place,
  MenuSnapshot,
  StoryCategory,
  SearchQuery,
  MeetingSearchResult,
  PlaceSearchQuery,
} from "@/lib/types";
import { searchMeetingsInMemory, searchPlacesInMemory } from "./searchHelper";

const FILES = {
  people: "people.json",
  places: "places.json",
  menuSnapshots: "menu-snapshots.json",
  categories: "categories.json",
  meetings: "meetings.json",
} as const;

export const DEFAULT_CATEGORIES: Omit<StoryCategory, "id" | "createdAt">[] = [
  { label: "나이", isDefault: true },
  { label: "학력", isDefault: true },
  { label: "가족관계", isDefault: true },
  { label: "커리어", isDefault: true },
  { label: "회사및직함", isDefault: true },
  { label: "주요Network", isDefault: true },
  { label: "취미", isDefault: true },
  { label: "기타", isDefault: true },
];

export abstract class JsonBackedProvider implements StorageProvider {
  protected abstract readFile<T>(filename: string): Promise<T[]>;
  protected abstract writeFile<T>(filename: string, data: T[]): Promise<void>;

  async init(): Promise<void> {
    const categories = await this.readFile<StoryCategory>(FILES.categories);
    if (categories.length === 0) {
      const now = new Date().toISOString();
      const seeded = DEFAULT_CATEGORIES.map((c, i) => ({
        ...c,
        id: `cat_default_${i}`,
        createdAt: now,
      }));
      await this.writeFile(FILES.categories, seeded);
    }
  }

  // --- Person ---
  listPeople() {
    return this.readFile<Person>(FILES.people);
  }
  async getPerson(id: string) {
    const all = await this.listPeople();
    return all.find((p) => p.id === id) ?? null;
  }
  async upsertPerson(person: Person) {
    const all = await this.listPeople();
    const idx = all.findIndex((p) => p.id === person.id);
    if (idx >= 0) all[idx] = person;
    else all.push(person);
    await this.writeFile(FILES.people, all);
    return person;
  }
  async deletePerson(id: string) {
    const all = await this.listPeople();
    await this.writeFile(
      FILES.people,
      all.filter((p) => p.id !== id)
    );
  }

  // --- Place ---
  listPlaces() {
    return this.readFile<Place>(FILES.places);
  }
  async getPlace(id: string) {
    const all = await this.listPlaces();
    return all.find((p) => p.id === id) ?? null;
  }
  async upsertPlace(place: Place) {
    const all = await this.listPlaces();
    const idx = all.findIndex((p) => p.id === place.id);
    if (idx >= 0) all[idx] = place;
    else all.push(place);
    await this.writeFile(FILES.places, all);
    return place;
  }
  async deletePlace(id: string) {
    const all = await this.listPlaces();
    await this.writeFile(
      FILES.places,
      all.filter((p) => p.id !== id)
    );
  }
  async searchPlaces(query: PlaceSearchQuery) {
    const [places, menus] = await Promise.all([this.listPlaces(), this.listMenuSnapshotsAll()]);
    return searchPlacesInMemory(places, menus, query);
  }

  // --- MenuSnapshot ---
  private listMenuSnapshotsAll() {
    return this.readFile<MenuSnapshot>(FILES.menuSnapshots);
  }
  async listMenuSnapshots(placeId: string) {
    const all = await this.listMenuSnapshotsAll();
    return all
      .filter((s) => s.placeId === placeId)
      .sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1));
  }
  async upsertMenuSnapshot(snapshot: MenuSnapshot) {
    const all = await this.listMenuSnapshotsAll();
    const idx = all.findIndex((s) => s.id === snapshot.id);
    if (idx >= 0) all[idx] = snapshot;
    else all.push(snapshot);
    await this.writeFile(FILES.menuSnapshots, all);
    return snapshot;
  }

  // --- StoryCategory ---
  listCategories() {
    return this.readFile<StoryCategory>(FILES.categories);
  }
  async upsertCategory(category: StoryCategory) {
    const all = await this.listCategories();
    const idx = all.findIndex((c) => c.id === category.id);
    if (idx >= 0) all[idx] = category;
    else all.push(category);
    await this.writeFile(FILES.categories, all);
    return category;
  }
  async deleteCategory(id: string) {
    const all = await this.listCategories();
    await this.writeFile(
      FILES.categories,
      all.filter((c) => c.id !== id)
    );
  }

  // --- Meeting ---
  listMeetings() {
    return this.readFile<Meeting>(FILES.meetings);
  }
  async getMeeting(id: string) {
    const all = await this.listMeetings();
    return all.find((m) => m.id === id) ?? null;
  }
  async upsertMeeting(meeting: Meeting) {
    const all = await this.listMeetings();
    const idx = all.findIndex((m) => m.id === meeting.id);
    if (idx >= 0) all[idx] = meeting;
    else all.push(meeting);
    await this.writeFile(FILES.meetings, all);
    return meeting;
  }
  async deleteMeeting(id: string) {
    const all = await this.listMeetings();
    await this.writeFile(
      FILES.meetings,
      all.filter((m) => m.id !== id)
    );
  }
  async listMeetingsByPlace(placeId: string): Promise<MeetingSearchResult[]> {
    return this.search({ placeId });
  }

  // --- 검색 ---
  async search(query: SearchQuery): Promise<MeetingSearchResult[]> {
    const [meetings, people, places, menus] = await Promise.all([
      this.listMeetings(),
      this.listPeople(),
      this.listPlaces(),
      this.listMenuSnapshotsAll(),
    ]);
    return searchMeetingsInMemory(meetings, people, places, menus, query);
  }
}
