import { Person } from "@/lib/types";

type LabelSource = Pick<Person, "id" | "name" | "firstMetDate" | "createdAt">;

const normName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "");

/**
 * 화면에 보여줄 이름. 이름이 유일하면 이름만, 같은 이름이 둘 이상이면
 * "김상규 (2017-02-07)"처럼 최초 만난 일자를 덧붙여 구분한다.
 * 사람을 가리키는 열쇠는 어디까지나 id이고, 이 라벨은 눈으로 구분하기 위한 표시일 뿐이다.
 */
export function personLabels(people: LabelSource[]): Map<string, string> {
  const groups = new Map<string, LabelSource[]>();
  for (const p of people) {
    const key = normName(p.name);
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }

  const labels = new Map<string, string>();
  groups.forEach((group) => {
    if (group.length === 1) {
      labels.set(group[0].id, group[0].name);
      return;
    }
    const seen = new Map<string, number>();
    for (const p of group) {
      const tag = p.firstMetDate ?? p.createdAt.slice(0, 10);
      const n = (seen.get(tag) ?? 0) + 1;
      seen.set(tag, n);
      labels.set(p.id, `${p.name} (${tag}${n > 1 ? ` #${n}` : ""})`);
    }
  });
  return labels;
}

/**
 * 나이 표시. 앱에서 직접 입력한 숫자는 기존처럼 "45세"로 보여주고,
 * 시트에서 가져온 값은 출생연도/학번/물음표가 섞여 있어서 적힌 그대로 보여준다
 * (네 자리 연도만 "1970년생"으로).
 */
export function formatAge(p: Pick<Person, "age" | "legacyMgmtNo">): string | null {
  const a = p.age?.trim();
  if (!a) return null;
  if (p.legacyMgmtNo) return /^\d{4}$/.test(a) ? `${a}년생` : a;
  return /^\d+$/.test(a) ? `${a}세` : a;
}
