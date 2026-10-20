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
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

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
      expect(p.content).toMatch(/어림하여 곱하면 얼마입니까\?$/);
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
      const m = /^\$(\d+)\$의 일의 자리 숫자에서 \$(\d+)\$의/.exec(p.content);
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

/* ── 교차 검수 3회차(2026-10-20) — 세 모델이 제품 렌더 지면에서 짚은 초등 그림 · 문장 ── */

describe("3차 교차 검수 — 그림", () => {
  it("초4 1-4-3 문형09 «색칠한 칸은 몇 개» — 뒤집은 결과를 그리지 않는다(처음 도형만)", async () => {
    const unit = unitOf("초4", "1-4-3");
    for (const seed of SEEDS.slice(0, 8)) {
      const p = generateElementaryForm(unit, seed, "09");
      expect(p.figureSpec?.kind, p.content).toBe("rotateFlip");
      expect(p.figureSpec?.showAfter, p.content).toBe(false);
      const r = await renderFigureSpec(p.figureSpec as never);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      // 격자 하나 — 화살표(뒤집은 결과로 가는 길)가 없다
      expect(r.svg).not.toMatch(/<polygon[^>]*points="[^"]*"[^>]*fill="#111111"/);
      const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(r.svg)!;
      expect(Number(vb[1])).toBe(Number(vb[2]));
    }
  });

  it("시계 — 긴바늘 · 짧은바늘이 숫자 고리(r − 14) 안에서 멈춘다", async () => {
    const r = await renderFigureSpec({ version: "elem-1", kind: "clocks", items: [{ hour: 2, minute: 0 }] } as never);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const face = /<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)" fill="#ffffff"/.exec(r.svg)!;
    const [cx, cy, rad] = [Number(face[1]), Number(face[2]), Number(face[3])];
    const hands = [...r.svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"[^>]*stroke-linecap="round"/g)];
    expect(hands.length).toBe(2);
    for (const h of hands) {
      expect(Number(h[1])).toBeCloseTo(cx);
      expect(Number(h[2])).toBeCloseTo(cy);
      const len = Math.hypot(Number(h[3]) - cx, Number(h[4]) - cy);
      // 숫자(8px) 중심이 r − 14 — 바늘 끝은 그 글자 상자(반 높이 4px) 안쪽
      expect(len).toBeLessThanOrEqual(rad - 14 - 4);
    }
  });

  it("라벨 없는 도형(«정사각형의 대칭축») — 위아래 빈 여백이 라벨 자리(40px)가 아니다 · 라벨이 있으면 그대로", async () => {
    const bare = await renderFigureSpec({ version: "elem-1", kind: "markedShape", shape: "square" } as never);
    const labelled = await renderFigureSpec({ version: "elem-1", kind: "markedShape", shape: "square", sides: ["5 cm"] } as never);
    expect(bare.ok && labelled.ok).toBe(true);
    if (!bare.ok || !labelled.ok) return;
    const h = (svg: string) => Number(/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(svg)![1]);
    const w = (svg: string) => Number(/viewBox="0 0 ([\d.]+)/.exec(svg)![1]);
    expect(h(bare.svg)).toBeLessThanOrEqual(104 + 2 * 12);
    expect(w(bare.svg)).toBe(w(labelled.svg)); // 너비(크기 등급)는 같다
    expect(h(labelled.svg)).toBeGreaterThanOrEqual(104 + 2 * 40);
  });

  it("초5 2-3-2 합동 — 삼각형 세 변 그림이 납작하지 않다(가장 긴 변 ≤ 나머지 합 − 3)", () => {
    const unit = unitOf("초5", "2-3-2");
    const forms = listedForms(unit).map((f) => f.id);
    let seen = 0;
    for (const id of forms)
      for (const seed of SEEDS) {
        const p = generateElementaryForm(unit, seed, id);
        const sides = (p.figureSpec?.kind === "markedShape" ? (p.figureSpec.sides as (string | null)[] | undefined) : undefined)
          ?.map((s) => (s === null ? NaN : parseFloat(s)));
        if (!sides || sides.length !== 3 || sides.some((v) => Number.isNaN(v))) continue;
        seen++;
        const [a, b, c] = [...sides].sort((x, y) => x - y) as [number, number, number];
        expect(c, `${id} @${seed}: ${sides.join(" · ")}`).toBeLessThanOrEqual(a + b - 3);
      }
    expect(seen).toBeGreaterThan(0);
  });
});

describe("3차 교차 검수 — 문장", () => {
  it("초3 1-1 «$a$ 에서 $b$ 만큼 더한» 이 없다(더할 때는 «에»)", () => {
    for (const code of ["1-1-1", "1-1-2", "1-1-3", "1-1-4"]) {
      const unit = unitOf("초3", code);
      for (const tier of supportedTiers(unit))
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          expect(p.content, `${code} ${tier} @${seed}`).not.toMatch(/에서 \$\d+\$만큼 더한/);
        }
    }
  });

  it("초6 1-3-2 문형06 — 참거짓 문장 앞에 어떤 나눗셈인지 적는다", () => {
    const unit = unitOf("초6", "1-3-2");
    for (const seed of SEEDS.slice(0, 10)) {
      const p = generateElementaryForm(unit, seed, "06");
      expect(p.content, p.content).toMatch(/\$[\d.]+\\div\d+\$에서 /);
    }
  });

  it("초4 1-4-3 응용 «좌우로 m번, 위아래로 n번» — «처음 도형을 어떻게 움직인» 꼴로 묻지 않는다(답이 «처음 도형과 같다» 일 수 있다)", () => {
    const unit = unitOf("초4", "1-4-3");
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unit, seed, "응용");
      expect(p.content).not.toContain("처음 도형을 어떻게 움직인");
    }
  });

  it("방과후 → 방과 후 · «가장 많이 읽은 날의 쪽수와 평균의 차» · 보리차를 물뿌리개에 담지 않는다", () => {
    const g4 = unitOf("초4", "1-5-2");
    for (const seed of SEEDS) expect(generateElementaryForm(g4, seed, "06").content).not.toContain("방과후");
    const g5 = unitOf("초5", "2-6-1");
    for (const seed of SEEDS) {
      const c = generateElementaryForm(g5, seed, "09").content;
      if (c.includes("가장 많이 읽은 날")) expect(c).toContain("가장 많이 읽은 날의 쪽수와 평균의 차");
    }
    const g3 = unitOf("초3", "2-5-2");
    for (const tier of supportedTiers(g3))
      for (const seed of SEEDS) expect(generateElementaryProblem(g3, seed, tier).content).not.toContain("물뿌리개");
  });
});

