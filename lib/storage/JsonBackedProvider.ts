import {
  StorageProvider,
  BulkImportData,
  BulkImportResult,
  ImportBatchSummary,
  RemoveImportBatchResult,
  MergePeopleResult,
  MergePlacesResult,
} from "./StorageProvider";
import { BackupData } from "@/lib/types";
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
    const [meetings, people, places, menus, groups] = await Promise.all([
      this.listMeetings(),
      this.listPeople(),
      this.listPlaces(),
      this.listMenuSnapshotsAll(),
      this.listGroups(),
    ]);
    return searchMeetingsInMemory(meetings, people, places, menus, groups, query);
  }

  // --- 합치기 ---
  async mergePeople(keepId: string, removeId: string, overrides: Partial<Person> = {}): Promise<MergePeopleResult> {
    if (keepId === removeId) throw new Error("같은 사람은 합칠 수 없습니다.");
    const [people, meetings, groups] = await Promise.all([this.listPeople(), this.listMeetings(), this.listGroups()]);
    const keep = people.find((p) => p.id === keepId);
    const remove = people.find((p) => p.id === removeId);
    if (!keep || !remove) throw new Error("합칠 사람을 찾을 수 없습니다.");

    const FIELDS: (keyof Person)[] = [
      "name",
      "age",
      "birthDate",
      "education",
      "family",
      "career",
      "companyTitle",
      "network",
      "hobby",
      "etc",
    ];
    const merged: Person = { ...keep };
    for (const f of FIELDS) {
      const override = (overrides as any)[f];
      if (override !== undefined) (merged as any)[f] = override;
      else if (!merged[f] && remove[f]) (merged as any)[f] = remove[f];
    }
    // 최초 만난 일자는 더 이른 쪽을 진짜 최초로 본다.
    if (remove.firstMetDate && (!merged.firstMetDate || remove.firstMetDate < merged.firstMetDate)) {
      merged.firstMetDate = remove.firstMetDate;
    }
    merged.updatedAt = new Date().toISOString();

    let affectedMeetings = 0;
    let affectedStories = 0;
    const newMeetings = meetings.map((m) => {
      let changed = false;
      const attendeeIds = m.attendeeIds.includes(removeId)
        ? Array.from(new Set(m.attendeeIds.map((id) => (id === removeId ? keepId : id))))
        : m.attendeeIds;
      if (attendeeIds !== m.attendeeIds) changed = true;
      const stops = m.stops.map((s) => {
        if (!s.attendeeIds?.includes(removeId)) return s;
        changed = true;
        return { ...s, attendeeIds: Array.from(new Set(s.attendeeIds!.map((id) => (id === removeId ? keepId : id)))) };
      });
      const stories = m.stories.map((s) => {
        if (s.personId !== removeId) return s;
        changed = true;
        affectedStories++;
        return { ...s, personId: keepId };
      });
      if (changed) affectedMeetings++;
      return changed ? { ...m, attendeeIds, stops, stories } : m;
    });

    let affectedGroups = 0;
    const newGroups = groups.map((g) => {
      if (!g.memberIds.includes(removeId)) return g;
      affectedGroups++;
      return {
        ...g,
        memberIds: Array.from(new Set(g.memberIds.map((id) => (id === removeId ? keepId : id)))),
        updatedAt: new Date().toISOString(),
      };
    });

    const newPeople = people.filter((p) => p.id !== removeId).map((p) => (p.id === keepId ? merged : p));

    await Promise.all([
      this.writeFile(FILES.meetings, newMeetings),
      this.writeFile(FILES.groups, newGroups),
      this.writeFile(FILES.people, newPeople),
    ]);

    return { person: merged, affectedMeetings, affectedStories, affectedGroups };
  }

  async mergePlaces(keepId: string, removeId: string, overrides: Partial<Place> = {}): Promise<MergePlacesResult> {
    if (keepId === removeId) throw new Error("같은 장소는 합칠 수 없습니다.");
    const [places, meetings, menus] = await Promise.all([this.listPlaces(), this.listMeetings(), this.listMenuSnapshotsAll()]);
    const keep = places.find((p) => p.id === keepId);
    const remove = places.find((p) => p.id === removeId);
    if (!keep || !remove) throw new Error("합칠 장소를 찾을 수 없습니다.");

    const FIELDS: (keyof Place)[] = ["name", "city", "gu", "street", "detail", "zonecode", "tel", "category", "note"];
    const merged: Place = { ...keep };
    for (const f of FIELDS) {
      const override = (overrides as any)[f];
      if (override !== undefined) (merged as any)[f] = override;
      else if (!merged[f] && remove[f]) (merged as any)[f] = remove[f];
    }
    // 운영상태는 더 최근에 확인된 쪽을 따른다.
    if (remove.lastCheckedAt && (!merged.lastCheckedAt || remove.lastCheckedAt > merged.lastCheckedAt)) {
      merged.lastCheckedAt = remove.lastCheckedAt;
      merged.operatingStatus = remove.operatingStatus;
    }
    merged.updatedAt = new Date().toISOString();

    let affectedMeetings = 0;
    const newMeetings = meetings.map((m) => {
      let changed = false;
      const stops = m.stops.map((s) => {
        if (s.placeId !== removeId) return s;
        changed = true;
        return { ...s, placeId: keepId };
      });
      if (changed) affectedMeetings++;
      return changed ? { ...m, stops } : m;
    });

    let affectedMenus = 0;
    const newMenus = menus.map((s) => {
      if (s.placeId !== removeId) return s;
      affectedMenus++;
      return { ...s, placeId: keepId };
    });

    const newPlaces = places.filter((p) => p.id !== removeId).map((p) => (p.id === keepId ? merged : p));

    await Promise.all([
      this.writeFile(FILES.meetings, newMeetings),
      this.writeFile(FILES.menuSnapshots, newMenus),
      this.writeFile(FILES.places, newPlaces),
    ]);

    return { place: merged, affectedMeetings, affectedMenus };
  }

  // --- 백업 / 복원 / 전체 삭제 ---
  async exportAll(): Promise<BackupData> {
    const [people, places, meetings, categories, groups, menuSnapshots] = await Promise.all([
      this.listPeople(),
      this.listPlaces(),
      this.listMeetings(),
      this.listCategories(),
      this.listGroups(),
      this.listMenuSnapshotsAll(),
    ]);
    return { version: 1, exportedAt: new Date().toISOString(), people, places, meetings, categories, groups, menuSnapshots };
  }

  async restoreAll(data: BackupData): Promise<void> {
    await Promise.all([
      this.writeFile(FILES.people, data.people ?? []),
      this.writeFile(FILES.places, data.places ?? []),
      this.writeFile(FILES.meetings, data.meetings ?? []),
      this.writeFile(FILES.categories, data.categories ?? []),
      this.writeFile(FILES.groups, data.groups ?? []),
      this.writeFile(FILES.menuSnapshots, data.menuSnapshots ?? []),
    ]);
  }

  async deleteAll(): Promise<void> {
    await Promise.all([
      this.writeFile(FILES.people, []),
      this.writeFile(FILES.places, []),
      this.writeFile(FILES.meetings, []),
      this.writeFile(FILES.categories, []), // 비워두면 다음에 읽을 때 기본 카테고리로 다시 채워진다
      this.writeFile(FILES.groups, []),
      this.writeFile(FILES.menuSnapshots, []),
    ]);
  }

  // --- 시트 가져오기 ---
  /**
   * 여러 건을 한 번에 저장한다. 건마다 저장하면 구글 드라이브를 수백 번 오가야 해서
   * 느리고 중간에 끊기기 쉬우므로, 파일마다 한 번 읽고 한 번 쓴다.
   * 쓰는 순서는 카테고리 → 장소 → 사람 → 모임 (모임이 마지막이라, 중간에 끊겨도 가져오기 표시(importBatchId)로 되돌릴 수 있다).
   */
  async bulkImport(data: BulkImportData): Promise<BulkImportResult> {
    // 네 파일은 서로 참조하지 않는 독립된 JSON이므로 동시에 쓴다. 특히 구글 드라이브는
    // 파일 하나 쓸 때마다 네트워크 왕복이 여러 번 걸려서, 순서대로 쓰면(카테고리→장소→
    // 사람→모임) 서버리스 함수의 실행 시간 제한에 걸려 마지막 파일(주로 용량이 큰 모임)이
    // 통째로 빠지는 일이 있었다. 동시에 쓰면 전체 소요 시간이 가장 느린 파일 하나만큼으로 줄고,
    // allSettled라 한 파일이 실패해도 나머지는 그대로 저장된 채 어느 파일이 실패했는지 알 수 있다.
    const jobs: { key: keyof Omit<BulkImportResult, "errors">; run: () => Promise<void> }[] = [
      {
        key: "categories",
        run: async () => {
          if (!data.categories?.length) return;
          const all = await this.listCategories();
          await this.writeFile(FILES.categories, [...all, ...data.categories]);
        },
      },
      {
        key: "places",
        run: async () => {
          if (!data.places?.length) return;
          const all = await this.listPlaces();
          await this.writeFile(FILES.places, [...all, ...data.places]);
        },
      },
      {
        key: "people",
        run: async () => {
          if (!data.people?.length) return;
          const all = await this.listPeople();
          await this.writeFile(FILES.people, [...all, ...data.people]);
        },
      },
      {
        key: "meetings",
        run: async () => {
          if (!data.meetings?.length) return;
          const all = await this.listMeetings();
          await this.writeFile(FILES.meetings, [...all, ...data.meetings]);
        },
      },
    ];
    const settled = await Promise.allSettled(jobs.map((j) => j.run()));
    const result: BulkImportResult = { categories: true, places: true, people: true, meetings: true, errors: [] };
    settled.forEach((r, i) => {
      if (r.status === "rejected") {
        result[jobs[i].key] = false;
        result.errors.push(`${jobs[i].key}: ${r.reason?.message ?? String(r.reason)}`);
      }
    });
    return result;
  }

  async listImportBatches(): Promise<ImportBatchSummary[]> {
    const [people, places, meetings, categories] = await Promise.all([
      this.listPeople(),
      this.listPlaces(),
      this.listMeetings(),
      this.listCategories(),
    ]);
    const batches = new Map<string, ImportBatchSummary>();
    // 가져온 시각은 batchId(mtgcard-YYYYMMDDHHMMSS-…)에 들어 있다. (사람/장소의 createdAt은 '최초 만난 일자'라 쓰지 않는다)
    const importedAtOf = (id: string) => {
      const m = id.match(/^[^-]+-(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
      return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.000Z` : "";
    };
    const touch = (id: string | undefined, key: "people" | "places" | "meetings" | "categories") => {
      if (!id) return;
      const b = batches.get(id) ?? { batchId: id, importedAt: importedAtOf(id), people: 0, places: 0, meetings: 0, categories: 0 };
      b[key]++;
      batches.set(id, b);
    };
    people.forEach((x) => touch(x.importBatchId, "people"));
    places.forEach((x) => touch(x.importBatchId, "places"));
    meetings.forEach((x) => touch(x.importBatchId, "meetings"));
    categories.forEach((x) => touch(x.importBatchId, "categories"));
    return Array.from(batches.values()).sort((a, b) => (a.importedAt < b.importedAt ? 1 : -1));
  }

  async removeImportBatch(batchId: string, force = false): Promise<RemoveImportBatchResult> {
    const [people, places, meetings, categories] = await Promise.all([
      this.listPeople(),
      this.listPlaces(),
      this.listMeetings(),
      this.listCategories(),
    ]);
    const batchPeople = new Set(people.filter((p) => p.importBatchId === batchId).map((p) => p.id));
    const batchPlaces = new Set(places.filter((p) => p.importBatchId === batchId).map((p) => p.id));

    // 가져온 뒤에 사용자가 새로 만든 모임이 가져온 사람/장소를 쓰고 있으면, 지우면 그 기록이 깨진다.
    const dependents = meetings.filter(
      (m) =>
        m.importBatchId !== batchId &&
        (m.attendeeIds.some((id) => batchPeople.has(id)) || m.stops.some((s) => batchPlaces.has(s.placeId)))
    );
    if (dependents.length > 0 && !force) {
      return { removed: { people: 0, places: 0, meetings: 0, categories: 0 }, blockedByMeetings: dependents.length };
    }

    const keepMeetings = meetings.filter((m) => m.importBatchId !== batchId);
    const keepPeople = people.filter((p) => p.importBatchId !== batchId);
    const keepPlaces = places.filter((p) => p.importBatchId !== batchId);
    const keepCategories = categories.filter((c) => c.importBatchId !== batchId);
    const removed = {
      meetings: meetings.length - keepMeetings.length,
      people: people.length - keepPeople.length,
      places: places.length - keepPlaces.length,
      categories: categories.length - keepCategories.length,
    };
    // 가져올 때의 반대 순서: 모임 → 사람 → 장소 → 카테고리
    if (removed.meetings) await this.writeFile(FILES.meetings, keepMeetings);
    if (removed.people) await this.writeFile(FILES.people, keepPeople);
    if (removed.places) await this.writeFile(FILES.places, keepPlaces);
    if (removed.categories) await this.writeFile(FILES.categories, keepCategories);
    return { removed };
  }
}
