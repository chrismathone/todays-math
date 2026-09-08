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

import { familyIdOf } from "./familyKey";
import { createSeededRandom } from "./seededRandom";

/** 복습 계획이 보는 최소한의 문항 — 출제 후보와 같은 모양의 부분집합. */
export interface RetryCandidate {
  id: string;
  unitId: string;
  familyKey?: string | null;
  difficulty: Difficulty;
  /** false 면 변형 원본 전용 — 직접 출제하지 않는다(D-26). */
  directUseAllowed: boolean;
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
  /** 복습지에 몇 문항. */
  count: number;
  /** 결정론 — 같은 씨앗이면 같은 형제가 나온다. */
  seed: string;
  /** 형제에서 뺄 문항 id — 지난 복습지와 겹치지 않게 하는 용도. */
  excludeIds?: readonly string[];
}

export interface PlanRetryResult {
  picked: RetrySeat[];
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
}

export function planRetry(args: PlanRetryArgs): PlanRetryResult {
  const { wrong, pool, count, seed } = args;
  const excluded = new Set(args.excludeIds ?? []);

  /**
   * 갈래 → 그 갈래의 «쓸 수 있는» 형제들.
   *
   * ⚠️ 여기서 «형제»는 **틀린 그 문항 자신을 뺀** 것이다. 안 빼면 원문이 형제로
   *    뽑혀 `origin` 이 «형제»라고 거짓말을 한다 — 값은 같은데 이유가 틀린다.
   */
  const siblingsByFamily = new Map<string, RetryCandidate[]>();
  for (const p of pool) {
    if (!p.directUseAllowed) continue; // D-26
    if (excluded.has(p.id)) continue;
    const fid = familyIdOf(p);
    const list = siblingsByFamily.get(fid);
    if (list) list.push(p);
    else siblingsByFamily.set(fid, [p]);
  }

  const rng = createSeededRandom(seed);
  const picked: RetrySeat[] = [];
  const usedFamilies = new Set<string>();
  let foldedWrong = 0;

  for (const w of wrong) {
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
      (p) => p.id !== w.id,
    );

    if (siblings.length === 0) {
      // 형제가 없다 — 조용히 빼지 않고 **원문을 그대로** 낸다.
      picked.push({ problem: w, wrongProblemId: w.id, origin: "원문" });
      continue;
    }

    // 씨앗으로 고른다. 매번 같은 형제가 나가면 「복습」이 아니라 그냥 한 문항이다.
    const chosen =
      siblings[Math.floor(rng() * siblings.length)] ?? siblings[0]!;
    picked.push({ problem: chosen, wrongProblemId: w.id, origin: "형제" });
  }

  return {
    picked,
    shortfall: Math.max(0, count - picked.length),
    foldedWrong,
  };
}
