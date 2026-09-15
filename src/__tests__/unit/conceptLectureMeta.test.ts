/**
 * 제작 도구 `meta.json` 해석 — 수맥 `packages/core/test/media/lecture-meta.test.ts` 를
 * 옮겨 온 것 (D-123 ⑥′).
 *
 * 실제 산출물로 검증한다 — 수맥이 `pipeline/work/20260722-0953-d093ce3f/out/meta.json` 을
 * 그대로 옮긴 것을 우리도 그대로 쓴다. 도구가 스키마를 바꾸면 이 검사가 먼저 걸려야 한다.
 *
 * ## 수맥 사례에서 **바꾼 것 둘** (보고서 §1)
 *
 * 수맥은 강의를 **개념**(`conceptSlug`)에 붙였다. 우리는 **차시**(`Unit`)에 붙인다
 * (브리프 §2.1). 그래서 「conceptSlug 를 읽는다」·「conceptSlug 가 없거나 비면 null」
 * 두 사례를 `unitCode` 의 같은 사례로 **바꿔 달았다**. 규칙(«지어내지 않는다»)은 그대로다.
 * `conceptSlug`·`pageId` 는 제작 도구가 아직 쓰므로 **받아들이되 무시**한다 — 아래에 그 사례가 있다.
 */
import { describe, expect, it } from "vitest";

import { parseLectureMeta } from "@/lib/concept/lectureMeta";

const REAL_META = JSON.stringify({
  jobId: "20260722-0953-d093ce3f",
  pageId: "fixture-quadratic-formula",
  lessonTitle: "이차방정식의 근의 공식과 판별식",
  disclosure: "선생님이 검수한 AI 보충 강의입니다.",
  fps: 30,
  totalFrames: 3877,
  segments: [
    { id: "S01", startFrame: 0, durationFrames: 541, action: "underline" },
  ],
  pausePromptsAtFrames: [2810],
});

/** 길이 계산에 필요한 최소 모양 — 사례마다 한 칸씩만 바꿔 끼운다. */
const base = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ lessonTitle: "제목", fps: 30, totalFrames: 900, ...extra });

