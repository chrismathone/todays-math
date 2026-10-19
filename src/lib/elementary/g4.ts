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
import { forwardReachable, pageNumbers, readRat } from "./forwardReach";
import { fig, make, makeDeep } from "./make";
import { fmtFrac, gcd } from "./math";
import { intBetween, pick } from "./rng";
// 🔴 「로/으로」는 **판정기가 쓰는 그 표**(`JOSA_FINAL`)에서 온다 — 두 벌로 적지 않는다.
import { numRo } from "./rules";
import type { ChapterHandler, ElemForm, ElemProblem, Rng } from "./types";

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

/**
 * **단위 뒤 조사는 «글자»가 아니라 «소리»가 정한다.** `cm` 은 «센티미터»라 받침이 없고
 * (`를`·`로`), `kg` 은 «킬로그램»이라 받침이 있다(`을`·`으로`). `℃` 는 «도»다.
 *
 * ⚠️ **이 표를 안 쓰고 조사를 박아서 실물 결함이 나갔다** (2026-08-23, g3 이 알려 줌):
 * 「세로 눈금 한 칸은 몇 **mm을** 나타내는가?」·「$23$**명로** 그보다」. 소재마다 단위가
 * 달라지는 자리에서 한 조사를 박으면 **소재 하나만 맞고 나머지는 다 틀린다.**
 *
 * ⚠️ **모르는 단위는 던진다.** 조용히 한쪽을 고르면 새 단위가 들어올 때마다 같은 결함이
 * 다시 난다 — 손 목록은 새므로 **새는 것을 시끄럽게** 만든다.
 */
const UNIT_HAS_FINAL: Record<string, boolean> = {
  "℃": false, // 도
  cm: false, // 센티미터
  mm: false, // 밀리미터
  m: false, // 미터
  kg: true, // 킬로그램
  g: true, // 그램
  권: true,
  명: true,
  원: true,
  개: false,
  회: false,
};

/** 단위 뒤 조사 — 받침이 있으면 `withEnd`(을·으로·이·은), 없으면 `withoutEnd`. */
function unitJosa(unit: string, withEnd: string, withoutEnd: string): string {
  const has = UNIT_HAS_FINAL[unit];
  if (has === undefined) {
    throw new Error(
      `단위 뒤 조사를 정할 수 없습니다: «${unit}» — 읽는 소리를 UNIT_HAS_FINAL 에 적어라`,
    );
  }
  return `${unit}${has ? withEnd : withoutEnd}`;
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
  // ⚠️ 예전 두 갈래가 다 뺄셈 **한 번**이었다($10000-k$). 같은 소단원 응용이
  //    「$1000$원 $a$장과 $100$원 $b$개를 모으면 얼마」로 **두 걸음**이라 사다리가 뒤집혔다.
  //    그래서 그 응용을 **거꾸로** 돌린다 — 한쪽 묶음을 만들고 남은 몫을 되짚는다.
  if (intBetween(rng, 0, 1) === 0) {
    const a = intBetween(rng, 2, 8);
    const coins = (10000 - a * 1000) / 100;
    return makeDeep(
      unit,
      `${n(1000)}원짜리 지폐 ${n(a)}장과 ${n(100)}원짜리 동전을 모았더니 ${n(10000)}원이 되었습니다. ` +
        `${n(100)}원짜리 동전은 몇 개인가?`,
      n(coins),
      [
        `${n(1000)}원짜리 지폐 ${n(a)}장은 ${expr(`1000\\times${a}=${a * 1000}`)} 원입니다.`,
        `남은 돈은 ${expr(`10000-${a * 1000}=${10000 - a * 1000}`)} 원이고, ` +
          `${expr(`${10000 - a * 1000}\\div100=${coins}`)} 이므로 ${n(coins)}개입니다.`,
      ],
    );
  }
  const b = intBetween(rng, 1, 9);
  const k = intBetween(rng, 1, 9) * pick(rng, [1, 10, 100]);
  const base = b * 1000 + k;
  return makeDeep(
    unit,
    `${n(1000)}이 ${n(b)}개인 수보다 ${n(k)} 큰 수가 있습니다. ` +
      `이 수에 얼마를 더하면 ${n(10000)}이 되는가?`,
    n(10000 - base),
    [
      `${n(1000)}이 ${n(b)}개인 수는 ${n(b * 1000)}이므로 그 수는 ` +
        `${expr(`${b * 1000}+${k}=${base}`)} 입니다.`,
      `${expr(`10000-${base}=${10000 - base}`)} 이므로 ${josaNum(10000 - base, "을", "를")} 더하면 됩니다.`,
    ],
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
  // ⚠️ 예전 두 갈래는 **환산 한 번**이었다(「$10000$이 $80$개인 수는 $100$이 몇 개」).
  //    자릿값을 **둘** 겹쳐야 응용(「$10000$원 $100$장 다발 $2$개는 얼마」)보다 위로 간다.
  const a = intBetween(rng, 2, 9) * pick(rng, [10, 100]);
  const b = intBetween(rng, 1, 9);
  if (intBetween(rng, 0, 1) === 0) {
    const ans = a * 100 + b * 10;
    return makeDeep(
      unit,
      `${n(10000)}이 ${n(a)}개, ${n(1000)}이 ${n(b)}개인 수는 ${n(100)}이 모두 몇 개인 수인가?`,
      n(ans),
      [
        `${n(10000)}은 ${n(100)}이 ${n(100)}개이므로 ${n(10000)}이 ${n(a)}개이면 ` +
          `${expr(`100\\times${a}=${a * 100}`)} 개입니다.`,
        `${n(1000)}은 ${n(100)}이 ${n(10)}개이므로 ${expr(`10\\times${b}=${b * 10}`)} 개이고, ` +
          `모두 ${expr(`${a * 100}+${b * 10}=${ans}`)} 개입니다.`,
      ],
    );
  }
  const hundreds = a * 100 + b * 10;
  return makeDeep(
    unit,
    `${n(100)}이 ${n(hundreds)}개인 수는 ${n(10000)}이 ${n(a)}개, ${n(1000)}이 몇 개인 수인가?`,
    n(b),
    [
      `${n(100)}이 ${n(hundreds)}개인 수는 ${expr(`100\\times${hundreds}=${hundreds * 100}`)} 입니다.`,
      `${n(10000)}이 ${n(a)}개이면 ${n(a * 10000)}이므로 남는 것은 ` +
        `${expr(`${hundreds * 100}-${a * 10000}=${b * 1000}`)} 이고, ` +
        `${expr(`${b * 1000}\\div1000=${b}`)} 이므로 ${n(b)}개입니다.`,
    ],
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
  // ⚠️ 예전에는 「만이 $30000$개인 수는 몇 억」이었다 — 나눗셈 **한 번**이다.
  //    두 몫을 **더한 뒤** 자리를 옮겨야 응용(「$1000$만 원짜리 수표 $29$장」)보다 위로 간다.
  const p = intBetween(rng, 1, 8) * 10;
  const q = intBetween(rng, 1, 9 - p / 10) * 10;
  return makeDeep(
    unit,
    `${n(1000)}만이 ${n(p)}개인 수보다 ${n(1000)}만이 ${n(q)}개 더 큰 수는 몇 억인가?`,
    `${n((p + q) / 10)}억`,
    [
      `${n(1000)}만이 ${expr(`${p}+${q}=${p + q}`)} 개인 수입니다.`,
      `${n(1000)}만이 ${n(10)}개이면 ${n(1)}억이므로 ` +
        `${expr(`${p + q}\\div10=${(p + q) / 10}`)} 이라 ${n((p + q) / 10)}억입니다.`,
    ],
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
  // ⚠️ 1-1-4 와 같은 자리였다 — 「억이 $80000$개인 수는 몇 조」는 나눗셈 한 번이다.
  //    1-1-4 와 **나란한 구조**로 두되 자리만 조(兆)로 올린다.
  const p = intBetween(rng, 1, 8) * 10;
  const q = intBetween(rng, 1, 9 - p / 10) * 10;
  return makeDeep(
    unit,
    `${n(1000)}억이 ${n(p)}개인 수보다 ${n(1000)}억이 ${n(q)}개 더 큰 수는 몇 조인가?`,
    `${n((p + q) / 10)}조`,
    [
      `${n(1000)}억이 ${expr(`${p}+${q}=${p + q}`)} 개인 수입니다.`,
      `${n(1000)}억이 ${n(10)}개이면 ${n(1)}조이므로 ` +
        `${expr(`${p + q}\\div10=${(p + q) / 10}`)} 이라 ${n((p + q) / 10)}조입니다.`,
    ],
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
  // ⚠️ 예전 두 갈래가 다 한 걸음이었다 — 「직각을 몇 개로 나누면 $15^\circ$」는 $90\div15$,
  //    「눈금 $40$에서 $70^\circ$」는 $40+70$. 응용(직선의 각을 나눠 몇 개를 잇는다)이
  //    두 걸음이라 사다리가 뒤집혔다. 그래서 둘 다 **한 걸음을 더 얹는다**.
  if (intBetween(rng, 0, 1) === 0) {
    const k = pick(rng, [2, 3, 5, 6, 9, 10]);
    const d = 90 / k;
    const take = intBetween(rng, 2, Math.max(2, k - 1));
    return makeDeep(
      unit,
      `직각을 똑같이 몇 개로 나누었더니 나누어진 한 각의 크기가 ${deg(d)}가 되었습니다. ` +
        `나누어진 각 ${n(take)}개를 겹치지 않게 이어 붙이면 몇 도인가?`,
      deg(d * take),
      [
        `직각은 ${deg(90)}이므로 ${expr(`90\\div${d}=${k}`)} 에서 ${n(k)}개로 나눈 것입니다.`,
        `한 각이 ${deg(d)}이므로 ${expr(`${d}\\times${take}=${d * take}`)} 입니다.`,
      ],
    );
  }
  const a = pick(rng, [10, 20, 30, 40, 50]);
  // 직각 눈금($90$)을 **넘어야** 「얼마나 큰가」가 성립한다 — 안 거르면 답이 음수가 된다.
  const d = pick(
    rng,
    [25, 35, 40, 55, 65, 70, 85, 95, 110, 125].filter(
      (v) => a + v > 90 && a + v <= 180,
    ),
  );
  return makeDeep(
    unit,
    `각도기로 각을 잴 때 각의 한 변이 눈금 ${josaNum(a, "을", "를")} 가리키고 있습니다. ` +
      `각의 크기가 ${deg(d)}라면 같은 쪽 눈금에서 다른 변이 가리키는 눈금은 직각을 나타내는 ` +
      `눈금보다 얼마나 큰가?`,
    n(a + d - 90),
    [
      `다른 변이 가리키는 눈금은 ${expr(`${a}+${d}=${a + d}`)} 입니다.`,
      `직각은 눈금 ${n(90)}이므로 ${expr(`${a + d}-90=${a + d - 90}`)} 만큼 큽니다.`,
    ],
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
  // ⚠️ 예전에는 「세 각이 모두 같은 삼각형의 한 각」이었다 — $180\div3$ **한 걸음**이고
  //    씨앗을 바꿔도 답이 늘 $60^\circ$ 라 사실상 한 문항이었다.
  const a2 = intBetween(rng, 20, 70);
  // 남는 각이 $0$ 이하가 되면 안 된다 — $2a+gap<180$.
  const gap = intBetween(rng, 5, Math.min(40, 179 - 2 * a2));
  const rest2 = 180 - a2 - (a2 + gap);
  return makeDeep(
    unit,
    `삼각형의 한 각의 크기는 ${deg(a2)}이고, 다른 한 각은 그보다 ${deg(gap)} 더 큽니다. ` +
      `나머지 한 각의 크기는 몇 도인가?`,
    deg(rest2),
    [
      `다른 한 각은 ${expr(`${a2}+${gap}=${a2 + gap}`)} 입니다.`,
      `${expr(`180-${a2}-${a2 + gap}=${rest2}`)} 이므로 ${deg(rest2)}입니다.`,
    ],
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
  // ⚠️ 예전에는 「네 각이 모두 같은 사각형의 한 각」이었다 — $360\div4$ 한 걸음이고
  //    답이 늘 $90^\circ$ 였다. 이제 한 각만 주고 **나머지 셋이 같다**로 되짚는다.
  const one = intBetween(rng, 20, 40) * 3;
  const rest3 = 360 - one;
  return makeDeep(
    unit,
    `사각형의 한 각의 크기는 ${deg(one)}이고, 나머지 세 각의 크기는 서로 같습니다. ` +
      `나머지 한 각의 크기는 몇 도인가?`,
    deg(rest3 / 3),
    [
      `나머지 세 각의 크기의 합은 ${expr(`360-${one}=${rest3}`)} 입니다.`,
      `세 각의 크기가 같으므로 ${expr(`${rest3}\\div3=${rest3 / 3}`)} 입니다.`,
    ],
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
  // ⚠️ 예전 갈래는 「$85$는 몇십으로 어림하면 $80$이 되는가? 예/아니요」였다 —
  //    **한 걸음 판정이고 찍어도 절반이 맞는다.** 4단으로 셀 수 없는 모양이다.
  //    이제 어림한 몫과 **실제 몫**을 둘 다 구해 견준다(세 걸음).
  if (intBetween(rng, 0, 1) === 0) {
    const b = bb + pick(rng, [-4, -3, -2, -1, 1, 2, 3, 4]);
    const q = intBetween(rng, 3, 9);
    const a = bb * q;
    const real = Math.floor(a / b);
    return makeDeep(
      unit,
      `${expr(`${a}\\div${b}`)} 에서 나누는 수를 몇십으로 어림하여 몫을 어림했습니다. ` +
        `어림한 몫과 실제 몫의 차는 얼마인가?`,
      n(Math.abs(q - real)),
      [
        `${josaNum(b, "을", "를")} 몇십으로 어림하면 ${n(bb)}이므로 어림한 몫은 ` +
          `${expr(`${a}\\div${bb}=${q}`)} 입니다.`,
        `실제 몫은 ${expr(`${a}\\div${b}=${real}\\cdots${a - real * b}`)} 에서 ${n(real)}이므로 ` +
          `차는 ${expr(`${Math.max(q, real)}-${Math.min(q, real)}=${Math.abs(q - real)}`)} 입니다.`,
      ],
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

/* ────────── 1-3 난이도 확대 — 심화중·심화상 (D-113, 2026-08-30) ──────────
 *
 * **파일럿이다.** 원장님이 `/dev/tier-bench/g4` 에서 여섯 갈래를 나란히 보시고 잣대를
 * 확정하실 때까지 이 대단원 일곱 소단원 밖으로 나가지 않는다(D-71·D-07).
 *
 * ## 왜 1-3 인가
 *
 * `tier-bench-g4.md` §6.1 #5 가 지목한 자리다 — 「우리 최고점(1-3-2·1-3-6)이 저쪽
 * 심화(하)인지 심화(중)인지. **우리 천장의 절대 위치**가 여기서 정해진다」. 같은
 * 보고서 §3.2 에서 이 대단원은 **천장과 바닥을 같이** 갖는다(심하 둘 · 응용≈심화 셋).
 *
 * ## 잣대 — **되짚기 축** (리드 확정 2026-08-30)
 *
 * ⚠️ **처음 초안은 «열거» 축이었고 기각됐다.** 문형 전량 6,900행 실측에서 열거는
 *    갈래를 1.5~2배밖에 안 가르고(초4는 기본 7.4% > 응용 5.5% 로 **뒤집혀** 있다)
 *    되짚기는 22~40배 가른다. 게다가 심화하 안에서 열거형은 평균 **0.39걸음**으로
 *    그 소단원 «연산»(0.79)보다도 얕았다 — 열거를 꼭대기의 정의로 쓰면 **가장 얕은
 *    것을 꼭대기로 올리게 된다.** 그래서 축을 바꿨다.
 *
 * ```
 * 심화하  되짚기 사슬의 **마디마다 값이 하나로 굳는다**            (기준선 — 안 건드림)
 * 심화중  굳지 않는 마디가 **하나** 있고, 발문의 다른 조건이나
 *         **그 소단원의 성질**이 그 마디를 굳혀 주어야 답이 선다
 * 심화상  그 마디를 성질만으로는 **못 굳혀**, 그 소단원의 계산으로 나올 수 있는
 *         값들을 **실제로 만들어 견주어야** 하나가 남는다. 그리고 그 후보를
 *         **발문이 주지 않고 되짚기가 만든다**
 * ```
 *
 * 🔴 **참은 생성기가 아니라 해설이다.** 생성기가 전수로 훑어도 해설이 한 줄로 접으면
 *    학생 경로는 그만큼이다. 아래 해설들은 **견주는 자리를 실제로 적는다** —
 *    심화상 해설은 「이 후보는 왜 안 되고 저것은 왜 되는가」를 계산으로 보인다.
 *
 * ### 반증 ④ — 뒤집힘 필터를 이 일곱에 실제로 댔다
 *
 * 같은 소단원의 연산·기본·응용 중 하나라도 이 잣대를 통과하면 그 소단원은 비워야 한다.
 * 일곱 소단원 × 세 갈래 **스물하나 전부**, 답이 발문의 수에 그 소단원 연산을
 * **순방향으로만** 적용해 나온다(=되짚기가 없다) — 그래서 굳지 않는 마디가 아예 없다.
 * 유일한 되짚기는 1-3-5 «연산»의 `$b\times\square=a$` 인데 **마디가 하나로 굳으므로**
 * 반증 ①에 의해 심화하 급이다. **뒤집힘 0 — 일곱 다 채운다.**
 * 그 순방향 성질은 `elemTiersG4MulDivDeep.test.ts` 가 **셋 전부에 실제로 대어** 잠근다.
 *
 * 🔴 **규모로 올리지 않았다**(원장님). 곱은 다섯 자리 안, 나눗셈은 표준과 같은 띠 —
 *    `elemTiersG4MulDiv.test.ts` 의 `SCALE_CAP` 이 새 갈래에도 그대로 걸린다.
 *
 * 🔴 **문형(`FORMS`)에는 안 넣었다.** 순서는 잣대 → 갈래 → 문형 12(D-114) → 적재다.
 *    그래서 이 파일럿은 **적재본에 안 들어간다**(계량기가 두 줄을 따로 찍는다).
 */

/** 열 자리로 어림. 생성기·시험이 같은 규칙을 쓰되 시험은 이것을 안 부른다(동어반복 금지). */
function roundTen(value: number): number {
  return Math.round(value / 10) * 10;
}

/**
 * **1-3-5 심화상의 밭** — 「$N$ 을 두 자리 수로 나누어떨어지게 하고 몫이 한 자리」인
 * 나누는 수가 **정확히 하나**인 자리. 손으로 고르지 않고 전수로 만든다.
 *
 * 하나여야 하는 까닭: 심화상은 「견주어 보니 **하나가 남는다**」이지 「여럿을 다
 * 적는다」가 아니다(리드 반증 ⑤ — 「모두」를 지워도 답이 그대로면 그 열거는 등급의
 * 근거가 아니다).
 */
const DIV_ONE_DIGIT_FIELD: { b: number; q: number; n: number }[] = (() => {
  const out: { b: number; q: number; n: number }[] = [];
  for (let b = 11; b <= 39; b += 1) {
    if (b % 10 === 0) continue;
    for (let q = 3; q <= 9; q += 1) {
      const n = b * q;
      let hits = 0;
      for (let d = 10; d <= 99; d += 1) {
        if (n % d !== 0) continue;
        const t = n / d;
        if (t >= 1 && t <= 9) hits += 1;
      }
      if (hits === 1) out.push({ b, q, n });
    }
  }
  return out;
})();

/**
 * **1-3-6 심화상의 밭** — 「$N$ 을 두 자리 수로 나누면 몫이 두 자리이고 나머지가 $r$」
 * 인 나누는 수가 **정확히 하나**인 자리.
 *
 * ⚠️ 나머지를 안 걸면 $b$ 와 몫이 **서로 바꿔치기 되어 답이 늘 둘**이다
 *    ($391=17\times23$ 은 $17$ 로도 $23$ 으로도 몫이 두 자리). 「나머지는 나누는 수보다
 *    작다」는 소단원 성질이 그 대칭을 깬다 — 그래서 $r$ 이 몫보다 크거나 같은 자리만 산다.
 */
const DIV_TWO_DIGIT_FIELD: { b: number; q: number; r: number; n: number }[] =
  (() => {
    const out: { b: number; q: number; r: number; n: number }[] = [];
    for (let b = 12; b <= 29; b += 1) {
      if (b % 10 === 0) continue;
      for (let q = 11; q <= 28; q += 1) {
        for (let r = 1; r <= b - 1; r += 1) {
          const n = b * q + r;
          let hits = 0;
          let only = 0;
          for (let d = 10; d <= 99; d += 1) {
            if (n % d !== r) continue;
            const t = Math.floor(n / d);
            if (t < 10 || t > 99) continue;
            hits += 1;
            only = d;
          }
          if (hits === 1 && only === b) out.push({ b, q, r, n });
        }
      }
    }
    return out;
  })();

/**
 * **1-3-7 심화상의 밭** — 「몇십으로 어림하면 `bb`」인 두 자리 수 열 개 가운데 `a` 를
 * 나누어떨어지게 하는 것이 **정확히 하나**인 자리. 어림값별로 나눠 담는다 —
 * 한 통에 쏟으면 작은 어림값이 압도한다(실측으로 씨앗 셋이 전부 $20$ 이었다).
 *
 * ⚠️ 상한 `900` 은 시험의 `SCALE_CAP["1-3-7"]` 과 같은 뜻이지만 그 상수를 가져다
 *    쓰지 않는다 — 제품이 제 시험의 기대값을 정하면 그 시험은 도장이 된다.
 */
const DIV_ROUGH_FIELD: { bb: number; a: number; d: number }[][] = (() => {
  const out: { bb: number; a: number; d: number }[][] = [];
  for (let bb = 20; bb <= 90; bb += 10) {
    const window: number[] = [];
    for (let d = bb - 5; d <= bb + 4; d += 1) window.push(d);
    const rows: { bb: number; a: number; d: number }[] = [];
    for (let a = 100; a <= 900; a += 1) {
      const divs = window.filter((d) => a % d === 0);
      // 🔴 나누는 수가 **어림값 그 자체**면 답이 발문에 그대로 적혀 있다
      //    (「어림하면 $20$」인데 답도 $20$). 시험의 「후보를 발문이 주지 않는다」가
      //    실제로 잡아 준 자리다 — 되짚기가 만든 후보가 아니라 발문이 준 값이 된다.
      if (divs.length === 1 && divs[0] !== bb)
        rows.push({ bb, a, d: divs[0]! });
    }
    if (rows.length > 0) out.push(rows);
  }
  return out;
})();

/**
 * **1-3-1 5단 심화중 — 곱의 «자릿수»가 어떤 수를 굳힌다.**
 * 되짚기 마디(어떤 수)는 범위로만 열리고, 「몇 자리 수인가」(소단원 성질)와
 * 「가장 작은/큰」(발문 조건)이 그 마디를 **한 번에** 굳힌다.
 */
function tier31Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 2, 9) * 10;
  const five = intBetween(rng, 0, 1) === 0;
  const m = five ? Math.ceil(10000 / b) : Math.floor(9999 / b);
  const lo = five ? m - 1 : m;
  const hi = five ? m : m + 1;
  return makeDeep(
    unit,
    `어떤 수에 ${josaNum(b, "을", "를")} 곱했더니 곱이 ${five ? "다섯" : "네"} 자리 ` +
      `수가 되었습니다. 어떤 수가 될 수 있는 세 자리 수 중에서 가장 ` +
      `${five ? "작은" : "큰"} 수를 구하시오.`,
    n(m),
    [
      `${expr(`${b}\\times${lo}=${b * lo}`)} ${tail(b * lo, "은", "는")} 네 자리 수입니다.`,
      `${expr(`${b}\\times${hi}=${b * hi}`)} ${tail(b * hi, "은", "는")} 다섯 자리 수입니다.`,
      `따라서 곱이 ${five ? "다섯" : "네"} 자리 수가 되는 어떤 수 중에서 가장 ` +
        `${five ? "작은" : "큰"} 수는 ${n(m)}입니다.`,
    ],
  );
}

/**
 * **1-3-1 6단 심화상 — 곱한 «몇십»을 되짚기가 만들고, 곱해 봐야 하나가 남는다.**
 * 발문은 몇십을 하나도 알려 주지 않는다. 후보 여덟(20~90)은 「(세 자리)×(몇십)」이라는
 * **소단원 성질이 만든 것**이고, 어느 것인지는 **실제로 곱해 범위와 견주어야** 정해진다.
 */
function tier31Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 123, 897);
  // 양옆 이웃(t-10·t+10)이 몇십 띠 안에 있어야 해설이 «위도 아래도 안 된다»를 보인다.
  const t = intBetween(rng, 3, 8) * 10;
  const p = a * t;
  const low = Math.floor(p / 100) * 100 - 100 * intBetween(rng, 1, 8);
  const high = Math.ceil(p / 100) * 100 + 100 * intBetween(rng, 1, 8);
  return makeDeep(
    unit,
    `${josaNum(a, "에", "에")} 어떤 몇십을 곱했더니 ${josaNum(low, "보다", "보다")} 크고 ` +
      `${josaNum(high, "보다", "보다")} 작은 수가 되었습니다. 곱한 몇십을 구하시오.`,
    n(t),
    [
      `${expr(`${a}\\times${t - 10}=${a * (t - 10)}`)} ${tail(a * (t - 10), "은", "는")} ` +
        `${josaNum(low, "보다", "보다")} 작습니다.`,
      `${expr(`${a}\\times${t}=${p}`)} ${tail(p, "은", "는")} ` +
        `${josaNum(low, "보다", "보다")} 크고 ${josaNum(high, "보다", "보다")} 작습니다.`,
      `${expr(`${a}\\times${t + 10}=${a * (t + 10)}`)} ${tail(a * (t + 10), "은", "는")} ` +
        `${josaNum(high, "보다", "보다")} 큽니다. 몇십이 커지면 곱도 커지므로 곱한 몇십은 ` +
        `${n(t)}입니다.`,
    ],
  );
}

/**
 * **1-3-2 5단 심화중 — 곱의 «자릿수»가 곱한 두 자리 수를 굳힌다.**
 * 1-3-1 심화중과 되짚는 자리가 반대다(그쪽은 «어떤 수», 이쪽은 «곱한 수»).
 */
function tier32Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 123, 897);
  const five = intBetween(rng, 0, 1) === 0;
  const m = five ? Math.ceil(10000 / a) : Math.floor(9999 / a);
  const lo = five ? m - 1 : m;
  const hi = five ? m : m + 1;
  return makeDeep(
    unit,
    `${expr(`${a}\\times\\square`)} 의 곱이 ${five ? "다섯" : "네"} 자리 수가 ` +
      `되었습니다. ${expr("\\square")} 안에 들어갈 수 있는 두 자리 수 중에서 가장 ` +
      `${five ? "작은" : "큰"} 수를 구하시오.`,
    n(m),
    [
      `${expr(`${a}\\times${lo}=${a * lo}`)} ${tail(a * lo, "은", "는")} 네 자리 수입니다.`,
      `${expr(`${a}\\times${hi}=${a * hi}`)} ${tail(a * hi, "은", "는")} 다섯 자리 수입니다.`,
      `따라서 ${expr("\\square")} 안에 들어갈 수 있는 수 중에서 가장 ` +
        `${five ? "작은" : "큰"} 수는 ${n(m)}입니다.`,
    ],
  );
}

/**
 * **1-3-2 6단 심화상 — 곱한 두 자리 수를 되짚기가 만들고, 곱해 봐야 하나가 남는다.**
 * 후보가 몇십 여덟(1-3-1)이 아니라 **두 자리 수 아흔**이라 어림으로 자리를 좁힌 뒤
 * 이웃끼리 견주어야 한다.
 */
function tier32Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 123, 897);
  const k = twoDigit(rng);
  const p = a * k;
  const step = Math.min(8, Math.floor((a - 10) / 10));
  const low = Math.floor(p / 10) * 10 - 10 * intBetween(rng, 1, step);
  const high = Math.ceil(p / 10) * 10 + 10 * intBetween(rng, 1, step);
  return makeDeep(
    unit,
    `${expr(`${a}\\times\\square`)} 의 곱이 ${josaNum(low, "보다", "보다")} 크고 ` +
      `${josaNum(high, "보다", "보다")} 작습니다. ${expr("\\square")} 안에 알맞은 ` +
      `두 자리 수를 구하시오.`,
    n(k),
    [
      `${expr(`${a}\\times${k - 1}=${a * (k - 1)}`)} ${tail(a * (k - 1), "은", "는")} ` +
        `${josaNum(low, "보다", "보다")} 작습니다.`,
      `${expr(`${a}\\times${k}=${p}`)} ${tail(p, "은", "는")} ` +
        `${josaNum(low, "보다", "보다")} 크고 ${josaNum(high, "보다", "보다")} 작습니다.`,
      `${expr(`${a}\\times${k + 1}=${a * (k + 1)}`)} ${tail(a * (k + 1), "은", "는")} ` +
        `${josaNum(high, "보다", "보다")} 큽니다. 곱하는 수가 커지면 곱도 커지므로 ` +
        `${expr("\\square")} 안에 알맞은 수는 ${n(k)}입니다.`,
    ],
  );
}

/**
 * **1-3-3 5단 심화중 — 어림한 곱에서 어림값을 되찾고, 그 «원상»을 조건이 굳힌다.**
 * 되짚기가 두 겹이다(어림 곱 → 어림값 → 어떤 수). 굳지 않는 마디는 원상 하나뿐이고
 * 「가장 큰/작은」이 그것을 굳힌다.
 */
function tier33Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const aa = intBetween(rng, 2, 9) * 100;
  const b = intBetween(rng, 2, 9) * 10;
  const est = aa * b;
  const wantBig = intBetween(rng, 0, 1) === 0;
  const ans = wantBig ? aa + 49 : aa - 50;
  return makeDeep(
    unit,
    `어떤 세 자리 수를 몇백으로 어림하여 ${josaNum(b, "과", "와")} 곱했더니 어림한 곱이 ` +
      `${josaNum(est, "이", "가")} 되었습니다. 어떤 수가 될 수 있는 수 중에서 가장 ` +
      `${wantBig ? "큰" : "작은"} 수를 구하시오.`,
    n(ans),
    [
      `${expr(`${aa}\\times${b}=${est}`)} 이므로 몇백으로 어림한 값은 ${n(aa)}입니다.`,
      `백의 자리 아래가 ${n(50)} 이상이면 올리고 ${n(50)} 미만이면 버리므로, ` +
        `${expr(`${aa}-50=${aa - 50}`)} 부터 ${expr(`${aa}+49=${aa + 49}`)} 까지가 ` +
        `${josaNum(aa, "이", "가")} 됩니다.`,
      `가장 ${wantBig ? "큰" : "작은"} 수는 ${n(ans)}입니다.`,
    ],
  );
}

/**
 * **1-3-3 6단 심화상 — 어림이 후보를 만들고, 실제 곱이 하나를 고른다.**
 * 어림한 곱에서 어림값을 되찾으면 두 자리 수 후보 **열 개**가 열리는데,
 * 「몇십으로 어림하면 그 값」이라는 성질만으로는 안 굳는다 —
 * 열 개를 **실제로 곱해** 실제 곱과 견주어야 하나가 남는다.
 */
function tier33Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = roughA(rng);
  const aa = Math.round(a / 100) * 100;
  // 어림값이 몇십이어야 원상 열 개가 모두 두 자리다 — $15$ 아래는 «몇십»이 $10$ 이 된다.
  let k = intBetween(rng, 15, 94);
  if (k % 10 === 0) k += 1;
  const bb = roundTen(k);
  const est = aa * bb;
  const real = a * k;
  return makeDeep(
    unit,
    `${josaNum(a, "과", "와")} 어떤 두 자리 수의 곱을 어림하려고 합니다. ` +
      `${josaNum(a, "은", "는")} 몇백으로, 어떤 두 자리 수는 몇십으로 어림했더니 ` +
      `어림한 곱이 ${josaNum(est, "이", "가")} 되었습니다. 실제 곱이 ` +
      `${josaNum(real, "일", "일")} 때 어떤 두 자리 수를 구하시오.`,
    n(k),
    [
      `${josaNum(a, "을", "를")} 몇백으로 어림하면 ${n(aa)}입니다. ` +
        `${expr(`${aa}\\times${bb}=${est}`)} 이므로 어떤 두 자리 수를 몇십으로 어림한 ` +
        `값은 ${n(bb)}입니다.`,
      `몇십으로 어림하여 ${josaNum(bb, "이", "가")} 되는 두 자리 수는 ${n(bb - 5)}부터 ` +
        `${n(bb + 4)}까지의 ${n(10)}개입니다.`,
      `이 수들을 ${josaNum(a, "과", "와")} 차례로 곱해 실제 곱과 견주면 ` +
        `${expr(`${a}\\times${k}=${real}`)} 이므로 어떤 두 자리 수는 ${n(k)}입니다.`,
    ],
  );
}

/**
 * **1-3-4 5단 심화중 — 「나머지가 가장 크다」를 소단원 성질이 수로 굳힌다.**
 * 되짚기 마디(나머지)는 발문이 값을 안 준다. 「나머지는 나누는 수보다 작다」는
 * **그 소단원의 성질**과 「가장 큰」이 그 마디를 한 번에 굳힌다.
 */
function tier34Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 2, 9) * 10;
  const q = intBetween(rng, 2, 9);
  const r = b - 1;
  const x = b * q + r;
  return makeDeep(
    unit,
    `어떤 수를 ${roJosa(b)} 나누었더니 몫이 ${josaNum(q, "이", "가")} 되고 나머지는 ` +
      `가장 큰 수가 되었습니다. 어떤 수를 구하시오.`,
    n(x),
    [
      `나머지는 나누는 수보다 작아야 하므로 가장 큰 나머지는 ${expr(`${b}-1=${r}`)} 입니다.`,
      `${expr(`${b}\\times${q}=${b * q}`)} 이고 ${expr(`${b * q}+${r}=${x}`)} 이므로 ` +
        `어떤 수는 ${n(x)}입니다.`,
    ],
  );
}

/**
 * **1-3-4 6단 심화상 — 나눈 «몇십»을 되짚기가 만들고, 곱해 봐야 하나가 남는다.**
 * 몫만 주고 나누는 수를 감춘다. 후보 여덟은 「몇십으로 나누기」라는 소단원 성질이
 * 만든 것이고, 어느 것인지는 **몇십마다 몫이 얼마가 되는지 만들어 견주어야** 정해진다.
 */
function tier34Top(unit: UnitSeed, rng: Rng): ElemProblem {
  let b = 0;
  let q = 0;
  let x = 0;
  for (let tries = 0; tries < 40 && x === 0; tries += 1) {
    b = intBetween(rng, 3, 8) * 10;
    q = intBetween(rng, 2, 9);
    // 이웃 몇십이 «몫이 더 크다/더 작다»로 갈려야 해설이 셋으로 닫힌다.
    const lo = Math.max(b * q, (b - 10) * (q + 1));
    const hi = Math.min(b * (q + 1), (b + 10) * q) - 1;
    if (lo <= hi) x = intBetween(rng, lo, hi);
  }
  if (x === 0)
    throw new Error("초4 1-3-4 심화상: 이웃이 갈리는 자리를 못 찾았다");
  return makeDeep(
    unit,
    `${josaNum(x, "을", "를")} 어떤 몇십으로 나누었더니 몫이 ${josaNum(q, "이", "가")} ` +
      `되었습니다. 나눈 수를 구하시오.`,
    n(b),
    [
      `${expr(`${b - 10}\\times${q + 1}=${(b - 10) * (q + 1)}`)} ` +
        `${tail((b - 10) * (q + 1), "이", "가")} ${josaNum(x, "보다", "보다")} ` +
        `작거나 같으므로 ${roJosa(b - 10)} 나누면 몫이 ${josaNum(q, "보다", "보다")} 큽니다.`,
      `${expr(`${b + 10}\\times${q}=${(b + 10) * q}`)} ${tail((b + 10) * q, "이", "가")} ` +
        `${josaNum(x, "보다", "보다")} 크므로 ${roJosa(b + 10)} 나누면 몫이 ` +
        `${josaNum(q, "보다", "보다")} 작습니다.`,
      `${expr(`${b}\\times${q}=${b * q}`)} 이고 ${expr(`${b}\\times${q + 1}=${b * (q + 1)}`)} ` +
        `이므로 ${josaNum(x, "은", "는")} 그 사이에 있습니다. 나눈 수는 ${n(b)}입니다.`,
    ],
  );
}

/**
 * **1-3-5 5단 심화중 — 「몫과 나머지가 같다」를 조건이 굳힌다.**
 * 심화하는 몫과 나머지를 둘 다 알려 준다. 여기서는 관계만 주므로 마디가 열리고,
 * 「한 자리 수」(소단원 성질 — 이 소단원의 몫은 한 자리다)와 「가장 큰」이 굳힌다.
 */
function tier35Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = tensOnes(rng, 3);
  const t = 9;
  const x = b * t + t;
  return makeDeep(
    unit,
    `어떤 수를 ${roJosa(b)} 나누었더니 몫과 나머지가 같은 한 자리 수가 되었습니다. ` +
      `어떤 수가 될 수 있는 수 중에서 가장 큰 수를 구하시오.`,
    n(x),
    [
      `몫과 나머지가 같은 한 자리 수 중에서 가장 큰 수는 ${n(t)}입니다.`,
      `${expr(`${b}\\times${t}=${b * t}`)} 이고 ${expr(`${b * t}+${t}=${x}`)} 이므로 ` +
        `어떤 수는 ${n(x)}입니다.`,
    ],
  );
}

/**
 * **1-3-5 6단 심화상 — 나누는 수를 되짚기가 만들고, 곱해 봐야 하나가 남는다.**
 * 나누는 수도 몫도 안 준다. 「나누어떨어진다 · 몫이 한 자리」라는 성질만으로는 안 굳고,
 * 두 자리 수마다 한 자리 수를 곱해 그 수가 나오는지 **만들어 견주어야** 한다.
 * 밭은 전수로 만들어 **답이 하나뿐인 자리**만 쓴다(`DIV_ONE_DIGIT_FIELD`).
 */
function tier35Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DIV_ONE_DIGIT_FIELD);
  const low = Math.max(10, Math.ceil(c.n / 9));
  // 「안 되는 후보」를 하나 실제로 곱해 보인다 — 해설이 «견주기»를 안 적으면 학생 경로는
  // 그냥 답을 받는 것이 된다(리드: **참은 생성기가 아니라 해설이다**).
  let miss = low;
  while (miss < 100 && (miss === c.b || c.n % miss === 0)) miss += 1;
  if (miss >= 100)
    throw new Error(`초4 1-3-5 심화상: 견줄 후보가 없다 (${c.n})`);
  const t0 = Math.floor(c.n / miss);
  return makeDeep(
    unit,
    `${josaNum(c.n, "을", "를")} 어떤 두 자리 수로 나누었더니 나누어떨어지고 몫이 ` +
      `한 자리 수가 되었습니다. 나눈 수를 구하시오.`,
    n(c.b),
    [
      `몫이 한 자리 수이므로 나누는 수는 ${josaNum(low, "보다", "보다")} 작지 않습니다. ` +
        `두 자리 수에 한 자리 수를 곱해 ${josaNum(c.n, "이", "가")} 되는지 차례로 봅니다.`,
      `${expr(`${miss}\\times${t0}=${miss * t0}`)}, ` +
        `${expr(`${miss}\\times${t0 + 1}=${miss * (t0 + 1)}`)} 이므로 ` +
        `${josaNum(c.n, "은", "는")} ${roJosa(miss)} 나누어떨어지지 않습니다.`,
      `이렇게 차례로 보면 나누어떨어지는 것은 ${expr(`${c.b}\\times${c.q}=${c.n}`)} ` +
        `하나뿐이므로 나눈 수는 ${n(c.b)}입니다.`,
    ],
  );
}

/**
 * **1-3-6 5단 심화중 — 나머지가 가장 클 때 하나를 더하면 몫이 하나 는다.**
 * 굳지 않는 마디(나머지)를 소단원 성질이 굳히고, 되짚은 뒤 나눗셈이 **한 번 더** 남는다.
 */
function tier36Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = tensOnes(rng, 2);
  const q = intBetween(rng, 11, 33);
  const r = b - 1;
  const x = b * q + r;
  return makeDeep(
    unit,
    `어떤 수를 ${roJosa(b)} 나누었더니 몫이 ${josaNum(q, "이", "가")} 되고 나머지는 ` +
      `가장 큰 수가 되었습니다. 어떤 수보다 ${n(1)} 큰 수를 ${roJosa(b)} 나눈 몫을 ` +
      `구하시오.`,
    n(q + 1),
    [
      `나머지는 나누는 수보다 작으므로 가장 큰 나머지는 ${expr(`${b}-1=${r}`)} 입니다.`,
      `${expr(`${b}\\times${q}=${b * q}`)} 이고 ${expr(`${b * q}+${r}=${x}`)} 이므로 ` +
        `어떤 수는 ${n(x)}입니다.`,
      `${expr(`${x}+1=${x + 1}`)} 이고 ${expr(`${x + 1}\\div${b}=${q + 1}`)} 이므로 ` +
        `몫은 ${n(q + 1)}입니다.`,
    ],
  );
}

/**
 * **1-3-6 6단 심화상 — 나머지가 대칭을 깨고, 나눈 수를 견주어 찾는다.**
 * 나누는 수도 몫도 안 준다. 나머지를 빼면 (나누는 수)×(몫)이 남는데 그 짝이 여럿이라
 * 성질만으로는 안 굳는다 — **「나머지는 나누는 수보다 작다」가 짝의 한쪽을 떨어뜨린다.**
 * 밭은 전수로 만들어 답이 하나뿐인 자리만 쓴다(`DIV_TWO_DIGIT_FIELD`).
 */
function tier36Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, DIV_TWO_DIGIT_FIELD);
  const base = c.n - c.r;
  return makeDeep(
    unit,
    `${josaNum(c.n, "을", "를")} 어떤 두 자리 수로 나누었더니 몫이 두 자리 수이고 ` +
      `나머지가 ${josaNum(c.r, "이", "가")} 되었습니다. 나눈 수를 구하시오.`,
    n(c.b),
    [
      `나머지가 ${n(c.r)}이므로 나누는 수는 ${josaNum(c.r, "보다", "보다")} 큽니다.`,
      `${expr(`${c.n}-${c.r}=${base}`)} ${tail(base, "이", "가")} (나누는 수)와 ` +
        `(몫)의 곱입니다.`,
      `${josaNum(c.r, "보다", "보다")} 큰 두 자리 수 중에서 ${josaNum(base, "을", "를")} ` +
        `나누어떨어지게 하고 몫이 두 자리 수가 되는 것을 찾으면 ` +
        `${expr(`${c.b}\\times${c.q}=${base}`)} 이므로 나눈 수는 ${n(c.b)}입니다.`,
    ],
  );
}

/**
 * **1-3-7 5단 심화중 — 어림한 몫에서 어림값을 되찾고, 그 원상을 조건이 굳힌다.**
 * 되짚기가 두 겹이다(어림 몫 → 어림한 나누는 수 → 실제 나누는 수).
 */
function tier37Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const bb = intBetween(rng, 2, 9) * 10;
  const k = intBetween(rng, 3, 9);
  const a = bb * k;
  return makeDeep(
    unit,
    `${expr(`${a}\\div\\square`)} 에서 나누는 수 ${expr("\\square")} 를 몇십으로 어림하여 ` +
      `몫을 어림했더니 ${josaNum(k, "이", "가")} 되었습니다. ${expr("\\square")} 안에 ` +
      `들어갈 수 있는 두 자리 수 중에서 가장 큰 수를 구하시오.`,
    n(bb + 4),
    [
      `어림한 나누는 수를 ${expr("\\square")} 라 하면 ` +
        `${expr(`\\square\\times${k}=${a}`)} 이므로 어림한 값은 ${n(bb)}입니다.`,
      `몇십으로 어림하여 ${josaNum(bb, "이", "가")} 되는 두 자리 수는 ` +
        `${expr(`${bb}-5=${bb - 5}`)} 부터 ${expr(`${bb}+4=${bb + 4}`)} 까지이므로 ` +
        `가장 큰 수는 ${n(bb + 4)}입니다.`,
    ],
  );
}

/**
 * **1-3-7 6단 심화상 — 어림이 후보 열 개를 만들고, 나눠 봐야 하나가 남는다.**
 * 어림값은 원상을 열 개까지만 좁힌다. 그 열 개 중 어느 것인지는 **실제로 나누어
 * 떨어지는지 견주어야** 정해지고, 밭은 전수로 만들어 **하나만 떨어지는 자리**만 쓴다.
 */
function tier37Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, pick(rng, DIV_ROUGH_FIELD));
  return makeDeep(
    unit,
    `${josaNum(c.a, "을", "를")} 어떤 두 자리 수로 나누었더니 나누어떨어졌습니다. ` +
      `나누는 수를 몇십으로 어림하면 ${josaNum(c.bb, "이", "가")} 됩니다. ` +
      `나누는 수를 구하시오.`,
    n(c.d),
    [
      `몇십으로 어림하여 ${josaNum(c.bb, "이", "가")} 되는 두 자리 수는 ` +
        `${expr(`${c.bb}-5=${c.bb - 5}`)} 부터 ${expr(`${c.bb}+4=${c.bb + 4}`)} ` +
        `까지의 ${n(10)}개입니다.`,
      `이 수들로 ${josaNum(c.a, "을", "를")} 차례로 나누어 보면 ` +
        `${expr(`${c.a}\\div${c.d}=${c.a / c.d}`)} 만 나누어떨어지므로 나누는 수는 ` +
        `${n(c.d)}입니다.`,
    ],
  );
}

/* ══════ 2-3 · 2-6 · 2-1 난이도 확대 — 심화중·심화상 (D-113 · D-115, 물결 2) ══════
 *
 * 2026-08-31. 파일럿(1-3)에 이어 **세 대단원**을 채운다. 고른 까닭·비운 자리·못 본 것은
 * `docs/planning/tracks/reports/tier-fill-g4-w2.md` 에 있다.
 *
 * ## 굳힘 축을 대단원마다 **하나씩 예약**했다 (토대 17 §2 권고)
 *
 * ```
 * 2-3 소수     자릿값      — 소수 몇 자리 수인가 · 어느 자리 숫자가 무엇인가 · 받아올림/받아내림
 * 2-6 다각형   자연수      — 변의 수는 자연수 · 나누어떨어져야 한다
 * 2-1 분수     진분수 조건 — 분자 < 분모 · 대분수의 받아올림/받아내림
 * ```
 *
 * 파일럿 1-3 이 쓴 「곱의 자릿수」·「나머지는 나누는 수보다 작다」와 겹치지 않는다.
 *
 * ## 🔴 「잘못 …했더니」를 한 갈래도 안 쓴다
 *
 * 초4 심화하 62자리 중 **11자리(17.7%)** 가 이미 그 문형이다(토대 §2-㉠, 실측). 그래서
 * 마디를 여는 방식을 **「무엇을 안 말해 주는가」**로 바꿨다 — 어느 자리 숫자인지 ·
 * 받아올림이 있었는지 · 한 변이 얼마인지 · 어느 쪽이 큰지.
 *
 * ## 중과 상을 가르는 자리 (D-115 ⑾) — 이 회차의 실물이 그것을 보인다
 *
 * `2-1-1 심화중` 과 `2-1-2 심화상` 은 **뼈대가 같다**(합에서 분자 쌍을 되짚어 만든다).
 * 갈리는 것은 **해설이 밟는 길**이다 — 중은 쌍의 «작은 쪽 값»만 보고 걸러 내고(끝까지
 * 계산하지 않는다), 상은 쌍마다 **실제로 빼 보아야** 하나가 남는다.
 *
 * ## 밭은 손으로 고르지 않고 **전수로 만든다**
 *
 * 「하나만 남는가」를 사람이 눈으로 고르면 반드시 둘 남는 자리가 샌다(파일럿과 같은 규율).
 * 아래 `*_FIELD` 는 전부 모듈이 뜰 때 전수로 만들고, **하나만 남는 자리만** 담는다.
 */

/**
 * **반증 ⑥ 을 만든 뒤 «지면을 읽어» 다시 잰다** — 예측하지 않는다.
 *
 * `forwardReach.ts` 머리말이 그렇게 못 박았다: 생성기는 제가 고른 수만 알고 판정기는
 * 발문에 실제로 찍힌 수를 전부 본다 — **둘이 갈리면 판정기가 옳다.** 그래서 여기서는
 * 예측하지 말고 **다 만든 뒤** 그 발문을 그대로 읽어 재고, 닿으면 다시 뽑는다.
 *
 * 🔴 이 자가 무는 것은 대개 **산술 우연**이다(초4 실측: 진분수 두 개를 «곱하면» 답이
 * 나오는 자리 — 초4 는 분수의 곱셈을 배우지도 않는다). 그래도 거른다: 판정기의 ⑥ 줄이
 * 「세어 찍되 막지 않는다」로 열려 있으므로, 여기서 안 거르면 다음 사람이 그 수를
 * **진짜 결함으로 읽고** 시간을 태운다(그리고 거짓 경보는 가드를 끈다).
 *
 * ⚠️ 답을 `readRat` 이 **못 읽으면**(「칠각형」·「$3$개, $5$개」) 이 축 밖이므로 그대로 둔다.
 *    0 이 「깨끗」인지 「못 셈」인지 갈리지 않는 자리이고, 그 사실을 여기 적어 둔다.
 * ⚠️ 다시 뽑아도 안 되면 **마지막 것을 그대로 낸다** — 조용히 던지면 그 씨앗의 갈래가
 *    통째로 사라진다(`probe-elem-throw` 가 그것을 따로 본다).
 */
function unlessForward(build: () => ElemProblem, tries = 40): ElemProblem {
  let made = build();
  for (let i = 0; i < tries; i += 1) {
    // 🔴 `$` 를 **전부** 걷는다 — 판정기가 그렇게 읽는다
    //    (`probe-elem-tier-backsolve.ts:76`). 앞뒤만 걷으면 `$7$개` 가 `7$개` 로 남아
    //    `readRat` 이 null 을 내고, 그러면 이 거르개가 **조용히 아무것도 안 한다.**
    //    처음 판이 정확히 그랬고 2-6-4 아홉 자리가 그대로 새어 나갔다.
    const answer = readRat(made.answer.replace(/\$/g, "").trim());
    if (!answer) return made;
    if (!forwardReachable(pageNumbers(made.content), answer)) return made;
    made = build();
  }
  return made;
}

/* ─────────────────── 2-3 소수의 덧셈과 뺄셈 — 확대 갈래 ─────────────────── */

/**
 * **2-3-4 심화중의 밭** — 「어떤 소수 한 자리 수 + `c` 의 합이 `L`~`L+1` 사이」에서
 * 어떤 수가 아홉 개로만 좁혀지고, 「일의 자리 숫자와 소수 첫째 자리 숫자의 합」이
 * 그중 **하나**를 고르는 자리.
 *
 * 하나만 남는 까닭 — 창이 정수 경계를 **한 번만** 넘으므로 아래쪽(일의 자리 `W`)의
 * 자리 숫자 합은 `W+t0+1 … W+9`, 위쪽(`W+1`)은 `W+1 … W+t0` 로 **서로 겹치지 않는다.**
 * 그래서 `s` 를 `W+2 … W+9` 에서 고르면 답이 반드시 하나다. `s = W+1` 만 뺀다 —
 * 그때 답이 `(W+1).0` 이라 소수 한 자리 수가 아니다.
 */
const DEC1_SUM_FIELD: { c: number; L: number; s: number; v: number }[] =
  (() => {
    const out: { c: number; L: number; s: number; v: number }[] = [];
    for (let c = 11; c <= 59; c += 1) {
      if (c % 10 === 0) continue;
      for (let L = 5; L <= 13; L += 1) {
        const base = L * 10 - c;
        if (base <= 9) continue;
        const w = Math.floor(base / 10);
        const t0 = base % 10;
        for (let s = w + 2; s <= w + 9; s += 1) {
          const v =
            s - w >= t0 + 1 ? w * 10 + (s - w) : (w + 1) * 10 + (s - w - 1);
          // 답이 지면에 그대로 있으면 다른 축의 결함이 된다(`answerPrintedOnPage`).
          if (v === c) continue;
          out.push({ c, L, s, v });
        }
      }
    }
    return out;
  })();

/**
 * **2-3-5 심화중의 밭** — 되짚는 자리가 2-3-4 와 **반대**다(그쪽은 더해지는 수,
 * 이쪽은 **빼는 수**). 굳히는 조건도 «합»이 아니라 «차»다 — 「소수 첫째 자리 숫자가
 * 일의 자리 숫자보다 `k` 크다」.
 *
 * ⚠️ 이쪽은 2-3-4 처럼 «반드시 하나»가 보장되지 않는다. 위·아래 두 가지가 **둘 다**
 *    조건을 만족할 수 있어서다. 그래서 전수로 세어 **하나인 자리만** 담는다.
 */
const DEC1_DIFF_FIELD: { a: number; L: number; k: number; v: number }[] =
  (() => {
    const out: { a: number; L: number; k: number; v: number }[] = [];
    for (let a = 51; a <= 98; a += 1) {
      if (a % 10 === 0) continue;
      for (let L = 1; L <= 7; L += 1) {
        const base = a - (L + 1) * 10;
        if (base <= 0) continue;
        for (let k = 1; k <= 8; k += 1) {
          const hits: number[] = [];
          for (let j = 1; j <= 9; j += 1) {
            const v = base + j;
            const w = Math.floor(v / 10);
            const t = v % 10;
            if (t === 0) continue;
            if (t - w === k) hits.push(v);
          }
          if (hits.length !== 1) continue;
          const v = hits[0]!;
          if (v === a) continue;
          // 해설이 검산으로 `a - v` 를 찍는다 — 그 값에 **꼬리 $0$** 이 붙으면 안 된다.
          if ((a - v) % 10 === 0) continue;
          out.push({ a, L, k, v });
        }
      }
    }
    return out;
  })();

/**
 * **2-3-1 5단 심화중 — 「$0.01$이 몇 개」로 되짚은 뒤 한 자리 숫자가 안 굳는다.**
 *
 * 심화하는 자리마다 조건을 하나씩 주어 **네 자리가 다 굳는다.** 여기서는 창이
 * 자연수 부분·소수 첫째·둘째까지만 굳히고 **소수 셋째 자리 숫자는 열려 있다** —
 * 그것을 굳히는 것이 「자리 숫자끼리의 관계」라는 이 소단원의 성질이다.
 * 답은 다시 「$0.001$이 몇 개」로 되짚어 물으므로 지면에 그대로 있지 않다.
 */
function tier231Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier231MidRaw(unit, rng));
}

function tier231MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 1, 9);
  const s = intBetween(rng, 2, 9);
  const a = intBetween(rng, 1, s - 1);
  const b = s - a;
  const m = w * 100 + a * 10 + b;
  const value = w * 1000 + a * 100 + b * 10 + s;
  return makeDeep(
    unit,
    `어떤 소수 세 자리 수가 있습니다. 이 수는 ${n("0.01")}이 ${n(m)}개인 수보다 크고 ` +
      `${n("0.01")}이 ${n(m + 1)}개인 수보다 작습니다. 이 수의 소수 셋째 자리 숫자는 ` +
      `소수 첫째 자리 숫자와 소수 둘째 자리 숫자를 더한 것과 같습니다. ` +
      `이 수는 ${n("0.001")}이 몇 개인 수입니까?`,
    `${n(value)}개`,
    [
      `${n("0.01")}이 ${n(m)}개인 수는 ${n(dec2(m))}이고 ${n(m + 1)}개인 수는 ` +
        `${n(dec2(m + 1))}입니다. 그 사이에 있는 소수 세 자리 수는 자연수 부분이 ` +
        `${n(w)}, 소수 첫째 자리 숫자가 ${n(a)}, 소수 둘째 자리 숫자가 ${n(b)}이고 ` +
        `소수 셋째 자리 숫자만 정해지지 않습니다.`,
      `소수 셋째 자리 숫자는 ${expr(`${a}+${b}=${s}`)} 이므로 어떤 수는 ` +
        `${n(dec3(value))}입니다.`,
      `${n(1)}은 ${n("0.001")}이 ${n(1000)}개, ${n("0.1")}은 ${n(100)}개, ` +
        `${n("0.01")}은 ${n(10)}개이므로 ` +
        `${expr(`${w * 1000}+${a * 100}+${b * 10}+${s}=${value}`)} 이고 ${n(value)}개입니다.`,
    ],
  );
}

/**
 * **2-3-3 5단 심화중 — 소수점을 «몇 자리» 옮겼는지 안 말한다.**
 *
 * 방향은 주고 칸 수를 안 주면 되짚기 후보가 **둘**이고, 「어떤 수가 소수 한 자리
 * 수인가 두 자리 수인가」라는 자릿수 성질이 그 하나를 떨어뜨린다 — 「둘 중 고르기」라
 * 심화중의 정의 그 자체다(만들어 견주기가 아니다).
 *
 * ⚠️ **`make` 를 쓴다(`makeDeep` 이 아니다).** 소수점 이동은 이 소단원의 약속상
 *    **식으로 적지 않는다** — 「$2.7$의 $100$배」를 `2.7\times100` 으로 쓰면 소수의
 *    곱셈(초5)이 지면에 뜨고 `probe-elem-rules` 의 R3 이 문다. 그래서 표준 4단
 *    (`tier233Deep`)도 `make` 다. 계산식 두 개를 요구하는 D-72 뼈대는 이 소단원에서
 *    **구조적으로 못 세운다** — 걸음은 셋으로 두되 가드는 걸지 않는다.
 */
function tier233Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier233MidRaw(unit, rng));
}

function tier233MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const d1 = intBetween(rng, 1, 9);
  const d2 = intBetween(rng, 1, 9);
  const shown = `0.${d1}${d2}`;
  const one = `${d1}.${d2}`;
  const two = d1 * 10 + d2;
  const asNatural = intBetween(rng, 0, 1) === 0;
  const answer = asNatural ? two * 100 : two * 10;
  return make(
    unit,
    `어떤 수의 소수점을 왼쪽으로 몇 자리 옮겼더니 ${josaNum(shown, "이", "가")} ` +
      `되었습니다. 어떤 수는 ${asNatural ? "두 자리 수" : "소수 한 자리 수"}입니다. ` +
      `어떤 수의 ${n(100)}배는 얼마입니까?`,
    n(answer),
    `소수점을 왼쪽으로 한 자리 옮겨 ${josaNum(shown, "이", "가")} 되는 수는 ` +
      `${n(one)}이고, 두 자리 옮겨 ${josaNum(shown, "이", "가")} 되는 수는 ${n(two)}입니다. ` +
      `어떤 수는 ${asNatural ? "두 자리 수" : "소수 한 자리 수"}이므로 ` +
      `${josaNum(asNatural ? two : one, "이", "가")} 됩니다. ` +
      `${n(100)}배를 하면 소수점이 오른쪽으로 두 자리 옮겨지므로 ${n(answer)}입니다.`,
  );
}

/**
 * **2-3-3 6단 심화상 — 방향도 칸 수도 안 말한다.**
 *
 * 되짚기가 후보 **넷**($100$배·$10$배·$\frac1{10}$·$\frac1{100}$)을 만들고, 성질만으로는
 * 어느 것인지 안 굳는다. 넷을 **실제로 $100$배 해 보아야** 자릿수 조건과 견줄 수 있다.
 * 후보를 발문이 주지 않는다 ✓ · 남은 하나가 무리의 **극값이 아니다** ✓
 * (넷을 크기순으로 놓으면 답은 둘째 또는 셋째다).
 */
function tier233Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier233TopRaw(unit, rng));
}

function tier233TopRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const d1 = intBetween(rng, 1, 9);
  const d2 = intBetween(rng, 1, 9);
  const shown = `${d1}.${d2}`;
  const two = d1 * 10 + d2;
  // 후보 넷 — 작은 것부터. 지면에 나갈 소수는 세 자리를 안 넘는다(R2).
  const cands = [`0.0${d1}${d2}`, `0.${d1}${d2}`, `${two}`, `${two}0`];
  const times = [shown, `${two}`, `${two}00`, `${two}000`];
  const wantTwoDigit = intBetween(rng, 0, 1) === 0;
  const idx = wantTwoDigit ? 1 : 2;
  return make(
    unit,
    `어떤 수의 소수점을 옮겼더니 ${josaNum(shown, "이", "가")} 되었습니다. ` +
      `어느 쪽으로 몇 자리 옮겼는지는 알려 주지 않습니다. 어떤 수의 ${n(100)}배가 ` +
      `${wantTwoDigit ? "두" : "네"} 자리 수일 때 어떤 수를 구하시오.`,
    n(cands[idx]!),
    `소수점을 옮겨 ${josaNum(shown, "이", "가")} 되는 수는 ` +
      `${cands.map((v) => n(v)).join(", ")} 네 가지입니다. ` +
      `각각 ${n(100)}배를 하면 ${times.map((v) => n(v)).join(", ")} 입니다. ` +
      `이 가운데 ${wantTwoDigit ? "두" : "네"} 자리 수는 ${n(times[idx]!)} 하나이므로 ` +
      `어떤 수는 ${n(cands[idx]!)}입니다.`,
  );
}

/**
 * **2-3-4 5단 심화중 — 합이 «범위로만» 주어져 어떤 수가 안 굳는다.**
 * 굳히는 것은 「일의 자리 숫자와 소수 첫째 자리 숫자의 합」이라는 자릿값 조건이고,
 * 후보 아홉을 **끝까지 더해 보지 않고** 자리 숫자만 보아 걸러 낸다(D-115 ⑾ → 중).
 */
function tier234Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier234MidRaw(unit, rng));
}

function tier234MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, DEC1_SUM_FIELD);
  const base = f.L * 10 - f.c;
  const w = Math.floor(base / 10);
  const lowTenth = f.s - w;
  const highTenth = f.s - w - 1;
  return makeDeep(
    unit,
    `어떤 소수 한 자리 수에 ${josaNum(dec1(f.c), "을", "를")} 더했더니 합이 ` +
      `${josaNum(f.L, "보다", "보다")} 크고 ${josaNum(f.L + 1, "보다", "보다")} ` +
      `작았습니다. 어떤 수의 일의 자리 숫자와 소수 첫째 자리 숫자의 합이 ` +
      `${josaNum(f.s, "일", "일")} 때 어떤 수를 구하시오.`,
    n(dec1(f.v)),
    [
      `합에서 더한 수를 빼면 어떤 수이므로, 어떤 수는 ` +
        `${expr(`${f.L}-${dec1(f.c)}=${dec1(base)}`)} 보다 크고 ` +
        `${expr(`${f.L + 1}-${dec1(f.c)}=${dec1(base + 10)}`)} 보다 작습니다.`,
      `그러므로 어떤 수의 일의 자리 숫자는 ${n(w)} 또는 ${n(w + 1)}입니다. ` +
        `${n(w)}이면 소수 첫째 자리 숫자가 ${n(lowTenth)}이고, ${n(w + 1)}이면 ` +
        `${n(highTenth)}입니다.`,
      `이 가운데 위 범위에 드는 것은 ${n(dec1(f.v))} 하나이므로 어떤 수는 ` +
        `${n(dec1(f.v))}입니다.`,
    ],
  );
}

/**
 * **2-3-5 5단 심화중 — 되짚는 자리가 2-3-4 와 반대다.**
 * 그쪽은 «더해지는 수»를, 이쪽은 **«빼는 수»**를 되짚는다. 굳히는 조건도 자리 숫자의
 * «합»이 아니라 «차»다 — 한 대단원 안에서 두 갈래가 같은 문장이 되지 않게 갈랐다.
 */
function tier235Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier235MidRaw(unit, rng));
}

function tier235MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, DEC1_DIFF_FIELD);
  const base = f.a - (f.L + 1) * 10;
  return makeDeep(
    unit,
    `${josaNum(dec1(f.a), "에서", "에서")} 어떤 소수 한 자리 수를 뺐더니 차가 ` +
      `${josaNum(f.L, "보다", "보다")} 크고 ${josaNum(f.L + 1, "보다", "보다")} ` +
      `작았습니다. 뺀 수의 소수 첫째 자리 숫자가 일의 자리 숫자보다 ` +
      `${n(f.k)} 클 때 뺀 수를 구하시오.`,
    n(dec1(f.v)),
    [
      `차가 클수록 뺀 수는 작으므로, 뺀 수는 ` +
        `${expr(`${dec1(f.a)}-${f.L + 1}=${dec1(base)}`)} 보다 크고 ` +
        `${expr(`${dec1(f.a)}-${f.L}=${dec1(base + 10)}`)} 보다 작습니다.`,
      `그 사이의 소수 한 자리 수 가운데 소수 첫째 자리 숫자가 일의 자리 숫자보다 ` +
        `${n(f.k)} 큰 수는 ${n(dec1(f.v))} 하나입니다.`,
      `확인해 보면 ${expr(`${dec1(f.a)}-${dec1(f.v)}=${dec1(f.a - f.v)}`)} 이므로 ` +
        `차가 범위 안에 듭니다. 뺀 수는 ${n(dec1(f.v))}입니다.`,
    ],
  );
}

/**
 * **2-3-6 5단 심화중 — 「받아올림이 있었나」가 마디를 굳힌다.**
 *
 * 어떤 수의 **소수 첫째 자리 숫자만** 감춘다. 합의 소수 첫째 자리 숫자를 알아도
 * 소수 둘째 자리에서 **받아올림이 있었는지**를 먼저 정하지 않으면 그 자리가 안 굳는다 —
 * 받아올림은 「소수 두 자리 수의 덧셈」이라는 이 소단원의 성질 그 자체다.
 */
function tier236Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier236MidRaw(unit, rng));
}

function tier236MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 1, 5);
  const b = intBetween(rng, 1, 9);
  const e = intBetween(rng, 1, 4);
  // 🔴 `b + g` 가 딱 $10$ 이면 합의 소수 둘째 자리가 $0$ 이라 해설에 **꼬리 $0$** 이 뜬다
  //    (「$5.46+2.24=7.70$」). `elemTiersG4Dec` 이 발문·정답·해설 셋 다 센다.
  const g = pick(
    rng,
    [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => (b + v) % 10 !== 0),
  );
  const carry = b + g >= 10 ? 1 : 0;
  // 🔴 소수 첫째 자리에서 **다시 받아올림이 나지 않게** 잡는다 — 그래야 해설이
  //    「$p$ 에서 되짚어 뺀다」로 곧게 서고, 대입해 맞춰 보는 글이 안 된다.
  const f2 = intBetween(rng, 1, 7 - carry);
  const a = intBetween(rng, 1, 9 - f2 - carry);
  const p = a + f2 + carry;
  const c = e * 100 + f2 * 10 + g;
  const value = w * 100 + a * 10 + b;
  const sum = value + c;
  return makeDeep(
    unit,
    `어떤 소수 두 자리 수의 자연수 부분은 ${n(w)}이고 소수 둘째 자리 숫자는 ` +
      `${n(b)}입니다. 이 수에 ${josaNum(dec2(c), "을", "를")} 더했더니 합의 소수 ` +
      `첫째 자리 숫자가 ${josaNum(p, "이", "가")} 되었습니다. 어떤 수를 구하시오.`,
    n(dec2(value)),
    [
      `소수 둘째 자리끼리 더하면 ${expr(`${b}+${g}=${b + g}`)} 이므로 소수 첫째 ` +
        `자리로 ${carry === 1 ? `${n(1)}을 받아올립니다` : "받아올림이 없습니다"}.`,
      `합의 소수 첫째 자리 숫자는 어떤 수의 소수 첫째 자리 숫자에 ${
        carry === 1
          ? `${josaNum(f2, "과", "와")} 받아올린 ${n(1)}을`
          : josaNum(f2, "을", "를")
      } 더한 것이므로, 어떤 수의 소수 첫째 자리 숫자는 ` +
        `${expr(carry === 1 ? `${p}-${f2}-1=${a}` : `${p}-${f2}=${a}`)} 입니다.`,
      `그러므로 어떤 수는 ${n(dec2(value))}입니다. 확인해 보면 ` +
        `${expr(`${dec2(value)}+${dec2(c)}=${dec2(sum)}`)} 입니다.`,
    ],
  );
}

/**
 * **2-3-7 5단 심화중 — 「받아내림이 있었나」가 마디를 굳힌다.**
 * 2-3-6 의 짝이다. 감추는 자리는 같고 성질이 받아올림에서 **받아내림**으로 바뀐다 —
 * 소단원 이름이 약속하는 것이 그것이다.
 */
function tier237Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier237MidRaw(unit, rng));
}

function tier237MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 1, 3);
  const b = intBetween(rng, 1, 9);
  const a = intBetween(rng, 1, 8);
  const value = w * 100 + a * 10 + b;
  const bigW = w + intBetween(rng, 1, 4);
  // 🔴 `bigB` 가 $0$ 이면 빼어지는 수에, `bigB === b` 면 차에 **꼬리 $0$** 이 뜬다.
  const bigB = pick(
    rng,
    [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((v) => v !== b),
  );
  const borrow = bigB < b ? 1 : 0;
  // 🔴 소수 첫째 자리에서 자연수 부분까지 **받아내리지 않게** 잡는다 —
  //    그래야 해설이 「$p$ 에서 되짚어 뺀다」로 곧게 선다(2-3-6 과 같은 규율).
  const bigA = intBetween(rng, a + borrow, 9);
  const big = bigW * 100 + bigA * 10 + bigB;
  const diff = big - value;
  const p = bigA - borrow - a;
  return makeDeep(
    unit,
    `${josaNum(dec2(big), "에서", "에서")} 어떤 소수 두 자리 수를 뺐더니 차의 소수 ` +
      `첫째 자리 숫자가 ${josaNum(p, "이", "가")} 되었습니다. 어떤 수의 자연수 부분은 ` +
      `${n(w)}이고 소수 둘째 자리 숫자는 ${josaNum(b, "일", "일")} 때 어떤 수를 구하시오.`,
    n(dec2(value)),
    [
      borrow === 0
        ? `소수 둘째 자리끼리 빼면 ${expr(`${bigB}-${b}=${bigB - b}`)} 이므로 ` +
          `받아내림이 없습니다.`
        : `소수 둘째 자리는 ${n(bigB)}에서 ${josaNum(b, "을", "를")} 뺄 수 없어 소수 ` +
          `첫째 자리에서 ${josaNum(1, "을", "를")} 받아내립니다. ` +
          `${expr(`${bigB + 10}-${b}=${bigB + 10 - b}`)}`,
      `그러므로 차의 소수 첫째 자리 숫자는 ${n(bigA - borrow)}에서 어떤 수의 소수 ` +
        `첫째 자리 숫자를 뺀 것이고, 그 값이 ${josaNum(p, "이", "가")} 되므로 어떤 수의 ` +
        `소수 첫째 자리 숫자는 ${expr(`${bigA - borrow}-${p}=${a}`)} 입니다.`,
      `그러므로 어떤 수는 ${n(dec2(value))}입니다. 확인해 보면 ` +
        `${expr(`${dec2(big)}-${dec2(value)}=${dec2(diff)}`)} 입니다.`,
    ],
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
  // 세로로 세운다 — 까닭은 `tableFigure` 머리글 참조(D-70 폭 가드).
  // 여기는 이름이 「학생 수(명)」 하나뿐이라 **줄일 것이 없고 전치만으로 선다.**
  return fig("table", {
    headers: [d.theme.item, "학생 수(명)"],
    rows: d.values.map((v) => [v.label, String(v.value)]),
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
  // ── 1-1 큰 수 — **열네 칸 전부 비운다**(확대 넷째 물결, 보고서 §3).
  //    마디를 굳힐 수 있는 성질이 둘뿐이다 — ㉠ 「몇 자리 수인가 / 어느 자리 숫자가
  //    무엇인가」 ㉡ 「$10000$씩 뛰면 그 자리 숫자만 커진다」.
  //    ㉠ 으로 열면 후보가 「도착한 수에서 뛴 수만큼 거꾸로 뺀 내림 사슬」이고 굳힘이
  //    자리 성질이라, **1-6-1 심화중과 구조가 글자 그대로 같다**(물결 3 이 이미 세웠다).
  //    ㉡ 으로 열면(「뛴 수가 둘 중 하나」) 답이 $b-n\times c$ 라 `forwardReachable` 의
  //    허용 꼴 `a\times b\pm c` 그 자체여서 **반증 ⑥ 이 문다**. 「나누어떨어지나」로 피하면
  //    $10000$ 을 나누어떨어뜨리는 수는 $1000$ 도 나누어떨어뜨리므로 죽는 쪽이 늘 같다.
  //    그리고 「잘못 …했더니」는 1-1-6 심화하가 이미 쓰고 위 두 칸에서는 금지다.
  "초4|1-1-1": {
    연산: tier11Calc,
    기본: tier11Basic,
    응용: tier11Apply,
    심화하: tier11Deep,
  },
  "초4|1-1-2": {
    연산: tier12Calc,
    기본: tier12Basic,
    응용: tier12Apply,
    심화하: tier12Deep,
  },
  "초4|1-1-3": {
    연산: tier13Calc,
    기본: tier13Basic,
    응용: tier13Apply,
    심화하: tier13Deep,
  },
  "초4|1-1-4": {
    연산: tier14Calc,
    기본: tier14Basic,
    응용: tier14Apply,
    심화하: tier14Deep,
  },
  "초4|1-1-5": {
    연산: tier15Calc,
    기본: tier15Basic,
    응용: tier15Apply,
    심화하: tier15Deep,
  },
  "초4|1-1-6": {
    연산: tier16Calc,
    기본: tier16Basic,
    응용: tier16Apply,
    심화하: tier16Deep,
  },
  "초4|1-1-7": {
    연산: tier17Calc,
    기본: tier17Basic,
    응용: tier17Apply,
    심화하: tier17Deep,
  },
  "초4|1-2-1": {
    연산: tier21Calc,
    기본: tier21Basic,
    응용: tier21Apply,
    심화하: tier21Deep,
  },
  "초4|1-2-2": {
    연산: tier22Calc,
    기본: tier22Basic,
    응용: tier22Apply,
    심화하: tier22Deep,
  },
  // ── 1-2 각도 — 확대 넷째 물결(D-113). 굳힘 축은 **시각 ↔ 큰 눈금 칸수**다.
  //    🔴 **1-2-1·1-2-2·1-2-4·1-2-5·1-2-6 은 중·상 둘 다 비운다**(보고서 §3).
  //    ㉠ 1-2-2 는 마디가 「$90$을 나눴나 $180$을 나눴나」 하나뿐인데 $180$ 쪽이 늘 크므로
  //       어떤 크기 조건을 걸어도 「크면 직선, 작으면 직각」 한 줄로 닫혀 굳힘이 일을 안 하고,
  //       「나눈 개수가 자연수」로 굳히려 하면 $90$을 나누어떨어뜨리는 수는 $180$ 도
  //       나누어떨어뜨리므로 **죽는 쪽이 늘 같다**(지름길 100%).
  //    ㉡ 1-2-5·1-2-6 이 쓸 마디(「같은 두 각이 어느 것인지 안 말한다」)는 토대 §2.3-㉡ 이
  //       **2-2 에 배정**했다. 1-2 에서 다시 쓰면 한 시험지에 같은 문항이 둘 선다.
  //    ㉢ 1-2-4 심화하가 이미 「잘못 …했더니」이고, 그 포장은 위 두 칸에서 금지다.
  //    ㉣ 1-2-1 은 견줄 뿐이라 계산 거리가 $0$ 이다.
  //    1-2-3 상도 비운다 — 후보가 «시각 둘»뿐이라 「만들어 견주기」가 아니라 「둘 중 고르기」다.
  "초4|1-2-3": {
    연산: tier23Calc,
    기본: tier23Basic,
    응용: tier23Apply,
    심화하: tier23Deep,
    심화중: tier23Mid,
  },
  "초4|1-2-4": {
    연산: tier24Calc,
    기본: tier24Basic,
    응용: tier24Apply,
    심화하: tier24Deep,
  },
  "초4|1-2-5": {
    연산: tier25Calc,
    기본: tier25Basic,
    응용: tier25Apply,
    심화하: tier25Deep,
  },
  "초4|1-2-6": {
    연산: tier26Calc,
    기본: tier26Basic,
    응용: tier26Apply,
    심화하: tier26Deep,
  },
  // ── 1-3 곱셈과 나눗셈 — **여섯 갈래 파일럿** (D-113). 이 일곱만 확대 둘을 갖는다.
  "초4|1-3-1": {
    연산: tier31Calc,
    기본: tier31Basic,
    응용: tier31Apply,
    심화하: tier31Deep,
    심화중: tier31Mid,
    심화상: tier31Top,
  },
  "초4|1-3-2": {
    연산: tier32Calc,
    기본: tier32Basic,
    응용: tier32Apply,
    심화하: tier32Deep,
    심화중: tier32Mid,
    심화상: tier32Top,
  },
  "초4|1-3-3": {
    연산: tier33Calc,
    기본: tier33Basic,
    응용: tier33Apply,
    심화하: tier33Deep,
    심화중: tier33Mid,
    심화상: tier33Top,
  },
  "초4|1-3-4": {
    연산: tier34Calc,
    기본: tier34Basic,
    응용: tier34Apply,
    심화하: tier34Deep,
    심화중: tier34Mid,
    심화상: tier34Top,
  },
  "초4|1-3-5": {
    연산: tier35Calc,
    기본: tier35Basic,
    응용: tier35Apply,
    심화하: tier35Deep,
    심화중: tier35Mid,
    심화상: tier35Top,
  },
  "초4|1-3-6": {
    연산: tier36Calc,
    기본: tier36Basic,
    응용: tier36Apply,
    심화하: tier36Deep,
    심화중: tier36Mid,
    심화상: tier36Top,
  },
  "초4|1-3-7": {
    연산: tier37Calc,
    기본: tier37Basic,
    응용: tier37Apply,
    심화하: tier37Deep,
    심화중: tier37Mid,
    심화상: tier37Top,
  },
  // ── 1-4 평면도형의 이동 — **여덟 칸 전부 비운다**(확대 넷째 물결, 보고서 §3).
  //    되짚을 값이 방향·칸수·각뿐이고 상태 공간이 유한하다 — 돌린 각 후보는
  //    $\{90^\circ,180^\circ,270^\circ\}$ 셋, 뒤집기는 두 방향이다. 마디를 열면
  //    (「몇 번 뒤집었나」) 후보가 홀짝 집합이라 **답이 여럿**이 되고, 안 열면
  //    한 문항으로 굳는다(「같은 각으로 두 번 돌려 처음이 된다」는 $180^\circ$ 하나뿐이다).
  //    그리고 「잘못 …했더니」는 이 대단원 심화하가 **둘**(1-4-1·1-4-2) 쓰고 있어
  //    위 두 칸에서 금지다(토대 §2.3-㉠).
  "초4|1-4-1": {
    연산: tier41Calc,
    기본: tier41Basic,
    응용: tier41Apply,
    심화하: tier41Deep,
  },
  "초4|1-4-2": {
    연산: tier42Calc,
    기본: tier42Basic,
    응용: tier42Apply,
    심화하: tier42Deep,
  },
  "초4|1-4-3": {
    연산: tier43Calc,
    기본: tier43Basic,
    응용: tier43Apply,
    심화하: tier43Deep,
  },
  "초4|1-4-4": {
    연산: tier44Calc,
    기본: tier44Basic,
    응용: tier44Apply,
    심화하: tier44Deep,
  },
  // ── 1-6 규칙 찾기 — 확대 셋째 물결(D-113). 「배열의 자리」가 굳힘 축이다.
  //    🔴 **1-6-3·1-6-4·1-6-5 는 중·상 둘 다 비운다** — 마디를 하나 열려면 «몇씩
  //    커지는가»를 감춰야 하는데 그 후보를 자르는 것이 **약수**(초5-1)라 반증 ③ 이다.
  //    1-6-5 는 기본·응용·심화하의 발문 문장이 글자 그대로 같아 얹을 자리가 없다.
  //    1-6-1 상·1-6-2 중도 비운다 — 근거는 보고서 §3.
  "초4|1-6-1": {
    연산: tier61Calc,
    기본: tier61Basic,
    응용: tier61Apply,
    심화하: tier61Deep,
    심화중: tier61Mid,
  },
  "초4|1-6-2": {
    연산: tier62Calc,
    기본: tier62Basic,
    응용: tier62Apply,
    심화하: tier62Deep,
    심화상: tier62Top,
  },
  "초4|1-6-3": {
    연산: tier63Calc,
    기본: tier63Basic,
    응용: tier63Apply,
    심화하: tier63Deep,
  },
  "초4|1-6-4": {
    연산: tier64Calc,
    기본: tier64Basic,
    응용: tier64Apply,
    심화하: tier64Deep,
  },
  "초4|1-6-5": {
    연산: tier65Calc,
    기본: tier65Basic,
    응용: tier65Apply,
    심화하: tier65Deep,
  },
  // ── 1-5 막대그래프 — 확대 셋째 물결(D-113). 눈금 한 칸이 굳힘 축이다.
  //    🔴 **1-5-3 은 중·상 둘 다 비운다** — 막대를 둘 지우고 전체를 주는 판은
  //    「최댓값을 안 숨기는 **240자리**에서 짝 셋 이상은 **18자리**이고, 그 18에서
  //    «보이는 막대 하나를 기준으로 한 부등식»이 정확히 진짜 짝만 남기는 자리가 **0**」
  //    이다(2026-08-31 적대 검토가 조건 없는 0 을 정정했다 — 옛 문장 「전수에서 0」은
  //    조건을 빼먹어 다음 사람이 그대로 인용하게 되어 있었다).
  //    마디를 하나만 여는 판은 1-5-1 심화중과 같은 일이다. 1-5-1 상도 비운다.
  "초4|1-5-1": {
    연산: tier51Calc,
    기본: tier51Basic,
    응용: tier51Apply,
    심화하: tier51Deep,
    심화중: tier51Mid,
  },
  // 🔴 **1-5-2 는 중·상 둘 다 비운다** — 물결 3 이 세웠다가 **적대 검토가 거뒀다**
  //    (2026-08-31, `…/reports/tier-fill-g4-w3-adversarial.md` §1⑷). 잰 값:
  //    · 중 — 「눈금 한 칸은 모든 막대에 같다」가 후보를 **한 번도 안 갈랐다**. 밭 52자리
  //      전량에서 살아남는 것이 늘 «작은 쪽»이라 「나누어떨어지는 둘 중 작은 쪽」만으로
  //      **20,000/20,000** 맞는다. 밭을 넓혀도(52 → 64) 지름길이 81.3% 라 미봉이다.
  //    · 상 — 「칸 수의 차」를 **아예 안 읽어도** 19,656/20,000(98.3%)에서 답이 하나다.
  //      마지막 거르개가 위로 닫힌 집합이라 「살아남은 것 중 가장 큰 것」이 **설계상 100%**.
  //    🔴 뿌리는 `BAR_SCALES` 의 「값 넷이 모두 `step` 의 배수」 격자다 — 그 격자가
  //       지름길을 **강제**한다(후보가 정확히 둘인 한 큰 쪽 생존이 0). 되살리려면 갈래를
  //       다시 짜기 전에 **규모부터 넓혀라** — 1-5-3 비움도 같은 뿌리다(보고서 §10-6).
  "초4|1-5-2": {
    연산: tier52Calc,
    기본: tier52Basic,
    응용: tier52Apply,
    심화하: tier52Deep,
  },
  "초4|1-5-3": {
    연산: tier53Calc,
    기본: tier53Basic,
    응용: tier53Apply,
    심화하: tier53Deep,
  },
  // ── 2-1 분수의 덧셈과 뺄셈 — 확대 둘째 물결(D-113). **심화상은 2-1-2 하나**다:
  //    덧셈 쪽은 「합이 같은 쌍」을 더해도 서로 구분되지 않아 견줄 것이 생기지 않고,
  //    대분수 쪽은 후보가 «분자 하나의 구간»이라 조건이 늘 컷으로 닫힌다.
  "초4|2-1-1": {
    연산: tier211Calc,
    기본: tier211Basic,
    응용: tier211Apply,
    심화하: tier211Deep,
    심화중: tier211Mid,
  },
  "초4|2-1-2": {
    연산: tier212Calc,
    기본: tier212Basic,
    응용: tier212Apply,
    심화하: tier212Deep,
    심화중: tier212Mid,
    심화상: tier212Top,
  },
  "초4|2-1-3": {
    연산: tier213Calc,
    기본: tier213Basic,
    응용: tier213Apply,
    심화하: tier213Deep,
    심화중: tier213Mid,
  },
  "초4|2-1-4": {
    연산: tier214Calc,
    기본: tier214Basic,
    응용: tier214Apply,
    심화하: tier214Deep,
    심화중: tier214Mid,
  },
  // ── 2-2 삼각형 — 확대 넷째 물결(D-113). 굳힘 축은 **이등변의 «어느 둘이 같은지»**다
  //    (토대 §2.3-㉡ 이 이 마디를 2-2 에 배정했다).
  //    🔴 **2-2-5 는 반증 ④ 로 비운다** — «기본»이 이미 그 마디를 열고 「크기가 같은 두 각이
  //       모두 둔각일 수는 없다」로 굳힌다(씨앗 32 전량 확인, 보고서 §5). 그 위에 심화중을
  //       얹으면 사다리가 접힌다.
  //    🔴 **2-2-3·2-2-4 도 비운다** — 2-2-3 은 성질이 「세 변·세 각이 모두 같다」 하나뿐이라
  //       어떤 값을 줘도 $\times3/\div3$ 한 번에 굳고, 2-2-4 는 두 각을 주면 나머지가 늘
  //       하나로 굳는다(안 굳게 하려면 2-2-2 의 개념을 끌어와야 해서 반증 ③).
  //    🔴 **심화상은 다섯 소단원 전부 비운다** — 이등변의 갈래는 언제나 **둘**이라
  //       「만들어 견주기」가 아니라 「둘 중 고르기」이고, 그건 심화중의 정의 그 자체다.
  //       후보를 셋 이상 만들려면 삼각형 부등식(초4 교과 밖)이나 둘레의 약수(초5)가 필요하다.
  "초4|2-2-1": {
    연산: tier221Calc,
    기본: tier221Basic,
    응용: tier221Apply,
    심화하: tier221Deep,
    심화중: tier221Mid,
  },
  "초4|2-2-2": {
    연산: tier222Calc,
    기본: tier222Basic,
    응용: tier222Apply,
    심화하: tier222Deep,
    심화중: tier222Mid,
  },
  "초4|2-2-3": {
    연산: tier223Calc,
    기본: tier223Basic,
    응용: tier223Apply,
    심화하: tier223Deep,
  },
  "초4|2-2-4": {
    연산: tier224Calc,
    기본: tier224Basic,
    응용: tier224Apply,
    심화하: tier224Deep,
  },
  "초4|2-2-5": {
    연산: tier225Calc,
    기본: tier225Basic,
    응용: tier225Apply,
    심화하: tier225Deep,
  },
  // ── 2-3 소수의 덧셈과 뺄셈 — 확대 둘째 물결(D-113).
  //    🔴 **2-3-2(소수의 크기 비교)는 중·상 둘 다 비운다.** 그 소단원이 약속하는 것은
  //    「자리마다 차례로 견준다」 하나뿐이라 무엇을 물어도 **컷으로 닫히고**(범위를 주면
  //    답이 곧 그 범위다), 심화하가 이미 「범위 + 한 자리 고정 → 모두 쓰시오」다.
  //    위 칸에서 그 꼴을 다시 쓰면 반증 ⑤(「모두」를 지워도 답이 그대로)에 걸린다.
  "초4|2-3-1": {
    연산: tier231Calc,
    기본: tier231Basic,
    응용: tier231Apply,
    심화하: tier231Deep,
    심화중: tier231Mid,
  },
  "초4|2-3-2": {
    연산: tier232Calc,
    기본: tier232Basic,
    응용: tier232Apply,
    심화하: tier232Deep,
  },
  "초4|2-3-3": {
    연산: tier233Calc,
    기본: tier233Basic,
    응용: tier233Apply,
    심화하: tier233Deep,
    심화중: tier233Mid,
    심화상: tier233Top,
  },
  "초4|2-3-4": {
    연산: tier234Calc,
    기본: tier234Basic,
    응용: tier234Apply,
    심화하: tier234Deep,
    심화중: tier234Mid,
  },
  "초4|2-3-5": {
    연산: tier235Calc,
    기본: tier235Basic,
    응용: tier235Apply,
    심화하: tier235Deep,
    심화중: tier235Mid,
  },
  "초4|2-3-6": {
    연산: tier236Calc,
    기본: tier236Basic,
    응용: tier236Apply,
    심화하: tier236Deep,
    심화중: tier236Mid,
  },
  "초4|2-3-7": {
    연산: tier237Calc,
    기본: tier237Basic,
    응용: tier237Apply,
    심화하: tier237Deep,
    심화중: tier237Mid,
  },
  "초4|2-4-1": {
    연산: tier241Calc,
    기본: tier241Basic,
    응용: tier241Apply,
    심화하: tier241Deep,
  },
  // ── 2-4 사각형 — 확대 셋째 물결(D-113). 「이름이 성질을 되돌려 준다」가 굳힘 축이다.
  //    🔴 **심화상은 일곱 소단원 모두 비운다** — 2-4-7 의 후보 무리(사다리꼴·평행사변형·
  //    마름모·직사각형·정사각형)는 **교과 어휘가 주는 것**이라 「되짚기가 만든다」를 어기고
  //    (토대 §3-㉡), 나머지 여섯은 셈 축이 ×4·÷4·합·차 하나뿐인 일차·단조라 컷으로 닫힌다.
  //    2-4-1·2-4-4·2-4-6 은 심화중도 비운다 — 근거는 보고서 §3.
  "초4|2-4-2": {
    연산: tier242Calc,
    기본: tier242Basic,
    응용: tier242Apply,
    심화하: tier242Deep,
    심화중: tier242Mid,
  },
  "초4|2-4-3": {
    연산: tier243Calc,
    기본: tier243Basic,
    응용: tier243Apply,
    심화하: tier243Deep,
    심화중: tier243Mid,
  },
  "초4|2-4-4": {
    연산: tier244Calc,
    기본: tier244Basic,
    응용: tier244Apply,
    심화하: tier244Deep,
  },
  // 🔴 **2-4-5 심화중은 비운다** — 물결 3 이 세웠다가 **적대 검토가 거뒀다**
  //    (2026-08-31, 원장 §1⑵·§1⑶). 「마주 보는 두 변은 길이가 같다」가 죽이는 가지가
  //    **산술 모순**($P=4a$)이라 답에 미치는 영향이 0이고, 답이 같은 소단원 **응용과
  //    같은 닫힌 꼴** $P\div2-a$ 다 — 발문의 수와 정답이 통째로 같은 자리가 **110/110**.
  //    응용이 이미 그 길을 순방향으로 쓰므로 그 위에 마디 하나만 여는 판이 안 선다.
  //    ⚠️ 밭 범위를 응용 밖으로 미는 것은 **미봉**이다 — 겹침 수치만 0이 되고 답이
  //       여전히 $P\div2-a$ 라 반증 ⑥ 이 그대로 남는다.
  "초4|2-4-5": {
    연산: tier245Calc,
    기본: tier245Basic,
    응용: tier245Apply,
    심화하: tier245Deep,
  },
  "초4|2-4-6": {
    연산: tier246Calc,
    기본: tier246Basic,
    응용: tier246Apply,
    심화하: tier246Deep,
  },
  "초4|2-4-7": {
    연산: tier247Calc,
    기본: tier247Basic,
    응용: tier247Apply,
    심화하: tier247Deep,
    심화중: tier247Mid,
  },
  // ── 2-6 다각형 — 확대 둘째 물결(D-113).
  //    🔴 **2-6-3(대각선)은 중·상 둘 다 비운다** — 심화하 해설이 이미 대각선 표를
  //    «만들어 견주므로»(상의 길) 위에 얹으면 사다리가 접힌다.
  //    2-6-1·2-6-2 는 **심화상만** 비운다 — 후보가 창 안의 정수 둘뿐이라
  //    「만들어 견주기」가 아니라 「둘 중 고르기」이고 그건 심화중의 정의다.
  "초4|2-6-1": {
    연산: tier261Calc,
    기본: tier261Basic,
    응용: tier261Apply,
    심화하: tier261Deep,
    심화중: tier261Mid,
  },
  "초4|2-6-2": {
    연산: tier262Calc,
    기본: tier262Basic,
    응용: tier262Apply,
    심화하: tier262Deep,
    심화중: tier262Mid,
  },
  "초4|2-6-3": {
    연산: tier263Calc,
    기본: tier263Basic,
    응용: tier263Apply,
    심화하: tier263Deep,
  },
  "초4|2-6-4": {
    연산: tier264Calc,
    기본: tier264Basic,
    응용: tier264Apply,
    심화하: tier264Deep,
    심화중: tier264Mid,
    심화상: tier264Top,
  },
  // ── 2-5 꺾은선그래프 — 확대 넷째 물결(D-113). 굳힘 축은 **기준값을 안 준다**이고,
  //    값을 감추는 축은 1-5(막대)가 가져갔다(토대 §2.3-㉢). `lineChart` 는 «가려진 값»을
  //    못 받으므로(`CHART_ACCEPTS_UNKNOWN`) 값을 지우는 판은 그림이 **표**인 2-5-3 뿐이다.
  //    🔴 **2-5-1 은 중·상 둘 다 비운다** — 응용이 이미 「한가운데 값」이고 심화하가
  //       「늘어난 구간만 골라 더하기」라, 남은 마디를 열면 «구간을 하나씩 훑기»가 되어
  //       반증 ③·⑤ 에 같이 걸린다.
  //    🔴 **2-5-2 상**은 비운다 — 꺾은선은 값을 못 가려 후보를 만들 재료가 자체적으로 없다.
  //    🔴 **2-5-3 중**은 비운다 — 값을 하나만 지우면 「눈금 한 칸으로 나누어떨어진다」가
  //       후보를 하나로 줄이려면 이웃 사이가 정확히 두 칸이어야 하고, 그러면 답이 늘
  //       **한가운데**라 지름길이 100% 다(보고서 §3).
  "초4|2-5-1": {
    연산: tier251Calc,
    기본: tier251Basic,
    응용: tier251Apply,
    심화하: tier251Deep,
  },
  "초4|2-5-2": {
    연산: tier252Calc,
    기본: tier252Basic,
    응용: tier252Apply,
    심화하: tier252Deep,
    심화중: tier252Mid,
  },
  "초4|2-5-3": {
    연산: tier253Calc,
    기본: tier253Basic,
    응용: tier253Apply,
    심화하: tier253Deep,
    심화상: tier253Top,
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
    `${n(d)}씩 커지는 규칙입니다. ${ORDINAL[k - 2]!} 수는 ${expr(`${a}+${d}\\times${k - 2}=${a + d * (k - 2)}`)}${numRo(a + d * (k - 2))} ` +
      `${n(L)}보다 크지 않고, ${ORDINAL[k - 1]!} 수는 ${expr(`${a}+${d}\\times${k - 1}=${a + d * (k - 1)}`)}${numRo(a + d * (k - 1))} ` +
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
  // ⚠️ 예전에는 「첫째부터 넷째까지 모두 몇 개」였다 — 규칙을 찾아 **더하기만** 한다.
  //    그런데 같은 소단원 응용은 「모형이 $19$개인 것은 몇째인가」로 **되짚는다** —
  //    사다리가 뒤집혀 있었다. 그래서 심화는 «누적»을 되짚는다(응용보다 한 겹 위).
  const s = intBetween(rng, 1, 5);
  const d = intBetween(rng, 2, 6);
  const upto = intBetween(rng, 4, 6);
  const t = Array.from({ length: upto }, (_, i) => s + d * i);
  const total = t.reduce((x, y) => x + y, 0);
  return makeDeep(
    unit,
    `모형을 규칙에 따라 늘어놓았습니다. 첫째는 ${n(s)}개, 둘째는 ${n(s + d)}개, ` +
      `셋째는 ${n(s + d * 2)}개입니다. 첫째부터 몇째까지 놓으면 모형이 모두 ` +
      `${n(total)}개가 되는가?`,
    ORDINAL[upto - 1]!,
    [
      `${n(d)}개씩 늘어나므로 넷째부터는 ${expr(`${t[2]}+${d}=${t[3]}`)} 개, ` +
        `그다음은 ${n(d)}개씩 더 놓습니다.`,
      `차례로 더하면 ${expr(`${t.join("+")}=${total}`)} 이므로 ${ORDINAL[upto - 1]!}까지입니다.`,
    ],
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

/** 문형 05 — 왼쪽 빈칸. */
function eq165LeftBlank(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 11, 30);
  const b = intBetween(rng, 11, 40);
  const c3 = intBetween(rng, 11, 40);
  return make(
    unit,
    `등호(=)의 양쪽이 같아지도록 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
      `${expr(`\\square+${a}=${b}+${c3}`)}`,
    n(b + c3 - a),
    `오른쪽은 ${expr(`${b}+${c3}=${b + c3}`)} 입니다. ${expr(`${b + c3}-${a}=${b + c3 - a}`)} 이므로 ` +
      `${expr("\\square")} 에 알맞은 수는 ${n(b + c3 - a)}입니다.`,
  );
}

/** 문형 06 — 덧셈 교환. 식 모양만 보면 03 과 같으므로 발문이 교환을 묻는다. */
function eq165Commute(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 11, 40);
  const b = intBetween(rng, 11, 40);
  return make(
    unit,
    `덧셈의 교환법칙을 이용하여 등호(=)의 양쪽이 같아지도록 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
      `${expr(`${a}+${b}=${b}+\\square`)}`,
    n(a),
    `더하는 순서를 바꾸어도 합은 같으므로 ${expr("\\square")} 는 ${n(a)}입니다.`,
  );
}

/** 문형 07 — 세 수의 합에서 가운데 빈칸. */
function eq165MiddleBlank(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 11, 30);
  const x = intBetween(rng, 11, 30);
  const c3 = intBetween(rng, 11, 30);
  const s = a + x + c3;
  return make(
    unit,
    `등호(=)의 양쪽이 같아지도록 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
      `${expr(`${a}+\\square+${c3}=${s}`)}`,
    n(x),
    `오른쪽이 ${n(s)}이므로 ${expr(`${s}-${a}-${c3}=${x}`)} 입니다.`,
  );
}

/** 문형 08 — 뺄셈 등호. □ 가 양수가 되게 차를 먼저 잡는다. */
function eq165Sub(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 11, 20);
  const left = intBetween(rng, 5, 18);
  const a = b + left;
  const box = intBetween(rng, 2, 20);
  const c3 = left + box;
  return make(
    unit,
    `등호(=)의 양쪽이 같아지도록 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
      `${expr(`${a}-${b}=${c3}-\\square`)}`,
    n(box),
    `왼쪽은 ${expr(`${a}-${b}=${left}`)} 입니다. ${expr(`${c3}-${left}=${box}`)} 이므로 ` +
      `${expr("\\square")} 에 알맞은 수는 ${n(box)}입니다.`,
  );
}

/** 문형 09 — 왼쪽 빈칸 뺄셈(두 단계). */
function eq165LeftSub(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 11, 30);
  const b = intBetween(rng, 11, 30);
  const c3 = intBetween(rng, 11, 30);
  return make(
    unit,
    `등호(=)의 양쪽이 같아지도록 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
      `${expr(`\\square-${a}=${b}+${c3}`)}`,
    n(a + b + c3),
    `오른쪽은 ${expr(`${b}+${c3}=${b + c3}`)} 입니다. ${expr(`${b + c3}+${a}=${a + b + c3}`)} 이므로 ` +
      `${expr("\\square")} 에 알맞은 수는 ${n(a + b + c3)}입니다.`,
  );
}

/** 문형 10 — 합을 곱으로 (두 단계). 곱이 24 이상이라 a 범위가 안 뒤집힌다. */
function eq165Times(unit: UnitSeed, rng: Rng): ElemProblem {
  const c3 = intBetween(rng, 2, 5);
  const k = intBetween(rng, Math.ceil(24 / c3), 12);
  const product = k * c3;
  const a = intBetween(rng, 11, product - 11);
  const b = product - a;
  return make(
    unit,
    `등호(=)의 양쪽이 같아지도록 ${expr("\\square")} 에 알맞은 수를 쓰시오. ` +
      `${expr(`${a}+${b}=\\square\\times${c3}`)}`,
    n(k),
    `왼쪽의 합은 ${expr(`${a}+${b}=${product}`)} 입니다. ${expr(`${product}\\div${c3}=${k}`)} 이므로 ` +
      `${expr("\\square")} 에 알맞은 수는 ${n(k)}입니다.`,
  );
}

/** 문형용 섞기 — 보기 순서가 답 순서가 되지 않게. */
function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/* ── 1-1-1 문형 05–10. 01–04 는 기존 4단을 감싼다. 규모는 10000 띠. ── */

/** 문형 05 — 만이라고 읽는 수를 고른다. */
function big111WhichMan(unit: UnitSeed, rng: Rng): ElemProblem {
  const others = pickDistinct(rng, [1000, 2000, 5000, 9000, 9999], 2);
  const shown = shuffled(rng, [10000, others[0]!, others[1]!]);
  return make(
    unit,
    `다음 수 중 만이라고 읽는 수를 쓰시오. ${shown.map((v) => n(v)).join(", ")}`,
    n(10000),
    `${n(1000)}이 ${n(10)}개인 수가 만입니다. ${n(10000)}을 만이라고 읽습니다.`,
  );
}

/** 문형 06 — 1000씩 몇 번 빼면 남는가. */
function big111MinusThousands(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 1, 8);
  return make(
    unit,
    `${n(10000)}에서 ${n(1000)}을 ${n(k)}번 빼면 얼마인가?`,
    n(10000 - 1000 * k),
    `${expr(`1000\\times${k}=${1000 * k}`)} 이고 ${expr(`10000-${1000 * k}=${10000 - 1000 * k}`)} 입니다.`,
  );
}

/** 문형 07 — 묶음 수(02 의 역방향). */
function big111BundleCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const t = pick(rng, MAN_ITEMS);
  const k = intBetween(rng, 2, 10);
  const total = k * 1000;
  return make(
    unit,
    `${josa(t.obj, "이", "가")} ${n(total)}${t.cnt} 있습니다. ${n(1000)}${t.cnt}씩 묶으면 몇 묶음인가?`,
    `${n(k)}묶음`,
    `${expr(`${total}\\div1000=${k}`)} 이므로 ${n(k)}묶음입니다.`,
  );
}

/** 문형 08 — 10000원에 모자라는 금액. */
function big111Shortfall(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 1, 8);
  const b = intBetween(rng, 1, 9);
  const have = a * 1000 + b * 100;
  const need = 10000 - have;
  return make(
    unit,
    `${n(1000)}원짜리 지폐 ${n(a)}장과 ${n(100)}원짜리 동전 ${n(b)}개를 모았습니다. ` +
      `${n(10000)}원이 되려면 얼마가 모자라는가?`,
    `${n(need)}원`,
    `지금 모은 돈은 ${expr(`1000\\times${a}+100\\times${b}=${have}`)} 원입니다. ` +
      `${expr(`10000-${have}=${need}`)} 이므로 ${n(need)}원 모자랍니다.`,
  );
}

/** 문형 09 — 천 묶음과 백 묶음 중 더 큰 수. */
function big111BiggerUnit(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 10);
  const b = intBetween(rng, 10, 90);
  const x = 1000 * a;
  const y = 100 * b;
  const big = Math.max(x, y);
  return make(
    unit,
    `${n(1000)}이 ${n(a)}개인 수와 ${n(100)}이 ${n(b)}개인 수 중 더 큰 수를 쓰시오.`,
    n(big),
    `${n(1000)}이 ${n(a)}개인 수는 ${n(x)}, ${n(100)}이 ${n(b)}개인 수는 ${n(y)}입니다. ` +
      `더 큰 수는 ${n(big)}입니다.`,
  );
}

/** 문형 10 — 10000에서 덜어 낸 뒤 천이 몇 개인가. */
function big111ThousandsLeft(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 1, 9) * 1000;
  const left = 10000 - k;
  return make(
    unit,
    `${n(10000)}보다 ${n(k)} 작은 수는 ${n(1000)}이 몇 개인 수인가?`,
    n(left / 1000),
    `${expr(`10000-${k}=${left}`)} 이고 ${expr(`${left}\\div1000=${left / 1000}`)} 이므로 ` +
      `${n(1000)}이 ${n(left / 1000)}개인 수입니다.`,
  );
}

/* ── 1-1-2 문형 05–10. 규모는 다섯 자리. ── */

function digits5(rng: Rng): number[] {
  return [
    intBetween(rng, 1, 9),
    intBetween(rng, 0, 9),
    intBetween(rng, 0, 9),
    intBetween(rng, 0, 9),
    intBetween(rng, 0, 9),
  ];
}

function fromDigits(d: readonly number[]): number {
  return Number(d.join(""));
}

/** 문형 05 — 자리 숫자. */
function big112PlaceDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = digits5(rng);
  const at = intBetween(rng, 0, 4);
  const place = PLACE5[at]!;
  const value = fromDigits(d);
  return make(
    unit,
    `${n(value)}에서 ${place}의 자리 숫자를 쓰시오.`,
    n(d[at]!),
    `${n(value)}의 ${place}의 자리 숫자는 ${n(d[at]!)}입니다.`,
  );
}

/** 문형 06 — 자리 숫자가 나타내는 값. */
function big112PlaceValue(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = digits5(rng);
  const at = intBetween(rng, 0, 4);
  const place = PLACE5[at]!;
  const value = fromDigits(d);
  const worth = d[at]! * 10 ** (4 - at);
  return make(
    unit,
    `${n(value)}에서 ${place}의 자리 숫자가 나타내는 값을 쓰시오.`,
    n(worth),
    `${place}의 자리 숫자가 ${n(d[at]!)}이므로 ${josaNum(worth, "을", "를")} 나타냅니다.`,
  );
}

/** 문형 07 — 다섯 자리 수 고르기. */
function big112PickFiveDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const five = fromDigits(digits5(rng));
  const fourA = intBetween(rng, 1000, 9999);
  const fourB = intBetween(rng, 1000, 9999);
  const shown = shuffled(rng, [five, fourA, fourB]);
  return make(
    unit,
    `다음 수 중 다섯 자리 수를 쓰시오. ${shown.map((v) => n(v)).join(", ")}`,
    n(five),
    `${n(five)}은 숫자가 ${n(5)}개인 다섯 자리 수입니다.`,
  );
}

/** 문형 08 — 각 자리 숫자의 합. */
function big112DigitSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = digits5(rng);
  const value = fromDigits(d);
  const sum = d.reduce((s, x) => s + x, 0);
  return make(
    unit,
    `${n(value)}의 각 자리 숫자의 합을 구하시오.`,
    n(sum),
    `${expr(`${d.join("+")}=${sum}`)} 이므로 합은 ${n(sum)}입니다.`,
  );
}

/** 문형 09 — 홀수인 가장 큰 다섯 자리 수. 카드는 답 순서가 아니게 보여 준다. */
function big112OddMax(unit: UnitSeed, rng: Rng): ElemProblem {
  let cards = pickDistinct(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5);
  for (let i = 0; i < 12 && !cards.some((c) => c % 2 === 1); i += 1) {
    cards = pickDistinct(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5);
  }
  const odds = cards.filter((c) => c % 2 === 1);
  if (odds.length === 0) {
    throw new Error("홀수 카드가 없습니다");
  }
  const ones = Math.min(...odds);
  const rest = [...cards];
  rest.splice(rest.indexOf(ones), 1);
  rest.sort((a, b) => b - a);
  if (rest[0] === 0) {
    const nz = rest.findIndex((c) => c > 0);
    [rest[0], rest[nz]!] = [rest[nz]!, 0];
  }
  const ansDigits = [...rest, ones];
  const answer = fromDigits(ansDigits);
  let show = cards;
  if (show.join("") === ansDigits.join("")) {
    show = [show[1]!, show[0]!, ...show.slice(2)];
  }
  const listing = show.map((c) => n(c)).join(", ");
  return make(
    unit,
    `숫자 카드 ${listing}${tail(show[4]!, "이", "가")} 한 장씩 있습니다. 카드를 한 번씩 모두 ` +
      `사용하여 만들 수 있는 홀수인 가장 큰 다섯 자리 수를 쓰시오.`,
    n(answer),
    `일의 자리에 가장 작은 홀수 ${n(ones)}을 놓고, 나머지 숫자를 큰 것부터 놓으면 ${n(answer)}입니다.`,
    fig("numberCards", { cards: show.map(String) }),
  );
}

/** 문형 10 — 0이 아닌 자리 숫자의 개수. */
function big112NonzeroCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = digits5(rng);
  // 0이 하나도 없으면 답이 늘 5라 변형이 안 갈린다 — 한 자리는 0으로 둔다.
  d[intBetween(rng, 1, 4)] = 0;
  const value = fromDigits(d);
  const cnt = d.filter((x) => x !== 0).length;
  return make(
    unit,
    `${n(value)}에서 ${n(0)}이 아닌 자리 숫자는 모두 몇 개인가?`,
    n(cnt),
    `${n(0)}이 아닌 자리 숫자는 ${cnt}개입니다.`,
  );
}

/* ── 1-1-3 문형 05–10. 규모는 십만~구천만. ── */

function manCount(rng: Rng): number {
  return intBetween(rng, 2, 9) * pick(rng, [10, 100, 1000]);
}

/** 문형 05 — 10000이 n개인 수는 100이 몇 개. 02 의 n×10000 과 셈을 가른다. */
function big113TimesMan(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = manCount(rng);
  return make(
    unit,
    `${n(10000)}이 ${n(count)}개인 수는 ${n(100)}이 몇 개인 수인가?`,
    n(count * 100),
    `${n(10000)}은 ${n(100)}이 ${n(100)}개이므로 ${expr(`100\\times${count}=${count * 100}`)} 개입니다.`,
  );
}

/** 문형 06 — 값을 만 단위로 읽는다. 01 은 「1000이 몇 개」라 지문이 겹치지 않게. */
function big113HowManyMan(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = manCount(rng);
  const value = 10000 * count;
  return make(
    unit,
    `${n(value)}은 몇 만인가?`,
    `${n(count)}만`,
    `${n(10000)}은 ${n(1)}만이므로 ${expr(`${value}\\div10000=${count}`)} 에서 ${n(count)}만입니다.`,
  );
}

/** 문형 07 — 10000이 n개인 수는 몇 만인가. */
function big113AsManUnit(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 2, 9) * 10;
  return make(
    unit,
    `${n(10000)}이 ${n(count)}개인 수는 몇 만인가?`,
    `${n(count)}만`,
    `${n(10000)}은 ${n(1)}만이므로 ${n(10000)}이 ${n(count)}개인 수는 ${n(count)}만입니다.`,
  );
}

/** 문형 08 — 만원권과 천원권을 더한다. */
function big113MixBills(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9) * pick(rng, [10, 100]);
  const b = intBetween(rng, 2, 9);
  const v = 10000 * a + 1000 * b;
  return make(
    unit,
    `${n(10000)}원짜리 지폐 ${n(a)}장과 ${n(1000)}원짜리 지폐 ${n(b)}장의 합은 얼마인가?`,
    `${n(v)}원`,
    `${expr(`10000\\times${a}=${10000 * a}`)} 이고 ${expr(`1000\\times${b}=${1000 * b}`)} 입니다. ` +
      `${expr(`${10000 * a}+${1000 * b}=${v}`)} 이므로 모두 ${n(v)}원입니다.`,
  );
}

/** 문형 09 — 10으로 나눈다. 「N이 몇 개」 꼴은 01 과 지문이 겹친다. */
function big113AsTens(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = manCount(rng);
  const value = 10000 * count;
  return make(
    unit,
    `${josaNum(value, "을", "를")} ${roJosa(10)} 나누면 얼마인가?`,
    n(value / 10),
    `${expr(`${value}\\div10=${value / 10}`)} 입니다.`,
  );
}

/** 문형 10 — 10000 묶음을 더 얹는다. */
function big113AddMans(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 8) * pick(rng, [10, 100]);
  const b = intBetween(rng, 1, 9) * 10;
  const v = 10000 * (a + b);
  return make(
    unit,
    `${n(10000)}이 ${n(a)}개인 수보다 ${n(10000)}이 ${n(b)}개 더 큰 수를 쓰시오.`,
    n(v),
    `${n(10000)}이 ${expr(`${a}+${b}=${a + b}`)} 개인 수이므로 ${expr(`10000\\times${a + b}=${v}`)} 입니다.`,
  );
}

/* ── 1-1-4 문형 05–10. 1-1-5 와 단위만 바꾼 복붙이 되지 않게 표면을 가른다. ── */

/** 문형 05 — 억은 만이 몇 개인가. */
function big114MansInEok(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9);
  return make(
    unit,
    `${n(a)}억은 만이 몇 개인 수인가?`,
    n(a * 10000),
    `${n(1)}억은 만이 ${n(10000)}개인 수이므로 ${n(a)}억은 ${n(a * 10000)}개입니다.`,
  );
}

/** 문형 06 — 1000만씩 묶음 수. */
function big114ThousandManBundles(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9);
  return make(
    unit,
    `${n(a)}억을 ${n(1000)}만씩 묶으면 몇 묶음인가?`,
    `${n(a * 10)}묶음`,
    `${n(1)}억은 ${n(1000)}만이 ${n(10)}개이므로 ${expr(`10\\times${a}=${a * 10}`)} 묶음입니다.`,
  );
}

/** 문형 07 — 만이 n개인 수는 몇 억인가. */
function big114MansToEok(unit: UnitSeed, rng: Rng): ElemProblem {
  const mans = intBetween(rng, 2, 9) * 10000;
  return make(
    unit,
    `만이 ${n(mans)}개인 수는 몇 억인가?`,
    `${n(mans / 10000)}억`,
    `만이 ${n(10000)}개이면 ${n(1)}억이므로 ${expr(`${mans}\\div10000=${mans / 10000}`)} 에서 ${n(mans / 10000)}억입니다.`,
  );
}

/** 문형 08 — 억과 만을 수로 바꿔 비교. */
function big114CompareEokMan(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 1, 4);
  const mans = pick(rng, [5000, 15000, 25000, 35000]);
  const x = a * 100000000;
  const y = mans * 10000;
  const big = Math.max(x, y);
  return make(
    unit,
    `${n(a)}억과 ${n(mans)}만 중 더 큰 수를 쓰시오.`,
    n(big),
    `${n(a)}억은 ${n(x)}, ${n(mans)}만은 ${n(y)}입니다. 더 큰 수는 ${n(big)}입니다.`,
  );
}

/** 문형 09 — 억에서 만을 뺀다. */
function big114EokMinusMan(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9);
  const b = intBetween(rng, 1, 9) * 1000;
  const v = a * 100000000 - b * 10000;
  return make(
    unit,
    `${n(a)}억에서 ${n(b)}만을 빼면 얼마인가?`,
    n(v),
    `${n(a)}억은 ${n(a * 100000000)}, ${n(b)}만은 ${n(b * 10000)}이므로 ` +
      `${expr(`${a * 100000000}-${b * 10000}=${v}`)} 입니다.`,
  );
}

/** 문형 10 — 억보다 만만큼 큰 수. 09 의 빼기와 방향을 가른다. */
function big114EokLessMan(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9);
  const b = intBetween(rng, 1, 9) * 1000;
  const v = a * 100000000 + b * 10000;
  return make(
    unit,
    `${n(a)}억보다 ${n(b)}만 큰 수를 쓰시오.`,
    n(v),
    `${expr(`${a * 100000000}+${b * 10000}=${v}`)} 입니다.`,
  );
}

/* ── 1-1-5 문형 05–10. 1-1-4 와 문형 표면을 갈랐다. ── */

/** 문형 05 — 조는 억이 몇 개인가. */
function big115EoksInJo(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9);
  return make(
    unit,
    `${n(a)}조는 억이 몇 개인 수인가?`,
    n(a * 10000),
    `${n(1)}조는 억이 ${n(10000)}개인 수이므로 ${n(a)}조는 ${n(a * 10000)}개입니다.`,
  );
}

/** 문형 06 — 1000억씩 묶음 수. */
function big115ThousandEokBundles(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9);
  return make(
    unit,
    `${n(a)}조를 ${n(1000)}억씩 묶으면 몇 묶음인가?`,
    `${n(a * 10)}묶음`,
    `${n(1)}조는 ${n(1000)}억이 ${n(10)}개이므로 ${expr(`10\\times${a}=${a * 10}`)} 묶음입니다.`,
  );
}

/** 문형 07 — 억이 n개인 수는 몇 조인가. */
function big115EoksToJo(unit: UnitSeed, rng: Rng): ElemProblem {
  const eoks = intBetween(rng, 2, 9) * 10000;
  return make(
    unit,
    `억이 ${n(eoks)}개인 수는 몇 조인가?`,
    `${n(eoks / 10000)}조`,
    `억이 ${n(10000)}개이면 ${n(1)}조이므로 ${expr(`${eoks}\\div10000=${eoks / 10000}`)} 에서 ${n(eoks / 10000)}조입니다.`,
  );
}

/** 문형 08 — 조와 억을 수로 바꿔 비교. */
function big115CompareJoEok(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 1, 4);
  const eoks = pick(rng, [5000, 15000, 25000, 35000]);
  const x = a * 1000000000000;
  const y = eoks * 100000000;
  const big = Math.max(x, y);
  return make(
    unit,
    `${n(a)}조와 ${n(eoks)}억 중 더 큰 수를 쓰시오.`,
    n(big),
    `${n(a)}조는 ${n(x)}, ${n(eoks)}억은 ${n(y)}입니다. 더 큰 수는 ${n(big)}입니다.`,
  );
}

/** 문형 09 — 조에서 억을 뺀다. */
function big115JoMinusEok(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9);
  const c = intBetween(rng, 1, 9) * 1000;
  const v = a * 1000000000000 - c * 100000000;
  return make(
    unit,
    `${n(a)}조에서 ${n(c)}억을 빼면 얼마인가?`,
    n(v),
    `${n(a)}조는 ${n(a * 1000000000000)}, ${n(c)}억은 ${n(c * 100000000)}이므로 ` +
      `${expr(`${a * 1000000000000}-${c * 100000000}=${v}`)} 입니다.`,
  );
}

/** 문형 10 — 조보다 1000억 d개만큼 작은 수. */
function big115JoLessChunks(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 9);
  const d = intBetween(rng, 1, 9);
  const v = a * 1000000000000 - d * 100000000000;
  return make(
    unit,
    `${n(a)}조보다 ${n(1000)}억이 ${n(d)}개 작은 수를 쓰시오.`,
    n(v),
    `${n(1000)}억 ${n(d)}개는 ${n(d * 100000000000)}이므로 ` +
      `${expr(`${a * 1000000000000}-${d * 100000000000}=${v}`)} 입니다.`,
  );
}

/* ── 1-1-6 문형 05–10. 규모는 150만 띠. ── */

function skipStart(rng: Rng): number {
  return intBetween(rng, 12, 89) * 10000;
}

function skipStep(rng: Rng): number {
  return pick(rng, [1000, 10000, 100000]);
}

/** 문형 05 — 앞으로 뛰어 센 수. */
function big116Forward(unit: UnitSeed, rng: Rng): ElemProblem {
  const step = skipStep(rng);
  const t = intBetween(rng, 2, 5);
  const start = skipStart(rng);
  const end = start + step * t;
  return make(
    unit,
    `${n(start)}부터 ${n(step)}씩 ${n(t)}번 뛰어 센 수를 쓰시오.`,
    n(end),
    `${expr(`${start}+${step}\\times${t}=${end}`)} 입니다.`,
  );
}

/** 문형 06 — 거꾸로 뛰어 센 수. */
function big116Backward(unit: UnitSeed, rng: Rng): ElemProblem {
  const step = skipStep(rng);
  const t = intBetween(rng, 2, 5);
  const start = skipStart(rng);
  const end = start + step * t;
  return make(
    unit,
    `${n(end)}에서 ${n(step)}씩 거꾸로 ${n(t)}번 뛰어 센 수를 쓰시오.`,
    n(start),
    `${expr(`${end}-${step}\\times${t}=${start}`)} 입니다.`,
  );
}

/** 문형 07 — 수열의 다음 수. */
function big116NextTerm(unit: UnitSeed, rng: Rng): ElemProblem {
  const step = skipStep(rng);
  const start = skipStart(rng);
  const seq = [start, start + step, start + step * 2];
  const next = start + step * 3;
  return make(
    unit,
    `${seq.map((v) => n(v)).join(", ")} 다음에 올 수를 쓰시오.`,
    n(next),
    `${expr(`${seq[1]}-${seq[0]}=${step}`)} 씩 커지므로 다음 수는 ${expr(`${seq[2]}+${step}=${next}`)} 입니다.`,
  );
}

/** 문형 08 — 몇 번 뛰어 세었는가. */
function big116HowManyHops(unit: UnitSeed, rng: Rng): ElemProblem {
  const step = skipStep(rng);
  const t = intBetween(rng, 2, 5);
  const start = skipStart(rng);
  const end = start + step * t;
  return make(
    unit,
    `${n(start)}에서 ${n(step)}씩 뛰어 세어 ${josaNum(end, "이", "가")} 되었습니다. 몇 번 뛰어 센 것인가?`,
    n(t),
    `${expr(`${end}-${start}=${step * t}`)} 이고 ${expr(`${step * t}\\div${step}=${t}`)} 이므로 ${n(t)}번입니다.`,
  );
}

/** 문형 09 — 가운데 빈칸. */
function big116MissingMiddle(unit: UnitSeed, rng: Rng): ElemProblem {
  const step = skipStep(rng);
  const start = skipStart(rng);
  const at = intBetween(rng, 1, 2);
  const seq = [start, start + step, start + step * 2, start + step * 3];
  const missing = seq[at]!;
  const shown = seq.map((v, i) => (i === at ? expr("\\square") : n(v)));
  return make(
    unit,
    `뛰어 센 수를 차례로 쓰면 ${shown.join(", ")}입니다. ${expr("\\square")} 에 알맞은 수를 쓰시오.`,
    n(missing),
    `${n(step)}씩 뛰어 세므로 ${expr("\\square")} 는 ${n(missing)}입니다.`,
  );
}

/** 문형 10 — 두 뛰어 세기 중 마지막이 더 큰 수. */
function big116BiggerFinish(unit: UnitSeed, rng: Rng): ElemProblem {
  const [s1, s2] = pickDistinct(rng, [1000, 10000, 100000], 2) as [
    number,
    number,
  ];
  const t = intBetween(rng, 2, 4);
  const start = skipStart(rng);
  const e1 = start + s1 * t;
  const e2 = start + s2 * t;
  const big = Math.max(e1, e2);
  return make(
    unit,
    `같은 수 ${n(start)}에서 ${n(s1)}씩 ${n(t)}번 뛰어 센 수와 ${n(s2)}씩 ${n(t)}번 뛰어 센 수 중 더 큰 수를 쓰시오.`,
    n(big),
    `한쪽은 ${n(e1)}, 다른 쪽은 ${n(e2)}이므로 더 큰 수는 ${n(big)}입니다.`,
  );
}

/* ── 1-1-7 문형 05–10. 01 은 네 자리와 다섯 자리라 지문을 가른다. ── */

function fiveDigit(rng: Rng): number {
  return intBetween(rng, 10000, 99999);
}

/** 문형 05 — 다섯 자리 두 수를 비교. */
function big117TwoFiveDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = fiveDigit(rng);
  const b = a + intBetween(rng, 101, 900);
  const wantBig = intBetween(rng, 0, 1) === 0;
  return make(
    unit,
    `${josaNum(a, "과", "와")} ${n(b)}는 모두 다섯 자리 수입니다. 더 ${wantBig ? "큰" : "작은"} 수를 쓰시오.`,
    n(wantBig ? b : a),
    `높은 자리부터 비교하면 ${josaNum(b, "이", "가")} 더 큽니다. 더 ${wantBig ? "큰" : "작은"} 수는 ${n(wantBig ? b : a)}입니다.`,
  );
}

/** 문형 06 — 부등호. */
function big117Sign(unit: UnitSeed, rng: Rng): ElemProblem {
  const kind = intBetween(rng, 0, 2);
  const a = fiveDigit(rng);
  const b =
    kind === 0
      ? a
      : kind === 1
        ? a + intBetween(rng, 101, 900)
        : a - intBetween(rng, 101, 900);
  const sign = a > b ? ">" : a < b ? "<" : "=";
  return make(
    unit,
    `${n(a)} □ ${n(b)} 에서 □에 알맞은 것을 쓰시오. (${expr(">")}, ${expr("<")}, ${expr("=")})`,
    sign,
    `${a > b ? expr(`${a}>${b}`) : a < b ? expr(`${a}<${b}`) : expr(`${a}=${b}`)} 이므로 □에 알맞은 것은 ${sign}입니다.`,
  );
}

/** 문형 07 — 작은 수부터 나열. */
function big117SortAsc(unit: UnitSeed, rng: Rng): ElemProblem {
  const lo = intBetween(rng, 10000, 97999);
  const mid = lo + intBetween(rng, 101, 900);
  const hi = mid + intBetween(rng, 101, 900);
  const shown = shuffled(rng, [lo, mid, hi]);
  return make(
    unit,
    `세 수 ${shown.map((v) => n(v)).join(", ")}을 작은 수부터 차례로 쓰시오.`,
    `${n(lo)}, ${n(mid)}, ${n(hi)}`,
    `작은 수부터 쓰면 ${n(lo)}, ${n(mid)}, ${n(hi)}입니다.`,
  );
}

/** 문형 08 — 두 수의 차. */
function big117Diff(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = fiveDigit(rng);
  const b = a + intBetween(rng, 101, 900);
  const first = intBetween(rng, 0, 1) === 0 ? a : b;
  const second = first === a ? b : a;
  return make(
    unit,
    `${josaNum(first, "과", "와")} ${n(second)}의 차는 얼마인가?`,
    n(b - a),
    `${expr(`${b}-${a}=${b - a}`)} 이므로 차는 ${n(b - a)}입니다.`,
  );
}

/** 문형 09 — 더 큰 수의 만의 자리 숫자. */
function big117BigManDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = fiveDigit(rng);
  const b = a + intBetween(rng, 101, 900);
  const big = Math.max(a, b);
  const digit = Number(String(big)[0]);
  return make(
    unit,
    `${josaNum(a, "과", "와")} ${n(b)} 중 더 큰 수의 만의 자리 숫자를 쓰시오.`,
    n(digit),
    `더 큰 수는 ${n(big)}이므로 만의 자리 숫자는 ${n(digit)}입니다.`,
  );
}

/** 문형 10 — 가장 큰 수와 가장 작은 수의 차. */
function big117Range(unit: UnitSeed, rng: Rng): ElemProblem {
  const lo = intBetween(rng, 10000, 97999);
  const mid = lo + intBetween(rng, 101, 900);
  const hi = mid + intBetween(rng, 101, 900);
  const shown = shuffled(rng, [lo, mid, hi]);
  return make(
    unit,
    `세 수 ${shown.map((v) => n(v)).join(", ")} 중 가장 큰 수와 가장 작은 수의 차는 얼마인가?`,
    n(hi - lo),
    `가장 큰 수는 ${n(hi)}, 가장 작은 수는 ${n(lo)}이므로 ${expr(`${hi}-${lo}=${hi - lo}`)} 입니다.`,
  );
}

/* ── 1-2-1 문형 05–10. 예각·둔각 이름은 1-2-3 몫이라 쓰지 않는다. ── */

/** 문형 05 — 두 각 중 더 큰 각. */
function ang121Bigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 20, 80);
  const y = x + intBetween(rng, 10, 60);
  const first = intBetween(rng, 0, 1) === 0 ? x : y;
  const second = first === x ? y : x;
  return make(
    unit,
    `크기가 ${deg(first)}인 각과 ${deg(second)}인 각 중 더 큰 각의 크기를 쓰시오.`,
    deg(y),
    `${expr(`${x}<${y}`)} 이므로 ${deg(y)}인 각이 더 큽니다.`,
  );
}

/** 문형 06 — 두 각의 차. */
function ang121Diff(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 20, 80);
  const y = x + intBetween(rng, 10, 60);
  return make(
    unit,
    `크기가 ${deg(y)}인 각과 ${deg(x)}인 각의 크기의 차는 몇 도인가?`,
    deg(y - x),
    `${expr(`${y}-${x}=${y - x}`)} 이므로 ${deg(y - x)}입니다.`,
  );
}

/** 문형 07 — 네 각 중 가장 큰 각. */
function ang121FourMax(unit: UnitSeed, rng: Rng): ElemProblem {
  const lo = intBetween(rng, 15, 50);
  const a = lo + intBetween(rng, 8, 20);
  const b = a + intBetween(rng, 8, 20);
  const hi = b + intBetween(rng, 8, 20);
  const shown = shuffled(rng, [lo, a, b, hi]);
  return make(
    unit,
    `네 각의 크기가 ${shown.map((v) => deg(v)).join(", ")}입니다. 가장 큰 각의 크기를 쓰시오.`,
    deg(hi),
    `가장 큰 각은 ${deg(hi)}입니다.`,
  );
}

/** 문형 08 — 두 쌍의 합 중 더 큰 합. */
function ang121BiggerPairSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 20, 70);
  const b = intBetween(rng, 20, 70);
  const c = intBetween(rng, 20, 70);
  const d = intBetween(rng, 20, 70);
  const left = a + b;
  const right = c + d;
  const big = Math.max(left, right);
  return make(
    unit,
    `${deg(a)}와 ${deg(b)}의 합과 ${deg(c)}와 ${deg(d)}의 합 중 더 큰 합은 몇 도인가?`,
    deg(big),
    `${expr(`${a}+${b}=${left}`)}, ${expr(`${c}+${d}=${right}`)} 이므로 더 큰 합은 ${deg(big)}입니다.`,
  );
}

/** 문형 09 — 관계와 수치를 이어 나 각을 구한다. */
function ang121Offset(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 30, 120);
  const d = intBetween(rng, 10, 25);
  const more = intBetween(rng, 0, 1) === 0;
  const y = more ? x + d : x - d;
  return make(
    unit,
    `가 각의 크기는 ${deg(x)}입니다. 나 각은 가 각보다 ${deg(d)} 더 ${more ? "큽니다" : "작습니다"}. 나 각의 크기는 몇 도인가?`,
    deg(y),
    `나 각은 ${expr(more ? `${x}+${d}=${y}` : `${x}-${d}=${y}`)} 이므로 ${deg(y)}입니다.`,
  );
}

/** 문형 10 — 큰 각부터 나열. */
function ang121SortDesc(unit: UnitSeed, rng: Rng): ElemProblem {
  const lo = intBetween(rng, 15, 50);
  const mid = lo + intBetween(rng, 10, 30);
  const hi = mid + intBetween(rng, 10, 30);
  const shown = shuffled(rng, [lo, mid, hi]);
  return make(
    unit,
    `세 각의 크기가 ${shown.map((v) => deg(v)).join(", ")}입니다. 큰 각부터 차례로 쓰시오.`,
    `${deg(hi)}, ${deg(mid)}, ${deg(lo)}`,
    `큰 각부터 쓰면 ${deg(hi)}, ${deg(mid)}, ${deg(lo)}입니다.`,
  );
}

/* ── 1-2-2 문형 05–10. 그림은 각도기 읽기(05)에만 — 발문에 치수가 없다. ── */

const PROTRACTOR_DEGS = [
  25, 35, 40, 50, 55, 65, 70, 80, 100, 110, 115, 125, 130, 140, 145, 155,
] as const;

/** 문형 05 — 각도기 그림에서 읽기. */
function ang122ReadProtractor(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = pick(rng, PROTRACTOR_DEGS);
  return make(
    unit,
    "각도기로 잰 각의 크기는 몇 도인가?",
    deg(d),
    `각도기의 중심을 각의 꼭짓점에, 밑금을 각의 한 변에 맞추고 눈금을 읽으면 ${deg(d)}입니다.`,
    fig("protractor", { deg: d }),
  );
}

/** 문형 06 — d°는 1°가 몇 개. */
function ang122HowManyOnes(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 11, 169);
  return make(
    unit,
    `${deg(d)}는 ${deg(1)}가 몇 개 모인 각인가?`,
    n(d),
    `${deg(1)}가 ${n(d)}개 모이면 ${deg(d)}입니다.`,
  );
}

/** 문형 07 — 눈금 칸 수에서 각을 구한다. */
function ang122TickCells(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 15, 165);
  return make(
    unit,
    `각도기의 작은 눈금 한 칸이 ${deg(1)}일 때, 눈금이 ${n(d)}칸인 각의 크기는 몇 도인가?`,
    deg(d),
    `한 칸이 ${deg(1)}이므로 ${n(d)}칸이면 ${deg(d)}입니다.`,
  );
}

/** 문형 08 — 재 둔 두 각의 합. */
function ang122Sum(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 20, 80);
  const y = intBetween(rng, 15, 70);
  return make(
    unit,
    `각도기로 잰 두 각의 크기가 ${deg(x)}, ${deg(y)}입니다. 두 각의 크기의 합은 몇 도인가?`,
    deg(x + y),
    `${expr(`${x}+${y}=${x + y}`)} 이므로 ${deg(x + y)}입니다.`,
  );
}

/** 문형 09 — 직각보다 d만큼 큰 각. */
function ang122RightPlus(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 5, 80);
  return make(
    unit,
    `직각보다 ${deg(d)} 큰 각의 크기는 몇 도인가?`,
    deg(90 + d),
    `직각은 ${deg(90)}이므로 ${expr(`90+${d}=${90 + d}`)} 에서 ${deg(90 + d)}입니다.`,
  );
}

/** 문형 10 — 직선이 이루는 각보다 d만큼 작은 각. */
function ang122StraightMinus(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 10, 80);
  return make(
    unit,
    `직선이 이루는 각보다 ${deg(d)} 작은 각의 크기는 몇 도인가?`,
    deg(180 - d),
    `직선이 이루는 각은 ${deg(180)}이므로 ${expr(`180-${d}=${180 - d}`)} 에서 ${deg(180 - d)}입니다.`,
  );
}

/* ── 1-2-3 문형 05–10. 분류 이름이 이 소단원의 몫이다. ── */

const ACUTE = [15, 25, 35, 45, 55, 65, 75, 85] as const;
const OBTUSE = [95, 105, 115, 125, 135, 145, 155, 165] as const;

/** 문형 05 — 각도기 그림 분류. 발문에 치수가 없어 그림이 필요하다. */
function ang123ClassifyFig(unit: UnitSeed, rng: Rng): ElemProblem {
  const klass = pick(rng, ["예각", "직각", "둔각"] as const);
  const d =
    klass === "직각"
      ? 90
      : klass === "예각"
        ? pick(rng, ACUTE)
        : pick(rng, OBTUSE);
  return make(
    unit,
    "그림의 각은 예각, 직각, 둔각 중 무엇인가?",
    klass,
    `직각은 ${deg(90)}입니다. ${deg(d)}는 ${klass}입니다.`,
    fig("protractor", { deg: d }),
  );
}

/** 문형 06 — 세 각 중 둔각 개수. */
function ang123ObtuseCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const three = [
    pick(rng, [...ACUTE, ...OBTUSE]),
    pick(rng, [...ACUTE, ...OBTUSE]),
    pick(rng, [...ACUTE, ...OBTUSE]),
  ];
  const wide = three.filter((v) => v > 90).length;
  return make(
    unit,
    `크기가 ${deg(three[0]!)}, ${deg(three[1]!)}, ${deg(three[2]!)}인 세 각 중 둔각은 모두 몇 개인가?`,
    n(wide),
    `${deg(90)}보다 큰 각이 둔각입니다. 둔각은 ${n(wide)}개입니다.`,
  );
}

/** 문형 07 — 직각인 각을 고른다. */
function ang123PickRight(unit: UnitSeed, rng: Rng): ElemProblem {
  const extra = shuffled(rng, [
    pick(rng, ACUTE),
    pick(rng, OBTUSE),
    pick(rng, ACUTE),
  ]);
  const shown = shuffled(rng, [90, extra[0]!, extra[1]!, extra[2]!]);
  return make(
    unit,
    `네 각의 크기가 ${shown.map((v) => deg(v)).join(", ")}입니다. 직각인 각의 크기를 쓰시오.`,
    deg(90),
    `직각의 크기는 ${deg(90)}입니다.`,
  );
}

/** 문형 08 — 둔각을 모두 나열. 02 는 예각이라 답이 갈린다. */
function ang123ListObtuse(unit: UnitSeed, rng: Rng): ElemProblem {
  const nObtuse = intBetween(rng, 1, 3);
  const four = [
    ...pickDistinct(rng, OBTUSE, nObtuse),
    ...pickDistinct(rng, ACUTE, 4 - nObtuse),
  ];
  const shown = shuffled(rng, four);
  const obtuse = shown.filter((v) => v > 90);
  return make(
    unit,
    `네 각의 크기가 ${shown.map((v) => deg(v)).join(", ")}입니다. 이 중에서 둔각을 모두 찾아 쓰시오.`,
    obtuse.map((v) => deg(v)).join(", "),
    `${deg(90)}보다 큰 각이 둔각이므로 ${obtuse.map((v) => deg(v)).join(", ")}입니다.`,
  );
}

/** 문형 09 — 예각은 몇 개인가. */
function ang123AcuteCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const nAcute = intBetween(rng, 1, 3);
  const four = [
    ...pickDistinct(rng, ACUTE, nAcute),
    ...pickDistinct(rng, OBTUSE, 4 - nAcute),
  ];
  const shown = shuffled(rng, four);
  const acute = shown.filter((v) => v < 90);
  return make(
    unit,
    `네 각의 크기가 ${shown.map((v) => deg(v)).join(", ")}입니다. 예각은 모두 몇 개인가?`,
    n(acute.length),
    `${deg(90)}보다 작은 각이 예각이므로 예각은 ${n(acute.length)}개입니다.`,
  );
}

/** 문형 10 — 가장 큰 예각. */
function ang123BiggestAcute(unit: UnitSeed, rng: Rng): ElemProblem {
  const nAcute = intBetween(rng, 2, 3);
  const four = [
    ...pickDistinct(rng, ACUTE, nAcute),
    ...pickDistinct(rng, OBTUSE, 4 - nAcute),
  ];
  const shown = shuffled(rng, four);
  const acute = shown.filter((v) => v < 90);
  const hi = Math.max(...acute);
  return make(
    unit,
    `네 각의 크기가 ${shown.map((v) => deg(v)).join(", ")}입니다. 예각 중에서 가장 큰 각의 크기를 쓰시오.`,
    deg(hi),
    `예각은 ${acute.map((v) => deg(v)).join(", ")}이므로 가장 큰 예각은 ${deg(hi)}입니다.`,
  );
}

/* ── 1-2-4 문형 05–10. 01 은 이어 붙이기, 05 는 식. ── */

/** 문형 05 — 같은 크기로 둘로 나눈다. 01 의 n0+n1 과 셈을 가른다. */
function ang124AddExpr(unit: UnitSeed, rng: Rng): ElemProblem {
  const half = intBetween(rng, 15, 80);
  const s = half * 2;
  return make(
    unit,
    `이어 붙인 각의 크기가 ${deg(s)}입니다. 크기가 같은 두 각으로 나누면 한 각의 크기는 몇 도인가?`,
    deg(half),
    `${expr(`${s}\\div2=${half}`)} 이므로 ${deg(half)}입니다.`,
  );
}

/** 문형 06 — 뺄셈 식. */
function ang124SubExpr(unit: UnitSeed, rng: Rng): ElemProblem {
  const small = intBetween(rng, 15, 60);
  const big = small + intBetween(rng, 20, 70);
  return make(
    unit,
    `등호(=)의 양쪽이 같아지도록 ${expr("\\square")} 에 알맞은 각도를 쓰시오. ${expr(`${big}^\\circ-${small}^\\circ=\\square`)}`,
    deg(big - small),
    `${expr(`${big}-${small}=${big - small}`)} 이므로 ${deg(big - small)}입니다.`,
  );
}

/** 문형 07 — 어림과 잰 값의 차. */
function ang124EstimateGap(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 25, 75);
  const gap = intBetween(rng, 3, 12);
  return make(
    unit,
    `각의 크기를 ${deg(x)}쯤으로 어림하고 각도기로 재었더니 ${deg(x + gap)}였습니다. 어림한 각도와 잰 각도의 차는 몇 도인가?`,
    deg(gap),
    `${expr(`${x + gap}-${x}=${gap}`)} 이므로 ${deg(gap)} 차이가 납니다.`,
  );
}

/** 문형 08 — 세 각을 이어 붙인 합. */
function ang124ThreeSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 20, 50);
  const y = intBetween(rng, 20, 50);
  const z = intBetween(rng, 20, 50);
  return make(
    unit,
    `세 각 ${deg(x)}, ${deg(y)}, ${deg(z)}를 겹치지 않게 이어 붙인 각의 크기는 몇 도인가?`,
    deg(x + y + z),
    `${expr(`${x}+${y}+${z}=${x + y + z}`)} 이므로 ${deg(x + y + z)}입니다.`,
  );
}

/** 문형 09 — 이어 붙인 각이 직각과 얼마나 다른가. */
function ang124VsRight(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 20, 50);
  const y = intBetween(rng, 20, 50);
  const sum = x + y;
  const gap = Math.abs(sum - 90);
  return make(
    unit,
    `두 각 ${deg(x)}와 ${deg(y)}를 이어 붙인 각은 직각과 몇 도 차이인가?`,
    deg(gap),
    `${expr(`${x}+${y}=${sum}`)} 이고 직각은 ${deg(90)}이므로 ${expr(`${Math.max(sum, 90)}-${Math.min(sum, 90)}=${gap}`)} 입니다.`,
  );
}

/** 문형 10 — 직선에서 이어 붙인 각을 뺀다. 03 의 「줄이면」과 물음을 가른다. */
function ang124SumMinus(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = intBetween(rng, 20, 50);
  const y = intBetween(rng, 20, 50);
  return make(
    unit,
    `직선이 이루는 각에서 ${deg(x)}와 ${deg(y)}를 이어 붙인 각을 빼면 몇 도인가?`,
    deg(180 - x - y),
    `${expr(`${x}+${y}=${x + y}`)} 이고 ${expr(`180-${x + y}=${180 - x - y}`)} 이므로 ${deg(180 - x - y)}입니다.`,
  );
}

/* ── 1-2-5 문형 05–10. 01 은 두 각의 합, 05 는 두 각을 따로 준다. ── */

/** 문형 05 — 두 각을 주고 나머지 각. */
function ang125RestFromTwo(unit: UnitSeed, rng: Rng): ElemProblem {
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

/** 문형 06 — 주어진 두 각의 합. 01 의 180−n0 과 셈을 가른다. */
function ang125OtherTwoSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 25, 80);
  const b = intBetween(rng, 25, 135 - a);
  return make(
    unit,
    `삼각형의 두 각의 크기가 ${deg(a)}, ${deg(b)}입니다. 이 두 각의 크기의 합은 몇 도인가?`,
    deg(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 이므로 ${deg(a + b)}입니다.`,
  );
}

/** 문형 07 — 세 각의 합을 직접 더한다. */
function ang125ThreeSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 30, 70);
  const b = intBetween(rng, 30, 70);
  const c = 180 - a - b;
  return make(
    unit,
    `세 각의 크기가 ${deg(a)}, ${deg(b)}, ${deg(c)}인 삼각형에서 세 각의 크기의 합은 몇 도인가?`,
    deg(180),
    `${expr(`${a}+${b}+${c}=180`)} 입니다.`,
  );
}

/** 문형 08 — 나머지 각을 구한 뒤 가장 큰 각. */
function ang125Biggest(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 30, 70);
  const b = intBetween(rng, 30, 70);
  const c = 180 - a - b;
  const hi = Math.max(a, b, c);
  return make(
    unit,
    `삼각형의 두 각의 크기가 ${deg(a)}, ${deg(b)}입니다. 세 각 중 가장 큰 각의 크기는 몇 도인가?`,
    deg(hi),
    `나머지 한 각은 ${expr(`180-${a}-${b}=${c}`)} 입니다. 가장 큰 각은 ${deg(hi)}입니다.`,
  );
}

/** 문형 09 — 나머지 각이 직각보다 큰가. */
function ang125RestVsRight(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 20, 70);
  const b = intBetween(rng, 20, 70);
  const rest = 180 - a - b;
  return make(
    unit,
    `삼각형의 두 각의 크기가 ${deg(a)}, ${deg(b)}입니다. 나머지 한 각은 직각보다 큰가, 작은가?`,
    rest > 90 ? "크다" : rest < 90 ? "작다" : "같다",
    `나머지 한 각은 ${expr(`180-${a}-${b}=${rest}`)} 이고 직각은 ${deg(90)}이므로 ` +
      `직각보다 ${rest > 90 ? "큽니다" : rest < 90 ? "작습니다" : "같습니다"}.`,
  );
}

/** 문형 10 — 두 각의 합이 주어진 나머지. 01 과 달리 한 각을 더 준다. */
function ang125SumAndOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 25, 70);
  const b = intBetween(rng, 25, 70);
  const s = a + b;
  return make(
    unit,
    `삼각형의 한 각의 크기가 ${deg(a)}이고, 다른 두 각의 크기의 합이 ${deg(s)}입니다. ` +
      `크기가 ${deg(a)}가 아닌 나머지 한 각의 크기는 몇 도인가?`,
    deg(b),
    `다른 두 각의 합이 ${deg(s)}이고 그 중 한 각이 ${deg(a)}이므로 ${expr(`${s}-${a}=${b}`)} 입니다.`,
  );
}

/* ── 1-2-6 문형 05–10. 1-2-5 와 평행하되 360°·네 각. ── */

/** 문형 05 — 세 각을 주고 나머지 각. */
function ang126RestFromThree(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 70, 110);
  const b = intBetween(rng, 70, 110);
  const c = intBetween(rng, 70, 110);
  const rest = 360 - a - b - c;
  return make(
    unit,
    `사각형의 세 각의 크기가 ${deg(a)}, ${deg(b)}, ${deg(c)}입니다. 나머지 한 각의 크기는 몇 도인가?`,
    deg(rest),
    `사각형의 네 각의 크기의 합은 ${deg(360)}입니다. ${expr(`360-${a}-${b}-${c}=${rest}`)}`,
  );
}

/** 문형 06 — 주어진 두 각의 합. 01 의 360−n0 과 셈을 가른다. */
function ang126OtherThreeSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 50, 120);
  const b = intBetween(rng, 50, 120);
  return make(
    unit,
    `사각형의 두 각의 크기가 ${deg(a)}, ${deg(b)}입니다. 이 두 각의 크기의 합은 몇 도인가?`,
    deg(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 이므로 ${deg(a + b)}입니다.`,
  );
}

/** 문형 07 — 네 각의 합을 직접 더한다. */
function ang126FourSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 70, 110);
  const b = intBetween(rng, 70, 110);
  const c = intBetween(rng, 70, 110);
  const d = 360 - a - b - c;
  return make(
    unit,
    `네 각의 크기가 ${deg(a)}, ${deg(b)}, ${deg(c)}, ${deg(d)}인 사각형에서 네 각의 크기의 합은 몇 도인가?`,
    deg(360),
    `${expr(`${a}+${b}+${c}+${d}=360`)} 입니다.`,
  );
}

/** 문형 08 — 나머지 각을 구한 뒤 가장 큰 각. */
function ang126Biggest(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 70, 110);
  const b = intBetween(rng, 70, 110);
  const c = intBetween(rng, 70, 110);
  const rest = 360 - a - b - c;
  const hi = Math.max(a, b, c, rest);
  return make(
    unit,
    `사각형의 세 각의 크기가 ${deg(a)}, ${deg(b)}, ${deg(c)}입니다. 네 각 중 가장 큰 각의 크기는 몇 도인가?`,
    deg(hi),
    `나머지 한 각은 ${expr(`360-${a}-${b}-${c}=${rest}`)} 입니다. 가장 큰 각은 ${deg(hi)}입니다.`,
  );
}

/** 문형 09 — 나머지 각이 직각보다 큰가. */
function ang126RestVsRight(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 70, 110);
  const b = intBetween(rng, 70, 110);
  const c = intBetween(rng, 70, 110);
  const rest = 360 - a - b - c;
  return make(
    unit,
    `사각형의 세 각의 크기가 ${deg(a)}, ${deg(b)}, ${deg(c)}입니다. 나머지 한 각은 직각보다 큰가, 작은가?`,
    rest > 90 ? "크다" : rest < 90 ? "작다" : "같다",
    `나머지 한 각은 ${expr(`360-${a}-${b}-${c}=${rest}`)} 이고 직각은 ${deg(90)}이므로 ` +
      `직각보다 ${rest > 90 ? "큽니다" : rest < 90 ? "작습니다" : "같습니다"}.`,
  );
}

/** 문형 10 — 두 각의 합이 주어진 나머지. */
function ang126SumAndOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 50, 100);
  const b = intBetween(rng, 50, 100);
  const s = a + b;
  return make(
    unit,
    `사각형의 두 각의 크기의 합이 ${deg(s)}이고, 그 중 한 각의 크기가 ${deg(a)}입니다. ` +
      `다른 한 각의 크기는 몇 도인가?`,
    deg(b),
    `${expr(`${s}-${a}=${b}`)} 이므로 ${deg(b)}입니다.`,
  );
}

function ten(
  calc: ChapterHandler,
  word: ChapterHandler,
  apply: ChapterHandler,
  deep: ChapterHandler,
  f05: ChapterHandler,
  f06: ChapterHandler,
  f07: ChapterHandler,
  f08: ChapterHandler,
  f09: ChapterHandler,
  f10: ChapterHandler,
): readonly ElemForm[] {
  return [
    { id: "01", tier: "연산", generate: calc },
    { id: "02", tier: "기본", generate: word },
    { id: "03", tier: "응용", generate: apply },
    { id: "04", tier: "심화하", generate: deep },
    { id: "05", tier: "기본", generate: f05 },
    { id: "06", tier: "기본", generate: f06 },
    { id: "07", tier: "기본", generate: f07 },
    { id: "08", tier: "응용", generate: f08 },
    { id: "09", tier: "응용", generate: f09 },
    { id: "10", tier: "응용", generate: f10 },
  ];
}

function mulCol(a: number, b: number): Record<string, unknown> {
  return fig("columnOp", { top: String(a), op: "×", bottom: String(b) });
}

/* ── 1-3-1 (세 자리)×(몇십) ── */

function pair31(rng: Rng): { a: number; b: number; p: number } {
  const a = intBetween(rng, 123, 897);
  const b = intBetween(rng, 2, 9) * 10;
  return { a, b, p: a * b };
}

function mul131Missing(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, p } = pair31(rng);
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 쓰시오. ${expr(`${a}\\times\\square=${p}`)}`,
    n(b),
    `${expr(`${p}\\div${a}=${b}`)} 이므로 ${n(b)}입니다.`,
  );
}

function mul131Ones(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, p } = pair31(rng);
  return make(
    unit,
    `${expr(`${a}\\times${b}`)} 의 곱에서 일의 자리 숫자를 쓰시오.`,
    n(p % 10),
    `${expr(`${a}\\times${b}=${p}`)} 이므로 일의 자리 숫자는 ${n(p % 10)}입니다.`,
    mulCol(a, b),
  );
}

function mul131Plus100(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, p } = pair31(rng);
  return make(
    unit,
    `${expr(`${a}\\times${b}`)} 의 곱보다 ${n(100)} 큰 수를 쓰시오.`,
    n(p + 100),
    `${expr(`${a}\\times${b}=${p}`)} 이고 ${expr(`${p}+100=${p + 100}`)} 입니다.`,
    mulCol(a, b),
  );
}

function mul131ToMan(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, p } = pair31(rng);
  const d = Math.abs(p - 10000);
  return make(
    unit,
    `${expr(`${a}\\times${b}`)} 의 곱과 ${n(10000)}의 차는 얼마인가?`,
    n(d),
    `${expr(`${a}\\times${b}=${p}`)} 이고 ${expr(`${Math.max(p, 10000)}-${Math.min(p, 10000)}=${d}`)} 입니다.`,
    mulCol(a, b),
  );
}

function mul131TensDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, p } = pair31(rng);
  const tens = Math.floor(p / 10) % 10;
  return make(
    unit,
    `${expr(`${a}\\times${b}`)} 의 곱에서 십의 자리 숫자를 쓰시오.`,
    n(tens),
    `${expr(`${a}\\times${b}=${p}`)} 이므로 십의 자리 숫자는 ${n(tens)}입니다.`,
    mulCol(a, b),
  );
}

function mul131NextTen(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, p } = pair31(rng);
  return make(
    unit,
    `${expr(`${a}\\times${b}`)} 의 곱과 ${expr(`${a}\\times${b + 10}`)} 의 곱의 차는 얼마인가?`,
    n(a * 10),
    `${expr(`${a}\\times10=${a * 10}`)} 이므로 차는 ${n(a * 10)}입니다.`,
  );
}

/* ── 1-3-2 (세 자리)×(두 자리) ── */

function pair32(rng: Rng): { a: number; b: number; p: number } {
  const a = intBetween(rng, 123, 897);
  const b = twoDigit(rng);
  return { a, b, p: a * b };
}

function mul132Missing(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, p } = pair32(rng);
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 쓰시오. ${expr(`\\square\\times${b}=${p}`)}`,
    n(a),
    `${expr(`${p}\\div${b}=${a}`)} 이므로 ${n(a)}입니다.`,
  );
}

function mul132Ones(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, p } = pair32(rng);
  return make(
    unit,
    `${expr(`${a}\\times${b}`)} 의 곱에서 일의 자리 숫자를 쓰시오.`,
    n(p % 10),
    `${expr(`${a}\\times${b}=${p}`)} 이므로 일의 자리 숫자는 ${n(p % 10)}입니다.`,
    mulCol(a, b),
  );
}

function mul132Minus10(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, p } = pair32(rng);
  return make(
    unit,
    `${expr(`${a}\\times${b}`)} 의 곱보다 ${n(10)} 작은 수를 쓰시오.`,
    n(p - 10),
    `${expr(`${a}\\times${b}=${p}`)} 이고 ${expr(`${p}-10=${p - 10}`)} 입니다.`,
    mulCol(a, b),
  );
}

function mul132HundredsDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, p } = pair32(rng);
  const h = Math.floor(p / 100) % 10;
  return make(
    unit,
    `${expr(`${a}\\times${b}`)} 의 곱에서 백의 자리 숫자를 쓰시오.`,
    n(h),
    `${expr(`${a}\\times${b}=${p}`)} 이므로 백의 자리 숫자는 ${n(h)}입니다.`,
    mulCol(a, b),
  );
}

function mul132Partial(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b } = pair32(rng);
  const ones = b % 10;
  return make(
    unit,
    `${expr(`${a}\\times${b}`)} 를 계산할 때 ${expr(`${a}\\times${ones}`)} 의 값은 얼마인가?`,
    n(a * ones),
    `일의 자리 ${n(ones)}와의 곱은 ${expr(`${a}\\times${ones}=${a * ones}`)} 입니다.`,
    mulCol(a, b),
  );
}

function mul132Even(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, p } = pair32(rng);
  const even = p % 2 === 0;
  return make(
    unit,
    `${expr(`${a}\\times${b}`)} 의 곱은 짝수인가? '예' 또는 '아니요'로 답하시오.`,
    even ? "예" : "아니요",
    `${expr(`${a}\\times${b}=${p}`)} 이고 ${n(p)}${even ? "는 짝수" : "는 홀수"}입니다.`,
    mulCol(a, b),
  );
}

/* ── 1-3-3 곱셈의 어림셈 ── */

function mul133RoundA(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = roughA(rng);
  const b = twoDigit(rng);
  const aa = Math.round(a / 100) * 100;
  const bb = Math.round(b / 10) * 10;
  return make(
    unit,
    `다음 곱셈을 어림하려고 합니다. ${josaNum(a, "을", "를")} 몇백으로 어림한 값과 ${josaNum(b, "을", "를")} 몇십으로 어림한 값의 합을 구하시오.\n\n${expr(`${a}\\times${b}`)}`,
    n(aa + bb),
    `${josaNum(a, "은", "는")} ${n(aa)}, ${josaNum(b, "은", "는")} ${n(bb)}에 가깝습니다. ${expr(`${aa}+${bb}=${aa + bb}`)} 입니다.`,
  );
}

function mul133EstHundreds(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = roughA(rng);
  const b = twoDigit(rng);
  const aa = Math.round(a / 100) * 100;
  const bb = Math.round(b / 10) * 10;
  const est = aa * bb;
  return make(
    unit,
    `${josaNum(a, "은", "는")} 몇백으로, ${josaNum(b, "은", "는")} 몇십으로 어림하여 곱하면 얼마인가?\n\n${expr(`${a}\\times${b}`)}`,
    n(est),
    `${expr(`${aa}\\times${bb}=${est}`)} 이므로 약 ${n(est)}입니다.`,
    mulCol(aa, bb),
  );
}

function mul133Bigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = roughA(rng);
  const b = twoDigit(rng);
  const aa = Math.round(a / 100) * 100;
  const bb = Math.round(b / 10) * 10;
  const est = aa * bb;
  const act = a * b;
  return make(
    unit,
    `다음 곱셈의 어림한 곱이 실제로 계산한 곱보다 큰가? '예' 또는 '아니요'로 답하시오.\n\n${expr(`${a}\\times${b}`)}`,
    est > act ? "예" : "아니요",
    `어림한 곱은 ${n(est)}, 실제 곱은 ${n(act)}입니다.`,
  );
}

function mul133EstDiv10(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = roughA(rng);
  const b = twoDigit(rng);
  const aa = Math.round(a / 100) * 100;
  const bb = Math.round(b / 10) * 10;
  const est = aa * bb;
  return make(
    unit,
    `${josaNum(a, "과", "와")} ${n(b)}의 곱을 어림한 값을 ${n(10)}으로 나누면 얼마인가?`,
    n(est / 10),
    `어림한 곱은 ${n(est)}이고 ${expr(`${est}\\div10=${est / 10}`)} 입니다.`,
  );
}

function mul133RoundBOnly(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = twoDigit(rng);
  const bb = Math.round(b / 10) * 10;
  return make(
    unit,
    `${josaNum(b, "을", "를")} 몇십으로 어림하면 얼마인가?`,
    n(bb),
    `${josaNum(b, "은", "는")} ${n(bb)}에 가장 가깝습니다.`,
  );
}

function mul133EstMinusActSign(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = roughA(rng);
  const b = twoDigit(rng);
  const aa = Math.round(a / 100) * 100;
  const bb = Math.round(b / 10) * 10;
  const est = aa * bb;
  const act = a * b;
  return make(
    unit,
    `다음 곱셈에서 어림한 곱에서 실제 곱을 뺀 값은 양수인가? '예' 또는 '아니요'로 답하시오.\n\n${expr(`${a}\\times${b}`)}`,
    est - act > 0 ? "예" : "아니요",
    `어림한 곱 ${n(est)}에서 실제 곱 ${n(act)}를 빼면 ${n(est - act)}입니다.`,
  );
}

/* ── 1-3-4 몇십으로 나누기 ── */

function pair34(rng: Rng): { a: number; b: number; q: number } {
  const b = intBetween(rng, 2, 9) * 10;
  const q = intBetween(rng, 2, 9);
  return { a: b * q, b, q };
}

function div134MissingDiv(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair34(rng);
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 쓰시오. ${expr(`${a}\\div\\square=${q}`)}`,
    n(b),
    `${expr(`${a}\\div${q}=${b}`)} 이므로 ${n(b)}입니다.`,
  );
}

function div134Remain(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 2, 9) * 10;
  const q = intBetween(rng, 2, 9);
  const r = intBetween(rng, 1, b - 1);
  const a = b * q + r;
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 의 나머지를 구하시오.`,
    n(r),
    `${expr(`${b}\\times${q}=${b * q}`)} 이고 ${expr(`${a}-${b * q}=${r}`)} 이므로 나머지는 ${n(r)}입니다.`,
  );
}

function div134Check(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair34(rng);
  return make(
    unit,
    `${expr(`${a}\\div${b}=${q}`)} 입니다. 검산하기 위해 몫과 나누는 수를 곱한 값을 쓰시오.`,
    n(a),
    `${expr(`${q}\\times${b}=${a}`)} 입니다.`,
    mulCol(q, b),
  );
}

function div134QuotPlus(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair34(rng);
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 의 몫보다 ${n(1)} 큰 수를 쓰시오.`,
    n(q + 1),
    `몫은 ${n(q)}이므로 ${expr(`${q}+1=${q + 1}`)} 입니다.`,
  );
}

function div134AskB(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair34(rng);
  return make(
    unit,
    `${josaNum(a, "을", "를")} 몇십씩 묶었더니 ${n(q)}묶음이 되었습니다. 몇씩 묶은 것인가?`,
    n(b),
    `${expr(`${a}\\div${q}=${b}`)} 이므로 ${n(b)}씩 묶은 것입니다.`,
  );
}

function div134LeftIfExtra(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair34(rng);
  const extra = intBetween(rng, 1, b - 1);
  return make(
    unit,
    `${josaNum(a, "을", "를")} ${n(b)}씩 묶으면 ${n(q)}묶음입니다. ${n(extra)}개를 더하면 남는 것은 몇 개인가?`,
    n(extra),
    `처음에는 나누어떨어지므로 더한 ${n(extra)}개가 그대로 남습니다.`,
  );
}

/* ── 1-3-5 몇십몇으로 나누기 (1) ── */

function pair35(rng: Rng): { a: number; b: number; q: number } {
  const b = tensOnes(rng, 3);
  const q = intBetween(rng, 3, 9);
  return { a: b * q, b, q };
}

function div135Missing(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair35(rng);
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 쓰시오. ${expr(`\\square\\div${b}=${q}`)}`,
    n(a),
    `${expr(`${b}\\times${q}=${a}`)} 이므로 ${n(a)}입니다.`,
    mulCol(b, q),
  );
}

function div135Tape(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair35(rng);
  return make(
    unit,
    `길이가 ${cm(a)}인 리본을 ${cm(b)}씩 자르면 몇 도막이 되는가?`,
    `${n(q)}도막`,
    `${expr(`${a}\\div${b}=${q}`)} 이므로 ${n(q)}도막입니다.`,
    fig("tape", { length: a, label: `${a} cm`, segments: 1 }),
  );
}

function div135Check(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair35(rng);
  return make(
    unit,
    `${expr(`${a}\\div${b}=${q}`)} 의 검산에서 몫과 나누는 수의 곱을 쓰시오.`,
    n(a),
    `${expr(`${q}\\times${b}=${a}`)} 입니다.`,
    mulCol(q, b),
  );
}

function div135Remain(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = tensOnes(rng, 3);
  const q = intBetween(rng, 3, 9);
  const r = intBetween(rng, 1, b - 1);
  const a = b * q + r;
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 의 나머지를 구하시오.`,
    n(r),
    `${expr(`${b}\\times${q}=${b * q}`)}, ${expr(`${a}-${b * q}=${r}`)} 입니다.`,
  );
}

function div135QuotTimes(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair35(rng);
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 의 몫에 ${n(b)}를 곱한 값을 쓰시오.`,
    n(a),
    `몫은 ${n(q)}이고 ${expr(`${q}\\times${b}=${a}`)} 입니다.`,
  );
}

function div135DaysLeft(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair35(rng);
  const done = intBetween(rng, 1, q - 1);
  return make(
    unit,
    `색 테이프 ${cm(a)}를 하루에 ${cm(b)}씩 자릅니다. ${n(done)}일 동안 자르고 남은 날은 며칠인가?`,
    n(q - done),
    `${expr(`${a}\\div${b}=${q}`)} 일이고 ${expr(`${q}-${done}=${q - done}`)} 일입니다.`,
  );
}

/* ── 1-3-6 몇십몇으로 나누기 (2) ── */

function pair36(rng: Rng): { a: number; b: number; q: number } {
  const b = tensOnes(rng, 2);
  const q = intBetween(rng, 11, 34);
  return { a: b * q, b, q };
}

function div136TensDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair36(rng);
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 의 몫에서 십의 자리 숫자를 쓰시오.`,
    n(Math.floor(q / 10)),
    `몫은 ${n(q)}이므로 십의 자리 숫자는 ${n(Math.floor(q / 10))}입니다.`,
    mulCol(q, b),
  );
}

function div136OnesDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair36(rng);
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 의 몫에서 일의 자리 숫자를 쓰시오.`,
    n(q % 10),
    `몫은 ${n(q)}이므로 일의 자리 숫자는 ${n(q % 10)}입니다.`,
    mulCol(q, b),
  );
}

function div136Check(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair36(rng);
  return make(
    unit,
    `${expr(`${a}\\div${b}=${q}`)} 입니다. 검산의 곱을 쓰시오.`,
    n(a),
    `${expr(`${q}\\times${b}=${a}`)} 입니다.`,
    mulCol(q, b),
  );
}

function div136Remain(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = tensOnes(rng, 2);
  const q = intBetween(rng, 11, 33);
  const r = intBetween(rng, 1, b - 1);
  const a = b * q + r;
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 의 나머지를 구하시오.`,
    n(r),
    `${expr(`${b}\\times${q}=${b * q}`)}, ${expr(`${a}-${b * q}=${r}`)} 입니다.`,
  );
}

function div136QuotMinus(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair36(rng);
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 의 몫보다 ${n(1)} 작은 수를 쓰시오.`,
    n(q - 1),
    `몫은 ${n(q)}이므로 ${expr(`${q}-1=${q - 1}`)} 입니다.`,
  );
}

function div136Bags(unit: UnitSeed, rng: Rng): ElemProblem {
  const { a, b, q } = pair36(rng);
  return make(
    unit,
    `사탕 ${n(a)}개를 한 봉지에 ${n(b)}개씩 담았습니다. 봉지는 몇 개인가?`,
    `${n(q)}개`,
    `${expr(`${a}\\div${b}=${q}`)} 이므로 ${n(q)}개입니다.`,
  );
}

/* ── 1-3-7 나눗셈의 어림셈 ── */

function div137RoundDivisor(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = pick(rng, DIV_ROUGH_POOL);
  const bb = Math.round(b / 10) * 10;
  return make(
    unit,
    `${josaNum(b, "을", "를")} 몇십으로 어림하면 얼마인가?`,
    n(bb),
    `${josaNum(b, "은", "는")} ${n(bb)}에 가장 가깝습니다.`,
  );
}

function div137EstQuot(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = pick(rng, DIV_ROUGH_POOL);
  const bb = Math.round(b / 10) * 10;
  const k = intBetween(rng, 6, 19);
  const a = bb * k;
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 의 나누는 수를 몇십으로 어림하여 몫을 어림하시오.`,
    n(k),
    `${josaNum(b, "을", "를")} ${n(bb)}으로 어림하면 ${expr(`${a}\\div${bb}=${k}`)} 입니다.`,
  );
}

function div137EstBigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = pick(rng, DIV_ROUGH_POOL);
  const bb = Math.round(b / 10) * 10;
  const k = intBetween(rng, 6, 19);
  const a = bb * k;
  const real = Math.floor(a / b);
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 에서 나누는 수를 몇십으로 어림한 몫이 실제 몫보다 큰가? '예' 또는 '아니요'로 답하시오.`,
    k > real ? "예" : "아니요",
    `어림한 몫은 ${n(k)}, 실제 몫은 ${n(real)}입니다.`,
  );
}

function div137EstTimes10(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = pick(rng, DIV_ROUGH_POOL);
  const bb = Math.round(b / 10) * 10;
  const k = intBetween(rng, 6, 19);
  const a = bb * k;
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 의 어림한 몫에 ${n(10)}을 곱한 값을 쓰시오.`,
    n(k * 10),
    `어림한 몫은 ${n(k)}이고 ${expr(`${k}\\times10=${k * 10}`)} 입니다.`,
  );
}

function div137WhichCloser(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = pick(rng, DIV_ROUGH_POOL);
  const bb = Math.round(b / 10) * 10;
  const other = bb === 10 ? 20 : bb - 10;
  const win = Math.abs(b - bb) <= Math.abs(b - other) ? bb : other;
  return make(
    unit,
    `${n(b)}에 더 가까운 몇십은 ${n(bb)}과 ${n(other)} 중 어느 것인가?`,
    n(win),
    `${n(b)}은 ${n(win)}에 더 가깝습니다.`,
  );
}

function div137EstMinus(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = pick(rng, DIV_ROUGH_POOL);
  const bb = Math.round(b / 10) * 10;
  const k = intBetween(rng, 6, 19);
  const a = bb * k;
  return make(
    unit,
    `${expr(`${a}\\div${b}`)} 의 어림한 몫보다 ${n(2)} 작은 수를 쓰시오.`,
    n(k - 2),
    `어림한 몫은 ${n(k)}이므로 ${expr(`${k}-2=${k - 2}`)} 입니다.`,
  );
}

function gridDot(label: string, c: number, r: number): Record<string, unknown> {
  return fig("pointGrid", {
    cols: 6,
    rows: 6,
    dots: [{ c, r, label, side: "down" }],
  });
}

function flipFig(
  rng: Rng,
  op: "flipH" | "flipV" | "rot90" | "rot180" | "rot270",
) {
  const shape = pick(rng, MOVE_SHAPES);
  return fig("rotateFlip", { cells: shape.cells, op, n: shape.n });
}

/* ── 1-4-1 점의 이동 ── */

function move141OneWay(unit: UnitSeed, rng: Rng): ElemProblem {
  const dir = pick(rng, DIR_PAIRS)[0];
  const a = intBetween(rng, 2, 8);
  return make(
    unit,
    `모눈에서 점 ㄱ을 ${dir}으로 ${n(a)}칸 옮겼습니다. 점 ㄱ은 처음 자리에서 어느 쪽으로 몇 칸 옮겨진 것인가?`,
    `${dir}으로 ${n(a)}칸`,
    `${dir}으로 ${n(a)}칸 옮겼으므로 처음 자리에서 ${dir}으로 ${n(a)}칸 옮겨진 것입니다.`,
    gridDot("ㄱ", 2, 2),
  );
}

function move141ThreeSame(unit: UnitSeed, rng: Rng): ElemProblem {
  const dir = pick(rng, DIR_PAIRS)[0];
  const a = intBetween(rng, 1, 4);
  const b = intBetween(rng, 1, 4);
  const c = intBetween(rng, 1, 4);
  return make(
    unit,
    `모눈에서 점 ㄴ을 ${dir}으로 ${n(a)}칸, 또 ${n(b)}칸, 또 ${n(c)}칸 옮겼습니다. 처음 자리에서 ${dir}으로 몇 칸 옮겨진 것인가?`,
    n(a + b + c),
    `${expr(`${a}+${b}+${c}=${a + b + c}`)} 이므로 ${n(a + b + c)}칸입니다.`,
    gridDot("ㄴ", 1, 3),
  );
}

function move141HorizCancel(unit: UnitSeed, rng: Rng): ElemProblem {
  const [first, second] = pick(rng, [
    ["오른쪽", "왼쪽"],
    ["왼쪽", "오른쪽"],
  ] as const);
  const a = intBetween(rng, 2, 6);
  const b = a + intBetween(rng, 1, 3);
  return make(
    unit,
    `모눈에서 점 ㄷ을 ${first}으로 ${n(a)}칸 옮긴 다음 ${second}으로 ${n(b)}칸 옮겼습니다. 처음 자리에서 어느 쪽으로 몇 칸 옮겨진 것인가?`,
    `${second}으로 ${n(b - a)}칸`,
    `${expr(`${b}-${a}=${b - a}`)} 이므로 ${second}으로 ${n(b - a)}칸입니다.`,
    gridDot("ㄷ", 3, 2),
  );
}

function move141BackHome(unit: UnitSeed, rng: Rng): ElemProblem {
  const dir = pick(rng, DIR_PAIRS)[0];
  const a = intBetween(rng, 2, 8);
  const back = DIR_PAIRS.find((p) => p[0] === dir)![1];
  return make(
    unit,
    `모눈에서 점 ㄹ을 ${dir}으로 ${n(a)}칸 옮겼습니다. 처음 자리로 되돌아오려면 어느 쪽으로 몇 칸 옮겨야 하는가?`,
    `${back}으로 ${n(a)}칸`,
    `${dir}의 반대는 ${back}이므로 ${back}으로 ${n(a)}칸 옮기면 됩니다.`,
    gridDot("ㄹ", 2, 4),
  );
}

function move141HOnly(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 6);
  const b = intBetween(rng, 2, 6);
  return make(
    unit,
    `모눈에서 점 ㅁ을 오른쪽으로 ${n(a)}칸, 위쪽으로 ${n(b)}칸 옮겼습니다. 가로 방향으로는 몇 칸 옮겨진 것인가?`,
    n(a),
    `가로 방향은 오른쪽 ${n(a)}칸입니다.`,
    gridDot("ㅁ", 1, 1),
  );
}

function move141Manhattan(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 6);
  const b = intBetween(rng, 2, 6);
  return make(
    unit,
    `점 ㄱ에서 점 ㄴ까지 오른쪽으로 ${n(a)}칸, 위쪽으로 ${n(b)}칸입니다. 가로와 세로로 옮긴 칸 수의 합은 얼마인가?`,
    n(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 이므로 ${n(a + b)}칸입니다.`,
    fig("pointGrid", {
      cols: 7,
      rows: 7,
      dots: [
        { c: 1, r: 1, label: "ㄱ", side: "down" },
        { c: 1 + a, r: 1 + b, label: "ㄴ", side: "down" },
      ],
    }),
  );
}

/* ── 1-4-2 평면도형 밀기 ── */

function move142SideSame(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 3, 9);
  const dist = intBetween(rng, 2, 8);
  const dir = pick(rng, DIR_PAIRS)[0];
  return make(
    unit,
    `한 변이 ${cm(side)}인 정사각형을 ${dir}으로 ${cm(dist)} 밀었습니다. 민 도형의 한 변은 몇 cm인가?`,
    cm(side),
    `밀어도 크기는 변하지 않으므로 한 변은 ${cm(side)}입니다.`,
    fig("markedShape", { shape: "square" }),
  );
}

function move142WidthSame(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 4, 9);
  const h = intBetween(rng, 2, w - 1);
  const dir = pick(rng, DIR_PAIRS)[0];
  const dist = intBetween(rng, 2, 8);
  return make(
    unit,
    `가로 ${cm(w)}, 세로 ${cm(h)}인 직사각형을 ${dir}으로 ${cm(dist)} 밀었습니다. 민 도형의 가로는 몇 cm인가?`,
    cm(w),
    `밀어도 크기는 변하지 않으므로 가로는 ${cm(w)}입니다.`,
    fig("markedShape", { shape: "rect" }),
  );
}

function move142ShapeNo(unit: UnitSeed, rng: Rng): ElemProblem {
  const dist = intBetween(rng, 2, 8);
  return make(
    unit,
    `도형을 오른쪽으로 ${cm(dist)} 밀었습니다. 도형의 모양이 바뀌는가? '예' 또는 '아니요'로 답하시오.`,
    "아니요",
    `밀면 위치만 바뀌고 모양은 그대로입니다.`,
    fig("markedShape", { shape: "square" }),
  );
}

function move142Area(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 3, 8);
  const h = intBetween(rng, 2, 6);
  const dist = intBetween(rng, 2, 8);
  return make(
    unit,
    `가로 ${cm(w)}, 세로 ${cm(h)}인 직사각형을 왼쪽으로 ${cm(dist)} 밀었습니다. 민 도형의 넓이는 몇 cm²인가?`,
    n(w * h),
    `밀어도 넓이는 ${expr(`${w}\\times${h}=${w * h}`)} 으로 같습니다.`,
    fig("markedShape", { shape: "rect" }),
  );
}

function move142RoundTrip(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 2, 8);
  return make(
    unit,
    `도형을 위로 ${cm(d)} 민 다음 아래로 ${cm(d)} 밀었습니다. 처음 위치와 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `같은 거리로 반대 방향이면 처음 자리로 돌아옵니다.`,
    fig("markedShape", { shape: "square" }),
  );
}

function move142Net(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 3, 8);
  const b = intBetween(rng, 1, a - 1);
  return make(
    unit,
    `도형을 오른쪽으로 ${cm(a)} 민 다음 왼쪽으로 ${cm(b)} 밀었습니다. 처음보다 오른쪽으로 몇 cm 밀린 것인가?`,
    cm(a - b),
    `${expr(`${a}-${b}=${a - b}`)} 이므로 ${cm(a - b)}입니다.`,
    fig("markedShape", { shape: "rect" }),
  );
}

/* ── 1-4-3 평면도형 뒤집기 ── */

function move143NameH(unit: UnitSeed, rng: Rng): ElemProblem {
  return make(
    unit,
    `그림에서 색칠한 칸의 왼쪽과 오른쪽이 서로 바뀌었습니다. 좌우로 뒤집은 것인지 위아래로 뒤집은 것인지 쓰시오.`,
    "좌우로 뒤집기",
    "색칠한 칸이 왼쪽과 오른쪽이 바뀌었으므로 좌우로 뒤집은 것입니다.",
    flipFig(rng, "flipH"),
  );
}

function move143NameV(unit: UnitSeed, rng: Rng): ElemProblem {
  return make(
    unit,
    `그림에서 색칠한 칸의 위쪽과 아래쪽이 서로 바뀌었습니다. 좌우로 뒤집은 것인지 위아래로 뒤집은 것인지 쓰시오.`,
    "위아래로 뒤집기",
    "색칠한 칸이 위쪽과 아래쪽이 바뀌었으므로 위아래로 뒤집은 것입니다.",
    flipFig(rng, "flipV"),
  );
}

function move143TwiceYes(unit: UnitSeed, rng: Rng): ElemProblem {
  const axis = pick(rng, ["좌우로", "위아래로"] as const);
  const t = intBetween(rng, 1, 4) * 2;
  return make(
    unit,
    `도형을 ${axis} ${n(t)}번 뒤집었습니다. 처음 도형과 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `${n(2)}번마다 처음과 같아지므로 짝수 번은 처음과 같습니다.`,
    flipFig(rng, axis === "좌우로" ? "flipH" : "flipV"),
  );
}

function move143OddOnce(unit: UnitSeed, rng: Rng): ElemProblem {
  const t = intBetween(rng, 0, 3) * 2 + 1;
  return make(
    unit,
    `도형을 좌우로 ${n(t)}번 뒤집었습니다. 좌우로 한 번 뒤집은 도형과 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `홀수 번은 한 번 뒤집은 것과 같습니다.`,
    flipFig(rng, "flipH"),
  );
}

function move143CellCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const shape = pick(rng, MOVE_SHAPES);
  return make(
    unit,
    `색칠한 칸이 ${n(shape.cells.length)}개인 도형을 위아래로 뒤집었습니다. 뒤집은 도형의 색칠한 칸은 몇 개인가?`,
    n(shape.cells.length),
    `뒤집어도 칸 수는 변하지 않으므로 ${n(shape.cells.length)}개입니다.`,
    fig("rotateFlip", { cells: shape.cells, op: "flipV", n: shape.n }),
  );
}

function move143HThenH(unit: UnitSeed, rng: Rng): ElemProblem {
  return make(
    unit,
    `도형을 좌우로 뒤집은 다음 다시 좌우로 뒤집었습니다. 처음 도형과 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    "같은 방향으로 두 번 뒤집으면 처음과 같습니다.",
    flipFig(rng, "flipH"),
  );
}

/* ── 1-4-4 평면도형 돌리기 ── */

function move144Sum90(unit: UnitSeed, rng: Rng): ElemProblem {
  const t = intBetween(rng, 2, 5);
  return make(
    unit,
    `도형을 시계 방향으로 ${deg(90)}씩 ${n(t)}번 돌렸습니다. 모두 몇 도 돌린 것인가?`,
    deg(90 * t),
    `${expr(`90\\times${t}=${90 * t}`)} 이므로 ${deg(90 * t)}입니다.`,
    flipFig(rng, "rot90"),
  );
}

function move144Clockwise(unit: UnitSeed, rng: Rng): ElemProblem {
  const op = pick(rng, ["rot90", "rot180", "rot270"] as const);
  return make(
    unit,
    "왼쪽 도형을 시계 방향으로 돌려 오른쪽 도형을 만들었습니다. 몇 도 돌린 것인가?",
    deg(TURN_NAME[op]!),
    `시계 방향으로 ${deg(TURN_NAME[op]!)} 돌린 것입니다.`,
    flipFig(rng, op),
  );
}

function move144Ccw(unit: UnitSeed, rng: Rng): ElemProblem {
  const op = pick(rng, ["rot90", "rot180", "rot270"] as const);
  const cw = TURN_NAME[op]!;
  return make(
    unit,
    `시계 방향으로 ${deg(cw)} 돌린 것과 같은 도형을 시계 반대 방향으로 돌리려면 몇 도 돌리면 되는가?`,
    deg(360 - cw),
    `${expr(`360-${cw}=${360 - cw}`)} 이므로 ${deg(360 - cw)}입니다.`,
    flipFig(rng, op),
  );
}

function move144FourYes(unit: UnitSeed, rng: Rng): ElemProblem {
  const turns = intBetween(rng, 1, 4) * 4;
  return make(
    unit,
    `도형을 시계 방향으로 ${deg(90)}씩 ${n(turns)}번 돌렸습니다. 처음 도형과 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `${expr(`90\\times${turns}=${90 * turns}`)} 이고 ${n(90 * turns)}은 ${n(360)}의 배수이므로 처음과 같습니다.`,
    flipFig(rng, "rot90"),
  );
}

function move144Two180(unit: UnitSeed, rng: Rng): ElemProblem {
  return make(
    unit,
    `도형을 시계 방향으로 ${deg(180)} 돌린 다음 다시 ${deg(180)} 돌렸습니다. 처음 도형과 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `${expr(`180+180=360`)} 이므로 처음과 같습니다.`,
    flipFig(rng, "rot180"),
  );
}

function move144Two90(unit: UnitSeed, rng: Rng): ElemProblem {
  return make(
    unit,
    `도형을 시계 방향으로 ${deg(90)} 돌린 다음 다시 ${deg(90)} 돌렸습니다. 시계 방향으로 몇 도 돌린 것과 같은가?`,
    deg(180),
    `${expr(`90+90=180`)} 이므로 ${deg(180)}입니다.`,
    flipFig(rng, "rot180"),
  );
}

function cards(vals: readonly (number | string)[]): Record<string, unknown> {
  return fig("numberCards", { cards: vals.map(String) });
}

/* ── 1-5-1 막대그래프 알아보기 ── */

function bar151Least(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${d.intro} 학생 수가 가장 적은 것은 어느 ${d.theme.item}인가?`,
    d.bottom,
    `${josa(d.bottom, "의", "의")} 막대가 가장 짧습니다. ${n(d.min)}명입니다.`,
    d.figure,
  );
}

function bar151Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${d.intro} ${josa(d.one.label, "을", "를")} 좋아하는 학생은 몇 명인가?`,
    `${n(d.one.value)}명`,
    `${josa(d.one.label, "의", "의")} 막대가 눈금 ${n(d.one.value)}에 닿아 있으므로 ${n(d.one.value)}명입니다.`,
    d.figure,
  );
}

function bar151Second(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${d.intro} 학생 수가 두 번째로 많은 것은 어느 ${d.theme.item}인가?`,
    d.second,
    `${josa(d.top, "이", "가")} ${n(d.max)}명으로 가장 많고, 그다음이 ${josa(d.second, "으로", "로")} ${n(d.secondValue)}명입니다.`,
    d.figure,
  );
}

function bar151Most(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${d.intro} 학생 수가 가장 많은 것은 어느 ${d.theme.item}인가?`,
    d.top,
    `${josa(d.top, "의", "의")} 막대가 가장 높습니다. ${n(d.max)}명입니다.`,
    d.figure,
  );
}

function bar151Total(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${d.intro} 조사한 학생은 모두 몇 명인가?`,
    `${n(d.total)}명`,
    `${expr(`${d.picked.join("+")}=${d.total}`)} 이므로 모두 ${n(d.total)}명입니다.`,
    d.figure,
  );
}

function bar151MaxMinSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${d.intro} 학생 수가 가장 많은 ${d.theme.item}과 가장 적은 ${d.theme.item}의 학생 수의 합은 몇 명인가?`,
    `${n(d.max + d.min)}명`,
    `${josa(d.top, "은", "는")} ${n(d.max)}명, ${josa(d.bottom, "은", "는")} ${n(d.min)}명입니다. ${expr(`${d.max}+${d.min}=${d.max + d.min}`)} 입니다.`,
    d.figure,
  );
}

/* ── 1-5-2 막대그래프로 나타내기 ── */

function bar152Shortest(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${drawIntro(d)} 표를 보고 막대그래프를 그리려고 합니다. 막대를 가장 짧게 그려야 하는 것은 어느 ${d.theme.item}인가?`,
    d.bottom,
    `학생 수가 가장 적은 ${josa(d.bottom, "의", "의")} 막대를 가장 짧게 그립니다. ${n(d.min)}명입니다.`,
    barTable(d),
  );
}

function bar152ReadTable(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${drawIntro(d)} 표에서 ${josa(d.one.label, "을", "를")} 좋아하는 학생은 몇 명인가?`,
    `${n(d.one.value)}명`,
    `표에서 ${josa(d.one.label, "은", "는")} ${n(d.one.value)}명입니다.`,
    barTable(d),
  );
}

function bar152PairSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  const sum = d.pairA.value + d.pairB.value;
  return make(
    unit,
    `${drawIntro(d)} 표에서 ${josa(d.pairA.label, "과", "와")} ${josa(d.pairB.label, "을", "를")} 좋아하는 학생은 모두 몇 명인가?`,
    `${n(sum)}명`,
    `${josa(d.pairA.label, "은", "는")} ${n(d.pairA.value)}명, ${josa(d.pairB.label, "은", "는")} ${n(d.pairB.value)}명입니다. ${expr(`${d.pairA.value}+${d.pairB.value}=${sum}`)} 입니다.`,
    barTable(d),
  );
}

function bar152MinValue(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${drawIntro(d)} 표에서 학생 수가 가장 적은 ${d.theme.item}의 학생 수는 몇 명인가?`,
    `${n(d.min)}명`,
    `가장 적은 것은 ${josa(d.bottom, "으로", "로")} ${n(d.min)}명입니다.`,
    barTable(d),
  );
}

function bar152Diff(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${drawIntro(d)} 표에서 학생 수가 가장 많은 ${d.theme.item}과 가장 적은 ${d.theme.item}의 차는 몇 명인가?`,
    `${n(d.max - d.min)}명`,
    `${josa(d.top, "은", "는")} ${n(d.max)}명, ${josa(d.bottom, "은", "는")} ${n(d.min)}명입니다. ${expr(`${d.max}-${d.min}=${d.max - d.min}`)} 입니다.`,
    barTable(d),
  );
}

function bar152MaxCells(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  const s = d.scale.step;
  const cells = d.max / s;
  return make(
    unit,
    `${drawIntro(d)} 세로 눈금 한 칸을 ${n(s)}명으로 하여 막대그래프를 그리려고 합니다. 가장 긴 막대는 몇 칸인가?`,
    `${n(cells)}칸`,
    `가장 많은 것은 ${josa(d.top, "으로", "로")} ${n(d.max)}명입니다. ${expr(`${d.max}\\div${s}=${cells}`)} 칸입니다.`,
    barTable(d),
  );
}

/* ── 1-5-3 막대그래프의 활용 ── */

function bar153Total(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${d.intro} 네 ${d.theme.item}을 좋아하는 학생을 모두 더하면 몇 명인가?`,
    `${n(d.total)}명`,
    `${expr(`${d.picked.join("+")}=${d.total}`)} 이므로 ${n(d.total)}명입니다.`,
    d.figure,
  );
}

function bar153SecondValue(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${d.intro} 학생 수가 두 번째로 많은 ${d.theme.item}의 학생 수는 몇 명인가?`,
    `${n(d.secondValue)}명`,
    `두 번째로 많은 것은 ${josa(d.second, "으로", "로")} ${n(d.secondValue)}명입니다.`,
    d.figure,
  );
}

function bar153LeastName(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${d.intro} 막대가 가장 짧은 ${d.theme.item}의 이름을 쓰시오.`,
    d.bottom,
    `막대가 가장 짧은 것은 ${d.bottom}입니다.`,
    d.figure,
  );
}

function bar153SaleMoney(unit: UnitSeed, rng: Rng): ElemProblem {
  const sale = buildSaleCombo(rng);
  return make(unit, sale.content, sale.answer, sale.solution, saleFigure(sale));
}

function bar153EvenCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  const even = d.values.filter((v) => v.value % 2 === 0).length;
  return make(
    unit,
    `${d.intro} 학생 수가 짝수인 ${d.theme.item}은 몇 가지인가?`,
    n(even),
    `학생 수가 짝수인 것은 ${even}가지입니다.`,
    d.figure,
  );
}

function bar153HalfTotal(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = barData(unit, rng);
  return make(
    unit,
    `${d.intro} 조사한 학생의 절반은 몇 명인가?`,
    `${n(d.total / 2)}명`,
    `모두 ${n(d.total)}명이므로 ${expr(`${d.total}\\div2=${d.total / 2}`)} 명입니다.`,
    d.figure,
  );
}

/* ── 1-6-1 수 배열에서 규칙 ── */

function pat161NextInc(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 2, 9);
  const a = intBetween(rng, 3, 40);
  const t = [a, a + d, a + d * 2, a + d * 3];
  return make(
    unit,
    `커지는 규칙에 따라 수를 늘어놓았습니다. 다섯째 수를 구하시오. ${t.map((v) => n(v)).join(", ")}`,
    n(a + d * 4),
    `${n(d)}씩 커지는 규칙입니다. ${expr(`${a + d * 3}+${d}=${a + d * 4}`)} 입니다.`,
    cards(t),
  );
}

function pat161Diff(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 2, 9);
  const a = intBetween(rng, 10, 50);
  const t = [a, a + d, a + d * 2, a + d * 3];
  return make(
    unit,
    `수의 배열에서 이웃한 두 수의 차는 얼마인가? ${t.map((v) => n(v)).join(", ")}`,
    n(d),
    `${expr(`${a + d}-${a}=${d}`)} 이므로 ${n(d)}씩 커집니다.`,
    cards(t),
  );
}

function pat161First(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 2, 9);
  const a = intBetween(rng, 10, 40);
  const t = [a + d, a + d * 2, a + d * 3, a + d * 4];
  return make(
    unit,
    `규칙에 따라 수를 늘어놓았습니다. 첫째에 올 수를 쓰시오. ${expr("\\square")}, ${t.map((v) => n(v)).join(", ")}`,
    n(a),
    `${n(d)}씩 커지는 규칙입니다. ${expr(`${t[0]}-${d}=${a}`)} 입니다.`,
    cards(["?", ...t]),
  );
}

function pat161LastBigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const d1 = intBetween(rng, 2, 5);
  const d2 = d1 + intBetween(rng, 1, 3);
  const a = intBetween(rng, 5, 20);
  const last1 = a + d1 * 3;
  const last2 = a + d2 * 3;
  return make(
    unit,
    `두 배열의 넷째 수 가운데 더 큰 수를 쓰시오. 가: ${[a, a + d1, a + d1 * 2, last1].map((v) => n(v)).join(", ")} / 나: ${[a, a + d2, a + d2 * 2, last2].map((v) => n(v)).join(", ")}`,
    n(last2),
    `가의 넷째는 ${n(last1)}, 나의 넷째는 ${n(last2)}이므로 더 큰 수는 ${n(last2)}입니다.`,
  );
}

function pat161HowMany(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 2, 6);
  const a = intBetween(rng, 3, 20);
  const k = intBetween(rng, 5, 8);
  const last = a + d * (k - 1);
  return make(
    unit,
    `${n(d)}씩 커지는 규칙으로 ${n(a)}부터 ${n(last)}까지 늘어놓았습니다. 수는 모두 몇 개인가?`,
    n(k),
    `${expr(`${last}-${a}=${last - a}`)} 이고 ${expr(`${last - a}\\div${d}=${k - 1}`)} 이므로 첫째를 더하면 ${n(k)}개입니다.`,
    cards([a, a + d, a + d * 2, "…", last]),
  );
}

function pat161DoubleStep(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 2, 6);
  const a = intBetween(rng, 3, 20);
  return make(
    unit,
    `규칙에 따라 수를 늘어놓았습니다. ${n(a)}, ${n(a + d)}, ${n(a + d * 2)}, ${n(a + d * 3)}. 같은 규칙으로 두 칸씩 뛰면 이웃한 두 수의 차는 얼마인가?`,
    n(d * 2),
    `${n(d)}씩 커지므로 두 칸을 뛰면 ${expr(`${d}\\times2=${d * 2}`)} 입니다.`,
    cards([a, a + d, a + d * 2, a + d * 3]),
  );
}

/* ── 1-6-2 도형 수 배열 ── */

function pat162Fifth(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 1, 5);
  const d = intBetween(rng, 2, 6);
  return make(
    unit,
    `같은 수만큼씩 늘어나는 모형입니다. 첫째 ${n(s)}개, 둘째 ${n(s + d)}개, 셋째 ${n(s + d * 2)}개일 때 다섯째 모형은 몇 개인가?`,
    `${n(s + d * 4)}개`,
    `${n(d)}개씩 늘어나므로 다섯째는 ${expr(`${s}+${d}\\times4=${s + d * 4}`)} 개입니다.`,
    cards([s, s + d, s + d * 2]),
  );
}

function pat162ThreeSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 1, 5);
  const d = intBetween(rng, 2, 6);
  const t = [s, s + d, s + d * 2];
  const sum = t.reduce((x, y) => x + y, 0);
  return make(
    unit,
    `모형을 규칙에 따라 늘어놓았습니다. 첫째는 ${n(s)}개, 둘째는 ${n(s + d)}개, 셋째는 ${n(s + d * 2)}개입니다. 첫째부터 셋째까지 모형은 모두 몇 개인가?`,
    `${n(sum)}개`,
    `${expr(`${t.join("+")}=${sum}`)} 이므로 ${n(sum)}개입니다.`,
    cards(t),
  );
}

function pat162FromEnds(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 1, 5);
  const d = intBetween(rng, 2, 6);
  return make(
    unit,
    `모형을 규칙에 따라 늘어놓았습니다. 첫째는 ${n(s)}개, 셋째는 ${n(s + d * 2)}개입니다. 모형은 몇 개씩 늘어나는가?`,
    `${n(d)}개씩`,
    `첫째와 셋째 사이가 ${n(2)}칸이므로 ${expr(`(${s + d * 2}-${s})\\div2=${d}`)} 개씩입니다.`,
    cards([s, "?", s + d * 2]),
  );
}

function pat162Fourth(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 1, 5);
  const d = intBetween(rng, 2, 6);
  return make(
    unit,
    `같은 수만큼씩 늘어나는 모형입니다. 첫째 ${n(s)}개, 둘째 ${n(s + d)}개, 셋째 ${n(s + d * 2)}개일 때 넷째 모형은 몇 개인가?`,
    `${n(s + d * 3)}개`,
    `${n(d)}개씩 늘어나므로 ${expr(`${s + d * 2}+${d}=${s + d * 3}`)} 개입니다.`,
    cards([s, s + d, s + d * 2]),
  );
}

function pat162SecondMinus(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 1, 5);
  const d = intBetween(rng, 2, 6);
  return make(
    unit,
    `모형을 규칙에 따라 늘어놓았습니다. 첫째는 ${n(s)}개, 둘째는 ${n(s + d)}개입니다. 둘째는 첫째보다 몇 개 더 많은가?`,
    `${n(d)}개`,
    `${expr(`${s + d}-${s}=${d}`)} 이므로 ${n(d)}개 더 많습니다.`,
    cards([s, s + d]),
  );
}

function pat162Tenth(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 1, 4);
  const d = intBetween(rng, 2, 5);
  return make(
    unit,
    `모형을 규칙에 따라 늘어놓았습니다. 첫째는 ${n(s)}개, 둘째는 ${n(s + d)}개, 셋째는 ${n(s + d * 2)}개입니다. 열째는 몇 개인가?`,
    `${n(s + d * 9)}개`,
    `${n(d)}개씩 늘어나므로 열째는 ${expr(`${s}+${d}\\times9=${s + d * 9}`)} 개입니다.`,
    cards([s, s + d, s + d * 2]),
  );
}

/* ── 1-6-3 계산식 배열 ── */

function pat163NextSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = addRows(rng);
  return make(
    unit,
    `계산식의 배열에서 규칙을 찾아 넷째 계산식의 합을 구하시오. ${expr(`${r.left(1)}+${r.right(1)}=${r.sum(1)}`)}, ${expr(`${r.left(2)}+${r.right(2)}=${r.sum(2)}`)}, ${expr(`${r.left(3)}+${r.right(3)}=${r.sum(3)}`)}`,
    n(r.sum(4)),
    `합이 ${n(200)}씩 커집니다. ${expr(`${r.sum(3)}+200=${r.sum(4)}`)} 입니다.`,
  );
}

function pat163SubStep(unit: UnitSeed, rng: Rng): ElemProblem {
  const m = intBetween(rng, 6, 9) * 100 + intBetween(rng, 11, 89);
  return make(
    unit,
    `계산식의 배열에서 빼는 수는 얼마씩 커지는가? ${expr(`${m}-100=${m - 100}`)}, ${expr(`${m}-200=${m - 200}`)}, ${expr(`${m}-300=${m - 300}`)}`,
    n(100),
    `빼는 수가 ${n(100)}, ${n(200)}, ${n(300)}이므로 ${n(100)}씩 커집니다.`,
  );
}

function pat163FirstSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = addRows(rng);
  return make(
    unit,
    `계산식의 배열에서 첫째 계산식의 합을 구하시오. ${expr(`${r.left(1)}+${r.right(1)}=\\square`)}, ${expr(`${r.left(2)}+${r.right(2)}=${r.sum(2)}`)}, ${expr(`${r.left(3)}+${r.right(3)}=${r.sum(3)}`)}`,
    n(r.sum(1)),
    `합이 ${n(200)}씩 커지므로 ${expr(`${r.sum(2)}-200=${r.sum(1)}`)} 입니다.`,
  );
}

function pat163SumGrows(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = addRows(rng);
  return make(
    unit,
    `계산식의 배열에서 합은 ${n(200)}씩 커지는가? '예' 또는 '아니요'로 답하시오. ${expr(`${r.left(1)}+${r.right(1)}=${r.sum(1)}`)}, ${expr(`${r.left(2)}+${r.right(2)}=${r.sum(2)}`)}, ${expr(`${r.left(3)}+${r.right(3)}=${r.sum(3)}`)}`,
    "예",
    `${expr(`${r.sum(2)}-${r.sum(1)}=200`)} 이고 ${expr(`${r.sum(3)}-${r.sum(2)}=200`)} 입니다.`,
  );
}

function pat163FifthLeft(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = addRows(rng);
  return make(
    unit,
    `계산식의 배열에서 다섯째 계산식의 앞에 오는 수를 쓰시오. ${expr(`${r.left(1)}+${r.right(1)}=${r.sum(1)}`)}, ${expr(`${r.left(2)}+${r.right(2)}=${r.sum(2)}`)}, ${expr(`${r.left(3)}+${r.right(3)}=${r.sum(3)}`)}`,
    n(r.left(5)),
    `앞에 오는 수가 ${n(100)}씩 커지므로 다섯째는 ${n(r.left(5))}입니다.`,
  );
}

function pat163ThreeSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const r = addRows(rng);
  const s = r.sum(1) + r.sum(2) + r.sum(3);
  return make(
    unit,
    `계산식의 배열에서 첫째부터 셋째까지 합을 모두 더하면 얼마인가? ${expr(`${r.left(1)}+${r.right(1)}=${r.sum(1)}`)}, ${expr(`${r.left(2)}+${r.right(2)}=${r.sum(2)}`)}, ${expr(`${r.left(3)}+${r.right(3)}=${r.sum(3)}`)}`,
    n(s),
    `${expr(`${r.sum(1)}+${r.sum(2)}+${r.sum(3)}=${s}`)} 입니다.`,
  );
}

/* ── 1-6-4 곱셈·나눗셈 계산식 배열 ── */

function pat164Times10(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 12, 48);
  const b = intBetween(rng, 2, 9);
  return make(
    unit,
    `계산식의 배열에서 규칙을 찾아 ${expr("\\square")} 에 알맞은 수를 쓰시오. ${expr(`${a}\\times${b}=${a * b}`)}, ${expr(`${a * 10}\\times${b}=${a * 10 * b}`)}, ${expr(`${a * 100}\\times${b}=\\square`)}`,
    n(a * 100 * b),
    `곱하는 수가 ${n(10)}배가 되면 곱도 ${n(10)}배가 됩니다. ${expr(`${a * 10 * b}\\times10=${a * 100 * b}`)} 입니다.`,
  );
}

function pat164SubSame(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 50, 90);
  const b = intBetween(rng, 11, 30);
  const d = a - b;
  return make(
    unit,
    `계산식의 배열에서 규칙을 찾아 ${expr("\\square")} 에 알맞은 수를 쓰시오. ${expr(`${a}-${b}=${d}`)}, ${expr(`${a + 10}-${b + 10}=${d}`)}, ${expr(`${a + 20}-${b + 20}=\\square`)}`,
    n(d),
    `빼는 두 수가 ${n(10)}씩 커지면 차는 변하지 않습니다.`,
  );
}

function pat164QuotOnly(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const a = b * q;
  return make(
    unit,
    `계산식의 배열에서 둘째 식의 몫을 쓰시오. ${expr(`${a}\\div${b}=${q}`)}, ${expr(`${a * 10}\\div${b}=\\square`)}, ${expr(`${a * 100}\\div${b}=${q * 100}`)}`,
    n(q * 10),
    `나누어지는 수가 ${n(10)}배가 되면 몫도 ${n(10)}배가 됩니다.`,
  );
}

function pat164MulFactor(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 12, 28);
  const b = intBetween(rng, 3, 9);
  return make(
    unit,
    `계산식의 배열에서 곱하는 수는 얼마인가? ${expr(`${a}\\times${b}=${a * b}`)}, ${expr(`${a * 10}\\times${b}=${a * 10 * b}`)}, ${expr(`${a * 100}\\times${b}=${a * 100 * b}`)}`,
    n(b),
    `세 식 모두 ${n(b)}를 곱하고 있습니다.`,
  );
}

function pat164SameSumBlank(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 15, 60);
  const b = intBetween(rng, 33, 80);
  const s = a + b;
  return make(
    unit,
    `계산식의 배열에서 ${expr("\\square")} 에 알맞은 수를 쓰시오. ${expr(`${a}+${b}=${s}`)}, ${expr(`${a + 10}+\\square=${s}`)}, ${expr(`${a + 20}+${b - 20}=${s}`)}`,
    n(b - 10),
    `합이 ${n(s)}로 같으므로 ${expr(`${s}-${a + 10}=${b - 10}`)} 입니다.`,
  );
}

function pat164HowManyTens(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = intBetween(rng, 2, 9);
  const q = intBetween(rng, 2, 9);
  const a = b * q;
  return make(
    unit,
    `${expr(`${a}\\div${b}=${q}`)} 에서 나누어지는 수를 ${n(10)}배로 ${n(2)}번 키우면 몫은 얼마인가?`,
    n(q * 100),
    `${n(10)}배로 ${n(2)}번이면 ${n(100)}배가 되므로 몫은 ${expr(`${q}\\times100=${q * 100}`)} 입니다.`,
  );
}

export const G4_FORMS: Record<string, readonly ElemForm[]> = {
  "초4|1-1-1": [
    { id: "01", tier: "연산", generate: tier11Calc },
    { id: "02", tier: "기본", generate: tier11Basic },
    { id: "03", tier: "응용", generate: tier11Apply },
    { id: "04", tier: "심화하", generate: tier11Deep },
    { id: "05", tier: "기본", generate: big111WhichMan },
    { id: "06", tier: "기본", generate: big111MinusThousands },
    { id: "07", tier: "기본", generate: big111BundleCount },
    { id: "08", tier: "응용", generate: big111Shortfall },
    { id: "09", tier: "응용", generate: big111BiggerUnit },
    { id: "10", tier: "응용", generate: big111ThousandsLeft },
  ],
  "초4|1-1-2": [
    { id: "01", tier: "연산", generate: tier12Calc },
    { id: "02", tier: "기본", generate: tier12Basic },
    { id: "03", tier: "응용", generate: tier12Apply },
    { id: "04", tier: "심화하", generate: tier12Deep },
    { id: "05", tier: "기본", generate: big112PlaceDigit },
    { id: "06", tier: "기본", generate: big112PlaceValue },
    { id: "07", tier: "기본", generate: big112PickFiveDigit },
    { id: "08", tier: "응용", generate: big112DigitSum },
    { id: "09", tier: "응용", generate: big112OddMax },
    { id: "10", tier: "응용", generate: big112NonzeroCount },
  ],
  "초4|1-1-3": [
    { id: "01", tier: "연산", generate: tier13Calc },
    { id: "02", tier: "기본", generate: tier13Basic },
    { id: "03", tier: "응용", generate: tier13Apply },
    { id: "04", tier: "심화하", generate: tier13Deep },
    { id: "05", tier: "기본", generate: big113TimesMan },
    { id: "06", tier: "기본", generate: big113HowManyMan },
    { id: "07", tier: "기본", generate: big113AsManUnit },
    { id: "08", tier: "응용", generate: big113MixBills },
    { id: "09", tier: "응용", generate: big113AsTens },
    { id: "10", tier: "응용", generate: big113AddMans },
  ],
  "초4|1-1-4": [
    { id: "01", tier: "연산", generate: tier14Calc },
    { id: "02", tier: "기본", generate: tier14Basic },
    { id: "03", tier: "응용", generate: tier14Apply },
    { id: "04", tier: "심화하", generate: tier14Deep },
    { id: "05", tier: "기본", generate: big114MansInEok },
    { id: "06", tier: "기본", generate: big114ThousandManBundles },
    { id: "07", tier: "기본", generate: big114MansToEok },
    { id: "08", tier: "응용", generate: big114CompareEokMan },
    { id: "09", tier: "응용", generate: big114EokMinusMan },
    { id: "10", tier: "응용", generate: big114EokLessMan },
  ],
  "초4|1-1-5": [
    { id: "01", tier: "연산", generate: tier15Calc },
    { id: "02", tier: "기본", generate: tier15Basic },
    { id: "03", tier: "응용", generate: tier15Apply },
    { id: "04", tier: "심화하", generate: tier15Deep },
    { id: "05", tier: "기본", generate: big115EoksInJo },
    { id: "06", tier: "기본", generate: big115ThousandEokBundles },
    { id: "07", tier: "기본", generate: big115EoksToJo },
    { id: "08", tier: "응용", generate: big115CompareJoEok },
    { id: "09", tier: "응용", generate: big115JoMinusEok },
    { id: "10", tier: "응용", generate: big115JoLessChunks },
  ],
  "초4|1-1-6": [
    { id: "01", tier: "연산", generate: tier16Calc },
    { id: "02", tier: "기본", generate: tier16Basic },
    { id: "03", tier: "응용", generate: tier16Apply },
    { id: "04", tier: "심화하", generate: tier16Deep },
    { id: "05", tier: "기본", generate: big116Forward },
    { id: "06", tier: "기본", generate: big116Backward },
    { id: "07", tier: "기본", generate: big116NextTerm },
    { id: "08", tier: "응용", generate: big116HowManyHops },
    { id: "09", tier: "응용", generate: big116MissingMiddle },
    { id: "10", tier: "응용", generate: big116BiggerFinish },
  ],
  "초4|1-1-7": [
    { id: "01", tier: "연산", generate: tier17Calc },
    { id: "02", tier: "기본", generate: tier17Basic },
    { id: "03", tier: "응용", generate: tier17Apply },
    { id: "04", tier: "심화하", generate: tier17Deep },
    { id: "05", tier: "기본", generate: big117TwoFiveDigit },
    { id: "06", tier: "기본", generate: big117Sign },
    { id: "07", tier: "기본", generate: big117SortAsc },
    { id: "08", tier: "응용", generate: big117Diff },
    { id: "09", tier: "응용", generate: big117BigManDigit },
    { id: "10", tier: "응용", generate: big117Range },
  ],
  "초4|1-2-1": [
    { id: "01", tier: "연산", generate: tier21Calc },
    { id: "02", tier: "기본", generate: tier21Basic },
    { id: "03", tier: "응용", generate: tier21Apply },
    { id: "04", tier: "심화하", generate: tier21Deep },
    { id: "05", tier: "기본", generate: ang121Bigger },
    { id: "06", tier: "기본", generate: ang121Diff },
    { id: "07", tier: "기본", generate: ang121FourMax },
    { id: "08", tier: "응용", generate: ang121BiggerPairSum },
    { id: "09", tier: "응용", generate: ang121Offset },
    { id: "10", tier: "응용", generate: ang121SortDesc },
  ],
  "초4|1-2-2": [
    { id: "01", tier: "연산", generate: tier22Calc },
    { id: "02", tier: "기본", generate: tier22Basic },
    { id: "03", tier: "응용", generate: tier22Apply },
    { id: "04", tier: "심화하", generate: tier22Deep },
    { id: "05", tier: "기본", generate: ang122ReadProtractor },
    { id: "06", tier: "기본", generate: ang122HowManyOnes },
    { id: "07", tier: "기본", generate: ang122TickCells },
    { id: "08", tier: "응용", generate: ang122Sum },
    { id: "09", tier: "응용", generate: ang122RightPlus },
    { id: "10", tier: "응용", generate: ang122StraightMinus },
  ],
  "초4|1-2-3": [
    { id: "01", tier: "연산", generate: tier23Calc },
    { id: "02", tier: "기본", generate: tier23Basic },
    { id: "03", tier: "응용", generate: tier23Apply },
    { id: "04", tier: "심화하", generate: tier23Deep },
    { id: "05", tier: "기본", generate: ang123ClassifyFig },
    { id: "06", tier: "기본", generate: ang123ObtuseCount },
    { id: "07", tier: "기본", generate: ang123PickRight },
    { id: "08", tier: "응용", generate: ang123ListObtuse },
    { id: "09", tier: "응용", generate: ang123AcuteCount },
    { id: "10", tier: "응용", generate: ang123BiggestAcute },
  ],
  "초4|1-2-4": [
    { id: "01", tier: "연산", generate: tier24Calc },
    { id: "02", tier: "기본", generate: tier24Basic },
    { id: "03", tier: "응용", generate: tier24Apply },
    { id: "04", tier: "심화하", generate: tier24Deep },
    { id: "05", tier: "기본", generate: ang124AddExpr },
    { id: "06", tier: "기본", generate: ang124SubExpr },
    { id: "07", tier: "기본", generate: ang124EstimateGap },
    { id: "08", tier: "응용", generate: ang124ThreeSum },
    { id: "09", tier: "응용", generate: ang124VsRight },
    { id: "10", tier: "응용", generate: ang124SumMinus },
  ],
  "초4|1-2-5": [
    { id: "01", tier: "연산", generate: tier25Calc },
    { id: "02", tier: "기본", generate: tier25Basic },
    { id: "03", tier: "응용", generate: tier25Apply },
    { id: "04", tier: "심화하", generate: tier25Deep },
    { id: "05", tier: "기본", generate: ang125RestFromTwo },
    { id: "06", tier: "기본", generate: ang125OtherTwoSum },
    { id: "07", tier: "기본", generate: ang125ThreeSum },
    { id: "08", tier: "응용", generate: ang125Biggest },
    { id: "09", tier: "응용", generate: ang125RestVsRight },
    { id: "10", tier: "응용", generate: ang125SumAndOne },
  ],
  "초4|1-2-6": [
    { id: "01", tier: "연산", generate: tier26Calc },
    { id: "02", tier: "기본", generate: tier26Basic },
    { id: "03", tier: "응용", generate: tier26Apply },
    { id: "04", tier: "심화하", generate: tier26Deep },
    { id: "05", tier: "기본", generate: ang126RestFromThree },
    { id: "06", tier: "기본", generate: ang126OtherThreeSum },
    { id: "07", tier: "기본", generate: ang126FourSum },
    { id: "08", tier: "응용", generate: ang126Biggest },
    { id: "09", tier: "응용", generate: ang126RestVsRight },
    { id: "10", tier: "응용", generate: ang126SumAndOne },
  ],
  "초4|1-3-1": ten(
    tier31Calc,
    tier31Basic,
    tier31Apply,
    tier31Deep,
    mul131Missing,
    mul131Ones,
    mul131Plus100,
    mul131ToMan,
    mul131TensDigit,
    mul131NextTen,
  ),
  "초4|1-3-2": ten(
    tier32Calc,
    tier32Basic,
    tier32Apply,
    tier32Deep,
    mul132Missing,
    mul132Ones,
    mul132Minus10,
    mul132HundredsDigit,
    mul132Partial,
    mul132Even,
  ),
  "초4|1-3-3": ten(
    tier33Calc,
    tier33Basic,
    tier33Apply,
    tier33Deep,
    mul133RoundA,
    mul133EstHundreds,
    mul133Bigger,
    mul133EstDiv10,
    mul133RoundBOnly,
    mul133EstMinusActSign,
  ),
  "초4|1-3-4": ten(
    tier34Calc,
    tier34Basic,
    tier34Apply,
    tier34Deep,
    div134MissingDiv,
    div134Remain,
    div134Check,
    div134QuotPlus,
    div134AskB,
    div134LeftIfExtra,
  ),
  "초4|1-3-5": ten(
    tier35Calc,
    tier35Basic,
    tier35Apply,
    tier35Deep,
    div135Missing,
    div135Tape,
    div135Check,
    div135Remain,
    div135QuotTimes,
    div135DaysLeft,
  ),
  "초4|1-3-6": ten(
    tier36Calc,
    tier36Basic,
    tier36Apply,
    tier36Deep,
    div136TensDigit,
    div136OnesDigit,
    div136Check,
    div136Remain,
    div136QuotMinus,
    div136Bags,
  ),
  "초4|1-3-7": ten(
    tier37Calc,
    tier37Basic,
    tier37Apply,
    tier37Deep,
    div137RoundDivisor,
    div137EstQuot,
    div137EstBigger,
    div137EstTimes10,
    div137WhichCloser,
    div137EstMinus,
  ),
  "초4|1-4-1": ten(
    tier41Calc,
    tier41Basic,
    tier41Apply,
    tier41Deep,
    move141OneWay,
    move141ThreeSame,
    move141HorizCancel,
    move141BackHome,
    move141HOnly,
    move141Manhattan,
  ),
  "초4|1-4-2": ten(
    tier42Calc,
    tier42Basic,
    tier42Apply,
    tier42Deep,
    move142SideSame,
    move142WidthSame,
    move142ShapeNo,
    move142Area,
    move142RoundTrip,
    move142Net,
  ),
  "초4|1-4-3": ten(
    tier43Calc,
    tier43Basic,
    tier43Apply,
    tier43Deep,
    move143NameH,
    move143NameV,
    move143TwiceYes,
    move143OddOnce,
    move143CellCount,
    move143HThenH,
  ),
  "초4|1-4-4": ten(
    tier44Calc,
    tier44Basic,
    tier44Apply,
    tier44Deep,
    move144Sum90,
    move144Clockwise,
    move144Ccw,
    move144FourYes,
    move144Two180,
    move144Two90,
  ),
  "초4|1-5-1": ten(
    tier51Calc,
    tier51Basic,
    tier51Apply,
    tier51Deep,
    bar151Least,
    bar151Read,
    bar151Second,
    bar151Most,
    bar151Total,
    bar151MaxMinSum,
  ),
  "초4|1-5-2": ten(
    tier52Calc,
    tier52Basic,
    tier52Apply,
    tier52Deep,
    bar152Shortest,
    bar152ReadTable,
    bar152PairSum,
    bar152MinValue,
    bar152Diff,
    bar152MaxCells,
  ),
  "초4|1-5-3": ten(
    tier53Calc,
    tier53Basic,
    tier53Apply,
    tier53Deep,
    bar153Total,
    bar153SecondValue,
    bar153LeastName,
    bar153SaleMoney,
    bar153EvenCount,
    bar153HalfTotal,
  ),
  "초4|1-6-1": ten(
    tier61Calc,
    tier61Basic,
    tier61Apply,
    tier61Deep,
    pat161NextInc,
    pat161Diff,
    pat161First,
    pat161LastBigger,
    pat161HowMany,
    pat161DoubleStep,
  ),
  "초4|1-6-2": ten(
    tier62Calc,
    tier62Basic,
    tier62Apply,
    tier62Deep,
    pat162Fifth,
    pat162ThreeSum,
    pat162FromEnds,
    pat162Fourth,
    pat162SecondMinus,
    pat162Tenth,
  ),
  "초4|1-6-3": ten(
    tier63Calc,
    tier63Basic,
    tier63Apply,
    tier63Deep,
    pat163NextSum,
    pat163SubStep,
    pat163FirstSum,
    pat163SumGrows,
    pat163FifthLeft,
    pat163ThreeSum,
  ),
  "초4|1-6-4": ten(
    tier64Calc,
    tier64Basic,
    tier64Apply,
    tier64Deep,
    pat164Times10,
    pat164SubSame,
    pat164QuotOnly,
    pat164MulFactor,
    pat164SameSumBlank,
    pat164HowManyTens,
  ),
  "초4|1-6-5": [
    { id: "01", tier: "연산", generate: tier65Calc },
    { id: "02", tier: "기본", generate: tier65Basic },
    { id: "03", tier: "응용", generate: tier65Apply },
    { id: "04", tier: "심화하", generate: tier65Deep },
    { id: "05", tier: "기본", generate: eq165LeftBlank },
    { id: "06", tier: "기본", generate: eq165Commute },
    { id: "07", tier: "기본", generate: eq165MiddleBlank },
    { id: "08", tier: "응용", generate: eq165Sub },
    { id: "09", tier: "응용", generate: eq165LeftSub },
    { id: "10", tier: "응용", generate: eq165Times },
  ],
  "초4|2-1-1": ten(
    tier211Calc,
    tier211Basic,
    tier211Apply,
    tier211Deep,
    fracAddNum,
    fracAddDen,
    fracAddMissing,
    fracAddImproper,
    fracAddPainted,
    fracAddEmpty,
  ),
  "초4|2-1-2": ten(
    tier212Calc,
    tier212Basic,
    tier212Apply,
    tier212Deep,
    fracSubNum,
    fracSubMissing,
    fracSubBigger,
    fracSubPainted,
    fracSubLeftCells,
    fracSubDen,
  ),
  "초4|2-1-3": ten(
    tier213Calc,
    tier213Basic,
    tier213Apply,
    tier213Deep,
    mixedAddWholes,
    mixedAddFracNum,
    mixedAddCarry,
    mixedAddMissingWhole,
    mixedAddFracDen,
    mixedAddWholeOnly,
  ),
  "초4|2-1-4": ten(
    tier214Calc,
    tier214Basic,
    tier214Apply,
    tier214Deep,
    mixedSubWholes,
    mixedSubWholeDiff,
    mixedSubFracNum,
    mixedSubMissing,
    mixedSubDen,
    mixedSubPainted,
  ),
  "초4|2-2-1": ten(
    tier221Calc,
    tier221Basic,
    tier221Apply,
    tier221Deep,
    tri221NameEq,
    tri221PickEq,
    tri221Perim,
    tri221NameIso,
    tri221PickIso,
    tri221Vertices,
  ),
  "초4|2-2-2": ten(
    tier222Calc,
    tier222Basic,
    tier222Apply,
    tier222Deep,
    tri222Sum180,
    tri222BaseSum,
    tri222Apex,
    tri222Biggest,
    tri222Pick,
    tri222EqualBase,
  ),
  "초4|2-2-3": ten(
    tier223Calc,
    tier223Basic,
    tier223Apply,
    tier223Deep,
    tri223Side,
    tri223Angle,
    tri223AngleSum,
    tri223Pick,
    tri223HalfPerim,
    tri223Name,
  ),
  "초4|2-2-4": ten(
    tier224Calc,
    tier224Basic,
    tier224Apply,
    tier224Deep,
    tri224CountAcute,
    tri224Name,
    tri224PickRight,
    tri224HasRight,
    tri224Biggest,
    tri224Rest,
  ),
  "초4|2-2-5": ten(
    tier225Calc,
    tier225Basic,
    tier225Apply,
    tier225Deep,
    tri225BothNames,
    tri225PickRightIso,
    tri225EqIsAcute,
    tri225SideClass,
    tri225AngleClass,
    tri225Vertices,
  ),
  "초4|2-3-1": ten(
    tier231Calc,
    tier231Basic,
    tier231Apply,
    tier231Deep,
    dec231TenthDigit,
    dec231Hundredths,
    dec231TenthsCount,
    dec231Bigger,
    dec231PlaceWorth,
    dec231HowManyPlaces,
  ),
  "초4|2-3-2": ten(
    tier232Calc,
    tier232Basic,
    tier232Apply,
    tier232Deep,
    dec232TensDigit,
    dec232SecondDigit,
    dec232AsHundredths,
    dec232Bigger,
    dec232FirstDigit,
    dec232Places,
  ),
  "초4|2-3-3": ten(
    tier233Calc,
    tier233Basic,
    tier233Apply,
    tier233Deep,
    dec233Times10,
    dec233Div10,
    dec233Times100,
    dec233HowManyTimes,
    dec233MoveLeft,
    dec233MoveRight,
  ),
  "초4|2-3-4": ten(
    tier234Calc,
    tier234Basic,
    tier234Apply,
    tier234Deep,
    dec234Sum,
    dec234Missing,
    dec234TenthsDigit,
    dec234VsTen,
    dec234Ones,
    dec234PlusOne,
  ),
  "초4|2-3-5": ten(
    tier235Calc,
    tier235Basic,
    tier235Apply,
    tier235Deep,
    dec235Diff,
    dec235Missing,
    dec235Tenths,
    dec235Bigger,
    dec235Ones,
    dec235MinusOne,
  ),
  "초4|2-3-6": ten(
    tier236Calc,
    tier236Basic,
    tier236Apply,
    tier236Deep,
    dec236Tape,
    dec236GapToTen,
    dec236ThreeSum,
    dec236Twice,
    dec236LeftIfAdd,
    dec236WhichBiggerSum,
  ),
  "초4|2-3-7": ten(
    tier237Calc,
    tier237Basic,
    tier237Apply,
    tier237Deep,
    dec237Cut,
    dec237Left,
    dec237HowMuchMore,
    dec237Need,
    dec237Gap,
    dec237RemainAfterTwo,
  ),
  "초4|2-4-1": ten(
    tier241Calc,
    tier241Basic,
    tier241Apply,
    tier241Deep,
    quad241Name,
    quad241RightCount,
    quad241OneAngle,
    quad241Sum3,
    quad241NotRight,
    quad241PerpName,
  ),
  "초4|2-4-2": ten(
    tier242Calc,
    tier242Basic,
    tier242Apply,
    tier242Deep,
    quad242Name,
    quad242Dist,
    quad242Same,
    quad242Meet,
    quad242PerpCount,
    quad242Angle,
  ),
  "초4|2-4-3": ten(
    tier243Calc,
    tier243Basic,
    tier243Apply,
    tier243Deep,
    quad243Sum,
    quad243One,
    quad243Farther,
    quad243Diff,
    quad243Equal,
    quad243Triple,
  ),
  "초4|2-4-4": ten(
    tier244Calc,
    tier244Basic,
    tier244Apply,
    tier244Deep,
    quad244Pick,
    quad244Pairs,
    quad244Perim,
    quad244Name,
    quad244Vertices,
    quad244Sides,
  ),
  "초4|2-4-5": ten(
    tier245Calc,
    tier245Basic,
    tier245Apply,
    tier245Deep,
    quad245OppSide,
    quad245NeighborSum,
    quad245OppAngle,
    quad245Perim,
    quad245Vertices,
    quad245Name,
  ),
  "초4|2-4-6": ten(
    tier246Calc,
    tier246Basic,
    tier246Apply,
    tier246Deep,
    quad246Side,
    quad246Perim,
    quad246Pick,
    quad246FromPerim,
    quad246AllEqual,
    quad246Vertices,
  ),
  "초4|2-4-7": ten(
    tier247Calc,
    tier247Basic,
    tier247Apply,
    tier247Deep,
    quad247SqIsRect,
    quad247NameRight,
    quad247NameEq,
    quad247SqSide,
    quad247RectPerim,
    quad247SqFromPerim,
  ),
  "초4|2-5-1": ten(
    tier251Calc,
    tier251Basic,
    tier251Apply,
    tier251Deep,
    line251LeastWhen,
    line251Read,
    line251MaxValue,
    line251First,
    line251Last,
    line251Points,
  ),
  "초4|2-5-2": ten(
    tier252Calc,
    tier252Basic,
    tier252Apply,
    tier252Deep,
    line252RiseCount,
    line252Range,
    line252PairDiff,
    line252MaxWhen,
    line252MinValue,
    line252HowManyRows,
  ),
  "초4|2-5-3": ten(
    tier253Calc,
    tier253Basic,
    tier253Apply,
    tier253Deep,
    line253Step,
    line253Rise,
    line253Range,
    line253FirstLast,
    line253MaxWhen,
    line253Unit,
  ),
  "초4|2-6-1": ten(
    tier261Calc,
    tier261Basic,
    tier261Apply,
    tier261Deep,
    poly261Name,
    poly261Verts,
    poly261SidesOfName,
    poly261Same,
    poly261Sum,
    poly261Pent,
  ),
  "초4|2-6-2": ten(
    tier262Calc,
    tier262Basic,
    tier262Apply,
    tier262Deep,
    poly262AllDiag,
    poly262FromVertex,
    poly262TriDiag,
    poly262QuadDiag,
    poly262HexFrom,
    poly262EqualDiag,
  ),
  "초4|2-6-3": ten(
    tier263Calc,
    tier263Basic,
    tier263Apply,
    tier263Deep,
    poly263Side,
    poly263Perim,
    poly263FromPerim,
    poly263EqualSides,
    poly263EqualAngles,
    poly263Name,
  ),
  "초4|2-6-4": ten(
    tier264Calc,
    tier264Basic,
    tier264Apply,
    tier264Deep,
    poly264TriFill,
    poly264SqFill,
    poly264Hex,
    poly264Rhombus,
    poly264Trap,
    poly264FromTris,
  ),
};

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
        ? `분수끼리 뺄 수 없으므로 ${expr(`${w1}\\frac{${a}}{${den}}=${w1 - 1}\\frac{${a + den}}{${den}}`)}` +
            `${numRo(a + den)} 고칩니다. ${expr(`${w1 - 1}-${w2}=${w1 - 1 - w2}`)}, ` +
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
      `${expr(`${w1}\\frac{${a}}{${den}}=${w1 - 1}\\frac{${a + den}}{${den}}`)}${numRo(a + den)} 고칩니다. ` +
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
    `${expr(`${whole}=${whole - 1}\\frac{${den}}{${den}}`)}${numRo(den)} 고칩니다. ` +
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
          `${expr(`${wLo + 2}\\frac{${q}}{${den}}=${wLo + 1}\\frac{${q + den}}{${den}}`)}${numRo(q + den)} 고쳐 ` +
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
    `${expr(`${w1}\\frac{${a}}{${den}}-1\\frac{${m + 1}}{${den}}=${w2}\\frac{${c}}{${den}}`)}${numRo(c)} ` +
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

function fracAddNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, FRAC_DENS);
  const [a, b] = pick(rng, fracPairs(den, "add"));
  return make(
    unit,
    `${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}`)} 에서 분자끼리 더한 값을 쓰시오.`,
    n(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 입니다.`,
  );
}

function fracAddDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, FRAC_DENS);
  const [a, b] = pick(rng, fracPairs(den, "add"));
  return make(
    unit,
    `${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}`)} 의 합에서 분모는 얼마인가?`,
    n(den),
    `분모가 같은 분수의 덧셈은 분모를 그대로 쓰므로 ${n(den)}입니다.`,
    fracSpec(rng, den, a),
  );
}

function fracAddMissing(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, FRAC_DENS);
  const [a, b] = pick(rng, fracPairs(den, "add"));
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 쓰시오. ${expr(`\\frac{${a}}{${den}}+\\frac{\\square}{${den}}=\\frac{${a + b}}{${den}}`)}`,
    n(b),
    `${expr(`${a + b}-${a}=${b}`)} 이므로 ${n(b)}입니다.`,
  );
}

function fracAddImproper(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(
    rng,
    densWith((d) => fracPairs(d, "add")),
  );
  const [a, b] = pick(rng, fracPairs(den, "add"));
  return make(
    unit,
    `${expr(`\\frac{${a}}{${den}}+\\frac{${b}}{${den}}`)} 의 합은 ${expr("1")}보다 큰가? '예' 또는 '아니요'로 답하시오.`,
    a + b > den ? "예" : "아니요",
    `${expr(`${a}+${b}=${a + b}`)} 이고 분모는 ${n(den)}이므로 ${a + b > den ? "가분수입니다." : "진분수입니다."}`,
  );
}

function fracAddPainted(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(properSumPairs));
  const [a] = pick(rng, properSumPairs(den));
  return make(
    unit,
    `전체를 ${n(den)}칸으로 나눈 그림에서 색칠한 칸은 몇 칸인가?`,
    n(a),
    `색칠한 칸은 ${n(a)}칸입니다.`,
    fracSpec(rng, den, a),
  );
}

function fracAddEmpty(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(properSumPairs));
  const [a] = pick(rng, properSumPairs(den));
  return make(
    unit,
    `전체를 ${n(den)}칸으로 나눈 그림에서 색칠하지 않은 칸은 몇 칸인가?`,
    n(den - a),
    `${expr(`${den}-${a}=${den - a}`)} 칸입니다.`,
    fracSpec(rng, den, a),
  );
}

function fracSubNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, FRAC_DENS);
  const [a, b] = pick(rng, fracPairs(den, "sub"));
  return make(
    unit,
    `${expr(`\\frac{${a}}{${den}}-\\frac{${b}}{${den}}`)} 에서 분자끼리 뺀 값을 쓰시오.`,
    n(a - b),
    `${expr(`${a}-${b}=${a - b}`)} 입니다.`,
  );
}

function fracSubMissing(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, FRAC_DENS);
  const [a, b] = pick(rng, fracPairs(den, "sub"));
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 쓰시오. ${expr(`\\frac{${a}}{${den}}-\\frac{\\square}{${den}}=\\frac{${a - b}}{${den}}`)}`,
    n(b),
    `${expr(`${a}-${a - b}=${b}`)} 이므로 ${n(b)}입니다.`,
  );
}

function fracSubBigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, FRAC_DENS);
  const [a, b] = pick(rng, fracPairs(den, "sub"));
  return make(
    unit,
    `${expr(`\\frac{${a}}{${den}}`)} 과 ${expr(`\\frac{${b}}{${den}}`)} 가운데 더 큰 분수를 쓰시오.`,
    expr(`\\frac{${a}}{${den}}`),
    `분모가 같으면 분자가 큰 쪽이 더 큽니다. ${n(a)}이 ${n(b)}보다 큽니다.`,
    fracSpec(rng, den, a),
  );
}

function fracSubPainted(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(
    rng,
    densWith((d) => fracPairs(d, "sub")),
  );
  const [a] = pick(rng, fracPairs(den, "sub"));
  return make(
    unit,
    `그림에서 색칠한 부분은 전체의 얼마인가?`,
    expr(`\\frac{${a}}{${den}}`),
    `${n(den)}칸 중 ${n(a)}칸이 색칠되어 ${expr(`\\frac{${a}}{${den}}`)} 입니다.`,
    fracSpec(rng, den, a),
  );
}

function fracSubLeftCells(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(
    rng,
    densWith((d) => fracPairs(d, "sub")),
  );
  const [a, b] = pick(rng, fracPairs(den, "sub"));
  return make(
    unit,
    `색칠한 ${n(a)}칸에서 ${n(b)}칸을 지우면 색칠한 칸은 몇 칸이 남는가?`,
    n(a - b),
    `${expr(`${a}-${b}=${a - b}`)} 칸입니다.`,
    fracSpec(rng, den, a),
  );
}

function fracSubDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, FRAC_DENS);
  const [a, b] = pick(rng, fracPairs(den, "sub"));
  return make(
    unit,
    `${expr(`\\frac{${a}}{${den}}-\\frac{${b}}{${den}}`)} 의 차에서 분모는 얼마인가?`,
    n(den),
    `분모가 같은 분수의 뺄셈은 분모를 그대로 쓰므로 ${n(den)}입니다.`,
  );
}

function mixedAddWholes(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(
    rng,
    densWith((d) => fracPairs(d, "add")),
  );
  const [a, b] = pick(rng, fracPairs(den, "add"));
  const w1 = intBetween(rng, 1, 4);
  const w2 = intBetween(rng, 1, 3);
  return make(
    unit,
    `${expr(`${w1}\\frac{${a}}{${den}}+${w2}\\frac{${b}}{${den}}`)} 에서 자연수끼리 더한 값을 쓰시오.`,
    n(w1 + w2),
    `${expr(`${w1}+${w2}=${w1 + w2}`)} 입니다.`,
  );
}

function mixedAddFracNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(
    rng,
    densWith((d) => fracPairs(d, "add")),
  );
  const [a, b] = pick(rng, fracPairs(den, "add"));
  const w1 = intBetween(rng, 1, 4);
  const w2 = intBetween(rng, 1, 3);
  return make(
    unit,
    `${expr(`${w1}\\frac{${a}}{${den}}+${w2}\\frac{${b}}{${den}}`)} 에서 분수 부분의 분자를 더하면 얼마인가?`,
    n(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 입니다.`,
    fracSpec(rng, den, Math.min(a, den)),
  );
}

function mixedAddCarry(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(
    rng,
    densWith((d) => fracPairs(d, "add")),
  );
  const [a, b] = pick(rng, fracPairs(den, "add"));
  const w1 = intBetween(rng, 1, 4);
  const w2 = intBetween(rng, 1, 3);
  return make(
    unit,
    `${expr(`${w1}\\frac{${a}}{${den}}+${w2}\\frac{${b}}{${den}}`)} 를 계산할 때 분수 부분에서 받아올림이 있는가? '예' 또는 '아니요'로 답하시오.`,
    a + b >= den ? "예" : "아니요",
    `${expr(`${a}+${b}=${a + b}`)} 이고 분모는 ${n(den)}입니다.`,
  );
}

function mixedAddMissingWhole(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(
    rng,
    densWith((d) => fracPairs(d, "add")),
  );
  const [a, b] = pick(rng, fracPairs(den, "add"));
  const w1 = intBetween(rng, 1, 4);
  const w2 = intBetween(rng, 1, 3);
  const total = w1 * den + a + w2 * den + b;
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 자연수를 쓰시오. ${expr(`\\square\\frac{${a}}{${den}}+${w2}\\frac{${b}}{${den}}=${fmtFrac(total, den)}`)}`,
    n(w1),
    `자연수끼리 더하면 ${n(w1 + w2)}이므로 ${expr(`${w1 + w2}-${w2}=${w1}`)} 입니다.`,
  );
}

function mixedAddFracDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(
    rng,
    densWith((d) => fracPairs(d, "add")),
  );
  const [a, b] = pick(rng, fracPairs(den, "add"));
  const w1 = intBetween(rng, 1, 4);
  return make(
    unit,
    `${expr(`${w1}\\frac{${a}}{${den}}+\\frac{${b}}{${den}}`)} 의 분수 부분 분모는 얼마인가?`,
    n(den),
    `분모가 같은 대분수의 덧셈이므로 분모는 ${n(den)}입니다.`,
    fracSpec(rng, den, a),
  );
}

function mixedAddWholeOnly(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(properSumPairs));
  const [a, b] = pick(rng, properSumPairs(den));
  const w1 = intBetween(rng, 2, 5);
  const w2 = intBetween(rng, 1, 3);
  return make(
    unit,
    `${expr(`${w1}\\frac{${a}}{${den}}+${w2}\\frac{${b}}{${den}}`)} 의 합에서 자연수 부분은 얼마인가?`,
    n(w1 + w2),
    `분수끼리 더해도 ${expr("1")}을 넘지 않으므로 자연수 부분은 ${expr(`${w1}+${w2}=${w1 + w2}`)} 입니다.`,
  );
}

function mixedSubWholes(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(mixedSubPairs));
  const { a, b, borrow } = pick(rng, mixedSubPairs(den));
  const w2 = intBetween(rng, 1, 3);
  const w1 = w2 + intBetween(rng, 1, 3);
  return make(
    unit,
    `${expr(`${w1}\\frac{${a}}{${den}}-${w2}\\frac{${b}}{${den}}`)} 에서 받아내림이 필요한가? '예' 또는 '아니요'로 답하시오.`,
    borrow ? "예" : "아니요",
    `분수끼리 ${borrow ? "뺄 수 없으므로 받아내림이 필요합니다." : "뺄 수 있으므로 받아내림이 없습니다."}`,
  );
}

function mixedSubWholeDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(
    rng,
    densWith((d) => mixedSubPairs(d).filter((p) => !p.borrow)),
  );
  const { a, b } = pick(
    rng,
    mixedSubPairs(den).filter((p) => !p.borrow),
  );
  const w2 = intBetween(rng, 1, 3);
  const w1 = w2 + intBetween(rng, 1, 3);
  return make(
    unit,
    `${expr(`${w1}\\frac{${a}}{${den}}-${w2}\\frac{${b}}{${den}}`)} 에서 자연수끼리 뺀 값을 쓰시오.`,
    n(w1 - w2),
    `${expr(`${w1}-${w2}=${w1 - w2}`)} 입니다.`,
  );
}

function mixedSubFracNum(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(
    rng,
    densWith((d) => mixedSubPairs(d).filter((p) => !p.borrow)),
  );
  const { a, b } = pick(
    rng,
    mixedSubPairs(den).filter((p) => !p.borrow),
  );
  const w2 = intBetween(rng, 1, 3);
  const w1 = w2 + intBetween(rng, 1, 3);
  return make(
    unit,
    `${expr(`${w1}\\frac{${a}}{${den}}-${w2}\\frac{${b}}{${den}}`)} 에서 분수 부분의 분자를 빼면 얼마인가?`,
    n(a - b),
    `${expr(`${a}-${b}=${a - b}`)} 입니다.`,
    fracSpec(rng, den, a),
  );
}

function mixedSubMissing(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(
    rng,
    densWith((d) => mixedSubPairs(d).filter((p) => !p.borrow)),
  );
  const { a, b } = pick(
    rng,
    mixedSubPairs(den).filter((p) => !p.borrow),
  );
  const w2 = intBetween(rng, 1, 3);
  const w1 = w2 + intBetween(rng, 2, 4);
  const total = (w1 - w2) * den + (a - b);
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 자연수를 쓰시오. ${expr(`${w1}\\frac{${a}}{${den}}-\\square\\frac{${b}}{${den}}=${fmtFrac(total, den)}`)}`,
    n(w2),
    `자연수 부분의 차는 ${n(w1 - w2)}이므로 ${expr(`${w1}-${w1 - w2}=${w2}`)} 입니다.`,
  );
}

function mixedSubDen(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, densWith(mixedSubPairs));
  const { a, b } = pick(rng, mixedSubPairs(den));
  const w1 = intBetween(rng, 3, 6);
  const w2 = intBetween(rng, 1, 2);
  return make(
    unit,
    `${expr(`${w1}\\frac{${a}}{${den}}-${w2}\\frac{${b}}{${den}}`)} 의 분수 부분 분모는 얼마인가?`,
    n(den),
    `분모가 같은 대분수의 뺄셈이므로 분모는 ${n(den)}입니다.`,
  );
}

function mixedSubPainted(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(
    rng,
    densWith((d) => mixedSubPairs(d).filter((p) => !p.borrow)),
  );
  const { a } = pick(
    rng,
    mixedSubPairs(den).filter((p) => !p.borrow),
  );
  return make(
    unit,
    `대분수의 분수 부분을 그림으로 나타냈습니다. 색칠한 칸은 몇 칸인가?`,
    n(a),
    `색칠한 칸은 ${n(a)}칸입니다.`,
    fracSpec(rng, den, a),
  );
}

/* ────────── 2-1 난이도 확대 — 심화중·심화상 (D-113 · D-115, 물결 2) ──────────
 *
 * 굳힘 축은 **진분수 조건**(분자 < 분모)과 **대분수의 받아올림·받아내림** 둘이다.
 * 「$\square+(\square+\text{차})=\text{합}$」 산술은 **안 쓴다** — 토대 §2-㉣ 이
 * 「합을 나눠 갖기」가 이미 네 대단원 심화하에 있다고 실측으로 짚었다.
 *
 * ## 🔴 약분 — 이 대단원의 첫 함정
 *
 * `fmtFrac` 이 반드시 `simplify` 를 부르므로 **답이 약분되면 초5(1-4 약분과 통분)가
 * 지면에 뜬다.** 그래서 아래 밭은 **답의 분자가 분모와 서로소인 자리만** 담는다.
 * 후보를 늘어놓는 해설 안의 분수(`\frac{2}{8}` 같은 것)는 날 문자열로 적으므로
 * 약분되지 않는다 — 표준 갈래도 그렇게 쓴다(`$\frac{4}{8}+\frac{3}{8}$`).
 *
 * ## 🔴 토대 §2.3-⑶ 의 「2-1 상은 전 분모에서 구성 불가」를 **재서 뒤집었다**
 *
 * 그 계산은 「등장하는 분수가 **전부** 기약」을 조건에 넣었는데, 초4 지면에는 약분되지
 * 않은 분수가 원래 나온다(위). 그 조건을 «답만»으로 바로잡아 다시 세니 `FRAC_TOP_FIELD`
 * 가 **26자리**다. 근거는 코드가 아니라 밭 자체다 — 비면 그 갈래가 등록조차 안 된다.
 */

/** 분모가 `den` 인 두 진분수의 분자 쌍 — 합이 `sum`, 서로 다르고 작은 쪽이 앞이다. */
function numeratorPairs(den: number, sum: number): [number, number][] {
  const out: [number, number][] = [];
  for (let p = 1; p < sum - p; p += 1) {
    const q = sum - p;
    if (q <= den - 1) out.push([p, q]);
  }
  return out;
}

/**
 * **2-1-1 심화중의 밭** — 합만 주면 분자 쌍이 셋 이상 남고, 「작은 분수가 $\frac{k}{d}$
 * 보다 크다」 한 줄이 **끝까지 빼 보지 않고** 하나를 남기는 자리.
 */
const FRAC_MID_FIELD: {
  den: number;
  sum: number;
  cut: number;
  over: boolean;
  askSmall: boolean;
  small: number;
  big: number;
}[] = (() => {
  const out: {
    den: number;
    sum: number;
    cut: number;
    over: boolean;
    askSmall: boolean;
    small: number;
    big: number;
  }[] = [];
  for (const den of FRAC_DENS) {
    for (let sum = 3; sum <= den; sum += 1) {
      // 🔴 합이 den 을 넘으면 지면에 **대분수**가 뜬다 — 「진분수의 덧셈·뺄셈」이
      //    약속하는 것은 발문의 분수가 전부 진분수라는 것이고, elemTiersG4Frac 이
      //    그것을 전량으로 잠근다(실측으로 걸렸다). 합이 정확히 den 이면 `fmtFrac` 이
      //    `1` 로 찍으므로 분수가 아니다 — 그 자리는 산다.
      // 🔴 합을 `fmtFrac` 으로 찍으므로 **약분되면 분모가 바뀐다**
      //    (분모 $12$·합 $16$ → `1\frac13`). 그러면 「분모가 $12$인」이 거짓말이 된다.
      if (sum !== den && gcd(sum, den) !== 1) continue;
      const pairs = numeratorPairs(den, sum);
      if (pairs.length < 3) continue;
      // 작은 쪽 분자는 잇따른 정수라, 하나만 남기는 창은 양 끝 두 자리뿐이다.
      const lastIdx = pairs.length - 1;
      for (const over of [true, false]) {
        const idx = over ? lastIdx : 0;
        const [p, q] = pairs[idx]!;
        const cut = over ? p - 1 : p + 1;
        if (cut < 1 || cut > den - 1) continue;
        for (const askSmall of [true, false]) {
          const value = askSmall ? p : q;
          if (gcd(value, den) !== 1) continue;
          // 답이 창의 값과 같으면 지면에 그대로 있는 것이 된다.
          if (value === cut) continue;
          out.push({ den, sum, cut, over, askSmall, small: p, big: q });
        }
      }
    }
  }
  return out;
})();

/**
 * **2-1-2 심화중의 밭** — 차만 주면 「어떤 진분수가 큰 쪽인가 작은 쪽인가」가 안 굳어
 * 후보가 **둘**이고, 「$\frac{base}{den}$ 보다 크다(작다)」 한 줄이 하나를 떨어뜨린다.
 * 그 뒤 한 걸음(빼기)이 더 남는다.
 */
const FRAC_TWOWAY_FIELD: {
  den: number;
  base: number;
  gap: number;
  bigger: boolean;
  minus: number;
}[] = (() => {
  const out: {
    den: number;
    base: number;
    gap: number;
    bigger: boolean;
    minus: number;
  }[] = [];
  for (const den of FRAC_DENS) {
    for (let base = 2; base <= den - 2; base += 1) {
      for (let gap = 1; gap <= den - 2; gap += 1) {
        const up = base + gap;
        const down = base - gap;
        // 후보가 **둘 다 진분수**여야 마디가 실제로 열린다.
        if (up > den - 1 || down < 1) continue;
        for (const bigger of [true, false]) {
          const value = bigger ? up : down;
          for (let minus = 1; minus < value; minus += 1) {
            const answer = value - minus;
            if (gcd(answer, den) !== 1) continue;
            // 답이 발문에 **그대로 있으면** 다른 축의 결함이 된다.
            if (answer === base || answer === gap || answer === minus) continue;
            out.push({ den, base, gap, bigger, minus });
          }
        }
      }
    }
  }
  return out;
})();

/**
 * **2-1-2 심화상의 밭** — 합에서 되짚어 만든 분자 쌍이 셋 이상이고, 쌍마다 **실제로
 * 빼 보아야** 창에 드는 것이 하나 남는 자리. 남은 것이 차의 **극값이 아니어야** 한다
 * (극값이면 「가장 큰/작은」 한 줄로 굳어 심화중이 된다 — 파일럿 §7.1 이 못 박은 자리).
 */
const FRAC_TOP_FIELD: {
  den: number;
  sum: number;
  diff: number;
  lo: number;
  hi: number;
  small: number;
  big: number;
  askSmall: boolean;
}[] = (() => {
  const out: {
    den: number;
    sum: number;
    diff: number;
    lo: number;
    hi: number;
    small: number;
    big: number;
    askSmall: boolean;
  }[] = [];
  for (const den of FRAC_DENS) {
    for (let sum = 3; sum <= den; sum += 1) {
      // 🔴 합이 den 을 넘으면 지면에 **대분수**가 뜬다 — 「진분수의 덧셈·뺄셈」이
      //    약속하는 것은 발문의 분수가 전부 진분수라는 것이고, elemTiersG4Frac 이
      //    그것을 전량으로 잠근다(실측으로 걸렸다). 합이 정확히 den 이면 `fmtFrac` 이
      //    `1` 로 찍으므로 분수가 아니다 — 그 자리는 산다.
      // 합을 `fmtFrac` 으로 찍는다 — 약분되면 분모가 바뀐다(`FRAC_MID_FIELD` 와 같은 자리).
      if (sum !== den && gcd(sum, den) !== 1) continue;
      const pairs = numeratorPairs(den, sum);
      if (pairs.length < 3) continue;
      const diffs = pairs.map(([p, q]) => q - p);
      if (new Set(diffs).size !== diffs.length) continue;
      const sorted = [...diffs].sort((x, y) => x - y);
      for (let i = 0; i < pairs.length; i += 1) {
        const [p, q] = pairs[i]!;
        const diff = diffs[i]!;
        if (diff === sorted[0] || diff === sorted[sorted.length - 1]) continue;
        // 차는 `sum - 2p` 라 **둘씩 건너뛴다** — 그래서 창을 한 칸 넓혀도 여전히 하나만
        // 남는다. 넓히는 까닭은 **변형 폭**이다(`elemTiersG4Frac` 이 「씨앗 16개에서
        // 발문 8가지 이상」을 요구한다 — 좁은 창만 쓰면 7가지로 걸렸다).
        for (const lo of [diff - 1, diff - 2]) {
          for (const hi of [diff + 1, diff + 2]) {
            if (lo < 1 || hi > den - 1) continue;
            // 창 안에 드는 차가 **정확히 하나**여야 한다.
            if (diffs.filter((x) => x > lo && x < hi).length !== 1) continue;
            for (const askSmall of [true, false]) {
              const value = askSmall ? p : q;
              if (gcd(value, den) !== 1) continue;
              // 답이 **창의 두 끝**과 같으면 지면에 그대로 있는 것이 된다
              //  — 「$\frac{3}{12}$ 보다 크고 …」인데 답도 `$\frac{3}{12}$` 인 자리.
              if (value === lo || value === hi) continue;
              out.push({ den, sum, diff, lo, hi, small: p, big: q, askSmall });
            }
          }
        }
      }
    }
  }
  return out;
})();

/** 분모가 같은 분수를 **약분하지 않고** 그대로 적는다 — 초4 지면의 표기다. */
function rawFrac(num: number, den: number): string {
  return `\\frac{${num}}{${den}}`;
}

/**
 * 분수 뒤 조사 — 「$\frac{6}{10}$」 은 «십분의 육»이라 **분자**가 소리의 끝이다.
 * `rules.ts` 의 `josaFaults` 가 같은 규칙으로 잰다(㉠) — 두 벌로 적지 않는다.
 */
function fracJosa(num: number, withEnd: string, withoutEnd: string): string {
  return tail(num, withEnd, withoutEnd);
}

/**
 * **2-1-1 5단 심화중 — 합만 주고 두 분자를 안 준다.**
 * 「진분수라 분자가 분모보다 작다」가 후보를 유한하게 자르고, 창 한 줄이 그중 하나를
 * 남긴다. 후보의 «작은 쪽 값»만 보면 걸러지므로 **끝까지 계산하지 않는다** → 중.
 */
function tier211Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier211MidRaw(unit, rng));
}

function tier211MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, FRAC_MID_FIELD);
  const pairs = numeratorPairs(f.den, f.sum);
  const list = pairs
    .map(
      ([p, q]) =>
        `${expr(rawFrac(p, f.den))}${fracJosa(p, "과", "와")} ${expr(rawFrac(q, f.den))}`,
    )
    .join(", ");
  const answer = f.askSmall ? f.small : f.big;
  return makeDeep(
    unit,
    `분모가 ${josaNum(f.den, "인", "인")} 서로 다른 두 진분수의 합이 ` +
      `${expr(fmtFrac(f.sum, f.den))} 입니다. 두 분수 중 작은 분수가 ` +
      `${expr(rawFrac(f.cut, f.den))} 보다 ${f.over ? "클" : "작을"} 때 ` +
      `${f.askSmall ? "작은" : "큰"} 분수를 구하시오.`,
    expr(rawFrac(answer, f.den)),
    [
      `분모가 같으므로 두 분자의 합은 ${josaNum(f.sum, "이", "가")} 됩니다. ` +
        `${expr(`${f.sum}=${pairs.map(([p, q]) => `${p}+${q}`).join("=")}`)} 이고, ` +
        `진분수라 분자는 분모보다 작아야 하므로 될 수 있는 두 분수는 ${list} 입니다.`,
      `작은 분수가 ${expr(rawFrac(f.cut, f.den))} 보다 ` +
        `${f.over ? "크려면" : "작으려면"} 작은 쪽 분자가 ` +
        `${expr(f.over ? `${f.cut}+1=${f.small}` : `${f.cut}-1=${f.small}`)} ` +
        `${f.over ? "보다 크거나 같아야" : "보다 작거나 같아야"} 하므로 ` +
        `${expr(rawFrac(f.small, f.den))}${fracJosa(f.small, "과", "와")} ` +
        `${expr(rawFrac(f.big, f.den))} 한 쌍만 남습니다.`,
      `그러므로 ${f.askSmall ? "작은" : "큰"} 분수는 ` +
        `${expr(rawFrac(answer, f.den))} 입니다.`,
    ],
  );
}

/**
 * **2-1-2 5단 심화중 — 차만 주면 «어느 쪽이 큰지»가 안 굳는다.**
 * 후보가 둘(더한 것·뺀 것)이고 크기 조건 한 줄이 하나를 떨어뜨린다 — 「둘 중 고르기」다.
 * 그 뒤 한 걸음이 더 남으므로 답이 발문에 그대로 있지 않다.
 */
function tier212Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier212MidRaw(unit, rng));
}

function tier212MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, FRAC_TWOWAY_FIELD);
  const up = f.base + f.gap;
  const down = f.base - f.gap;
  const value = f.bigger ? up : down;
  const answer = value - f.minus;
  return makeDeep(
    unit,
    `어떤 진분수와 ${expr(rawFrac(f.base, f.den))} 의 차가 ` +
      `${expr(rawFrac(f.gap, f.den))} 입니다. 어떤 진분수는 ` +
      `${expr(rawFrac(f.base, f.den))} 보다 ${f.bigger ? "큽니다" : "작습니다"}. ` +
      `어떤 진분수에서 ${expr(rawFrac(f.minus, f.den))}${fracJosa(f.minus, "을", "를")} ` +
      `뺀 값은 얼마입니까?`,
    expr(rawFrac(answer, f.den)),
    [
      `차만 알면 어떤 진분수가 ${expr(rawFrac(f.base, f.den))} 보다 큰지 작은지 ` +
        `모릅니다. 큰 쪽이면 ` +
        `${expr(`${rawFrac(f.base, f.den)}+${rawFrac(f.gap, f.den)}=${rawFrac(up, f.den)}`)} ` +
        `이고, 작은 쪽이면 ` +
        `${expr(`${rawFrac(f.base, f.den)}-${rawFrac(f.gap, f.den)}=${rawFrac(down, f.den)}`)} ` +
        `입니다.`,
      `어떤 진분수는 ${expr(rawFrac(f.base, f.den))} 보다 ` +
        `${f.bigger ? "크므로" : "작으므로"} ${expr(rawFrac(value, f.den))} 입니다.`,
      `${expr(`${rawFrac(value, f.den)}-${rawFrac(f.minus, f.den)}=${rawFrac(answer, f.den)}`)} ` +
        `이므로 답은 ${expr(rawFrac(answer, f.den))} 입니다.`,
    ],
  );
}

/**
 * **2-1-2 6단 심화상 — 쌍마다 «실제로 빼 보아야» 하나가 남는다.**
 *
 * 2-1-1 심화중과 **뼈대가 같다**(합에서 분자 쌍을 되짚어 만든다). 갈리는 것은
 * 해설이 밟는 길이다 — 그쪽은 쌍의 «작은 쪽 값»만 보고 걸러 내고, 이쪽은 쌍마다
 * **차를 구해** 창과 견주어야 한다(D-115 ⑾). 그리고 남은 차가 **극값이 아니다** —
 * 「가장 큰(작은) 차」 한 줄로는 안 집힌다.
 */
function tier212Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier212TopRaw(unit, rng));
}

function tier212TopRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, FRAC_TOP_FIELD);
  const pairs = numeratorPairs(f.den, f.sum);
  const shows = pairs
    .map(
      ([p, q]) =>
        `${expr(`${rawFrac(q, f.den)}-${rawFrac(p, f.den)}=${rawFrac(q - p, f.den)}`)}`,
    )
    .join(", ");
  return makeDeep(
    unit,
    `분모가 ${josaNum(f.den, "인", "인")} 서로 다른 두 진분수의 합이 ` +
      `${expr(fmtFrac(f.sum, f.den))} 입니다. 큰 분수에서 작은 분수를 뺀 값이 ` +
      `${expr(rawFrac(f.lo, f.den))} 보다 크고 ` +
      `${expr(rawFrac(f.hi, f.den))} 보다 작을 때, 두 분수 중 ` +
      `${f.askSmall ? "작은" : "큰"} 분수를 구하시오.`,
    expr(rawFrac(f.askSmall ? f.small : f.big, f.den)),
    [
      `분모가 같으므로 두 분자의 합은 ${josaNum(f.sum, "이", "가")} 됩니다. ` +
        `진분수라 분자는 분모보다 작으므로 될 수 있는 두 분수는 ` +
        `${pairs
          .map(
            ([p, q]) =>
              `${expr(rawFrac(p, f.den))}${fracJosa(p, "과", "와")} ${expr(rawFrac(q, f.den))}`,
          )
          .join(", ")} 입니다.`,
      `쌍마다 차를 구해 보면 ${shows} 입니다.`,
      `이 가운데 ${expr(rawFrac(f.lo, f.den))} 보다 크고 ` +
        `${expr(rawFrac(f.hi, f.den))} 보다 작은 것은 ` +
        `${expr(rawFrac(f.diff, f.den))} 하나이므로 ${f.askSmall ? "작은" : "큰"} 분수는 ` +
        `${expr(rawFrac(f.askSmall ? f.small : f.big, f.den))} 입니다.`,
    ],
  );
}

/**
 * **2-1-3 5단 심화중 — 「받아올림이 있었나」가 마디를 굳힌다.**
 * 자연수 부분끼리 더한 값과 합의 자연수 부분이 다르면 분수 부분에서 $1$을 받아올린
 * 것이다. 그 사실을 먼저 정하지 않으면 「분수 부분끼리 더한 값」이 안 굳는다.
 */
function tier213Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier213MidRaw(unit, rng));
}

function tier213MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, FRAC_DENS);
  const w1 = intBetween(rng, 2, 5);
  // 자연수 부분이 같으면 「각각 $2$와 $2$」가 되어 «각각»이 말이 안 된다.
  const w2 = pick(
    rng,
    [2, 3, 4, 5, 6].filter((v) => v !== w1),
  );
  const rest = intBetween(rng, 1, den - 2);
  const numSum = den + rest;
  return makeDeep(
    unit,
    `분모가 ${josaNum(den, "인", "인")} 두 대분수를 더했더니 합이 ` +
      `${expr(`${w1 + w2 + 1}\\frac{${rest}}{${den}}`)}${fracJosa(rest, "이", "가")} ` +
      `되었습니다. 두 대분수의 ` +
      `자연수 부분은 각각 ${josaNum(w1, "과", "와")} ${josaNum(w2, "입니다", "입니다")}. ` +
      `두 대분수의 분수 부분의 분자의 합은 얼마입니까?`,
    n(numSum),
    [
      `자연수 부분끼리 더하면 ${expr(`${w1}+${w2}=${w1 + w2}`)} 인데 합의 자연수 ` +
        `부분은 ${josaNum(w1 + w2 + 1, "이므로", "이므로")} 분수 부분끼리 더한 값이 ` +
        `${n(1)}보다 커서 자연수에 ${josaNum(1, "을", "를")} 받아올렸습니다.`,
      `그러므로 분수 부분끼리 더한 값은 ${expr(rawFrac(rest, den))}${fracJosa(rest, "이", "가")} ` +
        `아니라 ${expr(`1\\frac{${rest}}{${den}}`)} 이고, 이것은 ` +
        `${expr(rawFrac(numSum, den))} 입니다.`,
      `분모가 같으므로 두 분자의 합은 ${expr(`${den}+${rest}=${numSum}`)} 입니다.`,
    ],
  );
}

/**
 * **2-1-4 5단 심화중 — 「받아내림이 있었나」가 마디를 굳힌다.**
 * 2-1-3 의 짝이다. 자연수 부분의 차와 실제 차의 자연수 부분이 다르면 분수끼리 뺄 수
 * 없어 $1$을 받아내린 것이고, 그것이 빼는 수의 분자에 **부등식 하나**를 건다.
 */
function tier214Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier214MidRaw(unit, rng));
}

function tier214MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const den = pick(rng, FRAC_DENS);
  const topNum = intBetween(rng, 1, den - 3);
  const w1 = intBetween(rng, 5, 8);
  const w2 = intBetween(rng, 2, w1 - 3);
  const smallest = topNum + 1;
  const restNum = den + topNum - smallest;
  return makeDeep(
    unit,
    `${expr(`${w1}\\frac{${topNum}}{${den}}`)} 에서 분모가 같고 자연수 부분이 ${josaNum(w2, "인", "인")} ` +
      `대분수를 뺐더니 차의 자연수 부분이 ${josaNum(w1 - w2 - 1, "이", "가")} 되었습니다. ` +
      `빼는 대분수의 분수 부분의 분자가 될 수 있는 수 중에서 가장 작을 때의 차를 ` +
      `구하시오.`,
    expr(`${w1 - w2 - 1}\\frac{${restNum}}{${den}}`),
    [
      `자연수 부분끼리 빼면 ${expr(`${w1}-${w2}=${w1 - w2}`)} 인데 차의 자연수 부분이 ` +
        `${josaNum(w1 - w2 - 1, "이므로", "이므로")} 분수끼리 뺄 수 없어 자연수에서 ` +
        `${josaNum(1, "을", "를")} 받아내렸습니다.`,
      `곧 빼는 수의 분자가 ${josaNum(topNum, "보다", "보다")} 커야 하므로 될 수 있는 ` +
        `수 중 가장 작은 것은 ${expr(`${topNum}+1=${smallest}`)} 입니다.`,
      `${expr(`${w1}\\frac{${topNum}}{${den}}=${w1 - 1}\\frac{${den + topNum}}{${den}}`)} ` +
        `이므로 이렇게 고쳐서 빼면 ${expr(`${w1 - 1}-${w2}=${w1 - w2 - 1}`)} 이고 ` +
        `${expr(`${rawFrac(den + topNum, den)}-${rawFrac(smallest, den)}=${rawFrac(restNum, den)}`)} ` +
        `이므로 차는 ${expr(`${w1 - w2 - 1}\\frac{${restNum}}{${den}}`)} 입니다.`,
    ],
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

/** 「그림에서 …의 기호를 쓰시오」에 쓰는 기호 — 자리 순서 그대로 붙는다. */
const PICK_LABELS = ["가", "나", "다"] as const;

/**
 * **정답 도형의 자리를 씨앗마다 섞는다.**
 *
 * 🔴 옛 판은 정답 도형을 늘 **첫 자리**에 놓아 기호 「가」를 붙였다. 그러면
 * **발문을 안 읽고 「가」라고 써도 맞는다** — 실측 2026-08-24 로 세 소단원
 * (2-2-1 · 2-4-4 · 2-4-6) 174건이 전량 «가» 였다.
 *
 * ⚠️ **값 검산은 이 부류를 구조적으로 못 본다** — 답이 늘 «맞기» 때문이다. 그리고
 * R9 는 «발문 + 그림»만 보므로 정답 축이 아예 없었다. 2-2-1 은 그림 스펙이 **6가지로
 * 갈리는데도** 답이 늘 「가」였다 — 「그림을 씨앗마다 다르게」로는 안 갚아진다.
 *
 * 라벨은 **자리 순서 그대로** 가·나·다다(건너뛰면 지면이 이상해진다). 섞는 것은
 * 「정답 도형이 몇째 자리에 오는가」뿐이다.
 */
function labelledPick(
  rng: Rng,
  answerShape: string,
  others: readonly string[],
): {
  answer: string;
  other: string;
  items: { shape: string; label: string }[];
} {
  if (others.length + 1 > PICK_LABELS.length) {
    throw new Error(
      `기호가 모자랍니다: 도형 ${others.length + 1}개 — PICK_LABELS 를 늘려라`,
    );
  }
  const at = intBetween(rng, 0, others.length);
  const ordered = [...others];
  ordered.splice(at, 0, answerShape);
  const items = ordered.map((shape, i) => ({ shape, label: PICK_LABELS[i]! }));
  const answer = PICK_LABELS[at]!;
  return {
    answer,
    other: items.find((x) => x.label !== answer)!.label,
    items,
  };
}

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
    const put = labelledPick(rng, "eqTri", [second, third]);
    return make(
      unit,
      "그림에서 정삼각형의 기호를 쓰시오.",
      put.answer,
      `${put.answer}는 세 변의 길이가 모두 같습니다. 세 변의 길이가 같은 삼각형을 정삼각형이라고 합니다.`,
      fig("namedShapes", { items: put.items }),
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

/* ──────────── 2-2 난이도 4단 (D-72 확대, 2026-08-23) ────────────
 *
 * **도형 성질 소단원이라 1단은 「계산」이 아니라 「성질 한 번 적용」이다.**
 * 자료형 1단을 「값 읽기」로 두는 것(D-72 ⑶)과 같은 자리다 — 세로 셈이 없는 소단원에
 * 억지로 계산을 넣으면 그 소단원이 **안 가르치는 것**을 묻게 된다.
 *
 * 표준이 이미 쓴 뼈대를 피했다: 세 변→이름 · 그림에서 고르기 · 꼭지각↔밑각 ·
 * 두 변+나머지→둘레 · 정삼각형 한 각/둘레/둘레÷3 · 두 각·세 각→분류 ·
 * 정삼각형은 예각 · 밑각·꼭지각→두 이름. 갈래는 **묻는 방향**을 돌려서 갈랐다.
 *
 * ⚠️ **「정삼각형도 이등변삼각형인가」를 묻는 발문은 한 갈래도 만들지 않는다.**
 * 교과서마다 다루는 방식이 갈려 **답이 하나로 안 정해진다.** 그래서 2-2-1 1단은
 * 이름이 아니라 **개수**를 묻고(정삼각형이면 $3$, 이등변이면 $2$), 2-2-5 는 1단·3단에서
 * 세 각이 모두 같은 경우를 **아예 안 뽑는다.**
 *
 * ⚠️ **삼각형이 되는 조건(두 변의 합 > 나머지 한 변)은 초4 범위 밖이다.** 그래서
 * 「나머지 한 변이 될 수 있는 길이를 모두」 류는 **두 경우가 다 성립하는 수만** 뽑는다 —
 * 뽑고 거르는 게 아니라 **못 뽑을 자리를 안 만든다**(`isoSidePairs`).
 *
 * ⚠️ **그림(`markedShape`)은 아직 안 붙였다.** 스펙 모양은 알지만 이 워크트리에서
 * **한 번도 렌더해 본 적이 없다**(그림 세션 하네스가 도는 중). 「도는 것을 본 적 없는
 * 그림」을 배선하면 안 된다 — 2026-08-23 에 같은 자리에서 물렸다. 하네스 창이 닫히고
 * 실제로 그려지는 것을 본 뒤 1단 다섯에 얹는다.
 */

/**
 * 세 변으로 **삼각형이 되는가** — 두 짧은 변의 합이 가장 긴 변보다 길어야 한다.
 *
 * ⚠️ **이 판정은 여기 한 곳에만 둔다.** 갈래마다 손으로 적으면 한 곳만 고쳐도 아무도
 * 모른다 — 실제로 그렇게 새어 2-2-1 4단이 $(10,5,5)$·$(8,4,4)$ 를 냈다. 그 값들은
 * **둘레도 맞고 「같은 두 변」도 맞아 값 검산으로는 안 잡힌다.** 산술이 전부 옳은데
 * 삼각형이 아니라 **납작하게 겹친 선분**일 뿐이다. 그리고 초4 는 이 조건을 배우지
 * 않으므로 **학생이 가려낼 수도 없다** — 우리가 안 내는 수밖에 없다.
 */
function isTriangle(a: number, b: number, c: number): boolean {
  const [x, y, z] = [a, b, c].sort((p, q) => p - q);
  return x! + y! > z!;
}

/**
 * 「두 변이 $a$, $b$ 인 이등변삼각형」의 나머지 한 변이 **두 경우 다** 되는 짝.
 *
 * 나머지 한 변은 $a$ 이거나 $b$ 인데, 두 경우가 다 삼각형이어야 답이 둘이다.
 * 안 그러면 답이 **하나뿐**인데 발문은 「모두 쓰시오」라고 묻는다.
 */
function isoSidePairs(): readonly (readonly [number, number])[] {
  const out: (readonly [number, number])[] = [];
  for (let small = 3; small <= 12; small += 1) {
    for (let big = small + 1; big <= small * 2 + 2; big += 1) {
      if (isTriangle(small, small, big) && isTriangle(small, big, big)) {
        out.push([small, big]);
      }
    }
  }
  return out;
}

/** 세 각을 늘어놓는 차례. 큰 각이 늘 같은 자리에 오면 **자리로 외운다**. */
const TRI_PERMS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
] as const;

/** 정삼각형 모양으로 나올 만한 물건. 소재가 갈려야 씨앗을 바꾼 보람이 있다. */
const EQ_TRI_ITEMS = ["표지판", "타일", "액자", "받침대"] as const;

/** 잘라 쓰는 재료 — 「남은 것」을 물을 수 있는 소재. */
const WIRE_ITEMS = ["철사", "끈", "리본", "털실"] as const;

/**
 * 이등변삼각형에서 「꼭지각 = 밑각의 $k$배」(또는 그 반대)가 **자연수로 떨어지는** 짝.
 *
 * $1$배는 뺀다 — 세 각이 모두 $60^\circ$ 가 되어 이 대단원이 피하기로 한
 * 「정삼각형도 이등변삼각형인가」 자리로 들어간다.
 */
const ISO_RATIOS = [
  { k: 2, apexIsBig: true }, // 밑각 45 · 꼭지각 90
  { k: 3, apexIsBig: true }, // 36 · 108
  { k: 4, apexIsBig: true }, // 30 · 120
  { k: 7, apexIsBig: true }, // 20 · 140
  { k: 8, apexIsBig: true }, // 18 · 144
  { k: 2, apexIsBig: false }, // 밑각 72 · 꼭지각 36
  { k: 4, apexIsBig: false }, // 80 · 20
  { k: 7, apexIsBig: false }, // 84 · 12
] as const;

/** **2-2-1 1단 — 길이가 같은 변의 «개수».** 표준은 「이름을 쓰시오」, 여기는 개수다. */
function tier221Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const kind = intBetween(rng, 0, 2);
  if (kind === 0) {
    const s = intBetween(rng, 4, 12);
    return make(
      unit,
      `삼각형의 세 변의 길이가 ${cm(s)}, ${cm(s)}, ${cm(s)}입니다. ` +
        `길이가 같은 변은 몇 개인가?`,
      `${n(3)}개`,
      `세 변의 길이가 모두 ${cm(s)}로 같으므로 길이가 같은 변은 ${n(3)}개입니다.`,
    );
  }
  if (kind === 1) {
    const [small, big] = pick(rng, isoSidePairs());
    const same = intBetween(rng, 0, 1) === 0 ? small : big;
    const odd = same === small ? big : small;
    // 다른 한 변이 앞·가운데·뒤 어디에도 오게 — 「끝의 둘이 같다」로 외우지 못하게.
    const sides = [same, same, same];
    sides[intBetween(rng, 0, 2)] = odd;
    return make(
      unit,
      `삼각형의 세 변의 길이가 ${cm(sides[0]!)}, ${cm(sides[1]!)}, ${cm(sides[2]!)}입니다. ` +
        `길이가 같은 변은 몇 개인가?`,
      `${n(2)}개`,
      `${cm(same)}인 변이 ${n(2)}개, ${cm(odd)}인 변이 ${n(1)}개입니다. ` +
        `길이가 같은 변은 ${n(2)}개입니다.`,
    );
  }
  const a = intBetween(rng, 5, 9);
  const b = a + intBetween(rng, 1, 3);
  const c = b + intBetween(rng, 1, 3);
  return make(
    unit,
    `삼각형의 세 변의 길이가 ${cm(a)}, ${cm(b)}, ${cm(c)}입니다. ` +
      `길이가 같은 변은 몇 개인가?`,
    `${n(0)}개`,
    `세 변의 길이 ${cm(a)}, ${cm(b)}, ${cm(c)}가 서로 모두 다르므로 ` +
      `길이가 같은 변은 ${n(0)}개입니다.`,
  );
}

/** **2-2-1 2단 — 나머지 한 변이 될 수 있는 길이를 «모두».** 이등변의 뜻을 스스로 편다. */
function tier221Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const [small, big] = pick(rng, isoSidePairs());
  return make(
    unit,
    `이등변삼각형의 두 변의 길이가 각각 ${cm(small)}, ${cm(big)}입니다. ` +
      `나머지 한 변의 길이가 될 수 있는 길이를 모두 쓰시오.`,
    `${cm(small)}, ${cm(big)}`,
    `이등변삼각형은 길이가 같은 변이 ${n(2)}개입니다. ` +
      `나머지 한 변이 ${cm(small)}이면 세 변이 ${cm(small)}, ${cm(small)}, ${cm(big)}이고, ` +
      `${cm(big)}이면 ${cm(small)}, ${cm(big)}, ${cm(big)}입니다. ` +
      `두 경우 모두 길이가 같은 변이 ${n(2)}개이므로 ` +
      `${cm(small)}와 ${cm(big)} 두 가지가 될 수 있습니다.`,
  );
}

/** 「같은 두 변」과 다르면서 삼각형이 되는 나머지 한 변 — 이등변이 뜻을 갖는 자리. */
function otherSides(leg: number): number[] {
  return Array.from({ length: leg * 2 + 2 }, (_, i) => i + 2).filter(
    (v) => v !== leg && isTriangle(leg, leg, v),
  );
}

/** **2-2-1 3단 — 둘레와 나머지 한 변에서 «같은 두 변».** 빼고 나누는 두 단계다. */
function tier221Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const leg = intBetween(rng, 5, 14);
  const other = pick(rng, otherSides(leg));
  const total = leg * 2 + other;
  return make(
    unit,
    `세 변의 길이의 합이 ${cm(total)}인 이등변삼각형이 있습니다. ` +
      `길이가 같은 두 변이 아닌 나머지 한 변의 길이가 ${cm(other)}일 때, ` +
      `길이가 같은 두 변의 길이는 각각 몇 cm인가?`,
    cm(leg),
    `길이가 같은 두 변의 길이의 합은 ${expr(`${total}-${other}=${total - other}`)} 입니다. ` +
      `두 변의 길이가 서로 같으므로 ${expr(`${total - other}\\div2=${leg}`)} 입니다.`,
  );
}

/**
 * **2-2-1 4단 — 두 조건을 엮어 세 변을 다 찾는다.**
 *
 * 둘레 하나로는 안 풀리고 「같은 두 변이 나머지보다 $d$ 만큼 길다/짧다」가 같이 있어야
 * 정해진다. 나머지 한 변을 $\square$ 로 두면 `□ × 3 ± d × 2 = 둘레` 다.
 *
 * ⚠️ **첫 판은 「한 변만 뺐더니」 복원(잘못 계산)이었다.** 그러면 이 대단원의 4단 다섯 중
 * **둘**이 「잘못된 것을 바로잡기」가 된다 — 한 시험지에 2-2 심화가 둘 실리면 같은 문형이
 * 나란히 선다(리드 2026-08-23). 「잘못」 문형은 2-2-4 에 하나만 남겼다. 거기가 더 값지다 —
 * 거긴 **셈이 아니라 근거가 틀린** 자리라 다른 갈래로 대신할 수 없다.
 *
 * ⚠️ **첫 판은 「$\square>d$ 면 된다」로 적었다가 $(10,5,5)$·$(8,4,4)$ 를 냈다.**
 * 그건 삼각형이 아니라 납작하게 겹친 선분이다. 이제 손으로 안 적고 `isTriangle` 하나에
 * 물어본다 — 조건을 갈래마다 적으면 한 곳만 고쳐도 아무도 모른다.
 */
function tier221Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const longer = intBetween(rng, 0, 1) === 0;
  const d = intBetween(rng, 1, 6);
  const other = pick(
    rng,
    Array.from({ length: 20 }, (_, i) => i + 4).filter((v) => {
      const side = longer ? v + d : v - d;
      return side > 0 && isTriangle(side, side, v);
    }),
  );
  const leg = longer ? other + d : other - d;
  const total = leg * 2 + other;
  return make(
    unit,
    `세 변의 길이의 합이 ${cm(total)}인 이등변삼각형이 있습니다. ` +
      `길이가 같은 두 변은 나머지 한 변보다 각각 ${cm(d)} ` +
      `${longer ? "깁니다" : "짧습니다"}. 세 변의 길이를 각각 구하시오.`,
    `${cm(other)}, ${cm(leg)}, ${cm(leg)}`,
    `나머지 한 변의 길이를 ${expr("\\square")}라고 하면 길이가 같은 두 변은 각각 ` +
      `${expr(`\\square${longer ? "+" : "-"}${d}`)} 이므로 세 변의 길이의 합은 ` +
      `${expr(`\\square\\times3${longer ? "+" : "-"}${d * 2}=${total}`)} 입니다. ` +
      `${expr(`\\square\\times3=${total}${longer ? "-" : "+"}${d * 2}=${other * 3}`)} 이고 ` +
      `${expr(`${other * 3}\\div3=${other}`)} 이므로 나머지 한 변은 ${cm(other)}, ` +
      `길이가 같은 두 변은 각각 ${cm(leg)}입니다.`,
  );
}

/**
 * 밑각이 될 수 있는 크기. **$60^\circ$ 는 뺀다** — 그러면 세 각이 모두 $60^\circ$ 라
 * 정삼각형인데 발문은 「이등변삼각형」이라 부르게 되어, 이 대단원이 피하기로 한
 * 「정삼각형도 이등변삼각형인가」 자리로 들어간다. 답은 정해지지만 발문이 흔들린다.
 */
function baseAngles(lo: number, hi: number): number[] {
  return Array.from({ length: hi - lo + 1 }, (_, i) => i + lo).filter(
    (v) => v !== 60,
  );
}

/** **2-2-2 1단 — 성질 한 번.** 표준은 꼭지각↔밑각(계산), 여기는 «다른 한 밑각»이다. */
function tier222Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const base = pick(rng, baseAngles(25, 80));
  if (intBetween(rng, 0, 1) === 0) {
    return make(
      unit,
      `이등변삼각형의 한 밑각의 크기가 ${deg(base)}입니다. ` +
        `다른 한 밑각의 크기는 몇 도인가?`,
      deg(base),
      `이등변삼각형은 두 밑각의 크기가 같습니다. 한 밑각이 ${deg(base)}이므로 ` +
        `다른 한 밑각도 ${deg(base)}입니다.`,
    );
  }
  return make(
    unit,
    `어떤 삼각형에 크기가 같은 두 각이 있고 그중 한 각의 크기가 ${deg(base)}입니다. ` +
      `크기가 같은 나머지 한 각의 크기는 몇 도인가?`,
    deg(base),
    `두 각의 크기가 같은 삼각형은 이등변삼각형입니다. 크기가 같은 두 각이므로 ` +
      `나머지 한 각의 크기도 ${deg(base)}입니다.`,
  );
}

/** **2-2-2 2단 — 두 밑각의 «합»에서 꼭지각.** 세 각의 합을 스스로 끌어와야 선다. */
function tier222Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const base = pick(rng, baseAngles(30, 85));
  const sum = base * 2;
  return make(
    unit,
    `이등변삼각형에서 두 밑각의 크기의 합이 ${deg(sum)}입니다. ` +
      `꼭지각의 크기는 몇 도인가?`,
    deg(180 - sum),
    `삼각형의 세 각의 크기의 합은 ${deg(180)}입니다. 두 밑각의 합이 ${deg(sum)}이므로 ` +
      `꼭지각은 ${expr(`180-${sum}=${180 - sum}`)} 입니다.`,
  );
}

/**
 * **2-2-2 3단 — 「꼭지각이 한 밑각보다 □ 크다/작다」.** 중간값은 밑각이다.
 *
 * 세 각이 밑각·밑각·(밑각$\pm d$) 이므로 `밑각 × 3 = 180 ∓ d` 다. 밑각이 자연수가 되려면
 * $d$ 가 $3$의 배수여야 한다 — 뽑고 거르지 않고 **$3$의 배수만 뽑는다.**
 * 작은 쪽은 꼭지각이 $0$ 보다 커야 하고(`d<90`), 큰 쪽은 밑각이 남아야 한다(`d<180`).
 */
function tier222Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const smaller = intBetween(rng, 0, 1) === 0;
  const d = intBetween(rng, 1, smaller ? 28 : 20) * 3;
  const baseAngle = smaller ? (180 + d) / 3 : (180 - d) / 3;
  const apex = smaller ? baseAngle - d : baseAngle + d;
  const sign = smaller ? "-" : "+";
  return make(
    unit,
    `이등변삼각형에서 꼭지각의 크기가 한 밑각의 크기보다 ${deg(d)} ` +
      `${smaller ? "작습니다" : "큽니다"}. 꼭지각의 크기는 몇 도인가?`,
    deg(apex),
    `한 밑각의 크기를 ${expr("\\square")}라고 하면 세 각의 크기의 합은 ` +
      `${expr(`\\square+\\square+(\\square${sign}${d})=180`)} 입니다. ` +
      `${expr(`\\square\\times3=180${smaller ? "+" : "-"}${d}=${baseAngle * 3}`)} 이므로 ` +
      `한 밑각은 ${deg(baseAngle)}이고, 꼭지각은 ` +
      `${expr(`${baseAngle}${sign}${d}=${apex}`)} 입니다.`,
  );
}

/**
 * **2-2-2 4단 — 「꼭지각이 한 밑각의 □배」.** 조건을 결합해 거꾸로 각을 찾는다.
 *
 * 3단이 **차**라면 여기는 **배**다. 밑각을 $\square$ 로 두면 세 각의 합이
 * `□ × (2+k) = 180`(또는 `□ × (2k+1) = 180`)이 되어, 나눗셈 한 번이 더 든다.
 */
function tier222Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const { k, apexIsBig } = pick(rng, ISO_RATIOS);
  const parts = apexIsBig ? k + 2 : 2 * k + 1;
  const one = 180 / parts;
  const baseAngle = apexIsBig ? one : one * k;
  const apex = 180 - baseAngle * 2;
  const askApex = intBetween(rng, 0, 1) === 0;
  const head = apexIsBig
    ? `이등변삼각형에서 꼭지각의 크기가 한 밑각의 크기의 ${n(k)}배입니다.`
    : `이등변삼각형에서 한 밑각의 크기가 꼭지각의 크기의 ${n(k)}배입니다.`;
  const build = apexIsBig
    ? `한 밑각의 크기를 ${expr("\\square")}라고 하면 꼭지각은 ${expr(`\\square\\times${k}`)} 이므로 ` +
      `세 각의 크기의 합은 ${expr(`\\square\\times${parts}=180`)} 입니다. ` +
      `${expr(`180\\div${parts}=${one}`)} 이므로 한 밑각은 ${deg(baseAngle)}입니다.`
    : `꼭지각의 크기를 ${expr("\\square")}라고 하면 한 밑각은 ${expr(`\\square\\times${k}`)} 이므로 ` +
      `세 각의 크기의 합은 ${expr(`\\square\\times${parts}=180`)} 입니다. ` +
      `${expr(`180\\div${parts}=${one}`)} 이므로 꼭지각은 ${deg(apex)}입니다.`;
  return make(
    unit,
    `${head} ${askApex ? "꼭지각" : "한 밑각"}의 크기는 몇 도인가?`,
    deg(askApex ? apex : baseAngle),
    `${build} 세 각의 크기는 ${deg(baseAngle)}, ${deg(baseAngle)}, ${deg(apex)}이므로 ` +
      `${askApex ? "꼭지각" : "한 밑각"}의 크기는 ${deg(askApex ? apex : baseAngle)}입니다.`,
  );
}

/** **2-2-3 1단 — 성질 한 번.** 한 변에서 나머지 두 변으로. 표준은 이 방향을 안 쓴다. */
function tier223Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const item = pick(rng, EQ_TRI_ITEMS);
  const s = intBetween(rng, 4, 15);
  return make(
    unit,
    `정삼각형 모양의 ${josa(item, "이", "가")} 있습니다. 한 변의 길이가 ${cm(s)}일 때 ` +
      `나머지 두 변의 길이는 각각 몇 cm인가?`,
    cm(s),
    `정삼각형은 세 변의 길이가 모두 같습니다. 한 변이 ${cm(s)}이므로 ` +
      `나머지 두 변도 각각 ${cm(s)}입니다.`,
  );
}

/**
 * **2-2-3 2단 — 이름을 숨기고 «각» 조건으로 준다.**
 *
 * 표준은 「정삼각형의 한 변이 …」처럼 **이름을 준다.** 여기는 「세 각의 크기가 모두 같은」
 * 으로 주어, 각 성질 → 이름 → 변 성질을 스스로 이어야 식이 선다.
 */
function tier223Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 4, 15);
  const wholeSum = intBetween(rng, 0, 1) === 0;
  const value = wholeSum ? s * 3 : s * 2;
  return make(
    unit,
    `세 각의 크기가 모두 같은 삼각형이 있습니다. 한 변의 길이가 ${cm(s)}일 때 ` +
      `${wholeSum ? "세 변의 길이의 합" : "나머지 두 변의 길이의 합"}은 몇 cm인가?`,
    cm(value),
    `세 각의 크기가 모두 같은 삼각형은 정삼각형이고, 정삼각형은 세 변의 길이가 모두 같습니다. ` +
      `${expr(`${s}\\times${wholeSum ? 3 : 2}=${value}`)} 이므로 ${cm(value)}입니다.`,
  );
}

/** **2-2-3 3단 — 만들고 «남은» 길이.** 중간값은 정삼각형 한 개에 드는 길이다. */
function tier223Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const item = pick(rng, WIRE_ITEMS);
  const side = intBetween(rng, 4, 13);
  const left = intBetween(rng, 2, 30);
  const total = side * 3 + left;
  return make(
    unit,
    `길이가 ${cm(total)}인 ${josa(item, "을", "를")} 사용하여 한 변의 길이가 ${cm(side)}인 ` +
      `정삼각형을 한 개 만들었습니다. 남은 ${josa(item, "은", "는")} 몇 cm인가?`,
    cm(left),
    `정삼각형은 세 변의 길이가 같으므로 만드는 데 쓴 ${item}의 길이는 ` +
      `${expr(`${side}\\times3=${side * 3}`)} 입니다. ` +
      `남은 길이는 ${expr(`${total}-${side * 3}=${left}`)} 입니다.`,
  );
}

/** **2-2-3 4단 — 「남김없이 썼다」에서 개수를 되짚는다.** 곱하고 나누는 역산이다. */
function tier223Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const item = pick(rng, WIRE_ITEMS);
  const side = intBetween(rng, 4, 12);
  const count = intBetween(rng, 3, 8);
  const each = side * 3;
  return make(
    unit,
    `길이가 ${cm(each * count)}인 ${josa(item, "을", "를")} 남김없이 사용하여 ` +
      `한 변의 길이가 ${cm(side)}인 정삼각형을 여러 개 만들었습니다. ` +
      `정삼각형을 몇 개 만들었는가?`,
    `${n(count)}개`,
    `정삼각형 한 개를 만드는 데 필요한 ${item}의 길이는 ` +
      `${expr(`${side}\\times3=${each}`)} 입니다. ` +
      `${expr(`${each * count}\\div${each}=${count}`)} 이므로 ${n(count)}개를 만들었습니다.`,
  );
}

/** 부류를 **먼저 정하고** 세 각을 만든다 — 씨앗에 맡기면 한쪽만 쏟아진다. */
function triAnglesOfClass(rng: Rng, kind: number): [number, number, number] {
  if (kind === 0) {
    const a = intBetween(rng, 20, 70);
    return [90, a, 90 - a];
  }
  if (kind === 1) {
    const big = intBetween(rng, 95, 130);
    const a = intBetween(rng, 20, 170 - big);
    return [big, a, 180 - big - a];
  }
  const a = intBetween(rng, 55, 85);
  const b = intBetween(rng, 55, 85);
  return [a, b, 180 - a - b];
}

/** **2-2-4 1단 — 그 부류의 각이 «몇 개»인가.** 표준은 분류 이름, 여기는 개수다. */
function tier224Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const angles = triAnglesOfClass(rng, intBetween(rng, 0, 2));
  const shown = pick(rng, TRI_PERMS).map((i) => angles[i]!);
  const ask = pick(rng, ["예각", "직각", "둔각"] as const);
  const hit = shown.filter((v) =>
    ask === "예각" ? v < 90 : ask === "직각" ? v === 90 : v > 90,
  );
  const rule =
    ask === "예각"
      ? `${deg(90)}보다 작은 각`
      : ask === "직각"
        ? `${deg(90)}인 각`
        : `${deg(90)}보다 크고 ${deg(180)}보다 작은 각`;
  return make(
    unit,
    `삼각형의 세 각의 크기가 ${deg(shown[0]!)}, ${deg(shown[1]!)}, ${deg(shown[2]!)}입니다. ` +
      `이 삼각형에서 ${ask}은 몇 개인가?`,
    `${n(hit.length)}개`,
    `${ask}은 ${rule}입니다. 세 각 중 ${ask}은 ` +
      `${hit.length > 0 ? `${hit.map((v) => deg(v)).join(", ")}로 ${n(hit.length)}개` : `없으므로 ${n(0)}개`}입니다.`,
  );
}

/**
 * **2-2-4 2단 — 분류 이름을 «조건»으로 준다.** 표준의 역방향이다.
 *
 * 표준은 각 → 이름이고, 여기는 이름 → 각이다. 「직각삼각형」이라는 말에서
 * $90^\circ$ 하나를 스스로 꺼내야 식이 선다.
 */
function tier224Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  if (intBetween(rng, 0, 3) === 0) {
    return make(
      unit,
      `직각삼각형에서 직각이 아닌 두 각의 크기의 합은 몇 도인가?`,
      deg(90),
      `직각삼각형에는 크기가 ${deg(90)}인 각이 하나 있고 세 각의 크기의 합은 ${deg(180)}입니다. ` +
        `나머지 두 각의 합은 ${expr("180-90=90")} 입니다.`,
    );
  }
  const one = intBetween(rng, 20, 70);
  return make(
    unit,
    `직각삼각형에서 직각이 아닌 한 각의 크기가 ${deg(one)}입니다. ` +
      `나머지 한 각의 크기는 몇 도인가?`,
    deg(90 - one),
    `직각삼각형에는 크기가 ${deg(90)}인 각이 하나 있습니다. ` +
      `세 각의 크기의 합이 ${deg(180)}이므로 나머지 한 각은 ` +
      `${expr(`180-90-${one}=${90 - one}`)} 입니다.`,
  );
}

/**
 * **2-2-4 3단 — 「두 각이 같고 나머지가 □」에서 분류.** 중간값은 그 같은 두 각이다.
 *
 * 주어진 각을 **부류부터 정해** 뽑는다. 씨앗에 맡기면 세 부류가 안 고루 나온다
 * (표준 2-2-4 가 이미 같은 이유로 그렇게 한다).
 *
 * ⚠️ **직각삼각형은 이 문형으로 못 낸다 — 그래서 안 낸다.** 두 각이 같은 삼각형이
 * 직각삼각형이려면 직각이 «나머지 한 각»일 수밖에 없는데(같은 두 각이 둘 다 직각일 수는
 * 없다), 그러면 발문이 $90^\circ$ 를 그대로 보여 주어 **중간값을 구할 것도 없이 답이 보인다.**
 * 3단인데 1단이 되는 자리다. 첫 판에는 들어 있었고 표본을 눈으로 보고서 걸렀다 —
 * 「세 부류가 다 나온다」만 세면 이건 구조적으로 안 보인다.
 */
function tier224Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const given =
    intBetween(rng, 0, 1) === 0
      ? intBetween(rng, 5, 44) * 2 // 10~88 → 같은 두 각이 46~85 라 가장 큰 각이 90 미만
      : intBetween(rng, 46, 85) * 2; // 92~170 → 둔각
  const same = (180 - given) / 2;
  const big = Math.max(given, same);
  return make(
    unit,
    `삼각형에서 두 각의 크기가 서로 같고 나머지 한 각의 크기가 ${deg(given)}입니다. ` +
      `이 삼각형은 예각삼각형, 직각삼각형, 둔각삼각형 중 무엇인가?`,
    triClass(given, same, same),
    `크기가 같은 두 각의 합은 ${expr(`180-${given}=${180 - given}`)} 이고 ` +
      `두 각이 같으므로 각각 ${expr(`${180 - given}\\div2=${same}`)} 입니다. ` +
      `세 각 중 가장 큰 각이 ${deg(big)}이므로 ${triClass(given, same, same)}입니다.`,
  );
}

/**
 * **2-2-4 4단 — 「예각이 두 개니까 예각삼각형」을 바로잡는다.**
 *
 * 어느 삼각형에도 예각은 적어도 두 개 있으므로 그 근거는 **늘 참이면서 늘 쓸모없다.**
 * 가장 큰 각 하나가 부류를 정한다는 것을 알아야 갈린다. 그래서 표본은 직각·둔각만 쓴다 —
 * 예각삼각형을 뽑으면 잘못된 근거로도 답이 맞아 **이 갈래가 아무것도 안 묻는다.**
 *
 * ⚠️ **이 대단원에서 「잘못」 문형은 여기 하나만 둔다 — 다양성을 이유로 이것까지 바꾸지 말 것.**
 * 「잘못 계산」에는 두 종류가 있다: **셈을 틀린 것**과 **판단 근거를 틀린 것**. 앞엣것은
 * 역산·조건 결합으로 얼마든지 대신할 수 있어서 2-2-1 4단을 그렇게 바꿨다. 뒤엣것은
 * **대체재가 없다** — 「예각이 둘이니까」는 학생이 실제로 하는 오해이고, 그 오해를 바로
 * 겨누는 문형이 이것뿐이다(리드 확인 2026-08-23).
 */
function tier224Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const angles = triAnglesOfClass(rng, intBetween(rng, 0, 1));
  // **큰 각을 감춘다.** 세 각을 다 보여 주면 셈이 한 단계도 없어 3단(두 단계)보다
  // 가벼워진다 — 사다리가 뒤집힌 것으로 읽히는 자리다(리드가 g5 에서 잡은 그 무늬).
  // 감추면 ⑴ 나머지 한 각을 구하고 ⑵ 분류하고 ⑶ 잘못된 근거를 물리쳐야 한다.
  // 덤으로 **잘못된 근거가 더 자연스러워진다** — 「보이는 두 각이 다 예각이니까」는
  // 학생이 실제로 하는 오해다. 부류가 직각·둔각뿐이라 예각은 늘 정확히 둘이다.
  const hidden = angles.find((v) => v >= 90)!;
  const [a, b] = angles.filter((v) => v < 90);
  const shown = intBetween(rng, 0, 1) === 0 ? [a!, b!] : [b!, a!];
  const name = triClass(angles[0]!, angles[1]!, angles[2]!);
  return make(
    unit,
    `어떤 삼각형의 두 각의 크기가 ${deg(shown[0]!)}, ${deg(shown[1]!)}입니다. ` +
      `이 두 각이 모두 예각이므로 예각삼각형이라고 하였습니다. ` +
      `이 삼각형은 예각삼각형, 직각삼각형, 둔각삼각형 중 무엇인지 바르게 쓰시오.`,
    name,
    `나머지 한 각의 크기는 ` +
      `${expr(`180-${shown[0]!}-${shown[1]!}=${hidden}`)} 입니다. ` +
      `삼각형은 어느 것이나 예각이 적어도 ${n(2)}개 있으므로 예각의 개수로는 분류할 수 없고, ` +
      `가장 큰 각의 크기를 봐야 합니다. 가장 큰 각이 ${deg(hidden)}이므로 ${name}입니다.`,
  );
}

/**
 * **2-2-5 1단 — 한 기준을 «주고» 다른 기준을 읽는다.** 가장 큰 각 하나만 보면 된다.
 *
 * ⚠️ 첫 판은 「세 각을 주고 **변** 기준을 묻기」였다. 그러면 두 가지가 한꺼번에 나빴다 —
 * ⑴ 답이 늘 「이등변삼각형」 하나라 고를 것이 없고, ⑵ **각 기준이 문항에 아예 안 나와**
 * 이 소단원이 내건 「두 가지 기준」의 절반이 빠진다. 새로 붙인 소단원 조건 검사가 바로
 * 그것을 잡았다 — 검사가 옳고 갈래가 약했다. 변 기준을 발문이 **알려 주고** 각 기준을
 * 묻게 하면 한 단계는 그대로면서 두 축이 다 선다(답도 세 가지로 갈린다).
 *
 * 세 각이 모두 같은 경우는 안 뽑는다 — 「정삼각형인가 이등변삼각형인가」가 되어
 * 답이 하나로 안 정해진다(이 대단원이 피하기로 한 자리).
 */
function tier225Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const same = pick(rng, baseAngles(20, 85));
  const apex = 180 - same * 2;
  const shown = pick(rng, TRI_PERMS).map((i) => [same, same, apex][i]!);
  const big = Math.max(same, apex);
  return make(
    unit,
    `세 각의 크기가 ${deg(shown[0]!)}, ${deg(shown[1]!)}, ${deg(shown[2]!)}인 ` +
      `이등변삼각형이 있습니다. 이 삼각형을 각의 크기에 따라 분류하면 ` +
      `예각삼각형, 직각삼각형, 둔각삼각형 중 무엇인가?`,
    triClass(same, same, apex),
    `${deg(same)}인 각이 ${n(2)}개 있어 두 변의 길이가 같으므로 이등변삼각형입니다. ` +
      `각의 크기에 따라 분류할 때는 가장 큰 각을 봅니다. ` +
      `가장 큰 각이 ${deg(big)}이므로 ${triClass(same, same, apex)}입니다.`,
  );
}

/**
 * **2-2-5 2단 — 두 이름을 «함께» 걸고 각을 구한다.**
 *
 * 크기가 같은 두 각이 둘 다 직각이거나 둘 다 둔각일 수는 없으므로, 그 각은 **꼭지각**이다.
 * 이 판단이 이 소단원의 몫이다 — 한 기준만으로는 안 풀린다.
 */
function tier225Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const isRight = intBetween(rng, 0, 3) === 0;
  const apex = isRight ? 90 : intBetween(rng, 46, 85) * 2;
  const base = (180 - apex) / 2;
  const word = isRight ? "직각" : "둔각";
  return make(
    unit,
    `이등변삼각형이면서 ${word}삼각형인 삼각형이 있습니다. ` +
      (isRight
        ? `직각이 아닌 두 각의 크기는 각각 몇 도인가?`
        : `둔각의 크기가 ${deg(apex)}일 때 나머지 두 각의 크기는 각각 몇 도인가?`),
    deg(base),
    `크기가 같은 두 각이 모두 ${word}일 수는 없으므로 ${word}은 꼭지각입니다. ` +
      `나머지 두 각의 합은 ${expr(`180-${apex}=${180 - apex}`)} 이고 ` +
      `두 각의 크기가 같으므로 각각 ${expr(`${180 - apex}\\div2=${base}`)} 입니다.`,
  );
}

/**
 * **2-2-5 3단 — 한 밑각에서 «각 기준» 분류로.** 중간값은 꼭지각이다.
 *
 * 표준은 세 각을 다 주고 두 이름을 묻는다. 여기는 **한 각만** 주고, 나머지를 구한 뒤에야
 * 분류가 된다. 밑각이 $45^\circ$ 보다 작으면 둔각, 같으면 직각, 크면 예각이라 세 부류가 다 나온다.
 */
function tier225Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const base = pick(rng, baseAngles(20, 85));
  const apex = 180 - base * 2;
  const name = triClass(base, base, apex);
  return make(
    unit,
    `이등변삼각형의 한 밑각의 크기가 ${deg(base)}입니다. 이 삼각형을 각의 크기에 따라 ` +
      `분류하면 예각삼각형, 직각삼각형, 둔각삼각형 중 무엇인가?`,
    name,
    `두 밑각의 크기가 같으므로 꼭지각은 ${expr(`180-${base}-${base}=${apex}`)} 입니다. ` +
      `세 각 중 가장 큰 각이 ${deg(Math.max(base, apex))}이므로 ${name}입니다.`,
  );
}

/**
 * **2-2-5 4단 — 한 각만 주면 경우가 «둘»이다.**
 *
 * 주어진 각이 꼭지각일 수도 밑각일 수도 있다. $45^\circ$ 보다 작은 짝수만 쓰면
 * 두 경우의 **각 기준 분류가 서로 갈린다**(꼭지각이면 예각, 밑각이면 둔각) —
 * 갈리지 않으면 「경우를 나눈다」가 답에서 티가 안 나 이 갈래가 뜻을 잃는다.
 */
function tier225Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 5, 22) * 2; // 10~44 짝수
  const baseWhenApex = (180 - a) / 2; // 68~85 → 세 각이 모두 예각
  const apexWhenBase = 180 - a * 2; // 92~160 → 둔각
  return make(
    unit,
    `한 각의 크기가 ${deg(a)}인 이등변삼각형이 있습니다. 나머지 두 각의 크기가 될 수 있는 ` +
      `경우를 모두 구하고, 각각 각의 크기에 따라 분류하시오.`,
    `${deg(baseWhenApex)}, ${deg(baseWhenApex)}(예각삼각형) 또는 ` +
      `${deg(a)}, ${deg(apexWhenBase)}(둔각삼각형)`,
    `${deg(a)}가 꼭지각이면 두 밑각은 ${expr(`(180-${a})\\div2=${baseWhenApex}`)} 이고, ` +
      `세 각이 모두 ${deg(90)}보다 작으므로 예각삼각형입니다. ` +
      `${deg(a)}가 한 밑각이면 다른 한 밑각도 ${deg(a)}이고 꼭지각은 ` +
      `${expr(`180-${a}-${a}=${apexWhenBase}`)} 이므로 둔각삼각형입니다.`,
  );
}

function tri221NameEq(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 4, 12);
  return make(
    unit,
    `세 변의 길이가 ${cm(s)}, ${cm(s)}, ${cm(s)}인 삼각형의 이름을 쓰시오.`,
    "정삼각형",
    `세 변의 길이가 모두 같으므로 정삼각형입니다.`,
    fig("namedShapes", {
      items: labelledPick(rng, "eqTri", ["isoTri", "wideTri"]).items,
    }),
  );
}

function tri221PickEq(unit: UnitSeed, rng: Rng): ElemProblem {
  const put = labelledPick(rng, "eqTri", ["isoTri", "rightTri"]);
  return make(
    unit,
    "그림에서 정삼각형의 기호를 쓰시오.",
    put.answer,
    `${put.answer}는 세 변의 길이가 모두 같습니다.`,
    fig("namedShapes", { items: put.items }),
  );
}

function tri221Perim(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 4, 12);
  return make(
    unit,
    `한 변이 ${cm(s)}인 정삼각형의 세 변의 길이의 합은 몇 cm인가?`,
    cm(s * 3),
    `${expr(`${s}\\times3=${s * 3}`)} 이므로 ${cm(s * 3)}입니다.`,
    fig("namedShapes", { items: [{ shape: "eqTri", label: "가" }] }),
  );
}

function tri221NameIso(unit: UnitSeed, rng: Rng): ElemProblem {
  const [small, big] = pick(rng, isoSidePairs());
  return make(
    unit,
    `길이가 같은 변이 ${n(2)}개이고 세 변의 길이가 ${cm(small)}, ${cm(small)}, ${cm(big)}인 삼각형의 이름을 쓰시오.`,
    "이등변삼각형",
    `길이가 같은 변이 ${n(2)}개이므로 이등변삼각형입니다.`,
    fig("namedShapes", {
      items: labelledPick(rng, "isoTri", ["rightTri", "wideTri"]).items,
    }),
  );
}

function tri221PickIso(unit: UnitSeed, rng: Rng): ElemProblem {
  const put = labelledPick(rng, "isoTri", [
    "choiceScaleneTri",
    "choiceRightScaleneTri",
  ]);
  return make(
    unit,
    "그림에서 이등변삼각형의 기호를 쓰시오.",
    put.answer,
    `${put.answer}는 두 변의 길이가 같습니다.`,
    fig("namedShapes", { items: put.items }),
  );
}

function tri221Vertices(unit: UnitSeed, rng: Rng): ElemProblem {
  return make(
    unit,
    `그림의 삼각형에서 꼭짓점은 몇 개인가?`,
    n(3),
    `삼각형의 꼭짓점은 ${n(3)}개입니다.`,
    fig("namedShapes", {
      items: [
        {
          shape: pick(rng, ["eqTri", "isoTri", "rightTri"] as const),
          label: "가",
        },
      ],
    }),
  );
}

function tri222Sum180(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `이등변삼각형의 세 각의 크기의 합은 몇 도인가?`,
    deg(180),
    `삼각형의 세 각의 크기의 합은 ${deg(180)}입니다.`,
    fig("namedShapes", { items: [{ shape: "isoTri", label: "가" }] }),
  );
}

function tri222BaseSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const base = pick(rng, baseAngles(25, 80));
  return make(
    unit,
    `이등변삼각형의 한 밑각의 크기가 ${deg(base)}입니다. 두 밑각의 크기의 합은 몇 도인가?`,
    deg(base * 2),
    `${expr(`${base}+${base}=${base * 2}`)} 이므로 ${deg(base * 2)}입니다.`,
  );
}

function tri222Apex(unit: UnitSeed, rng: Rng): ElemProblem {
  const base = pick(rng, baseAngles(25, 80));
  return make(
    unit,
    `이등변삼각형의 한 밑각의 크기가 ${deg(base)}입니다. 꼭지각의 크기는 몇 도인가?`,
    deg(180 - base * 2),
    `${expr(`180-${base}-${base}=${180 - base * 2}`)} 이므로 ${deg(180 - base * 2)}입니다.`,
  );
}

function tri222Biggest(unit: UnitSeed, rng: Rng): ElemProblem {
  const base = pick(rng, baseAngles(25, 50));
  const apex = 180 - base * 2;
  return make(
    unit,
    `이등변삼각형의 밑각이 ${deg(base)}입니다. 가장 큰 각의 크기는 몇 도인가?`,
    deg(Math.max(base, apex)),
    `꼭지각은 ${deg(apex)}이므로 가장 큰 각은 ${deg(Math.max(base, apex))}입니다.`,
    fig("namedShapes", { items: [{ shape: "isoTri", label: "가" }] }),
  );
}

function tri222Pick(unit: UnitSeed, rng: Rng): ElemProblem {
  const put = labelledPick(rng, "isoTri", [
    "choiceScaleneTri",
    "choiceRightScaleneTri",
  ]);
  return make(
    unit,
    "그림에서 두 밑각의 크기가 같은 삼각형의 기호를 쓰시오.",
    put.answer,
    `이등변삼각형은 두 밑각의 크기가 같습니다. ${put.answer}입니다.`,
    fig("namedShapes", { items: put.items }),
  );
}

function tri222EqualBase(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `이등변삼각형에서 두 밑각의 크기는 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `이등변삼각형은 두 밑각의 크기가 같습니다.`,
    fig("namedShapes", { items: [{ shape: "isoTri", label: "가" }] }),
  );
}

function tri223Side(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 4, 15);
  return make(
    unit,
    `정삼각형의 한 변의 길이가 ${cm(s)}입니다. 다른 한 변의 길이는 몇 cm인가?`,
    cm(s),
    `정삼각형은 세 변의 길이가 모두 같으므로 ${cm(s)}입니다.`,
    fig("namedShapes", { items: [{ shape: "eqTri", label: "가" }] }),
  );
}

function tri223Angle(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `정삼각형의 한 각의 크기는 몇 도인가?`,
    deg(60),
    `정삼각형은 세 각의 크기가 모두 ${deg(60)}입니다.`,
    fig("namedShapes", { items: [{ shape: "eqTri", label: "가" }] }),
  );
}

function tri223AngleSum(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `정삼각형의 세 각의 크기의 합은 몇 도인가?`,
    deg(180),
    `${expr(`60+60+60=180`)} 이므로 ${deg(180)}입니다.`,
    fig("namedShapes", { items: [{ shape: "eqTri", label: "가" }] }),
  );
}

function tri223Pick(unit: UnitSeed, rng: Rng): ElemProblem {
  const put = labelledPick(rng, "eqTri", ["isoTri", "wideTri"]);
  return make(
    unit,
    "그림에서 세 각의 크기가 모두 같은 삼각형의 기호를 쓰시오.",
    put.answer,
    `세 각의 크기가 모두 같은 삼각형은 정삼각형입니다. ${put.answer}입니다.`,
    fig("namedShapes", { items: put.items }),
  );
}

function tri223HalfPerim(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 4, 14);
  return make(
    unit,
    `세 변의 길이의 합이 ${cm(s * 3)}인 정삼각형의 한 변은 몇 cm인가?`,
    cm(s),
    `${expr(`${s * 3}\\div3=${s}`)} 이므로 ${cm(s)}입니다.`,
  );
}

function tri223Name(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `그림처럼 세 변의 길이가 모두 같은 삼각형을 무엇이라고 하는가?`,
    "정삼각형",
    `세 변의 길이가 모두 같은 삼각형은 정삼각형입니다.`,
    fig("namedShapes", { items: [{ shape: "eqTri", label: "가" }] }),
  );
}

function tri224CountAcute(unit: UnitSeed, rng: Rng): ElemProblem {
  const angles = triAnglesOfClass(rng, 2);
  const shown = pick(rng, TRI_PERMS).map((i) => angles[i]!);
  const hit = shown.filter((v) => v < 90).length;
  return make(
    unit,
    `삼각형의 세 각의 크기가 ${deg(shown[0]!)}, ${deg(shown[1]!)}, ${deg(shown[2]!)}입니다. 예각은 몇 개인가?`,
    `${n(hit)}개`,
    `${deg(90)}보다 작은 각이 ${n(hit)}개입니다.`,
  );
}

function tri224Name(unit: UnitSeed, rng: Rng): ElemProblem {
  const kind = intBetween(rng, 0, 2);
  const angles = triAnglesOfClass(rng, kind);
  const shown = pick(rng, TRI_PERMS).map((i) => angles[i]!);
  const name = triClass(angles[0]!, angles[1]!, angles[2]!);
  return make(
    unit,
    `세 각의 크기가 ${deg(shown[0]!)}, ${deg(shown[1]!)}, ${deg(shown[2]!)}인 삼각형의 이름을 쓰시오.`,
    name,
    `가장 큰 각이 ${deg(Math.max(...angles))}이므로 ${name}입니다.`,
  );
}

function tri224PickRight(unit: UnitSeed, rng: Rng): ElemProblem {
  const put = labelledPick(rng, "rightTri", ["eqTri", "wideTri"]);
  return make(
    unit,
    "그림에서 직각삼각형의 기호를 쓰시오.",
    put.answer,
    `${put.answer}는 직각이 있는 삼각형입니다.`,
    fig("namedShapes", { items: put.items }),
  );
}

function tri224HasRight(unit: UnitSeed, rng: Rng): ElemProblem {
  const kind = intBetween(rng, 0, 2);
  const angles = triAnglesOfClass(rng, kind);
  const shown = pick(rng, TRI_PERMS).map((i) => angles[i]!);
  const yes = angles.includes(90);
  return make(
    unit,
    `세 각의 크기가 ${deg(shown[0]!)}, ${deg(shown[1]!)}, ${deg(shown[2]!)}인 삼각형에 직각이 있는가? '예' 또는 '아니요'로 답하시오.`,
    yes ? "예" : "아니요",
    yes ? `직각이 ${n(1)}개 있습니다.` : `직각이 없습니다.`,
  );
}

function tri224Biggest(unit: UnitSeed, rng: Rng): ElemProblem {
  const angles = triAnglesOfClass(rng, intBetween(rng, 0, 2));
  const shown = pick(rng, TRI_PERMS).map((i) => angles[i]!);
  return make(
    unit,
    `삼각형의 세 각의 크기가 ${deg(shown[0]!)}, ${deg(shown[1]!)}, ${deg(shown[2]!)}입니다. 가장 큰 각의 크기는 몇 도인가?`,
    deg(Math.max(...shown)),
    `가장 큰 각은 ${deg(Math.max(...shown))}입니다.`,
  );
}

function tri224Rest(unit: UnitSeed, rng: Rng): ElemProblem {
  const angles = triAnglesOfClass(rng, intBetween(rng, 0, 2));
  return make(
    unit,
    `삼각형의 두 각의 크기가 ${deg(angles[0]!)}, ${deg(angles[1]!)}입니다. 나머지 한 각의 크기는 몇 도인가?`,
    deg(angles[2]!),
    `${expr(`180-${angles[0]}-${angles[1]}=${angles[2]}`)} 이므로 ${deg(angles[2]!)}입니다.`,
  );
}

function tri225BothNames(unit: UnitSeed, rng: Rng): ElemProblem {
  const same = pick(rng, baseAngles(20, 85));
  const apex = 180 - same * 2;
  const shown = pick(rng, TRI_PERMS).map((i) => [same, same, apex][i]!);
  return make(
    unit,
    `세 각의 크기가 ${deg(shown[0]!)}, ${deg(shown[1]!)}, ${deg(shown[2]!)}인 이등변삼각형을 각의 크기에 따라 분류하면 무엇인가?`,
    triClass(same, same, apex),
    `가장 큰 각이 ${deg(Math.max(same, apex))}이므로 ${triClass(same, same, apex)}입니다.`,
    fig("namedShapes", { items: [{ shape: "isoTri", label: "가" }] }),
  );
}

function tri225PickRightIso(unit: UnitSeed, rng: Rng): ElemProblem {
  const put = labelledPick(rng, "rightTri", ["eqTri", "wideTri"]);
  return make(
    unit,
    "그림에서 직각이등변삼각형이 될 수 있는 기호를 쓰시오.",
    put.answer,
    `직각이 있는 이등변삼각형은 직각이등변삼각형입니다. ${put.answer}입니다.`,
    fig("namedShapes", { items: put.items }),
  );
}

function tri225EqIsAcute(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `정삼각형은 예각삼각형인가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `정삼각형의 세 각은 모두 ${deg(60)}이므로 예각삼각형입니다.`,
    fig("namedShapes", { items: [{ shape: "eqTri", label: "가" }] }),
  );
}

function tri225SideClass(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 5, 12);
  return make(
    unit,
    `세 변의 길이가 ${cm(s)}, ${cm(s)}, ${cm(s)}인 삼각형을 변의 길이에 따라 분류하면 무엇인가?`,
    "정삼각형",
    `세 변의 길이가 모두 같으므로 정삼각형입니다.`,
    fig("namedShapes", { items: [{ shape: "eqTri", label: "가" }] }),
  );
}

function tri225AngleClass(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `정삼각형을 각의 크기에 따라 분류하면 무엇인가?`,
    "예각삼각형",
    `세 각이 모두 ${deg(60)}이므로 예각삼각형입니다.`,
    fig("namedShapes", { items: [{ shape: "eqTri", label: "가" }] }),
  );
}

function tri225Vertices(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `직각삼각형에서 직각인 꼭짓점은 몇 개인가?`,
    n(1),
    `직각삼각형의 직각은 ${n(1)}개입니다.`,
    fig("namedShapes", { items: [{ shape: "rightTri", label: "가" }] }),
  );
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

function decCol(a: string, b: string, op: "+" | "−"): Record<string, unknown> {
  return fig("columnOp", { top: a, op, bottom: b });
}

function dec231TenthDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const whole = intBetween(rng, 1, 9);
  const d = [
    intBetween(rng, 1, 9),
    intBetween(rng, 1, 9),
    intBetween(rng, 1, 9),
  ];
  const value = `${whole}.${d.join("")}`;
  return make(
    unit,
    `${n(value)}에서 소수 첫째 자리 숫자를 쓰시오.`,
    n(d[0]!),
    `${n(value)}의 소수 첫째 자리 숫자는 ${n(d[0]!)}입니다.`,
    cards([value]),
  );
}

function dec231Hundredths(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 11, 99);
  return make(
    unit,
    `${n("0.01")}이 ${n(count)}개인 수를 소수로 쓰시오.`,
    n(dec2(count)),
    `${n("0.01")}이 ${n(count)}개이면 ${n(dec2(count))}입니다.`,
  );
}

function dec231TenthsCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const v = pick(rng, DEC1_POOL);
  return make(
    unit,
    `소수 한 자리 수 ${josaNum(dec1(v), "을", "를")} ${n("0.1")}이 몇 개인 수로 나타내시오.`,
    `${n(v)}개`,
    `${n("0.1")}이 ${n(v)}개이면 ${n(dec1(v))}입니다.`,
  );
}

function dec231Bigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC1_POOL);
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v !== a),
  );
  const hi = Math.max(a, b);
  return make(
    unit,
    `${n(dec1(a))}과 ${n(dec1(b))} 가운데 더 큰 수를 쓰시오.`,
    n(dec1(hi)),
    `${n(dec1(hi))}이 더 큽니다.`,
    cards([dec1(a), dec1(b)]),
  );
}

function dec231PlaceWorth(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 1, 9);
  return make(
    unit,
    `소수 첫째 자리 숫자가 ${n(d)}일 때 그 숫자가 나타내는 수를 쓰시오.`,
    n(dec1(d)),
    `소수 첫째 자리는 ${n("0.1")}이 ${n(d)}개인 ${n(dec1(d))}을 나타냅니다.`,
  );
}

function dec231HowManyPlaces(unit: UnitSeed, rng: Rng): ElemProblem {
  const digits = intBetween(rng, 1, 3);
  const frac = Array.from({ length: digits }, () => intBetween(rng, 1, 9)).join(
    "",
  );
  const value = `${intBetween(rng, 1, 9)}.${frac}`;
  return make(
    unit,
    `${n(value)}은 소수 몇 자리 수인가?`,
    `${n(digits)}자리`,
    `소수점 아래가 ${n(digits)}자리이므로 소수 ${n(digits)}자리 수입니다.`,
    cards([value]),
  );
}

function dec232TensDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const v = pick(
    rng,
    DEC2_POOL.filter((x) => x >= 10),
  );
  return make(
    unit,
    `${n(dec2(v))}에서 자연수 부분의 숫자를 쓰시오.`,
    n(Math.floor(v / 100)),
    `${n(dec2(v))}의 자연수 부분은 ${n(Math.floor(v / 100))}입니다.`,
    cards([dec2(v)]),
  );
}

function dec232SecondDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const v = pick(rng, DEC2_POOL);
  return make(
    unit,
    `${n(dec2(v))}에서 소수 둘째 자리 숫자를 쓰시오.`,
    n(v % 10),
    `소수 둘째 자리 숫자는 ${n(v % 10)}입니다.`,
    cards([dec2(v)]),
  );
}

function dec232AsHundredths(unit: UnitSeed, rng: Rng): ElemProblem {
  const v = pick(
    rng,
    DEC2_POOL.filter((x) => x < 100),
  );
  return make(
    unit,
    `${josaNum(dec2(v), "은", "는")} ${n("0.01")}이 몇 개인 수입니까?`,
    `${n(v)}개`,
    `${n("0.01")}이 ${n(v)}개이면 ${n(dec2(v))}입니다.`,
  );
}

function dec232Bigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC2_POOL);
  const b = pick(
    rng,
    DEC2_POOL.filter((v) => v !== a),
  );
  return make(
    unit,
    `${n(dec2(a))}과 ${n(dec2(b))} 가운데 더 큰 수를 쓰시오.`,
    n(dec2(Math.max(a, b))),
    `${n(dec2(Math.max(a, b)))}이 더 큽니다.`,
    cards([dec2(a), dec2(b)]),
  );
}

function dec232FirstDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const v = pick(rng, DEC2_POOL);
  return make(
    unit,
    `${n(dec2(v))}에서 소수 첫째 자리 숫자를 쓰시오.`,
    n(Math.floor(v / 10) % 10),
    `소수 첫째 자리 숫자는 ${n(Math.floor(v / 10) % 10)}입니다.`,
  );
}

function dec232Places(unit: UnitSeed, rng: Rng): ElemProblem {
  const v = pick(rng, DEC2_POOL);
  return make(
    unit,
    `${n(dec2(v))}은 소수 몇 자리 수인가?`,
    `${n(2)}자리`,
    `소수점 아래가 ${n(2)}자리입니다.`,
    cards([dec2(v)]),
  );
}

function dec233Times10(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC1_POOL);
  return make(
    unit,
    `${josaNum(dec1(x), "의", "의")} ${n(10)}배는 얼마인가?`,
    n(x),
    `소수점이 오른쪽으로 한 자리 옮겨져 ${n(x)}입니다.`,
  );
}

function dec233Div10(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC1_POOL);
  return make(
    unit,
    `${josaNum(dec1(x), "의", "의")} $\\frac{1}{10}$은 얼마인가?`,
    n(dec2(x)),
    `소수점이 왼쪽으로 한 자리 옮겨져 ${n(dec2(x))}입니다.`,
  );
}

function dec233Times100(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC1_POOL);
  return make(
    unit,
    `${n(dec2(x))}의 소수점을 오른쪽으로 ${n(2)}자리 옮긴 수를 쓰시오.`,
    n(x),
    `소수점이 오른쪽으로 두 자리 옮겨져 ${n(x)}입니다.`,
  );
}

function dec233HowManyTimes(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC1_POOL);
  return make(
    unit,
    `${josaNum(dec1(x), "은", "는")} ${n(dec2(x))}의 몇 배인가?`,
    n(10),
    `소수점이 한 자리 옮겨지므로 ${n(10)}배입니다.`,
  );
}

function dec233MoveLeft(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC1_POOL);
  return make(
    unit,
    `${n(x)}의 소수점을 왼쪽으로 ${n(1)}자리 옮긴 수를 쓰시오.`,
    n(dec1(x)),
    `${n(x)}에서 소수점을 왼쪽으로 옮기면 ${n(dec1(x))}입니다.`,
  );
}

function dec233MoveRight(unit: UnitSeed, rng: Rng): ElemProblem {
  const x = pick(rng, DEC1_POOL);
  return make(
    unit,
    `${josaNum(dec2(x), "에", "에")} ${n(10)}을 곱한 값을 쓰시오.`,
    n(dec1(x)),
    `소수점이 오른쪽으로 한 자리 옮겨져 ${n(dec1(x))}입니다.`,
  );
}

function dec234Sum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC1_POOL);
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => (a + v) % 10 !== 0),
  );
  return make(
    unit,
    `${expr(`${dec1(a)}+${dec1(b)}`)} 의 합을 구하시오.`,
    n(dec1(a + b)),
    `${expr(`${dec1(a)}+${dec1(b)}=${dec1(a + b)}`)} 입니다.`,
    decCol(dec1(a), dec1(b), "+"),
  );
}

function dec234Missing(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC1_POOL);
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => (a + v) % 10 !== 0),
  );
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 쓰시오. ${expr(`${dec1(a)}+\\square=${dec1(a + b)}`)}`,
    n(dec1(b)),
    `${expr(`${dec1(a + b)}-${dec1(a)}=${dec1(b)}`)} 입니다.`,
  );
}

function dec234TenthsDigit(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC1_POOL);
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => (a + v) % 10 !== 0),
  );
  const s = a + b;
  return make(
    unit,
    `${expr(`${dec1(a)}+${dec1(b)}`)} 의 합에서 소수 첫째 자리 숫자를 쓰시오.`,
    n(s % 10),
    `${expr(`${dec1(a)}+${dec1(b)}=${dec1(s)}`)} 이므로 소수 첫째 자리 숫자는 ${n(s % 10)}입니다.`,
    decCol(dec1(a), dec1(b), "+"),
  );
}

function dec234VsTen(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC1_POOL);
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => (a + v) % 10 !== 0),
  );
  const s = a + b;
  return make(
    unit,
    `${expr(`${dec1(a)}+${dec1(b)}`)} 의 합은 ${n(10)}보다 큰가? '예' 또는 '아니요'로 답하시오.`,
    s > 100 ? "예" : "아니요",
    `합은 ${n(dec1(s))}입니다.`,
    decCol(dec1(a), dec1(b), "+"),
  );
}

function dec234Ones(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC1_POOL);
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => (a + v) % 10 !== 0),
  );
  const s = a + b;
  return make(
    unit,
    `${expr(`${dec1(a)}+${dec1(b)}`)} 의 합에서 자연수 부분을 쓰시오.`,
    n(Math.floor(s / 10)),
    `합은 ${n(dec1(s))}이므로 자연수 부분은 ${n(Math.floor(s / 10))}입니다.`,
    decCol(dec1(a), dec1(b), "+"),
  );
}

function dec234PlusOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC1_POOL);
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => (a + v) % 10 !== 0),
  );
  return make(
    unit,
    `${expr(`${dec1(a)}+${dec1(b)}`)} 의 합보다 ${n(1)} 큰 수를 쓰시오.`,
    n(dec1(a + b + 10)),
    `${expr(`${dec1(a + b)}+1=${dec1(a + b + 10)}`)} 입니다.`,
  );
}

function dec235Diff(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 20),
  );
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v < a && (a - v) % 10 !== 0),
  );
  return make(
    unit,
    `${expr(`${dec1(a)}-${dec1(b)}`)} 의 차를 구하시오.`,
    n(dec1(a - b)),
    `${expr(`${dec1(a)}-${dec1(b)}=${dec1(a - b)}`)} 입니다.`,
    decCol(dec1(a), dec1(b), "−"),
  );
}

function dec235Missing(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 20),
  );
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v < a && (a - v) % 10 !== 0),
  );
  return make(
    unit,
    `${expr("\\square")} 안에 알맞은 수를 쓰시오. ${expr(`${dec1(a)}-\\square=${dec1(a - b)}`)}`,
    n(dec1(b)),
    `${expr(`${dec1(a)}-${dec1(a - b)}=${dec1(b)}`)} 입니다.`,
  );
}

function dec235Tenths(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 20),
  );
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v < a && (a - v) % 10 !== 0),
  );
  const d = a - b;
  return make(
    unit,
    `${expr(`${dec1(a)}-${dec1(b)}`)} 의 차에서 소수 첫째 자리 숫자를 쓰시오.`,
    n(d % 10),
    `차는 ${n(dec1(d))}이므로 소수 첫째 자리 숫자는 ${n(d % 10)}입니다.`,
    decCol(dec1(a), dec1(b), "−"),
  );
}

function dec235Bigger(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 20),
  );
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v < a && (a - v) % 10 !== 0),
  );
  return make(
    unit,
    `${n(dec1(a))}과 ${n(dec1(b))} 가운데 더 큰 수를 쓰시오.`,
    n(dec1(a)),
    `${n(dec1(a))}이 더 큽니다.`,
    cards([dec1(a), dec1(b)]),
  );
}

function dec235Ones(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 20),
  );
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v < a && (a - v) % 10 !== 0),
  );
  const d = a - b;
  return make(
    unit,
    `${expr(`${dec1(a)}-${dec1(b)}`)} 의 차에서 자연수 부분을 쓰시오.`,
    n(Math.floor(d / 10)),
    `차는 ${n(dec1(d))}입니다.`,
    decCol(dec1(a), dec1(b), "−"),
  );
}

function dec235MinusOne(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 30),
  );
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v < a - 10 && (a - v) % 10 !== 0),
  );
  return make(
    unit,
    `${expr(`${dec1(a)}-${dec1(b)}`)} 의 차보다 ${n(1)} 작은 수를 쓰시오.`,
    n(dec1(a - b - 10)),
    `${expr(`${dec1(a - b)}-1=${dec1(a - b - 10)}`)} 입니다.`,
  );
}

function dec236Tape(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 20 && v <= 80),
  );
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 20 && v <= 80 && (a + v) % 10 !== 0),
  );
  return make(
    unit,
    `리본 ${n(dec1(a))} m와 ${n(dec1(b))} m를 이어 붙였습니다. 모두 몇 m인가?`,
    n(dec1(a + b)),
    `${expr(`${dec1(a)}+${dec1(b)}=${dec1(a + b)}`)} 입니다.`,
    fig("tape", { length: a + b, label: `${dec1(a + b)} m`, segments: 2 }),
  );
}

function dec236GapToTen(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v < 90),
  );
  return make(
    unit,
    `${n(dec1(a))} m인 끈을 ${n(10)} m로 만들려면 몇 m가 더 필요한가?`,
    n(dec1(100 - a)),
    `${expr(`10-${dec1(a)}=${dec1(100 - a)}`)} 입니다.`,
    fig("tape", { length: a, label: `${dec1(a)} m`, segments: 1 }),
  );
}

function dec236ThreeSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v <= 40),
  );
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v <= 40),
  );
  const c = pick(
    rng,
    DEC1_POOL.filter((v) => v <= 40 && (a + b + v) % 10 !== 0),
  );
  return make(
    unit,
    `${n(dec1(a))} L, ${n(dec1(b))} L, ${n(dec1(c))} L의 물을 한 통에 담았습니다. 모두 몇 L인가?`,
    n(dec1(a + b + c)),
    `${expr(`${dec1(a)}+${dec1(b)}+${dec1(c)}=${dec1(a + b + c)}`)} 입니다.`,
  );
}

function dec236Twice(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => (v * 2) % 10 !== 0 && v <= 49),
  );
  return make(
    unit,
    `한 변의 길이가 ${n(dec1(a))} cm인 정사각형의 이웃한 두 변의 길이의 합은 몇 cm인가?`,
    n(dec1(a * 2)),
    `${expr(`${dec1(a)}+${dec1(a)}=${dec1(a * 2)}`)} 입니다.`,
    fig("markedShape", { shape: "square" }),
  );
}

function dec236LeftIfAdd(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v <= 70),
  );
  const add = pick(
    rng,
    DEC1_POOL.filter((v) => v <= 20 && (a + v) % 10 !== 0),
  );
  return make(
    unit,
    `물이 ${n(dec1(a))} L 있었습니다. ${n(dec1(add))} L를 더 부었습니다. 지금은 몇 L인가?`,
    n(dec1(a + add)),
    `${expr(`${dec1(a)}+${dec1(add)}=${dec1(a + add)}`)} 입니다.`,
  );
}

function dec236WhichBiggerSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC1_POOL);
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => (a + v) % 10 !== 0),
  );
  const c = pick(
    rng,
    DEC1_POOL.filter((v) => v !== a),
  );
  const d = pick(
    rng,
    DEC1_POOL.filter((v) => (c + v) % 10 !== 0),
  );
  const s1 = a + b;
  const s2 = c + d;
  return make(
    unit,
    `${expr(`${dec1(a)}+${dec1(b)}`)} 의 합과 ${expr(`${dec1(c)}+${dec1(d)}`)} 의 합 가운데 더 큰 수를 쓰시오.`,
    n(dec1(Math.max(s1, s2))),
    `${n(dec1(s1))}과 ${n(dec1(s2))} 중 더 큰 수는 ${n(dec1(Math.max(s1, s2)))}입니다.`,
  );
}

function dec237Cut(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 40),
  );
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v < a - 5 && (a - v) % 10 !== 0),
  );
  return make(
    unit,
    `길이가 ${n(dec1(a))} m인 끈에서 ${n(dec1(b))} m를 잘라 냈습니다. 남은 끈은 몇 m인가?`,
    n(dec1(a - b)),
    `${expr(`${dec1(a)}-${dec1(b)}=${dec1(a - b)}`)} 입니다.`,
    fig("tape", { length: a, label: `${dec1(a)} m`, segments: 1 }),
  );
}

function dec237Left(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 50),
  );
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v < a - 10 && (a - v) % 10 !== 0),
  );
  return make(
    unit,
    `주스 ${n(dec1(a))} L 중에서 ${n(dec1(b))} L를 마셨습니다. 남은 주스는 몇 L인가?`,
    n(dec1(a - b)),
    `${expr(`${dec1(a)}-${dec1(b)}=${dec1(a - b)}`)} 입니다.`,
  );
}

function dec237HowMuchMore(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 30),
  );
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v < a && (a - v) % 10 !== 0),
  );
  return make(
    unit,
    `${n(dec1(a))} kg인 상자 A는 ${n(dec1(b))} kg인 상자 B보다 몇 kg 더 무거운가?`,
    n(dec1(a - b)),
    `${expr(`${dec1(a)}-${dec1(b)}=${dec1(a - b)}`)} 입니다.`,
  );
}

function dec237Need(unit: UnitSeed, rng: Rng): ElemProblem {
  const have = pick(
    rng,
    DEC1_POOL.filter((v) => v <= 60),
  );
  const need = pick(
    rng,
    DEC1_POOL.filter((v) => v > have && (v - have) % 10 !== 0),
  );
  return make(
    unit,
    `한 통에 ${n(dec1(need))} L가 필요합니다. 지금은 ${n(dec1(have))} L가 있습니다. 몇 L가 모자라는가?`,
    n(dec1(need - have)),
    `${expr(`${dec1(need)}-${dec1(have)}=${dec1(need - have)}`)} 입니다.`,
  );
}

function dec237Gap(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, DEC1_POOL);
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v !== a && Math.abs(a - v) % 10 !== 0),
  );
  return make(
    unit,
    `${n(dec1(a))}과 ${n(dec1(b))}의 차는 얼마인가?`,
    n(dec1(Math.abs(a - b))),
    `${expr(`${dec1(Math.max(a, b))}-${dec1(Math.min(a, b))}=${dec1(Math.abs(a - b))}`)} 입니다.`,
    decCol(dec1(Math.max(a, b)), dec1(Math.min(a, b)), "−"),
  );
}

function dec237RemainAfterTwo(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(
    rng,
    DEC1_POOL.filter((v) => v >= 60),
  );
  const b = pick(
    rng,
    DEC1_POOL.filter((v) => v <= 20),
  );
  const c = pick(
    rng,
    DEC1_POOL.filter((v) => v <= 20 && a - b - v > 0 && (a - b - v) % 10 !== 0),
  );
  return make(
    unit,
    `페인트 ${n(dec1(a))} L 중에서 ${n(dec1(b))} L와 ${n(dec1(c))} L를 썼습니다. 남은 페인트는 몇 L인가?`,
    n(dec1(a - b - c)),
    `${expr(`${dec1(a)}-${dec1(b)}-${dec1(c)}=${dec1(a - b - c)}`)} 입니다.`,
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
    /* ─── 그림은 **첫 갈래에만** 붙는다 (2026-08-24, 리드 확정) ───────────────
     *
     * 09 §2.2 규칙 ①·②는 **무는 판정기가 없다.** 값 검산도 렌더 검사도 다 초록이다.
     * 그러니 까닭을 여기 적어 두는 것이 다음 사람을 지키는 유일한 장치다.
     *
     * 🔴 **결론: 이 소단원은 그림을 하나도 안 붙인다.** 붙일 수 있는 갈래가 하나뿐인데,
     *    그 하나 때문에 **「그림이 있으면 답은 «평행선»」이 100% 가 된다.**
     *
     * ❗ 「서로 만나지 않는 두 직선을 **무엇이라고** 하는가 → 평행선」
     *    「답이 **낱말**이라 그림이 이름을 안 쓴다」까지는 맞다. 그래서 한 번 붙였다.
     *    그런데 **R9-c 가 곧바로 물었다**(2026-08-24, 리드가 그날 세운 축) —
     *    「씨앗 120 중 그림 붙은 26문항에서 «평행선» 가 **100%**」.
     *    나머지 세 갈래는 아래 까닭으로 그림을 못 붙이므로, **그림의 있고 없음 자체가
     *    답을 알려 준다.** 「언제나 가」와 같은 부류이고 문이 다를 뿐이다.
     *    → 갈래 하나만 그림을 받을 수 있는 소단원에서는, 그 갈래의 답이 **고정이면**
     *      붙이지 않는다. (2-4-3 은 답이 길이라 씨앗마다 갈려서 붙일 수 있다.)
     *
     * ❌ 「한 직선에 수직인 두 직선은 서로 **어떤 관계**인가 → 평행」
     *    옳은 그림은 **반드시 두 직선을 평행하게 그린다.** 그리는 순간 답이 지면에 있다.
     *    2-4-3 의 「수선들의 길이는 서로 어떠한가 → 모두 같다」와 **같은 구조**다.
     *
     * ❌ 「아무리 늘이면 만나는 점은 몇 개 → $0$」
     *    알맹이인 「아무리 늘여도」는 **유한한 그림에 안 보이는데**, 답 $0$ 은
     *    그림만 봐도 나온다. 그림이 알맹이는 안 돕고 답만 준다.
     *
     * ❌ 「직사각형에서 서로 평행한 변은 몇 쌍 → $2$」
     *    ⚠️ **「평행은 눈으로 못 보니 괜찮다」가 아니다** — 평행선은 평행하게 **보인다**
     *    (첫 판에 그렇게 적었다가 리드가 짚었다. 그 근거를 남기면 다음 사람이 그것으로
     *    둘째 갈래를 되살린다). 진짜 까닭은 **아는 학생은 그림이 필요 없고, 모르는
     *    학생은 그림에서 세어 버린다** — 어느 쪽에도 도움이 안 된다.
     */
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
    /* ─── 그림은 **첫 갈래에만** (2026-08-24, figures 지시 + 리드 확정) ────────
     *
     * ✅ 「수선을 그었더니 길이가 $N$. 평행선 사이의 거리는?」
     *    ⚠️ **치수를 안 적는다.** 답이 준 값과 **같아서** 적으면 그림이 답을 말한다.
     *    치수 없는 그림은 「거리는 수선으로 잰다」는 **배치**만 보인다.
     *
     * ❌ 「수선을 $N$개 그었다. 길이는 서로 어떠한가 → 모두 같다」
     *    엔진이 그 수선들을 **정말 같게 그린다**(`_line_relation` 주석: 「길이가 같다는
     *    것이 답이므로 정말 같게 그린다」). kind 를 만들 때는 「그림이 답과 어긋나면
     *    안 된다」는 뜻이었는데 **문항에 붙이는 순간 뜻이 뒤집힌다** — 학생이 보고 쓴다.
     *
     * ❌ 「거리가 $N$일 때 비스듬한 선분은 $N$보다 긴가 짧은가 → 길다」
     *    비스듬한 선분을 그리면 **눈으로 보인다.**
     */
    const dist = intBetween(rng, 3, 12);
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        `평행한 두 직선 사이에 수선을 그었더니 길이가 ${cm(dist)}였습니다. 이 평행선 사이의 거리는 몇 cm인가?`,
        cm(dist),
        `평행선 사이의 거리는 평행선 사이에 그은 수선의 길이입니다. 그러므로 ${cm(dist)}입니다.`,
        // ⚠️ **`distance` 를 안 싣는다** — 그 값이 곧 답이다. `perpCount: 1` 만 실어
        //    「거리는 수선으로 잰다」는 배치만 보인다. 2-4-2 첫 갈래와 같이 이 그림도
        //    씨앗마다 같고, 같은 까닭으로 R9-b 를 통과한다(다른 갈래에 그림이 없다).
        fig("lineRelation", { relation: "parallel", perpCount: 1 }),
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
    const put = labelledPick(rng, "trap", ["irregQuad"]);
    return make(
      unit,
      "그림에서 사다리꼴의 기호를 쓰시오.",
      put.answer,
      `${put.answer}는 위쪽 변과 아래쪽 변이 서로 평행합니다. ` +
        `${put.other}는 평행한 변이 한 쌍도 없습니다.`,
      fig("namedShapes", { items: put.items }),
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
    const put = labelledPick(rng, "tallDiamond", ["rect"]);
    return make(
      unit,
      "그림에서 네 변의 길이가 모두 같은 사각형의 기호를 쓰시오.",
      put.answer,
      `${put.answer}는 네 변의 길이가 모두 같습니다. ` +
        `${put.other}는 이웃한 두 변의 길이가 다릅니다.`,
      fig("namedShapes", { items: put.items }),
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

/* ──────────── 2-4 난이도 4단 (D-72 확대, 2026-08-23) ────────────
 *
 * **사각형 소단원도 1단은 「성질 한 번 적용」이다**(2-2 와 같은 자리, D-72 ⑶).
 *
 * ⚠️ **표준 2-4-5(평행사변형)를 피해서 짰다.** 그 소단원이 「한 각이 $N$ 도 → 이웃한 각 /
 * 마주 보는 각」과 「이웃한 두 변 → 네 변의 합」을 이미 쓴다. 마름모도 그 성질을
 * 물려받으므로 2-4-6 에 각 갈래를 넣으면 **낱말만 바뀐 같은 문형**이 나란히 선다.
 * R5 시험은 **소단원 안에서만** 견주므로 이 겹침을 구조적으로 못 본다 —
 * 그래서 2-4-6 은 **변 축**(마름모 자신의 정의)으로만 간다.
 *
 * ⚠️ **「A는 B라고 할 수 있는가? 예/아니요」 문형은 한 갈래도 안 만든다.** 표준
 * 2-4-4·2-4-7 이 그 문형을 셋 쓴다. 낱말만 바꾸면 R5 가 말하는 「상수만 바꾼 것」이다.
 * 2-4-7 1단을 **개수 세기**로 돌린 것이 그 때문이다 — 같은 개념을 묻되 문형이 다르고,
 * 「예/아니요」는 찍어도 절반이라 그 자체로 약한 문형이다(리드 확인 2026-08-23).
 *
 * ⚠️ **철사·끈 맥락을 안 쓴다.** 2-2-3(정삼각형) 3·4단이 이미 그 소재라 한 시험지에
 * 나란히 서면 같은 문형이 된다.
 *
 * 「네 변의 길이의 합」은 둘레 **공식**이 아니라 덧셈·곱셈이라 초4 범위 안으로 본다 —
 * 표준이 이미 세 자리에서 그렇게 쓰고 있다(평행사변형·마름모·정사각형).
 *
 * ⚠️ **그림은 아직 안 붙였다.** `namedShapes` 로 되는 소단원이지만 엔진의 «그린 도형이
 * 라벨과 무관하게 고정» 결함이 안 고쳐졌다(실측 2026-08-23: `[5,5,9]` 도 `[7,7,4]` 와
 * 똑같이 그려진다). 그림 세션이 **「값을 적으면 던지게」**를 넣는 중이고, 그게 서면
 * 실수로 치수를 적어도 조용히 안 나간다. **그때 얹는다**(리드 판단 2026-08-23).
 */
/* ──────── 2-4-1 수직과 수선 (2026-08-24, 「직각이 몇 개 생기나」로 센다) ────────
 *
 * **이 소단원의 셈할 수 있는 축은 「수선 한 개마다 직각이 넷」이다.** 교과서가 나란히
 * 적어 두는 두 문장을 곱하면 축이 선다 —
 *   ㉠ 두 직선이 수직으로 만나면 **네 각이 모두 직각**이다.
 *   ㉡ 한 점을 지나 한 직선에 수직인 직선은 **하나뿐**이다.
 * ㉡ 이 「수선마다 만나는 점이 서로 다르다」를 보장한다(같은 점을 지나면 그 둘은 같은
 * 직선이다). 그래서 수선 $k$ 개면 직각은 **정확히** $4k$ 개다. 2-4-2 가 「꺾인 횟수의
 * 홀짝」으로 연 것과 같은 수법이다 — 교과서가 정성적으로만 묻는 소단원에서 개념 자체가
 * 허락하는 셈을 찾아낸다.
 *
 * ⚠️ **각도로 사다리를 세우지 않는다.** 2-4-3 이 적어 둔 그 자리다 — 「직각을 세 각으로
 * 나누면」류로 열면 1-2-4(각도의 합과 차)와 **같은 산술**이 된다. 여기서 세는 것은
 * **직각의 개수**이지 각도가 아니고, 네 갈래 어느 해설에도 도를 더하거나 빼는 자리가 없다.
 * 표준 `quad()` 의 2-4-1 은 「나머지 세 각 중 두 각의 합」으로 $90\times k$ 를 쓰는데
 * 그건 각도 산술이다 — **문형만 보고 축은 새로 세웠다**(2-4-3 과 같은 처방).
 *
 * ⚠️ **그림을 안 붙인다.** 엔진의 `lineRelation` 이 `parallel` 하나만 그리는 까닭이
 * 바로 이 소단원이다 — 수선을 그리면 **직각 기호를 함께 그려야** 하고, 그러면 세기만
 * 해도 답이 나온다(09 §2.2 ①②). 엔진 쪽 `_line_relation` 주석이 그 판단을 이미
 * 적어 두었다(「직각 기호가 **답을 말한다**」). 되살리지 말 것.
 *
 * ⚠️ **직선 이름의 시작 자리를 씨앗마다 옮긴다** — 2-4-2 와 같은 처방. 1단은 수가 아예
 * 안 들어가는 갈래가 둘이라, 이름을 안 옮기면 R9 가 요구하는 다양성이 안 난다.
 * (이름 도우미 `LINE_NAMES`·`lineName`·`lineJosa`·`lineBase` 는 바로 아래 2-4-2 블록에
 *  있다 — 두 소단원이 같은 이름표를 쓰므로 한 벌만 둔다.)
 */

/**
 * **2-4-1 1단 — 정의를 한 번 쓴다.** 산술이 없거나 있어도 한 번이다(D-72 ⑶).
 *
 * 세 갈래가 정의를 서로 다른 방향으로 쓴다 — 직각의 **수** · **수선**이라는 이름 ·
 * 수선 관계가 **서로 맞바뀐다**는 것. 표준이 「두 직선을 서로 무엇이라 하는가 → 수직」을
 * 이미 쓰므로 갈래는 **수선** 쪽으로 돌렸다(같은 개념을 묻되 묻는 낱말이 다르다).
 */
function tier241Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = lineBase(rng, 2);
  const kind = intBetween(rng, 0, 2);
  if (kind === 0) {
    return make(
      unit,
      `${lineJosa(b, "과", "와")} ${lineJosa(b + 1, "이", "가")} 서로 수직으로 ` +
        `만납니다. 두 직선이 만나서 이루는 각 중 직각은 몇 개인가?`,
      `${n(4)}개`,
      `두 직선이 만나면 만나는 점에 각이 ${n(4)}개 생깁니다. 두 직선이 서로 수직이면 ` +
        `그 네 각이 모두 직각이므로 직각은 ${n(4)}개입니다.`,
    );
  }
  if (kind === 1) {
    return make(
      unit,
      `${lineJosa(b, "과", "와")} ${lineJosa(b + 1, "이", "가")} 만나서 이루는 각이 ` +
        `직각입니다. ${lineJosa(b + 1, "은", "는")} ${lineName(b)}에 대한 무엇인가?`,
      "수선",
      `두 직선이 서로 수직으로 만날 때 한 직선을 다른 직선에 대한 수선이라고 합니다. ` +
        `${lineJosa(b, "과", "와")} ${lineJosa(b + 1, "이", "가")} 직각으로 만나므로 ` +
        `${lineJosa(b + 1, "은", "는")} ${lineName(b)}에 대한 수선입니다.`,
    );
  }
  return make(
    unit,
    `${lineJosa(b + 1, "은", "는")} ${lineName(b)}에 대한 수선입니다. ` +
      `${lineJosa(b, "은", "는")} ${lineName(b + 1)}에 대한 무엇인가?`,
    "수선",
    `${lineJosa(b + 1, "이", "가")} ${lineName(b)}에 대한 수선이면 두 직선은 서로 ` +
      `수직입니다. 수직인 두 직선은 어느 쪽에서 보아도 직각으로 만나므로 ` +
      `${lineName(b)}도 ${lineName(b + 1)}에 대한 수선입니다.`,
  );
}

/**
 * **2-4-1 2단 — 스스로 식을 세운다.**
 *
 * 발문은 수선의 **개수**만 준다. 세울 식은 곱셈 하나인데, 거기 닿으려면 ㉡(한 점을
 * 지나는 수선은 하나뿐)을 써서 **만나는 점이 서로 다르다**는 것을 먼저 알아야 한다.
 * D-72 가 말하는 「식을 스스로 세움」이 바로 그 번역이다 — 계산 걸음이 하나뿐인 것은
 * 2단의 **정의**지 결함이 아니다(`probe-elem-tier-ladder` 머리말 ㉡-b).
 */
function tier241Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = lineBase(rng, 1);
  const k = intBetween(rng, 3, 9);
  return make(
    unit,
    `${lineName(b)}에 수선을 ${n(k)}개 그었습니다. 이때 생기는 직각은 모두 몇 개인가?`,
    `${n(4 * k)}개`,
    `한 점을 지나 ${lineName(b)}에 수직인 직선은 하나뿐이므로 수선 ${n(k)}개는 서로 ` +
      `다른 ${n(k)}개의 점에서 ${lineJosa(b, "과", "와")} 만납니다. 만나는 점마다 ` +
      `직각이 ${n(4)}개씩 생기므로 ${expr(`4\\times${k}=${4 * k}`)} 이고 ` +
      `${n(4 * k)}개입니다.`,
  );
}

/**
 * **2-4-1 3단 — 두 단계.** 곱한 뒤에 한 번 더 셈한다.
 *
 * 두 갈래가 **둘째 셈을 다르게** 쓴다 — 하나는 빼고 하나는 먼저 더한다. 2단이 곱셈
 * 하나로 끝나는 것과 걸음 수로 갈린다.
 *
 * ⚠️ 색칠 갈래에서 색칠한 수는 **전체보다 작게** 뽑는다. 뽑고 거르지 않고 범위를
 * 전체에서 만든다 — 못 뽑을 자리를 아예 안 만든다(`trapSides` 와 같은 원칙).
 */
function tier241Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = lineBase(rng, 1);
  const k = intBetween(rng, 3, 8);
  const total = 4 * k;
  if (pick(rng, [true, false])) {
    const painted = intBetween(rng, 2, total - 2);
    return make(
      unit,
      `${lineName(b)}에 수선을 ${n(k)}개 그었습니다. 이때 생긴 직각 중 ` +
        `${n(painted)}개에 색칠했습니다. 색칠하지 않은 직각은 몇 개인가?`,
      `${n(total - painted)}개`,
      `수선 한 개마다 직각이 ${n(4)}개씩 생기므로 직각은 모두 ` +
        `${expr(`4\\times${k}=${total}`)} 개입니다. ` +
        `${expr(`${total}-${painted}=${total - painted}`)} 이므로 ` +
        `${n(total - painted)}개입니다.`,
    );
  }
  const more = intBetween(rng, 2, 6);
  return make(
    unit,
    `${lineName(b)}에 수선을 ${n(k)}개 그은 다음 수선을 ${n(more)}개 더 ` +
      `그었습니다. ${lineName(b)}에 생긴 직각은 모두 몇 개인가?`,
    `${n(4 * (k + more))}개`,
    `그은 수선은 모두 ${expr(`${k}+${more}=${k + more}`)} 개입니다. 수선 한 개마다 ` +
      `직각이 ${n(4)}개씩 생기므로 ${expr(`4\\times${k + more}=${4 * (k + more)}`)} ` +
      `이고 ${n(4 * (k + more))}개입니다.`,
  );
}

/**
 * **2-4-1 4단 — 직각의 수에서 수선의 수를 되짚는다.**
 *
 * 🔴 **묻는 것의 단위가 «직각»이 아니라 «수선·점»이다.** 그래서 $\div4$ 를 건너뛸 수
 * 없다. 이 구별이 이 갈래의 전부다 — 처음에 「직각이 $\bigcirc$ 개인데 수선을 $\triangle$
 * 개 더 그으면 직각은 몇 개인가」로 썼다가 버렸다. 그 답은 $\bigcirc+4\triangle$ 이라
 * **되짚지 않고도 나온다**(관계가 곱셈 하나라 앞뒤가 선형이다). 4단인 척하는 3단이 된다.
 *
 * ⚠️ **D-66 ⒂ 대로 답부터 골랐다** — 수선의 수를 먼저 뽑고 직각의 수를 거기서 만든다.
 * 직각 수를 뽑아 $4$ 로 나누면 나누어떨어지지 않는 자리가 생기고, 그걸 거르면 그 걸름이
 * 장식인지 아닌지를 다시 재야 한다.
 */
function tier241Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = lineBase(rng, 1);
  const first = intBetween(rng, 2, 7);
  const extra = intBetween(rng, 2, 6);
  const had = 4 * first;
  if (pick(rng, [true, false])) {
    return make(
      unit,
      `${lineName(b)}에 수선을 몇 개 그었더니 직각이 모두 ${n(had)}개 생겼습니다. ` +
        `여기에 수선을 ${n(extra)}개 더 그으면 수선이 ${lineJosa(b, "과", "와")} ` +
        `만나는 점은 모두 몇 개가 되는가?`,
      `${n(first + extra)}개`,
      `수선 한 개마다 직각이 ${n(4)}개씩 생기므로 처음에 그은 수선은 ` +
        `${expr(`${had}\\div4=${first}`)} 개입니다. 여기에 ${n(extra)}개를 더 그으면 ` +
        `수선은 ${expr(`${first}+${extra}=${first + extra}`)} 개이고, 한 점을 지나 ` +
        `${lineName(b)}에 수직인 직선은 하나뿐이므로 만나는 점도 ` +
        `${n(first + extra)}개입니다.`,
    );
  }
  const want = 4 * (first + extra);
  return make(
    unit,
    `${lineName(b)}에 수선을 몇 개 그었더니 직각이 모두 ${n(had)}개 생겼습니다. ` +
      `직각이 모두 ${n(want)}개가 되게 하려면 수선을 몇 개 더 그어야 하는가?`,
    `${n(extra)}개`,
    `더 생겨야 하는 직각은 ${expr(`${want}-${had}=${4 * extra}`)} 개입니다. 수선 한 ` +
      `개마다 직각이 ${n(4)}개씩 생기므로 ${expr(`${4 * extra}\\div4=${extra}`)} 이고 ` +
      `${n(extra)}개를 더 그어야 합니다.`,
  );
}

/* ──────── 2-4-2 평행과 평행선 (2026-08-24, 관계를 «이어 붙인다») ────────
 *
 * **이 소단원의 셈할 수 있는 축은 「한 직선에 수직인 두 직선은 서로 평행하다」이다** —
 * 그 규칙이 **이어 붙는다**. 가⊥나·나⊥다 면 가∥다 이고, 거기에 다⊥라 를 더하면 가⊥라 다.
 * 수직으로 한 번 꺾일 때마다 방향이 바뀌므로 **꺾인 횟수의 홀짝**이 답을 정한다.
 * 1-4-2(밀기)가 「민 거리를 합하고 뺀다」로, 1-4-3(뒤집기)이 「뒤집은 횟수」로 사다리를
 * 세운 것과 **같은 수법**이다 — 교과서가 정성적으로만 묻는 소단원에서 개념 자체가
 * 허락하는 셈을 찾아낸다.
 *
 * ⚠️ **각도로 가지 않는다.** 1-2-3(각의 크기에 따라 분류)이 「$45^\circ$ 인 각은 직각보다
 * 큰가」를, 1-2-4(각도의 합과 차)가 「직선이 이루는 각」과 「잘못하여 더했더니」를 이미
 * 쓴다. 「수직으로 만나 생긴 네 각」류로 열면 낱말만 바뀐 같은 산술이다.
 *
 * ⚠️ **1-4-3 심화의 「$8$번보다 많고 $12$번보다 적다면」 문형을 안 쓴다.** 홀짝을 쓰는
 * 소단원이라 **그 문형이 저절로 떠오른다** — 쓰기 전에 알아채고 걸렀다. 그대로 가면
 * 뒤집기와 **같은 문항**이 되고, R5 는 소단원 «안»에서만 견주므로 이 겹침을 구조적으로
 * 못 본다. 심화는 **가운데 관계를 되짚는** 쪽으로 갔다.
 *   (다음 사람에게: 「홀짝인데 왜 범위 문형을 안 썼지」 싶으면 1-4-3 심화를 먼저 뽑아 보라.)
 *
 * ⚠️ **그림을 안 붙인다 — ③ 가 섰는데도 그렇다.** `lineRelation` 의 `perpendicular` ·
 * `bothPerpendicular` 은 **값을 받지 않는다**(`labels` 뿐). 그러면 씨앗이 달라도 그림이
 * 늘 같아 **R9-b 위반**이다 — 2-4-6 마름모에서 이미 한 번 낸 결함이다. 게다가
 * `bothPerpendicular` 은 두 수선을 **평행하게 그려** 답을 그대로 보여 준다(㉡).
 * 발문이 관계를 말로 다 적어 자족하므로 그림이 없어도 답이 하나다.
 *
 * ⚠️ **직선 이름의 시작 자리를 씨앗마다 옮긴다.** 관계 문항이라 수가 안 들어가서
 * 문형이 갈래마다 둘뿐이었다(R4 는 여덟을 요구한다). 이름을 옮기는 것은 **개념의
 * 변형이 아니라 소재의 변형**이다 — `TRAP_ITEMS`·`RHOMBUS_ITEMS` 와 같은 자리이고,
 * 교과서도 직선 이름을 문항마다 달리 쓴다. 개념 쪽 변형은 1단을 셋으로, 2단을
 * 세 길이로 늘려 따로 벌었다.
 */

/** 직선 이름 — 초4 교과서가 쓰는 차례. 받침이 없으므로 조사는 `josa` 가 고른다. */
const LINE_NAMES = [
  "가",
  "나",
  "다",
  "라",
  "마",
  "바",
  "사",
  "아",
  "자",
] as const;

/** 「직선 가」·「직선 나」… 이름이 모자라면 **던진다** — 조용히 `undefined` 가 나가지 않게. */
function lineName(i: number): string {
  const nm = LINE_NAMES[i];
  if (nm === undefined) {
    throw new Error(`직선 이름이 모자랍니다: ${i}번째 — LINE_NAMES 를 늘려라`);
  }
  return `직선 ${nm}`;
}

/** 「직선 가와」 처럼 이름 + 조사. 받침 판정을 여기 한 곳에 둔다. */
function lineJosa(i: number, withEnd: string, withoutEnd: string): string {
  return josa(lineName(i), withEnd, withoutEnd);
}

/** 이름 `k` 개를 쓸 때 시작 자리 — 뽑고 거르지 않고 **못 뽑을 자리를 안 만든다**. */
function lineBase(rng: Rng, used: number): number {
  return intBetween(rng, 0, LINE_NAMES.length - used);
}

/** 「직선 가, 직선 나, 직선 다」 처럼 늘어놓기. */
function lineList(base: number, k: number): string {
  return Array.from({ length: k }, (_, i) => lineName(base + i)).join(", ");
}

/**
 * **2-4-2 1단 — 규칙을 한 번 적용한다.** 산술이 없다(D-72 ⑶).
 *
 * 세 갈래가 규칙을 **양쪽으로** 쓴다 — 수직 두 번이면 평행, 평행과 수직이 섞이면 수직.
 * 어느 쪽도 이어 붙이기가 아니라 교과서 문장 그대로다.
 */
function tier242Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = lineBase(rng, 3);
  const kind = intBetween(rng, 0, 2);
  if (kind === 0) {
    return make(
      unit,
      `${lineJosa(b, "과", "와")} ${lineJosa(b + 1, "은", "는")} 서로 수직이고, ` +
        `${lineJosa(b + 1, "과", "와")} ${lineName(b + 2)}도 서로 수직입니다. ` +
        `${lineJosa(b, "과", "와")} ${lineJosa(b + 2, "은", "는")} 서로 어떤 관계인가?`,
      "평행",
      `${lineJosa(b, "과", "와")} ${lineJosa(b + 2, "은", "는")} 둘 다 ` +
        `${lineName(b + 1)}에 대한 수선입니다. 한 직선에 수직인 두 직선은 서로 ` +
        `평행하므로 두 직선은 서로 평행합니다.`,
    );
  }
  if (kind === 1) {
    return make(
      unit,
      `${lineJosa(b, "과", "와")} ${lineJosa(b + 1, "은", "는")} 서로 평행하고, ` +
        `${lineJosa(b + 1, "과", "와")} ${lineJosa(b + 2, "은", "는")} 서로 ` +
        `수직입니다. ${lineJosa(b, "과", "와")} ${lineJosa(b + 2, "은", "는")} ` +
        `서로 어떤 관계인가?`,
      "수직",
      `${lineJosa(b + 2, "은", "는")} ${lineName(b + 1)}에 수직입니다. ` +
        `${lineJosa(b, "은", "는")} ${lineJosa(b + 1, "과", "와")} 평행해서 방향이 ` +
        `같으므로 ${lineJosa(b + 2, "은", "는")} ${lineJosa(b, "과", "와")}도 ` +
        `서로 수직입니다.`,
    );
  }
  return make(
    unit,
    `${lineJosa(b, "과", "와")} ${lineJosa(b + 1, "은", "는")} 서로 수직이고, ` +
      `${lineJosa(b + 1, "과", "와")} ${lineJosa(b + 2, "은", "는")} 서로 ` +
      `평행합니다. ${lineJosa(b, "과", "와")} ${lineJosa(b + 2, "은", "는")} ` +
      `서로 어떤 관계인가?`,
    "수직",
    `${lineJosa(b + 2, "은", "는")} ${lineJosa(b + 1, "과", "와")} 평행해서 방향이 ` +
      `같습니다. ${lineJosa(b, "은", "는")} ${lineName(b + 1)}에 수직이므로 ` +
      `${lineName(b + 2)}에도 수직입니다.`,
  );
}

/**
 * **2-4-2 2단 — 스스로 이어 붙인다.**
 *
 * 수직으로 꺾인 횟수가 셋에서 다섯이라 1단처럼 한 번에 안 끝난다. 학생이 세울 것은
 * 「수직으로 한 번 꺾일 때마다 방향이 바뀐다」는 규칙 하나이고, 그것을 되풀이한다.
 */
function tier242Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const links = intBetween(rng, 3, 5);
  const b = lineBase(rng, links + 1);
  const pairs = Array.from(
    { length: links },
    (_, i) => `${lineJosa(b + i, "과", "와")} ${lineName(b + i + 1)}`,
  );
  const even = links % 2 === 0;
  return make(
    unit,
    `${lineList(b, links + 1)}가 있습니다. ${pairs.join(", ")}가 각각 서로 ` +
      `수직입니다. ${lineJosa(b, "과", "와")} ${lineJosa(b + links, "은", "는")} ` +
      `서로 어떤 관계인가?`,
    even ? "평행" : "수직",
    `수직으로 한 번 꺾일 때마다 직선의 방향이 바뀝니다. ${lineName(b)}에서 ` +
      `${lineName(b + links)}까지 수직으로 ${n(links)}번 꺾였으므로 ` +
      (even
        ? "짝수 번이라 방향이 처음으로 돌아와 두 직선은 서로 평행합니다."
        : "홀수 번이라 방향이 바뀌어 두 직선은 서로 수직입니다."),
  );
}

/**
 * **2-4-2 3단 — 두 단계.** 「어느 것이 평행/수직인가」를 먼저 가려야(중간값)
 * 「몇 개인가」가 나온다. 1·2단은 한 쌍만 보지만 여기서는 **전부**를 훑어야 한다.
 */
function tier242Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const count = intBetween(rng, 5, 9);
  const b = lineBase(rng, count);
  const wantParallel = pick(rng, [true, false]);
  const hits: number[] = [];
  for (let i = 1; i < count; i += 1) {
    if ((i % 2 === 0) === wantParallel) hits.push(b + i);
  }
  const word = wantParallel ? "평행" : "수직";
  return make(
    unit,
    `직선 ${n(count)}개가 ${LINE_NAMES.slice(b, b + count).join(", ")} 순서로 ` +
      `있습니다. 이웃한 두 직선끼리는 모두 서로 수직입니다. ` +
      `${lineJosa(b, "과", "와")} 서로 ${wantParallel ? "평행한" : "수직인"} 직선은 ` +
      `${lineJosa(b, "을", "를")} 빼고 모두 몇 개인가?`,
    `${n(hits.length)}개`,
    `수직으로 한 번 꺾일 때마다 방향이 바뀌므로 ${lineName(b)}에서 ` +
      `${wantParallel ? "짝수" : "홀수"} 번 꺾인 직선이 ${lineJosa(b, "과", "와")} ` +
      `서로 ${word}입니다. ${hits.map((i) => lineName(i)).join(", ")}의 ` +
      `${n(hits.length)}개입니다.`,
  );
}

/**
 * **2-4-2 4단 — 가운데 관계를 되짚는다.**
 *
 * 양 끝의 관계가 주어지고 **가운데 한 칸이 비어 있다.** 앞뒤에서 수직으로 한 번씩
 * 꺾이니 그 둘만으로는 방향이 처음으로 돌아온다 — 그러므로 **양 끝의 관계가 곧 가운데의
 * 관계**다. 「꺾인 횟수를 센다」를 거꾸로 쓰는 것이라 2·3단의 지름길이 안 통한다.
 *
 * ⚠️ **D-66 ⒂ 대로 답부터 골랐다** — 가운데 관계를 먼저 뽑고 양 끝의 관계를 거기서 만든다.
 */
function tier242Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const middleParallel = pick(rng, [true, false]);
  const b = lineBase(rng, 4);
  const word = middleParallel ? "평행" : "수직";
  return make(
    unit,
    `${lineList(b, 4)}가 차례로 있습니다. ${lineJosa(b, "과", "와")} ` +
      `${lineJosa(b + 1, "은", "는")} 서로 수직이고, ${lineJosa(b + 2, "과", "와")} ` +
      `${lineName(b + 3)}도 서로 수직입니다. ${lineJosa(b, "과", "와")} ` +
      `${lineJosa(b + 3, "이", "가")} 서로 ${word}하려면 ` +
      `${lineJosa(b + 1, "과", "와")} ${lineJosa(b + 2, "은", "는")} 서로 어떤 ` +
      `관계여야 하는가?`,
    word,
    `${lineName(b)}에서 ${lineName(b + 1)}로, ${lineName(b + 2)}에서 ` +
      `${lineName(b + 3)}로 수직으로 한 번씩 꺾이므로 이 둘만으로는 방향이 처음으로 ` +
      `돌아옵니다. 그러므로 ${lineJosa(b, "과", "와")} ${lineName(b + 3)}의 관계는 ` +
      `${lineJosa(b + 1, "과", "와")} ${lineName(b + 2)}의 관계와 같습니다. ` +
      `${lineJosa(b, "과", "와")} ${lineJosa(b + 3, "이", "가")} 서로 ${word}하려면 ` +
      `${lineJosa(b + 1, "과", "와")} ${lineName(b + 2)}도 서로 ${word}해야 합니다.`,
  );
}

/* ──────── 2-4-3 평행선 사이의 거리 (2026-08-24, 그림을 안 기다리고 연다) ────────
 *
 * **남은 넷 중 이 소단원만 「길이」라는 셈할 수 있는 축을 자기 것으로 가진다.**
 * 2-4-1(수직과 수선)·2-4-2(평행과 평행선)는 잴 길이가 없어 「이 도형에서 수직인/평행한
 * 변이 몇 쌍인가」로만 사다리를 세울 수 있고 그건 도형을 봐야 한다 — 그 둘은 그림을
 * 기다린다. 2-6-4(채우기)도 같다.
 *
 * ⚠️ **각도로 사다리를 세우지 않는다.** 「직각을 세 각으로 나누면」류로 열 수는 있으나
 * 그러면 **1-2-4(각도의 합과 차)와 같은 산술**이 된다. 짐작이 아니라 돌려서 확인했다 —
 * 1-2-4 심화가 이미 「어떤 각도에서 $28^\circ$ 를 빼야 할 것을 잘못하여 더했더니」다.
 * 직각 옷만 입히면 같은 문형이 다시 난다. **R5 는 소단원 «안»에서만 견주므로 이 겹침을
 * 구조적으로 못 본다** — 2-4-6 을 변 축으로만 돌린 것과 같은 자리다.
 *
 * ⚠️ **그림이 없어도 답이 유일하다.** 「직선 가·나·다가 **이 순서로** 나란히 놓여 있고
 * 모두 평행합니다」가 배치를 통째로 정한다. 나중에 ③ 두 직선 관계가 오면 **얹기만** 하면
 * 되고 발문은 다시 안 쓴다. 반대로 「각 ㄱㄷㅁ은 몇 도인가」처럼 **점이 어디 있는지를
 * 그림이 정하는** 문형은 한 갈래도 안 만든다 — 그건 그림 없이 답이 둘이다.
 *
 * ⚠️ **4단을 「합에서 빼고 $2$ 로 나누기」로 짓지 않았다.** 2-4-4 4단이 이미
 * `□+(□+차)=합` 이라 낱말만 바뀐 같은 산술이 된다. 대신 이 소단원 **자신의 성질**
 * (수선의 길이는 어디에서 재어도 같다)을 되짚게 했다 — 그 성질을 모르면 못 푼다.
 *
 * ⚠️ 옛 `quad()` 안에 이 소단원 문항이 남아 있지만 **문형만 봤고 값은 새로 세웠다.**
 * 죽은 코드는 아무 판정기도 안 보고 있어서 거기 있는 것이 옳다는 근거가 없다(리드 지적).
 */

/** **2-4-3 1단 — 성질을 한 번 적용한다.** 산술이 없다(2-2 기하와 같은 규격, D-72 ⑶).
 *
 * 두 갈래가 **같은 성질을 양쪽으로** 묻는다 — 수선을 재면 그것이 거리이고, 거리를 알면
 * 그것이 수선의 길이다. 어느 쪽도 되짚기가 아니라 정의 그대로다.
 */
function tier243Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const dist = intBetween(rng, 3, 15);
  if (pick(rng, [true, false])) {
    return make(
      unit,
      `평행한 두 직선 사이에 수선을 그었더니 그 수선의 길이가 ${cm(dist)}였습니다. ` +
        `이 두 직선 사이의 거리는 몇 cm인가?`,
      cm(dist),
      `평행선 사이의 거리는 평행선 사이에 그은 수선의 길이입니다. ` +
        `그러므로 ${cm(dist)}입니다.`,
    );
  }
  return make(
    unit,
    `평행한 두 직선 사이의 거리가 ${cm(dist)}입니다. 이 두 직선 사이에 그은 수선의 ` +
      `길이는 몇 cm인가?`,
    cm(dist),
    `평행선 사이에 그은 수선의 길이가 곧 평행선 사이의 거리입니다. ` +
      `그러므로 ${cm(dist)}입니다.`,
  );
}

/**
 * **2-4-3 2단 — 스스로 식을 세운다.**
 *
 * 「이 순서로」가 직선 나를 가운데로 못 박으므로, 가와 다 사이가 두 거리의 **합**이라는
 * 것이 발문만으로 정해진다. 학생이 세울 식은 그 덧셈 하나다.
 */
function tier243Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const near = intBetween(rng, 3, 14);
  const far = intBetween(rng, 3, 14);
  return make(
    unit,
    `직선 가, 직선 나, 직선 다가 이 순서로 나란히 놓여 있고 세 직선은 모두 서로 ` +
      `평행합니다. 직선 가와 직선 나 사이의 거리는 ${cm(near)}, 직선 나와 직선 다 사이의 ` +
      `거리는 ${cm(far)}입니다. 직선 가와 직선 다 사이의 거리는 몇 cm인가?`,
    cm(near + far),
    `직선 나가 직선 가와 직선 다 사이에 있으므로 두 거리를 더하면 됩니다. ` +
      `${expr(`${near}+${far}=${near + far}`)} 이므로 ${cm(near + far)}입니다.`,
  );
}

/**
 * **2-4-3 3단 — 두 단계.** 한 칸의 거리를 **먼저 구해야**(중간값) 합을 낼 수 있다.
 *
 * 「더 멀다/더 가깝다」 두 갈래를 **뽑는 순서를 바꿔서** 만든다 — 뽑고 거르지 않으므로
 * 못 뽑을 자리가 아예 없다(`trapSides` 와 같은 원칙). 「가깝다」쪽에서 음수가 날 수
 * 있는데, 그것을 걸름으로 막으면 그 걸름이 **장식인지 아닌지** 다시 재야 한다.
 */
function tier243Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const base = intBetween(rng, 4, 12);
  const diff = intBetween(rng, 2, 9);
  const farther = pick(rng, [true, false]);
  const near = farther ? base : base + diff;
  const far = farther ? base + diff : base;
  return make(
    unit,
    `직선 가, 직선 나, 직선 다가 이 순서로 나란히 놓여 있고 세 직선은 모두 서로 ` +
      `평행합니다. 직선 가와 직선 나 사이의 거리는 ${cm(near)}이고, 직선 나와 직선 다 ` +
      `사이의 거리는 그보다 ${cm(diff)} 더 ${farther ? "깁니다" : "짧습니다"}. ` +
      `직선 가와 직선 다 사이의 거리는 몇 cm인가?`,
    cm(near + far),
    `직선 나와 직선 다 사이의 거리는 ` +
      `${expr(`${near}${farther ? "+" : "-"}${diff}=${far}`)} 입니다. ` +
      `직선 나가 가운데에 있으므로 ` +
      `${expr(`${near}+${far}=${near + far}`)} 이고 ${cm(near + far)}입니다.`,
  );
}

/**
 * **2-4-3 4단 — 이 소단원 «자신의» 성질을 되짚는다.**
 *
 * 「평행선 사이에 그은 수선의 길이는 어디에서 재어도 모두 같다」를 모르면 여러 수선의
 * 길이 **합**에서 한 칸의 거리를 되찾을 수 없다. 그 되찾은 값이 중간값이고, 전체에서
 * 다시 빼야 답이 나온다 — 되짚기 한 번, 빼기 한 번이다.
 *
 * ⚠️ **D-66 ⒂ 대로 답부터 골랐다** — 답(묻는 칸)과 중간값(수선을 그은 칸)을 먼저 뽑고
 * 합·전체를 거기서 **만든다**. 그리는 대로 뽑아 거르면 못 뽑을 자리가 난다.
 *
 * ⚠️ **두 칸의 범위를 겹치지 않게 잡는다.** 같은 값이 나오면 중간값과 답이 같아져
 * 「합에서 되찾기」를 건너뛰고도 답이 맞는 씨앗이 생긴다 — 그러면 그 씨앗에서 4단이
 * 3단보다 가볍다.
 */
function tier243Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const measured = intBetween(rng, 3, 9);
  const asked = intBetween(rng, 11, 22);
  const count = intBetween(rng, 2, 4);
  const sum = measured * count;
  const total = measured + asked;
  const front = pick(rng, [true, false]);
  const drawn = front ? "직선 가와 직선 나" : "직선 나와 직선 다";
  const wanted = front ? "직선 나와 직선 다" : "직선 가와 직선 나";
  return make(
    unit,
    `직선 가, 직선 나, 직선 다가 이 순서로 나란히 놓여 있고 세 직선은 모두 서로 ` +
      `평행합니다. ${drawn} 사이에 수선을 ${n(count)}개 그었더니 그 수선들의 길이의 ` +
      `합이 ${cm(sum)}였습니다. 직선 가와 직선 다 사이의 거리가 ${cm(total)}일 때, ` +
      `${wanted} 사이의 거리는 몇 cm인가?`,
    cm(asked),
    `평행선 사이에 그은 수선의 길이는 어디에서 재어도 모두 같으므로 수선 한 개의 길이는 ` +
      `${expr(`${sum}\\div${count}=${measured}`)} 입니다. 이것이 ${drawn} 사이의 ` +
      `거리입니다. 그러므로 ${wanted} 사이의 거리는 ` +
      `${expr(`${total}-${measured}=${asked}`)} 이고 ${cm(asked)}입니다.`,
  );
}

/** 사다리꼴 소재 — 「평행한 두 변」이 실제로 있는 물건. */
const TRAP_ITEMS = ["밭", "화단", "표지판", "창문"] as const;

/**
 * 그 네 변으로 **사다리꼴이 실제로 그려지는가.**
 *
 * 평행한 두 변의 **차**를 밑변으로 삼고 평행하지 않은 두 변을 두 변으로 하는 삼각형이
 * 서야 한다 — 그래서 조건이 `|a-b| < 긴 변 − 짧은 변 < a+b` 다(삼각형 부등식 그대로).
 *
 * ⚠️ **`isTriangle` 과 똑같은 부류의 결함을 여기서도 냈다.** 첫 판이 네 변을 따로따로
 * 뽑아 `11, 4, 14, 8` 을 냈다 — 평행한 두 변의 차가 $3$ 인데 나머지 두 변의 차가 $4$ 라
 * **그런 사다리꼴은 없다.** 네 수의 합도 맞고 「한 쌍만 평행」도 맞아 **값 검산으로는
 * 안 잡힌다.** 존재하지 않는 도형일 뿐이다. 판정을 갈래마다 적지 않고 **여기 한 곳**에 둔다.
 *
 * 초4 는 이 조건을 배우지 않으므로 학생이 가려낼 수도 없다 — 우리가 안 내는 수밖에 없다.
 */
function isTrapezoid(
  short: number,
  long: number,
  legA: number,
  legB: number,
): boolean {
  const gap = long - short;
  return gap > 0 && Math.abs(legA - legB) < gap && gap < legA + legB;
}

/**
 * 사다리꼴 네 변 — **평행한 두 변**(길이가 다르다)과 평행하지 않은 두 변.
 *
 * 평행한 두 변이 같으면 평행사변형이 되어 「한 쌍만 평행」이 거짓이 되므로 **다르게** 뽑고,
 * 차는 `isTrapezoid` 가 허락하는 폭에서만 고른다 — 뽑고 거르지 않고 **못 뽑을 자리를
 * 안 만든다**. 두 변의 차가 $0$ 이면(둘이 같으면) 차가 $1$ 부터 서므로 늘 하나는 있다.
 */
function trapSides(rng: Rng): {
  short: number;
  long: number;
  legA: number;
  legB: number;
} {
  const legA = intBetween(rng, 3, 10);
  const legB = intBetween(rng, 3, 10);
  const short = intBetween(rng, 4, 11);
  const gap = pick(
    rng,
    Array.from({ length: legA + legB - 1 }, (_, i) => i + 1).filter((g) =>
      isTrapezoid(short, short + g, legA, legB),
    ),
  );
  return { short, long: short + gap, legA, legB };
}

/** **2-4-4 1단 — 네 변의 합.** 평행한 두 변을 발문이 짚어 소단원 약속이 지면에 남는다. */
function tier244Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const item = pick(rng, TRAP_ITEMS);
  const { short, long, legA, legB } = trapSides(rng);
  const total = short + long + legA + legB;
  return make(
    unit,
    `사다리꼴 모양의 ${josa(item, "이", "가")} 있습니다. 평행한 두 변의 길이가 ` +
      `${cm(short)}, ${cm(long)}이고 나머지 두 변의 길이가 ${cm(legA)}, ${cm(legB)}입니다. ` +
      `네 변의 길이의 합은 몇 cm인가?`,
    cm(total),
    `${expr(`${short}+${long}+${legA}+${legB}=${total}`)} 이므로 ${cm(total)}입니다.`,
  );
}

/** **2-4-4 2단 — 이름을 «판별하고» 재기.** 표준은 이름만 묻는다. */
function tier244Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const { short, long, legA, legB } = trapSides(rng);
  const total = short + long + legA + legB;
  return make(
    unit,
    `어떤 사각형은 마주 보는 두 변 중 한 쌍만 서로 평행합니다. 이 사각형의 이름을 쓰고, ` +
      `네 변의 길이가 ${cm(short)}, ${cm(legA)}, ${cm(long)}, ${cm(legB)}일 때 ` +
      `네 변의 길이의 합을 구하시오.`,
    `사다리꼴, ${cm(total)}`,
    `평행한 변이 한 쌍이라도 있는 사각형은 사다리꼴입니다. ` +
      `${expr(`${short}+${legA}+${long}+${legB}=${total}`)} 이므로 ${cm(total)}입니다.`,
  );
}

/** **2-4-4 3단 — 평행한 두 변의 «합».** 중간값은 평행하지 않은 두 변의 합이다. */
function tier244Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const item = pick(rng, TRAP_ITEMS);
  const { short, long, legA, legB } = trapSides(rng);
  const total = short + long + legA + legB;
  return make(
    unit,
    `사다리꼴 모양의 ${josa(item, "이", "가")} 있습니다. 네 변의 길이의 합이 ${cm(total)}이고, ` +
      `평행하지 않은 두 변의 길이가 ${cm(legA)}, ${cm(legB)}입니다. ` +
      `평행한 두 변의 길이의 합은 몇 cm인가?`,
    cm(short + long),
    `평행하지 않은 두 변의 길이의 합은 ${expr(`${legA}+${legB}=${legA + legB}`)} 입니다. ` +
      `${expr(`${total}-${legA + legB}=${short + long}`)} 이므로 ${cm(short + long)}입니다.`,
  );
}

/**
 * **2-4-4 4단 — 세 조건을 엮어 긴 변을 찾는다.**
 *
 * 네 변의 합에서 평행하지 않은 두 변을 빼면 평행한 두 변의 합이고, 거기에 «차»가
 * 있어야 각각이 정해진다. 짧은 변을 $\square$ 로 두면
 * `□ + (□ + 차) = 평행한 두 변의 합` 이다.
 */
function tier244Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const short = intBetween(rng, 4, 12);
  const leg = intBetween(rng, 3, 10);
  // 평행하지 않은 두 변이 **같으므로** 두 변의 차가 $0$ 이고, 조건은 `0 < 차 < 2×다리` 다.
  //
  // ⚠️ **첫 판은 후보를 `2×(다리−1)` 까지만 만들어 걸름이 아무것도 안 걸렀다.** 그러면
  // 그 `filter` 는 **장식**이고, 지워도 아무 일이 없다(변이가 초록으로 그것을 짚어 줬다).
  // 후보를 조건 밖까지 만들어 **걸름이 실제로 일하게** 한다.
  // (그리고 첫 판 주석은 「짝수라야 짧은 변이 자연수」라고 적었는데 **틀렸다** —
  //  짧은 변을 먼저 뽑으므로 차의 홀짝은 아무것도 안 바꾼다. 짝수만 쓰는 까닭은
  //  해설의 `□×2 = 합 − 차` 가 눈에 익은 꼴로 남게 하려는 것뿐이다.)
  const gap = pick(
    rng,
    Array.from({ length: leg + 3 }, (_, i) => (i + 1) * 2).filter((g) =>
      isTrapezoid(short, short + g, leg, leg),
    ),
  );
  const long = short + gap;
  const total = short + long + leg * 2;
  return make(
    unit,
    `사다리꼴의 네 변의 길이의 합이 ${cm(total)}입니다. 평행하지 않은 두 변의 길이는 ` +
      `각각 ${cm(leg)}로 같고, 평행한 두 변 중 긴 변은 짧은 변보다 ${cm(gap)} 깁니다. ` +
      `긴 변의 길이는 몇 cm인가?`,
    cm(long),
    `평행한 두 변의 길이의 합은 ${expr(`${total}-${leg}-${leg}=${short + long}`)} 입니다. ` +
      `짧은 변을 ${expr("\\square")}라고 하면 ` +
      `${expr(`\\square+(\\square+${gap})=${short + long}`)} 이므로 ` +
      `${expr(`\\square\\times2=${short + long}-${gap}=${short * 2}`)} 이고 ` +
      `짧은 변은 ${cm(short)}입니다. 긴 변은 ${expr(`${short}+${gap}=${long}`)} 입니다.`,
  );
}

/** 마름모 모양으로 나올 만한 물건. 수만으로는 변형이 열둘뿐이라 소재로 넓힌다. */
const RHOMBUS_ITEMS = ["연", "타일", "장식", "무늬"] as const;

/* ──────────── 2-4-5 평행사변형 (2026-08-23, 비율 수리 뒤 열림) ────────────
 *
 * 표준이 「한 각 → 이웃한 각 / 마주 보는 각」과 「이웃한 두 변 → 네 변의 합」을 쓴다.
 * 갈래는 **변 축(1·3단)과 각 축(2·4단)을 나눠** 그 셋을 피한다.
 *
 * ⚠️ **그림은 1·2단에만 붙인다 — 재서 그렇게 정했다.** 엔진이 `para` 의 `sides`·`angles`
 * 를 그림에 반영하므로(실측: 각 $115^\circ$ → 그린 각 $115.0^\circ$) 값을 실을 수 있다.
 * 그런데 **답이 길이인 갈래(3단)에 기본 비율로 그리면 그림이 답을 배반한다** —
 * 「합 $34$·한 변 $9$ → 이웃 $8$」인데 기본 그림은 이웃을 $1.5$배로 그린다.
 * 4단도 같다(각의 차가 발문 값과 다르게 그려진다). **그래서 그 둘은 그림 없이 낸다** —
 * 「값을 배반하는 그림」보다 「그림 없음」이 낫다(2026-08-23 그 결함을 찾은 자리다).
 */

/** 평행사변형 그림 — 값을 주면 엔진이 그 값대로 그린다(비율 수리 뒤). */
function paraFigure(rest: Record<string, unknown>): Record<string, unknown> {
  return fig("markedShape", { shape: "para", ...rest });
}

/** **2-4-5 1단 — 마주 보는 변은 같다.** 성질 한 번, 계산 없음. 표준은 이 방향을 안 쓴다. */
function tier245Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 4, 15);
  return make(
    unit,
    `평행사변형입니다. 한 변의 길이가 ${cm(side)}일 때 그 변과 마주 보는 변의 길이는 ` +
      `몇 cm인가?`,
    cm(side),
    `평행사변형은 마주 보는 두 변의 길이가 서로 같습니다. 그러므로 ${cm(side)}입니다.`,
    // 적힌 변은 하나뿐이다 — 마주 보는 변은 **그림에서 같게 그려지고** 라벨은 없다.
    paraFigure({ sides: [`${side} cm`, null, null, null] }),
  );
}

/** **2-4-5 2단 — 한 각에서 네 각 모두로.** 표준은 이웃한 각 «하나»만 묻는다. */
function tier245Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  // 직각이면 직사각형이라 「평행사변형」이라 부르는 것이 흔들린다 — $90^\circ$ 는 뺀다.
  const a = pick(
    rng,
    [50, 55, 60, 65, 70, 75, 80, 100, 105, 110, 115, 120, 125, 130],
  );
  return make(
    unit,
    `평행사변형에서 한 각의 크기가 ${deg(a)}입니다. 네 각의 크기를 모두 구하시오.`,
    `${deg(a)}, ${deg(180 - a)}, ${deg(a)}, ${deg(180 - a)}`,
    `평행사변형은 마주 보는 두 각의 크기가 같으므로 ${deg(a)}인 각이 ${n(2)}개입니다. ` +
      `이웃한 두 각의 크기의 합은 ${deg(180)}이므로 나머지 두 각은 ` +
      `${expr(`180-${a}=${180 - a}`)} 입니다.`,
    paraFigure({ angles: [`${a}°`, null, null, null] }),
  );
}

/** **2-4-5 3단 — 네 변의 합과 한 변에서 이웃한 변으로.** 중간값은 합의 절반이다. */
function tier245Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 4, 14);
  const b = pick(
    rng,
    Array.from({ length: 14 }, (_, i) => i + 3).filter((v) => v !== a),
  );
  return make(
    unit,
    `평행사변형의 네 변의 길이의 합이 ${cm((a + b) * 2)}이고 한 변의 길이가 ${cm(a)}입니다. ` +
      `이 변과 이웃한 변의 길이는 몇 cm인가?`,
    cm(b),
    `평행사변형은 마주 보는 두 변의 길이가 같으므로 이웃한 두 변의 길이의 합은 ` +
      `${expr(`${(a + b) * 2}\\div2=${a + b}`)} 입니다. ` +
      `${expr(`${a + b}-${a}=${b}`)} 이므로 ${cm(b)}입니다.`,
  );
}

/**
 * **2-4-5 4단 — 이웃한 두 각의 «차»에서 각을 찾는다.**
 *
 * 합이 $180^\circ$ 라는 것과 차를 함께 써야 정해진다. 작은 각을 $\square$ 로 두면
 * `□ + (□ + 차) = 180` 이다. 차가 짝수라야 $\square$ 가 자연수인데, 여기서는 **차를
 * 먼저 뽑아 각을 유도**하므로 그 조건이 실제로 일한다(D-66 ⒂).
 */
function tier245Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const gap = intBetween(rng, 1, 12) * 10;
  const small = (180 - gap) / 2;
  return make(
    unit,
    `평행사변형에서 이웃한 두 각의 크기의 차가 ${deg(gap)}입니다. ` +
      `두 각 중 큰 각의 크기는 몇 도인가?`,
    deg(small + gap),
    `평행사변형은 이웃한 두 각의 크기의 합이 ${deg(180)}입니다. 작은 각을 ` +
      `${expr("\\square")}라고 하면 ${expr(`\\square+(\\square+${gap})=180`)} 이므로 ` +
      `${expr(`\\square\\times2=180-${gap}=${small * 2}`)} 이고 작은 각은 ${deg(small)}입니다. ` +
      `큰 각은 ${expr(`${small}+${gap}=${small + gap}`)} 입니다.`,
  );
}

/** **2-4-6 1단 — 네 변의 합에서 한 변으로.** 표준은 한 변→합, 여기는 **역방향**이다. */
function tier246Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const item = pick(rng, RHOMBUS_ITEMS);
  const side = intBetween(rng, 4, 15);
  return make(
    unit,
    `마름모 모양의 ${josa(item, "이", "가")} 있습니다. 네 변의 길이의 합이 ` +
      `${cm(side * 4)}일 때 한 변의 길이는 몇 cm인가?`,
    cm(side),
    `마름모는 네 변의 길이가 모두 같으므로 ${expr(`${side * 4}\\div4=${side}`)} 입니다.`,
    // ⚠️ **그림을 안 붙인다 — 두 부류가 동시에 걸리는 자리다.**
    //  ㉡ 한 변이 **곧 답**이라 치수를 적으면 그림이 답을 보여 준다.
    //  ㉠ 그래서 값을 뺐더니 **씨앗마다 똑같은 그림**이 됐다 — 발문은 「한 변이 $5$」·
    //     「$7$」로 갈리는데 그림이 안 갈리면 그 그림은 어느 값도 안 가리킨다.
    // 붙이려면 답을 보여 주지 않으면서 씨앗마다 갈리는 값이 있어야 하는데 **없다.**
    // 첫 판은 ㉡ 만 보고 값을 뺐고, `probe-elem-rules` R9-b 가 ㉠ 을 잡았다(2026-08-23).
  );
}

/** **2-4-6 2단 — 두 도형을 재어 견준다.** 각각은 한 단계이고 판단이 하나 더 있다. */
function tier246Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const rhombus = intBetween(rng, 4, 12);
  // 두 합이 같으면 「더 긴 쪽」이 없다 — 그런 짝을 **아예 안 뽑는다**.
  const triangle = pick(
    rng,
    Array.from({ length: 12 }, (_, i) => i + 4).filter(
      (v) => v * 3 !== rhombus * 4,
    ),
  );
  const bigger = rhombus * 4 > triangle * 3 ? "마름모" : "정삼각형";
  return make(
    unit,
    `한 변의 길이가 ${cm(rhombus)}인 마름모와 한 변의 길이가 ${cm(triangle)}인 정삼각형이 ` +
      `있습니다. 두 도형 중 모든 변의 길이의 합이 더 긴 것은 무엇인가?`,
    bigger,
    `마름모는 네 변의 길이가 모두 같으므로 ${expr(`${rhombus}\\times4=${rhombus * 4}`)}, ` +
      `정삼각형은 세 변의 길이가 모두 같으므로 ${expr(`${triangle}\\times3=${triangle * 3}`)} 입니다. ` +
      `${expr(`${Math.max(rhombus * 4, triangle * 3)}>${Math.min(rhombus * 4, triangle * 3)}`)} 이므로 ` +
      `${bigger}입니다.`,
  );
}

/** **2-4-6 3단 — 마름모의 한 변을 거쳐 정삼각형으로.** 중간값은 그 한 변이다. */
function tier246Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 4, 15);
  return make(
    unit,
    `마름모의 네 변의 길이의 합이 ${cm(side * 4)}입니다. 이 마름모의 한 변과 길이가 같은 ` +
      `변을 가진 정삼각형의 세 변의 길이의 합은 몇 cm인가?`,
    cm(side * 3),
    `마름모의 한 변은 ${expr(`${side * 4}\\div4=${side}`)} 입니다. ` +
      `정삼각형은 세 변의 길이가 모두 같으므로 ${expr(`${side}\\times3=${side * 3}`)} 입니다.`,
  );
}

/**
 * **2-4-6 4단 — 늘인 뒤의 합에서 처음 한 변을 되짚는다.**
 *
 * ⚠️ **첫 판은 «늘인 뒤의 합을 구하기»(정방향)였다.** 그러면 「네 변이 각각 $\square$ 씩
 * 늘었으니 합이 $\square\times4$ 만큼 는다」는 **지름길**이 있어 한 단계로 끝난다 —
 * 4단이 3단보다 가벼워지는 자리다(리드가 미리 짚었고, 초6 2-5-3·2-5-4 가 오늘 같은
 * 이유로 고쳐졌다). 방향을 뒤집으니 지름길이 사라지고 4단 표지(역산)도 선다.
 */
function tier246Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 5, 14);
  const more = intBetween(rng, 2, 6);
  const grown = (side + more) * 4;
  return make(
    unit,
    `어떤 마름모의 각 변을 ${cm(more)}씩 늘여 새로운 마름모를 만들었더니 ` +
      `네 변의 길이의 합이 ${cm(grown)}가 되었습니다. ` +
      `처음 마름모의 한 변의 길이는 몇 cm인가?`,
    cm(side),
    `새로운 마름모의 한 변은 ${expr(`${grown}\\div4=${side + more}`)} 입니다. ` +
      `각 변을 ${cm(more)}씩 늘인 것이므로 처음 마름모의 한 변은 ` +
      `${expr(`${side + more}-${more}=${side}`)} 입니다.`,
  );
}

/** 사각형 이름과 그것이 «무엇이라고도 할 수 있는지». 포함 관계의 정본이다. */
const QUAD_KINDS = [
  { name: "정사각형", also: ["사다리꼴", "평행사변형", "마름모", "직사각형"] },
  { name: "마름모", also: ["사다리꼴", "평행사변형"] },
  { name: "직사각형", also: ["사다리꼴", "평행사변형"] },
  { name: "평행사변형", also: ["사다리꼴"] },
] as const;

/** 낱말 목록을 「가, 나, 다가」처럼 잇는다 — 마지막 낱말에만 조사를 붙인다. */
function listWithJosa(
  words: readonly string[],
  withEnd: string,
  withoutEnd: string,
): string {
  const last = words[words.length - 1]!;
  const head = words.slice(0, -1);
  return head.length > 0
    ? `${head.join(", ")}, ${josa(last, withEnd, withoutEnd)}`
    : josa(last, withEnd, withoutEnd);
}

/**
 * **2-4-7 1단 — 포함 관계를 «세거나 대거나».**
 *
 * ⚠️ 표준이 「A는 B라고 할 수 있는가? 예/아니요」를 **셋** 쓴다. 낱말만 바꾸면
 * 「상수만 바꾼 것은 같은 문항」(R5)이 된다. 같은 개념을 묻되 **개수**와 **이름**으로
 * 돌렸다 — 찍을 수 없고, 답이 $4$·$2$·$1$ 로 갈린다.
 *
 * 이 소단원은 관계가 알맹이라 수가 안 나온다. 그래서 변형은 **주어 넷 × 묻는 방식 둘**
 * 로 낸다 — 수를 억지로 끼워 넣어 변형을 부풀리지 않는다(안 쓰는 수는 함정일 뿐이다).
 */
function tier247Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const q = pick(rng, QUAD_KINDS);
  const others = ["사다리꼴", "평행사변형", "마름모", "직사각형"].filter(
    (v) => v !== q.name,
  );
  const asksCount = intBetween(rng, 0, 1) === 0;
  const why = `${josa(q.name, "은", "는")} ${listWithJosa(q.also, "이", "가")} 될 수 있습니다.`;
  return make(
    unit,
    `${josa(q.name, "은", "는")} ${others.join(", ")} 중에서 ` +
      (asksCount
        ? "몇 가지라고 할 수 있는가?"
        : "무엇이라고도 할 수 있는가? 모두 쓰시오."),
    asksCount ? `${n(q.also.length)}가지` : q.also.join(", "),
    asksCount ? `${why} 그러므로 ${n(q.also.length)}가지입니다.` : why,
  );
}

/**
 * 조건으로 이름이 **하나로** 정해지는 짝.
 *
 * ⚠️ **포함 관계 때문에 «가진 성질»만 나열하면 답이 하나로 안 정해진다.** 첫 판이
 * 「마주 보는 두 쌍의 변이 평행하고 이웃한 두 변의 길이가 다르다 → 평행사변형」이었는데,
 * **직사각형도 그 둘을 다 만족한다**(가로세로가 다른 직사각형). 「네 변의 길이가 모두
 * 같다 → 마름모」도 정사각형이 걸린다. 그래서 **«아닌 것»을 함께 말해** 좁힌다.
 */
const QUAD_CLUES = [
  {
    has: "네 변의 길이가 모두 같",
    not: "네 각의 크기는 모두 같지 않습니다",
    name: "마름모",
    why: "네 변의 길이가 모두 같은 사각형은 마름모이고, 그중 네 각까지 같은 것이 정사각형입니다",
  },
  {
    has: "네 각의 크기가 모두 같",
    not: "네 변의 길이는 모두 같지 않습니다",
    name: "직사각형",
    why: "네 각의 크기가 모두 같은 사각형은 직사각형이고, 그중 네 변까지 같은 것이 정사각형입니다",
  },
  {
    has: "마주 보는 두 쌍의 변이 서로 평행하",
    not: "네 변의 길이도 네 각의 크기도 모두 같지는 않습니다",
    name: "평행사변형",
    why: "마주 보는 두 쌍의 변이 평행한 사각형은 평행사변형이고, 그중 네 변이 같으면 마름모, 네 각이 같으면 직사각형입니다",
  },
  {
    has: "마주 보는 한 쌍의 변만 서로 평행하",
    not: "다른 한 쌍의 변은 서로 평행하지 않습니다",
    name: "사다리꼴",
    why: "평행한 변이 한 쌍이라도 있으면 사다리꼴이고, 두 쌍이 모두 평행하면 평행사변형입니다",
  },
] as const;

/** **2-4-7 2단 — 「가진 것」과 「아닌 것」으로 이름을 좁힌다.** 표준은 정의만 묻는다. */
function tier247Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const c = pick(rng, QUAD_CLUES);
  const asksName = intBetween(rng, 0, 1) === 0;
  const stem = `어떤 사각형은 ${c.has}지만 ${c.not}.`;
  return make(
    unit,
    asksName
      ? `${stem} 이 사각형의 이름을 쓰시오.`
      : `${stem} 이 사각형을 무엇이라고 하는지 쓰시오.`,
    c.name,
    `${c.why}. 그러므로 이 사각형은 ${c.name}입니다.`,
  );
}

/** **2-4-7 3단 — 이름을 가린 뒤 한 변까지.** 판별이 서야 계산이 선다. */
function tier247Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 4, 15);
  return make(
    unit,
    `어떤 사각형은 네 변의 길이가 모두 같고 네 각의 크기도 모두 같습니다. ` +
      `이 사각형의 네 변의 길이의 합이 ${cm(side * 4)}일 때, ` +
      `이 사각형의 이름과 한 변의 길이를 각각 구하시오.`,
    `정사각형, ${cm(side)}`,
    `네 각의 크기가 모두 같은 사각형은 직사각형이고, 네 변의 길이까지 같으므로 정사각형입니다. ` +
      `${expr(`${side * 4}\\div4=${side}`)} 이므로 한 변은 ${cm(side)}입니다.`,
  );
}

/**
 * **2-4-7 4단 — 반례 조건 + 다른 도형을 거쳐 되짚는다.**
 *
 * 「네 변의 길이가 모두 같다」만으로는 마름모와 정사각형이 안 갈린다 — 「한 각이
 * $90^\circ$ 가 **아니다**」가 정사각형을 지운다(포함 관계의 **경계**).
 * 그 위에 「어떤 마름모보다 $\square$ cm 더 길다」가 얹혀 세 단계가 된다:
 * 그 마름모의 합을 구하고 → 차를 더해 이 사각형의 합을 얻고 → $4$ 로 나눈다.
 * 3단이 「조건 → 이름 → $\div4$」 두 단계인 자리와 이렇게 갈린다.
 */
function tier247Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const other = intBetween(rng, 4, 12);
  const gap = intBetween(rng, 1, 8) * 4; // 합의 차가 $4$의 배수라야 한 변이 자연수다
  const side = other + gap / 4;
  return make(
    unit,
    `어떤 사각형은 네 변의 길이가 모두 같고, 한 각의 크기가 ${deg(90)}가 아닙니다. ` +
      `이 사각형의 네 변의 길이의 합은 한 변이 ${cm(other)}인 마름모의 네 변의 길이의 ` +
      `합보다 ${cm(gap)} 더 깁니다. 이 사각형의 이름과 한 변의 길이를 각각 구하시오.`,
    `마름모, ${cm(side)}`,
    `네 변의 길이가 모두 같은 사각형은 마름모입니다. 그중 네 각이 모두 ${deg(90)}인 것이 ` +
      `정사각형인데 한 각이 ${deg(90)}가 아니므로 정사각형은 아닙니다. ` +
      `한 변이 ${cm(other)}인 마름모의 네 변의 길이의 합은 ` +
      `${expr(`${other}\\times4=${other * 4}`)} 이므로 이 사각형의 네 변의 길이의 합은 ` +
      `${expr(`${other * 4}+${gap}=${side * 4}`)} 입니다. ` +
      `${expr(`${side * 4}\\div4=${side}`)} 이므로 한 변은 ${cm(side)}입니다.`,
  );
}

/**
 * 2-4-1 수직 — 관계를 **말로** 묻는 여섯 문형.
 *
 * 🔴 **`그림처럼` 을 걷어냈다** (2026-08-28). 그 여섯은 1~8 을 뽑아
 *    「$5$번 그림처럼 두 직선이 직각으로 만날 때…」로 나가고 있었는데 **그 그림이 없다.**
 *    `lineRelation` 의 `perpendicular` 을 엔진이 안 받아서(지금은 `parallel` 뿐)
 *    적재 때도 렌더가 실패했고, 33문항이 **전부 그림 없이** 들어갔다. 종이에서는
 *    학생이 있지도 않은 「5번 그림」을 찾게 된다.
 *
 * ⚠️ 그리고 `which` 는 **답을 하나도 바꾸지 않았다** — 변형 규칙(R4: 문형 여덟)을
 *    채우려고 넣은 순수 잡음이다. **잡음으로 변형 수를 채우면 규칙은 초록인데 지면이
 *    나빠진다.** 그런 축은 세지 않는다.
 *
 * 그래서 변형 축을 형제 문형(A01~A03)과 **같은 것**으로 맞췄다 — 직선 이름이다.
 * 그쪽은 이미 `lineName`·`lineJosa`·`lineBase` 로 그렇게 하고, 교과서도 문항마다
 * 직선 이름을 달리 쓴다. 발문이 관계를 말로 다 적으므로 **그림 없이 자족한다**
 * (같은 파일 2-4-2 블록 주석이 적어 둔 판단과 같다).
 */
function quad241Name(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = lineBase(rng, 2);
  return make(
    unit,
    `${lineJosa(b, "과", "와")} ${lineName(b + 1)}이 직각으로 만날 때 두 직선은 서로 무엇이라고 하는가?`,
    "수직",
    `두 직선이 ${deg(90)}로 만나면 서로 수직입니다.`,
  );
}

function quad241RightCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = lineBase(rng, 2);
  return make(
    unit,
    `${lineJosa(b, "과", "와")} ${lineName(b + 1)}이 수직으로 만나면 생기는 직각은 모두 몇 개인가?`,
    n(4),
    `만나는 점 주위로 직각이 ${n(4)}개 생깁니다.`,
  );
}

function quad241OneAngle(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = lineBase(rng, 2);
  return make(
    unit,
    `${lineJosa(b, "과", "와")} ${lineName(b + 1)}이 수직으로 만날 때 한 각의 크기는 몇 도인가?`,
    deg(90),
    `수직으로 만나면 각의 크기는 ${deg(90)}입니다.`,
  );
}

function quad241Sum3(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 1, 4);
  const b = lineBase(rng, 2);
  return make(
    unit,
    `${lineJosa(b, "과", "와")} ${lineName(b + 1)}이 수직으로 만나서 생긴 네 각 가운데 ${n(k)}개의 각의 크기를 더하면 몇 도인가?`,
    deg(90 * k),
    `${expr(`90\\times${k}=${90 * k}`)} 입니다.`,
  );
}

function quad241NotRight(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = lineBase(rng, 2);
  return make(
    unit,
    `${lineJosa(b, "과", "와")} ${lineName(b + 1)}이 수직으로 만날 때 직각이 아닌 각이 있는가? '예' 또는 '아니요'로 답하시오.`,
    "아니요",
    `네 각이 모두 직각입니다.`,
  );
}

function quad241PerpName(unit: UnitSeed, rng: Rng): ElemProblem {
  const b = lineBase(rng, 2);
  return make(
    unit,
    `${lineName(b)}에 수직인 직선을 무엇이라고 하는가?`,
    "수선",
    `한 직선에 수직인 직선이 수선입니다.`,
  );
}

function quad242Name(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `그림처럼 아무리 늘여도 만나지 않는 두 직선을 무엇이라고 하는가?`,
    "평행",
    `만나지 않는 두 직선은 서로 평행합니다.`,
    fig("lineRelation", { relation: "parallel", perpCount: 1 }),
  );
}

function quad242Dist(unit: UnitSeed, rng: Rng): ElemProblem {
  const dist = intBetween(rng, 3, 12);
  return make(
    unit,
    `평행한 두 직선 사이에 그은 수선의 길이가 ${cm(dist)}입니다. 두 직선 사이의 거리는 몇 cm인가?`,
    cm(dist),
    `평행선 사이의 거리는 수선의 길이이므로 ${cm(dist)}입니다.`,
    fig("lineRelation", { relation: "parallel", perpCount: 1 }),
  );
}

function quad242Same(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `평행선 사이에 그은 수선의 길이는 모두 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `평행선 사이의 수선의 길이는 모두 같습니다.`,
    fig("lineRelation", { relation: "parallel", perpCount: 2 }),
  );
}

function quad242Meet(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `그림처럼 평행한 두 직선을 늘이면 만나는가? '예' 또는 '아니요'로 답하시오.`,
    "아니요",
    `평행한 두 직선은 만나지 않습니다.`,
    fig("lineRelation", { relation: "parallel", perpCount: 1 }),
  );
}

function quad242PerpCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 5);
  return make(
    unit,
    "그림에서 평행한 두 직선 사이에 그은 수선은 모두 몇 개인가?",
    n(k),
    `그은 수선은 ${n(k)}개입니다.`,
    fig("lineRelation", { relation: "parallel", perpCount: k }),
  );
}

function quad242Angle(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `그림에서 평행선에 그은 수선이 이루는 각의 크기는 몇 도인가?`,
    deg(90),
    `수선이므로 각의 크기는 ${deg(90)}입니다.`,
    fig("lineRelation", { relation: "parallel", perpCount: 1 }),
  );
}

function quad243Sum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 3, 9);
  const b = intBetween(rng, 3, 9);
  return make(
    unit,
    `세 평행선에서 이웃한 두 거리의 합이 ${cm(a)}와 ${cm(b)}일 때 양쪽 직선 사이의 거리는 몇 cm인가?`,
    cm(a + b),
    `${expr(`${a}+${b}=${a + b}`)} 이므로 ${cm(a + b)}입니다.`,
    fig("lineRelation", { relation: "parallel", perpCount: 1 }),
  );
}

function quad243One(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = intBetween(rng, 4, 15);
  return make(
    unit,
    `평행선 사이의 거리가 ${cm(d)}일 때 그 사이에 그은 수선의 길이는 몇 cm인가?`,
    cm(d),
    `거리는 수선의 길이와 같으므로 ${cm(d)}입니다.`,
    fig("lineRelation", { relation: "parallel", perpCount: 1 }),
  );
}

function quad243Farther(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 3, 8);
  const b = a + intBetween(rng, 2, 6);
  return make(
    unit,
    `직선 가와 나 사이의 거리는 ${cm(a)}, 나와 다 사이의 거리는 ${cm(b)}입니다. 더 먼 쪽의 거리는 몇 cm인가?`,
    cm(b),
    `${cm(b)}이 ${cm(a)}보다 멉니다.`,
  );
}

function quad243Diff(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 5, 12);
  const b = intBetween(rng, 2, a - 1);
  return make(
    unit,
    `두 평행선 사이의 거리가 ${cm(a)}와 ${cm(b)}입니다. 두 거리의 차는 몇 cm인가?`,
    cm(a - b),
    `${expr(`${a}-${b}=${a - b}`)} 이므로 ${cm(a - b)}입니다.`,
  );
}

function quad243Equal(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `평행선에서 어디에 수선을 그어도 길이가 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `평행선 사이의 거리는 어디서 재어도 같습니다.`,
    fig("lineRelation", { relation: "parallel", perpCount: 2 }),
  );
}

function quad243Triple(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 2, 6);
  return make(
    unit,
    `세 평행선이 같은 간격 ${cm(a)}로 놓여 있습니다. 양쪽 직선 사이의 거리는 몇 cm인가?`,
    cm(a * 2),
    `${expr(`${a}\\times2=${a * 2}`)} 이므로 ${cm(a * 2)}입니다.`,
  );
}

function quad244Pick(unit: UnitSeed, rng: Rng): ElemProblem {
  const put = labelledPick(rng, "trap", [
    "choiceSkewQuad",
    "choiceNonparallelQuad",
  ]);
  return make(
    unit,
    "그림에서 사다리꼴의 기호를 쓰시오.",
    put.answer,
    `${put.answer}는 평행한 변이 한 쌍 있는 사각형입니다.`,
    fig("namedShapes", { items: put.items }),
  );
}

function quad244Pairs(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `사다리꼴에서 평행한 변은 몇 쌍인가?`,
    `${n(1)}쌍`,
    `사다리꼴은 평행한 변이 ${n(1)}쌍입니다.`,
    fig("namedShapes", { items: [{ shape: "trap", label: "가" }] }),
  );
}

function quad244Perim(unit: UnitSeed, rng: Rng): ElemProblem {
  const { short, long, legA, legB } = trapSides(rng);
  return make(
    unit,
    `네 변의 길이가 ${cm(short)}, ${cm(long)}, ${cm(legA)}, ${cm(legB)}인 사다리꼴의 네 변의 길이의 합은 몇 cm인가?`,
    cm(short + long + legA + legB),
    `${expr(`${short}+${long}+${legA}+${legB}=${short + long + legA + legB}`)} 입니다.`,
  );
}

function quad244Name(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `그림처럼 평행한 변이 한 쌍만 있는 사각형을 무엇이라고 하는가?`,
    "사다리꼴",
    `평행한 변이 한 쌍인 사각형은 사다리꼴입니다.`,
    fig("namedShapes", { items: [{ shape: "trap", label: "가" }] }),
  );
}

function quad244Vertices(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `사다리꼴의 꼭짓점은 몇 개인가?`,
    n(4),
    `사각형의 꼭짓점은 ${n(4)}개입니다.`,
    fig("namedShapes", { items: [{ shape: "trap", label: "가" }] }),
  );
}

function quad244Sides(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `사다리꼴에서 평행하지 않은 변은 몇 개인가?`,
    n(2),
    `사다리꼴은 평행한 변이 ${n(1)}쌍이고 평행하지 않은 변은 ${n(2)}개입니다.`,
    fig("namedShapes", { items: [{ shape: "trap", label: "가" }] }),
  );
}

function quad245OppSide(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 4, 15);
  return make(
    unit,
    `평행사변형의 한 변의 길이가 ${cm(s)}입니다. 마주 보는 변의 길이는 몇 cm인가?`,
    cm(s),
    `평행사변형은 마주 보는 두 변의 길이가 같습니다.`,
    paraFigure({ sides: [`${s} cm`, null, null, null] }),
  );
}

function quad245NeighborSum(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, [50, 60, 70, 80, 100, 110, 120]);
  return make(
    unit,
    `평행사변형의 한 각이 ${deg(a)}입니다. 이웃한 각의 크기는 몇 도인가?`,
    deg(180 - a),
    `${expr(`180-${a}=${180 - a}`)} 입니다.`,
    paraFigure({ angles: [`${a}°`, null, null, null] }),
  );
}

function quad245OppAngle(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = pick(rng, [50, 60, 70, 80, 100, 110, 120]);
  return make(
    unit,
    `평행사변형의 한 각이 ${deg(a)}입니다. 마주 보는 각의 크기는 몇 도인가?`,
    deg(a),
    `평행사변형은 마주 보는 두 각의 크기가 같습니다.`,
    paraFigure({ angles: [`${a}°`, null, null, null] }),
  );
}

function quad245Perim(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 4, 12);
  const b = intBetween(rng, 3, 11);
  return make(
    unit,
    `이웃한 두 변의 길이가 ${cm(a)}, ${cm(b)}인 평행사변형의 네 변의 길이의 합은 몇 cm인가?`,
    cm((a + b) * 2),
    `${expr(`(${a}+${b})\\times2=${(a + b) * 2}`)} 입니다.`,
  );
}

function quad245Vertices(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `평행사변형의 꼭짓점은 몇 개인가?`,
    n(4),
    `사각형의 꼭짓점은 ${n(4)}개입니다.`,
    paraFigure({}),
  );
}

function quad245Name(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `그림처럼 마주 보는 두 쌍의 변이 각각 평행한 사각형을 무엇이라고 하는가?`,
    "평행사변형",
    `마주 보는 두 쌍의 변이 평행한 사각형은 평행사변형입니다.`,
    paraFigure({}),
  );
}

function quad246Side(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 4, 15);
  return make(
    unit,
    `마름모의 한 변의 길이가 ${cm(s)}입니다. 다른 한 변의 길이는 몇 cm인가?`,
    cm(s),
    `마름모는 네 변의 길이가 모두 같습니다.`,
    fig("namedShapes", { items: [{ shape: "tallDiamond", label: "가" }] }),
  );
}

function quad246Perim(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 4, 15);
  return make(
    unit,
    `한 변이 ${cm(s)}인 마름모의 네 변의 길이의 합은 몇 cm인가?`,
    cm(s * 4),
    `${expr(`${s}\\times4=${s * 4}`)} 입니다.`,
    fig("namedShapes", { items: [{ shape: "tallDiamond", label: "가" }] }),
  );
}

function quad246Pick(unit: UnitSeed, rng: Rng): ElemProblem {
  const put = labelledPick(rng, "tallDiamond", ["rect", "trap"]);
  return make(
    unit,
    "그림에서 마름모의 기호를 쓰시오.",
    put.answer,
    `${put.answer}는 네 변의 길이가 모두 같습니다.`,
    fig("namedShapes", { items: put.items }),
  );
}

function quad246FromPerim(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 4, 15);
  return make(
    unit,
    `네 변의 길이의 합이 ${cm(s * 4)}인 마름모의 한 변은 몇 cm인가?`,
    cm(s),
    `${expr(`${s * 4}\\div4=${s}`)} 입니다.`,
  );
}

function quad246AllEqual(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `마름모의 네 변의 길이는 모두 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `마름모는 네 변의 길이가 모두 같습니다.`,
    fig("namedShapes", { items: [{ shape: "tallDiamond", label: "가" }] }),
  );
}

function quad246Vertices(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `마름모의 꼭짓점은 몇 개인가?`,
    n(4),
    `사각형의 꼭짓점은 ${n(4)}개입니다.`,
    fig("namedShapes", { items: [{ shape: "tallDiamond", label: "가" }] }),
  );
}

function quad247SqIsRect(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `정사각형은 직사각형이라고 할 수 있는가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `정사각형은 네 각이 모두 직각이므로 직사각형입니다.`,
    fig("markedShape", { shape: "square" }),
  );
}

function quad247NameRight(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `그림처럼 네 각의 크기가 모두 직각인 사각형을 무엇이라고 하는가?`,
    "직사각형",
    `네 각이 모두 직각인 사각형은 직사각형입니다.`,
    fig("markedShape", { shape: "rect" }),
  );
}

function quad247NameEq(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `그림처럼 네 변의 길이가 모두 같고 네 각이 모두 직각인 사각형을 무엇이라고 하는가?`,
    "정사각형",
    `네 변의 길이가 같고 네 각이 직각인 사각형은 정사각형입니다.`,
    fig("markedShape", { shape: "square" }),
  );
}

function quad247SqSide(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 4, 15);
  return make(
    unit,
    `한 변이 ${cm(s)}인 정사각형의 네 변의 길이의 합은 몇 cm인가?`,
    cm(s * 4),
    `${expr(`${s}\\times4=${s * 4}`)} 입니다.`,
    fig("markedShape", { shape: "square" }),
  );
}

function quad247RectPerim(unit: UnitSeed, rng: Rng): ElemProblem {
  const w = intBetween(rng, 5, 12);
  const h = intBetween(rng, 3, w - 1);
  return make(
    unit,
    `가로 ${cm(w)}, 세로 ${cm(h)}인 직사각형의 네 변의 길이의 합은 몇 cm인가?`,
    cm((w + h) * 2),
    `${expr(`(${w}+${h})\\times2=${(w + h) * 2}`)} 입니다.`,
    fig("markedShape", { shape: "rect" }),
  );
}

function quad247SqFromPerim(unit: UnitSeed, rng: Rng): ElemProblem {
  const s = intBetween(rng, 4, 15);
  return make(
    unit,
    `네 변의 길이의 합이 ${cm(s * 4)}인 정사각형의 한 변은 몇 cm인가?`,
    cm(s),
    `${expr(`${s * 4}\\div4=${s}`)} 입니다.`,
    fig("markedShape", { shape: "square" }),
  );
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
  /**
   * **표 칸에 쓸 짧은 이름.** 없으면 `topic` 을 쓴다.
   *
   * 표의 첫 열은 «지면 폭 − 나머지 열» 만 쓸 수 있다(실측: 남는 자리 최소 $52$단위).
   * 「하루 동안 내린 비의 양(mm)」은 $165$단위라 그 자리에 **못 들어간다** — 옛 엔진은
   * 조용히 잘랐고(왼쪽 끝 $-11.8$까지 넘쳤다) 지금 엔진은 던진다(D-70).
   *
   * ⚠️ **`topic` 자체를 줄이지 않는다.** 발문이 「$\cdots$ 을 조사하여 나타낸 표입니다」로
   * 그 말을 쓰므로, 줄이면 지면의 문장이 같이 상한다. 짧게 쓸 자리는 **표 칸뿐**이다.
   */
  short?: string;
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
    short: "관람객 수",
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
    short: "비의 양",
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
        `${intro} 세로 눈금 한 칸은 몇 ${unitJosa(theme.unit, "을", "를")} 나타내는가?`,
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
      `(${theme.labels[0]!.math}의 값은 ${n(nums[0]!)}${unitJosa(theme.unit, "으로", "로")} 그보다 작습니다). ` +
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
/**
 * 표를 **세로로** 세운다 — 항목이 행, 값이 열(D-70 폭 가드, 2026-08-24).
 *
 * 가로로 눕히면 첫 열에 긴 이름이 들어가는데, 그 자리는 «지면 폭 − 나머지 열» 뿐이다.
 * 실측으로 남는 자리가 **최소 $52$단위**인데 「하루 동안 내린 비의 양(mm)」은 $165$다.
 * 옛 엔진은 그것을 **조용히 잘랐고**(글자 왼쪽 끝이 $-11.8$까지 넘쳐 한글 다섯 자가
 * 사라졌다) 에러도 안 났다 — 지면에서 티가 안 나는 결함이었다.
 *
 * ⚠️ **세 안을 실제 렌더러에 대 보고 골랐다**(시뮬레이션이 아니다).
 *   라벨만 줄이기 $0/192$ · 전치만 $141/192$ · **전치 + 긴 이름 둘 줄이기 $192/192$**.
 *   전치만으로는 값 열이 $193$단위라 아직 넘친다 — 둘 다 필요하다.
 */
function tableFigure(
  theme: LineTheme,
  nums: readonly number[],
): Record<string, unknown> {
  return fig("table", {
    headers: ["구분", `${theme.short ?? theme.topic}(${theme.unit})`],
    rows: theme.labels.map((l, i) => [l.text, String(nums[i] ?? "")]),
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

function linePack(unit: UnitSeed, rng: Rng) {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = lineValues(rng, theme);
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const figure = fig("lineChart", {
    values: theme.labels.map((label, i) => ({
      label: label.text,
      value: nums[i]!,
    })),
    yMax: max + 3,
    yStep: theme.yStep,
    yLabel: theme.unit,
  });
  const intro = `${josa(theme.topic, "을", "를")} 조사하여 나타낸 꺾은선그래프입니다.`;
  return { theme, nums, max, min, figure, intro };
}

function line251LeastWhen(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = linePack(unit, rng);
  const at = d.nums.indexOf(d.min);
  return make(
    unit,
    `${d.intro} ${d.theme.topic}의 값이 가장 작은 때는 언제인가?`,
    d.theme.labels[at]!.math,
    `${d.theme.labels[at]!.math}일 때 ${n(d.min)}${d.theme.unit}로 가장 작습니다.`,
    d.figure,
  );
}

function line251Read(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = linePack(unit, rng);
  const at = intBetween(rng, 0, d.theme.labels.length - 1);
  const label = d.theme.labels[at]!;
  return make(
    unit,
    `${d.intro} ${label.math}의 ${josa(d.theme.topic, "은", "는")} 몇 ${d.theme.unit}인가?`,
    `${n(d.nums[at]!)}${d.theme.unit}`,
    `${label.math}의 점이 가리키는 값은 ${n(d.nums[at]!)}${d.theme.unit}입니다.`,
    d.figure,
  );
}

function line251MaxValue(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = linePack(unit, rng);
  return make(
    unit,
    `${d.intro} ${d.theme.topic}의 가장 큰 값은 몇 ${d.theme.unit}인가?`,
    `${n(d.max)}${d.theme.unit}`,
    `가장 큰 값은 ${n(d.max)}${d.theme.unit}입니다.`,
    d.figure,
  );
}

function line251First(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = linePack(unit, rng);
  return make(
    unit,
    `${d.intro} 맨 처음에 조사한 때의 값은 몇 ${d.theme.unit}인가?`,
    `${n(d.nums[0]!)}${d.theme.unit}`,
    `${d.theme.labels[0]!.math}의 값은 ${n(d.nums[0]!)}${d.theme.unit}입니다.`,
    d.figure,
  );
}

function line251Last(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = linePack(unit, rng);
  const last = d.theme.labels.length - 1;
  return make(
    unit,
    `${d.intro} 맨 나중에 조사한 때의 값은 몇 ${d.theme.unit}인가?`,
    `${n(d.nums[last]!)}${d.theme.unit}`,
    `${d.theme.labels[last]!.math}의 값은 ${n(d.nums[last]!)}${d.theme.unit}입니다.`,
    d.figure,
  );
}

function line251Points(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = linePack(unit, rng);
  return make(
    unit,
    `${d.intro} 꺾은선그래프에 찍힌 점은 모두 몇 개인가?`,
    n(d.nums.length),
    `점이 ${n(d.nums.length)}개 찍혀 있습니다.`,
    d.figure,
  );
}

function line252RiseCount(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = tableValues(rng, theme);
  const rises = nums.slice(1).filter((v, i) => v > nums[i]!).length;
  return make(
    unit,
    `${tableIntro(theme)} 값이 늘어난 구간은 모두 몇 번인가?`,
    `${n(rises)}번`,
    `값이 늘어난 구간이 ${n(rises)}번입니다.`,
    tableFigure(theme, nums),
  );
}

function line252Range(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = tableValues(rng, theme);
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  return make(
    unit,
    `${tableIntro(theme)} 가장 큰 값과 가장 작은 값의 차는 몇 ${theme.unit}인가?`,
    `${n(max - min)}${theme.unit}`,
    `${expr(`${max}-${min}=${max - min}`)} 입니다.`,
    tableFigure(theme, nums),
  );
}

function line252PairDiff(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = tableValues(rng, theme);
  const i = intBetween(rng, 0, nums.length - 2);
  const gap = Math.abs(nums[i + 1]! - nums[i]!);
  return make(
    unit,
    `${tableIntro(theme)} ${josa(theme.labels[i]!.math, "과", "와")} ${theme.labels[i + 1]!.math} 사이의 차는 몇 ${theme.unit}인가?`,
    `${n(gap)}${theme.unit}`,
    `${expr(`${Math.max(nums[i]!, nums[i + 1]!)}-${Math.min(nums[i]!, nums[i + 1]!)}=${gap}`)} 입니다.`,
    tableFigure(theme, nums),
  );
}

function line252MaxWhen(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = tableValues(rng, theme);
  const at = nums.indexOf(Math.max(...nums));
  return make(
    unit,
    `${tableIntro(theme)} 값이 가장 큰 때는 언제인가?`,
    theme.labels[at]!.math,
    `${theme.labels[at]!.math}일 때 가장 큽니다.`,
    tableFigure(theme, nums),
  );
}

function line252MinValue(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = tableValues(rng, theme);
  const min = Math.min(...nums);
  return make(
    unit,
    `${tableIntro(theme)} 가장 작은 값은 몇 ${theme.unit}인가?`,
    `${n(min)}${theme.unit}`,
    `가장 작은 값은 ${n(min)}${theme.unit}입니다.`,
    tableFigure(theme, nums),
  );
}

function line252HowManyRows(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = tableValues(rng, theme);
  return make(
    unit,
    `${tableIntro(theme)} 조사한 때는 모두 몇 개인가?`,
    n(theme.labels.length),
    `때가 ${n(theme.labels.length)}개입니다.`,
    tableFigure(theme, nums),
  );
}

function line253Step(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = linePack(unit, rng);
  return make(
    unit,
    `${d.intro} 세로 눈금 한 칸은 몇 ${unitJosa(d.theme.unit, "을", "를")} 나타내는가?`,
    `${n(d.theme.yStep)}${d.theme.unit}`,
    `한 칸은 ${n(d.theme.yStep)}${d.theme.unit}입니다.`,
    d.figure,
  );
}

function line253Rise(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = linePack(unit, rng);
  const rises = d.nums.slice(1).filter((v, i) => v > d.nums[i]!).length;
  return make(
    unit,
    `${d.intro} ${d.theme.topic}의 값이 늘어난 구간은 모두 몇 번인가?`,
    `${n(rises)}번`,
    `늘어난 구간이 ${n(rises)}번입니다.`,
    d.figure,
  );
}

function line253Range(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = linePack(unit, rng);
  return make(
    unit,
    `${d.intro} 가장 큰 값과 가장 작은 값의 차는 몇 ${d.theme.unit}인가?`,
    `${n(d.max - d.min)}${d.theme.unit}`,
    `${expr(`${d.max}-${d.min}=${d.max - d.min}`)} 입니다.`,
    d.figure,
  );
}

function line253FirstLast(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = linePack(unit, rng);
  const last = d.nums[d.nums.length - 1]!;
  const first = d.nums[0]!;
  return make(
    unit,
    `${d.intro} ${d.theme.labels[d.theme.labels.length - 1]!.math}의 값은 ${d.theme.labels[0]!.math}의 값보다 몇 ${d.theme.unit} 더 ${last >= first ? "큰가" : "작은가"}?`,
    `${n(Math.abs(last - first))}${d.theme.unit}`,
    `${expr(`${Math.max(first, last)}-${Math.min(first, last)}=${Math.abs(last - first)}`)} 입니다.`,
    d.figure,
  );
}

function line253MaxWhen(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = linePack(unit, rng);
  const at = d.nums.indexOf(d.max);
  return make(
    unit,
    `${d.intro} ${d.theme.topic}의 값이 가장 큰 때는 언제인가?`,
    d.theme.labels[at]!.math,
    `${d.theme.labels[at]!.math}일 때 가장 큽니다.`,
    d.figure,
  );
}

function line253Unit(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = linePack(unit, rng);
  return make(
    unit,
    `${d.intro} 세로축의 단위는 무엇인가?`,
    d.theme.unit,
    `세로축의 단위는 ${d.theme.unit}입니다.`,
    d.figure,
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
    /* ─── `tiling`(⑥)을 여기 붙인다 — **비가 곧 발문의 값인 자리** (2026-08-24) ───
     *
     * 엔진이 그리는 것은 조각과 목표의 **한 변의 비**다. 이 세 갈래는 발문이 두 변의
     * 길이를 직접 주므로 그림이 **주는 값만** 적는다(09 §2.2 ①). 그리고 조각을 다
     * 그리지 않으므로 **세면 답이 나오는** 일도 없다(엔진 쪽 `_tiling` 머리말).
     * 답을 내려면 「한 변이 $k$ 배면 조각은 $k\times k$ 개」를 알아야 하므로 ⑥ 도 통과다.
     *
     * ⚠️ 셋째 갈래(정육각형↔정삼각형)는 기본값 $1:2$ 가 **정확히 맞다** — `eqTri` 는
     * 상자 크기가 곧 한 변이고 `hexagon` 은 한 변이 상자의 절반이다(좌표로 확인).
     * 그래서 세 갈래의 답이 $4\cdot9\cdot6$ 으로 갈려 R9-c 쏠림도 나지 않는다.
     * 갈래(D-72) 쪽은 조각 등가 축이라 **그림을 안 붙인다** — 까닭은 그 블록에 있다.
     */
    const side = intBetween(rng, 2, 6);
    const kind = intBetween(rng, 0, 2);
    if (kind === 0) {
      return make(
        unit,
        `한 변이 ${cm(side)}인 정삼각형 모양 조각으로 한 변이 ${cm(side * 2)}인 정삼각형을 ` +
          `빈틈없이 채우려면 조각이 몇 개 필요한가?`,
        n(4),
        `한 변이 ${n(2)}배가 되면 조각은 ${expr("2\\times2=4")} 개가 필요합니다.`,
        fig("tiling", {
          piece: "eqTri",
          target: "eqTri",
          pieceSide: side,
          targetSide: side * 2,
        }),
      );
    }
    if (kind === 1) {
      return make(
        unit,
        `한 변이 ${cm(side)}인 정사각형 모양 조각으로 한 변이 ${cm(side * 3)}인 정사각형을 ` +
          `빈틈없이 채우려면 조각이 몇 개 필요한가?`,
        n(9),
        `한 변이 ${n(3)}배가 되면 조각은 ${expr("3\\times3=9")} 개가 필요합니다.`,
        fig("tiling", {
          piece: "square",
          target: "square",
          pieceSide: side,
          targetSide: side * 3,
        }),
      );
    }
    return make(
      unit,
      `${polyName(6, true)} 모양은 정삼각형 모양 조각 몇 개로 빈틈없이 채울 수 있는가?`,
      `${n(6)}개`,
      `${polyName(6, true)}의 한가운데에서 각 꼭짓점으로 선분을 그으면 정삼각형이 ${n(6)}개 생깁니다.`,
      fig("tiling", { piece: "eqTri", target: "hexagon" }),
    );
  }

  return noBranch(unit);
}

/* ──────────── 2-6 난이도 4단 (D-72 확대, 2026-08-23) ────────────
 *
 * ⚠️ **정다각형의 «한 각의 크기»는 한 갈래도 만들지 않는다.** 정오각형 한 각
 * $108^\circ$ 는 $(n-2)\times180\div n$ 이라 **초4 범위 밖**이다(초4 는 삼각형 $180^\circ$·
 * 사각형 $360^\circ$ 까지). 그래서 2-6-2 는 **변 축으로만** 간다. 2-4-6(마름모)에서 각 축을
 * 뺀 것과 판단은 같지만 까닭이 다르다 — 거기는 겹침, 여기는 **교육과정 범위**다.
 *
 * ⚠️ **「예/아니요」 문형을 한 갈래도 쓰지 않는다.** 표준 2-6-1 이 그 문형을 쓴다
 * (「곡선이 있어도 다각형인가」). 낱말만 바꾸면 「상수만 바꾼 것은 같은 문항」(R5)이고,
 * 찍어도 절반이라 그 자체로 약한 문형이다.
 *
 * 표준이 이미 쓴 것을 피해 **묻는 방향**을 돌렸다:
 *   2-6-1 표준은 «변 수 → 이름»·«이름 → 꼭짓점 수»  → 갈래는 «꼭짓점 수 → 이름»
 *   2-6-2 표준은 «한 변 ↔ 모든 변의 합» **양방향**   → 갈래는 «합과 한 변 → 변의 수»
 *   2-6-3 표준은 «이름 → 개수» 둘                    → 갈래는 «개수 → 이름», «개수 → 개수»
 *
 * ⚠️ **그림은 아직 안 붙였다.** ② 확장이 정n각형 모양은 그리지만 `sides`·`angles` 에
 * **값을 적으면 던진다**(비율 수리 전 임시 차단, elem-figures 2026-08-23). 2-6-2 는
 * 한 변 길이를 적는 갈래가 대부분이라 지금 붙이면 던진다. 수리 뒤 2-4 넷과 함께 얹는다.
 * 그리고 정n각형은 ⑧「고르기」목록에 **없다** — 윤곽으로 안 갈린다(정칠↔정팔 2.18px).
 */

/**
 * 대각선 수 표 — `n(n-3)/2`. **다섯 값이 서로 달라서** 역산이 하나로 정해진다.
 * 엔진의 그림 쪽 잠금과 같은 값이다(square 2 · pentagon 5 · hexagon 9 · octagon 20).
 */
const DIAGONALS: readonly { sides: number; total: number; each: number }[] = [
  4, 5, 6, 7, 8,
].map((s) => ({ sides: s, total: (s * (s - 3)) / 2, each: s - 3 }));

/** **2-6-1 1단 — 꼭짓점 수에서 이름으로.** 표준은 **변** 수를 준다(방향이 다르다). */
function tier261Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ `sino` 표가 **십이까지**다 — 그 위를 뽑으면 던진다.
  const sides = intBetween(rng, 3, 10);
  return make(
    unit,
    intBetween(rng, 0, 1) === 0
      ? `꼭짓점이 ${n(sides)}개인 다각형의 이름을 쓰시오.`
      : `어떤 다각형의 꼭짓점이 ${n(sides)}개입니다. 이 다각형을 무엇이라고 하는가?`,
    polyName(sides),
    `다각형은 변의 수와 꼭짓점의 수가 같습니다. 꼭짓점이 ${n(sides)}개이면 변도 ` +
      `${n(sides)}개이므로 ${polyName(sides)}입니다.`,
  );
}

/** **2-6-1 2단 — 변과 꼭짓점의 «합»에서 이름으로.** 둘이 같다는 것을 알아야 반으로 나눈다. */
function tier261Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 3, 10);
  return make(
    unit,
    intBetween(rng, 0, 1) === 0
      ? `어떤 다각형의 변의 수와 꼭짓점의 수를 더하면 ${n(sides * 2)}입니다. ` +
          `이 다각형의 이름을 쓰시오.`
      : `변의 수와 꼭짓점의 수의 합이 ${n(sides * 2)}인 다각형이 있습니다. ` +
          `이 다각형을 무엇이라고 하는가?`,
    polyName(sides),
    `다각형은 변의 수와 꼭짓점의 수가 같으므로 ` +
      `${expr(`${sides * 2}\\div2=${sides}`)} 입니다. 변이 ${n(sides)}개이므로 ` +
      `${polyName(sides)}입니다.`,
  );
}

/** **2-6-1 3단 — 조건이 서로 다른 두 다각형.** 하나는 변으로, 하나는 꼭짓점으로 준다. */
function tier261Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const a = intBetween(rng, 5, 9);
  const b = intBetween(rng, 5, 9);
  return make(
    unit,
    `다각형 ㉠은 변이 ${n(a)}개이고, 다각형 ㉡은 꼭짓점이 ${n(b)}개입니다. ` +
      `두 다각형의 꼭짓점의 수의 합은 몇 개인가?`,
    `${n(a + b)}개`,
    `㉠은 변이 ${n(a)}개이므로 꼭짓점도 ${n(a)}개입니다. ㉡의 꼭짓점은 ${n(b)}개입니다. ` +
      `${expr(`${a}+${b}=${a + b}`)} 이므로 ${n(a + b)}개입니다.`,
  );
}

/**
 * **2-6-1 4단 — 두 조건을 엮어 이름을 찾는다.**
 *
 * ㉡의 변을 $\square$ 로 두면 `□ + (□ + 차) = 합` 이다.
 *
 * ⚠️ **「차가 짝수라야 $\square$ 가 자연수」는 틀린 말이다.** 작은 쪽을 먼저 뽑고 합을
 * 유도하므로 `합 − 차 = 작은 쪽 × 2` 라 **차의 홀짝은 아무것도 안 바꾼다.** 2-4-4 4단에
 * 똑같이 틀린 주석을 적었다가 변이가 **초록으로** 짚어 줬고, 여기도 같았다. 짝수만 쓰는
 * 까닭은 해설의 `□×2 = 합 − 차` 가 눈에 익은 꼴로 남게 하려는 것뿐이다.
 */
function tier261Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ **둘 다 변이 $3$개 이상**이라야 다각형이고, 큰 쪽이 **$12$각형을 넘으면 던진다**
  // (`sino` 표가 십이까지다). 합·차에서 유도하면 그 두 자리가 다 샌다 —
  // **작은 쪽과 차를 먼저 뽑고 합을 유도**한다(D-66 ⒂).
  const small = intBetween(rng, 3, 6);
  const gap = intBetween(rng, 1, 2) * 2;
  const big = small + gap;
  return make(
    unit,
    `다각형 ㉠은 다각형 ㉡보다 변이 ${n(gap)}개 많고, 두 다각형의 변의 수의 합은 ` +
      `${n(small + big)}개입니다. ㉠의 이름을 쓰시오.`,
    polyName(big),
    `㉡의 변의 수를 ${expr("\\square")}라고 하면 ㉠은 ${expr(`\\square+${gap}`)} 이므로 ` +
      `${expr(`\\square+(\\square+${gap})=${small + big}`)} 입니다. ` +
      `${expr(`\\square\\times2=${small + big}-${gap}=${small * 2}`)} 이므로 ㉡은 ` +
      `${n(small)}개, ㉠은 ${expr(`${small}+${gap}=${big}`)} 개입니다. 따라서 ${polyName(big)}입니다.`,
  );
}

/**
 * **2-6-2 1단 — 합과 한 변에서 «변의 수»로.**
 *
 * 표준이 「한 변 → 합」과 「합 → 한 변」 **양방향**을 이미 쓴다. 남은 세 번째 방향이 이것이다.
 */
function tier262Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 5, 10);
  const side = intBetween(rng, 3, 9);
  return make(
    unit,
    `어떤 정다각형의 모든 변의 길이의 합이 ${cm(side * sides)}이고 한 변이 ${cm(side)}입니다. ` +
      `이 정다각형의 이름을 쓰시오.`,
    polyName(sides, true),
    `정다각형은 모든 변의 길이가 같으므로 변의 수는 ` +
      `${expr(`${side * sides}\\div${side}=${sides}`)} 개입니다. ` +
      `따라서 ${polyName(sides, true)}입니다.`,
  );
}

/** **2-6-2 2단 — 이름을 숨기고 성질로 준다.** 표준은 이름을 그대로 준다. */
/** 그릴 수 있는 정n각형. **엔진에 `decagon` 이 없다**(실측: pentagon~nonagon 만). */
const REGULAR_SHAPES: Record<number, string> = {
  5: "pentagon",
  6: "hexagon",
  7: "heptagon",
  8: "octagon",
  9: "nonagon",
};

function tier262Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  // ⚠️ 그림을 붙이는 갈래라 **그릴 수 있는 변 수만** 뽑는다. 씨앗마다 그림이 있다 없다
  // 하면 지면이 들쭉날쭉하고, 「못 그리면 빼기」는 그 사실을 조용히 덮는다.
  const sides = intBetween(rng, 5, 9);
  const side = intBetween(rng, 3, 9);
  return make(
    unit,
    `변의 길이가 모두 같고 각의 크기도 모두 같은 다각형이 있습니다. 변이 ${n(sides)}개이고 ` +
      `한 변이 ${cm(side)}일 때, 이 도형의 이름과 모든 변의 길이의 합을 각각 구하시오.`,
    `${polyName(sides, true)}, ${cm(side * sides)}`,
    `변의 길이가 모두 같고 각의 크기도 모두 같은 다각형은 정다각형이고, 변이 ${n(sides)}개이므로 ` +
      `${polyName(sides, true)}입니다. ${expr(`${side}\\times${sides}=${side * sides}`)} 이므로 ` +
      `${cm(side * sides)}입니다.`,
    // 변의 수도 한 변의 길이도 **발문이 이미 말한다** — 그림이 답을 보여 주지 않는다.
    // (이름과 합이 답인데 둘 다 그림에서 «바로» 읽히지 않는다.)
    fig("markedShape", {
      shape: REGULAR_SHAPES[sides]!,
      sides: [`${side} cm`, ...Array<null>(sides - 1).fill(null)],
    }),
  );
}

/** **2-6-2 3단 — 모든 변의 합이 «같은» 다른 정다각형.** 중간값은 그 합이다. */
function tier262Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  // 두 변의 수가 달라야 「다른 정다각형」이고, 합이 나누어떨어져야 한 변이 자연수다.
  const from = pick(rng, [5, 6, 8, 10]);
  const to = pick(
    rng,
    [3, 4, 5, 6].filter((v) => v !== from),
  );
  const side = intBetween(rng, 2, 5) * to;
  const total = side * from;
  return make(
    unit,
    `한 변이 ${cm(side)}인 ${polyName(from, true)}이 있습니다. 이 도형과 모든 변의 길이의 ` +
      `합이 같은 ${polyName(to, true)}의 한 변은 몇 cm인가?`,
    cm(total / to),
    `${polyName(from, true)}의 모든 변의 길이의 합은 ` +
      `${expr(`${side}\\times${from}=${total}`)} 입니다. ` +
      `${polyName(to, true)}은 변이 ${n(to)}개이므로 ` +
      `${expr(`${total}\\div${to}=${total / to}`)} 입니다.`,
  );
}

/**
 * **2-6-2 4단 — 정삼각형을 거쳐 정다각형의 이름까지.**
 *
 * 세 단계다: 정삼각형의 세 변의 합 → 그 한 변 → 그보다 $\square$ 긴 한 변 → 변의 수.
 */
function tier262Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const triSide = intBetween(rng, 3, 8);
  const more = intBetween(rng, 1, 4);
  const side = triSide + more;
  const sides = intBetween(rng, 5, 10);
  return make(
    unit,
    `세 변의 길이의 합이 ${cm(triSide * 3)}인 정삼각형이 있습니다. 어떤 정다각형의 한 변은 ` +
      `이 정삼각형의 한 변보다 ${cm(more)} 길고, 그 정다각형의 모든 변의 길이의 합은 ` +
      `${cm(side * sides)}입니다. 이 정다각형의 이름을 쓰시오.`,
    polyName(sides, true),
    `정삼각형의 한 변은 ${expr(`${triSide * 3}\\div3=${triSide}`)} 이므로 정다각형의 한 변은 ` +
      `${expr(`${triSide}+${more}=${side}`)} 입니다. 변의 수는 ` +
      `${expr(`${side * sides}\\div${side}=${sides}`)} 개이므로 ${polyName(sides, true)}입니다.`,
  );
}

/**
 * **2-6-3 1단 — 한 꼭짓점의 대각선 수에서 되짚는다.** 표준은 「이름 → 개수」다.
 *
 * 풀이 다섯뿐이라 묻는 것을 **이름 / 꼭짓점 수** 둘로 갈라 변형을 낸다. 수를 억지로
 * 넓히지 않는 까닭은 나중에 그림을 얹을 때 ② 가 그리는 정n각형이 $4$~$8$각형이기 때문이다.
 */
function tier263Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = pick(rng, DIAGONALS);
  const asksName = intBetween(rng, 0, 1) === 0;
  const why =
    `한 꼭짓점에서는 자기 자신과 이웃한 두 꼭짓점에 대각선을 그을 수 없으므로 ` +
    `꼭짓점의 수는 ${expr(`${d.each}+3=${d.sides}`)} 개입니다.`;
  return make(
    unit,
    `어떤 다각형의 한 꼭짓점에서 그을 수 있는 대각선이 ${n(d.each)}개입니다. ` +
      (asksName
        ? `이 다각형의 이름을 쓰시오.`
        : `이 다각형의 꼭짓점은 몇 개인가?`),
    asksName ? polyName(d.sides) : `${n(d.sides)}개`,
    asksName ? `${why} 따라서 ${polyName(d.sides)}입니다.` : why,
  );
}

/** **2-6-3 2단 — 두 다각형의 «차».** 각각을 구하고 견준다. */
function tier263Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const big = pick(
    rng,
    DIAGONALS.filter((d) => d.sides >= 6),
  );
  const small = pick(
    rng,
    DIAGONALS.filter((d) => d.sides < big.sides),
  );
  return make(
    unit,
    `${polyName(big.sides)}의 한 꼭짓점에서 그을 수 있는 대각선은 ` +
      `${polyName(small.sides)}보다 몇 개 더 많은가?`,
    `${n(big.each - small.each)}개`,
    `한 꼭짓점에서 그을 수 있는 대각선은 ${polyName(big.sides)}이 ` +
      `${expr(`${big.sides}-3=${big.each}`)} 개, ${polyName(small.sides)}이 ` +
      `${expr(`${small.sides}-3=${small.each}`)} 개입니다. ` +
      `${expr(`${big.each}-${small.each}=${big.each - small.each}`)} 이므로 ` +
      `${n(big.each - small.each)}개 더 많습니다.`,
  );
}

/** **2-6-3 3단 — 한 꼭짓점에서 전체로.** 중간값은 꼭짓점의 수다. */
function tier263Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = pick(rng, DIAGONALS);
  const withSides = intBetween(rng, 0, 1) === 0;
  const count =
    `꼭짓점의 수는 ${expr(`${d.each}+3=${d.sides}`)} 개입니다. 꼭짓점마다 ` +
    `${n(d.each)}개씩 그을 수 있는데 대각선을 두 번씩 세었으므로 ` +
    `${expr(`${d.sides}\\times${d.each}\\div2=${d.total}`)} 입니다.`;
  return make(
    unit,
    `어떤 다각형의 한 꼭짓점에서 그을 수 있는 대각선이 ${n(d.each)}개입니다. ` +
      (withSides
        ? `이 다각형의 변의 수와 대각선의 수를 더하면 얼마인가?`
        : `이 다각형에 그을 수 있는 대각선은 모두 몇 개인가?`),
    withSides ? `${n(d.sides + d.total)}개` : `${n(d.total)}개`,
    withSides
      ? `${count} 변은 ${n(d.sides)}개이므로 ` +
          `${expr(`${d.sides}+${d.total}=${d.sides + d.total}`)} 입니다.`
      : count,
  );
}

/**
 * **2-6-3 4단 — 전체 대각선 수에서 도형을 찾아 그 둘레까지.**
 *
 * $n(n-3)/2$ 는 $4$~$8$각형에서 $2·5·9·14·20$ 으로 **서로 달라** 도형이 하나로 정해진다.
 * 초4 는 식을 못 푸니 **대입해 찾는 수밖에 없고**, 그래서 해설이 표를 세워 그 길을 보여 준다.
 *
 * ⚠️ **첫 판은 「전체 → 한 꼭짓점」이라 3단의 정확한 역이었다.** 같은 다섯 값 풀에서 뽑으니
 * 같은 씨앗에서 **같은 수로 나란히** 섰다(실측: 씨앗 20260823 에서 둘 다 $5$개·$2$개).
 * 한 시험지에 3·4단이 같이 실리면 티가 난다 — 그래서 4단은 **변의 수를 거쳐 둘레로** 간다.
 * 되짚기는 그대로 있고 단계가 하나 더 붙는다.
 */
function tier263Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const d = pick(
    rng,
    DIAGONALS.filter((x) => x.sides >= 5),
  );
  const side = intBetween(rng, 3, 9);
  const table = DIAGONALS.filter((x) => x.sides <= d.sides)
    .map((x) => `${polyName(x.sides)} ${n(x.total)}개`)
    .join(", ");
  return make(
    unit,
    `어떤 정다각형에 그을 수 있는 대각선이 모두 ${n(d.total)}개입니다. ` +
      `이 정다각형의 한 변이 ${cm(side)}일 때 모든 변의 길이의 합은 몇 cm인가?`,
    cm(side * d.sides),
    `대각선의 수를 차례로 세어 보면 ${table} 입니다. ` +
      `${n(d.total)}개인 것은 ${polyName(d.sides)}이므로 변이 ${n(d.sides)}개입니다. ` +
      `${expr(`${side}\\times${d.sides}=${side * d.sides}`)} 이므로 ${cm(side * d.sides)}입니다.`,
  );
}

/* ──────── 2-6-4 모양 만들기와 채우기 (2026-08-24, 조각을 «바꿔 센다») ────────
 *
 * **이 소단원의 셈할 수 있는 축은 「조각 한 개가 다른 조각 몇 개와 같은가」이다.**
 * 교과서 모양 조각은 한 변의 길이가 같아서 정삼각형을 자로 삼으면 마름모는 둘,
 * 사다리꼴은 셋, 정육각형은 여섯이다. 이 관계를 **이어 붙이고 되짚으면** 사다리가 선다.
 *
 * ⚠️ 🔴 **쓰는 관계는 발문이 준다.** 「사다리꼴」은 일반 사다리꼴도 가리키므로, 그림 없이
 * 「사다리꼴 조각은 정삼각형 몇 개인가」만 물으면 **답이 하나로 안 정해진다.** 그래서
 * 발문에 관계를 적고 **거기서 파생되는 것**을 묻는다(발문 자족, `elemStemSelfContained`).
 * 1단조차 그렇다 — 관계를 «상식»으로 두면 그 갈래는 학생이 풀 수 없는 문항이 된다.
 *
 * ⚠️ **그림을 안 붙인다 — `tiling`(⑥)이 이 소단원용으로 서 있는데도 그렇다.**
 * 엔진이 그리는 것은 조각과 목표의 **한 변의 비**다. 좌표로 확인했다(`_shape_points`):
 * `eqTri` 는 상자 크기가 곧 한 변이고 `hexagon` 은 한 변이 상자의 절반이라 정삼각형↔
 * 정육각형 짝은 기본값 $1:2$ 로 **제대로** 그려진다. 그런데 `diamond` 는 정사각형을
 * 돌린 마름모($60^\circ$ 가 아니다)이고 `trap` 은 반육각형 사다리꼴이 아니다 —
 * **모양 조각을 배반한다.** 그러면 그릴 수 있는 짝이 정삼각형↔정육각형 하나뿐이고,
 * 그 짝의 답은 늘 여섯이라 **그림 붙은 문항의 정답이 하나**가 된다(09 §2.2 ⑥ ·
 * R9-c). 2-4-2 에서 「그림이 있으면 답은 평행선 $100\%$」로 걸린 그 자리다.
 * 표준 경로의 「한 변이 몇 배」 갈래는 비가 곧 값이라 `tiling` 이 맞는다 — 그쪽에 붙였다.
 *
 * ⚠️ **2-6-1~3 과 겹치지 않는다.** 저쪽은 변·꼭짓점·대각선의 **수**를 세고 여기는
 * 조각의 **개수**를 바꿔 센다. 정다각형의 한 각은 초4 범위 밖이라 여기서도 안 쓴다.
 */

/** 모양 조각 — 한 변의 길이가 같을 때 **정삼각형 조각 몇 개인가**. 교과서 조각 세트. */
const PIECE_TRIS: readonly { name: string; tris: number }[] = [
  { name: "마름모", tris: 2 },
  { name: "사다리꼴", tris: 3 },
  { name: polyName(6, true), tris: 6 },
];

/** 「$3$개로 빈틈없이 채울 수 있습니다」 — 관계 한 줄. 네 갈래가 이 한 곳을 쓴다. */
function pieceRule(name: string, tris: number): string {
  return (
    `${name} 모양 조각 한 개는 ${polyName(3, true)} 모양 조각 ${n(tris)}개로 ` +
    `빈틈없이 채울 수 있습니다.`
  );
}

/**
 * **2-6-4 1단 — 관계를 한 번 쓴다.** 곱셈 하나로 끝난다(D-72 ⑶).
 *
 * 조각 종류가 셋이라 답이 씨앗마다 갈린다. 관계는 발문이 주므로 학생이 할 일은
 * 「$k$ 개면 $k$ 배」 하나다.
 */
function tier264Calc(unit: UnitSeed, rng: Rng): ElemProblem {
  const p = pick(rng, [...PIECE_TRIS]);
  const k = intBetween(rng, 2, 9);
  return make(
    unit,
    `모양 조각으로 모양을 빈틈없이 채웁니다. ${pieceRule(p.name, p.tris)} ` +
      `${p.name} 모양 조각 ${n(k)}개는 ${polyName(3, true)} 모양 조각 몇 개로 ` +
      `채울 수 있는가?`,
    `${n(p.tris * k)}개`,
    `${p.name} 모양 조각 한 개가 ${polyName(3, true)} 모양 조각 ${n(p.tris)}개이므로 ` +
      `${n(k)}개이면 ${expr(`${p.tris}\\times${k}=${p.tris * k}`)} 이고 ` +
      `${n(p.tris * k)}개입니다.`,
  );
}

/**
 * **2-6-4 2단 — 주어지지 않은 관계를 스스로 만든다.**
 *
 * 🔴 **1단과 갈리는 자리는 «관계를 주는가»다.** 1단은 쓸 관계를 발문이 그대로 준다.
 * 여기서 주는 것은 **정삼각형을 자로 삼은** 두 관계뿐이고, 묻는 것은 그 둘 **사이의**
 * 관계다 — 학생이 먼저 세워야 하는 나눗셈이 발문 어디에도 없다. `dump-elem-tiers`
 * 머리말 ㉡ 이 말하는 「식을 그냥 주면 1단이다」가 그 잣대다.
 *
 * ⚠️ 큰 쪽을 늘 정육각형으로 둔다 — 마름모(둘)와 사다리꼴(셋)은 서로 나누어떨어지지
 * 않는다. 뽑고 거르지 않고 **못 뽑을 자리를 안 만든다**.
 */
function tier264Basic(unit: UnitSeed, rng: Rng): ElemProblem {
  const whole = PIECE_TRIS[2]!;
  const part = pick(rng, [PIECE_TRIS[0]!, PIECE_TRIS[1]!]);
  const times = whole.tris / part.tris;
  const k = intBetween(rng, 2, 9);
  const given = `${pieceRule(whole.name, whole.tris)} 또 ${pieceRule(part.name, part.tris)}`;
  const why =
    `${whole.name} 모양 조각 한 개는 ${polyName(3, true)} 모양 조각 ` +
    `${n(whole.tris)}개와 같고, ${part.name} 모양 조각 한 개는 ${polyName(3, true)} ` +
    `모양 조각 ${n(part.tris)}개와 같습니다. 그러므로 ${whole.name} 모양 조각 한 개는 ` +
    `${part.name} 모양 조각 ${expr(`${whole.tris}\\div${part.tris}=${times}`)} 개로 ` +
    `채울 수 있습니다.`;
  if (pick(rng, [true, false])) {
    return make(
      unit,
      `${given} ${whole.name} 모양 조각 ${n(k)}개는 ${part.name} 모양 조각 몇 개로 ` +
        `빈틈없이 채울 수 있는가?`,
      `${n(times * k)}개`,
      `${why} ${n(k)}개이면 ${expr(`${times}\\times${k}=${times * k}`)} 이고 ` +
        `${n(times * k)}개입니다.`,
    );
  }
  return make(
    unit,
    `${given} ${part.name} 모양 조각 몇 개를 모으면 ${whole.name} 모양 조각 ${n(k)}개를 ` +
      `빈틈없이 채울 수 있는가?`,
    `${n(times * k)}개`,
    `${why} ${whole.name} 모양 조각이 ${n(k)}개이므로 ` +
      `${expr(`${times}\\times${k}=${times * k}`)} 이고 ${n(times * k)}개를 모아야 합니다.`,
  );
}

/**
 * **2-6-4 3단 — 두 단계.** 두 종류를 각각 바꾼 뒤 합친다.
 *
 * 1·2단은 조각 한 종류만 본다. 여기서는 두 종류를 각각 정삼각형으로 옮겨 놓고 더해야
 * 하므로 중간값이 둘 생긴다.
 */
function tier264Apply(unit: UnitSeed, rng: Rng): ElemProblem {
  const [first, second] = pick(rng, [
    [PIECE_TRIS[2]!, PIECE_TRIS[0]!],
    [PIECE_TRIS[2]!, PIECE_TRIS[1]!],
    [PIECE_TRIS[1]!, PIECE_TRIS[0]!],
  ]);
  const a = intBetween(rng, 2, 7);
  const b = intBetween(rng, 2, 7);
  const left = first.tris * a;
  const right = second.tris * b;
  return make(
    unit,
    `${pieceRule(first.name, first.tris)} 또 ${pieceRule(second.name, second.tris)} ` +
      `${first.name} 모양 조각 ${n(a)}개와 ${second.name} 모양 조각 ${n(b)}개를 모두 ` +
      `${polyName(3, true)} 모양 조각으로 바꾸면 ${polyName(3, true)} 모양 조각은 ` +
      `모두 몇 개인가?`,
    `${n(left + right)}개`,
    `${first.name} 모양 조각 ${n(a)}개는 ${expr(`${first.tris}\\times${a}=${left}`)} ` +
      `개이고, ${second.name} 모양 조각 ${n(b)}개는 ` +
      `${expr(`${second.tris}\\times${b}=${right}`)} 개입니다. ` +
      `${expr(`${left}+${right}=${left + right}`)} 이므로 ${n(left + right)}개입니다.`,
  );
}

/**
 * **2-6-4 4단 — 채운 모양은 그대로 두고 «조각만» 바꾼다.**
 *
 * 채운 모양이 무엇인지는 끝까지 안 나온다. 학생이 붙잡을 것은 **정삼각형으로 센 넓이가
 * 바뀌지 않는다**는 것뿐이고, 그것을 중간값으로 삼아 한 번 곱하고 한 번 나눠야 한다.
 *
 * ⚠️ **D-66 ⒂ 대로 답부터 골랐다.** 주어지는 개수를 먼저 뽑으면 정삼각형 수가 상대
 * 조각으로 **나누어떨어지지 않는 자리**가 생긴다($5$ 마름모 $=10$ 정삼각형, 사다리꼴로는
 * 못 채운다). 답 쪽을 $q\times(\text{주는 쪽 조각})$ 로 만들면 그 자리가 아예 안 생긴다 —
 * 뽑고 거르지 않는다(`trapSides` 와 같은 원칙).
 */
function tier264Deep(unit: UnitSeed, rng: Rng): ElemProblem {
  const [from, to] = pick(rng, [
    [PIECE_TRIS[0]!, PIECE_TRIS[1]!],
    [PIECE_TRIS[1]!, PIECE_TRIS[0]!],
    [PIECE_TRIS[1]!, PIECE_TRIS[2]!],
    [PIECE_TRIS[0]!, PIECE_TRIS[2]!],
  ]);
  const q = intBetween(rng, 2, 5);
  const have = q * to.tris;
  const want = q * from.tris;
  const tris = have * from.tris;
  return make(
    unit,
    `${from.name} 모양 조각 ${n(have)}개로 빈틈없이 채운 모양이 있습니다. ` +
      `${pieceRule(from.name, from.tris)} 또 ${pieceRule(to.name, to.tris)} ` +
      `같은 모양을 ${to.name} 모양 조각만으로 빈틈없이 채우려면 ${to.name} 모양 조각은 ` +
      `몇 개 필요한가?`,
    `${n(want)}개`,
    `${from.name} 모양 조각 ${n(have)}개는 ${polyName(3, true)} 모양 조각 ` +
      `${expr(`${from.tris}\\times${have}=${tris}`)} 개와 같습니다. 채운 모양이 같으므로 ` +
      `${to.name} 모양 조각으로 채워도 ${polyName(3, true)} 모양 조각 ${n(tris)}개와 ` +
      `같습니다. ${to.name} 모양 조각 한 개가 ${polyName(3, true)} 모양 조각 ` +
      `${n(to.tris)}개이므로 ${expr(`${tris}\\div${to.tris}=${want}`)} 이고 ` +
      `${n(want)}개 필요합니다.`,
  );
}

/* ────────── 2-6 난이도 확대 — 심화중·심화상 (D-113 · D-115, 물결 2) ──────────
 *
 * 굳힘 축은 **자연수**다 — 「변의 수 = 꼭짓점의 수이므로 그 합은 짝수」·「정다각형은
 * 둘레가 한 변으로 **나누어떨어져야** 한다」·「조각은 개수가 자연수라야 남김없이 바뀐다」.
 * 이 축은 2-3(자릿값)·2-1(진분수 조건)과도, 파일럿 1-3(곱의 자릿수·나머지)과도 겹치지 않는다.
 *
 * ⚠️ **정다각형의 «한 각의 크기»는 여기서도 안 쓴다** — 초4 범위 밖이다(위 4단 머리말).
 * ⚠️ **2-6-3(대각선)은 중·상 둘 다 비운다.** 심화하가 이미 대각선 표를 **만들어
 *    견주므로**(해설이 「사각형 $2$개, 오각형 $5$개 …」를 적는다) 그 위에 같은 모양을
 *    얹으면 심화하와 같은 일이고, 사다리가 뒤집힌다. 토대 §2.3 「뒤집지 못한 것」과 같다.
 * ⚠️ **2-6-1·2-6-2 는 심화상을 비운다.** 둘 다 후보가 **둘**뿐이라(창 안의 정수 둘)
 *    「만들어 견주기」가 아니라 「둘 중 고르기」이고, 그건 심화중의 정의 그 자체다.
 *    후보를 넷으로 늘리려면 창을 넓히는 수밖에 없는데 그건 축이 아니라 **규모**다.
 */

/**
 * **2-6-2 심화중의 밭** — 「모든 변의 길이의 합」만 주고 한 변을 **창으로만** 주면
 * 후보가 둘이고, 「변의 수가 자연수라야 한다」(= 나누어떨어져야 한다)가 하나를 떨어뜨린다.
 *
 * ⚠️ 떨어지는 쪽은 **아예 나누어떨어지지 않아야** 한다 — 몫이 나오는데 그 몫이 십이를
 *    넘는 경우로 떨어뜨리면, 학생이 「그런 정다각형도 있다」고 볼 수 있어 답이 둘이 된다.
 */
const REGULAR_SIDE_FIELD: {
  total: number;
  lo: number;
  side: number;
  sides: number;
}[] = (() => {
  const out: { total: number; lo: number; side: number; sides: number }[] = [];
  for (let sides = 5; sides <= 12; sides += 1) {
    for (let side = 3; side <= 9; side += 1) {
      const total = sides * side;
      for (const lo of [side - 2, side - 1]) {
        if (lo < 2) continue;
        const cands = [lo + 1, lo + 2];
        const div = cands.filter((v) => total % v === 0);
        if (div.length !== 1 || div[0] !== side) continue;
        out.push({ total, lo, side, sides });
      }
    }
  }
  return out;
})();

/**
 * **2-6-4 심화중의 밭** — 조각 `P` 로만 채운 모양을 정삼각형으로 바꾼 개수가 **창으로만**
 * 주어지면 후보가 둘(`P` 의 배수 둘)이고, 「조각 `Q` 로 남김없이 바뀌려면 `Q` 개씩
 * 묶여야 한다」가 하나를 떨어뜨린다.
 */
const TILE_WINDOW_FIELD: {
  from: number;
  to: number;
  tris: number;
  lo: number;
  hi: number;
  other: number;
}[] = (() => {
  const out: {
    from: number;
    to: number;
    tris: number;
    lo: number;
    hi: number;
    other: number;
  }[] = [];
  for (let from = 0; from < PIECE_TRIS.length; from += 1) {
    for (let to = 0; to < PIECE_TRIS.length; to += 1) {
      const p = PIECE_TRIS[from]!.tris;
      const q = PIECE_TRIS[to]!.tris;
      if (p === q) continue;
      for (let tris = 8; tris <= 48; tris += 1) {
        if (tris % p !== 0 || tris % q !== 0) continue;
        for (let lo = Math.max(1, tris - p); lo < tris; lo += 1) {
          for (let hi = tris + 1; hi <= tris + p + 2; hi += 1) {
            const inside: number[] = [];
            for (let v = lo + 1; v < hi; v += 1) inside.push(v);
            const mp = inside.filter((v) => v % p === 0);
            if (mp.length !== 2) continue;
            const mq = mp.filter((v) => v % q === 0);
            if (mq.length !== 1 || mq[0] !== tris) continue;
            // 답(바꾼 조각 수)이 지면에 그대로 있으면 다른 축의 결함이 된다 —
            // 지면에 나가는 수는 관계 둘(`p`·`q`)과 창의 두 끝이다.
            const answer = tris / q;
            if (answer === p || answer === q || answer === lo || answer === hi)
              continue;
            out.push({
              from,
              to,
              tris,
              lo,
              hi,
              other: mp.find((v) => v !== tris)!,
            });
          }
        }
      }
    }
  }
  return out;
})();

/**
 * **2-6-4 심화상의 밭** — 정삼각형 `N` 개를 마름모($2$)와 사다리꼴($3$)로 **둘 다 쓰며**
 * 남김없이 바꾸는 방법이 셋 이상이고, 「조각 수가 가장 적은」 방법이 **하나**인 자리.
 * 방법을 하나씩 **실제로 만들어 조각 수를 세어 견주어야** 정해진다.
 */
const TILE_MIN_FIELD: { tris: number; pairs: { a: number; b: number }[] }[] =
  (() => {
    const out: { tris: number; pairs: { a: number; b: number }[] }[] = [];
    for (let tris = 13; tris <= 39; tris += 1) {
      const pairs: { a: number; b: number }[] = [];
      for (let b = 1; 3 * b < tris; b += 1) {
        const rest = tris - 3 * b;
        if (rest % 2 === 0) pairs.push({ a: rest / 2, b });
      }
      if (pairs.length < 3) continue;
      const totals = pairs.map((x) => x.a + x.b);
      const min = Math.min(...totals);
      // ⚠️ **이 줄은 지금 아무것도 안 거른다** — 조각 수는 `a+b = (N-b)/2` 라 `b` 마다
      //    늘 다르므로 최소는 **구조적으로** 하나다. 변이 하네스가 「산출물이 그대로다」로
      //    그것을 짚어 줬다. 지우지 않는 까닭은 «하나가 남는다»가 심화상의 정의라서
      //    조각 값이 바뀌면(2·3 이 아닌 짝) 그때 물어야 하기 때문이다.
      if (totals.filter((t) => t === min).length !== 1) continue;
      out.push({ tris, pairs });
    }
    return out;
  })();

/**
 * **2-6-1 5단 심화중 — 「합이 짝수라야 한다」가 마디를 굳힌다.**
 *
 * 변의 수와 꼭짓점의 수의 합을 **창으로만** 주면 후보가 둘이고, 「다각형은 변의 수와
 * 꼭짓점의 수가 같으므로 그 합은 변의 수의 두 배 = 짝수」라는 이 소단원의 성질이 홀수인
 * 쪽을 떨어뜨린다. 심화하(`\square+(\square+차)=합`)와 산술이 다르다.
 */
function tier261Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier261MidRaw(unit, rng));
}

function tier261MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 4, 9);
  const gap = intBetween(rng, 1, 3);
  const lo = sides * 2 - intBetween(rng, 1, 2);
  const sum = sides * 2;
  const odd = [lo + 1, lo + 2].find((v) => v % 2 === 1)!;
  return makeDeep(
    unit,
    `다각형 ㉠의 변의 수와 꼭짓점의 수의 합은 ${josaNum(lo, "보다", "보다")} 크고 ` +
      `${josaNum(lo + 3, "보다", "보다")} 작습니다. 다각형 ㉡은 ㉠보다 변이 ` +
      `${n(gap)}개 많습니다. ㉡의 이름을 쓰시오.`,
    polyName(sides + gap),
    [
      `${josaNum(lo, "보다", "보다")} 크고 ${josaNum(lo + 3, "보다", "보다")} 작은 수는 ` +
        `${josaNum(lo + 1, "과", "와")} ${josaNum(lo + 2, "입니다", "입니다")}.`,
      `다각형은 변의 수와 꼭짓점의 수가 같으므로 그 합은 변의 수의 ${n(2)}배, 곧 ` +
        `짝수입니다. ${josaNum(odd, "은", "는")} 홀수라 될 수 없으므로 합은 ` +
        `${josaNum(sum, "이고", "이고")} ㉠의 변은 ${expr(`${sum}\\div2=${sides}`)} 개입니다.`,
      `㉡은 ㉠보다 변이 ${n(gap)}개 많으므로 ${expr(`${sides}+${gap}=${sides + gap}`)} 개이고, ` +
        `${polyName(sides + gap)}입니다.`,
    ],
  );
}

/**
 * **2-6-2 5단 심화중 — 한 변을 창으로만 주고 「나누어떨어져야 한다」가 굳힌다.**
 * 표준 1단이 「합과 한 변 → 변의 수」인데 여기서는 **한 변조차 안 준다.**
 */
function tier262Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier262MidRaw(unit, rng));
}

function tier262MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, REGULAR_SIDE_FIELD);
  const other = [f.lo + 1, f.lo + 2].find((v) => v !== f.side)!;
  const q = Math.floor(f.total / other);
  return makeDeep(
    unit,
    `어떤 정다각형의 모든 변의 길이의 합은 ${cm(f.total)}입니다. 한 변의 길이는 ` +
      `cm 단위의 자연수이고 ${cm(f.lo)}보다 길고 ${cm(f.lo + 3)}보다 짧습니다. ` +
      `이 정다각형의 이름을 쓰시오.`,
    polyName(f.sides, true),
    [
      `한 변이 될 수 있는 수는 ${josaNum(f.lo + 1, "과", "와")} ` +
        `${josaNum(f.lo + 2, "입니다", "입니다")}.`,
      `한 변이 ${cm(other)}이면 ${expr(`${other}\\times${q}=${other * q}`)} 이고 ` +
        `${expr(`${other}\\times${q + 1}=${other * (q + 1)}`)} ` +
        `${tail(other * (q + 1), "이라", "라")} ${josaNum(f.total, "이", "가")} ` +
        `나누어떨어지지 않습니다. 변의 수는 자연수라야 하므로 될 수 없습니다.`,
      `한 변이 ${cm(f.side)}이면 ${expr(`${f.total}\\div${f.side}=${f.sides}`)} 이므로 ` +
        `변이 ${n(f.sides)}개이고 ${polyName(f.sides, true)}입니다.`,
    ],
  );
}

/**
 * **2-6-4 5단 심화중 — 정삼각형 개수를 창으로만 준다.**
 * 「조각 한 개가 정삼각형 몇 개인가」를 두 번 써서 후보를 둘로 좁히고, 「다른 조각으로
 * 남김없이 바뀌려면 그 수로 나누어떨어져야 한다」가 하나를 떨어뜨린다.
 */
function tier264Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier264MidRaw(unit, rng));
}

function tier264MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, TILE_WINDOW_FIELD);
  const from = PIECE_TRIS[f.from]!;
  const to = PIECE_TRIS[f.to]!;
  const answer = f.tris / to.tris;
  return makeDeep(
    unit,
    `${pieceRule(from.name, from.tris)} 또 ${pieceRule(to.name, to.tris)} ` +
      `${from.name} 모양 조각 몇 개를 ${polyName(3, true)} 모양 조각으로 남김없이 ` +
      `바꾸었더니 ${josaNum(f.lo, "보다", "보다")} 많고 ${josaNum(f.hi, "보다", "보다")} ` +
      `적었습니다. 같은 수의 ${polyName(3, true)} 모양 조각을 ${to.name} 모양 조각으로 ` +
      `남김없이 바꿀 수 있을 때 ${to.name} 모양 조각은 몇 개인가?`,
    `${n(answer)}개`,
    [
      `${from.name} 모양 조각은 한 개가 ${polyName(3, true)} 모양 조각 ${n(from.tris)}개` +
        `이므로 바꾼 수는 ${n(from.tris)}의 배수입니다. ${josaNum(f.lo, "보다", "보다")} ` +
        `많고 ${josaNum(f.hi, "보다", "보다")} 적은 수 중 그런 것은 ` +
        `${josaNum(Math.min(f.tris, f.other), "과", "와")} ` +
        `${josaNum(Math.max(f.tris, f.other), "입니다", "입니다")}.`,
      `${to.name} 모양 조각으로 남김없이 바꾸려면 ${roJosa(to.tris)} 나누어떨어져야 ` +
        `합니다. ${expr(`${to.tris}\\times${Math.floor(f.other / to.tris)}=${to.tris * Math.floor(f.other / to.tris)}`)} ` +
        `이고 ${expr(`${to.tris}\\times${Math.floor(f.other / to.tris) + 1}=${to.tris * (Math.floor(f.other / to.tris) + 1)}`)} ` +
        `이라 ${josaNum(f.other, "은", "는")} 나누어떨어지지 않습니다.`,
      `${expr(`${f.tris}\\div${to.tris}=${answer}`)} 이므로 ${polyName(3, true)} 모양 ` +
        `조각은 ${n(f.tris)}개이고, ${to.name} 모양 조각은 ${n(answer)}개입니다.`,
    ],
  );
}

/**
 * **2-6-4 6단 심화상 — 짝을 실제로 만들어 조각 수를 견주어야 하나가 남는다.**
 *
 * 마름모($2$)와 사다리꼴($3$)로 정삼각형 `N` 개를 남김없이 바꾸는 방법이 여럿이고,
 * 성질만으로는 어느 것인지 안 굳는다. 방법마다 **조각 수를 세어 견주어야** 하나가 남는다.
 * 후보를 발문이 주지 않고 되짚기(`2\times$마름모$+3\times$사다리꼴$=N$)가 만든다 ✓
 *
 * ⚠️ **「빈틈없이 채운다」로 묻지 않는다** — 실제 배치가 되는지는 개수 관계가 말해 주지
 *    않는다(2-6-4 머리말의 그 자리). 그래서 **«남김없이 바꾸기»**라는 개수 관계로만 닫았다.
 * ⚠️ 남은 하나가 조각 수의 **극값**이다 — 「가장 적게」가 곧 그 조건이라 구성상 그렇다.
 *    파일럿의 「극값이 아니어야 한다」는 «조건 한 줄로 집히지 않는가»를 재는 잣대였는데,
 *    여기서는 그 한 줄이 **짝을 다 만들어 세어 보아야** 쓸 수 있으므로 상으로 둔다.
 *
 * 🔴 **이 갈래에는 지름길이 있다 — 다음 사람이 다시 재라.**
 *    「사다리꼴이 정삼각형을 더 많이 먹으니 사다리꼴을 가장 많이 쓰면 조각이 가장 적다」로
 *    짝을 하나도 안 만들고 닫을 수 있다. D-115 ⑾ 의 「끝까지 계산하지 않고 걸러 내면 중」을
 *    글자 그대로 대면 **이 갈래는 중**이다. 상으로 둔 근거는 ⑾ 의 다른 반쪽 —
 *    「참은 **해설이 밟는 길**」이고, 그 지름길은 이 소단원이 가진 **성질**(조각 환산)이
 *    아니라 목적함수에 대한 **논증**이라 중의 정의(성질 한 번)에 안 맞는다는 것이다.
 *    (초3 2-1-4 가 중으로 내려간 까닭은 지름길이 «곱의 일의 자리»라는 소단원 **성질**이라서다.)
 *    ⚠️ 이 판단이 뒤집히면 2-6 은 심화상이 **하나도 없다** — 다른 셋(2-6-1·2-6-2·2-6-3)은
 *    위 머리말대로 구조적으로 못 서기 때문이다. 보고서 §「못 본 것」에 같이 적어 두었다.
 */
function tier264Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier264TopRaw(unit, rng));
}

function tier264TopRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, TILE_MIN_FIELD);
  const rhomb = PIECE_TRIS[0]!;
  const trap = PIECE_TRIS[1]!;
  const totals = f.pairs.map((x) => x.a + x.b);
  const min = Math.min(...totals);
  const best = f.pairs[totals.indexOf(min)]!;
  const list = f.pairs
    .map(
      (x) =>
        `${expr(`${rhomb.tris}\\times${x.a}+${trap.tris}\\times${x.b}=${f.tris}`)} ` +
        `(조각 ${expr(`${x.a}+${x.b}=${x.a + x.b}`)} 개)`,
    )
    .join(", ");
  return makeDeep(
    unit,
    `${pieceRule(rhomb.name, rhomb.tris)} 또 ${pieceRule(trap.name, trap.tris)} ` +
      `${polyName(3, true)} 모양 조각 ${n(f.tris)}개를 ${rhomb.name} 모양 조각과 ` +
      `${trap.name} 모양 조각으로 남김없이 바꾸려고 합니다. 두 조각을 모두 쓰면서 ` +
      `조각의 수를 가장 적게 하려면 조각은 모두 몇 개인가?`,
    `${n(min)}개`,
    [
      `${rhomb.name} 모양 조각 한 개는 ${polyName(3, true)} 모양 조각 ${n(rhomb.tris)}개, ` +
        `${trap.name} 모양 조각 한 개는 ${n(trap.tris)}개이므로 바꾸는 방법은 ${list} ` +
        `입니다.`,
      `조각의 수를 견주면 가장 적은 것은 ${n(min)}개이고, 그때 ${rhomb.name} 모양 조각은 ` +
        `${n(best.a)}개, ${trap.name} 모양 조각은 ${n(best.b)}개입니다.`,
    ],
  );
}

function poly261Name(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 3, 8);
  return make(
    unit,
    `${polyName(sides)}보다 변이 ${n(2)}개 많은 다각형의 이름을 쓰시오.`,
    polyName(sides + 2),
    `${expr(`${sides}+2=${sides + 2}`)} 이므로 ${polyName(sides + 2)}입니다.`,
  );
}

function poly261Verts(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 3, 10);
  return make(
    unit,
    `${polyName(sides)}의 꼭짓점은 몇 개인가?`,
    n(sides),
    `변의 수와 꼭짓점의 수는 같으므로 ${n(sides)}개입니다.`,
  );
}

function poly261SidesOfName(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 5, 10);
  return make(
    unit,
    `${polyName(sides)}을 한 바퀴 돌며 변을 세면 몇 개인가?`,
    n(sides),
    `${polyName(sides)}을 한 바퀴 돌면 변은 ${n(sides)}개입니다.`,
  );
}

function poly261Same(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 4, 9);
  return make(
    unit,
    `${polyName(sides)}에서 변의 수와 꼭짓점의 수는 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `다각형은 변의 수와 꼭짓점의 수가 같습니다.`,
  );
}

function poly261Sum(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 3, 10);
  return make(
    unit,
    `${polyName(sides)}의 변의 수와 꼭짓점의 수의 합은 얼마인가?`,
    n(sides * 2),
    `${expr(`${sides}+${sides}=${sides * 2}`)} 입니다.`,
  );
}

function poly261Pent(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `오각형의 변은 몇 개인가?`,
    n(5),
    `오각형의 변은 ${n(5)}개입니다.`,
  );
}

function poly262AllDiag(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 5, 8);
  const diag = (sides * (sides - 3)) / 2;
  return make(
    unit,
    `${polyName(sides)}에 그을 수 있는 대각선은 모두 몇 개인가?`,
    `${n(diag)}개`,
    `${expr(`${sides}\\times${sides - 3}\\div2=${diag}`)} 개입니다.`,
  );
}

function poly262FromVertex(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 5, 10);
  return make(
    unit,
    `${polyName(sides)}의 한 꼭짓점에서 그을 수 있는 대각선은 몇 개인가?`,
    `${n(sides - 3)}개`,
    `${expr(`${sides}-3=${sides - 3}`)} 개입니다.`,
  );
}

function poly262TriDiag(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `삼각형에 그을 수 있는 대각선은 몇 개인가?`,
    n(0),
    `삼각형에는 대각선을 그을 수 없습니다.`,
    fig("namedShapes", { items: [{ shape: "eqTri", label: "가" }] }),
  );
}

function poly262QuadDiag(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `사각형에 그을 수 있는 대각선은 모두 몇 개인가?`,
    n(2),
    `사각형의 대각선은 ${n(2)}개입니다.`,
    fig("markedShape", { shape: "rect" }),
  );
}

function poly262HexFrom(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 5, 10);
  return make(
    unit,
    `${polyName(sides)}의 한 꼭짓점에서 대각선을 모두 그으면 삼각형은 몇 개로 나뉘는가?`,
    n(sides - 2),
    `한 꼭짓점에서 대각선을 그으면 삼각형 ${n(sides - 2)}개로 나뉩니다.`,
  );
}

function poly262EqualDiag(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `직사각형의 두 대각선의 길이는 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `직사각형의 두 대각선의 길이는 같습니다.`,
    fig("markedShape", { shape: "rect" }),
  );
}

function poly263Side(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 5, 8);
  const s = intBetween(rng, 3, 12);
  return make(
    unit,
    `한 변이 ${cm(s)}인 ${polyName(sides, true)}의 다른 한 변의 길이는 몇 cm인가?`,
    cm(s),
    `정다각형은 모든 변의 길이가 같습니다.`,
  );
}

function poly263Perim(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 5, 8);
  const s = intBetween(rng, 3, 9);
  return make(
    unit,
    `한 변이 ${cm(s)}인 ${polyName(sides, true)}의 모든 변의 길이의 합은 몇 cm인가?`,
    cm(s * sides),
    `${expr(`${s}\\times${sides}=${s * sides}`)} 입니다.`,
  );
}

function poly263FromPerim(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 5, 8);
  const s = intBetween(rng, 3, 9);
  return make(
    unit,
    `모든 변의 길이의 합이 ${cm(s * sides)}인 ${polyName(sides, true)}의 한 변은 몇 cm인가?`,
    cm(s),
    `${expr(`${s * sides}\\div${sides}=${s}`)} 입니다.`,
  );
}

function poly263EqualSides(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 5, 8);
  return make(
    unit,
    `${polyName(sides, true)}의 모든 변의 길이는 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `정다각형은 모든 변의 길이가 같습니다.`,
  );
}

function poly263EqualAngles(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 5, 8);
  return make(
    unit,
    `${polyName(sides, true)}의 모든 각의 크기는 같은가? '예' 또는 '아니요'로 답하시오.`,
    "예",
    `정다각형은 모든 각의 크기가 같습니다.`,
  );
}

function poly263Name(unit: UnitSeed, rng: Rng): ElemProblem {
  const sides = intBetween(rng, 5, 8);
  return make(
    unit,
    `모든 변의 길이가 같고 모든 각의 크기가 같은, 변이 ${n(sides)}개인 다각형을 무엇이라고 하는가?`,
    polyName(sides, true),
    `모든 변의 길이가 같고 모든 각의 크기가 같은 ${polyName(sides)}은 ${polyName(sides, true)}입니다.`,
  );
}

function poly264TriFill(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 2, 6);
  return make(
    unit,
    `한 변이 ${cm(side)}인 정삼각형 모양 조각으로 한 변이 ${cm(side * 2)}인 정삼각형을 빈틈없이 채우려면 조각이 몇 개 필요한가?`,
    n(4),
    `${expr("2\\times2=4")} 개가 필요합니다.`,
    fig("tiling", {
      piece: "eqTri",
      target: "eqTri",
      pieceSide: side,
      targetSide: side * 2,
    }),
  );
}

function poly264SqFill(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 2, 5);
  return make(
    unit,
    `한 변이 ${cm(side)}인 정사각형 모양 조각으로 한 변이 ${cm(side * 3)}인 정사각형을 빈틈없이 채우려면 조각이 몇 개 필요한가?`,
    n(9),
    `${expr("3\\times3=9")} 개가 필요합니다.`,
    fig("tiling", {
      piece: "square",
      target: "square",
      pieceSide: side,
      targetSide: side * 3,
    }),
  );
}

function poly264Hex(unit: UnitSeed): ElemProblem {
  return make(
    unit,
    `그림처럼 정삼각형 모양 조각으로 정육각형을 빈틈없이 채우려면 조각이 몇 개 필요한가?`,
    n(6),
    `정육각형은 정삼각형 ${n(6)}개로 채울 수 있습니다.`,
    fig("tiling", { piece: "eqTri", target: "hexagon" }),
  );
}

function poly264Rhombus(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 6);
  return make(
    unit,
    `마름모 모양 조각 한 개는 정삼각형 모양 조각 ${n(2)}개와 같습니다. 마름모 모양 조각 ${n(k)}개는 정삼각형 모양 조각 몇 개인가?`,
    n(k * 2),
    `${expr(`${k}\\times2=${k * 2}`)} 개입니다.`,
  );
}

function poly264Trap(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 5);
  return make(
    unit,
    `사다리꼴 모양 조각 한 개는 정삼각형 모양 조각 ${n(3)}개와 같습니다. 사다리꼴 모양 조각 ${n(k)}개는 정삼각형 모양 조각 몇 개인가?`,
    n(k * 3),
    `${expr(`${k}\\times3=${k * 3}`)} 개입니다.`,
  );
}

function poly264FromTris(unit: UnitSeed, rng: Rng): ElemProblem {
  const k = intBetween(rng, 2, 5);
  return make(
    unit,
    `정삼각형 모양 조각 ${n(k * 2)}개로 마름모 모양 조각을 만들면 마름모 모양 조각은 몇 개인가?`,
    n(k),
    `${expr(`${k * 2}\\div2=${k}`)} 개입니다.`,
  );
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

/* ══════ 1-5 · 1-6 · 2-4 난이도 확대 — 심화중·심화상 (D-113 · D-115, 물결 3) ══════
 *
 * 2026-08-31. 파일럿(1-3)·둘째 물결(2-3·2-6·2-1)에 이어 **세 대단원**을 채운다.
 * 고른 까닭·비운 자리·못 본 것은 `docs/planning/tracks/reports/tier-fill-g4-w3.md`.
 *
 * ## 굳힘 축을 대단원마다 하나씩 **예약**한다 (토대 17 §2 권고, 물결 2 가 시작한 규약)
 *
 * ```
 * 1-3 (파일럿)  곱의 자릿수 · 나머지는 나누는 수보다 작다
 * 2-3 (물결 2)  소수의 자릿값 · 받아올림/받아내림
 * 2-6 (물결 2)  변의 수는 자연수 · 나누어떨어져야 한다
 * 2-1 (물결 2)  진분수 조건(분자 < 분모)
 * ─────────────────────────────────────────────────────────
 * 1-5 (여기)    **눈금 한 칸** — 세로 눈금 상한이 후보를 하나로 줄인다
 * 1-6 (여기)    **배열의 자리** — 첫째부터 차례로만 간다 · 자리를 하나씩 늘려 견준다
 * 2-4 (여기)    **이름이 성질을 되돌려 준다** — 네 변이 같으면 한 변은 합의 4분의 1
 *               · 수직 꺾임의 홀짝 · 세 평행선의 차례
 * ```
 *
 * ## 🔴 「잘못 …했더니」를 한 갈래도 안 쓴다
 *
 * 초4 심화하 62자리 중 11자리(17.7%)가 이미 그 문형이다(토대 §2-㉠). 여기서도 마디를
 * 여는 방식을 **「무엇을 안 말해 주는가」**로 둔다 — 어느 막대와 견주는지 · 몇째인지 ·
 * 늘어나는 개수가 얼마인지 · 직선이 몇 개인지 · 세 직선의 차례가 어떤지 · 네 변까지
 * 같은지.
 *
 * ## 각도를 한 갈래도 안 쓴다 (2-4)
 *
 * 토대 §3 2-4 함정 첫 줄이 돌려 보고 못 박은 자리다 — 「각도로 사다리를 세우면
 * 1-2-4(각도의 합과 차)와 통째로 겹친다」. 그래서 2-4 의 확대 넷은 **변·거리·개수**로만
 * 간다. 그리고 1-2 각도와 2-2 삼각형은 **같은 축**(고정된 합 $180^\circ$/$360^\circ$)
 * 위에 있어 한 회차가 둘을 같이 들고 갈라야 한다 — 이 물결은 그 둘을 **안 건드린다**.
 *
 * ## 밭은 손으로 고르지 않고 **전수로 만든다**
 *
 * 「하나만 남는가」를 눈으로 고르면 둘 남는 자리가 반드시 샌다(파일럿·물결 2 와 같은 규율).
 * 아래 `*_FIELD` 는 모듈이 뜰 때 전수로 만들고 **하나만 남는 자리만** 담는다.
 * 비면 그 갈래는 등록조차 못 하므로, 근거는 문장이 아니라 **밭 자체**다.
 *
 * ## 🔴 그런데 «밭이 하나만 남긴다»는 «마디가 열렸다»가 아니다 (2026-08-31 적대 검토)
 *
 * 밭이 「살아남는 후보가 정확히 하나」만 담아도, **죽는 가지가 늘 같은 쪽**이면 학생은
 * 성질을 한 번도 안 대고 그 한 쪽을 바로 고른다. 이 회차가 그렇게 셋을 잃었다 —
 * `1-5-2 중`(늘 작은 쪽 20,000/20,000) · `1-5-2 상`(조건을 안 읽어도 98.3%) ·
 * `2-4-5 중`(죽는 가지가 산술 모순이라 답에 영향 0). `2-4-3 중` 만 **방향을 던져** 살렸다.
 * 그러니 밭을 세운 뒤에 **「죽는 쪽이 늘 같은가」를 전수로 한 번 더 세라** —
 * 늘 같으면 그 갈래는 심화중이 아니라 «기본에 문장을 하나 더 붙인 것»이다.
 */

/* ─────────────────── 1-5 막대그래프 — 확대 갈래 ───────────────────
 *
 * 🔴 **물결 2 가 미룬 까닭을 측정으로 뒤집었다.** 그 회차는 「축을 차트 엔진이 정한다」로
 * 1-5·2-5 를 함께 미뤘는데, 그 제약(`CHART_ACCEPTS_UNKNOWN`)은 **`lineChart` 것**이다.
 * `barChart` 는 열려 있고, 실제로 렌더해 보면 지워진 막대가 **둘**이어도(5,062자)
 * **셋**이어도(5,069자) 그린다. 그래서 1-5 는 이번에 채우고 2-5 는 그대로 남긴다.
 *
 * 재료는 표준·4단이 쓰는 `barSplits`·`BAR_SCALES`·`BAR_THEMES` **그대로**다 —
 * 재료를 두 벌로 두면 한쪽만 고쳐도 아무도 모른다.
 */

/** 값(크기 순)을 라벨 자리에 **섞어** 앉힌다 — 늘 오름차순이면 가장 긴 막대가 늘 끝이다. */
function barSlots(rng: Rng): number[] {
  const slot = [0, 1, 2, 3];
  for (let i = 3; i > 0; i -= 1) {
    const j = intBetween(rng, 0, i);
    [slot[i], slot[j]] = [slot[j]!, slot[i]!];
  }
  return slot;
}

/** `slot[t]` = 크기 순서 `t` 인 값이 앉을 라벨 자리. 그것을 라벨 차례로 뒤집어 준다. */
function barCells(
  theme: BarTheme,
  sorted: readonly number[],
  slot: readonly number[],
): { label: string; rank: number; value: number }[] {
  return theme.labels.map((label, at) => {
    const rank = slot.indexOf(at);
    return { label, rank, value: sorted[rank]! };
  });
}

function barIntroOf(scale: BarScale, theme: BarTheme): string {
  return (
    `${josa(scale.who, "이", "가")} 좋아하는 ` +
    `${josa(theme.item, "을", "를")} 조사하여 나타낸 막대그래프입니다.`
  );
}

/**
 * **1-5-1 심화중의 밭** — 지워진 막대가 «어느 막대보다» 더 많은지 안 말한다.
 *
 * 되짚기가 후보 셋(보이는 세 값에 각각 `k` 를 더한 것)을 만들고, 그 가운데 **세로 눈금
 * 안에 그릴 수 있는 것이 하나뿐**이라야 답이 선다. 그 조건이 곧
 * 「둘째로 작은 값 + `k` 가 축 맨 위를 넘는다」이므로 전수로 그것만 담는다.
 *
 * ⚠️ 최댓값은 숨기지 않는다(`tier53Deep` 과 같은 약속) — 숨기면 축이 그 크기를 귀띔한다.
 *    그래서 지워질 수 있는 자리는 크기 순서 `1`·`2` 뿐이고, 견주는 상대는 늘 가장 작은
 *    값이다(그것 말고는 `k` 를 더하면 축을 넘는다).
 */
const BAR_HIDE_FIELD: {
  scale: BarScale;
  total: number;
  sorted: number[];
  hideRank: number;
}[] = (() => {
  const out: {
    scale: BarScale;
    total: number;
    sorted: number[];
    hideRank: number;
  }[] = [];
  for (const scale of BAR_SCALES) {
    for (const total of scale.totals) {
      for (const sorted of barSplits(total, scale)) {
        const [v1, v2, v3, v4] = sorted as [number, number, number, number];
        // 지워진 것이 셋째로 큰 값이면 남는 셋은 v1·v2·v4 다.
        if (v3 - v1 > v4 - v2) out.push({ scale, total, sorted, hideRank: 2 });
        // 지워진 것이 둘째로 작은 값이면 남는 셋은 v1·v3·v4 다.
        if (v2 - v1 > v4 - v3) out.push({ scale, total, sorted, hideRank: 1 });
      }
    }
  }
  return out;
})();

/**
 * **1-5-1 5단 심화중 — 지워진 막대를 «어느 것과» 견주는지 안 말한다.**
 *
 * 심화하는 견줄 상대를 이름으로 준다(마디가 하나로 굳는다). 여기서는 그 이름을 지워
 * 후보가 셋이 되고, **「세로 눈금은 가장 큰 수까지 나타낼 수 있어야 한다」**는 이 대단원의
 * 성질이 둘을 떨어뜨린다. 후보를 **끝까지 더해 보지 않고** 「상대가 얼마보다 많을 수
 * 없는가」 한 번으로 걸러 내므로 중이다(D-115 ⑾).
 */
function tier51Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier51MidRaw(unit, rng));
}

function tier51MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, BAR_THEMES));
  const f = pick(rng, BAR_HIDE_FIELD);
  const cells = barCells(theme, f.sorted, barSlots(rng));
  const hidden = cells.find((c) => c.rank === f.hideRank)!;
  const ref = cells.find((c) => c.rank === 0)!;
  const top = f.sorted[3]!;
  const gap = hidden.value - ref.value;
  const limit = top - gap;
  const shown = cells.filter((c) => c.rank !== f.hideRank);
  const figure = fig("barChart", {
    values: cells.map((c) =>
      c.rank === f.hideRank
        ? { label: c.label, unknown: true }
        : { label: c.label, value: c.value },
    ),
    yMax: top,
    yStep: f.scale.step,
    yLabel: theme.unit,
  });
  return makeDeep(
    unit,
    `${barIntroOf(f.scale, theme)} 세로 눈금은 ${n(top)}${theme.unit}까지 ` +
      `나타내었습니다. ${josa(hidden.label, "을", "를")} 좋아하는 학생은 나머지 세 가지 ` +
      `가운데 어느 한 가지를 좋아하는 학생보다 ${n(gap)}${theme.unit} 더 많습니다. ` +
      `어느 것보다 많은지는 알려 주지 않습니다. ` +
      `${josa(hidden.label, "을", "를")} 좋아하는 학생은 몇 ${theme.unit}인가?`,
    `${n(hidden.value)}${theme.unit}`,
    [
      `지워진 막대도 이 그래프 안에 그려져 있으므로 ` +
        `${n(top)}${josa(theme.unit, "을", "를")} 넘을 수 없습니다. 그러므로 ` +
        `${n(gap)}${josa(theme.unit, "이", "가")} 더 많다고 한 상대는 ` +
        `${expr(`${top}-${gap}=${limit}`)} 보다 많을 수 없습니다.`,
      `나머지 세 가지는 ` +
        `${shown.map((c) => `${n(c.value)}${theme.unit}`).join(", ")}인데 이 가운데 ` +
        `${n(limit)}${josa(theme.unit, "을", "를")} 넘지 않는 것은 ` +
        `${josa(ref.label, "의", "의")} ${n(ref.value)}${theme.unit} 하나입니다. ` +
        `${expr(`${ref.value}+${gap}=${hidden.value}`)} 이므로 ` +
        `${josa(hidden.label, "을", "를")} 좋아하는 학생은 ` +
        `${n(hidden.value)}${theme.unit}입니다.`,
    ],
    figure,
  );
}

/* ─────────────────── 1-6 규칙 찾기 — 확대 갈래 ───────────────────
 *
 * 굳힘 축은 **배열의 자리**다 — 「배열은 첫째부터 차례로만 간다」·「자리는 자연수 하나」.
 * ⚠️ 약수·공배수(초5-1 1-4)로 후보를 자르지 않는다(반증 ③). 후보를 만드는 것도 자르는
 *    것도 **자리를 하나씩 옮겨 보는 일**이어야 한다.
 */

/**
 * **1-6-1 심화중의 밭** — 「$A$ 가 몇째인지」를 안 말한다.
 *
 * 첫째 수 후보는 `A` 에서 `step` 씩 거꾸로 뺀 수 전부이고, 「첫째 수는 한 자리 수」가
 * 그중 하나를 고른다. 그러려면 그 등차 무리 안에 **한 자리 수가 정확히 하나**여야 한다 —
 * 곧 `first + step > 9`(위쪽에 또 있으면 안 된다)이고 `first - step < 1`(아래쪽에도
 * 없어야 한다). 두 부등식이 `10 - step <= first <= step` 으로 접히므로 전수로 그것만 담는다.
 *
 * ⚠️ `first !== step` 을 요구한다 — 같으면 답이 발문의 수와 같아진다.
 */
const SEQ_FIRST_FIELD: { step: number; first: number; back: number }[] =
  (() => {
    const out: { step: number; first: number; back: number }[] = [];
    for (let step = 6; step <= 9; step += 1) {
      for (let first = Math.max(1, 10 - step); first <= step; first += 1) {
        if (first === step) continue;
        for (let back = 4; back <= 10; back += 1) {
          const shown = first + step * back;
          if (shown > 99) continue;
          out.push({ step, first, back });
        }
      }
    }
    return out;
  })();

/**
 * **1-6-1 5단 심화중 — 「몇째인지」를 안 말한다.**
 *
 * 심화하는 자리를 준다(「다섯째 수가 $50$」) — 뺄셈 한 번에 굳는다. 여기서는 자리를
 * 지워 첫째 후보가 여럿 되고, 발문의 「첫째 수는 한 자리 수」가 하나를 고른다.
 * 후보를 **끝까지 다 적어 보지 않고** 「한 칸 위가 벌써 두 자리 수」 한 줄로 닫으므로 중이다.
 */
function tier61Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier61MidRaw(unit, rng));
}

function tier61MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, SEQ_FIRST_FIELD);
  const shown = f.first + f.step * f.back;
  return makeDeep(
    unit,
    `${n(f.step)}씩 커지는 규칙으로 수를 늘어놓았습니다. 이 배열에 ` +
      `${josaNum(shown, "이", "가")} 들어 있고, 첫째 수는 한 자리 수입니다. ` +
      `첫째 수는 얼마인가?`,
    n(f.first),
    [
      `${n(f.step)}씩 커지는 규칙이므로 배열의 수는 첫째 수에 ${josaNum(f.step, "을", "를")} ` +
        `거듭 더해서 나옵니다. 그러므로 첫째 수는 ${n(shown)}에서 ${josaNum(f.step, "을", "를")} ` +
        `거꾸로 빼어 나오는 수 가운데 하나입니다.`,
      `${n(shown)}에서 ${n(f.step)}씩 ${n(f.back)}번 빼면 ` +
        `${expr(`${shown}-${f.step}\\times${f.back}=${f.first}`)} 입니다. 여기에 ` +
        `${josaNum(f.step, "을", "를")} 다시 더한 ` +
        `${expr(`${f.first}+${f.step}=${f.first + f.step}`)} ` +
        `${tail(f.first + f.step, "은", "는")} 두 자리 수이므로, ` +
        `배열의 수 가운데 한 자리 수는 ${n(f.first)} 하나뿐입니다. 그러므로 첫째 수는 ` +
        `${n(f.first)}입니다.`,
    ],
  );
}

/**
 * **1-6-2 심화상의 밭** — 자리도 늘어나는 개수도 **둘 다** 안 준다.
 *
 * 첫째 개수 `first` 와 합 `total` 만 주고 늘어나는 개수는 **창**으로만 준다. 창 안의
 * 수를 하나씩 잡아 **자리를 늘려 가며 실제로 더해 보아야** 합이 딱 맞는 것이 하나
 * 남는다. 밭은 창 안의 후보가 셋 이상이고 **그중 정확히 하나만** 합에 닿는 자리만 담는다.
 *
 * ⚠️ 답이 「$k$째」라 `readRat` 이 못 읽는다 — 반증 ⑥ 축 **밖**이다(0 이 «깨끗»인지
 *    «못 셈»인지 안 갈리는 자리라 여기 적어 둔다).
 */
function seqStopAt(first: number, grow: number, total: number): number {
  let sum = 0;
  for (let k = 1; k <= 12; k += 1) {
    sum += first + grow * (k - 1);
    if (sum === total) return k;
    if (sum > total) return 0;
  }
  return 0;
}

const SEQ_SUM_FIELD: {
  first: number;
  grow: number;
  upto: number;
  total: number;
  lo: number;
  hi: number;
}[] = (() => {
  const out: {
    first: number;
    grow: number;
    upto: number;
    total: number;
    lo: number;
    hi: number;
  }[] = [];
  for (let first = 1; first <= 6; first += 1) {
    for (let grow = 2; grow <= 9; grow += 1) {
      for (let upto = 4; upto <= 8; upto += 1) {
        const total = upto * first + (grow * upto * (upto - 1)) / 2;
        if (total > 200) continue;
        if (seqStopAt(first, grow, total) !== upto) continue;
        for (let lo = Math.max(1, grow - 5); lo < grow; lo += 1) {
          for (let hi = grow + 1; hi <= grow + 5; hi += 1) {
            const width = hi - lo - 1;
            if (width < 3 || width > 6) continue;
            let clash = false;
            for (let g = lo + 1; g <= hi - 1; g += 1) {
              if (g !== grow && seqStopAt(first, g, total) > 0) clash = true;
            }
            if (clash) continue;
            out.push({ first, grow, upto, total, lo, hi });
          }
        }
      }
    }
  }
  return out;
})();

/**
 * **1-6-2 6단 심화상 — 창 안의 개수를 하나씩 잡아 실제로 쌓아 본다.**
 *
 * 심화하는 늘어나는 개수를 준다(「$4$개씩 늘어난다 → 합이 $72$면 몇째까지」) — 차례로
 * 더하기 한 번이면 굳는다. 여기서는 그 수를 **창으로만** 주어, 창 안의 후보마다
 * 배열을 실제로 쌓아 합과 견주어야 한다. 후보를 발문이 값으로 주지 않고 **자리를
 * 늘려 가는 일**이 만든다(D-115 상의 정의 그대로).
 */
function tier62Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier62TopRaw(unit, rng));
}

function tier62TopRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, SEQ_SUM_FIELD);
  const terms = Array.from({ length: f.upto }, (_, i) => f.first + f.grow * i);
  // 창 안에서 지는 후보 하나를 **실제로 쌓아** 보인다 — 「안 된다」로 얼버무리지 않는다.
  const others = [];
  for (let g = f.lo + 1; g <= f.hi - 1; g += 1)
    if (g !== f.grow) others.push(g);
  const loser = others[0]!;
  const loserTerms: number[] = [];
  let sum = 0;
  for (let k = 1; k <= 12; k += 1) {
    loserTerms.push(f.first + loser * (k - 1));
    sum += f.first + loser * (k - 1);
    if (sum >= f.total) break;
  }
  const loserSum = sum;
  const loserPrev = loserSum - loserTerms[loserTerms.length - 1]!;
  return makeDeep(
    unit,
    `모형을 규칙에 따라 늘어놓았습니다. 첫째는 ${n(f.first)}개이고 같은 개수씩 ` +
      `늘어납니다. 첫째부터 어떤 째까지 놓았더니 모형이 모두 ${n(f.total)}개였고, ` +
      `늘어나는 개수는 ${n(f.lo)}개보다 많고 ${n(f.hi)}개보다 적습니다. ` +
      `첫째부터 몇째까지 놓았는가?`,
    ORDINAL[f.upto - 1]!,
    [
      `늘어나는 개수는 ${n(f.lo + 1)}개부터 ${n(f.hi - 1)}개까지 가운데 하나입니다. ` +
        `하나씩 잡아 첫째부터 차례로 놓아 보고 합이 ${n(f.total)}개가 되는지 봅니다.`,
      `${n(loser)}개씩이면 ${loserTerms.map((v) => n(v)).join(", ")}개로 놓여 ` +
        `${expr(`${loserTerms.join("+")}=${loserSum}`)} 이고, 한 자리 앞까지는 ` +
        `${n(loserPrev)}개라 ${n(f.total)}개를 건너뜁니다.`,
      `${n(f.grow)}개씩이면 ${terms.map((v) => n(v)).join(", ")}개로 놓여 ` +
        `${expr(`${terms.join("+")}=${f.total}`)} 입니다. 나머지 개수로는 차례로 더해도 ` +
        `${n(f.total)}개가 되지 않으므로, ${ORDINAL[f.upto - 1]!}까지 놓은 것입니다.`,
    ],
  );
}

/* ─────────────────── 2-4 사각형 — 확대 갈래 ───────────────────
 *
 * 굳힘 축은 **「이름이 성질을 되돌려 준다」**다 — 마주 보는 두 변은 길이가 같다 ·
 * 수직으로 꺾인 횟수의 홀짝 · 평행선 사이의 거리는 어디에서 재어도 같다.
 * 🔴 **각도를 한 갈래도 안 쓴다**(1-2-4 와 통째로 겹친다, 토대 §3 2-4 함정 첫 줄).
 * 🔴 **`□+(□+차)=합` 을 한 갈래도 안 쓴다** — 2-4-4·2-4-5 심화하와 2-6-1 심화하가
 *    이미 그 산술이다(토대 §2-㉣).
 */

/**
 * **2-4-2 5단 심화중 — 직선이 «몇 개인지» 안 말한다.**
 *
 * 응용은 직선 수를 주고 「가와 수직인 것이 몇 개인가」를 순방향으로 센다. 여기서는 그
 * 수를 지워, 「맨 앞과 평행한(또는 수직인) 직선이 $c$개」에서 직선 수 후보가 **둘**이 되고
 * **수직 꺾임의 홀짝**이 하나를 떨어뜨린다.
 *
 * ⚠️ **축을 둘 두었다** — 세는 대상(평행/수직)과 맨 뒤 직선의 관계(수직/평행). 처음에는
 *    한 축뿐이라 씨앗 16개에서 **발문이 네 가지**밖에 안 나왔다(시험이 잡았다).
 *    「씨앗을 바꿔도 같은 문항」은 규모를 키워 메울 것이 아니라 **축을 늘려** 메운다.
 */
function tier242Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier242MidRaw(unit, rng));
}

function tier242MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const cnt = intBetween(rng, 2, 5);
  const countsParallel = intBetween(rng, 0, 1) === 0;
  const lastPerp = intBetween(rng, 0, 1) === 0;
  // 세는 것이 «평행»이면 직선 수는 `2c+1`·`2c+2`, «수직»이면 `2c`·`2c+1` 이다.
  const lower = countsParallel ? cnt * 2 + 1 : cnt * 2;
  const upper = lower + 1;
  // 맨 뒤까지 꺾인 횟수는 `직선 수 − 1` 이다. 수직이려면 홀수여야 한다.
  const lowerIsOddTurns = (lower - 1) % 2 === 1;
  const answer = lowerIsOddTurns === lastPerp ? lower : upper;
  const dead = answer === lower ? upper : lower;
  const kindWord = countsParallel ? "평행한" : "수직인";
  // 「수직」은 «입니다»·«하려면», 「평행」은 «합니다»·«하려면» — 엔진의 기존 2-4-2 표기 그대로다.
  const lastSentence = lastPerp ? "수직입니다" : "평행합니다";
  const lastClause = lastPerp ? "수직이려면" : "평행하려면";
  const parity = countsParallel ? "짝수" : "홀수";
  const lastTurn = lower - 1;
  return makeDeep(
    unit,
    `직선 여러 개가 차례로 있습니다. 이웃한 두 직선끼리는 모두 서로 수직입니다. ` +
      `맨 앞에 있는 직선과 서로 ${kindWord} 직선은 그 직선을 빼고 모두 ${n(cnt)}개이고, ` +
      `맨 뒤에 있는 직선은 맨 앞에 있는 직선과 서로 ${lastSentence}. ` +
      `직선은 모두 몇 개인가?`,
    `${n(answer)}개`,
    [
      `수직으로 한 번 꺾일 때마다 방향이 바뀌므로, 맨 앞 직선에서 짝수 번 꺾인 직선은 ` +
        `맨 앞 직선과 평행하고 홀수 번 꺾인 직선은 수직입니다. 맨 앞 직선 뒤로 ` +
        `${n(1)}번, ${n(2)}번, … 꺾인 직선이 차례로 있는데 그 가운데 ${parity} 번 꺾인 ` +
        `것이 ${n(cnt)}개이므로, 마지막으로 ${parity} 번 꺾인 것은 ` +
        `${expr(`${cnt}\\times2${countsParallel ? "" : "-1"}=${lastTurn}`)} 번 꺾인 ` +
        `직선입니다. 그러므로 직선은 맨 앞 것까지 세어 ` +
        `${expr(`${lastTurn}+1=${lower}`)} 개이거나 ${expr(`${lower}+1=${upper}`)} ` +
        `개입니다.`,
      `맨 뒤 직선이 맨 앞 직선과 ${lastClause} 맨 뒤까지 꺾인 횟수가 ` +
        `${lastPerp ? "홀수" : "짝수"}여야 합니다. ${n(dead)}개이면 ${n(dead - 1)}번 ` +
        `꺾여 ${(dead - 1) % 2 === 1 ? "홀수" : "짝수"}라 안 되고, ${n(answer)}개이면 ` +
        `${n(answer - 1)}번 꺾여 ${(answer - 1) % 2 === 1 ? "홀수" : "짝수"}입니다. ` +
        `그러므로 직선은 ${n(answer)}개입니다.`,
    ],
  );
}

/**
 * **2-4-3 심화중의 밭** — 세 평행선이 놓인 **차례**를 안 말한다.
 *
 * 가운데가 직선 나이면 거리는 두 값의 합, 아니면 차다 — 후보 둘. 「가와 다 사이가
 * 가와 나 사이보다 짧다」가 합 쪽을 곧바로 죽인다(더해서 짧아질 수는 없다).
 * 그러려면 차가 `near` 보다 짧아야 하므로 `far < 2 * near` 이고, 답이 발문의 두 수와
 * 같아지지 않게 `near !== 2 * far` 도 요구한다.
 */
const PARA_ORDER_FIELD: { near: number; far: number }[] = (() => {
  const out: { near: number; far: number }[] = [];
  for (let near = 5; near <= 15; near += 1) {
    for (let far = 3; far <= 15; far += 1) {
      if (far === near) continue;
      if (far >= near * 2) continue; // 차가 near 보다 짧아야 조건이 문다
      if (near === far * 2) continue; // 답이 far 와 같아진다
      out.push({ near, far });
    }
  }
  return out;
})();

/**
 * **2-4-3 5단 심화중 — 세 평행선의 «차례»를 안 말한다.**
 *
 * 심화하는 「이 순서로」가 배치를 통째로 정한다(마디가 없다). 여기서는 그 한 마디를
 * 열어 후보가 «합»과 «차» 둘이 되고, 발문의 비교 조건 한 줄이 하나를 죽인다.
 *
 * 🔴 **비교 방향을 씨앗마다 던진다** — 2026-08-31 적대 검토가 짚은 자리다. 방향을
 *    「짧을 때」로 굳혀 두면 `both > near` 도 `apart < near` 도 **밭 전량에서 늘 참**
 *    이라 그 문장이 정보를 한 비트도 안 싣는다. 학생이 조건을 안 읽고 두 수를 빼기만
 *    해도 맞았다(실측 2,400/2,400 · 반증 ⑥). 방향을 던지면 «더할지 뺄지»가 **조건에서만**
 *    나온다. 밭 115쌍 × 방향 2 = 230자리에서 살아남는 후보가 늘 정확히 하나이고 답이
 *    발문의 수와 같아지는 자리도 0이다(`.tmp-rev/jatdae-rebut/fix-check.ts` 로 재현).
 */
function tier243Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier243MidRaw(unit, rng));
}

function tier243MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, PARA_ORDER_FIELD);
  const both = f.near + f.far;
  const big = Math.max(f.near, f.far);
  const small = Math.min(f.near, f.far);
  const apart = big - small;
  // 방향을 던진다 — 머리말 🔴 참조. `apart < near` 와 `both > near` 가 둘 다 밭에서
  // 항등이므로, 어느 쪽을 묻든 살아남는 후보는 정확히 하나이고 서로 다르다.
  const wantShorter = intBetween(rng, 0, 1) === 0;
  const answer = wantShorter ? apart : both;
  const dead = wantShorter ? both : apart;
  return makeDeep(
    unit,
    `직선 가, 직선 나, 직선 다는 모두 서로 평행합니다. 직선 가와 직선 나 사이의 거리는 ` +
      `${cm(f.near)}이고, 직선 나와 직선 다 사이의 거리는 ${cm(f.far)}입니다. 세 직선이 ` +
      `놓인 차례는 알려 주지 않습니다. 직선 가와 직선 다 사이의 거리가 직선 가와 직선 나 ` +
      `사이의 거리보다 ${wantShorter ? "짧을" : "길"} 때, 직선 가와 직선 다 사이의 ` +
      `거리는 몇 cm인가?`,
    cm(answer),
    [
      `직선 나가 직선 가와 직선 다 사이에 있으면 직선 가와 직선 다 사이의 거리는 두 ` +
        `거리를 더한 ${expr(`${f.near}+${f.far}=${both}`)} 에서 ${cm(both)}입니다. ` +
        `직선 나가 두 직선 사이에 없으면 두 거리의 차인 ` +
        `${expr(`${big}-${small}=${apart}`)} 에서 ${cm(apart)}입니다.`,
      `${cm(dead)}는 직선 가와 직선 나 사이의 거리인 ${cm(f.near)}보다 ` +
        `${wantShorter ? "길어" : "짧아"} 조건에 맞지 않습니다. 그러므로 직선 가와 ` +
        `직선 다 사이의 거리는 ${cm(answer)}입니다.`,
    ],
  );
}

/**
 * **2-4-7 5단 심화중 — 「네 변까지 같은지」를 안 말한다.**
 *
 * 기본은 「네 변은 모두 같지 않다」를 말로 준다. 여기서는 그 말을 지워 이름 후보가
 * 둘(직사각형·정사각형)이 되고, **「네 변이 모두 같으면 한 변은 합의 $4$분의 $1$」**을
 * 한 번 계산해 정사각형 쪽을 죽인다.
 *
 * ⚠️ **정사각형 가지는 안 낸다** — 그 가지에서는 이웃한 변의 길이가 발문에 이미 적힌
 *    수와 같아져 「답이 발문에 그대로」가 된다. 마디는 그대로 열려 있고 죽는 쪽만 고정이다.
 */
function tier247Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier247MidRaw(unit, rng));
}

function tier247MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const side = intBetween(rng, 4, 15);
  // 합의 $4$분의 $1$ 이 자연수로 떨어지게 — 해설이 그 값을 지면에 적는다.
  const rest = pick(
    rng,
    Array.from({ length: 13 }, (_, i) => i + 3).filter(
      (v) => v !== side && (v + side) % 2 === 0,
    ),
  );
  const total = (side + rest) * 2;
  return makeDeep(
    unit,
    `어떤 사각형은 네 각의 크기가 모두 같습니다. 이 사각형의 네 변의 길이의 합은 ` +
      `${cm(total)}이고 한 변의 길이는 ${cm(side)}입니다. 이 사각형의 이름을 쓰고, ` +
      `그 변과 이웃한 변의 길이를 구하시오.`,
    `직사각형, ${cm(rest)}`,
    [
      `네 각의 크기가 모두 같은 사각형은 직사각형이고, 그중 네 변의 길이까지 모두 같은 ` +
        `것이 정사각형입니다. 네 변이 모두 같다면 한 변은 ` +
        `${expr(`${total}\\div4=${total / 4}`)} 인데 ${cm(side)}와 다르므로 정사각형이 ` +
        `아닙니다.`,
      `그러므로 이 사각형은 직사각형입니다. 직사각형은 마주 보는 두 변의 길이가 같으므로 ` +
        `이웃한 두 변의 길이의 합은 ${expr(`${total}\\div2=${total / 2}`)} 이고, ` +
        `이웃한 변의 길이는 ${expr(`${total / 2}-${side}=${rest}`)} 에서 ${cm(rest)}입니다.`,
    ],
  );
}

/* ══════ 물결 4 — 1-2 각도 · 2-2 삼각형 · 2-5 꺾은선 확대 갈래 (D-113·D-115) ══════
 *
 * 남은 다섯 대단원(1-1·1-2·1-4·2-2·2-5) 가운데 **셋**에만 선다. 대단원마다 굳힘 축을
 * 하나씩 예약하는 규약(앞 물결 셋이 세웠다)을 그대로 잇는다:
 *
 * ```
 * 1-3 (파일럿)  곱의 자릿수 · 나머지는 나누는 수보다 작다
 * 2-3 (물결 2)  소수의 자릿값 · 받아올림/받아내림
 * 2-6 (물결 2)  변의 수는 자연수 · 나누어떨어져야 한다
 * 2-1 (물결 2)  진분수 조건(분자 < 분모)
 * 1-5 (물결 3)  눈금 한 칸 — 모든 막대에 같다
 * 1-6 (물결 3)  배열의 자리 — 첫째부터 차례로만 간다
 * 2-4 (물결 3)  이름이 성질을 되돌려 준다
 * ─────────────────────────────────────────────────────────────────────────
 * 1-2 (여기)    **시각 ↔ 큰 눈금 칸수** — 작은 쪽 각이 같은 정각이 둘이다
 * 2-2 (여기)    **이등변의 «어느 둘이 같은지»가 안 정해진다** (토대 §2.3-㉡ 배정)
 * 2-5 (여기)    **기준값(문턱·지워진 값)을 안 준다** — 값을 감추는 축은 1-5 가 가져갔고
 *               `lineChart` 는 unknown 을 못 받으므로 «표»인 2-5-3 에서만 값을 지운다
 * ```
 *
 * 🔴 **비운 대단원 둘과 그 까닭**(수치는 §보고서 — 전부 돌리거나 계산해서 나온 값이다):
 *   · **1-1 큰 수 (14칸)** — 굳힐 수 있는 성질이 ㉠ 자릿수 ㉡ 「뛴 자리 말고는 안 변한다」
 *     둘뿐인데, ㉠ 은 **1-6-1 심화중과 구조가 같고**(내림 사슬 + 자리 성질 컷),
 *     ㉡ 으로 마디를 열면 답이 `b - n\times c` 라 **반증 ⑥ 의 허용 꼴 그대로**다.
 *     「잘못 …했더니」 포장은 토대 §2.3-㉠ 이 위 두 칸에서 금지했고 1-1-6 심화하가 이미 쓴다.
 *   · **1-4 평면도형의 이동 (8칸)** — 되짚을 값이 방향·칸수·각뿐이고 상태 공간이
 *     $\{90,180,270\}$·$\{$좌우, 위아래$\}$ 로 유한하다. 마디를 열면 답이 여럿이 되고
 *     (1-4-3 은 홀짝이라 후보가 무한), 안 열면 한 문항으로 굳는다.
 *
 * ⚠️ **이 회차가 물려받은 규율 — 「지름길은 적는 것이 아니라 전수로 세어 %를 내는 것」**
 *    (물결 3 적대 검토). 밭이 「하나만 남긴다」를 보장해도 **죽는 쪽이 늘 같으면**
 *    학생은 성질을 한 번도 안 대고 그 쪽을 바로 고른다. 그래서 아래 밭은 전부
 *    ⑴ 후보가 여럿이고 ⑵ 정확히 하나가 남고 ⑶ **살아남는 쪽이 씨앗마다 갈리는지**를
 *    전수로 세어 만든다. 시험이 그 셋을 각각 잠근다.
 */

/**
 * **1-2-3 심화중의 밭** — 「작은 쪽 각이 $a^\circ$인 정각」은 **둘**이다.
 *
 * 큰 눈금 한 칸이 $30^\circ$ 이므로 두 바늘 사이가 $c$칸이면 $c$시와 $(12-c)$시가
 * 똑같이 $30\times c$ 도를 이룬다. 그 마디를 「$6$시보다 이르다/늦다」 한 줄이 굳힌다.
 *
 * 밭에 담는 조건 둘 —
 *  ㉠ 두 후보의 **답(분류)이 서로 달라야** 한다. 같으면 굳힘이 아무 일도 안 한다.
 *  ㉡ $t$시간 뒤가 **$12$시가 되면 안 된다**. 두 바늘이 겹쳐 각이 $0^\circ$가 되는데
 *     그건 「이루는 각」이라 부를 것이 없다.
 *
 * ⚠️ 답이 낱말(예각·직각·둔각)이라 `readRat` 이 못 읽는다 — **반증 ⑥ 축 밖**이다.
 *    그 0 은 「깨끗」이 아니라 「못 셈」이고, 대신 사람이 손으로 봤다(보고서 §5).
 * ⚠️ **그림을 안 붙인다.** 시계를 그리면 「몇 시인가」가 그림에서 바로 보여 마디가
 *    통째로 닫힌다(09 §2.2). 응용은 그림을 붙이므로 지면에서도 갈린다.
 */
const CLOCK_MID_FIELD: {
  angle: number;
  after: number;
  early: boolean;
  hour: number;
  kind: string;
}[] = (() => {
  const cells = (h: number) => Math.min(h, 12 - h);
  const wrap = (h: number) => ((h - 1) % 12) + 1;
  const out: {
    angle: number;
    after: number;
    early: boolean;
    hour: number;
    kind: string;
  }[] = [];
  for (const angle of [30, 60, 90, 120, 150]) {
    const early = angle / 30;
    const late = 12 - early;
    for (let t = 1; t <= 5; t += 1) {
      const n1 = wrap(early + t);
      const n2 = wrap(late + t);
      if (n1 === 12 || n2 === 12) continue;
      const k1 = angleKind(30 * cells(n1));
      const k2 = angleKind(30 * cells(n2));
      if (k1 === k2) continue;
      out.push({ angle, after: t, early: true, hour: early, kind: k1 });
      out.push({ angle, after: t, early: false, hour: late, kind: k2 });
    }
  }
  return out;
})();

/**
 * **1-2-3 5단 심화중 — 「몇 시인지」를 안 말한다.**
 *
 * 응용은 시각을 주고 각을 묻는다(순방향, 그림도 붙는다). 여기서는 각만 주어
 * 시각 후보가 **둘**이 되고, 「$6$시보다 이르다/늦다」가 하나를 고른 뒤에야
 * $t$시간 뒤의 각을 잴 수 있다. 후보를 **끝까지 재 보지 않고** 시각 한 줄로
 * 닫으므로 중이다(D-115 ⑾).
 */
function tier23Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, CLOCK_MID_FIELD);
  const cells = (h: number) => Math.min(h, 12 - h);
  const other = 12 - f.hour;
  const lo = Math.min(f.hour, other);
  const hi = Math.max(f.hour, other);
  const afterCells = cells(f.after > 0 ? ((f.hour + f.after - 1) % 12) + 1 : 0);
  const afterHour = ((f.hour + f.after - 1) % 12) + 1;
  return makeDeep(
    unit,
    `어느 정각에 시계의 긴바늘과 짧은바늘이 이루는 작은 쪽 각의 크기가 ` +
      `${deg(f.angle)}입니다. 그 시각은 ${n(6)}시보다 ` +
      `${f.early ? "이릅니다" : "늦습니다"}. 그 시각에서 ${n(f.after)}시간 뒤 정각에 ` +
      `두 바늘이 이루는 작은 쪽 각은 예각, 직각, 둔각 중 무엇인가?`,
    f.kind,
    [
      `시계의 큰 눈금 한 칸의 각도는 ${expr("360\\div12=30")} 에서 ${deg(30)}입니다. ` +
        `작은 쪽 각이 ${deg(f.angle)}이려면 두 바늘 사이가 ` +
        `${expr(`${f.angle}\\div30=${f.angle / 30}`)} 에서 ${n(f.angle / 30)}칸이어야 ` +
        `하므로, 그 정각은 ${n(lo)}시이거나 ${n(hi)}시입니다.`,
      `${n(6)}시보다 ${f.early ? "이르므로" : "늦으므로"} 그 시각은 ${n(f.hour)}시입니다. ` +
        `${n(f.after)}시간 뒤는 ${n(afterHour)}시이고 두 바늘 사이는 ${n(afterCells)}칸이므로 ` +
        `${expr(`30\\times${afterCells}=${30 * afterCells}`)} 에서 ${deg(30 * afterCells)}이고, ` +
        `${deg(30 * afterCells)}는 ${f.kind}입니다.`,
    ],
  );
}

/**
 * **2-2-1 심화중의 밭** — 「주어진 한 변이 «같은 두 변» 중 하나인지 «나머지 한 변»인지」
 * 를 안 말한다. 토대 §2.3-㉡ 이 이 마디를 **2-2 에 배정**했고, 2-2-5 는 «기본»이 이미
 * 각으로 그 마디를 열어 반증 ④ 에 걸리므로(보고서 §5) **변 축인 2-2-1** 로 내려온다.
 *
 * 두 가지 —
 *   ㉮ $a$ 가 같은 두 변 중 하나 → $(a,\;a,\;S-2a)$
 *   ㉯ $a$ 가 나머지 한 변      → $((S-a)\div2,\;(S-a)\div2,\;a)$
 * 둘 다 **실제로 만들어지는 삼각형이어야** 밭에 담는다. 한쪽이 애초에 안 서면 굳힘이
 * 아무 일도 안 하고 「$a$ 는 늘 나머지 한 변」이 100% 지름길이 된다.
 *
 * 🔴 **굳히는 것은 «길이가 같은 두 변이 아닌 나머지 한 변»이다** — ㉮ 는 $S-2a$,
 * ㉯ 는 $a$ 다. 그 둘의 **순서가 $S=3a$ 에서 뒤집힌다**($S<3a$ 면 $S-2a<a$, $S>3a$ 면
 * 그 반대). 그래서 「$t$보다 길다/짧다」라는 **같은 문구가 무리마다 다른 가지**를 살린다.
 *
 * ⚠️ **처음 판은 «가장 짧은 변»을 견줬고, 그것이 결함이었다.** 밭이 늘 $S<3a$ 라
 *    최단 변의 순서가 **구조적으로 고정**돼 「깁니다 → ㉯ · 짧습니다 → ㉮」가 **100%** 였다
 *    (`probe-elem-g4w4-shortcuts.ts` 의 「문구만 보고 갈래를 고른다」 축이 잰 값).
 *    변이 하네스가 먼저 신호를 줬다 — 「최단 변이 같아도 넣는다」·「㉮ 가 삼각형이
 *    아니어도 넣는다」가 **산출물을 하나도 안 바꿨다**(그 가드들이 죽어 있었다는 뜻이고,
 *    죽어 있던 까닭이 곧 순서가 고정이라는 사실이었다). 열쇠를 바꾸니 **68.0%** 가 됐다.
 *
 * ⚠️ **삼각형 부등식은 «생성 필터»로만 쓴다.** 발문·해설이 근거로 쓰면 초4 교과 밖이라
 *    반증 ③ 이다(토대 §3 2-2 함정 ①). 여기서는 밭을 만들 때만 쓴다.
 * ⚠️ 답을 「세 변을 각각」이 아니라 **「같은 두 변의 합」**으로 묻는다 — 세 변을 물으면
 *    ㉯ 에서 답에 $a$ 가 그대로 들어가고(발문에 있는 수), 심화하의 답 모양과도 겹친다.
 */
const ISO_SIDE_FIELD: {
  total: number;
  side: number;
  bar: number;
  longer: boolean;
  takeA: boolean;
}[] = (() => {
  const stands = (x: number, y: number, z: number) =>
    x > 0 && y > 0 && z > 0 && x + y > z && y + z > x && z + x > y;
  const out: {
    total: number;
    side: number;
    bar: number;
    longer: boolean;
    takeA: boolean;
  }[] = [];
  for (let total = 20; total <= 60; total += 1) {
    for (let side = 5; side < total; side += 1) {
      const oddA = total - 2 * side;
      // 🔴 어느 변도 $5\,$cm 아래로 안 간다. $(20,20,2)$ 도 삼각형이지만 지면에서는
      //    바늘처럼 보이고, 「…보다 길다」가 사실상 한 눈에 갈린다.
      if (oddA < 5 || oddA === side) continue;
      if (!stands(side, side, oddA)) continue;
      if ((total - side) % 2 !== 0) continue;
      const pairB = (total - side) / 2;
      if (pairB === side || pairB < 5) continue;
      if (!stands(pairB, pairB, side)) continue;
      // 견주는 값 — ㉮ 의 나머지 한 변은 `oddA`, ㉯ 의 나머지 한 변은 `side` 다.
      const lo = Math.min(oddA, side);
      const hi = Math.max(oddA, side);
      for (let bar = lo; bar < hi; bar += 1) {
        // 문턱이 발문에 이미 적힌 한 변과 같으면 같은 수가 두 뜻으로 나온다 — 뺀다.
        if (bar === side) continue;
        // 「나머지 한 변이 $bar$ 보다 길다」 → 그 값이 큰 쪽만 남는다.
        out.push({ total, side, bar, longer: true, takeA: oddA > bar });
        // 「$bar$ 보다 짧다」 → 작은 쪽만 남는다($bar$ 가 lo 와 같으면 둘 다 죽는다).
        if (bar > lo) {
          out.push({ total, side, bar, longer: false, takeA: oddA < bar });
        }
      }
    }
  }
  return out;
})();

/**
 * **2-2-1 5단 심화중 — 주어진 한 변이 «어느 쪽»인지 안 말한다.**
 *
 * 기본은 같은 마디를 열되 **두 가지를 다 답으로 둔다**(집합 얼굴) — 굳히지 않으므로
 * 심화중 잣대를 통과하지 못한다(반증 ⑤). 응용은 「길이가 같은 두 변이 **아닌** 나머지
 * 한 변의 길이가 $16\,$cm일 때」로 **값을 못 박아** 마디가 아예 안 열린다. 여기서는 그
 * 값을 **범위**로만 주어, 두 가지를 다 만든 뒤 그 한 변을 견주어야 하나가 남는다.
 * 답(같은 두 변의 합)까지 가지 않고 나머지 한 변만 견주어 닫으므로 중이다(D-115 ⑾).
 */
function tier221Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier221MidRaw(unit, rng));
}

function tier221MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, ISO_SIDE_FIELD);
  const oddA = f.total - 2 * f.side;
  const pairB = (f.total - f.side) / 2;
  const pairSum = f.takeA ? 2 * f.side : f.total - f.side;
  return makeDeep(
    unit,
    `세 변의 길이의 합이 ${cm(f.total)}인 이등변삼각형이 있습니다. 이 삼각형의 한 변의 ` +
      `길이는 ${cm(f.side)}이고, 길이가 같은 두 변이 아닌 나머지 한 변의 길이는 ` +
      `${cm(f.bar)}보다 ${f.longer ? "깁니다" : "짧습니다"}. 길이가 같은 두 변의 길이의 ` +
      `합은 몇 cm인가?`,
    cm(pairSum),
    [
      `이등변삼각형은 길이가 같은 변이 두 개입니다. ${cm(f.side)}인 변이 길이가 같은 두 ` +
        `변 중 하나이면 나머지 한 변은 ${expr(`${f.total}-${f.side}\\times2=${oddA}`)} 이고, ` +
        `${cm(f.side)}인 변이 나머지 한 변이면 길이가 같은 두 변은 각각 ` +
        `${expr(`(${f.total}-${f.side})\\div2=${pairB}`)} 입니다. 어느 쪽인지 말하지 ` +
        `않았으므로 두 가지를 다 생각해야 합니다.`,
      `앞의 경우 나머지 한 변은 ${cm(oddA)}이고, 뒤의 경우 나머지 한 변은 ` +
        `${cm(f.side)}입니다. 나머지 한 변이 ${cm(f.bar)}보다 ` +
        `${f.longer ? "길므로" : "짧으므로"} ${f.takeA ? "앞" : "뒤"}의 경우입니다. ` +
        `그러므로 길이가 같은 두 변의 길이의 합은 ` +
        `${f.takeA ? expr(`${f.side}\\times2=${pairSum}`) : expr(`${f.total}-${f.side}=${pairSum}`)} ` +
        `에서 ${cm(pairSum)}입니다.`,
    ],
  );
}

/**
 * **2-2-2 심화중의 밭** — 각 축에서 같은 마디를 연다. 2-2-1 과 **다른 것을 견준다**:
 * 저쪽은 변의 길이, 이쪽은 **크기가 같은 두 각의 합**이다.
 *
 *   ㉮ $a^\circ$ 가 나머지 한 각(꼭지각) → 같은 두 각은 각각 $(180-a)\div2$, 합 $180-a$
 *   ㉯ $a^\circ$ 가 같은 두 각 중 하나   → 나머지 한 각은 $180-2a$,        합 $2a$
 *
 * 🔴 **두 합의 순서가 $a=60^\circ$ 에서 뒤집힌다** — $a<60$ 이면 $2a<180-a$, $a>60$ 이면
 * 그 반대다. 그래서 「$s$보다 크다/작다」라는 **같은 문구가 무리마다 다른 가지**를 살린다.
 * 처음 판은 $a<60$ 만 담았고, 그러면 「크다 → ㉮」가 **100%** 인 지름길이 된다
 * (2-2-1 이 물린 그 자리 — `probe-elem-g4w4-shortcuts.ts` 가 잰다). 지금은 **65.3%** 다.
 *
 * ⚠️ 물음이 「가장 큰 각」이면 $a>60$ 무리에서 답이 $a$ 그 자체가 되어 **발문에 그대로**
 *    있게 된다(`answerPrintedOnPage`). 그래서 **두 무리에 다 서는** 물음 하나로 바꿨다 —
 *    「가장 큰 각과 가장 작은 각의 크기의 차」(㉮ 는 $|3a-180|\div2$, ㉯ 는 $|3a-180|$).
 * ⚠️ $180-a$ 가 짝수여야 하므로 $a$ 는 짝수다. $a=60$(정삼각형)은 두 가지가 하나로 겹쳐
 *    마디가 안 열리므로 뺀다. $a<90$ 이라야 ㉯ 의 나머지 한 각이 양수다.
 * ⚠️ $20^\circ$ 부터다 — 그보다 작은 각은 1-2 가 재는 각의 띠 밖이고, 두 합이 극단으로
 *    갈라져 문턱이 아무 일도 안 하는 것처럼 보인다.
 */
const ISO_ANGLE_FIELD: {
  given: number;
  bar: number;
  bigger: boolean;
  takeA: boolean;
}[] = (() => {
  const out: { given: number; bar: number; bigger: boolean; takeA: boolean }[] =
    [];
  for (let given = 20; given <= 88; given += 2) {
    if (given === 60) continue;
    const sumApex = 180 - given; // ㉮ 같은 두 각의 합
    const sumBase = 2 * given; // ㉯ 같은 두 각의 합
    const gapA = Math.abs(3 * given - 180) / 2; // ㉮ 최대−최소
    const gapB = Math.abs(3 * given - 180); // ㉯ 최대−최소
    if (!Number.isInteger(gapA) || gapA <= 0 || gapA === gapB) continue;
    // 답이 발문에 그대로 있으면 다른 축의 결함이 된다(`answerPrintedOnPage`).
    if (gapA === given || gapB === given) continue;
    const lo = Math.min(sumApex, sumBase);
    const hi = Math.max(sumApex, sumBase);
    for (let bar = lo + 1; bar < hi; bar += 1) {
      if (bar === gapA || bar === gapB) continue;
      out.push({ given, bar, bigger: true, takeA: sumApex > bar });
      out.push({ given, bar, bigger: false, takeA: sumApex < bar });
    }
  }
  return out;
})();

/** 세 각을 오름차순으로 — ㉮ 는 $(a,\,p,\,p)$, ㉯ 는 $(a,\,a,\,q)$ 다. */
function isoAngles(given: number, takeA: boolean): number[] {
  const three = takeA
    ? [given, (180 - given) / 2, (180 - given) / 2]
    : [given, given, 180 - 2 * given];
  return [...three].sort((x, y) => x - y);
}

/**
 * **2-2-2 5단 심화중 — 주어진 한 각이 «어느 쪽»인지 안 말한다.**
 *
 * 연산·기본·응용은 「크기가 같은 두 각」·「두 밑각」·「꼭지각」을 **말로 지목한다** —
 * 마디가 안 열린다. 여기서는 그 말을 지우고, 「크기가 같은 두 각의 합」이 문턱보다
 * 큰지 작은지 한 줄이 한 가지를 죽인다. 답(가장 큰 각과 가장 작은 각의 차)까지 가지
 * 않고 «합»만 견주어 닫으므로 중이다(D-115 ⑾).
 */
function tier222Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier222MidRaw(unit, rng));
}

function tier222MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const f = pick(rng, ISO_ANGLE_FIELD);
  const sumApex = 180 - f.given;
  const sumBase = 2 * f.given;
  const three = isoAngles(f.given, f.takeA);
  const small = three[0]!;
  const big = three[2]!;
  return makeDeep(
    unit,
    `이등변삼각형의 한 각의 크기가 ${deg(f.given)}입니다. 이 삼각형에서 크기가 같은 두 ` +
      `각의 크기의 합은 ${deg(f.bar)}보다 ${f.bigger ? "큽니다" : "작습니다"}. ` +
      `이 삼각형에서 가장 큰 각과 가장 작은 각의 크기의 차는 몇 도인가?`,
    deg(big - small),
    [
      `이등변삼각형은 크기가 같은 두 각이 있습니다. ${deg(f.given)}가 그 두 각 중 ` +
        `하나이면 두 각의 합은 ${expr(`${f.given}\\times2=${sumBase}`)} 이고, ` +
        `${deg(f.given)}가 나머지 한 각이면 두 각의 합은 ` +
        `${expr(`180-${f.given}=${sumApex}`)} 입니다.`,
      `그 합이 ${deg(f.bar)}보다 ${f.bigger ? "크므로" : "작으므로"} ${deg(f.given)}는 ` +
        `${f.takeA ? "나머지 한 각" : "크기가 같은 두 각 중 하나"}입니다. ` +
        `세 각의 크기는 ${three.map((v) => deg(v)).join(", ")}이므로 ` +
        `${expr(`${big}-${small}=${big - small}`)} 에서 ${deg(big - small)}입니다.`,
    ],
  );
}

/**
 * **2-5-2 심화중용 값 — 「처음으로 넘은 때」 앞에서 한 번 내려간다.**
 *
 * 심화하가 쓰는 `dipLineValues` 는 **오른 뒤** 내려간다. 그러면 「처음으로 넘은 때」의
 * 앞쪽이 늘 오름차순이라 **「바로 앞의 값」이 곧 답**이 되어 지름길이 100% 가 된다.
 * 여기서는 내림을 **넘은 때보다 앞**에 놓는다 — `v0 < v2 < v1 < v3 < v4` 라
 * 「$v_3$에서 처음 넘었다」면 앞쪽 최댓값은 **바로 앞($v_2$)이 아니라 $v_1$** 이다.
 *
 * 다섯 값이 모두 다르므로 「값이 $x$인 때」가 하나로 정해진다.
 */
function w4DipFirstValues(rng: Rng, theme: LineTheme): number[] {
  const up0 = intBetween(rng, 2, 5);
  const down = intBetween(rng, 1, up0 - 1);
  /*
   * 🔴 오르는 폭이 **값으로 $2$ 이상**이어야 한다. $1$ 이면 「그 어떤 수」가 될 수 있는
   * 수가 **하나뿐**이라 「가장 작은 수」라는 말이 빈말이 된다 — 마디가 안 열린다.
   * 걸음이 $1$ 인 소재(기온·무게)에서만 생기고, 실측으로 씨앗 600 중 **41자리**였다
   * (`probe-elem-g4w4-shortcuts.ts` 가 잡았다). 위쪽 $v_1-v_0$ 은 `up0 >= 2` 라
   * 저절로 $2$ 이상이므로 여기만 막으면 된다.
   */
  const lift = theme.step >= 2 ? 1 : 2;
  const up2 = intBetween(rng, down + lift, down + 4);
  const up3 = intBetween(rng, 1, 5);
  const first = intBetween(rng, theme.base[0], theme.base[1]) * theme.step;
  const v1 = first + up0 * theme.step;
  const v2 = v1 - down * theme.step;
  const v3 = v2 + up2 * theme.step;
  return [first, v1, v2, v3, v3 + up3 * theme.step];
}

/**
 * **2-5-2 5단 심화중 — 문턱을 안 준다.**
 *
 * 심화하는 문턱 $T$ 를 주고 「그때부터 마지막까지 몇 늘었나」를 묻는다(되짚기 한 번,
 * 마디마다 굳는다). 여기서는 **거꾸로** 늘어난 양만 주고 $T$ 를 묻는다 — $T$ 는
 * 하나로 굳지 않고 **구간**으로만 정해지며, 「처음으로」라는 말의 뜻(그 앞의 때는
 * 모두 넘지 않아야 한다)이 아래끝을 굳힌다.
 *
 * ⚠️ 「가장 **큰** 수」로 물으면 안 된다 — 그것은 $($마지막 값$)-D$ 그 자체라
 *    앞쪽을 한 번도 안 보고 100% 맞는다. 「가장 **작은** 수」여야 앞쪽 최댓값이 답이 된다.
 * ⚠️ 「$T$ 이상」이 아니라 「$T$를 넘은」으로 쓴다. 그러면 $T$ 가 앞쪽 최댓값과 **같아도**
 *    되므로 답이 $+1$ 이 아니라 그 값 자체가 되고, 「$T$ 는 자연수」라는 군더더기가 없다.
 */
function tier252Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return unlessForward(() => tier252MidRaw(unit, rng));
}

function tier252MidRaw(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const nums = w4DipFirstValues(rng, theme);
  // 「처음으로 넘은 때」가 될 수 있는 자리는 $1$ 과 $3$ 뿐이다 — $2$ 는 앞($v_1$)이 이미
  // 더 크고, $4$ 는 늘어난 양이 $0$ 이 되어 발문이 뜻을 잃는다.
  const at = pick(rng, [1, 3]);
  const last = nums[nums.length - 1]!;
  const grew = last - nums[at]!;
  const before = nums.slice(0, at);
  const peak = Math.max(...before);
  const peakAt = before.indexOf(peak);
  return makeDeep(
    unit,
    `${lineIntro(theme)} ${theme.topic}의 값이 처음으로 어떤 수를 넘은 때부터 마지막 ` +
      `때까지 값은 ${n(grew)}${theme.unit} 늘었습니다. 그 어떤 수가 될 수 있는 수 중 ` +
      `가장 작은 수는 몇 ${theme.unit}인가?`,
    `${n(peak)}${theme.unit}`,
    [
      `마지막 ${theme.labels[nums.length - 1]!.math}의 값은 ${n(last)}${theme.unit}이고 ` +
        `그때부터 ${n(grew)}${theme.unit} 늘었으므로, 처음으로 넘은 때의 값은 ` +
        `${expr(`${last}-${grew}=${nums[at]!}`)} 에서 ${n(nums[at]!)}${theme.unit}입니다. ` +
        `그 값을 가진 때는 ${theme.labels[at]!.math}입니다.`,
      `${josa(theme.labels[at]!.math, "이", "가")} 처음으로 넘은 때이려면 그 앞의 때들은 ` +
        `하나도 넘지 않아야 합니다. 앞의 때들 가운데 값이 가장 큰 때는 ` +
        `${theme.labels[peakAt]!.math}의 ${n(peak)}${theme.unit}이므로 어떤 수는 ` +
        `${n(peak)}${theme.unit} 이상이어야 하고, ${theme.labels[at]!.math}에서 넘어야 ` +
        `하므로 ${n(nums[at]!)}${theme.unit}보다 작아야 합니다. 그 사이는 ` +
        `${expr(`${nums[at]!}-${peak}=${nums[at]! - peak}`)} 만큼이고, 가장 작은 수는 ` +
        `${n(peak)}${theme.unit}입니다.`,
    ],
    lineFigure(theme, nums),
  );
}

/**
 * **2-5-3 심화상의 밭** — 표에서 값 **둘**을 지운다(꺾은선은 값을 못 가린다. 표만 된다).
 *
 * 지우는 자리는 **둘째 때와 마지막 때**다. 두 값의 합만 주면 짝이 여럿 남고, 그 짝을
 * 하나씩 **실제로 만들어 네 구간의 변화량을 다 구해** 견주어야 하나가 남는다 —
 * 후보를 발문이 주지 않고 되짚기가 만든다(D-115 심화상 정의).
 *
 * 밭은 걸음(`tableValues` 의 $1,2,3,4$ 순열) 24가지를 전수로 돌려 **후보가 셋 이상이고
 * 정확히 하나만 살아남는** 자리만 담는다. 실측 12/24 · 평균 후보 3.83 · 살아남는 것이
 * 후보 목록의 첫 2 · 가운데 4 · 끝 6 — **«끝을 집으면 맞는» 지름길이 없다**(보고서 §5).
 *
 * ⚠️ 값이 아니라 **걸음**으로 담는다. 첫 값(소재의 띠)을 더해도 부등식이 그대로라
 *    같은 밭이 모든 소재·모든 첫 값에 그대로 선다.
 * ⚠️ 답이 두 쪽(「$450$명, $950$명」)이라 `readRat` 이 못 읽는다 — 반증 ⑥ 축 **밖**이다.
 */
const TABLE_HIDE_FIELD: {
  gaps: number[];
  steep: number;
  cands: { lo: number; hi: number }[];
  answer: { lo: number; hi: number };
}[] = (() => {
  const perms: number[][] = [];
  const walk = (rest: number[], acc: number[]) => {
    if (acc.length === 4) {
      perms.push([...acc]);
      return;
    }
    for (const r of rest)
      walk(
        rest.filter((x) => x !== r),
        [...acc, r],
      );
  };
  walk([1, 2, 3, 4], []);
  const out: {
    gaps: number[];
    steep: number;
    cands: { lo: number; hi: number }[];
    answer: { lo: number; hi: number };
  }[] = [];
  for (const gaps of perms) {
    const v = [0];
    for (const g of gaps) v.push(v[v.length - 1]! + g);
    const sum = v[1]! + v[4]!;
    const gapsOf = (lo: number, hi: number) => {
      const w = [...v];
      w[1] = lo;
      w[4] = hi;
      return w.slice(1).map((t, i) => t - w[i]!);
    };
    const truth = gapsOf(v[1]!, v[4]!);
    const most = Math.max(...truth);
    if (truth.filter((t) => t === most).length !== 1) continue;
    const steep = truth.indexOf(most);
    const cands: { lo: number; hi: number }[] = [];
    for (let lo = v[0]! + 1; lo <= v[2]! - 1; lo += 1) {
      const hi = sum - lo;
      if (hi <= v[3]!) continue;
      cands.push({ lo, hi });
    }
    const alive = cands.filter((c) => {
      const q = gapsOf(c.lo, c.hi);
      return new Set(q).size === 4 && q[steep]! >= Math.max(...q);
    });
    if (cands.length < 3 || alive.length !== 1) continue;
    out.push({ gaps, steep, cands, answer: alive[0]! });
  }
  return out;
})();

/** 값 둘을 지운 표. 지운 칸은 $\square$ 대신 **글자 □** 로 둔다(표 칸은 KaTeX 가 아니다). */
function tableFigureHidden(
  theme: LineTheme,
  nums: readonly number[],
  hidden: readonly number[],
): Record<string, unknown> {
  return fig("table", {
    headers: ["구분", `${theme.short ?? theme.topic}(${theme.unit})`],
    rows: theme.labels.map((l, i) => [
      l.text,
      hidden.includes(i) ? "□" : String(nums[i] ?? ""),
    ]),
  });
}

/**
 * **2-5-3 6단 심화상 — 지워진 두 값을 만들어 견준다.**
 *
 * 심화중이 없는 소단원이다(보고서 §3): 값을 하나만 지우면 「눈금 한 칸으로
 * 나누어떨어진다」가 후보를 하나로 줄이려면 이웃 사이가 정확히 두 칸이어야 하고,
 * 그러면 답이 늘 **한가운데**라 지름길이 100% 가 된다.
 */
function tier253Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const theme = pick(rng, themeShare(unit, LINE_THEMES));
  const f = pick(rng, TABLE_HIDE_FIELD);
  /*
   * 🔴 **답이 발문에 그대로 있으면 안 된다.** 발문에는 때 이름의 수(「$10$일」)와 눈금 한
   * 칸이 찍히는데, 걸음이 작은 소재(강낭콩·비의 양, `step` $2$)에서는 지워진 값이 그 수와
   * **겹칠 수 있다** — 실측으로 씨앗 20260915 가 그랬다(답 $10\,$cm · 발문의 「$10$일」).
   * 씨앗 열여섯으로는 안 걸렸고 **200 으로 넓히자 나왔다.**
   * 그래서 첫 값을 고를 때 겹치지 않는 것만 고른다(다 겹치면 마지막 것을 쓴다 —
   * 조용히 던지면 그 씨앗의 갈래가 통째로 사라진다).
   */
  const printed = new Set<number>([theme.step]);
  for (const l of theme.labels) {
    for (const m of l.math.matchAll(/\d+/g)) printed.add(Number(m[0]));
  }
  const bases: number[] = [];
  for (let b = theme.base[0]; b <= theme.base[1]; b += 1) bases.push(b);
  const clean = bases.filter(
    (b) =>
      !printed.has((b + f.answer.lo) * theme.step) &&
      !printed.has((b + f.answer.hi) * theme.step),
  );
  const base = pick(rng, clean.length > 0 ? clean : bases);
  const cell = (v: number) => (base + v) * theme.step;
  const marks = [0];
  for (const g of f.gaps) marks.push(marks[marks.length - 1]! + g);
  const nums = marks.map(cell);
  const sum = cell(f.answer.lo) + cell(f.answer.hi);
  const at = (i: number) => theme.labels[i]!.math;
  // `unitJosa` 는 **단위까지 붙여** 돌려준다 — 앞에 `theme.unit` 을 또 쓰면 「$650$명명과」다.
  const and = unitJosa(theme.unit, "과", "와");
  const so = unitJosa(theme.unit, "이라", "라");
  const gapsOf = (lo: number, hi: number) => {
    const w = [...marks];
    w[1] = lo;
    w[4] = hi;
    return w.slice(1).map((t, i) => (t - w[i]!) * theme.step);
  };
  const shown = f.cands
    .map(
      (c) =>
        `${n(cell(c.lo))}${and} ` +
        `${expr(`${sum}-${cell(c.lo)}=${cell(c.hi)}`)} 에서 ${n(cell(c.hi))}${theme.unit}`,
    )
    .join(", ");
  const lines = f.cands.map((c) => {
    const q = gapsOf(c.lo, c.hi);
    const most = Math.max(...q);
    const same = new Set(q).size !== 4;
    const ok = !same && q[f.steep]! === most;
    return (
      `${n(cell(c.lo))}${and} ${n(cell(c.hi))}${theme.unit}이면 변화량이 ` +
      `차례로 ${q.map((g) => n(g)).join(", ")}${so} ` +
      (ok
        ? `네 구간이 서로 다르고 가장 가파른 구간도 ${josa(at(f.steep), "과", "와")} ` +
          `${at(f.steep + 1)} 사이입니다.`
        : same
          ? `같은 변화량이 생겨 알맞지 않습니다.`
          : `가장 가파른 구간이 ${josa(at(q.indexOf(most)), "과", "와")} ` +
            `${at(q.indexOf(most) + 1)} 사이가 되어 알맞지 않습니다.`)
    );
  });
  return makeDeep(
    unit,
    `${tableIntro(theme)} 그런데 ${josa(at(1), "과", "와")} ${at(4)}의 값이 지워졌습니다. ` +
      `값은 갈수록 커졌고, 지워진 두 값의 합은 ${n(sum)}${theme.unit}입니다. 이 표를 ` +
      `세로 눈금 한 칸이 ${n(theme.step)}${theme.unit}인 꺾은선그래프로 나타내면 다섯 점이 ` +
      `모두 눈금 위에 정확히 찍히고, 이웃한 두 때 사이의 변화량은 네 구간이 서로 모두 ` +
      `다르며, 선이 가장 가파른 구간은 ${josa(at(f.steep), "과", "와")} ` +
      `${at(f.steep + 1)} 사이입니다. 지워진 두 값을 각각 구하시오.`,
    `${n(cell(f.answer.lo))}${theme.unit}, ${n(cell(f.answer.hi))}${theme.unit}`,
    [
      `다섯 점이 모두 눈금 위에 찍히므로 지워진 값도 ` +
        `${n(theme.step)}${unitJosa(theme.unit, "으로", "로")} 나누어떨어집니다. 값이 ` +
        `갈수록 커지므로 ${at(1)}의 값은 ${n(nums[0]!)}${theme.unit}보다 크고 ` +
        `${n(nums[2]!)}${theme.unit}보다 작으며, ${at(4)}의 값은 ` +
        `${n(nums[3]!)}${theme.unit}보다 큽니다. 두 값의 합이 ${n(sum)}${theme.unit}이므로 ` +
        `될 수 있는 짝은 ${shown} 입니다.`,
      `짝마다 이웃한 두 때의 변화량을 구해 봅니다. ${lines.join(" ")} ` +
        `그러므로 지워진 두 값은 ${n(cell(f.answer.lo))}${and} ` +
        `${n(cell(f.answer.hi))}${theme.unit}입니다.`,
    ],
    tableFigureHidden(theme, nums, [1, 4]),
  );
}
