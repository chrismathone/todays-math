/**
 * 구조 전용 편집 칸의 순수 함수 — 어떤 칸을 보이고, 한 칸을 고치면 구조가 어떻게 바뀌는가.
 *
 * 재는 것은 «고친 칸 말고는 아무것도 바뀌지 않는다» 다. 열어 보기만 하거나 고쳤다가 되돌린 구조는
 * 저장본과 글자 하나 다르지 않아야 한다 — 키 순서까지. 그래야 손대지 않은 교재의 발행 해시가 그대로다.
 * 자료는 실제 생성기가 낸 것을 쓴다(계약을 건너뛰는 강제 변환을 하지 않는다).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  textbookSemanticSchema,
  type TextbookSemantic,
} from "@/contracts/textbookSemantic.contract";
import type { ManuscriptBlock } from "@/contracts/textbookExchange.contract";
import {
  editStructure,
  structureProblem,
  structureViewOf,
} from "@/components/textbook/structureFields";
import { writingActivity } from "@/lib/textbook/server/quickCreateRecovery";
import { appendUnitIntro } from "@/lib/textbook/server/quickCreate/unitIntro";
import openings from "@/lib/textbook/scripts/unit-openings.json";

const semanticOf = (block: ManuscriptBlock): TextbookSemantic =>
  textbookSemanticSchema.parse(block.semantic);

/** 자동 구성이 실제로 만드는 질문 기록 */
const questionLog = () =>
  semanticOf(
    writingActivity(
      "questionLog",
      "질문 기록",
      [
        "소단원·문항 번호와 막힌 부분을 적으세요.",
        "시도한 방법과 물어볼 질문을 구체적으로 적으세요.",
        "설명을 들은 뒤 새로 알게 된 이유를 자신의 말로 적으세요.",
      ],
      4,
    ),
  );

/** 자동 구성이 실제로 만드는 단원 도입 — 은행의 첫 단원 */
const unitIntro = () => {
  const opening = openings.openings[0]!;
  const added: { templateKey: string; blocks: ManuscriptBlock[] }[] = [];
  appendUnitIntro({
    components: { unitIntro: true },
    units: opening.sections.map((row) => ({
      grade: opening.grade,
      chapter: opening.chapter,
      section: row.title,
    })),
    chapter: opening.chapter,
    addSection: (
      _title: string,
      templateKey: string,
      blocks: ManuscriptBlock[],
    ) => {
      added.push({ templateKey, blocks });
    },
  } as unknown as Parameters<typeof appendUnitIntro>[0]);
  const section = added[0]!;
  return {
    templateKey: section.templateKey,
    semantic: semanticOf(section.blocks[0]!),
    opening,
  };
};

const board = () =>
  textbookSemanticSchema.parse({
    activity: "dialogue",
    title: "선분의 뜻",
    node: { kind: "board", title: "선분", tex: "\\overline{AB}" },
  });

const valueOf = (
  semantic: TextbookSemantic,
  templateKey: string,
  key: string,
) =>
  structureViewOf(semantic, templateKey)!.fields.find(
    (field) => field.key === key,
  )?.value;

