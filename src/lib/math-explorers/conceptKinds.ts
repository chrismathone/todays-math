/**
 * 개념 카드 갈래 표 — 탐험 활동 머리의 갈래 딱지(05 §8.19 · D-143, 원장님 2026-09-28 Hi-fi 4안 확정).
 *
 * 원장님 제보: «이게 어떤 용어의 정의인지 정리인지 적어 놓는 게 좋을 거 같은데 너무 무작정 문제가 출몰함.»
 * 카드 원본(`definition-content.ts` · PROVENANCE)에는 갈래 칸이 없어 **원본 밖 표**로 둔다. 초안은 이름과
 * 정의 문장 모양으로 손으로 가렸다(명사로 끝남 → 대개 정의, «~다.»로 끝남 → 성질 · 공식 · 법칙 · 방법 · 단위).
 * 시안 `docs/design/mockups/hifi-concept-context.html`(«갈래 초안 230» 탭).
 *
 * 🔴 `pending` 26장은 두 갈래 사이에 걸친 것 — 교재 갈래(`docs/reference/concept-terms/*`)와 맞춰 원장님께 여쭌 뒤
 * 확정한다. 그때까지 딱지는 초안값을 보인다. 갈래 일곱 이름도 그때 같이 여쭙는다.
 *
 * 학생 화면 번들이 부르므로 카드 원본(정답 열쇠가 든 `definition-cards.ts`)을 import 하지 않는다 —
 * 230 id 가 원본과 짝인지는 시험(`conceptKinds.test.ts`)이 잠근다.
 */
export const CONCEPT_KINDS = [
  "정의",
  "성질",
  "공식",
  "방법",
  "법칙",
  "정리",
  "단위",
] as const;
export type ConceptKind = (typeof CONCEPT_KINDS)[number];

