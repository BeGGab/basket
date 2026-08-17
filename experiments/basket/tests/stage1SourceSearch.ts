import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

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
  for (const match of withoutComments(source).matchAll(re)) {
    seeds.push({ name: match[1], price: Number(match[2]), unit: match[3] });
  }
  return seeds;
}

/**
 * Lexical walk: `onCode` sees TypeScript that is not inside a string or comment.
 * `onStringLiteral` receives the raw quoted slice, including quote characters.
 * Supported comment/string subset: `//`, block comments, `'…'`, `"…"`, `` `…` ``
 * with backslash escapes. Regex literals and `${` interpolations are not parsed.
 */
function scanLexical<T>(
  source: string,
  start: number,
  onCode: (index: number, ch: string) => T | undefined,
  onStringLiteral?: (rawIncludingQuotes: string) => T | undefined
): T | undefined {
  let quote: string | null = null;
  let stringStart = -1;
  let lineComment = false;
  let blockComment = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    const next = i + 1 < source.length ? source[i + 1] : "";
    if (lineComment) {
      if (ch === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === quote) {
        const raw = source.slice(stringStart, i + 1);
        quote = null;
        stringStart = -1;
        const hit = onStringLiteral?.(raw);
        if (hit !== undefined) return hit;
      }
      continue;
    }
    if (ch === "/" && next === "/") {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      stringStart = i;
      continue;
    }
    const hit = onCode(i, ch);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

function scanCode<T>(
  source: string,
  start: number,
  onCode: (index: number, ch: string) => T | undefined
): T | undefined {
  return scanLexical(source, start, onCode);
}

/** Code characters only: comments and string interiors omitted. */
export function codeText(source: string): string {
  let out = "";
  scanLexical(source, 0, (_i, ch) => {
    out += ch;
    return undefined;
  });
  return out;
}

function withoutComments(source: string): string {
  let out = "";
  scanLexical(
    source,
    0,
    (_i, ch) => {
      out += ch;
      return undefined;
    },
    (raw) => {
      out += raw;
      return undefined;
    }
  );
  return out;
}

export function codeContains(source: string, pattern: RegExp): boolean {
  return pattern.test(codeText(source));
}

function stringLiteralValue(rawIncludingQuotes: string): string {
  if (rawIncludingQuotes.length < 2) return "";
  return rawIncludingQuotes.slice(1, -1).replace(/\\(.)/g, "$1");
}

function isCodeIndex(source: string, index: number): boolean {
  return (
    scanCode(source, 0, (i) => {
      if (i === index) return true;
      if (i > index) return false;
      return undefined;
    }) === true
  );
}

function extractBalanced(source: string, openIndex: number, openCh: string, closeCh: string): string {
  if (openIndex < 0 || openIndex >= source.length || source[openIndex] !== openCh) return "";
  if (!isCodeIndex(source, openIndex)) return "";
  let depth = 0;
  const end = scanCode(source, openIndex, (i, ch) => {
    if (ch === openCh) {
      depth += 1;
      return undefined;
    }
    if (ch === closeCh) {
      depth -= 1;
      if (depth === 0) return i;
    }
    return undefined;
  });
  if (end === undefined) return "";
  return source.slice(openIndex, end + 1);
}

export function extractCategoryBlock(source: string, category: string): string {
  const re = new RegExp(`(?:^|\\n)\\s*${category}\\s*:\\s*\\[`, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const nameStart = source.indexOf(category, match.index);
    const bracket = source.indexOf("[", match.index);
    if (nameStart < 0 || bracket < 0) continue;
    if (!isCodeIndex(source, nameStart) || !isCodeIndex(source, bracket)) continue;
    return extractBalanced(source, bracket, "[", "]");
  }
  return "";
}

export function findSeed(seeds: readonly ListedSeed[], name: string): ListedSeed | undefined {
  return seeds.find((seed) => seed.name === name);
}

export function mentionsKgUnit(source: string): boolean {
  let ident = "";
  let phase: "idle" | "unit" | "colon" = "idle";
  const hit = scanLexical(
    source,
    0,
    (_i, ch) => {
      if (/[A-Za-z0-9_]/.test(ch)) {
        if (phase === "colon") phase = "idle";
        ident += ch;
        return undefined;
      }
      const word = ident;
      ident = "";
      if (word === "unit") {
        phase = /\s/.test(ch) ? "unit" : ch === ":" ? "colon" : "idle";
        return undefined;
      }
      if (phase === "unit" && /\s/.test(ch)) return undefined;
      if (phase === "unit" && ch === ":") {
        phase = "colon";
        return undefined;
      }
      if (phase === "colon" && /\s/.test(ch)) return undefined;
      phase = "idle";
      return undefined;
    },
    (raw) => {
      if (phase === "colon" && /^1\s*кг$/.test(stringLiteralValue(raw))) return true;
      phase = "idle";
      return undefined;
    }
  );
  return hit === true;
}

export function honeyCategorySearch(source: string): {
  blockFound: boolean;
  listedCount: number;
  kgUnitInBlock: boolean;
} {
  const block = extractCategoryBlock(source, "honey");
  if (!block) return { blockFound: false, listedCount: 0, kgUnitInBlock: false };
  return {
    blockFound: true,
    listedCount: parseListedSeeds(block).length,
    kgUnitInBlock: mentionsKgUnit(block),
  };
}

export function mentionsSackContents(source: string): boolean {
  return /мешок|1\s*package\s*=\s*5/i.test(codeText(source));
}

/**
 * Heuristic identifier/token scan of lexical code only (comments and strings omitted).
 * A miss is SOURCE ABSENT of those tokens, not absence of a market business rule.
 */
export function mentionsQuantityRangeTokens(source: string): boolean {
  return /1\s*[–-]\s*4|5\s*[–-]\s*9|10\+|minQuantity|maxQuantity|tierPrice|PriceSchedule|VolumePrice/.test(
    codeText(source)
  );
}

export function copiesPayloadField(functionBody: string, field: string): boolean {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`${escaped}:\\s*payload\\.${escaped}`).test(codeText(functionBody));
}

