/**
 * 초4 생성기. 소단원 **번호**로 갈라 쓴다 — 이름 `includes` 로 가르면 두 소단원이 같은 가지에
 * 떨어져 발문이 통째로 겹친다(2026-08-22 원장님 검수 R5, 초4 에서 7쌍).
 *
 * 표기는 `format.ts` 한 곳을 거친다(R1 모든 수는 KaTeX · R4 한자 수사).
 * 해설은 그 학년까지 배운 연산만 쓴다(R3) — 소수의 곱셈·나눗셈은 초5 다.
 */
import {
  CURRICULUM_UNITS,
  type UnitSeed,
} from "../../../prisma/seed-data/units";

import type { ElemTierMap } from "./difficulty";
import { expr, n, polyName, unitNum } from "./format";
import { fracSpec } from "./fracFig";
import { fig, make } from "./make";
import { fmtFrac, gcd } from "./math";
import { intBetween, pick } from "./rng";
import type { ChapterHandler, ElemProblem, Rng } from "./types";

/** 각도. `45°` 같은 날 글자를 남기지 않는다(R1). */
function deg(value: number): string {
  return expr(`${value}^\\circ`);
}

/** 길이. `$8\,\mathrm{cm}$`. */
function cm(value: number): string {
  return unitNum(value, "cm");
}

/**
 * 소단원 번호(`2-3-1`). units.ts 에서 이름이 바뀌면 **던진다** —
 * 조용히 다른 가지로 떨어져 같은 발문을 두 번 내지 않게.
 */
function code(unit: UnitSeed): string {
  const head = unit.section.split(" ")[0] ?? "";
  if (!/^\d+-\d+-\d+$/.test(head)) {
    throw new Error(`초4 소단원 번호를 읽을 수 없습니다: ${unit.section}`);
  }
  return head;
}

/** 분기를 다 못 타면 던진다. 손대지 않은 소단원이 조용히 남으면 안 된다. */
function noBranch(unit: UnitSeed): never {
  throw new Error(`초4 생성기에 없는 소단원입니다: ${unit.section}`);
}

/**
 * 한 대단원 안에서 이 소단원이 몇 번째이고 형제가 몇인가.
 * `generate.ts` 가 g4 를 import 하므로 되부르면 순환이다 — 시드에서 바로 센다.
 */
function chapterSlot(unit: UnitSeed): { index: number; total: number } {
  const siblings = CURRICULUM_UNITS.filter(
    (u) => u.grade === unit.grade && u.chapter === unit.chapter,
  );
  const index = siblings.findIndex((u) => u.orderIndex === unit.orderIndex);
  if (index < 0) {
    throw new Error(`대단원에서 소단원을 못 찾았습니다: ${unit.section}`);
  }
  return { index, total: siblings.length };
}

/**
 * 소재를 소단원끼리 **나눠 갖는다** — 소단원 `i` 는 `j % total === i` 인 소재만 쓴다.
 *
 * ⚠️ 예전에는 `FAMILIES[orderIndex % FAMILIES.length]` 로 무리를 골랐다. 무리가 소단원보다
 * 많으면 **남는 무리가 영영 안 걸린다** — 실측으로 막대 소재 14개 중 **8개**, 꺾은선 8개 중
 * **2개**가 한 번도 안 나오고 있었다(2026-08-22, 소단원 3 × 씨앗 400 = 표본 1,200).
 * 원장님의 「소재는 다양할수록 좋다」에 정면으로 어긋나는데, **「소단원마다·씨앗마다 갈린다」
 * 가드는 이걸 구조적으로 못 본다** — 살아남은 것만으로도 그 조건은 참이기 때문이다.
 *
 * 나눠 갖기는 **수를 맞추는 것이 아니라 성질로 막는다**: 소단원 수가 몇으로 바뀌든 모든
 * 소재는 어느 한 몫에 반드시 들어가므로 **죽는 소재가 생길 수 없다.**
 * 몫이 서로 겹치지 않으므로 「소단원마다 다른 소재」도 저절로 지켜진다.
 */
function themeShare<T>(unit: UnitSeed, themes: readonly T[]): readonly T[] {
  const { index, total } = chapterSlot(unit);
  const mine = themes.filter((_, j) => j % total === index);
  if (mine.length < 2) {
    throw new Error(
      `소재가 모자랍니다: ${unit.chapter} — 소단원 ${total}개에 소재 ${themes.length}개. ` +
        `씨앗을 바꿔도 소재가 안 갈립니다(소단원마다 2개 이상 필요).`,
    );
  }
  return mine;
}

/** 받침에 따라 조사를 고른다 — 「사과을」 이 지면에 나가지 않게. */
function josa(word: string, withEnd: string, withoutEnd: string): string {
  const last = word.charCodeAt(word.length - 1);
  const has = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return `${word}${has ? withEnd : withoutEnd}`;
}

/**
 * 수 뒤에 오는 조사는 **소리**로 정해진다 — `4`는 「사」라 받침이 없고 `8`은 「팔」이라 있다.
 * 「$321$를 $300$으로」·「$71$가 됩니다」 같은 말이 지면에 나가지 않게 여기 한 곳을 거친다.
 */
const NUM_BATCHIM: Record<string, boolean> = {
  "0": true,
  "1": true,
  "2": false,
  "3": true,
  "4": false,
  "5": false,
  "6": true,
  "7": true,
  "8": true,
  "9": false,
};

/** 조사만 고른다. 수가 KaTeX 식 끝에 있을 때 쓴다. */
function tail(
  value: number | string,
  withEnd: string,
  withoutEnd: string,
): string {
  const digits = String(value).replace(/\D/g, "");
  return (NUM_BATCHIM[digits.slice(-1)] ?? true) ? withEnd : withoutEnd;
}

/** 수 + 조사. `josaNum(4, "을", "를")` → `$4$를`. */
function josaNum(
  value: number | string,
  withEnd: string,
  withoutEnd: string,
): string {
  return `${n(value)}${tail(value, withEnd, withoutEnd)}`;
}

/**
 * 수 + (으)로. **받침표(josaNum)로는 못 정한다** — ㄹ 받침(일·칠·팔)은 받침이 있어도
 * «로»다. 끝 숫자의 소리로 가른다(0 은 십·백·천·만·억으로 끝나는 소리 — 모두 «으로»).
 * ⚠️ 조 단위(…000000000000)로 끝나는 수에는 쓰지 말 것 — «조»는 «로»다.
 */
const RO_JOSA: Record<string, string> = {
  "0": "으로",
  "1": "로",
  "2": "로",
  "3": "으로",
  "4": "로",
  "5": "로",
  "6": "으로",
  "7": "로",
  "8": "로",
  "9": "로",
};
function roJosa(value: number): string {
  return `${n(value)}${RO_JOSA[String(value % 10)]}`;
}

/** 소수는 **정수로 계산해서 찍는다** — 부동소수점이 지면으로 새면 R2 다. */
function dec1(tenths: number): string {
  return `${Math.floor(tenths / 10)}.${tenths % 10}`;
}
function dec2(hundredths: number): string {
  return `${Math.floor(hundredths / 100)}.${String(hundredths % 100).padStart(2, "0")}`;
}
function dec3(thousandths: number): string {
  return `${Math.floor(thousandths / 1000)}.${String(thousandths % 1000).padStart(3, "0")}`;
}

/** 끝자리가 `0` 이 아닌 한 자리 소수(`3.7`)의 십분위 정수. `4.0`·`0.10` 을 안 만든다. */
function tenths(rng: Rng, lo: number, hi: number): number {
  return intBetween(rng, lo, hi) * 10 + intBetween(rng, 1, 9);
}
function hundredths(rng: Rng, lo: number, hi: number): number {
  return intBetween(rng, lo, hi) * 10 + intBetween(rng, 1, 9);
}

/* ────────────────────────────── 1-1 큰 수 ────────────────────────────── */

const PLACE5 = ["만", "천", "백", "십", "일"] as const;

function bigNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = code(unit);

  if (c === "1-1-1") {
    const kind = intBetween(rng, 0, 3);
    if (kind === 0) {
      return make(
        unit,
        `${n(1000)}이 ${n(10)}개인 수를 쓰시오.`,
        n(10000),
        `${n(1000)}이 ${n(10)}개이면 ${n(10000)}입니다. ${n(10000)}은 만이라고 읽습니다.`,
      );
    }
    if (kind === 1) {
      return make(
        unit,
        `${n(10000)}은 ${n(1000)}이 몇 개인 수인가?`,
        n(10),
        `${n(10000)}은 ${n(1000)}이 ${n(10)}개 모인 수입니다.`,
      );
    }
    if (kind === 2) {
      return make(
        unit,
        `${n(1000)}원짜리 지폐 ${n(10)}장은 모두 얼마인가?`,
        `${n(10000)}원`,
        `${expr("1000\\times10=10000")} 이므로 ${n(10000)}원입니다.`,
      );
    }
    const less = intBetween(rng, 1, 9) * 100;
    return make(
      unit,
      `${n(10000 - less)}보다 ${n(less)} 큰 수를 쓰시오.`,
      n(10000),
      `${expr(`${10000 - less}+${less}=10000`)} 입니다.`,
    );
  }

  if (c === "1-1-2") {
    const digits = [
      intBetween(rng, 1, 9),
      intBetween(rng, 0, 9),
      intBetween(rng, 0, 9),
      intBetween(rng, 0, 9),
      intBetween(rng, 0, 9),
    ];
    const at = intBetween(rng, 0, 4);
    digits[at] = intBetween(rng, 1, 9);
    const value = Number(digits.join(""));
    const place = PLACE5[at]!;
    const worth = digits[at]! * 10 ** (4 - at);
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `${n(value)}에서 ${place}의 자리 숫자를 쓰시오.`,
        n(digits[at]!),
        `${n(value)}의 ${place}의 자리 숫자는 ${n(digits[at]!)}입니다.`,
      );
    }
    return make(
      unit,
      `${n(value)}에서 ${place}의 자리 숫자가 나타내는 값을 쓰시오.`,
      n(worth),
      `${place}의 자리 숫자가 ${n(digits[at]!)}이므로 ${josaNum(worth, "을", "를")} 나타냅니다.`,
    );
  }

  if (c === "1-1-3") {
    const scale = pick(rng, [10, 100, 1000]);
    const count = intBetween(rng, 2, 9) * scale;
    const value = 10000 * count;
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `${n(10000)}이 ${n(count)}개인 수를 쓰시오.`,
        n(value),
        `${expr(`10000\\times${count}=${value}`)} 입니다.`,
      );
    }
    return make(
      unit,
      `${n(value)}은 ${n(10000)}이 몇 개인 수인가?`,
      n(count),
      `${expr(`${value}\\div10000=${count}`)} 이므로 ${n(10000)}이 ${n(count)}개인 수입니다.`,
    );
  }

  if (c === "1-1-4") {
    const a = intBetween(rng, 2, 9);
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        `${n(1000)}만이 ${n(10 * a)}개인 수는 몇 억인가?`,
        `${n(a)}억`,
        `${n(1000)}만이 ${n(10)}개이면 ${n(1)}억입니다. ${n(10 * a)}개이면 ${n(a)}억입니다.`,
      );
    }
    if (kind === 1) {
      return make(
        unit,
        `${n(a)}억은 ${n(1000)}만이 몇 개인 수인가?`,
        n(10 * a),
        `${n(1)}억은 ${n(1000)}만이 ${n(10)}개인 수이므로 ${n(a)}억은 ${n(10 * a)}개입니다.`,
      );
    }
    return make(
      unit,
      `${n(a)}억을 숫자로 쓰면 ${n(0)}은 모두 몇 개인가?`,
      n(8),
      `${n(1)}억은 ${n(1)} 다음에 ${n(0)}이 ${n(8)}개인 수입니다.`,
    );
  }

  if (c === "1-1-5") {
    const a = intBetween(rng, 2, 9);
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        `${n(1000)}억이 ${n(10 * a)}개인 수는 몇 조인가?`,
        `${n(a)}조`,
        `${n(1000)}억이 ${n(10)}개이면 ${n(1)}조입니다. ${n(10 * a)}개이면 ${n(a)}조입니다.`,
      );
    }
    if (kind === 1) {
      return make(
        unit,
        `${n(a)}조는 ${n(1)}억이 몇 개인 수인가?`,
        n(10000 * a),
        `${n(1)}조는 ${n(1)}억이 ${n(10000)}개인 수이므로 ${n(a)}조는 ${n(10000 * a)}개입니다.`,
      );
    }
    return make(
      unit,
      `${n(a)}조를 숫자로 쓰면 ${n(0)}은 모두 몇 개인가?`,
      n(12),
      `${n(1)}조는 ${n(1)} 다음에 ${n(0)}이 ${n(12)}개인 수입니다.`,
    );
  }

  if (c === "1-1-6") {
    const step = pick(rng, [1000, 10000, 100000]);
    const times = intBetween(rng, 2, 5);
    const start = intBetween(rng, 12, 89) * 10000;
    const end = start + step * times;
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `${n(start)}부터 ${n(step)}씩 ${n(times)}번 뛰어 센 수를 쓰시오.`,
        n(end),
        `${expr(`${start}+${step}\\times${times}=${end}`)} 입니다.`,
      );
    }
    return make(
      unit,
      `${n(end)}에서 ${n(step)}씩 거꾸로 ${n(times)}번 뛰어 센 수를 쓰시오.`,
      n(start),
      `${expr(`${end}-${step}\\times${times}=${start}`)} 입니다.`,
    );
  }

  if (c === "1-1-7") {
    const a = intBetween(rng, 10000, 98999);
    const b = a + intBetween(rng, 101, 900);
    const sa = String(a);
    const sb = String(b);
    let at = 0;
    while (at < 5 && sa[at] === sb[at]) at += 1;
    const place = PLACE5[Math.min(at, 4)]!;
    const wantBig = intBetween(rng, 0, 1) === 0;
    return make(
      unit,
      `${josaNum(a, "과", "와")} ${n(b)} 중 더 ${wantBig ? "큰" : "작은"} 수를 쓰시오.`,
      n(wantBig ? b : a),
      `두 수 모두 다섯 자리 수입니다. 높은 자리부터 비교하면 ${place}의 자리 숫자가 ` +
        `${josaNum(Number(sa[Math.min(at, 4)]), "과", "와")} ${n(Number(sb[Math.min(at, 4)]))}이므로 ` +
        `${josaNum(b, "이", "가")} 더 큽니다.` +
        (wantBig ? "" : ` 그러므로 더 작은 수는 ${n(a)}입니다.`),
    );
  }

  return noBranch(unit);
}

/* ──────────── 1-1 난이도 4단 (D-72 확대, 2026-08-23) ────────────
 *
 * ⚠️ **규모는 소단원 띠에 고정한다** — 「숫자 규모를 키우는 축은 다양성이 아니다」
 * (원장님 문항 다양성 원칙). 이 단원은 자릿수 자체가 교과 내용이라, 허용되는 규모는
 * **각 소단원이 정한 띠**뿐이다: 1-1-1 은 10000 언저리 · 1-1-2/7 은 다섯 자리 ·
 * 1-1-3 은 십만~구천만 · 1-1-4 는 만/억 · 1-1-5 는 억/조 · 1-1-6 은 표준과 같은 띠.
 * 4단이라고 자릿수를 더 키우지 않는다 — 난이도는 절차 구조(조립·역산·조건 조합)로 올린다.
 * 시험이 소단원별 상한으로 잠근다(elemTiersG4BigNum.test.ts).
 *
 * R5 대비 — 표준 여덟 갈래(1000×10·분해·지폐 10장·보다 큰 수 / 자리 숫자·값 /
 * 조립·분해 / 억·조 3종 / 뛰어·거꾸로 / 두 수 비교)와 유형을 전부 갈랐다.
 * 1-1-6 심화의 되짚기는 표준 ①(거꾸로 뛰어 세기)과 계산이 같아지지 않게
 * 「잘못 뛰어 세었더니」 복원형(D-72 ⑵의 그 문형)으로 간다.
 *
 * 1-1-4 와 1-1-5 는 교과 구조가 평행이라(표준 ⓪①②도 평행) 갈래도 평행하되,
 * 한 시험지에 나란히 실려도 단위만 바꾼 복붙으로 읽히지 않게 **문형 표면을 갈랐다**
 * (팀장 지침 2026-08-23): 연산은 「얼마나 큰가」↔「~보다 ~ 큰 수는 몇 조인가」,
 * 기본은 맨 조립·읽기 ↔ 예산 문장, 응용은 조립·수표 ↔ 나머지 있는 분해.
 */

/** 1-1-1 기본 문장의 소재 — 낱개로 묶는 물건(수를 세는 말이 「개/장」인 것만). */
const MAN_ITEMS = [
  { obj: "구슬", cnt: "개" },
  { obj: "색종이", cnt: "장" },
  { obj: "사탕", cnt: "개" },
] as const;

/**
 * **1-1-1 1단 연산 — 10000 과의 자릿값 관계 한 번.** 「9990보다 얼마나 큰가」·
 * 「10·100이 몇 개」. 표준이 가진 「1000이 몇 개」·「~보다 ~ 큰 수를 쓰시오」와 방향이 다르다.
 */
function tier11Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const kind = intBetween(rng, 0, 3);
  if (kind <= 1) {
    const d = intBetween(rng, 1, 9) * pick(rng, [1, 10, 100]);
    const base = 10000 - d;
    return make(
      unit,
      `${n(10000)}은 ${n(base)}보다 얼마나 큰 수인가?`,
      n(d),
      `${expr(`${base}+${d}=10000`)} 이므로 ${n(10000)}은 ${n(base)}보다 ${n(d)} 큰 수입니다.`,
    );
  }
  if (kind === 2) {
    return make(
      unit,
      `${n(10000)}은 ${n(10)}이 몇 개인 수인가?`,
      n(1000),
      `${expr("10\\times1000=10000")} 이므로 ${n(10)}이 ${n(1000)}개인 수입니다.`,
    );
  }
  return make(
    unit,
    `${n(10000)}은 ${n(100)}이 몇 개인 수인가?`,
    n(100),
    `${expr("100\\times100=10000")} 이므로 ${n(100)}이 ${n(100)}개인 수입니다.`,
  );
}

/**
 * **1-1-1 2단 기본 — 문장에서 천·만 관계로 식을 세운다.** 물건 묶음(1000씩 b묶음)과
 * 동전 두 벌(100원×100개·10원×1000개). 표준 「1000원 지폐 10장」과 수·소재가 겹치지 않는다.
 */
function tier11Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const kind = intBetween(rng, 0, 3);
  if (kind <= 1) {
    const t = pick(rng, MAN_ITEMS);
    const b = intBetween(rng, 2, 9);
    const v = b * 1000;
    return make(
      unit,
      `${josa(t.obj, "이", "가")} ${n(1000)}${t.cnt}씩 ${n(b)}묶음 있습니다. ` +
        `${josa(t.obj, "은", "는")} 모두 몇 ${t.cnt}인가?`,
      `${n(v)}${t.cnt}`,
      `${expr(`1000\\times${b}=${v}`)} 이므로 모두 ${n(v)}${t.cnt}입니다.`,
    );
  }
  if (kind === 2) {
    return make(
      unit,
      `${n(100)}원짜리 동전 ${n(100)}개는 모두 얼마인가?`,
      `${n(10000)}원`,
      `${expr("100\\times100=10000")} 이므로 ${n(10000)}원입니다.`,
    );
  }
  return make(
    unit,
    `${n(10)}원짜리 동전 ${n(1000)}개는 모두 얼마인가?`,
    `${n(10000)}원`,
    `${expr("10\\times1000=10000")} 이므로 ${n(10000)}원입니다.`,
  );
}

/**
 * **1-1-1 3단 응용 — 두 단계.** 지폐·동전을 섞어 10000원을 모으거나, 모자란 장수를 구한다.
 */
function tier11Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9);
  if (intBetween(rng, 0, 1) === 0) {
    const coins = (10 - a) * 10;
    return make(
      unit,
      `${n(1000)}원짜리 지폐 ${n(a)}장과 ${n(100)}원짜리 동전 ${n(coins)}개를 모으면 모두 얼마인가?`,
      `${n(10000)}원`,
      `${expr(`1000\\times${a}=${a * 1000}`)} 이고 ${expr(`100\\times${coins}=${coins * 100}`)} 입니다. ` +
        `${expr(`${a * 1000}+${coins * 100}=10000`)} 이므로 모두 ${n(10000)}원입니다.`,
    );
  }
  return make(
    unit,
    `${n(1000)}원짜리 지폐가 ${n(a)}장 있습니다. ${n(10000)}원이 되려면 ` +
      `${n(1000)}원짜리 지폐가 몇 장 더 필요한가?`,
    n(10 - a),
    `${n(10000)}원은 ${n(1000)}원짜리 지폐 ${n(10)}장과 같습니다. ` +
      `${expr(`10-${a}=${10 - a}`)} 이므로 ${n(10 - a)}장 더 필요합니다.`,
  );
}

/**
 * **1-1-1 4단 심화 — 역산·조건 조합.** 「어떤 수보다 k 큰 수가 10000」(표준 ③의 역방향),
 * 「1000이 10개인 수보다 k 작은 수」(구성을 먼저 밟아야 한다).
 */
function tier11Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 1, 9) * pick(rng, [1, 10, 100]);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `어떤 수보다 ${n(k)} 큰 수가 ${n(10000)}입니다. 어떤 수를 쓰시오.`,
      n(10000 - k),
      `${expr(`10000-${k}=${10000 - k}`)} 이므로 어떤 수는 ${n(10000 - k)}입니다.`,
    );
  }
  return make(
    unit,
    `${n(1000)}이 ${n(10)}개인 수보다 ${n(k)} 작은 수를 쓰시오.`,
    n(10000 - k),
    `${n(1000)}이 ${n(10)}개인 수는 ${n(10000)}입니다. ${expr(`10000-${k}=${10000 - k}`)} 입니다.`,
  );
}

/** 1-1-2 기본 문장의 소재 — 큰 묶음(10000)과 작은 묶음(1000)에 나눠 담는 것. */
const ASSEMBLE_ITEMS = [
  { obj: "구슬", big: "상자", small: "주머니", cnt: "개" },
  { obj: "색종이", big: "묶음", small: "봉투", cnt: "장" },
  { obj: "클립", big: "통", small: "봉지", cnt: "개" },
] as const;

/**
 * **1-1-2 1단 연산 — 자릿값 조립 한 번.** 「10000이 a개, 1000이 b개, …인 수」.
 * 표준(자리 숫자 읽기·값)의 반대 방향이다. 숫자가 0인 자리는 말하지 않으므로
 * 나열 길이도 씨앗마다 갈린다.
 */
function tier12Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const digits = [
    intBetween(rng, 1, 9),
    intBetween(rng, 0, 9),
    intBetween(rng, 0, 9),
    intBetween(rng, 0, 9),
    intBetween(rng, 0, 9),
  ];
  const value = Number(digits.join(""));
  const parts = digits
    .map((d, i) => ({ d, unit: 10 ** (4 - i) }))
    .filter((p) => p.d > 0);
  const listing = parts.map((p) => `${n(p.unit)}이 ${n(p.d)}개`).join(", ");
  const how =
    parts.length >= 2
      ? `자리의 값을 더하면 ${expr(`${parts.map((p) => p.d * p.unit).join("+")}=${value}`)} 입니다.`
      : `${n(10000)}이 ${n(parts[0]!.d)}개이면 ${n(value)}입니다.`;
  return make(unit, `${listing}인 수를 쓰시오.`, n(value), how);
}

/**
 * **1-1-2 2단 기본 — 실생활 문장에서 자릿값 조립 식을 세운다.** 만 단위와 천 단위
 * 두 묶음뿐이라 조립은 한 식이고, 문장이 한 겹이다.
 */
function tier12Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const t = pick(rng, ASSEMBLE_ITEMS);
  const a = intBetween(rng, 2, 9);
  const b = intBetween(rng, 2, 9);
  const v = a * 10000 + b * 1000;
  return make(
    unit,
    `${josa(t.obj, "을", "를")} ${n(10000)}${t.cnt}씩 ${t.big} ${n(a)}개에, ` +
      `${n(1000)}${t.cnt}씩 ${t.small} ${n(b)}개에 담았습니다. ` +
      `${josa(t.obj, "은", "는")} 모두 몇 ${t.cnt}인가?`,
    `${n(v)}${t.cnt}`,
    `${n(10000)}이 ${n(a)}개이면 ${n(a * 10000)}, ${n(1000)}이 ${n(b)}개이면 ${n(b * 1000)}입니다. ` +
      `${expr(`${a * 10000}+${b * 1000}=${v}`)} 이므로 모두 ${n(v)}${t.cnt}입니다.`,
  );
}

/**
 * **1-1-2 3단 응용 — 숫자 카드로 가장 큰·작은 수 만들기(두 단계: 고르고 배열).**
 * 그림은 카드 다섯 장(`numberCards`) — **뽑힌 차례 그대로** 보인다. 정렬해 보이면
 * 그림이 답을 말한다(D-66 ⑺). 우연히 답과 같은 차례로 뽑히면 한 자리 돌린다.
 */
function tier12Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const cards = pickDistinct(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5);
  const wantBig = intBetween(rng, 0, 1) === 0;
  const desc = [...cards].sort((x, y) => y - x);
  const asc = [...cards].sort((x, y) => x - y);
  // 가장 작은 수는 0 이 만의 자리에 올 수 없다 — 둘째로 작은 수를 먼저 놓는다.
  const smallest = asc[0] === 0 ? [asc[1]!, 0, ...asc.slice(2)] : asc;
  const ansDigits = wantBig ? desc : smallest;
  const answer = Number(ansDigits.join(""));
  let show = cards;
  if (show.join("") === ansDigits.join(""))
    show = [show[1]!, show[0]!, ...show.slice(2)];
  const how = wantBig
    ? `가장 큰 수는 높은 자리부터 큰 숫자를 차례로 놓습니다.`
    : asc[0] === 0
      ? `가장 작은 수는 높은 자리부터 작은 숫자를 놓되, 만의 자리에 ${n(0)}은 올 수 없으므로 ` +
        `둘째로 작은 ${josaNum(asc[1]!, "을", "를")} 먼저 놓고 ${n(0)}을 놓습니다.`
      : `가장 작은 수는 높은 자리부터 작은 숫자를 차례로 놓습니다.`;
  // 카드는 그림에도, 발문에도 **뽑힌 차례 그대로** 적는다 — 발문만 보고도 풀 수 있어야
  // 하고, 발문이 카드를 안 들면 갈래의 변형이 「큰/작은」 둘로 접힌다(실측 2026-08-23).
  const listing = show.map((d) => n(d)).join(", ");
  return make(
    unit,
    `숫자 카드 ${listing}${tail(show[4]!, "이", "가")} 한 장씩 있습니다. 카드를 한 번씩 모두 ` +
      `사용하여 만들 수 있는 가장 ${wantBig ? "큰" : "작은"} 다섯 자리 수를 쓰시오.`,
    n(answer),
    `${how} 만든 수는 ${n(answer)}입니다.`,
    fig("numberCards", { cards: show.map(String) }),
  );
}

/**
 * **1-1-2 4단 심화 — 두 자리를 못 박은 조건 조합.** 만·백의 자리를 정해 두고
 * 나머지를 가장 크게(작게) 채운다 — 조건을 동시에 만족시켜야 한다.
 */
function tier12Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 1, 9);
  const c = intBetween(rng, 0, 9);
  const wantBig = intBetween(rng, 0, 1) === 0;
  const rest = wantBig ? 9 : 0;
  const value = a * 10000 + rest * 1000 + c * 100 + rest * 10 + rest;
  return make(
    unit,
    `만의 자리 숫자가 ${n(a)}, 백의 자리 숫자가 ${josaNum(c, "인", "인")} 다섯 자리 수 중에서 ` +
      `가장 ${wantBig ? "큰" : "작은"} 수를 쓰시오.`,
    n(value),
    `만의 자리와 백의 자리는 정해져 있으므로, 나머지 천·십·일의 자리에 가장 ` +
      `${wantBig ? `큰 숫자 ${n(9)}를` : `작은 숫자 ${n(0)}을`} 놓으면 ${n(value)}입니다.`,
  );
}

/**
 * **1-1-3 1단 연산 — 교차 단위 한 번.** 「값은 1000이 몇 개인가」 — 표준(10000이 몇 개)과
 * 단위가 다르다.
 */
function tier13Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 2, 9) * pick(rng, [10, 100, 1000]);
  const value = 10000 * count;
  return make(
    unit,
    `${n(value)}은 ${n(1000)}이 몇 개인 수인가?`,
    n(count * 10),
    `${expr(`${value}\\div1000=${count * 10}`)} 이므로 ${n(1000)}이 ${n(count * 10)}개인 수입니다.`,
  );
}

/**
 * **1-1-3 2단 기본 — 돈 문장에서 식을 세운다.** 「10000원권 count장은 얼마」 —
 * 표준 ⓪의 관계를 문장 한 겹으로 감싼 것(2단의 몫).
 */
function tier13Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 2, 9) * pick(rng, [10, 100, 1000]);
  const value = 10000 * count;
  return make(
    unit,
    `은행에 ${n(10000)}원짜리 지폐가 ${n(count)}장 있습니다. 모두 얼마인가?`,
    `${n(value)}원`,
    `${expr(`10000\\times${count}=${value}`)} 이므로 모두 ${n(value)}원입니다.`,
  );
}

/**
 * **1-1-3 3단 응용 — 두 단계 조립.** 「100장 묶음 다발 k개」(만→백만 두 곱),
 * 「10000이 x개, 1000이 y개」(자리 섞은 합).
 */
function tier13Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const k = intBetween(rng, 2, 9);
    const bundle = 10000 * 100;
    return make(
      unit,
      `${n(10000)}원짜리 지폐를 ${n(100)}장씩 묶은 다발이 ${n(k)}개 있습니다. 모두 얼마인가?`,
      `${n(bundle * k)}원`,
      `한 다발은 ${expr(`10000\\times100=${bundle}`)} 원입니다. ` +
        `${expr(`${bundle}\\times${k}=${bundle * k}`)} 이므로 모두 ${n(bundle * k)}원입니다.`,
    );
  }
  const x = intBetween(rng, 2, 9) * pick(rng, [10, 100]);
  const y = intBetween(rng, 2, 9);
  const v = 10000 * x + 1000 * y;
  return make(
    unit,
    `${n(10000)}이 ${n(x)}개, ${n(1000)}이 ${n(y)}개인 수를 쓰시오.`,
    n(v),
    `${n(10000)}이 ${n(x)}개이면 ${n(10000 * x)}, ${n(1000)}이 ${n(y)}개이면 ${n(1000 * y)}입니다. ` +
      `${expr(`${10000 * x}+${1000 * y}=${v}`)} 입니다.`,
  );
}

/**
 * **1-1-3 4단 심화 — 교차 단위 역산.** 값을 지면에 주지 않고 「1000이 m개인 수는
 * 10000이 몇 개인가」 — 구성하고 다시 갈라야 한다(두 단계).
 */
function tier13Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 2, 9) * pick(rng, [10, 100]);
  const value = 10000 * count;
  if (intBetween(rng, 0, 1) === 0) {
    const m = count * 10;
    return make(
      unit,
      `${n(1000)}이 ${n(m)}개인 수는 ${n(10000)}이 몇 개인 수인가?`,
      n(count),
      `${expr(`1000\\times${m}=${value}`)} 이고 ${expr(`${value}\\div10000=${count}`)} 이므로 ` +
        `${n(10000)}이 ${n(count)}개인 수입니다.`,
    );
  }
  return make(
    unit,
    `${n(10000)}이 ${n(count)}개인 수는 ${n(100)}이 몇 개인 수인가?`,
    n(count * 100),
    `${expr(`10000\\times${count}=${value}`)} 이고 ${expr(`${value}\\div100=${count * 100}`)} 이므로 ` +
      `${n(100)}이 ${n(count * 100)}개인 수입니다.`,
  );
}

/**
 * **1-1-4 1단 연산 — 1억과 만 단위의 관계 한 번.** 「1억은 x만보다 얼마나 큰가」.
 * (1-1-5 연산과 문형을 갈랐다 — 저쪽은 「~억보다 ~억 큰 수는 몇 조인가」.)
 */
function tier14Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 1, 9) * pick(rng, [1, 10, 100]);
  const base = 10000 - d;
  return make(
    unit,
    `${n(1)}억은 ${n(base)}만보다 얼마나 큰 수인가?`,
    `${n(d)}만`,
    `${n(1)}억은 만이 ${n(10000)}개인 수입니다. ${expr(`${base}+${d}=10000`)} 이므로 ` +
      `${n(base)}만보다 ${n(d)}만 큰 수입니다.`,
  );
}

/**
 * **1-1-4 2단 기본 — 억·만이 섞인 수를 읽고 쓴다.** 조립과 분해 양방향.
 */
function tier14Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 2, 9);
  const y = intBetween(rng, 2, 9) * pick(rng, [1, 10, 100, 1000]);
  const value = x * 100000000 + y * 10000;
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `${n(x)}억 ${n(y)}만인 수를 숫자로 쓰시오.`,
      n(value),
      `${n(x)}억은 ${n(x * 100000000)}, ${n(y)}만은 ${n(y * 10000)}이므로 ` +
        `${expr(`${x * 100000000}+${y * 10000}=${value}`)} 입니다.`,
    );
  }
  return make(
    unit,
    `${n(value)}은 몇 억 몇 만인가?`,
    `${n(x)}억 ${n(y)}만`,
    `${n(value)}은 억이 ${n(x)}개, 만이 ${n(y)}개인 수이므로 ${n(x)}억 ${n(y)}만입니다.`,
  );
}

/**
 * **1-1-4 3단 응용 — 두 단계.** 「1억이 a개, 1000만이 b개」 조립과 「1000만 원짜리
 * 수표 m장」 문장(곱하고 자리를 넘긴다).
 */
function tier14Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const a = intBetween(rng, 2, 9);
    const b = intBetween(rng, 2, 9);
    const v = a * 100000000 + b * 10000000;
    return make(
      unit,
      `${n(1)}억이 ${n(a)}개, ${n(1000)}만이 ${n(b)}개인 수를 쓰시오.`,
      n(v),
      `${n(1)}억이 ${n(a)}개이면 ${n(a * 100000000)}, ${n(1000)}만이 ${n(b)}개이면 ` +
        `${n(b * 10000000)}입니다. ${expr(`${a * 100000000}+${b * 10000000}=${v}`)} 입니다.`,
    );
  }
  const m = intBetween(rng, 11, 89);
  const v = m * 10000000;
  return make(
    unit,
    `${n(1000)}만 원짜리 수표 ${n(m)}장은 모두 얼마인가?`,
    `${n(v)}원`,
    `${n(1000)}만 원은 ${n(10000000)}원입니다. ${expr(`10000000\\times${m}=${v}`)} 이므로 ` +
      `모두 ${n(v)}원입니다.`,
  );
}

/**
 * **1-1-4 4단 심화 — 역산.** 「어떤 수에서 1000만이 d개 늘어나면 x억」(되짚기),
 * 「만이 m개인 수는 몇 억인가」(단위를 두 번 갈아탄다).
 */
function tier14Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const x = intBetween(rng, 2, 9);
    const d = intBetween(rng, 1, 9);
    const ans = x * 100000000 - d * 10000000;
    return make(
      unit,
      `어떤 수에서 ${n(1000)}만이 ${n(d)}개 늘어나면 ${n(x)}억이 됩니다. 어떤 수를 쓰시오.`,
      n(ans),
      `${n(1000)}만이 ${n(d)}개이면 ${n(d * 10000000)}입니다. ` +
        `${expr(`${x * 100000000}-${d * 10000000}=${ans}`)} 이므로 어떤 수는 ${n(ans)}입니다.`,
    );
  }
  const a = intBetween(rng, 2, 9);
  const m = a * 10000;
  return make(
    unit,
    `만이 ${n(m)}개인 수는 몇 억인가?`,
    `${n(a)}억`,
    `만이 ${n(10000)}개이면 ${n(1)}억입니다. ${expr(`${m}\\div10000=${a}`)} 이므로 ${n(a)}억입니다.`,
  );
}

/**
 * **1-1-5 1단 연산 — 조 완성형.** 「x억보다 d억 큰 수는 몇 조인가」 —
 * 1-1-4 연산(「얼마나 큰가」)과 문형 표면을 갈랐다(팀장 지침).
 */
function tier15Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 2, 9);
  const d = intBetween(rng, 1, 9) * pick(rng, [1, 10, 100]);
  const base = x * 10000 - d;
  return make(
    unit,
    `${n(base)}억보다 ${n(d)}억 큰 수는 몇 조인가?`,
    `${n(x)}조`,
    `${n(1)}조는 억이 ${n(10000)}개인 수입니다. ${expr(`${base}+${d}=${x * 10000}`)} 이므로 ` +
      `${n(x * 10000)}억, 곧 ${n(x)}조입니다.`,
  );
}

/**
 * **1-1-5 2단 기본 — 예산 문장으로 읽고 쓴다.** 1-1-4 기본(맨 조립·읽기)과 표면이 다르다.
 */
function tier15Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 2, 9);
  const y = intBetween(rng, 2, 9) * pick(rng, [1, 10, 100, 1000]);
  const value = x * 1000000000000 + y * 100000000;
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `어느 나라의 한 해 예산은 ${n(x)}조 ${n(y)}억 원입니다. 이 금액을 숫자로 쓰시오.`,
      `${n(value)}원`,
      `${n(x)}조는 ${n(x * 1000000000000)}, ${n(y)}억은 ${n(y * 100000000)}이므로 ` +
        `${expr(`${x * 1000000000000}+${y * 100000000}=${value}`)} 입니다.`,
    );
  }
  return make(
    unit,
    `${n(value)}은 몇 조 몇 억인가?`,
    `${n(x)}조 ${n(y)}억`,
    `${n(value)}은 조가 ${n(x)}개, 억이 ${n(y)}개인 수이므로 ${n(x)}조 ${n(y)}억입니다.`,
  );
}

/**
 * **1-1-5 3단 응용 — 나머지 있는 분해.** 「1000억이 N개인 수는 몇 조 몇 억인가」와
 * 그 반대 — 1-1-4 응용(조립·수표)과 방향이 다르다. 표준 ⓪(딱 떨어지는 10a개)과 달리
 * 나머지가 남는다.
 */
function tier15Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9);
  const b = intBetween(rng, 1, 9);
  const cnt = a * 10 + b;
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `${n(1000)}억이 ${n(cnt)}개인 수는 몇 조 몇 억인가?`,
      `${n(a)}조 ${n(b * 1000)}억`,
      `${n(1000)}억이 ${n(10)}개이면 ${n(1)}조입니다. ${n(cnt)}개는 ${n(10)}개씩 ${n(a)}묶음과 ` +
        `${n(b)}개이므로 ${n(a)}조 ${n(b * 1000)}억입니다.`,
    );
  }
  return make(
    unit,
    `${n(a)}조 ${n(b * 1000)}억은 ${n(1000)}억이 몇 개인 수인가?`,
    n(cnt),
    `${n(a)}조는 ${n(1000)}억이 ${n(a * 10)}개, ${n(b * 1000)}억은 ${n(1000)}억이 ${n(b)}개인 ` +
      `수입니다. ${expr(`${a * 10}+${b}=${cnt}`)} 이므로 ${n(cnt)}개입니다.`,
  );
}

/**
 * **1-1-5 4단 심화 — 역산.** 「줄었더니 x조 y억」(늘어난 1-1-4 심화와 방향·목표 꼴이
 * 다르다), 「억이 m개인 수는 몇 조인가」.
 */
function tier15Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const x = intBetween(rng, 2, 9);
    const b = intBetween(rng, 1, 4);
    const d = intBetween(rng, 1, 5);
    const target = x * 1000000000000 + b * 100000000000;
    const ans = target + d * 100000000000;
    return make(
      unit,
      `어떤 수에서 ${n(1000)}억이 ${n(d)}개 줄었더니 ${n(x)}조 ${n(b * 1000)}억이 되었습니다. ` +
        `어떤 수를 쓰시오.`,
      n(ans),
      `${n(x)}조 ${n(b * 1000)}억은 ${n(target)}이고, 줄어든 ${n(1000)}억 ${n(d)}개는 ` +
        `${n(d * 100000000000)}입니다. ${expr(`${target}+${d * 100000000000}=${ans}`)} 이므로 ` +
        `어떤 수는 ${n(ans)}입니다.`,
    );
  }
  const a = intBetween(rng, 2, 9);
  const m = a * 10000;
  return make(
    unit,
    `억이 ${n(m)}개인 수는 몇 조인가?`,
    `${n(a)}조`,
    `억이 ${n(10000)}개이면 ${n(1)}조입니다. ${expr(`${m}\\div10000=${a}`)} 이므로 ${n(a)}조입니다.`,
  );
}

/**
 * **1-1-6 1단 연산 — 규칙 읽기 한 번.** 배열을 보고 「얼마씩 뛰어 세었는가」.
 * 표준(결과 구하기)의 반대 방향이고, 1-6-1(다음 수 구하기)과도 묻는 것이 다르다.
 */
function tier16Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const step = pick(rng, [1000, 10000, 100000]);
  const start = intBetween(rng, 12, 89) * 10000;
  const seq = [start, start + step, start + step * 2, start + step * 3];
  return make(
    unit,
    `뛰어 센 수를 차례로 쓰면 ${seq.map((v) => n(v)).join(", ")}입니다. ` +
      `얼마씩 뛰어 센 것인가?`,
    `${n(step)}씩`,
    `${expr(`${seq[1]}-${seq[0]}=${step}`)} 이므로 ${n(step)}씩 뛰어 세었습니다.`,
  );
}

/**
 * **1-1-6 2단 기본 — 저금 문장.** 뛰어 세기를 실생활 문장으로 감싼다(문장 한 겹).
 */
function tier16Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const step = pick(rng, [1000, 10000, 100000]);
  const start = intBetween(rng, 12, 89) * 10000;
  const t = intBetween(rng, 2, 5);
  const end = start + step * t;
  return make(
    unit,
    `저금통에 ${n(start)}원이 들어 있습니다. 매달 ${n(step)}원씩 저금하면 ` +
      `${n(t)}달 뒤에는 모두 얼마가 되는가?`,
    `${n(end)}원`,
    `${n(step)}원씩 ${n(t)}달이면 ${expr(`${step}\\times${t}=${step * t}`)} 원입니다. ` +
      `${expr(`${start}+${step * t}=${end}`)} 이므로 모두 ${n(end)}원입니다.`,
  );
}

/**
 * **1-1-6 3단 응용 — 갈아타는 뛰어 세기(중간값).** s1씩 t1번 뒤 s2씩 t2번.
 */
function tier16Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [s1, s2] = pickDistinct(rng, [1000, 10000, 100000], 2) as [
    number,
    number,
  ];
  const t1 = intBetween(rng, 2, 3);
  const t2 = intBetween(rng, 2, 3);
  const start = intBetween(rng, 12, 89) * 10000;
  const mid = start + s1 * t1;
  const end = mid + s2 * t2;
  return make(
    unit,
    `${n(start)}에서 ${n(s1)}씩 ${n(t1)}번 뛰어 센 다음, 이어서 ${n(s2)}씩 ${n(t2)}번 더 ` +
      `뛰어 세었습니다. 마지막 수를 쓰시오.`,
    n(end),
    `${expr(`${start}+${s1}\\times${t1}=${mid}`)} 이고, 이어서 ` +
      `${expr(`${mid}+${s2}\\times${t2}=${end}`)} 입니다.`,
  );
}

/**
 * **1-1-6 4단 심화 — 「잘못 뛰어 세었더니」 복원(D-72 의 그 문형).** 표준 ①(거꾸로
 * 뛰어 세기)과 계산이 같아지지 않게, 잘못 센 결과에서 처음 수를 되짚어 바르게 다시 센다.
 * 곁가지로 「얼마씩 뛰었는지」 역산도 든다.
 */
function tier16Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const t = intBetween(rng, 2, 5);
  const start = intBetween(rng, 12, 89) * 10000;
  if (intBetween(rng, 0, 1) === 0) {
    const [s, sw] = pickDistinct(rng, [1000, 10000, 100000], 2) as [
      number,
      number,
    ];
    const wrong = start + sw * t;
    const right = start + s * t;
    return make(
      unit,
      `어떤 수에서 ${n(s)}씩 ${n(t)}번 뛰어 세어야 할 것을 잘못하여 ${n(sw)}씩 ${n(t)}번 ` +
        `뛰어 세었더니 ${n(wrong)}이 되었습니다. 바르게 뛰어 세면 얼마인가?`,
      n(right),
      `잘못 센 것을 되돌리면 어떤 수는 ${expr(`${wrong}-${sw}\\times${t}=${start}`)} 입니다. ` +
        `바르게 뛰어 세면 ${expr(`${start}+${s}\\times${t}=${right}`)} 입니다.`,
    );
  }
  const step = pick(rng, [1000, 10000, 100000]);
  const end = start + step * t;
  return make(
    unit,
    `${n(start)}에서 ${n(t)}번 뛰어 세었더니 ${josaNum(end, "이", "가")} 되었습니다. ` +
      `얼마씩 뛰어 센 것인가?`,
    `${n(step)}씩`,
    `${expr(`${end}-${start}=${step * t}`)} 이고 ${expr(`${step * t}\\div${t}=${step}`)} 이므로 ` +
      `${n(step)}씩 뛰어 세었습니다.`,
  );
}

/**
 * **1-1-7 1단 연산 — 자리 수 비교 한 번.** 네 자리와 다섯 자리 — 자리 수만 세면 끝난다.
 * 표준(같은 다섯 자리끼리 높은 자리 비교)과 가르는 성질이 다르다.
 */
function tier17Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a4 = intBetween(rng, 1000, 9999);
  const b5 = intBetween(rng, 10000, 99999);
  const wantBig = intBetween(rng, 0, 1) === 0;
  const first = intBetween(rng, 0, 1) === 0 ? a4 : b5;
  const second = first === a4 ? b5 : a4;
  return make(
    unit,
    `두 수 ${n(first)}, ${n(second)} 중 더 ${wantBig ? "큰" : "작은"} 수를 쓰시오.`,
    n(wantBig ? b5 : a4),
    `${josaNum(a4, "은", "는")} 네 자리 수, ${josaNum(b5, "은", "는")} 다섯 자리 수입니다. ` +
      `자리 수가 많은 수가 더 크므로 더 ${wantBig ? "큰" : "작은"} 수는 ` +
      `${n(wantBig ? b5 : a4)}입니다.`,
  );
}

/**
 * **1-1-7 2단 기본 — 세 수 비교.** 두 번 견주어야 한다(표준은 두 수).
 */
function tier17Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const lo = intBetween(rng, 10000, 97999);
  const mid = lo + intBetween(rng, 101, 900);
  const hi = mid + intBetween(rng, 101, 900);
  const order = intBetween(rng, 0, 2);
  const shown =
    order === 0 ? [mid, lo, hi] : order === 1 ? [hi, mid, lo] : [lo, hi, mid];
  const wantBig = intBetween(rng, 0, 1) === 0;
  return make(
    unit,
    `세 수 ${shown.map((v) => n(v)).join(", ")} 중 가장 ${wantBig ? "큰" : "작은"} 수를 쓰시오.`,
    n(wantBig ? hi : lo),
    `세 수 모두 다섯 자리 수이므로 높은 자리부터 차례로 비교합니다. ` +
      `${expr(`${hi}>${mid}>${lo}`)} 이므로 가장 ${wantBig ? "큰" : "작은"} 수는 ` +
      `${n(wantBig ? hi : lo)}입니다.`,
  );
}

/**
 * **1-1-7 3단 응용 — 단위 표현을 수로 바꾼 뒤 비교(두 단계).** 「x만 y인 수」 ↔ 숫자.
 */
function tier17Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 2, 9);
  const y = intBetween(rng, 1, 9999);
  const a = x * 10000 + y;
  const up = intBetween(rng, 0, 1) === 0;
  const z = up ? a + intBetween(rng, 101, 900) : a - intBetween(rng, 101, 900);
  const big = Math.max(a, z);
  const small = Math.min(a, z);
  return make(
    unit,
    `${n(x)}만 ${josaNum(y, "인", "인")} 수와 ${n(z)} 중 더 큰 수를 쓰시오.`,
    n(big),
    `${n(x)}만 ${josaNum(y, "인", "인")} 수는 ${n(a)}입니다. ${expr(`${big}>${small}`)} 이므로 ` +
      `더 큰 수는 ${n(big)}입니다.`,
  );
}

/**
 * **1-1-7 4단 심화 — □ 부등식 조건 조합.** □에 들어갈 수 있는 숫자를 모두 센다.
 * 빈칸 앞자리는 같게 만들어 「그 자리 비교 + 같을 때 꼬리 비교」를 다 밟게 한다.
 * 답은 생성기가 0~9 를 **전수 대입**해 센다 — 경계 실수를 구조적으로 막는다.
 */
function tier17Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const at = intBetween(rng, 1, 3);
  const e = intBetween(rng, 2, 8);
  const A = [
    intBetween(rng, 1, 9),
    intBetween(rng, 0, 9),
    intBetween(rng, 0, 9),
    intBetween(rng, 0, 9),
    intBetween(rng, 0, 9),
  ];
  const B = [...A];
  for (let i = at; i < 5; i += 1) B[i] = intBetween(rng, 0, 9);
  B[at] = e;
  const less = intBetween(rng, 0, 1) === 0;
  const numB = Number(B.join(""));
  const numA = (x: number) =>
    Number(A.map((d, i) => (i === at ? x : d)).join(""));
  const okXs = Array.from({ length: 10 }, (_, x) => x).filter((x) =>
    less ? numA(x) < numB : numA(x) > numB,
  );
  const left = A.slice(0, at).join("");
  const right = A.slice(at + 1).join("");
  const place = PLACE5[at]!;
  // 경계(□ = 그 자리 숫자)의 해설은 **실제 비교값**으로 만든다 — 꼬리가 같으면
  // 두 수가 같아지므로, 부호를 손으로 적으면 거짓 문장이 지면에 나간다.
  const ae = numA(e);
  const tie = okXs.includes(e)
    ? ` ${expr(`\\square=${e}`)}일 때도 ${expr(`${ae}${less ? "<" : ">"}${numB}`)} 이므로 들어갈 수 있습니다.`
    : ae === numB
      ? ` ${expr(`\\square=${e}`)}일 때는 두 수가 같으므로 들어갈 수 없습니다.`
      : ` ${expr(`\\square=${e}`)}일 때는 ${expr(`${ae}${ae > numB ? ">" : "<"}${numB}`)} 이므로 들어갈 수 없습니다.`;
  return make(
    unit,
    `${n(0)}부터 ${n(9)}까지의 숫자 중에서 ${expr("\\square")} 안에 들어갈 수 있는 숫자는 ` +
      `모두 몇 개인가? ${expr(`${left}\\square${right}${less ? "<" : ">"}${numB}`)}`,
    n(okXs.length),
    `${place}의 자리보다 높은 자리 숫자가 서로 같으므로 ${place}의 자리를 비교합니다.${tie} ` +
      `${expr("\\square")} 안에 들어갈 수 있는 숫자는 ${okXs.map((x) => n(x)).join(", ")}이므로 ` +
      `모두 ${n(okXs.length)}개입니다.`,
  );
}

/* ────────────────────────────── 1-2 각도 ────────────────────────────── */

function angleKind(d: number): string {
  return d < 90 ? "예각" : d === 90 ? "직각" : "둔각";
}

function angle(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = code(unit);

  if (c === "1-2-1") {
    if (intBetween(rng, 0, 2) === 0) {
      return make(
        unit,
        "변의 길이가 더 긴 각이 항상 더 큰 각인가? 맞으면 '예', 아니면 '아니요'를 쓰시오.",
        "아니요",
        "각의 크기는 두 변이 벌어진 정도로 정해집니다. 변의 길이와는 관계가 없습니다.",
      );
    }
    const x = intBetween(rng, 20, 80);
    const y = x + intBetween(rng, 10, 60);
    return make(
      unit,
      `크기가 ${deg(x)}인 각과 ${deg(y)}인 각 중 더 큰 각의 크기를 쓰시오.`,
      deg(y),
      `${expr(`${x}<${y}`)} 이므로 ${deg(y)}인 각이 더 큽니다.`,
    );
  }

  if (c === "1-2-2") {
    const d = pick(
      rng,
      [25, 35, 40, 50, 55, 65, 70, 80, 100, 110, 115, 125, 130, 140, 145, 155],
    );
    if (intBetween(rng, 0, 3) === 0) {
      return make(
        unit,
        `직각을 ${n(90)}등분한 것 중 하나의 크기가 ${deg(1)}입니다. ${deg(d)}는 ${deg(1)}가 몇 개 모인 각인가?`,
        n(d),
        `${deg(1)}가 ${n(d)}개 모이면 ${deg(d)}입니다.`,
      );
    }
    return make(
      unit,
      "각도기로 잰 각의 크기는 몇 도인가?",
      deg(d),
      `각도기의 중심을 각의 꼭짓점에, 밑금을 각의 한 변에 맞추고 눈금을 읽으면 ${deg(d)}입니다.`,
      fig("protractor", { deg: d }),
    );
  }

  if (c === "1-2-3") {
    const pool = [
      15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155, 165,
    ];
    if (intBetween(rng, 0, 2) === 0) {
      const three = [pick(rng, pool), pick(rng, pool), pick(rng, pool)];
      const wide = three.filter((d) => d > 90).length;
      return make(
        unit,
        `크기가 ${deg(three[0]!)}, ${deg(three[1]!)}, ${deg(three[2]!)}인 세 각 중 둔각은 모두 몇 개인가?`,
        n(wide),
        `${deg(90)}보다 큰 각이 둔각입니다. 둔각은 ${n(wide)}개입니다.`,
      );
    }
    const d = pick(rng, pool);
    return make(
      unit,
      `${deg(d)}인 각은 예각과 둔각 중 무엇인가?`,
      angleKind(d),
      `${deg(90)}보다 작으면 예각, ${deg(90)}보다 크면 둔각입니다. ` +
        `${deg(d)}는 ${deg(90)}보다 ${d < 90 ? "작으므로 예각" : "크므로 둔각"}입니다.`,
    );
  }

  if (c === "1-2-4") {
    const x = intBetween(rng, 25, 75);
    const y = intBetween(rng, 15, 60);
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        expr(`${x}^\\circ+${y}^\\circ=\\square`),
        deg(x + y),
        `${expr(`${x}+${y}=${x + y}`)} 이므로 ${deg(x + y)}입니다.`,
      );
    }
    if (kind === 1) {
      const big = Math.max(x, y) + 20;
      const small = Math.min(x, y);
      return make(
        unit,
        expr(`${big}^\\circ-${small}^\\circ=\\square`),
        deg(big - small),
        `${expr(`${big}-${small}=${big - small}`)} 이므로 ${deg(big - small)}입니다.`,
      );
    }
    const gap = intBetween(rng, 3, 12);
    return make(
      unit,
      `각의 크기를 ${deg(x)}쯤으로 어림하고 각도기로 재었더니 ${deg(x + gap)}였습니다. 어림한 각도와 잰 각도의 차는 몇 도인가?`,
      deg(gap),
      `${expr(`${x + gap}-${x}=${gap}`)} 이므로 ${deg(gap)} 차이가 납니다.`,
    );
  }

  if (c === "1-2-5") {
    if (intBetween(rng, 0, 3) === 0) {
      return make(
        unit,
        "삼각형의 세 각의 크기의 합은 몇 도인가?",
        deg(180),
        `삼각형의 세 각을 잘라 한 점에 모으면 직선이 됩니다. 직선이 이루는 각은 ${deg(180)}입니다.`,
      );
    }
    const a = intBetween(rng, 25, 80);
    const b = intBetween(rng, 25, 135 - a);
    const rest = 180 - a - b;
    return make(
      unit,
      `삼각형의 두 각의 크기가 ${deg(a)}, ${deg(b)}입니다. 나머지 한 각의 크기는 몇 도인가?`,
      deg(rest),
      `삼각형의 세 각의 크기의 합은 ${deg(180)}입니다. ${expr(`180-${a}-${b}=${rest}`)}`,
    );
  }

  if (c === "1-2-6") {
    if (intBetween(rng, 0, 3) === 0) {
      return make(
        unit,
        "사각형의 네 각의 크기의 합은 몇 도인가?",
        deg(360),
        `사각형은 대각선으로 삼각형 ${n(2)}개로 나눌 수 있으므로 ${expr("180\\times2=360")} 입니다.`,
      );
    }
    const a = intBetween(rng, 70, 110);
    const b = intBetween(rng, 70, 110);
    const c3 = intBetween(rng, 70, 110);
    const rest = 360 - a - b - c3;
    return make(
      unit,
      `사각형의 세 각의 크기가 ${deg(a)}, ${deg(b)}, ${deg(c3)}입니다. 나머지 한 각의 크기는 몇 도인가?`,
      deg(rest),
      `사각형의 네 각의 크기의 합은 ${deg(360)}입니다. ${expr(`360-${a}-${b}-${c3}=${rest}`)}`,
    );
  }

  return noBranch(unit);
}

/* ──────────── 1-2 난이도 4단 (D-72 확대, 2026-08-23) ────────────
 *
 * 진도 안전이 이 블록의 제약이다: 어림(반올림 류)은 1-3-3 재료, 이등변·외각·다각형
 * 내각은 뒤 단원 재료라 **전부 회피**했다. 1-2-5 심화의 「나머지 두 각이 같다」는
 * 이등변이라는 **이름 없이 조건만** 쓴다. 그림은 기존 kind 만 쓴다 — 1-2-3 응용의
 * `clocks` 하나(시계 읽기는 기학습). 각도기 «0이 아닌 눈금에서 시작한 각»은
 * protractor kind 가 0-기준만 지원하므로 그림 없이 자족적 수치 서술로만 낸다
 * (좌표 일회성 금지 — 팀장 지침 2026-08-23).
 *
 * 각도 값은 전부 0° 초과 180° 미만(합쳐 말하는 중간값도 360° 이하) — 시험이
 * 상한 360 으로 잠근다.
 */

/**
 * **1-2-1 1단 연산 — 벌어진 정도가 곧 크기.** 벌리기/오므리기 판단과 겹침 직접 비교.
 * 표준(변 길이 미신·두 각도 수 비교)과 유형이 다르다.
 */
function tier21Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  // 겹침형은 발문이 두 가지뿐이라 비중을 낮춘다 — 반반이면 변형 8+ 가 안 선다(실측).
  const kind = intBetween(rng, 0, 3);
  if (kind <= 2) {
    const x = intBetween(rng, 20, 160);
    const wantBig = intBetween(rng, 0, 1) === 0;
    return make(
      unit,
      `크기가 ${deg(x)}인 각보다 더 ${wantBig ? "큰" : "작은"} 각을 만들려면 두 변을 ` +
        `더 벌려야 하는가, 더 오므려야 하는가?`,
      wantBig ? "벌려야 한다" : "오므려야 한다",
      `각의 크기는 두 변이 벌어진 정도로 정해집니다. 더 ${wantBig ? "큰" : "작은"} 각을 ` +
        `만들려면 두 변을 더 ${wantBig ? "벌려야" : "오므려야"} 합니다.`,
    );
  }
  const inner = intBetween(rng, 0, 1) === 0 ? "가" : "나";
  const outer = inner === "가" ? "나" : "가";
  return make(
    unit,
    `꼭짓점을 맞추어 두 각을 겹쳤더니 ${outer} 각의 두 변 사이에 ${inner} 각이 꼭 ` +
      `들어갑니다. 두 각 중 더 큰 각은 어느 것인가?`,
    outer,
    `${inner} 각이 ${outer} 각 안에 들어가므로 ${outer} 각의 두 변이 더 많이 벌어져 ` +
      `있습니다. 더 큰 각은 ${outer} 각입니다.`,
  );
}

/** **1-2-1 2단 기본 — 세 각을 스스로 견준다.** 표준은 두 각이다. */
function tier21Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const lo = intBetween(rng, 15, 130);
  const mid = lo + intBetween(rng, 5, 20);
  const hi = mid + intBetween(rng, 5, 20);
  const order = intBetween(rng, 0, 2);
  const shown =
    order === 0 ? [mid, lo, hi] : order === 1 ? [hi, mid, lo] : [lo, hi, mid];
  const wantBig = intBetween(rng, 0, 1) === 0;
  return make(
    unit,
    `세 각의 크기가 ${shown.map((v) => deg(v)).join(", ")}입니다. ` +
      `가장 ${wantBig ? "큰" : "작은"} 각의 크기를 쓰시오.`,
    deg(wantBig ? hi : lo),
    `${expr(`${hi}>${mid}>${lo}`)} 이므로 가장 ${wantBig ? "큰" : "작은"} 각은 ` +
      `${deg(wantBig ? hi : lo)}입니다.`,
  );
}

/**
 * **1-2-1 3단 응용 — 간접 비교(두 단계).** 두 관계를 이어 추론하거나, 관계와 수치를
 * 결합해 알맞은 크기를 고른다.
 */
function tier21Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 2) === 0) {
    const asc = intBetween(rng, 0, 1) === 0;
    const wantBig = intBetween(rng, 0, 1) === 0;
    const chain = asc
      ? "가 각은 나 각보다 크고, 나 각은 다 각보다 큽니다."
      : "가 각은 나 각보다 작고, 나 각은 다 각보다 작습니다.";
    const ans = asc === wantBig ? "가" : "다";
    return make(
      unit,
      `${chain} 세 각 중 가장 ${wantBig ? "큰" : "작은"} 각은 어느 것인가?`,
      ans,
      `두 관계를 이으면 ${asc ? "가 각, 나 각, 다 각의 차례로 작아집니다" : "가 각, 나 각, 다 각의 차례로 커집니다"}. ` +
        `가장 ${wantBig ? "큰" : "작은"} 각은 ${ans} 각입니다.`,
    );
  }
  const x = intBetween(rng, 30, 140);
  const bigger = x + intBetween(rng, 10, 25);
  const smaller = x - intBetween(rng, 10, 25);
  const more = intBetween(rng, 0, 1) === 0;
  const win = more ? bigger : smaller;
  const first = intBetween(rng, 0, 1) === 0 ? bigger : smaller;
  const second = first === bigger ? smaller : bigger;
  return make(
    unit,
    `가 각의 크기는 ${deg(x)}입니다. 나 각은 가 각보다 더 ${more ? "큽니다" : "작습니다"}. ` +
      `${deg(first)}와 ${deg(second)} 중 나 각의 크기로 알맞은 것은 어느 것인가?`,
    deg(win),
    `나 각은 ${deg(x)}보다 ${more ? "커야" : "작아야"} 하므로 ` +
      `${expr(more ? `${win}>${x}` : `${win}<${x}`)} 인 ${deg(win)}입니다.`,
  );
}

/**
 * **1-2-1 4단 심화 — 범위 조건 조합.** 경계 두 개를 동시에 만족하는 각을 센다.
 * 경계는 후보 값에서 고른다 — «사이에 드는 것»이 있는 쌍만(1-5-3 범위 비교의 그 규칙).
 */
function tier21Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const c1 = intBetween(rng, 15, 60);
  const c2 = c1 + intBetween(rng, 10, 25);
  const c3 = c2 + intBetween(rng, 10, 25);
  const c4 = c3 + intBetween(rng, 10, 25);
  const arr = [c1, c2, c3, c4];
  const [loAt, hiAt] = pick(rng, [
    [0, 3],
    [0, 2],
    [1, 3],
  ] as const);
  const loV = arr[loAt]!;
  const hiV = arr[hiAt]!;
  const shown = [...arr];
  for (let i = shown.length - 1; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    [shown[i], shown[j]] = [shown[j]!, shown[i]!];
  }
  const inRange = shown.filter((v) => v > loV && v < hiV);
  return make(
    unit,
    `네 각의 크기가 ${shown.map((v) => deg(v)).join(", ")}입니다. ` +
      `${deg(loV)}보다 크고 ${deg(hiV)}보다 작은 각은 모두 몇 개인가?`,
    n(inRange.length),
    `${deg(loV)}보다 크고 ${deg(hiV)}보다 작은 각은 ${inRange.map((v) => deg(v)).join(", ")}입니다. ` +
      `모두 ${n(inRange.length)}개입니다.`,
  );
}

/**
 * **1-2-2 1단 연산 — 1도의 정의를 곧장 쓴다.** 「1°가 d개 모인 각」 — 표준 ⓪(d°는 1°가
 * 몇 개)의 역방향이고, 직각 상수형을 곁들인다.
 */
function tier22Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 3) <= 2) {
    const d = intBetween(rng, 11, 169);
    return make(
      unit,
      `${deg(1)}가 ${n(d)}개 모인 각의 크기는 몇 도인가?`,
      deg(d),
      `${deg(1)}가 ${n(d)}개 모이면 ${deg(d)}입니다.`,
    );
  }
  return make(
    unit,
    `직각은 ${deg(1)}가 몇 개 모인 각인가?`,
    n(90),
    `직각의 크기는 ${deg(90)}이므로 ${deg(1)}가 ${n(90)}개 모인 각입니다.`,
  );
}

/** **1-2-2 2단 기본 — 등분한 한 각.** 직각·직선을 똑같이 나누는 식을 스스로 세운다. */
function tier22Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const k = pick(rng, [2, 3, 5, 6, 9, 10, 15]);
    return make(
      unit,
      `직각을 똑같이 ${n(k)}개로 나누면 나누어진 한 각의 크기는 몇 도인가?`,
      deg(90 / k),
      `직각은 ${deg(90)}입니다. ${expr(`90\\div${k}=${90 / k}`)} 이므로 ${deg(90 / k)}입니다.`,
    );
  }
  const k = pick(rng, [2, 3, 4, 5, 6, 9, 10, 12, 15]);
  return make(
    unit,
    `직선이 이루는 각을 똑같이 ${n(k)}개로 나누면 나누어진 한 각의 크기는 몇 도인가?`,
    deg(180 / k),
    `직선이 이루는 각은 ${deg(180)}입니다. ${expr(`180\\div${k}=${180 / k}`)} 이므로 ` +
      `${deg(180 / k)}입니다.`,
  );
}

/** **1-2-2 3단 응용 — 등분 조각 m개(두 단계).** 한 각을 구하고 m배 한다. */
function tier22Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const k = pick(rng, [3, 5, 6, 9]);
    const m = intBetween(rng, 2, k - 1);
    const one = 90 / k;
    return make(
      unit,
      `직각을 똑같이 ${n(k)}개로 나눈 것 중 ${n(m)}개를 겹치지 않게 이어 붙인 각의 ` +
        `크기는 몇 도인가?`,
      deg(one * m),
      `${expr(`90\\div${k}=${one}`)} 이므로 나누어진 한 각은 ${deg(one)}입니다. ` +
        `${expr(`${one}\\times${m}=${one * m}`)} 이므로 ${deg(one * m)}입니다.`,
    );
  }
  const k = pick(rng, [4, 5, 6, 9]);
  const m = intBetween(rng, 2, k - 1);
  const one = 180 / k;
  return make(
    unit,
    `직선이 이루는 각을 똑같이 ${n(k)}개로 나눈 것 중 ${n(m)}개를 겹치지 않게 이어 ` +
      `붙인 각의 크기는 몇 도인가?`,
    deg(one * m),
    `직선이 이루는 각은 ${deg(180)}이므로 ${expr(`180\\div${k}=${one}`)} 에서 한 각은 ` +
      `${deg(one)}입니다. ${expr(`${one}\\times${m}=${one * m}`)} 이므로 ${deg(one * m)}입니다.`,
  );
}

/**
 * **1-2-2 4단 심화 — 역산.** 등분 수를 되짚거나, 각도기 눈금을 되짚는다.
 * 눈금 유형은 수가 전부 발문에 있어 그림 없이 자족적이다(블록 머리말).
 */
function tier22Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const k = pick(rng, [2, 3, 5, 6, 9, 10]);
    const d = 90 / k;
    return make(
      unit,
      `직각을 똑같이 몇 개로 나누었더니 나누어진 한 각의 크기가 ${deg(d)}가 되었습니다. ` +
        `몇 개로 나눈 것인가?`,
      n(k),
      `직각은 ${deg(90)}입니다. ${expr(`90\\div${d}=${k}`)} 이므로 ${n(k)}개로 나눈 것입니다.`,
    );
  }
  const a = pick(rng, [10, 20, 30, 40, 50]);
  const d = pick(rng, [25, 35, 40, 55, 65, 70, 85, 95, 110, 125]);
  return make(
    unit,
    `각도기로 각을 잴 때 각의 한 변이 눈금 ${josaNum(a, "을", "를")} 가리키고 있습니다. ` +
      `각의 크기가 ${deg(d)}라면 같은 쪽 눈금에서 다른 변이 가리키는 눈금은 얼마인가?`,
    n(a + d),
    `한 변의 눈금에서 각의 크기만큼 나아간 눈금이므로 ${expr(`${a}+${d}=${a + d}`)} 입니다.`,
  );
}

/** **1-2-3 1단 연산 — 직각과 한 번 견준다.** 예각·둔각 이름은 표준 ①의 몫이다. */
function tier23Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const pool = [
    15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115, 125, 135, 145, 155, 165,
  ];
  const d = pick(rng, pool);
  return make(
    unit,
    `크기가 ${deg(d)}인 각은 직각보다 큰가, 작은가?`,
    d > 90 ? "크다" : "작다",
    `직각은 ${deg(90)}입니다. ${expr(d > 90 ? `${d}>90` : `${d}<90`)} 이므로 ` +
      `${deg(d)}인 각은 직각보다 ${d > 90 ? "큽니다" : "작습니다"}.`,
  );
}

/**
 * **1-2-3 2단 기본 — 스스로 갈라 예각만 나열한다.** 표준 ⓪(둔각 개수 세기)과 답의
 * 꼴이 다르다(나열).
 */
function tier23Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const acutePool = [15, 25, 35, 45, 55, 65, 75, 85];
  const obtusePool = [95, 105, 115, 125, 135, 145, 155, 165];
  const nAcute = intBetween(rng, 1, 3);
  const four = [
    ...pickDistinct(rng, acutePool, nAcute),
    ...pickDistinct(rng, obtusePool, 4 - nAcute),
  ];
  for (let i = four.length - 1; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    [four[i], four[j]] = [four[j]!, four[i]!];
  }
  const acute = four.filter((v) => v < 90);
  return make(
    unit,
    `네 각의 크기가 ${four.map((v) => deg(v)).join(", ")}입니다. 이 중에서 예각을 ` +
      `모두 찾아 쓰시오.`,
    acute.map((v) => deg(v)).join(", "),
    `${deg(90)}보다 작은 각이 예각이므로 ${acute.map((v) => deg(v)).join(", ")}입니다.`,
  );
}

/**
 * **1-2-3 3단 응용 — 시계와 결합(두 단계).** 정각의 두 바늘 사이 각을 칸 수로 구해
 * 분류하거나, 두 시각의 각을 견준다. 시계 읽기는 기학습이라 진도 안전.
 */
function tier23Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const HOURS = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11];
  const cells = (h: number) => Math.min(h, 12 - h);
  if (intBetween(rng, 0, 1) === 0) {
    const h = pick(rng, HOURS);
    const angle2 = 30 * cells(h);
    return make(
      unit,
      `시계가 ${n(h)}시를 가리킬 때 긴바늘과 짧은바늘이 이루는 작은 쪽 각은 ` +
        `예각, 직각, 둔각 중 무엇인가?`,
      angleKind(angle2),
      `시계의 큰 눈금 한 칸의 각도는 ${expr("360\\div12=30")} 에서 ${deg(30)}입니다. ` +
        `${n(h)}시에는 두 바늘 사이가 ${n(cells(h))}칸이므로 ` +
        `${expr(`30\\times${cells(h)}=${angle2}`)} 이고, ${deg(angle2)}는 ${angleKind(angle2)}입니다.`,
      fig("clocks", { items: [{ hour: h, minute: 0 }] }),
    );
  }
  const h1 = pick(rng, HOURS);
  const h2 = pick(
    rng,
    HOURS.filter((h) => cells(h) !== cells(h1)),
  );
  const win = cells(h1) > cells(h2) ? h1 : h2;
  return make(
    unit,
    `${n(h1)}시와 ${n(h2)}시 중 긴바늘과 짧은바늘이 이루는 작은 쪽 각이 더 큰 시각은 ` +
      `언제인가?`,
    `${n(win)}시`,
    `두 바늘 사이는 ${n(h1)}시에 ${n(cells(h1))}칸, ${n(h2)}시에 ${n(cells(h2))}칸입니다. ` +
      `한 칸의 각도가 같으므로 칸이 더 많은 ${n(win)}시의 각이 더 큽니다.`,
    fig("clocks", {
      items: [
        { hour: h1, minute: 0 },
        { hour: h2, minute: 0 },
      ],
    }),
  );
}

/** **1-2-3 4단 심화 — 분류 조건과 수치 조건을 동시에.** 「예각이면서 t°보다 큰 각」. */
function tier23Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const t = pick(rng, [40, 50, 60]);
  const sure = t + pick(rng, [5, 15, 25]);
  const low = intBetween(rng, 15, t - 5);
  const high1 = intBetween(rng, 95, 165);
  const extra =
    intBetween(rng, 0, 1) === 0
      ? intBetween(rng, t + 1, 85)
      : intBetween(rng, 95, 165);
  const four = [sure, low, high1, extra];
  for (let i = four.length - 1; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    [four[i], four[j]] = [four[j]!, four[i]!];
  }
  const hit = four.filter((v) => v < 90 && v > t);
  return make(
    unit,
    `네 각의 크기가 ${four.map((v) => deg(v)).join(", ")}입니다. 예각이면서 ` +
      `${deg(t)}보다 큰 각은 모두 몇 개인가?`,
    n(hit.length),
    `예각은 ${deg(90)}보다 작은 각입니다. 예각이면서 ${deg(t)}보다 큰 각은 ` +
      `${hit.map((v) => deg(v)).join(", ")}이므로 모두 ${n(hit.length)}개입니다.`,
  );
}

/** **1-2-4 1단 연산 — 이어 붙인 두 각(합 한 번).** 표준의 맨 식과 표면을 갈랐다. */
function tier24Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 25, 75);
  const y = intBetween(rng, 15, 60);
  return make(
    unit,
    `두 각 ${deg(x)}와 ${deg(y)}를 겹치지 않게 이어 붙인 각의 크기는 몇 도인가?`,
    deg(x + y),
    `이어 붙인 각의 크기는 두 각의 크기의 합입니다. ${expr(`${x}+${y}=${x + y}`)} 이므로 ` +
      `${deg(x + y)}입니다.`,
  );
}

/** **1-2-4 2단 기본 — 직각·직선을 채우는 각.** 기준각을 스스로 떠올려 식을 세운다. */
function tier24Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const x = intBetween(rng, 15, 75);
    return make(
      unit,
      `${deg(x)}와 더하면 직각이 되는 각도는 몇 도인가?`,
      deg(90 - x),
      `직각은 ${deg(90)}입니다. ${expr(`90-${x}=${90 - x}`)} 이므로 ${deg(90 - x)}입니다.`,
    );
  }
  const x = intBetween(rng, 25, 155);
  return make(
    unit,
    `${deg(x)}와 더하면 직선이 이루는 각이 되는 각도는 몇 도인가?`,
    deg(180 - x),
    `직선이 이루는 각은 ${deg(180)}입니다. ${expr(`180-${x}=${180 - x}`)} 이므로 ` +
      `${deg(180 - x)}입니다.`,
  );
}

/** **1-2-4 3단 응용 — 합과 차를 잇는 두 단계.** 이어 붙이고 줄이거나, 직선 초과분을 잰다. */
function tier24Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const x = intBetween(rng, 25, 75);
    const y = intBetween(rng, 25, 75);
    const z = intBetween(rng, 15, x + y - 15);
    return make(
      unit,
      `두 각 ${deg(x)}와 ${deg(y)}를 이어 붙인 각에서 ${deg(z)}만큼 줄이면 몇 도가 ` +
        `되는가?`,
      deg(x + y - z),
      `${expr(`${x}+${y}=${x + y}`)} 이고 ${expr(`${x + y}-${z}=${x + y - z}`)} 이므로 ` +
        `${deg(x + y - z)}가 됩니다.`,
    );
  }
  const x = intBetween(rng, 95, 135);
  const y = intBetween(rng, 95, 135);
  return make(
    unit,
    `두 각 ${deg(x)}와 ${deg(y)}를 겹치지 않게 이어 붙인 각은 직선이 이루는 각보다 ` +
      `몇 도 더 큰가?`,
    deg(x + y - 180),
    `${expr(`${x}+${y}=${x + y}`)} 이고 직선이 이루는 각은 ${deg(180)}이므로 ` +
      `${expr(`${x + y}-180=${x + y - 180}`)} 에서 ${deg(x + y - 180)} 더 큽니다.`,
  );
}

/** **1-2-4 4단 심화 — «잘못 계산했더니» 복원(D-72 문형).** 더할 것을 빼거나 그 반대. */
function tier24Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 35, 85);
  const y = intBetween(rng, 15, 30);
  if (intBetween(rng, 0, 1) === 0) {
    const wrong = x - y;
    const right = x + y;
    return make(
      unit,
      `어떤 각도에 ${deg(y)}를 더해야 할 것을 잘못하여 뺐더니 ${deg(wrong)}가 ` +
        `되었습니다. 바르게 계산하면 몇 도인가?`,
      deg(right),
      `${expr(`${wrong}+${y}=${x}`)} 이므로 어떤 각도는 ${deg(x)}입니다. ` +
        `바르게 계산하면 ${expr(`${x}+${y}=${right}`)} 에서 ${deg(right)}입니다.`,
    );
  }
  const wrong = x + y;
  const right = x - y;
  return make(
    unit,
    `어떤 각도에서 ${deg(y)}를 빼야 할 것을 잘못하여 더했더니 ${deg(wrong)}가 ` +
      `되었습니다. 바르게 계산하면 몇 도인가?`,
    deg(right),
    `${expr(`${wrong}-${y}=${x}`)} 이므로 어떤 각도는 ${deg(x)}입니다. ` +
      `바르게 계산하면 ${expr(`${x}-${y}=${right}`)} 에서 ${deg(right)}입니다.`,
  );
}

/** **1-2-5 1단 연산 — 두 각의 «합»에서 나머지 각.** 표준 ①은 두 각을 각각 준다. */
function tier25Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 60, 150);
  return make(
    unit,
    `삼각형에서 두 각의 크기의 합이 ${deg(s)}입니다. 나머지 한 각의 크기는 몇 도인가?`,
    deg(180 - s),
    `삼각형의 세 각의 크기의 합은 ${deg(180)}입니다. ${expr(`180-${s}=${180 - s}`)} 이므로 ` +
      `${deg(180 - s)}입니다.`,
  );
}

/** **1-2-5 2단 기본 — 직각삼각형.** 직각 하나를 스스로 떠올려 식을 세운다. */
function tier25Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 20, 70);
  return make(
    unit,
    `직각삼각형에서 직각이 아닌 두 각 중 한 각의 크기가 ${deg(a)}입니다. ` +
      `나머지 한 각의 크기는 몇 도인가?`,
    deg(90 - a),
    `직각은 ${deg(90)}이고 삼각형의 세 각의 합은 ${deg(180)}이므로 ` +
      `${expr(`180-90-${a}=${90 - a}`)} 입니다.`,
  );
}

/** **1-2-5 3단 응용 — 합을 구해 180°와 견준다(두 단계).** 그릴 수 있는가 판단. */
function tier25Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 30, 70);
  const b = intBetween(rng, 30, 70);
  const valid = intBetween(rng, 0, 1) === 0;
  const c3 = valid
    ? 180 - a - b
    : 180 - a - b + pick(rng, [-30, -20, -10, 10, 20, 30]);
  const sum = a + b + c3;
  return make(
    unit,
    `세 각의 크기가 ${deg(a)}, ${deg(b)}, ${deg(c3)}인 삼각형을 그릴 수 있는가? ` +
      `'예' 또는 '아니요'로 답하시오.`,
    valid ? "예" : "아니요",
    `세 각의 크기의 합을 구하면 ${expr(`${a}+${b}+${c3}=${sum}`)} 입니다. ` +
      `삼각형의 세 각의 크기의 합은 ${deg(180)}${
        valid ? "와 같으므로 그릴 수 있습니다" : "가 아니므로 그릴 수 없습니다"
      }.`,
  );
}

/**
 * **1-2-5 4단 심화 — 조건 조합.** 「나머지 두 각의 크기가 서로 같다」 — 이등변이라는
 * 이름 없이 조건만 쓴다(2-2 진도 전). 세 각이 모두 같은 꼴을 곁들인다.
 */
function tier25Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 3) <= 2) {
    const a = intBetween(rng, 15, 60) * 2;
    const rest = 180 - a;
    return make(
      unit,
      `삼각형의 한 각의 크기는 ${deg(a)}이고, 나머지 두 각의 크기는 서로 같습니다. ` +
        `나머지 한 각의 크기는 몇 도인가?`,
      deg(rest / 2),
      `${expr(`180-${a}=${rest}`)} 이고 두 각의 크기가 같으므로 ` +
        `${expr(`${rest}\\div2=${rest / 2}`)} 입니다.`,
    );
  }
  return make(
    unit,
    `세 각의 크기가 모두 같은 삼각형의 한 각의 크기는 몇 도인가?`,
    deg(60),
    `세 각의 크기가 같으므로 ${expr("180\\div3=60")} 에서 ${deg(60)}입니다.`,
  );
}

/** **1-2-6 1단 연산 — 세 각의 «합»에서 나머지 각.** 1-2-5 연산과 평행(표준도 평행). */
function tier26Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 220, 330);
  return make(
    unit,
    `사각형에서 세 각의 크기의 합이 ${deg(s)}일 때 나머지 한 각의 크기는 몇 도인가?`,
    deg(360 - s),
    `사각형의 네 각의 크기의 합은 ${deg(360)}입니다. ${expr(`360-${s}=${360 - s}`)} 이므로 ` +
      `${deg(360 - s)}입니다.`,
  );
}

/** **1-2-6 2단 기본 — 직각 둘을 스스로 떠올린다.** 1-2-5 기본(직각 하나)과 문형이 다르다. */
function tier26Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const c3 = intBetween(rng, 40, 140);
  return make(
    unit,
    `두 각이 직각인 사각형에서 다른 한 각의 크기가 ${deg(c3)}입니다. ` +
      `나머지 한 각의 크기는 몇 도인가?`,
    deg(180 - c3),
    `직각 두 개의 합은 ${expr("90+90=180")} 이고 사각형의 네 각의 합은 ${deg(360)}이므로 ` +
      `${expr(`360-180-${c3}=${180 - c3}`)} 입니다.`,
  );
}

/**
 * **1-2-6 3단 응용 — 나머지 각을 구해 분류한다(두 단계).** 1-2-5 응용(예/아니요 판단)과
 * 꼴을 갈랐다.
 */
function tier26Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 70, 110);
  const b = intBetween(rng, 70, 110);
  const c3 = intBetween(rng, 70, 110);
  const rest = 360 - a - b - c3;
  return make(
    unit,
    `사각형의 세 각의 크기가 ${deg(a)}, ${deg(b)}, ${deg(c3)}입니다. 나머지 한 각은 ` +
      `예각, 직각, 둔각 중 무엇인가?`,
    angleKind(rest),
    `${expr(`360-${a}-${b}-${c3}=${rest}`)} 이고 ${deg(rest)}는 ${angleKind(rest)}입니다.`,
  );
}

/** **1-2-6 4단 심화 — 조건 조합.** 두 각이 같다는 조건과, 네 각이 모두 같은 꼴. */
function tier26Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 3) <= 2) {
    const a = intBetween(rng, 30, 60) * 2;
    const b = intBetween(rng, 20, 50) * 2;
    const rest = 360 - a - b;
    return make(
      unit,
      `사각형의 두 각의 크기가 ${deg(a)}, ${deg(b)}이고, 나머지 두 각의 크기는 서로 ` +
        `같습니다. 나머지 한 각의 크기는 몇 도인가?`,
      deg(rest / 2),
      `${expr(`360-${a}-${b}=${rest}`)} 이고 두 각의 크기가 같으므로 ` +
        `${expr(`${rest}\\div2=${rest / 2}`)} 입니다.`,
    );
  }
  return make(
    unit,
    `네 각의 크기가 모두 같은 사각형의 한 각의 크기는 몇 도인가?`,
    deg(90),
    `네 각의 크기가 같으므로 ${expr("360\\div4=90")} 에서 ${deg(90)}입니다.`,
  );
}

/* ─────────────────────── 1-3 곱셈과 나눗셈 ─────────────────────── */

function mulDiv(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = code(unit);

  if (c === "1-3-1") {
    const a = intBetween(rng, 123, 897);
    const tens = intBetween(rng, 2, 9);
    const b = tens * 10;
    return make(
      unit,
      expr(`${a}\\times${b}=\\square`),
      n(a * b),
      `${expr(`${a}\\times${tens}=${a * tens}`)} 이므로 ${expr(`${a}\\times${b}=${a * b}`)} 입니다.`,
      fig("columnOp", { top: String(a), op: "×", bottom: String(b) }),
    );
  }

  if (c === "1-3-2") {
    const a = intBetween(rng, 123, 897);
    const b = intBetween(rng, 1, 8) * 10 + intBetween(rng, 1, 9);
    const ones = b % 10;
    const tens = b - ones;
    return make(
      unit,
      expr(`${a}\\times${b}=\\square`),
      n(a * b),
      `${expr(`${a}\\times${tens}=${a * tens}`)}, ${expr(`${a}\\times${ones}=${a * ones}`)} 이므로 ` +
        `${expr(`${a * tens}+${a * ones}=${a * b}`)} 입니다.`,
      fig("columnOp", { top: String(a), op: "×", bottom: String(b) }),
    );
  }

  if (c === "1-3-3") {
    // 어림할 것이 남아 있어야 한다 — 끝자리가 0이면 「$80$을 $80$으로 어림」이 되어 문항이 죽는다.
    const a = intBetween(rng, 1, 8) * 100 + intBetween(rng, 11, 89);
    const b = intBetween(rng, 1, 8) * 10 + intBetween(rng, 1, 9);
    const aa = Math.round(a / 100) * 100;
    const bb = Math.round(b / 10) * 10;
    return make(
      unit,
      // «$…$ 를» 처럼 수식 바로 뒤에 조사를 붙이지 않는다(a42ba6bb 의 g3 1-3-2 와
      // 같은 수리) — 식을 아랫줄로 내려 「다음 곱셈을」로 받는다.
      `다음 곱셈을 어림셈으로 구하려고 합니다. ` +
        `${josaNum(a, "은", "는")} 몇백으로, ${josaNum(b, "은", "는")} 몇십으로 어림하여 곱을 구하시오.\n\n` +
        `${expr(`${a}\\times${b}`)}`,
      n(aa * bb),
      `${josaNum(a, "을", "를")} ${josaNum(aa, "으로", "로")}, ${josaNum(b, "을", "를")} ${josaNum(bb, "으로", "로")} ` +
        `어림하면 ${expr(`${aa}\\times${bb}=${aa * bb}`)} 입니다.`,
    );
  }

  if (c === "1-3-4") {
    const b = intBetween(rng, 2, 9) * 10;
    const q = intBetween(rng, 2, 9);
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        expr(`${b * q}\\div${b}=\\square`),
        n(q),
        `${expr(`${b}\\times${q}=${b * q}`)} 이므로 몫은 ${n(q)}입니다.`,
      );
    }
    const r = intBetween(rng, 1, b - 1);
    const a = b * q + r;
    return make(
      unit,
      `${expr(`${a}\\div${b}`)}의 몫과 나머지를 구하시오.`,
      `몫 ${n(q)}, 나머지 ${n(r)}`,
      `${expr(`${b}\\times${q}=${b * q}`)}, ${expr(`${a}-${b * q}=${r}`)} 이므로 ` +
        `몫은 ${n(q)}, 나머지는 ${n(r)}입니다.`,
    );
  }

  if (c === "1-3-5") {
    // «몇십몇»은 일의 자리가 0이 아니다 — 20·30 이 나오면 이웃 몇십몇으로 보낸다.
    // 실측(수리 전, 씨앗 2000): 146건이 몇십($210\div30$)이었다. 풀 교체가 아니라
    // 사상으로 고친 것은 비위반 씨앗의 출력을 그대로 보존하기 위해서다(전후 대조 최소).
    // 대가로 21·31 이 두 배로 나온다 — 조건 위반보다 싸다.
    // 방식 갈림 기준(팀장 2026-08-23): 조건이 **배타 분류**면 전수 열거 풀(a42ba6bb 의
    // 올림 4분류), **단일 술어**면 이 최소 사상 — 여기는 «일의 자리 ≠ 0» 하나다.
    let b = intBetween(rng, 12, 39);
    if (b % 10 === 0) b += 1;
    const q = intBetween(rng, 3, 9);
    return make(
      unit,
      `${expr(`${b * q}\\div${b}`)}의 몫을 구하시오.`,
      n(q),
      `${expr(`${b}\\times${q}=${b * q}`)} 이므로 몫은 ${n(q)}입니다.`,
    );
  }

  if (c === "1-3-6") {
    // «몇십몇» 약속 — 1-3-5 와 같은 사상(수리 전 실측: 씨앗 2000 중 120건이 20).
    let b = intBetween(rng, 12, 29);
    if (b % 10 === 0) b += 1;
    const q = intBetween(rng, 11, 34);
    const r = intBetween(rng, 1, b - 1);
    const a = b * q + r;
    return make(
      unit,
      `${expr(`${a}\\div${b}`)}의 몫과 나머지를 구하시오.`,
      `몫 ${n(q)}, 나머지 ${n(r)}`,
      `몫의 십의 자리부터 구합니다. ${expr(`${b}\\times${q}=${b * q}`)}, ` +
        `${expr(`${a}-${b * q}=${r}`)} 이므로 몫은 ${n(q)}, 나머지는 ${n(r)}입니다.`,
    );
  }

  if (c === "1-3-7") {
    // 끝자리 0은 뺀다 — 어림해도 그대로면 「몇십으로 어림하라」가 아무 일도 안 한다.
    const b = pick(
      rng,
      [
        17, 18, 19, 21, 22, 23, 24, 26, 27, 28, 29, 31, 32, 33, 34, 36, 37, 38,
        39, 41, 42,
      ],
    );
    const q = intBetween(rng, 6, 19);
    const a = b * q + intBetween(rng, 0, b - 1);
    const bb = Math.round(b / 10) * 10;
    const approx = Math.floor(a / bb);
    return make(
      unit,
      `${expr(`${a}\\div${b}`)}의 몫을 어림하려고 합니다. ${josaNum(b, "을", "를")} 몇십으로 어림하여 몫을 어림하시오.`,
      n(approx),
      `${josaNum(b, "을", "를")} ${josaNum(bb, "으로", "로")} 어림하면 ` +
        `${expr(`${bb}\\times${approx}=${bb * approx}`)} 이므로 몫은 약 ${n(approx)}입니다.`,
    );
  }

  return noBranch(unit);
}

/* ──────────── 1-3 난이도 4단 (D-72 확대, 2026-08-23) ────────────
 *
 * 계산 단원의 모범(g3 초3 1-1)을 따른다: 연산 식 하나 · 기본 문장 · 응용 두 단계
 * (중간값) · 심화 «잘못 계산했더니»·«어떤 수» 역산. 수의 약속은 소단원 이름 그대로 —
 * (세 자리)·(몇십)·(몇십몇)·몫 자리 수 — 시험이 표준까지 같은 잣대로 잠근다.
 * 규모는 소단원 띠 안(SCALE_CAP): 곱 다섯 자리 상한 9만, 1-3-4 심화의 «잘못 곱한»
 * 값만 b≤50·q≤9 로 눌러 2.5만 아래.
 */

/** 두 자리 수의 십·일 자리 숫자를 바꾼다 — «자리 바꿔 잘못 계산» 심화용. */
function swapDigits(v: number): number {
  return (v % 10) * 10 + Math.floor(v / 10);
}

/** 1-3-1 기본 문장의 소재 — 상자·묶음으로 세는 것. */
const MUL_ITEMS = [
  { obj: "연필", cnt: "자루", box: "상자" },
  { obj: "구슬", cnt: "개", box: "봉지" },
  { obj: "사탕", cnt: "개", box: "통" },
] as const;

/** **1-3-1 1단 연산 — a의 b배(식 하나).** 표준의 맨 세로셈(`=\square`)과 표면이 다르다. */
function tier31Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 123, 897);
  const b = intBetween(rng, 2, 9) * 10;
  return make(
    unit,
    `${josaNum(a, "의", "의")} ${n(b)}배는 얼마인가?`,
    n(a * b),
    `${expr(`${a}\\times${b}=${a * b}`)} 입니다.`,
  );
}

/** **1-3-1 2단 기본 — «씩 b상자» 문장.** 식을 스스로 세운다. */
function tier31Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const t = pick(rng, MUL_ITEMS);
  const a = intBetween(rng, 123, 897);
  const b = intBetween(rng, 2, 9) * 10;
  return make(
    unit,
    `한 ${t.box}에 ${n(a)}${t.cnt}씩 들어 있는 ${josa(t.obj, "이", "가")} ` +
      `${n(b)}${t.box} 있습니다. ${josa(t.obj, "은", "는")} 모두 몇 ${t.cnt}인가?`,
    `${n(a * b)}${t.cnt}`,
    `${expr(`${a}\\times${b}=${a * b}`)} 이므로 모두 ${n(a * b)}${t.cnt}입니다.`,
  );
}

/** **1-3-1 3단 응용 — 사고 남은 돈(두 단계).** 곱을 구하고 낸 돈에서 뺀다. */
function tier31Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 123, 897);
  const b = intBetween(rng, 2, 9) * 10;
  const total = a * b;
  const pay = (Math.floor(total / 10000) + 1) * 10000;
  return make(
    unit,
    `한 개에 ${n(a)}원인 물건을 ${n(b)}개 사고 ${n(pay)}원을 냈습니다. ` +
      `거스름돈은 얼마인가?`,
    `${n(pay - total)}원`,
    `물건값은 ${expr(`${a}\\times${b}=${total}`)} 원입니다. ` +
      `${expr(`${pay}-${total}=${pay - total}`)} 이므로 거스름돈은 ${n(pay - total)}원입니다.`,
  );
}

/** **1-3-1 4단 심화 — «곱해야 할 것을 더했더니» 복원(D-72 문형).** */
function tier31Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 123, 897);
  const b = intBetween(rng, 2, 9) * 10;
  const wrong = x + b;
  return make(
    unit,
    `어떤 수에 ${josaNum(b, "을", "를")} 곱해야 할 것을 잘못하여 더했더니 ` +
      `${josaNum(wrong, "이", "가")} 되었습니다. 바르게 계산하면 얼마인가?`,
    n(x * b),
    `${expr(`${wrong}-${b}=${x}`)} 이므로 어떤 수는 ${n(x)}입니다. ` +
      `바르게 계산하면 ${expr(`${x}\\times${b}=${x * b}`)} 입니다.`,
  );
}

/** 표준 1-3-2 와 같은 «두 자리 수» — 일의 자리가 0이 아니다(그건 1-3-1 의 몫). */
function twoDigit(rng: Rng): number {
  return intBetween(rng, 1, 8) * 10 + intBetween(rng, 1, 9);
}

/** **1-3-2 1단 연산 — 덧셈을 곱셈으로.** 1-3-1 연산(배)과 표면을 갈랐다. */
function tier32Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 123, 897);
  const b = twoDigit(rng);
  return make(
    unit,
    `${josaNum(a, "을", "를")} ${n(b)}번 더한 수를 곱셈식으로 구하시오.`,
    n(a * b),
    `같은 수를 여러 번 더한 것은 곱셈으로 나타냅니다. ${expr(`${a}\\times${b}=${a * b}`)} 입니다.`,
  );
}

/** **1-3-2 2단 기본 — 하루 a개씩 b일 문장.** */
function tier32Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 123, 897);
  const b = twoDigit(rng);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `공장에서 하루에 인형을 ${n(a)}개씩 만듭니다. ${n(b)}일 동안 만드는 인형은 ` +
        `모두 몇 개인가?`,
      `${n(a * b)}개`,
      `${expr(`${a}\\times${b}=${a * b}`)} 이므로 모두 ${n(a * b)}개입니다.`,
    );
  }
  return make(
    unit,
    `종이학을 하루에 ${n(a)}개씩 ${n(b)}일 동안 접으면 종이학은 모두 몇 개가 되는가?`,
    `${n(a * b)}개`,
    `${expr(`${a}\\times${b}=${a * b}`)} 이므로 모두 ${n(a * b)}개입니다.`,
  );
}

/** **1-3-2 3단 응용 — 곱하고 덜어 내는 두 단계.** */
function tier32Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 123, 897);
  const b = twoDigit(rng);
  const k = intBetween(rng, 111, 899);
  const total = a * b;
  return make(
    unit,
    `한 상자에 ${n(a)}개씩 들어 있는 클립 ${n(b)}상자에서 클립 ${n(k)}개를 ` +
      `사용했습니다. 남은 클립은 몇 개인가?`,
    `${n(total - k)}개`,
    `클립은 모두 ${expr(`${a}\\times${b}=${total}`)} 개입니다. ` +
      `${expr(`${total}-${k}=${total - k}`)} 이므로 ${n(total - k)}개가 남습니다.`,
  );
}

/**
 * **1-3-2 4단 심화 — 자리 바꾼 수로 잘못 곱한 복원.** 십·일의 자리를 바꾼 수(47↔74)로
 * 곱했다 — 되짚기는 나눗셈이 아니라 **곱셈 사실**로 보인다(다섯 자리 나눗셈을 지면에
 * 세우지 않는다).
 */
function tier32Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 123, 897);
  const tens = intBetween(rng, 1, 8);
  let ones = intBetween(rng, 1, 9);
  if (ones === tens) ones = ones === 9 ? 1 : ones + 1;
  const b = tens * 10 + ones;
  const bs = swapDigits(b);
  const wrong = x * bs;
  return make(
    unit,
    `어떤 수에 ${josaNum(b, "을", "를")} 곱해야 할 것을 잘못하여 십의 자리와 일의 자리 ` +
      `숫자를 바꾼 ${josaNum(bs, "을", "를")} 곱했더니 ${josaNum(wrong, "이", "가")} ` +
      `되었습니다. 바르게 계산하면 얼마인가?`,
    n(x * b),
    `${josaNum(bs, "을", "를")} 곱하여 ${josaNum(wrong, "이", "가")} 되는 수를 찾으면 ` +
      `${expr(`${bs}\\times${x}=${wrong}`)} 에서 어떤 수는 ${n(x)}입니다. ` +
      `바르게 계산하면 ${expr(`${x}\\times${b}=${x * b}`)} 입니다.`,
  );
}

/** 어림용 세 자리 수 — 끝 두 자리가 50(반올림 경계)도 0(이미 몇백)도 아니다. */
function roughA(rng: Rng): number {
  let r = intBetween(rng, 11, 88);
  if (r >= 50) r += 1;
  return intBetween(rng, 1, 8) * 100 + r;
}

/** **1-3-3 1단 연산 — 몇백에 가장 가까운가.** 어림 한 번. */
function tier33Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = roughA(rng);
  const lo = Math.floor(a / 100) * 100;
  const hi = lo + 100;
  const aa = Math.round(a / 100) * 100;
  return make(
    unit,
    `${josaNum(a, "은", "는")} 몇백에 가장 가까운가?`,
    n(aa),
    `${josaNum(a, "은", "는")} ${josaNum(lo, "과", "와")} ${n(hi)} 사이의 수이며 ` +
      `${n(aa)}에 더 가깝습니다.`,
  );
}

/** **1-3-3 2단 기본 — 문장 속 어림 곱.** 표준(맨 지시문)과 달리 맥락이 있다. */
function tier33Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = roughA(rng);
  const b = twoDigit(rng);
  const aa = Math.round(a / 100) * 100;
  const bb = Math.round(b / 10) * 10;
  return make(
    unit,
    `학생 ${n(b)}명에게 ${n(a)}원짜리 공책을 한 권씩 사 주려고 합니다. 필요한 돈은 ` +
      `약 얼마인지 ${josaNum(a, "은", "는")} 몇백으로, ${josaNum(b, "은", "는")} 몇십으로 ` +
      `어림하여 구하시오.`,
    `약 ${n(aa * bb)}원`,
    `${josaNum(a, "을", "를")} ${roJosa(aa)}, ${josaNum(b, "을", "를")} ${roJosa(bb)} 어림하면 ` +
      `${expr(`${aa}\\times${bb}=${aa * bb}`)} 이므로 약 ${n(aa * bb)}원입니다.`,
  );
}

/** **1-3-3 3단 응용 — 어림한 곱과 실제 곱의 차(두 단계).** */
function tier33Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = roughA(rng);
  const b = twoDigit(rng);
  const aa = Math.round(a / 100) * 100;
  const bb = Math.round(b / 10) * 10;
  const est = aa * bb;
  const act = a * b;
  const hiV = Math.max(est, act);
  const loV = Math.min(est, act);
  return make(
    unit,
    `다음 곱셈에서 ${josaNum(a, "은", "는")} 몇백으로, ${josaNum(b, "은", "는")} 몇십으로 ` +
      `어림하여 구한 곱과 실제로 계산한 곱의 차를 구하시오.\n\n${expr(`${a}\\times${b}`)}`,
    n(hiV - loV),
    `어림한 곱은 ${expr(`${aa}\\times${bb}=${est}`)} 이고 실제 곱은 ` +
      `${expr(`${a}\\times${b}=${act}`)} 입니다. ${expr(`${hiV}-${loV}=${hiV - loV}`)} 입니다.`,
  );
}

/** **1-3-3 4단 심화 — 어림의 원상.** 몇백으로 어림하면 aa 가 되는 수의 끝. */
function tier33Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const aa = intBetween(rng, 2, 9) * 100;
  const wantBig = intBetween(rng, 0, 1) === 0;
  const ans = wantBig ? aa + 49 : aa - 50;
  return make(
    unit,
    `몇백으로 어림하면 ${josaNum(aa, "이", "가")} 되는 세 자리 수 중에서 가장 ` +
      `${wantBig ? "큰" : "작은"} 수를 쓰시오.`,
    n(ans),
    `백의 자리 아래가 ${n(50)} 이상이면 올리고 ${n(50)} 미만이면 버립니다. ` +
      `${josaNum(aa, "이", "가")} 되는 수는 ${n(aa - 50)}부터 ${n(aa + 49)}까지이므로 ` +
      `가장 ${wantBig ? "큰" : "작은"} 수는 ${n(ans)}입니다.`,
  );
}

/** **1-3-4 1단 연산 — b씩 묶으면 몇 묶음.** 나눗셈 한 번. */
function tier34Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 2, 9) * 10;
  const q = intBetween(rng, 2, 9);
  const a = b * q;
  return make(
    unit,
    `${josaNum(a, "을", "를")} ${n(b)}씩 묶으면 몇 묶음이 되는가?`,
    `${n(q)}묶음`,
    `${expr(`${a}\\div${b}=${q}`)} 이므로 ${n(q)}묶음이 됩니다.`,
  );
}

/** **1-3-4 2단 기본 — 나눔 문장.** 딱 떨어지는 것과 남는 것을 다 낸다. */
function tier34Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 2, 9) * 10;
  const q = intBetween(rng, 2, 9);
  if (intBetween(rng, 0, 1) === 0) {
    const a = b * q;
    return make(
      unit,
      `색종이 ${n(a)}장을 한 명에게 ${n(b)}장씩 나누어 주면 몇 명에게 줄 수 있는가?`,
      `${n(q)}명`,
      `${expr(`${a}\\div${b}=${q}`)} 이므로 ${n(q)}명에게 줄 수 있습니다.`,
    );
  }
  const r = intBetween(rng, 1, b - 1);
  const a = b * q + r;
  return make(
    unit,
    `귤 ${n(a)}개를 한 봉지에 ${n(b)}개씩 담으면 몇 봉지가 되고 몇 개가 남는가?`,
    `${n(q)}봉지, ${n(r)}개`,
    `${expr(`${b}\\times${q}=${b * q}`)}, ${expr(`${a}-${b * q}=${r}`)} 이므로 ` +
      `${n(q)}봉지가 되고 ${n(r)}개가 남습니다.`,
  );
}

/** **1-3-4 3단 응용 — 남는 사람도 타야 한다(올림 나눗셈, 두 단계).** */
function tier34Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 2, 4) * 10;
  const q = intBetween(rng, 2, 9);
  const r = intBetween(rng, 1, b - 1);
  const a = b * q + r;
  return make(
    unit,
    `학생 ${n(a)}명이 한 대에 ${n(b)}명씩 버스에 타려고 합니다. 버스는 적어도 ` +
      `몇 대 필요한가?`,
    `${n(q + 1)}대`,
    `${expr(`${b}\\times${q}=${b * q}`)}, ${expr(`${a}-${b * q}=${r}`)} 이므로 ${n(q)}대에 ` +
      `타면 ${n(r)}명이 남습니다. 남은 학생도 타야 하므로 ${expr(`${q}+1=${q + 1}`)} 대가 ` +
      `필요합니다.`,
  );
}

/**
 * **1-3-4 4단 심화 — «나누어야 할 것을 곱했더니» 복원.** 잘못 곱한 값은 커진다 —
 * 규모 띠를 지키려 b≤50·q≤9 로 누른다(블록 머리말).
 */
function tier34Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 2, 5) * 10;
  const q = intBetween(rng, 2, 9);
  const x = b * q;
  const wrong = x * b;
  return make(
    unit,
    `어떤 수를 ${roJosa(b)} 나누어야 할 것을 잘못하여 ${josaNum(b, "을", "를")} ` +
      `곱했더니 ${josaNum(wrong, "이", "가")} 되었습니다. 바르게 계산한 몫을 구하시오.`,
    n(q),
    `${josaNum(b, "을", "를")} 곱하여 ${josaNum(wrong, "이", "가")} 되는 수는 ` +
      `${expr(`${b}\\times${x}=${wrong}`)} 에서 ${n(x)}입니다. ` +
      `바르게 계산하면 ${expr(`${x}\\div${b}=${q}`)} 이므로 몫은 ${n(q)}입니다.`,
  );
}

/** 몇십몇 — 일의 자리가 0이 아닌 12~39. 표준 1-3-5 와 같은 띠다. */
function tensOnes(rng: Rng, maxTens: number): number {
  return intBetween(rng, 1, maxTens) * 10 + intBetween(rng, 1, 9);
}

/** **1-3-5 1단 연산 — 곱셈 빈칸으로 나눗셈 관계 한 번.** */
function tier35Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = tensOnes(rng, 3);
  const q = intBetween(rng, 3, 9);
  const a = b * q;
  return make(
    unit,
    `${expr(`${b}\\times\\square=${a}`)} 에서 ${expr("\\square")} 에 알맞은 수를 구하시오.`,
    n(q),
    `${expr(`${a}\\div${b}=${q}`)} 이므로 ${expr("\\square")} 에 알맞은 수는 ${n(q)}입니다.`,
  );
}

/** **1-3-5 2단 기본 — 색 테이프 자르기 문장.** */
function tier35Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = tensOnes(rng, 3);
  const q = intBetween(rng, 3, 9);
  const a = b * q;
  return make(
    unit,
    `길이가 ${cm(a)}인 색 테이프를 ${cm(b)}씩 자르면 몇 도막이 되는가?`,
    `${n(q)}도막`,
    `${expr(`${a}\\div${b}=${q}`)} 이므로 ${n(q)}도막이 됩니다.`,
  );
}

/** **1-3-5 3단 응용 — 덜어 내고 나누는 두 단계(중간값).** */
function tier35Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = tensOnes(rng, 3);
  const q = intBetween(rng, 3, 9);
  const rest = b * q;
  const k = intBetween(rng, 11, 48);
  const a = rest + k;
  return make(
    unit,
    `구슬 ${n(a)}개 중에서 ${n(k)}개를 동생에게 주고, 남은 구슬을 한 통에 ${n(b)}개씩 ` +
      `담았습니다. 통은 몇 개가 되는가?`,
    `${n(q)}개`,
    `남은 구슬은 ${expr(`${a}-${k}=${rest}`)} 개입니다. ${expr(`${rest}\\div${b}=${q}`)} 이므로 ` +
      `통은 ${n(q)}개가 됩니다.`,
  );
}

/** **1-3-5 4단 심화 — 검산으로 어떤 수 되찾기.** */
function tier35Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = tensOnes(rng, 3);
  const q = intBetween(rng, 3, 9);
  const r = intBetween(rng, 1, b - 1);
  const x = b * q + r;
  return make(
    unit,
    `어떤 수를 ${roJosa(b)} 나누었더니 몫이 ${n(q)}, 나머지가 ${josaNum(r, "이", "가")} ` +
      `되었습니다. 어떤 수를 구하시오.`,
    n(x),
    `검산하면 ${expr(`${b}\\times${q}=${b * q}`)} 이고 ${expr(`${b * q}+${r}=${x}`)} 이므로 ` +
      `어떤 수는 ${n(x)}입니다.`,
  );
}

/** **1-3-6 1단 연산 — 나누어떨어지는 두 자리 몫.** 표준(늘 나머지 있음)과 갈린다. */
function tier36Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = tensOnes(rng, 2);
  const q = intBetween(rng, 11, 34);
  const a = b * q;
  return make(
    unit,
    `${expr(`${a}\\div${b}`)}의 몫을 구하시오.`,
    n(q),
    `몫의 십의 자리부터 구합니다. ${expr(`${b}\\times${q}=${a}`)} 이므로 몫은 ${n(q)}입니다.`,
  );
}

/** **1-3-6 2단 기본 — 봉지 문장(두 자리 몫).** */
function tier36Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = tensOnes(rng, 2);
  const q = intBetween(rng, 11, 34);
  const a = b * q;
  return make(
    unit,
    `사탕 ${n(a)}개를 한 봉지에 ${n(b)}개씩 담으면 몇 봉지가 되는가?`,
    `${n(q)}봉지`,
    `${expr(`${a}\\div${b}=${q}`)} 이므로 ${n(q)}봉지가 됩니다.`,
  );
}

/** **1-3-6 3단 응용 — 다 읽는 데 며칠(올림, 두 단계).** 1-3-4 응용과 소재·틀이 다르다. */
function tier36Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = tensOnes(rng, 2);
  const q = intBetween(rng, 11, 33);
  const r = intBetween(rng, 1, b - 1);
  const a = b * q + r;
  return make(
    unit,
    `동화책 ${n(a)}쪽을 하루에 ${n(b)}쪽씩 읽으면 다 읽는 데 며칠이 걸리는가?`,
    `${n(q + 1)}일`,
    `${expr(`${b}\\times${q}=${b * q}`)}, ${expr(`${a}-${b * q}=${r}`)} 이므로 ${n(q)}일 ` +
      `동안 읽으면 ${n(r)}쪽이 남습니다. 남은 쪽을 읽는 날이 하루 더 필요하므로 ` +
      `${expr(`${q}+1=${q + 1}`)} 일이 걸립니다.`,
  );
}

/** **1-3-6 4단 심화 — 자리 바꾼 수로 잘못 나눈 복원.** 검산으로 되짚어 바르게 나눈다. */
function tier36Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const tens = intBetween(rng, 1, 2);
  let ones = intBetween(rng, 1, 9);
  if (ones === tens) ones = ones === 9 ? 3 : ones + 1;
  const b = tens * 10 + ones;
  const bs = swapDigits(b);
  const q = intBetween(rng, 11, 34);
  let r = intBetween(rng, 1, b - 1);
  // 잘못 나눈 쪽이 나누어떨어지면 «나머지가 $0$» 이 지면에 나간다 — 초등 표현이
  // 아니다(팀장 검수 2026-08-23, 씨앗 3000 중 89건). r 를 한 칸씩 옮겨 피한다.
  // 종료 보장: r 는 1..b-1 을 전부 도는데 그 안의 x 후보가 모두 bs 의 배수일 수는 없다.
  while ((b * q + r) % bs === 0) r = (r % (b - 1)) + 1;
  const x = b * q + r;
  const q2 = Math.floor(x / bs);
  const r2 = x - bs * q2;
  return make(
    unit,
    `어떤 수를 ${roJosa(b)} 나누어야 할 것을 잘못하여 십의 자리와 일의 자리 숫자를 ` +
      `바꾼 ${roJosa(bs)} 나누었더니 몫이 ${n(q2)}, 나머지가 ${josaNum(r2, "이", "가")} ` +
      `되었습니다. 바르게 계산한 몫과 나머지를 구하시오.`,
    `몫 ${n(q)}, 나머지 ${n(r)}`,
    `잘못 나눈 것을 검산하면 어떤 수는 ${expr(`${bs}\\times${q2}=${bs * q2}`)} 에서 ` +
      `${expr(`${bs * q2}+${r2}=${x}`)} 입니다. ${expr(`${b}\\times${q}=${b * q}`)}, ` +
      `${expr(`${x}-${b * q}=${r}`)} 이므로 몫은 ${n(q)}, 나머지는 ${n(r)}입니다.`,
  );
}

/** 표준 1-3-7 과 같은 나누는 수 띠 — 끝자리 0 이 아닌 17~42. */
const DIV_ROUGH_POOL = [
  17, 18, 19, 21, 22, 23, 24, 26, 27, 28, 29, 31, 32, 33, 34, 36, 37, 38, 39,
  41, 42,
] as const;

/** **1-3-7 1단 연산 — 나누는 수를 몇십으로 어림하면.** 1-3-3 연산(몇백)과 문형이 다르다. */
function tier37Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = pick(rng, DIV_ROUGH_POOL);
  const q = intBetween(rng, 6, 19);
  const a = b * q + intBetween(rng, 0, b - 1);
  const bb = Math.round(b / 10) * 10;
  return make(
    unit,
    `다음 나눗셈에서 나누는 수 ${josaNum(b, "을", "를")} 몇십으로 어림하면 얼마인가?\n\n` +
      `${expr(`${a}\\div${b}`)}`,
    n(bb),
    `${josaNum(b, "은", "는")} ${n(bb)}에 가장 가깝습니다.`,
  );
}

/** **1-3-7 2단 기본 — 봉지 수 어림 문장.** */
function tier37Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = pick(rng, DIV_ROUGH_POOL);
  const bb = Math.round(b / 10) * 10;
  const k = intBetween(rng, 6, 19);
  const a = bb * k;
  return make(
    unit,
    `귤 ${n(a)}개를 한 봉지에 ${n(b)}개씩 담으려고 합니다. ${josaNum(b, "을", "를")} ` +
      `몇십으로 어림하여 봉지 수를 어림하시오.`,
    `약 ${n(k)}봉지`,
    `${josaNum(b, "을", "를")} ${roJosa(bb)} 어림하면 ${expr(`${a}\\div${bb}=${k}`)} 이므로 ` +
      `약 ${n(k)}봉지입니다.`,
  );
}

/** **1-3-7 3단 응용 — 두 나눗셈의 어림 몫 비교(두 단계 × 둘).** */
function tier37Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b1 = pick(rng, DIV_ROUGH_POOL);
  const b2 = pick(rng, DIV_ROUGH_POOL);
  const bb1 = Math.round(b1 / 10) * 10;
  const bb2 = Math.round(b2 / 10) * 10;
  const k1 = intBetween(rng, 6, 19);
  let k2 = intBetween(rng, 6, 18);
  if (k2 >= k1) k2 += 1;
  const a1 = bb1 * k1;
  const a2 = bb2 * k2;
  const win = k1 > k2 ? "가" : "나";
  return make(
    unit,
    `두 나눗셈의 나누는 수를 몇십으로 어림하여 몫을 각각 어림했습니다. 어림한 몫이 ` +
      `더 큰 나눗셈의 기호를 쓰시오.\n\n가 ${expr(`${a1}\\div${b1}`)}   나 ${expr(`${a2}\\div${b2}`)}`,
    win,
    `나누는 수를 몇십으로 어림하면 가는 ${expr(`${a1}\\div${bb1}=${k1}`)}, ` +
      `나는 ${expr(`${a2}\\div${bb2}=${k2}`)} 입니다. ` +
      `${expr(k1 > k2 ? `${k1}>${k2}` : `${k2}>${k1}`)} 이므로 어림한 몫이 더 큰 것은 ${win}입니다.`,
  );
}

/**
 * **1-3-7 4단 심화 — 몇십 어림의 원상(두 끝을 다 쓴다 — 1-3-3 심화와 답 꼴 분화)과
 * 경계 판단.** bb 풀이 여덟뿐이라 원상 꼴만으로는 변형이 좁다(실측 6/16) — 경계값
 * (±5·±6)의 «되는가» 판단을 곁들인다.
 */
function tier37Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const bb = intBetween(rng, 2, 9) * 10;
  if (intBetween(rng, 0, 1) === 0) {
    const delta = pick(rng, [-6, -5, 4, 5]);
    const cand = bb + delta;
    const rounded = Math.round(cand / 10) * 10;
    const yes = rounded === bb;
    const up = cand % 10 >= 5;
    return make(
      unit,
      `${josaNum(cand, "은", "는")} 몇십으로 어림하면 ${josaNum(bb, "이", "가")} 되는가? ` +
        `'예' 또는 '아니요'로 답하시오.`,
      yes ? "예" : "아니요",
      `일의 자리 숫자가 ${n(cand % 10)}이므로 ${up ? "올리면" : "버리면"} ${n(rounded)}입니다. ` +
        `${yes ? "그러므로 '예'입니다." : `${josaNum(bb, "이", "가")} 아니므로 '아니요'입니다.`}`,
    );
  }
  return make(
    unit,
    `몇십으로 어림하면 ${josaNum(bb, "이", "가")} 되는 두 자리 수 중에서 가장 작은 수와 ` +
      `가장 큰 수를 차례로 쓰시오.`,
    `${n(bb - 5)}, ${n(bb + 4)}`,
    `십의 자리 아래가 ${n(5)} 이상이면 올리고 ${n(5)} 미만이면 버립니다. ` +
      `${josaNum(bb, "이", "가")} 되는 수는 ${n(bb - 5)}부터 ${n(bb + 4)}까지입니다.`,
  );
}

/* ───────────────────── 1-4 평면도형의 이동 ───────────────────── */

/** 좌우로 뒤집은 것과 위아래로 뒤집은 것이 **다르게** 나오는 조각만 쓴다. */
const MOVE_SHAPES = [
  {
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
    ],
    n: 4,
  },
  {
    cells: [
      [1, 0],
      [1, 1],
      [1, 2],
      [2, 2],
    ],
    n: 4,
  },
  {
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
    ],
    n: 4,
  },
  // ⚠️ 이 자리에 있던 S자 조각([1,1],[2,1],[2,2],[3,2])은 **180° 대칭**이라
  // 이 목록의 약속(좌우 뒤집기 ≠ 위아래 뒤집기)을 스스로 어겼다 — 그 조각으로는
  // 「몇 도 돌렸나」의 90°와 270°도 같은 그림이 되어 기록된 답이 중의적이었다
  // (elem-g4 적발 2026-08-23, 갈래 시험의 비대칭 잠금이 찾았다). 대칭이 하나도 없는
  // P자 조각으로 바꿨다 — 뒤집기 둘·회전 셋·원본이 전부 서로 다르다.
  {
    cells: [
      [1, 1],
      [1, 2],
      [2, 1],
      [2, 2],
      [3, 1],
    ],
    n: 5,
  },
  {
    cells: [
      [0, 2],
      [1, 2],
      [1, 1],
      [2, 1],
      [2, 0],
    ],
    n: 5,
  },
  {
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    n: 4,
  },
] as const;

const TURN_NAME: Record<string, number> = {
  rot90: 90,
  rot180: 180,
  rot270: 270,
};

function move(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = code(unit);

  if (c === "1-4-1") {
    const a = intBetween(rng, 3, 8);
    const b = intBetween(rng, 1, a - 1);
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `모눈에서 점 ㄱ을 왼쪽으로 ${n(a)}칸 옮긴 다음 오른쪽으로 ${n(b)}칸 옮겼습니다. ` +
          `점 ㄱ은 처음 자리에서 어느 쪽으로 몇 칸 옮겨진 것인가?`,
        `왼쪽으로 ${n(a - b)}칸`,
        `${expr(`${a}-${b}=${a - b}`)} 이므로 왼쪽으로 ${n(a - b)}칸 옮겨진 것입니다.`,
      );
    }
    return make(
      unit,
      `모눈에서 점 ㄴ을 위쪽으로 ${n(a)}칸, 오른쪽으로 ${n(b)}칸 옮겼습니다. ` +
        `처음 자리로 되돌아오려면 아래쪽으로 ${n(a)}칸 옮긴 뒤 어느 쪽으로 몇 칸 더 옮겨야 하는가?`,
      `왼쪽으로 ${n(b)}칸`,
      `오른쪽으로 ${n(b)}칸 옮겼으므로 되돌아오려면 왼쪽으로 ${n(b)}칸 옮겨야 합니다.`,
    );
  }

  if (c === "1-4-2") {
    const side = intBetween(rng, 3, 9);
    const dist = intBetween(rng, 2, 8);
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `한 변이 ${cm(side)}인 정사각형을 오른쪽으로 ${cm(dist)} 밀었습니다. 민 도형의 한 변은 몇 cm인가?`,
        cm(side),
        `도형을 밀면 모양과 크기는 변하지 않고 위치만 바뀝니다. 한 변은 그대로 ${cm(side)}입니다.`,
      );
    }
    return make(
      unit,
      `직사각형을 왼쪽으로 ${cm(dist)} 민 다음 다시 오른쪽으로 ${cm(dist)} 밀었습니다. ` +
        `처음 도형과 위치가 같은가? 같으면 '예', 다르면 '아니요'를 쓰시오.`,
      "예",
      `왼쪽으로 ${cm(dist)} 민 것을 오른쪽으로 ${cm(dist)} 다시 밀면 처음 자리로 돌아옵니다.`,
    );
  }

  if (c === "1-4-3") {
    if (intBetween(rng, 0, 2) === 0) {
      const times = intBetween(rng, 2, 7);
      const same = times % 2 === 0;
      return make(
        unit,
        `도형을 위쪽으로 ${n(times)}번 뒤집었습니다. 처음 도형과 모양이 같은가? 같으면 '예', 다르면 '아니요'를 쓰시오.`,
        same ? "예" : "아니요",
        `위쪽으로 ${n(2)}번 뒤집으면 처음 도형과 같아집니다. ${josaNum(times, "은", "는")} ` +
          `${same ? `${n(2)}로 나누어떨어지므로 처음 도형과 같습니다.` : `홀수이므로 ${n(1)}번 뒤집은 것과 같습니다.`}`,
      );
    }
    const shape = pick(rng, MOVE_SHAPES);
    const op = pick(rng, ["flipH", "flipV"] as const);
    return make(
      unit,
      "왼쪽 도형을 뒤집어 오른쪽 도형을 만들었습니다. 어떻게 뒤집은 것인지 쓰시오.",
      op === "flipH" ? "좌우로 뒤집기" : "위아래로 뒤집기",
      op === "flipH"
        ? "색칠한 칸이 왼쪽과 오른쪽이 서로 바뀌었습니다. 좌우로 뒤집은 것입니다."
        : "색칠한 칸이 위쪽과 아래쪽이 서로 바뀌었습니다. 위아래로 뒤집은 것입니다.",
      fig("rotateFlip", { cells: shape.cells, op, n: shape.n }),
    );
  }

  if (c === "1-4-4") {
    const kind = intBetween(rng, 0, 3);
    if (kind === 0) {
      const times = intBetween(rng, 2, 4);
      return make(
        unit,
        `도형을 시계 방향으로 ${deg(90)}씩 ${n(times)}번 돌렸습니다. 모두 몇 도 돌린 것인가?`,
        deg(90 * times),
        `${expr(`90\\times${times}=${90 * times}`)} 이므로 ${deg(90 * times)} 돌린 것입니다.`,
      );
    }
    if (kind === 1) {
      const d = pick(rng, [90, 180, 270]);
      return make(
        unit,
        `도형을 시계 방향으로 ${deg(d)} 돌린 것은 시계 반대 방향으로 몇 도 돌린 것과 같은가?`,
        deg(360 - d),
        `한 바퀴는 ${deg(360)}입니다. ${expr(`360-${d}=${360 - d}`)}`,
      );
    }
    const shape = pick(rng, MOVE_SHAPES);
    const op = pick(rng, ["rot90", "rot180", "rot270"] as const);
    return make(
      unit,
      "왼쪽 도형을 시계 방향으로 돌려 오른쪽 도형을 만들었습니다. 몇 도 돌린 것인가?",
      deg(TURN_NAME[op]!),
      `색칠한 칸의 방향이 시계 방향으로 ${deg(TURN_NAME[op]!)}만큼 돌아갔습니다.`,
      fig("rotateFlip", { cells: shape.cells, op, n: shape.n }),
    );
  }

  return noBranch(unit);
}

/* ──────────── 1-4 난이도 4단 (D-72 확대, 2026-08-23) ────────────
 *
 * 그림은 표준이 쓰는 rotateFlip kind + MOVE_SHAPES 재사용뿐이다(D-61, 새 kind 없음).
 * 돌리기 표기는 표준 규약 그대로 — op(rot90·rot180·rot270)는 **시계 방향**이고,
 * 반시계는 360−d 로만 말한다. 좌표 변환 검산은 시험이 독립 재구현으로 한다.
 * 규모: 수는 전부 1000 아래(90°×11 = 990 이 최대).
 */

/** 네 방향과 그 반대 — «잘못 옮김» 복원용 짝. */
const DIR_PAIRS = [
  ["오른쪽", "왼쪽"],
  ["왼쪽", "오른쪽"],
  ["위쪽", "아래쪽"],
  ["아래쪽", "위쪽"],
] as const;

/** **1-4-1 1단 연산 — 같은 방향으로 두 번(합).** 표준(반대 방향 상쇄)과 방향이 다르다. */
function tier41Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const dir = pick(rng, DIR_PAIRS)[0];
  const a = intBetween(rng, 2, 7);
  const b = intBetween(rng, 2, 7);
  return make(
    unit,
    `모눈에서 점 ㄷ을 ${dir}으로 ${n(a)}칸 옮긴 다음 ${dir}으로 ${n(b)}칸 더 옮겼습니다. ` +
      `점 ㄷ은 처음 자리에서 어느 쪽으로 몇 칸 옮겨진 것인가?`,
    `${dir}으로 ${n(a + b)}칸`,
    `같은 쪽으로 두 번 옮기면 옮긴 칸수를 더합니다. ${expr(`${a}+${b}=${a + b}`)} 이므로 ` +
      `${dir}으로 ${n(a + b)}칸 옮겨진 것입니다.`,
  );
}

/** **1-4-1 2단 기본 — 세로축 상쇄(남는 쪽이 뒤 방향).** 표준은 가로축·앞 방향이 남는다. */
function tier41Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const [first, second] = pick(rng, [
    ["위쪽", "아래쪽"],
    ["아래쪽", "위쪽"],
  ] as const);
  const a = intBetween(rng, 2, 6);
  const b = a + intBetween(rng, 1, 3);
  return make(
    unit,
    `모눈에서 점 ㄹ을 ${first}으로 ${n(a)}칸 옮긴 다음 ${second}으로 ${n(b)}칸 옮겼습니다. ` +
      `점 ㄹ은 처음 자리에서 어느 쪽으로 몇 칸 옮겨진 것인가?`,
    `${second}으로 ${n(b - a)}칸`,
    `${first} ${n(a)}칸과 ${second} ${n(a)}칸은 서로 지워집니다. ` +
      `${expr(`${b}-${a}=${b - a}`)} 이므로 ${second}으로 ${n(b - a)}칸 옮겨진 것입니다.`,
  );
}

/** **1-4-1 3단 응용 — 세 번 이동을 두 축으로 결산(두 단계).** 답이 두 성분이다. */
function tier41Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [h1, h2] = pick(rng, [
    ["오른쪽", "왼쪽"],
    ["왼쪽", "오른쪽"],
  ] as const);
  const v = pick(rng, ["위쪽", "아래쪽"] as const);
  const a = intBetween(rng, 3, 7);
  const b = intBetween(rng, 2, 6);
  const c3 = intBetween(rng, 1, a - 1);
  return make(
    unit,
    `모눈에서 점 ㅁ을 ${h1}으로 ${n(a)}칸, ${v}으로 ${n(b)}칸, ${h2}으로 ${n(c3)}칸 차례로 ` +
      `옮겼습니다. 점 ㅁ은 처음 자리에서 ${h1}으로 몇 칸, ${v}으로 몇 칸 옮겨진 것인가?`,
    `${h1}으로 ${n(a - c3)}칸, ${v}으로 ${n(b)}칸`,
    `가로로는 ${expr(`${a}-${c3}=${a - c3}`)} 에서 ${h1}으로 ${n(a - c3)}칸, ` +
      `세로로는 ${v}으로 ${n(b)}칸 옮겨진 것입니다.`,
  );
}

/** **1-4-1 4단 심화 — «잘못 옮김» 복원(D-72 문형).** 반대로 간 만큼의 두 배가 필요하다. */
function tier41Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [want, did] = pick(rng, DIR_PAIRS);
  const a = intBetween(rng, 2, 7);
  return make(
    unit,
    `모눈에서 점 ㅂ을 ${want}으로 ${n(a)}칸 옮겨야 할 것을 잘못하여 ${did}으로 ${n(a)}칸 ` +
      `옮겼습니다. 바른 자리로 가려면 ${want}으로 몇 칸 옮겨야 하는가?`,
    `${n(2 * a)}칸`,
    `잘못 간 ${n(a)}칸을 되돌아오는 데 ${n(a)}칸, 처음 자리에서 바른 자리까지 ${n(a)}칸이 ` +
      `더 필요합니다. ${expr(`${a}+${a}=${2 * a}`)} 이므로 ${n(2 * a)}칸입니다.`,
  );
}

/** **1-4-2 1단 연산 — 같은 방향으로 이어 밀기(합, cm).** */
function tier42Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const dir = pick(rng, DIR_PAIRS)[0];
  const a = intBetween(rng, 2, 8);
  const b = intBetween(rng, 2, 8);
  return make(
    unit,
    `도형을 ${dir}으로 ${cm(a)} 민 다음 ${dir}으로 ${cm(b)} 더 밀었습니다. ` +
      `도형은 처음 자리에서 ${dir}으로 몇 cm 밀린 것인가?`,
    cm(a + b),
    `같은 쪽으로 이어 밀면 민 거리를 더합니다. ${expr(`${a}+${b}=${a + b}`)} 이므로 ` +
      `${cm(a + b)} 밀린 것입니다.`,
  );
}

/** **1-4-2 2단 기본 — 밀기의 불변 성질.** 직사각형 세로(표준은 정사각형 한 변)와 성질 판단. */
function tier42Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 3) <= 2) {
    const w = intBetween(rng, 3, 9);
    const h = intBetween(rng, 2, w - 1);
    const dir = pick(rng, DIR_PAIRS)[0];
    const dist = intBetween(rng, 2, 8);
    return make(
      unit,
      `가로 ${cm(w)}, 세로 ${cm(h)}인 직사각형을 ${dir}으로 ${cm(dist)} 밀었습니다. ` +
        `민 도형의 세로는 몇 cm인가?`,
      cm(h),
      `도형을 밀어도 모양과 크기는 변하지 않습니다. 세로는 그대로 ${cm(h)}입니다.`,
    );
  }
  return make(
    unit,
    `도형을 밀었을 때 바뀌는 것은 '모양'과 '위치' 중 무엇인가?`,
    "위치",
    `도형을 밀면 모양과 크기는 변하지 않고 위치만 바뀝니다.`,
  );
}

/** **1-4-2 3단 응용 — 왕복의 알짜(두 단계).** 표준 ①은 같은 거리 왕복(«예»)이다. */
function tier42Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [d1, d2] = pick(rng, [
    ["오른쪽", "왼쪽"],
    ["왼쪽", "오른쪽"],
  ] as const);
  const a = intBetween(rng, 5, 9);
  const delta = intBetween(rng, 1, 3) * (intBetween(rng, 0, 1) === 0 ? 1 : -1);
  const b = a + delta;
  const netDir = a > b ? d1 : d2;
  const netDist = Math.abs(a - b);
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return make(
    unit,
    `도형을 ${d1}으로 ${cm(a)} 민 다음 ${d2}으로 ${cm(b)} 밀었습니다. ` +
      `도형은 처음 자리에서 어느 쪽으로 몇 cm 밀린 것과 같은가?`,
    `${netDir}으로 ${cm(netDist)}`,
    `두 방향이 반대이므로 먼 쪽이 남습니다. ${expr(`${hi}-${lo}=${netDist}`)} 이므로 ` +
      `${netDir}으로 ${cm(netDist)} 밀린 것과 같습니다.`,
  );
}

/** **1-4-2 4단 심화 — 잘못 민 방향 복원.** 되돌기와 바른 거리의 합. */
function tier42Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [want, did] = pick(rng, DIR_PAIRS);
  const a = intBetween(rng, 2, 7);
  const b = intBetween(rng, 2, 7);
  return make(
    unit,
    `도형을 ${want}으로 ${cm(a)} 밀어야 할 것을 잘못하여 ${did}으로 ${cm(b)} 밀었습니다. ` +
      `바른 자리로 가려면 ${want}으로 몇 cm 밀어야 하는가?`,
    cm(a + b),
    `잘못 민 ${cm(b)}을 되돌아오고 다시 ${cm(a)}을 더 밀어야 합니다. ` +
      `${expr(`${b}+${a}=${a + b}`)} 이므로 ${cm(a + b)} 밀어야 합니다.`,
  );
}

/** **1-4-3 1단 연산 — 뒤집기의 자리 이동(줄 번호).** 수로 변형이 갈린다. */
function tier43Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const cols = intBetween(rng, 5, 9);
  const k = intBetween(rng, 1, cols);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `가로가 ${n(cols)}칸인 모눈 도형을 좌우로 뒤집었습니다. 왼쪽에서 ${n(k)}번째 세로줄은 ` +
        `뒤집은 도형에서 왼쪽에서 몇 번째 세로줄이 되는가?`,
      `${n(cols + 1 - k)}번째`,
      `좌우로 뒤집으면 왼쪽에서 ${n(k)}번째 줄이 오른쪽에서 ${n(k)}번째 줄이 됩니다. ` +
        `${expr(`${cols}+1-${k}=${cols + 1 - k}`)} 이므로 왼쪽에서 ${n(cols + 1 - k)}번째 줄입니다.`,
    );
  }
  return make(
    unit,
    `세로가 ${n(cols)}칸인 모눈 도형을 위아래로 뒤집었습니다. 위에서 ${n(k)}번째 가로줄은 ` +
      `뒤집은 도형에서 위에서 몇 번째 가로줄이 되는가?`,
    `${n(cols + 1 - k)}번째`,
    `위아래로 뒤집으면 위에서 ${n(k)}번째 줄이 아래에서 ${n(k)}번째 줄이 됩니다. ` +
      `${expr(`${cols}+1-${k}=${cols + 1 - k}`)} 이므로 위에서 ${n(cols + 1 - k)}번째 줄입니다.`,
  );
}

/**
 * **1-4-3 2단 기본 — 그림 판정(예/아니요).** 표준 ①의 열린 «어떻게»와 꼴을 갈랐다.
 * 답의 유일성은 MOVE_SHAPES 의 성질(두 뒤집기 결과가 다름)이 지킨다 — 시험이 잠근다.
 */
function tier43Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const shape = pick(rng, MOVE_SHAPES);
  const op = pick(rng, ["flipH", "flipV"] as const);
  const asked = pick(rng, ["flipH", "flipV"] as const);
  const yes = op === asked;
  const opName = op === "flipH" ? "좌우로" : "위아래로";
  const askedName = asked === "flipH" ? "좌우로" : "위아래로";
  return make(
    unit,
    `왼쪽 도형을 한 번 뒤집어 오른쪽 도형을 만들었습니다. ${askedName} 뒤집은 것인가? ` +
      `'예' 또는 '아니요'로 답하시오.`,
    yes ? "예" : "아니요",
    `색칠한 칸이 ${op === "flipH" ? "왼쪽과 오른쪽" : "위쪽과 아래쪽"}이 서로 바뀌었으므로 ` +
      `${opName} 뒤집은 것입니다. ${yes ? "그러므로 '예'입니다." : "그러므로 '아니요'입니다."}`,
    fig("rotateFlip", { cells: shape.cells, op, n: shape.n }),
  );
}

/** **1-4-3 3단 응용 — 두 축의 홀짝 결산.** 답이 네 갈래로 갈린다. */
function tier43Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const t1 = intBetween(rng, 1, 4);
  const t2 = intBetween(rng, 1, 4);
  const h = t1 % 2 === 1;
  const v = t2 % 2 === 1;
  const answer =
    h && v
      ? `시계 방향으로 ${deg(180)} 돌린 도형과 같다`
      : h
        ? "좌우로 한 번 뒤집은 도형과 같다"
        : v
          ? "위아래로 한 번 뒤집은 도형과 같다"
          : "처음 도형과 같다";
  const tailNote =
    h && v
      ? ` 좌우와 위아래를 한 번씩 뒤집은 것은 시계 방향으로 ${deg(180)} 돌린 것과 같습니다.`
      : "";
  return make(
    unit,
    `도형을 좌우로 ${n(t1)}번, 위아래로 ${n(t2)}번 뒤집었습니다. 그 결과는 처음 도형을 ` +
      `어떻게 움직인 도형과 같은지 쓰시오.`,
    answer,
    `같은 방향으로 ${n(2)}번 뒤집으면 처음 도형과 같습니다. 좌우 ${josaNum(t1, "은", "는")} ` +
      `${h ? "홀수라 한 번 뒤집은 것과 같고" : "짝수라 뒤집지 않은 것과 같고"}, ` +
      `위아래 ${josaNum(t2, "은", "는")} ${v ? "홀수라 한 번 뒤집은 것과 같습니다." : "짝수라 뒤집지 않은 것과 같습니다."}` +
      `${tailNote} 그러므로 ${answer.replace(/다$/, "습니다")}.`,
  );
}

/** **1-4-3 4단 심화 — 짝수 조건 역산.** 범위 안의 유일한 2의 배수를 찾는다. */
function tier43Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const axis = pick(rng, ["좌우로", "위아래로"] as const);
  const ans = intBetween(rng, 2, 6) * 2;
  const width = pick(rng, [1, 2]);
  const lo = ans - width;
  const hi = ans + width;
  return make(
    unit,
    `도형을 ${axis} 몇 번 뒤집었더니 처음 도형과 같았습니다. 뒤집은 횟수가 ${n(lo)}번보다 ` +
      `많고 ${n(hi)}번보다 적다면 몇 번 뒤집은 것인가?`,
    `${n(ans)}번`,
    `같은 방향으로 ${n(2)}번 뒤집으면 처음 도형과 같으므로 횟수는 ${n(2)}의 배수입니다. ` +
      `${n(lo)}번보다 많고 ${n(hi)}번보다 적은 ${n(2)}의 배수는 ${n(ans)}뿐입니다.`,
  );
}

/** **1-4-4 1단 연산 — 여러 번 돌리기를 한 바퀴로 접기.** 표준 ⓪(합)과 달리 남는 각을 묻는다. */
function tier44Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  // 4의 배수면 답이 0°(처음 그대로)가 된다 — 빼고 뽑는다. 값이 여섯뿐이면 변형 8+ 가
  // 안 서서(실측 6/16) 열다섯까지 넓혔다. 최대 90×15=1350 — 규모 시험의 상한 근거.
  const t = pick(rng, [5, 6, 7, 9, 10, 11, 13, 14, 15]);
  const total = 90 * t;
  const ans = total % 360;
  const whole = total - ans;
  return make(
    unit,
    intBetween(rng, 0, 1) === 0
      ? `도형을 시계 방향으로 ${deg(90)}씩 ${n(t)}번 돌렸습니다. 시계 방향으로 몇 도 돌린 ` +
          `것과 같은가?`
      : `시계 방향으로 ${deg(90)}씩 ${n(t)}번 돌린 도형과 같은 도형을 한 번에 만들려면 ` +
          `시계 방향으로 몇 도 돌리면 되는가?`,
    deg(ans),
    `${expr(`90\\times${t}=${total}`)} 입니다. 한 바퀴(${deg(360)})를 돌면 처음과 같으므로 ` +
      `${expr(`${total}-${whole}=${ans}`)} 에서 ${deg(ans)} 돌린 것과 같습니다.`,
  );
}

/**
 * **1-4-4 2단 기본 — 그림을 반시계로 읽기.** 표준 ②는 시계 방향을 묻는다.
 * op 는 표준 규약 그대로 시계 방향이고, 반시계 각은 360−d 다.
 */
function tier44Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const shape = pick(rng, MOVE_SHAPES);
  const op = pick(rng, ["rot90", "rot180", "rot270"] as const);
  const cw = TURN_NAME[op]!;
  const ccw = 360 - cw;
  // 발문 문형을 두 벌로 갈랐다 — 그림 갈래라 변형은 그림에 살지만, R9(씨앗마다 같은
  // 발문 금지)는 발문 자체가 갈려야 한다(팀장 신호 2026-08-23).
  return make(
    unit,
    intBetween(rng, 0, 1) === 0
      ? `왼쪽 도형을 시계 반대 방향으로 돌려 오른쪽 도형을 만들었습니다. 시계 반대 방향으로 ` +
          `몇 도 돌린 것인가?`
      : `오른쪽 도형은 왼쪽 도형을 시계 반대 방향으로 돌린 것입니다. 몇 도 돌린 것인지 구하시오.`,
    deg(ccw),
    `이 도형은 시계 방향으로 ${deg(cw)} 돌린 것과 같습니다. 시계 반대 방향으로는 ` +
      `${expr(`360-${cw}=${ccw}`)} 에서 ${deg(ccw)} 돌린 것입니다.`,
    fig("rotateFlip", { cells: shape.cells, op, n: shape.n }),
  );
}

/** **1-4-4 3단 응용 — 두 번 돌리기의 알짜(두 단계).** 반대 방향은 그만큼 되돌린다. */
function tier44Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const ROT = [90, 180, 270] as const;
  if (intBetween(rng, 0, 1) === 0) {
    const d1 = pick(rng, ROT);
    const d2 = pick(
      rng,
      ROT.filter((d) => d !== d1),
    );
    const ans = (d1 - d2 + 360) % 360;
    return make(
      unit,
      `도형을 시계 방향으로 ${deg(d1)} 돌린 다음 시계 반대 방향으로 ${deg(d2)} 돌렸습니다. ` +
        `처음 도형을 시계 방향으로 몇 도 돌린 것과 같은가?`,
      deg(ans),
      `반대 방향 돌리기는 그만큼 되돌리는 것입니다. ` +
        `${d1 > d2 ? expr(`${d1}-${d2}=${ans}`) : `${expr(`${d2}-${d1}=${d2 - d1}`)} 만큼 시계 반대 방향이 남고, 이는 시계 방향 ${expr(`360-${d2 - d1}=${ans}`)}`} 이므로 ` +
        `시계 방향으로 ${deg(ans)} 돌린 것과 같습니다.`,
    );
  }
  const d1 = pick(rng, ROT);
  const d2 = pick(
    rng,
    ROT.filter((d) => (d1 + d) % 360 !== 0),
  );
  const ans = (d1 + d2) % 360;
  return make(
    unit,
    `도형을 시계 방향으로 ${deg(d1)} 돌린 다음 다시 시계 방향으로 ${deg(d2)} 돌렸습니다. ` +
      `처음 도형을 시계 방향으로 몇 도 돌린 것과 같은가?`,
    deg(ans),
    `같은 방향으로 이어 돌리면 두 각을 더합니다. ${expr(`${d1}+${d2}=${d1 + d2}`)} 이고 ` +
      `${d1 + d2 > 360 ? `한 바퀴(${deg(360)})를 덜어 내면 ${expr(`${d1 + d2}-360=${ans}`)} 에서 ` : ""}` +
      `${deg(ans)} 돌린 것과 같습니다.`,
  );
}

/** **1-4-4 4단 심화 — 되돌리기 역산과 4의 배수 조건.** */
function tier44Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const d = pick(rng, [90, 180, 270] as const);
    return make(
      unit,
      `어떤 도형을 시계 방향으로 ${deg(d)} 돌렸더니 가 도형이 되었습니다. 가 도형을 시계 ` +
        `방향으로 몇 도 돌리면 처음 도형이 되는가?`,
      deg(360 - d),
      `한 바퀴(${deg(360)})를 돌면 처음 도형과 같습니다. ${expr(`360-${d}=${360 - d}`)} 이므로 ` +
        `시계 방향으로 ${deg(360 - d)} 돌리면 처음 도형이 됩니다.`,
    );
  }
  const ans = intBetween(rng, 2, 5) * 4;
  const width = pick(rng, [1, 2]);
  const lo = ans - width;
  const hi = ans + width;
  return make(
    unit,
    `도형을 시계 방향으로 ${deg(90)}씩 몇 번 돌렸더니 처음 도형과 같았습니다. 돌린 횟수가 ` +
      `${n(lo)}번보다 많고 ${n(hi)}번보다 적다면 몇 번 돌린 것인가?`,
    `${n(ans)}번`,
    `${deg(90)}씩 ${n(4)}번 돌리면 한 바퀴가 되어 처음 도형과 같으므로 횟수는 ${n(4)}의 ` +
      `배수입니다. ${n(lo)}번보다 많고 ${n(hi)}번보다 적은 ${n(4)}의 배수는 ${n(ans)}뿐입니다.`,
  );
}

/* ───────────────────────── 1-5 막대그래프 ─────────────────────────
 *
 * ## 엔진이 못 해서 **미뤄 둔 것 셋** (2026-08-22) · 그리고 **설계 과제 하나**
 *
 * ⑴~⑶ 은 「우리가 안 하는 것」이 아니라 **「그림 엔진이 아직 못 하는 것」**이다.
 * 조건이 풀리면 되살린다. 되살리는 법까지 여기 적는다 — 「나중에」만 적으면
 * 다음 사람은 무엇을 해야 하는지 모른다.
 *
 * **⑷ 는 성격이 다르다** — 엔진 한계가 아니라 **나눔 규칙의 설계 과제**다.
 * 엔진이 풀린다고 저절로 풀리지 않으니 섞어 읽지 말 것.
 *
 * ### ⑴ 꺾은선 소재 「박물관에 온 관람객 수」
 * 월 관람객은 수백~수천이라야 자연스러운데 `_y_step` 이 걸음 5에서 멈춰 **눈금이
 * 수백 줄**이 된다(실측: y_max 1153 → 231줄, 세로축이 검은 얼룩).
 * → **되살리는 법**: `LINE_THEMES` 에 아래를 넣고 `MAX_READABLE` 상한을 올린다.
 *   `{ topic: "박물관에 온 관람객 수", unit: "명", labels: timeLabels([1,2,3,4,5], "월"),
 *      base: [8, 14], step: 50 }`
 *   ⚠️ **한계 검사 자체는 지우지 말 것** — 숫자만 올린다.
 *
 * ### ⑵ 막대 규모 「전교 학생들」 — **폐기 (D-69)**. 단, 걸음 10 은 열렸다.
 * 원장님: 「막대그래프는 **너무 광범위한 숫자 할 필요 없음**」(2026-08-22 확정).
 * 「⑴ 이 풀리면 총원 300~500 으로 넣는다」던 계획은 폐기됐다 — 엔진이 못 그려서 미룬 것이
 * 아니라 **교재가 원하지 않는 크기**이기 때문이다. **전교(총원 300~500)는 되살리지 말 것.**
 *
 * 같은 날 정정: 「막대그래프는 **눈금당 10명까지 허용**」. 폐기된 것은 «전교라는 크기»이지
 * «걸음 10»이 아니다. 그래서 걸음 10 규모를 **두 학년(총원 180~220)**으로 넣었다 —
 * 규모는 넷이다. 이 둘을 섞어 읽지 말 것: **걸음이 커도 되지만 총원은 커지면 안 된다.**
 *
 * ### ⑶ 눈금 문항 — **구현됨 (D-70)**
 * 원장님: 「눈금 몇칸 유형도 넣어. **유형은 다양할수록 환영**」(2026-08-22 확정).
 *
 * 한때 이 유형을 통째로 뺐던 까닭은 **선언에 기대고 있어서**였다 — 발문은 「한 칸 $1$명」이라
 * 우기는데 그림은 `_y_step(y_max)` 가 고른 걸음(대개 5)으로 그렸다. 이제 걸음을 `yStep` 으로
 * **스펙에 실어** 파이썬이 그 값 그대로 긋는다(못 그리면 던진다). 발문이 말하는 걸음과
 * 그려지는 걸음이 **한 값**이다.
 *
 * ⚠️ **막대와 꺾은선이 물을 수 있는 것이 다르다.**
 *  · 막대 — 값이 걸음의 배수라(`barSplits`) 「한 칸은 몇 명 / 몇 칸 / 칸→명」 셋 다 된다.
 *  · 꺾은선 — 값은 `theme.step` 의 배수인데 걸음(`theme.yStep`)은 그보다 성기다.
 *    `theme.step` 을 그대로 걸음으로 실으면 눈금이 24~33줄이 되어 엔진이 던진다
 *    (`MAX_Y_TICKS = 9`, 즉 **최댓값 ≤ 8 × 걸음**. 실측: 기온 33줄 · 강낭콩 24줄 ·
 *    박물관 33줄). 그래서 점이 눈금선 위에 없고, **「한 칸은 몇 …인가」만** 묻는다.
 *
 * ### ⑷ 걸음 2 규모 「방과후 교실」 — 수 조합이 **5벌뿐** (설계 과제, 미착수)
 * 총원 다섯 각각에 나눔이 **정확히 1가지**뿐이라, 씨앗을 바꿔도 값 넷이 **총원으로
 * 완전히 결정**된다(소재와 자리는 갈리므로 문항은 같아 보이지 않는다 — 그래서 눈에 안 띈다).
 * 실측: `20:1 · 22:1 · 24:1 · 26:1 · 28:1`.
 * 견줌: 「우리 반」 1~4가지 · 「$4$학년」 5~8가지 · 「두 학년」 5~8가지.
 * 원장님 다양성 원칙(「유형은 다양할수록 환영」)에 걸리는 자리다.
 *
 * → **고치는 법**: `barSplits` 의 조건 넷(서로 다름 · 총원의 절반 이하 · 걸음의 배수 ·
 *   띠 안) 가운데 **무엇을 완화할지 설계**가 필요하다. 걸음 2 는 띠가 `8~10` 으로 좁아
 *   네 값이 사실상 한 벌로 굳는다 — 띠를 넓히는 쪽이 먼저 볼 자리다.
 *   ⚠️ 지금 시험은 「나눔이 **≥1가지**」만 본다. 그래서 이 결함을 **구조적으로 못 본다** —
 *   조건을 완화할 때 「총원마다 **≥N가지**」로 **시험을 같이 올려야** 한다.
 *   ⚠️ **파일럿 확정이 먼저다**(team-lead 2026-08-23). 지금 건드리지 말 것.
 */

/**
 * 막대그래프 소재.
 *
 * `unit` 은 **필수**다 — 지금은 열넷이 전부 「좋아하는 것을 고른 **학생 수(명)**」라
 * 값 범위를 **한 벌**로 함께 써도 된다. 꺾은선은 소재마다 단위가 달라(kg·℃·cm·mm)
 * 소재별로 갈랐지만, 여기서 똑같이 갈랐다면 **안 갈라도 되는 축을 가르는** 것이다.
 *
 * 그래서 「언제 갈라야 하는가」를 시험이 알려 주게 한다 — 단위가 「명」이 아닌 소재가
 * 하나라도 들어오면 빨개진다. 그때가 나눌 때다. **지금이 아니라.**
 * (`unit` 을 필수로 둔 것은 그래야 새 소재를 넣는 사람이 반드시 선언하기 때문이다.
 *  전에는 「명」이 문구 안에 박혀 있어 **시험이 볼 수 있는 값이 아예 없었다.**)
 */
type BarTheme = { item: string; unit: string; labels: readonly string[] };

/**
 * 조사 **규모**. 값의 크기를 정하는 축은 소재가 아니라 이쪽이다.
 *
 * 초4 는 **눈금 한 칸이 1·2·5·10명**인 그래프를 읽는 학년이다(10명은 원장님이
 * 2026-08-22 에 「눈금당 10명까지 허용」으로 열어 주셨다). 그런데 한때는 늘 1칸=5로만
 * 그려졌다 — 걸음을 `_y_step` 이 **축 맨 위만 보고** 정했기 때문이다.
 * 지금은 걸음을 `yStep` 으로 **스펙에 실어** 파이썬이 그 값 그대로 긋는다(D-70).
 *
 * 그래도 규모를 「총원」이 아니라 **값의 크기**로 가르는 것은 그대로다. 이유가 바뀌었을
 * 뿐이다 — 예전에는 사다리가 걸음을 고르니 값을 그 띠에 맞춰야 했고, 지금은 걸음마다
 * **그릴 수 있는 최댓값 상한**(`8 × 걸음`)이 달라서 값을 그 안에 두어야 한다.
 *
 * ⚠️ `who` 는 **그 총원에서 참인 이름**이어야 한다. 「전교」를 60명 안에 넣으면
 * 학교 전체가 100명이 되어 버린다 — 박물관·전교가 걸린 자리와 같다.
 */
type BarScale = {
  who: string;
  totals: readonly number[];
  minTop: number;
  maxTop: number;
  /**
   * 이 규모에서 **실제로 그려지는** 세로 눈금 한 칸.
   *
   * ⚠️ 이 값을 정하는 것은 우리가 아니라 `_y_step(y_max)` 다. 여기 적은 것은 «선언»이고,
   * 시험이 **실제로 그려진 SVG 의 눈금 간격**과 맞대어 확인한다 — 문턱을 여기 옮겨 적으면
   * 두 곳이 같은 것을 정하게 되므로, 참은 **그려진 그림**에서 가져온다.
   * 어긋나면 「눈금 한 칸을 $1$명으로」 같은 발문이 그림과 다른 말을 하게 된다.
   */
  step: number;
};

const BAR_SCALES: readonly BarScale[] = [
  // 한 반 스무 명 남짓. 최댓값 ≤7 이라 축이 8 이하 → 눈금 한 칸 1명.
  {
    who: "우리 반 학생들",
    totals: [18, 19, 20, 21, 22],
    minTop: 1,
    maxTop: 7,
    step: 1,
  },
  // 방과후 교실 서른 명 남짓. 최댓값 8~11 → 축이 9~12 → 눈금 한 칸 2명.
  {
    who: "방과후 교실 학생들",
    totals: [20, 22, 24, 26, 28],
    minTop: 8,
    maxTop: 10,
    step: 2,
  },
  // 한 학년 백 명 남짓. 최댓값 12 이상 → 눈금 한 칸 5명.
  // 「4학년」의 `4` 도 수다 — 날 글자로 두면 R1 에 걸린다(`probe-elem-rules` 가 잡았다).
  //
  // ⚠️ **`maxTop` 을 40 위로 올리지 말 것.** 실측(2026-08-22): 최댓값 `20~40` 은 걸음 5로
  // 그려지고 **`41` 부터 엔진이 던진다** — 「yStep 5 으로는 눈금이 10줄이 됩니다 (9줄
  // 이하여야 합니다. 축 맨 위 45)」. **지금 40이라 여유가 0이다.**
  //
  // 옛 주석은 「43 까지」였다. 그때는 걸음을 안 실어 `_y_step` **사다리**가 골랐고
  // (`yMax ≤ 44` 면 5, `45~49` 면 10), 넘기면 **조용히** 걸음 10으로 그려 발문이 그림과
  // 다른 말을 했다. D-70 으로 걸음을 스펙에 실은 뒤로는 기준이 **눈금 줄 수**로 바뀌어
  // 조용히 틀리는 대신 던진다. **기준이 바뀌면 잰 값도 다시 재야 한다** — 옛 숫자를
  // 물려받으면 「여유 3」처럼 있지도 않은 여유를 믿게 된다.
  // 아래 「선언한 눈금이 실제로 그려진다」 시험이 이 자리를 지킨다.
  {
    who: "$4$학년 학생들",
    totals: [90, 95, 100, 105, 110],
    // 실효 하한은 **20** 이다 — 걸음 5 에서 값 넷이 서로 다른 배수라야 하므로 나눔
    // 규칙상 최댓값이 `4 × 5` 이상이다. 즉 이 `15` 는 한 번도 걸리지 않는다(죽은 값).
    minTop: 15,
    maxTop: 40,
    step: 5,
  },
  // 두 학년 이백 명 남짓. 눈금 한 칸 10명 — 걸음은 `yStep` 으로 **싣는다**(D-70).
  // (위 세 규모의 「최댓값 N 이상 → 한 칸 M명」은 걸음을 `_y_step` 이 **고르던** 때의 말이다.
  //  지금은 고르는 것이 아니라 싣는 것이므로, 값의 크기가 정하는 것은 걸음이 아니라 **상한**이다.)
  // 원장님 정정(2026-08-22): 「막대그래프는 **눈금당 10명까지 허용**」. D-69 로 폐기한 것은
  // 「전교(총원 300~500)」이지 걸음 10 자체가 아니다 — 그래서 규모는 여기까지 넷이다.
  // `who` 는 그 총원에서 참이어야 하므로 **두 학년**으로 잡았다(위 「$4$학년」이 90~110 이니
  // 두 학년이면 180~220 이다). 「전교」로 적으면 학교 전체가 200명이 되어 D-69 가 걸린 자리다.
  //
  // ⚠️ **`maxTop` 을 80 위로 올리지 말 것.** 실측(2026-08-22): 최댓값 `40~80` 은 걸음 10으로
  // 그려지고 **`81` 부터 엔진이 던진다** — 「yStep 10 으로는 눈금이 10줄이 됩니다 (9줄
  // 이하여야 합니다. 축 맨 위 90)」. 축 맨 위가 `ceil(최댓값 / 걸음) × 걸음` 이라 눈금은
  // `최댓값 / 걸음 + 1` 줄이고, 그래서 상한이 **`8 × 걸음`** 이다.
  //
  // `minTop` 40 은 엔진이 아니라 **나눔 규칙**에서 온다 — 값 넷이 서로 다른 걸음의 배수라야
  // 하므로 최댓값은 적어도 `4 × 10` 이다. (그래서 이 규모는 상한과 하한이 딱 붙어 있다:
  // 쓸 수 있는 최댓값이 `40·50·60·70·80` 다섯뿐이다.)
  {
    who: "$3$학년과 $4$학년 전체 학생",
    totals: [180, 190, 200, 210, 220],
    minTop: 40,
    maxTop: 80,
    step: 10,
  },
];

/**
 * 총원을 **먼저 정하고 넷으로 나눈다.**
 *
 * 「조사한 학생은 모두 몇 명인가」의 답이 곧 그 규모의 인원이므로, 합계는 상한으로
 * **막는** 것이 아니라 구성으로 **참이 되어야** 한다. 값 넷이 각각 그럴듯해도 합이
 * 40이면 그런 반은 없다 — 가드가 걸릴 값을 생성기가 만들면 그건 가드가 아니라 사고다.
 *
 * 조건 넷을 **동시에** 만족해야 한다: 합이 총원 · 넷이 서로 다름(「가장 많은 것」의 답이
 * 하나여야 하므로) · 최댓값이 규모의 띠 안 · 최댓값이 총원의 절반 이하(한 항목 쏠림 금지).
 * 그래서 **세어 본다** — 못 푸는 총원은 애초에 후보에서 빠져야 한다(시험이 잠근다).
 */
function barSplits(total: number, scale: BarScale): number[][] {
  const out: number[][] = [];
  const half = Math.floor(total / 2);
  const k = scale.step;
  // 값은 **눈금의 배수**여야 한다 — 「몇 칸인가」의 답이 자연수여야 하기 때문이다.
  for (let a = k; a <= scale.maxTop; a += k) {
    for (let b = a + k; b <= scale.maxTop; b += k) {
      for (let c = b + k; c <= scale.maxTop; c += k) {
        const d = total - a - b - c;
        if (d <= c) continue;
        if (d % k !== 0) continue;
        if (d > scale.maxTop || d < scale.minTop || d > half) continue;
        out.push([a, b, c, d]);
      }
    }
  }
  return out;
}

/**
 * 막대그래프 소재. **한 줄로 편다** — 소단원끼리 `themeShare` 로 나눠 가지므로
 * 여기 적은 소재는 **전부 언젠가 나온다**(무리로 묶으면 남는 무리가 죽는다).
 * 이웃한 항목이 서로 다른 소단원으로 가도록 같은 갈래를 **붙여서** 적는다.
 */
const BAR_THEMES: readonly BarTheme[] = [
  { item: "과일", unit: "명", labels: ["사과", "배", "포도", "딸기"] },
  { item: "과일", unit: "명", labels: ["수박", "참외", "감", "귤"] },
  { item: "운동", unit: "명", labels: ["축구", "농구", "배구", "야구"] },
  { item: "운동", unit: "명", labels: ["줄넘기", "수영", "달리기", "태권도"] },
  { item: "책", unit: "명", labels: ["동화책", "과학책", "역사책", "만화책"] },
  { item: "책", unit: "명", labels: ["위인전", "시집", "사전", "잡지"] },
  { item: "동물", unit: "명", labels: ["개", "고양이", "토끼", "햄스터"] },
  { item: "동물", unit: "명", labels: ["닭", "오리", "염소", "돼지"] },
  { item: "간식", unit: "명", labels: ["빵", "과자", "사탕", "젤리"] },
  { item: "간식", unit: "명", labels: ["김밥", "만두", "떡", "튀김"] },
  { item: "계절", unit: "명", labels: ["봄", "여름", "가을", "겨울"] },
  { item: "장소", unit: "명", labels: ["산", "바다", "계곡", "공원"] },
  { item: "색", unit: "명", labels: ["빨강", "파랑", "노랑", "초록"] },
  { item: "색", unit: "명", labels: ["보라", "주황", "분홍", "연두"] },
];

/**
 * 막대그래프 한 장의 **재료**. 표준 갈래(1-5-1~3)와 난이도 갈래(`G4_TIERS`)가 **같은 것**을
 * 쓰게 하려고 뽑아 두었다 — 재료 만들기를 두 벌로 두면 한쪽만 고쳐도 아무도 모른다.
 *
 * ⚠️ `rng` 를 부르는 **차례가 곧 계약**이다. 여기서 순서를 바꾸면 같은 씨앗이 다른 그림을
 * 내므로 «표준 갈래의 산출이 그대로인가»를 지문으로 확인하고 고쳐야 한다(실제로 확인했다).
 */
function barData(unit: UnitSeed, rng: Rng) {
  const theme = pick(rng, themeShare(unit, BAR_THEMES));
  const scale = pick(rng, BAR_SCALES);
  const total = pick(rng, scale.totals);
  const parts = barSplits(total, scale);
  if (parts.length === 0) {
    throw new Error(
      `나눌 수 없는 총원입니다: ${scale.who} ${total} (최댓값 ${scale.minTop}~${scale.maxTop})`,
    );
  }
  const picked = [...pick(rng, parts)];
  // 늘 오름차순이면 마지막 항목이 항상 가장 크다 — 자리를 섞는다.
  for (let i = picked.length - 1; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    [picked[i], picked[j]] = [picked[j]!, picked[i]!];
  }
  const values = theme.labels.map((label, i) => ({ label, value: picked[i]! }));
  const max = Math.max(...picked);
  const min = Math.min(...picked);
  const top = values.find((v) => v.value === max)!.label;
  const bottom = values.find((v) => v.value === min)!.label;
  const one = values[intBetween(rng, 0, 3)]!;
  // 두 번째로 많은 것 — 값이 서로 다르므로(나눔 조건) 순위가 하나로 정해진다.
  const ranked = [...values].sort((x, y) => y.value - x.value);
  const second = ranked[1]!.label;
  const secondValue = ranked[1]!.value;
  // 두 항목을 견주는 문항용. `1-5-3` 이 「가장 많은 것과 가장 적은 것의 차」를 묻고 있으므로
  // 여기서는 **최대·최소가 아닌 두 항목**을 골라 같은 것을 두 번 묻지 않는다(R5).
  const pairA = ranked[1]!;
  const pairB = ranked[2]!;
  const intro = `${josa(scale.who, "이", "가")} 좋아하는 ${josa(theme.item, "을", "를")} 조사하여 나타낸 막대그래프입니다.`;
  // 축 맨 위는 **걸음을 아는 쪽**(파이썬 `_y_step`)이 올린다. 여기서는 «하한»만 준다 —
  // 상수 `18` 은 규모가 커지면 막대가 칸을 뚫고, 넉넉한 상수는 작은 그래프를 바닥에 깐다.
  // `yStep` 을 실으면 그림이 **그 걸음 그대로** 긋는다(D-70) — 그래서 발문이 걸음을
  // 말할 수 있다. 막대는 값이 걸음의 배수라 「몇 칸인가」까지 물을 수 있다.
  const figure = fig("barChart", {
    values,
    yMax: max + 1,
    yStep: scale.step,
    yLabel: theme.unit,
  });
  return {
    theme,
    scale,
    total,
    picked,
    values,
    max,
    min,
    top,
    bottom,
    one,
    ranked,
    second,
    secondValue,
    pairA,
    pairB,
    intro,
    figure,
  };
}

function barGraph(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = code(unit);
  const {
    theme,
    scale,
    total,
    picked,
    values,
    max,
    min,
    top,
    bottom,
    one,
    second,
    secondValue,
    pairA,
    pairB,
    intro,
    figure,
  } = barData(unit, rng);

  if (c === "1-5-1") {
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `${intro} 학생 수가 가장 많은 것은 어느 ${theme.item}인가?`,
        top,
        `${josa(top, "의", "의")} 막대가 가장 높습니다. ${n(max)}명입니다.`,
        figure,
      );
    }
    return make(
      unit,
      `${intro} ${josa(one.label, "을", "를")} 좋아하는 학생은 몇 명인가?`,
      `${n(one.value)}명`,
      `${josa(one.label, "의", "의")} 막대가 눈금 ${n(one.value)}에 닿아 있으므로 ${n(one.value)}명입니다.`,
      figure,
    );
  }

  if (c === "1-5-2") {
    // 원장님(D-70): 「눈금 몇 칸 유형도 넣어. **유형은 다양할수록 환영**」.
    //
    // 걸음을 `yStep` 으로 그림에 실었으므로 발문이 걸음을 말할 수 있다 — 단 **실은 그 값**만
    // 말한다(`scale.step`). D-67 이 이 유형을 통째로 뺐던 까닭은 발문이 «$1$명» 이라 우기는데
    // 그림은 `_y_step` 이 고른 걸음으로 그려서였다. 이제 한 값이다.
    const kind = intBetween(rng, 0, 4);
    if (kind === 0) {
      return make(
        unit,
        `${intro} 세로 눈금 한 칸은 몇 명을 나타내는가?`,
        `${n(scale.step)}명`,
        `세로축 눈금이 ${n(0)}, ${n(scale.step)}, ${n(scale.step * 2)}, … 로 매겨져 있으므로 ` +
          `한 칸은 ${n(scale.step)}명입니다.`,
        figure,
      );
    }
    if (kind === 1) {
      return make(
        unit,
        `${intro} ${josa(one.label, "은", "는")} 눈금 몇 칸인가?`,
        `${n(one.value / scale.step)}칸`,
        `한 칸이 ${n(scale.step)}명이고 ${josa(one.label, "은", "는")} ${n(one.value)}명이므로 ` +
          `${expr(`${one.value}\\div${scale.step}=${one.value / scale.step}`)} 칸입니다.`,
        figure,
      );
    }
    if (kind === 2) {
      // 칸 → 명. 앞 두 유형과 **방향이 반대**라 곱셈이 된다.
      return make(
        unit,
        `${intro} 세로 눈금 한 칸은 ${n(scale.step)}명입니다. ` +
          `막대가 ${n(pairA.value / scale.step)}칸인 것은 몇 명인가?`,
        `${n(pairA.value)}명`,
        `${expr(`${scale.step}\\times${pairA.value / scale.step}=${pairA.value}`)} 이므로 ${n(pairA.value)}명입니다.`,
        figure,
      );
    }
    if (kind === 3) {
      return make(
        unit,
        `${intro} 학생 수가 두 번째로 많은 것은 어느 ${theme.item}인가?`,
        second,
        `${josa(top, "이", "가")} ${n(max)}명으로 가장 많고, 그다음이 ` +
          `${josa(second, "으로", "로")} ${n(secondValue)}명입니다.`,
        figure,
      );
    }
    return make(
      unit,
      `${intro} ${josa(pairA.label, "은", "는")} ${pairB.label}보다 몇 명 더 많은가?`,
      `${n(pairA.value - pairB.value)}명`,
      `${josa(pairA.label, "이", "가")} ${n(pairA.value)}명, ${josa(pairB.label, "이", "가")} ` +
        `${n(pairB.value)}명이므로 ${expr(`${pairA.value}-${pairB.value}=${pairA.value - pairB.value}`)} 입니다.`,
      figure,
    );
  }

  if (c === "1-5-3") {
    // 네 갈래를 **고르게** 뽑는다(차 · 범위 비교 · 두 그래프 결합 · 합계). `intBetween` 이
    // 균등이므로 각 25%다 — 어느 하나를 무겁게 둘 근거가 아직 없어 균등으로 둔다.
    // 실측 분포는 시험이 찍는다(씨앗 300개 기준).
    const kind = intBetween(rng, 0, 3);
    if (kind === 0) {
      return make(
        unit,
        `${intro} 학생 수가 가장 많은 ${theme.item}과 가장 적은 ${theme.item}의 학생 수의 차는 몇 명인가?`,
        `${n(max - min)}명`,
        `가장 많은 것은 ${josa(top, "으로", "로")} ${n(max)}명, 가장 적은 것은 ` +
          `${josa(bottom, "으로", "로")} ${n(min)}명입니다. ${expr(`${max}-${min}=${max - min}`)}`,
        figure,
      );
    }
    if (kind === 1) {
      // 원장님 예시(동아 「실력」): 「학생 수가 $1$반보다 많고 $5$반보다 적은 반을 모두 찾아
      // 써 보세요.」 기준 **둘**을 읽고 나머지 전부와 범위를 견주어 **답이 여럿**인 부류다 —
      // 지금까지의 값 읽기·순위·차·합·눈금 어디에도 없다.
      //
      // ⚠️ 기준 쌍을 아무렇게나 뽑으면 **답이 「없음」**이 된다. 값 넷은 서로 다르므로
      // (`barSplits` 의 나눔 조건) 오름차순 `v1<v2<v3<v4` 에서 «사이에 드는 것»이 있는 쌍은
      // **정확히 셋뿐**이다:
      //     (v1,v4) → {v2,v3} **둘**  ·  (v1,v3) → {v2} 하나  ·  (v2,v4) → {v3} 하나
      // 나머지 셋((v1,v2)·(v2,v3)·(v3,v4))은 **반드시 0개**다. 그래서 뽑고 나서 거르지 않고
      // **고를 때부터 이 셋에서만** 뽑는다 — 뽑고 거르면 「없음」이 새어 나갈 길이 남고,
      // 가드가 걸릴 값을 생성기가 만들면 그건 가드가 아니라 사고다.
      //
      // ⚠️ 값이 넷뿐이라 **답이 둘인 경우는 기준이 반드시 최소·최대**가 된다(그때 답은
      // 「나머지 둘」이다). 「범위 밖이라 빠지는 항목」의 맛은 답이 하나인 두 쌍에만 있다.
      // 둘 다 나오게 섞는 까닭이 이것이다 — 한쪽만 쓰면 유형이 반쪽이 된다.
      const asc = [...values].sort((x, y) => x.value - y.value);
      const [loAt, hiAt] = pick(rng, [
        [0, 3],
        [0, 2],
        [1, 3],
      ] as const);
      const lo = asc[loAt]!;
      const hi = asc[hiAt]!;
      // 답은 **지면 순서**(왼쪽부터)로 적는다 — `values` 가 곧 지면 차례다. 채점이 갈리면 안 된다.
      const inRange = values.filter(
        (v) => v.value > lo.value && v.value < hi.value,
      );
      const steps = values
        .filter((v) => v !== lo && v !== hi)
        .map((v) =>
          v.value > lo.value && v.value < hi.value
            ? `${josa(v.label, "은", "는")} ${n(v.value)}명으로 ${n(lo.value)}명보다 많고 ${n(hi.value)}명보다 적습니다.`
            : v.value < lo.value
              ? `${josa(v.label, "은", "는")} ${n(v.value)}명으로 ${n(lo.value)}명보다 적습니다.`
              : `${josa(v.label, "은", "는")} ${n(v.value)}명으로 ${n(hi.value)}명보다 많습니다.`,
        );
      return make(
        unit,
        `${intro} 좋아하는 학생 수가 ${lo.label}보다 많고 ${hi.label}보다 적은 ` +
          `${josa(theme.item, "을", "를")} 모두 찾아 쓰시오.`,
        inRange.map((v) => v.label).join(", "),
        `${josa(lo.label, "은", "는")} ${n(lo.value)}명, ${josa(hi.label, "은", "는")} ` +
          `${n(hi.value)}명입니다. ${steps.join(" ")} ` +
          `따라서 ${inRange.map((v) => v.label).join(", ")}입니다.`,
        figure,
      );
    }
    if (kind === 2) {
      // 두 그래프 결합 — 자리는 **1-5-3 「막대그래프의 활용」**이다. 근거가 셋이다:
      // ⑴ 큐브 교재 둘 다 이 유형을 개념 층이 아니라 **응용/실력** 층에 둔다
      //    (개념응용 「응용 쑥!」의 「두 막대그래프를 연결하여 내용 알기」 · 실력 「실력 다지기」의
      //     「약점 체크 · 두 막대그래프에서 알 수 있는 내용 알아보기」. 기본 개념서엔 아예 없다).
      // ⑵ 시드 이름이 그대로 가리킨다 — 1-5-2 는 「그리기」인데 이 유형은 **읽는** 문항이다.
      // ⑶ 같은 층인 「범위 비교」(위 `kind === 1`)가 이미 여기 있다.
      //
      // ⚠️ 이 갈래만 **소재도 값도 다르다.** 위 갈래들이 쓰는 `theme`·`values`·`figure` 는
      // 「좋아하는 것을 고른 학생 수」인데, 여기는 「팔린 수 × 한 개의 값」이라야 참이다
      // (좋아하는 과일을 «팔고 받은 돈»은 말이 안 된다). 그래서 `buildSaleCombo` 가 제
      // 소재·값·발문·해설을 통째로 만들고, 그림도 제 것(`saleFigure`)을 쓴다.
      const sale = buildSaleCombo(rng);
      return make(
        unit,
        sale.content,
        sale.answer,
        sale.solution,
        saleFigure(sale),
      );
    }
    // 합계는 «막는 문턱»이 아니라 **구성으로 참이 되는 값**이다 — 곧 그 규모의 총원이다.
    return make(
      unit,
      `${intro} 조사한 학생은 모두 몇 명인가?`,
      `${n(total)}명`,
      `${expr(`${picked.join("+")}=${total}`)} 이므로 모두 ${n(total)}명입니다.`,
      figure,
    );
  }

  return noBranch(unit);
}

/* ─────────────── 1-5 곁가지: 두 그래프 결합 (수 × 개당 가격) ───────────────
 *
 * 원장님 예시: 「팔린 종류별 아이스크림의 **수**와 아이스크림 한 개의 **가격**을 조사하여
 * 나타낸 막대그래프입니다. 오늘 멜론 아이스크림을 팔고 받은 돈은 얼마인가?」
 * → 같은 항목 목록을 공유하는 **두 자료**에서 지목된 항목의 값을 각각 읽어 **곱한다.**
 *
 * ⚠️ **아직 배선하지 않았다.** 가로 막대 + 두 그래프를 나란히 그리는 스펙 계약을
 * elem-figures 가 만드는 중이고, 계약이 오기 전에 갈래를 열면 **발문이 「막대그래프입니다」라고
 * 하는데 그림이 없는 문항**이 나간다 — 이 저장소가 1,420건으로 겪은 바로 그 부류다
 * (`report-missing-figures.ts`). 그래서 지금은 **값·발문·해설만** 만들어 두고 시험으로
 * 잠가 둔다. 계약이 오면 `fig(...)` 를 붙여 `1-5` 의 한 갈래에서 이 함수를 부르면 된다.
 * 「그래프를 가리키면 그림이 있어야 한다」 시험이 그때 배선을 지킨다.
 */
type SaleTheme = {
  /** 「어느 편의점」 — 발문 첫머리. */
  place: string;
  /** 「아이스크림」 — 「한 개의 가격」과 항목 이름 뒤에 붙는다. */
  goods: string;
  /** 세는 말. 「개」·「자루」·「줄」 — 「한 자루의 가격」이 되어야 한다. */
  counter: string;
  /**
   * 가로축 항목. **꾸밈말**이라 뒤에 `goods` 를 붙이면 이름이 된다(「멜론」→「멜론 아이스크림」).
   * 홀로 서는 이름(「단팥빵」)을 넣으면 「단팥빵 빵」이 되므로 넣지 말 것.
   */
  labels: readonly [string, string, string];
};

/**
 * 「개당 가격 × 판 수」가 **참인** 소재만 — 좋아하는 과일을 «팔고 받은 돈»은 말이 안 된다.
 * 세는 말이 항목마다 같아야 한다(연필 자루 · 김밥 줄).
 */
const SALE_THEMES: readonly SaleTheme[] = [
  {
    place: "어느 편의점",
    goods: "아이스크림",
    counter: "개",
    labels: ["체리", "멜론", "바닐라"],
  },
  {
    place: "어느 분식집",
    goods: "붕어빵",
    counter: "개",
    labels: ["팥", "슈크림", "초코"],
  },
  {
    place: "어느 문구점",
    goods: "연필",
    counter: "자루",
    // ⚠️ 「빨강」이 아니라 **「빨간색」**인 까닭은 말투가 아니라 **지면**이다.
    // 제목 폭 가드는 「제목이 **제 그래프**보다 넓은가」를 보는데, 그래프 폭은 **항목
    // 이름이 정한다.** 「자루」는 세는 말 중 유일하게 두 글자라 제목이 「한 자루의 가격」
    // (103단위)으로 가장 긴데, 이름이 두 글자면 그래프가 96단위로 좁아져 **던진다**
    // (실측 2026-08-23, 짝으로 그렸을 때. 단독으로 그리면 넉넉해서 **안 걸린다**).
    // 세 글자로 하면 그래프가 넓어져 들어간다 — 소재를 버리지 않고 제목 꼴도 지킨다.
    labels: ["빨간색", "파란색", "검은색"],
  },
  {
    place: "어느 김밥집",
    goods: "김밥",
    counter: "줄",
    labels: ["참치", "치즈", "야채"],
  },
  {
    place: "어느 빵집",
    goods: "도넛",
    counter: "개",
    labels: ["딸기", "초코", "설탕"],
  },
  {
    place: "어느 편의점",
    goods: "우유",
    counter: "개",
    labels: ["딸기", "초코", "바나나"],
  },
];

/**
 * 두 그래프의 걸음. **값이 눈금 위에 있어야** 「읽어서 곱한다」가 성립한다.
 *
 * 상한을 정하는 것이 **둘**이다. 둘 다 실측이고, **작은 쪽이 이긴다.**
 *
 * ㉠ **엔진** — 걸음을 스펙에 실으면 눈금이 `최댓값 / 걸음 + 1` 줄이고 `MAX_Y_TICKS` 가 9라
 *   **최댓값 ≤ `8 × 걸음`** 이다(실측 2026-08-22). 이것만 보면 수는 `80` 까지다.
 * ㉡ **지면** — 판매 그래프는 **가로형**이라 눈금이 옆으로 늘어선다. 줄이 늘수록 눈금 글자가
 *   좁아지는데, 겹침 없이 성립하는 것은 **5줄까지**다(elem-figures 실측 2026-08-23).
 *   세로형인 가격 쪽은 9줄이어도 무관하므로 `800` 그대로다.
 *
 * ⚠️ **한때 「6줄까지」로 적혀 있었다. 그 수는 틀렸다** — 시안의 라벨 **겹침 결함** 때문에
 * 6줄이 12.50px 로 «합격»처럼 보였고, 겹침을 고치고 다시 재니 **12.303px 로 기준 미달**이었다.
 * 결함이 지표를 좋게 만든 자리다. 그러니 이 수를 다시 올리려거든 **겹침이 고쳐진 판에서 잰
 * 값인지부터** 확인할 것.
 *
 * ⚠️ **걸음을 `5` 로 되돌리지 말 것.** 「교재는 `15`·`25` 도 쓰던데」가 되돌리는 이유가 되는데,
 * 걸음 5로는 조건 셋을 **동시에** 만족할 수 없다:
 *   · 5줄 상한 → 최댓값 ≤ `4 × 5 = 20`
 *   · 값은 **두 자리** → `10` 이상
 *   · 풀은 **넷 이상**(아래 하한 가드 — 셋이면 `pickDistinct(3/3)` 이라 매번 같은 집합이고
 *     축 다양성 가드도 잠잠해진다)
 *   → 남는 값이 `{10, 15, 20}` **셋뿐**이라 세 번째 조건에서 막힌다. 걸음 10이면 넷이 된다.
 *
 * 걸음 10의 값: 두 자리 유지 · 풀 4(하한 경계) · 최악 5줄(최대 40) · 전형 4줄(최대 30) ·
 * D-69 가 「눈금당 10 허용」을 **명시**했고 · 교재 원본의 값 범위(40까지)도 지킨다.
 * 대가는 곱셈이 순해지는 것이다(`30 × 700`) — 세로셈의 **꼴**은 (세 자리)×(두 자리) 그대로이나
 * 자릿수 난도는 내려간다. 지면 제약에서 온 결과지 고른 것이 아니다.
 */
const SALE_COUNT_STEP = 10; // 두 자리 → 10·20·30·40 (5줄 상한)
const SALE_PRICE_STEP = 100; // 세 자리 · 100원 단위 → 300·…·800

const SALE_COUNTS = [10, 20, 30, 40] as const;
const SALE_PRICES = [300, 400, 500, 600, 700, 800] as const;

/**
 * 자료마다 **그려도 되는 눈금 줄 수**. 위 ㉡ 의 실측을 수로 옮긴 것이다.
 * 시험이 **실제로 그린 SVG 의 줄 수**를 이 값과 맞대므로, 풀을 넓히면 여기서 걸린다.
 */
const SALE_MAX_TICKS = { 수: 5, 가격: 9 } as const;

/** 겹치지 않게 `k` 개를 뽑는다. 값이 겹치면 두 막대가 같은 높이라 그래프가 헷갈린다. */
function pickDistinct<T>(rng: Rng, pool: readonly T[], k: number): T[] {
  const rest = [...pool];
  const out: T[] = [];
  for (let i = 0; i < k; i += 1) {
    const j = intBetween(rng, 0, rest.length - 1);
    out.push(rest[j]!);
    rest.splice(j, 1);
  }
  return out;
}

export type SaleCombo = {
  theme: SaleTheme;
  /** 항목별 팔린 수 — `theme.labels` 와 같은 차례(지면 차례). */
  counts: number[];
  /** 항목별 한 개의 가격 — 같은 차례. */
  prices: number[];
  /** 묻는 항목의 자리. */
  at: number;
  content: string;
  answer: string;
  solution: string;
};

/**
 * 값·발문·해설을 만든다. **그림은 아직 안 붙인다**(위 ⚠️ 참조).
 * 두 자료가 **같은 항목 목록**을 쓰는 것이 이 유형의 뼈대다 — 그래서 `labels` 하나로 둘을 만든다.
 */
function buildSaleCombo(rng: Rng): SaleCombo {
  const theme = pick(rng, SALE_THEMES);
  const counts = pickDistinct(rng, SALE_COUNTS, 3);
  const prices = pickDistinct(rng, SALE_PRICES, 3);
  const at = intBetween(rng, 0, 2);
  const count = counts[at]!;
  const price = prices[at]!;
  const money = count * price;
  const name = `${theme.labels[at]} ${theme.goods}`;
  return {
    theme,
    counts,
    prices,
    at,
    content:
      `${theme.place}에서 오늘 팔린 종류별 ${josa(theme.goods, "의", "의")} 수와 ` +
      `${theme.goods} 한 ${theme.counter}의 가격을 조사하여 나타낸 막대그래프입니다. ` +
      `오늘 ${josa(name, "을", "를")} 팔고 받은 돈은 얼마인가?`,
    answer: `${n(money)}원`,
    solution:
      `${josa(name, "은", "는")} ${n(count)}${theme.counter} 팔렸고, ` +
      `한 ${theme.counter}의 가격은 ${n(price)}원입니다. ` +
      `${expr(`${count}\\times${price}=${money}`)} 이므로 ${n(money)}원입니다.`,
  };
}

/**
 * 두 자료를 **안쪽 그래프 스펙 둘**로 만든다.
 *
 * 계약(렌더러 확정본 `3d0122ef`): `chartPair` 는 `charts` 배열 **둘**로 감싸고, 각 안쪽 스펙은
 * **단독 `barChart` 와 완전히 같은 모양**이라 `orient`·`title` 을 스스로 든다. 그래서 여기서
 * 안쪽 둘을 그대로 만들고, 부르는 쪽이 `charts` 에 넣기만 한다.
 *
 * `title` 은 **짧은 형**이다(원장님 2026-08-23) — 수 「팔린 수」 · 가격 「한 ${counter}의 가격」.
 * 긴 정보(「어느 편의점에서 오늘 팔린 종류별 …」)는 **발문이 이미 말하므로** 제목에 넣지 않는다.
 * ⚠️ 제목을 **열거하지 않는다** — `counter` 를 소재에서 읽는다. 「한 개/자루/줄」 넷을 손으로
 * 적으면 소재가 늘 때 그 목록이 조용히 낡는다(세는 쪽과 고치는 쪽이 같이 눈이 먼다).
 *
 * 방향: **수 쪽만 가로형**이다. 값 축 눈금이 옆으로 늘어서므로 여기서 5줄 상한이 나온다
 * (`SALE_MAX_TICKS`). 가격은 세로형 기본이라 9줄이어도 무관하다.
 *
 * ⚠️ 이 함수를 시험이 **직접** 부른다. 시험이 스펙을 따로 만들면 규칙이 두 벌이 되어
 * 「자와 조판이 다른 것을 본다」가 된다 — 지면 값(`yMax`·`yStep`)은 한 곳에서만 정한다.
 */
function saleChartSpecs(c: SaleCombo): {
  role: string;
  step: number;
  spec: Record<string, unknown>;
}[] {
  return [
    {
      role: "수",
      vals: c.counts,
      step: SALE_COUNT_STEP,
      unit: c.theme.counter,
      orient: "horizontal",
      title: "팔린 수",
    },
    {
      role: "가격",
      vals: c.prices,
      step: SALE_PRICE_STEP,
      unit: "원",
      orient: "vertical",
      title: `한 ${c.theme.counter}의 가격`,
    },
  ].map(({ role, vals, step, unit, orient, title }) => ({
    role,
    step,
    // `yMax` 는 «하한»만 준다 — 축 맨 위는 엔진이 `ceil(최댓값 / 걸음) × 걸음` 으로 올린다.
    spec: fig("barChart", {
      values: c.theme.labels.map((label, i) => ({ label, value: vals[i]! })),
      yMax: Math.max(...vals) + 1,
      yStep: step,
      yLabel: unit,
      orient,
      title,
    }),
  }));
}

/** 두 그래프를 짝으로 감싼다 — 안쪽은 위에서 만든 것 **그대로**다(계약 `3d0122ef`). */
function saleFigure(c: SaleCombo): Record<string, unknown> {
  return fig("chartPair", { charts: saleChartSpecs(c).map((x) => x.spec) });
}

/* ──────────────── 1-5-3 난이도 4단 (D-72, 셋째 파일럿) ────────────────
 *
 * 축은 D-72 확정본 그대로다 — 소단원이 달라도 **같은 잣대**:
 *   연산 절차 한 번 · 기본 식을 스스로 세움 · 응용 두 단계(다른 개념 결합) · 심화 역산.
 * 자료형만 **1단이 「계산」이 아니라 「값 읽기」**다(D-72 ⑶).
 *
 * ⚠️ 표준 네 갈래(차·범위비교·결합·합계)는 **갈래 없는 경로로 그대로 둔다.** 여기 넷은
 * 별개 핸들러다 — 재료(`barData`·`buildSaleCombo`)만 같이 쓴다.
 */

/**
 * **1단 연산 — 값 읽기.** 막대 하나를 눈금으로 읽으면 끝난다(계산 없음).
 *
 * ⚠️ **원장님 확정 2026-08-23: 「결합 그래프에서」.** 1-5-3 의 값 읽기는 단일 막대그래프가
 * 아니라 **이 소단원 고유 소재(판매 결합 두 그래프)**에서 읽는다. 그래야 1-5-1
 * 「막대그래프 알아보기」의 값 읽기와 **확실히 갈린다** — 소재가 다르고, 읽을 그래프를
 * 둘 중에서 골라야 한다. 절차는 여전히 **한 번**이라 1단이 맞다.
 *
 * ⚠️ 「제일 쉬운 문항에 큰 그림(짝, 364단위)이 실린다」는 비용은 **선택지에 명시된 채로
 * 원장님이 고르신 것**이다. 구현에서 이 비용을 우회하지 말 것(그림을 한 장으로 줄이는 등) —
 * 그러면 1-5-1 과 가르는 근거가 사라진다. 자료형 소단원 전체가 이 결정을 모범으로 삼는다.
 */
function tier53Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = buildSaleCombo(rng);
  const at = intBetween(rng, 0, 2);
  const label = c.theme.labels[at]!;
  const name = `${label} ${c.theme.goods}`;
  const intro =
    `${c.theme.place}에서 오늘 팔린 종류별 ${josa(c.theme.goods, "의", "의")} 수와 ` +
    `${c.theme.goods} 한 ${c.theme.counter}의 가격을 조사하여 나타낸 막대그래프입니다.`;
  // 어느 그래프를 읽는지 씨앗으로 가른다 — 둘 다 «막대 하나 읽기»라 같은 단이다.
  if (intBetween(rng, 0, 1) === 0) {
    const v = c.counts[at]!;
    return make(
      unit,
      `${intro} 오늘 ${josa(name, "은", "는")} 몇 ${c.theme.counter} 팔렸는가?`,
      `${n(v)}${c.theme.counter}`,
      `「팔린 수」 그래프에서 ${josa(name, "의", "의")} 막대가 눈금 ${n(v)}에 닿아 있으므로 ` +
        `${n(v)}${c.theme.counter}입니다.`,
      saleFigure(c),
    );
  }
  const v = c.prices[at]!;
  return make(
    unit,
    `${intro} ${name} 한 ${c.theme.counter}의 가격은 얼마인가?`,
    `${n(v)}원`,
    `「한 ${c.theme.counter}의 가격」 그래프에서 ${josa(name, "의", "의")} 막대가 눈금 ` +
      `${n(v)}에 닿아 있으므로 ${n(v)}원입니다.`,
    saleFigure(c),
  );
}

/**
 * **2단 기본 — 비교 한 겹.** 그래프에서 최대·최소를 «골라» 한 번 뺀다.
 *
 * 1단과 갈리는 것은 **고르는 일이 한 겹 붙는다**는 점이다 — 값이 발문에 없고, 어느 막대를
 * 볼지 스스로 정해야 식이 선다. 뺄셈 자체는 한 번뿐이라 3단은 아니다.
 */
function tier53Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${d.intro} 학생 수가 가장 많은 ${josa(d.theme.item, "은", "는")} 가장 적은 ${d.theme.item}보다 몇 명 더 많은가?`,
    `${n(d.max - d.min)}명`,
    `가장 많은 것은 ${josa(d.top, "으로", "로")} ${n(d.max)}명, 가장 적은 것은 ` +
      `${josa(d.bottom, "으로", "로")} ${n(d.min)}명입니다. ` +
      `${expr(`${d.max}-${d.min}=${d.max - d.min}`)} 이므로 ${n(d.max - d.min)}명 더 많습니다.`,
    d.figure,
  );
}

/**
 * **3단 응용 — 다른 개념과 결합.** 그래프 읽기에 **나눗셈(몇 배)** 또는 **눈금 한 칸**(D-70)이
 * 한 겹 더 붙는다. 두 단계를 밟아야 답이 나온다.
 *
 * ⚠️ 「몇 배」는 **나누어떨어질 때만** 묻는다. 막대 값은 걸음의 배수라 배수 관계가 늘 서지는
 * 않는다 — 안 떨어지면 눈금 유형으로 간다(답이 자연수가 아닌 문항을 내지 않는다).
 */
function tier53Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  const times = d.max / d.min;
  if (Number.isInteger(times) && times >= 2 && intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `${d.intro} 학생 수가 가장 많은 ${josa(d.theme.item, "은", "는")} 가장 적은 ${d.theme.item}의 몇 배인가?`,
      `${n(times)}배`,
      `가장 많은 것은 ${josa(d.top, "으로", "로")} ${n(d.max)}명, 가장 적은 것은 ` +
        `${josa(d.bottom, "으로", "로")} ${n(d.min)}명입니다. ` +
        `${expr(`${d.max}\\div${d.min}=${times}`)} 이므로 ${n(times)}배입니다.`,
      d.figure,
    );
  }
  // 눈금 결합 — 「한 칸이 몇 명인가」를 먼저 알아야 「몇 칸인가」가 나온다(두 단계).
  const cells = d.one.value / d.scale.step;
  return make(
    unit,
    `${d.intro} ${josa(d.one.label, "의", "의")} 막대는 눈금 몇 칸인가?`,
    `${n(cells)}칸`,
    `세로 눈금 한 칸은 ${n(d.scale.step)}명이고 ${josa(d.one.label, "은", "는")} ` +
      `${n(d.one.value)}명이므로 ${expr(`${d.one.value}\\div${d.scale.step}=${cells}`)} 칸입니다.`,
    d.figure,
  );
}

/**
 * **4단 심화 — 역산.** 그래프에 **없는** 값을 전체에서 되돌려 구한다.
 *
 * 계약(2026-08-23, elem-figures 확장): `values` 항목은 `{ label, value }` **또는**
 * `{ label, unknown: true }` 이고 **unknown 항목에는 `value` 필드가 아예 없다.**
 * 참값이 스펙에 실리지 않으므로 **그림이 답을 흘리는 것이 구조적으로 불가능**하다(D-66 ⑺).
 * 점선 상자 높이는 값과 무관한 고정값이고 그건 렌더러 몫이다.
 *
 * ⚠️ **시안(186행)을 문자 그대로 옮기면 안 된다.** 거기 점선 상자는 `y=70 height=68` 로
 * **참값과 똑같은 높이**여서, 눈금에 대고 윗변을 읽으면 답이 나온다 — 손그림 예시의 결함이다.
 * 원장님 확정 대상은 「지워진 자리 + ? + 전체에서 역산」이라는 **형태**지 그 높이가 아니다.
 *
 * ⚠️ **숨기는 것은 최댓값이 아니다.** `yMax` 는 그려진 값에서 나오는데, 최댓값을 숨기면
 * 축이 보이는 막대들보다 높이 서서 **숨긴 값의 크기를 귀띔한다.** 그래서 최댓값이 아닌
 * 항목만 고르고, `yMax` 도 **보이는 값**으로만 계산한다 — 안 그리는 값이 축에 남으면 안 된다.
 */
function tier53Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  // 최댓값이 아닌 자리 중에서 고른다(위 ⚠️).
  const hideable = d.values.filter((v) => v.value !== d.max);
  const hidden = pick(rng, hideable);
  const shown = d.values.filter((v) => v !== hidden);
  const rest = shown.reduce((a, v) => a + v.value, 0);
  const figure = fig("barChart", {
    values: d.values.map((v) =>
      v === hidden
        ? { label: v.label, unknown: true }
        : { label: v.label, value: v.value },
    ),
    // **보이는 값**으로만 축을 세운다 — 숨긴 값은 축에도 남기지 않는다.
    yMax: Math.max(...shown.map((v) => v.value)) + 1,
    yStep: d.scale.step,
    yLabel: d.theme.unit,
  });
  return make(
    unit,
    `${d.intro} 조사한 학생이 모두 ${n(d.total)}명일 때, ` +
      `${josa(hidden.label, "을", "를")} 좋아하는 학생은 몇 명인가?`,
    `${n(hidden.value)}명`,
    `그래프에 나타난 ${shown.map((v) => v.label).join(", ")}의 학생 수를 더하면 ` +
      `${expr(`${shown.map((v) => v.value).join("+")}=${rest}`)} 입니다. ` +
      `전체가 ${n(d.total)}명이므로 ${expr(`${d.total}-${rest}=${hidden.value}`)} 이고, ` +
      `${josa(hidden.label, "을", "를")} 좋아하는 학생은 ${n(hidden.value)}명입니다.`,
    figure,
  );
}

/* ──────────── 1-5-1·1-5-2 난이도 4단 (D-72 확대, 2026-08-23) ────────────
 *
 * 자료형 잣대는 시안 그대로다 — 「값 읽기 → 비교 한 번 → 배·눈금 결합 → 역산」.
 * 그런데 **표준이 이미 가져간 유형이 많다**(R5 — 표준↔갈래 같은 소단원 중복도 결함):
 * 표준 1-5-1 이 값 읽기·최다 항목을, 표준 1-5-2 가 눈금 셋·순위·차를 갖고 있다.
 * 그래서 소단원의 **정체성**으로 가른다:
 *
 *  · **1-5-1 「알아보기」** — 완성된 그래프에서. 1단은 값이 아니라 **그래프의 짜임**을
 *    읽는다(가로·세로·막대 길이가 무엇을 나타내는가 — 큐브 개념 1 「막대그래프」의 유형.
 *    값 읽기 그 자체는 표준 1-5-1 몫이다). 4단은 **지워진 막대**를 «다른 항목과의 관계»
 *    단서로 역산한다 — 전체 합에서 역산하는 1-5-3 심화와 단서가 다르다
 *    (큐브 실력 「막대그래프의 일부분을 보고 문제 해결하기」).
 *  · **1-5-2 「그리기」** — 갈래 넷 전부 **표**(`barTable`)에서 출발한다(팀장 지침
 *    2026-08-23: 1단은 「값 읽기」 소재를 옮겨 적지 말고 **그리기 방향의 절차 한 번**).
 *    완성된 그래프를 읽는 표준 1-5-2 와 그림 종류부터 갈린다. 4단은 「그렸더니 몇 칸」
 *    에서 눈금을 **되짚는다**(큐브 응용 「눈금 한 칸의 크기를 이용하여 다른 항목 구하기」).
 *
 * 재료는 셋 다 `barData` 하나다 — 소재는 `themeShare` 로 소단원끼리 겹치지 않는다.
 */

/**
 * **1-5-1 1단 연산 — 그래프의 짜임 읽기.** 계산이 없고, 답이 발문에 적혀 있지 않다.
 * 값 읽기(「몇 명인가」)·최다 항목은 표준 1-5-1 이 이미 내므로(R5) 여기서는 안 묻는다.
 */
function tier51Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  const kind = intBetween(rng, 0, 2);
  if (kind === 0) {
    return make(
      unit,
      `${d.intro} 가로와 세로는 각각 무엇을 나타내는가?`,
      `가로는 ${d.theme.item}, 세로는 학생 수`,
      `가로는 조사한 ${josa(d.theme.item, "을", "를")} 나타내고, ` +
        `세로는 ${josa(d.theme.item, "을", "를")} 좋아하는 학생 수를 나타냅니다.`,
      d.figure,
    );
  }
  if (kind === 1) {
    return make(
      unit,
      `${d.intro} 막대의 길이는 무엇을 나타내는가?`,
      `${josa(d.theme.item, "을", "를")} 좋아하는 학생 수`,
      `막대의 길이는 ${josa(d.theme.item, "을", "를")} 좋아하는 학생 수를 나타냅니다. ` +
        `막대가 길수록 좋아하는 학생이 많습니다.`,
      d.figure,
    );
  }
  return make(
    unit,
    `${d.intro} 학생 수가 가장 많은 ${josa(d.theme.item, "을", "를")} 한눈에 찾으려면 ` +
      `그래프에서 무엇을 비교하면 되는가?`,
    "막대의 길이",
    `막대의 길이가 학생 수를 나타내므로, 막대의 길이를 비교하면 가장 긴 막대가 ` +
      `학생 수가 가장 많은 ${d.theme.item}입니다.`,
    d.figure,
  );
}

/**
 * **1-5-1 2단 기본 — 두 항목을 골라 합한다.** 값이 발문에 없고, 어느 막대 둘을 읽을지
 * 스스로 정해 식을 세운다(덧셈 한 번). 차는 1-5-3(표준·기본)과 1-5-2 표준이 이미
 * 가져갔으므로 **합**이다 — 전체 합(1-5-3 표준 「모두 몇 명」)과도 항목 둘이라 갈린다.
 */
function tier51Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  // 지면 순서(왼쪽부터)로 두 항목을 부른다 — 해설이 그래프와 같은 차례를 밟는다.
  const [x, y] = d.values.filter((v) => v === d.pairA || v === d.pairB) as [
    (typeof d.values)[number],
    (typeof d.values)[number],
  ];
  const sum = x.value + y.value;
  return make(
    unit,
    `${d.intro} ${josa(x.label, "과", "와")} ${josa(y.label, "을", "를")} 좋아하는 학생은 ` +
      `모두 몇 명인가?`,
    `${n(sum)}명`,
    `${josa(x.label, "은", "는")} ${n(x.value)}명, ${josa(y.label, "은", "는")} ` +
      `${n(y.value)}명입니다. ${expr(`${x.value}+${y.value}=${sum}`)} 이므로 모두 ${n(sum)}명입니다.`,
    d.figure,
  );
}

/**
 * **1-5-1 3단 응용 — 눈금 결합(두 단계).** 차를 구하고 눈금 한 칸으로 나눠 **칸**으로
 * 답한다. 명 단위 차(1-5-2 표준·1-5-3)와 단위부터 다르고, 몇 배는 1-5-3 응용 몫이다.
 */
function tier51Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  if (intBetween(rng, 0, 1) === 0) {
    const diff = d.max - d.min;
    const cells = diff / d.scale.step;
    return make(
      unit,
      `${d.intro} 학생 수가 가장 많은 ${d.theme.item}의 막대는 가장 적은 ${d.theme.item}의 ` +
        `막대보다 눈금 몇 칸 더 긴가?`,
      `${n(cells)}칸`,
      `가장 많은 것은 ${josa(d.top, "으로", "로")} ${n(d.max)}명, 가장 적은 것은 ` +
        `${josa(d.bottom, "으로", "로")} ${n(d.min)}명이므로 차는 ` +
        `${expr(`${d.max}-${d.min}=${diff}`)} 입니다. 세로 눈금 한 칸은 ${n(d.scale.step)}명이므로 ` +
        `${expr(`${diff}\\div${d.scale.step}=${cells}`)} 칸 더 깁니다.`,
      d.figure,
    );
  }
  const [p, q] = pickDistinct(rng, d.values, 2) as [
    (typeof d.values)[number],
    (typeof d.values)[number],
  ];
  const big = p.value > q.value ? p : q;
  const small = p.value > q.value ? q : p;
  const diff = big.value - small.value;
  const cells = diff / d.scale.step;
  return make(
    unit,
    `${d.intro} ${josa(big.label, "의", "의")} 막대는 ${josa(small.label, "의", "의")} 막대보다 ` +
      `눈금 몇 칸 더 긴가?`,
    `${n(cells)}칸`,
    `${josa(big.label, "은", "는")} ${n(big.value)}명, ${josa(small.label, "은", "는")} ` +
      `${n(small.value)}명이므로 차는 ${expr(`${big.value}-${small.value}=${diff}`)} 입니다. ` +
      `세로 눈금 한 칸은 ${n(d.scale.step)}명이므로 ${expr(`${diff}\\div${d.scale.step}=${cells}`)} 칸 더 깁니다.`,
    d.figure,
  );
}

/**
 * **1-5-1 4단 심화 — 지워진 막대를 «관계» 단서로 역산.** 단서가 전체 합이면 1-5-3 심화와
 * 같은 문항이 된다 — 여기서는 「다른 항목보다 $k$명 더 많다/적다」로 되짚는다.
 *
 * 스펙 계약은 1-5-3 심화(`tier53Deep`)와 같다: unknown 항목에 `value` 가 **아예 없고**
 * (D-66 ⑺), 최댓값은 숨기지 않으며, `yMax` 는 **보이는 값**으로만 세운다.
 */
function tier51Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  const hideable = d.values.filter((v) => v.value !== d.max);
  const hidden = pick(rng, hideable);
  const shown = d.values.filter((v) => v !== hidden);
  const ref = pick(rng, shown);
  const diff = hidden.value - ref.value;
  const more = diff > 0;
  const k = Math.abs(diff);
  const figure = fig("barChart", {
    values: d.values.map((v) =>
      v === hidden
        ? { label: v.label, unknown: true }
        : { label: v.label, value: v.value },
    ),
    yMax: Math.max(...shown.map((v) => v.value)) + 1,
    yStep: d.scale.step,
    yLabel: d.theme.unit,
  });
  return make(
    unit,
    `${d.intro} ${josa(hidden.label, "을", "를")} 좋아하는 학생은 ` +
      `${josa(ref.label, "을", "를")} 좋아하는 학생보다 ${n(k)}명 더 ${more ? "많다" : "적다"}고 ` +
      `합니다. ${josa(hidden.label, "을", "를")} 좋아하는 학생은 몇 명인가?`,
    `${n(hidden.value)}명`,
    `그래프에서 ${josa(ref.label, "을", "를")} 좋아하는 학생은 ${n(ref.value)}명입니다. ` +
      `${expr(`${ref.value}${more ? "+" : "-"}${k}=${hidden.value}`)} 이므로 ` +
      `${josa(hidden.label, "을", "를")} 좋아하는 학생은 ${n(hidden.value)}명입니다.`,
    figure,
  );
}

/** 그리기 갈래의 **표** — 완성된 그래프 대신 원자료를 보인다(「그리기」의 정체성). */
function barTable(d: ReturnType<typeof barData>): Record<string, unknown> {
  return fig("table", {
    headers: [d.theme.item, ...d.values.map((v) => v.label)],
    rows: [["학생 수(명)", ...d.values.map((v) => String(v.value))]],
  });
}

/** 그리기 갈래의 첫 문장 — 그래프가 아니라 **표**를 가리킨다. */
function drawIntro(d: ReturnType<typeof barData>): string {
  return `${josa(d.scale.who, "이", "가")} 좋아하는 ${josa(d.theme.item, "을", "를")} 조사하여 나타낸 표입니다.`;
}

/**
 * **1-5-2 1단 연산 — 값→칸 한 번(그리기 방향).** 표의 값 하나를 주어진 눈금으로 나눈다.
 * 팀장 지침(2026-08-23): 자료형 1단의 「값 읽기」를 문자 그대로 옮기면 1-5-1 과 정체성이
 * 겹친다 — 원장님 확정 취지는 «절차 한 번»이므로 그리기 방향의 나눗셈 한 번으로 간다.
 */
function tier52Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  const s = d.scale.step;
  const cells = d.one.value / s;
  // 걸음이 $1$이면 「$5\div1=5$」가 지면에 나간다 — 식 없이 말로 푼다.
  const how =
    s === 1
      ? `한 칸이 ${n(1)}명이므로 학생 수와 같은 ${n(cells)}칸으로 그립니다.`
      : `한 칸이 ${n(s)}명이므로 ${expr(`${d.one.value}\\div${s}=${cells}`)} 칸으로 그립니다.`;
  return make(
    unit,
    `${drawIntro(d)} 표를 보고 막대그래프를 그리려고 합니다. 세로 눈금 한 칸을 ` +
      `${n(s)}명으로 하면 ${josa(d.one.label, "의", "의")} 막대는 몇 칸으로 ` +
      `그려야 하는가?`,
    `${n(cells)}칸`,
    `표에서 ${josa(d.one.label, "은", "는")} ${n(d.one.value)}명입니다. ${how}`,
    barTable(d),
  );
}

/**
 * **1-5-2 2단 기본 — 눈금 계획(스스로 고른다).** 표 전체를 훑어 가장 큰 수를 찾아야
 * 답이 선다 — 값이 발문에 없다. 「적어도 몇 명까지」는 그리기의 단골 유형이다.
 */
function tier52Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `${drawIntro(d)} 표를 보고 막대그래프를 그리려고 합니다. 세로 눈금은 적어도 ` +
        `몇 명까지 나타낼 수 있어야 하는가?`,
      `${n(d.max)}명`,
      `표에서 가장 큰 수는 ${josa(d.top, "의", "의")} ${n(d.max)}명입니다. 세로 눈금은 ` +
        `가장 큰 수까지 나타낼 수 있어야 하므로 적어도 ${n(d.max)}명까지 나타내야 합니다.`,
      barTable(d),
    );
  }
  return make(
    unit,
    `${drawIntro(d)} 표를 보고 막대그래프를 그리려고 합니다. 막대를 가장 길게 그려야 ` +
      `하는 것은 어느 ${d.theme.item}인가?`,
    d.top,
    `막대의 길이는 학생 수를 나타내므로 학생 수가 가장 많은 ${josa(d.top, "의", "의")} ` +
      `막대를 가장 길게 그려야 합니다. ${josa(d.top, "은", "는")} ${n(d.max)}명입니다.`,
    barTable(d),
  );
}

/**
 * **1-5-2 3단 응용 — 눈금 계획 두 단계.** 표에서 값을 찾고(고르기) 눈금으로 나눈다 —
 * 「적어도 몇 칸」과 「몇 칸 더 길게」 둘 다 찾기 + 나눗셈의 두 단계다.
 */
function tier52Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  const s = d.scale.step;
  if (intBetween(rng, 0, 1) === 0) {
    const cells = d.max / s;
    // 걸음 $1$이면 「\div1」 식이 지면에 나간다 — 말로 푼다(연산 갈래와 같은 이유).
    const how =
      s === 1
        ? `한 칸이 ${n(1)}명이므로 눈금은 적어도 ${n(cells)}칸 있어야 합니다.`
        : `한 칸이 ${n(s)}명이므로 눈금은 적어도 ${expr(`${d.max}\\div${s}=${cells}`)} 칸 있어야 합니다.`;
    return make(
      unit,
      `${drawIntro(d)} 표를 보고 막대그래프를 그리려고 합니다. 세로 눈금 한 칸을 ` +
        `${n(s)}명으로 하면 세로 눈금은 적어도 몇 칸 있어야 하는가?`,
      `${n(cells)}칸`,
      `표에서 가장 큰 수는 ${josa(d.top, "의", "의")} ${n(d.max)}명입니다. ${how}`,
      barTable(d),
    );
  }
  const diff = d.pairA.value - d.pairB.value;
  const cells = diff / s;
  const how =
    s === 1
      ? `한 칸이 ${n(1)}명이므로 ${n(cells)}칸 더 길게 그려야 합니다.`
      : `한 칸이 ${n(s)}명이므로 ${expr(`${diff}\\div${s}=${cells}`)} 칸 더 길게 그려야 합니다.`;
  return make(
    unit,
    `${drawIntro(d)} 표를 보고 막대그래프를 그리려고 합니다. 세로 눈금 한 칸을 ${n(s)}명으로 ` +
      `하면 ${josa(d.pairA.label, "의", "의")} 막대는 ${josa(d.pairB.label, "의", "의")} 막대보다 ` +
      `몇 칸 더 길게 그려야 하는가?`,
    `${n(cells)}칸`,
    `표에서 ${josa(d.pairA.label, "은", "는")} ${n(d.pairA.value)}명, ` +
      `${josa(d.pairB.label, "은", "는")} ${n(d.pairB.value)}명이므로 차는 ` +
      `${expr(`${d.pairA.value}-${d.pairB.value}=${diff}`)} 입니다. ${how}`,
    barTable(d),
  );
}

/**
 * **1-5-2 4단 심화 — 눈금 역산.** 「그렸더니 몇 칸」에서 눈금 한 칸을 되짚고, 되짚은
 * 눈금을 다른 항목에 적용한다. 전체 합 역산(1-5-3 심화)과 단서가 다르다.
 *
 * ⚠️ 칸 수가 $1$이면 역산이 자명해진다(한 칸 = 그 값). 값 넷은 서로 다른 걸음의
 * 배수이므로 칸 수 $2$ 이상인 항목이 항상 셋 이상 있다 — 거기서만 고른다.
 */
function tier52Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  const s = d.scale.step;
  const cand = d.values.filter((v) => v.value / s >= 2);
  const x = pick(rng, cand);
  const c = x.value / s;
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `${drawIntro(d)} 표를 보고 막대그래프를 그렸더니 ${josa(x.label, "의", "의")} 막대가 ` +
        `${n(c)}칸이 되었습니다. 세로 눈금 한 칸을 몇 명으로 한 것인가?`,
      `${n(s)}명`,
      `표에서 ${josa(x.label, "은", "는")} ${n(x.value)}명입니다. ${n(x.value)}명을 ` +
        `${n(c)}칸으로 나타냈으므로 세로 눈금 한 칸은 ${expr(`${x.value}\\div${c}=${s}`)} 명으로 ` +
        `한 것입니다.`,
      barTable(d),
    );
  }
  const y = pick(
    rng,
    d.values.filter((v) => v !== x),
  );
  const cells = y.value / s;
  const how =
    s === 1
      ? `${josa(y.label, "은", "는")} ${n(y.value)}명이므로 ${n(cells)}칸으로 그려야 합니다.`
      : `${josa(y.label, "은", "는")} ${n(y.value)}명이므로 ${expr(`${y.value}\\div${s}=${cells}`)} 칸으로 그려야 합니다.`;
  return make(
    unit,
    `${drawIntro(d)} 표를 보고 ${josa(x.label, "의", "의")} 막대를 ${n(c)}칸으로 그렸습니다. ` +
      `같은 눈금으로 ${josa(y.label, "의", "의")} 막대는 몇 칸으로 그려야 하는가?`,
    `${n(cells)}칸`,
    `표에서 ${josa(x.label, "은", "는")} ${n(x.value)}명인데 그 막대가 ${n(c)}칸이므로 ` +
      `세로 눈금 한 칸은 ${expr(`${x.value}\\div${c}=${s}`)} 명입니다. ${how}`,
    barTable(d),
  );
}

/**
 * 초4 난이도 갈래 등록 (D-72 · 셋째 파일럿 + 1-5 확대 2026-08-23).
 *
 * ⚠️ 표준 네 갈래(차·범위비교·결합·합계)는 **갈래 없는 경로 그대로**다 — 여기 것들은 별개다.
 */
export const G4_TIERS: ElemTierMap = {
  "초4|1-1-1": {
    연산: tier11Calc,
    기본: tier11Basic,
    응용: tier11Apply,
    심화: tier11Deep,
  },
  "초4|1-1-2": {
    연산: tier12Calc,
    기본: tier12Basic,
    응용: tier12Apply,
    심화: tier12Deep,
  },
  "초4|1-1-3": {
    연산: tier13Calc,
    기본: tier13Basic,
    응용: tier13Apply,
    심화: tier13Deep,
  },
  "초4|1-1-4": {
    연산: tier14Calc,
    기본: tier14Basic,
    응용: tier14Apply,
    심화: tier14Deep,
  },
  "초4|1-1-5": {
    연산: tier15Calc,
    기본: tier15Basic,
    응용: tier15Apply,
    심화: tier15Deep,
  },
  "초4|1-1-6": {
    연산: tier16Calc,
    기본: tier16Basic,
    응용: tier16Apply,
    심화: tier16Deep,
  },
  "초4|1-1-7": {
    연산: tier17Calc,
    기본: tier17Basic,
    응용: tier17Apply,
    심화: tier17Deep,
  },
  "초4|1-2-1": {
    연산: tier21Calc,
    기본: tier21Basic,
    응용: tier21Apply,
    심화: tier21Deep,
  },
  "초4|1-2-2": {
    연산: tier22Calc,
    기본: tier22Basic,
    응용: tier22Apply,
    심화: tier22Deep,
  },
  "초4|1-2-3": {
    연산: tier23Calc,
    기본: tier23Basic,
    응용: tier23Apply,
    심화: tier23Deep,
  },
  "초4|1-2-4": {
    연산: tier24Calc,
    기본: tier24Basic,
    응용: tier24Apply,
    심화: tier24Deep,
  },
  "초4|1-2-5": {
    연산: tier25Calc,
    기본: tier25Basic,
    응용: tier25Apply,
    심화: tier25Deep,
  },
  "초4|1-2-6": {
    연산: tier26Calc,
    기본: tier26Basic,
    응용: tier26Apply,
    심화: tier26Deep,
  },
  "초4|1-3-1": {
    연산: tier31Calc,
    기본: tier31Basic,
    응용: tier31Apply,
    심화: tier31Deep,
  },
  "초4|1-3-2": {
    연산: tier32Calc,
    기본: tier32Basic,
    응용: tier32Apply,
    심화: tier32Deep,
  },
  "초4|1-3-3": {
    연산: tier33Calc,
    기본: tier33Basic,
    응용: tier33Apply,
    심화: tier33Deep,
  },
  "초4|1-3-4": {
    연산: tier34Calc,
    기본: tier34Basic,
    응용: tier34Apply,
    심화: tier34Deep,
  },
  "초4|1-3-5": {
    연산: tier35Calc,
    기본: tier35Basic,
    응용: tier35Apply,
    심화: tier35Deep,
  },
  "초4|1-3-6": {
    연산: tier36Calc,
    기본: tier36Basic,
    응용: tier36Apply,
    심화: tier36Deep,
  },
  "초4|1-3-7": {
    연산: tier37Calc,
    기본: tier37Basic,
    응용: tier37Apply,
    심화: tier37Deep,
  },
  "초4|1-4-1": {
    연산: tier41Calc,
    기본: tier41Basic,
    응용: tier41Apply,
    심화: tier41Deep,
  },
  "초4|1-4-2": {
    연산: tier42Calc,
    기본: tier42Basic,
    응용: tier42Apply,
    심화: tier42Deep,
  },
  "초4|1-4-3": {
    연산: tier43Calc,
    기본: tier43Basic,
    응용: tier43Apply,
    심화: tier43Deep,
  },
  "초4|1-4-4": {
    연산: tier44Calc,
    기본: tier44Basic,
    응용: tier44Apply,
    심화: tier44Deep,
  },
  "초4|1-6-1": {
    연산: tier61Calc,
    기본: tier61Basic,
    응용: tier61Apply,
    심화: tier61Deep,
  },
  "초4|1-6-2": {
    연산: tier62Calc,
    기본: tier62Basic,
    응용: tier62Apply,
    심화: tier62Deep,
  },
  "초4|1-6-3": {
    연산: tier63Calc,
    기본: tier63Basic,
    응용: tier63Apply,
    심화: tier63Deep,
  },
  "초4|1-6-4": {
    연산: tier64Calc,
    기본: tier64Basic,
    응용: tier64Apply,
    심화: tier64Deep,
  },
  "초4|1-6-5": {
    연산: tier65Calc,
    기본: tier65Basic,
    응용: tier65Apply,
    심화: tier65Deep,
  },
  "초4|1-5-1": {
    연산: tier51Calc,
    기본: tier51Basic,
    응용: tier51Apply,
    심화: tier51Deep,
  },
  "초4|1-5-2": {
    연산: tier52Calc,
    기본: tier52Basic,
    응용: tier52Apply,
    심화: tier52Deep,
  },
  "초4|1-5-3": {
    연산: tier53Calc,
    기본: tier53Basic,
    응용: tier53Apply,
    심화: tier53Deep,
  },
  "초4|2-1-1": {
    연산: tier211Calc,
    기본: tier211Basic,
    응용: tier211Apply,
    심화: tier211Deep,
  },
  "초4|2-1-2": {
    연산: tier212Calc,
    기본: tier212Basic,
    응용: tier212Apply,
    심화: tier212Deep,
  },
  "초4|2-1-3": {
    연산: tier213Calc,
    기본: tier213Basic,
    응용: tier213Apply,
    심화: tier213Deep,
  },
  "초4|2-1-4": {
    연산: tier214Calc,
    기본: tier214Basic,
    응용: tier214Apply,
    심화: tier214Deep,
  },
  "초4|2-3-1": {
    연산: tier231Calc,
    기본: tier231Basic,
    응용: tier231Apply,
    심화: tier231Deep,
  },
  "초4|2-3-2": {
    연산: tier232Calc,
    기본: tier232Basic,
    응용: tier232Apply,
    심화: tier232Deep,
  },
  "초4|2-3-3": {
    연산: tier233Calc,
    기본: tier233Basic,
    응용: tier233Apply,
    심화: tier233Deep,
  },
  "초4|2-3-4": {
    연산: tier234Calc,
    기본: tier234Basic,
    응용: tier234Apply,
    심화: tier234Deep,
  },
  "초4|2-3-5": {
    연산: tier235Calc,
    기본: tier235Basic,
    응용: tier235Apply,
    심화: tier235Deep,
  },
  "초4|2-3-6": {
    연산: tier236Calc,
    기본: tier236Basic,
    응용: tier236Apply,
    심화: tier236Deep,
  },
  "초4|2-3-7": {
    연산: tier237Calc,
    기본: tier237Basic,
    응용: tier237Apply,
    심화: tier237Deep,
  },
  "초4|2-5-1": {
    연산: tier251Calc,
    기본: tier251Basic,
    응용: tier251Apply,
    심화: tier251Deep,
  },
  "초4|2-5-2": {
    연산: tier252Calc,
    기본: tier252Basic,
    응용: tier252Apply,
    심화: tier252Deep,
  },
  "초4|2-5-3": {
    연산: tier253Calc,
    기본: tier253Basic,
    응용: tier253Apply,
    심화: tier253Deep,
  },
};

/* ───────────────────────── 1-6 규칙 찾기 ───────────────────────── */

function pattern(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = code(unit);

  if (c === "1-6-1") {
    if (intBetween(rng, 0, 2) === 0) {
      const a = intBetween(rng, 2, 6);
      return make(
        unit,
        `수의 배열에서 규칙을 찾아 $\\square$에 알맞은 수를 쓰시오. ` +
          `${n(a)}, ${n(a * 2)}, ${n(a * 4)}, ${n(a * 8)}, $\\square$`,
        n(a * 16),
        `${n(2)}배씩 커지는 규칙입니다. ${expr(`${a * 8}\\times2=${a * 16}`)}`,
      );
    }
    const start = intBetween(rng, 3, 40);
    const step = intBetween(rng, 2, 9);
    return make(
      unit,
      `수의 배열에서 규칙을 찾아 $\\square$에 알맞은 수를 쓰시오. ` +
        `${n(start)}, ${n(start + step)}, ${n(start + step * 2)}, ${n(start + step * 3)}, $\\square$`,
      n(start + step * 4),
      `${n(step)}씩 커지는 규칙입니다. ${expr(`${start + step * 3}+${step}=${start + step * 4}`)}`,
    );
  }

  if (c === "1-6-2") {
    if (intBetween(rng, 0, 2) === 0) {
      return make(
        unit,
        `모형을 정사각형 모양으로 늘어놓았습니다. 첫째는 ${n(1)}개, 둘째는 ${n(4)}개, 셋째는 ${n(9)}개일 때 다섯째는 몇 개인가?`,
        n(25),
        `${expr("1\\times1=1")}, ${expr("2\\times2=4")}, ${expr("3\\times3=9")} 이므로 ` +
          `다섯째는 ${expr("5\\times5=25")} 입니다.`,
      );
    }
    const start = intBetween(rng, 1, 4);
    const step = intBetween(rng, 2, 5);
    return make(
      unit,
      `도형을 규칙에 따라 늘어놓았습니다. 첫째는 모형이 ${n(start)}개, 둘째는 ${n(start + step)}개, ` +
        `셋째는 ${n(start + step * 2)}개일 때 다섯째는 몇 개인가?`,
      n(start + step * 4),
      `${n(step)}개씩 늘어나는 규칙입니다. ${expr(`${start + step * 2}+${step}+${step}=${start + step * 4}`)}`,
    );
  }

  if (c === "1-6-3") {
    const u = intBetween(rng, 1, 6);
    const row = (k: number) => [100 * k + u, 100 * k + u + 1] as const;
    const sum = (k: number) => row(k)[0] + row(k)[1];
    return make(
      unit,
      `계산식의 배열에서 규칙을 찾아 $\\square$에 알맞은 수를 쓰시오. ` +
        `${expr(`${row(1)[0]}+${row(1)[1]}=${sum(1)}`)}, ${expr(`${row(2)[0]}+${row(2)[1]}=${sum(2)}`)}, ` +
        `${expr(`${row(3)[0]}+${row(3)[1]}=\\square`)}`,
      n(sum(3)),
      `더하는 두 수가 각각 ${n(100)}씩 커지므로 합은 ${n(200)}씩 커집니다. ` +
        `${expr(`${sum(2)}+200=${sum(3)}`)}`,
    );
  }

  if (c === "1-6-4") {
    if (intBetween(rng, 0, 1) === 0) {
      const a = intBetween(rng, 12, 48);
      const b = intBetween(rng, 3, 9);
      return make(
        unit,
        `계산식의 배열에서 규칙을 찾아 $\\square$에 알맞은 수를 쓰시오. ` +
          `${expr(`${a}\\times${b}=${a * b}`)}, ${expr(`${a}\\times${b * 10}=${a * b * 10}`)}, ` +
          `${expr(`${a}\\times${b * 100}=\\square`)}`,
        n(a * b * 100),
        `곱하는 수가 ${n(10)}배가 되면 곱도 ${n(10)}배가 됩니다. ${expr(`${a * b * 10}\\times10=${a * b * 100}`)}`,
      );
    }
    const a = intBetween(rng, 40, 90);
    const b = intBetween(rng, 11, 30);
    return make(
      unit,
      `계산식의 배열에서 규칙을 찾아 $\\square$에 알맞은 수를 쓰시오. ` +
        `${expr(`${a}-${b}=${a - b}`)}, ${expr(`${a + 10}-${b + 10}=${a - b}`)}, ` +
        `${expr(`${a + 20}-${b + 20}=\\square`)}`,
      n(a - b),
      `빼지는 수와 빼는 수가 똑같이 ${n(10)}씩 커지면 차는 변하지 않습니다.`,
    );
  }

  if (c === "1-6-5") {
    const a = intBetween(rng, 12, 48);
    const b = intBetween(rng, 12, 48);
    const gap = intBetween(rng, 2, 9);
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `등호(=)의 양쪽이 같아지도록 $\\square$에 알맞은 수를 쓰시오. ${expr(`${a}+${b}=${a + gap}+\\square`)}`,
        n(b - gap),
        `왼쪽의 ${josaNum(a, "이", "가")} ${n(gap)}만큼 커졌으므로 ${josaNum(b, "은", "는")} ${n(gap)}만큼 작아져야 합니다. ` +
          `${expr(`${b}-${gap}=${b - gap}`)}`,
      );
    }
    const big = a + b;
    return make(
      unit,
      `등호(=)의 양쪽이 같아지도록 $\\square$에 알맞은 수를 쓰시오. ${expr(`${big}-${b}=${big + gap}-\\square`)}`,
      n(b + gap),
      `빼지는 수가 ${n(gap)}만큼 커졌으므로 빼는 수도 ${n(gap)}만큼 커져야 차가 같습니다. ` +
        `${expr(`${b}+${gap}=${b + gap}`)}`,
    );
  }

  return noBranch(unit);
}

/* ──────────── 1-6 난이도 4단 (D-72 확대, 2026-08-23) ────────────
 *
 * 그림 없이 수·식 배열로만 간다. 배열 갈래의 유일성(주어진 항으로 규칙이 하나로
 * 서는가)은 시험이 {등차·등비·증가증가} 를 전부 대 보는 반증 형태로 잠근다.
 * 신기한 계산식 가족(37×3k 등)의 해설은 곱셈을 다시 하는 것이 아니라 패턴으로
 * 유도한다 — 결과의 자릿수는 표시용이다(규모 상한 99000).
 */

/** 몇째의 한글 서수 — 답·발문에 수 없이 쓴다. */
const ORDINAL = [
  "첫째",
  "둘째",
  "셋째",
  "넷째",
  "다섯째",
  "여섯째",
  "일곱째",
  "여덟째",
  "아홉째",
] as const;

/** **1-6-1 1단 연산 — 줄어드는 등차.** 표준(증가 둘)에 없는 감소 배열. */
function tier61Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 2, 9);
  const a = intBetween(rng, 50, 99);
  const t = [a, a - d, a - d * 2, a - d * 3];
  return make(
    unit,
    `규칙에 따라 수를 늘어놓았습니다. 다섯째에 올 수를 쓰시오. ` +
      `${t.map((v) => n(v)).join(", ")}`,
    n(a - d * 4),
    `${n(d)}씩 작아지는 규칙입니다. ${expr(`${a - d * 3}-${d}=${a - d * 4}`)} 입니다.`,
  );
}

/** **1-6-1 2단 기본 — 가운데가 비었다.** 표준은 늘 끝이 빈다. */
function tier61Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 2, 9);
  const a = intBetween(rng, 3, 40);
  return make(
    unit,
    `수의 배열에서 규칙을 찾아 가운데 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
      `${n(a)}, ${n(a + d)}, ${expr("\\square")}, ${n(a + d * 3)}, ${n(a + d * 4)}`,
    n(a + d * 2),
    `${n(d)}씩 커지는 규칙입니다. ${expr(`${a + d}+${d}=${a + d * 2}`)} 입니다.`,
  );
}

/** **1-6-1 3단 응용 — 멀리 있는 항.** 규칙을 찾아 여러 번 잇는다(두 단계). */
function tier61Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const d = intBetween(rng, 2, 9);
    const a = intBetween(rng, 3, 40);
    return make(
      unit,
      `규칙에 따라 수를 늘어놓을 때 여덟째에 올 수를 쓰시오. ` +
        `${n(a)}, ${n(a + d)}, ${n(a + d * 2)}, ${n(a + d * 3)}`,
      n(a + d * 7),
      `${n(d)}씩 커지는 규칙입니다. 여덟째 수는 첫째 수보다 ${n(d)}씩 ${n(7)}번 큰 수이므로 ` +
        `${expr(`${a}+${d}\\times7=${a + d * 7}`)} 입니다.`,
    );
  }
  const a = intBetween(rng, 2, 6);
  return make(
    unit,
    `규칙에 따라 수를 늘어놓을 때 여섯째에 올 수를 쓰시오. ` +
      `${n(a)}, ${n(a * 2)}, ${n(a * 4)}, ${n(a * 8)}`,
    n(a * 32),
    `${n(2)}배씩 커지는 규칙입니다. ${expr(`${a * 8}\\times2=${a * 16}`)}, ` +
      `${expr(`${a * 16}\\times2=${a * 32}`)} 입니다.`,
  );
}

/** **1-6-1 4단 심화 — 역산·조건.** 다섯째에서 첫째를 되짚거나, 처음으로 넘는 째를 찾는다. */
function tier61Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 2, 9);
  if (intBetween(rng, 0, 1) === 0) {
    const a = intBetween(rng, 3, 40);
    const fifth = a + d * 4;
    return make(
      unit,
      `${n(d)}씩 커지는 규칙으로 수를 늘어놓았습니다. 다섯째 수가 ${josaNum(fifth, "이", "가")} ` +
        `되었다면 첫째 수는 얼마인가?`,
      n(a),
      `다섯째 수는 첫째 수보다 ${n(d)}씩 ${n(4)}번 큰 수입니다. ` +
        `${expr(`${fifth}-${d}\\times4=${a}`)} 이므로 첫째 수는 ${n(a)}입니다.`,
    );
  }
  const a = intBetween(rng, 3, 20);
  const k = intBetween(rng, 5, 9);
  const L = a + d * (k - 1) - intBetween(rng, 1, d - 1 || 1);
  const terms = [a, a + d, a + d * 2, a + d * 3];
  return make(
    unit,
    `규칙에 따라 수를 늘어놓을 때 처음으로 ${josaNum(L, "을", "를")} 넘는 수는 몇째에 ` +
      `오는가? ${terms.map((v) => n(v)).join(", ")}`,
    ORDINAL[k - 1]!,
    `${n(d)}씩 커지는 규칙입니다. ${ORDINAL[k - 2]!} 수는 ${expr(`${a}+${d}\\times${k - 2}=${a + d * (k - 2)}`)} 로 ` +
      `${n(L)}보다 크지 않고, ${ORDINAL[k - 1]!} 수는 ${expr(`${a}+${d}\\times${k - 1}=${a + d * (k - 1)}`)} 로 ` +
      `처음으로 ${josaNum(L, "을", "를")} 넘습니다.`,
  );
}

/** **1-6-2 1단 연산 — 늘어나는 개수 읽기.** 표준(몇째의 개수)과 묻는 것이 다르다. */
function tier62Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 1, 5);
  const d = intBetween(rng, 2, 6);
  return make(
    unit,
    `모형을 규칙에 따라 늘어놓았습니다. 첫째는 ${n(s)}개, 둘째는 ${n(s + d)}개, ` +
      `셋째는 ${n(s + d * 2)}개입니다. 모형이 몇 개씩 늘어나는 규칙인지 쓰시오.`,
    `${n(d)}개씩`,
    `${expr(`${s + d}-${s}=${d}`)} 이고 ${expr(`${s + d * 2}-${s + d}=${d}`)} 이므로 ` +
      `${n(d)}개씩 늘어나는 규칙입니다.`,
  );
}

/**
 * **1-6-2 2단 기본 — 늘어나는 개수가 1개씩 커지는 배열.** 표준의 제곱수·등차와
 * 셋째 가족이다(계단을 넓혀 쌓는 꼴).
 */
function tier62Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 1, 5);
  const inc = intBetween(rng, 2, 4);
  const t2 = s + inc;
  const t3 = t2 + inc + 1;
  const askFive = intBetween(rng, 0, 1) === 0;
  const t4 = t3 + inc + 2;
  const t5 = t4 + inc + 3;
  return make(
    unit,
    `모형을 규칙에 따라 늘어놓았습니다. 첫째는 ${n(s)}개, 둘째는 ${n(t2)}개, ` +
      `셋째는 ${n(t3)}개입니다. ${askFive ? "다섯째" : "넷째"}는 몇 개인가?`,
    `${n(askFive ? t5 : t4)}개`,
    `늘어나는 개수가 ${n(inc)}개, ${n(inc + 1)}개로 ${n(1)}개씩 커지는 규칙입니다. ` +
      `${expr(`${t3}+${inc + 2}=${t4}`)}${askFive ? ` 이고 ${expr(`${t4}+${inc + 3}=${t5}`)}` : ""} 이므로 ` +
      `${askFive ? "다섯째" : "넷째"}는 ${n(askFive ? t5 : t4)}개입니다.`,
  );
}

/** **1-6-2 3단 응용 — 개수에서 몇째를 되찾는다(두 단계).** */
function tier62Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 1, 5);
  const d = intBetween(rng, 2, 6);
  const k = intBetween(rng, 5, 9);
  const target = s + d * (k - 1);
  return make(
    unit,
    `모형을 규칙에 따라 늘어놓았습니다. 첫째는 ${n(s)}개, 둘째는 ${n(s + d)}개, ` +
      `셋째는 ${n(s + d * 2)}개입니다. 모형이 ${n(target)}개인 것은 몇째인가?`,
    ORDINAL[k - 1]!,
    `${n(d)}개씩 늘어나는 규칙입니다. 첫째보다 ${expr(`${target}-${s}=${target - s}`)} 개 많고 ` +
      `${expr(`${target - s}\\div${d}=${k - 1}`)} 이므로 ${n(d)}개씩 ${n(k - 1)}번 늘어난 ` +
      `${ORDINAL[k - 1]!}입니다.`,
  );
}

/** **1-6-2 4단 심화 — 첫째부터 넷째까지의 합.** 규칙을 잇고 더하는 다단계. */
function tier62Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 1, 5);
  const d = intBetween(rng, 2, 6);
  const t = [s, s + d, s + d * 2, s + d * 3];
  const total = t[0]! + t[1]! + t[2]! + t[3]!;
  return make(
    unit,
    `모형을 규칙에 따라 늘어놓았습니다. 첫째는 ${n(s)}개, 둘째는 ${n(s + d)}개, ` +
      `셋째는 ${n(s + d * 2)}개입니다. 첫째부터 넷째까지 놓은 모형은 모두 몇 개인가?`,
    `${n(total)}개`,
    `${n(d)}개씩 늘어나므로 넷째는 ${expr(`${t[2]}+${d}=${t[3]}`)} 개입니다. ` +
      `${expr(`${t[0]}+${t[1]}+${t[2]}+${t[3]}=${total}`)} 이므로 모두 ${n(total)}개입니다.`,
  );
}

/** 1-6-3 갈래의 덧셈식 배열 재료 — 나머지 u 를 표준(1~6)과 다른 띠(11~76)에 둔다. */
function addRows(rng: Rng) {
  const u = intBetween(rng, 11, 76);
  const left = (k: number) => 100 * k + u;
  const right = (k: number) => 100 * k + u + 1;
  const sum = (k: number) => left(k) + right(k);
  return { left, right, sum };
}

/** **1-6-3 1단 연산 — 뺄셈식 배열.** 표준(덧셈 행)에 없는 갈래다. */
function tier63Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = intBetween(rng, 6, 9) * 100 + intBetween(rng, 11, 89);
  return make(
    unit,
    `계산식의 배열에서 규칙을 찾아 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
      `${expr(`${m}-100=${m - 100}`)}, ${expr(`${m}-200=${m - 200}`)}, ` +
      `${expr(`${m}-300=\\square`)}`,
    n(m - 300),
    `빼는 수가 ${n(100)}씩 커지므로 차는 ${n(100)}씩 작아집니다. ` +
      `${expr(`${m - 200}-100=${m - 300}`)} 입니다.`,
  );
}

/** **1-6-3 2단 기본 — 다음에 올 계산식 쓰기.** 답이 수가 아니라 **식**이다. */
function tier63Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = addRows(rng);
  return make(
    unit,
    `계산식의 배열에서 규칙을 찾아 넷째에 올 계산식을 쓰시오. ` +
      `${expr(`${r.left(1)}+${r.right(1)}=${r.sum(1)}`)}, ` +
      `${expr(`${r.left(2)}+${r.right(2)}=${r.sum(2)}`)}, ` +
      `${expr(`${r.left(3)}+${r.right(3)}=${r.sum(3)}`)}`,
    expr(`${r.left(4)}+${r.right(4)}=${r.sum(4)}`),
    `더하는 두 수가 각각 ${n(100)}씩 커지고 합은 ${n(200)}씩 커집니다. 넷째 계산식은 ` +
      `${expr(`${r.left(4)}+${r.right(4)}=${r.sum(4)}`)} 입니다.`,
  );
}

/** **1-6-3 3단 응용 — 여섯째의 합(멀리).** 규칙을 찾아 여러 번 잇는다. */
function tier63Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = addRows(rng);
  return make(
    unit,
    `계산식의 배열에서 규칙을 찾아 여섯째 계산식의 합을 구하시오. ` +
      `${expr(`${r.left(1)}+${r.right(1)}=${r.sum(1)}`)}, ` +
      `${expr(`${r.left(2)}+${r.right(2)}=${r.sum(2)}`)}, ` +
      `${expr(`${r.left(3)}+${r.right(3)}=${r.sum(3)}`)}`,
    n(r.sum(6)),
    `합이 ${n(200)}씩 커지는 규칙입니다. 여섯째 합은 첫째 합보다 ${n(200)}씩 ${n(5)}번 큰 수이므로 ` +
      `${expr(`${r.sum(1)}+200\\times5=${r.sum(6)}`)} 입니다.`,
  );
}

/** **1-6-3 4단 심화 — 합에서 몇째를 되찾는다(역산).** */
function tier63Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = addRows(rng);
  const k = intBetween(rng, 5, 9);
  return make(
    unit,
    `계산식의 배열에서 규칙을 찾아 합이 ${josaNum(r.sum(k), "이", "가")} 되는 계산식은 ` +
      `몇째인지 쓰시오. ` +
      `${expr(`${r.left(1)}+${r.right(1)}=${r.sum(1)}`)}, ` +
      `${expr(`${r.left(2)}+${r.right(2)}=${r.sum(2)}`)}, ` +
      `${expr(`${r.left(3)}+${r.right(3)}=${r.sum(3)}`)}`,
    ORDINAL[k - 1]!,
    `합이 ${n(200)}씩 커지는 규칙입니다. ${expr(`${r.sum(k)}-${r.sum(1)}=${r.sum(k) - r.sum(1)}`)} 이고 ` +
      `${expr(`${r.sum(k) - r.sum(1)}\\div200=${k - 1}`)} 이므로 첫째에서 ${n(k - 1)}번 커진 ` +
      `${ORDINAL[k - 1]!}입니다.`,
  );
}

/** **1-6-4 1단 연산 — 나누어지는 수가 10배면 몫도 10배.** 표준(곱셈 쪽)의 나눗셈 짝. */
function tier64Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const a = b * q;
  return make(
    unit,
    `계산식의 배열에서 규칙을 찾아 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
      `${expr(`${a}\\div${b}=${q}`)}, ${expr(`${a * 10}\\div${b}=${q * 10}`)}, ` +
      `${expr(`${a * 100}\\div${b}=\\square`)}`,
    n(q * 100),
    `나누어지는 수가 ${n(10)}배가 되면 몫도 ${n(10)}배가 됩니다. ` +
      `${expr(`${q * 10}\\times10=${q * 100}`)} 입니다.`,
  );
}

/** **1-6-4 2단 기본 — 합이 변하지 않는 배열.** 표준 ①(차 불변)의 덧셈 짝. */
function tier64Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 15, 60);
  const b = intBetween(rng, 33, 80);
  const s = a + b;
  return make(
    unit,
    `계산식의 배열에서 규칙을 찾아 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
      `${expr(`${a}+${b}=${s}`)}, ${expr(`${a + 10}+${b - 10}=${s}`)}, ` +
      `${expr(`${a + 20}+${b - 20}=\\square`)}`,
    n(s),
    `더하는 두 수가 ${n(10)}씩 커지고 ${n(10)}씩 작아지면 합은 변하지 않습니다.`,
  );
}

/** 신기한 계산식 가족 — 결과가 패턴으로 서는 것만. k 는 몇째(3~5). */
const WONDER_FAMILIES = [
  {
    name: "삼칠",
    row: (k: number) => `37\\times${3 * k}=${111 * k}`,
    lhs: (k: number) => `37\\times${3 * k}`,
    value: (k: number) => 111 * k,
    why: `곱하는 수가 ${"$3$"}씩 커질 때마다 결과는 ${"$111$"}씩 커집니다`,
  },
  {
    name: "팔",
    row: (k: number) =>
      `${"123456789".slice(0, k)}\\times8+${k}=${"987654321".slice(0, k)}`,
    lhs: (k: number) => `${"123456789".slice(0, k)}\\times8+${k}`,
    value: (k: number) => Number("987654321".slice(0, k)),
    why: `앞 수가 한 자리씩 길어질 때마다 결과도 ${"$9$"}부터 한 자리씩 길어집니다`,
  },
  {
    name: "구",
    row: (k: number) =>
      `${"123456789".slice(0, k)}\\times9+${k + 1}=${"1".repeat(k + 1)}`,
    lhs: (k: number) => `${"123456789".slice(0, k)}\\times9+${k + 1}`,
    value: (k: number) => Number("1".repeat(k + 1)),
    why: `앞 수가 한 자리씩 길어질 때마다 결과의 ${"$1$"}이 하나씩 늘어납니다`,
  },
] as const;

/** **1-6-4 3단 응용 — 신기한 계산식의 다음 줄.** 계산이 아니라 패턴으로 잇는다. */
function tier64Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const fam = pick(rng, WONDER_FAMILIES);
  // ×9 가족은 다섯째가 111111 로 규모 띠(99000)를 넘는다 — 넷째까지만(팀장 2026-08-23).
  const k = fam.name === "구" ? intBetween(rng, 3, 4) : intBetween(rng, 3, 5);
  const shown = Array.from({ length: k - 1 }, (_, i) => expr(fam.row(i + 1)));
  // 발문이 (가족, k) 로만 정해지면 변형이 여덟뿐이다(실측) — 묻는 문형을 두 벌로 가른다.
  const ask =
    intBetween(rng, 0, 1) === 0
      ? `계산식의 배열에서 규칙을 찾아 ${expr("\\square")} 에 알맞은 수를 쓰시오. `
      : `규칙적인 계산식입니다. ${expr("\\square")} 에 알맞은 수를 구하시오. `;
  return make(
    unit,
    `${ask}${shown.join(", ")}, ${expr(`${fam.lhs(k)}=\\square`)}`,
    n(fam.value(k)),
    `${fam.why}. ${expr(`${fam.lhs(k)}=${fam.value(k)}`)} 입니다.`,
  );
}

/** **1-6-4 4단 심화 — 결과에서 식을 되찾는다(역산, 답이 식).** */
function tier64Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  // 묻는 문형을 두 벌로 — ×9 가족은 목표값이 두 가지뿐이라 문형이 하나면 변형이 좁다.
  const ask = (v: number) =>
    intBetween(rng, 0, 1) === 0
      ? `계산식의 배열에서 규칙을 찾아 계산 결과가 ${josaNum(v, "이", "가")} 되는 계산식을 쓰시오. `
      : `규칙적인 계산식입니다. 계산 결과가 ${josaNum(v, "이", "가")} 되는 계산식을 쓰시오. `;
  if (intBetween(rng, 0, 1) === 0) {
    const k = intBetween(rng, 4, 8);
    // 보이는 줄 수도 씨앗으로 가른다 — 목표값만 갈리면 변형이 좁다(실측 6/16).
    const rows = intBetween(rng, 2, 3);
    const shown = Array.from({ length: rows }, (_, i) =>
      expr(`37\\times${3 * (i + 1)}=${111 * (i + 1)}`),
    ).join(", ");
    return make(
      unit,
      `${ask(111 * k)}${shown}`,
      expr(`37\\times${3 * k}=${111 * k}`),
      `결과가 ${n(111)}씩 커질 때 곱하는 수는 ${n(3)}씩 커집니다. ` +
        `${expr(`111\\times${k}=${111 * k}`)} 이므로 ${expr(`37\\times${3 * k}=${111 * k}`)} 입니다.`,
    );
  }
  // ×9 가족은 넷째까지(11111) — 다섯째 111111 은 규모 띠 밖.
  const k = intBetween(rng, 3, 4);
  const ones = "1".repeat(k + 1);
  const rows = k === 3 ? 2 : intBetween(rng, 2, 3);
  const shown = Array.from({ length: rows }, (_, i) =>
    expr(
      `${"123456789".slice(0, i + 1)}\\times9+${i + 2}=${"1".repeat(i + 2)}`,
    ),
  ).join(", ");
  return make(
    unit,
    `${ask(Number(ones))}${shown}`,
    expr(`${"123456789".slice(0, k)}\\times9+${k + 1}=${ones}`),
    `결과의 ${n(1)}이 하나씩 늘 때 앞 수도 한 자리씩 길어집니다. ` +
      `${expr(`${"123456789".slice(0, k)}\\times9+${k + 1}=${ones}`)} 입니다.`,
  );
}

/** **1-6-5 1단 연산 — 옳은 식 판단.** 절반은 어긋난 식이다. */
function tier65Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 12, 48);
  const b = intBetween(rng, 12, 48);
  const gap = intBetween(rng, 2, 9);
  const ok = intBetween(rng, 0, 1) === 0;
  const rightB = ok ? b - gap : b - gap + pick(rng, [-2, -1, 1, 2]);
  return make(
    unit,
    `다음 식은 옳은가? 옳으면 '예', 옳지 않으면 '아니요'로 답하시오. ` +
      `${expr(`${a}+${b}=${a + gap}+${rightB}`)}`,
    ok ? "예" : "아니요",
    `왼쪽은 ${expr(`${a}+${b}=${a + b}`)} 이고 오른쪽은 ${expr(`${a + gap}+${rightB}=${a + gap + rightB}`)} 입니다. ` +
      `${ok ? "두 값이 같으므로 옳은 식입니다." : "두 값이 다르므로 옳지 않은 식입니다."}`,
  );
}

/** **1-6-5 2단 기본 — 세 수를 묶어 등호를 세운다.** */
function tier65Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 11, 40);
  const b = intBetween(rng, 11, 40);
  const c3 = intBetween(rng, 11, 40);
  return make(
    unit,
    `등호(=)의 양쪽이 같아지도록 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
      `${expr(`${a}+${b}+${c3}=${a}+\\square`)}`,
    n(b + c3),
    `양쪽에 ${josaNum(a, "이", "가")} 똑같이 있으므로 ${expr("\\square")} 는 나머지 두 수의 ` +
      `합입니다. ${expr(`${b}+${c3}=${b + c3}`)} 입니다.`,
  );
}

/** **1-6-5 3단 응용 — 지름길이 없는 일반형(두 단계).** 합을 구해 되뺀다. */
function tier65Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 15, 48);
  const b = intBetween(rng, 15, 48);
  const s = a + b;
  const c3 = intBetween(rng, 11, s - 11);
  return make(
    unit,
    `등호(=)의 양쪽이 같아지도록 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
      `${expr(`${a}+${b}=${c3}+\\square`)}`,
    n(s - c3),
    `왼쪽의 합은 ${expr(`${a}+${b}=${s}`)} 입니다. ${expr(`${s}-${c3}=${s - c3}`)} 이므로 ` +
      `${expr("\\square")} 에 알맞은 수는 ${n(s - c3)}입니다.`,
  );
}

/** **1-6-5 4단 심화 — 혼합 역산.** 등호 건너의 뺄셈·곱셈을 되짚는다. */
function tier65Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 1) === 0) {
    const a = intBetween(rng, 15, 48);
    const b = intBetween(rng, 15, 48);
    const c3 = intBetween(rng, 11, 40);
    return make(
      unit,
      `등호(=)의 양쪽이 같아지도록 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
        `${expr(`${a}+${b}=\\square-${c3}`)}`,
      n(a + b + c3),
      `왼쪽의 합은 ${expr(`${a}+${b}=${a + b}`)} 입니다. ${expr("\\square")} 에서 ` +
        `${josaNum(c3, "을", "를")} 뺀 값이 ${josaNum(a + b, "과", "와")} 같아야 하므로 ` +
        `${expr(`${a + b}+${c3}=${a + b + c3}`)} 입니다.`,
    );
  }
  // ⚠️ 곱을 먼저 뽑고 그 안에서 a 를 고르면 «$3\times3=9$ 인데 a 는 11 이상» 같은
  // 뒤집힌 범위가 난다(팀장 적발 2026-08-23, 조건 판정기가 던졌다). 곱이 넉넉해지도록
  // **c3 를 고른 뒤 b 의 하한을 그로부터 계산**한다 — 구성으로 하한 ≤ 상한을 보장한다.
  const c3 = intBetween(rng, 3, 9);
  const b = intBetween(rng, Math.ceil(20 / c3), 12);
  const a = intBetween(rng, 11, b * c3 - 2);
  return make(
    unit,
    `등호(=)의 양쪽이 같아지도록 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
      `${expr(`\\square+${a}=${b}\\times${c3}`)}`,
    n(b * c3 - a),
    `오른쪽은 ${expr(`${b}\\times${c3}=${b * c3}`)} 입니다. ${expr(`${b * c3}-${a}=${b * c3 - a}`)} 이므로 ` +
      `${expr("\\square")} 에 알맞은 수는 ${n(b * c3 - a)}입니다.`,
  );
}

/* ───────────────── 2-1 분수의 덧셈과 뺄셈 ───────────────── */

const FRAC_DENS = [5, 6, 7, 8, 9, 10, 12] as const;

/**
 * 분모가 같은 분수 계산에서 **약분이 필요 없는** 짝만 고른다 — 약분은 초5(1-4 약분과 통분)다.
 * 답의 분자를 분모로 나눈 나머지가 분모와 서로소면 `fmtFrac` 이 약분하지 않는다.
 */
function fracPairs(den: number, op: "add" | "sub"): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 1; a < den; a += 1) {
    for (let b = 1; b < den; b += 1) {
      const raw = op === "add" ? a + b : a - b;
      if (raw <= 0) continue;
      const rest = raw % den;
      if (rest === 0 || gcd(rest, den) !== 1) continue;
      out.push([a, b]);
    }
  }
  return out;
}

/** 대분수 뺄셈 짝. `borrow` 는 분수끼리 뺄 수 없어 자연수에서 받아내림하는 경우다. */
function mixedSubPairs(
  den: number,
): { a: number; b: number; borrow: boolean }[] {
  const out: { a: number; b: number; borrow: boolean }[] = [];
  for (let a = 1; a < den; a += 1) {
    for (let b = 1; b < den; b += 1) {
      if (a === b) continue;
      const rest = a > b ? a - b : a - b + den;
      if (gcd(rest, den) !== 1) continue;
      out.push({ a, b, borrow: a < b });
    }
  }
  return out;
}

function fracAdd42(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = code(unit);
  const den = pick(rng, FRAC_DENS);

  if (c === "2-1-1") {
    const drawable = fracPairs(den, "add").filter(([a, b]) => a + b < den);
    if (drawable.length > 0 && intBetween(rng, 0, 2) === 0) {
      const [a, b] = pick(rng, drawable);
      return make(
        unit,
        `색칠한 부분은 전체의 ${expr(`\\frac{${a}}{${den}}`)}입니다. ` +
          `여기에 ${expr(`\\frac{${b}}{${den}}`)}만큼 더 색칠하면 색칠한 부분은 전체의 얼마인가?`,
        expr(`\\frac{${a + b}}{${den}}`),
        // (으)로는 받침표가 아니라 소리표(roJosa)다 — den 7·8 이 «7으로/8으로»로 나가던 자리.
        `전체를 ${roJosa(den)} 똑같이 나눈 것 중 ${n(a)}칸에 ${n(b)}칸을 더 색칠하면 ${n(a + b)}칸입니다. ` +
          `${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}=\\frac{${a + b}}{${den}}`)}`,
        fracSpec(rng, den, a),
      );
    }
    const [a, b] = pick(rng, fracPairs(den, "add"));
    const carried = a + b >= den;
    return make(
      unit,
      expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}=\\square`),
      expr(fmtFrac(a + b, den)),
      `분모가 같은 분수의 덧셈은 분자끼리 더합니다. ` +
        `${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}=\\frac{${a + b}}{${den}}`)}` +
        (carried
          ? ` 가분수이므로 대분수로 고치면 ${expr(fmtFrac(a + b, den))} 입니다.`
          : " 입니다."),
    );
  }

  if (c === "2-1-2") {
    const pairs = fracPairs(den, "sub");
    const [a, b] = pick(rng, pairs);
    if (intBetween(rng, 0, 2) === 0) {
      return make(
        unit,
        `색칠한 부분은 전체의 ${expr(`\\frac{${a}}{${den}}`)}입니다. ` +
          `여기에서 ${expr(`\\frac{${b}}{${den}}`)}만큼 지우면 남은 부분은 전체의 얼마인가?`,
        expr(`\\frac{${a - b}}{${den}}`),
        `색칠한 ${n(a)}칸에서 ${n(b)}칸을 지우면 ${n(a - b)}칸이 남습니다. ` +
          `${expr(`\\frac{${a}}{${den}}-\\frac{${b}}{${den}}=\\frac{${a - b}}{${den}}`)}`,
        fracSpec(rng, den, a),
      );
    }
    return make(
      unit,
      expr(`\\frac{${a}}{${den}}-\\frac{${b}}{${den}}=\\square`),
      expr(`\\frac{${a - b}}{${den}}`),
      `분모가 같은 분수의 뺄셈은 분자끼리 뺍니다. ` +
        `${expr(`\\frac{${a}}{${den}}-\\frac{${b}}{${den}}=\\frac{${a - b}}{${den}}`)} 입니다.`,
    );
  }

  if (c === "2-1-3") {
    const [a, b] = pick(rng, fracPairs(den, "add"));
    const w1 = intBetween(rng, 1, 4);
    const plain = intBetween(rng, 0, 1) === 0;
    if (plain) {
      const total = w1 * den + a + b;
      return make(
        unit,
        expr(`${w1}\\frac{${a}}{${den}}+\\frac{${b}}{${den}}=\\square`),
        expr(fmtFrac(total, den)),
        `자연수는 그대로 두고 분수끼리 더합니다. ` +
          `${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}=\\frac{${a + b}}{${den}}`)} 이므로 ` +
          `답은 ${expr(fmtFrac(total, den))} 입니다.`,
      );
    }
    const w2 = intBetween(rng, 1, 3);
    const total = w1 * den + a + (w2 * den + b);
    const carried = a + b >= den;
    return make(
      unit,
      expr(`${w1}\\frac{${a}}{${den}}+${w2}\\frac{${b}}{${den}}=\\square`),
      expr(fmtFrac(total, den)),
      `자연수는 자연수끼리, 분수는 분수끼리 더합니다. ` +
        `${expr(`${w1}+${w2}=${w1 + w2}`)}, ` +
        `${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}=\\frac{${a + b}}{${den}}`)}` +
        (carried
          ? ` 입니다. 분수 부분이 가분수이므로 자연수에 ${n(1)}을 받아올려 ${expr(fmtFrac(total, den))} 입니다.`
          : ` 이므로 답은 ${expr(fmtFrac(total, den))} 입니다.`),
    );
  }

  if (c === "2-1-4") {
    const { a, b, borrow } = pick(rng, mixedSubPairs(den));
    const w2 = intBetween(rng, 1, 3);
    const w1 = w2 + intBetween(rng, 1, 3);
    const total = w1 * den + a - (w2 * den + b);
    return make(
      unit,
      expr(`${w1}\\frac{${a}}{${den}}-${w2}\\frac{${b}}{${den}}=\\square`),
      expr(fmtFrac(total, den)),
      borrow
        ? `분수끼리 뺄 수 없으므로 ${expr(`${w1}\\frac{${a}}{${den}}=${w1 - 1}\\frac{${a + den}}{${den}}`)} ` +
            `으로 고칩니다. ${expr(`${w1 - 1}-${w2}=${w1 - 1 - w2}`)}, ` +
            `${expr(`\\frac{${a + den}}{${den}}-\\frac{${b}}{${den}}=\\frac{${a + den - b}}{${den}}`)} 이므로 ` +
            `답은 ${expr(fmtFrac(total, den))} 입니다.`
        : `자연수는 자연수끼리, 분수는 분수끼리 뺍니다. ${expr(`${w1}-${w2}=${w1 - w2}`)}, ` +
            `${expr(`\\frac{${a}}{${den}}-\\frac{${b}}{${den}}=\\frac{${a - b}}{${den}}`)} 이므로 ` +
            `답은 ${expr(fmtFrac(total, den))} 입니다.`,
    );
  }

  return noBranch(unit);
}
/* ──────────── 2-1 난이도 4단 (D-72 확대, 2026-08-23) ────────────
 *
 * 초4 는 **분모가 같은** 범위다 — 통분은 초5 1-5 다. 그런데 **소단원 이름이 넷 다 초5 1-5
 * 와 같다**(진분수의 덧셈·뺄셈, 대분수의 덧셈·뺄셈). 이름이 같으면 문형·낱말이 겹치기
 * 쉽고, 겹치면 두 학년이 사실상 같은 문항을 낸다. 그래서 초5 가 쓰는 자리를 피한다 —
 * 「계산하시오.」·「A는 X를, B는 Y를 가지고 있습니다」·「… 중에서 …를 썼습니다」·
 * 「어떤 수에 …를 더했더니」·「□ 안에 알맞은 수를 구하시오」, 그리고 **사람 이름 전부**.
 * 소재도 나눠 갖는다(초5 는 철사·밀가루·설탕·물·우유·색 테이프·리본·피자·색종이를 쓴다).
 *
 * ⚠️ 이 회피를 **손 목록으로 지키지 않는다** — 손 목록은 샌다(세는 쪽과 고치는 쪽이 같이
 * 눈이 먼다). 시험이 초5 1-5 를 **실제로 뽑아** ㉠ 발문 완전 일치 ㉡ 수를 가린 골격 일치를
 * 둘 다 0 으로 세고, 진짜 판별자인 **동분모**에는 「초5 에는 분모가 다른 발문이 실제로
 * 있다」는 음성 대조군을 붙인다 — 안 그러면 그 판별자가 가르는지 알 수 없다.
 *
 * 약분은 초5 1-4 다. 표준(`fracAdd42`)이 **답이 약분되지 않는 짝만** 뽑는 약속을 쓰므로
 * 갈래도 그 약속을 잇는다 — 문턱을 밀지 않고 **짝을 전수 열거해서** 고른다. 뺄셈이 음수로
 * 접히지 않는 것도 열거한 풀이 보장한다. 그리고 풀이 빌 수 있는 분모는 `pick` 전에
 * **분모 쪽에서 걸러**(`densWith`) 던질 자리를 아예 없앤다.
 */

/** 여러 답을 늘어놓는다 — 「$1$, $2$, $3$」. */
function nums(values: readonly number[]): string {
  return values.map((v) => n(v)).join(", ");
}

/** 답으로 나갈 수 있는 분자인가 — 분모로 나누어떨어지지도, 약분되지도 않는다. */
function cleanRest(num: number, den: number): boolean {
  const rest = ((num % den) + den) % den;
  return rest !== 0 && gcd(rest, den) === 1;
}

/** 풀이 빈 분모를 **뽑기 전에** 걸러 낸다. 씨앗을 다시 뽑는 대신 못 뽑을 자리를 없앤다. */
function densWith(pool: (den: number) => { length: number }): number[] {
  return FRAC_DENS.filter((d) => pool(d).length > 0);
}

/**
 * 합이 $1$ 을 **안 넘는** 짝. 「화단의 얼마에 심었나」처럼 **전체가 $1$ 인 상황**에 쓴다 —
 * 그런 자리에 합이 $1$ 을 넘는 짝을 쓰면 「화단 전체의 $1\frac{4}{9}$ 에 심었다」가 되어
 * 상황 자체가 거짓이 된다(눈검수에서 실제로 나왔다).
 */
function properSumPairs(den: number): [number, number][] {
  return fracPairs(den, "add").filter(([a, b]) => a + b < den);
}

/**
 * 2-1-1 3단 — 「$b$ 만큼 더 긴 것」을 거쳐 합을 구한다. 셋 다 진분수로 두고(`a+b<den`)
 * 답만 대분수가 될 수 있게 한다. 중간값 `(a+b)/den` 도 **답으로 나가는 값**이라 약분되면 안 된다.
 */
function relSumPairs(den: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 1; a < den; a += 1) {
    for (let b = 1; a + b < den; b += 1) {
      if (gcd(a + b, den) !== 1) continue;
      if (!cleanRest(2 * a + b, den)) continue;
      out.push([a, b]);
    }
  }
  return out;
}

/**
 * 2-1-1 4단 — 「더할 것을 잘못하여 뺐다」. `[b, c]` 에서 잘못 계산한 값이 `c/den`,
 * 어떤 수가 `(c+b)/den`, 바르게 계산한 값이 `(c+2b)/den` 이다. 셋 다 약분되면 안 되고
 * 어떤 수는 진분수여야 한다(소단원 약속).
 */
function wrongAddPairs(den: number): [number, number][] {
  const out: [number, number][] = [];
  for (let b = 1; b < den; b += 1) {
    for (let c = 1; c < den; c += 1) {
      if (b === c) continue; // 「$\frac25$ 를 뺐더니 $\frac25$」 는 읽는 사람을 헷갈리게 한다
      if (gcd(c, den) !== 1) continue;
      if (c + b >= den || gcd(c + b, den) !== 1) continue;
      if (!cleanRest(c + 2 * b, den)) continue;
      out.push([b, c]);
    }
  }
  return out;
}

/** 위와 같되 「두 값의 차 $2b/den$」까지 답으로 나가는 가지. 분모를 미리 거르는 쪽을 쓴다. */
function wrongDiffPairs(den: number): [number, number][] {
  return wrongAddPairs(den).filter(([b]) => cleanRest(2 * b, den));
}

/** 2-1-2 2단 — 전체 $1$ 에서 뺀다. 남은 `den-a` 가 약분되면 안 된다. */
function wholeMinusNums(den: number): number[] {
  const out: number[] = [];
  for (let a = 1; a < den; a += 1) if (gcd(den - a, den) === 1) out.push(a);
  return out;
}

/** 2-1-2 3단 — 두 번 덜어 낸다. 중간값 `a-b` 와 답 `a-b-c` 가 둘 다 약분되면 안 된다. */
function twoUseTriples(den: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let a = 3; a < den; a += 1) {
    for (let b = 1; b < a; b += 1) {
      if (gcd(a - b, den) !== 1) continue;
      for (let c = 1; c < a - b; c += 1) {
        if (gcd(a - b - c, den) !== 1) continue;
        out.push([a, b, c]);
      }
    }
  }
  return out;
}

/**
 * 2-1-2 4단 — 차보다 «작은»/«큰» 동분모 진분수의 개수. 답이 **둘 이상**인 것만 남긴다 —
 * 0개·전부인 씨앗이 섞이면 셈이 아니라 요행이 된다.
 */
function countPairs(den: number, less: boolean): [number, number][] {
  return fracPairs(den, "sub").filter(([a, b]) =>
    less ? a - b - 1 >= 2 : den - 1 - (a - b) >= 2,
  );
}

/** 2-1-3 1단 — 분수 부분이 반드시 **받아올림**되는 짝. 표준은 둘을 섞는다. */
function carryPairs(den: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 1; a < den; a += 1) {
    for (let b = 1; b < den; b += 1) {
      if (a + b <= den) continue;
      if (gcd(a + b - den, den) !== 1) continue;
      out.push([a, b]);
    }
  }
  return out;
}

/** 2-1-3 2단 — 받아올림이 있어도 없어도 된다. 답만 약분되지 않으면 된다. */
function mixedSumPairs(den: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 1; a < den; a += 1) {
    for (let b = 1; b < den; b += 1) {
      if (cleanRest(a + b, den)) out.push([a, b]);
    }
  }
  return out;
}

/**
 * 2-1-3 3단 — 세 값의 합. 분자를 **서로 다르게** 둔다 — 같으면 자연수 부분까지 겹쳤을 때
 * 「둘째 날과 셋째 날이 글자 그대로 같은 값」인 발문이 나온다.
 */
function threeSumTriples(den: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let a = 1; a < den; a += 1) {
    for (let b = 1; b < den; b += 1) {
      if (b === a) continue;
      for (let c = 1; c < den; c += 1) {
        if (c === a || c === b) continue;
        if (cleanRest(a + b + c, den)) out.push([a, b, c]);
      }
    }
  }
  return out;
}

/**
 * 2-1-3 4단 — 수 카드 셋 중 둘로 대분수를 만든다. `p<q<r` 일 때 가장 큰 것은 `r q/den`,
 * 가장 작은 것은 `p q/den` 이라 **분자가 둘 다 `q`** 다. 그래서 합의 분수 부분은 `2q/den`.
 */
function cardTriples(den: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let p = 1; p < den - 2; p += 1) {
    for (let q = p + 1; q < den - 1; q += 1) {
      if (!cleanRest(2 * q, den)) continue;
      for (let r = q + 1; r < den; r += 1) out.push([p, q, r]);
    }
  }
  return out;
}

/** 2-1-4 1단 — 분수끼리 뺄 수 없어 **받아내림**하는 짝(`a<b`). */
function borrowPairs(den: number): [number, number][] {
  const out: [number, number][] = [];
  for (let a = 1; a < den; a += 1) {
    for (let b = a + 1; b < den; b += 1) {
      if (gcd(a + den - b, den) !== 1) continue;
      out.push([a, b]);
    }
  }
  return out;
}

/** 2-1-4 3단 — 가장 큰 것과 가장 작은 것의 차. 자연수 차가 $2$ 이므로 답은 늘 양수다. */
function spreadPairs(den: number): [number, number][] {
  const out: [number, number][] = [];
  for (let p = 1; p < den; p += 1) {
    for (let q = 1; q < den; q += 1) {
      if (q === p) continue;
      if (!cleanRest(q - p, den)) continue;
      out.push([p, q]);
    }
  }
  return out;
}

/**
 * 2-1-4 4단 — 「$\square$ 에 들어갈 수 있는 자연수」. **답의 개수를 먼저 정하고** 수를 짠다 —
 * 조건을 만든 뒤 세면 0개·전부인 씨앗이 섞인다. `c = a + den - m - 1` 로 잡으면
 * 뺀 값이 오른쪽과 **같아지는** $\square$ 가 정확히 `m+1` 이 된다(자연수 차는 늘 $2$).
 */
function ineqPairs(den: number, greater: boolean): [number, number][] {
  const out: [number, number][] = [];
  for (let m = 2; m <= den - 2; m += 1) {
    if (!greater && den - m - 2 < 2) continue;
    for (let a = 1; a <= m; a += 1) out.push([m, a]);
  }
  return out;
}

/** **2-1-1 1단 연산 — 동분모 진분수의 합.** 표준의 `=\square` 꼴과 달리 말로 묻는다. */
function tier211Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, FRAC_DENS);
  const [a, b] = pick(rng, fracPairs(den, "add"));
  const sum = a + b;
  return make(
    unit,
    `다음 두 분수의 합을 구하시오.\n\n${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}`)}`,
    expr(fmtFrac(sum, den)),
    `분모가 같은 분수끼리는 분자끼리 더합니다. ` +
      `${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}=\\frac{${sum}}{${den}}`)}` +
      (sum > den
        ? ` 이고, 가분수이므로 대분수로 고치면 ${expr(fmtFrac(sum, den))} 입니다.`
        : ` 입니다.`),
  );
}

/** **2-1-1 2단 기본 — 상황에서 식을 세운다.** 두 양을 합치는 자리 셋. */
function tier211Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const which = intBetween(rng, 0, 2);
  // 「화단 전체」는 전체가 $1$ 이라 합이 $1$ 을 넘으면 안 된다 — 무리를 **먼저** 좁힌다.
  const pool =
    which === 1 ? properSumPairs : (d: number) => fracPairs(d, "add");
  const den = pick(rng, densWith(pool));
  const [a, b] = pick(rng, pool(den));
  const x = expr(`\\frac{${a}}{${den}}`);
  const y = expr(`\\frac{${b}}{${den}}`);
  const got = expr(fmtFrac(a + b, den));
  const how =
    `분모가 같으므로 분자끼리 더합니다. ` +
    `${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}=\\frac{${a + b}}{${den}}`)}` +
    (a + b > den ? ` 이고, 대분수로 고치면 ${got} 입니다.` : ` 입니다.`);
  if (which === 0) {
    return make(
      unit,
      // 소재는 초5 1-5 와 겹치지 않게 고른다 — g5 의 `FRAC_STUFF` 는 물·주스·끈·철사·밀가루·설탕.
      `오전에 식용유를 ${x} L 쓰고, 오후에는 ${y} L 썼습니다. ` +
        `하루 동안 쓴 식용유는 모두 몇 L입니까?`,
      got,
      `하루 동안 쓴 양은 두 양을 더한 것입니다. ${how}`,
    );
  }
  if (which === 1) {
    return make(
      unit,
      `화단의 ${x} 에는 튤립을, ${y} 에는 국화를 심었습니다. ` +
        `꽃을 심은 부분은 화단 전체의 얼마입니까?`,
      got,
      `꽃을 심은 부분은 두 부분을 더한 것입니다. ${how}`,
    );
  }
  return make(
    unit,
    `빨간 물감 ${x} L와 파란 물감 ${y} L를 섞었습니다. 섞은 물감은 모두 몇 L입니까?`,
    got,
    `섞은 물감의 양은 두 양을 더한 것입니다. ${how}`,
  );
}

/** **2-1-1 3단 응용 — 중간값을 거친다.** 「더 긴 쪽」을 먼저 구하고 둘을 합친다(두 단계). */
function tier211Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(relSumPairs));
  const [a, b] = pick(rng, relSumPairs(den));
  const one = expr(`\\frac{${a}}{${den}}`);
  const gap = expr(`\\frac{${b}}{${den}}`);
  const other = expr(`\\frac{${a + b}}{${den}}`);
  const got = expr(fmtFrac(2 * a + b, den));
  const step1 = `${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}=\\frac{${a + b}}{${den}}`)}`;
  const step2 =
    `두 양을 더하면 ` +
    `${expr(`\\frac{${a}}{${den}}+\\frac{${a + b}}{${den}}=\\frac{${2 * a + b}}{${den}}`)}` +
    (2 * a + b > den ? ` 이고, 대분수로 고치면 ${got} 입니다.` : ` 입니다.`);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      // 「끈」은 초5 1-5 소재라 「막대」로 둔다(g5 `FRAC_STUFF`).
      `빨간 막대의 길이는 ${one} m입니다. 파란 막대는 빨간 막대보다 ${gap} m 더 깁니다. ` +
        `두 막대의 길이의 합은 몇 m입니까?`,
      got,
      `파란 막대의 길이를 먼저 구합니다. ${step1} 이므로 파란 막대는 ${other} m입니다. ${step2}`,
    );
  }
  return make(
    unit,
    `작은 상자의 무게는 ${one} kg입니다. 큰 상자는 작은 상자보다 ${gap} kg 더 무겁습니다. ` +
      `두 상자의 무게의 합은 몇 kg입니까?`,
    got,
    `큰 상자의 무게를 먼저 구합니다. ${step1} 이므로 큰 상자는 ${other} kg입니다. ${step2}`,
  );
}

/** **2-1-1 4단 심화 — 잘못 계산했더니.** 역산으로 어떤 수를 되찾고 다시 바르게 계산한다. */
function tier211Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const diffAsked = intBetween(rng, 0, 1) === 0;
  const pool = diffAsked ? wrongDiffPairs : wrongAddPairs;
  const den = pick(rng, densWith(pool));
  const [b, c] = pick(rng, pool(den));
  const add = expr(`\\frac{${b}}{${den}}`);
  const wrong = expr(`\\frac{${c}}{${den}}`);
  const some = expr(`\\frac{${c + b}}{${den}}`);
  const right = expr(fmtFrac(c + 2 * b, den));
  // 분수 뒤 조사는 **분자의 소리**로 정해진다 — 「십분의 육」은 «을», 「오분의 이」는 «를».
  const addO = `${add}${tail(b, "을", "를")}`;
  const wrongI = `${wrong}${tail(c, "이", "가")}`;
  const lead = `어떤 수에 ${addO} 더해야 할 것을 잘못하여 뺐더니 ${wrongI} 되었습니다. `;
  const back =
    `잘못 계산한 값이 ${wrongI} 되었으므로 어떤 수는 ` +
    `${expr(`\\frac{${c}}{${den}}+\\frac{${b}}{${den}}=\\frac{${c + b}}{${den}}`)} 입니다. `;
  if (diffAsked) {
    return make(
      unit,
      `${lead}잘못 계산한 값과 바르게 계산한 값의 차는 얼마입니까?`,
      expr(fmtFrac(2 * b, den)),
      `${back}바르게 계산하면 ` +
        `${expr(`\\frac{${c + b}}{${den}}+\\frac{${b}}{${den}}=\\frac{${c + 2 * b}}{${den}}`)} 입니다. ` +
        `두 값의 차는 ` +
        `${expr(`\\frac{${c + 2 * b}}{${den}}-\\frac{${c}}{${den}}=\\frac{${2 * b}}{${den}}`)} 이므로 ` +
        `${expr(fmtFrac(2 * b, den))} 입니다.`,
    );
  }
  return make(
    unit,
    `${lead}바르게 계산한 값은 얼마입니까?`,
    right,
    `${back}어떤 수 ${some} 에 ${addO} 더하면 ` +
      `${expr(`\\frac{${c + b}}{${den}}+\\frac{${b}}{${den}}=\\frac{${c + 2 * b}}{${den}}`)}` +
      (c + 2 * b > den
        ? ` 이고, 대분수로 고치면 ${right} 입니다.`
        : ` 입니다.`),
  );
}

/** **2-1-2 1단 연산 — 동분모 진분수의 차.** */
function tier212Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, FRAC_DENS);
  const [a, b] = pick(rng, fracPairs(den, "sub"));
  return make(
    unit,
    `다음 두 분수의 차를 구하시오.\n\n${expr(`\\frac{${a}}{${den}}-\\frac{${b}}{${den}}`)}`,
    expr(`\\frac{${a - b}}{${den}}`),
    `분모가 같은 분수끼리는 분자끼리 뺍니다. ` +
      `${expr(`\\frac{${a}}{${den}}-\\frac{${b}}{${den}}=\\frac{${a - b}}{${den}}`)} 입니다.`,
  );
}

/** **2-1-2 2단 기본 — 전체 $1$ 에서 뺀다.** $1$ 을 분모가 같은 가분수로 고치는 자리다. */
function tier212Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(wholeMinusNums));
  const a = pick(rng, wholeMinusNums(den));
  const used = expr(`\\frac{${a}}{${den}}`);
  const got = expr(`\\frac{${den - a}}{${den}}`);
  const how =
    `전체를 ${expr("1")} 로 보면 ${expr(`1=\\frac{${den}}{${den}}`)} 이므로 ` +
    `${expr(`\\frac{${den}}{${den}}-\\frac{${a}}{${den}}=\\frac{${den - a}}{${den}}`)} 입니다.`;
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `케이크 한 개의 ${used} 만큼을 먹었습니다. 남은 케이크는 전체의 얼마입니까?`,
      got,
      `남은 것은 전체에서 먹은 만큼을 뺀 것입니다. ${how}`,
    );
  }
  return make(
    unit,
    `도화지 한 장의 ${used} 만큼을 잘라 냈습니다. 남은 도화지는 전체의 얼마입니까?`,
    got,
    `남은 것은 전체에서 잘라 낸 만큼을 뺀 것입니다. ${how}`,
  );
}

/** **2-1-2 3단 응용 — 두 번 덜어 낸다.** 중간값을 거치는 두 단계. */
function tier212Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(twoUseTriples));
  const [a, b, c] = pick(rng, twoUseTriples(den));
  const all = expr(`\\frac{${a}}{${den}}`);
  const u1 = expr(`\\frac{${b}}{${den}}`);
  const u2 = expr(`\\frac{${c}}{${den}}`);
  const got = expr(`\\frac{${a - b - c}}{${den}}`);
  const step1 = `${expr(`\\frac{${a}}{${den}}-\\frac{${b}}{${den}}=\\frac{${a - b}}{${den}}`)}`;
  const step2 = `${expr(`\\frac{${a - b}}{${den}}-\\frac{${c}}{${den}}=\\frac{${a - b - c}}{${den}}`)}`;
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `페인트가 ${all} L 있었습니다. 벽을 칠하는 데 ${u1} L, 문을 칠하는 데 ${u2} L를 썼습니다. ` +
        `남은 페인트는 몇 L입니까?`,
      got,
      `벽을 칠하고 남은 양은 ${step1} 입니다. 여기서 문을 칠한 만큼을 더 빼면 ${step2} 입니다.`,
    );
  }
  return make(
    unit,
    `모래가 ${all} kg 있었습니다. 화단에 ${u1} kg, 화분에 ${u2} kg을 담았습니다. ` +
      `남은 모래는 몇 kg입니까?`,
    got,
    `화단에 담고 남은 양은 ${step1} 입니다. 여기서 화분에 담은 만큼을 더 빼면 ${step2} 입니다.`,
  );
}

/** **2-1-2 4단 심화 — 조건 결합.** 차를 구한 뒤 그 범위에 드는 동분모 진분수를 센다. */
function tier212Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const less = intBetween(rng, 0, 1) === 0;
  const den = pick(
    rng,
    densWith((d) => countPairs(d, less)),
  );
  const [a, b] = pick(rng, countPairs(den, less));
  const gap = a - b;
  // 「과/와」도 분수 뒤에서는 **분자의 소리**를 따른다 — 「팔분의 육과」·「오분의 삼과」.
  const two = `${expr(`\\frac{${a}}{${den}}`)}${tail(a, "과", "와")} ${expr(`\\frac{${b}}{${den}}`)}의 차`;
  const how =
    `두 분수의 차는 ` +
    `${expr(`\\frac{${a}}{${den}}-\\frac{${b}}{${den}}=\\frac{${gap}}{${den}}`)} 입니다. `;
  if (less) {
    return make(
      unit,
      `${two}보다 작으면서 분모가 ${n(den)}인 진분수는 모두 몇 개입니까?`,
      `${n(gap - 1)}개`,
      `${how}분모가 ${n(den)}인 진분수 중 이보다 작은 것은 분자가 ${n(1)}부터 ` +
        `${n(gap - 1)}까지이므로 ${n(gap - 1)}개입니다.`,
    );
  }
  return make(
    unit,
    `${two}보다 크면서 ${expr("1")} 보다 작고 분모가 ${n(den)}인 진분수는 모두 몇 개입니까?`,
    `${n(den - 1 - gap)}개`,
    `${how}분모가 ${n(den)}인 진분수 중 이보다 큰 것은 분자가 ${n(gap + 1)}부터 ` +
      `${n(den - 1)}까지이므로 ${n(den - 1 - gap)}개입니다.`,
  );
}

/** **2-1-3 1단 연산 — 받아올림이 있는 대분수의 합.** 표준은 두 경우를 섞는다. */
function tier213Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(carryPairs));
  const [a, b] = pick(rng, carryPairs(den));
  const w1 = intBetween(rng, 1, 4);
  const w2 = intBetween(rng, 1, 3);
  const total = (w1 + w2) * den + a + b;
  return make(
    unit,
    `다음 두 대분수의 합을 구하시오.\n\n` +
      `${expr(`${w1}\\frac{${a}}{${den}}+${w2}\\frac{${b}}{${den}}`)}`,
    expr(fmtFrac(total, den)),
    `자연수는 자연수끼리, 분수는 분수끼리 더합니다. ${expr(`${w1}+${w2}=${w1 + w2}`)} 이고 ` +
      `${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}=\\frac{${a + b}}{${den}}`)} 입니다. ` +
      `분수 부분이 가분수이므로 자연수에 ${n(1)}을 받아올리면 ${expr(fmtFrac(total, den))} 입니다.`,
  );
}

/** **2-1-3 2단 기본 — 두 양을 잇는다.** */
function tier213Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(mixedSumPairs));
  const [a, b] = pick(rng, mixedSumPairs(den));
  const w1 = intBetween(rng, 1, 4);
  /*
   * 두 대분수가 **글자까지 같아지지 않게** 한다 — 「쌀 $3\frac37$ kg이 담긴 자루에
   * 쌀 $3\frac37$ kg을 더 담았습니다」가 실측 29/1200 로 나왔다(리드 검수 2026-08-23).
   * 2-1-3 «응용» 에서 같은 부류를 `threeSumTriples` 로 막았는데 여기만 빠져 있었다.
   *
   * 분자가 다르면 자연수 부분은 겹쳐도 되므로(`2\frac17+2\frac37` 은 멀쩡하다) **분자가
   * 같을 때만** 자연수 부분을 비켜 간다 — 짝을 통째로 버리면 멀쩡한 문항까지 잃는다.
   * `w1` 이 $4$ 면 아래 목록에 없으므로 어차피 겹치지 않는다.
   */
  const w2 =
    a === b
      ? pick(
          rng,
          [1, 2, 3].filter((w) => w !== w1),
        )
      : intBetween(rng, 1, 3);
  const total = (w1 + w2) * den + a + b;
  const x = expr(`${w1}\\frac{${a}}{${den}}`);
  const y = expr(`${w2}\\frac{${b}}{${den}}`);
  const got = expr(fmtFrac(total, den));
  const how =
    `자연수는 자연수끼리, 분수는 분수끼리 더합니다. ${expr(`${w1}+${w2}=${w1 + w2}`)} 이고 ` +
    `${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}=\\frac{${a + b}}{${den}}`)} 이므로 ` +
    (a + b >= den
      ? `자연수에 ${n(1)}을 받아올려 ${got} 입니다.`
      : `${got} 입니다.`);
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `집에서 도서관까지의 거리는 ${x} km이고, 도서관에서 학교까지의 거리는 ${y} km입니다. ` +
        `집에서 도서관을 지나 학교까지 가는 거리는 모두 몇 km입니까?`,
      got,
      `가는 거리는 두 거리를 더한 것입니다. ${how}`,
    );
  }
  return make(
    unit,
    `쌀 ${x} kg이 담긴 자루에 쌀 ${y} kg을 더 담았습니다. 자루에 담긴 쌀은 모두 몇 kg입니까?`,
    got,
    `자루에 담긴 쌀은 두 양을 더한 것입니다. ${how}`,
  );
}

/** **2-1-3 3단 응용 — 세 값의 합.** 두 번 더하며 중간값을 거친다. */
function tier213Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(threeSumTriples));
  const [a, b, c] = pick(rng, threeSumTriples(den));
  const w1 = intBetween(rng, 1, 3);
  const w2 = intBetween(rng, 1, 3);
  const w3 = intBetween(rng, 1, 3);
  const ws = w1 + w2 + w3;
  const ns = a + b + c;
  const total = ws * den + ns;
  const got = expr(fmtFrac(total, den));
  const carried = Math.floor(ns / den);
  const how =
    `자연수 부분끼리 더하면 ${expr(`${w1}+${w2}+${w3}=${ws}`)} 이고, ` +
    `분수 부분끼리 더하면 ` +
    `${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}+\\frac{${c}}{${den}}=\\frac{${ns}}{${den}}`)} 입니다. ` +
    (carried > 0
      ? `분수 부분이 가분수이므로 자연수에 ${josaNum(carried, "을", "를")} 받아올려 ${got} 입니다.`
      : `그러므로 ${got} 입니다.`);
  return make(
    unit,
    `딸기를 첫째 날 ${expr(`${w1}\\frac{${a}}{${den}}`)} kg, ` +
      `둘째 날 ${expr(`${w2}\\frac{${b}}{${den}}`)} kg, ` +
      `셋째 날 ${expr(`${w3}\\frac{${c}}{${den}}`)} kg 땄습니다. ` +
      `사흘 동안 딴 딸기는 모두 몇 kg입니까?`,
    got,
    how,
  );
}

/** **2-1-3 4단 심화 — 수 카드로 만든 가장 큰·가장 작은 대분수의 합.** 조건 결합. */
function tier213Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(cardTriples));
  const [p, q, r] = pick(rng, cardTriples(den));
  const order = pick(rng, [
    [p, q, r],
    [p, r, q],
    [q, p, r],
    [q, r, p],
    [r, p, q],
    [r, q, p],
  ]);
  const big = expr(`${r}\\frac{${q}}{${den}}`);
  const small = expr(`${p}\\frac{${q}}{${den}}`);
  const total = (p + r) * den + 2 * q;
  const got = expr(fmtFrac(total, den));
  /*
   * 보기로 드는 한 벌은 **자연수 `q` · 분자 `p`** 다. `p<q<r` 이므로 이것은 가장 큰 것도
   * (자연수가 `r` 이 아니다) 가장 작은 것도(자연수가 `p` 가 아니다) 아니라서 답이 안 샌다.
   *
   * 보기를 넣는 이유는 꾸밈이 아니다 — 소단원 이름이 약속하는 **대분수가 지면에 서야** 한다.
   * 처음 판에는 「대분수를 만들려고 합니다」라는 **낱말**만 있고 대분수 꼴이 하나도 없어서
   * 조건 판정기가 씨앗 40/40 을 걸었다(팀장 신호 2026-08-23). 값은 맞는데 약속한 성질이
   * 지면에서 사라진 부류다 — 그 판정이 옳다.
   */
  const sample = expr(`${q}\\frac{${p}}{${den}}`);
  return make(
    unit,
    `${n(3)}장의 수 카드 ${nums(order)} 중에서 ${n(2)}장을 골라 자연수 부분과 분자에 ` +
      `한 번씩 놓아 분모가 ${n(den)}인 대분수를 만들려고 합니다. ` +
      `예를 들어 ${sample}${tail(p, "과", "와")} 같이 만듭니다. ` +
      `만들 수 있는 가장 큰 대분수와 가장 작은 대분수의 합을 구하시오.`,
    got,
    `자연수 부분이 클수록 큰 대분수이므로 가장 큰 대분수는 ${big} 이고, ` +
      `자연수 부분이 작을수록 작은 대분수이므로 가장 작은 대분수는 ${small} 입니다. ` +
      `${expr(`${r}+${p}=${p + r}`)} 이고 ` +
      `${expr(`\\frac{${q}}{${den}}+\\frac{${q}}{${den}}=\\frac{${2 * q}}{${den}}`)} 이므로 ` +
      (2 * q >= den
        ? `자연수에 ${n(1)}을 받아올려 ${got} 입니다.`
        : `합은 ${got} 입니다.`),
  );
}

/** **2-1-4 1단 연산 — 받아내림이 있는 대분수의 차.** */
function tier214Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(borrowPairs));
  const [a, b] = pick(rng, borrowPairs(den));
  const w2 = intBetween(rng, 1, 3);
  /*
   * 받아내림 뒤 자연수 차를 늘 $1$ 이상으로 둔다 — **결함 수리가 아니라 문체 선택**이다.
   * 표준(`fracAdd42` 2-1-4)은 「$1-1=0$, …」 꼴을 그대로 쓰고 그것도 읽는 데 문제가 없다
   * (오히려 자연수 부분이 사라지는 것을 보여 준다). 갈래에서는 답이 늘 대분수로 서는 쪽을
   * 골랐을 뿐이니 **표준을 이것에 맞추러 가지 말 것**(리드 검수 2026-08-23).
   */
  const w1 = w2 + intBetween(rng, 2, 4);
  const total = (w1 - w2) * den + a - b;
  return make(
    unit,
    `다음 두 대분수의 차를 구하시오.\n\n` +
      `${expr(`${w1}\\frac{${a}}{${den}}-${w2}\\frac{${b}}{${den}}`)}`,
    expr(fmtFrac(total, den)),
    `분수끼리 뺄 수 없으므로 ` +
      `${expr(`${w1}\\frac{${a}}{${den}}=${w1 - 1}\\frac{${a + den}}{${den}}`)} 으로 고칩니다. ` +
      `${expr(`${w1 - 1}-${w2}=${w1 - 1 - w2}`)} 이고 ` +
      `${expr(`\\frac{${a + den}}{${den}}-\\frac{${b}}{${den}}=\\frac{${a + den - b}}{${den}}`)} 이므로 ` +
      `${expr(fmtFrac(total, den))} 입니다.`,
  );
}

/** **2-1-4 2단 기본 — 자연수에서 대분수를 뺀다.** 자연수를 가분수로 고치는 자리다. */
function tier214Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(wholeMinusNums));
  const b = pick(rng, wholeMinusNums(den));
  const w = intBetween(rng, 1, 3);
  // 자연수 차를 늘 $1$ 이상으로 — 위 `tier214Calc` 와 같은 **문체 선택**이다(결함 아님).
  const whole = w + intBetween(rng, 2, 4);
  const total = (whole - w) * den - b;
  const cut = expr(`${w}\\frac{${b}}{${den}}`);
  const got = expr(fmtFrac(total, den));
  const how =
    `${expr(`${whole}=${whole - 1}\\frac{${den}}{${den}}`)} 으로 고칩니다. ` +
    `${expr(`${whole - 1}-${w}=${whole - 1 - w}`)} 이고 ` +
    `${expr(`\\frac{${den}}{${den}}-\\frac{${b}}{${den}}=\\frac{${den - b}}{${den}}`)} 이므로 ` +
    `${got} 입니다.`;
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `길이가 ${n(whole)} m인 호스에서 ${cut} m를 잘라 냈습니다. 남은 호스는 몇 m입니까?`,
      got,
      `남은 길이는 전체에서 잘라 낸 길이를 뺀 것입니다. ${how}`,
    );
  }
  return make(
    unit,
    `고구마 ${n(whole)} kg 중에서 ${cut} kg을 쪄서 먹었습니다. 남은 고구마는 몇 kg입니까?`,
    got,
    `남은 무게는 전체에서 먹은 무게를 뺀 것입니다. ${how}`,
  );
}

/** **2-1-4 3단 응용 — 크기 비교 뒤 뺄셈.** 셋 중 최대·최소를 먼저 가린다(두 단계). */
function tier214Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(spreadPairs));
  const [p, q] = pick(rng, spreadPairs(den));
  const wLo = intBetween(rng, 1, 3);
  const mid = intBetween(rng, 1, den - 1);
  const show = (w: number, k: number) => expr(`${w}\\frac{${k}}{${den}}`);
  const lo = show(wLo, p);
  const hi = show(wLo + 2, q);
  // 자연수 부분이 셋 다 달라(wLo, wLo+1, wLo+2) 크기 순서는 분자와 무관하게 정해진다.
  // 늘어놓는 차례는 **크기 순으로 서지 않는 것만** 쓴다 — 정렬돼 나오면 비교가 사라진다.
  const order = pick(rng, [
    [show(wLo + 1, mid), hi, lo],
    [hi, lo, show(wLo + 1, mid)],
    [lo, hi, show(wLo + 1, mid)],
  ]);
  const total = 2 * den + q - p;
  const got = expr(fmtFrac(total, den));
  return make(
    unit,
    `가방 세 개의 무게가 각각 ${order[0]} kg, ${order[1]} kg, ${order[2]} kg입니다. ` +
      `가장 무거운 가방과 가장 가벼운 가방의 무게의 차는 몇 kg입니까?`,
    got,
    `자연수 부분을 비교하면 가장 무거운 가방은 ${hi} kg, 가장 가벼운 가방은 ${lo} kg입니다. ` +
      (q < p
        ? `분수끼리 뺄 수 없으므로 ` +
          `${expr(`${wLo + 2}\\frac{${q}}{${den}}=${wLo + 1}\\frac{${q + den}}{${den}}`)} 으로 고쳐 ` +
          `${expr(`${wLo + 1}-${wLo}=1`)} 이고 ` +
          `${expr(`\\frac{${q + den}}{${den}}-\\frac{${p}}{${den}}=\\frac{${q + den - p}}{${den}}`)} 이므로 ` +
          `${got} 입니다.`
        : `${expr(`${wLo + 2}-${wLo}=2`)} 이고 ` +
          `${expr(`\\frac{${q}}{${den}}-\\frac{${p}}{${den}}=\\frac{${q - p}}{${den}}`)} 이므로 ` +
          `${got} 입니다.`),
  );
}

/** **2-1-4 4단 심화 — 조건에 맞는 수를 모두.** 같아지는 자리를 먼저 찾고 부등호로 가른다. */
function tier214Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const greater = intBetween(rng, 0, 1) === 0;
  const den = pick(
    rng,
    densWith((d) => ineqPairs(d, greater)),
  );
  const [m, a] = pick(rng, ineqPairs(den, greater));
  const w2 = intBetween(rng, 1, 3);
  const w1 = w2 + 2;
  const c = a + den - m - 1;
  const left = expr(`${w1}\\frac{${a}}{${den}}`);
  const sub = expr(`1\\frac{\\square}{${den}}`);
  const right = expr(`${w2}\\frac{${c}}{${den}}`);
  const same = expr(`1\\frac{${m + 1}}{${den}}`);
  const answers = greater
    ? Array.from({ length: m }, (_, i) => i + 1)
    : Array.from({ length: den - m - 2 }, (_, i) => m + 2 + i);
  const tie =
    `빼는 수가 ${same} 일 때 ` +
    `${expr(`${w1}\\frac{${a}}{${den}}-1\\frac{${m + 1}}{${den}}=${w2}\\frac{${c}}{${den}}`)} 로 ` +
    `두 값이 같아집니다. 빼는 수가 작을수록 뺀 값은 커집니다. `;
  return make(
    unit,
    // □ 뒤에는 조사를 붙일 수 없다 — 소리를 모르므로 「만큼을」처럼 **받침을 안 타는** 말로 잇는다.
    `${left} 에서 ${sub} 만큼을 뺀 값이 ${right} 보다 ${greater ? "클" : "작을"} 때, ` +
      `${expr("\\square")} 에 들어갈 수 있는 자연수를 모두 쓰시오. ` +
      `(단, 분자는 분모보다 작습니다.)`,
    nums(answers),
    `${tie}` +
      (greater
        ? `따라서 ${expr("\\square")} 는 ${josaNum(m, "보다", "보다")} 크지 않아야 하므로 ` +
          `${nums(answers)}입니다.`
        : `따라서 ${expr("\\square")} 는 ${josaNum(m + 1, "보다", "보다")} 커야 하고, ` +
          `분자는 분모보다 작아야 하므로 ${nums(answers)}입니다.`),
  );
}

/* ───────────────────────── 2-2 삼각형 ───────────────────────── */

/**
 * 「정삼각형의 기호를 쓰시오」의 곁들이. **정삼각형이 아닌 것만** 넣는다 —
 * `eqTri` 를 곁들이에 넣으면 정답이 둘이 되어 문항이 깨진다(tick 유출과는 다른 축이다).
 *
 * 한때 `isoTri` 를 뺐다가 되돌린 자리다. 등변 tick 이 `marks` 옵트인이 되어 그림이 답을
 * 알려 주지 않게 되자(원장님 ⑤) 이번엔 **가릴 수가 없어졌다** — 그때 `isoTri` 는 밑변 44·
 * 높이 44 라 정삼각형(밑변 44·높이 38.1)과 윤곽 거리가 **3.93px** 뿐이었다.
 * elem-g5(합동 풀)·초3(점격자)도 같은 자리에서 각자 우회하고 있었으므로 **엔진에서** 고쳤다
 * (D-61) — `ISO_TRI_BASE = 0.58` 로 밑변을 좁혀 9.45px, 변 길이 비 1.12 → **1.80**.
 *
 * 그래서 지금 `isoTri` 는 「높이만 다른 이등변」이라 오히려 좋은 곁들이다. 실측(설정 뒤):
 * `eqTri` 1.000 · `wideTri` 1.306 · `rightTri` 1.414 · `isoTri` 1.795 (최장/최단 변 비).
 *
 * 「그림이 답을 알려 주면 안 된다」의 뒷면은 **「그림으로 답을 낼 수는 있어야 한다」**다.
 * 수치로는 12% 차이라 넘어갈 뻔했고 **PNG 로 뽑아 눈으로 보고서야** 드러났다.
 */
const TRI_DISTRACTORS = ["isoTri", "rightTri", "wideTri"] as const;

function triClass(a: number, b: number, c: number): string {
  const big = Math.max(a, b, c);
  return big > 90 ? "둔각삼각형" : big === 90 ? "직각삼각형" : "예각삼각형";
}

function triangle(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = code(unit);

  if (c === "2-2-1") {
    // 그림 문항이 기본이다 — 씨앗 20260821 이 이 가지로 와야 한다
    // (`elementaryEngine.test.ts` 가 그 씨앗에서 `eqTri`·「가」·「기호」를 못 박아 두었다).
    if (intBetween(rng, 0, 3) !== 0) {
      const same = intBetween(rng, 4, 9);
      const other = same + intBetween(rng, 1, 4);
      const equilateral = intBetween(rng, 0, 1) === 0;
      const third = equilateral ? same : other;
      return make(
        unit,
        `세 변의 길이가 ${cm(same)}, ${cm(same)}, ${cm(third)}인 삼각형의 이름을 쓰시오.`,
        equilateral ? "정삼각형" : "이등변삼각형",
        equilateral
          ? `세 변의 길이가 모두 ${cm(same)}로 같습니다. 세 변의 길이가 같은 삼각형은 정삼각형입니다.`
          : `길이가 같은 변이 ${n(2)}개 있습니다. 두 변의 길이가 같은 삼각형은 이등변삼각형입니다.`,
      );
    }
    const others = [...TRI_DISTRACTORS];
    const second = others.splice(intBetween(rng, 0, others.length - 1), 1)[0]!;
    const third = others[intBetween(rng, 0, others.length - 1)]!;
    return make(
      unit,
      "그림에서 정삼각형의 기호를 쓰시오.",
      "가",
      "가는 세 변의 길이가 모두 같습니다. 세 변의 길이가 같은 삼각형을 정삼각형이라고 합니다.",
      fig("namedShapes", {
        items: [
          { shape: "eqTri", label: "가" },
          { shape: second, label: "나" },
          { shape: third, label: "다" },
        ],
      }),
    );
  }

  if (c === "2-2-2") {
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      const apex = intBetween(rng, 15, 40) * 2;
      const base = (180 - apex) / 2;
      return make(
        unit,
        `이등변삼각형의 꼭지각의 크기가 ${deg(apex)}입니다. 한 밑각의 크기는 몇 도인가?`,
        deg(base),
        `이등변삼각형은 두 밑각의 크기가 같습니다. ${expr(`(180-${apex})\\div2=${base}`)}`,
      );
    }
    if (kind === 1) {
      const base = intBetween(rng, 40, 75);
      return make(
        unit,
        `이등변삼각형의 한 밑각의 크기가 ${deg(base)}입니다. 꼭지각의 크기는 몇 도인가?`,
        deg(180 - base * 2),
        `두 밑각의 크기가 같으므로 ${expr(`180-${base}-${base}=${180 - base * 2}`)} 입니다.`,
      );
    }
    const same = intBetween(rng, 5, 12);
    const other = intBetween(rng, 3, 9);
    return make(
      unit,
      `이등변삼각형의 길이가 같은 두 변이 각각 ${cm(same)}이고 나머지 한 변이 ${cm(other)}입니다. ` +
        `세 변의 길이의 합은 몇 cm인가?`,
      cm(same * 2 + other),
      `${expr(`${same}+${same}+${other}=${same * 2 + other}`)} 이므로 ${cm(same * 2 + other)}입니다.`,
    );
  }

  if (c === "2-2-3") {
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        "정삼각형의 한 각의 크기는 몇 도인가?",
        deg(60),
        `정삼각형은 세 각의 크기가 모두 같고 세 각의 합은 ${deg(180)}입니다. ${expr("180\\div3=60")}`,
      );
    }
    const side = intBetween(rng, 4, 13);
    if (kind === 1) {
      return make(
        unit,
        `한 변이 ${cm(side)}인 정삼각형의 세 변의 길이의 합은 몇 cm인가?`,
        cm(side * 3),
        `정삼각형은 세 변의 길이가 같으므로 ${expr(`${side}\\times3=${side * 3}`)} 입니다.`,
      );
    }
    return make(
      unit,
      `세 변의 길이의 합이 ${cm(side * 3)}인 정삼각형의 한 변은 몇 cm인가?`,
      cm(side),
      `정삼각형은 세 변의 길이가 같으므로 ${expr(`${side * 3}\\div3=${side}`)} 입니다.`,
    );
  }

  if (c === "2-2-4") {
    // 세 부류가 골고루 나오게 각을 **부류부터 정하고** 만든다.
    const kind = intBetween(rng, 0, 2);
    let a: number;
    let b: number;
    if (kind === 0) {
      a = intBetween(rng, 20, 70);
      b = 90;
    } else if (kind === 1) {
      b = intBetween(rng, 100, 140);
      a = intBetween(rng, 20, 160 - b);
    } else {
      a = intBetween(rng, 55, 85);
      b = intBetween(rng, 55, 85);
    }
    const rest = 180 - a - b;
    const big = Math.max(a, b, rest);
    if (intBetween(rng, 0, 2) === 0) {
      return make(
        unit,
        `삼각형의 두 각의 크기가 ${deg(a)}, ${deg(b)}입니다. ` +
          `이 삼각형은 예각삼각형, 직각삼각형, 둔각삼각형 중 무엇인가?`,
        triClass(a, b, rest),
        `나머지 한 각은 ${expr(`180-${a}-${b}=${rest}`)} 입니다. ` +
          `가장 큰 각이 ${deg(big)}이므로 ${triClass(a, b, rest)}입니다.`,
      );
    }
    return make(
      unit,
      `세 각의 크기가 ${deg(a)}, ${deg(b)}, ${deg(rest)}인 삼각형은 ` +
        `예각삼각형, 직각삼각형, 둔각삼각형 중 무엇인가?`,
      triClass(a, b, rest),
      `가장 큰 각이 ${deg(big)}입니다. ${deg(90)}보다 ` +
        `${big > 90 ? "크므로 둔각삼각형" : big === 90 ? "같으므로 직각삼각형" : "작아 세 각이 모두 예각이므로 예각삼각형"}입니다.`,
    );
  }

  if (c === "2-2-5") {
    if (intBetween(rng, 0, 2) === 0) {
      return make(
        unit,
        "세 변의 길이가 모두 같은 삼각형은 예각삼각형, 직각삼각형, 둔각삼각형 중 무엇인가?",
        "예각삼각형",
        `세 변의 길이가 같은 삼각형은 정삼각형이고 세 각이 모두 ${deg(60)}입니다. ` +
          `세 각이 모두 ${deg(90)}보다 작으므로 예각삼각형입니다.`,
      );
    }
    const base = pick(rng, [25, 30, 35, 40, 55, 65, 70]);
    const apex = 180 - base * 2;
    return make(
      unit,
      `두 밑각의 크기가 각각 ${deg(base)}이고 나머지 한 각이 ${deg(apex)}인 삼각형을 ` +
        `변의 길이와 각의 크기 두 가지 기준으로 각각 무엇이라고 하는가?`,
      `이등변삼각형, ${triClass(base, base, apex)}`,
      `두 각의 크기가 같으므로 두 변의 길이도 같아 이등변삼각형입니다. ` +
        `가장 큰 각이 ${deg(Math.max(base, apex))}이므로 ${triClass(base, base, apex)}입니다.`,
    );
  }

  return noBranch(unit);
}
/* ───────────────── 2-3 소수의 덧셈과 뺄셈 ─────────────────
 *
 * ⚠️ 해설에 **소수의 곱셈·나눗셈을 쓰지 않는다**(R3). 그것은 초5-2 다.
 * 「$0.1$이 $10$개면 $1$」 처럼 **자릿값**으로 설명하고, $10$배는 「소수점이 옮겨진다」로 쓴다.
 */

const DEC_PLACE = ["첫", "둘", "셋"] as const;
/** 소수 자리마다 「무엇이 몇 개인지」를 나타내는 단위. 자릿값 설명의 밑천이다. */
const DEC_UNIT = ["0.1", "0.01", "0.001"] as const;

/** 두 소수가 처음으로 갈리는 자리 이름. 「자연수 부분」이 같으면 소수 자리를 짚는다. */
function firstDiffPlace(a: number, b: number): string {
  if (Math.floor(a / 100) !== Math.floor(b / 100)) return "자연수 부분";
  if (Math.floor(a / 10) % 10 !== Math.floor(b / 10) % 10)
    return "소수 첫째 자리";
  return "소수 둘째 자리";
}

function decAdd(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = code(unit);

  if (c === "2-3-1") {
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      const count = intBetween(rng, 1, 9) * 10 + intBetween(rng, 1, 9);
      return make(
        unit,
        `${n("0.01")}이 ${n(count)}개인 수를 소수로 쓰시오.`,
        n(dec2(count)),
        `${n("0.01")}이 ${n(10)}개이면 ${n("0.1")}, ${n(100)}개이면 ${n(1)}입니다. ` +
          `${n("0.01")}이 ${n(count)}개이면 ${n(dec2(count))}입니다.`,
      );
    }
    const whole = intBetween(rng, 1, 9);
    const digits = [
      intBetween(rng, 1, 9),
      intBetween(rng, 1, 9),
      intBetween(rng, 1, 9),
    ];
    const value = `${whole}.${digits.join("")}`;
    const at = intBetween(rng, 0, 2);
    if (kind === 1) {
      return make(
        unit,
        `${n(value)}에서 소수 ${DEC_PLACE[at]}째 자리 숫자를 쓰시오.`,
        n(digits[at]!),
        `${n(value)}의 소수 ${DEC_PLACE[at]}째 자리 숫자는 ${n(digits[at]!)}입니다.`,
      );
    }
    const digit = digits[at]!;
    const worth = at === 0 ? dec1(digit) : at === 1 ? dec2(digit) : dec3(digit);
    return make(
      unit,
      `${n(value)}에서 소수 ${DEC_PLACE[at]}째 자리 숫자가 나타내는 수를 소수로 쓰시오.`,
      n(worth),
      `소수 ${DEC_PLACE[at]}째 자리는 ${josaNum(DEC_UNIT[at]!, "이", "가")} 몇 개인지를 나타내는 자리입니다. ` +
        `그 자리 숫자가 ${n(digit)}이므로 ${josaNum(DEC_UNIT[at]!, "이", "가")} ${n(digit)}개인 ${josaNum(worth, "을", "를")} 나타냅니다.`,
    );
  }

  if (c === "2-3-2") {
    const x = hundredths(rng, 10, 89);
    // 더한 값의 끝자리가 $0$ 이면 「$1.90$」이 되어 꼬리 $0$ 이 지면에 나간다 —
    // `x` 는 끝자리를 지키는데 `x+d` 는 안 지켜서 새고 있었다(갈래 쓸기가 실측, 2026-08-23).
    const y =
      x +
      pick(
        rng,
        Array.from({ length: 40 }, (_, i) => i + 1).filter(
          (d) => (x + d) % 10 !== 0,
        ),
      );
    const sx = dec2(x);
    const sy = dec2(y);
    const at = firstDiffPlace(x, y);
    if (intBetween(rng, 0, 1) === 0) {
      return make(
        unit,
        `${josaNum(sx, "과", "와")} ${n(sy)}의 크기를 비교하여 $\\square$ 안에 알맞은 기호를 써넣으시오. ` +
          `${expr(`${sx}\\ \\square\\ ${sy}`)}`,
        expr("<"),
        `높은 자리부터 차례로 비교하면 ${at}에서 ${josaNum(sy, "이", "가")} 더 큽니다. 그러므로 ${expr(`${sx}<${sy}`)} 입니다.`,
      );
    }
    return make(
      unit,
      `${josaNum(sx, "과", "와")} ${n(sy)} 중 더 큰 수를 쓰시오.`,
      n(sy),
      `소수의 크기는 높은 자리부터 차례로 비교합니다. ${at}에서 ${josaNum(sy, "이", "가")} 더 큽니다.`,
    );
  }

  if (c === "2-3-3") {
    const base = intBetween(rng, 1, 9) * 10 + intBetween(rng, 1, 9);
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        `${n(dec2(base))}의 ${n(10)}배는 얼마인가?`,
        n(dec1(base)),
        `${n(10)}배를 하면 각 자리의 숫자가 한 자리씩 왼쪽으로 옮겨져 ` +
          `소수점이 오른쪽으로 한 자리 옮겨집니다. 그래서 ${josaNum(dec2(base), "은", "는")} ${josaNum(dec1(base), "이", "가")} 됩니다.`,
      );
    }
    if (kind === 1) {
      return make(
        unit,
        `${n(dec2(base))}의 ${n(100)}배는 얼마인가?`,
        n(base),
        `${n(100)}배를 하면 소수점이 오른쪽으로 두 자리 옮겨집니다. ` +
          `그래서 ${josaNum(dec2(base), "은", "는")} ${josaNum(base, "이", "가")} 됩니다.`,
      );
    }
    return make(
      unit,
      `${n(dec1(base))}의 $\\frac{1}{10}$은 얼마인가?`,
      n(dec2(base)),
      `$\\frac{1}{10}$을 하면 각 자리의 숫자가 한 자리씩 오른쪽으로 옮겨져 ` +
        `소수점이 왼쪽으로 한 자리 옮겨집니다. 그래서 ${josaNum(dec1(base), "은", "는")} ${josaNum(dec2(base), "이", "가")} 됩니다.`,
    );
  }

  if (c === "2-3-4") {
    const x = tenths(rng, 1, 8);
    let y = tenths(rng, 1, 8);
    if ((x + y) % 10 === 0) y = y - (y % 10) + ((y % 10) % 9) + 1;
    const sum = x + y;
    return make(
      unit,
      expr(`${dec1(x)}+${dec1(y)}=\\square`),
      n(dec1(sum)),
      `소수점끼리 자리를 맞추어 같은 자리 수끼리 더합니다. ${expr(`${dec1(x)}+${dec1(y)}=${dec1(sum)}`)}`,
    );
  }

  if (c === "2-3-5") {
    const a = tenths(rng, 3, 9);
    let b = tenths(rng, 1, 2);
    if (a % 10 === b % 10) b = b - (b % 10) + ((b % 10) % 9) + 1;
    const diff = a - b;
    return make(
      unit,
      expr(`${dec1(a)}-${dec1(b)}=\\square`),
      n(dec1(diff)),
      `소수점끼리 자리를 맞추어 같은 자리 수끼리 뺍니다. ${expr(`${dec1(a)}-${dec1(b)}=${dec1(diff)}`)}`,
    );
  }

  if (c === "2-3-6") {
    const x = hundredths(rng, 10, 59);
    let y = hundredths(rng, 10, 39);
    if ((x + y) % 10 === 0) y = y - (y % 10) + ((y % 10) % 9) + 1;
    const sum = x + y;
    return make(
      unit,
      expr(`${dec2(x)}+${dec2(y)}=\\square`),
      n(dec2(sum)),
      `소수점끼리 자리를 맞추어 소수 둘째 자리부터 차례로 더합니다. ` +
        `${expr(`${dec2(x)}+${dec2(y)}=${dec2(sum)}`)}`,
    );
  }

  if (c === "2-3-7") {
    const a = hundredths(rng, 40, 89);
    let b = hundredths(rng, 10, 35);
    if (a % 10 === b % 10) b = b - (b % 10) + ((b % 10) % 9) + 1;
    const diff = a - b;
    return make(
      unit,
      expr(`${dec2(a)}-${dec2(b)}=\\square`),
      n(dec2(diff)),
      `소수점끼리 자리를 맞추어 소수 둘째 자리부터 차례로 뺍니다. ` +
        `${expr(`${dec2(a)}-${dec2(b)}=${dec2(diff)}`)}`,
    );
  }

  return noBranch(unit);
}
/* ──────────── 2-3 난이도 4단 (D-72 확대, 2026-08-23) ────────────
 *
 * **소수는 정수로 들고 다니다 `dec1`·`dec2`·`dec3` 로만 찍는다.** 부동소수점이 지면에 새면
 * 「$0.30000000000000004$」가 나간다. 그리고 **끝자리가 $0$ 이면 안 된다** —
 * 「$7.0$」·「$0.30$」은 초등 지면에 안 쓴다. 구성으로 막고(끝자리 $1$~$9$) 시험이
 * **발문·정답·해설 셋 다**에서 센다.
 *
 * ⚠️ **자릿수 약속을 「전부 같은 dp」로 잠그지 않았다.** 잠금 기준은
 * 「**가장 깊은 자리 = 이름이 약속한 자리**, 그보다 깊은 것 없음」이다. 「전부 같은 dp」로
 * 조이면 **이 대단원이 가르치려는 오개념 문항이 죽는다** — 「$5.63$ 에서 $0.4$ 를 빼야 할 것을
 * 잘못하여 $0.04$ 를 뺐다」는 dp 1 과 2 가 **섞여야** 성립한다. 이름의 약속은 「그 자리까지
 * 다룬다」이지 「모두 그 자리다」가 아니다. **더 엄하게 조이지 말 것**(리드 승인 2026-08-23).
 *
 * ⚠️ **2-3-3 은 연산이 자릿수를 «만들어 낸다».** 위 잠금은 발문으로 **들어오는** 깊이만
 * 막는데, $\frac{1}{100}$ 을 걸면 결과가 두 자리 깊어진다($0.53$ → $0.0053$ 은 **네 자리**로
 * 초4 밖이다). 그래서 2-3-3 은 **출발 수의 깊이를 연산에 맞춰** 제한하고, 잠금을 정답·해설까지
 * 댄다. 「값은 맞는데 학년 밖」이라 값 검산이 구조적으로 못 보는 부류다(리드 지적).
 *
 * ⚠️ **해설에 소수의 곱셈·나눗셈을 쓰지 않는다**(R3, 초5-2·초6 진도). `$0.53\times10$` 이라고
 * 쓰면 판정기가 「소수의 곱셈」으로 잡는다 — 표준처럼 **자릿값과 소수점 이동**으로 말한다.
 *
 * ⚠️ **초3 1-6-6 「소수 알아보기」·1-6-7 「소수의 크기 비교」와 이름이 닮았다.** 설계 때
 * 실제로 뽑아 보니 내 초안 둘이 **그대로 초3 것이었다**(「세 소수 중 가장 큰 수」·「$0.\square$
 * 부등식」). 가르는 것은 **자릿수**다 — 초3 은 실측으로 **소수 한 자리뿐**이고 2-3-1·2-3-2 는
 * 두 자리 이상을 낸다. 시험이 초3 을 실제로 뽑아 골격을 대조하고, 그 판별자에는
 * 「초3 쪽은 한 자리뿐」이라는 음성 대조군을 붙인다.
 *
 * 값 만들기는 파일 위쪽 `tenths` 를 그대로 쓴다(끝자리 ≠ 0 인 정수 만들기). 어느 자릿수인지는
 * **`decN` 이 정한다** — 같은 일을 하는 이름을 하나 더 만들지 않는다.
 */

/** 소수 한 자리 후보(십분위 정수). 끝자리가 $0$ 이 아니다 — 「$7.0$」을 안 만든다. */
const DEC1_POOL: number[] = Array.from({ length: 8 }, (_, w) => w + 1).flatMap(
  (w) => Array.from({ length: 9 }, (_, j) => w * 10 + j + 1),
);

/**
 * 소수 두 자리 후보(백분위 정수). 끝자리가 $0$ 이 아니다 — 「$0.30$」을 안 만든다.
 *
 * 자연수 부분 $0$ 부터 넣는다 — 「빈 병의 무게 $0.36$ kg」처럼 **$1$ 보다 작은 값**이
 * 있어야 하는 자리가 있다. $1$ 부터 시작하면 그런 무리가 **통째로 비어 `pick` 이 던진다**
 * (전수 쓸기가 실측했다: 2-3-6 기본·응용이 씨앗 1000/1000 에서 던지고 있었다).
 */
const DEC2_POOL: number[] = Array.from({ length: 9 }, (_, w) => w).flatMap(
  (w) =>
    Array.from({ length: 10 }, (_, t) => t).flatMap((t) =>
      Array.from({ length: 9 }, (_, h) => w * 100 + t * 10 + h + 1),
    ),
);

/** **2-3-1 1단 연산 — $0.001$이 몇 개인 수.** 표준은 $0.01$ 까지만 센다. */
function tier231Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  /*
   * **방향이 표준과 반대다.** 표준은 「$0.01$이 N개인 수를 쓰시오」(개수 → 수)인데
   * 갈래는 「이 수는 $0.001$이 몇 개인가」(수 → 개수)를 묻는다.
   *
   * 자리만 $0.01$ → $0.001$ 로 옮긴 첫 판은 **골격이 표준과 글자까지 같았다**
   * (수를 가리면 둘 다 「⟨수⟩이 ⟨수⟩개인 수를 소수로 쓰시오」). 표준과 갈래는 **같은
   * 시험지에 함께 실린다** — 자리만 다른 같은 문장은 학생에게 같은 문항이다.
   */
  const v = tenths(rng, 10, 899);
  return make(
    unit,
    `${josaNum(dec3(v), "은", "는")} ${n("0.001")}이 몇 개인 수입니까?`,
    `${n(v)}개`,
    `${n(1)}은 ${n("0.001")}이 ${n(1000)}개, ${n("0.1")}은 ${n(100)}개, ` +
      `${n("0.01")}은 ${n(10)}개입니다. 그러므로 ${josaNum(dec3(v), "은", "는")} ` +
      `${n("0.001")}이 ${n(v)}개인 수입니다.`,
  );
}

/** **2-3-1 2단 기본 — 자릿값 셋을 모아 한 수로.** 자리마다 몇 개인지를 합쳐 쓴다. */
function tier231Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 1, 9);
  const b = intBetween(rng, 1, 9);
  const c = intBetween(rng, 1, 9);
  const value = dec3(a * 100 + b * 10 + c);
  return make(
    unit,
    `${n("0.1")}이 ${n(a)}개, ${n("0.01")}이 ${n(b)}개, ${n("0.001")}이 ${n(c)}개인 수를 ` +
      `소수로 쓰시오.`,
    n(value),
    `${n("0.1")}이 ${n(a)}개이면 소수 첫째 자리 숫자가 ${n(a)}, ` +
      `${n("0.01")}이 ${n(b)}개이면 소수 둘째 자리 숫자가 ${n(b)}, ` +
      `${n("0.001")}이 ${n(c)}개이면 소수 셋째 자리 숫자가 ${josaNum(c, "이", "가")} 됩니다. ` +
      `그러므로 ${n(value)}입니다.`,
  );
}

/** **2-3-1 3단 응용 — 두 자리의 자릿값을 각각 읽어 더한다.** 중간값 둘을 거친다. */
function tier231Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 1, 9);
  const a = intBetween(rng, 1, 9);
  const b = intBetween(rng, 1, 9);
  const c = intBetween(rng, 1, 9);
  const value = `${w}.${a}${b}${c}`;
  // 소수 둘째 자리 값은 `dec2` 로 찍는다 — `dec3(b*10)` 은 「$0.030$」이라 꼬리 $0$ 이다.
  const second = dec2(b);
  const third = dec3(c);
  return make(
    unit,
    `${n(value)}에서 소수 둘째 자리 숫자가 나타내는 수와 소수 셋째 자리 숫자가 ` +
      `나타내는 수의 합을 소수로 쓰시오.`,
    n(dec3(b * 10 + c)),
    `소수 둘째 자리 숫자 ${josaNum(b, "은", "는")} ${josaNum(second, "을", "를")} 나타내고, ` +
      `소수 셋째 자리 숫자 ${josaNum(c, "은", "는")} ${josaNum(third, "을", "를")} 나타냅니다. ` +
      `두 수를 더하면 ${n(dec3(b * 10 + c))}입니다.`,
  );
}

/** **2-3-1 4단 심화 — 조건으로 소수 세 자리 수 만들기.** 자리마다 걸린 조건을 엮는다. */
function tier231Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 1, 4);
  const a = intBetween(rng, 1, 9 - k);
  const b = a + k;
  const j = intBetween(rng, 1, b - 1);
  const c = b - j;
  const w = intBetween(rng, 1, 9);
  const value = dec3(w * 1000 + a * 100 + b * 10 + c);
  /*
   * 딸린 «맞지 않는 보기» 한 벌은 꾸밈이 아니다 — 소단원 이름이 약속하는 **소수 세 자리가
   * 지면에 서야** 한다. 처음 판에는 「소수 세 자리 수」라는 **낱말**만 있고 세 자리 소수가
   * 하나도 없어서 조건 판정기가 씨앗 40/40 을 걸었다(2-1-3 심화와 같은 자리다).
   * 보기는 `w.aaa` 로 잡는다 — `k ≥ 1` 이므로 첫 조건에서 **반드시** 어긋나고, 답을 안 흘린다.
   */
  const counter = `${w}.${a}${a}${a}`;
  return make(
    unit,
    `조건에 맞는 소수 세 자리 수를 쓰시오. ` +
      `자연수 부분은 ${n(w)}이고, 소수 첫째 자리 숫자는 ${n(a)}입니다. ` +
      `소수 둘째 자리 숫자는 소수 첫째 자리 숫자보다 ${n(k)} 큰 수이고, ` +
      `소수 셋째 자리 숫자는 소수 둘째 자리 숫자보다 ${n(j)} 작은 수입니다. ` +
      `예를 들어 ${josaNum(counter, "은", "는")} 소수 둘째 자리 숫자가 소수 첫째 자리 ` +
      `숫자보다 크지 않으므로 조건에 맞지 않습니다.`,
    n(value),
    `소수 둘째 자리 숫자는 ${expr(`${a}+${k}=${b}`)} 이므로 ${n(b)}이고, ` +
      `소수 셋째 자리 숫자는 ${expr(`${b}-${j}=${c}`)} 이므로 ${n(c)}입니다. ` +
      `그러므로 구하는 수는 ${n(value)}입니다.`,
  );
}

/** 2-3-2 무게를 견주는 소재 — 「자릿수가 많으면 큰 수」 오개념을 보이는 자리. */
const WEIGH_PAIRS = [
  ["호박", "무"],
  ["수박", "참외"],
  ["배추", "양파"],
] as const;

/** **2-3-2 1단 연산 — 큰 것부터 차례로.** 초3 은 «가장 큰 하나»를 고른다(그쪽과 다른 일). */
function tier232Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const picked: number[] = [];
  while (picked.length < 3) {
    const v = pick(rng, DEC2_POOL);
    if (!picked.includes(v)) picked.push(v);
  }
  const sorted = [...picked].sort((x, y) => y - x);
  return make(
    unit,
    `다음 소수를 큰 것부터 차례로 쓰시오.\n\n` +
      `${picked.map((v) => n(dec2(v))).join(", ")}`,
    sorted.map((v) => n(dec2(v))).join(", "),
    `소수의 크기는 자연수 부분부터, 그다음 소수 첫째 자리, 소수 둘째 자리 차례로 ` +
      `비교합니다. 큰 것부터 쓰면 ${sorted.map((v) => n(dec2(v))).join(", ")}입니다.`,
  );
}

/** **2-3-2 2단 기본 — 자릿수가 다른 두 수.** 「자리가 많으면 큰 수」가 이 소단원의 오개념이다. */
function tier232Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const [first, second] = pick(rng, WEIGH_PAIRS);
  const w = intBetween(rng, 1, 8);
  const t1 = intBetween(rng, 1, 8);
  const t2 = pick(
    rng,
    Array.from({ length: 9 }, (_, i) => i + 1).filter((v) => v !== t1),
  );
  const x = w * 100 + t1 * 10 + intBetween(rng, 1, 9);
  const y = w * 10 + t2;
  const heavier = x > y * 10 ? first : second;
  return make(
    unit,
    `${first}의 무게는 ${n(dec2(x))} kg이고, ${second}의 무게는 ${n(dec1(y))} kg입니다. ` +
      `더 무거운 것은 무엇입니까?`,
    heavier,
    `자연수 부분이 ${roJosa(w)} 같으므로 소수 첫째 자리를 비교합니다. ` +
      `${josaNum(t1, "과", "와")} ${n(t2)} 중 ${josaNum(Math.max(t1, t2), "이", "가")} 크므로 ` +
      `${josa(heavier, "이", "가")} 더 무겁습니다. 소수는 자리 수가 많다고 큰 수가 아닙니다.`,
  );
}

/** **2-3-2 3단 응용 — 두 수 사이에 든 소수 두 자리 수의 개수.** */
function tier232Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  // 양 끝을 **두 자리 소수**로 준다 — 「소수 두 자리 수」가 낱말로만 있으면 그 약속이
  // 지면에 안 선다(초3 과 가르는 판별자이기도 하다). 끝자리를 골라 `lo+1`·`hi-1` 도
  // 꼬리 $0$ 이 되지 않게 한다.
  const w = intBetween(rng, 1, 8);
  const t = intBetween(rng, 0, 5);
  const lo = (w * 10 + t) * 10 + intBetween(rng, 1, 8);
  const hi = (w * 10 + t + intBetween(rng, 1, 3)) * 10 + intBetween(rng, 2, 9);
  const count = hi - lo - 1;
  return make(
    unit,
    `${n(dec2(lo))}보다 크고 ${n(dec2(hi))}보다 작은 ` +
      `소수 두 자리 수는 모두 몇 개입니까?`,
    `${n(count)}개`,
    `양 끝의 두 수는 넣지 않으므로 ${n(dec2(lo + 1))}부터 ${n(dec2(hi - 1))}까지입니다. ` +
      `소수 둘째 자리 숫자를 ${n(1)}씩 세면 ` +
      `${expr(`${hi - 1}-${lo + 1}+1=${count}`)} 이므로 ${n(count)}개입니다.`,
  );
}

/** **2-3-2 4단 심화 — 범위와 자릿수 조건을 함께.** 초3 의 「$0.\square$ 몇 개」와 다른 일이다. */
function tier232Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  /*
   * 양 끝을 **두 자리 소수**로 준다 — 「소수 두 자리 수」가 낱말로만 있으면 그 약속이
   * 지면에 안 선다(2-3-2 응용과 같은 자리에서 잡혔다).
   *
   * 답이 몇 개인지를 **먼저 정하고** 범위를 짠다. 범위를 먼저 잡고 세면 0개·전부인 씨앗이
   * 섞인다. 양 끝은 답이 될 수 없게 한 칸씩 비켜 놓고, 끝자리가 $0$ 이 안 되게 고른다.
   */
  const w = intBetween(rng, 1, 8);
  const d = intBetween(rng, 1, 9);
  const m = intBetween(rng, 2, 3);
  const t1 = intBetween(rng, 1, 8 - m);
  const nine = Array.from({ length: 9 }, (_, i) => i + 1);
  const k = pick(
    rng,
    nine.filter((v) => v !== d),
  );
  const j = pick(
    rng,
    nine.filter((v) => v !== 10 - d),
  );
  const lo = w * 100 + t1 * 10 + d - k;
  const hi = w * 100 + (t1 + m - 1) * 10 + d + j;
  const found: number[] = [];
  for (let v = lo + 1; v < hi; v += 1) if (v % 10 === d) found.push(v);
  return make(
    unit,
    `${n(dec2(lo))}보다 크고 ${n(dec2(hi))}보다 작은 소수 두 자리 수 중에서 ` +
      `소수 둘째 자리 숫자가 ${n(d)}인 수를 모두 쓰시오.`,
    found.map((v) => n(dec2(v))).join(", "),
    `소수 둘째 자리 숫자가 ${n(d)}이므로 소수 첫째 자리 숫자를 하나씩 늘려 가며 찾습니다. ` +
      `${found.map((v) => n(dec2(v))).join(", ")}입니다. 모두 ${n(found.length)}개입니다.`,
  );
}

/**
 * **2-3-3 1단 연산 — 관계 자체를 묻는다.** 두 수를 주고 「몇 배인가」를 세운다.
 *
 * ⚠️ 처음에는 「$x$ 의 $\frac{1}{100}$ 은?」이었는데 **골격이 표준과 글자까지 같았다**
 * (표준은 $\frac{1}{10}$ — 수를 가리면 둘 다 「⟨수⟩의 ⟨수⟩은 얼마인가?」). 표준과 갈래는
 * 같은 시험지에 함께 실리므로 **상수만 바꾼 것은 같은 문항**이다. 묻는 방향을 바꿨다.
 */
function tier233Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC1_POOL);
  const hundred = intBetween(rng, 0, 1) === 0;
  const small = hundred ? dec3(x) : dec2(x);
  return make(
    unit,
    `${josaNum(dec1(x), "은", "는")} ${n(small)}의 몇 배입니까?`,
    `${n(hundred ? 100 : 10)}배`,
    `${n(small)}에서 소수점이 오른쪽으로 ${hundred ? "두" : "한"} 자리 옮겨지면 ` +
      `${n(dec1(x))}입니다. 소수점이 오른쪽으로 한 자리 옮겨질 때마다 ${n(10)}배가 되므로 ` +
      `${n(hundred ? 100 : 10)}배입니다.`,
  );
}

/** **2-3-3 2단 기본 — 되짚어 어떤 수를 찾는다.** 표준은 늘 정방향이다. */
function tier233Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC1_POOL);
  const hundred = intBetween(rng, 0, 1) === 0;
  // 어떤 수를 $10$배·$100$배 하면 `dec1(x)` 가 된다 — 출발이 세 자리를 안 넘게 묶여 있다.
  const answer = hundred ? dec3(x) : dec2(x);
  return make(
    unit,
    `어떤 수의 ${n(hundred ? 100 : 10)}배가 ${josaNum(dec1(x), "입니다", "입니다")}. ` +
      `어떤 수는 얼마입니까?`,
    n(answer),
    `${n(hundred ? 100 : 10)}배를 하면 소수점이 오른쪽으로 ` +
      `${hundred ? "두" : "한"} 자리 옮겨집니다. 되짚으려면 소수점을 왼쪽으로 ` +
      `${hundred ? "두" : "한"} 자리 옮기면 되므로 어떤 수는 ${n(answer)}입니다.`,
  );
}

/** **2-3-3 3단 응용 — 두 번 옮긴다.** $10$배 뒤 $\frac{1}{100}$ (두 단계). */
function tier233Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  // 출발은 **소수 두 자리**까지 — 알짜로 한 자리만 깊어지므로 세 자리에서 멈춘다.
  const x = pick(rng, DEC2_POOL);
  const mid = dec1(x);
  return make(
    unit,
    `${n(dec2(x))}의 ${n(10)}배의 $\\frac{1}{100}$은 얼마인가?`,
    n(dec3(x)),
    `${n(10)}배를 하면 소수점이 오른쪽으로 한 자리 옮겨져 ${n(mid)}입니다. ` +
      `여기에 $\\frac{1}{100}$을 하면 소수점이 왼쪽으로 두 자리 옮겨져 ${n(dec3(x))}입니다.`,
  );
}

/** **2-3-3 4단 심화 — 되짚었다가 다시 간다.** 어떤 수를 찾은 뒤 반대쪽으로 옮긴다. */
function tier233Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC1_POOL);
  if (intBetween(rng, 0, 1) === 0) {
    // 어떤 수의 1/10 이 dec2(x) → 어떤 수는 dec1(x), 그 10배는 정수 x.
    return make(
      unit,
      `어떤 수의 $\\frac{1}{10}$이 ${n(dec2(x))}입니다. ` +
        `어떤 수의 ${n(10)}배는 얼마입니까?`,
      n(x),
      `$\\frac{1}{10}$을 하면 소수점이 왼쪽으로 한 자리 옮겨지므로, 되짚으면 어떤 수는 ` +
        `${n(dec1(x))}입니다. 여기에 ${n(10)}배를 하면 소수점이 오른쪽으로 한 자리 옮겨져 ` +
        `${n(x)}입니다.`,
    );
  }
  // 어떤 수의 100 배가 정수 x → 어떤 수는 dec2(x), 그 1/10 은 dec3(x).
  return make(
    unit,
    `어떤 수의 ${n(100)}배가 ${n(x)}입니다. ` +
      `어떤 수의 $\\frac{1}{10}$은 얼마입니까?`,
    n(dec3(x)),
    `${n(100)}배를 하면 소수점이 오른쪽으로 두 자리 옮겨지므로, 되짚으면 어떤 수는 ` +
      `${n(dec2(x))}입니다. 여기에 $\\frac{1}{10}$을 하면 소수점이 왼쪽으로 한 자리 옮겨져 ` +
      `${n(dec3(x))}입니다.`,
  );
}

/** **2-3-4 1단 연산 — 소수 한 자리 수의 합.** 표준은 `=\square` 꼴이다. */
function tier234Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC1_POOL);
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => (a + v) % 10 !== 0),
  );
  return make(
    unit,
    `다음 두 소수의 합을 구하시오.\n\n${expr(`${dec1(a)}+${dec1(b)}`)}`,
    n(dec1(a + b)),
    `소수점끼리 자리를 맞추어 같은 자리 수끼리 더합니다. ` +
      `${expr(`${dec1(a)}+${dec1(b)}=${dec1(a + b)}`)}`,
  );
}

/** **2-3-4 2단 기본 — 두 날의 거리를 합친다.** */
function tier234Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC1_POOL);
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => (a + v) % 10 !== 0),
  );
  return make(
    unit,
    `어제 ${n(dec1(a))} km를 걷고, 오늘 ${n(dec1(b))} km를 걸었습니다. ` +
      `이틀 동안 걸은 거리는 몇 km입니까?`,
    n(dec1(a + b)),
    `이틀 동안 걸은 거리는 두 거리를 더한 것입니다. ` +
      `${expr(`${dec1(a)}+${dec1(b)}=${dec1(a + b)}`)}`,
  );
}

/** **2-3-4 3단 응용 — 세 값을 잇는다.** 두 번 더하며 중간값을 거친다. */
function tier234Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC1_POOL);
  // 중간값 `a+b` 도 해설에 나가므로 끝자리가 $0$ 이면 안 된다. 조건을 **뽑는 단계마다**
  // 나눠 건다 — 한 filter 에 몰면 `v` 와 무관한 항이 거짓일 때 풀이 통째로 비어 던진다.
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => (a + v) % 10 !== 0),
  );
  const c = pick(
    rng,
    DEC1_POOL.filter((v) => (a + b + v) % 10 !== 0),
  );
  return make(
    unit,
    `나무 도막 세 개의 길이가 각각 ${n(dec1(a))} m, ${n(dec1(b))} m, ${n(dec1(c))} m입니다. ` +
      `세 도막을 겹치지 않게 이으면 길이는 몇 m입니까?`,
    n(dec1(a + b + c)),
    `앞의 두 도막을 먼저 이으면 ${expr(`${dec1(a)}+${dec1(b)}=${dec1(a + b)}`)} 입니다. ` +
      `여기에 나머지 한 도막을 이으면 ` +
      `${expr(`${dec1(a + b)}+${dec1(c)}=${dec1(a + b + c)}`)} 입니다.`,
  );
}

/**
 * 2-3-4 4단 — 수 카드 넉 장. **작은 두 장의 합이 $10$ 의 배수면** 최대 합의 끝자리가 $0$ 이
 * 되어 「$14.0$」이 나간다. 씨앗을 다시 뽑지 않고 **넉 장 조합을 전수 열거해** 그것만 뺀다.
 */
const CARD_QUADS: number[][] = (() => {
  const out: number[][] = [];
  for (let a = 1; a <= 9; a += 1) {
    for (let b = a + 1; b <= 9; b += 1) {
      if ((a + b) % 10 === 0) continue; // a·b 가 가장 작은 둘 — 소수 첫째 자리로 간다
      for (let c = b + 1; c <= 9; c += 1) {
        for (let d = c + 1; d <= 9; d += 1) out.push([a, b, c, d]);
      }
    }
  }
  return out;
})();

/** **2-3-4 4단 심화 — 수 카드로 합을 가장 크게.** 큰 숫자를 일의 자리에 놓아야 한다. */
function tier234Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [s1, s2, s3, s4] = pick(rng, CARD_QUADS) as [
    number,
    number,
    number,
    number,
  ];
  // 큰 것부터: m1 > m2 > m3 > m4. 최대 합은 큰 둘을 일의 자리에 놓은 것이다.
  const [m1, m2, m3, m4] = [s4, s3, s2, s1];
  const best = (m1 + m2) * 10 + m3 + m4;
  const shown = pick(rng, [
    [s2, s4, s1, s3],
    [s3, s1, s4, s2],
    [s4, s2, s3, s1],
  ]);
  // 보기로 드는 한 벌은 **일의 자리가 `m1`·`m3`** 이라 최대가 아니다(최대는 `m1`·`m2`).
  return make(
    unit,
    `${n(4)}장의 수 카드 ${nums(shown)}${tail(shown[3]!, "을", "를")} 한 번씩 모두 사용하여 소수 한 자리 수 ` +
      `두 개를 만들려고 합니다. 예를 들어 ${n(`${m1}.${m2}`)}${tail(m2, "과", "와")} ${n(`${m3}.${m4}`)}처럼 ` +
      `만듭니다. 두 수의 합이 가장 클 때의 합을 구하시오.`,
    n(dec1(best)),
    `일의 자리는 소수 첫째 자리보다 ${n(10)}배 큰 자리이므로 큰 숫자 두 개를 ` +
      `일의 자리에 놓아야 합니다. ${josaNum(m1, "과", "와")} ${josaNum(m2, "을", "를")} 일의 자리에, ` +
      `${josaNum(m3, "과", "와")} ${josaNum(m4, "을", "를")} 소수 첫째 자리에 놓으면 ` +
      `${expr(`${m1}+${m2}=${m1 + m2}`)} 이고 ` +
      `${expr(`${dec1(m3)}+${dec1(m4)}=${dec1(m3 + m4)}`)} 이므로 합은 ${n(dec1(best))}입니다.`,
  );
}

/** 두 수 사이의 «폭» 후보(백분위 정수 $0.11$~$0.99$). 끝자리가 $0$ 이 아니다. */
const GAP_POOL: number[] = Array.from({ length: 9 }, (_, t) => t + 1).flatMap(
  (t) => Array.from({ length: 9 }, (_, u) => t * 10 + u + 1),
);

/** `a` 보다 작으면서 차의 끝자리가 $0$ 이 아닌 값들. 뺄셈 짝을 **풀에서** 고른다. */
function belowWithCleanDiff(pool: number[], a: number): number[] {
  return pool.filter((v) => v < a && (a - v) % 10 !== 0);
}

/** **2-3-5 1단 연산 — 소수 한 자리 수의 차.** 표준은 `=\square` 꼴이다. */
function tier235Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  // 가장 작은 값이 뽑히면 「더 작은 수」가 없어 풀이 빈다 — 뽑는 쪽에서 미리 잘라 둔다.
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 21),
  );
  const b = pick(rng, belowWithCleanDiff(DEC1_POOL, a));
  return make(
    unit,
    `다음 두 소수의 차를 구하시오.\n\n${expr(`${dec1(a)}-${dec1(b)}`)}`,
    n(dec1(a - b)),
    `소수점끼리 자리를 맞추어 같은 자리 수끼리 뺍니다. ` +
      `${expr(`${dec1(a)}-${dec1(b)}=${dec1(a - b)}`)}`,
  );
}

/** **2-3-5 2단 기본 — 가득 채우려면 얼마나 더.** 전체와 지금의 차를 세운다. */
function tier235Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const full = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 31),
  );
  const now = pick(rng, belowWithCleanDiff(DEC1_POOL, full));
  return make(
    unit,
    `들이가 ${n(dec1(full))} L인 양동이에 물이 ${n(dec1(now))} L 들어 있습니다. ` +
      `양동이를 가득 채우려면 물을 몇 L 더 부어야 합니까?`,
    n(dec1(full - now)),
    `더 부어야 하는 양은 들이에서 지금 들어 있는 양을 뺀 것입니다. ` +
      `${expr(`${dec1(full)}-${dec1(now)}=${dec1(full - now)}`)}`,
  );
}

/** **2-3-5 3단 응용 — 기준 수의 위아래.** 두 수를 각각 구한 뒤 차를 낸다(두 단계). */
function tier235Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const base = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 41),
  );
  const down = pick(
    rng,
    DEC1_POOL.filter((v) => v < base - 10 && (base - v) % 10 !== 0),
  );
  const up = pick(
    rng,
    DEC1_POOL.filter(
      (v) =>
        v !== down && // 폭이 같으면 두 조건이 글자까지 같아진다
        (base + v) % 10 !== 0 &&
        (down + v) % 10 !== 0 &&
        base + v < 200,
    ),
  );
  const lower = base - down;
  const upper = base + up;
  return make(
    unit,
    `${n(dec1(base))}보다 ${n(dec1(down))} 작은 수와 ${n(dec1(base))}보다 ` +
      `${n(dec1(up))} 큰 수가 있습니다. 두 수의 차는 얼마입니까?`,
    n(dec1(upper - lower)),
    `작은 쪽은 ${expr(`${dec1(base)}-${dec1(down)}=${dec1(lower)}`)} 이고, ` +
      `큰 쪽은 ${expr(`${dec1(base)}+${dec1(up)}=${dec1(upper)}`)} 입니다. ` +
      `두 수의 차는 ${expr(`${dec1(upper)}-${dec1(lower)}=${dec1(upper - lower)}`)} 입니다.`,
  );
}

/** **2-3-5 4단 심화 — 잘못 계산했더니.** 뺄 것을 더했으니 되짚어 두 번 뺀다. */
function tier235Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const sub = pick(
    rng,
    DEC1_POOL.filter((v) => v <= 39),
  );
  // 잘못 계산한 값에서 두 번 빼야 하므로 넉넉히 큰 것만 쓴다.
  const wrong = pick(
    rng,
    DEC1_POOL.filter(
      (v) =>
        v - sub >= 21 &&
        (v - sub) % 10 !== 0 &&
        (v - sub * 2) % 10 !== 0 &&
        v - sub * 2 >= 1,
    ),
  );
  const some = wrong - sub;
  const right = some - sub;
  return make(
    unit,
    `어떤 수에서 ${josaNum(dec1(sub), "을", "를")} 빼야 할 것을 잘못하여 더했더니 ` +
      `${josaNum(dec1(wrong), "이", "가")} 되었습니다. 바르게 계산한 값은 얼마입니까?`,
    n(dec1(right)),
    `더했더니 ${josaNum(dec1(wrong), "이", "가")} 되었으므로 어떤 수는 ` +
      `${expr(`${dec1(wrong)}-${dec1(sub)}=${dec1(some)}`)} 입니다. ` +
      `바르게 계산하면 ${expr(`${dec1(some)}-${dec1(sub)}=${dec1(right)}`)} 입니다.`,
  );
}

/** **2-3-6 1단 연산 — 소수 두 자리 수의 합.** 2-3-4 와 묻는 말을 달리한다. */
function tier236Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC2_POOL);
  const b = pick(
    rng,
    DEC2_POOL.filter((v) => (a + v) % 10 !== 0),
  );
  return make(
    unit,
    `다음 덧셈의 값을 소수로 나타내시오.\n\n${expr(`${dec2(a)}+${dec2(b)}`)}`,
    n(dec2(a + b)),
    `소수점끼리 자리를 맞추어 소수 둘째 자리부터 차례로 더합니다. ` +
      `${expr(`${dec2(a)}+${dec2(b)}=${dec2(a + b)}`)}`,
  );
}

/** **2-3-6 2단 기본 — 그릇과 담긴 것.** 두 무게를 합쳐 전체를 만든다. */
function tier236Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const empty = pick(
    rng,
    DEC2_POOL.filter((v) => v < 100),
  );
  const inside = pick(
    rng,
    DEC2_POOL.filter((v) => (empty + v) % 10 !== 0),
  );
  return make(
    unit,
    `빈 병의 무게는 ${n(dec2(empty))} kg이고, 병에 담긴 꿀의 무게는 ` +
      `${n(dec2(inside))} kg입니다. 꿀이 담긴 병의 무게는 몇 kg입니까?`,
    n(dec2(empty + inside)),
    `꿀이 담긴 병의 무게는 빈 병의 무게와 꿀의 무게를 더한 것입니다. ` +
      `${expr(`${dec2(empty)}+${dec2(inside)}=${dec2(empty + inside)}`)}`,
  );
}

/** **2-3-6 3단 응용 — 되짚었다가 더한다.** 어떤 수를 먼저 찾아야 합을 낼 수 있다. */
function tier236Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const gap = pick(
    rng,
    DEC2_POOL.filter((v) => v < 100),
  );
  const known = pick(
    rng,
    DEC2_POOL.filter(
      (v) => v - gap >= 100 && (v - gap) % 10 !== 0 && (v * 2 - gap) % 10 !== 0,
    ),
  );
  const some = known - gap;
  return make(
    unit,
    `어떤 수보다 ${n(dec2(gap))} 큰 수가 ` +
      `${josaNum(dec2(known), "입니다", "입니다")}. 어떤 수와 ${n(dec2(known))}의 합은 ` +
      `얼마입니까?`,
    n(dec2(some + known)),
    `어떤 수는 ${expr(`${dec2(known)}-${dec2(gap)}=${dec2(some)}`)} 입니다. ` +
      `두 수를 더하면 ${expr(`${dec2(some)}+${dec2(known)}=${dec2(some + known)}`)} 입니다.`,
  );
}

/**
 * 2-3-6 4단 — **소수 둘째 자리와 첫째 자리를 바꿔 쓴** 오류. `w.ab` 대신 `w.ba` 를 더했다.
 * 두 자리가 달라야 오류가 성립하므로 `a !== b` 인 짝만 열거한다.
 */
const SWAP_PAIRS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let a = 1; a <= 9; a += 1) {
    for (let b = 1; b <= 9; b += 1) if (a !== b) out.push([a, b]);
  }
  return out;
})();

/** **2-3-6 4단 심화 — 잘못 계산했더니.** 두 자리를 바꿔 쓴 값으로 더했다. */
function tier236Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [a, b] = pick(rng, SWAP_PAIRS);
  const w = intBetween(rng, 1, 3);
  const right = w * 100 + a * 10 + b;
  const wrongAdd = w * 100 + b * 10 + a;
  const got = pick(
    rng,
    DEC2_POOL.filter(
      (v) =>
        v - wrongAdd >= 100 &&
        (v - wrongAdd) % 10 !== 0 &&
        (v - wrongAdd + right) % 10 !== 0,
    ),
  );
  const some = got - wrongAdd;
  return make(
    unit,
    `어떤 수에 ${josaNum(dec2(right), "을", "를")} 더해야 할 것을 잘못하여 ` +
      `${josaNum(dec2(wrongAdd), "을", "를")} 더했더니 ` +
      `${josaNum(dec2(got), "이", "가")} 되었습니다. 바르게 계산한 값은 얼마입니까?`,
    n(dec2(some + right)),
    `잘못하여 더한 수가 ${josaNum(dec2(wrongAdd), "이", "가")} 이므로 어떤 수는 ` +
      `${expr(`${dec2(got)}-${dec2(wrongAdd)}=${dec2(some)}`)} 입니다. ` +
      `바르게 계산하면 ` +
      `${expr(`${dec2(some)}+${dec2(right)}=${dec2(some + right)}`)} 입니다.`,
  );
}

/** **2-3-7 1단 연산 — 소수 두 자리 수의 차.** 2-3-5 와 묻는 말을 달리한다. */
function tier237Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC2_POOL.filter((v) => v >= 201),
  );
  const b = pick(rng, belowWithCleanDiff(DEC2_POOL, a));
  return make(
    unit,
    `다음 뺄셈의 값을 소수로 나타내시오.\n\n${expr(`${dec2(a)}-${dec2(b)}`)}`,
    n(dec2(a - b)),
    `소수점끼리 자리를 맞추어 소수 둘째 자리부터 차례로 뺍니다. ` +
      `${expr(`${dec2(a)}-${dec2(b)}=${dec2(a - b)}`)}`,
  );
}

/** **2-3-7 2단 기본 — 목표까지 남은 만큼.** 자릿수가 다른 두 수를 맞추어 뺀다. */
function tier237Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  // 목표는 **소수 한 자리**, 달린 거리는 두 자리 — 자리를 맞추어 빼는 것이 이 소단원이다.
  const goal = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 41),
  );
  const done = pick(
    rng,
    DEC2_POOL.filter((v) => v < goal * 10 - 20 && (goal * 10 - v) % 10 !== 0),
  );
  return make(
    unit,
    `오늘 달릴 거리는 ${n(dec1(goal))} km입니다. 지금까지 ${n(dec2(done))} km를 ` +
      `달렸다면 앞으로 몇 km를 더 달려야 합니까?`,
    n(dec2(goal * 10 - done)),
    `더 달려야 하는 거리는 목표에서 지금까지 달린 거리를 뺀 것입니다. ` +
      `${expr(`${dec1(goal)}-${dec2(done)}=${dec2(goal * 10 - done)}`)}`,
  );
}

/** **2-3-7 3단 응용 — 되짚었다가 뺀다.** 어떤 수를 먼저 찾아야 다음 뺄셈을 할 수 있다. */
function tier237Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const first = pick(
    rng,
    DEC2_POOL.filter((v) => v < 200),
  );
  const left = pick(
    rng,
    // 되짚은 「어떤 수」도 해설에 나가므로 끝자리가 $0$ 이면 안 된다(「$2.80$」).
    DEC2_POOL.filter((v) => v < 300 && (first + v) % 10 !== 0),
  );
  const some = first + left;
  const second = pick(
    rng,
    DEC2_POOL.filter((v) => v < some && (some - v) % 10 !== 0),
  );
  return make(
    unit,
    `어떤 수에서 ${josaNum(dec2(first), "을", "를")} 뺐더니 ` +
      `${josaNum(dec2(left), "이", "가")} 되었습니다. 어떤 수에서 ` +
      `${josaNum(dec2(second), "을", "를")} 빼면 얼마입니까?`,
    n(dec2(some - second)),
    `어떤 수는 ${expr(`${dec2(left)}+${dec2(first)}=${dec2(some)}`)} 입니다. ` +
      `${expr(`${dec2(some)}-${dec2(second)}=${dec2(some - second)}`)} 입니다.`,
  );
}

/**
 * **2-3-7 4단 심화 — 차가 가장 작은 짝.** 세 수에서 두 개를 골라 본다.
 * 2-3-4 심화의 「합이 가장 크게」와 방향이 대비된다.
 */
function tier237Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  /*
   * 가장 작은 차를 **먼저 정하고** 세 수를 짠다 — 세 수를 먼저 뽑아 재면 최솟값이 겹치거나
   * 끝자리가 $0$ 이 되는 씨앗이 섞인다.
   *
   * 끝자리 $0$ 을 막을 곳이 **넷**이다 — 두 차(`small`·`wide`)와 가운데·가장 큰 수.
   * 처음에는 두 차만 막아서 「$7.70$」이 발문에 나갔다(쓸기가 실측).
   */
  const small = pick(
    rng,
    GAP_POOL.filter((v) => v <= 60),
  );
  const wide = pick(
    rng,
    GAP_POOL.filter((v) => v > small), // 최솟값이 하나로 서게 «더 넓은» 쪽만
  );
  const lo = pick(
    rng,
    DEC2_POOL.filter(
      (v) =>
        v + small + wide < 900 &&
        (v + small) % 10 !== 0 &&
        (v + small + wide) % 10 !== 0,
    ),
  );
  const mid = lo + small;
  const hi = mid + wide;
  const order = pick(rng, [
    [mid, hi, lo],
    [hi, lo, mid],
    [lo, hi, mid],
  ]);
  return make(
    unit,
    `세 소수 ${order.map((v) => n(dec2(v))).join(", ")} 중에서 두 수를 골라 차를 ` +
      `구하려고 합니다. 차가 가장 작을 때의 값을 구하시오.`,
    n(dec2(small)),
    `차가 가장 작으려면 크기가 가장 가까운 두 수를 골라야 합니다. ` +
      `크기 순으로 늘어놓고 이웃한 두 수끼리만 견주면 됩니다. ` +
      `${josaNum(dec2(lo), "과", "와")} ${n(dec2(mid))}, ` +
      `${josaNum(dec2(mid), "과", "와")} ${n(dec2(hi))}의 차를 견주면 ` +
      `${expr(`${dec2(mid)}-${dec2(lo)}=${dec2(small)}`)} 이고 ` +
      `${expr(`${dec2(hi)}-${dec2(mid)}=${dec2(wide)}`)} 이므로 ` +
      `가장 작은 차는 ${n(dec2(small))}입니다.`,
  );
}

/* ───────────────────────── 2-4 사각형 ───────────────────────── */

function quad(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = code(unit);

  if (c === "2-4-1") {
    const kind = intBetween(rng, 0, 3);
    if (kind === 3) {
      const count = intBetween(rng, 2, 3);
      return make(
        unit,
        `직선 ㄱㄴ과 직선 ㄷㄹ이 만나서 이루는 네 각 중 한 각이 ${deg(90)}입니다. ` +
          `나머지 ${n(3)}개의 각 중 ${n(count)}개의 각의 크기를 더하면 몇 도인가?`,
        deg(90 * count),
        `두 직선이 수직으로 만나면 네 각이 모두 ${deg(90)}입니다. ${expr(`90\\times${count}=${90 * count}`)}`,
      );
    }
    if (kind === 0) {
      return make(
        unit,
        "두 직선이 만나서 이루는 각이 직각일 때 이 두 직선은 서로 무엇이라고 하는가?",
        "수직",
        `두 직선이 ${deg(90)}로 만나면 두 직선은 서로 수직이라고 합니다.`,
      );
    }
    if (kind === 1) {
      return make(
        unit,
        "직선 ㄱㄴ에 대한 수선은 직선 ㄱㄴ과 몇 도를 이루며 만나는가?",
        deg(90),
        `한 직선에 대한 수선은 그 직선과 직각으로 만납니다. 직각은 ${deg(90)}입니다.`,
      );
    }
    return make(
      unit,
      "직사각형에서 한 변에 수직인 변은 몇 개인가?",
      n(2),
      `직사각형은 네 각이 모두 직각이므로 한 변과 만나는 두 변이 모두 그 변에 수직입니다.`,
    );
  }

  if (c === "2-4-2") {
    const kind = intBetween(rng, 0, 3);
    if (kind === 3) {
      return make(
        unit,
        "평행한 두 직선을 양쪽으로 아무리 길게 늘이면 두 직선이 만나는 점은 몇 개인가?",
        `${n(0)}개`,
        `평행한 두 직선은 아무리 늘여도 만나지 않습니다. 그러므로 만나는 점은 ${n(0)}개입니다.`,
      );
    }
    if (kind === 0) {
      return make(
        unit,
        "서로 만나지 않는 두 직선을 무엇이라고 하는가?",
        "평행선",
        "한 평면에서 아무리 늘여도 만나지 않는 두 직선을 평행하다고 하고, 그 두 직선을 평행선이라고 합니다.",
      );
    }
    if (kind === 1) {
      return make(
        unit,
        "한 직선에 수직인 두 직선은 서로 어떤 관계인가?",
        "평행",
        "한 직선에 수직인 두 직선은 아무리 늘여도 만나지 않으므로 서로 평행합니다.",
      );
    }
    return make(
      unit,
      "직사각형에서 서로 평행한 변은 몇 쌍인가?",
      n(2),
      `직사각형은 마주 보는 두 변끼리 평행하므로 평행한 변이 ${n(2)}쌍 있습니다.`,
    );
  }

  if (c === "2-4-3") {
    const dist = intBetween(rng, 3, 12);
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        `평행한 두 직선 사이에 수선을 그었더니 길이가 ${cm(dist)}였습니다. 이 평행선 사이의 거리는 몇 cm인가?`,
        cm(dist),
        `평행선 사이의 거리는 평행선 사이에 그은 수선의 길이입니다. 그러므로 ${cm(dist)}입니다.`,
      );
    }
    if (kind === 1) {
      const count = intBetween(rng, 2, 5);
      return make(
        unit,
        `평행한 두 직선 사이에 수선을 ${n(count)}개 그었습니다. 이 수선들의 길이는 서로 어떠한가?`,
        "모두 같다",
        "평행선 사이에 그은 수선의 길이는 어디에서 재어도 모두 같습니다.",
      );
    }
    return make(
      unit,
      `평행선 사이의 거리가 ${cm(dist)}일 때, 두 평행선 사이에 그은 수선이 아닌 비스듬한 선분의 길이는 ` +
        `${cm(dist)}보다 긴가, 짧은가?`,
      "길다",
      `평행선 사이에서 가장 짧은 선분이 수선입니다. 그러므로 비스듬한 선분은 ${cm(dist)}보다 깁니다.`,
    );
  }

  if (c === "2-4-4") {
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        "평행한 변이 한 쌍이라도 있는 사각형을 무엇이라고 하는가?",
        "사다리꼴",
        "평행한 변이 한 쌍이라도 있으면 사다리꼴입니다.",
      );
    }
    if (kind === 1) {
      return make(
        unit,
        "평행사변형은 사다리꼴이라고 할 수 있는가? 맞으면 '예', 아니면 '아니요'를 쓰시오.",
        "예",
        "평행사변형은 평행한 변이 두 쌍이므로 한 쌍이라도 평행하다는 조건을 만족합니다. 그러므로 사다리꼴입니다.",
      );
    }
    return make(
      unit,
      "그림에서 사다리꼴의 기호를 쓰시오.",
      "가",
      "가는 위쪽 변과 아래쪽 변이 서로 평행합니다. 나는 평행한 변이 한 쌍도 없습니다.",
      fig("namedShapes", {
        items: [
          { shape: "trap", label: "가" },
          { shape: "irregQuad", label: "나" },
        ],
      }),
    );
  }

  if (c === "2-4-5") {
    const kind = intBetween(rng, 0, 2);
    const a = pick(rng, [50, 55, 60, 65, 70, 75, 80, 110, 115, 120, 125, 130]);
    if (kind === 0) {
      return make(
        unit,
        `평행사변형의 한 각의 크기가 ${deg(a)}입니다. 이 각과 이웃한 각의 크기는 몇 도인가?`,
        deg(180 - a),
        `평행사변형에서 이웃한 두 각의 크기의 합은 ${deg(180)}입니다. ${expr(`180-${a}=${180 - a}`)}`,
      );
    }
    if (kind === 1) {
      return make(
        unit,
        `평행사변형의 한 각의 크기가 ${deg(a)}입니다. 이 각과 마주 보는 각의 크기는 몇 도인가?`,
        deg(a),
        `평행사변형은 마주 보는 두 각의 크기가 서로 같습니다. 그러므로 ${deg(a)}입니다.`,
      );
    }
    const x = intBetween(rng, 4, 12);
    const y = intBetween(rng, 3, 11);
    return make(
      unit,
      `평행사변형에서 이웃한 두 변의 길이가 ${cm(x)}, ${cm(y)}입니다. 네 변의 길이의 합은 몇 cm인가?`,
      cm((x + y) * 2),
      `평행사변형은 마주 보는 두 변의 길이가 같으므로 ${expr(`(${x}+${y})\\times2=${(x + y) * 2}`)} 입니다.`,
    );
  }

  if (c === "2-4-6") {
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        "네 변의 길이가 모두 같은 사각형을 무엇이라고 하는가?",
        "마름모",
        "네 변의 길이가 모두 같은 사각형을 마름모라고 합니다.",
      );
    }
    if (kind === 1) {
      const side = intBetween(rng, 4, 13);
      return make(
        unit,
        `한 변이 ${cm(side)}인 마름모의 네 변의 길이의 합은 몇 cm인가?`,
        cm(side * 4),
        `마름모는 네 변의 길이가 모두 같으므로 ${expr(`${side}\\times4=${side * 4}`)} 입니다.`,
      );
    }
    return make(
      unit,
      "그림에서 네 변의 길이가 모두 같은 사각형의 기호를 쓰시오.",
      "가",
      "가는 네 변의 길이가 모두 같습니다. 나는 이웃한 두 변의 길이가 다릅니다.",
      fig("namedShapes", {
        items: [
          { shape: "tallDiamond", label: "가" },
          { shape: "rect", label: "나" },
        ],
      }),
    );
  }

  if (c === "2-4-7") {
    const kind = intBetween(rng, 0, 3);
    if (kind === 0) {
      return make(
        unit,
        "네 각이 모두 직각이고 네 변의 길이도 모두 같은 사각형을 무엇이라고 하는가?",
        "정사각형",
        "네 각이 모두 직각인 사각형은 직사각형이고, 그중 네 변의 길이까지 같은 것이 정사각형입니다.",
      );
    }
    if (kind === 1) {
      return make(
        unit,
        "직사각형은 평행사변형이라고 할 수 있는가? 맞으면 '예', 아니면 '아니요'를 쓰시오.",
        "예",
        "직사각형은 마주 보는 두 쌍의 변이 서로 평행하므로 평행사변형입니다.",
      );
    }
    if (kind === 2) {
      return make(
        unit,
        "정사각형은 마름모라고 할 수 있는가? 맞으면 '예', 아니면 '아니요'를 쓰시오.",
        "예",
        "정사각형은 네 변의 길이가 모두 같으므로 마름모입니다.",
      );
    }
    const side = intBetween(rng, 4, 13);
    return make(
      unit,
      `한 변이 ${cm(side)}인 정사각형의 네 변의 길이의 합은 몇 cm인가?`,
      cm(side * 4),
      `정사각형은 네 변의 길이가 모두 같으므로 ${expr(`${side}\\times4=${side * 4}`)} 입니다.`,
    );
  }

  return noBranch(unit);
}
/* ─────────────────────── 2-5 꺾은선그래프 ─────────────────────── */

type TimeLabel = { text: string; math: string };
/**
 * 꺾은선 소재. **값의 크기는 소재마다 다르다** — 그래서 범위를 소재가 들고 있다.
 *
 * ⚠️ 예전에는 소재와 무관하게 한 범위(첫값 9~14)를 같이 썼다. 그래서 **「강아지의 무게가
 * 1개월에 9~14kg」** 이 표본의 100%, **「박물관 월 관람객이 9~32명」** 이 100% 였다
 * (2026-08-22 실측). 갓난 강아지는 그 무게가 아니고 박물관은 그 인원이 아니다.
 * 초5 평균이 「키 $33$cm」로 겪은 것과 **같은 뿌리**다(`AVG_TOPICS`).
 *
 * - `base` · `step` — 첫값은 `base` 에서 골라 `step` 을 곱한다. 이후 값도 `step` 의 배수라
 *   지면에 **읽히는 수**만 나온다(`237` 이 아니라 `250`). 원장님: 「큰 눈금 써도 된다」.
 * - `rising` — 키·무게처럼 **자라기만 하는** 것은 내려가지 않는다.
 *   기온·관람객 수·비의 양은 오르내려도 된다.
 */
type LineTheme = {
  topic: string;
  unit: string;
  labels: readonly TimeLabel[];
  base: readonly [number, number];
  step: number;
  rising?: boolean;
  /**
   * 그림에 그려질 **세로 눈금 한 칸**(D-70). `step`(값의 배수)과 **다른 것**이다.
   *
   * `step` 을 그대로 걸음으로 실으면 눈금이 24~33줄이 되어 엔진이 던진다
   * (`MAX_Y_TICKS = 9`, 즉 **최댓값 ≤ 8 × 걸음**이어야 한다).
   * 실측: 기온 33줄 · 강낭콩 24줄 · 박물관 **33줄**. 그래서 꺾은선은 걸음을 따로 정한다.
   *
   * ⚠️ 그 결과 **꺾은선 값은 눈금선 위에 없다**(`step` 이 `yStep` 보다 잘다).
   * 그래서 꺾은선에는 「몇 칸인가」를 묻지 않는다 — 「한 칸은 몇 …인가」만 묻는다.
   * 막대는 값이 걸음의 배수라 「몇 칸인가」까지 물을 수 있다.
   */
  yStep: number;
};

/** 그림의 축 이름은 `3월`, 본문은 `$3$월`. 본문에 날 숫자를 남기지 않는다(R1). */
function timeLabels(values: readonly number[], suffix: string): TimeLabel[] {
  return values.map((v) => ({
    text: `${v}${suffix}`,
    math: `${n(v)}${suffix}`,
  }));
}

/**
 * 꺾은선그래프 소재. 막대와 같은 이유로 **한 줄로 편다** — 무리로 묶었을 때
 * 「강낭콩의 키」·「고구마 싹의 키」가 한 번도 안 나오고 있었다(실측 0/1200).
 */
const LINE_THEMES: readonly LineTheme[] = [
  {
    topic: "교실의 기온",
    unit: "℃",
    labels: timeLabels([3, 4, 5, 6, 7], "월"),
    base: [9, 14],
    step: 1,
    yStep: 5,
  },
  {
    topic: "운동장의 기온",
    unit: "℃",
    labels: timeLabels([9, 10, 11, 12, 1], "시"),
    base: [10, 15],
    step: 1,
    yStep: 5,
  },
  {
    topic: "강낭콩의 키",
    unit: "cm",
    labels: timeLabels([5, 10, 15, 20, 25], "일"),
    base: [3, 5],
    step: 2,
    yStep: 10,
    rising: true,
  },
  {
    topic: "고구마 싹의 키",
    unit: "cm",
    labels: timeLabels([1, 2, 3, 4, 5], "주"),
    base: [4, 7],
    step: 2,
    yStep: 10,
    rising: true,
  },
  {
    topic: "도서관에 온 학생 수",
    unit: "명",
    labels: ["월", "화", "수", "목", "금"].map((d) => ({
      text: `${d}요일`,
      math: `${d}요일`,
    })),
    base: [8, 12],
    step: 2,
    yStep: 10,
  },
  {
    // **되살렸다** (2026-08-22). 한때 뺐던 소재다 — 월 관람객은 수백~수천이라야
    // 자연스러운데 `_y_step` 이 5에서 멈춰 눈금이 231줄이 되어 지면을 못 읽었다.
    // 그림 세션이 `_axis_top` 으로 걸음을 사다리 삼게 고쳐, 실측으로 `yMax 1153` 이
    // **7줄**(`0·200·…·1200`)로 나온다. 원장님: 「큰 눈금 써도 된다」.
    topic: "박물관에 온 관람객 수",
    unit: "명",
    labels: timeLabels([1, 2, 3, 4, 5], "월"),
    base: [8, 14],
    step: 50,
    // 최댓값 1,600 · 걸음 200 → 눈금 9줄(`MAX_Y_TICKS`). **여유가 없다** —
    // `base` 나 `step` 을 키우면 엔진이 던진다. 아래 「눈금 줄 수」 시험이 먼저 잡는다.
    yStep: 200,
  },
  {
    // 박물관을 뺐던 동안 대신 넣었던 소재. 되살린 뒤에도 **함께 둔다** — 소재가 하나
    // 늘어 다양해지고, 규모가 작은 쪽도 있어야 지면이 한쪽으로 쏠리지 않는다.
    topic: "우리 반이 읽은 책 수",
    unit: "권",
    labels: timeLabels([1, 2, 3, 4, 5], "월"),
    base: [6, 10],
    step: 2,
    yStep: 10,
  },
  {
    topic: "강아지의 무게",
    unit: "kg",
    // 중형견 기준 — 1개월 2~4kg, 5개월에 20kg 안팎. 갓난 강아지가 9kg 이던 자리다.
    labels: timeLabels([1, 2, 3, 4, 5], "개월"),
    base: [2, 4],
    step: 1,
    yStep: 5,
    rising: true,
  },
  {
    topic: "하루 동안 내린 비의 양",
    unit: "mm",
    labels: timeLabels([6, 7, 8, 9, 10], "일"),
    base: [8, 12],
    step: 2,
    yStep: 10,
  },
];

/**
 * 시험이 **「적어 둔 소재가 전부 실제로 나오는가」**를 손 목록 없이 세도록 내보낸다.
 * 손으로 나열한 목록은 샌다 — 세는 쪽과 만드는 쪽이 **같은 배열**을 봐야 한다.
 */
export const G4_BAR_THEMES = BAR_THEMES;
/** 규모↔값 짝과 「해가 있는 총원」을 시험이 직접 세도록 내보낸다. */
export const G4_BAR_SCALES = BAR_SCALES;
export const G4_BAR_SPLITS = barSplits;
// 두 그래프 결합 — **아직 갈래에 배선하지 않았다**(그림 계약 대기). 시험이 여기를 직접 부른다.
export const G4_SALE_THEMES = SALE_THEMES;
export const G4_SALE_COMBO = buildSaleCombo;
export const G4_SALE_CHART_SPECS = saleChartSpecs;
export const G4_SALE_FIGURE = saleFigure;
export const G4_SALE_LIMITS = {
  countStep: SALE_COUNT_STEP,
  priceStep: SALE_PRICE_STEP,
  counts: SALE_COUNTS,
  prices: SALE_PRICES,
  maxTicks: SALE_MAX_TICKS,
} as const;
export const G4_LINE_THEMES = LINE_THEMES;

/**
 * 나눠 갖기를 시험이 **일부러 터뜨려 볼 수 있게** 내보낸다.
 * 「소재가 모자라면 던진다」는 가드는 터뜨려 보지 않으면 장식인지 알 수 없다.
 */
export const G4_THEME_SHARE = themeShare;

/**
 * 이웃한 값의 차가 **모두 다르게** 만든다 — 「가장 많이 변한 때」의 답이 하나여야 한다.
 *
 * 걸음은 서로 다른 넷(1~6)을 뽑아 **`step` 을 곱한다.** `step` 이 상수라 차도 서로 다름이
 * 그대로 보존되고, 모든 값이 `step` 의 배수라 지면에 읽히는 수만 나온다.
 * (자동으로 지켜지더라도 시험은 따로 둔다 — `step` 이 상수가 아니게 되면 조용히 깨진다.)
 */
function lineValues(rng: Rng, theme: LineTheme): number[] {
  const pool = [1, 2, 3, 4, 5, 6];
  const rest = [...pool];
  const steps: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    steps.push(rest.splice(intBetween(rng, 0, rest.length - 1), 1)[0]!);
  }
  const first = intBetween(rng, theme.base[0], theme.base[1]) * theme.step;
  // 자라는 것(키·무게)은 줄어들 수 없다. 기온·관람객 수는 오르내려도 된다.
  const dip = !theme.rising && intBetween(rng, 0, 1) === 0;
  const signs = [1, 1, dip ? -1 : 1, 1];
  const walk = (ss: number[]) => {
    const out = [first];
    for (let i = 0; i < 4; i += 1) {
      out.push(out[i]! + steps[i]! * ss[i]! * theme.step);
    }
    return out;
  };
  const vals = walk(signs);
  // 값이 겹치면 「가장 높은 때」의 답이 둘이 되고, 0 이하는 세상에 없는 값이다 — 오르막으로 다시.
  if (new Set(vals).size !== vals.length || Math.min(...vals) < theme.step) {
    return walk([1, 1, 1, 1]);
  }
  return vals;
}

function lineGraph(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = code(unit);
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = lineValues(rng, theme);
  const values = theme.labels.map((label, i) => ({
    label: label.text,
    value: nums[i]!,
  }));
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const topLabel = theme.labels[nums.indexOf(max)]!;
  /** 값이 늘어난 구간 수. 이웃한 값이 같은 경우는 없다(나눔·걸음 조건이 막는다). */
  const rises = nums.slice(1).filter((v, i) => v > nums[i]!).length;
  const figure = fig("lineChart", {
    values,
    yMax: max + 3,
    yStep: theme.yStep,
    yLabel: theme.unit,
  });
  const intro = `${josa(theme.topic, "을", "를")} 조사하여 나타낸 꺾은선그래프입니다.`;

  if (c === "2-5-1") {
    if (intBetween(rng, 0, 1) === 0) {
      const at = intBetween(rng, 0, theme.labels.length - 1);
      const label = theme.labels[at]!;
      return make(
        unit,
        `${intro} ${label.math}의 ${josa(theme.topic, "은", "는")} 몇 ${theme.unit}인가?`,
        `${n(nums[at]!)}${theme.unit}`,
        // ⚠️ 「**눈금** ${v} 에 있으므로」 라고 쓰지 않는다. 꺾은선 값은 `theme.step` 의
        // 배수인데 **그려지는 눈금은 `_y_step` 이 따로 정하므로**(대개 더 성기다) 값이
        // 눈금선 위에 없는 경우가 대부분이다 — 실측 6,000점 중 4,760점.
        // 「눈금 사이를 읽는 것」이 오히려 이 학년이 배우는 것이라, 점의 값만 말한다.
        `${label.math}의 점이 가리키는 값은 ${n(nums[at]!)}${theme.unit}입니다.`,
        figure,
      );
    }
    return make(
      unit,
      `${intro} ${theme.topic}의 값이 가장 큰 때는 언제인가?`,
      topLabel.math,
      `점이 가장 높이 찍힌 때는 ${topLabel.math}이고 그때의 값은 ${n(max)}${theme.unit}입니다.`,
      figure,
    );
  }

  if (c === "2-5-2") {
    if (intBetween(rng, 0, 1) === 0) {
      let at = 0;
      for (let i = 1; i < nums.length - 1; i += 1) {
        if (
          Math.abs(nums[i + 1]! - nums[i]!) >
          Math.abs(nums[at + 1]! - nums[at]!)
        )
          at = i;
      }
      const change = Math.abs(nums[at + 1]! - nums[at]!);
      return make(
        unit,
        `${intro} ${theme.topic}의 값이 가장 많이 변한 때는 어느 때와 어느 때 사이인가?`,
        // 때 이름 뒤 「과/와」는 **낱말의 받침**이 정한다 — 「$3$월과」·「$9$시와」.
        // 「과」로 박아 두어 「$12$시과」가 나가고 있었다(2-5 갈래 작업 중 실측, 695자리 중 1).
        // 수 뒤 조사(R조사)는 이 자리를 구조적으로 못 본다 — 조사가 붙은 것이 수가 아니라 낱말이다.
        `${josa(theme.labels[at]!.math, "과", "와")} ${theme.labels[at + 1]!.math} 사이`,
        `${josa(theme.labels[at]!.math, "과", "와")} ${theme.labels[at + 1]!.math} 사이에서 선이 가장 가파릅니다. ` +
          `${expr(`${Math.max(nums[at]!, nums[at + 1]!)}-${Math.min(nums[at]!, nums[at + 1]!)}=${change}`)} 만큼 변했습니다.`,
        figure,
      );
    }
    const first = nums[0]!;
    const last = nums[nums.length - 1]!;
    const rise = last >= first;
    return make(
      unit,
      `${intro} ${theme.labels[theme.labels.length - 1]!.math}의 값은 ` +
        `${theme.labels[0]!.math}의 값보다 몇 ${theme.unit} 더 ${rise ? "큰가" : "작은가"}?`,
      `${n(Math.abs(last - first))}${theme.unit}`,
      `${expr(`${Math.max(first, last)}-${Math.min(first, last)}=${Math.abs(last - first)}`)} 이므로 ` +
        `${n(Math.abs(last - first))}${theme.unit} 더 ${rise ? "큽니다" : "작습니다"}.`,
      figure,
    );
  }

  if (c === "2-5-3") {
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      // D-70. 꺾은선은 **「한 칸은 몇 …인가」만** 묻는다 — 값이 `theme.step` 의 배수인데
      // 걸음은 그보다 성기어(`yStep`) **점이 눈금선 위에 없다.** 「몇 칸인가」는 답이 자연수가
      // 아니게 되므로 막대에서만 묻는다. 걸음 값은 그림에 실은 `theme.yStep` 그대로다.
      return make(
        unit,
        `${intro} 세로 눈금 한 칸은 몇 ${theme.unit}을 나타내는가?`,
        `${n(theme.yStep)}${theme.unit}`,
        `세로축 눈금이 ${n(0)}, ${n(theme.yStep)}, ${n(theme.yStep * 2)}, … 로 매겨져 있으므로 ` +
          `한 칸은 ${n(theme.yStep)}${theme.unit}입니다.`,
        figure,
      );
    }
    if (kind === 1) {
      return make(
        unit,
        `${intro} ${theme.topic}의 값이 늘어난 구간은 모두 몇 번인가?`,
        `${n(rises)}번`,
        `이웃한 두 점을 차례로 견주면 값이 늘어난 구간이 ${n(rises)}번, ` +
          `줄어든 구간이 ${n(nums.length - 1 - rises)}번입니다.`,
        figure,
      );
    }
    return make(
      unit,
      `${intro} ${theme.topic}의 값이 가장 큰 때와 가장 작은 때의 차는 몇 ${theme.unit}인가?`,
      `${n(max - min)}${theme.unit}`,
      `가장 큰 값이 ${n(max)}${theme.unit}, 가장 작은 값이 ${n(min)}${theme.unit}입니다. ` +
        `${expr(`${max}-${min}=${max - min}`)}`,
      figure,
    );
  }

  return noBranch(unit);
}
/* ──────────── 2-5 난이도 4단 (D-72 확대, 2026-08-23) ────────────
 *
 * **자료형이라 1단은 「계산」이 아니라 「값 읽기」다**(D-72 ⑶).
 *
 * ⚠️ **「값이 가려진 꺾은선」은 만들지 않는다.** `_bar_chart` 만 `allow_unknown=True` 로
 * 부르고 `_line_chart` 는 안 부른다(`elem_advanced.py:612` 대 `:669`). 지금 물으면 값을
 * `values` 에 넣어야 하고, 넣으면 **그 값이 그려져** 답이 지면에 그대로 나온다.
 *
 * ⚠️ **`chartPair`(두 그래프 견주기)도 지금은 안 쓴다.** 짝의 폭 등급이 파이썬 가드와
 * 어긋나 있다 — 파이썬은 짝이 늘 364px 틀에 든다고 보고 판정하는데(`PAIR_FRAME_PX`),
 * TS `figureSvgSize` 는 viewBox 폭으로 등급을 정해 초4 의 짝(293~360단위)이 `pair`(380 초과)에
 * **한 번도 안 걸린다.** 293단위짜리는 `mid`(240px)로 떨어져 눈금 글자가 **11.45px** 로
 * 본문(12.5px) 아래가 된다. 고쳐지면 그때 짝 갈래를 따로 얹는다(리드 보고 2026-08-23).
 *
 * 표준과 겹치지 않게 **묻는 방향**을 갈랐다 — 표준이 「가장 큰 때는 **언제**」면 갈래는
 * 「가장 작은 때의 **값**」, 표준이 때→값이면 갈래는 값→때.
 */

/**
 * 2-5-1 3단용 — 한가운데 값을 읽으려면 **이웃한 두 값의 합이 짝수**여야 한다.
 *
 * 그런 이웃 짝은 **반드시 있다**: 걸음은 `1`~`6` 중 **서로 다른 넷**인데 홀수는 셋뿐이라
 * 넷을 고르면 짝수가 적어도 하나 들어간다. 걸음이 짝수면 그 이웃의 두 값은 같은 홀짝이라
 * 합이 짝수다(부호는 홀짝을 안 바꾼다). `theme.step` 이 짝수면 걸음이 전부 짝수라 더 넉넉하다.
 */
function evenSumPairs(nums: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < nums.length - 1; i += 1) {
    if ((nums[i]! + nums[i + 1]!) % 2 === 0) out.push(i);
  }
  return out;
}

/**
 * 2-5-2 4단용 — **오른 뒤 반드시 한 번 내려간다.**
 *
 * 「값이 처음으로 $T$ 이상이 된 때」가 뜻을 가지려면 그 뒤에 오르내림이 있어야 한다
 * (리드 2026-08-23) — 늘 오르기만 하면 「처음으로」가 빈 말이다. 표준 `lineValues` 는
 * 내림 여부를 씨앗에 맡기므로 여기서 따로 만든다.
 *
 * 셋째 걸음만 내림이고 **그 폭을 둘째 오름보다 작게** 잡는다(`m2 < m1`). 그러면
 * `v0 < v1 < v3 < v2` 이고 `v4 > v1` 이라 다섯 값이 모두 다르고 음수도 안 나온다 —
 * 다시 뽑는 고리 없이 구성만으로 선다. 2-5-2 몫의 소재 셋은 모두 `rising` 이 아니라 내려가도 된다.
 */
function dipLineValues(rng: Rng, theme: LineTheme): number[] {
  const m1 = intBetween(rng, 2, 6);
  const m2 = intBetween(rng, 1, m1 - 1);
  const rest = [1, 2, 3, 4, 5, 6].filter((v) => v !== m1 && v !== m2);
  const m0 = rest.splice(intBetween(rng, 0, rest.length - 1), 1)[0]!;
  const m3 = pick(rng, rest);
  const first = intBetween(rng, theme.base[0], theme.base[1]) * theme.step;
  const v1 = first + m0 * theme.step;
  const v2 = v1 + m1 * theme.step;
  const v3 = v2 - m2 * theme.step;
  return [first, v1, v2, v3, v3 + m3 * theme.step];
}

/** 갈래가 쓰는 꺾은선 그림. 표준과 같은 규약(`yMax` 는 하한, 걸음은 `theme.yStep`). */
function lineFigure(
  theme: LineTheme,
  nums: readonly number[],
): Record<string, unknown> {
  return fig("lineChart", {
    values: theme.labels.map((label, i) => ({
      label: label.text,
      value: nums[i]!,
    })),
    yMax: Math.max(...nums) + 3,
    yStep: theme.yStep,
    yLabel: theme.unit,
  });
}

/** 갈래 발문의 첫 문장 — 그림이 꺾은선일 때. */
function lineIntro(theme: LineTheme): string {
  return `${josa(theme.topic, "을", "를")} 조사하여 나타낸 꺾은선그래프입니다.`;
}

/**
 * **2-5-1 1단 연산 — 값 읽기.** 표준은 「가장 큰 때는 **언제**」(답이 때), 여기는 **값**이다.
 *
 * ⚠️ 두 때를 **발문에 적어** 견주게 한다. 처음에는 「가장 작은 때의 값은?」이라고만 물었는데
 * 발문에 수가 하나도 없어 **씨앗을 바꿔도 소재 셋뿐**이었다(변형 3가지). 자료형은 값이
 * 그림에 있어 발문이 비기 쉽다 — 읽을 자리를 발문이 지목해야 갈린다.
 */
function tier251Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = lineValues(rng, theme);
  const a = intBetween(rng, 0, nums.length - 2);
  const b = intBetween(rng, a + 1, nums.length - 1);
  const lower = nums[a]! < nums[b]! ? a : b;
  return make(
    unit,
    `${lineIntro(theme)} ${josa(theme.labels[a]!.math, "과", "와")} ` +
      `${theme.labels[b]!.math} 중 ${josa(theme.topic, "이", "가")} 더 작은 때의 값은 ` +
      `몇 ${theme.unit}인가?`,
    `${n(nums[lower]!)}${theme.unit}`,
    `${theme.labels[a]!.math}의 값은 ${n(nums[a]!)}${theme.unit}, ` +
      `${theme.labels[b]!.math}의 값은 ${n(nums[b]!)}${theme.unit}입니다. ` +
      `더 작은 쪽은 ${theme.labels[lower]!.math}이고 그 값은 ${n(nums[lower]!)}${theme.unit}입니다.`,
    lineFigure(theme, nums),
  );
}

/** **2-5-2 1단 연산 — 값 읽기(역방향).** 표준은 때 → 값, 여기는 **값 → 때**다. */
function tier252Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = lineValues(rng, theme);
  const at = intBetween(rng, 0, nums.length - 1);
  return make(
    unit,
    `${lineIntro(theme)} ${theme.topic}의 값이 ${n(nums[at]!)}${theme.unit}인 때는 언제인가?`,
    theme.labels[at]!.math,
    `세로축에서 ${n(nums[at]!)}${theme.unit}인 곳을 찾아 점이 그 높이에 찍힌 때를 보면 ` +
      `${theme.labels[at]!.math}입니다.`,
    lineFigure(theme, nums),
  );
}

/** **2-5-1 2단 기본 — 기준과 견주어 센다.** 한 때를 기준으로 잡고 전량을 훑는다. */
function tier251Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = lineValues(rng, theme);
  // 기준은 **최대도 최소도 아닌** 때로 잡는다 — 그래야 답이 $0$ 도 전부도 아니다.
  const sorted = [...nums].sort((a, b) => a - b);
  const at = nums.indexOf(pick(rng, sorted.slice(1, -1)));
  const more = nums.filter((v) => v > nums[at]!).length;
  return make(
    unit,
    `${lineIntro(theme)} ${theme.topic}의 값이 ${theme.labels[at]!.math}의 값보다 ` +
      `큰 때는 모두 몇 번인가?`,
    `${n(more)}번`,
    `${theme.labels[at]!.math}의 값은 ${n(nums[at]!)}${theme.unit}입니다. ` +
      `점이 그보다 높이 찍힌 때를 세면 ${n(more)}번입니다.`,
    lineFigure(theme, nums),
  );
}

/** **2-5-1 3단 응용 — 한가운데 값 어림.** 두 점을 이은 선분이라 한가운데를 읽을 수 있다. */
function tier251Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = lineValues(rng, theme);
  // 이웃 합이 짝수인 짝은 **반드시 있다**(위 `evenSumPairs` 주석의 홀짝 셈).
  const at = pick(rng, evenSumPairs(nums));
  const lo = nums[at]!;
  const hi = nums[at + 1]!;
  const mid = (lo + hi) / 2;
  return make(
    unit,
    `${lineIntro(theme)} ${josa(theme.labels[at]!.math, "과", "와")} ` +
      `${theme.labels[at + 1]!.math}의 한가운데 때의 값은 약 몇 ${theme.unit}인가?`,
    `${n(mid)}${theme.unit}`,
    // 「약」이 붙는 유일한 갈래다 — **왜 그렇게 읽어도 되는지**를 말한다(리드 2026-08-23).
    `꺾은선그래프는 이웃한 두 점을 선분으로 이어 그리므로, 그 사이의 값은 선분 위에서 ` +
      `읽습니다. 한가운데 때의 값은 두 값의 한가운데이므로 ` +
      `${expr(`(${lo}+${hi})\\div2=${mid}`)} 이므로 약 ${n(mid)}${theme.unit}입니다.`,
    lineFigure(theme, nums),
  );
}

/** **2-5-1 4단 심화 — 늘어난 만큼만 모은다.** 표준은 늘어난 «구간 수»를 센다. */
function tier251Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = lineValues(rng, theme);
  // 세기 시작하는 때를 발문에 적는다 — 안 적으면 발문에 수가 없어 변형이 소재 수로 묶인다.
  const from = intBetween(rng, 0, nums.length - 3);
  const rises = nums
    .slice(from + 1)
    .map((v, i) => v - nums[from + i]!)
    .filter((d) => d > 0);
  const total = rises.reduce((s, d) => s + d, 0);
  return make(
    unit,
    `${lineIntro(theme)} ${theme.labels[from]!.math}부터 마지막 때까지에서 ` +
      `${josa(theme.topic, "이", "가")} 늘어난 구간만 골라 늘어난 양을 모두 더하면 ` +
      `몇 ${theme.unit}인가?`,
    `${n(total)}${theme.unit}`,
    `${theme.labels[from]!.math} 뒤로 선이 오른쪽 위로 올라간 구간만 봅니다. 늘어난 양은 ` +
      `${rises.map((d) => n(d)).join(", ")}${theme.unit}이고, 모두 더하면 ` +
      `${expr(`${rises.join("+")}=${total}`)} 입니다.`,
    lineFigure(theme, nums),
  );
}

/**
 * **2-5-2 2단 기본 — 문턱을 넘은 때 세기.**
 *
 * ⚠️ 처음에는 「⟨때⟩의 값은 ⟨때⟩의 값보다 몇 … 더 큰가?」였는데 **표준과 골격이 글자까지
 * 같았다** — 표준은 처음·마지막을 견주고 갈래는 가운데를 견줄 뿐, 수를 가리면 한 문장이다.
 * 자리(index)만 옮긴 것은 같은 문항이라 **묻는 일 자체를** 바꿨다.
 */
function tier252Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = lineValues(rng, theme);
  // 문턱은 **실제로 나온 값들 사이**에서 고른다 — 그래야 답이 $0$ 도 전부도 아니다.
  const sorted = [...nums].sort((a, b) => a - b);
  const bar = sorted[intBetween(rng, 0, sorted.length - 2)]!;
  const over = nums.filter((v) => v > bar).length;
  return make(
    unit,
    `${lineIntro(theme)} ${josa(theme.topic, "이", "가")} ${n(bar)}${theme.unit}보다 ` +
      `높은 때는 모두 몇 번인가?`,
    `${n(over)}번`,
    `세로축에서 ${n(bar)}${theme.unit}인 곳을 찾아 그보다 위에 찍힌 점을 세면 ` +
      `${n(over)}번입니다.`,
    lineFigure(theme, nums),
  );
}

/** **2-5-2 3단 응용 — 문턱을 넘는 구간 세기.** 구간마다 변화를 재고 문턱과 견준다. */
function tier252Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = lineValues(rng, theme);
  const gaps = nums.slice(1).map((v, i) => Math.abs(v - nums[i]!));
  // 문턱은 **실제로 나온 변화들 사이**에서 고른다 — 그래야 답이 $0$ 도 전부도 아니다.
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const bar = sortedGaps[intBetween(rng, 0, sortedGaps.length - 2)]!;
  const over = gaps.filter((g) => g > bar).length;
  return make(
    unit,
    `${lineIntro(theme)} 이웃한 두 때 사이에서 ${theme.topic}의 값이 ` +
      `${n(bar)}${theme.unit}보다 많이 변한 구간은 모두 몇 번인가?`,
    `${n(over)}번`,
    `이웃한 두 점의 값의 차를 차례로 구하면 ${gaps.map((g) => n(g)).join(", ")}${theme.unit}입니다. ` +
      `이 중 ${n(bar)}${theme.unit}보다 큰 것은 ${n(over)}개이므로 ${n(over)}번입니다.`,
    lineFigure(theme, nums),
  );
}

/** **2-5-2 4단 심화 — 문턱을 처음 넘은 때부터 끝까지.** 때를 찾고 다시 변화를 잰다. */
function tier252Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  // 오른 뒤 반드시 한 번 내려간다 — 「처음으로」가 뜻을 가지려면 뒤에 오르내림이 있어야 한다.
  const nums = dipLineValues(rng, theme);
  const bar = nums[1]!;
  const last = nums[nums.length - 1]!;
  return make(
    unit,
    `${lineIntro(theme)} ${theme.topic}의 값이 처음으로 ${n(bar)}${theme.unit} 이상이 된 ` +
      `때부터 마지막 때까지 값은 몇 ${theme.unit} 늘었는가?`,
    `${n(last - bar)}${theme.unit}`,
    `값이 ${n(bar)}${theme.unit} 이상이 된 것은 ` +
      `${josa(theme.labels[1]!.math, "이", "가")} 처음입니다` +
      `(${theme.labels[0]!.math}의 값은 ${n(nums[0]!)}${theme.unit}로 그보다 작습니다). ` +
      `그때부터 마지막 ${theme.labels[nums.length - 1]!.math}까지 보면 ` +
      `${expr(`${last}-${bar}=${last - bar}`)} 이므로 ${n(last - bar)}${theme.unit} 늘었습니다.`,
    lineFigure(theme, nums),
  );
}

/* ── 2-5-3 그리기와 활용 ──
 *
 * 그림이 **표**다(그리기 갈래의 정체성 — 1-5-2 선례). 그래서 발문은 **표만** 가리킨다:
 * 「그래프에서」·「그림과 같이」를 **한 번도** 쓰지 않는다(리드 조건 ⑴, 시험이 전수로 잠근다).
 *
 * ⚠️ **D-70 과 부딪히지 않는다**(리드 판정 2026-08-23, 07 §D-70 원문 대조).
 * D-70 이 막은 것은 「**그려진 점**이 몇째 눈금인가」다 — 꺾은선 값은 `theme.step` 의 배수인데
 * 눈금은 `yStep` 이라 점이 눈금선 위에 안 앉기 때문이다. 여기는 지면에 **꺾은선이 아예 없고**
 * (그림이 표), 답을 표의 수로 **세어서** 낸다. 읽을 점이 없으니 어긋날 것도 없다.
 * D-70 자체가 원장님의 「눈금 몇 칸 유형도 넣어」에서 나온 결정이라 방향도 «넓히자» 쪽이다.
 * **이 주석을 지우지 말 것** — 다음 사람이 「D-70 위반 아닌가」로 열 자리다.
 */

/**
 * 2-5-3 값 — 모두 `theme.step` 의 **배수**이고 오름차순이며 이웃 차가 **서로 다르다.**
 *
 * 세 성질이 각각 무엇을 보장하는지:
 *  · 배수  → 「한 칸이 `step` 일 때 몇 칸」·「물결선 위 몇째」가 **늘 자연수**다(구성 보장).
 *  · 오름차순 → 최댓값이 마지막이라 칸 셈이 그것만 보면 된다.
 *  · 차가 다름 → 「가장 가파른/완만한 구간」이 각각 **하나로 선다.**
 *
 * ⚠️ 걸음 수를 `yStep` 이 아니라 **`step`** 으로 잡는다. 처음에 `yStep`(10·200)으로 짰더니
 * 「강낭콩의 키 $150$cm」가 나왔다 — 소재가 감당 못 하는 크기다. `step` 은 소재가 정한
 * 값의 단위라 `theme.base` 와 같은 자리에 머문다(강낭콩 26~36cm · 박물관 650~900명).
 */
function tableValues(rng: Rng, theme: LineTheme): number[] {
  const rest = [1, 2, 3, 4];
  const mags: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    mags.push(rest.splice(intBetween(rng, 0, rest.length - 1), 1)[0]!);
  }
  /*
   * 첫 값은 **소재가 정한 띠**(`theme.base`)에서 뽑는다 — 표준 `lineValues` 와 같은 자리다.
   * 그래야 「강낭콩의 키 $150$cm」 같은 값이 안 나온다. `base[0] ≥ 3` 이라 첫 값이 걸음
   * 3칸 이상이고, 물결선 시작값을 그 아래에 놓을 자리가 반드시 남는다.
   * 걸음 넷의 합은 늘 $1+2+3+4=10$ 이므로 가장 큰 값은 첫 값보다 걸음 10칸 위다.
   */
  const out = [intBetween(rng, theme.base[0], theme.base[1]) * theme.step];
  for (const m of mags) out.push(out[out.length - 1]! + m * theme.step);
  return out;
}

/** 2-5-3 갈래의 그림 — 표. 발문도 표만 가리킨다. */
function tableFigure(
  theme: LineTheme,
  nums: readonly number[],
): Record<string, unknown> {
  return fig("table", {
    headers: ["구분", ...theme.labels.map((l) => l.text)],
    rows: [[`${theme.topic}(${theme.unit})`, ...nums.map((v) => String(v))]],
  });
}

/** 2-5-3 갈래 발문의 첫 문장 — **표**를 가리킨다(그래프가 아니다). */
function tableIntro(theme: LineTheme): string {
  return `${josa(theme.topic, "을", "를")} 조사하여 나타낸 표입니다.`;
}

/** **2-5-3 1단 연산 — 값 읽기.** 표에서 한 때의 값을 읽는다. */
function tier253Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = tableValues(rng, theme);
  const at = intBetween(rng, 0, nums.length - 1);
  return make(
    unit,
    `${tableIntro(theme)} ${theme.labels[at]!.math}의 ${josa(theme.topic, "은", "는")} ` +
      `몇 ${theme.unit}인가?`,
    `${n(nums[at]!)}${theme.unit}`,
    `표에서 ${theme.labels[at]!.math} 칸의 수를 읽으면 ${n(nums[at]!)}${theme.unit}입니다.`,
    tableFigure(theme, nums),
  );
}

/**
 * **2-5-3 2단 기본 — 눈금이 몇 칸 필요한가.** 값이 모두 걸음의 배수라 답이 **늘 자연수**다.
 *
 * 어느 때의 값을 나타낼지 발문이 지목한다 — 「가장 큰 값」이라고만 하면 발문에 수가 없어
 * 변형이 소재 수(셋)로 묶인다.
 */
function tier253Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = tableValues(rng, theme);
  const at = intBetween(rng, 0, nums.length - 1);
  const ticks = nums[at]! / theme.step;
  return make(
    unit,
    `${tableIntro(theme)} 이 표를 꺾은선그래프로 나타내려고 합니다. 세로 눈금 한 칸이 ` +
      `${n(theme.step)}${theme.unit}일 때 ${theme.labels[at]!.math}의 값을 나타내려면 ` +
      `눈금이 아래에서부터 몇 칸 올라가야 하는가?`,
    `${n(ticks)}칸`,
    `${theme.labels[at]!.math}의 값은 ${n(nums[at]!)}${theme.unit}입니다. ` +
      `한 칸이 ${n(theme.step)}${theme.unit}이므로 ` +
      `${expr(`${nums[at]!}\\div${theme.step}=${ticks}`)} 이고 ${n(ticks)}칸입니다.`,
    tableFigure(theme, nums),
  );
}

/** **2-5-3 3단 응용 — 물결선.** 아래를 접고 시작한 축에서 몇째 눈금인지 센다(두 단계). */
function tier253Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = tableValues(rng, theme);
  const min = Math.min(...nums);
  /*
   * 물결선 위 시작값. **$0$ 이면 안 된다** — 아래를 접으려고 넣는 것이 물결선인데
   * $0$ 부터 시작하면 접은 것이 없다(첫 판에서 「$0$cm부터 시작」이 나왔다).
   * 가장 작은 값 **아래**이면서 $0$ **위**인 걸음의 배수로 잡는다. 값도 시작값도 걸음의
   * 배수라 `(값 − start) ÷ 걸음` 은 **늘 자연수**다(`tableValues` 가 칸을 13 이상으로
   * 두어 이 자리가 반드시 남는다).
   */
  const start = intBetween(rng, 1, min / theme.step - 1) * theme.step;
  // 어느 값을 찍는지도 갈린다 — 「가장 큰 값」만 물으면 발문의 수가 시작값 하나뿐이라 변형이 얇다.
  const at = intBetween(rng, 0, nums.length - 1);
  const target = intBetween(rng, 0, 1) === 0 ? Math.max(...nums) : nums[at]!;
  const named = target !== Math.max(...nums) || intBetween(rng, 0, 1) === 0;
  const which = named
    ? `${theme.labels[nums.indexOf(target)]!.math}의 값`
    : "가장 큰 값";
  const nth = (target - start) / theme.step;
  return make(
    unit,
    `${tableIntro(theme)} 이 표를 꺾은선그래프로 나타낼 때 물결선을 넣어 세로 눈금을 ` +
      `${n(start)}${theme.unit}부터 시작하려고 합니다. 세로 눈금 한 칸은 ` +
      `${n(theme.step)}${theme.unit}입니다. ${which}은 물결선 위로 몇째 눈금에 찍히는가?`,
    `${n(nth)}째`,
    `${which}은 ${n(target)}${theme.unit}이고 눈금은 ${n(start)}${theme.unit}부터 시작합니다. ` +
      `${expr(`${target}-${start}=${target - start}`)} 이고 한 칸이 ${n(theme.step)}${theme.unit}이므로 ` +
      `${expr(`${target - start}\\div${theme.step}=${nth}`)} 이고 ${n(nth)}째 눈금입니다.`,
    tableFigure(theme, nums),
  );
}

/**
 * **2-5-3 4단 심화 — 가장 가파른 구간과 견주기.** 전 구간을 재고 지목된 구간과 견준다.
 *
 * 견줄 구간을 발문이 지목한다 — 「가장 가파른 것과 가장 완만한 것의 차」라고만 하면
 * 발문에 수가 없어 변형이 소재 수(셋)로 묶인다.
 */
function tier253Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = tableValues(rng, theme);
  const gaps = nums.slice(1).map((v, i) => v - nums[i]!);
  const most = Math.max(...gaps);
  const top = gaps.indexOf(most);
  // 가장 가파른 구간 **말고** 하나를 골라 견준다 — 답이 $0$ 이 되지 않는다.
  const other = pick(
    rng,
    gaps.map((_, i) => i).filter((i) => i !== top),
  );
  return make(
    unit,
    `${tableIntro(theme)} 이 표를 꺾은선그래프로 나타낼 때, 선이 가장 가파른 구간의 ` +
      `변화량은 ${josa(theme.labels[other]!.math, "과", "와")} ` +
      `${theme.labels[other + 1]!.math} 사이의 변화량보다 몇 ${theme.unit} 더 큰가?`,
    `${n(most - gaps[other]!)}${theme.unit}`,
    `이웃한 두 때의 값의 차를 차례로 구하면 ${gaps.map((g) => n(g)).join(", ")}${theme.unit}입니다. ` +
      `가장 가파른 구간은 ${josa(theme.labels[top]!.math, "과", "와")} ` +
      `${theme.labels[top + 1]!.math} 사이로 ${n(most)}${theme.unit}이고, ` +
      `${josa(theme.labels[other]!.math, "과", "와")} ${theme.labels[other + 1]!.math} 사이는 ` +
      `${n(gaps[other]!)}${theme.unit}입니다. ` +
      `${expr(`${most}-${gaps[other]!}=${most - gaps[other]!}`)}`,
    tableFigure(theme, nums),
  );
}

/* ───────────────────────── 2-6 다각형 ─────────────────────────
 *
 * 도형 이름은 **한자 수사**로만 쓴다(R4) — `polyName` 을 거치면 `8각형`·`정n각형` 이 나올 수 없다.
 * 초4 는 내각의 합을 배우지 않는다. 다루는 것은 변·꼭짓점·대각선의 **개수**와 길이의 합이다.
 */

function polygon(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = code(unit);

  if (c === "2-6-1") {
    const sides = intBetween(rng, 5, 8);
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        `선분 ${n(sides)}개로 둘러싸인 도형의 이름을 쓰시오.`,
        polyName(sides),
        `선분으로만 둘러싸인 도형을 다각형이라고 하고, 변이 ${n(sides)}개이면 ${polyName(sides)}입니다.`,
      );
    }
    if (kind === 1) {
      return make(
        unit,
        `${polyName(sides)}의 꼭짓점은 모두 몇 개인가?`,
        `${n(sides)}개`,
        `${polyName(sides)}은 변이 ${n(sides)}개이고 꼭짓점도 ${n(sides)}개입니다.`,
      );
    }
    return make(
      unit,
      "곡선이 있는 도형도 다각형이라고 할 수 있는가? 맞으면 '예', 아니면 '아니요'를 쓰시오.",
      "아니요",
      "다각형은 선분으로만 둘러싸인 도형입니다. 곡선이 있으면 다각형이 아닙니다.",
    );
  }

  if (c === "2-6-2") {
    const sides = intBetween(rng, 5, 8);
    const side = intBetween(rng, 3, 9);
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        `한 변이 ${cm(side)}인 ${polyName(sides, true)}의 모든 변의 길이의 합은 몇 cm인가?`,
        cm(side * sides),
        `${polyName(sides, true)}은 변이 ${n(sides)}개이고 길이가 모두 같습니다. ` +
          `${expr(`${side}\\times${sides}=${side * sides}`)}`,
      );
    }
    if (kind === 1) {
      return make(
        unit,
        `모든 변의 길이의 합이 ${cm(side * sides)}인 ${polyName(sides, true)}의 한 변은 몇 cm인가?`,
        cm(side),
        `${polyName(sides, true)}은 변이 ${n(sides)}개이고 길이가 모두 같으므로 ` +
          `${expr(`${side * sides}\\div${sides}=${side}`)} 입니다.`,
      );
    }
    return make(
      unit,
      "변의 길이가 모두 같고 각의 크기도 모두 같은 다각형을 무엇이라고 하는가?",
      "정다각형",
      "변의 길이가 모두 같고 각의 크기도 모두 같은 다각형을 정다각형이라고 합니다.",
    );
  }

  if (c === "2-6-3") {
    const sides = intBetween(rng, 4, 8);
    const diag = (sides * (sides - 3)) / 2;
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        `${polyName(sides)}에 그을 수 있는 대각선은 모두 몇 개인가?`,
        `${n(diag)}개`,
        `한 꼭짓점에서 자기 자신과 이웃한 두 꼭짓점을 뺀 ${n(sides - 3)}개에 대각선을 그을 수 있습니다. ` +
          `꼭짓점이 ${n(sides)}개인데 대각선을 두 번씩 세었으므로 ` +
          `${expr(`${sides}\\times${sides - 3}\\div2=${diag}`)} 입니다.`,
      );
    }
    if (kind === 1) {
      return make(
        unit,
        `${polyName(sides)}의 한 꼭짓점에서 그을 수 있는 대각선은 몇 개인가?`,
        `${n(sides - 3)}개`,
        `자기 자신과 이웃한 두 꼭짓점에는 대각선을 그을 수 없으므로 ` +
          `${expr(`${sides}-3=${sides - 3}`)} 개입니다.`,
      );
    }
    return make(
      unit,
      "직사각형의 두 대각선의 길이는 서로 어떠한가?",
      "같다",
      "직사각형은 두 대각선의 길이가 서로 같고, 한 대각선이 다른 대각선을 반으로 나눕니다.",
    );
  }

  if (c === "2-6-4") {
    const side = intBetween(rng, 2, 6);
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        `한 변이 ${cm(side)}인 정삼각형 모양 조각으로 한 변이 ${cm(side * 2)}인 정삼각형을 ` +
          `빈틈없이 채우려면 조각이 몇 개 필요한가?`,
        n(4),
        `한 변이 ${n(2)}배가 되면 조각은 ${expr("2\\times2=4")} 개가 필요합니다.`,
      );
    }
    if (kind === 1) {
      return make(
        unit,
        `한 변이 ${cm(side)}인 정사각형 모양 조각으로 한 변이 ${cm(side * 3)}인 정사각형을 ` +
          `빈틈없이 채우려면 조각이 몇 개 필요한가?`,
        n(9),
        `한 변이 ${n(3)}배가 되면 조각은 ${expr("3\\times3=9")} 개가 필요합니다.`,
      );
    }
    return make(
      unit,
      `${polyName(6, true)} 모양은 정삼각형 모양 조각 몇 개로 빈틈없이 채울 수 있는가?`,
      `${n(6)}개`,
      `${polyName(6, true)}의 한가운데에서 각 꼭짓점으로 선분을 그으면 정삼각형이 ${n(6)}개 생깁니다.`,
    );
  }

  return noBranch(unit);
}

export const G4: Record<string, ChapterHandler> = {
  "초4|1-1 큰 수": bigNum,
  "초4|1-2 각도": angle,
  "초4|1-3 곱셈과 나눗셈": mulDiv,
  "초4|1-4 평면도형의 이동": move,
  "초4|1-5 막대그래프": barGraph,
  "초4|1-6 규칙 찾기": pattern,
  "초4|2-1 분수의 덧셈과 뺄셈": fracAdd42,
  "초4|2-2 삼각형": triangle,
  "초4|2-3 소수의 덧셈과 뺄셈": decAdd,
  "초4|2-4 사각형": quad,
  "초4|2-5 꺾은선그래프": lineGraph,
  "초4|2-6 다각형": polygon,
};

// 셋째 파일럿(D-72)의 직접 호출 창구 — 등록은 끝났다. 넷 다 위 `G4_TIERS` 에 있고
// generate.ts 가 병합하며, 4단의 「지워진 막대」(`unknown: true`)도 렌더러가 그린다
// (elem-figures 확장 6a19b9b8). 이 셋은 단위 시험(elemTiersG4.test.ts)이 갈래를
// 이름으로 직접 부르는 데만 쓴다 — 심화는 시험이 `G4_TIERS` 에서 꺼낸다.
export const G4_TIER_CALC = tier53Calc;
export const G4_TIER_BASIC = tier53Basic;
export const G4_TIER_APPLY = tier53Apply;
