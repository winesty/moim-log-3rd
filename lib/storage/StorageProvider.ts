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

  // --- Meeting ---
  listMeetings(): Promise<Meeting[]>;
  getMeeting(id: string): Promise<Meeting | null>;
  upsertMeeting(meeting: Meeting): Promise<Meeting>;
  deleteMeeting(id: string): Promise<void>;
  /** 특정 장소에서 열린 모임만 최신순으로 */
  listMeetingsByPlace(placeId: string): Promise<MeetingSearchResult[]>;

  // --- 검색 ---
  search(query: SearchQuery): Promise<MeetingSearchResult[]>;
}
