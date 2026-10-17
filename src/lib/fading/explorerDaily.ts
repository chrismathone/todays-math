import { CONCEPT_BLANK_LEVELS } from "@/contracts/conceptBlank.contract";
import type {
  StoredFading,
  StoredFadingConcept,
} from "@/contracts/fading.contract";
import {
  FADING_DAILY_VERSION,
  type FadingDailyActivity,
  type FadingDailyBucket,
  type FadingDailyPlan,
  type FadingDailyPractice,
  type FadingDailyReasonCode,
  type FadingDailyRecall,
  type FadingEvidenceStatus,
  type FadingPrerequisiteAdvisory,
  type FadingPrerequisiteLink,
} from "@/contracts/fadingDaily.contract";
import type {
  ExpeditionPlan,
  MathExpeditionKind,
} from "@/contracts/mathExpedition.contract";
import type { FadingConcept } from "./concepts";
import { allocateDaily, type DailyCandidate } from "./dailyPlan";
import {
  FADING_DAILY_CAP,
  daysUntilReview,
  fadingQueue,
  forgettingRisk,
} from "./numbers";
import { fadingDayOfDate, type FadingProgress } from "./schedule";
import { fadingProgressOf } from "./state";

/**
 * «오늘 할 일»을 짓는다 — «오늘의 기억»의 저장 칸과(있으면) 탐험의 오늘 분량에서.
 *
 * 화면도 DB 도 모른다. 받은 값만 읽고 아무것도 바꾸지 않는다 — 같은 입력이면 같은 계획이다. 학생 라우트(`dailyRoutes.ts`)와
 * 서버 없이 도는 `createLocalFadingSource` 가 이 함수 하나를 지난다.
 *
 * 분량은 **넘지 않는 합계**이고 정해 둔 비율이 없다. 넣는 차례가 곧 우선순위다:
 *   1. 풀던 것(열린 풀이 · 풀던 탐험) — 빚진 것이라 분량을 넘어도 낸다.
 *   2. **복습일이 된 개념**, 망각 위험(일정 계산기의 추정 — 떠올릴 확률의 나머지)이 큰 것부터. 밀린 날 수가 아니다.
 *      받은 안내(`prerequisite` — 적혀 있는 연결뿐이다)의 선수 개념 가운데 근거가 있는 것(«다시»로 끝났거나 복습일이 된 것)도
 *      이 차례에 같이 든다. 복습이 분량을 다 쓰면 그 뒤는 0 이다. 학생이 «오늘 전부»를 고른 날은 분량을 넘어도 전부 낸다.
 *   3. **탐험의 한 덩이** — 남은 칸에 통째로 들어갈 때만.
 *   4. **확인한 기록이 없는 선수 개념** — 연결마다 하루에 하나. 필요한지 아직 모르는 것이라 탐험의 덩이를 밀어내지 않는다.
 *      그 개념 **자신의** 풀이라 그 개념의 복습일만 정해진다 — 오늘 배울 것의 기록은 건드리지 않는다.
 *      읽어 보기만 하는 것은 칸을 쓰지 않는다(안내에만 실린다).
 *   5. **새 개념** — 학생이 골라 둔 것 → 오늘 진도 소단원의 아직 고르지 않은 것.
 *   놓는 차례(`activities`)는 따로다: 풀던 것 → 복습 → 선수 개념 → 새 개념 → 탐험의 덩이(확인과 개념을 문제보다 먼저 한다).
 *
 * - 칸의 단위는 «물음 하나»다 — 묶음 하나는 그 명제 수만큼(3 ~ 5칸) 차지한다. 묶음은 쪼개지 않는다(복습일이 묶음 하나에 하나다) —
 *   남은 칸에 안 들어가면 미룬다(`held`). 네 단계의 되풀이를 곱해 세지 않는다.
 * - **한 것**은 기록이 말하는 만큼만 센다: 오늘 평가로 닫은 개념(`reviewedOn` 이 오늘) · 탐험이 적은 푼 문제 수.
 *   떠올리기가 탐험의 칸을 채우지 않고, 탐험의 풀이가 개념의 복습일을 옮기지 않는다(이 함수는 어느 쪽도 쓰지 않는다).
 * - 🔴 이 계획은 기본 분량만 말한다. 일정 계산은 날 단위이고 복습일은 묶음 하나에 하나다 — 같은 날 분 단위로 다시 묻는 것은
 *   따로 선 길의 몫이라 여기에 더해 세지 않는다. 탐험의 덩이 안에서 어떤 문제가 나오는지도 탐험이 정한다.
 */

