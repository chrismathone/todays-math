/**
 * 진술 문형 31 · 32 (2026-10-18) — 정답을 **문장을 다시 읽어** 구한다.
 * 생성기가 붙인 참 · 거짓을 믿지 않는다: 아래 `judge` 가 글에서 수를 뽑아 따로 판정하고,
 * 못 읽는 문장이 하나라도 나오면 운다(판정 없이 지나가는 문장이 없게).
 */
import { describe, expect, it } from "vitest";

import { expandFamily } from "@/lib/engine/expandEngine";
import {
  expectedFormCount,
  generateElementaryForm,
  listedForms,
} from "@/lib/elementary/forms";
import { STATEMENT_FORMS } from "@/lib/elementary/statementForms";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { isChooseAll } from "@/lib/problem/chooseAllRule";

import { CURRICULUM_UNITS as UNITS } from "../../../prisma/seed-data/units";

function unitOf(key: string) {
  const [grade, code] = key.split("|");
  const unit = UNITS.find(
    (u) => u.grade === grade && u.section.startsWith(`${code} `),
  );
  if (!unit) throw new Error(`단원 없음 ${key}`);
  return unit;
}

/** `$…$` 를 벗기고 `\frac{a}{b}` → `a/b`, `\square` → `□`, `\times` → `×`. */
function plain(text: string): string {
  return text
    .replace(/\$/g, "")
    .replace(/(\d+)\\frac\{(\d+)\}\{(\d+)\}/g, "$1+$2/$3")
    .replace(/\\frac\{(\d+)\}\{(\d+)\}/g, "$1/$2")
    .replace(/\\square/g, "□")
    .replace(/\\times/g, "×")
    .trim();
}

const val = (s: string) =>
  s
    .split("+")
    .map((p) => (p.includes("/") ? Number(p.split("/")[0]) / Number(p.split("/")[1]) : Number(p)))
    .reduce((a, b) => a + b, 0);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** 문장 하나의 참 · 거짓 — 못 읽으면 던진다. */
