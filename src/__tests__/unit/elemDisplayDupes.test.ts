/**
 * 초등 지면의 «같은 것 두 번» · «그림이 정답을 보여 줌» · «TeX 가 글자로» — 원장님 2026-10-20
 * («시험지 만들기로 출제해 보니 중복으로 적혀 있거나, 문제 속에 있는데 세로셈이 있는 등»).
 *
 * 참은 발문 · 그림 사양에서 다시 센다. 생성기 헬퍼를 되부르지 않는다.
 * 전수 집계와 근거: `display-survey/report.md`(저장소 밖) · 판정기 `display-survey/scripts/classify.ts`.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
  listedForms,
  supportedTiers,
} from "@/lib/elementary/generate";

const SEEDS = Array.from({ length: 30 }, (_, s) => 20260825 + s * 1009);

function unitOf(grade: string, code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === grade && x.section.startsWith(code),
  );
  expect(u).toBeTruthy();
  return u!;
}

/** 답 `$7.6$` · `$12$` 의 수. */
function answerNumber(answer: string): string {
  const m = /^\$(\d+(?:\.\d+)?)\$$/.exec(answer.trim());
  expect(m, `수 답이 아님: ${answer}`).toBeTruthy();
  return m![1]!;
}

function labelsOf(spec: Record<string, unknown> | null): string[] {
  if (!spec) return [];
  const out: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(spec);
  return out;
}

describe("그림이 정답을 라벨로 달지 않는다", () => {
  it("초4 2-3-6 문형05 리본 이어 붙이기 — 테이프 라벨이 합이 아니다", () => {
    const unit = unitOf("초4", "2-3-6");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      const ans = answerNumber(p.answer);
      for (const label of labelsOf(p.figureSpec))
        expect(label, p.content).not.toContain(ans);
      // 두 길이는 늘 달라 가운데 금이 거짓이 된다
      expect(p.figureSpec?.segments ?? 1).toBe(1);
    }
  });

  it("초5 2-3-2 문형04 이등변삼각형 — 밑변만 적고(2번 변), 같은 두 변은 표지만", () => {
    const unit = unitOf("초5", "2-3-2");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "04");
      if (p.figureSpec?.kind !== "markedShape") continue;
      const base = /밑변이 \$(\d+)\$ cm/.exec(p.content)?.[1];
      expect(base, p.content).toBeTruthy();
      // 라벨 하나면 기본 isoTri 좌표(0 왼쪽 · 1 오른쪽 · 2 밑변)를 탄다 — scripts/figure/elementary.py `_shape_points`
      expect(p.figureSpec.sides, p.content).toEqual([null, null, `${base} cm`]);
      expect(p.figureSpec.equal).toEqual([[0, 1]]);
    }
  });

  it("초4 1-3-6 문형05·06 몫의 자리 숫자 — 세로셈이 몫을 그리지 않는다", () => {
    const unit = unitOf("초4", "1-3-6");
    for (const id of ["05", "06"])
      for (const seed of SEEDS) {
        const p = generateElementaryForm(unit, seed, id);
        const m = /\$(\d+)\\div(\d+)\$/.exec(p.content);
        expect(m, p.content).toBeTruthy();
        const q = String(Number(m![1]) / Number(m![2]));
        expect(labelsOf(p.figureSpec), p.content).not.toContain(q);
      }
  });
});

describe("발문에 이미 있는 식을 식 줄로 또 찍지 않는다", () => {
  it("초3 2-2-3 문형04 «$a$ 에 적어도 … 나누는 수가 $b$ 인 나눗셈» 뒤에 같은 나눗셈 줄이 없다", () => {
    const unit = unitOf("초3", "2-2-3");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "04");
      expect(p.content, p.content).not.toMatch(/나누어떨어지는지 구하시오\.\n\n/);
    }
  });

  it("초4 1-3-3 문형06 «…어림하여 곱하면 얼마인가?» 뒤에 같은 곱셈 줄이 없다", () => {
    const unit = unitOf("초4", "1-3-3");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "06");
      expect(p.content, p.content).not.toMatch(/\n\n\$\d+\\times\d+\$\s*$/);
      expect(p.content).toMatch(/어림하여 곱하면 얼마인가\?$/);
    }
  });
});