describe("어떤 블록에 구조 편집 칸이 있는가", () => {
  it("질문 기록 · 자동 단원 도입 · 판서에는 있다", () => {
    expect(structureViewOf(questionLog(), "auto-question-log")).not.toBeNull();
    const intro = unitIntro();
    expect(intro.templateKey).toBe("auto-unit-intro");
    expect(structureViewOf(intro.semantic, intro.templateKey)).not.toBeNull();
    expect(structureViewOf(board(), "auto-lesson")).not.toBeNull();
  });

  it("단원 도입 구조는 자동 단원 도입 틀에서만 연다 — 다른 틀에서는 본문이 지면이다", () => {
    expect(structureViewOf(unitIntro().semantic, "basic")).toBeNull();
  });

  it("차례 · 유형 머리 · 원본 조각 · 은행 행 · 구조 없는 글에는 없다", () => {
    const closed = [
      {
        activity: "tableOfContents",
        node: {
          kind: "references",
          entries: [{ key: "unit-1", label: "1 덧셈과 뺄셈" }],
        },
      },
      {
        activity: "workedExamples",
        node: {
          kind: "exampleGroup",
          groupId: "example-1",
          title: "받아올림",
          strategy: "일의 자리부터 더한다.",
          exampleItemId: "00000000-0000-4000-8000-000000000001",
          confirmItemIds: ["00000000-0000-4000-8000-000000000002"],
        },
      },
      {
        activity: "practice",
        node: {
          kind: "fragments",
          fragments: [{ tag: "p", rawText: "원본 고정 원고" }],
        },
      },
      {
        activity: "explainActivity",
        node: {
          kind: "rows",
          rows: [
            { rowKey: "row-1", label: "선분", rawText: "두 점을 이은 선" },
          ],
        },
      },
      { activity: "learningPlan", title: "학습 계획" },
    ];
    for (const raw of closed)
      expect(
        structureViewOf(textbookSemanticSchema.parse(raw), "basic"),
      ).toBeNull();
    expect(structureViewOf(undefined, "basic")).toBeNull();
  });
});

describe("닫힌 모양과 연 모양 — 원장님 확정(2026-10-06)", () => {
  it("단원 도입: 닫으면 주요 글과 개수 한 줄, 열면 지면의 제목 그대로 두 묶음", () => {
    const { semantic, templateKey, opening } = unitIntro();
    const view = structureViewOf(semantic, templateKey)!;
    expect(view.head).toBe(`단원 도입 · ${opening.title}`);
    expect(view.summary).toEqual([
      { label: "질문", text: opening.question },
      { label: "설명", text: opening.explanation },
      { label: "핵심 문구", text: opening.keyPhrase },
      {
        label: null,
        text: `학습 목표 ${opening.sections.length} · 학습 순서 ${opening.sections.length} · 출발점 ${opening.check.length}`,
      },
    ]);

    const names = view.fields.map((field) => `${field.group}/${field.label}`);
    expect(names.slice(0, 4)).toEqual([
      "여는 글/도입 제목",
      "여는 글/질문",
      "여는 글/설명",
      "여는 글/핵심 문구",
    ]);
    expect(names).toContain("배움의 길잡이/이 단원의 학습 목표 1");
    expect(names).toContain("배움의 길잡이/선택한 범위의 학습 순서 1");
    expect(names).toContain("배움의 길잡이/나의 출발점 2");
    expect(names.at(-1)).toBe("배움의 길잡이/날짜 문구");
    // 항목은 저장된 개수만큼만 — 더하거나 빼는 칸은 없다
    expect(
      view.fields.filter((field) =>
        field.label.startsWith("이 단원의 학습 목표"),
      ),
    ).toHaveLength(opening.sections.length);
    // 빈 날짜 문구는 기본 문구로 찍힌다 — 칸에 그 기본을 흐리게 보인다
    const date = view.fields.at(-1)!;
    expect(date.value).toBe("공부를 시작한 날");
    expect(date.placeholder).toBe("공부를 시작한 날");
  });

  it("질문 기록: 닫으면 개수 · 작성선과 첫 질문, 열면 질문마다 한 칸과 작성선 고르기", () => {
    const view = structureViewOf(questionLog(), "auto-question-log")!;
    expect(view.head).toBe("질문 기록");
    expect(view.summary).toEqual([
      { label: null, text: "질문 3 · 질문마다 작성선 4줄" },
      { label: "1", text: "소단원·문항 번호와 막힌 부분을 적으세요." },
    ]);
    expect(view.fields.map((field) => field.label)).toEqual([
      "질문 1",
      "질문 2",
      "질문 3",
      "질문마다 작성선",
    ]);
    const lines = view.fields.at(-1)!;
    expect(lines.value).toBe("4");
    expect(lines.choices?.[0]).toBe("1");
    expect(lines.choices).toHaveLength(30);
  });

  it("판서: 닫으면 수식, 열면 판서 제목 · 수식 · 주석", () => {
    const view = structureViewOf(board(), "auto-lesson")!;
    expect(view.head).toBe("판서 · 선분");
    expect(view.summary).toEqual([{ label: "수식", text: "\\overline{AB}" }]);
    expect(view.fields.map((field) => field.label)).toEqual([
      "판서 제목",
      "수식",
      "주석",
    ]);
  });
});

