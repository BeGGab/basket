import type { PhotoItem } from "@/platform-core/contracts/ContentBlock";
import type { ProductId, SellerId } from "@/platform-core/contracts/Action";
import { asProductId, asSellerId } from "@/platform-core/contracts/Action";

/* ============================================================================
 * BasketStore — persistence корзины (localStorage).
 *
 * По образцу SellerHistoryStore / MapSessionStore: Store — только
 * сериализация/десериализация. Источником списка позиций является сам store
 * (в Stage 1 нет backend-синхронизации). Версия в ключе защищает от
 * несовместимых форматов после изменения схемы.
 *
 * Запись — только через явные операции модуля (replaceAll / clear).
 * load() не бросает наружу: битые данные → [].
 * ========================================================================== */

const STORAGE_KEY = "gm.basket.v1";

/** Сериализуемая позиция корзины. previousPrice / availability не хранятся —
 *  при чтении всегда previousPrice=null, availability="available" (Stage 1). */
export interface StoredBasketItem {
  sellerId: SellerId;
  productId: ProductId;
  name: string;
  unit: string;
  price: number;
  photo: PhotoItem | null;
  quantity: number;
}

/** Доступ к localStorage без риска исключения в приватном режиме или
 *  окружении без DOM (npx tsx / Node): возвращает null, сохранение молча
 *  пропускается. */
function getStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function isPhotoItem(value: unknown): value is PhotoItem {
  if (typeof value !== "object" || value === null) return false;
  const photo = value as Record<string, unknown>;
  return typeof photo.id === "string" && typeof photo.placeholderColor === "string";
}

/** Нормализация прочитанной записи: отбрасываем битые позиции.
 *  Экспортируется для прямого юнит-тестирования (чистая функция). */
export function normalizeBasketItems(raw: unknown): StoredBasketItem[] {
  if (!Array.isArray(raw)) return [];
  const items: StoredBasketItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const record = entry as Record<string, unknown>;
    if (typeof record.sellerId !== "string" || typeof record.productId !== "string") continue;
    if (typeof record.name !== "string" || typeof record.unit !== "string") continue;
    if (typeof record.price !== "number" || !Number.isFinite(record.price) || record.price < 0) continue;
    if (typeof record.quantity !== "number" || !Number.isFinite(record.quantity) || record.quantity <= 0) continue;
    const photo = record.photo === null ? null : isPhotoItem(record.photo) ? record.photo : null;
    items.push({
      sellerId: asSellerId(record.sellerId),
      productId: asProductId(record.productId),
      name: record.name,
      unit: record.unit,
      price: record.price,
      photo,
      quantity: Math.floor(record.quantity),
    });
  }
  return items;
}

export const BasketStore = {
  /** Текущий список позиций. Всегда читает localStorage заново — кеша нет
   *  (как в MapSessionStore / SellerHistoryStore). */
  load(): StoredBasketItem[] {
    const storage = getStorage();
    if (!storage) return [];
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return raw ? normalizeBasketItems(JSON.parse(raw)) : [];
    } catch {
      return [];
    }
  },

  /** Полная замена содержимого корзины. При недоступном/переполненном
   *  хранилище молча пропускается. */
  replaceAll(items: StoredBasketItem[]): void {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Хранилище переполнено/заблокировано — пропускаем.
    }
  },

  /** Очистка корзины. */
  clear(): void {
    const storage = getStorage();
    if (!storage) return;
    try {
      storage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
};
