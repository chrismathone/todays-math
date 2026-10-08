/**
 * **형식 필터가 라벨과 같은 답을 내는가** — 원장님 지시 2026-08-26
 * (「유형에 단답형 추가 · [단] 을 거를 수 있게 · [서] 도 서술형 필터에」).
 *
 * ## 왜 이 시험이 필요한가
 *
 * 화면 라벨 `[객][단][서][?형식]` 은 **파생값**이다 — `classifyFormat` 이 본문을 파싱해
 * 보기 칸 수를 세고, 거기에 `answer`·`questionType`·`familyKey`·`problemType` 을 함께 본다.
 * 그런데 `/api/problems` 는 **서버에서 거르고 페이지를 나눈다.** 본문 파싱은 SQL 로 옮길
 * 수 없고, 전량(47,797행)을 메모리로 끌어올 수도 없다.
 *
 * 그래서 판정을 **셋으로 가른다**:
 *
 *   ㉠ `formatWithoutContent` — 본문을 안 봐도 답이 정해지는 자리. 그대로 쓴다.
 *   ㉡ `formatSuperset`       — 「이 형식일 수 있는 행」. SQL 이 이만큼만 긁어 온다.
 *   ㉢ 나머지                  — 본문을 실제로 읽어 `classifyFormat` 을 부른다(실측 ~50행).
 *
 * ㉠㉡ 은 `classifyFormat` 의 규칙을 **다시 적은 것**이다. 두 벌이 갈리면 필터와 라벨이
 * 갈리고, 그것은 원장님의 최우선 규칙(「모든 화면에서 모든 문제가 똑같은 규칙으로 똑같이
 * 보여야 한다」)을 깨는 것이다. 그래서 여기서 **입력 공간을 전수로 돌며** 둘을 맞댄다.
 *
 * ## 음성 대조군을 같이 둔다
 *
 * 「㉠이 값을 내면 맞다」만 재면 **㉠이 늘 `null` 을 내도 전량 초록**이다(그러면 ㉢이
 * 47,797행이 되어 제품이 못 쓰는데 시험은 아무 말도 안 한다). 「후보 집합이 답을 다 담는가」만
 * 재면 **후보가 «전부»여도 초록**이다. 그래서 반대쪽을 같이 못 박는다:
 *
 *   · ㉠이 `null` 이면 **보기 칸 수에 따라 판정이 실제로 갈려야** 한다(과잉 null 금지)
 *   · 후보 집합 **밖**인 조합이 존재해야 한다(트리비얼 금지)
 *   · 후보 집합 **안**의 조합은 어떤 보기 칸 수에서는 그 형식이 되어야 한다(헐거움 금지)
 *
 * (CLAUDE.md 2026-08-20 「판정자의 성적표에는 양성과 음성 대조군이 둘 다 있어야 한다」)
 *
 * ## 이 시험이 못 보는 것
 *
 * Prisma `where` 조각(`FORMAT_SUPERSET_WHERE`)이 `formatSuperset` 과 **같은 행을 고르는가**
 * 는 여기서 못 잰다 — SQL 의 NULL 삼값논리는 JS 와 다르다. 그것은 공유 DB 전량에 대고
 * `scripts/qa/probe-format-filter.ts --superset` 이 잰다.
 */
import { describe, expect, it } from "vitest";

import { problemFormatFilterSchema } from "@/contracts/problem.contract";
import {
  PROBLEM_FILTER_OPTIONS,
  splitProblemFilterValue,
} from "@/components/problem/labels";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import {
  classifyFormat,
  classifyFormatWithChoices,
  FILTERABLE_FORMATS,
  FORMAT_COND_EXERCISE,
  FORMAT_SUPERSET_WHERE,
  formatSuperset,
  toPrismaWhere,
  formatWithoutContent,
  PROBLEM_FORMATS,
  type FormatEvidence,
} from "@/lib/problem/provenance";

