/**
 * 강의 상태 전이 — «게시 · 게시 내리기 · 다시 게시 · 끝까지 봤다 · 주소 넣기» 의 규칙 한 곳
 * (리드 결정 2026-09-15, 브리프 `todays-concept-admin-ui.md` §5).
 *
 *   초안 ──게시(관문)──▶ 게시 ──게시 내리기──▶ 내림
 *                         ▲                      │
 *                         └───다시 게시(관문)────┘
 *
 * - **게시 → 초안은 없다.** 되돌리려면 내린다. 전이표(`LECTURE_TRANSITIONS`)에 초안으로 가는
 *   길이 아예 없다.
 * - `publishedAt` 은 **마지막으로 게시한 시각**이다 — 다시 게시하면 새로 찍고, 내려도 지우지 않는다.
 * - **영상 주소가 바뀌면 `reviewedAt` 을 비운다.** 원장님의 «끝까지 봄» 이 다른 영상에 대한
 *   표시가 되면 안 된다. 같은 영상의 다른 주소 형태(youtu.be 등)는 바뀐 것이 아니다 —
 *   정규형끼리 견준다(`normalizeYouTubeUrl`).
 * - 게시 중인 강의의 주소는 바꾸지 않는다 — 학생이 보던 영상이 말없이 바뀌고, 이미 쌓인
 *   «끝까지 봤다» 기록이 다른 영상의 것이 된다. 바꾸려면 내린 뒤 바꾸고 다시 게시한다.
 *   (이 한 줄은 리드 결정 밖에서 더했다 — 보고서 «리드가 정할 것».)
 *
 * 게시 판정은 `checkPublish` 를 **부른다**. 라우트(PATCH)가 이 함수를 부르고, 화면은
 * 전이표로 단추를 고른다 — 화면이 규칙을 따로 적지 않게.
 */
import type { ConceptLectureStatus } from "@/contracts/conceptLecture.contract";

import {
  checkPublish,
  type PublishBlockerCode,
  type PublishCandidate,
  type PublishIssue,
} from "./publishGate";
import { normalizeYouTubeUrl } from "./youtube";

/** 상태를 바꾸는 두 동작의 전이표 — 화면 단추와 라우트가 같이 읽는다 */
export const LECTURE_TRANSITIONS = {
  publish: { from: ["draft", "archived"], to: "published" },
  archive: { from: ["published"], to: "archived" },
} as const satisfies Record<
  string,
  { from: readonly ConceptLectureStatus[]; to: ConceptLectureStatus }
>;

/** 주소를 넣거나 바꿀 수 있는 상태 */
export const VIDEO_EDITABLE_STATUSES: readonly ConceptLectureStatus[] = [
  "draft",
  "archived",
];

export type LectureActionInput =
  | { action: "publish" }
  | { action: "archive" }
  | { action: "review" }
  | { action: "video"; videoUrl: string };

/** 판정에 필요한 칸만 — Prisma 행(`Date`)도 계약 행(ISO 문자열)도 받는다 */
export interface TransitionSubject extends PublishCandidate {
  status: ConceptLectureStatus;
}

export interface LecturePatch {
  status?: ConceptLectureStatus;
  publishedAt?: Date;
  reviewedAt?: Date | null;
  videoUrl?: string;
}

export type TransitionRefusalCode =
  "not_allowed" | "gate" | "no_video" | "already_reviewed" | "video_invalid";

export type LectureTransition =
  | { ok: true; patch: LecturePatch }
  | {
      ok: false;
      code: TransitionRefusalCode;
      message: string;
      /** `gate` 일 때 — 관문이 낸 막는 이유 전부(하나 고치고 다시 눌러 다음 이유를 알게 하지 않는다) */
      blockers?: PublishIssue<PublishBlockerCode>[];
    };

const refuse = (
  code: TransitionRefusalCode,
  message: string,
): LectureTransition => ({ ok: false, code, message });

const PUBLISH_REFUSAL: Record<ConceptLectureStatus, string> = {
  draft: "",
  archived: "",
  published: "이미 게시된 강의입니다.",
};
const ARCHIVE_REFUSAL: Record<ConceptLectureStatus, string> = {
  draft: "게시하지 않은 강의는 내릴 수 없습니다.",
  archived: "이미 내린 강의입니다.",
  published: "",
};

export function planLectureChange(
  subject: TransitionSubject,
  input: LectureActionInput,
  now: Date,
): LectureTransition {
  switch (input.action) {
    case "publish": {
      const from: readonly ConceptLectureStatus[] =
        LECTURE_TRANSITIONS.publish.from;
      if (!from.includes(subject.status))
        return refuse("not_allowed", PUBLISH_REFUSAL[subject.status]);
      const verdict = checkPublish(subject);
      if (!verdict.canPublish) {
        return {
          ok: false,
          code: "gate",
          message: verdict.blockers.map((b) => b.message).join(" "),
          blockers: verdict.blockers,
        };
      }
      return {
        ok: true,
        patch: { status: LECTURE_TRANSITIONS.publish.to, publishedAt: now },
      };
    }
    case "archive": {
      const from: readonly ConceptLectureStatus[] =
        LECTURE_TRANSITIONS.archive.from;
      if (!from.includes(subject.status))
        return refuse("not_allowed", ARCHIVE_REFUSAL[subject.status]);
      // 게시 시각은 지우지 않는다 — «마지막으로 게시한 시각»이다.
      return { ok: true, patch: { status: LECTURE_TRANSITIONS.archive.to } };
    }
    case "review": {
      if (subject.videoUrl === null || subject.videoUrl.trim() === "")
        return refuse(
          "no_video",
          "영상 주소가 없어 끝까지 볼 영상이 없습니다. 주소를 먼저 넣으세요.",
        );
      if (subject.reviewedAt != null)
        return refuse("already_reviewed", "이미 끝까지 봤다고 표시했습니다.");
      return { ok: true, patch: { reviewedAt: now } };
    }
    case "video": {
      if (!VIDEO_EDITABLE_STATUSES.includes(subject.status))
        return refuse(
          "not_allowed",
          "게시 중인 강의는 주소를 바꿀 수 없습니다. 게시를 내린 뒤 바꾸세요.",
        );
      const next = normalizeYouTubeUrl(input.videoUrl);
      if (next === null)
        return refuse(
          "video_invalid",
          "유튜브 주소가 아닙니다. 올린 영상의 주소를 넣으세요.",
        );
      const current =
        subject.videoUrl === null
          ? null
          : normalizeYouTubeUrl(subject.videoUrl);
      // 같은 영상이면 아무것도 안 바꾼다 — 시청 확인도 그대로다.
      if (current === next) return { ok: true, patch: {} };
      // 🔴 다른 영상이면 시청 확인을 비운다(리드 결정) — 확인은 **그 영상**에 대한 것이다.
      return { ok: true, patch: { videoUrl: next, reviewedAt: null } };
    }
  }
}
