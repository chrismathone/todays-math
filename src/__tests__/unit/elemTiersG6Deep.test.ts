/**
 * 초6 `2-2 소수의 나눗셈` — **확대 갈래 심화중·심화상** (D-113 파일럿, 2026-08-30).
 *
 * ## 무엇을 축으로 잡았나
 *
 * 「어렵다」는 지면에 없다. 그래서 **잴 수 있는 것**으로 바꿔 잠근다.
 *
 * **㉠ (약한 축 — 답의 모양)** 심화중의 답은 **하나**, 심화상의 답은 **여럿을 나열**하거나
 *    **후보를 센 값**이다. ⚠️ 이것만으로는 목록을 손으로 지어 붙여도 통과한다.
 *
 *    🔴 **그리고 이 모양은 심화상만의 것이 아니다 — 초6 실측(씨앗 16, 갈래 전량):**
 *
 *        갈래     문항   답이 «나열»   「모두 …시오」
 *        연산      896   16 (1.8%)    16 (1.8%)
 *        기본      896   16 (1.8%)     0
 *        응용      896    0            0
 *        심화하    896    0            0
 *        심화중     80    0            0
 *        심화상     80   64 (80%)     64 (80%)
 *
 *    연산·기본의 16건은 **2-2-5 「몫 $6$, 남는 수 $1.5$」** 다 — 여러 답이 아니라
 *    **한 답의 두 부분**이고(`chooseAllRule` 의 «조각» 부류), 연산의 「모두 …시오」는
 *    **2-4-3 「비례식에서 외항을 모두 쓰시오」**(정의 확인)다.
 *    **그러므로 ㉠ 을 «갈래를 가르는 자»로 쓰면 안 된다.** 여기서는 오직
 *    심화중 ↔ 심화상 **둘 사이**에서만 쓰고, 진짜 판정은 ㉡·㉢ 이 한다.
 *    (초4 2-1-4 는 **심화하**가 이미 「□ 안에 들어갈 수 있는 수를 **모두** 구하시오」다 —
 *     리드 실측. 초6 에는 그 겹침이 없지만, 다른 학년으로 넓힐 때는 반드시 다시 잰다.)
 *
 * **㉡ (센 축 — 후보를 다시 훑는다)** 심화상 발문에는 **후보가 실려 있고**, 이 시험이
 *    그 후보를 **지면에서 다시 읽어** 조건을 적용한다. 그 결과가 답과 한 글자도 안 다르면
 *    통과다. 엔진의 풀·계산을 되부르지 않으므로 동어반복이 아니다 — 엔진이 조건을
 *    잘못 적용하면(하나 빠뜨리거나 하나 더 넣으면) 여기서 빨개진다.
 *
 * **㉢ (센 축 — 훑을 이유가 있나)** 후보 중 **조건에 안 맞는 것이 하나 이상** 있어야 한다.
 *    전부 통과하는 후보 묶음이면 「모두 구하시오」가 아무것도 안 가른다 — 열거가 장식이 된다.
 *
 * **㉣ (심화중이 심화하보다 위인가)** 발문의 두 수를 **한 번 곱하거나 나눠서** 답이 나오면
 *    한 걸음이다. 2-2-1·2-2-2·2-2-3 의 심화하는 **씨앗 400개 전부** 그렇고(실측),
 *    심화중은 **하나도** 그렇지 않다. 양쪽을 다 잠근다 — 음성 대조가 없으면 「0」이
 *    «깨끗»인지 «못 셈»인지 안 갈린다.
 *
 * ## 🔴 이 축들이 **못 보는 것**
 *
 * · **㉣ 는 2-2-4·2-2-5 에서 구조적으로 침묵한다.** 그 둘은 심화하가 이미 두 걸음이라
 *   (반올림 두 자리의 차 · 몫과 남는 수로 처음 양 되짚기) 「한 걸음이냐」가 둘을 못 가른다.
 *   게다가 2-2-5 심화중은 **우연 일치**가 난다(실측 20/400 — `4\times2.5=10` 이 하필 답과
 *   같다). 그래서 ㉣ 을 그 둘에 대면 **거짓 빨강**이고, 거짓 경보는 가드를 끈다.
 *   그 둘의 값 검산은 `elemTiersG6.test.ts` 가 한다(2-2-4 전용 검사 · `truthOf22`).
 * · **「후보를 훑는 것이 정말 «탐색»인가」는 못 잰다.** 규칙을 아는 학생은 안 훑고도 푼다.
 *   여기서 재는 것은 「답에 이르려면 여러 경우를 봐야 하는 **형태**인가」다.
 * · **심화상이 심화중보다 «어려운가»도 못 잰다.** 그 판정은 원장님이
 *   `/dev/tier-bench/g6` 에서 여섯을 나란히 보고 하신다 — 이 파일럿이 그러라고 있는 것이다.
 * · **문형(`FORMS`) 경로는 안 본다.** 이 갈래는 적재본에 안 나간다(D-113 파일럿 범위).
 * · **2-2-4 의 값 재구성은 여기 없다** — `elemTiersG6.test.ts` 의 2-2-4 전용 검사가
 *   범위를 다시 지어 잰다. 두 벌을 두면 한쪽만 고쳐도 아무도 모른다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

const CODES = ["2-2-1", "2-2-2", "2-2-3", "2-2-4", "2-2-5"] as const;
const SEEDS = Array.from({ length: 16 }, (_, i) => i * 31 + 11);

const unitOf = (code: string) => {
  const u = elementaryUnits().find(
    (x) => x.grade === "초6" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원`).toBeTruthy();
  return u!;
};

// ── 지면에서 수를 읽는 자 — 엔진을 안 부른다 ──────────────────────────────
//
// 글자로 세므로 `0.30` 은 dp=2 다(수로 읽으면 0.3 이 되어 자릿수가 사라진다).

type Dec = { scaled: number; dp: number };

function decOf(tok: string): Dec | null {
  const m = tok.match(/^(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  const frac = m[2] ?? "";
  return { scaled: Number(`${m[1]}${frac}`), dp: frac.length };
}

/** `$…$` 안의 수를 **차례대로**. 단위·연산자·`\square` 는 수가 아니다. */
function decsIn(text: string): Dec[] {
  const out: Dec[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const tok = m[1]!
      .replace(/\\,|\\;|\\!|\\%/g, "")
      .replace(/\\mathrm\{[a-zA-Z]+\}(\^\d)?/g, "")
      .replace(/\\div|\\times|\\square|\\ldots|=/g, " ")
      .trim();
    for (const piece of tok.split(/\s+/)) {
      const v = decOf(piece);
      if (v) out.push(v);
    }
  }
  return out;
}

