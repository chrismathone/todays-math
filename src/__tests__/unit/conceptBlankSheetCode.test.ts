/**
 * 개념 백지 지면 코드(트랙 cb-code · 26 §8 · 3자 합의 안건 7) — 사진 채점의 첫 걸음으로 지면에 **코드만** 찍는다.
 *
 * 보는 것 — 왕복(encode → decode 가 같은 선택) · 글자표 밖 글자 0 · 은행 한 글자 바뀌면 지문이 달라짐 ·
 * 잘못된 코드는 null(한 글자 바뀜 · 이웃 두 글자 뒤바뀜 · 잘림 · 덧붙음) · 너그럽게 읽기(소문자 · 점 없음 · O/I/L) ·
 * 같은 고르기 = 같은 코드 · 학생을 가리키는 값(제목 · 날짜)이 코드에 안 들어간다.
 */
import { describe, expect, it } from "vitest";

import {
  CONCEPT_BLANK_FORMS,
  SHEET_CODE_ALPHABET,
  sheetCodeSchema,
  type ConceptBlankBank,
  type ConceptBlankSelection,
  type LevelCounts,
} from "@/contracts/conceptBlank.contract";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { composeSheets } from "@/lib/concept-blank/compose";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { BLANK_SECTIONS, BLANK_TREE } from "@/lib/concept-blank/sections";
import {
  canonicalSheetSelection,
  decodeSheetCode,
  encodeSheetCode,
  sheetBankDigest,
} from "@/lib/concept-blank/sheetCode";

const ALL: LevelCounts = { 하: 40, 중: 40, 상: 40 };
const NONE: LevelCounts = { 하: 0, 중: 0, 상: 0 };
const FIXTURE_SECTIONS = [
  ...new Set(
    [
      ...FIXTURE_BANK.concepts,
      ...FIXTURE_BANK.ox,
      ...FIXTURE_BANK.apply,
      ...FIXTURE_BANK.figures,
    ].map((x) => x.section),
  ),
];
const FIVE: ConceptBlankSelection["forms"] = [
  { form: "recall", counts: { 하: 3, 중: 2, 상: 1 }, extras: NONE },
  {
    form: "term",
    counts: { 하: 3, 중: 2, 상: 1 },
    extras: { 하: 2, 중: 1, 상: 0 },
  },
  {
    form: "cloze",
    counts: { 하: 3, 중: 2, 상: 1 },
    extras: { 하: 1, 중: 1, 상: 1 },
  },
  { form: "map", counts: { 하: 3, 중: 2, 상: 1 }, extras: NONE },
  { form: "figure", counts: { 하: 1, 중: 1, 상: 0 }, extras: NONE },
];
const FIXTURE_SELECTION: ConceptBlankSelection = {
  sections: FIXTURE_SECTIONS,
  forms: FIVE,
};

/** 시드 고정 난수(mulberry32) — 같은 시드면 같은 표본. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const READY = BLANK_SECTIONS.filter((s) => !/^초[12]$/.test(s.grade));
const CHAPTERS = BLANK_TREE.flatMap((g) => g.chapters);

/** 무작위 고르기 — 흩어진 소단원 · 통째 대단원 · 형식 순서 뒤섞기 · 겹친 형식 · 0~40 의 수 · 쓰지 않는 extras. */
function randomSelection(next: () => number): ConceptBlankSelection {
  const int = (n: number) => Math.floor(next() * n);
  const sections = new Set<string>();
  const want = 1 + int(next() < 0.7 ? 12 : 60);
  while (sections.size < want) {
    if (next() < 0.3) {
      const chapter = CHAPTERS[int(CHAPTERS.length)]!;
      for (const s of chapter.sections)
        if (sections.size < 60) sections.add(s.key);
    } else {
      const pool = next() < 0.1 ? BLANK_SECTIONS : READY;
      sections.add(pool[int(pool.length)]!.key);
    }
  }
  const count = () => (next() < 0.2 ? 0 : next() < 0.7 ? int(8) : int(41));
  const counts = (): LevelCounts => ({ 하: count(), 중: count(), 상: count() });
  const forms: ConceptBlankSelection["forms"] =
    next() < 0.7
      ? CONCEPT_BLANK_FORMS.filter(() => next() < 0.6).map((form) => ({
          form,
          counts: counts(),
          extras: counts(),
        }))
      : Array.from({ length: 1 + int(5) }, () => ({
          form: CONCEPT_BLANK_FORMS[int(5)]!,
          counts: next() < 0.4 ? { 하: 4, 중: 3, 상: 2 } : counts(),
          extras: counts(),
        }));
  if (!forms.length)
    forms.push({ form: "term", counts: counts(), extras: counts() });
  return {
    sections: [...sections].sort(() => next() - 0.5),
    forms,
    ...(next() < 0.3 ? { title: "김철수 보충 · 3월" } : {}),
    ...(next() < 0.3 ? { date: "2026-10-01" } : {}),
  };
}

