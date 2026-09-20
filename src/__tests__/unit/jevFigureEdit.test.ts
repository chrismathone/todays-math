// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askJev } from "@/lib/jev/client";
import {
  FigureEditCommandSchema,
  type FigureEditFigure,
} from "@/lib/dev-ai/figure-edit-contract";
import {
  assembleFigureEditCommand,
  buildFigureEditQuestions,
  contractFigureEditOps,
  FIGURE_EDIT_OP_LABELS,
  JEV_FAST_PATH_OPS,
  JEV_MIN_CONFIDENCE,
  tryJevFigureEdit,
} from "@/lib/dev-ai/figure-edit-jev";
import {
  editDevAiFigure,
  type FigureEditInference,
} from "@/lib/dev-ai/figure-edit";
import { buildFigureEditPrompt } from "@/lib/dev-ai/figure-edit-prompt";
import type { DevAiRequest } from "@/lib/dev-ai/contracts";

/** 이 저장소의 `NodeJS.ProcessEnv` 는 NODE_ENV 를 요구한다(routing.ts 시험과 같은 결). */
const envOf = (extra: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  NODE_ENV: "test",
  ...extra,
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/jev/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/jev/client")>()),
  askJev: vi.fn(),
}));
const ask = vi.mocked(askJev);

const figure: FigureEditFigure = {
  viewBox: [0, 0, 300, 240],
  elements: [
    {
      n: 1,
      kind: "선분",
      points: [
        [40, 200],
        [260, 200],
      ],
    },
    {
      n: 2,
      kind: "선분",
      points: [
        [40, 200],
        [150, 40],
      ],
    },
    { n: 3, kind: "글자", text: "A", points: [[36, 34]] },
    {
      n: 4,
      kind: "경로",
      points: [
        [40, 210],
        [150, 230],
        [260, 210],
      ],
    },
  ],
  names: [
    { name: "A", x: 150, y: 40 },
    { name: "B", x: 40, y: 200 },
    { name: "C", x: 260, y: 200 },
  ],
};
const request: DevAiRequest = {
  action: "figure-edit",
  provider: "claude",
  grade: "중2",
  imageDataUrl: "data:image/png;base64,YWJj",
  content: "각 ABC에 각 표시를 해 주세요.",
  figure,
};
/** 물음 id → 고른 값. 적지 않은 물음은 «해당 없음»으로 둔다. */
const answers = (picked: Record<string, string>, confidence = 0.97) =>
  Object.fromEntries(
    Object.keys(
      buildFigureEditQuestions(figure, request.content ?? "") ?? {},
    ).map((id) => [
      id,
      {
        choice: picked[id] ?? (id === "dashed" ? "no" : "none"),
        confidence: id === "op" ? confidence : 0.6,
      },
    ]),
  );

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("명령 문구 표 — 계약에서 파생", () => {
  // 2026-09-19 «각 ACB에 각 표시» 가 지시문 목록에 없어 422 가 났다. 같은 함정이 여기서 조용히 반복되지 않게 한다.
  it("계약의 명령을 하나도 빠짐없이 덮는다", () => {
    const ops = contractFigureEditOps();
    expect(ops.length).toBeGreaterThan(30);
    expect(ops.every((op) => typeof op === "string" && op.length > 0)).toBe(
      true,
    );
    expect(ops.filter((op) => !FIGURE_EDIT_OP_LABELS[op]?.trim())).toEqual([]);
  });

  it("계약에 없는 명령을 문구 표에 두지 않는다", () => {
    const ops = new Set<string>(contractFigureEditOps());
    expect(
      Object.keys(FIGURE_EDIT_OP_LABELS).filter((op) => !ops.has(op)),
    ).toEqual([]);
  });

  it("빠른 길 명령은 모두 계약에 있다", () => {
    const ops = new Set<string>(contractFigureEditOps());
    expect(JEV_FAST_PATH_OPS.filter((op) => !ops.has(op))).toEqual([]);
    expect(JEV_FAST_PATH_OPS.length).toBeGreaterThan(0);
  });
});

