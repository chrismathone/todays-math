import "server-only";
import {
  askJev,
  isJevEnabled,
  JEV_MAX_CHOICES,
  JEV_MAX_STATE_CHARS,
  JEV_TIMEOUT_MS,
} from "@/lib/jev/client";
import type { JevAnswer, JevChoiceQuestion } from "@/lib/jev/client";
import type { DevAiRequest, DevAiResult } from "./contracts";
import {
  FigureEditCommandSchema,
  type FigureEditCommand,
  type FigureEditFigure,
} from "./figure-edit-contract";
import { explicitElementNumbers } from "./figure-edit-prompt";

/**
 * «요청대로 고치기»의 빠른 길 — Jev(선택지에 확률을 매기는 모델)에게 **어느 명령·어느 점·어느 요소**만 묻고,
 * 명령은 **코드가 조립·검산**한다. 좌표는 모델에게 맡기지 않는다(트랙 21 규칙: 점 이름만 받고 코드가 계산한다).
 *
 * 이 길은 «선택»이다. 확신이 낮거나·인자가 안 차거나·꺼져 있거나·느리면 `null` 을 돌려주고
 * 부르는 쪽이 지금 경로(Gemini·구독 CLI)를 그대로 탄다. 원장님께 보이는 문구·결과는 한 글자도 달라지지 않는다.
 */

export type FigureEditOp = FigureEditCommand["op"];

/**
 * 문턱 — 리드 2026-09-20 실측: 맞은 것의 확신 0.93~1.00, 틀린 것 0.28·0.36. 그 사이를 0.9 로 가른다.
 * 🔴 **«명령» 물음에만 쓴다.** 인자 물음은 선택지가 서로 비슷해 확신이 구조적으로 낮다(0.48~0.96) —
 * 문턱으로 쓰면 맞은 답까지 버린다. 인자는 아래 조립기가 «그림에 있는 이름인가·계약을 통과하는가»로 검산한다.
 */
export const JEV_MIN_CONFIDENCE = 0.9;
/** 선택지의 «해당 없음» — 억지로 고르게 하지 않는다. */
const NONE = "none";
/** 요소 물음의 «그림 전체» — rotate·mirror 가 받는 `targets: "all"`. */
const ALL = "all";

/**
 * 명령 문구 표 — 선택지의 뜻을 Jev 에게 알려 준다.
 * 🔴 **계약(`figure-edit-contract.ts`)에 op 가 늘면 이 표가 타입 수준에서 빨개진다**(`Record<FigureEditOp, …>`).
 * 런타임에서도 `jevFigureEdit.test.ts` 가 계약에서 뽑은 목록과 대조한다. 2026-09-19 «각 ACB에 각 표시» 가
 * 지시문 목록에 없어 422 가 났다 — 같은 함정이 여기서 **조용히** 반복되지 않게 하는 것이 이 트랙의 제일 중요한 가드다.
 */
export const FIGURE_EDIT_OP_LABELS: Record<FigureEditOp, string> = {
  delete: "요소를 지운다",
  move: "요소를 통째로 옮긴다",
  text: "글자 요소의 내용을 바꾼다",
  style: "색·두께·점선·채우기·글자 크기를 바꾼다",
  point: "요소의 꼭짓점 하나를 옮긴다",
  addLine: "두 점을 잇는 선분을 더한다",
  addText: "새 글자를 그림에 더한다",
  addLabel: "점에 이름을 붙인다",
  relabel: "이미 붙은 점 이름의 자리를 고친다",
  addPoint: "새 점을 찍는다",
  addCircle: "원을 더한다",
  addArc: "원호를 더한다",
  resize: "요소의 크기를 바꾼다",
  rotate: "요소를 90° 돌린다",
  mirror: "요소를 대칭으로 뒤집는다",
  order: "요소를 맨 앞·앞·뒤·맨 뒤로 보내 겹쳐 그려지는 차례를 바꾼다",
  fillRegion: "닫힌 칸을 색칠한다",
  addPerpendicular: "한 점에서 직선에 수선을 내린다",
  addMidpoint: "선분의 중점을 찍는다",
  addIntersection: "두 직선이 만나는 점을 찍는다",
  extendLine: "그려진 선분을 잇대어 연장한다",
  addParallel: "한 점을 지나 직선과 평행한 선분을 더한다",
  addPerpendicularBisector: "선분의 수직이등분선을 더한다",
  addAngleBisector: "각의 이등분선을 더한다",
  addTangent: "원의 접선을 더한다",
  addCircumcircle: "세 점을 지나는 외접원을 더한다",
  addIncircle: "삼각형의 내접원을 더한다",
  addCircleIntersection: "원과 다른 원·직선이 만나는 점을 찍는다",
  addArcMidpoint: "호의 한가운데 점을 찍는다",
  addDimension: "두 점 사이 길이 표시를 값과 함께 더한다",
  addTick: "선분에 같은 길이 눈금을 단다",
  addParallelMark: "선분에 평행 표시를 단다",
  flip: "곡선·치수선을 반대쪽으로 넘긴다",
  addAngle: "각에 각 표시(호·직각 네모)를 단다",
};