/** 머리(제목 · 날짜에서 나온다)를 뺀 지면. */
const bodies = (selection: ConceptBlankSelection, bank: ConceptBlankBank) =>
  composeSheets(selection, bank).map((sheet) => ({
    ...sheet,
    header: undefined,
  }));

describe("encodeSheetCode → decodeSheetCode — 코드만으로 고르기를 되살린다", () => {
  it("FIXTURE 다섯 형식 — 같은 고르기로 돌아오고 은행은 그대로다", () => {
    const code = encodeSheetCode(FIXTURE_SELECTION, FIXTURE_BANK);
    const read = decodeSheetCode(code, FIXTURE_BANK);
    expect(read).not.toBeNull();
    expect(read!.selection).toEqual(canonicalSheetSelection(FIXTURE_SELECTION));
    expect(read!.bankChanged).toBe(false);
    expect(read!.bankDigest).toBe(code.replace(/\./g, "").slice(-5, -1));
    expect(composeSheets(read!.selection, FIXTURE_BANK)).toEqual(
      composeSheets(FIXTURE_SELECTION, FIXTURE_BANK),
    );
  });

  it("무작위 고르기 160 개(실제 은행) — 되살린 고르기의 지면이 원래 지면과 같다", () => {
    const next = rng(20261001);
    for (let i = 0; i < 160; i++) {
      const selection = randomSelection(next);
      const code = encodeSheetCode(selection, CONCEPT_BLANK_BANK);
      const read = decodeSheetCode(code, CONCEPT_BLANK_BANK);
      expect(read, `${i}: ${code}`).not.toBeNull();
      expect(read!.selection, code).toEqual(canonicalSheetSelection(selection));
      expect(read!.bankChanged, code).toBe(false);
      expect(bodies(read!.selection, CONCEPT_BLANK_BANK), code).toEqual(
        bodies(selection, CONCEPT_BLANK_BANK),
      );
    }
  });

  it("되살린 고르기는 계약을 지난다 · 소단원은 교육과정 순서 · A · D · E 의 extras 는 0", () => {
    const selection: ConceptBlankSelection = {
      sections: [
        FIXTURE_SECTIONS[3]!,
        FIXTURE_SECTIONS[0]!,
        FIXTURE_SECTIONS[3]!,
      ],
      forms: [
        { form: "map", counts: ALL, extras: { 하: 5, 중: 0, 상: 0 } },
        { form: "term", counts: ALL, extras: { 하: 2, 중: 0, 상: 1 } },
      ],
    };
    const read = decodeSheetCode(
      encodeSheetCode(selection, FIXTURE_BANK),
      FIXTURE_BANK,
    )!;
    expect(read.selection).toEqual({
      sections: [FIXTURE_SECTIONS[0]!, FIXTURE_SECTIONS[3]!].sort(
        (a, b) =>
          BLANK_SECTIONS.findIndex((s) => s.key === a) -
          BLANK_SECTIONS.findIndex((s) => s.key === b),
      ),
      forms: [
        { form: "map", counts: ALL, extras: NONE },
        { form: "term", counts: ALL, extras: { 하: 2, 중: 0, 상: 1 } },
      ],
    });
  });
});

