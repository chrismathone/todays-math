/**
 * 초3 `2-1 곱셈` **심화중·심화상** — D-113 파일럿 (2026-08-30).
 *
 * ## 이 파일이 재는 축 — 「답이 후보 **하나**냐 후보 **전체**냐」
 *
 * 난이도는 지면에 없다. 「어렵다」를 글자로는 못 읽는다(`probe-elem-tier-ladder.ts`
 * 머리말과 같은 한계). 그래서 여기서는 **말투가 아니라 «답이 무엇인가»** 를 축으로 잡는다.
 *
 *   · **심화중** — 후보를 열거해 **그중 하나**를 고른다. 정답은 값 하나이고,
 *     **바로 옆 후보는 조건을 어긴다**(그래서 열거를 건너뛸 수 없다).
 *   · **심화상** — 후보 **전체**가 답이다. 값을 둘 이상 나열하거나, 후보를 **센다**.
 *
 * 이 축을 고른 까닭: 「모두·가장 큰·몇 가지」 같은 **탐색 표지 낱말**로 재면 그건 손
 * 목록이라 샌다(2026-08-18 「목록을 손으로 쓰면 세는 쪽과 고치는 쪽이 같이 눈이 먼다」).
 * 반면 «정답이 후보 집합의 한 원소인가, 집합 그 자체인가» 는 **발문에서 다시 세워서**
 * 확인할 수 있다 — 아래 판정은 전부 발문의 수만 읽어 후보를 **처음부터 다시 열거**한다.
 * 생성기의 계산을 되부르지 않으므로 동어반복이 아니다.
 *
 * ## ⚠️ 이 축이 **못 보는 것**
 *
 * 1. **「그 후보 열거가 초등학생에게 실제로 어려운가」** 는 못 잰다. 후보가 아홉이든
 *    셋이든 이 시험에는 같아 보인다. 그건 원장님이 `/dev/tier-bench/g3` 에서 보실 몫이다.
 * 2. **심화하와의 높이 차**는 안 잰다. 심화하는 「역산 한 번」이고 여기는 「열거」인데,
 *    둘 중 무엇이 위인지는 **사람이 정하는 잣대**(D-113)이지 측정이 아니다.
 *    이 파일이 잠그는 것은 「심화중과 심화상이 **서로** 다른 일을 시킨다」까지다.
 * 3. **읽을 수 없는 발문은 «통과»가 아니라 «빨강»이다.** 아래 파서가 문항을 못 읽으면
 *    그 자리에서 실패한다 — 0 이 «깨끗»인지 «못 셈»인지 갈리지 않으면 안 되기 때문이다.
 *    그래서 발문 문법을 넓히면 파서도 같이 넓혀야 한다(그게 이 시험의 이빨이다).
 * 4. **방향 낱말(「가장 큰」·「가장 작은」)은 손 열쇠다.** 대신 «둘 중 정확히 하나만
 *    맞아야 한다» 로 걸어 두었다 — 목록에 없는 말투를 쓰면 조용히 통과하는 대신 **빨개진다.**
 *    (2-1-4 심화하 시험이 이미 쓰는 그 수법이다.)
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const MUL21 = ["2-1-1", "2-1-2", "2-1-3", "2-1-4"] as const;
const SEEDS = Array.from({ length: 24 }, (_, i) => 20260830 + i * 7919);

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초3" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

/** 답에 실린 수를 **나온 순서대로**. `$5,\ 6,\ 7$` 도 `$12$` 도 같은 자로 읽는다. */
function answerValues(answer: string): number[] {
  expect(answer, `정답이 KaTeX 한 덩어리가 아니다: ${answer}`).toMatch(
    /^\$[^$]*\$$/,
  );
  return [...answer.matchAll(/\d+/g)].map((m) => Number(m[0]));
}

// ── 발문 파서 — **생성기를 안 부른다.** 지면의 글자만 읽는다 ─────────────────

/** 조건 — `lo < 곱 < hi`. 한쪽만 있으면 그쪽만 있다. */
type Cond = { lo?: number; hi?: number };

/**
 * 발문이 내건 곱의 범위. **꼴이 하나도 안 맞거나 둘 이상 맞으면 null** —
 * 「못 읽었다」를 통과로 만들지 않는다.
 */