/**
 * 계약의 op 목록 — 선택지를 여기서 **파생**시킨다(표를 손으로 베끼지 않는다).
 * 뽑지 못하면 빈 배열이고, 그러면 빠른 길이 꺼진다(시험도 같이 빨개진다).
 */
function contractOpFields(): ReadonlyMap<FigureEditOp, ReadonlySet<string>> {
  const options = (
    FigureEditCommandSchema as unknown as {
      def?: { options?: readonly unknown[] };
    }
  ).def?.options;
  const fields = new Map<FigureEditOp, ReadonlySet<string>>();
  if (!Array.isArray(options)) return fields;
  for (const option of options) {
    const shape = (
      option as {
        def?: {
          shape?: Record<string, { def?: { values?: readonly unknown[] } }>;
        };
      }
    ).def?.shape;
    const literal = shape?.op?.def?.values?.[0];
    if (!shape || typeof literal !== "string" || !literal) return new Map();
    fields.set(literal as FigureEditOp, new Set(Object.keys(shape)));
  }
  return fields;
}
export function contractFigureEditOps(): readonly FigureEditOp[] {
  return [...contractOpFields().keys()];
}
/**
 * 계약이 이 명령에 점선(`dashed`)을 받는가 — 손으로 적은 표를 두지 않고 스키마에서 본다.
 * 계약은 명령마다 다르다(`addMidpoint`·`addArcMidpoint` 는 안 받는다). 어긋나면 «점선으로»라고 말한
 * 요청만 조용히 떨어져, 손으로 적은 표로는 알아채기 어렵다.
 */
export function contractOpAcceptsDashed(op: FigureEditOp): boolean {
  return contractOpFields().get(op)?.has("dashed") ?? false;
}

/**
 * 빠른 길에 넣는 명령 — **고정 물음(명령·요소·점 셋·방향·축·차례·개수·점선)만으로 인자가 다 차는 것**뿐이다.
 * 순서(`order`)는 요청 글이 요소 번호를 드러내 말했을 때만 맡는다(«읽는 차례», 아래 조립기).
 * 좌표(move·point·addText·addPoint)나 글자(text·addLabel·addDimension)나 값(style·resize)이 필요한 명령,
 * 점이 넷 이상인 명령(addIntersection·addCircleIntersection)과 원 안팎을 가려야 하는 addTangent 는 뺐다 —
 * 그런 요청은 지금 경로가 그대로 맡는다.
 */
export const JEV_FAST_PATH_OPS: readonly FigureEditOp[] = [
  "delete",
  "relabel",
  "flip",
  "rotate",
  "mirror",
  "order",
  "addLine",
  "addMidpoint",
  "addPerpendicularBisector",
  "extendLine",
  "addTick",
  "addParallelMark",
  "addCircle",
  "addArc",
  "addAngle",
  "addAngleBisector",
  "addPerpendicular",
  "addParallel",
  "addCircumcircle",
  "addIncircle",
  "addArcMidpoint",
  "fillRegion",
];

const withNone = (criteria: Record<string, string | null>) => ({
  ...criteria,
  [NONE]: "해당 없음",
});
const choice = (
  instructions: string,
  criteria: Record<string, string | null>,
): JevChoiceQuestion => ({ type: "choice", instructions, criteria });

/**
 * 고정 물음 집합 — 한 요청에 묶어 병렬로 묻는다. 점·요소 선택지는 **그 그림의** 이름·번호에서 짓는다.
 * 선택지가 한도를 넘거나 요청 글이 비면 `null`(빠른 길을 끈다).
 */