/**
 * 판정이 실제로 갈리는 보기 칸 수. `0` · `1` · `2 이상` 셋이 `classifyFormat` 의 가지를
 * 전부 밟는다(`choices >= 2` · `choices === 0` · 그 사이).
 *
 * ⚠️ 파서(`parseProblemContent`)는 **1칸을 안 낸다**(마커가 하나면 0칸으로 떨어진다 —
 *    아래 「배선」 시험이 실측으로 못 박는다). 그래서 칸 수를 **직접 넘기는**
 *    `classifyFormatWithChoices` 로 전수를 돈다 — 본문 문자열로만 돌면 `1` 이라는
 *    가지가 시험에 **아예 없어**지고, 없는 축은 변이시킬 수 없다.
 */
const CHOICE_COUNTS = [0, 1, 2, 5] as const;

/** 정답 칸 두 갈래 — 보기 번호가 든 것과 아닌 것. 이 축이 객관식 가지를 연다. */
const ANSWERS = ["12", "①"] as const;

const QUESTION_TYPES = [null, "", "객관식", "단답형", "서술형"] as const;
const PROBLEM_TYPES = [null, "계산", "개념", "활용", "서술형"] as const;
const FAMILY_KEYS = [
  null,
  "solo:abc",
  "elem:초6|2-5-1|연산",
  "mid:3-1|근호|06",
  // 고등 유형 엔진(2026-10-08) — 접두사 목록에 든 것은 전부 입력 공간에 둔다
  "high:공통수학1|항등식과 나머지정리|03",
] as const;

/** 입력 공간 전수 — 4 × 2 × 5 × 5 × 5 = 1,000 조합. */
function everyEvidence(): FormatEvidence[] {
  const rows: FormatEvidence[] = [];
  for (const answer of ANSWERS) {
    for (const questionType of QUESTION_TYPES) {
      for (const problemType of PROBLEM_TYPES) {
        for (const familyKey of FAMILY_KEYS) {
          rows.push({ answer, questionType, problemType, familyKey });
        }
      }
    }
  }
  return rows;
}

function describeEvidence(ev: FormatEvidence): string {
  return `answer=${ev.answer} qt=${ev.questionType ?? "null"} pt=${ev.problemType ?? "null"} family=${ev.familyKey ?? "null"}`;
}

describe("[형식 필터] ㉠ 본문 없이 확정할 수 있는 자리", () => {
  it("입력 공간이 실제로 갈린다 — 보기 칸 수가 판정을 바꾸는 조합이 있다", () => {
    // 음성 대조: 이게 0이면 아래 시험들이 전부 「아무것도 안 가르는」 공간 위에 선다.
    const splits = everyEvidence().filter((ev) => {
      const verdicts = new Set(
        CHOICE_COUNTS.map((n) => classifyFormatWithChoices(n, ev)),
      );
      return verdicts.size > 1;
    });
    expect(splits.length).toBeGreaterThan(0);
    // 그리고 «안 갈리는» 조합도 있어야 한다 — 전부 갈리면 ㉠ 이 존재할 수 없다.
    expect(splits.length).toBeLessThan(everyEvidence().length);
  });

  it("값을 내면 보기 칸 수가 몇이든 classifyFormat 과 같다 (전수)", () => {
    const wrong: string[] = [];
    for (const ev of everyEvidence()) {
      const decided = formatWithoutContent(ev);
      if (decided === null) continue;
      for (const n of CHOICE_COUNTS) {
        const actual = classifyFormatWithChoices(n, ev);
        if (actual !== decided) {
          wrong.push(
            `보기 ${n}칸 · ${describeEvidence(ev)} → ${actual} ≠ ${decided}`,
          );
        }
      }
    }
    expect(wrong).toEqual([]);
  });

  it("null 을 내면 보기 칸 수에 따라 판정이 **실제로** 갈린다 (과잉 null 금지)", () => {
    // 음성 대조: 이 시험이 없으면 `formatWithoutContent = () => null` 이 전량 초록이다.
    const overCautious: string[] = [];
    for (const ev of everyEvidence()) {
      if (formatWithoutContent(ev) !== null) continue;
      const verdicts = new Set(
        CHOICE_COUNTS.map((n) => classifyFormatWithChoices(n, ev)),
      );
      if (verdicts.size === 1) overCautious.push(describeEvidence(ev));
    }
    expect(overCautious).toEqual([]);
  });

  it("후보 집합 안에서도 본문 없이 정해지는 자리가 있다 — 기제가 죽지 않았다", () => {
    // ⚠️ 「전체의 절반 이상」으로 재면 안 된다. 이 열거는 정답 축을 **반반**으로 만들어
    //    놓았는데, 실제 후보 집합에서 정답에 보기 번호가 든 행은 단답형 3,146 중 20
    //    (0.6%)·서술형 7,819 중 16 뿐이다. 「몇 %가 본문을 읽나」는 데이터가 정하는
    //    값이라 여기서 못 잰다 — `scripts/qa/probe-format-filter.ts` 가 잰다.
    for (const format of FILTERABLE_FORMATS) {
      const inSuperset = everyEvidence().filter((ev) =>
        formatSuperset(ev, format),
      );
      const decided = inSuperset.filter(
        (ev) => formatWithoutContent(ev) !== null,
      );
      expect(
        decided.length,
        `${format} — 본문 없이 정해지는 후보`,
      ).toBeGreaterThan(0);
      expect(inSuperset.length, `${format} 후보`).toBeGreaterThan(0);
    }
  });
});

