import type {
  ExplorerAction,
  ExplorerFeedback,
  WorkshopAction,
  WorkshopRecord,
  WorkshopSession,
  WorkshopView,
} from "@/contracts/mathExplorers.contract";
import { ExplorerActionConflict, ExplorerActionInvalid } from "./errors";
import type { ExplorerProfile } from "./types";

const predictionLabels = ["더 커져요", "그대로예요", "더 작아져요"];
const ruleLabels = [
  "분모에만 같은 수를 곱했어요",
  "분자와 분모에 같은 수를 곱했어요",
  "색칠한 부분을 더 붙였어요",
];

export function isWorkshopAction(
  action: ExplorerAction,
): action is WorkshopAction {
  return action.type.startsWith("lab-");
}

export function workshopQuestionId(session: WorkshopSession) {
  return `${session.id}:${session.stage}:${session.checkIndex}`;
}

export function workshopMemoryDate(record?: WorkshopRecord): string | null {
  if (!record?.discoveredAt) return null;
  const date = new Date(`${record.discoveredAt}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 3);
  return date.toISOString().slice(0, 10);
}

export function workshopMemoryDue(
  record: WorkshopRecord | undefined,
  serverDate: string,
) {
  const due = workshopMemoryDate(record);
  return (
    !!due &&
    serverDate >= due &&
    !record?.rememberedAt &&
    record?.memoryAttemptDate !== serverDate
  );
}

/** Display IDs do not encode the correct source option, including the rule activity. */
export function workshopOptions(session: WorkshopSession): number[] {
  let seed = 0;
  for (const char of `${session.id}:${session.stage}`)
    seed = (Math.imul(seed, 31) + char.charCodeAt(0)) >>> 0;
  const options = [0, 1, 2];
  for (let index = 2; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const other = seed % (index + 1);
    [options[index], options[other]] = [options[other]!, options[index]!];
  }
  return options;
}

function questions(run: number): WorkshopSession["questions"] {
  const equivalent = [
    { fractions: [{ numerator: 2, denominator: 3 }], denominator: 12 },
    { fractions: [{ numerator: 3, denominator: 4 }], denominator: 12 },
    { fractions: [{ numerator: 2, denominator: 5 }], denominator: 20 },
    { fractions: [{ numerator: 3, denominator: 5 }], denominator: 15 },
    { fractions: [{ numerator: 3, denominator: 7 }], denominator: 21 },
  ];
  const pairs = [
    {
      fractions: [
        { numerator: 1, denominator: 4 },
        { numerator: 1, denominator: 6 },
      ],
      denominator: 12,
    },
    {
      fractions: [
        { numerator: 1, denominator: 3 },
        { numerator: 3, denominator: 4 },
      ],
      denominator: 12,
    },
    {
      fractions: [
        { numerator: 2, denominator: 3 },
        { numerator: 1, denominator: 5 },
      ],
      denominator: 15,
    },
    {
      fractions: [
        { numerator: 3, denominator: 4 },
        { numerator: 1, denominator: 6 },
      ],
      denominator: 12,
    },
    {
      fractions: [
        { numerator: 2, denominator: 5 },
        { numerator: 1, denominator: 2 },
      ],
      denominator: 10,
    },
  ];
  const index = (run - 1) % equivalent.length;
  return [equivalent[index]!, pairs[index]!];
}

/** Mutates only the caller's cloned profile; persistence/receipts are handled by engine.ts. */
export function applyWorkshopAction(
  profile: ExplorerProfile,
  action:
    | WorkshopAction
    | {
        type: "lab-start";
        route: WorkshopSession["route"];
        attachedTo: WorkshopSession["attachedTo"];
      },
  serverDate: string,
): ExplorerFeedback {
  const record = (profile.workshop ??= { runs: 0 });
  if (action.type === "lab-start") {
    if (record.session && record.session.stage !== "complete")
      return { message: "하던 공방 실험을 이어가요." };
    if (action.route === "memory" && !workshopMemoryDue(record, serverDate))
      throw new ExplorerActionInvalid("기억 확인이 열리는 날 다시 만나요.");
    record.runs += 1;
    record.session = {
      id: `common-v1-${profile.id}-${record.runs}`,
      route: action.route,
      stage: action.route === "explore" ? "predict" : "check",
      attachedTo: action.attachedTo,
      factors: [1, 1],
      checkIndex: 0,
      questions: questions(record.runs),
      answers: [],
      passed: [],
      date: serverDate,
      stars: 0,
    };
    if (action.route === "memory") record.memoryAttemptDate = serverDate;
    return { message: "분수 조각을 움직이며 확인해 보세요." };
  }
  const session = record.session;
  if (action.type === "lab-solution") {
    if (!session || session.stage !== "complete")
      throw new ExplorerActionInvalid(
        "공방의 확인 문제를 마친 뒤 해설을 볼 수 있어요.",
      );
    return {
      message: "요청한 통분 공방 해설이에요.",
      workshopSolution: {
        title: "통분: 같은 크기의 조각으로 바꾸기",
        explanation:
          "분자와 분모에 같은 자연수를 곱하면 분수의 크기는 같아요. 두 분수의 분모를 같게 만들면 작은 조각의 크기도 같아져요.",
        examples: session.questions.map((question) => ({
          ...question,
          numerators: question.fractions.map(
            (fraction) =>
              (fraction.numerator * question.denominator) /
              fraction.denominator,
          ),
        })),
      },
    };
  }
  if (
    !session ||
    session.stage === "complete" ||
    action.questionId !== workshopQuestionId(session) ||
    action.type !== `lab-${session.stage}`
  ) {
    throw new ExplorerActionConflict("현재 공방 단계에서 다시 시도해 주세요.");
  }
  if (action.type === "lab-predict") {
    session.prediction = workshopOptions(session)[action.choiceId]!;
    session.stage = "split";
    return { message: "예상을 기록했어요. 직접 조각을 나눠 보세요." };
  }
  if (action.type === "lab-split") {
    const correct = action.factor === 3;
    if (correct) session.stage = "match";
    return {
      correct,
      message: correct
        ? "조각을 나누었어요. 다음 실험으로 가요."
        : "조각을 다시 조절해 보세요.",
    };
  }
  if (action.type === "lab-match") {
    const correct = 2 * action.factors[0] === 3 * action.factors[1];
    if (correct) {
      session.factors = [...action.factors];
      session.stage = "rule";
    }
    return {
      correct,
      message: correct
        ? "조각 크기를 맞췄어요."
        : "두 막대의 조각 크기를 다시 맞춰 보세요.",
    };
  }
  if (action.type === "lab-rule") {
    const correct = workshopOptions(session)[action.choiceId] === 1;
    if (correct) session.stage = "check";
    return {
      correct,
      message: correct
        ? "이제 새 숫자로 확인해 봐요."
        : "움직인 조각을 떠올리며 다시 골라 보세요.",
    };
  }
  const question = session.questions[session.checkIndex]!;
  if (
    action.parts.length !== question.fractions.length ||
    action.parts.some((value) => value > question.denominator)
  ) {
    throw new ExplorerActionInvalid(
      "각 분수에서 칠한 조각 수를 다시 확인해 주세요.",
    );
  }
  const correct = question.fractions.every(
    (fraction, index) =>
      action.parts[index]! * fraction.denominator ===
      fraction.numerator * question.denominator,
  );
  session.answers.push([...action.parts]);
  session.passed.push(correct);
  session.checkIndex += 1;
  if (session.checkIndex < session.questions.length) {
    return {
      correct,
      advance: true,
      message: correct
        ? "확인했어요. 다음 문제로 가요."
        : "다시 확인할 문제로 기록했어요.",
    };
  }
  const score = session.passed.filter(Boolean).length;
  const all = score === session.questions.length;
  session.stage = "complete";
  record.lastCheck = { date: serverDate, score, route: session.route };
  if (!record.blueprintAt && (session.route === "explore" || all)) {
    record.blueprintAt = serverDate;
    profile.stars += 1;
    profile.earned += 1;
    session.stars = 1;
  }
  if (all) {
    record.discoveredAt ??= serverDate;
    if (session.route === "memory") record.rememberedAt = serverDate;
  }
  return {
    correct,
    advance: true,
    complete: true,
    stars: session.stars,
    message: all
      ? "통분 공방을 마쳤어요."
      : "다시 확인할 문제를 모았어요. 원할 때 해설을 열어 보세요.",
  };
}

/** Only the current manipulation/question is public; saved answers and future items stay private. */
export function workshopView(
  record: WorkshopRecord | undefined,
  serverDate: string,
): WorkshopView {
  const session = record?.session;
  let current: WorkshopView["session"] = null;
  if (session) {
    const question =
      session.stage === "check"
        ? session.questions[session.checkIndex]
        : undefined;
    const stage = session.stage;
    const prompt =
      stage === "predict"
        ? "색칠한 반쪽을 잘게 나누면 색칠한 부분의 크기는 어떻게 될까요?"
        : stage === "split"
          ? "색칠은 그대로 두고, 원래 한 조각을 똑같이 3개로 나눠 보세요."
          : stage === "match"
            ? "두 막대의 작은 조각 하나의 크기를 같게 맞춰 보세요."
            : stage === "rule"
              ? "조각을 나누었을 때 분자와 분모는 어떻게 바뀌었나요?"
              : stage === "check"
                ? `분모가 ${question!.denominator}일 때 같은 크기가 되도록 조각을 칠해 보세요.`
                : "공방 탐험을 마쳤어요.";
    const optionLabels = stage === "predict" ? predictionLabels : ruleLabels;
    current = {
      id: session.id,
      route: session.route,
      stage,
      attachedTo: session.attachedTo,
      questionId: workshopQuestionId(session),
      checkIndex: session.checkIndex,
      checkTotal: 2,
      done: stage === "complete",
      prompt,
      fractions:
        question?.fractions ??
        (stage === "complete"
          ? []
          : stage === "match" || stage === "rule"
            ? [
                { numerator: 1, denominator: 2 },
                { numerator: 1, denominator: 3 },
              ]
            : [{ numerator: 1, denominator: 2 }]),
      targetDenominator: question?.denominator ?? null,
      factors: session.factors,
      choices:
        stage === "predict" || stage === "rule"
          ? workshopOptions(session).map((source, index) => ({
              id: index,
              label: optionLabels[source]!,
            }))
          : [],
      predictionLabel:
        session.prediction === undefined
          ? null
          : predictionLabels[session.prediction]!,
      stars: session.stars,
    };
  }
  return {
    memoryDate: workshopMemoryDate(record),
    memoryDue: workshopMemoryDue(record, serverDate),
    blueprintAt: record?.blueprintAt ?? null,
    discoveredAt: record?.discoveredAt ?? null,
    rememberedAt: record?.rememberedAt ?? null,
    session: current,
  };
}
