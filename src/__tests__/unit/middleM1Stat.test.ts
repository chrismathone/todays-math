/**
 * 중1 물결 3A-유형 (`m1Stat.ts`) — **독립 검산**.
 *
 * 생성기의 답을 그대로 믿지 않는다: `facts`(발문의 원 수치)로 유형마다
 * 조건식을 **여기서 다시 세워** 만족하는지 본다. 그러므로 아래 식들은
 * 생성기와 **다른 모양**이어야 의미가 있다. 실제로 다르게 썼다 —
 *
 *  - 21 갈래 0: 생성기는 $r\to A\to S$ 로 갔다. 여기서는 발문이 준 $A$ 에서
 *    $r=\sqrt A$ 를 **되찾아** $S=4A$ 를 확인한다.
 *  - 21 갈래 2: 생성기는 $S=4r^2$. 여기서는 지름만으로 $S=d^2$ 를 확인한다.
 *  - 23: 생성기는 갈래마다 따로 셈했다. 여기서는 $n$ 에 대한 **닫힌 식**
 *    $nA=4r^2(n-1)+2r^2\log_2 n$, $3nV=4r^3(n-1)$ 하나로 셋을 다 본다.
 *  - 16: 생성기는 $cb:da$ 를 약분했다. 여기서는 **약분 없이** 교차곱
 *    $p\cdot da=q\cdot cb$ 와 $\gcd(p,q)=1$ 로 본다.
 *
 * ⚠️ 유형 목록은 `registeredTypes()` 를 중단원 이름으로 거르지 않고
 * **자기 모듈(`M1_STAT_TYPES`)을 직접 훑는다** — 같은 중단원에 남의 세션이
 * 유형을 등록하면 그 유형이 이 검산표에 들이대져 빨개진다(물결 2 에서 실제로 남).
 */
import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
  typesForSection,
} from "../../lib/middle/generate";
import { preprocessMathText } from "../../lib/math/textPreprocess";
import { M1_FREQ, M1_SPHERE, M1_STAT_TYPES } from "../../lib/middle/m1Stat";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260823, 1, 7777, 424242, 99991, 31337, 5150, 60613];

type F = Record<string, number>;