describe("[형식 필터] 배선 — classifyFormat 이 파서의 칸 수를 그대로 넘긴다", () => {
  const body = "다음 중 옳은 것을 고르시오.";
  const marks = ["①", "②", "③", "④", "⑤"] as const;
  const withChoices = (n: number) =>
    n === 0
      ? body
      : `${body}\n${Array.from({ length: n }, (_, i) => `${marks[i]} 보기 ${i + 1}`).join("\n")}`;

  it("본문으로 부른 답이 칸 수를 직접 넘긴 답과 같다", () => {
    for (const n of [0, 2, 5]) {
      const content = withChoices(n);
      const parsed = parseProblemContent(content).choices.length;
      for (const ev of everyEvidence()) {
        expect(classifyFormat({ ...ev, content })).toBe(
          classifyFormatWithChoices(parsed, ev),
        );
      }
    }
  });

  it("파서는 마커가 하나뿐이면 0칸을 낸다 — 그래서 1칸은 본문으로 못 만든다", () => {
    // 이 사실이 바뀌면 위 CHOICE_COUNTS 주석이 거짓이 된다. 바뀌는 날 여기가 빨개진다.
    expect(parseProblemContent(`${body}\n① 보기 1`).choices.length).toBe(0);
    expect(parseProblemContent(withChoices(2)).choices.length).toBe(2);
  });
});

describe("[형식 필터] ㉡ 후보 집합", () => {
  it("라벨이 그 형식이면 반드시 후보 집합 안에 있다 (전수)", () => {
    const missed: string[] = [];
    for (const format of FILTERABLE_FORMATS) {
      for (const ev of everyEvidence()) {
        for (const n of CHOICE_COUNTS) {
          if (classifyFormatWithChoices(n, ev) !== format) continue;
          if (!formatSuperset(ev, format)) {
            missed.push(`${format} · 보기 ${n}칸 · ${describeEvidence(ev)}`);
          }
        }
      }
    }
    expect(missed).toEqual([]);
  });

  it("후보 집합이 «전부»가 아니다 (트리비얼 금지)", () => {
    // 음성 대조: `formatSuperset = () => true` 면 위 시험은 초록인데 서버는 전량을 긁는다.
    for (const format of FILTERABLE_FORMATS) {
      const outside = everyEvidence().filter(
        (ev) => !formatSuperset(ev, format),
      );
      expect(outside.length, `${format} 후보 밖 조합`).toBeGreaterThan(0);
    }
  });

  it("후보 집합 안의 조합은 **어떤 정답·보기 칸 수**에서는 그 형식이 된다 (헐거움 금지)", () => {
    // 후보 집합은 SQL 이 그대로 쓸 조건이라 `answer`(정답에 보기 번호가 있나)를 **안 본다**
    // — 40여 개 원문자를 `LIKE` 로 흩어 세는 조건은 전량 훑기를 한 번 더 만든다. 그래서
    // 헐거움도 정답 축을 **열어 놓고** 잰다: 「어떤 정답·어떤 칸 수로도 그 형식이 될 수
    // 없는 조합」이 후보에 있으면 그건 순수한 낭비다.
    const useless: string[] = [];
    for (const format of FILTERABLE_FORMATS) {
      for (const ev of everyEvidence()) {
        if (!formatSuperset(ev, format)) continue;
        const reachable = ANSWERS.some((answer) =>
          CHOICE_COUNTS.some(
            (n) => classifyFormatWithChoices(n, { ...ev, answer }) === format,
          ),
        );
        if (!reachable) useless.push(`${format} · ${describeEvidence(ev)}`);
      }
    }
    expect(useless).toEqual([]);
  });

  it("두 형식의 후보 집합이 서로 겹치지 않는다", () => {
    // 겹치면 「단답형으로 걸러도 서술형이 섞여 나올 수 있다」는 뜻이라 라벨과 갈린다.
    const both = everyEvidence().filter(
      (ev) =>
        formatSuperset(ev, "short_answer") && formatSuperset(ev, "descriptive"),
    );
    expect(both.map(describeEvidence)).toEqual([]);
  });
});

