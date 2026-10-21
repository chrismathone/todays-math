/**
 * 초4 2-5 「꺾은선그래프」 4단 확대 (D-72) — 소단원 셋. 초4 에 남은 **유일한 비(非)도형** 대단원.
 *
 * **참은 발문과 그림에서 온다.** 그림 스펙(`figureSpec`)에 실린 값으로 답을 **독립 재도출**
 * 한다 — 생성기를 되부르지 않는다. 자료형이라 답은 대개 그림에 있고, 그래서 «그림과 발문이
 * 같은 것을 말하는가»가 이 트랜치의 알맹이다.
 *
 * 이 트랜치가 지켜야 하는 것 —
 *  ㉠ **2-5-3 발문은 그래프를 가리키지 않는다.** 그림이 `table` 이라, 「그래프에서」라고 쓰면
 *     **없는 그림을 가리키는** 문항이 된다. 전수로 잠근다(리드 조건 ⑴).
 *  ㉡ **답이 늘 자연수다.** 구성이 100% 를 보장하므로 문턱이 아니라 **전량**으로 잰다 —
 *     「대부분 자연수」면 절반이 무너져도 안 운다(g5 실측 2026-08-23: 구성 100% 를
 *     「200 중 100 초과」로 재던 가드가 119/200 으로 그냥 통과했다).
 *  ㉢ **분모를 같이 센다.** 100% 는 **분모가 0일 때도 100%** 다. 「전량 통과」를 쓸 때는
 *     몇 개를 봤는지를 함께 세고, 0이면 빨개지게 한다.
 *
 * ⚠️ **`chartPair` 는 이 트랜치에 없다.** 짝의 폭 등급이 파이썬 가드와 어긋나 있어
 * (초4 짝 53장 중 17장이 `mid` 로 떨어져 눈금 글자 11.45~12.30px < 본문 12.5px)
 * 지금 넣으면 같은 결함을 하나 더 만든다. 그림 세션이 고치면 그때 따로 얹는다.
 */
import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { ElemTier } from "@/lib/elementary/difficulty";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { G4_LINE_THEMES } from "@/lib/elementary/g4";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

const CODES = ["2-5-1", "2-5-2", "2-5-3"] as const;
const SEEDS = Array.from({ length: 16 }, (_, i) => 20260823 + i * 7919);
const WIDE = Array.from({ length: 200 }, (_, i) => 31337 + i * 104729);
const SWEEP = Array.from({ length: 1200 }, (_, i) => 20260823 + i * 7919);

