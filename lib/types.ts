// 모임 기록 앱의 핵심 데이터 모델

export type ID = string;

export interface StoryCategory {
  id: ID;
  label: string;
  isDefault: boolean;
  createdAt: string;
  importBatchId?: string; // 시트 가져오기로 만들어진 경우, 되돌리기용 표시
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
  /** 예전 시트의 관리번호(이름-날짜). 이름이 같은 사람을 구분하는 용도로만 보관하고, 사람을 가리키는 열쇠는 id */
  legacyMgmtNo?: string;
  /** 최초 만난 일자 (YYYY-MM-DD) */
  firstMetDate?: string;
  importBatchId?: string; // 시트 가져오기로 만들어진 경우, 되돌리기용 표시
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
  importBatchId?: string; // 시트 가져오기로 만들어진 경우, 되돌리기용 표시
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

export interface OrderedItem {
  name: string;
  price?: number;
  quantity: number;
}

/**
 * 모임의 "한 차수"(1차/2차/3차 등). 같은 모임(같은 날, 같은 참석자)이
 * 장소를 옮겨가며 이어질 수 있어, 장소/메뉴/금액을 차수 단위로 따로 관리한다.
 */
export interface Stop {
  id: ID;
  label: string; // "1차", "2차" 등. 사용자가 직접 바꿀 수도 있음
  placeId: ID;
  amount?: number;
  orderedItems?: OrderedItem[];
}

export interface Meeting {
  id: ID;
  date: string;
  time?: string;
  endDate?: string; // 여러 날에 걸친 모임(1박2일 등)일 때 종료 일자
  endTime?: string; // 당일 모임이 몇 시간짜리인지 계산할 때 쓰는 종료 시간
  attendeeIds: ID[];
  stops: Stop[]; // 최소 1개
  stories: StoryEntry[];
  /** 시트 가져오기로 만들어진 모임의 출처 표시 (같은 행을 두 번 가져오지 않기 위한 확인용) */
  importSource?: string;
  importRowNos?: string[]; // 원본 시트의 No. 값들
  importBatchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StopWithPlace extends Stop {
  place: Place | null;
}

export interface MeetingSearchResult extends Omit<Meeting, "stops"> {
  stops: StopWithPlace[];
  attendees: Person[];
  presentGroups: Group[]; // 참석자 전원이 포함된 그룹들 (표시용, 자동 판별)
  soloAttendees: Person[]; // 위 그룹들에 속하지 않은 개별 참석자
}

/**
 * 사람들을 묶는 그룹. 한 사람이 여러 그룹에 속할 수 있다.
 */
export interface Group {
  id: ID;
  name: string;
  memberIds: ID[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 참석자 목록에 어떤 그룹의 멤버 전원이 포함되어 있으면, 그 모임에
 * "그 그룹이 참석했다"고 자동으로 판단한다. 별도로 그룹 소속을
 * 기록/관리할 필요 없이 참석자 구성만으로 계산된다.
 */
export function derivePresentGroups(attendeeIds: ID[], groups: Group[]): Group[] {
  const attendeeSet = new Set(attendeeIds);
  return groups.filter((g) => g.memberIds.length > 0 && g.memberIds.every((id) => attendeeSet.has(id)));
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

/** 시작/종료 일시로 모임 기간을 "3시간" 또는 "1박 2일" 형태로 계산 */
export function formatMeetingDuration(m: Pick<Meeting, "date" | "time" | "endDate" | "endTime">): string | null {
  if (!m.endDate && !m.endTime) return null;
  const endDate = m.endDate || m.date;
  const startDateTime = new Date(`${m.date}T${m.time || "00:00"}`);
  const endDateTime = new Date(`${endDate}T${m.endTime || m.time || "00:00"}`);
  const diffMs = endDateTime.getTime() - startDateTime.getTime();
  if (isNaN(diffMs) || diffMs < 0) return null;

  const nights = Math.round(
    (new Date(`${endDate}T00:00:00`).getTime() - new Date(`${m.date}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (nights > 0) return `${nights}박 ${nights + 1}일`;

  const totalMinutes = Math.round(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0 && minutes === 0) return null;
  if (minutes === 0) return `${hours}시간`;
  if (hours === 0) return `${minutes}분`;
  return `${hours}시간 ${minutes}분`;
}