describe("[형식 필터] 판정이 **실제로 무엇을 내나** — 기대값을 손으로 적는다", () => {
  /**
   * ⚠️ 위 전수 시험들은 ㉠㉡ 이 `classifyFormat` 과 **서로 맞는가**만 본다. 셋이 같은
   *    `isEngineFamily`·같은 조건 기술을 쓰므로 **셋을 한꺼번에 옮기는 변이는 구조적으로
   *    안 잡힌다.** 실제로 「엔진 접두사 목록에서 `mid:` 를 뺀다」 변이가 **전량 초록**
   *    이었다(2026-08-26 변이 시험). 판정의 «참»이 판정기 자신에게서 온 것이다.
   *
   *    그래서 여기서는 기대값을 **명세에서 손으로** 적는다 — 이 표는 `classifyFormat`
   *    이 무엇을 하든 안 바뀐다. 값이 갈리면 둘 중 하나가 틀린 것이고, 그때 사람이 본다.
   */
  const PINNED: [number, FormatEvidence, string][] = [
    // 보기 없음 · 정답이 번호 아님 — `questionType` 이 그대로 답이다
    [
      0,
      {
        answer: "7",
        questionType: "단답형",
        problemType: "계산",
        familyKey: null,
      },
      "short_answer",
    ],
    [
      0,
      {
        answer: "7",
        questionType: "서술형",
        problemType: "계산",
        familyKey: null,
      },
      "descriptive",
    ],
    // 엔진 표지 — **접두사 셋 다** 단답형이어야 한다(목록에서 하나를 빼면 여기가 빨개진다)
    [
      0,
      {
        answer: "7",
        questionType: null,
        problemType: "계산",
        familyKey: "high:공통수학1|x|03",
      },
      "short_answer",
    ],
    [
      0,
      {
        answer: "7",
        questionType: null,
        problemType: "계산",
        familyKey: "elem:초6|x|연산",
      },
      "short_answer",
    ],
    [
      0,
      {
        answer: "7",
        questionType: null,
        problemType: "계산",
        familyKey: "mid:3-1|y|06",
      },
      "short_answer",
    ],
    // 엔진이 아니면 되짚을 근거가 없다 — 지어내지 않고 미분류
    [
      0,
      {
        answer: "7",
        questionType: null,
        problemType: "계산",
        familyKey: "solo:abc",
      },
      "unknown",
    ],
    // `questionType` 이 없을 때만 `problemType` 을 되짚는다
    [
      0,
      {
        answer: "7",
        questionType: null,
        problemType: "서술형",
        familyKey: null,
      },
      "descriptive",
    ],
    [
      0,
      {
        answer: "7",
        questionType: "객관식",
        problemType: "서술형",
        familyKey: null,
      },
      "unknown",
    ],
    // 보기가 둘 이상이고 정답이 번호면 객관식 — **본문이 `questionType` 을 이긴다**
    [
      5,
      { answer: "①", questionType: null, problemType: "개념", familyKey: null },
      "multiple_choice",
    ],
    [
      5,
      {
        answer: "①",
        questionType: "단답형",
        problemType: "계산",
        familyKey: null,
      },
      "multiple_choice",
    ],
    // 정답이 번호인데 보기가 없다 — 객관식이 아니고, `questionType` 을 믿는다
    [
      0,
      {
        answer: "①",
        questionType: "단답형",
        problemType: "계산",
        familyKey: null,
      },
      "short_answer",
    ],
    // 보기는 있는데 정답이 번호가 아니다 — 「몇 개인지 구하시오」 부류
    [
      5,
      { answer: "3", questionType: null, problemType: "개념", familyKey: null },
      "unknown",
    ],
  ];

  it.each(PINNED)("보기 %i칸 · %o → %s", (choices, ev, expected) => {
    expect(classifyFormatWithChoices(choices, ev)).toBe(expected);
  });

  it("후보 집합도 손으로 적은 기대값과 맞는다", () => {
    // 엔진 표지 셋이 **모두** 단답형 후보여야 한다 — 목록이 줄면 여기가 빨개진다.
    for (const familyKey of [
      "elem:초6|x|연산",
      "mid:3-1|y|06",
      "high:공통수학1|x|03",
    ]) {
      const ev: FormatEvidence = {
        answer: "7",
        questionType: null,
        problemType: "계산",
        familyKey,
      };
      expect(formatSuperset(ev, "short_answer"), familyKey).toBe(true);
      expect(formatSuperset(ev, "descriptive"), familyKey).toBe(false);
    }
  });
});