function judge(raw: string): boolean {
  const s = plain(raw);
  let m: RegExpMatchArray | null;
  const N = "(\\d+)";
  const F = "([\\d+/]+)";
  const r = (re: string) => (m = s.match(new RegExp(`^${re}$`)));
  if (r(`${N} 이상인 수에는 ${N}[이가] 들어갑니다\\.`)) return +m![2]! >= +m![1]!;
  if (r(`${N} 이하인 수에는 ${N}[이가] 들어갑니다\\.`)) return +m![2]! <= +m![1]!;
  if (r(`${N} 초과인 수에는 ${N}[이가] (들어가지 않습니다|들어갑니다)\\.`))
    return (+m![2]! > +m![1]!) === (m![3] === "들어갑니다");
  if (r(`${N} 미만인 수에는 ${N}[이가] 들어갑니다\\.`)) return +m![2]! < +m![1]!;
  if (r(`${N} (이상|초과) ${N} (이하|미만)인 자연수는 ${N}개입니다\\.`)) {
    const [a, b, c] = [+m![1]!, +m![3]!, +m![5]!];
    let k = 0;
    for (let v = 1; v <= b + 1; v += 1)
      if ((m![2] === "이상" ? v >= a : v > a) && (m![4] === "이하" ? v <= b : v < b)) k += 1;
    return k === c;
  }
  if (r(`${N} (이상|초과)인 자연수 가운데 가장 작은 수는 ${N}입니다\\.`))
    return +m![3]! === (m![2] === "이상" ? +m![1]! : +m![1]! + 1);
  if (r(`${N} (이하|미만)인 자연수 가운데 가장 큰 수는 ${N}입니다\\.`))
    return +m![3]! === (m![2] === "이하" ? +m![1]! : +m![1]! - 1);
  if (r(`${N}[을를] (반올림|올림|버림)하여 (십|백|천)의 자리까지 나타내면 ${N}입니다\\.`)) {
    const x = +m![1]!;
    const p = m![3] === "십" ? 10 : m![3] === "백" ? 100 : 1000;
    const want =
      m![2] === "올림" ? Math.ceil(x / p) * p : m![2] === "버림" ? Math.floor(x / p) * p : Math.round(x / p) * p;
    return want === +m![4]!;
  }
  if (r(`${N}/${N}[은는] (진분수|가분수)입니다\\.`))
    return m![3] === "진분수" ? +m![1]! < +m![2]! : +m![1]! >= +m![2]!;
  if (r(`분모가 ${N}인 진분수는 모두 ${N}개입니다\\.`)) return +m![2]! === +m![1]! - 1;
  if (r(`${F}[은는] ${N}보다 큽니다\\.`)) return val(m![1]!) > +m![2]!;
  if (r(`${N}/${N}[은는] 1과 같습니다\\.`)) return +m![1]! === +m![2]!;
  if (r(`${F}[은는] ${N}보다 크고 ${N}보다 작습니다\\.`))
    return val(m![1]!) > +m![2]! && val(m![1]!) < +m![3]!;
  if (r(`${F}[을를] (가분수|대분수)로 나타내면 ${F}입니다\\.`)) {
    const [from, to] = [m![1]!, m![3]!];
    // 가분수로: 결과에 «+» 가 없어야 · 대분수로: 결과가 «자연수+진분수».
    if (m![2] === "가분수" && to.includes("+")) return false;
    if (m![2] === "대분수" && !to.includes("+")) return false;
    return near(val(from), val(to));
  }
  if (r(`${F}[과와] ${F}[은는] 크기가 같습니다\\.`)) return near(val(m![1]!), val(m![2]!));
  if (r(`대분수는 자연수와 (진분수|가분수)로 이루어진 분수입니다\\.`)) return m![1] === "진분수";
  if (r(`${N}:${N}의 전항(?:과 후항)?에만? ${N}[을를] 곱한 ${N}:${N}[은는] ${N}:${N}[과와] 비율이 같습니다\\.`) ||
      r(`${N}:${N}의 전항과 후항에 ${N}[을를] 곱한 ${N}:${N}[은는] ${N}:${N}[과와] 비율이 같습니다\\.`))
    return +m![4]! * +m![7]! === +m![5]! * +m![6]!;
  if (r(`${N}:${N}에서 전항은 ${N}입니다\\.`)) return +m![3]! === +m![1]!;
  if (r(`${N}:${N}의 전항과 후항을 ${N}(?:으로|로) 나누면 ${N}:${N}[이가] 됩니다\\.`))
    return +m![4]! * +m![3]! === +m![1]! && +m![5]! * +m![3]! === +m![2]!;
  if (r(`${N}:${N}의 비율을 분수로 나타내면 ${N}/${N}입니다\\.`))
    return +m![3]! * +m![2]! === +m![4]! * +m![1]!;
  if (r(`전항과 후항에 (0이 아닌 같은 수를 곱하거나 나누어도|같은 수를 더해도) 비율은 같습니다\\.`))
    return m![1]!.startsWith("0");
  if (r(`비례식에서 외항의 곱과 내항의 곱은 (같습니다|다릅니다)\\.`)) return m![1] === "같습니다";
  if (r(`비례식 ${N}:${N}=${N}:${N}에서 외항은 ${N}[과와] ${N}입니다\\.`))
    return +m![5]! === +m![1]! && +m![6]! === +m![4]!;
  if (r(`비례식 ${N}:${N}=${N}:□에서 □는 ${N}입니다\\.`)) return +m![1]! * +m![4]! === +m![2]! * +m![3]!;
  if (r(`비례식 ${N}:${N}=${N}:${N}에서 ${N}×${N}[과와] ${N}×${N}[은는] 같습니다\\.`))
    return +m![5]! * +m![6]! === +m![7]! * +m![8]!;
  if (r(`${N}:${N}=${N}:${N}[은는] 비례식입니다\\.`)) return +m![1]! * +m![4]! === +m![2]! * +m![3]!;
  throw new Error(`못 읽는 문장: ${s}`);
}