function findFunctionBodyOpen(source: string, openParenIndex: number): number {
  let paren = 0;
  let angle = 0;
  return (
    scanCode(source, openParenIndex, (i, ch) => {
      if (ch === "<") {
        angle += 1;
        return undefined;
      }
      if (ch === ">" && angle > 0) {
        angle -= 1;
        return undefined;
      }
      if (ch === "(") {
        paren += 1;
        return undefined;
      }
      if (ch === ")") {
        paren -= 1;
        return undefined;
      }
      if (ch === "{" && paren === 0 && angle === 0) return i;
      return undefined;
    }) ?? -1
  );
}

/**
 * Locate a function/const declaration by name and return the `{ ... }` body.
 * Supported subset: `function name(`, `export function name(`, `const|let|var name = (`
 * with brace matching; strings and comments skipped; `{` inside
 * `Extract<…, { … }>` skipped via a paren/angle heuristic.
 * Not a TypeScript parser: regex literals and arbitrary `<`/`>` expressions
 * in default parameters are unsupported. Empty string = not found (fail-closed).
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
    if (!isCodeIndex(source, openParen)) continue;
    const bodyOpen = findFunctionBodyOpen(source, openParen);
    if (bodyOpen < 0) return "";
    return extractBalanced(source, bodyOpen, "{", "}");
  }
  return "";
}

/** True only for a real FLOW-010 scenario run / helper, not for prose or comments. */
export function flow010ArtifactsPresent(source: string): {
  flow010Run: boolean;
  observeCooperativeAccept: boolean;
} {
  let ident = "";
  let phase: "idle" | "run" | "runParen" = "idle";
  const flow010Run =
    scanLexical(
      source,
      0,
      (_i, ch) => {
        if (/[A-Za-z0-9_]/.test(ch)) {
          if (phase === "runParen") phase = "idle";
          ident += ch;
          return undefined;
        }
        const word = ident;
        ident = "";
        if (word === "run") {
          phase = /\s/.test(ch) ? "run" : ch === "(" ? "runParen" : "idle";
          return undefined;
        }
        if (phase === "run" && /\s/.test(ch)) return undefined;
        if (phase === "run" && ch === "(") {
          phase = "runParen";
          return undefined;
        }
        if (phase === "runParen" && /\s/.test(ch)) return undefined;
        phase = "idle";
        return undefined;
      },
      (raw) => {
        if (phase === "runParen" && stringLiteralValue(raw).startsWith("FLOW-010-")) return true;
        phase = "idle";
        return undefined;
      }
    ) === true;
  return {
    flow010Run,
    observeCooperativeAccept: /function\s+observeCooperativeAccept\s*\(/.test(codeText(source)),
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

/** Scan every .ts file under experiments/basket, not only scenarios.ts. */
export function scanBasketExperimentForFlow010(): {
  walkComplete: boolean;
  scannedFiles: number;
  flow010Run: boolean;
  observeCooperativeAccept: boolean;
} {
  const files = listTsFiles(join(GREENMARKET_ROOT, "experiments/basket"));
  let inspected = 0;
  let flow010Run = false;
  let observeCooperativeAccept = false;
  for (const file of files) {
    const artifacts = flow010ArtifactsPresent(readFileSync(file, "utf8"));
    flow010Run = flow010Run || artifacts.flow010Run;
    observeCooperativeAccept = observeCooperativeAccept || artifacts.observeCooperativeAccept;
    inspected += 1;
  }
  return {
    walkComplete: files.length > 0 && inspected === files.length,
    scannedFiles: inspected,
    flow010Run,
    observeCooperativeAccept,
  };
}

/** Scanner-contract tests. Not domain evidence. */
export function assertStage1ScannerContract(): void {
  const commented = `function addToBasket(payload) {
  // unit: payload.unit
  // price: payload.price
  return { unit: payload.otherUnit, price: payload.otherPrice };
}`;
  const commentedBody = extractNamedDeclaration(commented, "addToBasket");
  assert.ok(commentedBody.length > 0);
  assert.equal(copiesPayloadField(commentedBody, "unit"), false);
  assert.equal(copiesPayloadField(commentedBody, "price"), false);

  const inString = `function addToBasket(payload) {
  const s = "unit: payload.unit";
  return { unit: payload.otherUnit };
}`;
  assert.equal(copiesPayloadField(extractNamedDeclaration(inString, "addToBasket"), "unit"), false);

  const real = `function addToBasket(payload) {
  return { unit: payload.unit, price: payload.price };
}`;
  const realBody = extractNamedDeclaration(real, "addToBasket");
  assert.equal(copiesPayloadField(realBody, "unit"), true);
  assert.equal(copiesPayloadField(realBody, "price"), true);

  assert.equal(
    mentionsKgUnit(`honey: [
  { name: "a", price: 1, unit: "500 г" },
  // unit: "1 кг"
]`),
    false
  );
  assert.equal(mentionsKgUnit(`honey: [{ name: "a", price: 1, unit: "1 кг" }]`), true);

  const afterCommentBracket = honeyCategorySearch(`honey: [
  { name: "a", price: 1, unit: "500 г" },
  // ]
  { name: "b", price: 2, unit: "1 кг" },
]`);
  assert.equal(afterCommentBracket.blockFound, true);
  assert.equal(afterCommentBracket.kgUnitInBlock, true);

  const generic = `function addToBasket(payload: Extract<Action, { type: "ADD_TO_BASKET" }>) {
  return { unit: payload.unit };
}`;
  const genericBody = extractNamedDeclaration(generic, "addToBasket");
  assert.ok(genericBody.length > 0);
  assert.equal(copiesPayloadField(genericBody, "unit"), true);
  assert.equal(genericBody.includes("Extract"), false);

  assert.equal(extractNamedDeclaration("const x = 1;", "addToBasket"), "");
  assert.equal(mentionsQuantityRangeTokens("// minQuantity\nconst x = 1;"), false);
  assert.equal(flow010ArtifactsPresent(`// run("FLOW-010-A1")\nconst x = 1;`).flow010Run, false);
}