describe("물음 구성", () => {
  it("명령 선택지는 계약의 명령 전부와 «해당 없음»이다", () => {
    const built = buildFigureEditQuestions(figure, "선분 BC를 지워 주세요");
    expect(built).not.toBeNull();
    expect(Object.keys(built?.op?.criteria ?? {}).sort()).toEqual(
      [...contractFigureEditOps(), "none"].sort(),
    );
  });

  it("점 선택지는 그 그림의 점 이름에서 짓는다", () => {
    const built = buildFigureEditQuestions(figure, "각 ABC에 각 표시");
    expect(Object.keys(built?.pointA?.criteria ?? {})).toEqual([
      "A",
      "B",
      "C",
      "none",
    ]);
    expect(Object.keys(built?.pointC?.criteria ?? {})).toEqual([
      "A",
      "B",
      "C",
      "none",
    ]);
  });

  it("요소 선택지는 그 그림의 번호 목록이고 전체·해당 없음을 갖는다", () => {
    const built = buildFigureEditQuestions(figure, "1번을 지워 주세요");
    expect(Object.keys(built?.target?.criteria ?? {})).toEqual([
      "1",
      "2",
      "3",
      "4",
      "all",
      "none",
    ]);
  });

  it("모든 선택지 물음에 «해당 없음»이 있다 — 억지로 고르게 하지 않는다", () => {
    const built = buildFigureEditQuestions(figure, "무엇이든");
    for (const [id, question] of Object.entries(built ?? {}))
      if (id !== "dashed")
        expect(Object.keys(question.criteria)).toContain("none");
  });

  it("요소가 선택지 한도를 넘는 그림은 빠른 길을 끈다", () => {
    const big: FigureEditFigure = {
      viewBox: [0, 0, 300, 240],
      elements: Array.from({ length: 300 }, (_, index) => ({
        n: index + 1,
        kind: "선분",
      })),
    };
    expect(buildFigureEditQuestions(big, "지워 주세요")).toBeNull();
  });

  it("요청 글이 비면 묻지 않는다", () => {
    expect(buildFigureEditQuestions(figure, "   ")).toBeNull();
  });
});

