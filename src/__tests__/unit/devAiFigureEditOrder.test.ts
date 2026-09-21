// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { FigureEditCommandSchema } from "@/lib/dev-ai/figure-edit-contract";
import {
  buildFigureEditPrompt,
  ELEMENT_NUMBER_EXAMPLES,
  explicitElementNumbers,
} from "@/lib/dev-ai/figure-edit-prompt";
import { parseFigureEditResult } from "@/lib/dev-ai/figure-edit";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";

vi.mock("server-only", () => ({}));

/**
 * «요청대로 고치기»의 `order` 계약·지시문 — 원장님 2026-09-21 «Ai 명령으로 순서 조절도 가능하게해.
 * 요소를 입력하면 더 정확하게 반응시켜주고.» 적용은 편집기 «맨 앞으로·앞으로·뒤로·맨 뒤로» 단추와 같은 함수.
 */
const request: DevAiRequest = {
  action: "figure-edit",
  provider: "claude",
  grade: "중3",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "요소 5를 맨 뒤로 보내 주세요.",
  figure: {
    viewBox: [0, 0, 480, 360],
    elements: [
      {
        n: 3,
        kind: "선분",
        points: [
          [240, 340],
          [240, 20],
        ],
      },
      {
        n: 5,
        kind: "다각형",
        points: [
          [120, 160],
          [360, 160],
          [240, 300],
        ],
      },
    ],
  },
};
const reply = (value: unknown) => JSON.stringify(value);

describe("순서 명령 스키마", () => {
  it.each(["front", "forward", "backward", "back"])("accepts to=%s", (to) => {
    expect(
      FigureEditCommandSchema.safeParse({ op: "order", targets: [5], to })
        .success,
    ).toBe(true);
  });
  it("여럿을 한꺼번에", () => {
    expect(
      FigureEditCommandSchema.safeParse({
        op: "order",
        targets: [1, 3, 5],
        to: "front",
      }).success,
    ).toBe(true);
  });
  it("번호는 고정 번호라 요소 수 상한(400)보다 커도 받는다", () => {
    expect(
      FigureEditCommandSchema.safeParse({
        op: "order",
        targets: [1200],
        to: "back",
      }).success,
    ).toBe(true);
  });
  it.each([
    ["방향 없음", { op: "order", targets: [5] }],
    ["모르는 방향", { op: "order", targets: [5], to: "bottom" }],
    ["그림 전체", { op: "order", targets: "all", to: "back" }],
    ["빈 목록", { op: "order", targets: [], to: "back" }],
    ["번호 0", { op: "order", targets: [0], to: "back" }],
    ["번호 칸 이름이 다름", { op: "order", target: 5, to: "back" }],
    ["군더더기 칸", { op: "order", targets: [5], to: "back", steps: 2 }],
  ])("rejects %s", (_name, command) => {
    expect(FigureEditCommandSchema.safeParse(command).success).toBe(false);
  });
  it("형식이 맞는 명령만 남긴다", () => {
    const { edits } = parseFigureEditResult(
      reply({
        commands: [
          { op: "order", targets: [5], to: "back" },
          { op: "order", targets: [5], to: "under" },
        ],
      }),
    );
    expect(edits).toEqual([{ op: "order", targets: [5], to: "back" }]);
  });
});

describe("순서 — 지시문", () => {
  const prompt = buildFigureEditPrompt(request);
  const lines = prompt.split("\n");

  it("순서 명령 줄은 한 벌만", () => {
    const order = lines.filter((line) => line.includes('"op":"order"'));
    expect(order).toHaveLength(1);
    expect(order[0]).toContain('"to":"front"|"forward"|"backward"|"back"');
    expect(order[0]).toContain("맨 앞으로");
    expect(order[0]).toContain("맨 뒤로");
  });
  it("대칭 줄 바로 밑에 선다 — 배치 명령끼리 모아 둔다", () => {
    const at = (head: string) => lines.findIndex((l) => l.startsWith(head));
    expect(at('{"op":"order"')).toBe(at('{"op":"mirror"') + 1);
  });
  it("순서를 바꿔도 번호가 안 바뀐다고 알린다 — 뒤 명령이 같은 번호를 쓴다", () => {
    const order = lines.find((l) => l.startsWith('{"op":"order"'))!;
    expect(order).toMatch(/numbers? (?:stay|do not change)/i);
  });
  it("«읽는 차례» 규칙은 한 벌 — 순서 명령이 새 규칙을 만들지 않는다", () => {
    expect(prompt.split("Use the element number only when").length - 1).toBe(1);
    expect(prompt.split("A bare number in the request").length - 1).toBe(1);
  });
});

/**
 * «요소를 입력하면 더 정확하게» — 지시문의 «읽는 차례»: 맨 숫자(«15를 지워줘»)는 그려진 **글자** 15,
 * «요소 15»·«15번 요소»·«15번 선»만 요소 번호. 빠른 길(Jev)이 순서 명령을 맡는 문지기가 이 함수를 쓴다 —
 * 지시문의 보기와 **같은 원천**(`ELEMENT_NUMBER_EXAMPLES`)이라 두 벌이 아니다.
 */
describe("요소 번호를 드러내 말했나 — «읽는 차례»와 한 원천", () => {
  it("지시문의 보기가 모두 요소 번호로 읽힌다", () => {
    for (const example of ELEMENT_NUMBER_EXAMPLES)
      expect(explicitElementNumbers(example)).toEqual([15]);
    expect(buildFigureEditPrompt(request)).toContain(
      ELEMENT_NUMBER_EXAMPLES.join(" · "),
    );
  });
  it.each([
    ["요소 5를 맨 뒤로", [5]],
    ["5번 요소를 맨 앞으로", [5]],
    ["요소5 뒤로", [5]],
    ["3번 선을 맨 뒤로", [3]],
    ["요소 3과 요소 12를 맨 앞으로", [3, 12]],
  ])("%s → %j", (text, expected) => {
    expect(explicitElementNumbers(text)).toEqual(expected);
  });
  it.each([
    "5를 맨 뒤로",
    "15를 지워줘",
    "길이 10 글자를 옮겨줘",
    "그룹 A를 맨 뒤로",
  ])("맨 숫자·맨 글자는 요소 번호가 아니다 — %s", (text) => {
    expect(explicitElementNumbers(text)).toEqual([]);
  });
  it("맨 숫자와 «요소 N»이 섞여도 요소 번호만 — 글자 15 를 요소로 읽지 않는다", () => {
    expect(
      explicitElementNumbers("15라고 적힌 글자를 가리는 요소 5를 맨 뒤로"),
    ).toEqual([5]);
  });
});

describe("할 수 있는 것 목록", () => {
  it("«순서 바꾸기»가 있다 — 빈 명령일 때 화면에 나간다", async () => {
    const { FigureEditError } = await import("@/lib/dev-ai/figure-edit");
    try {
      parseFigureEditResult(reply({ commands: [] }));
      expect.unreachable("빈 명령은 사유를 던진다");
    } catch (error) {
      expect(error).toBeInstanceOf(FigureEditError);
      expect((error as Error).message).toContain("순서 바꾸기");
    }
  });
});