function condOf(content: string): Cond | null {
  const both = [...content.matchAll(/\$(\d+)\$ 보다 크고 \$(\d+)\$ 보다 작/g)];
  if (both.length === 1)
    return { lo: Number(both[0]![1]), hi: Number(both[0]![2]) };
  if (both.length > 1) return null;
  const less = [...content.matchAll(/\$(\d+)\$ 보다 작/g)];
  const more = [...content.matchAll(/\$(\d+)\$ 보다 크/g)];
  if (less.length === 1 && more.length === 0)
    return { hi: Number(less[0]![1]) };
  if (more.length === 1 && less.length === 0)
    return { lo: Number(more[0]![1]) };
  return null;
}

const holds = (p: number, c: Cond) =>
  (c.lo === undefined || p > c.lo) && (c.hi === undefined || p < c.hi);

/** 무엇을 물었나. **정확히 하나만** 맞아야 한다 — 아니면 null(=빨강). */
type Ask = "가장큰" | "가장작은" | "모두" | "몇가지";
function askOf(content: string): Ask | null {
  const hits: Ask[] = [];
  if (/가장 큰|가장 클/.test(content)) hits.push("가장큰");
  if (/가장 작은|가장 작을/.test(content)) hits.push("가장작은");
  if (/모두 구하시오|모두 쓰시오/.test(content)) hits.push("모두");
  if (/모두 몇 가지/.test(content)) hits.push("몇가지");
  return hits.length === 1 ? hits[0]! : null;
}

/**
 * ㉠ **마스크 틀** — `$…\square…\times…$` 하나. 가려진 쪽에 숫자를 넣어 가며 견준다.
 * 후보 domain 은 발문이 「$L$ 부터 $H$ 까지」로 밝히면 그것, 아니면 **맨 앞자리**라
 * $1$~$9$ 다(두 자리 수의 십의 자리·한 자리 수 그 자체 — 어느 쪽도 $0$ 이 못 온다).
 */
type MaskTask = { values: { d: number; p: number }[] };

function maskTaskOf(content: string): MaskTask | null {
  const spans = [...content.matchAll(/\$([^$]*\\square[^$]*)\$/g)]
    .map((m) => m[1]!)
    .filter((s) => s.includes("\\times"));
  if (spans.length !== 1) return null;
  const [left, right, ...rest] = spans[0]!.split("\\times");
  if (rest.length > 0 || left === undefined || right === undefined) return null;
  const masked = left.includes("\\square") ? left : right;
  const other = left.includes("\\square") ? right : left;
  if (right.includes("\\square") && left.includes("\\square")) return null;
  if ((masked.match(/\\square/g) ?? []).length !== 1) return null;
  if (!/^\d+$/.test(other)) return null;
  const said = [...content.matchAll(/\$(\d+)\$ 부터 \$(\d+)\$ 까지/g)];
  if (said.length > 1) return null;
  const lo = said.length === 1 ? Number(said[0]![1]) : 1;
  const hi = said.length === 1 ? Number(said[0]![2]) : 9;
  const values: { d: number; p: number }[] = [];
  for (let d = lo; d <= hi; d += 1) {
    const v = Number(masked.replace("\\square", String(d)));
    if (!Number.isFinite(v)) return null;
    values.push({ d, p: v * Number(other) });
  }
  return values.length >= 3 ? { values } : null;
}

/**
 * ㉡ **수 카드 틀** — 카드로 수를 만들어 같은 수를 곱한다. 만들 수 있는 수는
 * 「세 자리 수」면 세 장 전부의 순서, 「두 자리 수」면 세 장 중 두 장의 순서다.
 */
function cardTaskOf(content: string): MaskTask | null {
  if (!content.includes("수 카드")) return null;
  const cardsM = content.match(/수 카드 ((?:\$\d+\$,\s*)+\$\d+\$)/);
  const timesM = [...content.matchAll(/\$(\d+)\$ 배/g)];
  if (!cardsM || timesM.length !== 1) return null;
  const cards = [...cardsM[1]!.matchAll(/\d+/g)].map((m) => Number(m[0]));
  if (cards.length !== 3 || new Set(cards).size !== 3) return null;
  const three = /세 자리 수/.test(content);
  const two = /두 자리 수/.test(content);
  if (three === two) return null; // 둘 다이거나 둘 다 아니면 못 읽은 것이다
  const mult = Number(timesM[0]![1]);
  const made: number[] = [];
  for (let i = 0; i < 3; i += 1)
    for (let j = 0; j < 3; j += 1) {
      if (i === j) continue;
      if (three) {
        const k = [0, 1, 2].find((x) => x !== i && x !== j)!;
        made.push(cards[i]! * 100 + cards[j]! * 10 + cards[k]!);
      } else {
        made.push(cards[i]! * 10 + cards[j]!);
      }
    }
  return {
    values: made.map((v, idx) => ({ d: idx, p: v * mult })),
  };
}

