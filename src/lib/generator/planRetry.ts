/**
 * **오답 복습 계획** — 「틀린 문항 → 같은 유형의 다른 문항」 (2026-09-08).
 *
 * ## 왜 만들었나
 *
 * 경쟁 문제은행 열 곳을 조사하니(문서 19) **전부** 가진 축인데 우리만 0이었다.
 * 그런데 그들의 방식(전체 성적부 + 학생 앱 자동채점)을 그대로 베끼면 안 된다 —
 * 우리 제품은 원장 **한 사람**이 쓰고 학생 앱이 없어서, 채점 입력이 통째로
 * 원장의 손으로 온다. 실측으로 전 반이 `defaultProblemCount = 8` 이라
 * 8문항짜리 시험지의 «단원 정답률»은 단원당 1~2문항이다 — **통계가 아니다.**
 * 그 연극을 위해 선택번호 1~5 를 전사시킬 이유가 없다.
 *
 * 그래서 **입력을 「틀린 번호만」으로 줄이고**, 그 하나로 얻을 수 있는 가장 큰
 * 산출(같은 유형 다시 풀리기)만 만든다.
 *
 * ## 🔴 왜 `selectProblems` 에 안 넣고 따로 두나
 *
 * 규칙이 **정반대인 자리**가 있다 — **D-20(최근 14일 중복 제외)**. 출제에서 그것은
 * 「같은 문제가 우연히 또 나오는 것」을 막는 규칙인데, 복습은 **일부러** 그 유형을
 * 다시 낸다. 한 함수에 두 뜻을 담으면 한쪽이 반드시 진다. 그래서 이 함수는
 * D-20 을 **아예 안 본다** — 대신 호출자가 `excludeIds` 로 「이번엔 빼 달라」를
 * 말할 수 있다(지난 복습지와 겹치지 않게 하는 용도).
 *
 * ## 교과서 예외 (2026-10-11)
 *
 * 교과서 오답은 원문마다 지정된 직접 자식 슬롯 1 · 2를 요청한다. 출처 `transformed`,
 * `originProblemId`와 `tb-retry-v1:<원문 id>:1|2`를 함께 확인한다. 갈래 접힘과
 * 원문 재출제 대체는 일반 복습에만 적용한다. 일반 시험의 한 갈래 한 문항은 그대로다.
 *
 * ## 실측 (공유 DB, 2026-09-08)
 *
 * · 출제 가능 **99,077**행 · `familyKey` NULL **0건**(전체 100,828행 기준으로도 0)
 * · 키 있는 갈래 **3,995**개 · 크기 중앙값 **24** · p90 44 · 최대 49
 * · 형제가 하나도 없는 갈래 **31**개 · `solo:` 로 시작하는 행 **15**건
 *
 * 곧 「같은 유형 다른 문항」은 **거의 언제나 있다.** 없는 자리(31갈래)는 조용히
 * 빼지 않고 **원문을 그대로** 다시 내고 그 사실을 `origin: "원문"` 으로 남긴다 —
 * 빼면 그 유형은 영영 복습이 안 되는데 화면에는 아무 말도 안 나온다.
 */
import type { Difficulty } from "@/contracts/difficulty";
import type { ProblemSource } from "@/contracts/common.contract";

import { familyIdOf } from "./familyKey";
import { createSeededRandom } from "./seededRandom";
import {
  parseTextbookSlotExternalId,
  retryCandidateIneligibleCode,
  TEXTBOOK_RETRY_REQUIRED,
  TEXTBOOK_RETRY_SLOTS,
  textbookSlotFit,
} from "./textbookSlots";

/** 복습 계획이 보는 최소한의 문항 — 출제 후보와 같은 모양의 부분집합. */
export interface RetryCandidate {
  id: string;
  unitId: string;
  familyKey?: string | null;
  difficulty: Difficulty;
  /** false 면 변형 원본 전용 — 직접 출제하지 않는다(D-26). */
  directUseAllowed: boolean;
  /** 옛 일반 복습 호출자는 생략할 수 있다. 교과서 쌍은 세 필드를 모두 확인한다. */
  source?: ProblemSource;
  originProblemId?: string | null;
  externalId?: string | null;
  /** DB 후보는 자격을 조회에서도 걸고, 계획에서도 다시 확인한다. */
  pool?: string;
  reviewStatus?: string;
  answer?: string;
}