export const conceptKindTable: Readonly<Record<string, ConceptKind>> = {
  // 초3 덧셈과 뺄셈
  "g3-place": "정의", // 자릿값
  "g3-carry": "정의", // 받아올림
  "g3-borrow": "정의", // 받아내림
  "g3-sum": "정의", // 합
  "g3-difference": "정의", // 차
  // 초3 곱셈과 나눗셈
  "g3-product": "정의", // 곱
  "g3-division": "정의", // 나눗셈
  "g3-quotient": "정의", // 몫
  "g3-remainder": "정의", // 나머지
  "g3-check-division": "성질", // 나눗셈 확인
  // 초3 분수와 소수
  "g3-fraction": "정의", // 분수
  "g3-denominator": "정의", // 분모
  "g3-numerator": "정의", // 분자
  "g3-unit-fraction": "정의", // 단위분수
  "g3-decimal": "정의", // 소수 첫째 자리
  // 초3 평면도형과 원
  "g3-segment": "정의", // 선분
  "g3-right-angle": "정의", // 직각
  "g3-circle-center": "정의", // 원의 중심
  "g3-radius": "정의", // 반지름
  "g3-diameter": "정의", // 지름
  // 초3 길이·시간·들이·무게
  "g3-length": "단위", // 길이 단위
  "g3-kilometer": "단위", // 킬로미터
  "g3-time": "단위", // 시간 단위
  "g3-capacity": "정의", // 들이
  "g3-mass": "단위", // 무게 단위
  // 초3 자료와 규칙
  "g3-table": "정의", // 표
  "g3-picture-graph": "정의", // 그림그래프
  "g3-data-total": "정의", // 자료의 합계
  "g3-growing-rule": "정의", // 늘어나는 규칙
  "g3-repeat-rule": "정의", // 반복 규칙
  // 초4 큰 수와 계산
  "g4-ten-thousand": "정의", // 만
  "g4-large-place": "성질", // 큰 수의 자릿값
  "g4-hundred-million": "정의", // 억
  "g4-multiply-ten": "성질", // 10배와 100배
  "g4-estimate-quotient": "방법", // 몫 어림하기
  // 초4 분수·소수의 계산
  "g4-proper": "정의", // 진분수
  "g4-improper": "정의", // 가분수
  "g4-mixed": "정의", // 대분수
  "g4-same-denominator": "방법", // 같은 분모의 덧셈
  "g4-decimal-add": "방법", // 소수의 덧셈
  // 초4 각도와 삼각형
  "g4-angle": "정의", // 각도
  "g4-acute": "정의", // 예각
  "g4-obtuse": "정의", // 둔각
  "g4-isosceles": "정의", // 이등변삼각형
  "g4-triangle-sum": "성질", // 삼각형의 세 각
  // 초4 사각형과 다각형
  "g4-parallel": "정의", // 평행
  "g4-parallelogram": "정의", // 평행사변형
  "g4-rhombus": "정의", // 마름모
  "g4-polygon": "정의", // 다각형
  "g4-diagonal": "정의", // 대각선
  // 초4 평면도형의 이동
  "g4-slide": "정의", // 밀기
  "g4-flip": "정의", // 뒤집기
  "g4-turn": "정의", // 돌리기
  "g4-quarter-turn": "정의", // 직각만큼 돌리기
  "g4-half-turn": "정의", // 반 바퀴 돌리기
  // 초4 그래프와 규칙
  "g4-bar-graph": "정의", // 막대그래프
  "g4-line-graph": "정의", // 꺾은선그래프
  "g4-scale": "정의", // 그래프의 눈금
  "g4-number-rule": "방법", // 수 배열의 규칙
  "g4-pattern-table": "방법", // 규칙을 표로 나타내기
  // 초5 약수·배수와 혼합 계산
  "g5-divisor": "정의", // 약수
  "g5-multiple": "정의", // 배수
  "g5-gcd": "정의", // 최대공약수
  "g5-lcm": "정의", // 최소공배수
  "g5-operation-order": "방법", // 혼합 계산의 순서
  // 초5 약분·통분과 분수 계산
  "g5-equivalent": "성질", // 크기가 같은 분수
  "g5-reduce": "정의", // 약분
  "g5-irreducible": "정의", // 기약분수
  "g5-common-denominator": "정의", // 통분
  "g5-fraction-multiply": "방법", // 분수의 곱셈
  // 초5 소수 곱셈과 어림
  "g5-decimal-multiply": "방법", // 소수의 곱셈
  "g5-at-least": "정의", // 이상과 이하
  "g5-more-than": "정의", // 초과와 미만
  "g5-round": "정의", // 반올림
  "g5-round-up": "정의", // 올림과 버림
  // 초5 대응·평균·가능성
  "g5-correspondence": "정의", // 대응 관계
  "g5-rule-expression": "방법", // 대응을 식으로 나타내기
  "g5-average": "정의", // 평균
  "g5-certain": "정의", // 확실한 일
  "g5-impossible": "정의", // 불가능한 일
  // 초5 합동·대칭과 직육면체
  "g5-congruence": "정의", // 합동
  "g5-line-symmetry": "정의", // 선대칭도형
  "g5-point-symmetry": "정의", // 점대칭도형
  "g5-cuboid": "정의", // 직육면체
  "g5-cube": "정의", // 정육면체
  // 초5 다각형의 둘레와 넓이
  "g5-perimeter": "정의", // 둘레
  "g5-rectangle-area": "공식", // 직사각형의 넓이
  "g5-parallelogram-area": "공식", // 평행사변형의 넓이
  "g5-triangle-area": "공식", // 삼각형의 넓이
  "g5-trapezoid-area": "공식", // 사다리꼴의 넓이
  // 초6 분수·소수의 나눗셈
  "g6-reciprocal": "정의", // 역수
  "g6-fraction-divide": "방법", // 분수의 나눗셈
  "g6-quotient-invariant": "성질", // 몫이 같은 나눗셈
  "g6-decimal-divide": "방법", // 소수의 나눗셈
  "g6-divide-size": "성질", // 나눗셈과 크기
  // 초6 비와 비율
  "g6-ratio": "정의", // 비
  "g6-rate": "정의", // 비율
  "g6-percent": "정의", // 백분율
  "g6-rate-amount": "공식", // 비교하는 양 구하기
  "g6-ratio-simplify": "성질", // 비의 성질
  // 초6 비례식과 비례배분
  "g6-proportion": "정의", // 비례식
  "g6-inner-outer": "정의", // 내항과 외항
  "g6-cross-product": "성질", // 비례식의 성질
  "g6-distribute": "정의", // 비례배분
  "g6-part-of-ratio": "공식", // 비와 전체의 관계
  // 초6 각기둥·각뿔과 공간
  "g6-prism": "정의", // 각기둥
  "g6-pyramid": "정의", // 각뿔
  "g6-net": "정의", // 전개도
  "g6-prism-height": "정의", // 각기둥의 높이
  "g6-cube-stack": "방법", // 쌓기나무의 개수
  // 초6 원의 넓이와 둥근 입체
  "g6-circumference": "정의", // 원주
  "g6-pi": "정의", // 원주율
  "g6-circle-area": "공식", // 원의 넓이
  "g6-cylinder": "정의", // 원기둥
  "g6-cone-sphere": "정의", // 원뿔과 구
  // 초6 비율 그래프와 부피
  "g6-band-graph": "정의", // 띠그래프
  "g6-pie-graph": "정의", // 원그래프
  "g6-volume": "정의", // 부피
  "g6-cuboid-volume": "공식", // 직육면체의 부피
  "g6-surface-area": "정의", // 겉넓이
  // 중1 소인수분해
  prime: "정의", // 소수
  composite: "정의", // 합성수
  "prime-factor": "정의", // 소인수
  factorization: "정의", // 소인수분해
  coprime: "정의", // 서로소
  // 중1 정수와 유리수
  positive: "정의", // 양수
  negative: "정의", // 음수
  integer: "정의", // 정수
  rational: "정의", // 유리수
  absolute: "정의", // 절댓값
  // 중1 문자와 식
  term: "정의", // 항
  constant: "정의", // 상수항
  coefficient: "정의", // 계수
  "like-terms": "정의", // 동류항
  linear: "정의", // 일차식
  // 중1 일차방정식
  "g7-equality": "정의", // 등식
  "g7-equation": "정의", // 방정식
  "g7-identity": "정의", // 항등식
  "g7-transposition": "정의", // 이항
  "g7-linear-equation": "정의", // 일차방정식
  // 중1 좌표와 비례관계
  "g7-ordered-pair": "정의", // 순서쌍
  "g7-coordinate": "정의", // 좌표
  "g7-origin": "정의", // 원점
  "g7-direct": "정의", // 정비례
  "g7-inverse": "정의", // 반비례
  // 중1 기본 도형과 작도
  "g7-ray": "정의", // 반직선
  "g7-vertical-angle": "정의", // 맞꼭지각
  "g7-perpendicular": "정의", // 수직
  "g7-construction": "정의", // 작도
  "g7-sss": "성질", // 삼각형의 SSS 합동
  // 중1 평면도형과 입체도형
  "g7-interior-sum": "공식", // 다각형의 내각의 합
  "g7-sector": "정의", // 부채꼴
  "g7-sector-area": "공식", // 부채꼴의 넓이
  "g7-polyhedron": "정의", // 다면체
  "g7-pyramid-volume": "공식", // 뿔의 부피
  // 중1 자료의 정리와 해석
  "g7-median": "정의", // 중앙값
  "g7-mode": "정의", // 최빈값
  "g7-frequency": "정의", // 도수
  "g7-relative-frequency": "정의", // 상대도수
  "g7-histogram": "정의", // 히스토그램
  // 중2 유리수·순환소수와 지수
  "g8-terminating": "정의", // 유한소수
  "g8-repeating": "정의", // 순환소수
  "g8-repeat-block": "정의", // 순환마디
  "g8-power": "정의", // 거듭제곱
  "g8-exponent-law": "법칙", // 지수법칙
  // 중2 식의 계산과 일차부등식
  "g8-distribution": "법칙", // 분배법칙
  "g8-inequality": "정의", // 부등식
  "g8-inequality-solution": "정의", // 부등식의 해
  "g8-negative-multiply": "성질", // 음수와 부등호
  "g8-linear-inequality": "정의", // 일차부등식
  // 중2 연립일차방정식
  "g8-two-variable": "정의", // 미지수가 두 개인 일차방정식
  "g8-simultaneous": "정의", // 연립방정식
  "g8-substitution": "방법", // 대입법
  "g8-elimination": "방법", // 가감법
  "g8-common-solution": "방법", // 연립방정식 해 확인
  // 중2 일차함수
  "g8-function": "정의", // 함수
  "g8-linear-function": "정의", // 일차함수
  "g8-slope": "정의", // 기울기
  "g8-y-intercept": "정의", // y절편
  "g8-parallel-lines": "성질", // 일차함수 그래프의 평행
  // 중2 삼각형과 사각형의 성질
  "g8-circumcenter": "정의", // 외심
  "g8-incenter": "정의", // 내심
  "g8-parallelogram-diagonal": "성질", // 평행사변형의 대각선
  "g8-midpoint": "정의", // 중점
  "g8-square-properties": "성질", // 정사각형의 대각선
  // 중2 닮음과 피타고라스
  "g8-similarity": "정의", // 닮음
  "g8-similarity-ratio": "정의", // 닮음비
  "g8-similarity-area": "성질", // 닮은 도형의 넓이비
  "g8-pythagoras": "정리", // 피타고라스 정리
  "g8-centroid": "정의", // 무게중심
  // 중2 경우의 수와 확률
  "g8-cases": "정의", // 경우의 수
  "g8-addition-rule": "법칙", // 경우의 수의 합
  "g8-multiplication-rule": "법칙", // 경우의 수의 곱
  "g8-probability": "정의", // 확률
  "g8-complement": "성질", // 여사건의 확률
  // 중3 제곱근과 실수
  "g9-square-root": "정의", // 제곱근
  "g9-root-symbol": "정의", // 근호
  "g9-irrational": "정의", // 무리수
  "g9-real-number": "정의", // 실수
  "g9-root-square": "성질", // 제곱의 제곱근
  // 중3 다항식의 곱셈과 인수분해
  "g9-polynomial-multiply": "방법", // 다항식의 곱셈
  "g9-square-formula": "공식", // 합의 제곱 공식
  "g9-difference-squares": "공식", // 합과 차의 곱
  "g9-factorization": "정의", // 인수분해
  "g9-common-factor": "방법", // 공통인수 묶기
  // 중3 이차방정식
  "g9-quadratic-equation": "정의", // 이차방정식
  "g9-zero-product": "성질", // 곱이 0인 성질
  "g9-equation-root": "정의", // 이차방정식의 해
  "g9-double-root": "정의", // 중근
  "g9-root-formula": "공식", // 근의 공식
  // 중3 이차함수
  "g9-quadratic-function": "정의", // 이차함수
  "g9-parabola": "정의", // 포물선
  "g9-vertex": "성질", // 꼭짓점
  "g9-axis": "성질", // 이차함수의 축
  "g9-translation": "성질", // 이차함수의 평행이동
  // 중3 삼각비
  "g9-hypotenuse": "정의", // 빗변
  "g9-sine": "정의", // 사인
  "g9-cosine": "정의", // 코사인
  "g9-tangent": "정의", // 탄젠트
  "g9-trig-similarity": "성질", // 삼각비와 닮음
  // 중3 원의 성질
  "g9-chord": "정의", // 현
  "g9-tangent-line": "정의", // 접선
  "g9-radius-tangent": "성질", // 반지름과 접선
  "g9-inscribed-angle": "정의", // 원주각
  "g9-same-arc": "성질", // 같은 호의 원주각
  // 중3 통계와 상관관계
  "g9-deviation": "정의", // 편차
  "g9-variance": "정의", // 분산
  "g9-standard-deviation": "정의", // 표준편차
  "g9-scatterplot": "정의", // 산점도
  "g9-correlation": "정의", // 상관관계
};

