import { StorageProvider } from "./StorageProvider";
import {
  Meeting,
  Person,
  Place,
  MenuSnapshot,
  StoryCategory,
  Group,
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
  groups: "groups.json",
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

/**
 * v2 이전에 저장된 모임 기록(장소 하나, placeId/amount/orderedItems가
 * 최상위에 있던 구조)을 읽을 때, 현재의 stops 배열 구조로 즉시 변환한다.
 * 이미 stops가 있는 최신 기록은 그대로 통과시킨다.
 */
function normalizeMeeting(raw: any): Meeting {
  if (Array.isArray(raw.stops)) return raw as Meeting;
  return {
    id: raw.id,
    date: raw.date,
    time: raw.time,
    attendeeIds: raw.attendeeIds ?? [],
    stops: [
      {
        id: `${raw.id}-legacy-stop`,
        label: "1차",
        placeId: raw.placeId,
        amount: raw.amount,
        orderedItems: raw.orderedItems,
      },
    ],
    stories: raw.stories ?? [],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

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

  // --- Group ---
  listGroups() {
    return this.readFile<Group>(FILES.groups);
  }
  async getGroup(id: string) {
    const all = await this.listGroups();
    return all.find((g) => g.id === id) ?? null;
  }
  async upsertGroup(group: Group) {
    const all = await this.listGroups();
    const idx = all.findIndex((g) => g.id === group.id);
    if (idx >= 0) all[idx] = group;
    else all.push(group);
    await this.writeFile(FILES.groups, all);
    return group;
  }
  async deleteGroup(id: string) {
    const all = await this.listGroups();
    await this.writeFile(
      FILES.groups,
      all.filter((g) => g.id !== id)
    );
  }

  // --- Meeting ---
  async listMeetings() {
    const raw = await this.readFile<any>(FILES.meetings);
    return raw.map(normalizeMeeting);
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
