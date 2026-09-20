/**
 * 모델이 낸 `spec:null` 거절 사유를 **엔진 탓 vs 진짜 사유**로 가르는 한 자리
 * (원장님 2026-09-20 — 사각형 관계도가 422 로 막혔다).
 *
 * 그때 온 사유는 «graph-1 엔진에서 한글 텍스트 및 특수문자 라벨 렌더링을 지원하지 않아
 * 원본 다이어그램을 온전히 표현할 수 없습니다» 였는데, 이는 **거짓이다**:
 * 지시문이 그 그림을 예시로 적어 두었고(figure-prompt.ts), graph-1 계약도 한글을 허용하며
 * (`scripts/figure/graph_scene.py` labels), 손으로 짠 사양은 엔진이 그대로 그렸다
 * (`src/__tests__/fixtures/quadrilateral-concept-map.spec.json`). 막은 것은 엔진이 아니라 모델이다.
 *
 * 그래서 이런 거절에만 **딱 한 번** 반박해 다시 묻는다(figure-engine.ts). 사람이 읽는 진짜 사유
 * (사진·삽화·손그림·판독 불가)는 되물어야 결과가 같으니 그대로 422 로 보낸다 — 토큰·시간을 아낀다.
 *
 * ⚠️ 이 함수는 **이미 거절한 사유**만 받는다. 그래서 「못 한다」는 표현을 따로 찾지 않고,
 *    «무엇을 탓하는가»(엔진·계약·지원·렌더링)와 «무엇을 못 한다는가»(엔진이 실제로 그리는 것)로 가른다.
 */

/** 도구를 탓하는 낱말 — 「엔진이/계약이 …」. 소문자로 견준다. */
const BLAMES_ENGINE = [
  "엔진",
  "graph-1",
  "elem-1",
  "figurespec",
  "계약",
  "스펙",
  "사양",
  "스키마",
  "렌더링",
  "렌더러",
  "지원",
  "미지원",
  "기능",
];

/** 엔진이 **실제로 그리는** 것들 — 이것을 못 한다고 하면 지어낸 것이다. */
const ENGINE_DRAWS_THESE = [
  "한글",
  "한국어",
  "특수문자",
  "특수 문자",
  "원문자",
  "기호",
  "텍스트",
  "글자",
  "문자",
  "라벨",
  "레이블",
  "화살표",
  "다각형",
  "상자",
  "박스",
  "개념도",
  "관계도",
  "흐름도",
  "순서도",
  "다이어그램",
  "도표",
  "㉠",
  "①",
];

/**
 * 사람이 읽는 **진짜 사유** — 하나라도 있으면 되묻지 않는다.
 * 엔진 탓 낱말이 섞여 있어도 이쪽이 이긴다(되물어야 답이 같다).
 */
const REAL_REASONS = [
  "사진",
  "삽화",
  "일러스트",
  "손글씨",
  "손그림",
  "손으로 그린",
  "스케치",
  "만화",
  "캐릭터",
  "흐릿",
  "판독",
  "알아볼 수 없",
  "잘려",
  "잘림",
  "가려져",
  "보이지 않",
];

/** 모델이 «엔진이 못 한다»고 지어낸 거절인가 — 참이면 반박을 붙여 한 번만 다시 묻는다. */
export function isEngineCapabilityRefusal(note: string | null | undefined) {
  const text = (note ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  if (!text) return false;
  if (REAL_REASONS.some((word) => text.includes(word))) return false;
  return (
    BLAMES_ENGINE.some((word) => text.includes(word)) &&
    ENGINE_DRAWS_THESE.some((word) => text.includes(word))
  );
}

/** 되묻기에 붙이는 반박 한 줄 — 지시문 끝에 한 벌만 실린다(figure-prompt.ts). */
export const FIGURE_CAPABILITY_REBUTTAL =
  "엔진이 무엇을 못 하는지는 네가 판단하지 않는다 — 판정은 엔진 검증이 한다. 한글 낱말과 ㉠·① 같은 글자는 $ 없이 보통 글자로 쓰면 graph-1 이 그대로 그린다(사다리꼴 → 평행사변형 → 직사각형 관계도가 실제로 그려졌다). 방금 든 사유는 사실이 아니니 거절을 거두고 사양을 내라.";
