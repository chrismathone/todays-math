/**
 * 초4 **셋째 물결** — `1-5 막대그래프` · `1-6 규칙 찾기` · `2-4 사각형` 의
 * `심화중`·`심화상` (D-113 · D-115, 2026-08-31).
 *
 * 값·표기·규모·겹침은 각 대단원의 기존 시험이 `tiersOf(unit)` 로 돌기 때문에 **새 갈래도
 * 저절로 덮인다**(D-113 ⑺). 여기 두 벌로 적지 않는다. 이 파일이 맡는 것은 그 시험들이
 * 구조적으로 못 보는 하나다 —
 *
 *     「되짚기 사슬에 **굳지 않는 마디**가 있는가, 그리고 무엇이 그것을 굳히는가」
 *
 * 물결 2 와 같은 세 물음을 소단원마다 **발문에서 다시 만들어** 묻는다:
 *
 * ```
 * ⑴ 성질을 걸기 **전**에 후보가 여럿인가        ← 마디가 실제로 열려 있다
 * ⑵ 성질을 걸면 **정확히 하나**인가             ← 그 성질이 굳힌다
 * ⑶ 성질을 **뒤집으면 다른 답**이 나오는가       ← 음성 대조(그 줄이 일을 한다)
 * ```
 *
 * ## 🔴 이 파일이 **못 보는 것**
 *
 * ㉠ **후보 무리를 만드는 규칙은 내가 적은 것이다.** 학생이 밟을 무리와 같은지는 사람이 본다.
 * ㉡ **반증 ⑥ 은 «배선»만 본다** — 생성기가 같은 규칙으로 미리 거르므로 절반이 동어반복이다.
 *    그래서 검출기의 «예»를 같은 회차에 보인다. 그리고 **답이 낱말인 갈래**
 *    (`1-6-2 심화상`「일곱째」·`2-4-7 심화중`「직사각형, …」)는 `readRat` 이 못 읽어
 *    그 축 **밖**이다 — 그 0 은 «깨끗»이 아니라 «못 셈»이다.
 *    🔴 그리고 **재는 축 자체가 좁다** — `forwardReachable` 의 허용 꼴이 전부 곱을 물어
 *    **나눗셈·덧뺄셈 한 걸음은 구조적으로 «아니오»를 못 낸다**(적대 검토 §6). 그래서
 *    이 파일의 ⑥ 은 「0건(÷·± 못 셈)」이고, 그 둘은 **사람이 손으로 대야 한다** —
 *    2026-08-31 에 그렇게 대어 `2-4-3 심화중`(뺄셈 한 걸음)을 잡았다.
 * ㉢ **높이는 못 잰다** — 여섯을 나란히 놓고 사람이 본다(`dump-elem-tiers`).
 * ㉣ **지름길은 못 본다**(D-115 ⑽②). `1-6-1 심화중`은 「$A$ 를 $d$ 로 나눈 나머지」로
 *    가로지를 수 있다. 잣대의 참은 **해설이 밟는 길**이므로 갈래는 그대로 두되, 이
 *    사실을 여기 적어 둔다. ⚠️ 다만 **지름길이 100% 면 그것은 사각지대가 아니라 결함**
 *    이다 — 2026-08-31 적대 검토가 그 선으로 `1-5-2 중`(100%)·`1-5-2 상`(98.3%)을
 *    거뒀다. 이 파일이 그 축을 못 재므로 **밭을 세울 때 사람이 전수로 세야 한다**.
 */
import { describe, expect, it } from "vitest";

import {
  forwardReachable,
  pageNumbers,
  readRat,
} from "@/lib/elementary/forwardReach";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

import {
  BACKSOLVE_MARK,
  LOWER_TIERS,
} from "../../../scripts/qa/census-elem-backsolve-marks";
import { expectCoreTiers } from "../helpers/elemTiers";

