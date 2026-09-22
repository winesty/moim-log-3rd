import Papa from "papaparse";
import { nanoid } from "nanoid";
import { Meeting, Person, Place, StoryCategory, StoryEntry } from "@/lib/types";
import { findPlacesByName } from "@/lib/storage/searchHelper";

/**
 * 예전 구글 시트(mtgCard: 한 행 = 한 사람과의 한 번의 만남)를
 * 앱의 사람 / 모임 / 이야기로 옮기는 계획을 만든다.
 * 이 파일은 계산만 하고 아무것도 저장하지 않는다 (미리보기와 실제 가져오기가 같은 계산을 쓴다).
 */

export const IMPORT_SOURCE = "FBT_2026-mtgCard";

// 시트의 열 → 앱의 기본 카테고리 이름
const STORY_COLUMNS = [
  { column: "Career", label: "커리어" },
  { column: "주요 Network", label: "주요Network" },
  { column: "Family", label: "가족관계" },
  { column: "Hobby", label: "취미" },
  { column: "기타", label: "기타" },
] as const;

// 시트의 열 → 사람 프로필 칸
const PROFILE_COLUMNS = [
  { column: "Title", field: "companyTitle" },
  { column: "Age", field: "age" },
  { column: "School", field: "education" },
] as const;

const REQUIRED_HEADERS = ["No.", "mgmtNo", "Date", "where", ...STORY_COLUMNS.map((c) => c.column), ...PROFILE_COLUMNS.map((c) => c.column)];

const DATA_COLUMNS = ["where", ...STORY_COLUMNS.map((c) => c.column), ...PROFILE_COLUMNS.map((c) => c.column)];

export interface ImportOptions {
  /** 같은 날짜 + 같은 장소에 여러 사람이 적혀 있으면 한 번의 모임으로 묶는다 */
  groupGatherings: boolean;
}

export interface ExistingData {
  people: Person[];
  places: Place[];
  meetings: Meeting[];
  categories: StoryCategory[];
}

export interface ReviewItem {
  kind: string;
  message: string;
  details?: string[];
}

export interface VerificationCheck {
  label: string;
  expected: number | string;
  actual: number | string;
  ok: boolean;
}

export interface ImportReport {
  ok: boolean;
  nothingNew: boolean;
  counts: {
    fileRows: number;
    importableRows: number;
    emptyTemplateRows: number;
    alreadyImportedRows: number;
    invalidRows: number;
    newPeople: number;
    linkedExistingPeople: number;
    newMeetings: number;
    newPlaces: number;
    reusedPlaces: number;
    newStories: number;
    newCategories: number;
    meetingsWithoutPlace: number;
  };
  skipped: {
    emptyTemplateRowNos: string[];
    alreadyImportedRowNos: string[];
    invalid: { rowNo: string; reason: string }[];
  };
  review: ReviewItem[];
  checks: VerificationCheck[];
  peoplePreview: { name: string; legacyMgmtNo: string; firstMetDate?: string; meetings: number; isNew: boolean }[];
}

export interface ImportPlan {
  batchId: string;
  people: Person[];
  places: Place[];
  meetings: Meeting[];
  categories: StoryCategory[];
  report: ImportReport;
}

type Row = Record<string, string | undefined>;

interface ParsedRow {
  rowNo: string;
  mgmt: string;
  name: string;
  suffix: string;
  date: string;
  where: string;
  raw: Row;
}

// 눈에 보이지 않는 제어문자(백스페이스 등)는 원본을 복사·붙여넣기 하다 섞인 찌꺼기라 제거한다. 줄바꿈과 탭은 유지.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const cell = (row: Row, column: string) => (row[column] ?? "").replace(CONTROL_CHARS, "").trim();