/** 그림 엔진이 이 컴퓨터에 있나 — 없으면 «실제 렌더» 축은 건너뛴다(그래서 다른 축을 둔다). */
const hasFigureEngine =
  existsSync(path.join(process.cwd(), "vendor", "figure-engine")) ||
  existsSync(process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기");

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(code),
  );
  expect(u, `초4 ${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

function gen(code: string, seed: number, tier?: ElemTier) {
  return generateElementaryProblem(unitOf(code), seed, tier);
}

/* ─────────────────────── 도구 (제품을 안 쓴다) ─────────────────────── */

type Spec = {
  kind?: string;
  values?: { label: string; value: number }[];
  rows?: string[][];
  headers?: string[];
  yStep?: number;
};

/**
 * 그림에 실린 값. 꺾은선은 `values`, 표는 **각 행의 둘째 칸**이다.
 *
 * ⚠️ 2026-08-24 에 표가 **세로로** 섰다(D-70 폭 가드). 그전에는 `rows[0]` 한 줄에
 * 값이 다 들어 있었다 — 그 시절 코드를 그대로 두면 값이 **빈 배열**이 되고,
 * 「구간이 하나로 선다」류 검사가 «0개»를 받아 조용히 다른 이유로 빨개진다.
 */
function figureNums(spec: Spec | null): number[] {
  if (spec?.kind === "lineChart")
    return (spec.values ?? []).map((v) => v.value);
  if (spec?.kind === "table") return (spec.rows ?? []).map((r) => Number(r[1]));
  return [];
}

/** 그림에 실린 때 이름. */
function figureLabels(spec: Spec | null): string[] {
  if (spec?.kind === "lineChart")
    return (spec.values ?? []).map((v) => v.label);
  // 표가 세로로 서므로 때 이름은 **각 행의 첫 칸**이다(전에는 머리줄이었다).
  if (spec?.kind === "table") return (spec.rows ?? []).map((r) => String(r[0]));
  return [];
}

/** 이웃한 두 값의 차. */
function gapsOf(nums: readonly number[]): number[] {
  return nums.slice(1).map((v, i) => v - nums[i]!);
}

const spec = (p: { figureSpec: unknown }) => p.figureSpec as Spec | null;

/* ─────────────────────────────── 시험 ─────────────────────────────── */

describe("초4 2-5 꺾은선그래프 — 4단 등록", () => {
  it.each(CODES)("%s 는 네 갈래가 다 있다", (code) => {
    expectCoreTiers(unitOf(code), code);
  });
});

describe("그림과 발문이 같은 것을 말한다", () => {
  it("2-5-1·2-5-2 는 꺾은선, 2-5-3 은 표다", () => {
    const want: Record<string, string> = {
      "2-5-1": "lineChart",
      "2-5-2": "lineChart",
      "2-5-3": "table",
    };
    let seen = 0;
    let tierCount = 0;
    for (const code of CODES) {
      const tiers = tiersOf(unitOf(code));
      tierCount += tiers.length;
      for (const tier of tiers) {
        for (const seed of WIDE) {
          seen += 1;
          expect(
            spec(gen(code, seed, tier))?.kind,
            `${code} «${tier}» s${seed}`,
          ).toBe(want[code]);
        }
      }
    }
    expect(seen).toBe(tierCount * WIDE.length);
  });

  /*
   * 리드 조건 ⑴ — 그림이 표인데 발문이 그래프를 가리키면 **없는 그림을 가리키는** 문항이다
   * (오늘 초6 2-5-3 에서 잡은 그 부류). 「꺾은선그래프로 나타낼 때」처럼 **앞으로 그릴 것**을
   * 말하는 것은 괜찮고, 「그래프에서 …를 읽으시오」처럼 **지금 보라**는 것이 안 된다.
   */
  it("2-5-3 발문은 «지금 있는 그래프»를 한 번도 안 가리킨다", () => {
    const 지시어 = [
      "그래프에서",
      "그래프를 보고",
      "그래프입니다",
      "그림에서",
      "그림과 같이",
      "그림을 보고",
    ];
    const bad: string[] = [];
    let seen = 0;
    for (const tier of [undefined, ...tiersOf(unitOf("2-5-3"))]) {
      for (const seed of SWEEP) {
        const p = gen("2-5-3", seed, tier);
        if (spec(p)?.kind !== "table") continue; // 표준은 꺾은선이라 이 잠금 밖이다
        seen += 1;
        for (const word of 지시어) {
          if (p.content.includes(word)) {
            bad.push(`«${tier ?? "표준"}» s${seed}: ${word} — ${p.content}`);
          }
        }
      }
    }
    expect(
      seen,
      "표를 그림으로 쓰는 문항이 하나도 없다 — 분모가 0이면 통과가 공허하다",
    ).toBeGreaterThan(1000);
    expect(bad.slice(0, 3)).toEqual([]);
  });

  it("2-5-3 발문은 표를 가리킨다", () => {
    const tiers = tiersOf(unitOf("2-5-3"));
    let seen = 0;
    for (const tier of tiers) {
      for (const seed of WIDE) {
        const p = gen("2-5-3", seed, tier);
        seen += 1;
        expect(p.content, `«${tier}» s${seed}`).toContain("표");
      }
    }
    expect(seen).toBe(tiers.length * WIDE.length);
  });
});

describe("값 — 그림에 실린 수로 다시 세운다", () => {
  it("2-5-1 연산: 발문이 지목한 두 때 중 작은 쪽의 값이 답이다", () => {
    let seen = 0;
    for (const seed of SWEEP) {
      const p = gen("2-5-1", seed, "연산");
      const s = spec(p);
      const nums = figureNums(s);
      const labels = figureLabels(s);
      // 발문이 지목한 두 때를 그림의 이름으로 되찾는다 — 순서를 가정하지 않는다.
      const named = labels.filter((l) =>
        p.content.includes(l.replace(/^(\d+)/, "$$$1$$")),
      );
      expect(named, `s${seed}: ${p.content}`).toHaveLength(2);
      const vs = named.map((l) => nums[labels.indexOf(l)]!);
      // 두 값이 같으면 「더 작은 때」가 둘이 되어 답이 하나로 안 선다.
      expect(vs[0], `s${seed}: ${vs}`).not.toBe(vs[1]);
      expect(p.answer).toContain(`$${Math.min(...vs)}$`);
      seen += 1;
    }
    expect(seen).toBe(SWEEP.length);
  });

  it("2-5-1 응용: 두 값의 한가운데가 늘 자연수다", () => {
    let seen = 0;
    for (const seed of SWEEP) {
      const p = gen("2-5-1", seed, "응용");
      const nums = figureNums(spec(p));
      const m = /\((\d+)\+(\d+)\)/.exec(p.solution);
      expect(m, `s${seed}: 해설에서 두 값을 못 읽음`).toBeTruthy();
      const [lo, hi] = [Number(m![1]), Number(m![2])];
      // 구성이 «이웃 합이 짝수»를 100% 보장한다 — 문턱이 아니라 전량으로 잰다.
      expect((lo + hi) % 2, `s${seed}: ${lo}+${hi}`).toBe(0);
      expect(nums).toContain(lo);
      expect(nums).toContain(hi);
      expect(p.answer).toBe(
        `$${(lo + hi) / 2}$${p.answer.replace(/^\$\d+\$/, "")}`,
      );
      seen += 1;
    }
    expect(seen).toBe(SWEEP.length);
  });

  it("2-5-1 심화하: 지목한 때부터 센 늘어난 양의 합이 그림과 맞다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-5-1", seed, "심화하");
      const s = spec(p);
      const nums = figureNums(s);
      const labels = figureLabels(s);
      const from = labels.findIndex((l) =>
        p.content.includes(`${l.replace(/^(\d+)/, "$$$1$$")}부터`),
      );
      expect(
        from,
        `s${seed}: 시작 때를 못 읽음 — ${p.content}`,
      ).toBeGreaterThanOrEqual(0);
      const want = gapsOf(nums.slice(from))
        .filter((d) => d > 0)
        .reduce((a, d) => a + d, 0);
      expect(p.answer, `s${seed}`).toContain(`$${want}$`);
    }
  });

  it("2-5-2 연산: 답의 때가 그림에서 그 값을 가진 때다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-5-2", seed, "연산");
      const s = spec(p);
      const asked = Number(/(?:값이|[이가]) \$(\d+)\$/.exec(p.content)![1]);
      const at = figureNums(s).indexOf(asked);
      expect(at, `s${seed}: 그림에 없는 값을 물었다`).toBeGreaterThanOrEqual(0);
      expect(p.answer).toContain(
        figureLabels(s)[at]!.replace(/^(\d+)/, "$$$1$$"),
      );
    }
  });

  it("2-5-2 심화하: 문턱을 처음 넘은 뒤에 반드시 내려가는 구간이 있다", () => {
    let seen = 0;
    for (const seed of SWEEP) {
      const p = gen("2-5-2", seed, "심화하");
      const nums = figureNums(spec(p));
      const bar = nums[1]!;
      // 「처음으로」가 뜻을 가지려면 ㉠ 첫 값이 문턱 아래이고 ㉡ 그 뒤에 오르내림이 있어야 한다.
      expect(nums[0]!, `s${seed}: ${nums}`).toBeLessThan(bar);
      expect(
        gapsOf(nums).some((d) => d < 0),
        `s${seed}: ${nums}`,
      ).toBe(true);
      expect(p.answer).toContain(`$${nums[nums.length - 1]! - bar}$`);
      seen += 1;
    }
    expect(seen).toBe(SWEEP.length);
  });

  it("2-5-3 기본·응용: 눈금 셈이 늘 자연수다 (구성 보장 → 전량)", () => {
    let seen = 0;
    for (const seed of SWEEP) {
      const basic = gen("2-5-3", seed, "기본");
      const bn = figureNums(spec(basic));
      const step = Number(/한 칸이 \$(\d+)\$/.exec(basic.content)![1]);
      // 모든 값이 걸음의 배수라 어느 값을 물어도 칸 수가 자연수다 — 구성 보장이니 전량으로.
      for (const v of bn) expect(v % step, `기본 s${seed}: ${v}`).toBe(0);
      const asked = Number(/값은 \$(\d+)\$/.exec(basic.solution)![1]);
      expect(basic.answer).toBe(`$${asked / step}$칸`);

      const apply = gen("2-5-3", seed, "응용");
      const an = figureNums(spec(apply));
      const start = Number(/눈금을 \$(\d+)\$/.exec(apply.content)![1]);
      const d = Number(/한 칸은 \$(\d+)\$/.exec(apply.content)![1]);
      const target = Number(/^.*?은 \$(\d+)\$/.exec(apply.solution)![1]);
      // 물결선은 아래를 접으려고 넣는다 — 시작값이 $0$ 이면 접은 것이 없다.
      expect(start, `응용 s${seed}`).toBeGreaterThan(0);
      expect(start, `응용 s${seed}`).toBeLessThan(Math.min(...an));
      expect((target - start) % d, `응용 s${seed}`).toBe(0);
      expect(apply.answer).toBe(`$${(target - start) / d}$째`);
      seen += 1;
    }
    expect(seen).toBe(SWEEP.length);
  });

  it("2-5-3 심화하: 가장 가파른 구간이 하나로 서고, 견줄 구간과 다르다", () => {
    let seen = 0;
    for (const seed of SWEEP) {
      const p = gen("2-5-3", seed, "심화하");
      const gaps = gapsOf(figureNums(spec(p)));
      const most = Math.max(...gaps);
      // 최대가 둘이면 「가장 가파른 구간」이 둘이 되어 답이 하나로 안 선다 — 구성 보장이니 전량.
      expect(
        gaps.filter((g) => g === most),
        `s${seed}: ${gaps}`,
      ).toHaveLength(1);
      // 답이 $0$ 이면 「몇 더 큰가」가 뜻을 잃는다 — 견줄 구간은 가장 가파른 것이 아니어야 한다.
      const answer = Number(/\$(\d+)\$/.exec(p.answer)![1]);
      expect(answer, `s${seed}: ${gaps}`).toBeGreaterThan(0);
      expect(gaps).toContain(most - answer);
      seen += 1;
    }
    expect(seen).toBe(SWEEP.length);
  });
});

/*
 * 눈으로 찾아 **고친** 자리를 그 자리에서 잠근다.
 *
 * ⚠️ 처음 손 뗄 때 이 둘을 고쳐 놓고 **잠그지 않았다.** 리드가 수리를 되돌리는 변이로
 * 확인했다 — 「$12$시과」가 씨앗 400×5갈래에서 77건 되살아나는데 시험 28/28 이 초록이었다.
 * 「지금 깨끗하다」(스크래치 스캐너)와 「다시 더러워지면 운다」(커밋되는 가드)는 다른 말이다.
 */
describe("눈으로 찾아 고친 자리 — 그 자리에서 잠근다", () => {
  /** 한글 음절에 받침이 있는가. 유니코드 조합에서 바로 센다(손 목록을 안 쓴다). */
  function hasBatchim(ch: string): boolean {
    return (ch.charCodeAt(0) - 0xac00) % 28 !== 0;
  }

  /** 본문에 쓰이는 꼴. 그림 라벨 `9시` 는 본문에서 `$9$시` 다(R1 — 수는 KaTeX 안). */
  const bodyForm = (label: string) => label.replace(/^(\d+)/, "$$$1$$");

  const JOSA: [string, string][] = [
    ["을", "를"],
    ["이", "가"],
    ["과", "와"],
    ["은", "는"],
  ];

  /**
   * **그림 라벨 뒤**의 조사가 라벨의 받침과 맞는가.
   *
   * 낱말 뒤 조사를 본문에서 통째로 훑는 판은 **못 쓴다** — 「있**는**」·「사**과**」·「초**과**」
   * 처럼 낱말 끝 음절이 조사와 같은 글자라 안 갈린다(네 학년 실측 179·81·67·97가지, 대부분 거짓).
   * 그래서 **그것이 낱말인 줄 아는 자리**에서만 묻는다 — 라벨은 그림이 알려 준다.
   */
  function labelJosaFaults(text: string, labels: readonly string[]): string[] {
    const bad: string[] = [];
    for (const raw of labels) {
      if (raw.length === 0) continue;
      const tail = raw[raw.length - 1]!;
      if (tail < "가" || tail > "힣") continue;
      const body = bodyForm(raw);
      for (const [withB, withoutB] of JOSA) {
        const wrong = hasBatchim(tail) ? withoutB : withB;
        const at = text.indexOf(`${body}${wrong}`);
        if (at < 0) continue;
        // 뒤에 한글이 이어지면 조사가 아니다 — 「$5$주**이고**」의 「이」는 이다(계사)의 어간이다.
        // (이 예외를 안 두면 멀쩡한 표준 문장이 걸린다. 거짓 경보는 가드를 끈다.)
        const next = text[at + `${body}${wrong}`.length] ?? "";
        if (next >= "가" && next <= "힣") continue;
        bad.push(`${body}${wrong}`);
      }
    }
    return bad;
  }

  it("초4 전 소단원 — 그림 라벨 뒤 조사가 맞다 (표준 포함)", () => {
    const bad: string[] = [];
    let seen = 0;
    for (const u of elementaryUnits().filter((x) => x.grade === "초4")) {
      // ⚠️ 여기서는 tiersOf() 를 안 쓴다 — tiersOf 는 갈래가 0개면 스스로 빨개지는데,
      // 이 스윕은 **아직 4단으로 안 넓힌 초4 소단원**도 도는 것이 정상이다(그런 소단원은
      // 표준만 시험). supportedTiers(u) 를 그대로 써서 «이 단원이 실제로 낸 갈래»만 돈다.
      const tiers = [undefined, ...supportedTiers(u)];
      for (const tier of tiers) {
        // 씨앗을 넓게 쓴다 — 라벨이 붙는 문항만 세므로 16개로는 분모가 304밖에 안 된다.
        for (const seed of WIDE) {
          const p = generateElementaryProblem(u, seed, tier);
          const labels = figureLabels(spec(p));
          if (labels.length === 0) continue;
          seen += 1;
          // **정답도 본다.** 처음엔 발문·해설만 봤는데, 되돌리는 변이가 **초록**이었다 —
          // 표준 2-5-2 의 「$12$시과」가 사는 자리가 바로 **정답**이었기 때문이다.
          // 「어디를 훑는가」가 「무엇을 재는가」보다 먼저 눈이 먼다.
          for (const f of [
            ...labelJosaFaults(p.content, labels),
            ...labelJosaFaults(p.answer, labels),
            ...labelJosaFaults(p.solution, labels),
          ]) {
            bad.push(`${u.section} «${tier ?? "표준"}» s${seed}: ${f}`);
          }
        }
      }
    }
    // 분모가 0이면 「0건」이 공허하다 — 라벨이 있는 문항을 실제로 봤는지 먼저 못 박는다.
    // 실측 3,800 자리(씨앗 200 × 라벨 붙는 갈래). 크게 줄면 훑는 자리가 사라진 것이다.
    expect(seen).toBeGreaterThan(3000);
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("자체 눈금 — 라벨 조사 검사가 실제로 잡고, 맞는 것은 통과시킨다", () => {
    // 「$12$시」는 받침이 없으므로 «와». 「$3$월」은 받침이 있으므로 «과».
    expect(labelJosaFaults("$12$시과 $1$시 사이", ["12시"])).toEqual([
      "$12$시과",
    ]);
    expect(labelJosaFaults("$12$시와 $1$시 사이", ["12시"])).toEqual([]);
    expect(labelJosaFaults("$3$월과 $4$월 사이", ["3월"])).toEqual([]);
    expect(labelJosaFaults("$3$월와 $4$월 사이", ["3월"])).toEqual(["$3$월와"]);
    // 계사 「이다」의 어간은 조사가 아니다 — 「$5$주이고」는 맞는 말이다.
    expect(labelJosaFaults("때는 $5$주이고 값은", ["5주"])).toEqual([]);
    // 그래도 진짜 조사는 잡는다(뒤가 한글이 아니다).
    expect(labelJosaFaults("$5$주이 가장 크다", ["5주"])).toEqual(["$5$주이"]);
    // 라벨이 없으면 판정하지 않는다(통과가 아니라 «안 잼»이다).
    expect(labelJosaFaults("$12$시과", [])).toEqual([]);
  });

  it("2-5-3 값이 소재가 정한 띠 안에 있다", () => {
    const bands = new Map(
      G4_LINE_THEMES.map((t) => [
        t.topic,
        // 첫 값은 `base × step` 띠에서 뽑고, 걸음 넷의 합은 늘 $10$ 이다.
        [t.base[0] * t.step, t.base[1] * t.step + 10 * t.step] as const,
      ]),
    );
    const bad: string[] = [];
    let seen = 0;
    for (const tier of tiersOf(unitOf("2-5-3"))) {
      for (const seed of SWEEP) {
        const p = gen("2-5-3", seed, tier);
        const topic = [...bands.keys()].find((t) => p.content.includes(t));
        expect(topic, `s${seed}: 소재를 못 읽음 — ${p.content}`).toBeTruthy();
        const [lo, hi] = bands.get(topic!)!;
        for (const v of figureNums(spec(p))) {
          seen += 1;
          if (v < lo || v > hi) {
            bad.push(`«${tier}» s${seed}: ${topic} ${v} ∉ [${lo}, ${hi}]`);
          }
        }
      }
    }
    expect(seen).toBeGreaterThan(10000);
    expect(bad.slice(0, 5)).toEqual([]);
  });
});

describe("겹침 — 표준과, 그리고 갈래끼리", () => {
  const skeleton = (c: string) =>
    c
      .replace(/\$[^$]*\$/g, "⟨수⟩")
      .replace(/\s+/g, " ")
      .trim();

  it("표준과 발문도 골격도 안 겹친다 (R5)", () => {
    const mine = new Map<string, string>();
    const skel = new Map<string, string>();
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of WIDE) {
          const p = gen(code, seed, tier);
          mine.set(p.content, `${code} «${tier}»`);
          skel.set(skeleton(p.content), `${code} «${tier}»`);
        }
      }
    }
    const hit: string[] = [];
    for (const code of CODES) {
      for (const seed of WIDE) {
        const p = gen(code, seed);
        if (mine.has(p.content))
          hit.push(`표준 ${code} = ${mine.get(p.content)}`);
        const near = skel.get(skeleton(p.content));
        if (near) hit.push(`표준 ${code} ≈ ${near}: ${p.content}`);
      }
    }
    expect(hit.slice(0, 3)).toEqual([]);
  });

  it("서로 다른 소단원의 갈래끼리 골격이 안 겹친다", () => {
    const seen = new Map<string, string>();
    const hit: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const sk = skeleton(gen(code, seed, tier).content);
          const prev = seen.get(sk);
          if (prev === undefined) seen.set(sk, `${code} «${tier}»`);
          else if (!prev.startsWith(code))
            hit.push(`${prev} ≈ ${code} «${tier}»`);
        }
      }
    }
    expect(hit.slice(0, 3)).toEqual([]);
  });
});

describe("변형 — 씨앗이 바뀌면 발문이 바뀐다", () => {
  it("갈래마다 씨앗 16개에서 발문이 8가지 이상", () => {
    const thin: string[] = [];
    for (const code of CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        const seen = new Set(SEEDS.map((s) => gen(code, s, tier).content));
        if (seen.size < 8) thin.push(`${code} «${tier}» ${seen.size}가지`);
      }
    }
    expect(thin).toEqual([]);
  });
});

describe("자체 눈금 — 이 파일의 도구가 살아 있는가", () => {
  it("꺾은선과 표에서 값을 읽는다", () => {
    expect(
      figureNums({
        kind: "lineChart",
        values: [
          { label: "3월", value: 12 },
          { label: "4월", value: 15 },
        ],
      }),
    ).toEqual([12, 15]);
    expect(
      figureNums({
        kind: "table",
        headers: ["구분", "3월"],
        rows: [["키(cm)", "12"]],
      }),
    ).toEqual([12]);
    // 모르는 kind 를 조용히 빈 배열로 넘기면 위 검사들이 통째로 헛돈다 — 그 자리를 못 박는다.
    expect(
      figureNums({ kind: "barChart", values: [{ label: "가", value: 1 }] }),
    ).toEqual([]);
    expect(figureNums(null)).toEqual([]);
  });

  it("이웃한 차를 부호까지 낸다", () => {
    expect(gapsOf([10, 14, 11, 20])).toEqual([4, -3, 9]);
  });
});

/* ─────────────────── 단위 뒤 조사 (2026-08-23, g3 이 알려 준 실물 결함) ─────────────────── */

describe("[초4] 단위 뒤 조사", () => {
  /**
   * **단위 뒤 조사는 «글자»가 아니라 «소리»가 정한다.** `cm`→센티미터(받침 없음)라 `를`,
   * `kg`→킬로그램(받침 ㅁ)이라 `을`. `℃`→도라 `로`, `명`→`으로`.
   *
   * ⚠️ **실제로 지면에 나가고 있었다** — 「세로 눈금 한 칸은 몇 **mm을** 나타내는가?」·
   * 「$23$**명로** 그보다」. 소재마다 단위가 달라지는 자리에 조사를 **박아** 둔 탓이다.
   * 소재 하나만 맞고 나머지는 다 틀렸다. g3(`claude-ac`)이 전 학년을 훑어 알려 줬다.
   *
   * ⚠️ **「이」는 조사일 수도 계사일 수도 있다.** 「$6$℃**이고**」·「…℃**입니다**」의 「이」는
   * **이다의 어간**이라 받침과 무관하게 옳다. 뒤에 한글이 이어지면 세지 않는다 —
   * 그 구분을 안 하면 멀쩡한 문장 수십 개가 걸려 **거짓 경보가 가드를 끈다**(g3 도 같은 곳에서 멈췄다).
   */
  const SPOKEN_FINAL: Record<string, boolean> = {
    "℃": false, // 도
    cm: false, // 센티미터
    mm: false, // 밀리미터
    m: false, // 미터
    kg: true, // 킬로그램
    g: true, // 그램
    권: true,
    명: true,
    원: true,
  };
  const PAIRS: [withEnd: string, withoutEnd: string][] = [
    ["을", "를"],
    ["은", "는"],
    ["이", "가"],
    ["으로", "로"],
  ];

  it("**초4 전 갈래에서 단위 뒤 조사가 맞다** (발문·정답·해설)", () => {
    const bad: string[] = [];
    let looked = 0;
    for (const u of elementaryUnits()) {
      if (u.grade !== "초4") continue;
      // ⚠️ 여기서는 tiersOf() 를 안 쓴다 — tiersOf 는 갈래가 0개면 스스로 빨개지는데,
      // 이 스윕은 **아직 4단으로 안 넓힌 초4 소단원**도 도는 것이 정상이다(그런 소단원은
      // 표준만 시험). supportedTiers(u) 를 그대로 써서 «이 단원이 실제로 낸 갈래»만 돈다.
      const tiers = [undefined, ...supportedTiers(u)];
      for (const tier of tiers) {
        for (const seed of WIDE) {
          const p = generateElementaryProblem(u, seed, tier);
          for (const text of [p.content, p.answer, p.solution]) {
            for (const [unit, hasFinal] of Object.entries(SPOKEN_FINAL)) {
              for (const [withEnd, withoutEnd] of PAIRS) {
                const wrong = hasFinal ? withoutEnd : withEnd;
                const at = text.indexOf(`${unit}${wrong}`);
                if (at < 0) continue;
                // 계사(「℃이고」·「명이었다」)는 조사가 아니다 — 뒤에 한글이 이어지면 뺀다.
                const next = text[at + unit.length + wrong.length] ?? "";
                if (next >= "가" && next <= "힣") continue;
                bad.push(
                  `${u.section.split(" ")[0]} «${tier ?? "표준"}» s${seed}: ${unit}${wrong}`,
                );
              }
            }
          }
          looked += 1;
        }
      }
    }
    expect(
      looked,
      "본 문항이 0이면 이 검사는 아무것도 안 지킨다",
    ).toBeGreaterThan(0);
    expect([...new Set(bad)].slice(0, 6)).toEqual([]);
  }, 30_000);

  it("**눈금 — 이 검사가 틀린 조사를 실제로 잡는다**", () => {
    // 위 검사가 늘 초록이면 「깨끗해서」인지 「못 세서」인지 안 갈린다.
    const wrongOnes = ["몇 mm을 나타내는가?", "$23$명로 그보다"];
    for (const text of wrongOnes) {
      const hit = Object.entries(SPOKEN_FINAL).some(([unit, hasFinal]) =>
        PAIRS.some(([withEnd, withoutEnd]) => {
          const wrong = hasFinal ? withoutEnd : withEnd;
          const at = text.indexOf(`${unit}${wrong}`);
          if (at < 0) return false;
          const next = text[at + unit.length + wrong.length] ?? "";
          return !(next >= "가" && next <= "힣");
        }),
      );
      expect(hit, `못 잡는다: ${text}`).toBe(true);
    }
    // 음성 대조 — 계사와 옳은 조사는 안 잡혀야 한다.
    for (const text of ["$6$℃이고 모두", "몇 cm를 나타내는가?", "$23$명으로"]) {
      const hit = Object.entries(SPOKEN_FINAL).some(([unit, hasFinal]) =>
        PAIRS.some(([withEnd, withoutEnd]) => {
          const wrong = hasFinal ? withoutEnd : withEnd;
          const at = text.indexOf(`${unit}${wrong}`);
          if (at < 0) return false;
          const next = text[at + unit.length + wrong.length] ?? "";
          return !(next >= "가" && next <= "힣");
        }),
      );
      expect(hit, `거짓 경보: ${text}`).toBe(false);
    }
  });
});

/* ────────── 표가 지면 폭에 **실제로** 들어가는가 (2026-08-24) ──────────
 *
 * main 병합이 열 폭 가드(D-70)를 들여오자 초4 표 **192건**이 던졌다. 회귀가 아니라
 * **원래 잘리고 있던 것이 드러난 것**이다 — 옛 엔진은 균등 폭이라 「하루 동안 내린
 * 비의 양(mm)」($165$단위)을 $44.8$ 칸에 넣고 **조용히 잘랐다**(글자 왼쪽 끝 $-11.8$,
 * 한글 다섯 자가 사라졌다). 에러도 안 나고 지면에서 티도 안 났다.
 *
 * ⚠️ **시험이 없어서가 아니라 «축»이 없어서 조용했다.** 2-5-3 은 이 파일에 시험이
 * 여럿 있었는데 전부 **발문·값**을 봤다. 「그 스펙이 실제로 그려지는가」를 아무도
 * 안 물었다. 그래서 축을 둘로 세운다 —
 *
 *   ㉮ **엔진 없이도 도는 것** — 스펙이 세로로 서 있는가(열 둘, 행이 항목 수).
 *      `skipIf` 는 엔진이 없으면 **조용히 건너뛴다**. 그러면 이 결함이 또 침묵한다.
 *   ㉯ **엔진이 있을 때** — 정말 그려지고, 글자가 `viewBox` 안에 있는가.
 */
describe("[초4 표] 지면 폭 — 스펙 모양 (엔진 없이도 돈다)", () => {
  const TABLE_CODES = ["1-5-2", "2-5-3"] as const;

  it("**표가 세로로 서 있다** — 열은 둘, 행은 항목 수", () => {
    let looked = 0;
    for (const code of TABLE_CODES) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of WIDE) {
          const spec = gen(code, seed, tier).figureSpec as
            | { kind?: string; headers?: unknown[]; rows?: unknown[][] }
            | undefined;
          if (spec?.kind !== "table") continue;
          // 가로로 누우면 첫 열에 긴 이름이 들어가 지면을 넘는다 — 그 모양을 막는다.
          expect(
            spec.headers,
            `${code} ${tier} 씨앗 ${seed} 열이 둘이 아니다`,
          ).toHaveLength(2);
          expect(
            spec.rows!.length,
            `${code} ${tier} 씨앗 ${seed} 항목이 행으로 안 섰다`,
          ).toBeGreaterThanOrEqual(4);
          for (const row of spec.rows!) {
            expect(
              row,
              `${code} ${tier} 씨앗 ${seed} 행이 두 칸이어야`,
            ).toHaveLength(2);
          }
          looked += 1;
        }
      }
    }
    // 분모 — 표가 한 건도 안 나왔으면 위의 전량 통과는 아무것도 안 지킨다.
    expect(looked, "표 스펙을 한 건도 못 봤다").toBeGreaterThan(0);
  });

  it("**표 이름이 짧은 쪽을 쓴다** — 긴 소재 둘", () => {
    // 발문은 긴 이름을 그대로 쓰고(문장이 상하지 않게), 표 칸만 짧은 이름을 쓴다.
    let looked = 0;
    let shortSeen = 0;
    for (const tier of tiersOf(unitOf("2-5-3"))) {
      for (const seed of WIDE) {
        const p = gen("2-5-3", seed, tier);
        const spec = p.figureSpec as
          { kind?: string; headers?: string[] } | undefined;
        if (spec?.kind !== "table") continue;
        looked += 1;
        const head = String(spec.headers![1]);
        expect(head, `씨앗 ${seed} 긴 이름이 표에 들어왔다`).not.toContain(
          "하루 동안",
        );
        expect(head, `씨앗 ${seed} 긴 이름이 표에 들어왔다`).not.toContain(
          "박물관에 온",
        );
        if (head.startsWith("비의 양") || head.startsWith("관람객 수")) {
          shortSeen += 1;
          // 그 소재의 **발문**에는 긴 이름이 그대로 남아 있어야 한다.
          expect(
            /하루 동안 내린 비의 양|박물관에 온 관람객 수/.test(p.content),
            `씨앗 ${seed} 발문 문장까지 줄었다`,
          ).toBe(true);
        }
      }
    }
    expect(looked, "표 스펙을 한 건도 못 봤다").toBeGreaterThan(0);
    expect(
      shortSeen,
      "짧은 이름을 쓰는 소재가 한 번도 안 나왔다",
    ).toBeGreaterThan(0);
  });
});

describe.skipIf(!hasFigureEngine)("[초4 표] 지면 폭 — 실제 렌더", () => {
  /**
   * ⚠️ **이 블록은 엔진이 없으면 조용히 건너뛴다.** 그래서 위의 «스펙 모양» 축을
   * 따로 두었다 — 건너뛰어도 세로로 선 것은 잠긴다. 여기서만 잴 수 있는 것은
   * 「글자가 정말 지면 안에 있는가」이고, 그것이 옛 결함의 알맹이였다.
   */
  it("**표가 그려지고 글자가 지면 안에 있다**", async () => {
    const seen = new Set<string>();
    let rendered = 0;
    for (const code of ["1-5-2", "2-5-3"] as const) {
      for (const tier of tiersOf(unitOf(code))) {
        for (const seed of SEEDS) {
          const spec = gen(code, seed, tier).figureSpec;
          if ((spec as { kind?: string } | undefined)?.kind !== "table")
            continue;
          const key = JSON.stringify(spec);
          if (seen.has(key)) continue;
          seen.add(key);
          const r = await renderFigureSpec(spec as Record<string, unknown>);
          expect(r.ok, `${code} ${tier} 씨앗 ${seed} 렌더 실패`).toBe(true);
          if (!r.ok) continue;
          const vb = /viewBox="([^"]+)"/
            .exec(r.svg)?.[1]
            ?.split(/\s+/)
            .map(Number);
          expect(vb, "viewBox 를 못 읽음").toBeTruthy();
          const width = vb![2]!;
          const xs = [...r.svg.matchAll(/<text x="(-?[\d.]+)"/g)].map((m) =>
            Number(m[1]),
          );
          expect(xs.length, `${code} 글자가 없다`).toBeGreaterThan(0);
          // 옛 엔진은 왼쪽 끝이 $-11.8$ 까지 넘쳐 한글 다섯 자를 잘랐다.
          expect(
            Math.min(...xs),
            `${code} ${tier} 씨앗 ${seed} 왼쪽으로 넘침`,
          ).toBeGreaterThanOrEqual(0);
          expect(
            Math.max(...xs),
            `${code} ${tier} 씨앗 ${seed} 오른쪽으로 넘침`,
          ).toBeLessThanOrEqual(width);
          rendered += 1;
        }
      }
    }
    expect(
      rendered,
      "표를 한 장도 안 그렸다 — 이 검사는 아무것도 안 지킨다",
    ).toBeGreaterThan(0);
  }, 120_000);
});