/** 지면에 적힌 그대로의 글자 — 답 목록을 **글자로** 견주려고 쓴다. */
const show = (d: Dec) =>
  d.dp === 0
    ? String(d.scaled)
    : `${Math.trunc(d.scaled / 10 ** d.dp)}.${String(d.scaled % 10 ** d.dp).padStart(d.dp, "0")}`;

/** `a \div b` 의 몫이 자연수인가 — **정수로만** 판정한다(부동소수를 안 거친다). */
function divisible(a: Dec, b: Dec): boolean {
  const A = a.scaled * 10 ** b.dp;
  const B = b.scaled * 10 ** a.dp;
  return B !== 0 && A % B === 0;
}

/** `a \div b > t` — 교차곱으로. 셋 다 양수다(초등 지면). */
function quotientGreater(a: Dec, b: Dec, t: Dec): boolean {
  return (
    a.scaled * 10 ** b.dp * 10 ** t.dp > t.scaled * (b.scaled * 10 ** a.dp)
  );
}

/** 답에 실린 `$…$` 값들 — 나열이면 여럿이 나온다. */
const answerDecs = (answer: string) =>
  [...answer.matchAll(/\$([^$]*)\$/g)]
    .map((m) =>
      decOf(
        m[1]!
          .replace(/\\,|\\;|\\!/g, "")
          .replace(/\\mathrm\{[a-zA-Z]+\}(\^\d)?/g, "")
          .trim(),
      ),
    )
    .filter((v): v is Dec => v !== null);

/**
 * 발문의 두 수를 **한 번 곱하거나 나눠서** 답이 나오는가 (축 ㉣).
 *
 * ⚠️ `+`·`-` 는 **일부러 뺐다.** 넣으면 우연 일치가 난다 — 실측으로
 * `4.5-2=2.5` 가 하필 두 걸음짜리 답과 같았다. 이 대단원이 실제로 쓰는 연산만 본다.
 */
function oneStepAway(page: Dec[], want: Dec): string | null {
  const w = want.scaled / 10 ** want.dp;
  const eq = (x: number) => Math.abs(x - w) < 1e-9;
  for (const a of page)
    for (const b of page) {
      if (a === b) continue;
      const av = a.scaled / 10 ** a.dp;
      const bv = b.scaled / 10 ** b.dp;
      if (eq(av * bv)) return `${show(a)}×${show(b)}`;
      if (bv !== 0 && eq(av / bv)) return `${show(a)}÷${show(b)}`;
    }
  return null;
}

/**
 * 심화상 한 문항의 **참** — 발문에 실린 후보를 다시 훑는다(축 ㉡).
 * `고른것` 은 답과 견줄 글자 목록, `버린것` 은 조건에 안 맞은 후보(축 ㉢ 가 센다).
 */