/** 두 갈래 사이에 걸친 카드 — 원장님 확정 전(초안값을 보인다). 까닭은 시안 표의 «애매만». */
const pending: ReadonlySet<string> = new Set([
  "g3-carry", // 받아올림 — 정의 · 계산 절차의 이름 — 방법으로 볼 수도
  "g3-borrow", // 받아내림 — 정의 · 계산 절차의 이름 — 방법으로 볼 수도
  "g3-check-division", // 나눗셈 확인 — 성질 · 이름은 «확인» — 방법으로 볼 수도
  "g3-kilometer", // 킬로미터 — 단위 · 이름은 용어(킬로미터)인데 문장은 단위 관계
  "g3-capacity", // 들이 — 정의 · 정의 + 단위 관계(1L=1000mL)
  "g4-estimate-quotient", // 몫 어림하기 — 방법 · 문장은 «~하는 것»(정의 꼴), 이름은 «어림하기»(방법)
  "g4-number-rule", // 수 배열의 규칙 — 방법 · 문장은 «~예측하는 것»(정의 꼴) — 정의로 볼 수도
  "g5-operation-order", // 혼합 계산의 순서 — 방법 · 계산 순서의 약속 — 법칙으로 볼 수도
  "g5-round", // 반올림 — 정의 · 어림하는 방법의 이름 — 방법으로 볼 수도
  "g5-round-up", // 올림과 버림 — 정의 · 용어 두 개 · 문장이 «~올리고 ~없앤다»(방법 꼴)
  "g5-rule-expression", // 대응을 식으로 나타내기 — 방법 · 문장은 «~나타내는 것»(정의 꼴), 이름은 «나타내기»(방법)
  "g5-perimeter", // 둘레 — 정의 · 정의 + 구하는 법
  "g6-fraction-divide", // 분수의 나눗셈 — 방법 · «~곱하는 것과 같다» — 성질로 볼 수도
  "g6-rate-amount", // 비교하는 양 구하기 — 공식 · 비교하는 양 = 기준량 × 비율 — 방법으로 볼 수도
  "g6-part-of-ratio", // 비와 전체의 관계 — 공식 · 성질로 볼 수도
  "g6-cone-sphere", // 원뿔과 구 — 정의 · 용어 두 개의 특징 — 성질로 볼 수도
  "g7-vertical-angle", // 맞꼭지각 — 정의 · 정의 + 성질(크기가 같다) — 성질로 볼 수도
  "g7-sss", // 삼각형의 SSS 합동 — 성질 · 합동 조건 — 정리로 볼 수도
  "g8-common-solution", // 연립방정식 해 확인 — 방법 · 문장은 «~확인하는 것»(정의 꼴), 이름은 «확인»(방법)
  "g8-similarity-area", // 닮은 도형의 넓이비 — 성질 · 공식으로 볼 수도
  "g8-complement", // 여사건의 확률 — 성질 · 공식으로 볼 수도
  "g9-polynomial-multiply", // 다항식의 곱셈 — 방법 · 문장은 «~정리하는 계산»(정의 꼴)
  "g9-common-factor", // 공통인수 묶기 — 방법 · 문장은 «~묶는 것»(정의 꼴), 이름은 «묶기»(방법)
  "g9-vertex", // 꼭짓점 — 성질 · 이름은 용어(꼭짓점)인데 문장은 좌표 (p, q) — 정의로 볼 수도
  "g9-axis", // 이차함수의 축 — 성질 · 이름은 용어(축)인데 문장은 «대칭축은 직선 x=p» — 정의로 볼 수도
  "g9-inscribed-angle", // 원주각 — 정의 · 정의 + 성질(중심각의 절반)
]);

