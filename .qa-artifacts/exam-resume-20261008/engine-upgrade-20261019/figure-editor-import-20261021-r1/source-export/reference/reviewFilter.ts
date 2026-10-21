/**
 * 대조 지적 거르기 — 다시 그릴 이유가 아닌 줄을 뺀다(이 앱에서만, 2026-10-21 실측).
 *
 * 대조 모델(Sonnet 5.5 low)은 «고칠 것만» 적으라는 지시에도 다음을 issues 에 섞었다. 하나라도 섞이면
 * 판정이 실패라 명세를 다시 받으므로, 벡터 문제는 세 바퀴를 늘 다 돌았다(자동 작도 23초 중 약 15초).
 *   - 스스로 고칠 것 없다고 한 줄: «(14,6)이며 일치하므로 수정 불필요»
 *   - 확신 없는 줄:               «…멈춤 – 확인 필요», «…검증이 불확실하다», «…있는지 확인이 불가하다»
 *   - 엔진이 정하는 서식:         «화살촉이 너무 작아 거의 보이지 않으므로 키울 것» — 명세로는 못 바꾼다
 * 빠지거나 남는 화살촉(«시작점 화살촉 제거»), 좌표·개수·라벨처럼 명세로 고칠 수 있는 지적은 남긴다.
 * «일치»·«확인 필요»가 섞여도 «옮길 것»처럼 고칠 동작을 적었으면 진짜 지적으로 보고 남긴다.
 */

/** 고칠 것이 없다고 스스로 말한 줄 — 언제나 뺀다. */
const NO_FIX = /(?:수정|고칠|바꿀|옮길)\s*(?:이|은|할)?\s*(?:불필요|필요\s*(?:가|는)?\s*없|하지\s*않아도)|(?:문제|차이)\s*(?:가|는)?\s*없(?:다|음|습니다|으므로|어)/;

/** 맞다·모르겠다는 줄 — 고칠 동작이 함께 적혀 있지 않으면 뺀다. */
const SOFT: readonly RegExp[] = [
  /일치(?:하므로|함|합니다|한다|하여|해)/,
  /확인\s*(?:이|은)?\s*(?:필요|불가|어렵|안\s*됨)/,
  /확인할\s*수\s*없/,
  /(?:검증|판단|판별|식별)\s*(?:이|은|하기)?\s*(?:불확실|어렵|불가)/,
  /불확실/,
  /알\s*수\s*없/,
];

const FIX_VERB =
  /옮기|옮길|옮겨|맞추|맞출|맞춰|추가|제거|삭제|지우|지울|바꾸|바꿀|바꿔|고치|고칠|고쳐|늘리|늘릴|줄이|줄일|넣을|넣어|그릴|그려|붙일|붙여|빼야|뺄\s*것|이어야|여야|되어야|돼야/;

/** 엔진이 정하는 서식(화살촉 크기·선 굵기·모눈 선 색·글꼴) — 명세로 못 바꾸므로 뺀다. «재작도»의 «작»은 크기가 아니다. */
const ENGINE_STYLE: readonly RegExp[] = [
  /화살(?:촉|표\s*머리).{0,24}?(?:(?<!재)작[아게고다은]|크게|크기|키우|키울|굵|가늘|두께|뚜렷|선명)/,
  /(?:선|획|테두리)\s*(?:의\s*)?(?:굵기|두께)/,
  /(?:모눈|격자)\s*선.{0,12}?(?:색|진하|연하|흐리)/,
  /글꼴|폰트/,
];

export interface FilteredIssues {
  kept: string[];
  dropped: string[];
}

export function isReviewNoise(issue: string): boolean {
  if (NO_FIX.test(issue)) return true;
  if (ENGINE_STYLE.some((re) => re.test(issue))) return true;
  return SOFT.some((re) => re.test(issue)) && !FIX_VERB.test(issue);
}

export function filterReviewIssues(issues: readonly string[]): FilteredIssues {
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const issue of issues) (isReviewNoise(issue) ? dropped : kept).push(issue);
  return { kept, dropped };
}
