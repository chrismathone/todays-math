/**
 * 🔴→🟢 AI 생성물의 **형식(`questionType`)** — 원장님 지적 2026-08-26
 * 「AI 로 생성된 문항이 `[?형식]` 으로 나온다」.
 *
 * 대응 구현: src/lib/ai/questionType.ts · src/lib/ai/generator.ts
 *            · src/app/api/problems/generate/route.ts
 *
 * ## 무엇이 결함이었나
 *
 * AI 생성 경로가 `questionType` 을 **한 번도 안 적었다**. `classifyFormat`
 * (`src/lib/problem/provenance.ts`)은 주관식일 때 ㉠ `questionType` 이
 * 단답형/서술형이거나 ㉡ `familyKey` 가 `elem:`/`mid:` 이거나 ㉢ `questionType` 이
 * null 이고 `problemType` 이 `서술형` 일 때만 갈래를 정한다. AI 문항은
 * `familyKey` 가 `solo:<uuid>` 라 ㉡ 도 아니어서 **`unknown` 으로 떨어진다.**
 *
 * ## 픽스처는 «고치기 전» 실측이다 — 다시 찍지 마라
 *
 * `fixtures/aiGeneratedRows.json` 은 2026-08-26 공유 DB 의 `source=ai_generated`
 * **10행 전량**이다(`questionType` 이 전부 null 인 그 상태). 이 파일의 쓸모는
 * 「원장님이 본 그 행들이 실제로 `[?형식]` 이었다」는 **증거**다. 백필 뒤에 다시
 * 찍으면 그 증거가 사라지고, 아래 두 시험은 아무것도 지키지 않게 된다.
 */
import { describe, expect, it } from "vitest";

import { deriveQuestionType } from "@/lib/ai/questionType";
import { classifyFormat } from "@/lib/problem/provenance";

import AI_ROWS from "../fixtures/aiGeneratedRows.json";

/** `classifyFormat` 에 넘길 최소 모양 — 판정에 안 쓰는 컬럼은 빈 값이다. */
function asProvenanceInput(row: {
  content: string;
  answer: string;
  problemType: string;
  questionType: string | null;
}) {
  return {
    source: "ai_generated",
    familyKey: "solo:00000000-0000-4000-8000-000000000000",
    originProblemId: null,
    figureUrls: [] as string[],
    figureSvg: null,
    content: row.content,
    answer: row.answer,
    questionType: row.questionType,
    problemType: row.problemType,
  };
}

describe("deriveQuestionType — 생성물이 실제로 쓴 글에서 형식을 읽는다", () => {
  it("보기가 없고 정답이 짧으면 단답형이다", () => {
    expect(
      deriveQuestionType({
        content: "$2^4\times 3^2\times 5$의 약수의 개수를 구하시오.",
        answer: "30",
        problemType: "계산",
      }),
    ).toBe("단답형");
  });

  it("problemType 이 서술형이면 서술형이다", () => {
    expect(
      deriveQuestionType({
        content: "$72$를 어떤 자연수로 나누는 이유를 설명하시오.",
        answer: "2",
        problemType: "서술형",
      }),
    ).toBe("서술형");
  });

  it("보기가 둘 이상이고 정답이 보기 번호면 객관식이다", () => {
    expect(
      deriveQuestionType({
        content: "다음 중 소수는?\n① 4\n② 6\n③ 7\n④ 8\n⑤ 9",
        answer: "③",
        problemType: "개념",
      }),
    ).toBe("객관식");
  });

  it("보기가 있어도 정답이 보기 번호가 아니면 단답형이다 — 「몇 개인지 구하시오」 유형", () => {
    expect(
      deriveQuestionType({
        content: "다음 중 소수는 모두 몇 개인가?\n① 4\n② 6\n③ 7\n④ 8\n⑤ 9",
        answer: "1",
        problemType: "개념",
      }),
    ).toBe("단답형");
  });

  it("비표준 원문자 계열(➂ U+2782)도 보기 번호로 읽는다", () => {
    // 원문자 목록을 손으로 `①~⑤` 라고 적으면 이 부류가 조용히 단답형이 된다.
    // 계열은 정본(`ANSWER_CIRCLED_CLASS`)에서 와야 한다 — `circledNumber.ts` 가
    // 이미 겪은 자리다(「➀ 계열이 든 행이 «원문자가 없다»로 읽히던 전례」).
    expect(
      deriveQuestionType({
        content: "다음 중 옳은 것은?\n① 4\n② 6\n③ 7\n④ 8\n⑤ 9",
        answer: "➂",
        problemType: "개념",
      }),
    ).toBe("객관식");
  });

  it("보기가 있고 정답이 보기 번호면 problemType 이 서술형이어도 객관식이다 — 지면이 곧 근거다", () => {
    expect(
      deriveQuestionType({
        content: "다음 중 옳은 것은?\n① 4\n② 6\n③ 7\n④ 8\n⑤ 9",
        answer: "②",
        problemType: "서술형",
      }),
    ).toBe("객관식");
  });
});

