/**
 * 작업실 AI 요청 본문의 문턱 — 브라우저(보내는 쪽)와 `/api/studio/ai`(받는 쪽)가 같이 본다.
 *
 * 운영은 Vercel 서버리스 함수라 요청 본문이 4.5MB 를 넘으면 **우리 코드에 닿기 전에** 플랫폼이
 * 평문 `Request Entity Too Large`(413)를 낸다. 2026-09-21 원장님 기출 PDF 의 쪽 그림(긴 변 2200px PNG)이
 * 크롬에서 data URL 4,767,858~5,094,934자로 다섯 쪽 전부 여기에 걸렸다(트랙 39 실측).
 * 로컬은 16MB(`MAX_AI_BODY_BYTES`)까지 받아 그 결함이 안 보였다 — 받는 쪽도 이 문턱에서 같은 413 을 낸다.
 */
export const STUDIO_AI_PLATFORM_BODY_LIMIT = 4_500_000;

/**
 * 그림 한 장의 data URL 예산(글자 수 = 바이트). 상한보다 1.5MB 낮춰 둔다 — JSON 의 나머지 필드와
 * 상한 셈법(MB·MiB)의 차이를 덮는다. 실측에서 빽빽한 스캔 쪽의 WebP q0.92 는 0.62~1.28MB 라 넉넉하다.
 */
export const STUDIO_AI_IMAGE_BUDGET = 3_000_000;

export const STUDIO_AI_TOO_LARGE =
  "그림이 너무 커서 보내지 못했습니다. 원본을 더 작은 해상도로 다시 가져와 주세요.";
