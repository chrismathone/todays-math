/**
 * 개념 카드(탐험) 기록의 **교사용 투영** — 저장된 기록을 읽기만 한다 (27번 문서 §4 공백 1 · 2).
 *
 * 순수 함수다: DB · 시계 · 저장이 없다. 오늘(KST 날짜 글)은 부르는 쪽이 준다(`kstDateOf`).
 * 응답 꼴은 `src/contracts/mathExplorersTeacher.contract.ts`, 끝점은 `teacherRoutes.ts`.
 *
 * 🔴 D-141 ⑵ — 문항 글 · 보기 · 학생이 고른 답은 싣지 않는다. 카드에서 꺼내는 것은 **id · 이름 · 단원**뿐이고,
 *    세션에서 꺼내는 것은 **수**뿐이다(무엇을 골랐는지는 애초에 저장돼 있지 않다 — 27번 문서 §1).
 *
 * 만기는 학생 화면이 읽는 값과 같다(`definitionEffectiveDue` · `definitionDue` — 뜻을 고친 카드의 앞당긴 판 날 포함,
 * D-143 ⑦). 교사 화면과 학생 화면이 «다음 복습»을 다르게 말하지 않게.
 */
import { isoDateSchema } from "@/contracts/common.contract";
import type { StoredExplorer } from "@/contracts/mathExplorers.contract";
import type {
  ExplorerTeacherCard,
  ExplorerTeacherDetail,
  ExplorerTeacherLearningFlag,
  ExplorerTeacherOperationFlag,
  ExplorerTeacherSummary,
} from "@/contracts/mathExplorersTeacher.contract";
import {
  definitionCards,
  definitionDue,
  definitionEffectiveDue,
  definitionUnits,
  reviewStep,
} from "./definition-cards";

/**
 * 도움 사유 문턱의 정책 판 — 27번 문서 §4.2 **v1.1**(리드 · codex · grok 합의, 2026-10-01 — 운영 자료가 아직 없어
 * 자료로 맞춘 값이 아니다). **아래 값을 바꾸면 이 번호도 올린다**(시험이 둘을 함께 잠근다).
 * 응답에 실려 나가므로, 나중에 목록을 되짚을 때 «어느 문턱으로 선 사유인가»를 알 수 있다.
 */
export const TEACHER_FLAG_POLICY = 2;
/** 최근 세션 — 이력 끝에서 이만큼을 싣는다(보여 주는 수 — 사유의 문턱이 아니다). */
export const RECENT_SESSION_LIMIT = 10;
/** ① 미해결을 남기고 끝냄 — **가장 최근 세션**에 남은 활동이 이만큼 이상이고, */
export const UNRESOLVED_FLAG_MIN = 1;
/** … 그 세션이 최근 이만큼(날) 안 — 오늘을 0 으로 세어 이 수보다 작을 때. */
export const UNRESOLVED_RECENT_DAYS = 7;
/** ② 최근 복습에서 막힘 — 이미 모은 카드가 복습에서 틀린 채로 있는 것이 이만큼(장) 이상. */
export const REVIEW_STUCK_FLAG_CARDS = 2;
/** ③ 복습이 밀림 — 만기가 이만큼(날) 이상 지난 카드가 */
export const OVERDUE_FLAG_DAYS = 3;
/** … 이만큼(장) 이상이거나, */
export const OVERDUE_FLAG_CARDS = 3;
/** … 이만큼(날) 이상 지난 카드가 한 장이라도 있음. */
export const OVERDUE_LONG_FLAG_DAYS = 7;
/** ④ 임무가 날을 넘김 — 열린 세션을 시작한 날이 오늘보다 이만큼(날) 이상 앞. */
export const CARRIED_OVER_FLAG_DAYS = 2;
/** ⑤ 오래 쉼 — 마지막으로 하루를 끝낸 날부터 이만큼(날) 이상. */
export const IDLE_FLAG_DAYS = 7;
/** 운영 · 시작 전 — 계정을 만든 날부터 이만큼(날) 뒤부터(만든 날을 모르면 바로). */
export const NOT_STARTED_GRACE_DAYS = 3;

/** 통합 탐험의 칸 기록에서 날짜만 — 은행 날의 칸은 여기에만 남는다(`StoredExplorer.completedDays` 는 개념 세션뿐). */
type TileLedger = {
  legacyDays: readonly { date: string }[];
  awards: readonly { day: { date: string } }[];
};
/** 투영이 읽는 것 — 학생 기록(`StoredSrsState`)의 두 칸. 구조만 맞으면 된다. */
export type ExplorerTeacherRecord = {
  explorers?: StoredExplorer;
  expedition?: TileLedger;
};
/** 학생 행에서 오는 계정 사실 — 운영 확인 사유만 이것을 읽는다. `createdOn` 은 KST 날짜 글, 모르면 null. */
export type ExplorerTeacherAccount = {
  hasAccount: boolean;
  createdOn: string | null;
};
/** 계정 사실을 안 주면: 계정은 있고 만든 날은 모른다(«시작 전»이 바로 선다). */
const UNKNOWN_ACCOUNT: ExplorerTeacherAccount = {
  hasAccount: true,
  createdOn: null,
};

