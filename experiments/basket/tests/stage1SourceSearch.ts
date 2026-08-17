import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

/**
 * Read-only Stage-1 source search for TZ-BASKET-010.
 * These helpers inspect files in this repository.
 * They are not a GreenMarket buyer/seller business flow.
 *
 * Token detectors answer only: is this identifier/token present in lexical code?
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

export const QUANTITY_RANGE_IDENTS = [
  "minQuantity",
  "maxQuantity",
  "tierPrice",
  "PriceSchedule",
  "VolumePrice",
] as const;

export type ListedSeed = { name: string; price: number; unit: string };

export function readStage1(kind: keyof typeof STAGE1_PATHS): string {
  return readFileSync(STAGE1_PATHS[kind], "utf8");
}

type GapKind = "comment" | "string" | "regex";
type PrevKind = "operand" | "regexOk";

const REGEX_AFTER_KEYWORDS = new Set([
  "return",
  "throw",
  "case",
  "yield",
  "await",
  "typeof",
  "void",
  "delete",
  "new",
  "else",
  "in",
  "of",
  "instanceof",
  "extends",
  "do",
]);

const COND_KEYWORDS = new Set(["if", "while", "for", "with", "switch"]);

function unescapeInner(raw: string): string {
  return raw.replace(/\\(.)/g, "$1");
}

/**
 * Lexical walk over a TypeScript/JavaScript subset.
 * `onCode` sees source that is not inside a string, comment, regex, or template
 * fragment. Template `${ ... }` interpolations are nested code.
 * Regex vs division uses the previous completed token: operand (identifier that
 * is not an expression-introducing keyword, number, string, regex, `]`, `)`,
 * `++`, `--`) vs regexOk (operators, punctuation, and keywords such as return /
 * throw / case / yield / await). After `if`/`while`/`for`/`with`/`switch` `(...)`
 * the following `/` is a regex. Character classes and backslash escapes are
 * honoured. Unterminated regex stops at newline.
 */
function scanLexical<T>(
  source: string,
  start: number,
  onCode: (index: number, ch: string) => T | undefined,
  onStringLiteral?: (value: string, startIndex: number) => T | undefined,
  onGap?: (kind: GapKind) => void
): T | undefined {
  let quote: "'" | '"' | null = null;
  let stringStart = -1;
  let lineComment = false;
  let blockComment = false;
  let prevKind: PrevKind = "regexOk";
  let identBuf = "";
  const templates: { fragmentStart: number }[] = [];
  const interps: number[] = [];
  let condParen = 0;
  let afterCondKw = false;

  const finishIdent = () => {
    if (!identBuf) return;
    if (REGEX_AFTER_KEYWORDS.has(identBuf)) {
      prevKind = "regexOk";
      afterCondKw = false;
    } else if (COND_KEYWORDS.has(identBuf)) {
      prevKind = "operand";
      afterCondKw = true;
    } else {
      prevKind = "operand";
      afterCondKw = false;
    }
    identBuf = "";
  };

  const inTemplate = () => templates.length > 0 && interps.length === 0;

  const emitString = (value: string, index: number): T | undefined => {
    if (value.length === 0) return undefined;
    return onStringLiteral?.(value, index);
  };

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
        const value = unescapeInner(source.slice(stringStart + 1, i));
        quote = null;
        const opened = stringStart;
        stringStart = -1;
        prevKind = "operand";
        const hit = emitString(value, opened);
        if (hit !== undefined) return hit;
      }
      continue;
    }

    if (inTemplate()) {
      const tmpl = templates[templates.length - 1];
      if (ch === "\\") {
        i += 1;
        continue;
      }
      if (ch === "$" && next === "{") {
        const value = unescapeInner(source.slice(tmpl.fragmentStart, i));
        const hit = emitString(value, tmpl.fragmentStart);
        if (hit !== undefined) return hit;
        interps.push(1);
        i += 1;
        prevKind = "regexOk";
        continue;
      }
      if (ch === "`") {
        const value = unescapeInner(source.slice(tmpl.fragmentStart, i));
        templates.pop();
        prevKind = "operand";
        const hit = emitString(value, tmpl.fragmentStart);
        if (hit !== undefined) return hit;
        continue;
      }
      continue;
    }

    if (identBuf && !isIdentChar(ch)) finishIdent();

    if (ch === "/" && next === "/") {
      onGap?.("comment");
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      onGap?.("comment");
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === "/" && prevKind !== "operand") {
      onGap?.("regex");
      i = consumeRegexLiteral(source, i);
      prevKind = "operand";
      afterCondKw = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      onGap?.("string");
      quote = ch;
      stringStart = i;
      continue;
    }
    if (ch === "`") {
      onGap?.("string");
      templates.push({ fragmentStart: i + 1 });
      continue;
    }
    if ((ch === "+" && next === "+") || (ch === "-" && next === "-")) {
      const hit1 = onCode(i, ch);
      if (hit1 !== undefined) return hit1;
      i += 1;
      const hit2 = onCode(i, source[i] ?? "");
      prevKind = "operand";
      afterCondKw = false;
      if (hit2 !== undefined) return hit2;
      continue;
    }

    if (interps.length > 0 && ch === "}") {
      interps[interps.length - 1] -= 1;
      if (interps[interps.length - 1] === 0) {
        interps.pop();
        if (templates.length > 0) templates[templates.length - 1].fragmentStart = i + 1;
        continue;
      }
    }

    if (ch === "(") {
      if (afterCondKw || condParen > 0) condParen += 1;
      afterCondKw = false;
      prevKind = "regexOk";
    } else if (ch === ")") {
      if (condParen > 0) {
        condParen -= 1;
        prevKind = condParen === 0 ? "regexOk" : "operand";
      } else {
        prevKind = "operand";
      }
      afterCondKw = false;
    } else if (ch === "]") {
      prevKind = "operand";
      afterCondKw = false;
    } else if (!/\s/.test(ch) && !isIdentStart(ch) && !(identBuf && isIdentChar(ch)) && !/\d/.test(ch)) {
      if (interps.length > 0 && ch === "{") interps[interps.length - 1] += 1;
      prevKind = "regexOk";
      afterCondKw = false;
    } else if (/\d/.test(ch) && !identBuf) {
      prevKind = "operand";
      afterCondKw = false;
    }

    if (!identBuf && isIdentStart(ch)) identBuf = ch;
    else if (identBuf && isIdentChar(ch)) identBuf += ch;

    const hit = onCode(i, ch);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