function siftTop(
  code: string,
  content: string,
): { 고른것: string[]; 버린것: string[] } | null {
  const ds = decsIn(content);
  if (code === "2-2-1") {
    // 네 장 중 두 장을 뽑아 «큰 수 ÷ 작은 수» — 답은 **자연수가 되는 경우의 수**다.
    if (ds.length !== 4) return null;
    const yes: string[] = [];
    const no: string[] = [];
    for (let i = 0; i < 4; i += 1)
      for (let j = i + 1; j < 4; j += 1) {
        const [big, small] =
          ds[i]!.scaled >= ds[j]!.scaled ? [ds[i]!, ds[j]!] : [ds[j]!, ds[i]!];
        const label = `${show(big)}÷${show(small)}`;
        (divisible(big, small) ? yes : no).push(label);
      }
    return { 고른것: [String(yes.length)], 버린것: no };
  }
  if (code === "2-2-2") {
    // 후보 넷 · 나누는 수 · 문턱 — 몫이 문턱보다 «큰» 것.
    if (ds.length !== 6) return null;
    const [c1, c2, c3, c4, b, t] = ds as [Dec, Dec, Dec, Dec, Dec, Dec];
    const yes: string[] = [];
    const no: string[] = [];
    for (const c of [c1, c2, c3, c4]) {
      (quotientGreater(c, b, t) ? yes : no).push(show(c));
    }
    return { 고른것: yes, 버린것: no };
  }
  if (code === "2-2-3") {
    // 자연수 넷 · 나누는 소수 — 몫이 자연수인 것.
    if (ds.length !== 5) return null;
    const b = ds[4]!;
    const yes: string[] = [];
    const no: string[] = [];
    for (const c of ds.slice(0, 4)) {
      (divisible(c, b) ? yes : no).push(show(c));
    }
    return { 고른것: yes, 버린것: no };
  }
  if (code === "2-2-5") {
    // 전체 · 한 사람 몫 넷 · 문턱 — 남는 양이 문턱보다 «적은» 것.
    if (ds.length !== 6) return null;
    const total = ds[0]!;
    const limit = ds[5]!;
    const yes: string[] = [];
    const no: string[] = [];
    for (const per of ds.slice(1, 5)) {
      // 전부 ×10 으로 맞춰 정수로만 잰다.
      const T = total.scaled * 10 ** (1 - total.dp);
      const P = per.scaled * 10 ** (1 - per.dp);
      const L = limit.scaled * 10 ** (1 - limit.dp);
      const rem = T - Math.floor(T / P) * P;
      (rem < L ? yes : no).push(show(per));
    }
    return { 고른것: yes, 버린것: no };
  }
  // 2-2-4 는 후보가 «목록»이 아니라 **구간**이다 — 값 재구성은 elemTiersG6.test.ts 몫이다.
  return null;
}