/** 이 자리가 **왜** 이 문항인가. 화면이 그대로 보여 준다. */
export type RetryOrigin =
  /** 같은 갈래의 **다른** 문항을 찾았다 — 이게 기본이다. */
  | "형제"
  /** 형제가 없거나 전부 빠져서 **원문을 그대로** 다시 낸다. */
  | "원문";

export interface RetrySeat {
  /** 실제로 복습지에 실을 문항. */
  problem: RetryCandidate;
  /** 이 자리를 만든 **틀린 문항**의 id — 화면이 「무엇 때문인가」를 대야 한다. */
  wrongProblemId: string;
  origin: RetryOrigin;
}

export interface PlanRetryArgs {
  /** 틀린 문항들 — **시험지 순서 그대로** 넘긴다(자를 때 이 순서를 쓴다). */
  wrong: readonly RetryCandidate[];
  /** 형제를 찾을 후보 풀. `wrong` 자신이 들어 있어도 된다. */
  pool: readonly RetryCandidate[];
  /** 전체 자리 상한. 생략하면 교과서 오답당 2, 그 외 오답당 1을 요청한다. */
  count?: number;
  /** 결정론 — 같은 씨앗이면 같은 형제가 나온다. */
  seed: string;
  /** 형제에서 뺄 문항 id — 지난 복습지와 겹치지 않게 하는 용도. */
  excludeIds?: readonly string[];
}

export interface PlanRetryResult {
  picked: RetrySeat[];
  requestedCount: number;
  /**
   * 요청(`count`)보다 **몇 자리 모자라나.**
   *
   * 🔴 이 값을 안 내놓으면 「복습지를 냈다」가 되면서 실제로는 빈 종이가 나간다.
   *    이 저장소가 여러 번 낸 결함이라 계산 결과에 **반드시** 실어 보낸다.
   */
  shortfall: number;
  /**
   * 같은 갈래를 여러 문항 틀려서 **한 자리로 접힌** 수.
   * 「8개 틀렸는데 복습이 5문항」이 왜인지 화면이 댈 수 있어야 한다.
   */
  foldedWrong: number;
  /** 교과서 원문을 대신 싣지 않는다. 실제로 채우지 못한 원문별 자리 수. */
  textbookShortfalls: {
    wrongProblemId: string;
    required: number;
    available: number;
  }[];
}

function eligible(candidate: RetryCandidate): boolean {
  return retryCandidateIneligibleCode(candidate) === null;
}

/** 같은 오답 id의 중복은 요청 수를 늘리지 않는다. 일반 갈래 접힘은 계획이 따로 보고한다. */
export function retryRequestedCount(wrong: readonly RetryCandidate[]): number {
  const seen = new Set<string>();
  return wrong.reduce((total, problem) => {
    if (seen.has(problem.id)) return total;
    seen.add(problem.id);
    return (
      total +
      (problem.source === "school_textbook" ? TEXTBOOK_RETRY_REQUIRED : 1)
    );
  }, 0);
}

