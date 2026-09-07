// 모임 기록 앱의 핵심 데이터 모델

export type ID = string;

export interface StoryCategory {
  id: ID;
  label: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Person {
  id: ID;
  name: string;
  age?: string;
  education?: string;
  family?: string;
  career?: string;
  companyTitle?: string;
  network?: string;
  hobby?: string;
  etc?: string;
  createdAt: string;
  updatedAt: string;
}

export type OperatingStatus = "operating" | "closed_suspected" | "unconfirmed";

/**
 * 장소 마스터 데이터. 메뉴는 더 이상 이 안에 들어있지 않고,
 * 별도의 MenuSnapshot(날짜별 버전)으로 관리된다.
 * 주소는 주소 검색 API(다음 우편번호) 결과를 그대로 저장한다.
 */
export interface Place {
  id: ID;
  name: string;
  city?: string; // 시/도
  gu?: string; // 시/군/구
  street?: string; // 도로명 + 건물번지
  zonecode?: string; // 우편번호
  tel?: string;
  category?: string;
  operatingStatus: OperatingStatus;
  lastCheckedAt?: string; // 운영상태를 마지막으로 확인한 일자
  note?: string; // 장소 자체에 대한 메모 (구글 시트 remark 등에서 이관)
  createdAt: string; // 최초 등록일
  updatedAt: string;
}

export interface MenuItem {
  id: ID;
  name: string;
  price?: number;
}

/**
 * 장소의 메뉴 한 "버전". 새로 입력할 때마다 새 버전이 추가되고,
 * 이전 버전은 지워지지 않고 이력으로 남는다. effectiveDate 기준으로
 * 가장 최신 버전이 "현재 메뉴"로 취급된다.
 */
export interface MenuSnapshot {
  id: ID;
  placeId: ID;
  effectiveDate: string; // YYYY-MM-DD - 이 메뉴가 등록/갱신된 기준일
  items: MenuItem[];
  promotion?: string; // 할인/행사 정보
  createdAt: string;
}

export interface StoryEntry {
  id: ID;
  personId: ID;
  content: string;
  categoryIds: ID[];
  createdAt: string;
}

export interface Meeting {
  id: ID;
  date: string;
  time?: string;
  placeId: ID;
  attendeeIds: ID[];
  amount?: number;
  stories: StoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface MeetingSearchResult extends Meeting {
  place: Place;
  attendees: Person[];
}

export type SearchQuery = {
  q?: string;
  personId?: ID;
  placeId?: ID;
  categoryId?: ID;
  dateFrom?: string;
  dateTo?: string;
};

export type PlaceSearchQuery = {
  q?: string; // 장소명, 지역, 메뉴 통합 검색
};
