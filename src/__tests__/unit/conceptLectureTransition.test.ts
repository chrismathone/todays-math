/**
 * 강의 상태 전이 — 리드 결정(브리프 §5, 2026-09-15)을 한 곳에서 잠근다.
 *
 *   초안 → 게시(관문 통과) · 게시 → 내림(«게시 내리기») · 내림 → 게시(«다시 게시», 관문 다시)
 *   게시 → 초안은 **없다** · `publishedAt` = 마지막으로 게시한 시각
 *   영상 주소가 바뀌면 `reviewedAt` 을 비운다 — «끝까지 봄» 이 다른 영상에 대한 것이 되지 않게
 *
 * 구현: `src/lib/concept/lectureTransition.ts`. 게시 판정은 `checkPublish` 를 **부른다**
 * (다시 적지 않는다) — 관문 자체의 시험은 `conceptPublishGate.test.ts`.
 */
import { describe, expect, it } from "vitest";

import {
  LECTURE_TRANSITIONS,
  planLectureChange,
  VIDEO_EDITABLE_STATUSES,
  type TransitionSubject,
} from "@/lib/concept/lectureTransition";

const NOW = new Date("2026-09-15T06:00:00.000Z");
const URL_A = "https://www.youtube.com/watch?v=aQkPcPqTq4M";
const URL_B = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

/** 게시할 수 있는 초안 — 관문의 막는 조건이 하나도 없다 */
function subject(patch: Partial<TransitionSubject> = {}): TransitionSubject {
  return {
    status: "draft",
    title: "소수와 합성수",
    seconds: 139,
    videoUrl: URL_A,
    disclosure: "선생님이 검수한 AI 보충 강의입니다.",
    sourceJobId: "job-1",
    reviewedAt: null,
    ...patch,
  };
}

