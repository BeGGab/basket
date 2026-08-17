import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Read-only Stage-1 source search for TZ-BASKET-010.
 * These helpers inspect files in this repository.
 * They are not a GreenMarket buyer/seller business flow.
 *
 * Token detectors answer only: is this text/mechanism present in the file?
 * A miss is SOURCE ABSENT of those tokens, not absence of a market business fact.
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
  scenarios: join(GREENMARKET_ROOT, "experiments/basket/tests/scenarios.ts"),
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

function extractBalanced(source: string, openIndex: number, openCh: string, closeCh: string): string {
  if (openIndex < 0 || openIndex >= source.length || source[openIndex] !== openCh) return "";
  let depth = 0;
  let quote: string | null = null;
  for (let i = openIndex; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === openCh) depth += 1;
    else if (ch === closeCh) {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }
  return "";
}

export function extractCategoryBlock(source: string, category: string): string {
  const re = new RegExp(`(?:^|\\n)\\s*${category}\\s*:\\s*\\[`);
  const match = re.exec(source);
  if (!match) return "";
  const bracket = source.indexOf("[", match.index);
  return extractBalanced(source, bracket, "[", "]");
}

export function findSeed(seeds: readonly ListedSeed[], name: string): ListedSeed | undefined {
  return seeds.find((seed) => seed.name === name);
}

export function honeyCategoryKgCount(source: string): {
  blockFound: boolean;
  listedCount: number;
  kgCount: number;
} {
  const block = extractCategoryBlock(source, "honey");
  if (!block) return { blockFound: false, listedCount: 0, kgCount: 0 };
  const seeds = parseListedSeeds(block);
  return {
    blockFound: true,
    listedCount: seeds.length,
    kgCount: seeds.filter((seed) => seed.unit === "1 кг").length,
  };
}

export function mentionsSackContents(source: string): boolean {
  return /мешок|1\s*package\s*=\s*5/i.test(source);
}

/**
 * Heuristic token scan only. A match means those strings/identifiers appear in the file.
 * No match means SOURCE ABSENT of those tokens — not "sellers have no quantity-range rule".
 */
export function mentionsQuantityRangeTokens(source: string): boolean {
  return /1\s*[–-]\s*4|5\s*[–-]\s*9|10\+|minQuantity|maxQuantity|tierPrice|PriceSchedule|VolumePrice/.test(
    source
  );
}

function findFunctionBodyOpen(source: string, openParenIndex: number): number {
  let paren = 0;
  let angle = 0;
  let quote: string | null = null;
  for (let i = openParenIndex; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "<") {
      angle += 1;
      continue;
    }
    if (ch === ">" && angle > 0) {
      angle -= 1;
      continue;
    }
    if (ch === "(") {
      paren += 1;
      continue;
    }
    if (ch === ")") {
      paren -= 1;
      continue;
    }
    if (ch === "{" && paren === 0 && angle === 0) return i;
  }
  return -1;
}

/**
 * Locate a function/const declaration by name and return the `{ ... }` body,
 * including `function name(...)`, `export function name`, and `const name = (...) => {`.
 * Skips `{` inside TypeScript parameter types such as `Extract<Action, { type: "X" }>`.
 * Empty string means the declaration was not found in that form.
 */
export function extractNamedDeclaration(source: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${escaped}\\s*\\(`),
    new RegExp(
      `(?:export\\s+)?(?:const|let|var)\\s+${escaped}\\s*=\\s*(?:async\\s*)?(?:function\\s*\\(|\\()`
    ),
  ];
  for (const re of patterns) {
    const match = re.exec(source);
    if (!match) continue;
    const openParen = match.index + match[0].lastIndexOf("(");
    const bodyOpen = findFunctionBodyOpen(source, openParen);
    if (bodyOpen < 0) return "";
    return extractBalanced(source, bodyOpen, "{", "}");
  }
  return "";
}

/** True only for a real FLOW-010 scenario run / helper, not for prose mentioning the old ids. */
export function flow010ArtifactsPresent(source: string): {
  flow010Run: boolean;
  observeCooperativeAccept: boolean;
} {
  return {
    flow010Run: /run\(\s*["']FLOW-010-/.test(source),
    observeCooperativeAccept: /function\s+observeCooperativeAccept\s*\(/.test(source),
  };
}

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(path));
    else if (entry.name.endsWith(".ts")) out.push(path);
  }
  return out;
}

/** Scan experiments/basket TypeScript, not only scenarios.ts. */
export function scanBasketExperimentForFlow010(): {
  scannedFiles: number;
  flow010Run: boolean;
  observeCooperativeAccept: boolean;
} {
  const files = listTsFiles(join(GREENMARKET_ROOT, "experiments/basket"));
  let flow010Run = false;
  let observeCooperativeAccept = false;
  for (const file of files) {
    const artifacts = flow010ArtifactsPresent(readFileSync(file, "utf8"));
    flow010Run = flow010Run || artifacts.flow010Run;
    observeCooperativeAccept = observeCooperativeAccept || artifacts.observeCooperativeAccept;
  }
  return { scannedFiles: files.length, flow010Run, observeCooperativeAccept };
}