/** 칸을 얻은 날들(개념 · 은행 · 옛 기록에서 들여온 날) — 차례는 기록 그대로. */
export function expeditionTileDates(expedition: TileLedger | undefined) {
  return expedition
    ? [
        ...expedition.legacyDays.map((day) => day.date),
        ...expedition.awards.map((award) => award.day.date),
      ]
    : [];
}

const DAY_MS = 86_400_000;
/** `from` 에서 `to` 까지 며칠 — 날짜 글끼리(KST 날짜라 시각이 없다). */
const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS,
  );
const latest = (dates: readonly string[]) =>
  dates.reduce<string | null>(
    (last, date) => (last === null || date > last ? date : last),
    null,
  );

const unitOf = new Map(definitionUnits.map((unit) => [unit.id, unit]));
const cardOf = new Map(definitionCards.map((card) => [card.id, card]));
const unitTitle = (unitId: string) => unitOf.get(unitId)?.title ?? unitId;
const learningFlag = (
  code: ExplorerTeacherLearningFlag["code"],
  value: number,
  date: string,
  cards: readonly { id: string; name: string }[] = [],
): ExplorerTeacherLearningFlag => ({
  code,
  value,
  date,
  // 카드에서 나가는 것은 id 와 이름뿐이다(D-141 ⑵)
  cards: cards.map((card) => ({ id: card.id, name: card.name })),
});

/** 운영 확인 — 계정 없음, 아니면 시작 전(계정을 만든 지 `NOT_STARTED_GRACE_DAYS` 가 지났거나 만든 날을 모를 때). */
function operationFlags(
  started: boolean,
  account: ExplorerTeacherAccount,
  today: string,
): ExplorerTeacherOperationFlag[] {
  if (!account.hasAccount)
    return [{ code: "no-account", value: null, date: null }];
  if (started) return [];
  const age = account.createdOn
    ? Math.max(0, daysBetween(account.createdOn, today))
    : null;
  return age === null || age >= NOT_STARTED_GRACE_DAYS
    ? [{ code: "not-started", value: age, date: account.createdOn }]
    : [];
}

