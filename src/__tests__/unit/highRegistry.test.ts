/**
 * 고등 등록부 **전체** — 유형 모듈이 몇 개가 되든 모든 등록 유형에 같은 규칙을 건다.
 *
 * 물결 1 에서 중단원 모듈 열한 개가 동시에 생긴다. 지면·난이도·형식 규칙을 모듈 시험마다 옮겨 적으면
 * 한쪽만 고쳐도 아무도 모른다 — 그래서 그 규칙은 **여기 한 곳**에서 돈다. 모듈 시험은 값 검산
 * (`facts` 로 답을 다시 세우기 · 발문이 facts 의 수치를 보여 주나)만 둔다
 * (`docs/planning/tracks/high-wave1-brief.md`).
 *
 * 규칙의 뿌리는 본보기 시험 `highIdentity.test.ts` 다. 여기서 더한 것:
 *   · 조사는 `highJosaMismatches` — 분수·문자·지수·허수로 끝나는 수식까지 본다(중등 자는 수로 끝날 때만)
 *   · 중단원에 손을 댔으면 「등록 ∪ 보류 = 색인」 — 조용히 빠진 유형이 없게
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { bareNumbers } from "../../lib/elementary/rules";
import { expandFamily } from "../../lib/engine/expandEngine";
import {
  generateHighProblem,
  generateHighSet,
  registeredHighHolds,
  registeredHighTypes,
} from "../../lib/high/generate";
import type { HighProblem, HighTypeEntry } from "../../lib/high/types";
import {
  highCatalog,
  highJosaMismatches,
  mathSpans,
  modalTiers,
  roMismatches,
  tiersAllowedBy,
  type HighCatalogRow,
} from "../helpers/highPage";
import { pageSmells } from "../helpers/midPage";
import {
  HIGH_TITLE_CORRECTIONS,
  expectedHighTitle,
} from "../helpers/highTitles";

const SEEDS = [20260913, 1, 7777];
const VARIANTS = 10;

const entries = registeredHighTypes();
const holds = registeredHighHolds();

function rowOf(
  book: string,
  minor: string,
  number: string,
): HighCatalogRow | undefined {
  return highCatalog(book).find(
    (t) => t.minor === minor && t.number === number,
  );
}

function each(fn: (p: HighProblem, e: HighTypeEntry) => void): void {
  for (const e of entries) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(e.key, seed, v), e);
      }
    }
  }
}

function pageParts(p: HighProblem): [string, string][] {
  return [
    ["발문", p.content],
    ["정답", p.answer],
    ["해설", p.solution],
    ...(p.distractors ?? []).map((d): [string, string] => ["오답", d]),
  ];
}

describe("고등 등록부 — 색인과 단원", () => {
  /**
   * 🔴 **과목별 보존** — 등록 · 보류 수를 과목마다 따로 못 박는다(2026-10-08 엔진 보강 ③-0).
   *
   * 종전에는 `expect(entries).toHaveLength(168)` 하나였다. 공통수학2 가 붙으면 그 수가 345 가 되는데, 그때
   * 「전체 수」만 고치면 공통수학1 에서 한 유형이 빠지고 공통수학2 에서 하나가 더 붙어도 초록이다. 그래서 과목마다
   * 「등록 + 보류 = 색인」과 함께 **등록 수 · 보류 수 자체**를 적는다 — 유형을 보류로 내리거나 되살리면 여기서
   * 빨개지고, 그 까닭을 커밋에 남기며 숫자를 고친다. 새 과목은 **여기 한 줄을 더해야** 등록할 수 있다(표에 없는
   * 과목이 등록부에 있으면 빨강 — 조용히 늘지 않는다).
   */
  const PRESERVED: Record<
    string,
    { registered: number; held: number; catalog: number }
  > = {
    공통수학1: { registered: 168, held: 2, catalog: 170 },
  };

  it("HIGH-COUNT: 과목마다 등록 · 보류 수가 보존된다 — 다른 과목이 붙어도 공통수학1 의 168 을 지킨다", () => {
    const count = (keys: readonly string[]) => {
      const out = new Map<string, number>();
      for (const k of keys) {
        const book = k.split("|")[0]!;
        out.set(book, (out.get(book) ?? 0) + 1);
      }
      return out;
    };
    const registered = count(entries.map((e) => e.key));
    const held = count(holds.map((h) => h.key));
    const books = new Set([...registered.keys(), ...held.keys()]);
    expect(
      [...books].filter((b) => !(b in PRESERVED)),
      "표에 없는 과목이 등록부에 있다 — PRESERVED 에 그 과목의 수를 적어라",
    ).toEqual([]);
    for (const [book, want] of Object.entries(PRESERVED)) {
      expect(highCatalog(book), `${book}: 색인`).toHaveLength(want.catalog);
      expect(
        {
          registered: registered.get(book) ?? 0,
          held: held.get(book) ?? 0,
        },
        book,
      ).toEqual({ registered: want.registered, held: want.held });
      expect(want.registered + want.held, `${book}: 등록 + 보류 = 색인`).toBe(
        want.catalog,
      );
    }
    // 키의 과목 토막과 `grade` 가 어긋나면 위 셈이 다른 과목으로 샌다
    for (const e of entries) expect(e.key.split("|")[0], e.key).toBe(e.grade);
  });

  it("HIGH-META: OCR 잔재가 없는 표시 제목 18개와 원래 유형 키를 보존한다", () => {
    expect(Object.keys(HIGH_TITLE_CORRECTIONS)).toHaveLength(18);
    const byKey = new Map(entries.map((e) => [e.key, e]));
    for (const [key, title] of Object.entries(HIGH_TITLE_CORRECTIONS)) {
      expect(byKey.get(key)?.rpmTitle, key).toBe(title);
      expect(
        generateHighProblem(key, 0).rpmTitle,
        `${key}: 실제 산출 제목`,
      ).toBe(title);
    }
    for (const e of entries)
      expect(e.rpmTitle, e.key).not.toMatch(/\.c\d|^[,\-]|_n C_r/);
  });

  it("키는 `과목|중단원|번호` 이고 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.key, "키 모양").toBe(`${e.grade}|${e.rpmMinor}|${e.rpmType}`);
      expect(e.rpmBook, `${e.key} 책`).toBe(e.grade);
      const row = rowOf(e.rpmBook, e.rpmMinor, e.rpmType);
      expect(row, `${e.key}: 색인에 없는 유형`).toBeDefined();
      expect(e.rpmTitle, `${e.key} 제목`).toBe(
        expectedHighTitle(e.key, row!.title),
      );
    }
  });

  it("단원은 그 과목 교육과정 시드에 실제로 있는 이름이다", () => {
    for (const e of entries) {
      const sections = new Set(
        CURRICULUM_UNITS.filter((u) => u.grade === e.grade).map(
          (u) => u.section,
        ),
      );
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
    }
  });

  it("보류는 색인에 있는 유형이고, 까닭이 있으며, 등록과 겹치지 않는다", () => {
    const registered = new Set(entries.map((e) => e.key));
    for (const h of holds) {
      const [book, minor, number] = h.key.split("|");
      expect(
        rowOf(book!, minor!, number!),
        `보류 ${h.key}: 색인에 없다`,
      ).toBeDefined();
      expect(
        h.reason.trim().length,
        `보류 ${h.key}: 까닭이 비었다`,
      ).toBeGreaterThanOrEqual(8);
      expect(registered.has(h.key), `보류 ${h.key}: 등록에도 있다`).toBe(false);
    }
  });

  it("손을 댄 중단원은 색인 유형을 전부 덮는다 — 등록 ∪ 보류 = 색인", () => {
    const touched = new Map<string, Set<string>>();
    for (const key of [
      ...entries.map((e) => e.key),
      ...holds.map((h) => h.key),
    ]) {
      const [book, minor, number] = key.split("|");
      const mk = `${book}|${minor}`;
      if (!touched.has(mk)) touched.set(mk, new Set());
      touched.get(mk)!.add(number!);
    }
    for (const [mk, got] of touched) {
      const [book, minor] = mk.split("|");
      const want = highCatalog(book!)
        .filter((t) => t.minor === minor)
        .map((t) => t.number);
      expect(
        [...got].sort(),
        `${mk}: 등록도 보류도 안 된 유형 ${want.filter((n) => !got.has(n)).join(", ")}`,
      ).toEqual([...want].sort());
    }
  });
});

