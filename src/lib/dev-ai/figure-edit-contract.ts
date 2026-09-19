import { z } from "zod";

/**
 * 도형 편집기 «요청대로 고치기»의 계약 — 서버(지시문·응답 읽기)와 편집기(요소 목록·명령 적용)가 같이 쓴다.
 * 원장님 2026-09-19 «처음부터 그리는 건 별로 같은데? … 사용자가 요청한 것만 바꾼다든가 추가하든지 삭제하든지»:
 * AI 는 그림을 새로 그리지 않고 **작은 수정 명령 목록**만 돌려준다. 좌표는 모두 그림 자체의 좌표(viewBox, y 아래).
 */

/** 한 번에 받는 명령 수 — 이보다 많으면 고치는 게 아니라 다시 그리는 것이다. */
export const FIGURE_EDIT_MAX_COMMANDS = 20;
/** 요소 목록 상한 — 눈금 많은 그래프도 들어가고 지시문은 수십 KB 안에 머문다. */
export const FIGURE_EDIT_MAX_ELEMENTS = 400;
/** 요소 하나에 싣는 핵심 좌표 상한 — 편집기 조절점 상한(꼭짓점 32개)과 같다. */
export const FIGURE_EDIT_MAX_POINTS = 32;

const coordinate = z.number().finite().min(-100_000).max(100_000);
const size = z.number().finite().min(0).max(100_000);
/** 글자 — 제어 문자 없이. 수식은 편집기처럼 `$…$`. */
const label = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[^\p{Cc}]*$/u);
const target = z.number().int().min(1).max(FIGURE_EDIT_MAX_ELEMENTS);
const color = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
/** 점 이름(요소 목록 `names` 의 이름) 또는 좌표. */
const PointRefSchema = z.union([
  z.string().trim().min(1).max(12),
  z.object({ x: coordinate, y: coordinate }).strict(),
]);
/** 겹 표시 수 — 같은 길이 눈금·평행 »·각의 호(1~3). */
const markCount = z.number().int().min(1).max(3);

export const FigureEditCommandSchema = z
  .discriminatedUnion("op", [
    z.object({ op: z.literal("delete"), target }).strict(),
    z
      .object({ op: z.literal("move"), target, dx: coordinate, dy: coordinate })
      .strict(),
    z.object({ op: z.literal("text"), target, text: label }).strict(),
    z
      .object({
        op: z.literal("style"),
        target,
        /** 선 색 — 글자는 글자 색. */
        color: color.optional(),
        /** 선 두께. */
        width: z.number().finite().min(0.2).max(12).optional(),
        dashed: z.boolean().optional(),
        fill: z.union([color, z.literal("none")]).optional(),
        fontSize: z.number().finite().min(6).max(72).optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("point"),
        target,
        /** 요소 목록 `points` 의 차례(1부터) — 선분은 1 시작점 · 2 끝점. */
        vertex: z.number().int().min(1).max(FIGURE_EDIT_MAX_POINTS),
        x: coordinate,
        y: coordinate,
      })
      .strict(),
    z
      .object({
        op: z.literal("addLine"),
        from: PointRefSchema,
        to: PointRefSchema,
        dashed: z.boolean().optional(),
        arrow: z.boolean().optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("addText"),
        text: label,
        x: coordinate,
        y: coordinate,
      })
      .strict(),
    z
      .object({
        op: z.literal("addPoint"),
        x: coordinate,
        y: coordinate,
        label: label.optional(),
      })
      .strict(),
    /**
     * 표시(원장님 2026-09-19 «추가할 수 있는 것 전부») — 모양은 도형 엔진 v2 와 같다(figureMarks.ts).
     * 치수: 두 점 사이 점선 곡선 + 값(값 자리에 틈). side 는 곡선이 설 쪽 — 없으면 도형 밖.
     * 같은 길이 표시: 선분 한가운데를 가로지르는 눈금 count 줄. 평행 표시: from→to 를 가리키는 » count 개.
     * 눈금·평행 표시는 그림에 그려진 선분 위에만 단다.
     */
    z
      .object({
        op: z.literal("addDimension"),
        from: PointRefSchema,
        to: PointRefSchema,
        text: label,
        side: z
          .enum(["out", "in", "above", "below", "left", "right"])
          .optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("addTick"),
        from: PointRefSchema,
        to: PointRefSchema,
        count: markCount.optional(),
      })
      .strict(),
    z
      .object({
        op: z.literal("addParallelMark"),
        from: PointRefSchema,
        to: PointRefSchema,
        count: markCount.optional(),
      })
      .strict(),
    /**
     * 곡선·꺾은선을 두 끝을 잇는 현에 대해 거울 대칭 — 끝은 그대로, 부푼 쪽만 반대편으로. 딸린 값 글자도 대칭 자리로
     * (원장님 2026-09-19 «선분 BC의 치수선을 선분 BC 아래로» 를 점 하나씩 옮겨 흉내 내다 호가 꺾였다).
     */
    z.object({ op: z.literal("flip"), target }).strict(),
    /**
     * 각 표시 — 꼭짓점 at 에서 반직선 at→from 과 at→to 사이 **작은 쪽** 각에 호, 직각이면 작은 네모
     * (원장님 2026-09-19 «각 ACB에 각 표시» 가 422 — 더할 명령이 없었다). right 가 없으면 그림의 각으로 정한다.
     */
    z
      .object({
        op: z.literal("addAngle"),
        at: PointRefSchema,
        from: PointRefSchema,
        to: PointRefSchema,
        right: z.boolean().optional(),
        /** 겹 호(같은 각끼리 같은 수) — 반지름을 3 씩 줄인 호를 더 긋는다. */
        arcs: markCount.optional(),
      })
      .strict(),
  ])
  .superRefine((command, ctx) => {
    if (
      command.op === "style" &&
      [
        command.color,
        command.width,
        command.dashed,
        command.fill,
        command.fontSize,
      ].every((value) => value === undefined)
    )
      ctx.addIssue({ code: "custom", message: "바꿀 서식이 없습니다." });
  });
