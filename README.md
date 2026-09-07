# 모임 기록 (moim-log)

모임/가족·지인 등과의 만남을 기록하는 개인용 웹앱입니다.

## v2에서 바뀐 점
- **장소 등록에 주소 검색(다음 우편번호 API) 적용.** `/places/new`에서 "주소 검색" 버튼으로
  시/도·시군구·도로명주소·우편번호가 자동으로 채워집니다. 별도 API 키가 필요 없습니다.
- **메뉴가 날짜별 버전(스냅샷)으로 관리됩니다.** 새로 메뉴를 등록/갱신할 때마다 새 버전이 추가되고,
  이전 버전은 지워지지 않고 이력으로 남습니다. `/places/[id]`에서 현재 메뉴와 과거 이력을 함께
  볼 수 있습니다.
- **장소 화면(`/places`)이 새로 생겼습니다.** 장소 검색, 등록, 상세(현재 메뉴 + 이력 + 이 장소에서
  열린 모임 목록)를 다룹니다.
- **구글 시트 가져오기(`/places/import`).** 기존에 스프레드시트로 관리하던 장소/메뉴 데이터를
  CSV로 내보내 업로드하면 장소와 메뉴 버전으로 자동 변환합니다. 헤더는
  `startDate, storeName, city, gu, street, tel, Category, menu, price, discount, remark` 를 사용합니다.
  같은 장소명+주소로 여러 행이 있으면 장소는 한 번만 만들고, 각 행은 그 장소의 메뉴 버전 하나씩으로
  쌓입니다.

## 데이터 모델
- `Person` (참석자): 이름 + 나이/학력/가족관계/커리어/회사및직함/주요Network/취미/기타
- `Place` (장소): 이름, 주소(시/구/도로명/우편번호), 전화번호, 분류, 운영상태, 메모
- `MenuSnapshot` (메뉴 버전): 장소 + 기준일(effectiveDate) + 메뉴 목록(이름/가격) + 할인정보.
  기준일이 가장 최신인 것이 "현재 메뉴"
- `Meeting` (모임): 일자, 시간, 장소, 참석자, 금액, 이야기 목록
- `StoryEntry` (이야기): 참석자별 대화 내용. `#카테고리` 해시태그 포함, 모임 이후에도 계속 추가 가능
- `StoryCategory`: 기본 제공 + 사용자 정의 카테고리

## 로컬 실행
```bash
npm install
cp .env.example .env.local   # STORAGE_PROVIDER=local 기본값
npm run dev
```
`http://localhost:3000` 접속. 데이터는 `.local-data/`에 JSON으로 저장됩니다.

## 구글 시트에서 장소 가져오기
1. 구글 시트에서 파일 → 다운로드 → 쉼표로 구분된 값(.csv)
2. 앱에서 `/places/import` 접속 → 그 CSV 파일 업로드 → "가져오기 실행"

## 구글 드라이브 연동 / GitHub·Vercel 배포
기존 README와 동일합니다 (Google Cloud Console에서 OAuth 클라이언트 생성 →
`STORAGE_PROVIDER=google-drive` + 3개 환경변수 → `/api/auth/google` 방문 → refresh token 발급
→ Vercel 환경변수에 등록 → 재배포).

## 폴더 구조
```
app/
  page.tsx                 최근 모임 목록 (홈)
  new/page.tsx              새 모임 입력
  meeting/[id]/page.tsx      모임 상세 + 이후 이야기 추가
  search/page.tsx            모임 검색
  places/page.tsx            장소 목록/검색
  places/new/page.tsx        장소 등록 (주소 검색 API)
  places/[id]/page.tsx       장소 상세 (현재 메뉴 + 이력 + 모임)
  places/import/page.tsx     구글 시트 CSV 가져오기
  api/                       REST API 라우트
components/
  MeetingForm.tsx
  AddStoryForm.tsx
  PlaceForm.tsx
  AddMenuSnapshotForm.tsx
lib/
  types.ts
  storage/                   StorageProvider 인터페이스 + 구현체
```
