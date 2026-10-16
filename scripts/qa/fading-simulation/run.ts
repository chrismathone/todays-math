/**
 * «오늘의 기억»(학생 SRS · fading) 35일 시뮬레이션 — 학년 × 학생 유형마다 하루 학습량 · 밀림 · 재학습 확인 수 · 추정 시간을 잰다.
 *
 *   npx tsx scripts/qa/fading-simulation/run.ts              # 카드 풀이(운영 기본 · `MATH_FADING_CARDS` 없음 = 켜짐)
 *   npx tsx scripts/qa/fading-simulation/run.ts --chips      # 칩 풀이(4단계도 칩)
 *   npx tsx scripts/qa/fading-simulation/run.ts --grade=중2 --persona=성실   # 하나만
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
  notes: string[];
};

/* ───────── 학생 한 명 · 학년 하나 ───────── */

const gradeOf = (concept: FadingConcept) => concept.section.split("::")[0]!;

async function simulate(
  grade: string,
  concepts: readonly FadingConcept[],
  persona: Persona,
  options: { cards: boolean },
): Promise<{ days: DayRecord[]; summary: RunSummary }> {
  const rng = mulberry32(seedOf(`${grade}|${persona.name}|${options.cards}`));
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
    // 평가
    const allowed = allowedRatings(local);
    const rating: FsrsRating =
      allowed.includes("again") && allowed.length === 1
        ? "again"
        : missedEarlier
          ? MODEL.ratingWhenMissedEarlier
          : MODEL.ratingWhenClean;
    tick(S.rating);
    const rated = await act({
      action: "rate",
      ...ref,
      rating,
      requestId: uuidFrom(rng),
    });
    if (rated?.receipt) {
      day.ratings[rating] += 1;
      if (firstRating) day.newRated += 1;
      else day.reviewsDone += 1;
    }
    await boundary();
    inSession = false;
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

    if (day.studied) {
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
