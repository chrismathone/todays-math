import {
  fadingConceptIdSchema,
  type StoredFading,
} from "@/contracts/fading.contract";
import {
  fadingActionSchema,
  fadingCatalogSchema,
  fadingConceptResponseSchema,
  fadingGradeSchema,
  fadingStateSchema,
  type FadingCatalog,
  type FadingState,
} from "@/contracts/fadingApi.contract";
import {
  fadingDailyPlanSchema,
  fadingDailyQuotaSchema,
  type FadingDailyOptions,
  type FadingDailyPlan,
} from "@/contracts/fadingDaily.contract";
import {
  applyFadingAction,
  fadingActionConceptId,
  fadingActionNeedsConcept,
} from "./actions";
import type { FadingTrap } from "./chips";
import type { FadingConcept } from "./concepts";
import {
  buildFadingDailyPlan,
  type FadingDailyWorkload,
  type FadingPrerequisiteBasis,
} from "./explorerDaily";
import type { FadingFigure } from "./figures";
import {
  FadingSourceError,
  newFadingId,
  type FadingConceptDetail,
  type FadingSource,
} from "./source";
import { FadingConflict, emptyFading } from "./state";
import {
  fadingCatalogView,
  fadingConceptStatus,
  fadingGrades,
  fadingStateView,
} from "./view";

/**
 * 서버 없이 도는 «오늘의 기억» — 받은 개념과 메모리의 저장 칸으로 학생 API 와 **같은 규칙 · 같은 꼴**의 답을 낸다
 * (`docs/planning/srs-overhaul-20261006.md` §13 D4 «미리 보기 — 저장되지 않음» · §14).
 *
 * 규칙은 `applyFadingAction` · `fadingStateView` 그대로다 — 학생 라우트(`routes.ts`)와 같은 함수를 지난다. 여기서 다시 짓는 것은
 * 문(로그인 · 서버 문)과 저장뿐이다: 문은 없고, 저장은 이 값이 사는 동안의 메모리다. 새로 고치면 사라진다.
 * 은행을 부르지 않는다 — 개념은 부르는 쪽(서버 컴포넌트)이 골라 내려준다.
 */

const NOT_FOUND = "개념을(를) 찾을 수 없습니다.";
const INVALID = "요청 값이 올바르지 않습니다.";

export type LocalFadingDaily = {
  quota?: number;
  workload?: FadingDailyWorkload | null;
  prerequisite?: FadingPrerequisiteBasis | null;
  progressSections?: readonly string[];
};

export type LocalFadingSource = FadingSource & {
  /** «오늘 할 일» — 서버의 읽기와 같은 함수(`buildFadingDailyPlan`)로 짓는다. 여기서는 늘 있다. */
  dailyPlan(options?: FadingDailyOptions): Promise<FadingDailyPlan>;
  /** 지금의 «오늘»(한국 날짜 글). */
  today(): string;
  /** «오늘»을 옮긴다 — 미리 보기에서 며칠 뒤의 대기열 · 밀림 · 오래 쉰 상태를 본다. */
  setToday(date: string): void;
  /** 지금의 저장 칸(사본). */
  snapshot(): StoredFading;
};