describe("강의 meta.json 해석", () => {
  it("실제 산출물에서 제목과 길이를 뽑는다", () => {
    const r = parseLectureMeta(REAL_META);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.meta.title).toBe("이차방정식의 근의 공식과 판별식");
    // meta.json에 초 단위 필드가 없다 — 3877/30 = 129.2 → 129
    expect(r.meta.seconds).toBe(129);
    expect(r.meta.jobId).toBe("20260722-0953-d093ce3f");
  });

  it("AI 고지를 뽑는다 — 학생에게 보여 줄 문구가 여기서만 온다", () => {
    const r = parseLectureMeta(REAL_META);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.meta.disclosure).toBe("선생님이 검수한 AI 보충 강의입니다.");
  });

  it("고지가 없거나 비어 있으면 지어내지 않는다", () => {
    for (const raw of [base(), base({ disclosure: "   " })]) {
      const r = parseLectureMeta(raw);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.meta.disclosure).toBeNull();
    }
  });

  it("앞뒤 공백이 있어도 읽는다 (붙여넣기 현실)", () => {
    expect(parseLectureMeta(`\n  ${REAL_META}  \n`).ok).toBe(true);
  });

  /* ── 실패는 이유를 말해야 한다 ── */

  it("빈 입력을 조용히 넘기지 않는다", () => {
    const r = parseLectureMeta("   ");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("내용이 없습니다");
  });

  it("JSON이 아니면 무엇을 붙여야 하는지 알려 준다", () => {
    const r = parseLectureMeta("이차방정식의 근의 공식과 판별식");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("meta.json");
  });

  it("배열·원시값은 meta.json이 아니다", () => {
    for (const bad of ["[]", '"문자열"', "42", "null"]) {
      expect(parseLectureMeta(bad).ok, bad).toBe(false);
    }
  });

  it("lessonTitle이 없으면 채우지 않는다", () => {
    const r = parseLectureMeta(JSON.stringify({ fps: 30, totalFrames: 900 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("lessonTitle");
  });

  it("fps·totalFrames가 없으면 길이를 지어내지 않는다", () => {
    const r = parseLectureMeta(JSON.stringify({ lessonTitle: "제목만 있음" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain("길이를 계산할 수 없습니다");
  });

  it("fps가 0이면 나누지 않는다 (0으로 나눈 Infinity를 길이로 쓰지 않는다)", () => {
    const r = parseLectureMeta(base({ fps: 0 }));
    expect(r.ok).toBe(false);
  });

  /* ── video_url — 업로드 스크립트(upload-youtube.mjs)가 기록하는 필드 ──
   *
   * 실제 기록 모양으로 검증한다: 스크립트는 정규형 watch 주소를 쓰지만,
   * 사람이 공유 주소(youtu.be)를 손으로 적어 둔 meta.json도 세상에 있다 —
   * 어느 쪽이든 정규형으로 되돌려야 등록 경로의 저장 형태와 일치한다. */

  it("video_url이 있으면 정규형 주소로 채운다", () => {
    const r = parseLectureMeta(
      JSON.stringify({
        lessonTitle: "소수와 합성수",
        fps: 30,
        totalFrames: 4166,
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.meta.videoUrl).toBe(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      );
  });

  it("공유 주소(youtu.be)도 정규형으로 되돌린다", () => {
    const r = parseLectureMeta(
      base({ video_url: "https://youtu.be/dQw4w9WgXcQ" }),
    );
    expect(r.ok).toBe(true);
    if (r.ok)
      expect(r.meta.videoUrl).toBe(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      );
  });

  it("video_url이 없거나 비어 있으면 null — 사람이 직접 넣는 예전 흐름", () => {
    for (const extra of [{}, { video_url: "" }, { video_url: "   " }]) {
      const r = parseLectureMeta(base(extra));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.meta.videoUrl).toBeNull();
    }
  });

  it("🔴 유튜브가 아닌 video_url은 조용히 버리지 않고 실패로 말한다", () => {
    // 변이 ⑥ 이 겨누는 사례. 조용히 비우면 사람은 주소가 채워진 줄 알고 넘어가고,
    // 우리 쪽에서는 **주소 없는 초안이 허용되므로**(브리프 §2.1) 등록까지 통과해 버린다 —
    // 수맥보다 이 가드가 더 중요해진 자리다.
    for (const bad of [
      "https://vimeo.com/12345",
      "https://example.com/watch?v=dQw4w9WgXcQ",
      "final.mp4",
    ]) {
      const r = parseLectureMeta(base({ video_url: bad }));
      expect(r.ok, bad).toBe(false);
      if (!r.ok) expect(r.message).toContain("video_url");
    }
  });

  /* ── unitCode — 등록 CLI 가 무인으로 붙이기 위해 읽는 값 (수맥 conceptSlug 자리) ──
   *
   * 없을 때 **지어내지 않는 것**이 요점이다 — 차시를 잘못 붙인 강의는
   * 엉뚱한 날 엉뚱한 학생에게 나간다. */

  it("unitCode를 읽는다 — 값은 `Unit.problemCodePrefix` 와 같은 차시 코드", () => {
    for (const code of ["J30501", "HC10201", "E30101"]) {
      const r = parseLectureMeta(base({ unitCode: code }));
      expect(r.ok, code).toBe(true);
      if (r.ok) expect(r.meta.unitCode).toBe(code);
    }
  });

  it("unitCode가 없거나 비면 null — 차시를 지어내지 않는다", () => {
    for (const extra of [
      {},
      { unitCode: "" },
      { unitCode: "  " },
      { unitCode: null },
    ]) {
      const r = parseLectureMeta(base(extra));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.meta.unitCode).toBeNull();
    }
  });

  it("차시 코드 형식이 아닌 unitCode는 조용히 비우지 않고 실패로 말한다", () => {
    // video_url 과 같은 원칙 — 비우면 CLI 가 `--unit` 을 달라고 하고, 사람은 meta.json 의
    // 오타를 모른 채 손으로 다른 차시를 넣는다. 형식은 `UNIT_CODE_PATTERN` 한 곳에서 온다.
    for (const bad of [
      "m1-prime-composite",
      "J3050",
      "j30501",
      "X30501",
      30501,
    ]) {
      const r = parseLectureMeta(base({ unitCode: bad }));
      expect(r.ok, String(bad)).toBe(false);
      if (!r.ok) expect(r.message).toContain("unitCode");
    }
  });

  it("수맥 규약 필드(conceptSlug·pageId)는 받아들이되 쓰지 않는다", () => {
    // 제작 도구가 아직 그 필드를 쓴다 — 거절하면 도구 산출물이 통째로 막힌다.
    // 그렇다고 conceptSlug 로 차시를 짐작하면 «지어내기»다.
    const r = parseLectureMeta(
      JSON.stringify({
        ...JSON.parse(REAL_META),
        conceptSlug: "m1-prime-composite",
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.meta.unitCode).toBeNull();
    expect(Object.keys(r.meta).sort()).toEqual(
      [
        "disclosure",
        "jobId",
        "seconds",
        "sortOrder",
        "title",
        "unitCode",
        "videoUrl",
      ].sort(),
    );
  });

  it("jobId가 공백이면 null — 공백 잡 ID 로 «도구가 만든 강의»가 되지 않게", () => {
    // 수맥은 `typeof jobId === "string"` 이면 그대로 담았다. 우리 쪽에서는 잡 ID 가
    // 멱등 열쇠(같은 잡은 두 번 안 만든다)이자 게시 관문의 «고지가 필요한 강의» 판정이라,
    // 공백이 그대로 들어오면 공백끼리 중복으로 잡히거나 고지를 요구받는다.
    for (const extra of [{ jobId: "" }, { jobId: "   " }, { jobId: 42 }]) {
      const r = parseLectureMeta(base(extra));
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.meta.jobId).toBeNull();
    }
    const trimmed = parseLectureMeta(
      base({ jobId: "  20260722-0953-d093ce3f " }),
    );
    if (trimmed.ok) expect(trimmed.meta.jobId).toBe("20260722-0953-d093ce3f");
  });

  /* ── sortOrder ── */

  it("sortOrder를 읽고, 없으면 null (등록 경로가 기본값을 정한다)", () => {
    const withOrder = parseLectureMeta(base({ sortOrder: 3 }));
    expect(withOrder.ok).toBe(true);
    if (withOrder.ok) expect(withOrder.meta.sortOrder).toBe(3);

    const without = parseLectureMeta(base());
    expect(without.ok).toBe(true);
    if (without.ok) expect(without.meta.sortOrder).toBeNull();
  });

  it("범위를 벗어난 sortOrder는 0으로 접지 않고 거절한다", () => {
    for (const bad of [-1, 1000, 1.5, "3"]) {
      const r = parseLectureMeta(base({ sortOrder: bad }));
      expect(r.ok, String(bad)).toBe(false);
      if (!r.ok) expect(r.message).toContain("sortOrder");
    }
  });
});