/** 유형별 독립 검산 — 발문이 말하는 조건을 여기서 다시 세운다. */
const VERIFY: Record<string, (f: F) => boolean> = {
  // ── 구 계열 ──────────────────────────────────────────
  // 21 겉넓이. 갈래 0 은 «단면의 최대 넓이 $A\pi$» 에서 $r$ 를 되찾아 $S=4A$.
  //           갈래 1 은 반구 = 곡면 $2r^2$ + 단면 $r^2$. 갈래 2 는 $S=d^2$.
  "21": (f) => {
    if (f.branch === 0) {
      const r = Math.sqrt(f.A!);
      return Number.isInteger(r) && r === f.r! && f.S! === 4 * f.A!;
    }
    if (f.branch === 1) return f.S! === 2 * f.r! * f.r! + f.r! * f.r!;
    return f.d! === 2 * f.r! && f.S! === f.d! * f.d!;
  },
  // 22 부피. 갈래 3(반구)만 절반. 나눗셈을 피해 곱셈으로 본다.
  "22": (f) => {
    const r3 = f.r! ** 3;
    if (f.branch === 3) return 3 * f.V! === 2 * r3;
    if (f.branch === 1 && f.d! !== 2 * f.r!) return false;
    if (f.branch === 2 && f.S! !== 4 * f.r! * f.r!) return false;
    return 3 * f.V! === 4 * r3;
  },
  // 23 $\frac1n$ 을 잘라 낸 나머지 — 자른 면은 $\log_2 n$ 장, 한 장이 $\frac2n\pi r^2$.
  "23": (f) => {
    const planes = Math.log2(f.n!);
    if (!Number.isInteger(planes)) return false;
    const r2 = f.r! * f.r!;
    return (
      f.n! * f.A! === 4 * r2 * (f.n! - 1) + 2 * planes * r2 &&
      3 * f.n! * f.V! === 4 * f.r! ** 3 * (f.n! - 1)
    );
  },
  // 24 회전체 — 반원→구, 사분원→반구.
  "24": (f) => {
    const r2 = f.r! * f.r!;
    if (f.half === 0) return f.A! === 4 * r2 && 3 * f.V! === 4 * f.r! ** 3;
    return f.A! === 2 * r2 + r2 && 3 * f.V! === 2 * f.r! ** 3;
  },
  // 25 원뿔 : 구 : 원기둥 $=1:2:3$ — 비로도 보고 실제 부피로도 본다.
  "25": (f) => {
    const r3 = f.r! ** 3;
    const shapes =
      3 * f.cone! === 2 * r3 && 3 * f.sphere! === 4 * r3 && f.cyl! === 2 * r3;
    const ratio = f.sphere! === 2 * f.cone! && f.cyl! === 3 * f.cone!;
    const asked =
      f.branch === 0
        ? f.ans! === f.cone! + f.cyl!
        : f.branch === 1
          ? f.ans! === f.sphere!
          : f.ans! === f.cyl!;
    return shapes && ratio && asked;
  },
  // 26 꼭 맞게 — 정육면체 속 구 / 구 속 정팔면체 / 반구 속 원뿔.
  "26": (f) => {
    if (f.branch === 0) return 2 * f.r! === f.a! && f.S! === 4 * f.r! * f.r!;
    if (f.branch === 1) return 3 * f.V! === 4 * f.r! ** 3;
    return (
      f.half! === 2 * f.r! ** 3 &&
      f.cone! === f.r! ** 3 &&
      f.ratio! * f.cone! === f.half!
    );
  },
  // 27 부피 → 겉넓이. 부피 공식과 겉넓이 공식을 **따로** 대고 $3V=Sr$ 로 잇는다.
  "27": (f) => {
    if (f.half === 0) {
      return 3 * f.V! === f.S! * f.r! && f.S! === 4 * f.r! * f.r!;
    }
    return 3 * f.V! === 2 * f.r! ** 3 && f.S! === 3 * f.r! * f.r!;
  },
  // 28 겉넓이:부피 = 3:r — 약분 없이 교차곱. gcd=1 은 기약.
  "28": (f) =>
    f.a! * f.r! === f.b! * 3 &&
    f.a! > 0 &&
    f.b! > 0 &&
    egcd(f.a!, f.b!) === 1 &&
    (f.mode === 0 ? f.ans === f.b : f.ans === f.r),

  // ── 도수분포표와 상대도수 ────────────────────────────
  // 02 갈래 0: «가장 큰 값이 몇 번째 계급인가» 를 나눗셈으로 되짚는다.
  //    갈래 1: 합계 − 나머지. 갈래 2: 첫 계급에서 $k-1$ 번 옮겨 마지막 계급.
  "02": (f) => {
    if (f.branch === 0) {
      return (
        Math.floor((f.maxV! - f.lo!) / f.w!) + 1 === f.k! &&
        f.minV! >= f.lo! &&
        f.minV! < f.lo! + f.w! &&
        f.maxV! > f.minV!
      );
    }
    if (f.branch === 1) return f.T! - f.s! === f.d! && f.d! >= 1 && f.c! >= 3;
    return f.lo! + (f.k! - 1) * f.w! === f.last! && f.w! > 0 && f.k! >= 2;
  },
  // 03 백분율 — 나눗셈 없이 $100d=pT$ 로.
  "03": (f) => 100 * f.d! === f.p! * f.T! && f.d! >= 1 && f.d! < f.T!,
  // 11 상대도수 — 등장한 계급 전부가 같은 총합을 가리켜야 한다.
  "11": (f) => {
    if (100 * f.d1! !== f.f1p! * f.T!) return false;
    if (f.d2 !== undefined && 100 * f.d2! !== f.f2p! * f.T!) return false;
    return f.T! > 0 && f.d1! >= 1;
  },
  // 15 두 집단 — 갈래 1 은 가중합, 나머지는 각 집단의 상대도수.
  "15": (f) => {
    if (f.branch === 1) {
      return (
        f.nM! * f.fMp! + f.nF! * f.fFp! === f.fAllp! * (f.nM! + f.nF!) &&
        f.fMp! !== f.fFp! &&
        (f.nM! * f.fMp!) % 100 === 0 &&
        (f.nF! * f.fFp!) % 100 === 0
      );
    }
    return (
      100 * f.dA! === f.fAp! * f.nA! &&
      100 * f.dB! === f.fBp! * f.nB! &&
      f.nA! !== f.nB! &&
      f.fAp! !== f.fBp!
    );
  },
  // 16 상대도수의 비 $=\frac ca:\frac db$ — 약분하지 않고 교차곱으로.
  "16": (f) =>
    f.p! * (f.d! * f.a!) === f.q! * (f.c! * f.b!) &&
    f.p! > 0 &&
    f.q! > 0 &&
    egcd(f.p!, f.q!) === 1,
};

function egcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : egcd(b, a % b);
}

/**
 * 본문에 «값으로» 실린 수 — 단위(`\mathrm{cm}`)·지수(`^2`)·아래첨자(`V_{1}`)의
 * 숫자를 먼저 떼어 낸다. 안 떼면 `$100\pi\,\mathrm{cm}^2$` 의 «$2$» 나
 * `$V_{1}$` 의 «$1$» 이 값으로 잡힌다.
 *
 * ⚠️ 한계를 적어 둔다: 생성기도 같은 「무엇이 값인가」를 판단한다
 * (`m1Stat.ts` 의 `plainNumbers`). 그래서 이 함수는 **그 판단 자체는 검증하지
 * 못한다.** 그래도 생성기 것을 불러다 쓰지 않고 여기 다시 쓴 이유는, 불러다
 * 쓰면 그 판단이 바뀌는 날 이 시험이 조용히 따라가기 때문이다(동어반복).
 */
function valueNumbers(text: string): number[] {
  const cleaned = text
    .replace(/\\mathrm\{[^}]*\}/g, " ")
    .replace(/[\^_]\{?-?\d+\}?/g, " ");
  return (cleaned.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/** 답에 나와야 할 수 — `facts` 에서 끌어온다(답이 엉뚱한 수를 찍는 것을 막는다). */
const ANSWER_NUMS: Record<string, (f: F) => number[]> = {
  "21": (f) => [f.ans!],
  "22": (f) => [f.ans!],
  "23": (f) => [f.A!, f.V!],
  "24": (f) => [f.A!, f.V!],
  "25": (f) => [f.ans!],
  "26": (f) => [f.ans!],
  "27": (f) => [f.ans!],
  "28": (f) => (f.mode === 0 ? [f.a!, f.b!] : [f.r!]),
  "02": (f) => [f.ans!],
  "03": (f) => [f.ans!],
  "11": (f) => [f.ans!],
  "15": (f) => [f.ans!],
  "16": (f) => [f.p!, f.q!],
};

describe("중1 3A — 구 계열 + 도수분포표와 상대도수(텍스트 유형)", () => {
  it("🔴 **「구의 겉넓이와 부피」가 8문항 일일테스트를 채운다**", () => {
    const sphere = typesForSection("구의 겉넓이와 부피");
    expect(
      sphere.length,
      "유형이 8 미만이면 8문항 일일테스트를 못 채운다",
    ).toBeGreaterThanOrEqual(8);
    expect(new Set(sphere.map((e) => e.key)).size).toBe(sphere.length);
  });

  it("자기 모듈이 낸 유형만 훑는다 — 남의 유형이 섞이면 여기서 갈린다", () => {
    // 중단원 이름으로 거르면 같은 중단원의 남의 유형(01~04·18 은 세션 중1 것)이
    // 쓸려 들어온다. 그래서 목록은 **모듈에서** 온다.
    expect(M1_STAT_TYPES.length).toBe(13);
    expect(M1_SPHERE.length).toBe(8);
    expect(M1_FREQ.length).toBe(5);
    expect(new Set(M1_STAT_TYPES.map((e) => e.key)).size).toBe(13);
  });

  it("RPM 색인의 구 계열 여섯(21~26)에 우리 유형 27·28 을 더해 여덟이다", () => {
    expect(M1_SPHERE.map((e) => e.rpmType)).toEqual([
      "21",
      "22",
      "23",
      "24",
      "25",
      "26",
      "27",
      "28",
    ]);
    expect(new Set(M1_SPHERE.map((e) => e.rpmMinor))).toEqual(
      new Set(["입체도형의 겉넓이와 부피"]),
    );
    expect(new Set(M1_SPHERE.map((e) => e.unitSection))).toEqual(
      new Set(["구의 겉넓이와 부피"]),
    );
  });

  it("도수분포표와 상대도수는 «그림 없이 성립하는» 다섯만 낸다", () => {
    // 나머지 열넷은 보류다 — 표·히스토그램·도수분포다각형 kind 가 들어온 뒤
    // figureSpec 과 함께 붙인다(모듈 상단 표 참조). 여기 숫자가 늘어나는 날은
    // 그림도 같이 온 날이어야 한다.
    expect(M1_FREQ.map((e) => e.rpmType)).toEqual([
      "02",
      "03",
      "11",
      "15",
      "16",
    ]);
    expect(new Set(M1_FREQ.map((e) => e.rpmMinor))).toEqual(
      new Set(["도수분포표와 상대도수"]),
    );
    expect(new Set(M1_FREQ.map((e) => e.unitSection))).toEqual(
      new Set(["도수분포표", "상대도수"]),
    );
  });

  it("우리 단원 이름이 교육과정 시드(정본)에 실제로 있다", () => {
    // 「손으로 적은 단원 이름」이 시드와 어긋나면 적재가 조용히 못 붙는다.
    // 그러니 참을 **정본에서** 가져온다 — 여기 목록을 손으로 적으면
    // 손 목록끼리 견주는 동어반복이 된다.
    const seeded = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_STAT_TYPES) {
      expect(
        seeded.has(e.unitSection),
        `중1 시드에 없는 단원 이름: ${e.unitSection} (${e.key})`,
      ).toBe(true);
    }
  });

  it("붙인 단원이 셋뿐이다 — 엉뚱한 단원으로 새면 눈에 띄게", () => {
    // 위 검사는 「시드에 있는 이름인가」만 본다. 시드에 있는 **다른** 단원으로
    // 잘못 붙는 것은 못 본다(예: 「대푯값」). 그래서 셋을 못 박아 둔다.
    const sections = new Set(M1_STAT_TYPES.map((e) => e.unitSection));
    expect(sections).toEqual(
      new Set(["구의 겉넓이와 부피", "도수분포표", "상대도수"]),
    );
  });

  it("제품 전처리가 내 수식의 수를 바꾸지 않는다", () => {
    // 화면을 눈으로 보고서야 나온 결함이다(2026-08-23). `preprocessMathText` 는
    // 「정수 가분수 → 대분수」를 **한국 교과 관행**으로 적용한다(초등 분수에서는 옳다).
    // 그런데 구의 부피 공식 $\dfrac43\pi r^3$ 가 그 규칙에 정확히 걸려
    // 지면에 **$1\frac13\pi$** 로 나갔고, $\dfrac{12}{2}=6$ 은 통째로 접혀
    // 「$6=6$」이 됐다. 수학은 맞지만 공식이 아니고, 해설이 말이 안 된다.
    //
    // 참을 **제품 함수에서** 가져온다 — 규칙을 여기 옮겨 적으면 그 규칙이
    // 바뀌는 날 이 검사가 눈이 먼다. 판정은 「전처리 전후로 수식 안의 수가
    // 같은가」다(전처리가 수를 바꿨다면 내가 쓴 식이 아니다).
    const digits = (s: string) =>
      (s.match(/\$[^$]*\$/g) ?? []).join(" ").match(/\d+/g)?.join(",") ?? "";
    for (const e of M1_STAT_TYPES) {
      for (let s = 0; s < 60; s += 1) {
        const p = generateMiddleProblem(e.key, s * 7919 + 13);
        for (const field of [p.content, p.answer, p.solution]) {
          expect(
            digits(preprocessMathText(field)),
            `${e.key} — 전처리가 수식을 고쳐 씁니다: ${field}`,
          ).toBe(digits(field));
        }
      }
    }
  });

  it("그림이 없다 — 못 그리는 그림을 지어내지 않았다", () => {
    // `sphere` 렌더러는 반지름을 안 담는다(elem_advanced.py `_sphere`, `pr` 리터럴 36).
    // 통계 kind 는 아직 없다. 그러니 지금 이 모듈의 figureSpec 은 **없어야** 한다.
    // 그림을 붙이는 날 이 검사가 빨개지고, 그때 facts↔figureSpec 대조로 바꾼다.
    for (const e of M1_STAT_TYPES) {
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        expect(p.figureSpec ?? null, e.key).toBeNull();
      }
    }
  });

  for (const e of M1_STAT_TYPES) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260823)).toEqual(
          generateMiddleProblem(e.key, 20260823),
        );
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[e.rpmType];
        expect(verify, `검산식 누락: ${e.rpmType}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            verify!(p.facts),
            `seed ${seed} 검산 실패: ${JSON.stringify(p.facts)}`,
          ).toBe(true);
        }
      });

      it("답의 수가 facts 와 일치한다", () => {
        const want = ANSWER_NUMS[e.rpmType]!;
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(valueNumbers(p.answer), `${e.key} / ${p.answer}`).toEqual(
            want(p.facts),
          );
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(bareNumbers(p.content), p.content).toEqual([]);
          expect(bareNumbers(p.answer), p.answer).toEqual([]);
          expect(bareNumbers(p.solution), p.solution).toEqual([]);
        }
      });

      it("답이 발문에 그대로 적혀 있지 않다", () => {
        // 「역산해서 만든 발문」이 답을 그대로 말해 버리면 문항이 아니다.
        // 답의 수가 발문 안에 «수로» 등장하면 빨갛게 한다(비 유형은 두 수 다).
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const asked = ANSWER_NUMS[e.rpmType]!(p.facts);
          const inContent = valueNumbers(p.content);
          for (const v of asked) {
            if (e.rpmType === "16" || e.rpmType === "28") continue; // 비는 작은 수가 겹친다
            expect(
              inContent.includes(v),
              `답 ${v} 가 발문에 그대로 있다: ${p.content}`,
            ).toBe(false);
          }
        }
      });

      it("해설이 답의 수를 담는다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const asked = ANSWER_NUMS[e.rpmType]!(p.facts);
          const inSolution = valueNumbers(p.solution);
          for (const v of asked) {
            expect(inSolution.includes(v), `${e.key} / ${p.solution}`).toBe(
              true,
            );
          }
        }
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of M1_STAT_TYPES) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });

  it("씨앗을 넓게 훑어도 던지지 않는다 (attempt 소진 없음)", () => {
    // 「재시도로 되기를 바라는」 갈래가 있으면 여기서 드러난다.
    for (const e of M1_STAT_TYPES) {
      for (let s = 0; s < 400; s += 1) {
        expect(() => generateMiddleProblem(e.key, s * 7919 + 13)).not.toThrow();
      }
    }
  });

  it("모든 갈래가 실제로 나온다 — 죽은 갈래가 없다", () => {
    // 갈래 하나가 영영 안 나오면 그 갈래의 검산식은 «초록인 장식» 이다.
    const seen: Record<string, Set<number>> = {};
    for (const e of M1_STAT_TYPES) {
      seen[e.rpmType] = new Set();
      for (let s = 0; s < 400; s += 1) {
        const f = generateMiddleProblem(e.key, s * 7919 + 13).facts as F;
        seen[e.rpmType]!.add((f.branch ?? f.n ?? f.half) as number);
      }
    }
    expect(seen["21"]).toEqual(new Set([0, 1, 2]));
    expect(seen["22"]).toEqual(new Set([0, 1, 2, 3]));
    expect(seen["23"]).toEqual(new Set([2, 4, 8]));
    expect(seen["24"]).toEqual(new Set([0, 1]));
    expect(seen["25"]).toEqual(new Set([0, 1, 2]));
    expect(seen["26"]).toEqual(new Set([0, 1, 2]));
    expect(seen["02"]).toEqual(new Set([0, 1, 2]));
    expect(seen["03"]).toEqual(new Set([0, 1, 2]));
    expect(seen["11"]).toEqual(new Set([0, 1, 2, 3]));
    expect(seen["15"]).toEqual(new Set([0, 1, 2]));
    expect(seen["16"]).toEqual(new Set([0, 1, 2]));
  });
});