/**
 * 첫 학습일에 새로 여는 개념 묶음의 상한(원장님 결정 2026-10-17 · `fading-quota-consensus-20261017.md` §7 ⑥).
 * 첫날 = 지난 날에 평가를 닫은 기록(날마다의 집계 · 개념의 평가)이 없는 날. 그날 처음 배운 묶음 · 풀던 새 묶음도 센다. 🔴 모의하지 않은 설계안이다.
 */
export const FADING_FIRST_DAY_NEW_BUNDLES = 2;

/** 탐험의 오늘 한 덩이 — 탐험의 기록에서 읽은 그대로(분량은 탐험이 정한 값이다). */
export type FadingDailyWorkload = Pick<
  ExpeditionPlan,
  "route" | "unitId" | "title" | "subtitle" | "goal"
> & {
  kind: MathExpeditionKind;
  answered: number;
  retryRemaining: number;
  /** `next` 아직 시작 전 · `active` · `retry` 푸는 중 · `complete` 오늘 칸을 얻었다. */
  status: "next" | "active" | "retry" | "complete";
  /** 지금 시작할 수 있는가 — 아니면 `blockedReason` 이 까닭이다. */
  canStart: boolean;
  blockedReason?: string;
};

/** 선수 개념의 안내에서 «오늘의 기억» 기록의 근거를 뺀 것 — 그 근거는 계획을 지을 때 저장 칸에서 채운다. */
export type FadingPrerequisiteBasis = Omit<
  FadingPrerequisiteAdvisory,
  "links"
> & {
  links: (Omit<FadingPrerequisiteLink, "evidence"> & {
    evidence: Omit<FadingPrerequisiteLink["evidence"], "fading">;
  })[];
};

const REASONS: Readonly<Record<FadingDailyReasonCode, string>> = Object.freeze({
  "resume-recall": "풀던 개념을 이어서 떠올려요.",
  "resume-practice": "풀던 탐험을 이어서 해요.",
  "review-risk": "복습일이 된 개념이에요. 잊기 쉬운 것부터 냈어요.",
  "review-practice": "오늘은 복습하는 탐험이에요.",
  "prerequisite-unassessed":
    "오늘 배울 단원에 쓰이는 개념이에요. 아직 확인한 기록이 없어요.",
  "prerequisite-weak":
    "오늘 배울 단원에 쓰이는 개념이에요. 지난번에 «다시»로 끝났어요.",
  "prerequisite-stale": "오늘 배울 단원에 쓰이는 개념이에요. 복습일이 됐어요.",
  "progress-picked": "골라 둔 새 개념이에요.",
  "progress-section": "오늘 진도의 새 개념이에요.",
  "progress-practice": "오늘 진도의 탐험이에요.",
  "done-today": "오늘 마쳤어요.",
  blocked: "지금은 시작할 수 없어요.",
  "over-budget": "남은 칸에 들어가지 않아 오늘은 내지 않아요.",
});
const reason = (code: FadingDailyReasonCode, text?: string) => ({
  code,
  text: text ?? REASONS[code],
});

const SHORT = Object.freeze({
  block: "탐험의 한 덩이가 남은 칸에 들어가지 않습니다.",
  bundle: "남은 칸보다 큰 묶음만 남았습니다.",
  none: "오늘 낼 것이 더 없습니다.",
});

const BUCKETS: readonly FadingDailyBucket[] = [
  "review",
  "prerequisite",
  "progress",
];

/** 평가한 개념 하나의 근거 — 그 개념 자신의 기록뿐이다. «다시»로 닫혀 4단계 앞에 서 있으면 `weak`, 복습일이 됐으면 `stale`. */
function ratedEvidence(
  stored: StoredFadingConcept,
  today: string,
): Exclude<FadingEvidenceStatus, "unassessed" | "unknown"> {
  if (stored.step < 4) return "weak";
  return stored.dueOn! <= today ? "stale" : "recent";
}

