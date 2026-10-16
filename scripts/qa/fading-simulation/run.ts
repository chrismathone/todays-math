/**
 * «오늘의 기억»(학생 SRS · fading) 35일 시뮬레이션 — 학년 × 학생 유형마다 하루 학습량 · 밀림 · 재학습 확인 수 · 추정 시간을 잰다.
 *
 *   npx tsx scripts/qa/fading-simulation/run.ts              # 카드 풀이(운영 기본 · `MATH_FADING_CARDS` 없음 = 켜짐)
 *   npx tsx scripts/qa/fading-simulation/run.ts --chips      # 칩 풀이(4단계도 칩)
 *   npx tsx scripts/qa/fading-simulation/run.ts --grade=중2 --persona=성실   # 하나만
 *   npx tsx scripts/qa/fading-simulation/run.ts --rule=base,d2,d1,d1d2 --seeds=5   # 규칙 견주기 → results-compare.json · summary-compare.md
 *   npx tsx scripts/qa/fading-simulation/run.ts --rule=base --seeds=5 --path=home    # 홈 대기열을 따라가는 학생 → *-compare-home.*
 *
 * 🔴 서버 · DB · `/api/**` 를 부르지 않는다. 은행(`CONCEPT_BLANK_BANK`)과 묶음 표로 개념을 짓고(`catalog.ts` 와 같은 함수 —
 *    그 파일은 `server-only` 라 여기서 못 부른다), 서버 없이 도는 원천(`createLocalFadingSource` · `createLocalFadingRelearnSource`)에
 *    시계를 넣어 돌린다. 전이는 전부 제품 함수다(`applyFadingAction` · `session.ts` · `relearn.ts` · `buildFadingDailyPlan`) — 여기서 규칙을 다시 짓지 않는다.
 *    학생이 «하는 일»(어느 답을 쓰나 · 언제 포기하나 · 어느 평가를 고르나 · 집에 가는 때)만 이 파일이 정한다 — 그 값은 `MODEL` 한 곳에 있다.
 * 같은 씨앗이면 같은 결과다. 결과는 `results.json` · `summary.md` 에 쓴다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { FadingPlacement } from "@/contracts/fading.contract";
import type { FadingAction, FadingState } from "@/contracts/fadingApi.contract";
import type { FadingDailyPlan } from "@/contracts/fadingDaily.contract";
import {
  FADING_RELEARN_CONFIRM_MS,
  FADING_RELEARN_RETRY_MS,
  type FadingRelearnItem,
  type FadingRelearnQueue,
} from "@/contracts/fadingRelearn.contract";
import { CONCEPT_BLANK_LEVELS } from "@/contracts/conceptBlank.contract";
import { CONCEPT_BLANK_BANK } from "@/lib/concept-blank/bank";
import { encodeFadingMarks, type FadingMark } from "@/lib/fading/cards";
import { chipFits, chipTray, type FadingTrap } from "@/lib/fading/chips";
import {
  buildFadingConcepts,
  fadingTargets,
  type FadingConcept,
  type FadingTarget,
} from "@/lib/fading/concepts";
import { erasedTargets } from "@/lib/fading/erasure";
import type { FsrsRating } from "@/lib/fading/fsrs";
import { FADING_GROUPS } from "@/lib/fading/groups";
import { createLocalFadingSource } from "@/lib/fading/local";
import { FADING_DAILY_CAP } from "@/lib/fading/numbers";
import { createLocalFadingRelearnSource } from "@/lib/fading/relearnLocal";
import { fadingSummary } from "@/lib/fading/state";
import {
  allowedRatings,
  fadingAsksSure,
  fadingStepInput,
  finishReading,
  giveUpCard,
  giveUpStep,
  placeAnswer,
  resumeFadingSession,
  type FadingAnswer,
  type FadingSession,
} from "@/lib/fading/session";
import { fadingTrapMap } from "@/lib/fading/traps";
import { fadingTypedOutcome } from "@/lib/fading/typed";
import { fadingGrades } from "@/lib/fading/view";

/* ───────── 시간 모형 · 학생 모형 — 검토자가 값을 바꿔 다시 돌릴 자리 ───────── */

export const MODEL = {
  /** 날 수와 첫날(월요일) — 요일 유형(월·수·금)이 이 날짜에서 센다. */
  days: 35,
  firstDay: "2026-10-19",
  /** 하루의 공부 시각(한국 시각) — 하루 한 번. 분 단위 재학습은 이 시각에서 아래 초 단위로 흐른다. */
  studyHourKst: 19,
  /** 오늘 분량(칸 = 명제 수) — 제품의 대신 값(`numbers.ts` `FADING_DAILY_CAP`). `dailyPlan()` 에 그대로 준다. */
  quota: FADING_DAILY_CAP,
  /** 초 단위 시간 모형 — 행동 하나마다 더한다. 잰 값이 아니라 **가정**이다. */
  seconds: {
    appOpen: 20, // 앱 열고 홈을 읽는다
    sessionOpen: 5, // 개념 하나의 풀이를 연다
    readCard: 12, // 1단계 카드(명제) 하나 — 앞면 → 뒷면 → 사전 확인
    chipPlace: 6, // 칩 하나를 빈칸에 넣는다(2 · 3단계 · 칩 풀이의 4단계)
    typedBlank: 15, // 4단계 빈칸 하나를 자판으로 쓴다(카드 풀이)
    wrongFeedback: 4, // 틀렸다는 안내를 읽고 다시 고른다(틀림마다 더한다)
    comparison: 6, // 단계를 마친 뒤 대조 화면 — 명제 하나마다
    stepTransition: 3, // 다음 단계로 넘어가는 화면
    rating: 5, // 자가 평가 한 번
    relearnOpen: 8, // 추가 확인(재학습) 창을 열고 문장을 읽는다
    relearnBlank: 15, // 추가 확인의 빈칸 하나를 자판으로 쓴다
    relearnResult: 5, // 추가 확인의 결과를 읽고 닫는다
  },
  /** 한 빈칸에서 이만큼 연달아 틀리면 «아직 모르겠어요»(2 · 3단계는 그 단계 전체 · 4단계 카드 풀이는 그 카드). */
  giveUpAfterWrong: 2,
  /**
   * 평가 고르기 — 4단계에서 틀렸으면 «다시»뿐(제품 규칙). 그 밖에는 2 · 3단계에서 틀린 적이 있으면 `ratingWhenMissedEarlier`, 없으면 `ratingWhenClean`.
   * «쉬움»은 고르지 않는다. `--rating-good` 을 주면 틀린 적이 있어도 «알맞음»(민감도를 보려고).
   */
  ratingWhenClean: "good" as FsrsRating,
  ratingWhenMissedEarlier: "hard" as FsrsRating,
  /** 오늘 계획을 다 한 뒤, 기다리는 추가 확인이 이 안에 준비되면 기다렸다가 한다(그 뒤의 것은 내일로 넘긴다). */
  lingerAfterPlanMs: 6 * 60_000,
  /** 하루에 여는 풀이 수의 안전 상한 — 계획이 빚진 것을 되풀이해 내는 결함이 있으면 여기서 멈추고 적는다. 분량의 뜻이 아니다. */
  maxSessionsPerDay: 60,
  /** 집(홈)에서 «추가 확인 시작»을 누르는 횟수의 안전 상한. */
  maxHomeChecks: 200,
};

type PersonaName = "성실" | "불규칙" | "자주 틀림" | "쉬었다 복귀";
type Persona = {
  name: PersonaName;
  /** 빈칸 · 카드 · 추가 확인의 빈칸을 처음에 맞힐 확률. */
  accuracy: number;
  /** 그날(0부터 · 요일은 `firstDay` 에서) 공부하는가. */
  studies: (dayIndex: number, weekday: number) => boolean;
  note: string;
};

export const PERSONAS: readonly Persona[] = [
  {
    name: "성실",
    accuracy: 0.85,
    studies: () => true,
    note: "매일 · 85%",
  },
  {
    name: "불규칙",
    accuracy: 0.7,
    studies: (_, weekday) => weekday === 1 || weekday === 3 || weekday === 5,
    note: "월·수·금만 · 70%",
  },
  {
    name: "자주 틀림",
    accuracy: 0.5,
    studies: () => true,
    note: "매일 · 50%",
  },
  {
    name: "쉬었다 복귀",
    accuracy: 0.85,
    studies: (day) => day < 14 || day >= 21,
    note: "14일 성실 → 7일 쉼 → 성실 · 85%",
  },
];

/* ───────── 견줄 규칙(원장님 승인 2026-10-16 · `srs-decisions-agreed.md`) ───────── */