describe("[초6 확대] 2-2 소수의 나눗셈 — 심화중·심화상 (D-113 파일럿)", () => {
  it("다섯 소단원이 심화중·심화상을 **둘 다** 낸다", () => {
    for (const code of CODES) {
      const tiers = supportedTiers(unitOf(code));
      expect(tiers, code).toContain("심화중");
      expect(tiers, code).toContain("심화상");
    }
  });

  it("㉡ 심화상의 답은 **발문의 후보를 다시 훑어** 나온 그것과 같다", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of CODES) {
      if (code === "2-2-4") continue; // 구간형 — 위 머리말 참조
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, "심화상");
        const where = `${code} 심화상 seed=${seed}`;
        const sift = siftTop(code, p.content);
        if (!sift) {
          bad.push(
            `${where}: 후보를 못 읽음 — ${p.content.replace(/\n+/g, " ")}`,
          );
          continue;
        }
        checked += 1;
        const got = answerDecs(p.answer).map(show);
        if (got.join(",") !== sift.고른것.join(",")) {
          bad.push(
            `${where}: 답 ${p.answer} (${sift.고른것.join(", ")} 이어야) — ` +
              p.content.replace(/\n+/g, " "),
          );
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    // 분모를 같이 못 박는다 — 훑기가 조용히 줄면 «0건»이 «못 셈»이 된다.
    expect(checked).toBe((CODES.length - 1) * SEEDS.length);
  });

  it("㉢ 후보에는 **조건에 안 맞는 것**이 반드시 섞여 있다 — 다 고르면 틀린다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      if (code === "2-2-4") continue;
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, "심화상");
        const sift = siftTop(code, p.content)!;
        if (sift.버린것.length === 0) {
          bad.push(
            `${code} 심화상 seed=${seed}: 후보가 전부 조건을 만족한다 — 「모두」가 아무것도 안 가른다`,
          );
        }
        if (sift.고른것.length === 0) {
          bad.push(`${code} 심화상 seed=${seed}: 고를 것이 하나도 없다`);
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  it("㉢-b 2-2-2 심화상은 **문턱과 몫이 똑같은 후보**를 하나 둔다 (경계 함정)", () => {
    // 「보다 큰」을 「보다 크거나 같은」으로 읽으면 틀리게 하는 자리다.
    // 이게 없으면 문턱을 대충 읽어도 맞는다 — 그러면 이 문항이 재는 것이 하나 줄어든다.
    const bad: string[] = [];
    const unit = unitOf("2-2-2");
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(unit, seed, "심화상");
      const ds = decsIn(p.content);
      const [b, t] = [ds[4]!, ds[5]!];
      // `c ÷ b === t` 를 **정수 교차곱**으로 — 부동소수로 견주면 경계에서 답이 흔들린다.
      const exact = ds
        .slice(0, 4)
        .filter(
          (c) =>
            c.scaled * 10 ** (b.dp + t.dp) === t.scaled * b.scaled * 10 ** c.dp,
        );
      if (exact.length === 0) {
        bad.push(
          `2-2-2 심화상 seed=${seed}: 몫이 문턱과 같은 후보가 없다 — ${p.content}`,
        );
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  it("㉠ 심화중의 답은 하나, 심화상의 답은 여럿이거나 **개수**다", () => {
    const bad: string[] = [];
    let counted = 0;
    let listed = 0;
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const mid = generateElementaryProblem(unit, seed, "심화중");
        if (answerDecs(mid.answer).length !== 1) {
          bad.push(
            `${code} 심화중 seed=${seed}: 답이 하나가 아니다 — ${mid.answer}`,
          );
        }
        const top = generateElementaryProblem(unit, seed, "심화상");
        const n = answerDecs(top.answer).length;
        if (n >= 2) {
          listed += 1;
        } else if (n === 1 && /몇 가지|몇 개/.test(top.content)) {
          // «후보를 센 값» — 그 값이 실제로 후보 수인지는 ㉡ 이 잰다.
          counted += 1;
        } else {
          bad.push(
            `${code} 심화상 seed=${seed}: 답이 여럿도 개수도 아니다 — ${top.answer}`,
          );
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    // 두 모양이 **둘 다** 실제로 나온다 — 한쪽만 나오면 그 가지는 시험된 적이 없다.
    expect(counted).toBeGreaterThan(0);
    expect(listed).toBeGreaterThan(0);
    expect(counted + listed).toBe(CODES.length * SEEDS.length);
  });

  it("㉣ 2-2-1·2-2-2·2-2-3 — 심화하는 **한 걸음**이고 심화중은 아니다", () => {
    // 🔴 **양쪽을 다 잠근다.** 심화중이 0 이라는 것만 보면 이 자가 눈이 멀어도(예: 발문을
    //    못 읽어 후보가 빈 배열) 늘 초록이다. 심화하가 **반드시 걸리는 것**이 음성 대조다.
    const bad: string[] = [];
    let shallow = 0;
    for (const code of ["2-2-1", "2-2-2", "2-2-3"] as const) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const deep = generateElementaryProblem(unit, seed, "심화하");
        const dAns = answerDecs(deep.answer);
        const hit =
          dAns.length === 1
            ? oneStepAway(decsIn(deep.content), dAns[0]!)
            : null;
        if (!hit) {
          bad.push(
            `${code} 심화하 seed=${seed}: 한 걸음으로 안 나온다 — 이 자가 죽었을 수 있다 (${deep.content.replace(/\n+/g, " ")})`,
          );
        } else {
          shallow += 1;
        }
        const mid = generateElementaryProblem(unit, seed, "심화중");
        const mAns = answerDecs(mid.answer);
        const midHit =
          mAns.length === 1 ? oneStepAway(decsIn(mid.content), mAns[0]!) : null;
        if (midHit) {
          bad.push(
            `${code} 심화중 seed=${seed}: ${midHit} 한 번이면 답이 나온다 — 심화하와 같은 층이다`,
          );
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(shallow).toBe(3 * SEEDS.length);
  });

  it("심화중·심화상은 씨앗마다 갈리고, 같은 씨앗이면 늘 같다", () => {
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of ["심화중", "심화상"] as const) {
        const pages = SEEDS.map(
          (s) => generateElementaryProblem(unit, s, tier).content,
        );
        expect(
          new Set(pages).size,
          `${code} ${tier} 씨앗 다양성`,
        ).toBeGreaterThan(1);
        const again = generateElementaryProblem(unit, SEEDS[0]!, tier);
        expect(again.content, `${code} ${tier} 재현`).toBe(pages[0]);
      }
    }
  });
});