function consumeRegexLiteral(source: string, openIndex: number): number {
  let i = openIndex + 1;
  let inClass = false;
  let escape = false;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === "\n") return i - 1;
    if (inClass) {
      if (ch === "]") inClass = false;
      continue;
    }
    if (ch === "[") {
      inClass = true;
      continue;
    }
    if (ch === "/") {
      i += 1;
      while (i < source.length && /[A-Za-z]/.test(source[i] ?? "")) i += 1;
      return i - 1;
    }
  }
  return source.length > 0 ? source.length - 1 : 0;
}

function scanCode<T>(
  source: string,
  start: number,
  onCode: (index: number, ch: string) => T | undefined
): T | undefined {
  return scanLexical(source, start, onCode);
}

function isIdentChar(ch: string): boolean {
  return ch === "$" || /[\p{ID_Continue}]/u.test(ch);
}

function isIdentStart(ch: string): boolean {
  return ch === "$" || /[\p{ID_Start}]/u.test(ch);
}

/**
 * Code characters only. Comment/string/regex gaps become a space, except member
 * access across a comment (payload dot field) stays glued.
 */
export function codeText(source: string): string {
  let out = "";
  let gap = false;
  scanLexical(
    source,
    0,
    (_i, ch) => {
      if (gap && out.length > 0 && !/\s/.test(ch)) {
        const prev = out[out.length - 1] ?? "";
        if (!(prev === "." && isIdentStart(ch))) out += " ";
      }
      gap = false;
      out += ch;
      return undefined;
    },
    undefined,
    () => {
      gap = true;
    }
  );
  return out;
}

type TokKind = "ident" | "number" | "string" | "punct";
type Tok = { kind: TokKind; value: string; index: number };

function punct(token: Tok | undefined, value: string): boolean {
  return token !== undefined && token.kind === "punct" && token.value === value;
}

function ident(token: Tok | undefined, value: string): boolean {
  return token !== undefined && token.kind === "ident" && token.value === value;
}