export function planRetry(args: PlanRetryArgs): PlanRetryResult {
  const { wrong, pool, seed } = args;
  const count = args.count ?? retryRequestedCount(wrong);
  const excluded = new Set(args.excludeIds ?? []);
  const wrongIds = new Set(wrong.map((p) => p.id));
  /** 지정 슬롯에 쓰지 않는 id — 호출자가 뺀 것과 이번 오답들(오답을 그 자신의 복습으로 다시 내지 않는다). */
  const blocked = new Set([...excluded, ...wrongIds]);
  const textbookIds = new Set(
    wrong.filter((p) => p.source === "school_textbook").map((p) => p.id),
  );

  /**
   * 갈래 → 그 갈래의 «쓸 수 있는» 형제들.
   *
   * ⚠️ 여기서 «형제»는 **틀린 그 문항 자신을 뺀** 것이다. 안 빼면 원문이 형제로
   *    뽑혀 `origin` 이 «형제»라고 거짓말을 한다 — 값은 같은데 이유가 틀린다.
   */
  const siblingsByFamily = new Map<string, RetryCandidate[]>();
  const textbookPairs = new Map<string, RetryCandidate[]>();
  const seenPoolIds = new Set<string>();
  for (const p of pool) {
    if (!eligible(p)) continue; // 공용 · 승인 · D-26 · 정답 자격
    if (excluded.has(p.id)) continue;
    if (seenPoolIds.has(p.id)) continue;
    seenPoolIds.add(p.id);
    if (
      p.source === "transformed" &&
      p.originProblemId &&
      textbookIds.has(p.originProblemId)
    ) {
      // 과거 복구 자식이나 같은 단원 원문은 지정 변형 쌍이 아니다 — 자리를 채우는지는 아래 `textbookSlotFit` 이 정한다.
      if (
        parseTextbookSlotExternalId(p.externalId)?.originId ===
        p.originProblemId
      ) {
        const list = textbookPairs.get(p.originProblemId) ?? [];
        list.push(p);
        textbookPairs.set(p.originProblemId, list);
      }
      // 일반 복습 자리가 먼저 지정 쌍을 소비하지 않게 원문별 자리를 예약한다.
      continue;
    }
    const fid = familyIdOf(p);
    const list = siblingsByFamily.get(fid);
    if (list) list.push(p);
    else siblingsByFamily.set(fid, [p]);
  }

  const rng = createSeededRandom(seed);
  const picked: RetrySeat[] = [];
  const usedFamilies = new Set<string>();
  const usedProblemIds = new Set<string>();
  const seenWrongIds = new Set<string>();
  const textbookShortfalls: PlanRetryResult["textbookShortfalls"] = [];
  let foldedWrong = 0;

  for (const w of wrong) {
    if (seenWrongIds.has(w.id)) continue;
    seenWrongIds.add(w.id);
    if (w.source === "school_textbook") {
      const required = Math.min(
        TEXTBOOK_RETRY_REQUIRED,
        Math.max(0, count - picked.length),
      );
      let available = 0;
      for (const slot of TEXTBOOK_RETRY_SLOTS) {
        if (available >= required) break;
        // 준비 상태(0/2 · 1/2 · 2/2)와 같은 술어 — 출처 · 부모 · 열쇠 · 차시 · 자격 · 제외(다른 오답 포함).
        const candidates = (textbookPairs.get(w.id) ?? []).filter(
          (p) =>
            textbookSlotFit(w, slot, p, blocked).status === "ready" &&
            !usedProblemIds.has(p.id),
        );
        if (candidates.length === 0) continue;
        const chosen = candidates[Math.floor(rng() * candidates.length)]!;
        picked.push({ problem: chosen, wrongProblemId: w.id, origin: "형제" });
        usedProblemIds.add(chosen.id);
        available += 1;
      }
      if (available < required)
        textbookShortfalls.push({ wrongProblemId: w.id, required, available });
      // 교과서는 갈래가 같아도 원문마다 두 자리. 원문 재출제 대체는 금지한다.
      continue;
    }
    const fid = familyIdOf(w);

    // 한 갈래는 한 번만 — 출제 규칙(원장님 확정 2026-08-26)과 **같은 규칙**이다.
    if (usedFamilies.has(fid)) {
      foldedWrong += 1;
      continue;
    }

    if (picked.length >= count) {
      // 자리가 다 찼다. 접힌 게 아니라 **잘린 것**이므로 foldedWrong 에 안 센다.
      continue;
    }

    usedFamilies.add(fid);

    const siblings = (siblingsByFamily.get(fid) ?? []).filter(
      (p) => p.id !== w.id && !usedProblemIds.has(p.id),
    );

    if (siblings.length === 0) {
      // 형제가 없다 — 조용히 빼지 않고 **원문을 그대로** 낸다.
      if (eligible(w) && !usedProblemIds.has(w.id)) {
        picked.push({ problem: w, wrongProblemId: w.id, origin: "원문" });
        usedProblemIds.add(w.id);
      }
      continue;
    }

    // 씨앗으로 고른다. 매번 같은 형제가 나가면 「복습」이 아니라 그냥 한 문항이다.
    const chosen =
      siblings[Math.floor(rng() * siblings.length)] ?? siblings[0]!;
    picked.push({ problem: chosen, wrongProblemId: w.id, origin: "형제" });
    usedProblemIds.add(chosen.id);
  }

  return {
    picked,
    requestedCount: count,
    shortfall: Math.max(0, count - picked.length),
    foldedWrong,
    textbookShortfalls,
  };
}