export function buildFigureEditQuestions(
  figure: FigureEditFigure,
  requestText: string,
): Record<string, JevChoiceQuestion> | null {
  if (!requestText.trim()) return null;
  const ops = contractFigureEditOps();
  if (!ops.length) return null;
  const opCriteria: Record<string, string | null> = {};
  for (const op of ops) {
    const label = FIGURE_EDIT_OP_LABELS[op];
    // 계약에 op 가 늘었는데 문구가 없으면 억측하지 않고 빠른 길을 끈다.
    if (!label?.trim()) return null;
    opCriteria[op] = label;
  }
  const names = (figure.names ?? []).map((name) => name.name);
  const questions: Record<string, JevChoiceQuestion> = {
    op: choice(
      "이 요청은 지금 그림에 무엇을 하라는 것인가. 어느 명령에도 맞지 않으면 해당 없음을 고른다.",
      withNone(opCriteria),
    ),
    scope: choice(
      "이 요청은 그림에서 몇 군데를 고치라는 것인가. 한 군데만 고치면 되는지, 서로 다른 곳을 두 가지 이상 고쳐야 하는지.",
      {
        one: "한 군데만 고치면 된다",
        many: "서로 다른 곳을 두 가지 이상 고쳐야 한다",
      },
    ),
    target: choice(
      "그 명령이 가리키는 지금 그림의 요소 번호. 요소를 가리키지 않는 요청이면 해당 없음.",
      withNone({
        ...Object.fromEntries(
          figure.elements.map((element) => [
            String(element.n),
            [element.kind, element.text].filter(Boolean).join(" "),
          ]),
        ),
        [ALL]: "그림 전체",
      }),
    ),
    direction: choice(
      "돌리라는 방향. 돌리라는 요청이 아니면 해당 없음.",
      withNone({ cw: "시계 방향", ccw: "반시계 방향" }),
    ),
    layer: choice(
      "겹쳐 그려지는 차례를 어떻게 바꾸라는가. 차례를 바꾸라는 요청이 아니면 해당 없음.",
      withNone({
        front: "맨 앞으로(모든 것 위로)",
        forward: "앞으로(한 칸 위로)",
        backward: "뒤로(한 칸 아래로)",
        back: "맨 뒤로(모든 것 아래로)",
      }),
    ),
    axis: choice(
      "대칭으로 뒤집을 축. 뒤집으라는 요청이 아니면 해당 없음.",
      withNone({
        vertical: "좌우 뒤집기(세로축)",
        horizontal: "상하 뒤집기(가로축)",
      }),
    ),
    count: choice(
      "같은 표시를 몇 겹으로 그리라는가(눈금·평행 표시·각의 호). 겹 수를 말하지 않았으면 해당 없음.",
      withNone({ "1": "한 겹", "2": "두 겹", "3": "세 겹" }),
    ),
    dashed: choice("점선으로 그리라고 했는가.", {
      yes: "점선으로",
      no: "실선으로(말하지 않았으면 이쪽)",
    }),
  };
  if (names.length) {
    const points = Object.fromEntries(names.map((name) => [name, null]));
    questions.pointA = choice(
      "명령의 첫째 점 — 각의 꼭짓점, 원의 중심, 수선·평행선이 지나는 점, 세 점 중 첫째. 점을 쓰지 않는 요청이면 해당 없음.",
      withNone(points),
    );
    questions.pointB = choice(
      "명령의 둘째 점 — 선분·호의 한쪽 끝, 원이 지나는 점, 각의 한 변 위의 점, 세 점 중 둘째. 없으면 해당 없음.",
      withNone(points),
    );
    questions.pointC = choice(
      "명령의 셋째 점 — 각의 나머지 변 위의 점, 기준 직선의 둘째 점, 세 점 중 셋째. 없으면 해당 없음.",
      withNone(points),
    );
  }
  // 요소나 점 이름이 너무 많은 그림은 한 물음에 실을 수 없다 — 빠른 길을 끄고 지금 경로로.
  return Object.values(questions).some(
    (question) => Object.keys(question.criteria).length > JEV_MAX_CHOICES,
  )
    ? null
    : questions;
}

/** Jev 에게 보낼 공유 상태 — 요소 목록·점 이름·요청 글만. 이미지는 싣지 않는다(Jev 는 못 본다). */
export function buildFigureEditState(
  figure: FigureEditFigure,
  requestText: string,
): string {
  return JSON.stringify({
    request: requestText.trim(),
    viewBox: figure.viewBox,
    elements: figure.elements,
    names: figure.names ?? [],
  });
}

type Picks = Record<string, JevAnswer>;
const pick = (answers: Picks, id: string) => {
  const value = answers[id]?.choice;
  return value && value !== NONE ? value : undefined;
};