const MARKS = ["①", "②", "③", "④", "⑤"];
const SEEDS = Array.from({ length: 60 }, (_, i) => 500 + i * 41);

describe("진술 문형 — 등록", () => {
  it("31 · 32 가 기존 문형 뒤에 붙고 id 가 겹치지 않는다", () => {
    for (const key of Object.keys(STATEMENT_FORMS)) {
      const unit = unitOf(key);
      const ids = listedForms(unit).map((f) => f.id);
      expect(new Set(ids).size, key).toBe(ids.length);
      expect(ids, key).toEqual(expect.arrayContaining(["31", "32"]));
      expect(expectedFormCount(unit), key).toBe(ids.length);
    }
  });
});

describe("진술 문형 — 정답은 문장이 정한다", () => {
  for (const key of Object.keys(STATEMENT_FORMS)) {
    it(`${key} 31 · 옳은(옳지 않은) 것 하나`, () => {
      const unit = unitOf(key);
      const asked = new Set<boolean>();
      for (const seed of SEEDS) {
        const p = generateElementaryForm(unit, seed, "31");
        const { choices } = parseProblemContent(p.content);
        expect(choices, p.content).toHaveLength(5);
        const askTrue = !p.content.includes("옳지 않은 것은");
        asked.add(askTrue);
        const hits = choices.flatMap((c, i) => (judge(c) === askTrue ? [i] : []));
        expect(hits, p.content).toHaveLength(1);
        expect(p.answer).toBe(MARKS[hits[0]!]);
        expect(isChooseAll(p.content)).toBe(false);
      }
      expect(asked.size, "옳은 것 · 옳지 않은 것 둘 다 나온다").toBe(2);
    });

    it(`${key} 32 · 〈보기〉 조합`, () => {
      const unit = unitOf(key);
      const answers = new Set<string>();
      for (const seed of SEEDS) {
        const p = generateElementaryForm(unit, seed, "32");
        const { question, choices } = parseProblemContent(p.content);
        // 〈보기〉 상자로 선다 — ㄱ ㄴ ㄷ 셋이 인용 상자 안에.
        expect(question, p.content).toMatch(/^> <보기(:cols=\d)?>$/m);
        const items = [...question.matchAll(/^> ([ㄱㄴㄷ])\. (.+)$/gm)];
        expect(items.map((x) => x[1]), p.content).toEqual(["ㄱ", "ㄴ", "ㄷ"]);
        const right = items.filter((x) => judge(x[2]!)).map((x) => x[1]).join(", ");
        expect(right.length, p.content).toBeGreaterThan(0);
        expect(choices).toHaveLength(5);
        expect(new Set(choices).size).toBe(5);
        const at = choices.indexOf(right);
        expect(at, `${right} · ${choices.join(" / ")}`).toBeGreaterThanOrEqual(0);
        expect(p.answer).toBe(MARKS[at]);
        answers.add(p.answer);
        // 조합형은 «모두 고르시오»(정답 둘) 관문의 대상이 아니다.
        expect(isChooseAll(p.content)).toBe(false);
      }
      expect(answers.size, "정답 자리가 한쪽에 몰리지 않는다").toBeGreaterThanOrEqual(4);
    });
  }
});

describe("진술 문형 — 적재 경로", () => {
  it("보기를 단 발문은 객관식 그대로 셋(파생하지 않는다)", () => {
    for (const key of Object.keys(STATEMENT_FORMS)) {
      const unit = unitOf(key);
      for (const id of ["31", "32"]) {
        const got = expandFamily(
          (v) => {
            const p = generateElementaryForm(unit, 7000 + v * 1009, id);
            return {
              content: p.content,
              answer: p.answer,
              solution: p.solution,
              familyKey: `elem:${unit.grade}|${unit.section}|${id}`,
              problemType: "개념",
            };
          },
          3,
          { allowShort: true },
        );
        expect(got.shortBy, `${key} ${id}`).toBe(0);
        expect(got.items.map((i) => i.questionType), `${key} ${id}`).toEqual([
          "객관식",
          "객관식",
          "객관식",
        ]);
      }
    }
  });
});
