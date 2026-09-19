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
    // 도형·변환(원장님 2026-09-19 «추가할 수 있는 것 전부») — 점은 이름으로 받고 발·반지름·중점·교점은 코드가 계산한다.
    // 적용 본체는 figure-editor/figureShapeOps.ts.
    /** 원 — 중심과, 지나는 점(«반지름 OA» 면 through A) 또는 반지름 r 중 하나. 편집기 원 도구와 같은 요소. */
    z
      .object({
        op: z.literal("addCircle"),
        center: PointRefSchema,
        through: PointRefSchema.optional(),
        r: size.positive().optional(),
        dashed: z.boolean().optional(),
      })
      .strict()
      .refine(
        (c) => (c.through === undefined) !== (c.r === undefined),
        "반지름(r)이나 지나는 점(through) 중 하나만 줍니다.",
      ),
    /** 원호 — center 둘레로 from → to, 짧은 쪽. via 를 주면 그 점을 지나는 쪽(호 ACB). 엔진 add_arc 와 같은 `M … A …`. */
    z
      .object({
        op: z.literal("addArc"),
        center: PointRefSchema,
        from: PointRefSchema,
        to: PointRefSchema,
        via: PointRefSchema.optional(),
        dashed: z.boolean().optional(),
      })
      .strict(),
    /** 크기 — 원의 반지름(그림 좌표) 또는 원·타원·사각형·다각형의 배율(가운데 그대로). 크기 고정은 거절. */
    z
      .object({
        op: z.literal("resize"),
        target,
        r: size.positive().optional(),
        scale: z.number().finite().min(0.1).max(10).optional(),
      })
      .strict()
      .refine(
        (c) => (c.r === undefined) !== (c.scale === undefined),
        "반지름(r)이나 배율(scale) 중 하나만 줍니다.",
      ),
    /** 90° 회전 — 편집기 «시계 90°»·«반시계 90°» 단추와 같은 함수(figureRotate.ts). 여럿은 한 덩어리로. */
    z
      .object({
        op: z.literal("rotate"),
        targets: z.union([
          z.array(target).min(1).max(FIGURE_EDIT_MAX_ELEMENTS),
          z.literal("all"),
        ]),
        direction: z.enum(["cw", "ccw"]),
      })
      .strict(),
    /** 색칠 — 편집기 채우기 통과 같은 면. at 은 칸의 꼭짓점들(차례대로) 또는 칸 안의 점 하나. */
    z
      .object({
        op: z.literal("fillRegion"),
        at: z.union([PointRefSchema, z.array(PointRefSchema).min(3).max(12)]),
        color: color.optional(),
      })
      .strict(),
    /** 수선 — from 에서 직선 onto 에 내린 수선 + 직각 표시. 발은 코드가 계산하고, 선분 밖이면 연장선을 점선으로. */
    z
      .object({
        op: z.literal("addPerpendicular"),
        from: PointRefSchema,
        onto: z.tuple([PointRefSchema, PointRefSchema]),
        foot: label.optional(),
        dashed: z.boolean().optional(),
      })
      .strict(),
    /** 중점 — 점 더하기(addPoint)와 같은 점. */
    z
      .object({
        op: z.literal("addMidpoint"),
        from: PointRefSchema,
        to: PointRefSchema,
        label: label.optional(),
      })
      .strict(),
    /** 두 직선의 교점 — 점 더하기(addPoint)와 같은 점. */
    z
      .object({
        op: z.literal("addIntersection"),
        lines: z.tuple([
          z.tuple([PointRefSchema, PointRefSchema]),
          z.tuple([PointRefSchema, PointRefSchema]),
        ]),
        label: label.optional(),
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