/**
 * 보충 카드 21장의 갈래(D-147 · 05 §8.22) — 본 카드 표(230장, 시험이 원본과 짝을 잠근다) 밖의 작은 표.
 * 학생 화면 번들이 부르므로 정답이 든 `supplement-content.ts` 를 import 하지 않고 여기 적는다 —
 * 짝은 `supplementCards.test.ts` 가 잠근다. 이름 뒤 «교재» 딱지는 `isSupplementCardId` 로 가른다.
 */
export const supplementKindTable: Readonly<Record<string, ConceptKind>> = {
  "sup-line": "정의", // 직선
  "sup-angle": "정의", // 각
  "sup-side-vertex": "정의", // 변과 꼭짓점(도형)
  "sup-rectangle": "정의", // 직사각형
  "sup-square": "정의", // 정사각형
  "sup-perpendicular-line": "정의", // 수선
  "sup-trapezoid": "정의", // 사다리꼴
  "sup-regular-polygon": "정의", // 정다각형
  "sup-isosceles-angles": "성질", // 이등변삼각형의 성질
  "sup-common-divisor": "정의", // 공약수
  "sup-common-multiple": "정의", // 공배수
  "sup-corresponding-parts": "정의", // 대응점 · 대응변 · 대응각
  "sup-face-edge": "정의", // 면과 모서리(입체도형)
  "sup-base-lateral": "정의", // 밑면과 옆면
  "sup-base-exponent": "정의", // 밑과 지수
  "sup-equation-sides": "정의", // 좌변 · 우변 · 양변
  "sup-y-axis-symmetry": "정의", // y축에 대하여 대칭
  "sup-point-line-distance": "정의", // 점과 직선 사이의 거리
  "sup-corresponding-alternate": "정의", // 동위각과 엇각
  "sup-parallel-lines": "성질", // 평행선의 성질
  "sup-right-triangle-congruence": "성질", // 직각삼각형의 합동 조건
};

/** 보충 카드인가 — id 가 `sup-` 로 시작한다(본 카드 230장에는 없다). */
export function isSupplementCardId(cardId: string): boolean {
  return cardId.startsWith("sup-");
}

/** 카드의 갈래 — 표에 없는 id 면 null(딱지를 그리지 않는다). */
export function conceptKind(cardId: string): ConceptKind | null {
  return Object.hasOwn(conceptKindTable, cardId)
    ? conceptKindTable[cardId]
    : Object.hasOwn(supplementKindTable, cardId)
      ? supplementKindTable[cardId]
      : null;
}

/** 원장님 확정 전 갈래인가 — 화면은 초안값 그대로 보이고, 확정 목록을 만들 때 쓴다. */
export function conceptKindIsPending(cardId: string): boolean {
  return pending.has(cardId);
}
