import {
  CONCEPT_BLANK_FORMS,
  CONCEPT_BLANK_LEVELS,
  conceptBlankSelectionSchema,
  SHEET_CODE_ALPHABET,
  SHEET_CODE_DIGEST_LENGTH,
  SHEET_CODE_VERSION,
  type ConceptBlankBank,
  type ConceptBlankForm,
  type ConceptBlankSelection,
  type LevelCounts,
  type SheetCodeReading,
} from "@/contracts/conceptBlank.contract";

import { CONCEPT_BLANK_BANK } from "./bank";
import { composeSheets, orderedSections } from "./compose";
import { BLANK_SECTIONS } from "./sections";

/**
 * 개념 백지 지면 코드(트랙 cb-code · 26 §8) — 사진 채점의 첫 걸음으로 지면에 찍는 **글자 코드**(QR 없음).
 * DB 가 없으니 코드만으로 고르기를 되살릴 수 있어야 한다 — 소단원은 나무의 차례 번호로, 수는 비트로 촘촘하게 묶는다.
 *
 * 꼴(판 1) — 글자 하나 = 5비트(Crockford base32), 네 글자마다 점:
 *
 *     [판 `1`] [고르기 비트 …] [은행 지문 4] [검사 1]
 *
 * 고르기 비트(앞에서부터 · 남는 끝 비트는 0) — `EGk` 는 k 차 지수 골롬(작은 수가 짧다):
 *  · 소단원 — 나무 차례(`BLANK_SECTIONS` 를 교육과정 순서로 센 0 부터의 번호)의 이어진 묶음(run)들.
 *    묶음 수 − 1 (EG0) · 첫 묶음 시작 9비트 · 길이 − 1 (EG1) · 다음 묶음부터는 앞 묶음과의 틈 − 1 (EG2) · 길이 − 1 (EG1).
 *    대단원 하나 통째 = 묶음 하나다.
 *  · 형식 — 1비트: 0 이면 정해진 차례(A B C D E · 겹침 없음)의 5비트 표, 1 이면 목록(개수 − 1 3비트 + 형식마다 3비트).
 *  · 형식마다 수 — 본 수(하 · 중 · 상 EG2). 둘째 형식부터는 «앞 형식의 본 수와 같음» 1비트를 먼저 둔다(A · B · C · D 의
 *    «개념 수»는 기본이 같은 재고라 흔히 같다). B · C 만 extras(○× · 적용)를 잇는다 — A · D · E 의 extras 는 합치기가
 *    쓰지 않아 싣지 않는다(되살리면 0).
 *
 * 은행 지문 — 그 고르기로 **지면에 찍히는 문항 전부**(id · 정답 · 문장 · 그림 — 머리 빼고 합치기 결과 그대로)와 소단원 열쇠에서 낸
 * 20비트. 은행이 바뀐 뒤의 지면과 옛 지면을 가른다(브리프의 «id 와 정답»을 품는다 — 문장 길이가 쪽 나눔을 바꾸기 때문에 문장도 넣었다).
 * 검사 글자 — GF(32) 가중합. 어느 자리든 한 글자 바뀜 · 이웃 두 글자 뒤바뀜을 반드시 잡는다. 거기에 «되살린 고르기를 다시 묶으면
 * 같은 글자가 나와야 한다»를 더해, 손으로 옮기다 틀린 코드가 다른 고르기로 읽히지 않게 한다(틀리면 null).
 *
 * 🔴 코드는 지면을 가리킬 뿐 학생을 가리키지 않는다 — 제목 · 날짜(이름이 들어갈 수 있는 칸)는 싣지 않는다.
 * 🔴 차례 번호는 교육과정 시드(`prisma/seed-data/units.ts`)의 차례다. 시드에 소단원이 끼어들면 옛 코드는 다른 소단원을 가리키는데,
 *    지문에 소단원 열쇠가 들어 있어 «은행이 바뀜»으로 드러난다.
 */

const SECTION_INDEX_BITS = 9;
const COUNT_K = 2;
const VALUE_OF = new Map(
  [...SHEET_CODE_ALPHABET].map((ch, i) => [ch, i] as const),
);