/* ── 교차 검수 4회차(2026-10-21) ── */

describe("4차 교차 검수 — 초등 그림 · 문장", () => {
  const allOf = (grade: string, code: string) => {
    const unit = unitOf(grade, code);
    const out = [];
    for (const seed of SEEDS) {
      for (const f of listedForms(unit)) out.push(generateElementaryForm(unit, seed, f.id));
      for (const tier of supportedTiers(unit)) out.push(generateElementaryProblem(unit, seed, tier));
    }
    return out;
  };

  it("초4 1-4-3 «뒤집은 도형의 색칠한 칸» — 발문이 칸 수를 미리 말하지 않는다", () => {
    for (const p of allOf("초4", "1-4-3"))
      if (p.content.includes("뒤집은 도형의 색칠한 칸")) expect(p.content).not.toMatch(/색칠한 칸이 \$\d+\$개인/);
  });

  it("초6 2-3-1 «놓이지 않은 칸» — 겨냥도와 위에서 본 모양을 함께 그려 답을 보이지 않는다(5차에서 위에서 본 그림 하나로 바꿈)", () => {
    for (const p of allOf("초6", "2-3-1"))
      if (p.content.includes("놓이지 않은 칸")) expect(p.figureSpec?.views, p.content).not.toEqual(["iso", "top"]);
  });

  it("초4 2-2-1 정삼각형 둘레 — 쓰지 않는 이름표 «가» 를 달지 않는다", () => {
    for (const p of allOf("초4", "2-2-1"))
      if (/정삼각형의 세 변의 길이의 합/.test(p.content)) expect(labelsOf(p.figureSpec), p.content).not.toContain("가");
  });

  it("초3 2-3-2 «반지름을 n개 그었습니다» — 반지름 하나만 그린 그림을 붙이지 않는다", () => {
    for (const p of allOf("초3", "2-3-2"))
      if (/반지름을 \$\d+\$개 그었습니다/.test(p.content)) expect(p.figureSpec, p.content).toBeNull();
  });

  it("초3 1-6-1 «한 조각은 전체의 얼마» — 한 조각만 칠한다", () => {
    for (const p of allOf("초3", "1-6-1"))
      if (p.content.includes("한 조각은 전체의 얼마") && p.figureSpec && "filled" in p.figureSpec) expect(p.figureSpec.filled, p.content).toBe(1);
  });

  it("초5 한 줄 기호 보기 «㉠ … ㉡ …» — 기호와 식이 줄바꿈으로 갈리지 않게 붙인다", () => {
    for (const [g, c] of [["초5", "1-1-1"], ["초5", "1-2-2"], ["초5", "1-4-4"]] as const)
      for (const p of allOf(g, c))
        if (/㉠.*㉡/.test(p.content)) {
          expect(p.content, p.content).not.toMatch(/㉠ \$|㉡ \$|㉠ \d/);
          expect(p.content, p.content).toMatch(/㉠ /);
        }
  });

  it("초4 2-5 꺾은선 — «…의 값이 $14$℃인 때» · «…의 값이 $4$월의 값보다 큰» 꼴이 없다", () => {
    for (const c of ["2-5-1", "2-5-2"])
      for (const p of allOf("초4", c)) {
        expect(p.content, p.content).not.toMatch(/의 값이 \$\d+\$/);
        expect(p.content, p.content).not.toMatch(/의 값보다 \S+ 때는 모두/);
      }
  });

  it("초3 2-3-2 소재 — 반지름 2~9 cm 인 동전 · 단추가 없다 · 초3 1-2-2 직각 정의에 엉뚱한 끝 문장이 없다", () => {
    for (const p of allOf("초3", "2-3-2")) expect(p.content).not.toMatch(/^(?:동전|단추)의 모양이 원/);
    for (const p of allOf("초3", "1-2-2")) expect(p.content).not.toContain("그런 각을");
  });
});

