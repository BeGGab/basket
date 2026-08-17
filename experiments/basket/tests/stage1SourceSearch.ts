import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Read-only Stage-1 source search for TZ-BASKET-010.
 * These helpers inspect the files that exist in this repository.
 * They are not a GreenMarket buyer/seller business flow.
 */
const GREENMARKET_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const STAGE1_PATHS = {
  catalog: join(
    GREENMARKET_ROOT,
    "react-vite-bootstrap-project/src/platform-core/map/repository/mockSellerCatalog.ts"
  ),
  emulator: join(GREENMARKET_ROOT, "experiments/basket/emulator/sellers.ts"),
  basket: join(
    GREENMARKET_ROOT,
    "react-vite-bootstrap-project/src/platform-core/basket/BasketActionHandlers.ts"
  ),
  tz025: join(GREENMARKET_ROOT, "docs/specifications/27_tz025_kartochka_prodavtsa_detalnaya.md"),
} as const;

export type ListedSeed = { name: string; price: number; unit: string };

export function readStage1(kind: keyof typeof STAGE1_PATHS): string {
  return readFileSync(STAGE1_PATHS[kind], "utf8");
}

export function parseListedSeeds(source: string): ListedSeed[] {
  const seeds: ListedSeed[] = [];
  const re = /\{\s*name:\s*"([^"]+)",\s*price:\s*(\d+),\s*unit:\s*"([^"]+)"/g;
  for (const match of source.matchAll(re)) {
    seeds.push({ name: match[1], price: Number(match[2]), unit: match[3] });
  }
  return seeds;
}

export function extractCategoryBlock(source: string, category: string): string {
  const start = source.indexOf(`  ${category}: [`);
  if (start < 0) return "";
  const after = source.slice(start);
  const end = after.indexOf("\n  ],");
  return end < 0 ? after : after.slice(0, end);
}

export function findSeed(seeds: readonly ListedSeed[], name: string): ListedSeed | undefined {
  return seeds.find((seed) => seed.name === name);
}

export function mentionsSackContents(source: string): boolean {
  return /мешок|1\s*package\s*=\s*5/i.test(source);
}

export function mentionsQuantityRangeTable(source: string): boolean {
  return /1\s*[–-]\s*4|5\s*[–-]\s*9|10\+|minQuantity|maxQuantity|tierPrice|PriceSchedule|VolumePrice/.test(
    source
  );
}

export function extractFunction(source: string, name: string, nextName: string): string {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) return "";
  const next = source.indexOf(`function ${nextName}(`, start + 1);
  return next < 0 ? source.slice(start) : source.slice(start, next);
}