/**
 * 규칙 넷 — 같은 씨앗 묶음으로 견준다. 🔴 제품 코드에 모의용 손잡이를 넣지 않는다. 대신:
 * - **결정 2**(첫 평가의 `exposed` 는 5분 확인 한 번)는 평가 직후 **방금 든 `exposed` 줄**을 그 규칙이 쓰는 꼴로 맞춘다
 *   (`stage` · `dueAt` 둘만 다르다 — 옛 규칙 `retry`·지금+1분, 새 규칙 `confirm`·지금+5분). 제품이 어느 쪽을 쓰든 같은 결과다.
 * - **결정 1**(4단계 부분 틀림에 «어려움»)은 학생의 고르기다 — 제품이 «어려움»을 허용할 때 `d1` 학생은 «어려움», 아니면 «다시».
 *   부분 틀림에 «다시»를 고르는 것은 옛 규칙(«다시»뿐)과 똑같은 전이다. 제품이 허용하지 않는 판에서는 `d1` 이 `base` 와 같다.
 */
type RuleName = "base" | "d1" | "d2" | "d1d2";
type Rule = { name: RuleName; d1: boolean; d2: boolean };
const RULES: Readonly<Record<RuleName, Rule>> = {
  base: { name: "base", d1: false, d2: false },
  d1: { name: "d1", d1: true, d2: false },
  d2: { name: "d2", d1: false, d2: true },
  d1d2: { name: "d1d2", d1: true, d2: true },
};
/** 규칙을 주지 않은 실행(옛 결과 파일) — 제품이 쓰는 그대로, 학생은 허용되면 «어려움». */
const NATIVE: Rule & { native: true } = {
  name: "d1d2",
  d1: true,
  d2: true,
  native: true,
};

/**
 * 학생이 걷는 길 — `plan` 은 탐험 화면의 «오늘의 학습»(명제 20칸 계획), `home` 은 `/learn/fading` 홈의 대기열(복습일 된 것 + 골라 둔 것)을 차례로 연다.
 * 홈 목록이 비면 새 개념을 고른다 — 오늘 닫은 명제에 그 묶음을 더해도 분량(20)을 넘지 않을 때만(모형의 규칙 · 두 길이 같은 새 진도 속도를 갖게).
 * `homeUnit` `concepts` 는 홈의 옛 단위(개념 20개 — `fadingSummary` 를 명제 비용 없이 부른다)를 강제한다. 주지 않으면 제품이 내는 그대로다.
 */
type SimPath = "plan" | "home";
type HomeUnit = "product" | "concepts";