describe("명령 조립 — 코드가 검산한다", () => {
  const assemble = (picked: Record<string, string>, confidence = 0.97) =>
    assembleFigureEditCommand(answers(picked, confidence), figure);

  it.each([
    ["delete", { op: "delete", target: "2" }, { op: "delete", target: 2 }],
    ["relabel", { op: "relabel", target: "3" }, { op: "relabel", target: 3 }],
    ["flip", { op: "flip", target: "4" }, { op: "flip", target: 4 }],
    [
      "rotate",
      { op: "rotate", target: "all", direction: "cw" },
      { op: "rotate", targets: "all", direction: "cw" },
    ],
    [
      "mirror",
      { op: "mirror", target: "2", axis: "horizontal" },
      { op: "mirror", targets: [2], axis: "horizontal" },
    ],
    [
      "addLine",
      { op: "addLine", pointA: "A", pointB: "C" },
      { op: "addLine", from: "A", to: "C" },
    ],
    [
      "addLine(점선)",
      { op: "addLine", pointA: "A", pointB: "C", dashed: "yes" },
      { op: "addLine", from: "A", to: "C", dashed: true },
    ],
    [
      "addMidpoint",
      { op: "addMidpoint", pointA: "B", pointB: "C" },
      { op: "addMidpoint", from: "B", to: "C" },
    ],
    [
      "addPerpendicularBisector",
      { op: "addPerpendicularBisector", pointA: "B", pointB: "C" },
      { op: "addPerpendicularBisector", from: "B", to: "C" },
    ],
    [
      "extendLine",
      { op: "extendLine", pointA: "B", pointB: "C" },
      { op: "extendLine", from: "B", to: "C" },
    ],
    [
      "addTick",
      { op: "addTick", pointA: "B", pointB: "C", count: "2" },
      { op: "addTick", from: "B", to: "C", count: 2 },
    ],
    [
      "addParallelMark",
      { op: "addParallelMark", pointA: "B", pointB: "C" },
      { op: "addParallelMark", from: "B", to: "C" },
    ],
    [
      "addCircle",
      { op: "addCircle", pointA: "B", pointB: "C" },
      { op: "addCircle", center: "B", through: "C" },
    ],
    [
      "addArc",
      { op: "addArc", pointA: "A", pointB: "B", pointC: "C" },
      { op: "addArc", center: "A", from: "B", to: "C" },
    ],
    [
      "addAngle",
      { op: "addAngle", pointA: "B", pointB: "A", pointC: "C" },
      { op: "addAngle", at: "B", from: "A", to: "C" },
    ],
    [
      "addAngle(겹 호)",
      { op: "addAngle", pointA: "B", pointB: "A", pointC: "C", count: "2" },
      { op: "addAngle", at: "B", from: "A", to: "C", arcs: 2 },
    ],
    [
      "addAngleBisector",
      { op: "addAngleBisector", pointA: "B", pointB: "A", pointC: "C" },
      { op: "addAngleBisector", at: "B", from: "A", to: "C" },
    ],
    [
      "addPerpendicular",
      { op: "addPerpendicular", pointA: "A", pointB: "B", pointC: "C" },
      { op: "addPerpendicular", from: "A", onto: ["B", "C"] },
    ],
    [
      "addParallel",
      { op: "addParallel", pointA: "A", pointB: "B", pointC: "C" },
      { op: "addParallel", through: "A", to: ["B", "C"] },
    ],
    [
      "addCircumcircle",
      { op: "addCircumcircle", pointA: "A", pointB: "B", pointC: "C" },
      { op: "addCircumcircle", points: ["A", "B", "C"] },
    ],
    [
      "addIncircle",
      { op: "addIncircle", pointA: "A", pointB: "B", pointC: "C" },
      { op: "addIncircle", points: ["A", "B", "C"] },
    ],
    [
      "addArcMidpoint",
      { op: "addArcMidpoint", pointA: "A", pointB: "B", pointC: "C" },
      { op: "addArcMidpoint", center: "A", from: "B", to: "C" },
    ],
    [
      "fillRegion",
      { op: "fillRegion", pointA: "A", pointB: "B", pointC: "C" },
      { op: "fillRegion", at: ["A", "B", "C"] },
    ],
  ])("%s 를 계약에 맞는 명령으로 조립한다", (_name, picked, expected) => {
    const command = assemble(picked);
    expect(command).toEqual(expected);
    expect(FigureEditCommandSchema.safeParse(command).success).toBe(true);
  });

  it("빠른 길 명령 스물한 가지를 모두 덮는다", () => {
    expect([...JEV_FAST_PATH_OPS].sort()).toEqual(
      [
        "addAngle",
        "addAngleBisector",
        "addArc",
        "addArcMidpoint",
        "addCircle",
        "addCircumcircle",
        "addIncircle",
        "addLine",
        "addMidpoint",
        "addParallel",
        "addParallelMark",
        "addPerpendicular",
        "addPerpendicularBisector",
        "addTick",
        "delete",
        "extendLine",
        "fillRegion",
        "flip",
        "mirror",
        "relabel",
        "rotate",
      ].sort(),
    );
  });

  it("확신이 문턱보다 낮으면 떨어진다", () => {
    expect(
      assemble({ op: "delete", target: "2" }, JEV_MIN_CONFIDENCE - 0.01),
    ).toBeNull();
    expect(
      assemble({ op: "delete", target: "2" }, JEV_MIN_CONFIDENCE),
    ).not.toBeNull();
  });

  it("인자가 안 차면 떨어진다", () => {
    expect(assemble({ op: "delete" })).toBeNull();
    expect(assemble({ op: "addLine", pointA: "A" })).toBeNull();
    expect(assemble({ op: "addAngle", pointA: "B", pointB: "A" })).toBeNull();
    expect(assemble({ op: "rotate", target: "all" })).toBeNull();
    expect(assemble({ op: "mirror", target: "all" })).toBeNull();
    expect(assemble({ op: "none", target: "2" })).toBeNull();
  });

  it("점 이름이 그림에 없으면 떨어진다", () => {
    expect(
      assembleFigureEditCommand(
        {
          ...answers({ op: "addLine" }),
          pointA: { choice: "Z", confidence: 0.9 },
          pointB: { choice: "C", confidence: 0.9 },
        },
        figure,
      ),
    ).toBeNull();
  });

  it("요소 번호가 그림에 없으면 떨어진다", () => {
    expect(
      assembleFigureEditCommand(
        {
          ...answers({ op: "delete" }),
          target: { choice: "9", confidence: 0.9 },
        },
        figure,
      ),
    ).toBeNull();
  });

  it("같은 점을 두 번 고르면 떨어진다", () => {
    expect(assemble({ op: "addLine", pointA: "B", pointB: "B" })).toBeNull();
    expect(
      assemble({ op: "addAngle", pointA: "B", pointB: "A", pointC: "A" }),
    ).toBeNull();
  });

  it("빠른 길 밖의 명령은 떨어진다 — 좌표·글자는 모델에게 맡기지 않는다", () => {
    for (const op of [
      "move",
      "text",
      "style",
      "point",
      "addText",
      "addLabel",
      "addPoint",
      "resize",
      "addIntersection",
      "addTangent",
      "addCircleIntersection",
      "addDimension",
    ])
      expect(
        assemble({ op, target: "2", pointA: "A", pointB: "B", pointC: "C" }),
      ).toBeNull();
  });
});