describe("한 칸을 고치면", () => {
  it("그 칸만 바뀐다 — 다른 칸 · 출처 기록 · 키 순서는 그대로다", () => {
    const { semantic, templateKey } = unitIntro();
    const next = editStructure(semantic, semantic, "node.goals.1", "고친 목표");
    expect(valueOf(next, templateKey, "node.goals.1")).toBe("고친 목표");
    expect(next).not.toBe(semantic);

    const node = next.node!;
    const before = semantic.node!;
    if (node.kind !== "unitIntro" || before.kind !== "unitIntro")
      throw new Error("단원 도입이 아니다");
    expect(node.goals).toEqual([
      before.goals[0],
      "고친 목표",
      ...before.goals.slice(2),
    ]);
    // 출처 기록은 원본의 이력이다 — 글을 고쳐도 지우거나 바꾸지 않는다
    expect(node.provenance).toBe(before.provenance);
    expect({ ...node, goals: before.goals }).toEqual(before);
    expect(Object.keys(next)).toEqual(Object.keys(semantic));
    expect(Object.keys(node)).toEqual(Object.keys(before));
  });

  it("고쳤다가 되돌리면 저장본과 한 글자도 다르지 않다 — 같은 객체로 돌아온다", () => {
    const { semantic } = unitIntro();
    const original = (semantic.node as { question: string }).question;
    const edited = editStructure(
      semantic,
      semantic,
      "node.question",
      "다른 질문",
    );
    const second = editStructure(semantic, edited, "title", "다른 제목");
    const back = editStructure(
      semantic,
      editStructure(semantic, second, "title", semantic.title!),
      "node.question",
      original,
    );
    expect(JSON.stringify(back)).toBe(JSON.stringify(semantic));
    expect(back).toBe(semantic);
  });

  it("앞서 고친 다른 칸은 남는다", () => {
    const { semantic, templateKey } = unitIntro();
    const first = editStructure(semantic, semantic, "node.question", "새 질문");
    const second = editStructure(semantic, first, "node.check.0", "새 출발점");
    expect(valueOf(second, templateKey, "node.question")).toBe("새 질문");
    expect(valueOf(second, templateKey, "node.check.0")).toBe("새 출발점");
  });

  it("질문 기록의 질문과 작성선 — 개수는 그대로다", () => {
    const semantic = questionLog();
    const next = editStructure(
      semantic,
      editStructure(semantic, semantic, "node.prompts.2", "새 질문"),
      "node.lines",
      "6",
    );
    expect(next.node).toEqual({
      kind: "writing",
      prompts: [
        "소단원·문항 번호와 막힌 부분을 적으세요.",
        "시도한 방법과 물어볼 질문을 구체적으로 적으세요.",
        "새 질문",
      ],
      lines: 6,
    });
    // 고른 값이 범위 밖이거나 수가 아니면 받지 않는다
    expect(editStructure(semantic, semantic, "node.lines", "31")).toBe(
      semantic,
    );
    expect(editStructure(semantic, semantic, "node.lines", "두 줄")).toBe(
      semantic,
    );
  });

  it("모르는 칸 · 범위 밖 번호는 받지 않는다 — 구조를 건드리지 않는다", () => {
    const { semantic } = unitIntro();
    expect(editStructure(semantic, semantic, "node.goals.99", "x")).toBe(
      semantic,
    );
    expect(editStructure(semantic, semantic, "node.provenance", "x")).toBe(
      semantic,
    );
    expect(editStructure(semantic, semantic, "activity", "cover")).toBe(
      semantic,
    );
    const log = questionLog();
    expect(editStructure(log, log, "node.question", "x")).toBe(log);
  });
});