/** 학생 한 명의 상세 — 요약 + 카드 목록. `today` 는 KST 날짜 글(YYYY-MM-DD). */
export function explorerTeacherDetail(
  record: ExplorerTeacherRecord | null | undefined,
  today: string,
  account: ExplorerTeacherAccount = UNKNOWN_ACCOUNT,
): ExplorerTeacherDetail {
  isoDateSchema.parse(today);
  const explorer = record?.explorers;
  const definitions = explorer?.profile.definitions;
  const lastCompletedDate = latest([
    ...(explorer?.completedDays.map((day) => day.date) ?? []),
    ...expeditionTileDates(record?.expedition),
  ]);

  // 카드 — 도감과 같은 차례(단원 순). 230 밖의 id 는 없다(id 불변 시험)지만 있어도 건너뛴다.
  const cards: ExplorerTeacherCard[] = definitionCards.flatMap((card) => {
    const progress = definitions?.cards[card.id];
    if (!progress) return [];
    const due = definitionEffectiveDue(card.id, progress);
    return [
      {
        id: card.id,
        name: card.name,
        unitId: card.unit,
        unitTitle: unitTitle(card.unit),
        grade: unitOf.get(card.unit)!.grade,
        level: progress.level,
        due,
        lastRecall: progress.lastRecall ?? null,
        missed: progress.missed,
        reviewStep: reviewStep(progress),
        overdueDays: Math.max(0, daysBetween(due, today)),
      },
    ];
  });
  const late = cards.filter((card) => card.overdueDays > 0);

  // 열린 세션 — 풀고 있거나(재도전 연장 포함), 끝냈지만 미해결이 남은 세션. 지난 칸 다시 풀기는 임무가 아니다.
  const session = definitions?.session;
  const open =
    session &&
    !session.reviewOnly &&
    (!session.done || session.unresolved.length > 0)
      ? session
      : null;

  const history = definitions?.history ?? [];
  const learningFlags: ExplorerTeacherLearningFlag[] = [];

  // ① 미해결을 남기고 끝냄 — **가장 최근 세션** 하나만 본다: 이력의 마지막 줄(다시 풀어 없애면 그 줄이 0 이 된다),
  //    끝난 세션이 아직 이력에 없으면 그 세션. 옛 세션은 이력 줄에 id 가 없다(엔진이 다시 풀 때 맨 끝 줄에 붙인다).
  const last = history.at(-1);
  const recorded =
    !!last &&
    !!open &&
    (last.sessionId === open.id ||
      (!last.sessionId && last.unit === open.unit));
  const lastSession =
    open?.done && !recorded
      ? { date: open.date, unresolved: open.unresolved.length }
      : last;
  if (
    lastSession &&
    lastSession.unresolved >= UNRESOLVED_FLAG_MIN &&
    daysBetween(lastSession.date, today) < UNRESOLVED_RECENT_DAYS
  )
    learningFlags.push(
      learningFlag(
        "unresolved",
        lastSession.unresolved,
        lastSession.date,
        // `missed` = 그 세션이 끝났을 때 이 카드에 남은 활동 수 — «어느 카드가 남았나»로만 읽는다
        cards.filter((card) => card.missed >= 1),
      ),
    );

  // ② 최근 복습에서 막힘 — 이미 모은 카드가 **모은 날보다 뒤에** 틀린 채로 있다.
  //    🔴 `level ≥ 1` 과 `lastRecall = "retry"` 만으로는 안 갈린다: 처음 배우며 첫 시도를 틀리고 재도전으로 푼 카드도
  //    그날 레벨 1 · "retry" 가 된다(새 단원 날마다 거의 모든 학생이 선다). 날짜로 가른다 — 레벨이 오른 마지막 날
  //    (`lastDate`)보다 기억을 잰 날(`reviewedAt`)이 뒤면 복습이다. 모은 그날 다시 풀다 틀린 것은 못 가른다.
  const stuck = definitionCards.flatMap((card) => {
    const progress = definitions?.cards[card.id];
    return progress &&
      progress.level >= 1 &&
      progress.lastRecall === "retry" &&
      (progress.reviewedAt ?? "") > progress.lastDate
      ? [{ id: card.id, name: card.name, reviewedAt: progress.reviewedAt! }]
      : [];
  });
  if (stuck.length >= REVIEW_STUCK_FLAG_CARDS)
    learningFlags.push(
      learningFlag(
        "review-stuck",
        stuck.length,
        latest(stuck.map((card) => card.reviewedAt))!,
        stuck,
      ),
    );

  // ③ 복습이 밀림 — 사흘 넘게 밀린 카드가 여러 장이거나, 한 장이라도 오래 밀렸을 때
  const overdue = late
    .filter((card) => card.overdueDays >= OVERDUE_FLAG_DAYS)
    .sort((a, b) => b.overdueDays - a.overdueDays);
  if (
    overdue.length >= OVERDUE_FLAG_CARDS ||
    (overdue.length > 0 && overdue[0].overdueDays >= OVERDUE_LONG_FLAG_DAYS)
  )
    learningFlags.push(
      learningFlag("overdue", overdue[0].overdueDays, overdue[0].due, overdue),
    );

  // ④ 임무가 날을 넘김
  const carried = open ? daysBetween(open.date, today) : 0;
  if (open && carried >= CARRIED_OVER_FLAG_DAYS)
    learningFlags.push(learningFlag("carried-over", carried, open.date));

  // ⑤ 오래 쉼 — 학습 이력(끝낸 날)이 있는 학생만. 하나도 없으면 잴 날이 없다
  const idle = lastCompletedDate ? daysBetween(lastCompletedDate, today) : 0;
  if (lastCompletedDate && idle >= IDLE_FLAG_DAYS)
    learningFlags.push(learningFlag("idle", idle, lastCompletedDate));

  return {
    started: !!explorer,
    collected: cards.filter((card) => card.level >= 1).length,
    total: 230,
    units: definitionUnits.flatMap((unit) => {
      const own = cards.filter((card) => card.unitId === unit.id);
      return own.length
        ? [
            {
              id: unit.id,
              title: unit.title,
              grade: unit.grade,
              collected: own.filter((card) => card.level >= 1).length,
              total: 5 as const,
            },
          ]
        : [];
    }),
    dueToday: explorer ? definitionDue(explorer.profile, today).length : 0,
    overdue: {
      cards: late.length,
      maxDays: Math.max(0, ...late.map((card) => card.overdueDays)),
    },
    recentSessions: history
      .slice(-RECENT_SESSION_LIMIT)
      .reverse()
      .map((h) => ({
        date: h.date,
        route: h.route ?? "unit",
        unitId: h.unit,
        unitTitle: unitTitle(h.unit),
        targetCardName:
          h.route === "repair" && h.targetCardId
            ? (cardOf.get(h.targetCardId)?.name ?? null)
            : null,
        first: h.first,
        total: 15 as const,
        unresolved: h.unresolved,
        stars: h.stars,
      })),
    openSession: open
      ? {
          startedOn: open.date,
          route: open.route ?? "unit",
          unitId: open.unit,
          unitTitle: unitTitle(open.unit),
          status: open.done ? "retry" : "active",
          solved: open.passed.length,
          total: 15,
          round: open.round,
          continuation: open.continuation ?? 0,
          unresolved: open.unresolved.length,
        }
      : null,
    lastCompletedDate,
    learningFlags,
    operationFlags: operationFlags(!!explorer, account, today),
    cards,
  };
}

/** 반 목록의 한 줄 — 상세에서 카드 목록을 뺀 것. */
export function explorerTeacherSummary(
  record: ExplorerTeacherRecord | null | undefined,
  today: string,
  account: ExplorerTeacherAccount = UNKNOWN_ACCOUNT,
): ExplorerTeacherSummary {
  const { cards, ...summary } = explorerTeacherDetail(record, today, account);
  void cards; // 카드 목록은 학생 상세에만 나간다
  return summary;
}