export function createLocalFadingSource(input: {
  /** 이 자리에서 쓸 개념 전부 — 목록 · 풀이가 이 안에서만 돈다. */
  concepts: readonly FadingConcept[];
  /** 한국 날짜 글(YYYY-MM-DD). */
  today: string;
  /** 처음 상태 — 안 주면 빈 칸(첫날). */
  fading?: StoredFading;
  /** 개념 목록을 학년 없이 열 때의 학년 — 받은 개념에 없으면 첫 학년. */
  defaultGrade?: string;
  /** 하루에 내는 복습의 상한 — 안 주면 제품의 값. */
  cap?: number;
  /** 개념의 열쇠 → 함정 칩(`fadingTrapMap(개념들)` — 서버에서 지어 내려준다). 안 주면 함정 없이 돈다. */
  traps?: Readonly<Record<string, readonly FadingTrap[]>>;
  /** 개념의 열쇠 → 그림 판의 그림(`fadingFigureMap(개념들, 은행의 그림)` — 서버에서 지어 내려준다). 안 주면 그림 없이 돈다. */
  figures?: Readonly<Record<string, FadingFigure>>;
  /** 풀이를 열 때의 번호와 칩 차례의 씨앗 — 시험이 고정값을 넣는다. */
  fresh?: () => { sessionId: string; seed: number };
  /** 새로 여는 풀이를 카드 풀이로(1단계 카드 · 4단계 자판) — 서버의 하위 문 `MATH_FADING_CARDS` 와 같은 자리다. 안 주면 칩 풀이. */
  cards?: boolean;
  /**
   * «오늘 할 일»의 재료 — 안 주면 «오늘의 기억»만으로 짓는다(탐험 없이 · 선수 안내 없이). 탐험의 한 덩이 · 선수 안내 · 오늘 진도의 소단원은
   * 부르는 쪽이 읽어 내려준다(이 파일은 탐험의 기록을 모른다). 함수로 주면 부를 때마다 다시 읽는다.
   */
  daily?: LocalFadingDaily | (() => LocalFadingDaily);
}): LocalFadingSource {
  const byId = new Map(input.concepts.map((c) => [c.id, c]));
  const fresh =
    input.fresh ??
    (() => ({
      sessionId: newFadingId(),
      seed: Math.floor(Math.random() * 0x7fff_ffff),
    }));
  const trapsOf = (concept: FadingConcept) => input.traps?.[concept.id] ?? [];
  const figureOf = (concept: FadingConcept) =>
    input.figures?.[concept.id] ?? null;
  let fading = input.fading ?? emptyFading();
  let today = input.today;
  let revision = 0;

  const view = (requestId?: string): FadingState =>
    fadingStateSchema.parse(
      fadingStateView({
        fading,
        revision,
        today,
        concepts: byId,
        cap: input.cap,
        requestId,
        trapsOf,
        figureOf,
        cards: input.cards,
      }),
    );

  return {
    today: () => today,
    setToday(date) {
      today = date;
    },
    snapshot: () => structuredClone(fading),

    async state() {
      return view();
    },

    async dailyPlan(options) {
      const daily =
        typeof input.daily === "function" ? input.daily() : input.daily;
      // 분량은 학생 라우트의 `?quota=` 와 같은 꼴을 지난다.
      if (
        options?.quota !== undefined &&
        !fadingDailyQuotaSchema.safeParse(options.quota).success
      )
        throw new FadingSourceError("VALIDATION_ERROR", INVALID, 400);
      return fadingDailyPlanSchema.parse(
        buildFadingDailyPlan({
          today,
          fading,
          concepts: byId,
          ...daily,
          ...(options?.quota === undefined ? {} : { quota: options.quota }),
        }),
      );
    },

    async act(raw) {
      const parsed = fadingActionSchema.safeParse(raw);
      if (!parsed.success)
        throw new FadingSourceError("VALIDATION_ERROR", INVALID, 400);
      const action = parsed.data;
      const id = fadingActionConceptId(action);
      const concept = id === null ? undefined : byId.get(id);
      if (fadingActionNeedsConcept(action) && !concept)
        throw new FadingSourceError("NOT_FOUND", NOT_FOUND, 404);
      let next: StoredFading;
      try {
        next = applyFadingAction(
          fading,
          action,
          concept,
          today,
          fresh(),
          concept ? trapsOf(concept) : [],
          { cards: input.cards },
        );
      } catch (error) {
        if (error instanceof FadingConflict)
          throw new FadingSourceError("CONFLICT", error.message, 409);
        throw error;
      }
      // 바뀐 것이 없으면 쓰지 않는다 — 서버의 revision 이 그대로인 것과 같다.
      if (next !== fading) {
        fading = next;
        revision += 1;
      }
      return view(action.action === "rate" ? action.requestId : undefined);
    },

    async catalog(asked): Promise<FadingCatalog> {
      const grades = fadingGrades(input.concepts);
      let grade: string;
      if (asked === undefined)
        grade =
          input.defaultGrade && grades.includes(input.defaultGrade)
            ? input.defaultGrade
            : grades[0]!;
      else {
        if (!fadingGradeSchema.safeParse(asked).success)
          throw new FadingSourceError("VALIDATION_ERROR", INVALID, 400);
        if (!grades.includes(asked))
          throw new FadingSourceError(
            "VALIDATION_ERROR",
            "개념이 없는 학년입니다.",
            400,
          );
        grade = asked;
      }
      return fadingCatalogSchema.parse(
        fadingCatalogView({ grade, concepts: input.concepts, fading, today }),
      );
    },

    async concept(id): Promise<FadingConceptDetail> {
      const parsed = fadingConceptIdSchema.safeParse(id);
      if (!parsed.success)
        throw new FadingSourceError("VALIDATION_ERROR", INVALID, 400);
      const concept = byId.get(parsed.data);
      if (!concept) throw new FadingSourceError("NOT_FOUND", NOT_FOUND, 404);
      const stored = fading.concepts[concept.id];
      return fadingConceptResponseSchema.parse({
        data: {
          content: {
            concept,
            traps: trapsOf(concept).map((trap) => ({ text: trap.text })),
            figure: figureOf(concept),
          },
          status: stored ? fadingConceptStatus(concept, stored, today) : null,
          ...(input.cards ? { mode: "cards" as const } : {}),
        },
      }).data;
    },
  };
}