export type FigureEditCommand = z.infer<typeof FigureEditCommandSchema>;
export type FigureEditPointRef = z.infer<typeof PointRefSchema>;

const point = z.tuple([coordinate, coordinate]);
export const FigureEditElementSchema = z
  .object({
    /** 편집기 번호(요소 목록·그림 위 번호) — 1부터. */
    n: target,
    /** 선분·원·글자·수식·함수 그래프 … (편집기 요소 목록의 이름). */
    kind: z.string().trim().min(1).max(20),
    /** 사용자가 이름 붙인 묶음(편집기 «묶음 만들기») — 역할 어림은 싣지 않는다. */
    role: z.string().trim().min(1).max(40).optional(),
    /** 글자 요소의 내용 — 수식은 `$…$` 그대로. */
    text: z.string().max(200).optional(),
    /** 핵심 좌표(그림 좌표) — 선분 [시작, 끝] · 다각형·경로 꼭짓점 · 사각형 네 모서리 · 원 중심 · 글자 자리. */
    points: z.array(point).max(FIGURE_EDIT_MAX_POINTS).optional(),
    r: size.optional(),
    rx: size.optional(),
    ry: size.optional(),
    /** 꼭짓점을 싣지 못한 곡선(함수 그래프 등)의 경계 [x1, y1, x2, y2]. */
    box: z.tuple([coordinate, coordinate, coordinate, coordinate]).optional(),
    color: z.string().max(40).optional(),
    width: size.optional(),
    dashed: z.literal(true).optional(),
    fill: z.string().max(40).optional(),
    fontSize: size.optional(),
    /** 크기 고정 — 옮기기만 된다. */
    locked: z.literal(true).optional(),
  })
  .strict();
export type FigureEditElement = z.infer<typeof FigureEditElementSchema>;

export const FigureEditFigureSchema = z
  .object({
    viewBox: z.tuple([
      coordinate,
      coordinate,
      z.number().finite().positive().max(100_000),
      z.number().finite().positive().max(100_000),
    ]),
    elements: z.array(FigureEditElementSchema).max(FIGURE_EDIT_MAX_ELEMENTS),
    /** 라벨로 이름 붙은 점(A·B·P′ …) — 선분 더하기가 이름으로 가리킨다. */
    names: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(12),
            x: coordinate,
            y: coordinate,
          })
          .strict(),
      )
      .max(60)
      .optional(),
  })
  .strict()
  .refine(
    (figure) =>
      figure.elements.every((element, index) => element.n === index + 1),
    "요소 번호는 1부터 차례대로여야 합니다.",
  );
export type FigureEditFigure = z.infer<typeof FigureEditFigureSchema>;