describe("있어도 되고 없어도 되는 칸", () => {
  it("없던 칸은 비워 두면 생기지 않고, 적으면 생기고, 다시 비우면 사라진다", () => {
    const semantic = board();
    expect("note" in semantic.node!).toBe(false);
    expect(valueOf(semantic, "auto-lesson", "node.note")).toBe("");
    // 다른 칸을 고쳐도 없던 칸이 빈 글로 생기지 않는다
    const titled = editStructure(semantic, semantic, "node.title", "선분의 뜻");
    expect("note" in titled.node!).toBe(false);

    const noted = editStructure(
      semantic,
      titled,
      "node.note",
      "두 점을 잇는다",
    );
    expect((noted.node as { note?: string }).note).toBe("두 점을 잇는다");
    const cleared = editStructure(semantic, noted, "node.note", "");
    expect("note" in cleared.node!).toBe(false);
    expect(JSON.stringify(cleared)).toBe(JSON.stringify(titled));
  });

  it("핵심 문구를 비우면 칸을 지운다 — 빈 글로 남기지 않는다", () => {
    const { semantic, templateKey } = unitIntro();
    const cleared = editStructure(semantic, semantic, "node.keyPhrase", "");
    expect("keyPhrase" in cleared.node!).toBe(false);
    expect(
      structureViewOf(cleared, templateKey)!.summary.map((row) => row.label),
    ).not.toContain("핵심 문구");
  });

  it("빈 글로 저장돼 있던 칸은 손대지 않으면 빈 글 그대로다", () => {
    const stored = textbookSemanticSchema.parse({
      activity: "dialogue",
      node: { kind: "board", title: "선분", tex: "AB", note: "" },
    });
    const next = editStructure(stored, stored, "node.title", "직선");
    expect((next.node as { note?: string }).note).toBe("");
    expect(Object.keys(next.node!)).toEqual(Object.keys(stored.node!));
  });

  it("날짜 문구를 비우면 칸을 지운다 — 지면에는 기본 문구가 찍히고, 칸에는 그 기본을 흐리게 보인다", () => {
    const { semantic, templateKey } = unitIntro();
    const cleared = editStructure(semantic, semantic, "node.dateLabel", "");
    expect("dateLabel" in cleared.node!).toBe(false);
    const field = structureViewOf(cleared, templateKey)!.fields.at(-1)!;
    expect(field.value).toBe("");
    expect(field.placeholder).toBe("공부를 시작한 날");
    // 원래 문구를 다시 적으면 저장본으로 돌아온다
    expect(
      editStructure(semantic, cleared, "node.dateLabel", "공부를 시작한 날"),
    ).toBe(semantic);
  });

  it("도입 제목을 비우면 칸을 지운다 — 지면에는 «단원 도입» 이 찍힌다", () => {
    const { semantic, templateKey } = unitIntro();
    const cleared = editStructure(semantic, semantic, "title", "");
    expect("title" in cleared).toBe(false);
    const view = structureViewOf(cleared, templateKey)!;
    expect(view.head).toBe("단원 도입");
    expect(view.fields[0]).toMatchObject({
      key: "title",
      value: "",
      placeholder: "단원 도입",
    });
  });
});

describe("저장을 막는 구조", () => {
  it("판서 수식에 $ 나 줄바꿈이 있으면 사유를 낸다 — 조판이 그 수식을 거절한다", () => {
    const semantic = board();
    expect(structureProblem(semantic, "auto-lesson")).toBeNull();
    const dollar = editStructure(semantic, semantic, "node.tex", "$x$");
    expect(structureProblem(dollar, "auto-lesson")).toBe(
      "판서 수식에는 $ 기호와 줄바꿈을 쓸 수 없습니다.",
    );
    const broken = editStructure(semantic, semantic, "node.tex", "a\nb");
    expect(structureProblem(broken, "auto-lesson")).not.toBeNull();
  });

  it("편집 칸이 없는 구조는 막지 않는다", () => {
    expect(structureProblem(undefined, "basic")).toBeNull();
    expect(structureProblem(questionLog(), "auto-question-log")).toBeNull();
  });
});