describe("고등 등록부 — 지면", () => {
  it("수는 전부 수식 안에 있고, 값은 맞고 보기만 흉한 모양이 없다", () => {
    each((p, e) => {
      for (const [what, text] of pageParts(p)) {
        expect(bareNumbers(text), `${e.key} ${what}`).toEqual([]);
        expect(pageSmells(text), `${e.key} ${what}: ${text}`).toEqual([]);
      }
    });
  });

  it("수식 뒤 조사가 읽기와 맞는다 — 분수·문자·지수·허수 끝까지", () => {
    each((p, e) => {
      for (const [what, text] of [
        ["발문", p.content],
        ["해설", p.solution],
      ] as const) {
        expect(highJosaMismatches(text), `${e.key} ${what}`).toEqual([]);
        expect(roMismatches(text), `${e.key} ${what} (으)로`).toEqual([]);
      }
    });
  });

  it("해설은 여러 줄이고 마지막 줄이 답의 수식을 말한다", () => {
    each((p, e) => {
      const lines = p.solution.split("\n").filter((l) => l.trim() !== "");
      expect(lines.length, `${e.key} 해설 줄 수`).toBeGreaterThanOrEqual(2);
      const last = lines[lines.length - 1]!;
      const spans = mathSpans(p.answer);
      expect(
        spans.length,
        `${e.key} 정답에 수식이 없다: ${p.answer}`,
      ).toBeGreaterThan(0);
      for (const s of spans) {
        expect(
          last.includes(s),
          `${e.key} 해설 끝에 ${s} 가 없다: ${last}`,
        ).toBe(true);
      }
    });
  });
});

