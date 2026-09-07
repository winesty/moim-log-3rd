import {
  Meeting,
  Person,
  Place,
  MenuSnapshot,
  SearchQuery,
  MeetingSearchResult,
  PlaceSearchQuery,
} from "@/lib/types";

/** 장소별 메뉴 스냅샷 중 effectiveDate가 가장 최신인 것을 반환 */
export function latestMenuSnapshot(
  snapshots: MenuSnapshot[],
  placeId: string
): MenuSnapshot | null {
  const forPlace = snapshots.filter((s) => s.placeId === placeId);
  if (forPlace.length === 0) return null;
  return forPlace.slice().sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1))[0];
}

/** 장소별 메뉴 스냅샷 중 최신 버전을 제외한 나머지(과거 이력), 최신순 */
export function pastMenuSnapshots(snapshots: MenuSnapshot[], placeId: string): MenuSnapshot[] {
  const forPlace = snapshots
    .filter((s) => s.placeId === placeId)
    .sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1));
  return forPlace.slice(1);
}

export function searchMeetingsInMemory(
  meetings: Meeting[],
  people: Person[],
  places: Place[],
  menuSnapshots: MenuSnapshot[],
  query: SearchQuery
): MeetingSearchResult[] {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const placesById = new Map(places.map((p) => [p.id, p]));

  const q = query.q?.trim().toLowerCase();

  const matches = meetings.filter((m) => {
    const place = placesById.get(m.placeId);
    const attendees = m.attendeeIds.map((id) => peopleById.get(id)).filter(Boolean) as Person[];

    if (query.personId && !m.attendeeIds.includes(query.personId)) return false;
    if (query.placeId && m.placeId !== query.placeId) return false;
    if (query.dateFrom && m.date < query.dateFrom) return false;
    if (query.dateTo && m.date > query.dateTo) return false;
    if (query.categoryId) {
      const hasCategory = m.stories.some((s) => s.categoryIds.includes(query.categoryId!));
      if (!hasCategory) return false;
    }

    if (q) {
      const menu = place ? latestMenuSnapshot(menuSnapshots, place.id) : null;
      const haystack = [
        m.date,
        place?.name,
        place?.city,
        place?.gu,
        place?.street,
        ...(menu?.items.map((i) => i.name) ?? []),
        ...attendees.map((a) => a.name),
        ...m.stories.map((s) => s.content),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });

  return matches
    .map((m) => ({
      ...m,
      place: placesById.get(m.placeId)!,
      attendees: m.attendeeIds.map((id) => peopleById.get(id)).filter(Boolean) as Person[],
    }))
    .filter((m) => m.place)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function searchPlacesInMemory(
  places: Place[],
  menuSnapshots: MenuSnapshot[],
  query: PlaceSearchQuery
): Place[] {
  const q = query.q?.trim().toLowerCase();
  if (!q) return places.slice().sort((a, b) => (a.name > b.name ? 1 : -1));

  return places.filter((p) => {
    const menu = latestMenuSnapshot(menuSnapshots, p.id);
    const haystack = [p.name, p.city, p.gu, p.street, p.category, ...(menu?.items.map((i) => i.name) ?? [])]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