describe("빠른 길 전체", () => {
  it("명령이 서면 지금과 같은 모양의 결과를 돌려준다", async () => {
    ask.mockResolvedValue(
      answers({ op: "addAngle", pointA: "B", pointB: "A", pointC: "C" }),
    );
    const result = await tryJevFigureEdit(request, {
      env: envOf({ AI_GATEWAY_API_KEY: "key" }),
    });
    expect(result).toEqual({
      content: "",
      answer: "",
      solution: "",
      warnings: [],
      edits: [{ op: "addAngle", at: "B", from: "A", to: "C" }],
    });
  });

  it("모델이 없거나 답이 안 서면 null — 기존 경로로 떨어진다", async () => {
    ask.mockResolvedValue(null);
    expect(
      await tryJevFigureEdit(request, {
        env: envOf({ AI_GATEWAY_API_KEY: "key" }),
      }),
    ).toBeNull();
    ask.mockResolvedValue(answers({ op: "none" }));
    expect(
      await tryJevFigureEdit(request, {
        env: envOf({ AI_GATEWAY_API_KEY: "key" }),
      }),
    ).toBeNull();
  });

  it("꺼져 있으면 게이트웨이를 아예 부르지 않는다", async () => {
    expect(await tryJevFigureEdit(request, { env: envOf() })).toBeNull();
    expect(
      await tryJevFigureEdit(request, {
        env: envOf({ AI_GATEWAY_API_KEY: "key", STUDIO_AI_JEV: "off" }),
      }),
    ).toBeNull();
    expect(ask).not.toHaveBeenCalled();
  });

  it("남은 시간이 시한보다 빠듯하면 건너뛴다 — 지금 경로의 몫을 뺏지 않는다", async () => {
    expect(
      await tryJevFigureEdit(request, {
        env: envOf({ AI_GATEWAY_API_KEY: "key" }),
        deadlineAt: Date.now() + 500,
      }),
    ).toBeNull();
    expect(ask).not.toHaveBeenCalled();
  });

  it("그림이나 요청이 없으면 묻지 않는다", async () => {
    expect(
      await tryJevFigureEdit(
        { ...request, figure: undefined },
        { env: envOf({ AI_GATEWAY_API_KEY: "key" }) },
      ),
    ).toBeNull();
    expect(
      await tryJevFigureEdit(
        { ...request, content: "  " },
        { env: envOf({ AI_GATEWAY_API_KEY: "key" }) },
      ),
    ).toBeNull();
    expect(ask).not.toHaveBeenCalled();
  });

  it("이미지를 보내지 않는다 — Jev 는 그림을 못 본다", async () => {
    ask.mockResolvedValue(answers({ op: "delete", target: "2" }));
    await tryJevFigureEdit(request, {
      env: envOf({ AI_GATEWAY_API_KEY: "key" }),
    });
    const state = ask.mock.calls[0]?.[0]?.state as string;
    expect(state).not.toContain("data:image");
    expect(state).not.toContain("YWJj");
    expect(state).toContain("각 ABC에 각 표시");
  });
});

describe("배선 — 지금 경로는 한 글자도 달라지지 않는다", () => {
  beforeEach(() => vi.stubEnv("AI_GATEWAY_API_KEY", "key"));
  afterEach(() => vi.unstubAllEnvs());

  it("빠른 길이 먹으면 지금 경로의 모델을 아예 부르지 않는다", async () => {
    ask.mockResolvedValue(
      answers({ op: "addAngle", pointA: "B", pointB: "A", pointC: "C" }),
    );
    const inference = vi.fn<FigureEditInference>();
    await expect(
      editDevAiFigure(request, undefined, inference),
    ).resolves.toEqual({
      content: "",
      answer: "",
      solution: "",
      warnings: [],
      edits: [{ op: "addAngle", at: "B", from: "A", to: "C" }],
    });
    expect(inference).not.toHaveBeenCalled();
  });

  it("떨어지면 지금 경로가 지금과 똑같은 인자로 불린다", async () => {
    ask.mockResolvedValue(null);
    const inference = vi.fn<FigureEditInference>(async () =>
      JSON.stringify({ commands: [{ op: "delete", target: 2 }] }),
    );
    const result = await editDevAiFigure(request, undefined, inference);
    expect(result.edits).toEqual([{ op: "delete", target: 2 }]);
    expect(inference).toHaveBeenCalledTimes(1);
    const call = inference.mock.calls[0][0];
    expect(call.prompt).toBe(buildFigureEditPrompt(request));
    expect(call.imageDataUrl).toBe(request.imageDataUrl);
    expect(call.signal).toBeInstanceOf(AbortSignal);
  });

  it("빠른 길이 꺼져 있어도 지금 경로는 그대로 돈다", async () => {
    vi.stubEnv("STUDIO_AI_JEV", "off");
    const inference = vi.fn<FigureEditInference>(async () =>
      JSON.stringify({ commands: [{ op: "delete", target: 1 }] }),
    );
    const result = await editDevAiFigure(request, undefined, inference);
    expect(result.edits).toEqual([{ op: "delete", target: 1 }]);
    expect(ask).not.toHaveBeenCalled();
  });
});