/** 발문(보기 줄 뺀)의 수 — 쉼표 · `{,}` 를 걷고, `\\frac` 같은 명령은 지운다. */
function stemNumbers(content: string): Set<string> {
  const stem = content
    .split("\n")
    .filter((line) => !/^\s*[①-⑩]/.test(line))
    .join("\n")
    .replace(/\{,\}/g, "")
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1")
    .replace(/\\[a-zA-Z]+/g, " ");
  return new Set(stem.match(/\d+(?:\.\d+)?/g) ?? []);
}

describe("세로셈 그림이 발문의 식을 한 번 더 그리지 않는다", () => {
  // 두 수가 다 발문에 있는 세로셈 = 글에 이미 있는 식(원장님 «230 × 57 의 곱에서 …» + 230/×57 그림).
  // 어림한 수(초4 1-3-3 문형06 300 × 20)처럼 발문에 없는 식은 원장님이 «판단하지 말고 표시만» — 여기서 막지 않는다.
  const check = (where: string, p: { content: string; figureSpec: Record<string, unknown> | null }) => {
    if (p.figureSpec?.kind !== "columnOp") return;
    const nums = stemNumbers(p.content);
    const both = nums.has(String(p.figureSpec.top)) && nums.has(String(p.figureSpec.bottom));
    expect(both, `${where}: ${p.content} · 그림 ${p.figureSpec.top} ${p.figureSpec.op} ${p.figureSpec.bottom}`).toBe(false);
  };
  it("문형 전부(적재기 경로)", () => {
    for (const unit of elementaryUnits())
      for (const form of listedForms(unit))
        for (const seed of SEEDS.slice(0, 10))
          check(`${unit.grade} ${unit.section} ${form.id}`, generateElementaryForm(unit, seed, form.id));
  });
  it("난이도 경로 — 지정 안 함 · 지원하는 난이도 전부(학생 SRS 가 부르는 길)", () => {
    for (const unit of elementaryUnits())
      for (const tier of [undefined, ...supportedTiers(unit)])
        for (const seed of SEEDS.slice(0, 10))
          check(`${unit.grade} ${unit.section} ${tier ?? "-"}`, generateElementaryProblem(unit, seed, tier));
  });
  it("시간의 덧셈 세로셈(timeAdd)도 발문의 두 시간을 다시 그리지 않는다", () => {
    for (const unit of elementaryUnits())
      for (const tier of [undefined, ...supportedTiers(unit)])
        for (const seed of SEEDS.slice(0, 10)) {
          const p = generateElementaryProblem(unit, seed, tier);
          expect(p.figureSpec?.kind, `${unit.section}: ${p.content}`).not.toBe("timeAdd");
        }
  });
});

describe("TeX · 낱말이 지면에서 어긋나지 않는다", () => {
  it("모든 초등 문형에 `$$` 가 없다 — 짝이 엇갈린 달러가 글자를 수식 밖으로 밀어낸다", () => {
    for (const unit of elementaryUnits())
      for (const form of listedForms(unit))
        for (const seed of SEEDS.slice(0, 5)) {
          const p = generateElementaryForm(unit, seed, form.id);
          expect(p.content, `${unit.grade} ${unit.section} ${form.id}`).not.toContain("$$");
        }
  });

  it("초3 1-5-4 문형05 «□분 s초 = t초» 의 t 가 수식이다", () => {
    const unit = unitOf("초3", "1-5-4");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "05");
      expect(p.content).toMatch(/\$=\$ \$\d+\$초$/);
    }
  });

  it("초3 1-1-3 문형07 — 받아내림이 없는 씨앗에는 «받아내림하여»를 쓰지 않는다", () => {
    const unit = unitOf("초3", "1-1-3");
    for (const seed of SEEDS) {
      const p = generateElementaryForm(unit, seed, "07");
      const m = /^\$(\d+)\$ 의 일의 자리 숫자에서 \$(\d+)\$ 의/.exec(p.content);
      expect(m, p.content).toBeTruthy();
      const borrow = Number(m![1]) % 10 < Number(m![2]) % 10;
      expect(p.content.includes("받아내림하여"), p.content).toBe(borrow);
    }
  });

  it("초3 1-5-5 시간의 덧셈 — «두 시간 $3$시간» 처럼 «두 시간»이 수 앞에 붙지 않는다", () => {
    const unit = unitOf("초3", "1-5-5");
    for (const form of listedForms(unit))
      for (const seed of SEEDS) {
        const p = generateElementaryForm(unit, seed, form.id);
        expect(p.content).not.toMatch(/두 시간 \$/);
      }
  });
});