/** 두 틀 중 **정확히 하나**여야 한다. */
function taskOf(
  content: string,
): { kind: "마스크" | "카드"; task: MaskTask } | null {
  const mask = maskTaskOf(content);
  const card = cardTaskOf(content);
  if (mask && card) return null;
  if (mask) return { kind: "마스크", task: mask };
  if (card) return { kind: "카드", task: card };
  return null;
}

describe("[초3 D-113] 2-1 곱셈 — 심화중·심화상", () => {
  it("네 소단원이 심화중·심화상을 낸다", () => {
    for (const code of MUL21) {
      const tiers = supportedTiers(unitOf(code));
      expect(tiers, `${code}`).toContain("심화중");
      expect(tiers, `${code}`).toContain("심화상");
    }
  });

  it("같은 씨앗·같은 갈래면 같은 문항이다", () => {
    for (const code of MUL21) {
      for (const tier of ["심화중", "심화상"] as const) {
        const a = generateElementaryProblem(unitOf(code), 424242, tier);
        const b = generateElementaryProblem(unitOf(code), 424242, tier);
        expect(a.content, `${code} ${tier}`).toBe(b.content);
        expect(a.answer, `${code} ${tier}`).toBe(b.answer);
        expect(a.solution, `${code} ${tier}`).toBe(b.solution);
      }
    }
  });

  /**
   * 🔴 **이 시험의 알맹이 ⑴ — 심화중의 답은 후보 «하나»이고 옆 후보는 조건을 어긴다.**
   *
   * 「옆 후보가 어긴다」를 같이 요구하는 것이 핵심이다. 그것이 없으면 조건이 아무나
   * 다 통과시키는 헐렁한 문항이어도 초록이다 — 그러면 열거할 까닭이 사라진다.
   */
  it("심화중 — 답은 후보 하나이고, 바로 옆 후보는 조건을 어긴다", () => {
    let judged = 0;
    for (const code of MUL21) {
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unitOf(code), seed, "심화중");
        const where = `${code} 심화중 seed ${seed}: ${p.content.replace(/\n/g, " ")}`;
        const t = taskOf(p.content);
        const cond = condOf(p.content);
        const ask = askOf(p.content);
        expect(t, `${where} — 후보 틀을 못 읽었다`).toBeTruthy();
        expect(cond, `${where} — 조건을 못 읽었다`).toBeTruthy();
        expect(ask, `${where} — 무엇을 묻는지 못 읽었다`).toBeTruthy();
        expect(t!.kind, `${where} — 심화중은 마스크 틀이다`).toBe("마스크");
        expect(["가장큰", "가장작은"], `${where}`).toContain(ask!);

        const vals = t!.task.values;
        const ok = vals.filter((v) => holds(v.p, cond!));
        const bad = vals.filter((v) => !holds(v.p, cond!));
        expect(
          ok.length,
          `${where} — 조건에 맞는 후보가 둘 미만`,
        ).toBeGreaterThanOrEqual(2);
        expect(
          bad.length,
          `${where} — 조건을 어기는 후보가 없다`,
        ).toBeGreaterThanOrEqual(1);

        const want =
          ask === "가장큰"
            ? Math.max(...ok.map((v) => v.d))
            : Math.min(...ok.map((v) => v.d));
        const answers = answerValues(p.answer);
        expect(answers, `${where} — 심화중의 답은 값 하나다`).toHaveLength(1);
        expect(answers[0], `${where}`).toBe(want);

        // 옆 후보가 실제로 어긴다 — 열거를 건너뛸 수 없다는 증거.
        const next = vals.find(
          (v) => v.d === want + (ask === "가장큰" ? 1 : -1),
        );
        expect(next, `${where} — 답 바로 옆에 후보가 없다`).toBeTruthy();
        expect(
          holds(next!.p, cond!),
          `${where} — 옆 후보도 조건에 맞는다`,
        ).toBe(false);
        judged += 1;
      }
    }
    expect(judged, "한 문항도 안 읽었다").toBe(MUL21.length * SEEDS.length);
  });

  /**
   * 🔴 **이 시험의 알맹이 ⑵ — 심화상의 답은 후보 «전체»에서 나온다.**
   * 나열이면 그 집합 그대로, 개수면 그 집합의 크기다. 둘 다 후보를 다 열어야 나온다.
   */
  it("심화상 — 답은 후보 전체(나열)이거나 후보의 개수다", () => {
    let judged = 0;
    let 나열 = 0;
    let 개수 = 0;
    for (const code of MUL21) {
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unitOf(code), seed, "심화상");
        const where = `${code} 심화상 seed ${seed}: ${p.content.replace(/\n/g, " ")}`;
        const t = taskOf(p.content);
        const cond = condOf(p.content);
        const ask = askOf(p.content);
        expect(t, `${where} — 후보 틀을 못 읽었다`).toBeTruthy();
        expect(cond, `${where} — 조건을 못 읽었다`).toBeTruthy();
        expect(ask, `${where} — 무엇을 묻는지 못 읽었다`).toBeTruthy();
        expect(["모두", "몇가지"], `${where}`).toContain(ask!);

        const vals = t!.task.values;
        const ok = vals.filter((v) => holds(v.p, cond!));
        const bad = vals.filter((v) => !holds(v.p, cond!));
        expect(
          ok.length,
          `${where} — 조건에 맞는 후보가 둘 미만`,
        ).toBeGreaterThanOrEqual(2);
        expect(
          bad.length,
          `${where} — 조건을 어기는 후보가 없다`,
        ).toBeGreaterThanOrEqual(1);

        const answers = answerValues(p.answer);
        if (ask === "모두") {
          expect(answers, `${where} — 나열이 후보 전체와 다르다`).toEqual(
            ok.map((v) => v.d),
          );
          나열 += 1;
        } else {
          expect(answers, `${where} — 개수는 값 하나다`).toHaveLength(1);
          expect(answers[0], `${where} — 개수가 후보 수와 다르다`).toBe(
            ok.length,
          );
          개수 += 1;
        }
        judged += 1;
      }
    }
    expect(judged, "한 문항도 안 읽었다").toBe(MUL21.length * SEEDS.length);
    // 두 꼴이 **둘 다** 살아 있어야 한다 — 한쪽이 0 이면 그 갈래는 한 문형의 되풀이다.
    expect(나열, "「모두 구하시오」 꼴이 하나도 안 나왔다").toBeGreaterThan(0);
    expect(개수, "「모두 몇 가지」 꼴이 하나도 안 나왔다").toBeGreaterThan(0);
  });

  /** 심화중의 답이 발문에 그대로 보이면 열거할 까닭이 없다. */
  it("심화중 — 답이 발문에 그대로 서 있지 않다", () => {
    for (const code of MUL21) {
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unitOf(code), seed, "심화중");
        const ans = answerValues(p.answer)[0]!;
        // 조건 문턱·곱하는 수와 겹칠 수 있으므로 **답만 홀로 선 자리**를 본다.
        expect(
          p.content.includes(`$${ans}$ 입니다`),
          `${code} 심화중 seed ${seed}: 답이 발문에 적혀 있다`,
        ).toBe(false);
      }
    }
  });

  /**
   * 해설이 **후보를 실제로 견준다** — 계산식이 둘 이상이고, 그 값이 다 맞는다.
   * (D-72 `makeDeep` 이 걸음 수를 이미 막지만, 여기서는 **값**을 다시 센다.)
   */
  it("심화중·심화상 해설의 곱이 전부 맞고 두 개 이상이다", () => {
    for (const code of MUL21) {
      for (const tier of ["심화중", "심화상"] as const) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unitOf(code), seed, tier);
          const muls = [
            ...p.solution.matchAll(/\$(\d+)\\times(\d+)=(\d+)\$/g),
          ].map((m) => [Number(m[1]), Number(m[2]), Number(m[3])] as const);
          expect(
            muls.length,
            `${code} ${tier} seed ${seed}: 견준 곱이 둘 미만 — ${p.solution}`,
          ).toBeGreaterThanOrEqual(2);
          for (const [a, b, c] of muls)
            expect(a * b, `${code} ${tier} seed ${seed}: ${a}×${b}`).toBe(c);
        }
      }
    }
  });

  /** 씨앗을 바꾸면 갈래마다 답이 갈린다 — 상수답 금지. */
  it("두 갈래 모두 씨앗에 따라 답이 갈린다", () => {
    for (const code of MUL21) {
      for (const tier of ["심화중", "심화상"] as const) {
        const seen = new Set<string>();
        for (let seed = 0; seed < 40; seed += 1)
          seen.add(generateElementaryProblem(unitOf(code), seed, tier).answer);
        expect(seen.size, `${code} ${tier} 상수답`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
