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

/**
 * 스토리지 추상화 인터페이스. 구현체를 바꾸는 것만으로
 * 구글 드라이브 외 다른 저장소로 확장 가능하다.
 */
export interface StorageProvider {
  init(): Promise<void>;

  // --- Person ---
  listPeople(): Promise<Person[]>;
  getPerson(id: string): Promise<Person | null>;
  upsertPerson(person: Person): Promise<Person>;
  deletePerson(id: string): Promise<void>;

  // --- Place ---
  listPlaces(): Promise<Place[]>;
  getPlace(id: string): Promise<Place | null>;
  upsertPlace(place: Place): Promise<Place>;
  deletePlace(id: string): Promise<void>;
  searchPlaces(query: PlaceSearchQuery): Promise<Place[]>;

  // --- MenuSnapshot (장소별 날짜 버전 메뉴) ---
  listMenuSnapshots(placeId: string): Promise<MenuSnapshot[]>;
  upsertMenuSnapshot(snapshot: MenuSnapshot): Promise<MenuSnapshot>;

  // --- StoryCategory ---
  listCategories(): Promise<StoryCategory[]>;
  upsertCategory(category: StoryCategory): Promise<StoryCategory>;
  deleteCategory(id: string): Promise<void>;

  // --- Group (사람 묶음, 한 사람이 여러 그룹에 속할 수 있음) ---
  listGroups(): Promise<Group[]>;
  getGroup(id: string): Promise<Group | null>;
  upsertGroup(group: Group): Promise<Group>;
  deleteGroup(id: string): Promise<void>;

  // --- Meeting ---
  listMeetings(): Promise<Meeting[]>;
  getMeeting(id: string): Promise<Meeting | null>;
  upsertMeeting(meeting: Meeting): Promise<Meeting>;
  deleteMeeting(id: string): Promise<void>;
  /** 특정 장소에서 열린 모임만 최신순으로 */
  listMeetingsByPlace(placeId: string): Promise<MeetingSearchResult[]>;

  // --- 검색 ---
  search(query: SearchQuery): Promise<MeetingSearchResult[]>;

  // --- 시트 가져오기 (한 번에 읽고 한 번에 쓰기) ---
  bulkImport(data: BulkImportData): Promise<void>;
  listImportBatches(): Promise<ImportBatchSummary[]>;
  removeImportBatch(batchId: string, force?: boolean): Promise<RemoveImportBatchResult>;
}

export interface BulkImportData {
  categories?: StoryCategory[];
  places?: Place[];
  people?: Person[];
  meetings?: Meeting[];
}

export interface ImportBatchSummary {
  batchId: string;
  importedAt: string;
  people: number;
  places: number;
  meetings: number;
  categories: number;
}

export interface RemoveImportBatchResult {
  removed: { people: number; places: number; meetings: number; categories: number };
  /** 가져온 사람/장소를 이후에 다른 모임이 쓰고 있어서 지우지 못한 경우 그 모임 수 */
  blockedByMeetings?: number;
}
