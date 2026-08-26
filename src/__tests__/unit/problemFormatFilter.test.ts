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
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import {
  classifyFormat,
  classifyFormatWithChoices,
  FILTERABLE_FORMATS,
  formatSuperset,
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
] as const;

/** 입력 공간 전수 — 4 × 2 × 5 × 5 × 4 = 800 조합. */
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
