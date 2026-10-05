/**
 * 편집 화면은 «본문을 고쳐도 지면의 글이 바뀌지 않는 글 블록» 의 입력을 닫는다(검수 보고서 B05).
 * 그 판정(`textPrintsFromStructure`)이 실제 렌더 갈래와 같은 말을 하는지 본다 —
 * 종류마다 본문만 바꿔 두 번 그려, «찍히는 글이 같다 ⇔ 구조에서 나온다» 가 성립해야 한다.
 *
 * 재는 것은 블록 하나의 «찍히는 글» 이다. 쪽 나눔은 재지 않는다 — 조판은 본문이 «제목 한 줄» 꼴인 글 블록을
 * 다음 블록과 붙여 넘기는데, 입력을 닫아도 저장된 본문은 그대로라 그 배치는 바뀌지 않는다.
 */
import { describe, expect, it } from "vitest";

import {
  textbookSemanticSchema,
  type TextbookSemantic,
} from "@/contracts/textbookSemantic.contract";
import { textPrintsFromStructure } from "@/lib/textbook/render/blocks/semantic";
import { renderBlockHtml } from "@/lib/textbook/render/html";
import type { RenderBlock } from "@/lib/textbook/render/model";

const resources = {
  assetUrl: (id: string) => `/assets/${id}.png`,
  qrDataUrl: () => "data:image/png;base64,AA==",
};

type TextBlock = Extract<RenderBlock, { kind: "text" }>;

/** 같은 블록을 본문만 바꿔 그린다 — 지면이 본문을 읽으면 두 결과가 다르다 */
function printsSame(semantic: TextbookSemantic | undefined, extra = {}) {
  const draw = (markdown: string) =>
    renderBlockHtml(
      {
        id: "block-1",
        sourceBlockId: "block-1",
        unitKey: "unit-1",
        sectionKey: "section-1",
        kind: "text",
        markdown,
        ...(semantic ? { semantic } : {}),
        ...extra,
      } as unknown as TextBlock,
      resources,
    );
  return draw("처음 본문") === draw("고친 본문");
}

const structured: [string, TextbookSemantic][] = [
  [
    "writing",
    {
      activity: "questionLog",
      title: "질문 기록",
      node: { kind: "writing", prompts: ["막힌 부분을 적으세요."], lines: 4 },
    },
  ],
  [
    "references",
    {
      activity: "tableOfContents",
      title: "차례",
      node: {
        kind: "references",
        entries: [{ key: "unit-1", label: "1 덧셈과 뺄셈", pageLabel: "6" }],
      },
    },
  ],
  [
    "exampleGroup",
    {
      activity: "workedExamples",
      title: "유형",
      node: {
        kind: "exampleGroup",
        groupId: "group-1",
        title: "받아올림",
        strategy: "일의 자리부터 더한다.",
        exampleItemId: "00000000-0000-4000-8000-000000000001",
        confirmItemIds: ["00000000-0000-4000-8000-000000000002"],
      },
    },
  ],
  [
    "fragments",
    {
      activity: "practice",
      title: "원본",
      node: {
        kind: "fragments",
        fragments: [{ tag: "p", rawText: "원본 고정 원고" }],
      },
    },
  ],
  [
    "board",
    {
      activity: "dialogue",
      title: "판서",
      node: { kind: "board", title: "판서", tex: "1+1=2" },
    },
  ],
] as unknown as [string, TextbookSemantic][];

const unitIntro = {
  activity: "unitIntro",
  title: "평면도형",
  node: {
    kind: "unitIntro",
    question: "선은 어디까지 이어질까?",
    explanation: "선분, 반직선, 직선을 가른다.",
    goals: ["선분을 안다."],
    path: ["선분"],
    check: ["선분은 무엇인가?"],
  },
} as unknown as TextbookSemantic;

