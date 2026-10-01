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
  contractOpAcceptsDashed,
  contractOpTakesElements,
  FIGURE_EDIT_OP_LABELS,
  JEV_FAST_PATH_OPS,
  JEV_MIN_CONFIDENCE,
  tryJevFigureEdit,
  type FigureEditOp,
} from "@/lib/dev-ai/figure-edit-jev";
import {
  editDevAiFigure,
  type FigureEditInference,
} from "@/lib/dev-ai/figure-edit";
import {
  buildFigureEditPrompt,
  ELEMENT_NUMBER_EXAMPLES,
} from "@/lib/dev-ai/figure-edit-prompt";
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
        choice:
          picked[id] ??
          (id === "dashed" ? "no" : id === "scope" ? "one" : "none"),
        confidence: id === "op" || id === "scope" ? confidence : 0.6,
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

  // dashed·scope 만 예외다 — 그 둘은 두 값이 다 뜻이 있어(실선/점선 · 한 군데/여러 군데) «해당 없음»이 없다.
  it("모든 선택지 물음에 «해당 없음»이 있다 — 억지로 고르게 하지 않는다", () => {
    const built = buildFigureEditQuestions(figure, "무엇이든");
    const twoWay = ["dashed", "scope"];
    for (const [id, question] of Object.entries(built ?? {}))
      if (!twoWay.includes(id))
        expect(Object.keys(question.criteria)).toContain("none");
    expect(
      Object.keys(built ?? {})
        .filter((id) => twoWay.includes(id))
        .sort(),
    ).toEqual([...twoWay].sort());
  });

  it("«고칠 곳이 몇 군데인가»를 함께 묻는다", () => {
    const built = buildFigureEditQuestions(
      figure,
      "7번 선을 지우고 점 A 이름을 위로",
    );
    expect(Object.keys(built?.scope?.criteria ?? {})).toEqual(["one", "many"]);
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
  // 요청 글 — 요소 번호를 받는 명령만 본다(«읽는 차례» 문지기, 아래). 기본은 고른 번호를 드러내 말한 글이다.
  const saying = (picked: Record<string, string>) =>
    /^\d+$/.test(picked.target ?? "")
      ? `요소 ${picked.target}을 고쳐 주세요`
      : "그림을 고쳐 주세요";
  const assemble = (
    picked: Record<string, string>,
    confidence = 0.97,
    text = saying(picked),
  ) => assembleFigureEditCommand(answers(picked, confidence), figure, text);

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

  it("빠른 길 명령 스물두 가지를 모두 덮는다", () => {
    expect([...JEV_FAST_PATH_OPS].sort()).toEqual(
      [
        "order",
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

  // 계약은 명령마다 점선을 받기도 하고 안 받기도 한다(addMidpoint·addArcMidpoint 는 안 받는다).
  // 손으로 적어 둔 표가 계약과 어긋나면 «점선으로»라고 말한 요청만 조용히 떨어진다 — 전수로 잰다.
  it("빠른 길 명령을 인자를 다 채워 조립하면 점선을 붙였을 때도 모두 계약을 통과한다", () => {
    for (const op of JEV_FAST_PATH_OPS)
      for (const dashed of ["no", "yes"]) {
        const command = assemble({
          op,
          target: "2",
          pointA: "A",
          pointB: "B",
          pointC: "C",
          direction: "cw",
          axis: "horizontal",
          layer: "back",
          dashed,
        });
        expect({ op, dashed, command }).toEqual({
          op,
          dashed,
          command: expect.objectContaining({ op }),
        });
        expect(FigureEditCommandSchema.safeParse(command).success).toBe(true);
      }
  });

  it("계약이 점선을 받는 명령에만 점선을 붙인다", () => {
    expect(contractOpAcceptsDashed("addLine")).toBe(true);
    expect(contractOpAcceptsDashed("addCircle")).toBe(true);
    // 계약에 dashed 칸이 없는 것들
    expect(contractOpAcceptsDashed("addMidpoint")).toBe(false);
    expect(contractOpAcceptsDashed("addArcMidpoint")).toBe(false);
    expect(contractOpAcceptsDashed("delete")).toBe(false);
    expect(contractOpAcceptsDashed("addAngle")).toBe(false);
  });

  /**
   * 순서(원장님 2026-09-21 «요소를 입력하면 더 정확하게») — 지시문의 «읽는 차례» 그대로: 맨 숫자는 그려진 글자,
   * «요소 N»·«N번 …»만 요소 번호. 빠른 길의 요소 물음은 그 규칙을 모르므로 **요청 글이 번호를 드러내 말했고
   * 고른 번호가 그것과 같을 때만** 맡는다. 아니면 지금 경로(규칙이 적힌 지시문)로 떨어진다.
   */
  it("순서 — 요청 글이 요소 번호를 드러내 말했을 때만 맡는다", () => {
    expect(
      assemble(
        { op: "order", target: "2", layer: "back" },
        0.97,
        "요소 2를 맨 뒤로",
      ),
    ).toEqual({ op: "order", targets: [2], to: "back" });
    expect(
      assemble(
        { op: "order", target: "2", layer: "front" },
        0.97,
        "2번 선분을 맨 앞으로 가져와",
      ),
    ).toEqual({ op: "order", targets: [2], to: "front" });
    // 맨 숫자는 그려진 글자다 — 요소 2 로 읽지 않고 지금 경로로 넘긴다
    expect(
      assemble(
        { op: "order", target: "2", layer: "back" },
        0.97,
        "2를 맨 뒤로",
      ),
    ).toBeNull();
    // 맨 숫자와 «요소 N»이 섞여도 요소 번호만 본다 — 고른 번호가 글자 쪽이면 떨어진다
    expect(
      assemble(
        { op: "order", target: "1", layer: "back" },
        0.97,
        "1이라고 적힌 글자를 가리는 요소 2를 맨 뒤로",
      ),
    ).toBeNull();
    expect(
      assemble(
        { op: "order", target: "2", layer: "back" },
        0.97,
        "1이라고 적힌 글자를 가리는 요소 2를 맨 뒤로",
      ),
    ).toEqual({ op: "order", targets: [2], to: "back" });
    // 요소를 둘 말했으면 하나만 옮기지 않는다
    expect(
      assemble(
        { op: "order", target: "2", layer: "back" },
        0.97,
        "요소 1과 요소 2를 맨 뒤로",
      ),
    ).toBeNull();
    // 방향이 없으면 떨어진다
    expect(
      assemble({ op: "order", target: "2" }, 0.97, "요소 2를 맨 뒤로"),
    ).toBeNull();
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

  // 지금 경로는 한 번에 명령을 스물까지 돌려준다. 빠른 길은 하나뿐이라 «두 가지 요청»을 반만 고칠 수 있다 —
  // 반만 고치느니 지금 경로로 떨어뜨린다.
  it("고칠 곳이 두 군데 이상이면 떨어진다", () => {
    expect(assemble({ op: "delete", target: "2", scope: "many" })).toBeNull();
    expect(
      assembleFigureEditCommand(
        {
          ...answers({ op: "delete", target: "2" }),
          scope: { choice: "one", confidence: JEV_MIN_CONFIDENCE - 0.01 },
        },
        figure,
      ),
    ).toBeNull();
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

/**
 * «읽는 차례» 문지기 — 트랙 43 이 찾은 틈. 지시문은 맨 숫자(«15를 지워줘»)를 그려진 **글자** 15 로, «요소 15»·«15번 요소»·
 * «15번 선»만 요소 번호로 읽는다(`ELEMENT_NUMBER_EXAMPLES`). 빠른 길의 요소 물음은 그 규칙을 모르므로 요소 15 를 고를 수 있다 —
 * 지우기는 되돌리기 전까지 그림을 망친다. 그래서 **요소 번호를 받는 명령 여섯 모두** 요청 글이 드러내 말한 번호들과
 * 고른 번호들이 같은 집합일 때만 맡고, 아니면 지금 경로(규칙이 적힌 지시문)로 떨어진다.
 * 그림은 요소 15 가 **선**이고 글자 «15»가 요소 16 인 것으로 잰다 — 맨 숫자를 요소 번호로 읽으면 엉뚱한 선이 지워진다.
 */
describe("«읽는 차례» 문지기 — 요소 번호는 드러내 말했을 때만", () => {
  const numbered: FigureEditFigure = {
    viewBox: [0, 0, 300, 240],
    elements: [
      {
        n: 7,
        kind: "선분",
        points: [
          [40, 200],
          [260, 200],
        ],
      },
      {
        n: 15,
        kind: "선분",
        points: [
          [40, 200],
          [150, 40],
        ],
      },
      { n: 16, kind: "글자", text: "15", points: [[100, 110]] },
    ],
    names: figure.names,
  };
  const GATED: [
    FigureEditOp,
    Record<string, string>,
    string,
    (n: number) => Record<string, unknown>,
  ][] = [
    ["delete", {}, "지워줘", (n) => ({ op: "delete", target: n })],
    [
      "relabel",
      {},
      "이름 자리를 고쳐줘",
      (n) => ({ op: "relabel", target: n }),
    ],
    ["flip", {}, "반대쪽으로 넘겨줘", (n) => ({ op: "flip", target: n })],
    [
      "rotate",
      { direction: "cw" },
      "시계 방향으로 돌려줘",
      (n) => ({ op: "rotate", targets: [n], direction: "cw" }),
    ],
    [
      "mirror",
      { axis: "vertical" },
      "좌우로 뒤집어줘",
      (n) => ({ op: "mirror", targets: [n], axis: "vertical" }),
    ],
    [
      "order",
      { layer: "back" },
      "맨 뒤로 보내줘",
      (n) => ({ op: "order", targets: [n], to: "back" }),
    ],
  ];
  const assemble = (
    op: FigureEditOp,
    extra: Record<string, string>,
    target: string,
    text: string,
  ) =>
    assembleFigureEditCommand(
      answers({ op, target, ...extra }),
      numbered,
      text,
    );

  it("요소 번호를 받는 빠른 길 명령은 계약에서 뽑은 여섯이다 — 손 목록이 아니다", () => {
    expect(JEV_FAST_PATH_OPS.filter(contractOpTakesElements).sort()).toEqual(
      GATED.map(([op]) => op).sort(),
    );
  });

  describe.each(GATED)("%s", (op, extra, verb, expected) => {
    it(`«15를 ${verb}» — 맨 숫자는 글자다, 요소 15 를 고치지 않는다`, () => {
      expect(assemble(op, extra, "15", `15를 ${verb}`)).toBeNull();
      // 글자 «15»(요소 16)를 골랐어도 맡지 않는다 — 규칙대로 읽는 것은 지금 경로의 몫
      expect(assemble(op, extra, "16", `15를 ${verb}`)).toBeNull();
    });

    it.each(ELEMENT_NUMBER_EXAMPLES)(
      `«%s ${verb}» — 빠른 길로 맡는다`,
      (said) => {
        const command = assemble(op, extra, "15", `${said} ${verb}`);
        expect(command).toEqual(expected(15));
        expect(FigureEditCommandSchema.safeParse(command).success).toBe(true);
      },
    );

    it("말한 번호와 고른 번호가 다르면 떨어진다", () => {
      expect(assemble(op, extra, "7", `요소 15 ${verb}`)).toBeNull();
    });

    it("번호를 말하지 않았으면 떨어진다 — 지금 경로가 맡는다", () => {
      expect(assemble(op, extra, "15", `선분을 ${verb}`)).toBeNull();
    });

    it("요소를 둘 말했으면 하나만 고치지 않는다 — 같은 집합일 때만", () => {
      expect(
        assemble(op, extra, "15", `요소 7과 요소 15를 ${verb}`),
      ).toBeNull();
    });

    it("맨 숫자와 «요소 N»이 섞여도 요소 번호만 센다", () => {
      const text = `15라고 적힌 글자 옆 요소 7을 ${verb}`;
      expect(assemble(op, extra, "7", text)).toEqual(expected(7));
      expect(assemble(op, extra, "16", text)).toBeNull();
      expect(assemble(op, extra, "15", text)).toBeNull();
    });
  });

  /**
   * 회전·대칭의 «그림 전체»(`targets: "all"`)는 번호를 고르지 않은 것 — 빈 집합이다. 번호를 말하지 않은 요청은 지금처럼 맡고,
   * 요소를 드러내 말했는데 전체를 골랐으면 말한 번호를 버린 것이라 떨어진다.
   */
  it.each([
    [
      "rotate",
      { direction: "cw" },
      { op: "rotate", targets: "all", direction: "cw" },
    ],
    [
      "mirror",
      { axis: "vertical" },
      { op: "mirror", targets: "all", axis: "vertical" },
    ],
  ] as const)(
    "%s — «그림 전체»는 번호를 말하지 않았을 때만",
    (op, extra, expected) => {
      expect(assemble(op, extra, "all", "그림 전체를 고쳐줘")).toEqual(
        expected,
      );
      expect(assemble(op, extra, "all", "요소 15를 고쳐줘")).toBeNull();
    },
  );
});

describe("빠른 길 전체", () => {
  it("명령이 서면 지금과 같은 모양의 결과를 돌려준다", async () => {
    ask.mockResolvedValue(
      answers({ op: "addAngle", pointA: "B", pointB: "A", pointC: "C" }),
    );
    const result = await tryJevFigureEdit(request, {
      env: envOf({ TYPESAFE_API_KEY: "key" }),
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
        env: envOf({ TYPESAFE_API_KEY: "key" }),
      }),
    ).toBeNull();
    ask.mockResolvedValue(answers({ op: "none" }));
    expect(
      await tryJevFigureEdit(request, {
        env: envOf({ TYPESAFE_API_KEY: "key" }),
      }),
    ).toBeNull();
  });

  it("꺼져 있으면 TypeSafe를 아예 부르지 않는다", async () => {
    expect(await tryJevFigureEdit(request, { env: envOf() })).toBeNull();
    expect(
      await tryJevFigureEdit(request, {
        env: envOf({ TYPESAFE_API_KEY: "key", STUDIO_AI_JEV: "off" }),
      }),
    ).toBeNull();
    expect(ask).not.toHaveBeenCalled();
  });

  it("남은 시간이 시한보다 빠듯하면 건너뛴다 — 지금 경로의 몫을 뺏지 않는다", async () => {
    expect(
      await tryJevFigureEdit(request, {
        env: envOf({ TYPESAFE_API_KEY: "key" }),
        deadlineAt: Date.now() + 500,
      }),
    ).toBeNull();
    expect(ask).not.toHaveBeenCalled();
  });

  it("그림이나 요청이 없으면 묻지 않는다", async () => {
    expect(
      await tryJevFigureEdit(
        { ...request, figure: undefined },
        { env: envOf({ TYPESAFE_API_KEY: "key" }) },
      ),
    ).toBeNull();
    expect(
      await tryJevFigureEdit(
        { ...request, content: "  " },
        { env: envOf({ TYPESAFE_API_KEY: "key" }) },
      ),
    ).toBeNull();
    expect(ask).not.toHaveBeenCalled();
  });

  it("이미지를 보내지 않는다 — Jev 는 그림을 못 본다", async () => {
    ask.mockResolvedValue(answers({ op: "delete", target: "2" }));
    await tryJevFigureEdit(request, {
      env: envOf({ TYPESAFE_API_KEY: "key" }),
    });
    const state = ask.mock.calls[0]?.[0]?.state as string;
    expect(state).not.toContain("data:image");
    expect(state).not.toContain("YWJj");
    expect(state).toContain("각 ABC에 각 표시");
  });
});

describe("운영 로그", () => {
  // 빠른 길이 몇 번 먹었고 왜 떨어졌는지를 운영 로그에서 세기 위한 한 줄. 요청 글·요소 목록은 남기지 않는다.
  it("먹었나·떨어졌나와 그 까닭을 한 줄로 남긴다", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const env = envOf({ TYPESAFE_API_KEY: "key" });
    const deleting = { ...request, content: "요소 2를 지워 주세요." };

    ask.mockResolvedValue(answers({ op: "delete", target: "2" }));
    await tryJevFigureEdit(deleting, { env });
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("[jev] figure-edit 빠른 길 op=delete"),
    );

    for (const [picked, why] of [
      [{ op: "delete" }, "인자 안 참"],
      [{ op: "delete", target: "2", scope: "many" }, "고칠 곳이 여럿"],
    ] as const) {
      info.mockClear();
      ask.mockResolvedValue(answers(picked));
      await tryJevFigureEdit(deleting, { env });
      expect(info).toHaveBeenCalledWith(
        expect.stringContaining(`떨어짐 (${why})`),
      );
    }

    // «읽는 차례» 문지기에 걸린 것 — 번호를 안 말한 요청(빠른 길을 잃는 꼴)과 말한 번호를 어긴 고름을 따로 센다
    for (const [content, why] of [
      ["2를 지워 주세요.", "요소 번호 안 말함"],
      ["요소 1을 지워 주세요.", "말한 요소 번호와 다름"],
    ] as const) {
      info.mockClear();
      ask.mockResolvedValue(answers({ op: "delete", target: "2" }));
      await tryJevFigureEdit({ ...request, content }, { env });
      expect(info).toHaveBeenCalledWith(
        expect.stringContaining(`떨어짐 (${why}) op=delete`),
      );
      for (const call of info.mock.calls)
        expect(String(call[0])).not.toContain("지워 주세요");
    }

    info.mockClear();
    ask.mockResolvedValue(answers({ op: "delete", target: "2" }, 0.4));
    await tryJevFigureEdit(request, { env });
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("떨어짐 (확신 낮음)"),
    );

    info.mockClear();
    ask.mockResolvedValue(null);
    await tryJevFigureEdit(request, { env });
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("떨어짐 (응답 없음·시한 초과)"),
    );

    // 요청 글은 로그에 싣지 않는다
    for (const call of info.mock.calls)
      expect(String(call[0])).not.toContain("각 ABC");
  });
});

describe("배선 — 지금 경로는 한 글자도 달라지지 않는다", () => {
  beforeEach(() => {
    vi.stubEnv("TYPESAFE_API_KEY", "key");
    // 시험 안에서는 기본이 «꺼짐»이다(`isJevEnabled` 머리말) — 배선을 재려면 손수 켠다.
    vi.stubEnv("STUDIO_AI_JEV", "on");
  });
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

  it("맨 숫자(«2를 지워»)는 빠른 길이 안 지운다 — 지금 경로가 규칙대로 읽는다", async () => {
    ask.mockResolvedValue(answers({ op: "delete", target: "2" }));
    const bare = { ...request, content: "2를 지워 주세요." };
    const inference = vi.fn<FigureEditInference>(async () =>
      JSON.stringify({ commands: [{ op: "delete", target: 3 }] }),
    );
    const result = await editDevAiFigure(bare, undefined, inference);
    expect(ask).toHaveBeenCalledTimes(1);
    expect(inference).toHaveBeenCalledTimes(1);
    expect(inference.mock.calls[0][0].prompt).toBe(buildFigureEditPrompt(bare));
    expect(result.edits).toEqual([{ op: "delete", target: 3 }]);
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
