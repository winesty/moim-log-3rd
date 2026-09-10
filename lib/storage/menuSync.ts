import { StorageProvider } from "./StorageProvider";
import { latestMenuSnapshot } from "./searchHelper";
import { MenuItem, OrderedItem } from "@/lib/types";
import { nanoid } from "nanoid";

/**
 * 모임에서 주문한 메뉴(orderedItems)를 해당 장소의 메뉴에 반영한다.
 * - 이미 있던 메뉴 항목은 이번 모임 일자를 기준으로 갱신(가격이 바뀌었으면 가격도 갱신)
 * - 목록에 없던 항목은 새로 추가
 * 새 MenuSnapshot을 effectiveDate(모임 일자) 기준으로 만들어 저장한다.
 */
export async function syncPlaceMenuFromOrder(
  storage: StorageProvider,
  placeId: string,
  effectiveDate: string,
  orderedItems: OrderedItem[]
): Promise<void> {
  const valid = orderedItems.filter((it) => it.name?.trim() && it.quantity > 0);
  if (valid.length === 0 || !placeId) return;

  const existingSnapshots = await storage.listMenuSnapshots(placeId);
  const current = latestMenuSnapshot(existingSnapshots, placeId);
  const mergedItems: MenuItem[] = current ? current.items.map((it) => ({ ...it })) : [];

  for (const ordered of valid) {
    const match = mergedItems.find((it) => it.name.trim() === ordered.name.trim());
    if (match) {
      if (ordered.price != null) match.price = ordered.price;
    } else {
      mergedItems.push({ id: nanoid(), name: ordered.name.trim(), price: ordered.price });
    }
  }

  await storage.upsertMenuSnapshot({
    id: nanoid(),
    placeId,
    effectiveDate,
    items: mergedItems,
    createdAt: new Date().toISOString(),
  });
}