describe("본문이 아니라 구조에서 나오는 글 블록", () => {
  it.each(structured)(
    "%s 는 본문을 바꿔도 지면이 같고, 판정도 «구조에서 나온다» 다",
    (_kind, raw) => {
      // 계약을 통과하는 구조로만 잰다 — 계약 밖의 값으로 초록을 만들지 않는다
      const semantic = textbookSemanticSchema.parse(raw);
      expect(printsSame(semantic)).toBe(true);
      expect(textPrintsFromStructure(semantic, "basic")).toBe(true);
    },
  );

  it("은행 활동은 설명 활동만 본문을 읽지 않는다 — 자유 백지 · 개념 지도는 본문이 «작성 방법» 으로 찍힌다", () => {
    const bank = (activity: string, extra: object = {}) =>
      textbookSemanticSchema.parse({
        activity,
        node: {
          kind: "rows",
          groupKey: `bank-activity.v1.${activity}.1`,
          rows: [
            {
              rowKey: "row-1",
              label: "선분",
              rawText: "두 점을 곧게 이은 선",
              textFormat: "bank-blank",
            },
          ],
        },
        ...extra,
      });
    const oral = bank("explainActivity");
    expect(printsSame(oral)).toBe(true);
    expect(textPrintsFromStructure(oral, "basic")).toBe(true);
    for (const activity of ["conceptBlankTest", "conceptMap"]) {
      const reads = bank(activity);
      expect(printsSame(reads)).toBe(false);
      expect(textPrintsFromStructure(reads, "basic")).toBe(false);
    }
    // 묶음 표지가 없거나 다른 활동의 것이면 은행 활동으로 그리지 않는다 — 본문이 그대로 지면이다
    for (const groupKey of [undefined, "bank-activity.v1.conceptMap.1"]) {
      const loose = textbookSemanticSchema.parse({
        activity: "explainActivity",
        node: {
          kind: "rows",
          ...(groupKey ? { groupKey } : {}),
          rows: [
            {
              rowKey: "row-1",
              label: "선분",
              rawText: "두 점을 곧게 이은 선",
              textFormat: "bank-blank",
            },
          ],
        },
      });
      expect(printsSame(loose)).toBe(false);
      expect(textPrintsFromStructure(loose, "basic")).toBe(false);
    }
    // 원본 출처가 붙은 행은 은행 활동이 아니다 — 본문이 그대로 지면이다
    const sourced = bank("explainActivity", {
      source: { unit: "1", page: 3, kind: "note", path: "u1/p3" },
    });
    expect(printsSame(sourced)).toBe(false);
    expect(textPrintsFromStructure(sourced, "basic")).toBe(false);
  });

  it("구조가 없는 글은 본문이 곧 지면이고, 판정도 «본문에서 나온다» 다", () => {
    expect(printsSame(undefined)).toBe(false);
    expect(textPrintsFromStructure(undefined, "basic")).toBe(false);
    // 활동 표지만 있고 노드가 없는 글(학습 계획 등)도 본문이 지면이다
    const plain = {
      activity: "learningPlan",
      title: "학습 계획",
    } as unknown as TextbookSemantic;
    expect(printsSame(plain)).toBe(false);
    expect(textPrintsFromStructure(plain, "auto-learning-plan")).toBe(false);
  });

  it("단원 도입 구조는 자동 단원 도입 틀에서 펼쳐진 면만 구조에서 나온다 — 판정이 틀을 본다", () => {
    // 자동 단원 도입 틀에서는 투영이 블록을 면(왼쪽 · 오른쪽 · 한 면)으로 펼친다 — 그 면은 본문을 읽지 않는다
    expect(printsSame(unitIntro, { unitIntroPart: "single" })).toBe(true);
    expect(textPrintsFromStructure(unitIntro, "auto-unit-intro")).toBe(true);
    // 다른 틀에서는 펼치지 않는다 — 본문이 그대로 지면에 나온다
    expect(printsSame(unitIntro)).toBe(false);
    expect(textPrintsFromStructure(unitIntro, "basic")).toBe(false);
  });
});
