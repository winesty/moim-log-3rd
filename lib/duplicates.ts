import { Person, Place } from "@/lib/types";

export interface PersonDuplicateGroup {
  key: string;
  people: (Pick<Person, "id" | "name" | "legacyMgmtNo" | "firstMetDate"> & { meetingCount: number })[];
}

export interface PlaceDuplicateGroup {
  key: string;
  places: (Pick<Place, "id" | "name"> & { meetingCount: number })[];
}

const normalize = (name: string) => name.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/** 이름이 완전히 같은(공백 차이 정도만 있는) 사람들을 묶는다. */
export function findPersonDuplicates(
  people: Person[],
  meetingCountByPerson: Map<string, number>
): PersonDuplicateGroup[] {
  const groups = new Map<string, Person[]>();
  for (const p of people) {
    const key = normalize(p.name);
    if (!key) continue;
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }
  return Array.from(groups.entries())
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({
      key,
      people: list
        .map((p) => ({
          id: p.id,
          name: p.name,
          legacyMgmtNo: p.legacyMgmtNo,
          firstMetDate: p.firstMetDate,
          meetingCount: meetingCountByPerson.get(p.id) ?? 0,
        }))
        .sort((a, b) => b.meetingCount - a.meetingCount),
    }));
}

/**
 * 이름이 서로 포함 관계인 장소들을 묶는다. 예: "옥수해물찜칼국수"와
 * "옥수해물찜칼국수 @ 옥수역"은 뒤의 정규화된 이름이 앞을 포함하므로 같은 묶음이 된다.
 * union-find로, A~B가 묶이고 B~C가 묶이면 A·B·C를 한 그룹으로 합친다.
 */
export function findPlaceDuplicates(places: Place[], meetingCountByPlace: Map<string, number>): PlaceDuplicateGroup[] {
  const named = places.filter((p) => normalize(p.name).length >= 2);
  const parent = new Map<string, string>(named.map((p) => [p.id, p.id]));
  const find = (id: string): string => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root)!;
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (let i = 0; i < named.length; i++) {
    for (let j = i + 1; j < named.length; j++) {
      const a = normalize(named[i].name);
      const b = normalize(named[j].name);
      if (a === b || a.includes(b) || b.includes(a)) union(named[i].id, named[j].id);
    }
  }

  const clusters = new Map<string, Place[]>();
  for (const p of named) {
    const root = find(p.id);
    const list = clusters.get(root);
    if (list) list.push(p);
    else clusters.set(root, [p]);
  }

  return Array.from(clusters.entries())
    .filter(([, list]) => list.length > 1)
    .map(([key, list]) => ({
      key,
      places: list
        .map((p) => ({ id: p.id, name: p.name, meetingCount: meetingCountByPlace.get(p.id) ?? 0 }))
        .sort((a, b) => b.meetingCount - a.meetingCount),
    }));
}