function isRealDate(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function normalizeIsoDate(raw: string): string | null {
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return isRealDate(+m[1], +m[2], +m[3]) ? raw : null;
}

function suffixToIsoDate(suffix: string): string | null {
  const m = suffix.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  return isRealDate(+m[1], +m[2], +m[3]) ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

const distinct = (values: string[]) => Array.from(new Set(values.filter((v) => v)));

export function buildImportPlan(csvText: string, existing: ExistingData, options: ImportOptions): ImportPlan {
  const now = new Date().toISOString();
  const batchId = `mtgcard-${now.replace(/[-:.TZ]/g, "").slice(0, 14)}-${nanoid(4)}`;

  const parsed = Papa.parse<Row>(csvText.replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: "greedy" });
  const headers = parsed.meta.fields ?? [];
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length > 0) {
    throw new Error(`이 파일은 mtgCard 시트 형식이 아닙니다. 없는 열: ${missing.join(", ")}`);
  }
  const sourceRows = parsed.data;

  // ---------- 1. 행 분류 ----------
  const emptyTemplateRowNos: string[] = [];
  const alreadyImportedRowNos: string[] = [];
  const invalid: { rowNo: string; reason: string }[] = [];
  const importable: ParsedRow[] = [];

  const alreadyImported = new Set<string>();
  for (const m of existing.meetings) {
    if (m.importSource === IMPORT_SOURCE) (m.importRowNos ?? []).forEach((n) => alreadyImported.add(n));
  }

  sourceRows.forEach((raw, idx) => {
    const rowNo = cell(raw, "No.") || `줄${idx + 2}`;
    const mgmt = cell(raw, "mgmtNo");
    const dateRaw = cell(raw, "Date");
    const hasContent = DATA_COLUMNS.some((c) => cell(raw, c));

    if (!mgmt && !dateRaw) {
      if (hasContent) invalid.push({ rowNo, reason: "관리번호와 날짜 없이 내용만 있음" });
      else emptyTemplateRowNos.push(rowNo);
      return;
    }
    const m = mgmt.match(/^(.+)-(\d{8})$/);
    if (!m) {
      invalid.push({ rowNo, reason: `관리번호 형식이 '이름-YYYYMMDD'가 아님 (${mgmt || "비어 있음"})` });
      return;
    }
    const date = normalizeIsoDate(dateRaw);
    if (!date) {
      invalid.push({ rowNo, reason: `날짜를 읽을 수 없음 (${dateRaw || "비어 있음"})` });
      return;
    }
    if (alreadyImported.has(rowNo)) {
      alreadyImportedRowNos.push(rowNo);
      return;
    }
    importable.push({ rowNo, mgmt, name: m[1].trim(), suffix: m[2], date, where: cell(raw, "where"), raw });
  });

  const review: ReviewItem[] = [];

  // 원본에서 제어문자가 섞여 있던 칸 (제거했다는 사실을 알려주기 위해)
  const controlCharDetails: string[] = [];
  for (const r of importable) {
    for (const col of ["mgmtNo", ...DATA_COLUMNS]) {
      const v = r.raw[col] ?? "";
      if (new RegExp(CONTROL_CHARS.source).test(v)) controlCharDetails.push(`No. ${r.rowNo} · ${col}`);
    }
  }
  if (controlCharDetails.length > 0)
    review.push({
      kind: "control-chars",
      message: `보이지 않는 제어문자(백스페이스 등)가 섞여 있던 칸 ${controlCharDetails.length}곳 — 그 문자만 제거하고 글자는 그대로 가져와요`,
      details: controlCharDetails,
    });

  // ---------- 2. 사람 ----------
  const rowsByMgmt = new Map<string, ParsedRow[]>();
  for (const r of importable) {
    const list = rowsByMgmt.get(r.mgmt);
    if (list) list.push(r);
    else rowsByMgmt.set(r.mgmt, [r]);
  }

  const existingByMgmt = new Map<string, Person>();
  for (const p of existing.people) if (p.legacyMgmtNo) existingByMgmt.set(p.legacyMgmtNo, p);

  const personIdByMgmt = new Map<string, string>();
  const newPeople: Person[] = [];
  const mergedProfileDetails: string[] = [];
  const suffixLaterDetails: string[] = [];
  const badSuffixDetails: string[] = [];
  const oddAgeDetails: string[] = [];

  rowsByMgmt.forEach((rows, mgmt) => {
    const linked = existingByMgmt.get(mgmt);
    if (linked) {
      personIdByMgmt.set(mgmt, linked.id);
      return;
    }
    const first = rows[0];
    const earliest = rows.map((r) => r.date).sort()[0];
    const firstMetDate = suffixToIsoDate(first.suffix) ?? undefined;
    if (!firstMetDate) badSuffixDetails.push(`${mgmt}: 관리번호 뒤 숫자가 올바른 날짜가 아니어서 '최초 만난 일자'를 비워 둠`);
    else if (firstMetDate > earliest) suffixLaterDetails.push(`${mgmt}: 관리번호 날짜(${firstMetDate})가 첫 기록(${earliest})보다 늦음`);

    const person: Person = {
      id: nanoid(),
      name: first.name,
      legacyMgmtNo: mgmt,
      firstMetDate,
      importBatchId: batchId,
      createdAt: `${firstMetDate ?? earliest}T00:00:00.000Z`,
      updatedAt: now,
    };
    for (const { column, field } of PROFILE_COLUMNS) {
      const values = distinct(rows.map((r) => cell(r.raw, column)));
      if (values.length === 0) continue;
      if (values.length > 1) mergedProfileDetails.push(`${mgmt} · ${column}: ${values.join(" / ")}`);
      (person as any)[field] = values.join(" / ");
    }
    if (person.age && !/^\d{1,4}$/.test(person.age)) oddAgeDetails.push(`${mgmt}: ${person.age}`);
    newPeople.push(person);
    personIdByMgmt.set(mgmt, person.id);
  });

  if (mergedProfileDetails.length > 0)
    review.push({
      kind: "profile-merged",
      message: `여러 행에 서로 다른 값이 적혀 있어 ' / '로 이어 붙인 칸 ${mergedProfileDetails.length}곳 (내용은 하나도 버리지 않았어요)`,
      details: mergedProfileDetails,
    });
  if (oddAgeDetails.length > 0)
    review.push({
      kind: "odd-age",
      message: `나이 칸이 숫자가 아닌 값('77?', '93학번' 등)인 사람 ${oddAgeDetails.length}명 — 적힌 그대로 보관해요`,
      details: oddAgeDetails,
    });
  if (suffixLaterDetails.length > 0)
    review.push({
      kind: "suffix-later",
      message: `관리번호 날짜가 첫 기록보다 늦은 사람 ${suffixLaterDetails.length}명 — 그대로 가져오지만 확인해 보세요`,
      details: suffixLaterDetails,
    });
  if (badSuffixDetails.length > 0)
    review.push({ kind: "bad-suffix", message: `관리번호 날짜가 올바르지 않은 사람 ${badSuffixDetails.length}명`, details: badSuffixDetails });

  // 같은 이름의 다른 사람 (파일 안)
  const mgmtsByName = new Map<string, string[]>();
  rowsByMgmt.forEach((rows, mgmt) => {
    const key = rows[0].name.replace(/\s+/g, "");
    const list = mgmtsByName.get(key);
    if (list) list.push(mgmt);
    else mgmtsByName.set(key, [mgmt]);
  });
  const sameNameInFile: string[] = [];
  mgmtsByName.forEach((mgmts) => {
    if (mgmts.length > 1) sameNameInFile.push(mgmts.join("  ↔  "));
  });
  if (sameNameInFile.length > 0)
    review.push({
      kind: "same-name-in-file",
      message: `파일 안의 동명이인 ${sameNameInFile.length}쌍 — 서로 다른 사람으로 가져오고, 화면에서는 최초 만난 일자로 구분해 보여줘요`,
      details: sameNameInFile,
    });

  // 앱에 이미 있는 같은 이름 (이름만 같다고 같은 사람으로 합치지 않는다)
  const existingNames = new Map<string, Person[]>();
  for (const p of existing.people) {
    const key = p.name.replace(/\s+/g, "");
    const list = existingNames.get(key);
    if (list) list.push(p);
    else existingNames.set(key, [p]);
  }
  const sameNameInApp: string[] = [];
  for (const p of newPeople) {
    const hits = existingNames.get(p.name.replace(/\s+/g, ""));
    if (hits && hits.length > 0) sameNameInApp.push(`${p.legacyMgmtNo} ↔ 앱에 이미 있는 '${hits[0].name}'${hits.length > 1 ? ` 외 ${hits.length - 1}명` : ""}`);
  }
  if (sameNameInApp.length > 0)
    review.push({
      kind: "same-name-in-app",
      message: `앱에 이미 같은 이름이 있는 사람 ${sameNameInApp.length}명 — 이름만 같다고 합치지 않고 새 사람으로 가져와요. 같은 사람이면 나중에 확인해 주세요`,
      details: sameNameInApp,
    });

  // ---------- 3. 장소 ----------
  const placeIdByName = new Map<string, string>();
  const newPlaces: Place[] = [];
  let reusedPlaces = 0;
  const ambiguousPlaces: string[] = [];

  const earliestByWhere = new Map<string, string>();
  for (const r of importable) {
    if (!r.where) continue;
    const prev = earliestByWhere.get(r.where);
    if (!prev || r.date < prev) earliestByWhere.set(r.where, r.date);
  }
  earliestByWhere.forEach((earliest, where) => {
    const matches = findPlacesByName(existing.places, where);
    if (matches.length > 0) {
      placeIdByName.set(where, matches[0].id);
      reusedPlaces++;
      if (matches.length > 1) ambiguousPlaces.push(`${where}: 같은 이름의 장소 ${matches.length}곳 중 첫 번째에 연결`);
      return;
    }
    const place: Place = {
      id: nanoid(),
      name: where,
      operatingStatus: "unconfirmed",
      importBatchId: batchId,
      createdAt: `${earliest}T00:00:00.000Z`,
      updatedAt: now,
    };
    newPlaces.push(place);
    placeIdByName.set(where, place.id);
  });
  if (ambiguousPlaces.length > 0)
    review.push({ kind: "ambiguous-place", message: `이미 같은 이름의 장소가 여러 곳 있는 경우 ${ambiguousPlaces.length}건`, details: ambiguousPlaces });

  // ---------- 4. 카테고리 ----------
  const categoryIdByLabel = new Map<string, string>(existing.categories.map((c) => [c.label, c.id]));
  const newCategories: StoryCategory[] = [];
  for (const { column, label } of STORY_COLUMNS) {
    if (categoryIdByLabel.has(label)) continue;
    if (!importable.some((r) => cell(r.raw, column))) continue;
    const cat: StoryCategory = { id: nanoid(), label, isDefault: false, createdAt: now, importBatchId: batchId };
    newCategories.push(cat);
    categoryIdByLabel.set(label, cat.id);
  }

  // ---------- 5. 모임 ----------
  const groupKey = (r: ParsedRow) =>
    options.groupGatherings && r.where ? `G|${r.date}|${r.where}` : `P|${r.mgmt}|${r.date}|${r.where}`;
  const groups = new Map<string, ParsedRow[]>();
  for (const r of importable) {
    const key = groupKey(r);
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }

  const meetings: Meeting[] = [];
  const rowMeeting = new Map<string, Meeting>(); // rowNo → 그 행이 들어간 모임
  groups.forEach((rows) => {
    const stories: StoryEntry[] = [];
    for (const r of rows) {
      const personId = personIdByMgmt.get(r.mgmt)!;
      for (const { column, label } of STORY_COLUMNS) {
        const text = cell(r.raw, column);
        if (!text) continue;
        stories.push({
          id: nanoid(),
          personId,
          content: `#${label} ${text}`,
          categoryIds: [categoryIdByLabel.get(label)!],
          createdAt: `${r.date}T00:00:00.000Z`,
        });
      }
    }
    const where = rows[0].where;
    const meeting: Meeting = {
      id: nanoid(),
      date: rows[0].date,
      attendeeIds: Array.from(new Set(rows.map((r) => personIdByMgmt.get(r.mgmt)!))),
      stops: [{ id: nanoid(), label: "1차", placeId: where ? placeIdByName.get(where)! : "" }],
      stories,
      importSource: IMPORT_SOURCE,
      importRowNos: rows.map((r) => r.rowNo),
      importBatchId: batchId,
      createdAt: now,
      updatedAt: now,
    };
    meetings.push(meeting);
    rows.forEach((r) => rowMeeting.set(r.rowNo, meeting));
  });

  // ---------- 6. 숫자 검증 ----------
  const checks: VerificationCheck[] = [];
  const add = (label: string, expected: number | string, actual: number | string) =>
    checks.push({ label, expected, actual, ok: expected === actual });

  const accounted =
    importable.length + emptyTemplateRowNos.length + alreadyImportedRowNos.length + invalid.length;
  add("원본 전체 행 = 가져올 행 + 빈 양식 행 + 이미 가져온 행 + 읽을 수 없는 행", sourceRows.length, accounted);

  const rowNoCounts = new Map<string, number>();
  sourceRows.forEach((raw, idx) => {
    const k = cell(raw, "No.") || `줄${idx + 2}`;
    rowNoCounts.set(k, (rowNoCounts.get(k) ?? 0) + 1);
  });
  add("원본의 No. 중복", 0, Array.from(rowNoCounts.values()).filter((n) => n > 1).length);

  const placedRowNos = meetings.flatMap((m) => m.importRowNos ?? []);
  add("가져올 행 수 = 모임에 들어간 행 수 (빠진 행 없음)", importable.length, placedRowNos.length);
  add("한 행이 두 모임에 들어간 경우", 0, placedRowNos.length - new Set(placedRowNos).size);

  add("사람 수 = 관리번호 종류 수", rowsByMgmt.size, newPeople.length + Array.from(rowsByMgmt.keys()).filter((k) => existingByMgmt.has(k)).length);

  // 이야기: 원본의 비어 있지 않은 칸이 글자 그대로 이야기로 들어갔는가
  const expectedStories: string[] = [];
  for (const r of importable)
    for (const { column, label } of STORY_COLUMNS) {
      const t = cell(r.raw, column);
      if (t) expectedStories.push(`${label}\u0000${t}`);
    }
  const labelById = new Map<string, string>();
  categoryIdByLabel.forEach((id, label) => labelById.set(id, label));
  const actualStories = meetings.flatMap((m) =>
    m.stories.map((s) => {
      const label = labelById.get(s.categoryIds[0]) ?? "?";
      return `${label}\u0000${s.content.slice(`#${label} `.length)}`;
    })
  );
  add("이야기 칸(경력·네트워크·가족·취미·기타) 개수", expectedStories.length, actualStories.length);
  const sortedA = expectedStories.slice().sort();
  const sortedB = actualStories.slice().sort();
  add("이야기 내용이 원본과 글자 그대로 일치하지 않는 건수", 0, sortedA.filter((v, i) => v !== sortedB[i]).length);

  // 프로필(직함·나이·학교): 원본에 적힌 값이 사람 칸에 모두 들어갔는가
  let profileExpected = 0;
  let profileFound = 0;
  const peopleByMgmt = new Map(newPeople.map((p) => [p.legacyMgmtNo!, p]));
  rowsByMgmt.forEach((rows, mgmt) => {
    const person = peopleByMgmt.get(mgmt);
    if (!person) return;
    for (const { column, field } of PROFILE_COLUMNS) {
      for (const v of distinct(rows.map((r) => cell(r.raw, column)))) {
        profileExpected++;
        if (((person as any)[field] ?? "").includes(v)) profileFound++;
      }
    }
  });
  add("직함·나이·학교 값이 사람 정보에 들어간 개수", profileExpected, profileFound);

  // 각 행의 날짜/장소/사람이 모임에 정확히 반영되었는가
  let rowMismatch = 0;
  for (const r of importable) {
    const m = rowMeeting.get(r.rowNo);
    const placeId = r.where ? placeIdByName.get(r.where) : "";
    if (!m || m.date !== r.date || m.stops[0].placeId !== (placeId ?? "") || !m.attendeeIds.includes(personIdByMgmt.get(r.mgmt)!)) rowMismatch++;
  }
  add("날짜·장소·참석자가 원본과 다른 행", 0, rowMismatch);

  const ok = checks.every((c) => c.ok);
  const meetingsWithoutPlace = meetings.filter((m) => m.stops[0].placeId === "").length;

  const meetingCountByMgmt = new Map<string, number>();
  for (const m of meetings) {
    const seen = new Set<string>();
    for (const r of importable) if (m.importRowNos!.includes(r.rowNo)) seen.add(r.mgmt);
    seen.forEach((k) => meetingCountByMgmt.set(k, (meetingCountByMgmt.get(k) ?? 0) + 1));
  }

  const report: ImportReport = {
    ok,
    nothingNew: importable.length === 0,
    counts: {
      fileRows: sourceRows.length,
      importableRows: importable.length,
      emptyTemplateRows: emptyTemplateRowNos.length,
      alreadyImportedRows: alreadyImportedRowNos.length,
      invalidRows: invalid.length,
      newPeople: newPeople.length,
      linkedExistingPeople: Array.from(rowsByMgmt.keys()).filter((k) => existingByMgmt.has(k)).length,
      newMeetings: meetings.length,
      newPlaces: newPlaces.length,
      reusedPlaces,
      newStories: actualStories.length,
      newCategories: newCategories.length,
      meetingsWithoutPlace,
    },
    skipped: { emptyTemplateRowNos, alreadyImportedRowNos, invalid },
    review,
    checks,
    peoplePreview: Array.from(rowsByMgmt.entries()).map(([mgmt, rows]) => ({
      name: rows[0].name,
      legacyMgmtNo: mgmt,
      firstMetDate: suffixToIsoDate(rows[0].suffix) ?? undefined,
      meetings: meetingCountByMgmt.get(mgmt) ?? 0,
      isNew: !existingByMgmt.has(mgmt),
    })),
  };

  return { batchId, people: newPeople, places: newPlaces, meetings, categories: newCategories, report };
}
