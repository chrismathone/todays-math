/**
 * 게시 관문 — 「이 강의를 게시할 수 있나 · 안 되면 왜 · 알릴 것은」(D-123 ⑥′ · D-124 ⑻).
 *
 * 수맥은 이 규칙이 SQL(0009a `kind_payload_ck` — 영상이면 주소 · 0012a
 * `disclosure_not_blank_ck`)과 화면 버튼에 흩어져 있었다. 우리는 순수 함수 하나로 모으고
 * **조건마다 이유 문구**를 낸다 — 버튼만 잠그면 고장으로 보인다(수맥 `LectureGate` 의 원칙).
 * 여럿이 빠지면 **전부** 말한다: 하나 고치고 다시 눌러 다음 이유를 알게 하지 않는다.
 *
 * 결과는 둘로 나뉜다:
 *
 *   **막는 것** (`blockers` — 하나라도 있으면 `canPublish` 는 거짓)
 *     ① 제목  ② 길이 > 0  ③ 유효한 유튜브 주소(초안은 주소가 비어도 되지만 게시는 안 된다)
 *     ④ 도구가 만든 강의(잡 ID 있음)면 AI 고지가 비어 있지 않음 — 고지는 원장님 화면에만
 *        보이지만(D-124 ⑹) **기록으로는 반드시 남긴다**
 *
 *   **알리는 것** (`warnings` — 게시를 막지 않는다)
 *     ⑤ 원장님 끝까지 시청(`reviewedAt`) — **권장**이다(D-124 ⑻, 원장님 확정 2026-09-15).
 *        21번 §4 의 제안은 «반드시»였고 브리프 §2.1 은 «엄한 쪽»으로 두라 했는데, 원장님이
 *        권장으로 정하셨다. ⚠️ 이것을 «안전하게» 막는 쪽으로 옮기지 마라 — 원장님 결정이
 *        조용히 뒤집힌다. `conceptPublishGate.test.ts` 와 변이 ⑤-권장이 막는다.
 *
 * ⚠️ 이 함수는 **내용**만 본다. 상태 전이(초안→게시→보관, 보관본 재게시 여부)는 아직 정하지
 *    않았다 — 보고서 «리드가 정할 것». 화면이 생기면 게시 버튼·게시 라우트가 **둘 다** 이
 *    함수를 불러야 한다(버튼만 부르면 라우트로 우회된다).
 */
import { parseYouTubeId } from "./youtube";

export type PublishBlockerCode =
  "title" | "seconds" | "video_missing" | "video_invalid" | "disclosure";

export type PublishWarningCode = "review";

export interface PublishIssue<Code extends string> {
  code: Code;
  /** 화면에 그대로 싣는 문구 — D-08(간결·사무적, 느낌표 없음) */
  message: string;
}

export interface PublishVerdict {
  canPublish: boolean;
  blockers: PublishIssue<PublishBlockerCode>[];
  warnings: PublishIssue<PublishWarningCode>[];
}

/** 게시 판정에 필요한 칸만. Prisma 행(`Date`)도 계약 행(ISO 문자열)도 받는다. */
export interface PublishCandidate {
  title: string;
  seconds: number;
  videoUrl: string | null;
  disclosure: string | null;
  sourceJobId: string | null;
  reviewedAt: Date | string | null;
}

const BLOCKER_MESSAGES: Record<PublishBlockerCode, string> = {
  title: "제목이 비어 있습니다.",
  seconds: "영상 길이가 없습니다. 길이가 0초보다 커야 합니다.",
  video_missing: "영상 주소가 없습니다. 업로드한 뒤 주소를 넣으세요.",
  video_invalid: "영상 주소가 유튜브 주소가 아닙니다.",
  disclosure: "제작 도구로 만든 강의라 AI 고지가 필요합니다.",
};

const WARNING_MESSAGES: Record<PublishWarningCode, string> = {
  review: "아직 끝까지 시청하지 않았습니다. 게시 전 시청을 권장합니다.",
};

const isBlank = (s: string | null | undefined): boolean =>
  !s || s.trim() === "";

export function checkPublish(c: PublishCandidate): PublishVerdict {
  const blockers: PublishBlockerCode[] = [];
  if (isBlank(c.title)) blockers.push("title");
  if (!(Number.isFinite(c.seconds) && c.seconds > 0)) blockers.push("seconds");
  const url = c.videoUrl?.trim() ?? "";
  if (!url) blockers.push("video_missing");
  else if (parseYouTubeId(url) === null) blockers.push("video_invalid");
  if (!isBlank(c.sourceJobId) && isBlank(c.disclosure))
    blockers.push("disclosure");

  const warnings: PublishWarningCode[] = [];
  if (c.reviewedAt == null) warnings.push("review");

  return {
    canPublish: blockers.length === 0,
    blockers: blockers.map((code) => ({
      code,
      message: BLOCKER_MESSAGES[code],
    })),
    warnings: warnings.map((code) => ({
      code,
      message: WARNING_MESSAGES[code],
    })),
  };
}