/* ── 교차 검수 5회차(2026-10-21) ── */

describe("5차 교차 검수 — 초등 그림 · 문장", () => {
  const allOf = (grade: string, code: string) => {
    const unit = unitOf(grade, code);
    const out = [];
    for (const seed of SEEDS) {
      for (const f of listedForms(unit)) out.push(generateElementaryForm(unit, seed, f.id));
      for (const tier of supportedTiers(unit)) out.push(generateElementaryProblem(unit, seed, tier));
    }
    return out;
  };
  const DIR: Record<string, [number, number]> = { 오른쪽: [1, 0], 왼쪽: [-1, 0], 위쪽: [0, -1], 아래쪽: [0, 1] };

  it("초4 1-4-1 점의 이동 — 발문의 움직임이 모눈 밖으로 나가지 않는다", () => {
    let seen = 0;
    for (const p of allOf("초4", "1-4-1")) {
      const s = p.figureSpec as { kind?: string; cols?: number; rows?: number; dots?: { c: number; r: number }[] } | null;
      if (s?.kind !== "pointGrid" || s.dots?.length !== 1 || !/옮겼습니다/.test(p.content)) continue;
      let [c, r] = [s.dots[0]!.c, s.dots[0]!.r];
      let dir: [number, number] = [0, 0];
      for (const m of p.content.matchAll(/(?:(오른쪽|왼쪽|위쪽|아래쪽)으로 |또 )\$(\d+)\$칸/g)) {
        if (m[1]) dir = DIR[m[1]]!;
        c += dir[0] * Number(m[2]);
        r += dir[1] * Number(m[2]);
        expect(c >= 0 && c <= s.cols! && r >= 0 && r <= s.rows!, `${p.content} → (${c}, ${r}) / ${s.cols}×${s.rows}`).toBe(true);
      }
      seen++;
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("그림그래프 «작은 그림은 몇 개» — 큰 그림 하나의 값을 함께 준다", () => {
    for (const p of allOf("초3", "2-6-2"))
      if (p.content.includes("작은 그림은 몇 개 그려야")) expect(p.content).toMatch(/큰 그림 한 개가/);
  });

  it("조사 — 분수 · 비례식은 끝 수를 읽는 소리로(«$\\frac{2}{3}$는» · «$21:6$은»), 밀리리터 «와»", () => {
    for (const p of allOf("초3", "2-4-4")) {
      const m = /\\frac\{(\d+)\}\{\d+\}\$ ([은는]) 가분수/.exec(p.content);
      if (m) expect(m[2], p.content).toBe("2459".includes(m[1]!.at(-1)!) ? "는" : "은");
    }
    for (const p of allOf("초6", "2-4-3")) {
      const m = /=(\d+):(\d+)\$ ([은는]) 비례식/.exec(p.content);
      if (m) expect(m[3], p.content).toBe("2459".includes(m[2]!.at(-1)!) ? "는" : "은");
    }
    for (const p of allOf("초3", "2-5-2")) expect(p.content).not.toMatch(/mathrm\{mL\}\$과 /);
  });

  it("초6 2-3-1 «놓이지 않은 칸» — 위에서 본 그림 하나로 묻는다 · 초6 2-5-3 «원 밖 정사각형» 에 원만 그린 그림이 없다", () => {
    for (const p of allOf("초6", "2-3-1"))
      if (p.content.includes("놓이지 않은 칸")) expect(p.figureSpec?.views, p.content).toEqual(["top"]);
    for (const p of allOf("초6", "2-5-3"))
      if (/원 밖에 꼭 맞게 정사각형을 그렸습니다\. 이 정사각형의 한 변/.test(p.content)) expect(p.figureSpec, p.content).toBeNull();
  });

  it("초3 1-6-1 «전체를 똑같이 나누었습니다» — 떨어진 삼각형 줄로 그리지 않는다 · 초4 1-1-5 조 · 억 비교는 물은 꼴로 답한다", () => {
    for (const p of allOf("초3", "1-6-1"))
      if (p.content.startsWith("그림처럼 전체를 똑같이")) expect(p.figureSpec?.kind, p.content).not.toBe("triRow");
    for (const p of allOf("초4", "1-1-5"))
      if (/조와 \$\d+\$억 중 더 큰 수/.test(p.content)) expect(p.answer, p.content).toMatch(/[조억]$/);
  });
});