describe("고등 등록부 — 난이도와 형식", () => {
  it("칸은 검은 표가 허락한 것뿐 · 대표문제 꼴을 낸다 · 표의 최빈 칸을 낸다", () => {
    for (const e of entries) {
      const levels = rowOf(e.rpmBook, e.rpmMinor, e.rpmType)!.levels;
      const allowed = tiersAllowedBy(levels);
      const seen = new Set<string>();
      for (const seed of SEEDS) {
        for (let v = 0; v < VARIANTS; v += 1) {
          seen.add(generateHighProblem(e.key, seed, v).difficulty);
        }
      }
      for (const t of seen) {
        expect(
          allowed.has(t),
          `${e.key}: 표 ${JSON.stringify(levels)} 가 허락하지 않는 칸 ${t}`,
        ).toBe(true);
      }
      // 대표문제 꼴은 `기본` — 발문이 계산 지시뿐이면 공용 규칙이 `연산` 으로 내린다
      expect(
        seen.has("기본") || seen.has("연산"),
        `${e.key}: 대표문제 꼴(기본)이 없다 — 낸 칸 ${[...seen].join(",")}`,
      ).toBe(true);
      const modal = modalTiers(levels);
      if (modal.size > 0) {
        expect(
          [...modal].some((t) => seen.has(t)),
          `${e.key}: 표에서 가장 많은 칸(${[...modal].join(",")})을 안 낸다`,
        ).toBe(true);
      }
    }
  });

  it("변형을 세 벌 뽑을 수 있고, 변형마다 객관식이 나온다", () => {
    for (const e of entries) {
      expect(() => generateHighSet(e.key, 20260913, 3), e.key).not.toThrow();
      const got = expandFamily((v) => {
        const p = generateHighProblem(e.key, 20260913, v);
        return {
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          familyKey: `high:${e.key}`,
          problemType: "계산",
          distractors: p.distractors,
        };
      }, 3);
      expect(got.skippedMcq, `${e.key}: ${got.reasons.join(" / ")}`).toBe(0);
      expect(
        got.items.filter((i) => i.questionType === "객관식"),
        e.key,
      ).toHaveLength(3);
    }
  });
});