const SEEDS = Array.from({ length: 16 }, (_, i) => 20260901 + i * 6421);

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원을 못 찾음`).toBeTruthy();
  return u!;
}

const gen = (code: string, seed: number, tier: string) =>
  generateElementaryProblem(unitOf(code), seed, tier as never);

/** 첫 캡처를 수로. 못 찾으면 그 자리에서 죽어야 한다(조용히 넘어가면 안 된다). */
function grab(text: string, re: RegExp): number {
  const m = re.exec(text);
  expect(m, `발문에서 «${re}» 를 못 읽었다:\n${text}`).toBeTruthy();
  return Number(m![1]);
}

/** `$…$` 안의 수를 전부 — 「답이 발문에 그대로 있나」를 묻는 창구다. */
function numbersIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g))
    for (const tok of (m[1] ?? "").match(/\d+(?:\.\d+)?/g) ?? [])
      out.push(Number(tok));
  return out;
}

type BarCell = { label: string; value?: number; unknown?: boolean };

/** 막대그래프 스펙의 값 목록. 그림이 없거나 종류가 다르면 시험이 죽는다. */
function barValues(spec: unknown): BarCell[] {
  const s = spec as { kind?: string; values?: BarCell[] } | null;
  expect(s?.kind, "막대그래프가 아니다").toBe("barChart");
  expect(Array.isArray(s?.values)).toBe(true);
  return s!.values!;
}

const ORDINALS = [
  "첫째",
  "둘째",
  "셋째",
  "넷째",
  "다섯째",
  "여섯째",
  "일곱째",
  "여덟째",
  "아홉째",
];

/* ════════════════════ A. 등록 — 세운 곳과 **비운 곳** ════════════════════ */

/**
 * 🔴 비운 자리를 **정확히** 못 박는다. 「덜 찼다」와 「일부러 비웠다」는 다른 말이고,
 * 목록이 없으면 다음 사람이 조용히 채우거나 조용히 지운다.
 * 근거는 보고서 `tier-fill-g4-w3.md` §2·§3 에 소단원마다 한 줄씩 있다.
 */
const REGISTERED: Record<string, ("심화중" | "심화상")[]> = {
  // 1-5 막대그래프 — 1-5-3 은 둘 다 비움(짝을 셋 이상 만들 수 있는 자리가 전수 0)
  "1-5-1": ["심화중"],
  // 🔴 **적대 검토가 거뒀다**(2026-08-31, 원장 §1⑷) — 중은 「나누어떨어지는 둘 중
  //    작은 쪽」만으로 20,000/20,000, 상은 「칸 수의 차」를 **안 읽어도** 98.3%.
  //    뿌리는 `BAR_SCALES` 의 「값 넷이 모두 step 의 배수」 격자다.
  "1-5-2": [],
  "1-5-3": [],
  // 1-6 규칙 찾기 — 1-6-3·1-6-4·1-6-5 는 둘 다 비움(후보를 자르는 것이 약수라 초5)
  "1-6-1": ["심화중"],
  "1-6-2": ["심화상"],
  "1-6-3": [],
  "1-6-4": [],
  "1-6-5": [],
  // 2-4 사각형 — 심화상은 일곱 소단원 모두 비움
  "2-4-1": [],
  "2-4-2": ["심화중"],
  "2-4-3": ["심화중"],
  "2-4-4": [],
  // 🔴 **적대 검토가 거뒀다**(원장 §1⑵) — 죽는 가지가 산술 모순($P=4a$)이라 답에
  //    영향이 0이고, 같은 소단원 **응용과 발문의 수·정답이 통째로 같은 자리 110/110**.
  "2-4-5": [],
  "2-4-6": [],
  "2-4-7": ["심화중"],
};

describe("초4 물결3 — 등록", () => {
  it("핵심 넷은 그대로이고 확대 갈래는 정한 자리에만 있다", () => {
    for (const [code, extra] of Object.entries(REGISTERED)) {
      const u = unitOf(code);
      expectCoreTiers(u, `초4 ${code}`);
      const got = supportedTiers(u).filter(
        (t) => t === "심화중" || t === "심화상",
      );
      expect(got, `초4 ${code} 의 확대 갈래`).toEqual(extra);
    }
  });

  it("세운 갈래는 씨앗마다 실제로 만들어진다 (던지지 않는다)", () => {
    let made = 0;
    for (const [code, extra] of Object.entries(REGISTERED))
      for (const tier of extra)
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          expect(p.content.length, `${code} «${tier}» 발문`).toBeGreaterThan(
            10,
          );
          expect(p.answer.length, `${code} «${tier}» 답`).toBeGreaterThan(0);
          made += 1;
        }
    // 분모 — 0 이면 이 시험은 아무것도 안 지킨다.
    expect(made).toBe(6 * SEEDS.length); // 적대 검토가 셋을 거뒀다(9 → 6)
  });
});

/* ════════════════ B. 심화중 — 마디가 열려 있고 성질이 굳힌다 ════════════════ */

describe("초4 1-5 막대그래프 — 심화중의 마디", () => {
  it("1-5-1: 견줄 상대가 안 굳고 «세로 눈금 상한»이 둘을 떨어뜨린다", () => {
    for (const seed of SEEDS) {
      const p = gen("1-5-1", seed, "심화중");
      const top = grab(p.content, /세로 눈금은 \$(\d+)\$명까지/);
      const gap = grab(p.content, /좋아하는 학생보다 \$(\d+)\$명 더 많습니다/);
      const cells = barValues(p.figureSpec);
      const shown = cells
        .filter((c) => c.unknown !== true)
        .map((c) => c.value!);
      expect(shown, `1-5-1 seed=${seed} 보이는 막대`).toHaveLength(3);
      // ⑴ 마디가 열려 있다 — 후보 셋.
      const cands = shown.map((v) => v + gap);
      expect(new Set(cands).size, "후보가 여럿").toBeGreaterThan(1);
      // ⑵ 「지워진 막대도 눈금 안에 그려져 있다」가 정확히 하나를 남긴다.
      const alive = cands.filter((v) => v <= top);
      expect(alive, `1-5-1 seed=${seed}`).toHaveLength(1);
      expect(p.answer).toBe(`$${alive[0]}$명`);
      // ⑶ 음성 대조 — 그 성질을 끄면 셋이 다 살아 답이 안 정해진다.
      expect(cands.length).toBeGreaterThan(alive.length);
      // 축 맨 위는 보이는 막대의 최댓값이다(최댓값을 숨기지 않는다).
      expect(Math.max(...shown)).toBe(top);
      // 🔴 **발문이 말한 눈금 상한이 그림의 축과 같아야** 그 성질이 뜻을 가진다.
      //    이 값은 발문 글자에 안 나타나므로 스펙에서 직접 읽는다 — 안 그러면
      //    축만 흔드는 변이가 시험을 통과한다(그러면 굳힘 근거가 지면에서 거짓말이 된다).
      expect(
        (p.figureSpec as { yMax?: number }).yMax,
        `1-5-1 seed=${seed}`,
      ).toBe(top);
    }
  });
});

describe("초4 1-6 규칙 찾기 — 심화중의 마디", () => {
  it("1-6-1: 몇째인지 안 굳고 «첫째는 한 자리 수»가 하나를 고른다", () => {
    for (const seed of SEEDS) {
      const p = gen("1-6-1", seed, "심화중");
      const step = grab(p.content, /^\$(\d+)\$씩 커지는/);
      const shown = grab(p.content, /배열에 \$(\d+)\$/);
      // ⑴ 마디가 열려 있다 — 첫째 후보는 「$A$ 에서 $d$ 씩 거꾸로 뺀 수」 전부.
      const cands: number[] = [];
      for (let v = shown; v > 0; v -= step) cands.push(v);
      expect(cands.length, `1-6-1 seed=${seed} 후보`).toBeGreaterThan(4);
      // ⑵ 한 자리 수는 정확히 하나.
      const alive = cands.filter((v) => v <= 9);
      expect(alive, `1-6-1 seed=${seed}`).toHaveLength(1);
      expect(p.answer).toBe(`$${alive[0]}$`);
      // ⑶ 음성 대조 — 「두 자리 수」로 뒤집으면 여럿이 남아 답이 안 정해진다.
      expect(cands.filter((v) => v >= 10).length).toBeGreaterThan(1);
    }
  });
});

describe("초4 2-4 사각형 — 심화중의 마디", () => {
  it("2-4-2: 직선 수가 안 굳고 «수직 꺾임의 홀짝»이 하나를 죽인다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-4-2", seed, "심화중");
      const cnt = grab(
        p.content,
        /서로 (?:평행한|수직인) 직선은 그 직선을 빼고 모두 \$(\d+)\$개/,
      );
      const countsParallel = p.content.includes("서로 평행한 직선은");
      const lastPerp = p.content.includes(
        "맨 앞에 있는 직선과 서로 수직입니다.",
      );
      // ⑴ 후보 둘 — 세는 것이 «평행»이면 `2c+1`·`2c+2`, «수직»이면 `2c`·`2c+1` 이다.
      const lower = countsParallel ? cnt * 2 + 1 : cnt * 2;
      const cands = [lower, lower + 1];
      expect(new Set(cands).size).toBe(2);
      // ⑵ 「맨 뒤가 맨 앞과 수직 = 꺾인 횟수가 홀수」가 하나를 남긴다.
      const alive = cands.filter(
        (total) => ((total - 1) % 2 === 1) === lastPerp,
      );
      expect(alive, `2-4-2 seed=${seed}`).toHaveLength(1);
      expect(p.answer).toBe(`$${alive[0]}$개`);
      // ⑶ 음성 대조 — 관계를 뒤집으면 다른 쪽이 남는다.
      const flipped = cands.filter(
        (total) => ((total - 1) % 2 === 1) !== lastPerp,
      );
      expect(flipped).toHaveLength(1);
      expect(flipped[0]).not.toBe(alive[0]);
    }
  });

  it("2-4-3: 세 직선의 차례가 안 굳고 **발문이 말한 방향**이 하나를 죽인다", () => {
    const dirs = new Set<string>();
    for (const seed of SEEDS) {
      const p = gen("2-4-3", seed, "심화중");
      const near = grab(
        p.content,
        /직선 가와 직선 나 사이의 거리는 \$(\d+)\\,\\mathrm\{cm\}\$/,
      );
      const far = grab(
        p.content,
        /직선 나와 직선 다 사이의 거리는 \$(\d+)\\,\\mathrm\{cm\}\$/,
      );
      // 🔴 **조건 «문구»를 읽는다.** 수만 읽으면 방향을 뒤집는 변이가 시험을 통과하고,
      //    그러면 지면의 굳힘 근거가 거짓이 되어도 아무도 모른다(적대 검토 §2-14).
      const dm = /사이의 거리보다 (짧을|길) 때/.exec(p.content);
      expect(
        dm,
        `2-4-3 seed=${seed} 방향 문구를 못 읽었다:\n${p.content}`,
      ).toBeTruthy();
      const word = dm![1]!;
      dirs.add(word);
      const wantShorter = word === "짧을";
      // ⑴ 후보 둘 — 나가 가운데면 합, 아니면 차.
      const cands = [near + far, Math.abs(near - far)];
      expect(new Set(cands).size, `2-4-3 seed=${seed}`).toBe(2);
      // ⑵ **발문이 말한 방향**이 정확히 하나를 남긴다.
      const alive = cands.filter((d) => (wantShorter ? d < near : d > near));
      expect(alive, `2-4-3 seed=${seed}`).toHaveLength(1);
      expect(p.answer).toBe(`$${alive[0]}\\,\\mathrm{cm}$`);
      // ⑶ 음성 대조 — 방향을 뒤집으면 **다른 쪽**이 남는다. 그래야 그 문장이 일을 한다.
      const flipped = cands.filter((d) => (wantShorter ? d > near : d < near));
      expect(flipped, `2-4-3 seed=${seed} 뒤집기`).toHaveLength(1);
      expect(flipped[0], `2-4-3 seed=${seed}`).not.toBe(alive[0]);
      // 답이 발문의 두 수와 다르다(그러면 되짚기가 아니라 옮겨 적기가 된다).
      expect(alive[0]).not.toBe(near);
      expect(alive[0]).not.toBe(far);
    }
    // 🔴 **두 방향이 씨앗마다 던져진다.** 한 방향으로 굳으면 `both > near` 도
    //    `apart < near` 도 밭에서 항등이라 그 문장이 정보를 한 비트도 안 싣고,
    //    학생은 조건을 안 읽고 늘 같은 연산만 해도 맞는다(적대 검토 §1⑴, 실측 2,400/2,400).
    expect([...dirs].sort(), "2-4-3 방향이 던져진다").toEqual(["길", "짧을"]);
  });

  it("2-4-7: 이름이 안 굳고 «네 변이 같으면 한 변은 합의 4분의 1»이 정사각형을 죽인다", () => {
    for (const seed of SEEDS) {
      const p = gen("2-4-7", seed, "심화중");
      const total = grab(
        p.content,
        /네 변의 길이의 합은 \$(\d+)\\,\\mathrm\{cm\}\$/,
      );
      const side = grab(p.content, /한 변의 길이는 \$(\d+)\\,\\mathrm\{cm\}\$/);
      // ⑴ 후보 둘 — 정사각형이면 한 변이 합의 $4$분의 $1$, 아니면 직사각형.
      expect(total % 4, `2-4-7 seed=${seed} 합의 4분의 1`).toBe(0);
      const square = total / 4;
      // ⑵ 그 값이 주어진 한 변과 다르므로 정사각형이 죽는다.
      expect(square).not.toBe(side);
      const rest = total / 2 - side;
      expect(rest).toBeGreaterThan(0);
      expect(p.answer).toBe(`직사각형, $${rest}\\,\\mathrm{cm}$`);
      // ⑶ 음성 대조 — 정사각형이었다면 이웃한 변이 `side` 라 답이 달라진다.
      expect(rest).not.toBe(side);
    }
  });
});

/* ═══════════ C. 심화상 — 성질만으로 못 굳혀 «만들어 견주어야» 한다 ═══════════ */

describe("초4 물결3 — 심화상 하나 (1-5-2 상은 적대 검토가 거뒀다)", () => {
  it("1-6-2 심화상: 창 안의 개수를 하나씩 잡아 **실제로 쌓아** 보아야 하나가 남는다", () => {
    for (const seed of SEEDS) {
      const p = gen("1-6-2", seed, "심화상");
      const first = grab(p.content, /첫째는 \$(\d+)\$개이고/);
      const total = grab(p.content, /모형이 모두 \$(\d+)\$개였고/);
      const lo = grab(p.content, /늘어나는 개수는 \$(\d+)\$개보다 많고/);
      const hi = grab(p.content, /\$(\d+)\$개보다 적습니다/);
      // ⑴ 창 안의 후보가 셋 이상 — 성질 하나로는 안 굳는다.
      const cands: number[] = [];
      for (let g = lo + 1; g <= hi - 1; g += 1) cands.push(g);
      expect(cands.length, `1-6-2상 seed=${seed} 창`).toBeGreaterThanOrEqual(3);
      // ⑵ 후보마다 **자리를 늘려 가며 실제로 더해** 합에 닿는 것을 찾는다.
      const hits: { grow: number; upto: number }[] = [];
      for (const grow of cands) {
        let sum = 0;
        for (let k = 1; k <= 12; k += 1) {
          sum += first + grow * (k - 1);
          if (sum === total) {
            hits.push({ grow, upto: k });
            break;
          }
          if (sum > total) break;
        }
      }
      expect(hits, `1-6-2상 seed=${seed}`).toHaveLength(1);
      expect(p.answer).toBe(ORDINALS[hits[0]!.upto - 1]);
      // ⑶ 후보를 발문이 주지 않는다 — 답(몇째)이 지면에 없고, 창의 두 끝이 늘어나는
      //    개수를 곧바로 알려 주지도 않는다(창 안쪽이라야 «만들어 견주기»가 성립한다).
      //    ⚠️ 「늘어나는 개수가 지면의 어떤 수와도 다르다」로는 못 쓴다 — 첫째 개수와
      //    우연히 같아지는 씨앗이 있고, 그건 결함이 아니다(시험이 그렇게 잡아 주었다).
      expect(p.content).not.toContain(ORDINALS[hits[0]!.upto - 1]!);
      expect(hits[0]!.grow).toBeGreaterThan(lo);
      expect(hits[0]!.grow).toBeLessThan(hi);
    }
  });
});

/* ════════════════ D. 반증 ④ — 아래 세 갈래가 이 잣대를 통과하나 ════════════════ */

/**
 * 「같은 소단원의 연산·기본·응용 중 **하나라도** 심화중 잣대를 통과하면 그 소단원은 비운다」.
 *
 * 🔴 판정기(`probe-elem-tier-backsolve`)는 이 셋에서 못 잰다 — 1-5·2-4 는 자료형·도형이라
 * 답이 「$7$칸」·「사다리꼴」이고, 1-6 은 순수 덧뺄셈이라 `forwardReachable` 의 허용 꼴 밖이다.
 * 그래서 여기서 손으로 잰다. 열쇠는 계량기(`census-elem-backsolve-marks.ts`)가 갖고 있고
 * **이 시험이 그것을 import 한다** — 두 벌로 적으면 한쪽만 고쳐도 아무도 모른다.
 *
 * ⚠️ **분모를 같이 센다** — 자국이 하나도 없으면 「깨끗」이 아니라 「이 열쇠가 눈이 멀었다」다.
 *    실제로 이 회차에서 그것이 났다: 첫 측정이 정규식의 역슬래시를 한 겹 잃어
 *    `\square` 를 못 보고 **160 을 48 로** 셌다(보고서 §7).
 */
const LOWER_TIER_BACKSOLVE: string[] = [
  "1-6-1|기본",
  "1-6-3|연산",
  "1-6-4|연산",
  "1-6-4|기본",
  "1-6-4|응용",
  "1-6-5|기본",
  "1-6-5|응용",
  "2-4-4|기본",
  "2-4-7|기본",
  "2-4-7|응용",
];

describe("초4 물결3 — 반증 ④ (뒤집힘 필터)", () => {
  it("연산·기본·응용에 되짚기 자국이 있는 자리는 못 박은 열뿐이다", () => {
    const found: string[] = [];
    for (const code of Object.keys(REGISTERED))
      for (const tier of LOWER_TIERS) {
        const hit = SEEDS.some((s) =>
          BACKSOLVE_MARK.test(gen(code, s, tier).content),
        );
        if (hit) found.push(`${code}|${tier}`);
      }
    expect(found.sort()).toEqual([...LOWER_TIER_BACKSOLVE].sort());
    // 분모 — 자국이 0이면 이 열쇠가 눈이 먼 것이다.
    expect(found.length).toBeGreaterThan(0);
  });

  it("그 자국들은 «굳지 않는 마디»의 자국인 범위 표현을 하나도 안 쓴다", () => {
    // 열 자리 전부 「규칙을 읽어 $\square$ 를 채운다」·「성질을 읽어 이름을 댄다」라
    // 마디가 한 번에 굳는다(반증 ①). 범위가 있으면 그때부터 안 굳는 마디다.
    for (const key of LOWER_TIER_BACKSOLVE) {
      const [code, tier] = key.split("|") as [string, string];
      for (const seed of SEEDS.slice(0, 6)) {
        const c = gen(code, seed, tier).content;
        if (!BACKSOLVE_MARK.test(c)) continue;
        expect(
          /보다 크고|보다 작고|될 수 있는|알려 주지 않습니다/.test(c),
          `${key} seed=${seed}`,
        ).toBe(false);
      }
    }
  });
});

/* ══════════ E. 반증 ⑥ — 순방향으로 닿지 않는다 (배선 검사 + 눈금) ══════════ */

describe("초4 물결3 — 반증 ⑥", () => {
  it("검출기가 «예»를 낼 수 있다 (0 이 «못 셈»이 아님을 같은 회차에 보인다)", () => {
    expect(forwardReachable(pageNumbers("$12$ $5$ $7$"), readRat("53")!)).toBe(
      true,
    );
    expect(forwardReachable(pageNumbers("$12$ $5$"), readRat("53")!)).toBe(
      false,
    );
  });

  it("새 갈래 가운데 «수 답»인 것 전량이 순방향으로 안 닿는다", () => {
    let measured = 0;
    let skipped = 0;
    for (const [code, extra] of Object.entries(REGISTERED))
      for (const tier of extra)
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          const a = readRat(p.answer.replace(/\$/g, "").trim());
          if (!a) {
            skipped += 1;
            continue; // 「일곱째」·「직사각형, …」류 — 이 축 밖이다
          }
          measured += 1;
          expect(
            forwardReachable(pageNumbers(p.content), a),
            `${code} «${tier}» seed=${seed} 가 순방향으로 닿는다`,
          ).toBe(false);
        }
    // 🔴 분모를 **둘 다** 찍는다 — 잰 것과 «이 축이 못 보는 것»을 갈라야 0 이 뜻을 가진다.
    expect(measured).toBeGreaterThan(50);
    expect(skipped).toBe(2 * SEEDS.length); // 1-6-2상(「일곱째」) · 2-4-7중(이름+수)
  });
});

/* ═══════ E-2. 해설의 «이유» — 산문이 성한가 (적대 검토 §2-13) ═══════ */

/**
 * 🔴 **산문에는 가드가 하나도 없었다.** 2026-08-31 적대 검토가 해설 문장을 열한 가지로
 * 망가뜨렸는데 **열한 건 전부 초록**이었다 — 값 검사와 잣대 판정기는 「수가 맞나」만
 * 보고 「그 수를 왜 골랐다고 적었나」는 안 본다(2026-08-24 「값이 맞으면 시험이 다
 * 초록이다」와 같은 자리).
 *
 * 아래 넷은 그 검토자가 **눈금을 대어 만든 자**(`.tmp-rev/kill-guards/probe-prose.ts`,
 * 음성 3 · 양성 4 통과)를 그대로 옮긴 것이다. 규칙을 새로 짓지 않았다.
 * ⚠️ 이 자들은 **글자만** 본다 — 틀이 바뀌면 「문장을 못 읽었다」로 **빨개진다**.
 *    그게 옳다. 조용히 0이 되면 그 순간 다시 가드가 없는 것이 된다.
 */
function faults242(sol: string, answer: string): string[] {
  const out: string[] = [];
  const a =
    /그 가운데 (홀수|짝수) 번 꺾인 것이 \$(\d+)\$개이므로, 마지막으로 (홀수|짝수) 번 꺾인 것은 \$(\d+)\\times2(-1)?=(\d+)\$ 번/.exec(
      sol,
    );
  if (a) {
    const p1 = a[1]!;
    const p2 = a[3]!;
    const m = Number(a[6]);
    if (p1 !== p2) out.push(`㉠ 앞뒤 홀짝 낱말이 다르다: ${p1} vs ${p2}`);
    if (m % 2 !== (p2 === "홀수" ? 1 : 0))
      out.push(`㉠ 「${p2} 번 꺾인 것」이라는데 그 수가 ${m} 이다`);
  } else out.push("㉠ 문장을 못 읽었다 (틀이 바뀌었다)");

  const b =
    /맨 뒤 직선이 맨 앞 직선과 (수직|평행)(?:이|하)?려면 맨 뒤까지 꺾인 횟수가 (홀수|짝수)여야/.exec(
      sol,
    );
  if (b) {
    const want = b[1] === "수직" ? "홀수" : "짝수";
    if (b[2] !== want)
      out.push(`㉡ ${b[1]}인데 ${b[2]}라고 적었다 (참 ${want})`);
  } else out.push("㉡ 문장을 못 읽었다");

  const c =
    /\$(\d+)\$개이면 \$(\d+)\$번 꺾여 (홀수|짝수)라 안 되고, \$(\d+)\$개이면 \$(\d+)\$번 꺾여 (홀수|짝수)입니다/.exec(
      sol,
    );
  if (c) {
    const j = Number(c[2]);
    const i = Number(c[5]);
    if (j % 2 !== (c[3] === "홀수" ? 1 : 0))
      out.push(`㉢ ${j}번을 ${c[3]}라 적었다`);
    if (i % 2 !== (c[6] === "홀수" ? 1 : 0))
      out.push(`㉢ ${i}번을 ${c[6]}라 적었다`);
    if (c[3] === c[6]) out.push(`㉢ 버린 쪽과 고른 쪽의 홀짝이 같다 (${c[3]})`);
    if (Number(answer.replace(/[^0-9]/g, "")) !== Number(c[4]))
      out.push(`㉢ 고른 쪽 ${c[4]} 이 정답과 다르다`);
  } else out.push("㉢ 문장을 못 읽었다");
  return out;
}

function faults247(sol: string): string[] {
  const out: string[] = [];
  const m =
    /네 각의 크기가 모두 같은 사각형은 ([가-힣]+)이고, 그중 네 변(?:의 길이)?까지 (?:모두 )?같은 것이 ([가-힣]+)입니다/.exec(
      sol,
    );
  if (!m) return ["㉣ 정의문을 못 읽었다"];
  if (m[1] !== "직사각형")
    out.push(`㉣ 「네 각이 같은 사각형」을 ${m[1]} 이라 적었다`);
  if (m[2] !== "정사각형")
    out.push(`㉣ 「네 변까지 같은 것」을 ${m[2]} 라 적었다`);
  if (m[1] === m[2]) out.push(`㉣ 두 이름이 같다 (${m[1]}) — 정의가 무너진다`);
  return out;
}

function faults161(sol: string): string[] {
  const out: string[] = [];
  const m =
    /\$(\d+)\$에서 \$(\d+)\$씩 \$(\d+)\$번 빼면 \$(\d+)-(\d+)\\times(\d+)=(\d+)\$/.exec(
      sol,
    );
  if (!m) return ["㉤ 문장을 못 읽었다"];
  if (m[3] !== m[6]) out.push(`㉤ 「${m[3]}번 빼면」인데 식은 ×${m[6]} 이다`);
  if (m[1] !== m[4]) out.push(`㉤ 「${m[1]}에서」인데 식은 ${m[4]} 이다`);
  if (m[2] !== m[5]) out.push(`㉤ 「${m[2]}씩」인데 식은 ${m[5]} 이다`);
  return out;
}

/** 2-4-3 — 발문이 말한 방향과 **해설이 버리는 이유**가 맞물리는가(이 회차가 더한 것). */
function faults243(content: string, sol: string, answer: string): string[] {
  const out: string[] = [];
  const d = /사이의 거리보다 (짧을|길) 때/.exec(content);
  if (!d) return ["㉥ 발문의 방향 문구를 못 읽었다"];
  const m =
    /\$(\d+)\\,\\mathrm\{cm\}\$는 직선 가와 직선 나 사이의 거리인 \$(\d+)\\,\\mathrm\{cm\}\$보다 (짧아|길어) 조건에 맞지 않습니다\. 그러므로 직선 가와 직선 다 사이의 거리는 \$(\d+)\\,\\mathrm\{cm\}\$입니다/.exec(
      sol,
    );
  if (!m) return ["㉥ 해설의 버리는 문장을 못 읽었다"];
  const dead = Number(m[1]);
  const near = Number(m[2]);
  const why = m[3]!;
  const got = Number(m[4]);
  // 버리는 이유는 발문이 **요구한 방향의 반대**여야 한다.
  const want = d[1] === "짧을" ? "길어" : "짧아";
  if (why !== want)
    out.push(
      `㉥ 발문은 「${d[1]} 때」인데 버리는 이유가 「${why}」다 (참 「${want}」)`,
    );
  // 그 이유가 실제 수와도 맞아야 한다.
  if ((why === "길어") !== dead > near)
    out.push(`㉥ ${dead} 이 ${near} 보다 「${why}」라고 적었다`);
  if (dead === got) out.push("㉥ 버린 값과 고른 값이 같다");
  if (Number(answer.replace(/[^0-9]/g, "")) !== got)
    out.push(`㉥ 해설이 고른 ${got} 이 정답과 다르다`);
  return out;
}

describe("초4 물결3 — 해설의 «이유»", () => {
  it("검출기가 «예»를 낼 수 있다 — 산문을 망가뜨리면 잡는다 (눈금)", () => {
    const p242 = gen("2-4-2", SEEDS[0]!, "심화중");
    const p247 = gen("2-4-7", SEEDS[0]!, "심화중");
    const p161 = gen("1-6-1", SEEDS[0]!, "심화중");
    const p243 = gen("2-4-3", SEEDS[0]!, "심화중");
    // 음성 — 지금 지면은 성하다.
    expect(faults242(p242.solution, p242.answer)).toEqual([]);
    expect(faults247(p247.solution)).toEqual([]);
    expect(faults161(p161.solution)).toEqual([]);
    expect(faults243(p243.content, p243.solution, p243.answer)).toEqual([]);
    // 양성 — 손상을 **글자에** 먹이면 걸린다.
    expect(
      faults242(
        p242.solution.replace(
          /횟수가 (홀수|짝수)여야/,
          (_m, w: string) => `횟수가 ${w === "홀수" ? "짝수" : "홀수"}여야`,
        ),
        p242.answer,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      faults247(
        p247.solution.replace(
          "같은 사각형은 직사각형이고",
          "같은 사각형은 정사각형이고",
        ),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      faults161(
        p161.solution.replace(
          /씩 \$(\d+)\$번 빼면/,
          (_m, k: string) => `씩 $${Number(k) + 1}$번 빼면`,
        ),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      faults243(
        p243.content,
        p243.solution.replace(
          /보다 (짧아|길어) 조건에/,
          (_m, w: string) => `보다 ${w === "짧아" ? "길어" : "짧아"} 조건에`,
        ),
        p243.answer,
      ).length,
    ).toBeGreaterThan(0);
  });

  it("세운 갈래 넷의 해설 산문이 씨앗마다 성하다", () => {
    for (const seed of SEEDS) {
      const p242 = gen("2-4-2", seed, "심화중");
      expect(
        faults242(p242.solution, p242.answer),
        `2-4-2 seed=${seed}`,
      ).toEqual([]);
      const p247 = gen("2-4-7", seed, "심화중");
      expect(faults247(p247.solution), `2-4-7 seed=${seed}`).toEqual([]);
      const p161 = gen("1-6-1", seed, "심화중");
      expect(faults161(p161.solution), `1-6-1 seed=${seed}`).toEqual([]);
      const p243 = gen("2-4-3", seed, "심화중");
      expect(
        faults243(p243.content, p243.solution, p243.answer),
        `2-4-3 seed=${seed}`,
      ).toEqual([]);
    }
  });
});

/* ═══════════════ F. 지면 약속 — 「잘못」·각도·규모·답 자리 ═══════════════ */

describe("초4 물결3 — 지면 약속", () => {
  it("새 갈래는 「잘못 …했더니」를 한 자리도 안 쓴다", () => {
    for (const [code, extra] of Object.entries(REGISTERED))
      for (const tier of extra)
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          expect(
            /잘못/.test(`${p.content} ${p.solution}`),
            `${code} «${tier}» seed=${seed}`,
          ).toBe(false);
        }
  });

  it("2-4 의 새 갈래는 **각도를 한 자리도 안 쓴다** (1-2-4 와 겹친다)", () => {
    for (const code of ["2-4-2", "2-4-3", "2-4-7"])
      for (const seed of SEEDS) {
        const p = gen(code, seed, "심화중");
        expect(
          /circ|각도|몇 도/.test(`${p.content} ${p.solution}`),
          `${code} seed=${seed} 가 각도를 쓴다`,
        ).toBe(false);
      }
  });

  it("2-4 의 새 갈래는 `□+(□+차)=합` 을 한 자리도 안 쓴다", () => {
    // 2-4-4·2-4-5 심화하와 2-6-1 심화하가 이미 그 산술이다(토대 §2-㉣).
    for (const code of ["2-4-2", "2-4-3", "2-4-7"])
      for (const seed of SEEDS) {
        const p = gen(code, seed, "심화중");
        expect(p.solution.includes("\\square"), `${code} seed=${seed}`).toBe(
          false,
        );
      }
  });

  it("규모를 안 키운다 — 지면의 수가 띠 안에 있다", () => {
    for (const [code, extra] of Object.entries(REGISTERED))
      for (const tier of extra)
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          for (const v of numbersIn(p.content))
            expect(v, `${code} «${tier}» seed=${seed} 의 ${v}`).toBeLessThan(
              1000,
            );
        }
  });

  it("씨앗 16개에서 발문이 8가지 이상 나온다 (한 문항으로 굳지 않는다)", () => {
    for (const [code, extra] of Object.entries(REGISTERED))
      for (const tier of extra) {
        const shapes = new Set(SEEDS.map((s) => gen(code, s, tier).content));
        expect(shapes.size, `${code} «${tier}» 발문 가짓수`).toBeGreaterThan(7);
      }
  });
});