describe("코드의 꼴 — 글자표 · 점 · 판 번호", () => {
  it("글자표(Crockford base32) 밖 글자가 0 이고, 네 글자마다 점, 맨 앞은 꼴 판 번호 1", () => {
    const next = rng(7);
    const codes = [
      encodeSheetCode(FIXTURE_SELECTION, FIXTURE_BANK),
      ...Array.from({ length: 60 }, () =>
        encodeSheetCode(randomSelection(next), CONCEPT_BLANK_BANK),
      ),
    ];
    for (const code of codes) {
      expect(code[0], code).toBe("1");
      expect(sheetCodeSchema.safeParse(code).success, code).toBe(true);
      const groups = code.split(".");
      expect(
        groups.slice(0, -1).every((g) => g.length === 4),
        code,
      ).toBe(true);
      for (const ch of groups.join(""))
        expect(SHEET_CODE_ALPHABET.includes(ch), `${code} — ${ch}`).toBe(true);
      expect(code, code).not.toMatch(/[ILOU]/);
    }
  });

  it("같은 고르기면 같은 코드 — 소단원 차례 · 겹침 · 제목 · 날짜는 코드를 바꾸지 않는다", () => {
    const code = encodeSheetCode(FIXTURE_SELECTION, FIXTURE_BANK);
    expect(
      encodeSheetCode(structuredClone(FIXTURE_SELECTION), FIXTURE_BANK),
    ).toBe(code);
    expect(
      encodeSheetCode(
        {
          ...FIXTURE_SELECTION,
          sections: [...FIXTURE_SECTIONS]
            .reverse()
            .concat(FIXTURE_SECTIONS[0]!),
          title: "김철수 · 12번",
          date: "2026-10-01",
        },
        FIXTURE_BANK,
      ),
    ).toBe(code);
  });

  it("학생을 가리키는 값이 없다 — 되살린 고르기에 제목 · 날짜가 없다", () => {
    const read = decodeSheetCode(
      encodeSheetCode(
        { ...FIXTURE_SELECTION, title: "김철수", date: "2026-10-01" },
        FIXTURE_BANK,
      ),
      FIXTURE_BANK,
    )!;
    expect(read.selection).not.toHaveProperty("title");
    expect(read.selection).not.toHaveProperty("date");
  });

  it("나무 차례 번호는 9비트에 든다 — 소단원이 512 를 넘으면 꼴 판을 올려야 한다", () => {
    expect(BLANK_SECTIONS.length).toBeLessThanOrEqual(512);
  });

  it("주소 `?s=` 보다 훨씬 짧다", () => {
    const code = encodeSheetCode(FIXTURE_SELECTION, FIXTURE_BANK);
    expect(code.replace(/\./g, "").length).toBeLessThan(30);
  });
});

describe("은행 지문 — 은행이 바뀐 뒤의 지면과 옛 지면을 가른다", () => {
  const code = encodeSheetCode(FIXTURE_SELECTION, FIXTURE_BANK);
  const before = sheetBankDigest(FIXTURE_SELECTION, FIXTURE_BANK);
  const picked = new Set(
    composeSheets(FIXTURE_SELECTION, FIXTURE_BANK).flatMap((sheet) =>
      JSON.stringify(sheet)
        .match(/"id":"[^"]+"/g)!
        .map((m) => m.slice(6, -1)),
    ),
  );

  /** 그 칸의 마지막 글자 하나를 바꾼 은행. */
  const touch = (s: string) =>
    s.slice(0, -1) + (s.endsWith("가") ? "나" : "가");

  it("지면에 찍힌 문항의 글자 하나만 바뀌어도 지문이 달라진다 — 칸마다", () => {
    let changed = 0;
    for (const part of ["concepts", "ox", "apply", "figures"] as const) {
      FIXTURE_BANK[part].forEach((item, index) => {
        if (!picked.has(item.id)) return;
        for (const [field, value] of Object.entries(item)) {
          if (typeof value !== "string" || field === "section") continue;
          const bank = structuredClone(FIXTURE_BANK);
          (bank[part][index] as Record<string, unknown>)[field] = touch(value);
          expect(
            sheetBankDigest(FIXTURE_SELECTION, bank),
            `${item.id}.${field}`,
          ).not.toBe(before);
          changed++;
        }
      });
    }
    expect(changed).toBeGreaterThan(40);
  });

  it("정답(○× 참/거짓 · 이름표 답)이 바뀌어도 달라진다", () => {
    const ox = structuredClone(FIXTURE_BANK);
    const i = ox.ox.findIndex((x) => picked.has(x.id));
    ox.ox[i]!.answer = !ox.ox[i]!.answer;
    expect(sheetBankDigest(FIXTURE_SELECTION, ox)).not.toBe(before);

    const tag = structuredClone(FIXTURE_BANK);
    const f = tag.figures.find((x) => picked.has(x.id) && x.tags.length)!;
    f.tags[0]!.answer = touch(f.tags[0]!.answer);
    expect(sheetBankDigest(FIXTURE_SELECTION, tag)).not.toBe(before);
  });

  it("decode 는 선택을 그대로 돌려주되 «은행이 바뀜»을 알린다", () => {
    const bank = structuredClone(FIXTURE_BANK);
    const i = bank.concepts.findIndex((x) => picked.has(x.id));
    bank.concepts[i]!.term = touch(bank.concepts[i]!.term);
    const read = decodeSheetCode(code, bank);
    expect(read).not.toBeNull();
    expect(read!.bankChanged).toBe(true);
    expect(read!.bankDigest).toBe(before);
    expect(read!.selection).toEqual(canonicalSheetSelection(FIXTURE_SELECTION));
  });

  it("지면에 안 찍힌 문항이 바뀌면 지문은 그대로다(코드도 그대로)", () => {
    const one: ConceptBlankSelection = {
      sections: [FIXTURE_SECTIONS[0]!],
      forms: [{ form: "term", counts: ALL, extras: ALL }],
    };
    const bank = structuredClone(FIXTURE_BANK);
    const i = bank.concepts.findIndex((x) => x.section !== FIXTURE_SECTIONS[0]);
    bank.concepts[i]!.term = touch(bank.concepts[i]!.term);
    expect(encodeSheetCode(one, bank)).toBe(encodeSheetCode(one, FIXTURE_BANK));
  });
});