describe("판정과 기록이 **같은 것**을 본다 — classifyFormat 왕복", () => {
  /**
   * 이 시험이 진짜 가드다. `deriveQuestionType` 이 적는 값과 `classifyFormat` 이
   * 읽는 규칙이 갈리면 여기서 빨개진다 — 규칙이 두 벌이 되는 것을 막는다
   * (provenance.ts 는 이 트랙이 **읽기만** 하므로 텍스트로 맞출 수 없다).
   */
  const CASES = [
    {
      content: "약수의 개수를 구하시오.",
      answer: "30",
      problemType: "계산",
      format: "short_answer",
    },
    {
      content: "이유를 설명하시오.",
      answer: "2",
      problemType: "서술형",
      format: "descriptive",
    },
    {
      content: "다음 중 소수는?\n① 4\n② 6\n③ 7\n④ 8\n⑤ 9",
      answer: "③",
      problemType: "개념",
      format: "multiple_choice",
    },
    {
      content: "다음 중 소수는 모두 몇 개인가?\n① 4\n② 6\n③ 7\n④ 8\n⑤ 9",
      answer: "1",
      problemType: "개념",
      format: "short_answer",
    },
  ] as const;

  for (const c of CASES) {
    it(`«${c.content.slice(0, 14)}…» → ${c.format}`, () => {
      const questionType = deriveQuestionType(c);
      expect(classifyFormat(asProvenanceInput({ ...c, questionType }))).toBe(
        c.format,
      );
    });
  }
});

describe("실측 10행 — 원장님이 본 그 자리", () => {
  it("고치기 전 상태(questionType=null)에서는 8행이 [?형식] 이었다", () => {
    const unknown = AI_ROWS.filter(
      (row) => classifyFormat(asProvenanceInput(row)) === "unknown",
    );
    expect(AI_ROWS).toHaveLength(10);
    expect(unknown).toHaveLength(8);
    // 원장님이 짚은 두 행이 그 8행 안에 있다.
    const codes = unknown.map((row) => row.problemCode);
    expect(codes).toContain("J10101-A02-001");
    expect(codes).toContain("J10101-A10-001");
  });

  it("같은 10행에 deriveQuestionType 을 적어 넣으면 [?형식] 이 0행이 된다", () => {
    const formats = AI_ROWS.map((row) =>
      classifyFormat(
        asProvenanceInput({ ...row, questionType: deriveQuestionType(row) }),
      ),
    );
    expect(formats.filter((f) => f === "unknown")).toHaveLength(0);
    // 갈래도 확인한다 — 전부 한쪽으로 뭉개면 「unknown 0」은 아무 뜻이 없다.
    expect(formats.filter((f) => f === "short_answer")).toHaveLength(8);
    expect(formats.filter((f) => f === "descriptive")).toHaveLength(2);
  });
});