describe("[형식 필터] 조건을 Prisma 로 뽑는 자리 — 널을 잃지 않는가", () => {
  /**
   * 🔴 SQL 에서 `question_type <> '서술형'` 은 **널 행에 대해 참이 아니다.** 그냥 뒤집으면
   *    널인 행이 통째로 빠지는데 **에러가 안 난다.** 이 결함은 단위·라우트·화면 시험이
   *    구조적으로 못 본다 — 가짜 서버는 JS 판정을 쓰고, 시험 대역의 `NOT` 은 JS 의미다.
   *    실제로 그 변이가 전량 초록이었다(2026-08-26). 그래서 **뽑아 낸 조각의 모양**을 직접 잰다.
   */
  type Node = Record<string, unknown>;

  /** `NOT` 이 나오면, **같은 `OR` 안에 그 칸의 널 갈래**가 있어야 한다. */
  function notesWithoutNullEscape(
    node: unknown,
    insideOr: Node[] = [],
  ): string[] {
    if (node === null || typeof node !== "object") return [];
    const obj = node as Node;
    const bad: string[] = [];
    if (Array.isArray(obj)) {
      for (const child of obj)
        bad.push(...notesWithoutNullEscape(child, insideOr));
      return bad;
    }
    for (const [key, value] of Object.entries(obj)) {
      if (key === "OR" && Array.isArray(value)) {
        for (const child of value) {
          bad.push(...notesWithoutNullEscape(child, value as Node[]));
        }
        continue;
      }
      if (key === "NOT") {
        const col = Object.keys(value as Node)[0]!;
        const hasNull = insideOr.some(
          (sibling) => sibling && (sibling as Node)[col] === null,
        );
        if (!hasNull) bad.push(`NOT ${col} 옆에 널 갈래가 없다`);
        continue;
      }
      bad.push(...notesWithoutNullEscape(value, insideOr));
    }
    return bad;
  }

  it.each(FILTERABLE_FORMATS)(
    "%s 후보 where 의 모든 NOT 이 널을 살려 둔다",
    (format) => {
      expect(notesWithoutNullEscape(FORMAT_SUPERSET_WHERE[format])).toEqual([]);
    },
  );

  it("검사기 자신이 «아니오»를 낼 수 있다 — 널 갈래를 지운 조각은 걸린다", () => {
    // 음성 대조: 이게 없으면 위 시험은 「NOT 이 아예 없어도」 초록이다.
    const broken = {
      OR: [{ questionType: "" }, { NOT: { questionType: "서술형" } }],
    };
    expect(notesWithoutNullEscape(broken)).not.toEqual([]);
  });

  it("후보 where 에 NOT 이 **실제로 들어 있다** — 없으면 위 시험이 공허하다", () => {
    expect(JSON.stringify(FORMAT_SUPERSET_WHERE)).toContain('"NOT"');
  });

  it("널 갈래를 낸 자리는 **빈 문자열 갈래도** 같이 낸다", () => {
    // JS 는 `!row.questionType` 로 널과 빈 문자열을 **같이** 「비었다」로 본다.
    // SQL 쪽이 널만 보면 그 둘이 갈리는데, 오늘 DB 에 빈 문자열이 0건이라
    // **실데이터 대조로도 안 잡힌다** — 구조로 잠근다.
    const missing: string[] = [];
    const walk = (node: unknown): void => {
      if (node === null || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      for (const [key, value] of Object.entries(
        node as Record<string, unknown>,
      )) {
        if (key === "OR" && Array.isArray(value)) {
          for (const child of value) {
            const col = Object.entries(child ?? {}).find(
              ([, v]) => v === null,
            )?.[0];
            if (
              col &&
              !value.some((s) => (s as Record<string, unknown>)?.[col] === "")
            ) {
              missing.push(`${col}: 널 갈래는 있는데 빈 문자열 갈래가 없다`);
            }
          }
        }
        walk(value);
      }
    };
    for (const format of FILTERABLE_FORMATS)
      walk(FORMAT_SUPERSET_WHERE[format]);
    walk(toPrismaWhere(FORMAT_COND_EXERCISE));
    expect(missing).toEqual([]);
  });

  /**
   * 🔴 **연습 조건이 있어야 하는 이유.** 변이 시험이 `toPrismaWhere` 의 「비어 있지 않다」
   *    가지를 망가뜨렸는데 판정이 **거부**됐다 — 후보 조건 둘 중 어느 것도 그 가지를 안
   *    밟아서 산출물이 안 바뀌었기 때문이다(2026-08-26). 즉 **아무도 안 지키는 코드**였다.
   *    그래서 모든 가지를 밟는 연습 조건을 두고, 그 산출물을 여기서 **글자 그대로** 못 박는다.
   */
  it("뽑아 내는 함수의 모든 가지가 기대한 SQL 모양을 낸다", () => {
    expect(toPrismaWhere(FORMAT_COND_EXERCISE)).toEqual({
      AND: [
        // empty — 널이거나 빈 문자열
        { OR: [{ questionType: null }, { questionType: "" }] },
        // not(empty) — 널도 빈 문자열도 아니어야 한다
        { AND: [{ NOT: { problemType: null } }, { NOT: { problemType: "" } }] },
        // or(eq, prefix)
        {
          OR: [
            { questionType: "서술형" },
            { familyKey: { startsWith: "elem:" } },
          ],
        },
        // not(eq) — 널·빈 값은 «그 값이 아니다» 쪽이다
        {
          OR: [
            { problemType: null },
            { problemType: "" },
            { NOT: { problemType: "서술형" } },
          ],
        },
        // not(prefix)
        {
          OR: [
            { familyKey: null },
            { familyKey: "" },
            { NOT: { familyKey: { startsWith: "mid:" } } },
          ],
        },
      ],
    });
  });

  it("연습 조건이 **모든 가지를 실제로 밟는다** — 하나라도 빠지면 위 시험이 그만큼 눈이 먼다", () => {
    // 음성 대조: 연습 조건이 쪼그라들면 잠그는 범위도 같이 쪼그라드는데 초록은 그대로다.
    const kinds = new Set<string>();
    const walk = (cond: { kind: string; of?: unknown }): void => {
      kinds.add(cond.kind);
      if (cond.kind === "not")
        return void kinds.add(`not:${(cond.of as { kind: string }).kind}`);
      if (Array.isArray(cond.of)) {
        for (const child of cond.of)
          walk(child as { kind: string; of?: unknown });
      }
    };
    walk(FORMAT_COND_EXERCISE as unknown as { kind: string; of?: unknown });
    expect([...kinds].sort()).toEqual(
      [
        "and",
        "empty",
        "eq",
        "not",
        "not:empty",
        "not:eq",
        "not:prefix",
        "or",
        "prefix",
      ].sort(),
    );
  });
});

describe("[형식 필터] 「유형」 드롭다운이 서술형을 **형식 축**으로 보낸다", () => {
  /**
   * 🔴 원장님이 시킨 것의 핵심이 이 한 줄이다 — 「`[서]` 도 서술형 필터에」.
   *    되돌려도(서술형을 `problemType` 축으로) 라벨 글자는 그대로라서 화면 시험이
   *    안 울었다(2026-08-26 변이 시험 초록). 그래서 **어느 축으로 나가는지**를 직접 잰다.
   */
  it("계산·개념·활용은 problemType, 단답형·서술형은 format 으로 나간다", () => {
    const byLabel = Object.fromEntries(
      PROBLEM_FILTER_OPTIONS.map((o) => [
        o.label,
        splitProblemFilterValue(o.value),
      ]),
    );
    expect(byLabel["계산"]).toEqual({ problemType: "계산" });
    expect(byLabel["개념"]).toEqual({ problemType: "개념" });
    expect(byLabel["활용"]).toEqual({ problemType: "활용" });
    expect(byLabel["단답형"]).toEqual({ format: "short_answer" });
    expect(byLabel["서술형"]).toEqual({ format: "descriptive" });
  });

  it("드롭다운에 `problemType='서술형'` 갈래가 **없다**", () => {
    // 있으면 「유형=서술형」이 라벨 `[서]` 아닌 행을 다시 끌고 온다.
    expect(PROBLEM_FILTER_OPTIONS.map((o) => o.value)).not.toContain(
      "type:서술형",
    );
  });

  it("두 축이 정말 다른 것을 가리킨다 — 실측 278건이 이 모양이다", () => {
    /**
     * 공유 DB 전량(47,797건) 교차표: `problem_type='서술형'` 8,037건 중
     *   `[서]` 7,755 · **`[단]` 278** · `[객]` 4
     * 아래 행이 그 **278건의 모양**이다. 두 축을 같은 것으로 두면 이 행이
     * 「유형=서술형」에 딸려 나오는데, 화면에는 `[단]` 이라고 찍혀 있다.
     */
    const 그_278건의_모양: FormatEvidence = {
      answer: "7",
      questionType: "단답형",
      problemType: "서술형",
      familyKey: null,
    };
    expect(classifyFormatWithChoices(0, 그_278건의_모양)).toBe("short_answer");
    expect(formatSuperset(그_278건의_모양, "descriptive")).toBe(false);
    expect(formatSuperset(그_278건의_모양, "short_answer")).toBe(true);
  });
});

describe("[형식 필터] 계약이 아는 갈래", () => {
  it("계약 열거값이 FILTERABLE_FORMATS 와 **양방향으로** 같다", () => {
    // ⚠️ 타입은 배열 길이를 안 센다(2026-08-25). 값이 늘면 한쪽만 늘어도 컴파일은 통과한다.
    expect([...problemFormatFilterSchema.options].sort()).toEqual(
      [...FILTERABLE_FORMATS].sort(),
    );
  });

  it("서버가 정확히 못 내는 갈래는 계약이 거부한다 — 조용히 0건이 되지 않게", () => {
    const notFilterable = PROBLEM_FORMATS.filter(
      (f) => !(FILTERABLE_FORMATS as readonly string[]).includes(f),
    );
    // 「객관식·형식 미분류」는 후보 집합이 34,138행/47,797행이라 이 방식으로 못 낸다.
    expect(notFilterable.sort()).toEqual(["multiple_choice", "unknown"]);
    for (const kind of notFilterable) {
      expect(problemFormatFilterSchema.safeParse(kind).success).toBe(false);
    }
  });
});