describe("잘못된 코드는 null", () => {
  const code = encodeSheetCode(FIXTURE_SELECTION, FIXTURE_BANK);
  const raw = code.replace(/\./g, "");

  it("빈 글 · 아무 글 · 판 번호만 · 글자표 밖 글자", () => {
    for (const bad of [
      "",
      "   ",
      "hello",
      "1",
      "1ABC",
      "1ABC.DEFG",
      raw.replace(/.$/, "U"),
      raw.slice(0, 5) + "*" + raw.slice(6),
      "2" + raw.slice(1),
    ])
      expect(decodeSheetCode(bad, FIXTURE_BANK), bad).toBeNull();
    expect(decodeSheetCode(null, FIXTURE_BANK)).toBeNull();
    expect(decodeSheetCode(undefined, FIXTURE_BANK)).toBeNull();
  });

  it("어느 자리든 글자 하나가 바뀌면 null — 다른 고르기로 잘못 읽지 않는다", () => {
    for (let i = 0; i < raw.length; i++)
      for (const ch of SHEET_CODE_ALPHABET) {
        if (ch === raw[i]) continue;
        const bad = raw.slice(0, i) + ch + raw.slice(i + 1);
        expect(decodeSheetCode(bad, FIXTURE_BANK), bad).toBeNull();
      }
  });

  it("이웃한 두 글자가 뒤바뀌면 null", () => {
    for (let i = 0; i + 1 < raw.length; i++) {
      if (raw[i] === raw[i + 1]) continue;
      const bad = raw.slice(0, i) + raw[i + 1] + raw[i] + raw.slice(i + 2);
      expect(decodeSheetCode(bad, FIXTURE_BANK), bad).toBeNull();
    }
  });

  it("잘리거나 글자가 빠지거나 더해지면 null", () => {
    for (let i = 0; i < raw.length; i++) {
      const dropped = raw.slice(0, i) + raw.slice(i + 1);
      expect(decodeSheetCode(dropped, FIXTURE_BANK), dropped).toBeNull();
    }
    for (const ch of "0Z")
      expect(decodeSheetCode(raw + ch, FIXTURE_BANK)).toBeNull();
  });

  it("아무렇게나 지은 글 2000 개 — 하나도 고르기로 읽히지 않는다", () => {
    const next = rng(99);
    for (let n = 0; n < 2000; n++) {
      const len = 6 + Math.floor(next() * 30);
      let s = "1";
      for (let i = 1; i < len; i++)
        s += SHEET_CODE_ALPHABET[Math.floor(next() * 32)];
      expect(decodeSheetCode(s, FIXTURE_BANK), s).toBeNull();
    }
  });
});

describe("너그럽게 읽기 — 손으로 옮기거나 사진에서 읽은 글", () => {
  const code = encodeSheetCode(FIXTURE_SELECTION, FIXTURE_BANK);
  const want = decodeSheetCode(code, FIXTURE_BANK);

  it("소문자 · 점 없음 · 빈칸 · 붙임표 · O 와 0 · I · L 과 1", () => {
    const raw = code.replace(/\./g, "");
    for (const variant of [
      code.toLowerCase(),
      raw,
      raw.replace(/(.{4})/g, "$1 "),
      raw.replace(/(.{4})/g, "$1-"),
      ` ${code} `,
      code.replace(/0/g, "O"),
      code.replace(/1/g, "I"),
      code.replace(/1/g, "l"),
    ])
      expect(decodeSheetCode(variant, FIXTURE_BANK), variant).toEqual(want);
  });
});