function tokenize(source: string): Tok[] {
  const tokens: Tok[] = [];
  let buf = "";
  let bufKind: "ident" | "number" | null = null;
  let bufIndex = 0;
  const flush = () => {
    if (bufKind && buf) tokens.push({ kind: bufKind, value: buf, index: bufIndex });
    buf = "";
    bufKind = null;
  };
  scanLexical(
    source,
    0,
    (i, ch) => {
      if (bufKind === "ident" && isIdentChar(ch)) {
        buf += ch;
        return undefined;
      }
      if (bufKind === "number" && /\d/.test(ch)) {
        buf += ch;
        return undefined;
      }
      flush();
      if (isIdentStart(ch)) {
        bufKind = "ident";
        buf = ch;
        bufIndex = i;
        return undefined;
      }
      if (/\d/.test(ch)) {
        bufKind = "number";
        buf = ch;
        bufIndex = i;
        return undefined;
      }
      if (/\s/.test(ch)) return undefined;
      tokens.push({ kind: "punct", value: ch, index: i });
      return undefined;
    },
    (value, startIndex) => {
      flush();
      tokens.push({ kind: "string", value, index: startIndex });
      return undefined;
    },
    () => {
      flush();
    }
  );
  flush();
  return tokens;
}

/** True when one of `names` appears as a whole identifier token in lexical code. */
export function hasIdent(source: string, names: readonly string[]): boolean {
  const want = new Set(names);
  return tokenize(source).some((token) => token.kind === "ident" && want.has(token.value));
}