/* ───────── 결정적 난수 · 번호 ───────── */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedOf(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}
function uuidFrom(rng: () => number) {
  const b = Array.from({ length: 16 }, () => Math.floor(rng() * 256));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const hex = b.map((v) => v.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/* ───────── 날짜 ───────── */

const DAY_MS = 86_400_000;
const KST_MS = 9 * 3_600_000;
const dateOf = (index: number) =>
  new Date(Date.parse(`${MODEL.firstDay}T00:00:00Z`) + index * DAY_MS)
    .toISOString()
    .slice(0, 10);
/** 그날 공부 시각의 UTC 밀리초 — 한국 날짜가 `date` 가 되는 시각. */
const studyStartOf = (date: string) =>
  Date.parse(`${date}T00:00:00Z`) - KST_MS + MODEL.studyHourKst * 3_600_000;
const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();

/* ───────── 기록 ───────── */

export type DayRecord = {
  day: number;
  date: string;
  weekday: number;
  studied: boolean;
  /** 그날 시작할 때 복습일이 된 개념 수(상한으로 미룬 것 포함)와 그 명제 수 · 밀린(복습일이 지난) 수. */
  dueAtStart: number;
  duePromptsAtStart: number;
  overdueAtStart: number;
  /** 계획이 낸 분량(칸)과 상한 밖에 미룬 복습 묶음. */
  planTotal: number;
  planHeld: number;
  sessions: number;
  newStarted: number;
  newRated: number;
  reviewsDone: number;
  ratings: Record<FsrsRating, number>;
  blanks: number;
  wrong: number;
  giveUps: number;
  relearn: {
    /** 1분 뒤 확인(`retry` 줄)과 5분 뒤 확인(`confirm` 줄)을 한 수. */
    retryChecks: number;
    confirmChecks: number;
    passed: number;
    failed: number;
    /** 풀이 중의 경계(카드 · 단계 · 평가 뒤)에서 떠 끼어든 수와, 홈에서 «추가 확인 시작»으로 한 수. */
    inSession: number;
    atHome: number;
    /** 그날 대기열에 새로 든 줄(제품의 집계). */
    entered: number;
    /** 하루를 마칠 때 대기열에 남은 줄(내일로 넘어간다). */
    carried: number;
    /** 계획을 마친 뒤 확인을 기다린 분. */
    waitMinutes: number;
  };
  /** 하루를 마칠 때 복습일이 됐는데 못 한 개념 수(내일의 밀림) · 그 명제 수. */
  backlogCarried: number;
  backlogPromptsCarried: number;
  /** 4단계에서 틀렸는데 제품이 «어려움»을 허용한 평가(결정 1) · 그중 «어려움»을 고른 수. */
  partialOffered: number;
  partialHard: number;
  minutes: number;
  /** 안전 상한에 걸렸거나 거절(409)을 받은 일 — 비어 있어야 한다. */
  notes: string[];
};

export type RunSummary = {
  grade: string;
  persona: PersonaName;
  conceptsInGrade: number;
  studyDays: number;
  meanMinutesPerStudyDay: number;
  maxMinutesPerStudyDay: number;
  meanBlanksPerStudyDay: number;
  maxDailyItems: number;
  maxDailySessions: number;
  learned: number;
  learnedRatio: number;
  reviewsDoneTotal: number;
  lapsesRatio: number;
  backlogPeak: number;
  backlogPromptsPeak: number;
  daysBacklogOverCapacity: number;
  relearnChecksTotal: number;
  relearnChecksPerStudyDay: number;
  relearnInterruptsPerStudyDay: number;
  relearnCarriedMax: number;
  returnDay?: {
    day: number;
    date: string;
    dueAtReturn: number;
    duePromptsAtReturn: number;
    overdueAtReturn: number;
    daysUntilDrained: number | null;
  };
  spikes: { day: number; dueBefore: number; dueAfter: number }[];
  /** 첫날(성실 · 모두 새 개념)의 분 · 35일의 평가 수(다시 · 어려움 · 알맞음) · 부분 틀림 «어려움»(결정 1). */
  firstDayMinutes: number;
  ratingsTotal: Record<FsrsRating, number>;
  partialOffered: number;
  partialHard: number;
  notes: string[];
};

/* ───────── 학생 한 명 · 학년 하나 ───────── */

const gradeOf = (concept: FadingConcept) => concept.section.split("::")[0]!;

async function simulate(
  grade: string,
  concepts: readonly FadingConcept[],
  persona: Persona,
  options: {
    cards: boolean;
    rule?: Rule;
    /** 씨앗 번호 — 0 은 옛 씨앗(«학년|유형|방식») 그대로, 1 부터는 뒤에 번호를 붙인다. 규칙은 씨앗에 안 든다(같은 씨앗 묶음으로 견준다). */
    seed?: number;
    path?: SimPath;
    homeUnit?: HomeUnit;
  },
): Promise<{ days: DayRecord[]; summary: RunSummary }> {
  const rule: Rule & { native?: true } = options.rule ?? NATIVE;
  const path = options.path ?? "plan";
  const homeUnit = options.homeUnit ?? "product";
  const rng = mulberry32(
    seedOf(
      `${grade}|${persona.name}|${options.cards}${options.seed ? `|s${options.seed}` : ""}`,
    ),
  );
  const traps = fadingTrapMap(concepts);
  const byId = new Map(concepts.map((c) => [c.id, c]));
  const sections = [...new Set(concepts.map((c) => c.section))];
  const clock = { now: 0 };
  const source = createLocalFadingSource({
    concepts,
    today: dateOf(0),
    cards: options.cards,
    traps,
    fresh: () => ({
      sessionId: uuidFrom(rng),
      seed: Math.floor(rng() * 0x7fff_ffff),
    }),
    now: () => clock.now,
    // 오늘 진도의 소단원 — 은행 차례로 «아직 고르지 않은 개념이 남은 첫 소단원». 운영은 탐험의 학습 단원에서 온다(`explorerDailyServer.ts`) —
    // 그 속도를 여기서는 모른다. 학생이 자기 속도로 소단원을 차례로 나간다고 둔다.
    daily: () => {
      const picked = new Set(Object.keys(source.snapshot().concepts));
      const section = sections.find((s) =>
        concepts.some((c) => c.section === s && !picked.has(c.id)),
      );
      return { quota: MODEL.quota, progressSections: section ? [section] : [] };
    },
  });
  const relearn = createLocalFadingRelearnSource({
    main: source,
    concepts,
    traps,
    now: () => clock.now,
  });
  const trapsOf = (c: FadingConcept): readonly FadingTrap[] =>
    traps[c.id] ?? [];

  const days: DayRecord[] = [];
  const S = MODEL.seconds;
  let day!: DayRecord;
  let inSession = false;
  const tick = (seconds: number) => {
    clock.now += seconds * 1000;
    day.minutes += seconds / 60;
  };

  /** 추가 확인 하나 — 준비된 줄에 답을 낸다(화면의 `FadingRelearnCheck`: 빈칸 전부를 쓰고 한 번에 제출). */
  async function check(item: FadingRelearnItem, queue: FadingRelearnQueue) {
    const concept = byId.get(item.conceptId)!;
    const proposition = concept.propositions.find(
      (p) => p.id === item.propositionId,
    )!;
    const targets = proposition.pieces.flatMap((piece) =>
      piece.kind === "target" ? [piece.target] : [],
    );
    tick(S.relearnOpen);
    const answers = targets.map((target) => {
      tick(S.relearnBlank);
      const correct = rng() < persona.accuracy;
      return {
        targetId: target.id,
        text: correct
          ? target.text
          : (wrongTextFor(concept, target) ?? target.text),
      };
    });
    if (item.stage === "retry") day.relearn.retryChecks += 1;
    else day.relearn.confirmChecks += 1;
    if (inSession) day.relearn.inSession += 1;
    else day.relearn.atHome += 1;
    try {
      const done = await relearn.grade({
        conceptId: item.conceptId,
        propositionId: item.propositionId,
        token: item.token,
        attemptId: uuidFrom(rng),
        answers,
      });
      if (done.result.verdict === "passed") day.relearn.passed += 1;
      else day.relearn.failed += 1;
      if (done.result.verdict === "judging")
        day.notes.push(`대조 대기(unknown)가 났다 — ${item.key}`);
      tick(S.relearnResult);
      return done.queue;
    } catch (error) {
      day.notes.push(`추가 확인 거절: ${(error as Error).message}`);
      return queue;
    }
  }

  /** 풀이 중의 경계 — 준비된 확인이 있으면 하나만 뜬다(`useFadingRelearn.boundary`). */
  async function boundary() {
    const queue = await relearn.queue();
    const next = queue.items.find(
      (item) => item.state === "judging" || item.state === "ready",
    );
    if (next) await check(next, queue);
  }
  /**
   * 홈 — «추가 확인 시작»을 누른다. **한 바퀴**다: 홈에 왔을 때 준비돼 있던 수만큼만 한다(확인하는 사이에 다시 준비된 것은 다음 홈에서).
   * 끝없이 누르는 학생은 두지 않는다 — 틀린 확인은 1분 뒤 다시 준비되므로, 준비된 것이 없을 때까지 누르면 둘 이상이 서로를 되살려 끝나지 않는다
   * (2026-10-16 첫 실행에서 실제로 그랬다 — 하루 200회의 안전 상한에 닿았다).
   */
  async function homeChecks() {
    const first = await relearn.queue();
    const pass = first.counts.ready + first.counts.judging;
    for (let i = 0; i < pass && i < MODEL.maxHomeChecks; i++) {
      const queue = await relearn.queue();
      const next = queue.items.find(
        (item) => item.state === "judging" || item.state === "ready",
      );
      if (!next) return;
      await check(next, queue);
    }
    if (pass > MODEL.maxHomeChecks)
      day.notes.push("홈 추가 확인의 안전 상한에 닿았다");
  }

  /** 그 빈칸에 «틀림»이 되는 글 — 같은 개념의 다른 답(견주는 규칙이 `wrong` 이라 하는 것). 없으면 `null`(틀릴 길이 없다). */
  function wrongTextFor(concept: FadingConcept, target: FadingTarget) {
    const candidates = [
      ...fadingTargets(concept).map((t) => t.text),
      ...trapsOf(concept).map((t) => t.text),
    ];
    for (const text of candidates)
      if (
        text !== target.text &&
        fadingTypedOutcome(concept, target.id, text, trapsOf(concept)) ===
          "wrong"
      )
        return text;
    return null;
  }

  /**
   * 결정 2 를 규칙대로 — 첫 평가에서 **방금 든** `exposed` 줄(그 시각에 들었고 확인 · 틀림이 0)만 그 규칙의 꼴로 맞춘다.
   * 옛 규칙은 `retry`·+1분, 새 규칙은 `confirm`·+5분이다(`relearn.ts` 의 새 줄 — 다른 칸은 같다). 이미 있던 줄은 건드리지 않는다.
   * 규칙을 주지 않은 실행은 제품 그대로 둔다.
   */
  function settleExposed(at: number) {
    if (rule.native) return;
    const want = rule.d2
      ? { stage: "confirm" as const, dueAt: at + FADING_RELEARN_CONFIRM_MS }
      : { stage: "retry" as const, dueAt: at + FADING_RELEARN_RETRY_MS };
    source.change((fading) => {
      const queue = fading.relearn;
      if (!queue) return fading;
      let changed = false;
      const items = queue.items.map((item) => {
        if (
          item.origin !== "exposed" ||
          item.since !== at ||
          item.checks !== 0 ||
          item.fails !== 0 ||
          (item.stage === want.stage && item.dueAt === want.dueAt)
        )
          return item;
        changed = true;
        return { ...item, ...want };
      });
      return changed ? { ...fading, relearn: { ...queue, items } } : fading;
    });
  }

  const act = async (action: FadingAction): Promise<FadingState | null> => {
    try {
      return await source.act(action);
    } catch (error) {
      day.notes.push(`${action.action} 거절: ${(error as Error).message}`);
      return null;
    }
  };

  /** 풀이 하나 — 화면(`FadingCardSessionScreen` · `FadingSessionScreen`)이 하는 차례 그대로. */
  async function runSession(initial: FadingState) {
    const remote = initial.session!;
    const concept = byId.get(remote.conceptId)!;
    const ref = { conceptId: concept.id, sessionId: remote.id };
    const marks = () =>
      encodeFadingMarks(concept.propositions.map((): FadingMark => 2));
    let local: FadingSession = resumeFadingSession(concept, remote);
    const firstRating = !initial.concepts[concept.id]?.rated;
    inSession = true;
    tick(S.sessionOpen);
    day.sessions += 1;
    if (firstRating && remote.startStep === 1) day.newStarted += 1;

    if (local.phase === "reading") {
      tick(S.readCard * concept.propositions.length);
      await act({
        action: "read",
        ...ref,
        ...(options.cards ? { seen: marks() } : {}),
      });
      local = finishReading(local);
      await boundary();
    }
    let missedEarlier = false;
    while (local.phase === "filling") {
      const step = local.step as 2 | 3 | 4;
      const typed = fadingStepInput(local) === "typed";
      const tray = chipTray(concept, step, {
        seed: local.seed,
        traps: trapsOf(concept),
      });
      const blanks = erasedTargets(concept, step);
      const placements: FadingPlacement[] = [];
      let gaveUpStepWhole = false;
      let gaveUpCards = 0;
      cards: for (const proposition of concept.propositions) {
        const mine = blanks.filter((t) =>
          t.id.startsWith(`${proposition.id}#`),
        );
        for (const target of mine) {
          if (target.id in local.filled || local.skipped?.includes(target.id))
            continue;
          let wrongHere = 0;
          for (;;) {
            const correct = rng() < persona.accuracy;
            let answer: FadingAnswer | null;
            if (typed)
              answer = correct
                ? { targetId: target.id, text: target.text }
                : (() => {
                    const text = wrongTextFor(concept, target);
                    return text
                      ? { targetId: target.id, text }
                      : { targetId: target.id, text: target.text };
                  })();
            else {
              const used = new Set(Object.values(local.filled));
              const chip = correct
                ? tray.find(
                    (c) => !used.has(c.id) && chipFits(concept, target.id, c),
                  )
                : (tray.find(
                    (c) => !used.has(c.id) && !chipFits(concept, target.id, c),
                  ) ??
                  tray.find(
                    (c) => !used.has(c.id) && chipFits(concept, target.id, c),
                  ));
              answer = chip ? { targetId: target.id, chipId: chip.id } : null;
            }
            if (!answer) {
              day.notes.push(
                `넣을 칩이 없다 — ${concept.id} ${step}단계 ${target.id}`,
              );
              break;
            }
            tick(typed ? S.typedBlank : S.chipPlace);
            day.blanks += 1;
            const placed = placeAnswer(
              local,
              concept,
              answer,
              trapsOf(concept),
            );
            placements.push(answer);
            if (placed.outcome === "wrong") {
              day.wrong += 1;
              wrongHere += 1;
              if (step < 4) missedEarlier = true;
              tick(S.wrongFeedback);
              local = placed.session;
              // 틀린 그 자리에서 알린다 — 2 · 3단계는 증거를 따로(`onEvidence`), 4단계는 `miss` 행동에 실려 같은 저장에 등록된다(D3).
              if (step < 4)
                await relearn
                  .record({
                    kind: "step",
                    ...ref,
                    step: step as 2 | 3,
                    placements: [...placements],
                  })
                  .catch((error) =>
                    day.notes.push(`증거 거절: ${(error as Error).message}`),
                  );
              else await act({ action: "miss", ...ref, placement: answer });
              if (wrongHere >= MODEL.giveUpAfterWrong) {
                day.giveUps += 1;
                if (typed) {
                  await act({
                    action: "give-up-card",
                    ...ref,
                    propositionId: proposition.id,
                    placements: [...placements],
                  });
                  local = giveUpCard(local, concept, proposition.id);
                  gaveUpCards += 1;
                  break;
                }
                await relearn
                  .record({
                    kind: "step",
                    ...ref,
                    step,
                    placements: [...placements],
                    gaveUp: true,
                  })
                  .catch((error) =>
                    day.notes.push(`증거 거절: ${(error as Error).message}`),
                  );
                local = giveUpStep(local, concept);
                gaveUpStepWhole = true;
                break cards;
              }
              continue;
            }
            local = placed.session;
            if (placed.outcome === "unknown")
              day.notes.push(`대조 대기(unknown) — ${concept.id} ${target.id}`);
            break;
          }
          if (local.phase !== "filling" || local.step !== step) break cards;
        }
        // 카드(명제) 하나의 빈칸을 다 채우면 경계다.
        if (local.phase === "filling" && local.step === step) await boundary();
      }
      if (local.phase === "filling" && local.step === step) {
        // 카드마다 넘기다 단계가 안 끝났을 리 없지만, 남았으면 단계 전체를 넘긴다.
        local = giveUpStep(local, concept);
        gaveUpStepWhole = true;
      }
      // 화면과 같다 — 단계 전체를 넘겼거나 4단계 카드를 하나라도 넘겼으면 `gaveUp` 으로 보낸다.
      await act({
        action: "step",
        ...ref,
        step,
        placements,
        ...(gaveUpStepWhole || gaveUpCards > 0 ? { gaveUp: true } : {}),
        ...(step === 4 && fadingAsksSure(local) ? { sure: marks() } : {}),
      });
      tick(S.comparison * concept.propositions.length + S.stepTransition);
      await boundary();
    }
    // 평가 — 4단계에서 틀렸으면(포기 포함) 제품이 «어려움»을 허용할 때 `d1` 학생만 «어려움», 아니면 «다시».
    // 4단계가 깨끗하면 2 · 3단계의 틀림으로 가른다. 허용되지 않는 평가는 고르지 않는다(고르면 409 다).
    const allowed = allowedRatings(local, undefined, concept);
    const missedAtFour = (local.results.at(-1)?.missed.length ?? 0) > 0;
    const offered = missedAtFour && allowed.includes("hard");
    let rating: FsrsRating = missedAtFour
      ? offered && rule.d1
        ? "hard"
        : "again"
      : missedEarlier
        ? MODEL.ratingWhenMissedEarlier
        : MODEL.ratingWhenClean;
    if (!allowed.includes(rating)) {
      day.notes.push(`허용되지 않는 평가를 고를 뻔했다 — ${rating}`);
      rating = allowed.includes("again") ? "again" : allowed[0]!;
    }
    tick(S.rating);
    const rated = await act({
      action: "rate",
      ...ref,
      rating,
      requestId: uuidFrom(rng),
    });
    if (rated?.receipt) {
      day.ratings[rating] += 1;
      if (offered) day.partialOffered += 1;
      if (offered && rating === "hard") day.partialHard += 1;
      if (firstRating) {
        day.newRated += 1;
        settleExposed(clock.now);
      } else day.reviewsDone += 1;
    }
    await boundary();
    inSession = false;
  }
  /** 오늘 평가로 닫은 개념의 명제 수 — 계획이 «한 것»으로 세는 셈(`explorerDaily.ts` 의 `finished`). */
  const closedPromptsToday = (date: string) =>
    Object.entries(source.snapshot().concepts).reduce(
      (n, [id, stored]) =>
        stored.reviewedOn === date ? n + byId.get(id)!.propositions.length : n,
      0,
    );
  /** 홈의 목록(`FadingHome.tsx` 의 `ids` — 복습일 된 것 + 골라 둔 것). 옛 단위를 강제하면 명제 비용 없이 같은 함수를 부른다. */
  async function homeList(date: string): Promise<string[]> {
    if (homeUnit === "concepts") {
      const queue = fadingSummary(source.snapshot(), date, {
        known: new Set(byId.keys()),
      }).queue;
      return [...queue.due, ...queue.unrated];
    }
    const state = await source.state();
    return [...state.summary.queue.due, ...state.summary.queue.unrated];
  }
  /** 다음 새 개념 — 오늘 진도의 소단원(`daily()` 와 같은 소단원)에서 계획과 같은 차례(하 → 중 → 상 · 차례). */
  function nextNewConcept(): FadingConcept | undefined {
    const picked = source.snapshot().concepts;
    const section = sections.find((s) =>
      concepts.some((c) => c.section === s && !picked[c.id]),
    );
    return concepts
      .filter((c) => c.section === section && !picked[c.id])
      .sort(
        (a, b) =>
          CONCEPT_BLANK_LEVELS.indexOf(a.level) -
            CONCEPT_BLANK_LEVELS.indexOf(b.level) ||
          a.ordinal - b.ordinal ||
          (a.id < b.id ? -1 : 1),
      )[0];
  }
  /**
   * 홈을 따라가는 하루 — 풀던 것 → 홈 목록의 첫 개념을 차례로 연다(홈의 «시작» 단추). 목록이 비면 새 개념을 연다 —
   * 오늘 닫은 명제에 그 묶음을 더해도 분량을 넘지 않을 때만(모형의 규칙). 복습일 전의 개념은 목록에 안 든다(제품이 거른다).
   */
  async function homeDay(date: string) {
    let guard = 0;
    for (;;) {
      if (++guard > MODEL.maxSessionsPerDay) {
        day.notes.push("하루 풀이 수의 안전 상한에 닿았다");
        return;
      }
      const now = await source.state();
      let state: FadingState | null = now.session ? now : null;
      if (!state) {
        const next = (await homeList(date))[0];
        if (next) state = await act({ action: "open", conceptId: next });
        else {
          const fresh = nextNewConcept();
          if (
            !fresh ||
            closedPromptsToday(date) + fresh.propositions.length > MODEL.quota
          )
            return;
          state = await act({ action: "open", conceptId: fresh.id });
        }
      }
      if (!state?.session || !state.opened) {
        day.notes.push("풀이를 못 열었다(홈)");
        return;
      }
      await runSession(state);
      await homeChecks();
    }
  }

  const dueCount = (state: FadingState) => {
    const ids = [...state.summary.queue.due, ...state.summary.queue.held];
    return {
      count: ids.length,
      prompts: ids.reduce((n, id) => n + byId.get(id)!.propositions.length, 0),
    };
  };

  for (let index = 0; index < MODEL.days; index++) {
    const date = dateOf(index);
    source.setToday(date);
    clock.now = studyStartOf(date);
    const weekday = weekdayOf(date);
    day = {
      day: index + 1,
      date,
      weekday,
      studied: persona.studies(index, weekday),
      dueAtStart: 0,
      duePromptsAtStart: 0,
      overdueAtStart: 0,
      planTotal: 0,
      planHeld: 0,
      sessions: 0,
      newStarted: 0,
      newRated: 0,
      reviewsDone: 0,
      ratings: { again: 0, hard: 0, good: 0, easy: 0 },
      blanks: 0,
      wrong: 0,
      giveUps: 0,
      relearn: {
        retryChecks: 0,
        confirmChecks: 0,
        passed: 0,
        failed: 0,
        inSession: 0,
        atHome: 0,
        entered: 0,
        carried: 0,
        waitMinutes: 0,
      },
      backlogCarried: 0,
      backlogPromptsCarried: 0,
      partialOffered: 0,
      partialHard: 0,
      minutes: 0,
      notes: [],
    };
    const start = await source.state();
    const due = dueCount(start);
    day.dueAtStart = due.count;
    day.duePromptsAtStart = due.prompts;
    day.overdueAtStart = start.summary.overdue;
    const firstPlan: FadingDailyPlan = await source.dailyPlan();
    day.planTotal = firstPlan.counts.total;
    day.planHeld = firstPlan.held.recalls;

    if (day.studied && path === "home") {
      tick(S.appOpen);
      await homeChecks();
      await homeDay(date);
    } else if (day.studied) {
      tick(S.appOpen);
      await homeChecks();
      let guard = 0;
      for (;;) {
        const plan = await source.dailyPlan();
        const next = plan.activities.find((a) => a.key === plan.next);
        if (!next || next.kind !== "recall" || next.start === "none") break;
        if (++guard > MODEL.maxSessionsPerDay) {
          day.notes.push("하루 풀이 수의 안전 상한에 닿았다");
          break;
        }
        const state =
          next.start === "continue"
            ? await source.state()
            : await act({ action: "open", conceptId: next.conceptId });
        if (!state?.session || !state.opened) {
          day.notes.push(
            `풀이를 못 열었다 — ${next.conceptId} (${next.start})`,
          );
          break;
        }
        await runSession(state);
        await homeChecks();
      }
    }
    if (day.studied) {
      // 계획을 마친 뒤 — 이 시각부터 `lingerAfterPlanMs` 안에 준비되는 확인은 기다렸다가 한다. 그 시각이 지나면 집에 간다.
      const deadline = clock.now + MODEL.lingerAfterPlanMs;
      while (clock.now < deadline) {
        const queue = await relearn.queue();
        if (queue.counts.ready + queue.counts.judging > 0) {
          await homeChecks();
          continue;
        }
        if (queue.nextDueAt === null || queue.nextDueAt > deadline) break;
        const wait = queue.nextDueAt - clock.now;
        clock.now = queue.nextDueAt;
        day.relearn.waitMinutes += wait / 60_000;
      }
    }
    const end = await source.state();
    const queue = await relearn.queue();
    day.relearn.entered = queue.today.entered;
    day.relearn.carried = queue.items.length;
    const carried = dueCount(end);
    day.backlogCarried = carried.count;
    day.backlogPromptsCarried = carried.prompts;
    day.minutes = Math.round(day.minutes * 10) / 10;
    day.relearn.waitMinutes = Math.round(day.relearn.waitMinutes * 10) / 10;
    days.push(day);
  }

  const snapshot = source.snapshot();
  const learned = Object.values(snapshot.concepts).filter(
    (c) => c.reviews > 0,
  ).length;
  const reviewsTotal = Object.values(snapshot.concepts).reduce(
    (n, c) => n + c.reviews,
    0,
  );
  const lapsesTotal = Object.values(snapshot.concepts).reduce(
    (n, c) => n + c.lapses,
    0,
  );
  const studied = days.filter((d) => d.studied);
  const mean = (list: number[]) =>
    list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const items = (d: DayRecord) =>
    d.sessions + d.relearn.retryChecks + d.relearn.confirmChecks;
  const spikes = days.flatMap((d, i) =>
    i > 0 && days[i - 1]!.dueAtStart === 0 && d.dueAtStart >= 5
      ? [{ day: d.day, dueBefore: 0, dueAfter: d.dueAtStart }]
      : [],
  );
  const summary: RunSummary = {
    grade,
    persona: persona.name,
    conceptsInGrade: concepts.length,
    studyDays: studied.length,
    meanMinutesPerStudyDay: round1(mean(studied.map((d) => d.minutes))),
    maxMinutesPerStudyDay: round1(
      Math.max(0, ...studied.map((d) => d.minutes)),
    ),
    meanBlanksPerStudyDay: round1(mean(studied.map((d) => d.blanks))),
    maxDailyItems: Math.max(0, ...studied.map(items)),
    maxDailySessions: Math.max(0, ...studied.map((d) => d.sessions)),
    learned,
    learnedRatio: round1((learned / concepts.length) * 100),
    reviewsDoneTotal: reviewsTotal - learned,
    lapsesRatio: reviewsTotal ? round1((lapsesTotal / reviewsTotal) * 100) : 0,
    backlogPeak: Math.max(0, ...days.map((d) => d.dueAtStart)),
    backlogPromptsPeak: Math.max(0, ...days.map((d) => d.duePromptsAtStart)),
    daysBacklogOverCapacity: days.filter(
      (d) => d.duePromptsAtStart > MODEL.quota,
    ).length,
    relearnChecksTotal: days.reduce(
      (n, d) => n + d.relearn.retryChecks + d.relearn.confirmChecks,
      0,
    ),
    relearnChecksPerStudyDay: round1(
      mean(studied.map((d) => d.relearn.retryChecks + d.relearn.confirmChecks)),
    ),
    relearnInterruptsPerStudyDay: round1(
      mean(studied.map((d) => d.relearn.inSession)),
    ),
    relearnCarriedMax: Math.max(0, ...days.map((d) => d.relearn.carried)),
    spikes,
    firstDayMinutes: days[0]!.minutes,
    ratingsTotal: days.reduce(
      (total, d) => {
        for (const r of Object.keys(total) as FsrsRating[])
          total[r] += d.ratings[r];
        return total;
      },
      { again: 0, hard: 0, good: 0, easy: 0 } as Record<FsrsRating, number>,
    ),
    partialOffered: days.reduce((n, d) => n + d.partialOffered, 0),
    partialHard: days.reduce((n, d) => n + d.partialHard, 0),
    notes: [
      ...new Set(
        days.flatMap((d) => d.notes.map((n) => n.replace(/ — .*$/, ""))),
      ),
    ],
  };
  if (persona.name === "쉬었다 복귀") {
    const back = days[21]!;
    const drained = days
      .slice(21)
      .find((d) => d.studied && d.backlogCarried === 0);
    summary.returnDay = {
      day: back.day,
      date: back.date,
      dueAtReturn: back.dueAtStart,
      duePromptsAtReturn: back.duePromptsAtStart,
      overdueAtReturn: back.overdueAtStart,
      daysUntilDrained: drained ? drained.day - back.day : null,
    };
  }
  return { days, summary };
}

/* ───────── 전체 ───────── */

async function main() {
  const args = process.argv.slice(2);
  const cards = !args.includes("--chips");
  const ratingGood = args.includes("--rating-good");
  if (ratingGood) MODEL.ratingWhenMissedEarlier = "good";
  // 민감도 — 네 유형의 정확도를 이만큼 올려 다시 돈다(빈칸마다 독립이라는 가정이 얼마나 세게 작용하는지 보려고).
  const plus = Number(
    args.find((a) => a.startsWith("--accuracy-plus="))?.slice(16) ?? 0,
  );
  if (plus)
    for (const p of PERSONAS as Persona[])
      p.accuracy = Math.min(1, p.accuracy + plus);
  const variant = !cards
    ? "-chips"
    : ratingGood
      ? "-rating-good"
      : plus
        ? `-accuracy-plus-${plus}`
        : "";
  const onlyGrade = args.find((a) => a.startsWith("--grade="))?.slice(8);
  const onlyPersona = args.find((a) => a.startsWith("--persona="))?.slice(10);
  const all = buildFadingConcepts(CONCEPT_BLANK_BANK.concepts, FADING_GROUPS);
  const grades = fadingGrades(all).filter((g) => !onlyGrade || g === onlyGrade);
  const personas = PERSONAS.filter(
    (p) => !onlyPersona || p.name === onlyPersona,
  );
  const started = Date.now();
  const value = (name: string) =>
    args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (["rule", "seeds", "path", "home-unit", "tag"].some((n) => value(n))) {
    await compare({
      args: {
        rules: (value("rule") ?? "base").split(",").map((name) => {
          const rule = RULES[name as RuleName];
          if (!rule)
            throw new Error(`모르는 규칙: ${name} (base · d1 · d2 · d1d2)`);
          return rule;
        }),
        seeds: Math.max(1, Number(value("seeds") ?? 1)),
        path: value("path") === "home" ? "home" : "plan",
        homeUnit: value("home-unit") === "concepts" ? "concepts" : "product",
        tag: value("tag"),
        write: !onlyGrade && !onlyPersona,
      },
      cards,
      all,
      grades,
      personas,
    });
    console.log(`끝 — ${Date.now() - started}ms`);
    return;
  }
  const runs: { days: DayRecord[]; summary: RunSummary }[] = [];
  for (const grade of grades) {
    const concepts = all.filter((c) => gradeOf(c) === grade);
    for (const persona of personas) {
      const t = Date.now();
      const run = await simulate(grade, concepts, persona, { cards });
      runs.push(run);
      const s = run.summary;
      console.log(
        `${grade} × ${persona.name}: 평균 ${s.meanMinutesPerStudyDay}분 · 최대 ${s.maxMinutesPerStudyDay}분 · 배운 ${s.learned}/${s.conceptsInGrade} · 밀림 최대 ${s.backlogPeak} · 추가 확인 ${s.relearnChecksTotal} (${Date.now() - t}ms)${s.notes.length ? ` · 주의 ${s.notes.join(" / ")}` : ""}`,
      );
    }
  }
  const dir = dirname(fileURLToPath(import.meta.url));
  mkdirSync(dir, { recursive: true });
  const output = {
    generatedAt: new Date().toISOString(),
    mode: cards ? "cards" : "chips",
    model: MODEL,
    personas: PERSONAS.map((p) => ({
      name: p.name,
      accuracy: p.accuracy,
      note: p.note,
    })),
    grades: grades.map((g) => {
      const mine = all.filter((c) => gradeOf(c) === g);
      const round1 = (v: number) => Math.round(v * 10) / 10;
      const props = mine.map((c) => c.propositions.length);
      const targets = mine.map((c) => fadingTargets(c).length);
      const avgTargets = targets.reduce((a, b) => a + b, 0) / mine.length;
      return {
        grade: g,
        concepts: mine.length,
        meanPropositions: round1(
          props.reduce((a, b) => a + b, 0) / mine.length,
        ),
        meanTargets: round1(avgTargets),
        /** 4단계를 빈칸 하나도 안 틀리고 마칠 확률의 추정 — 정확도^평균 표적 수(빈칸마다 독립일 때). */
        cleanStepFourAt: Object.fromEntries(
          PERSONAS.map((p) => [
            p.name,
            round1(Math.pow(p.accuracy, avgTargets) * 100),
          ]),
        ) as Record<PersonaName, number>,
      };
    }),
    relearn: {
      retryMs: FADING_RELEARN_RETRY_MS,
      confirmMs: FADING_RELEARN_CONFIRM_MS,
    },
    runs,
    elapsedMs: Date.now() - started,
  };
  if (!onlyGrade && !onlyPersona) {
    writeFileSync(
      join(dir, `results${variant}.json`),
      JSON.stringify(output, null, 2),
    );
    writeFileSync(join(dir, `summary${variant}.md`), renderSummary(output));
  }
  console.log(`끝 — ${Date.now() - started}ms`);
}

/* ───────── 규칙 견주기(여러 씨앗) ───────── */

type CompareRun = { rule: RuleName; seed: number; summary: RunSummary };

async function compare(input: {
  args: {
    rules: Rule[];
    seeds: number;
    path: SimPath;
    homeUnit: HomeUnit;
    tag?: string;
    write: boolean;
  };
  cards: boolean;
  all: readonly FadingConcept[];
  grades: readonly string[];
  personas: readonly Persona[];
}) {
  const { args } = input;
  const runs: CompareRun[] = [];
  for (const rule of args.rules)
    for (const grade of input.grades) {
      const concepts = input.all.filter((c) => gradeOf(c) === grade);
      for (const persona of input.personas)
        for (let seed = 0; seed < args.seeds; seed++) {
          const { summary } = await simulate(grade, concepts, persona, {
            cards: input.cards,
            rule,
            seed,
            path: args.path,
            homeUnit: args.homeUnit,
          });
          runs.push({ rule: rule.name, seed, summary });
        }
      console.log(
        `${rule.name} · ${grade} — ${input.personas.length}유형 × 씨앗 ${args.seeds}`,
      );
    }
  const notes = [...new Set(runs.flatMap((r) => r.summary.notes))];
  if (notes.length) console.log(`주의: ${notes.join(" / ")}`);
  const suffix = [
    args.path === "home" ? "-home" : "",
    args.homeUnit === "concepts" ? "-concepts" : "",
    args.tag ? `-${args.tag}` : "",
  ].join("");
  const output = {
    generatedAt: new Date().toISOString(),
    mode: input.cards ? "cards" : "chips",
    path: args.path,
    homeUnit: args.homeUnit,
    seeds: args.seeds,
    rules: args.rules.map((r) => r.name),
    model: MODEL,
    personas: PERSONAS.map((p) => ({ name: p.name, accuracy: p.accuracy })),
    grades: input.grades,
    runs,
  };
  const text = renderCompare(output);
  if (args.write) {
    const dir = dirname(fileURLToPath(import.meta.url));
    writeFileSync(
      join(dir, `results-compare${suffix}.json`),
      JSON.stringify(output, null, 2),
    );
    writeFileSync(join(dir, `summary-compare${suffix}.md`), text);
  } else console.log(text);
}

function renderCompare(output: {
  generatedAt: string;
  mode: string;
  path: SimPath;
  homeUnit: HomeUnit;
  seeds: number;
  rules: RuleName[];
  grades: readonly string[];
  runs: CompareRun[];
}) {
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const mean = (list: number[]) =>
    list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
  const personas = PERSONAS.map((p) => p.name);
  const cell = (rule: RuleName, grade: string, persona: PersonaName) =>
    output.runs
      .filter(
        (r) =>
          r.rule === rule &&
          r.summary.grade === grade &&
          r.summary.persona === persona,
      )
      .map((r) => r.summary);
  const present = output.grades.flatMap((grade) =>
    personas
      .filter((p) =>
        output.runs.some(
          (r) => r.summary.grade === grade && r.summary.persona === p,
        ),
      )
      .map((persona) => ({ grade, persona })),
  );
  const table = (title: string, pick: (list: RunSummary[]) => string) =>
    [
      `### ${title}`,
      "",
      `| 학년 | 유형 | ${output.rules.join(" | ")} |`,
      `| --- | --- | ${output.rules.map(() => "---").join(" | ")} |`,
      ...present.map(
        ({ grade, persona }) =>
          `| ${grade} | ${persona} | ${output.rules.map((rule) => pick(cell(rule, grade, persona))).join(" | ")} |`,
      ),
      "",
    ].join("\n");
  const range = (values: number[]) =>
    values.length > 1
      ? ` (${round1(Math.min(...values))}–${round1(Math.max(...values))})`
      : "";
  const lines: string[] = [];
  lines.push(
    `# «오늘의 기억» 규칙 견주기 — ${output.path === "home" ? `홈 대기열을 따라가는 학생${output.homeUnit === "concepts" ? "(홈의 옛 단위 개념 20개를 강제)" : ""}` : "«오늘의 학습» 계획(명제 20칸)을 따라가는 학생"} · ${output.mode === "cards" ? "카드 풀이" : "칩 풀이"}`,
  );
  lines.push("");
  lines.push(
    `생성: ${output.generatedAt} · \`npx tsx scripts/qa/fading-simulation/run.ts --rule=${output.rules.join(",")} --seeds=${output.seeds}${output.path === "home" ? " --path=home" : ""}${output.homeUnit === "concepts" ? " --home-unit=concepts" : ""}\` · 씨앗 ${output.seeds}개(규칙마다 같은 씨앗 묶음).`,
  );
  lines.push("");
  lines.push(
    "🔴 서버 · DB · API 를 부르지 않았다. 시간은 **가정한 초 단위 상수의 합**이고(`summary.md` 의 시간 모형), 정답 확률은 유형마다 고정이다 — 이 표가 말하는 것은 **부담과 처리량**이지 기억 유지의 우열이 아니다(못 쟀다).",
  );
  lines.push("");
  lines.push("## 규칙");
  lines.push("");
  lines.push(
    "- `base` — 2026-10-16 의 규칙. 첫 평가의 틀리지 않은 명제는 1분 → 5분 확인 둘(`exposed`), 4단계에서 하나라도 틀리면 «다시»뿐.",
  );
  lines.push(
    "- `d2` — 결정 2: 첫 평가의 `exposed` 줄은 5분 뒤 확인 한 번으로 든다(틀리면 1분 → 5분 그대로). 모의 도구는 평가 직후 방금 든 `exposed` 줄을 그 규칙의 꼴로 맞춰 견준다(제품 코드에 손잡이를 넣지 않는다).",
  );
  lines.push(
    "- `d1` — 결정 1: 카드 풀이 4단계의 부분 틀림(포기 없음 · 대조 마침 · 틀린 빈칸 1 ≤ M ≤ ⌊N/4⌋)에 «어려움»이 허용되고(간격 2일 상한), 학생은 허용되면 «어려움»을 고른다. 고르지 않는 학생(«다시»)은 옛 규칙과 같은 전이라 `base` · `d2` 의 학생이 그렇게 한다. 제품이 허용하지 않는 판에서 `d1` 은 `base` 와 같다.",
  );
  lines.push("- `d1d2` — 둘 다.");
  lines.push("");
  lines.push(
    "칸은 씨앗 평균이다. 괄호는 씨앗 사이의 범위(가장 작은 값 – 가장 큰 값). «최대»는 모든 씨앗의 공부한 날 가운데 가장 긴 날이다.",
  );
  lines.push("");
  lines.push(
    table("공부한 날의 분 — 평균 (씨앗 범위) / 최대", (list) => {
      const means = list.map((s) => s.meanMinutesPerStudyDay);
      return `${round1(mean(means))}${range(means)} / ${round1(Math.max(0, ...list.map((s) => s.maxMinutesPerStudyDay)))}`;
    }),
  );
  lines.push(
    table("35일에 배운 개념 (씨앗 범위)", (list) => {
      const learned = list.map((s) => s.learned);
      return `${round1(mean(learned))}${range(learned)}`;
    }),
  );
  lines.push(
    table(
      "«다시» 비율 % (모든 평가 가운데 «다시»)",
      (list) => `${round1(mean(list.map((s) => s.lapsesRatio)))}`,
    ),
  );
  lines.push(
    table(
      "공부한 날 평균 추가 확인(재학습) 수",
      (list) => `${round1(mean(list.map((s) => s.relearnChecksPerStudyDay)))}`,
    ),
  );
  lines.push(
    table(
      "첫날의 분",
      (list) => `${round1(mean(list.map((s) => s.firstDayMinutes)))}`,
    ),
  );
  lines.push(
    table(
      "35일의 부분 틀림 «어려움»(결정 1) — 고른 수 / 허용된 수",
      (list) =>
        `${round1(mean(list.map((s) => s.partialHard)))} / ${round1(mean(list.map((s) => s.partialOffered)))}`,
    ),
  );
  lines.push(
    table(
      "밀림 최대(복습일 된 개념)",
      (list) => `${round1(mean(list.map((s) => s.backlogPeak)))}`,
    ),
  );
  const notes = [...new Set(output.runs.flatMap((r) => r.summary.notes))];
  lines.push("## 거절(409) · 안전 상한");
  lines.push("");
  lines.push(notes.length ? notes.map((n) => `- ${n}`).join("\n") : "없음");
  lines.push("");
  return lines.join("\n");
}

function renderSummary(output: {
  generatedAt: string;
  mode: string;
  grades: {
    grade: string;
    concepts: number;
    meanPropositions: number;
    meanTargets: number;
    cleanStepFourAt: Record<PersonaName, number>;
  }[];
  runs: { days: DayRecord[]; summary: RunSummary }[];
}) {
  const personas = PERSONAS.map((p) => p.name);
  const cell = (grade: string, persona: PersonaName) =>
    output.runs.find(
      (r) => r.summary.grade === grade && r.summary.persona === persona,
    )!;
  const table = (
    title: string,
    pick: (s: RunSummary, days: DayRecord[]) => string,
  ) => {
    const lines = [
      `### ${title}`,
      "",
      `| 학년 | ${personas.join(" | ")} |`,
      `| --- | ${personas.map(() => "---").join(" | ")} |`,
      ...output.grades.map(
        ({ grade }) =>
          `| ${grade} | ${personas.map((p) => pick(cell(grade, p).summary, cell(grade, p).days)).join(" | ")} |`,
      ),
      "",
    ];
    return lines.join("\n");
  };
  const S = MODEL.seconds;
  const lines: string[] = [];
  lines.push(
    `# «오늘의 기억» 35일 시뮬레이션 — 학년 × 학생 유형 (${output.mode === "cards" ? "카드 풀이 · 운영 기본" : "칩 풀이"})`,
  );
  lines.push("");
  lines.push(
    `생성: ${output.generatedAt} · \`npx tsx scripts/qa/fading-simulation/run.ts\` · 씨앗은 «학년|유형|방식»에서 정한다(같은 입력이면 같은 결과).`,
  );
  lines.push("");
  lines.push(
    "🔴 서버 · DB · API 를 부르지 않았다. 제품 함수(`applyFadingAction` · `session.ts` · `relearn.ts` · `buildFadingDailyPlan`)를 시계를 넣어 돌렸고, 학생이 «하는 일»만 아래 모형으로 정했다. 시간은 **가정한 초 단위 상수의 합**이지 잰 값이 아니다.",
  );
  lines.push("");
  lines.push("## 학년과 개념 수(은행 · 묶음 표에서)");
  lines.push("");
  lines.push(
    `| 학년 | 개념(묶음) 수 | 묶음당 명제 평균 | 묶음당 빈칸(표적) 평균 | 4단계를 한 번도 안 틀릴 확률의 추정(${PERSONAS.map((p) => `${p.name} ${Math.round(p.accuracy * 100)}%`).join(" · ")}) |`,
  );
  lines.push(`| --- | --- | --- | --- | --- |`);
  for (const g of output.grades)
    lines.push(
      `| ${g.grade} | ${g.concepts} | ${g.meanPropositions} | ${g.meanTargets} | ${PERSONAS.map((p) => `${g.cleanStepFourAt[p.name]}%`).join(" · ")} |`,
    );
  lines.push("");
  lines.push(
    "빈칸마다 독립으로 맞힌다고 둔 모형에서는 «정확도^빈칸 수»가 4단계를 깨끗이 마칠 확률이다 — 4단계에서 하나라도 틀리면 평가는 «다시»뿐이므로(`session.ts` · §4-4) 이 수가 «다시» 비율을 거의 정한다. 🔴 실제 학생의 빈칸 정확도가 서로 독립인지는 모른다(못 쟀다).",
  );
  lines.push("");
  lines.push("## 학생 유형");
  lines.push("");
  for (const p of PERSONAS)
    lines.push(
      `- **${p.name}** — ${p.note.replace(/\d+%/, `${Math.round(p.accuracy * 100)}%`)}`,
    );
  lines.push("");
  lines.push("## 시간 모형 · 학생 모형(`run.ts` 의 `MODEL`)");
  lines.push("");
  lines.push(
    `- 첫날 ${MODEL.firstDay}(월) · ${MODEL.days}일 · 하루 한 번 ${MODEL.studyHourKst}시(한국 시각)에 연다. 오늘 분량 \`quota\` = ${MODEL.quota}칸(명제 수 · 제품의 대신 값).`,
  );
  lines.push(
    `- 초: 앱 열기 ${S.appOpen} · 풀이 열기 ${S.sessionOpen} · 1단계 카드 하나 ${S.readCard} · 칩 하나 ${S.chipPlace} · 4단계 자판 빈칸 하나 ${S.typedBlank} · 틀림 안내 ${S.wrongFeedback} · 대조 화면 명제 하나 ${S.comparison} · 단계 넘김 ${S.stepTransition} · 평가 ${S.rating} · 추가 확인 열기 ${S.relearnOpen} · 추가 확인 빈칸 하나 ${S.relearnBlank} · 추가 확인 결과 ${S.relearnResult}`,
  );
  lines.push(
    `- 한 빈칸에서 ${MODEL.giveUpAfterWrong}번 연달아 틀리면 «아직 모르겠어요»(2 · 3단계는 단계 전체 · 4단계 카드 풀이는 그 카드). 평가: 4단계 틀림 → «다시»(제품 규칙) · 2 · 3단계에서 틀린 적 → «${MODEL.ratingWhenMissedEarlier}» · 깨끗하면 «${MODEL.ratingWhenClean}» · «쉬움»은 안 고른다.`,
  );
  lines.push(
    `- 추가 확인(재학습): 풀이 중 경계(카드 하나 채움 · 단계 마침 · 정독 마침 · 평가 뒤)마다 준비된 것 하나가 뜬다(\`useFadingRelearn.boundary\`). 홈에서는 «추가 확인 시작»을 준비된 것이 없을 때까지 누른다. 계획을 마친 뒤 ${MODEL.lingerAfterPlanMs / 60_000}분 안에 준비될 것은 기다려서 한다 — 그 뒤 것은 내일로.`,
  );
  lines.push(
    "- 새 개념이 오는 길: 은행 차례로 «아직 고르지 않은 개념이 남은 첫 소단원»을 오늘 진도로 준다(운영은 탐험의 학습 단원 — `src/lib/fading/explorerDailyServer.ts:113-140` — 그 속도는 이 시뮬레이션이 모른다). 탐험의 문제 덩이 · 선수 개념 안내는 없다(재료가 없다).",
  );
  lines.push("");
  lines.push("## 코드에서 읽은 계획 규칙(파일:줄)");
  lines.push("");
  lines.push(
    "- 하루 분량의 대신 값 20 — `src/lib/fading/numbers.ts:14` (`FADING_DAILY_CAP`) · 계획의 분량 `src/lib/fading/explorerDaily.ts:180`. 칸은 **명제 수**(`explorerDaily.ts:210`) — 묶음(3 ~ 5명제)을 쪼개지 않고, 남은 칸에 안 들어가면 미룬다(`src/lib/fading/dailyPlan.ts:52`).",
  );
  lines.push(
    "- 홈의 대기열은 다른 상한을 쓴다 — **개념 20개**(`numbers.ts:135` · `fadingQueue` · 오늘 한 복습을 뺀다). 계획(20명제 ≈ 4 ~ 5묶음)과 홈(20묶음)이 다른 수다.",
  );
  lines.push(
    "- «다시»의 간격은 하루 — `src/lib/fading/schedule.ts:67`. 그 밖은 FSRS-5 가 낸 날 수(`fsrs.ts` · 목표 기억률 0.9).",
  );
  lines.push(
    "- 복습일 전의 풀이는 열지 않는다(연습) — `src/lib/fading/state.ts:186`.",
  );
  lines.push(
    "- 추가 확인 1분 · 5분 — `src/contracts/fadingRelearn.contract.ts:33-34`. 🔴 **처음 평가한 개념은 틀리지 않은 명제도 전부 1분 뒤 확인에 든다**(`exposed` — `src/lib/fading/relearn.ts:435-451`). 맞히면 5분 뒤 한 번 더(`relearn.ts:622`) → 나간다. 틀리면 다시 1분.",
  );
  lines.push(
    "- 확인은 풀이 중의 경계에서만 뜬다 — `src/components/fading/useFadingRelearn.ts:172` · `FadingCardSessionScreen.tsx:286,347,427,437,476,626`. 타이핑 중에 끼어드는 길은 없다(경계 사이에는 `paused` 로 막는다).",
  );
  lines.push(
    "- 카드 풀이가 운영 기본 — `src/lib/fading/enabled.ts:52`(`MATH_FADING_CARDS` 없음 = 켜짐). 오래 쉼의 문턱 7일 — `numbers.ts:197`.",
  );
  lines.push("");
  lines.push("## 결과 — 학년(행) × 학생 유형(열)");
  lines.push("");
  lines.push(
    table(
      "공부한 날의 분(평균 / 최대) — 기다린 분 제외",
      (s) => `${s.meanMinutesPerStudyDay} / ${s.maxMinutesPerStudyDay}`,
    ),
  );
  lines.push(
    table(
      "하루 최대 항목 수(풀이 + 추가 확인) · 하루 최대 풀이 수",
      (s) => `${s.maxDailyItems} · ${s.maxDailySessions}`,
    ),
  );
  lines.push(
    table(
      "35일에 배운 개념 / 학년 전체(%)",
      (s) => `${s.learned} / ${s.conceptsInGrade} (${s.learnedRatio}%)`,
    ),
  );
  lines.push(
    table(
      "복습 수(첫 평가 제외) · «다시» 비율",
      (s) => `${s.reviewsDoneTotal} · ${s.lapsesRatio}%`,
    ),
  );
  lines.push(
    table(
      "밀림 최대(복습일 된 개념 · 명제) · 분량 20명제를 넘긴 날 수",
      (s) =>
        `${s.backlogPeak}개 · ${s.backlogPromptsPeak}명제 · ${s.daysBacklogOverCapacity}일`,
    ),
  );
  lines.push(
    table(
      "추가 확인 합계 · 공부한 날 평균 · 풀이 중 끼어든 평균 · 대기열에 남긴 최대",
      (s) =>
        `${s.relearnChecksTotal} · ${s.relearnChecksPerStudyDay} · ${s.relearnInterruptsPerStudyDay} · ${s.relearnCarriedMax}`,
    ),
  );
  lines.push(
    table(
      "공부한 날 평균 빈칸 수(칩 + 자판 · 틀린 시도 포함)",
      (s) => `${s.meanBlanksPerStudyDay}`,
    ),
  );
  lines.push("### 쉬었다 복귀 — 돌아온 날(22일째)의 더미와 빠지는 데 걸린 날");
  lines.push("");
  lines.push(
    "| 학년 | 돌아온 날 복습일 된 개념 · 명제 | 그중 밀린(복습일 지남) | 더미가 0이 되는 날 |",
  );
  lines.push("| --- | --- | --- | --- |");
  for (const g of output.grades) {
    const r = cell(g.grade, "쉬었다 복귀").summary.returnDay!;
    lines.push(
      `| ${g.grade} | ${r.dueAtReturn}개 · ${r.duePromptsAtReturn}명제 | ${r.overdueAtReturn} | ${r.daysUntilDrained === null ? "35일 안에 안 빠짐" : `${r.daysUntilDrained}일 뒤`} |`,
    );
  }
  lines.push("");
  lines.push("## 날마다의 흐름 — 중2 × 네 유형(다른 학년은 `results.json`)");
  lines.push("");
  for (const p of personas) {
    const run = cell(
      output.grades.find((g) => g.grade === "중2")?.grade ??
        output.grades[0]!.grade,
      p,
    );
    lines.push(`### ${run.summary.grade} × ${p}`);
    lines.push("");
    lines.push(
      "| 날 | 요일 | 공부 | 복습일 된(개념·명제) | 밀린 | 계획 칸 | 풀이 | 새로 | 복습 | 다시/어려움/알맞음 | 빈칸 | 틀림 | 포기 | 1분 확인 | 5분 확인 | 끼어듦 | 확인 대기열 남김 | 내일 밀림 | 분 | 기다림(분) |",
    );
    lines.push(
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    );
    const wd = ["일", "월", "화", "수", "목", "금", "토"];
    for (const d of run.days)
      lines.push(
        `| ${d.day} | ${wd[d.weekday]} | ${d.studied ? "○" : "—"} | ${d.dueAtStart}·${d.duePromptsAtStart} | ${d.overdueAtStart} | ${d.planTotal} | ${d.sessions} | ${d.newRated} | ${d.reviewsDone} | ${d.ratings.again}/${d.ratings.hard}/${d.ratings.good} | ${d.blanks} | ${d.wrong} | ${d.giveUps} | ${d.relearn.retryChecks} | ${d.relearn.confirmChecks} | ${d.relearn.inSession} | ${d.relearn.carried} | ${d.backlogCarried} | ${d.minutes} | ${d.relearn.waitMinutes} |`,
      );
    lines.push("");
  }
  lines.push("## 눈에 띄는 것");
  lines.push("");
  lines.push(
    "(아래는 `run.ts` 가 결과에서 센 것이다 — 판단은 검토자의 몫이다.)",
  );
  lines.push("");
  const anySpike = output.runs.filter((r) => r.summary.spikes.length);
  lines.push(
    `- 복습일 된 개념이 0인 날 다음 날 5개 이상으로 튄 일: ${anySpike.length ? anySpike.map((r) => `${r.summary.grade}×${r.summary.persona}(${r.summary.spikes.map((s) => `${s.day}일째 0→${s.dueAfter}`).join(", ")})`).join(" · ") : "없음"}`,
  );
  const notes = [...new Set(output.runs.flatMap((r) => r.summary.notes))];
  lines.push(
    `- 거절(409) · 안전 상한 · 대조 대기: ${notes.length ? notes.join(" · ") : "없음"}`,
  );
  const neverReached = output.runs
    .filter((r) => r.summary.persona === "성실")
    .map(
      (r) =>
        `${r.summary.grade} ${r.summary.conceptsInGrade - r.summary.learned}개 남음`,
    );
  lines.push(`- 성실 학생이 35일에 못 닿은 개념: ${neverReached.join(" · ")}`);
  const carriedOver = output.runs.filter((r) =>
    r.days.some((d) => d.relearn.carried > 0 && d.studied),
  );
  lines.push(
    `- 하루를 마칠 때 추가 확인이 대기열에 남아 내일로 간 일이 있는 조합: ${carriedOver.length}/${output.runs.length} — 다음 날 홈에서 «추가 확인 시작»으로 하게 된다(1분 뒤 확인이 하루 뒤 확인이 된다).`,
  );
  const perSession = (persona: PersonaName) => {
    const studied = output.runs
      .filter((r) => r.summary.persona === persona)
      .flatMap((r) => r.days.filter((d) => d.studied && d.sessions > 0));
    const checks = studied.reduce(
      (n, d) => n + d.relearn.retryChecks + d.relearn.confirmChecks,
      0,
    );
    const inSession = studied.reduce((n, d) => n + d.relearn.inSession, 0);
    const sessions = studied.reduce((n, d) => n + d.sessions, 0);
    return `${persona} ${round1(checks / sessions)}회(풀이 중 ${round1(inSession / sessions)}회)`;
  };
  const round1 = (v: number) => Math.round(v * 10) / 10;
  lines.push(
    `- 풀이(개념 묶음) 하나당 추가 확인 수 — 전 학년 합산: ${personas.map(perSession).join(" · ")}. 처음 평가한 묶음은 명제마다 1분 · 5분 확인 둘이 붙는다(\`exposed\`).`,
  );
  const firstDay = output.runs
    .filter((r) => r.summary.persona === "성실")
    .map(
      (r) =>
        `${r.summary.grade} ${r.days[0]!.minutes}분(풀이 ${r.days[0]!.sessions} · 확인 ${r.days[0]!.relearn.retryChecks + r.days[0]!.relearn.confirmChecks})`,
    );
  lines.push(`- 성실 학생의 첫날(새 개념만 있는 날): ${firstDay.join(" · ")}.`);
  const newPerDay = output.runs
    .filter((r) => r.summary.persona === "성실")
    .map(
      (r) =>
        `${r.summary.grade} ${r.days.filter((d) => d.newRated > 0).length}일`,
    );
  lines.push(
    `- 성실 학생이 35일 가운데 새 개념을 하나라도 배운 날: ${newPerDay.join(" · ")} — 나머지 날은 계획 20칸이 복습으로 찬다(«다시» · «어려움»의 짧은 간격이 같은 묶음을 날마다 되돌린다).`,
  );
  lines.push("");
  lines.push("## 못 쟀다");
  lines.push("");
  lines.push(
    "- **실제 소요 시간** — 초 단위 상수는 가정이다. 실제 학생의 타이핑 · 읽기 속도를 재지 않았다.",
  );
  lines.push(
    "- **운영의 새 개념 속도** — 탐험의 학습 단원(`explorerDailyServer.ts`)과 선수 개념 안내 · 문제 덩이는 학생 기록(DB)에서 오는데, DB 를 부르지 않았다. 여기서는 소단원을 은행 차례로 학생 속도대로 나간다.",
  );
  lines.push(
    "- **홈 화면의 대기열(개념 20개 상한)로 공부하는 학생** — 이 시뮬레이션은 탐험 화면의 «오늘의 학습»(명제 20칸)을 따랐다. `/learn/fading` 홈에서 대기열을 따라가면 하루 분량이 다르다(최대 20묶음).",
  );
  lines.push(
    "- **못 알아본 글(대조 «같은 뜻 / 다름»)** — 학생이 은행의 답을 그대로 쓰거나 다른 답을 쓴다고 두었다. 오타 · 다른 표현의 대조 흐름은 안 돌았다.",
  );
  lines.push(
    "- **추가 확인의 정확도** — 본 풀이와 같은 확률을 썼다. 1분 뒤의 기억이 본 풀이와 다른지 모른다.",
  );
  lines.push("- **«오늘 전부» · «쉬움»** — 학생이 고르지 않는다고 두었다.");
  lines.push("- **다중 시각(하루 두 번 열기)** — 하루 한 번만 열었다.");
  return lines.join("\n") + "\n";
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