/**
 * 고른 값 → 명령 하나. **인자가 다 차고 계약을 통과할 때만** 명령을 만든다.
 * 점 이름은 그림의 `names` 에 있어야 하고, 요소 번호는 그림에 있어야 하며, 같은 점을 두 번 쓰지 않는다.
 */
export function assembleFigureEditCommand(
  answers: Picks,
  figure: FigureEditFigure,
  /** 요청 글 — 순서 명령만 본다(요소 번호를 드러내 말했나). 없으면 순서 명령은 맡지 않는다. */
  requestText = "",
): FigureEditCommand | null {
  const op = answers.op;
  if (!op || op.confidence < JEV_MIN_CONFIDENCE) return null;
  if (!(JEV_FAST_PATH_OPS as readonly string[]).includes(op.choice))
    return null;
  /**
   * 지금 경로는 한 번에 명령을 스물까지 돌려준다(`FIGURE_EDIT_MAX_COMMANDS`). 빠른 길은 **하나뿐**이라
   * «7번 선을 지우고 점 A 이름을 위로» 같은 두 가지 요청을 **반만** 고칠 수 있다 — 그러면 지금보다 나빠진다.
   * 선택지가 둘뿐이라 이 물음은 확신이 구조적으로 낮지 않다. 한 군데라고 확실할 때만 빠른 길을 탄다.
   */
  const scope = answers.scope;
  if (!scope || scope.choice !== "one" || scope.confidence < JEV_MIN_CONFIDENCE)
    return null;

  const known = new Set((figure.names ?? []).map((name) => name.name));
  const point = (id: string) => {
    const name = pick(answers, id);
    return name && known.has(name) ? name : undefined;
  };
  const [a, b, c] = [point("pointA"), point("pointB"), point("pointC")];
  const distinct = (...used: (string | undefined)[]) =>
    new Set(used).size === used.length;

  const raw = pick(answers, "target");
  const all = raw === ALL;
  const n = raw !== undefined && !all ? Number(raw) : undefined;
  const target =
    n !== undefined &&
    Number.isInteger(n) &&
    figure.elements.some((element) => element.n === n)
      ? n
      : undefined;
  const targets = all ? ALL : target !== undefined ? [target] : undefined;

  const direction = pick(answers, "direction");
  const axis = pick(answers, "axis");
  const countPick = pick(answers, "count");
  const count = countPick ? Number(countPick) : undefined;
  const wantsDashed = answers.dashed?.choice === "yes";
  // 고른 값은 위에서 빠른 길 목록에 있음을 확인했다.
  const dashedFor = (chosen: string) =>
    wantsDashed && contractOpAcceptsDashed(chosen as FigureEditOp)
      ? { dashed: true }
      : {};

  const command = ((): Record<string, unknown> | null => {
    switch (op.choice) {
      case "delete":
      case "relabel":
      case "flip":
        return target === undefined ? null : { op: op.choice, target };
      case "rotate":
        return targets && direction
          ? { op: "rotate", targets, direction }
          : null;
      case "mirror":
        return targets && axis ? { op: "mirror", targets, axis } : null;
      case "order": {
        // 원장님 2026-09-21 «요소를 입력하면 더 정확하게». 요소 물음은 지시문의 «읽는 차례»(맨 숫자는 그려진 글자,
        // «요소 N»·«N번 …»만 요소 번호)를 모른다 — 요청 글이 번호를 **하나** 드러내 말했고 고른 번호가 그것일 때만
        // 맡는다. 판정은 지시문의 보기와 같은 원천(`explicitElementNumbers`). 아니면 지금 경로가 규칙대로 읽는다.
        const to = pick(answers, "layer");
        const said = explicitElementNumbers(requestText);
        return target !== undefined &&
          to &&
          said.length === 1 &&
          said[0] === target
          ? { op: "order", targets: [target], to }
          : null;
      }
      case "addLine":
      case "addMidpoint":
      case "addPerpendicularBisector":
      case "extendLine":
        return a && b && distinct(a, b)
          ? { op: op.choice, from: a, to: b, ...dashedFor(op.choice) }
          : null;
      case "addTick":
      case "addParallelMark":
        return a && b && distinct(a, b)
          ? { op: op.choice, from: a, to: b, ...(count ? { count } : {}) }
          : null;
      case "addCircle":
        return a && b && distinct(a, b)
          ? { op: "addCircle", center: a, through: b, ...dashedFor(op.choice) }
          : null;
      case "addArc":
      case "addArcMidpoint":
        return a && b && c && distinct(a, b, c)
          ? {
              op: op.choice,
              center: a,
              from: b,
              to: c,
              ...dashedFor(op.choice),
            }
          : null;
      case "addAngle":
        return a && b && c && distinct(a, b, c)
          ? {
              op: "addAngle",
              at: a,
              from: b,
              to: c,
              ...(count ? { arcs: count } : {}),
            }
          : null;
      case "addAngleBisector":
        return a && b && c && distinct(a, b, c)
          ? {
              op: "addAngleBisector",
              at: a,
              from: b,
              to: c,
              ...dashedFor(op.choice),
            }
          : null;
      case "addPerpendicular":
        return a && b && c && distinct(a, b, c)
          ? {
              op: "addPerpendicular",
              from: a,
              onto: [b, c],
              ...dashedFor(op.choice),
            }
          : null;
      case "addParallel":
        return a && b && c && distinct(a, b, c)
          ? {
              op: "addParallel",
              through: a,
              to: [b, c],
              ...dashedFor(op.choice),
            }
          : null;
      case "addCircumcircle":
      case "addIncircle":
        return a && b && c && distinct(a, b, c)
          ? { op: op.choice, points: [a, b, c], ...dashedFor(op.choice) }
          : null;
      case "fillRegion":
        return a && b && c && distinct(a, b, c)
          ? { op: "fillRegion", at: [a, b, c] }
          : null;
      default:
        return null;
    }
  })();
  if (!command) return null;
  // 마지막 관문은 계약 자체다 — 여기를 통과하지 못하면 지금 경로로 떨어진다.
  const checked = FigureEditCommandSchema.safeParse(command);
  return checked.success ? checked.data : null;
}

