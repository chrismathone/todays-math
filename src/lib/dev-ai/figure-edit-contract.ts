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
/**
 * 요소 번호 상한 — 번호는 요소에 붙은 고정 번호라(편집기 `figureNumbers`, 원장님 2026-09-21 «순서를 바꿔도 요소 번호가
 * 안바뀌게») 지운 번호는 비워 둔다. 오래 고친 그림은 요소가 적어도 번호가 요소 수 상한을 넘을 수 있어 따로 둔다
 * (편집기가 받는 번호 자릿수와 같은 여섯 자리).
 */
export const FIGURE_EDIT_MAX_NUMBER = 999_999;
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
const target = z.number().int().min(1).max(FIGURE_EDIT_MAX_NUMBER);
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
    /**
     * 점 이름(A·D·P′ …) — 그 점 곁에 이름을 붙인다. 자리는 엔진 꼭짓점 라벨 규칙 그대로(바깥쪽 여덟 방향·다섯 거리
     * 가운데 선·다른 이름을 피하는 자리). position 을 주면 그쪽으로만 — N 이 위다(그림 좌표는 y 가 아래).
     * 적용 본체는 figure-editor/figureLabelOps.ts.
     */
    z
      .object({
        op: z.literal("addLabel"),
        at: PointRefSchema,
        text: label,
        position: z
          .enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"])
          .optional(),
      })
      .strict(),
    /**
     * 이미 있는 점 이름의 자리를 다시 잡는다 — 선·다른 글자를 밟는 이름을 엔진 규칙으로 비켜 세운다
     * (원장님 2026-08-25 «텍스트가 선을 침범한다»). position 을 주면 그쪽으로.
     */
    z
      .object({
        op: z.literal("relabel"),
        target,
        position: z
          .enum(["N", "NE", "E", "SE", "S", "SW", "W", "NW"])
          .optional(),
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
    /**
     * 대칭 — 편집기 «좌우 대칭»·«상하 대칭» 단추와 같은 함수(figureMirror.ts). 여럿은 한 덩어리로.
     * 축은 세로(좌우 뒤집기)·가로(상하 뒤집기) 또는 **두 점이 정하는 직선**(그림에 그려져 있지 않아도 된다).
     */
    z
      .object({
        op: z.literal("mirror"),
        targets: z.union([
          z.array(target).min(1).max(FIGURE_EDIT_MAX_ELEMENTS),
          z.literal("all"),
        ]),
        axis: z.union([
          z.enum(["vertical", "horizontal"]),
          z.tuple([PointRefSchema, PointRefSchema]),
        ]),
      })
      .strict(),
    /**
     * 순서 — 편집기 «맨 앞으로·앞으로·뒤로·맨 뒤로» 단추·단축키와 같은 함수(figureOrder.ts), 원장님 2026-09-21
     * «Ai 명령으로 순서 조절도 가능하게해». 가리킨 요소가 묶음에 들었으면 묶음 전부가 한 덩어리로 간다.
     * 번호는 고정이라 순서를 바꿔도 안 바뀐다 — 같은 요청의 뒤 명령도 같은 번호를 쓴다.
     */
    z
      .object({
        op: z.literal("order"),
        targets: z.array(target).min(1).max(FIGURE_EDIT_MAX_ELEMENTS),
        to: z.enum(["front", "forward", "backward", "back"]),
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
    // 직선·원(원장님 2026-09-20 «아직 없는 명령을 전부») — 연장 · 평행선 · 수직이등분선 · 각의 이등분선 ·
    // 접선 · 외접원 · 내접원 · 원의 교점 · 호의 중점. 적용 본체는 figure-editor/figureLineCircleOps.ts.
    // 외심·내심·접점·교점은 **코드가 계산한다** — 모델이 지은 좌표를 믿지 않는다.
    /**
     * 선분 연장 — 그려진 선분 from→to 를 to 쪽으로 잇는다(그 선분과 같은 서식의 새 선분 하나).
     * length 면 그만큼, until 이면 그 점·그 직선까지, 아무것도 없으면 선분 길이의 1/3 을 그림 틀 안까지.
     */
    z
      .object({
        op: z.literal("extendLine"),
        from: PointRefSchema,
        to: PointRefSchema,
        length: size.positive().optional(),
        until: z
          .union([PointRefSchema, z.tuple([PointRefSchema, PointRefSchema])])
          .optional(),
        dashed: z.boolean().optional(),
      })
      .strict()
      .refine(
        (c) => c.length === undefined || c.until === undefined,
        "길이(length)와 until 중 하나만 줍니다.",
      ),
    /** 평행선 — through 를 지나고 직선 to 에 평행한 선분. 기본은 기준 선분을 그대로 평행이동(같은 길이). */
    z
      .object({
        op: z.literal("addParallel"),
        through: PointRefSchema,
        to: z.tuple([PointRefSchema, PointRefSchema]),
        length: size.positive().optional(),
        dashed: z.boolean().optional(),
      })
      .strict(),
    /** 수직이등분선 — 선분의 중점에서 직각으로. 직각 표시는 늘 달고, label 은 중점 이름. */
    z
      .object({
        op: z.literal("addPerpendicularBisector"),
        from: PointRefSchema,
        to: PointRefSchema,
        label: label.optional(),
        dashed: z.boolean().optional(),
      })
      .strict(),
    /** 각의 이등분선 — 꼭짓점 at 에서 각 from-at-to 를 반으로. until 이면 그 직선과 만나는 데까지. */
    z
      .object({
        op: z.literal("addAngleBisector"),
        at: PointRefSchema,
        from: PointRefSchema,
        to: PointRefSchema,
        until: z.tuple([PointRefSchema, PointRefSchema]).optional(),
        label: label.optional(),
        dashed: z.boolean().optional(),
      })
      .strict(),
    /**
     * 접선 — circle 은 그림에 있는 원의 **중심**. at 은 원 위의 점(접선 하나), from 은 밖의 점(접선 둘 —
     * 접점을 코드가 계산하고 labels 가 이름을 준다). rightAngle 이면 접점에 반지름과의 직각 표시.
     */
    z
      .object({
        op: z.literal("addTangent"),
        circle: PointRefSchema,
        at: PointRefSchema.optional(),
        from: PointRefSchema.optional(),
        labels: z.array(label).min(1).max(2).optional(),
        rightAngle: z.boolean().optional(),
        dashed: z.boolean().optional(),
      })
      .strict()
      .refine(
        (c) => (c.at === undefined) !== (c.from === undefined),
        "원 위의 점(at)이나 밖의 점(from) 중 하나만 줍니다.",
      ),
    /** 외접원 — 세 점을 지나는 원. 외심은 코드가 계산하고 label 은 그 중심의 이름. */
    z
      .object({
        op: z.literal("addCircumcircle"),
        points: z.tuple([PointRefSchema, PointRefSchema, PointRefSchema]),
        label: label.optional(),
        dashed: z.boolean().optional(),
      })
      .strict(),
    /** 내접원 — 세 변에 모두 닿는 원. 내심은 코드가 계산하고 label 은 그 중심의 이름. */
    z
      .object({
        op: z.literal("addIncircle"),
        points: z.tuple([PointRefSchema, PointRefSchema, PointRefSchema]),
        label: label.optional(),
        dashed: z.boolean().optional(),
      })
      .strict(),
    /** 원의 교점 — 원(중심 circle)과 다른 원(중심 other) 또는 직선 line 이 만나는 점. 점 더하기와 같은 점. */
    z
      .object({
        op: z.literal("addCircleIntersection"),
        circle: PointRefSchema,
        other: PointRefSchema.optional(),
        line: z.tuple([PointRefSchema, PointRefSchema]).optional(),
        labels: z.array(label).min(1).max(2).optional(),
      })
      .strict()
      .refine(
        (c) => (c.other === undefined) !== (c.line === undefined),
        "다른 원(other)이나 직선(line) 중 하나만 줍니다.",
      ),
    /** 호의 중점 — center 둘레 from→to 호(짧은 쪽, via 면 그 점을 지나는 쪽)의 한가운데 점. */
    z
      .object({
        op: z.literal("addArcMidpoint"),
        center: PointRefSchema,
        from: PointRefSchema,
        to: PointRefSchema,
        via: PointRefSchema.optional(),
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
        /** 원근(입체·실물 장면) 그림의 직각 — 종이 위 각이 90° 가 아니어도 기운 ㄱ자로(right:true 와 함께). */
        perspective: z.boolean().optional(),
        /** 겹 호(같은 각끼리 같은 수) — 반지름을 3 씩 줄인 호를 더 긋는다. */
        arcs: markCount.optional(),
        /** 각의 크기 글자(«40°»·«$x$») — 엔진처럼 이등분선 위, 좁으면 밖으로 끌어내고 지시선을 긋는다. */
        text: label.optional(),
      })
      .strict(),
  ])
  .superRefine((command, ctx) => {
    if (command.op === "addAngle" && command.perspective === true && command.right !== true)
      ctx.addIssue({ code: "custom", message: "원근 직각 표시는 right:true와 함께 사용합니다." });
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
  // 번호는 편집기의 고정 번호 — 지운 번호는 비어 있다(D-135 ⑸). 겹치지 않고 번호 차례로만 받는다.
  .refine(
    (figure) =>
      figure.elements.every(
        (element, index) =>
          index === 0 || element.n > figure.elements[index - 1].n,
      ),
    "요소 번호는 겹치지 않고 번호 차례여야 합니다.",
  );
export type FigureEditFigure = z.infer<typeof FigureEditFigureSchema>;