/* ───────── 비트 ───────── */

class BitWriter {
  private bits: number[] = [];
  write(value: number, width: number) {
    for (let i = width - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  bit(on: boolean) {
    this.bits.push(on ? 1 : 0);
  }
  /** k 차 지수 골롬 — v + 2^k 를 그 비트 수 − k − 1 개의 0 뒤에 쓴다. */
  expGolomb(v: number, k: number) {
    const w = v + (1 << k);
    const width = 32 - Math.clz32(w);
    this.write(0, width - k - 1);
    this.write(w, width);
  }
  /** 5비트 글자 값들 — 끝은 0 으로 채운다. */
  symbols(): number[] {
    const out: number[] = [];
    for (let i = 0; i < this.bits.length; i += 5) {
      let v = 0;
      for (let j = 0; j < 5; j++) v = (v << 1) | (this.bits[i + j] ?? 0);
      out.push(v);
    }
    return out;
  }
}

class BitReader {
  private at = 0;
  private readonly bits: number[];
  constructor(symbols: readonly number[]) {
    this.bits = symbols.flatMap((v) =>
      [4, 3, 2, 1, 0].map((i) => (v >>> i) & 1),
    );
  }
  read(width: number): number {
    if (this.at + width > this.bits.length) throw new RangeError("코드가 짧다");
    let v = 0;
    for (let i = 0; i < width; i++) v = v * 2 + this.bits[this.at++]!;
    return v;
  }
  bit(): boolean {
    return this.read(1) === 1;
  }
  expGolomb(k: number): number {
    let zeros = 0;
    while (this.read(1) === 0) {
      zeros += 1;
      if (zeros > 16) throw new RangeError("수가 너무 크다");
    }
    return (1 << (zeros + k)) + this.read(zeros + k) - (1 << k);
  }
  /** 다 읽은 뒤 남은 것은 5비트 미만의 0 이어야 한다. */
  done(): boolean {
    const rest = this.bits.slice(this.at);
    return rest.length < 5 && rest.every((b) => b === 0);
  }
}

/* ───────── 검사 글자 — GF(32), x^5 + x^2 + 1 ───────── */

const GF_EXP: number[] = [];
const GF_LOG: number[] = new Array(32).fill(0);
for (let i = 0, x = 1; i < 31; i++) {
  GF_EXP[i] = x;
  GF_LOG[x] = i;
  x <<= 1;
  if (x & 32) x ^= 0b100101;
}
const gfMul = (a: number, b: number) =>
  a === 0 || b === 0 ? 0 : GF_EXP[(GF_LOG[a]! + GF_LOG[b]!) % 31]!;

/** Σ α^i · s_i — 무게가 0 이 아니고 이웃끼리 달라서 한 글자 바뀜 · 이웃 뒤바뀜이 늘 값을 바꾼다. */
function checkSymbol(symbols: readonly number[]): number {
  return symbols.reduce((sum, s, i) => sum ^ gfMul(GF_EXP[i % 31]!, s), 0);
}

/* ───────── 지문 ───────── */

/** 열쇠 차례를 정해 쓴 JSON — 은행 파일의 칸 차례가 바뀌어도 내용이 같으면 같은 글. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
      .map(
        (k) =>
          `${JSON.stringify(k)}:${stableJson((value as Record<string, unknown>)[k])}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
}

/** FNV-1a 32 + murmur3 마무리 섞기 — 위 20비트를 쓴다. */
function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h = Math.imul(h ^ (c & 0xff), 0x01000193);
    h = Math.imul(h ^ (c >>> 8), 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function digestSymbols(
  selection: ConceptBlankSelection,
  bank: ConceptBlankBank,
): number[] {
  // 머리(제목 · 날짜)는 뺀다 — 코드가 싣지 않는 값이다
  const sheets = composeSheets(selection, bank).map((sheet) => ({
    ...sheet,
    header: undefined,
  }));
  const h = hash32(stableJson({ sections: selection.sections, sheets }));
  return Array.from(
    { length: SHEET_CODE_DIGEST_LENGTH },
    (_, i) => (h >>> (27 - 5 * i)) & 31,
  );
}

const toText = (symbols: readonly number[]) =>
  symbols.map((v) => SHEET_CODE_ALPHABET[v]!).join("");

/* ───────── 고르기 ───────── */

const INDEX_OF = new Map(
  [...BLANK_SECTIONS]
    .sort((a, b) => a.order - b.order)
    .map((s, i) => [s.key, i] as const),
);
const KEY_AT = [...INDEX_OF.keys()];

const ZERO: LevelCounts = { 하: 0, 중: 0, 상: 0 };
const HAS_EXTRAS: ReadonlySet<ConceptBlankForm> = new Set(["term", "cloze"]);
const sameCounts = (a: LevelCounts, b: LevelCounts) =>
  CONCEPT_BLANK_LEVELS.every((l) => a[l] === b[l]);

/**
 * 코드가 싣는 고르기 — 소단원은 나무에 있는 것만 교육과정 순서로 한 번씩 · 형식은 받은 차례 그대로 ·
 * A · D · E 의 extras 는 0 · 제목 · 날짜는 뺀다. 같은 지면이면 같은 꼴이다(합치기가 쓰는 것만 남긴다).
 */
export function canonicalSheetSelection(
  selection: ConceptBlankSelection,
): ConceptBlankSelection {
  return {
    sections: orderedSections(selection.sections),
    forms: selection.forms.map(({ form, counts, extras }) => ({
      form,
      counts: { 하: counts.하, 중: counts.중, 상: counts.상 },
      extras: HAS_EXTRAS.has(form)
        ? { 하: extras.하, 중: extras.중, 상: extras.상 }
        : { ...ZERO },
    })),
  };
}

function writeSelection(selection: ConceptBlankSelection): number[] {
  const out = new BitWriter();
  const indices = selection.sections.map((k) => INDEX_OF.get(k)!);
  const runs: { start: number; length: number }[] = [];
  for (const i of indices) {
    const last = runs[runs.length - 1];
    if (last && i === last.start + last.length) last.length += 1;
    else runs.push({ start: i, length: 1 });
  }
  out.expGolomb(runs.length - 1, 0);
  runs.forEach((run, r) => {
    if (r === 0) out.write(run.start, SECTION_INDEX_BITS);
    else {
      const prev = runs[r - 1]!;
      out.expGolomb(run.start - (prev.start + prev.length) - 1, 2);
    }
    out.expGolomb(run.length - 1, 1);
  });

  const order = selection.forms.map((f) => CONCEPT_BLANK_FORMS.indexOf(f.form));
  const canonical = order.every((v, i) => i === 0 || v > order[i - 1]!);
  out.bit(!canonical);
  if (canonical)
    CONCEPT_BLANK_FORMS.forEach((_, i) => out.bit(order.includes(i)));
  else {
    out.write(order.length - 1, 3);
    for (const v of order) out.write(v, 3);
  }

  const levels = (c: LevelCounts) => {
    for (const l of CONCEPT_BLANK_LEVELS) out.expGolomb(c[l], COUNT_K);
  };
  selection.forms.forEach(({ form, counts, extras }, i) => {
    if (i > 0) {
      const same = sameCounts(counts, selection.forms[i - 1]!.counts);
      out.bit(same);
      if (!same) levels(counts);
    } else levels(counts);
    if (HAS_EXTRAS.has(form)) levels(extras);
  });
  return out.symbols();
}

function readSelection(
  symbols: readonly number[],
): ConceptBlankSelection | null {
  const input = new BitReader(symbols);
  const sections: string[] = [];
  const runs = input.expGolomb(0) + 1;
  let next = 0;
  for (let r = 0; r < runs; r++) {
    const start =
      r === 0 ? input.read(SECTION_INDEX_BITS) : next + input.expGolomb(2) + 1;
    const length = input.expGolomb(1) + 1;
    if (start + length > KEY_AT.length || sections.length + length > 60)
      return null;
    for (let i = start; i < start + length; i++) sections.push(KEY_AT[i]!);
    next = start + length;
  }

  let order: number[];
  if (!input.bit()) {
    order = CONCEPT_BLANK_FORMS.flatMap((_, i) => (input.bit() ? [i] : []));
  } else {
    const n = input.read(3) + 1;
    order = Array.from({ length: n }, () => input.read(3));
  }
  if (order.length === 0 || order.some((v) => v >= CONCEPT_BLANK_FORMS.length))
    return null;

  const levels = (): LevelCounts => ({
    하: input.expGolomb(COUNT_K),
    중: input.expGolomb(COUNT_K),
    상: input.expGolomb(COUNT_K),
  });
  const forms: ConceptBlankSelection["forms"] = [];
  order.forEach((v, i) => {
    const form = CONCEPT_BLANK_FORMS[v]!;
    const counts =
      i > 0 && input.bit() ? { ...forms[i - 1]!.counts } : levels();
    const extras = HAS_EXTRAS.has(form) ? levels() : { ...ZERO };
    forms.push({ form, counts, extras });
  });
  if (!input.done()) return null;
  const parsed = conceptBlankSelectionSchema.safeParse({ sections, forms });
  return parsed.success ? parsed.data : null;
}

/* ───────── 밖으로 ───────── */

/** 네 글자마다 점. */
const formatCode = (text: string) => text.replace(/(.{4})(?=.)/g, "$1.");

/** 지면에 찍힌 코드의 은행 지문(4글자) — 그 고르기로 지면에 찍히는 문항에서 낸다. */
export function sheetBankDigest(
  selection: ConceptBlankSelection,
  bank: ConceptBlankBank = CONCEPT_BLANK_BANK,
): string {
  return toText(
    digestSymbols(
      canonicalSheetSelection(conceptBlankSelectionSchema.parse(selection)),
      bank,
    ),
  );
}

/**
 * 고르기 → 지면 코드(`1ABC.DEFG.…`). 같은 고르기 · 같은 은행이면 언제나 같은 코드.
 * 계약에 안 맞거나 나무에 있는 소단원이 하나도 없으면 던진다(지면이 없는 고르기다).
 */
export function encodeSheetCode(
  selection: ConceptBlankSelection,
  bank: ConceptBlankBank = CONCEPT_BLANK_BANK,
): string {
  const canonical = canonicalSheetSelection(
    conceptBlankSelectionSchema.parse(selection),
  );
  if (canonical.sections.length === 0)
    throw new RangeError("나무에 있는 소단원이 없다");
  const body = [
    SHEET_CODE_VERSION,
    ...writeSelection(canonical),
    ...digestSymbols(canonical, bank),
  ];
  return formatCode(toText([...body, checkSymbol(body)]));
}

/**
 * 지면 코드 → 고르기. 소문자 · 점 · 빈칸 · 붙임표 · `O`(0) · `I` · `L`(1)은 너그럽게 받는다.
 * 판 번호 · 검사 글자 · 비트 꼴 · 계약 · «다시 묶으면 같은 글자» 가운데 하나라도 어긋나면 null.
 * 지문이 지금 은행과 다르면 고르기는 그대로 돌려주고 `bankChanged` 로 알린다.
 */
export function decodeSheetCode(
  code: string | null | undefined,
  bank: ConceptBlankBank = CONCEPT_BLANK_BANK,
): SheetCodeReading | null {
  if (!code) return null;
  const text = code
    .toUpperCase()
    .replace(/[.\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  const symbols = [...text].map((ch) => VALUE_OF.get(ch));
  if (symbols.some((v) => v === undefined)) return null;
  const all = symbols as number[];
  const tail = SHEET_CODE_DIGEST_LENGTH + 1;
  if (all.length < tail + 2 || all[0] !== SHEET_CODE_VERSION) return null;
  if (checkSymbol(all.slice(0, -1)) !== all[all.length - 1]) return null;

  const payload = all.slice(1, -tail);
  let selection: ConceptBlankSelection | null;
  try {
    selection = readSelection(payload);
  } catch {
    return null;
  }
  if (!selection) return null;
  if (toText(writeSelection(selection)) !== toText(payload)) return null;

  const bankDigest = toText(all.slice(-tail, -1));
  return {
    selection,
    bankDigest,
    bankChanged: toText(digestSymbols(selection, bank)) !== bankDigest,
  };
}