/** 운영 로그에서 «빠른 길이 몇 번 먹었나»를 셀 한 줄 — 요청 글·요소 목록은 남기지 않는다. */
const log = (message: string) => console.info(`[jev] figure-edit ${message}`);

/**
 * 빠른 길 한 번 — 되면 지금과 **같은 모양의 `DevAiResult`**, 안 되면 `null`.
 * `null` 이면 부르는 쪽이 지금 경로를 그대로 탄다(호출 인자까지 그대로).
 */
export async function tryJevFigureEdit(
  request: DevAiRequest,
  options: {
    signal?: AbortSignal;
    /** 처리기의 끝 시각(ms) — 남은 시간이 빠듯하면 지금 경로의 몫을 뺏지 않고 건너뛴다. */
    deadlineAt?: number;
    env?: NodeJS.ProcessEnv;
  } = {},
): Promise<DevAiResult | null> {
  const { signal, deadlineAt, env = process.env } = options;
  if (!isJevEnabled(env)) return null;
  const figure = request.figure;
  const content = request.content?.trim();
  if (!figure || !content) return null;
  if (signal?.aborted) return null;
  // 빠른 길이 시한을 다 쓰고 떨어져도 지금 경로가 돌 수 있을 때만 시도한다.
  if (
    deadlineAt !== undefined &&
    deadlineAt - Date.now() < JEV_TIMEOUT_MS * 2
  ) {
    log("건너뜀 (남은 시간 부족)");
    return null;
  }
  const questions = buildFigureEditQuestions(figure, content);
  if (!questions) {
    log("건너뜀 (물음을 세우지 못함)");
    return null;
  }
  const state = buildFigureEditState(figure, content);
  if (state.length > JEV_MAX_STATE_CHARS) {
    log("건너뜀 (요소 목록이 모델 입력보다 큼)");
    return null;
  }
  const started = Date.now();
  const answers = await askJev({ state, questions, signal, env });
  const elapsed = () => `${Date.now() - started}ms`;
  if (!answers) {
    log(`떨어짐 (응답 없음·시한 초과) ${elapsed()}`);
    return null;
  }
  const command = assembleFigureEditCommand(answers, figure, content);
  const op = answers.op;
  if (!command) {
    const scope = answers.scope;
    const why =
      op.confidence < JEV_MIN_CONFIDENCE
        ? "확신 낮음"
        : scope?.choice !== "one" || scope.confidence < JEV_MIN_CONFIDENCE
          ? "고칠 곳이 여럿"
          : "인자 안 참";
    log(`떨어짐 (${why}) op=${op.choice} 확신=${op.confidence} ${elapsed()}`);
    return null;
  }
  log(`빠른 길 op=${command.op} 확신=${op.confidence} ${elapsed()}`);
  return {
    content: "",
    answer: "",
    solution: "",
    warnings: [],
    edits: [command],
  };
}