/** 선수 연결 하나의 «오늘의 기억» 근거 — 이어진 개념들의 기록을 상태별로 센다. 한 값으로 뭉치지 않는다. */
export function fadingLinkEvidence(
  conceptIds: readonly string[],
  fading: StoredFading,
  today: string,
): FadingPrerequisiteLink["evidence"]["fading"] {
  let rated = 0;
  let weak = 0;
  let stale = 0;
  for (const id of conceptIds) {
    const stored = fading.concepts[id];
    if (!stored || stored.reviews === 0) continue;
    rated += 1;
    const evidence = ratedEvidence(stored, today);
    if (evidence === "weak") weak += 1;
    else if (evidence === "stale") stale += 1;
  }
  return {
    status: !conceptIds.length
      ? "unknown"
      : !rated
        ? "unassessed"
        : weak
          ? "weak"
          : stale
            ? "stale"
            : "recent",
    total: conceptIds.length,
    rated,
    weak,
    stale,
  };
}

const levelOrder = (concept: FadingConcept) =>
  CONCEPT_BLANK_LEVELS.indexOf(concept.level);

export function buildFadingDailyPlan(input: {
  /** 한국 날짜 글(YYYY-MM-DD). */
  today: string;
  fading: StoredFading;
  /** 은행의 개념(열쇠로) — 거기 없는 열쇠의 기록은 세지 않는다. */
  concepts: ReadonlyMap<string, FadingConcept>;
  /** 오늘 분량(칸) — 넘지 않는 합계. 안 주면 대신 값(«오늘의 기억»의 하루 상한과 같은 수)이고 `default` 로 적힌다. */
  quota?: number;
  /** 탐험의 오늘 한 덩이 — 없으면 «오늘의 기억»만으로 짓는다. */
  workload?: FadingDailyWorkload | null;
  prerequisite?: FadingPrerequisiteBasis | null;
  /** 오늘 진도의 소단원(은행의 열쇠 · 차례대로) — 그 소단원의 아직 고르지 않은 개념이 새 진도의 후보다. */
  progressSections?: readonly string[];
}): FadingDailyPlan {
  const { today, fading, concepts } = input;
  const day = fadingDayOfDate(today);
  const quota = Math.max(1, Math.floor(input.quota ?? FADING_DAILY_CAP));
  const mode = fading.allOn === today ? "all" : "split";

  // 은행에 있는 개념의 기록만.
  const progress: Record<string, FadingProgress> = {};
  for (const [id, stored] of Object.entries(fading.concepts))
    if (concepts.has(id)) progress[id] = fadingProgressOf(stored);

  // 선수 개념 — 안내에 적힌 개념만.
  const links = (input.prerequisite?.links ?? []).map((link) => ({
    ...link,
    conceptIds: link.conceptIds.filter((id) => concepts.has(id)),
  }));
  const prerequisiteIds = new Set(links.flatMap((link) => link.conceptIds));

  const recall = (
    id: string,
    extra: Pick<
      FadingDailyRecall,
      "bucket" | "state" | "reason" | "start" | "done"
    >,
  ): FadingDailyRecall => {
    const concept = concepts.get(id)!;
    const stored = fading.concepts[id];
    const own = stored ? fadingProgressOf(stored) : null;
    return {
      key: `recall:${id}`,
      kind: "recall",
      unit: "recall",
      // 칸은 명제 수다 — 묶음 하나를 물음 하나로 세지 않는다.
      slots: concept.propositions.length,
      prompts: concept.propositions.length,
      conceptId: id,
      section: concept.section,
      terms: concept.propositions.map((p) => p.term),
      step: stored?.step ?? null,
      rated: !!stored && stored.reviews > 0,
      risk: own ? forgettingRisk(own, day) : null,
      daysUntil: own ? daysUntilReview(own, day) : null,
      ...extra,
    };
  };
  /** 평가한 적이 있으면 복습, 없으면 새 진도 — 안내에 적힌 개념이면 선수 갈래다. */
  const bucketOf = (id: string, rated: boolean): FadingDailyBucket =>
    prerequisiteIds.has(id) ? "prerequisite" : rated ? "review" : "progress";

  const finished: FadingDailyActivity[] = [];
  const pool = new Map<string, FadingDailyActivity>();
  // 넣는 차례 = 우선순위(파일 머리의 1 ~ 4).
  const candidates: DailyCandidate[] = [];
  const offer = (activity: FadingDailyActivity, owed = false) => {
    pool.set(activity.key, activity);
    candidates.push({
      key: activity.key,
      slots: activity.slots - activity.done,
      ...(owed ? { owed } : {}),
    });
  };

  // 오늘 평가로 닫은 개념 — 처음 평가였으면 새 진도, 아니면 복습.
  for (const [id, stored] of Object.entries(fading.concepts))
    if (concepts.has(id) && stored.reviewedOn === today)
      finished.push(
        recall(id, {
          bucket: bucketOf(id, stored.reviews > 1),
          state: "done",
          reason: reason("done-today"),
          start: "none",
          done: concepts.get(id)!.propositions.length,
        }),
      );

  // 풀던 개념.
  const session =
    fading.session && concepts.has(fading.session.conceptId)
      ? fading.session
      : null;
  if (session)
    offer(
      recall(session.conceptId, {
        bucket: bucketOf(
          session.conceptId,
          fading.concepts[session.conceptId]!.reviews > 0,
        ),
        state: "active",
        reason: reason("resume-recall"),
        start: "continue",
        done: 0,
      }),
      true,
    );

  // 복습일이 된 개념 — 망각 위험이 큰 것부터(같으면 열쇠 차례). 하루 상한으로 자르지 않은 전부다.
  const queue = fadingQueue(progress, day, { mode: "all" });
  for (const id of queue.due) {
    if (id === session?.conceptId) continue;
    const bucket = bucketOf(id, true);
    offer(
      recall(id, {
        bucket,
        state: "todo",
        reason: reason(
          bucket === "review"
            ? "review-risk"
            : ratedEvidence(fading.concepts[id]!, today) === "weak"
              ? "prerequisite-weak"
              : "prerequisite-stale",
        ),
        start: "open",
        done: 0,
      }),
      // «오늘 전부»는 학생이 고른 분량이다 — 남은 칸을 보지 않는다.
      mode === "all",
    );
  }

  // 탐험의 한 덩이 뒤에 넣는 것들(아래에서 덩이를 낸 뒤에 차례대로 낸다) — 기록이 없는 선수 개념 → 골라 둔 개념 → 오늘 진도의 새 개념.
  const late: FadingDailyActivity[] = [];
  const queued = (id: string) =>
    pool.has(`recall:${id}`) || late.some((a) => a.key === `recall:${id}`);

  // 선수 개념 가운데 확인한 기록이 없는 것 — 연결마다 하루에 하나(오늘 그 연결의 개념을 처음 평가했으면 더 내지 않는다).
  // 근거가 있는 선수 개념(«다시»로 끝났거나 복습일이 된 것)은 위의 복습 차례에 이미 들어 있다. 기록이 없을 뿐인 것은
  // 필요한지 알 수 없으니 탐험의 한 덩이를 밀어내지 않는다 — 덩이 다음, 다른 새 개념보다는 먼저다.
  for (const link of links) {
    const checkedToday = link.conceptIds.some((id) => {
      const stored = fading.concepts[id];
      return stored?.reviewedOn === today && stored.reviews === 1;
    });
    const id = link.conceptIds.find(
      (conceptId) => !fading.concepts[conceptId]?.reviews && !queued(conceptId),
    );
    if (checkedToday || id === undefined) continue;
    late.push(
      recall(id, {
        bucket: "prerequisite",
        state: "todo",
        reason: reason("prerequisite-unassessed"),
        start: fading.concepts[id] ? "open" : "pick-open",
        done: 0,
      }),
    );
  }

  // 새 진도의 개념 — 골라 둔 것(풀다 만 것 먼저), 그다음 오늘 진도 소단원의 아직 고르지 않은 것(은행 차례 · 하 → 중 → 상).
  for (const id of queue.unrated) {
    if (id === session?.conceptId || queued(id)) continue;
    late.push(
      recall(id, {
        bucket: "progress",
        state: "todo",
        reason: reason("progress-picked"),
        start: "open",
        done: 0,
      }),
    );
  }
  const sections = [...new Set(input.progressSections ?? [])];
  const fresh = [...concepts.values()]
    .filter(
      (concept) =>
        sections.includes(concept.section) && !fading.concepts[concept.id],
    )
    .sort(
      (a, b) =>
        sections.indexOf(a.section) - sections.indexOf(b.section) ||
        levelOrder(a) - levelOrder(b) ||
        a.ordinal - b.ordinal ||
        (a.id < b.id ? -1 : 1),
    );
  for (const concept of fresh) {
    if (queued(concept.id)) continue;
    late.push(
      recall(concept.id, {
        bucket: "progress",
        state: "todo",
        reason: reason("progress-section"),
        start: "pick-open",
        done: 0,
      }),
    );
  }

  // 탐험의 한 덩이 — 복습하는 날(route «memory»)이면 복습 갈래, 아니면 새 진도다. 분량은 탐험이 정한 그대로이고 쪼개지 않는다.
  const workload = input.workload ?? null;
  let blocked: FadingDailyPractice | null = null;
  let block: FadingDailyPractice | null = null;
  if (workload) {
    const answered = Math.min(workload.answered, workload.goal);
    const base = {
      key: `practice:${today}`,
      kind: "practice" as const,
      unit:
        workload.kind === "explorers"
          ? ("task" as const)
          : ("question" as const),
      bucket:
        workload.route === "memory"
          ? ("review" as const)
          : ("progress" as const),
      slots: workload.goal,
      count: workload.goal,
      retryRemaining: workload.retryRemaining,
      source: {
        kind: workload.kind,
        route: workload.route,
        unitId: workload.unitId,
        title: workload.title,
        subtitle: workload.subtitle,
        selection: "expedition" as const,
      },
    };
    const practiceReason = reason(
      workload.route === "memory" ? "review-practice" : "progress-practice",
    );
    if (workload.status === "complete")
      finished.push({
        ...base,
        done: workload.goal,
        answered: workload.goal,
        state: "done",
        reason: reason("done-today"),
        start: "none",
      });
    else if (workload.status !== "next")
      offer(
        {
          ...base,
          done: answered,
          answered,
          state: "active",
          reason: reason("resume-practice"),
          start: "continue",
        },
        true,
      );
    else if (workload.canStart) {
      block = {
        ...base,
        done: 0,
        answered: 0,
        state: "todo",
        reason: practiceReason,
        start: "start",
      };
      offer(block);
    } else
      blocked = {
        ...base,
        done: 0,
        answered: 0,
        state: "blocked",
        reason: reason("blocked", workload.blockedReason),
        start: "none",
      };
  }

  // 첫 학습일에는 새 개념 묶음을 둘까지만 낸다 — 오늘 이미 처음 배운 것 · 풀던 새 묶음을 빼고 남은 만큼.
  // 지난 날의 집계가 없어도, 오늘 전에 평가한 개념이 있으면 첫날이 아니다.
  const firstDay =
    !fading.days.some((d) => d.date < today && d.reviews > 0) &&
    !Object.values(fading.concepts).some(
      (stored) =>
        stored.reviews > 1 ||
        (stored.reviews === 1 && stored.reviewedOn !== today),
    );
  let room = Infinity;
  if (firstDay) {
    const freshToday = Object.values(fading.concepts).filter(
      (stored) => stored.reviewedOn === today && stored.reviews === 1,
    ).length;
    const openFresh =
      session && !fading.concepts[session.conceptId]!.reviews ? 1 : 0;
    room = Math.max(0, FADING_FIRST_DAY_NEW_BUNDLES - freshToday - openFresh);
  }
  for (const activity of late) {
    if (room <= 0) break;
    offer(activity);
    room -= 1;
  }

  // 오늘 이미 한 칸 — 닫은 개념의 명제 수와, 풀던 탐험이 이미 푼 문제 수(남은 칸만 후보로 냈다).
  const doneBefore =
    finished.reduce((n, activity) => n + activity.done, 0) +
    [...pool.values()].reduce(
      (n, activity) => n + (activity.kind === "practice" ? activity.done : 0),
      0,
    );
  const allocation = allocateDaily({ quota, done: doneBefore, candidates });
  const chosen = new Set(allocation.chosen);
  // 남은 칸에 안 들어간 탐험의 한 덩이 — 오늘은 내지 않는다(줄여서 내지 않는다).
  if (block && !chosen.has(block.key))
    blocked = {
      ...block,
      state: "blocked",
      reason: reason("over-budget"),
      start: "none",
    };

  // 놓는 차례 — 풀던 것 → 복습 → 선수 개념 → 새 진도(개념 먼저 · 탐험의 한 덩이는 그 뒤), 갈래 안에서는 후보를 낸 차례. 끝난 것은 맨 뒤.
  const rank = (activity: FadingDailyActivity) =>
    activity.state === "active"
      ? 0
      : 1 +
        BUCKETS.indexOf(activity.bucket) * 2 +
        (activity.kind === "practice" ? 1 : 0);
  const todo = candidates
    .filter((candidate) => chosen.has(candidate.key))
    .map((candidate, index) => ({ activity: pool.get(candidate.key)!, index }))
    .sort((a, b) => rank(a.activity) - rank(b.activity) || a.index - b.index)
    .map(({ activity }) => activity);
  const activities = [...todo, ...(blocked ? [blocked] : []), ...finished];

  const counted = activities.filter((a) => a.state !== "blocked");
  const tally = (list: readonly FadingDailyActivity[]) => ({
    planned: list.reduce((n, a) => n + a.slots, 0),
    done: list.reduce((n, a) => n + a.done, 0),
  });
  const buckets = {
    review: tally(counted.filter((a) => a.bucket === "review")),
    prerequisite: tally(counted.filter((a) => a.bucket === "prerequisite")),
    progress: tally(counted.filter((a) => a.bucket === "progress")),
  };
  const recalls = counted.filter((a) => a.kind === "recall");
  const practices = counted.filter(
    (a): a is FadingDailyPractice => a.kind === "practice",
  );
  const practiceTally = (unit: FadingDailyPractice["unit"]) => {
    const list = practices.filter((a) => a.unit === unit);
    return {
      planned: list.reduce((n, a) => n + a.count, 0),
      done: list.reduce((n, a) => n + a.answered, 0),
    };
  };
  const total = BUCKETS.reduce((n, b) => n + buckets[b].planned, 0);
  const doneSlots = BUCKETS.reduce((n, b) => n + buckets[b].done, 0);

  // 못 채운 칸의 까닭 — 시작할 수 없는 탐험 → 남은 칸에 안 들어간 탐험 → 남은 칸보다 큰 묶음 → 낼 것이 더 없음.
  const heldIds = queue.due.filter(
    (id) => id !== session?.conceptId && !chosen.has(`recall:${id}`),
  );
  const skippedBundle = allocation.skipped.some((key) =>
    key.startsWith("recall:"),
  );
  const shortfall: FadingDailyPlan["shortfall"] = allocation.unfilled
    ? [
        blocked
          ? {
              bucket: blocked.bucket,
              slots: allocation.unfilled,
              reason:
                blocked.reason.code === "over-budget"
                  ? SHORT.block
                  : blocked.reason.text,
            }
          : {
              bucket: heldIds.length ? "review" : "progress",
              slots: allocation.unfilled,
              reason: skippedBundle ? SHORT.bundle : SHORT.none,
            },
      ]
    : [];
  const pending = todo.length > 0;
  // 재료가 바닥나 못 채웠을 때만 «short» 다 — 남은 것이 칸에 안 들어가 미룬 날은 낼 것을 다 한 것이다.
  const exhausted = allocation.unfilled > 0 && !allocation.skipped.length;
  const status: FadingDailyPlan["status"] = !counted.length
    ? "empty"
    : pending
      ? doneSlots > 0 || todo.some((a) => a.state === "active")
        ? "in-progress"
        : "todo"
      : exhausted
        ? "short"
        : "done";

  const prerequisite: FadingPrerequisiteAdvisory | null = input.prerequisite
    ? {
        target: input.prerequisite.target,
        coverage: input.prerequisite.coverage,
        links: links.map((link) => ({
          ...link,
          evidence: {
            ...link.evidence,
            fading: fadingLinkEvidence(link.conceptIds, fading, today),
          },
        })),
      }
    : null;

  return {
    version: FADING_DAILY_VERSION,
    today,
    mode,
    quota: {
      total: quota,
      source: input.quota === undefined ? "default" : "explicit",
      over: allocation.over,
    },
    shares: {
      review: buckets.review.planned,
      prerequisite: buckets.prerequisite.planned,
      progress: buckets.progress.planned,
    },
    counts: { total, done: doneSlots, remaining: total - doneSlots },
    buckets,
    units: {
      recall: {
        planned: recalls.length,
        done: recalls.filter((a) => a.state === "done").length,
      },
      prompt: tally(recalls),
      question: practiceTally("question"),
      task: practiceTally("task"),
    },
    activities,
    next: todo[0]?.key ?? null,
    status,
    shortfall,
    held: {
      recalls: heldIds.length,
      prompts: heldIds.reduce(
        (n, id) => n + concepts.get(id)!.propositions.length,
        0,
      ),
    },
    prerequisite,
    integration: { expedition: !!workload },
  };
}