describe("게시 — 초안·내림에서만, 관문을 지나야", () => {
  it("초안 → 게시: 상태와 게시 시각을 찍는다", () => {
    const r = planLectureChange(subject(), { action: "publish" }, NOW);
    expect(r).toEqual({
      ok: true,
      patch: { status: "published", publishedAt: NOW },
    });
  });

  it("🔴 끝까지 보지 않아도 게시한다(D-124 ⑻ — 권장은 막지 않는다)", () => {
    const r = planLectureChange(
      subject({ reviewedAt: null }),
      { action: "publish" },
      NOW,
    );
    expect(r.ok).toBe(true);
  });

  it("🔴 관문이 막으면 게시하지 않고 관문의 이유를 전부 그대로 돌려준다", () => {
    const r = planLectureChange(
      subject({ videoUrl: null, seconds: 0 }),
      { action: "publish" },
      NOW,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("gate");
    expect(r.blockers?.map((b) => b.code)).toEqual([
      "seconds",
      "video_missing",
    ]);
    expect(r.message).toContain("영상 주소가 없습니다");
  });

  it("내림 → 다시 게시: 관문을 다시 보고, 게시 시각은 **이번** 시각이다", () => {
    const ok = planLectureChange(
      subject({ status: "archived" }),
      { action: "publish" },
      NOW,
    );
    expect(ok).toEqual({
      ok: true,
      patch: { status: "published", publishedAt: NOW },
    });
    const blocked = planLectureChange(
      subject({ status: "archived", disclosure: null }),
      { action: "publish" },
      NOW,
    );
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("gate");
  });

  it("이미 게시된 강의는 다시 게시하지 않는다", () => {
    const r = planLectureChange(
      subject({ status: "published" }),
      { action: "publish" },
      NOW,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("not_allowed");
  });
});

describe("게시 내리기 — 게시에서만", () => {
  it("게시 → 내림: 게시 시각은 그대로 둔다(마지막으로 게시한 시각)", () => {
    const r = planLectureChange(
      subject({ status: "published" }),
      { action: "archive" },
      NOW,
    );
    expect(r).toEqual({ ok: true, patch: { status: "archived" } });
  });

  it.each(["draft", "archived"] as const)("%s 는 내릴 수 없다", (status) => {
    const r = planLectureChange(
      subject({ status }),
      { action: "archive" },
      NOW,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("not_allowed");
  });
});

describe("🔴 게시 → 초안은 없다", () => {
  it("게시된 강의에서 어떤 동작을 해도 초안이 되지 않는다", () => {
    const actions = [
      { action: "publish" },
      { action: "archive" },
      { action: "review" },
      { action: "video", videoUrl: URL_B },
    ] as const;
    for (const input of actions) {
      const r = planLectureChange(subject({ status: "published" }), input, NOW);
      if (r.ok) expect(r.patch.status, input.action).not.toBe("draft");
    }
  });

  it("전이표에도 초안으로 가는 길이 없다", () => {
    const targets = Object.values(LECTURE_TRANSITIONS).map((t) => t.to);
    expect(targets).not.toContain("draft");
    expect(LECTURE_TRANSITIONS.publish.from).toEqual(["draft", "archived"]);
    expect(LECTURE_TRANSITIONS.archive.from).toEqual(["published"]);
  });
});

describe("끝까지 봤다 — 원장님 시청 확인", () => {
  it("시청 시각을 찍는다(상태와 무관)", () => {
    for (const status of ["draft", "published", "archived"] as const) {
      const r = planLectureChange(
        subject({ status }),
        { action: "review" },
        NOW,
      );
      expect(r, status).toEqual({ ok: true, patch: { reviewedAt: NOW } });
    }
  });

  it("영상 주소가 없으면 볼 영상이 없다", () => {
    const r = planLectureChange(
      subject({ videoUrl: null }),
      { action: "review" },
      NOW,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("no_video");
  });

  it("이미 확인한 강의는 시각을 덮지 않는다", () => {
    const r = planLectureChange(
      subject({ reviewedAt: "2026-09-12T01:00:00.000Z" }),
      { action: "review" },
      NOW,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("already_reviewed");
  });
});

describe("주소 넣기 — 🔴 주소가 바뀌면 시청 확인을 비운다", () => {
  it("다른 영상 주소로 바꾸면 reviewedAt 을 비운다", () => {
    const r = planLectureChange(
      subject({ reviewedAt: "2026-09-12T01:00:00.000Z" }),
      { action: "video", videoUrl: URL_B },
      NOW,
    );
    expect(r).toEqual({
      ok: true,
      patch: { videoUrl: URL_B, reviewedAt: null },
    });
  });

  it("주소 없는 초안에 처음 넣을 때도 비운다(비어 있던 확인이 그대로 비어 있다)", () => {
    const r = planLectureChange(
      subject({ videoUrl: null }),
      { action: "video", videoUrl: URL_A },
      NOW,
    );
    expect(r).toEqual({
      ok: true,
      patch: { videoUrl: URL_A, reviewedAt: null },
    });
  });

  it("같은 영상의 다른 주소 형태(youtu.be)는 바뀐 것이 아니다 — 확인을 지키고 아무것도 안 바꾼다", () => {
    const r = planLectureChange(
      subject({ reviewedAt: "2026-09-12T01:00:00.000Z" }),
      { action: "video", videoUrl: "https://youtu.be/aQkPcPqTq4M" },
      NOW,
    );
    expect(r).toEqual({ ok: true, patch: {} });
  });

  it("저장은 정규 watch 주소로 한다(youtube.ts 의 정규화를 부른다)", () => {
    const r = planLectureChange(
      subject({ videoUrl: null }),
      { action: "video", videoUrl: "https://youtu.be/dQw4w9WgXcQ" },
      NOW,
    );
    expect(r.ok && r.patch.videoUrl).toBe(URL_B);
  });

  it("유튜브가 아닌 주소는 거절한다", () => {
    const r = planLectureChange(
      subject({ videoUrl: null }),
      { action: "video", videoUrl: "https://vimeo.com/123456" },
      NOW,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("video_invalid");
  });

  it("게시 중인 강의의 주소는 바꾸지 않는다 — 학생이 보는 영상이 말없이 바뀐다", () => {
    expect(VIDEO_EDITABLE_STATUSES).toEqual(["draft", "archived"]);
    const r = planLectureChange(
      subject({ status: "published" }),
      { action: "video", videoUrl: URL_B },
      NOW,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("not_allowed");
  });
});