export function codeContains(source: string, pattern: RegExp): boolean {
  return pattern.test(codeText(source));
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

/** Object seeds in lexical code only. String and regex interiors are not ListedSeeds. */
export function parseListedSeeds(source: string): ListedSeed[] {
  const tokens = tokenize(source);
  const seeds: ListedSeed[] = [];
  for (let i = 0; i + 11 < tokens.length; i++) {
    if (
      punct(tokens[i], "{") &&
      ident(tokens[i + 1], "name") &&
      punct(tokens[i + 2], ":") &&
      tokens[i + 3]?.kind === "string" &&
      punct(tokens[i + 4], ",") &&
      ident(tokens[i + 5], "price") &&
      punct(tokens[i + 6], ":") &&
      tokens[i + 7]?.kind === "number" &&
      punct(tokens[i + 8], ",") &&
      ident(tokens[i + 9], "unit") &&
      punct(tokens[i + 10], ":") &&
      tokens[i + 11]?.kind === "string"
    ) {
      seeds.push({
        name: tokens[i + 3].value,
        price: Number(tokens[i + 7].value),
        unit: tokens[i + 11].value,
      });
    }
  }
  return seeds;
}

export function extractCategoryBlock(source: string, category: string): string {
  const tokens = tokenize(source);
  for (let i = 0; i + 2 < tokens.length; i++) {
    if (ident(tokens[i], category) && punct(tokens[i + 1], ":") && punct(tokens[i + 2], "[")) {
      return extractBalanced(source, tokens[i + 2].index, "[", "]");
    }
  }
  return "";
}

export function findSeed(seeds: readonly ListedSeed[], name: string): ListedSeed | undefined {
  return seeds.find((seed) => seed.name === name);
}

export function mentionsKgUnit(source: string): boolean {
  const tokens = tokenize(source);
  for (let i = 0; i + 2 < tokens.length; i++) {
    if (
      ident(tokens[i], "unit") &&
      punct(tokens[i + 1], ":") &&
      tokens[i + 2]?.kind === "string" &&
      /^1\s*кг$/.test(tokens[i + 2].value)
    ) {
      return true;
    }
  }
  return false;
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

/**
 * Pack-contents tokens in lexical code: whole ident `мешок`, or
 * `1 мешок = 5 kg` / `1 package = 5 kg` (unit must be kg/кг).
 * `1 package = 5 apples` is not a hit.
 */
export function mentionsSackContents(source: string): boolean {
  const tokens = tokenize(source);
  if (tokens.some((token) => token.kind === "ident" && token.value.toLowerCase() === "мешок")) {
    return true;
  }
  for (let i = 0; i + 4 < tokens.length; i++) {
    const pack = tokens[i + 1];
    const unit = tokens[i + 4];
    if (
      tokens[i]?.kind === "number" &&
      tokens[i].value === "1" &&
      pack?.kind === "ident" &&
      (pack.value === "package" || pack.value.toLowerCase() === "мешок") &&
      punct(tokens[i + 2], "=") &&
      tokens[i + 3]?.kind === "number" &&
      tokens[i + 3].value === "5" &&
      unit?.kind === "ident" &&
      (unit.value === "kg" || unit.value === "кг")
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Whole identifier tokens in TypeScript lexical code, plus the numeric range
 * token sequences 1-4 / 5-9 / 10+. A miss is SOURCE ABSENT of those tokens,
 * not absence of a quantity-range mechanism under another name.
 */
export function mentionsQuantityRangeTokens(source: string): boolean {
  const tokens = tokenize(source);
  const names = new Set<string>(QUANTITY_RANGE_IDENTS);
  if (tokens.some((token) => token.kind === "ident" && names.has(token.value))) return true;
  for (let i = 0; i + 1 < tokens.length; i++) {
    if (
      tokens[i]?.kind === "number" &&
      tokens[i].value === "1" &&
      isRangeDash(tokens[i + 1]) &&
      tokens[i + 2]?.kind === "number" &&
      tokens[i + 2].value === "4"
    ) {
      return true;
    }
    if (
      tokens[i]?.kind === "number" &&
      tokens[i].value === "5" &&
      isRangeDash(tokens[i + 1]) &&
      tokens[i + 2]?.kind === "number" &&
      tokens[i + 2].value === "9"
    ) {
      return true;
    }
    if (tokens[i]?.kind === "number" && tokens[i].value === "10" && punct(tokens[i + 1], "+")) {
      return true;
    }
  }
  return false;
}

function isRangeDash(token: Tok | undefined): boolean {
  return token !== undefined && token.kind === "punct" && (token.value === "-" || token.value === "–");
}

/**
 * Markdown/prose search for the same quantity-range names as whole words.
 * Not a TypeScript lexer. Do not use mentionsQuantityRangeTokens on markdown.
 */
export function mentionsQuantityRangeInProse(text: string): boolean {
  const names = QUANTITY_RANGE_IDENTS.join("|");
  return (
    new RegExp(`(^|[^A-Za-z0-9_$])(${names})(?![A-Za-z0-9_$])`).test(text) ||
    /1\s*[–-]\s*4/.test(text) ||
    /5\s*[–-]\s*9/.test(text) ||
    /10\+/.test(text)
  );
}

export function copiesPayloadField(functionBody: string, field: string): boolean {
  const tokens = tokenize(functionBody);
  for (let i = 0; i + 4 < tokens.length; i++) {
    if (
      ident(tokens[i], field) &&
      punct(tokens[i + 1], ":") &&
      ident(tokens[i + 2], "payload") &&
      punct(tokens[i + 3], ".") &&
      ident(tokens[i + 4], field)
    ) {
      return true;
    }
  }
  return false;
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
 * Locate a function/const declaration by name from lexical tokens and return
 * the `{ ... }` body. Supported subset: `function name(`, `export function name(`,
 * `const|let|var name = (` with brace matching; strings, comments, and regex
 * literals skipped; `{` inside `Extract<…, { … }>` skipped via a paren/angle
 * heuristic. Template `${ ... }` interpolations are nested code. Not a TypeScript
 * parser: arbitrary `<`/`>` in defaults remain unsupported. Empty string = not found
 * (fail-closed).
 */
export function extractNamedDeclaration(source: string, name: string): string {
  const tokens = tokenize(source);
  for (let i = 0; i < tokens.length; i++) {
    const openParen = declarationOpenParen(tokens, i, name);
    if (openParen < 0) continue;
    const bodyOpen = findFunctionBodyOpen(source, openParen);
    if (bodyOpen < 0) return "";
    return extractBalanced(source, bodyOpen, "{", "}");
  }
  return "";
}

function declarationOpenParen(tokens: Tok[], i: number, name: string): number {
  let j = i;
  if (ident(tokens[j], "export")) j += 1;
  if (ident(tokens[j], "async") && ident(tokens[j + 1], "function")) j += 1;
  if (ident(tokens[j], "function") && ident(tokens[j + 1], name) && punct(tokens[j + 2], "(")) {
    return tokens[j + 2].index;
  }
  j = i;
  if (ident(tokens[j], "export")) j += 1;
  if (
    (ident(tokens[j], "const") || ident(tokens[j], "let") || ident(tokens[j], "var")) &&
    ident(tokens[j + 1], name) &&
    punct(tokens[j + 2], "=")
  ) {
    let k = j + 3;
    if (ident(tokens[k], "async")) k += 1;
    if (ident(tokens[k], "function") && punct(tokens[k + 1], "(")) return tokens[k + 1].index;
    if (punct(tokens[k], "(")) return tokens[k].index;
  }
  return -1;
}

function hasFunctionNamed(source: string, name: string): boolean {
  const tokens = tokenize(source);
  for (let i = 0; i + 2 < tokens.length; i++) {
    if (ident(tokens[i], "function") && ident(tokens[i + 1], name) && punct(tokens[i + 2], "(")) {
      return true;
    }
  }
  return false;
}

/** True only for a real FLOW-010 scenario run / helper, not for prose, comments, strings, or regex. */
export function flow010ArtifactsPresent(source: string): {
  flow010Run: boolean;
  observeCooperativeAccept: boolean;
} {
  const tokens = tokenize(source);
  let flow010Run = false;
  for (let i = 0; i + 2 < tokens.length; i++) {
    if (
      ident(tokens[i], "run") &&
      punct(tokens[i + 1], "(") &&
      tokens[i + 2]?.kind === "string" &&
      tokens[i + 2].value.startsWith("FLOW-010-")
    ) {
      flow010Run = true;
      break;
    }
  }
  return {
    flow010Run,
    observeCooperativeAccept: hasFunctionNamed(source, "observeCooperativeAccept"),
  };
}

export function listTsFiles(dir: string): string[] {
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

function slash(pattern: string): string {
  return `/${pattern}/`;
}

/** Scanner-contract tests. Not domain evidence. */
export function assertStage1ScannerContract(): void {
  const seed = `{ name: "a", price: 1, unit: "500 г" }`;
  const kgSeed = `{ name: "a", price: 1, unit: "1 кг" }`;

  assert.equal(parseListedSeeds(seed).length, 1);
  assert.equal(parseListedSeeds("").length, 0);
  assert.equal(parseListedSeeds("/* empty */").length, 0);
  assert.equal(parseListedSeeds(`const example = '{ name: "fake", price: 55, unit: "1 кг" }';`).length, 0);
  assert.equal(parseListedSeeds(`const r = ${slash('\\{ name: "fake", price: 55, unit: "1 кг" \\}')};`).length, 0);
  assert.equal(parseListedSeeds(`{ na/*x*/me: "a", price: 1, unit: "1 кг" }`).length, 0);
  assert.equal(parseListedSeeds(`{ name: /*c*/ "a", price: 1, unit: "1 кг" }`).length, 1);
  assert.equal(findSeed(parseListedSeeds(seed), "a")?.price, 1);
  assert.equal(findSeed(parseListedSeeds(seed), "missing"), undefined);

  assert.equal(codeContains("min/*x*/Quantity", /minQuantity/), false);
  assert.equal(codeContains('foo"minQuantity"bar', /minQuantity/), false);
  assert.equal(codeContains("ме/*x*/шок", /мешок/), false);
  assert.equal(codeContains(`const r = ${slash("minQuantity")};`, /minQuantity/), false);
  assert.equal(hasIdent("const minQuantity = 1;", ["minQuantity"]), true);
  assert.equal(hasIdent("const minQuantityFactory = 1;", ["minQuantity"]), false);
  assert.equal(hasIdent("const myminQuantityBackup = 1;", ["minQuantity"]), false);
  assert.equal(hasIdent("const PriceScheduleFactory = 1;", ["PriceSchedule"]), false);
  assert.equal(hasIdent("some.minQuantityFactory", ["minQuantity"]), false);
  assert.equal(hasIdent("obj.minQuantity", ["minQuantity"]), true);
  assert.equal(hasIdent(`const r = ${slash("\\bminQuantity\\b")};`, ["minQuantity"]), false);
  assert.equal(hasIdent("a / minQuantity / b", ["minQuantity"]), true);
  assert.equal(hasIdent("this / minQuantity", ["minQuantity"]), true);
  assert.equal(hasIdent("foo() / minQuantity", ["minQuantity"]), true);
  assert.equal(hasIdent("return /minQuantity/;", ["minQuantity"]), false);
  assert.equal(hasIdent("throw /minQuantity/;", ["minQuantity"]), false);
  assert.equal(hasIdent("case /minQuantity/:", ["minQuantity"]), false);
  assert.equal(hasIdent("yield /minQuantity/;", ["minQuantity"]), false);
  assert.equal(hasIdent("await /minQuantity/;", ["minQuantity"]), false);
  assert.equal(hasIdent("typeof /minQuantity/;", ["minQuantity"]), false);
  assert.equal(hasIdent("void /minQuantity/;", ["minQuantity"]), false);
  assert.equal(hasIdent("delete /minQuantity/;", ["minQuantity"]), false);
  assert.equal(hasIdent("new /minQuantity/;", ["minQuantity"]), false);
  assert.equal(hasIdent("if (x) /minQuantity/.test(s)", ["minQuantity"]), false);
  assert.equal(hasIdent("const x = `${minQuantity}`;", ["minQuantity"]), true);
  assert.equal(hasIdent("const x = `minQuantity`;", ["minQuantity"]), false);
  assert.equal(hasIdent("", ["minQuantity"]), false);

  assert.equal(mentionsQuantityRangeTokens("return /minQuantity/;"), false);
  assert.equal(mentionsQuantityRangeTokens("const x = `${minQuantity}`;"), true);
  assert.equal(parseListedSeeds("return /{ name: \"fake\", price: 55, unit: \"1 кг\" }/;").length, 0);
  assert.equal(
    parseListedSeeds('const x = `${foo({ name: "fake", price: 55, unit: "1 кг" })}`;').length,
    1
  );

  assert.equal(mentionsQuantityRangeTokens("const minQuantity = 1;"), true);
  assert.equal(mentionsQuantityRangeTokens("const minQuantityFactory = 1;"), false);
  assert.equal(mentionsQuantityRangeTokens("const myminQuantityBackup = 1;"), false);
  assert.equal(mentionsQuantityRangeTokens("const PriceScheduleFactory = 1;"), false);
  assert.equal(mentionsQuantityRangeTokens("some.minQuantityFactory"), false);
  assert.equal(mentionsQuantityRangeTokens("// minQuantity\nconst x = 1;"), false);
  assert.equal(mentionsQuantityRangeTokens("min/*x*/Quantity"), false);
  assert.equal(mentionsQuantityRangeTokens(`const r = ${slash("minQuantity")};`), false);
  assert.equal(mentionsQuantityRangeTokens(""), false);
  assert.equal(mentionsQuantityRangeTokens("const n = 1 - 4;"), true);

  assert.equal(mentionsSackContents("const мешок = 1;"), true);
  assert.equal(mentionsSackContents("const мешокMetadata = 1;"), false);
  assert.equal(mentionsSackContents("ме/*x*/шок"), false);
  assert.equal(mentionsSackContents("1 package = 5;"), false);
  assert.equal(mentionsSackContents("1 package = 5 apples;"), false);
  assert.equal(mentionsSackContents("1 package = 5 kg;"), true);
  assert.equal(mentionsSackContents("1 мешок = 5 kg;"), true);
  assert.equal(mentionsSackContents(`const r = ${slash("мешок")};`), false);
  assert.equal(mentionsSackContents(""), false);

  assert.equal(mentionsQuantityRangeInProse("no range here"), false);
  assert.equal(mentionsQuantityRangeInProse("see minQuantity in the table"), true);
  assert.equal(mentionsQuantityRangeInProse("minQuantityFactory is not the token"), false);
  assert.equal(mentionsQuantityRangeInProse("1-4 kg"), true);

  assert.equal(mentionsKgUnit(`honey: [${seed},\n  // unit: "1 кг"\n]`), false);
  assert.equal(mentionsKgUnit(`honey: [${kgSeed}]`), true);
  assert.equal(mentionsKgUnit(`un/*x*/it: "1 кг"`), false);
  assert.equal(mentionsKgUnit(`unit /*c*/ : "1 кг"`), true);
  assert.equal(mentionsKgUnit(`const r = ${slash('unit: "1 кг"')};`), false);

  assert.equal(extractCategoryBlock(`hon/*x*/ey: [${kgSeed}]`, "honey").length, 0);
  assert.ok(extractCategoryBlock(`honey /*c*/ : [${kgSeed}]`, "honey").length > 0);
  assert.equal(extractCategoryBlock(`honey: "not-array"\n[`, "honey"), "");
  assert.equal(extractCategoryBlock(`const s = "honey: [${kgSeed}]";`, "honey"), "");
  assert.equal(extractCategoryBlock(`const r = ${slash("honey: \\[")};`, "honey"), "");
  assert.equal(extractCategoryBlock("", "honey"), "");
  const honeyAfterCommentedKey = honeyCategorySearch(
    `// honey: [\nconst x = 1;\nhoney: [${kgSeed}]`
  );
  assert.equal(honeyAfterCommentedKey.blockFound, true);
  assert.equal(honeyAfterCommentedKey.kgUnitInBlock, true);
  const afterCommentBracket = honeyCategorySearch(`honey: [
  ${seed},
  // ]
  { name: "b", price: 2, unit: "1 кг" },
]`);
  assert.equal(afterCommentBracket.blockFound, true);
  assert.equal(afterCommentBracket.kgUnitInBlock, true);

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
  assert.equal(copiesPayloadField("{ unit: payload./*gap*/unit }", "unit"), true);
  assert.equal(copiesPayloadField(`const r = ${slash("unit: payload.unit")};`, "unit"), false);

  const generic = `function addToBasket(payload: Extract<Action, { type: "ADD_TO_BASKET" }>) {
  return { unit: payload.unit };
}`;
  const genericBody = extractNamedDeclaration(generic, "addToBasket");
  assert.ok(genericBody.length > 0);
  assert.equal(copiesPayloadField(genericBody, "unit"), true);
  assert.equal(genericBody.includes("Extract"), false);

  const regexBrace = `function addToBasket(payload) {
  const r = ${slash("}")};
  return { unit: payload.unit };
}`;
  const regexBraceBody = extractNamedDeclaration(regexBrace, "addToBasket");
  assert.ok(regexBraceBody.includes("payload.unit"));
  assert.equal(copiesPayloadField(regexBraceBody, "unit"), true);

  const classSlash = `function addToBasket(payload) {
  const r = ${slash("[/]")};
  return { unit: payload.unit };
}`;
  assert.equal(copiesPayloadField(extractNamedDeclaration(classSlash, "addToBasket"), "unit"), true);

  assert.equal(extractNamedDeclaration("const x = 1;", "addToBasket"), "");
  assert.equal(extractNamedDeclaration("", "addToBasket"), "");
  assert.equal(extractNamedDeclaration("function addToBasketFactory(payload) { return payload; }", "addToBasket"), "");
  assert.equal(extractNamedDeclaration(`const r = ${slash("function addToBasket(")};`, "addToBasket"), "");
  const exprArrow = "const addToBasket = (payload) => 1;";
  assert.equal(extractNamedDeclaration(exprArrow, "addToBasket"), "");
  const parenArrow = "const addToBasket = (payload) => ({ unit: payload.unit });";
  assert.equal(extractNamedDeclaration(parenArrow, "addToBasket"), "");
  const blockArrow = "const addToBasket = (payload) => { return { unit: payload.unit }; };";
  assert.equal(copiesPayloadField(extractNamedDeclaration(blockArrow, "addToBasket"), "unit"), true);
  const constFunc = `const addToBasket = function (payload) {
  return { unit: payload.unit };
};`;
  assert.equal(copiesPayloadField(extractNamedDeclaration(constFunc, "addToBasket"), "unit"), true);

  assert.equal(flow010ArtifactsPresent(`// run("FLOW-010-A1")\nconst x = 1;`).flow010Run, false);
  assert.equal(flow010ArtifactsPresent(`ru/*x*/n("FLOW-010-A1")`).flow010Run, false);
  assert.equal(flow010ArtifactsPresent(`run /*c*/ ("FLOW-010-A1")`).flow010Run, true);
  assert.equal(flow010ArtifactsPresent(`const r = ${slash('run("FLOW-010-A1")')};`).flow010Run, false);
  assert.equal(flow010ArtifactsPresent(`function observeCooperativeAccept() {}`).observeCooperativeAccept, true);
  assert.equal(
    flow010ArtifactsPresent(`function observeCooperativeAcceptHelper() {}`).observeCooperativeAccept,
    false
  );
  assert.equal(flow010ArtifactsPresent(`const r = ${slash("function observeCooperativeAccept(")};`).observeCooperativeAccept, false);

  const files = listTsFiles(join(GREENMARKET_ROOT, "experiments/basket"));
  assert.ok(files.length > 0);
  assert.ok(files.every((file) => file.endsWith(".ts")));
  assert.ok(files.some((file) => file.replace(/\\/g, "/").endsWith("tests/stage1SourceSearch.ts")));
  const scan = scanBasketExperimentForFlow010();
  assert.equal(scan.walkComplete, true);
  assert.equal(scan.scannedFiles, files.length);
  assert.equal(scan.flow010Run, false);
  assert.equal(scan.observeCooperativeAccept, false);
}
