/**
 * 게시 관문 (D-123 ⑥′ · D-124 ⑻) — 「게시할 수 있나 · 안 되면 왜 · 알릴 것은」.
 *
 * 수맥은 이 규칙이 SQL(`kind_payload_ck` — 영상이면 주소 · `disclosure_not_blank_ck`)과
 * 화면 버튼에 흩어져 있었다. 우리는 순수 함수 하나로 모으고 **조건마다 이유 문구**를 낸다 —
 * 버튼만 잠그면 고장으로 보인다(수맥 `LectureGate` 의 원칙).
 *
 * 결과는 둘로 나뉜다 (D-124 ⑻, 원장님 확정 2026-09-15):
 *  - **막는 것**(`blockers`) — 제목 · 길이 > 0 · 유효한 유튜브 주소 · 도구가 만든 강의면 고지.
 *  - **알리는 것**(`warnings`) — 원장님 끝까지 시청(`reviewedAt`). **«권장»이라 막지 않는다.**
 *    브리프 §2.1 은 «엄한 쪽»으로 두라고 했는데 원장님이 권장으로 정하셨다.
 *
 * 변이 ⑤ 가 막는 조건 하나씩을 끈다 — 그때 빨개지는 것이 「그 이유 하나로만 막힌다」다.
 * 그리고 **권장을 막는 쪽으로 옮기는 변이**가 「권장 조건은 게시를 막지 않는다」를 빨갛게 한다
 * (누가 나중에 «안전하게» 옮겨 두면 원장님 결정이 조용히 뒤집힌다).
 */
import { describe, expect, it } from "vitest";

import {
  checkPublish,
  type PublishBlockerCode,
  type PublishCandidate,
} from "@/lib/concept/publishGate";

const READY: PublishCandidate = {
  title: "소수와 합성수",
  seconds: 139,
  videoUrl: "https://www.youtube.com/watch?v=aQkPcPqTq4M",
  disclosure: "선생님이 검수한 AI 보충 강의입니다.",
  sourceJobId: "20260722-0953-d093ce3f",
  reviewedAt: new Date("2026-09-15T01:00:00Z"),
};

const blockerCodes = (c: PublishCandidate) =>
  checkPublish(c).blockers.map((b) => b.code);
const warningCodes = (c: PublishCandidate) =>
  checkPublish(c).warnings.map((w) => w.code);

const NOTHING: PublishCandidate = {
  title: "",
  seconds: 0,
  videoUrl: null,
  disclosure: null,
  sourceJobId: "job",
  reviewedAt: null,
};

describe("게시 관문 — 막는 것", () => {
  it("조건을 다 채우면 막는 것도 알릴 것도 없다", () => {
    expect(checkPublish(READY)).toEqual({
      canPublish: true,
      blockers: [],
      warnings: [],
    });
  });

  const ONE_MISSING: Array<
    [string, Partial<PublishCandidate>, PublishBlockerCode]
  > = [
    ["제목이 공백", { title: "   " }, "title"],
    ["길이 0초", { seconds: 0 }, "seconds"],
    ["길이를 못 셈(NaN)", { seconds: Number.NaN }, "seconds"],
    ["주소 없음 (주소 없는 초안)", { videoUrl: null }, "video_missing"],
    ["주소가 빈 글자", { videoUrl: "  " }, "video_missing"],
    [
      "유튜브가 아닌 주소",
      { videoUrl: "https://vimeo.com/12345" },
      "video_invalid",
    ],
    [
      "채널 주소에 붙은 v (수맥 실측 결함)",
      { videoUrl: "https://www.youtube.com/@someone?v=aQkPcPqTq4M" },
      "video_invalid",
    ],
    ["도구가 만든 강의인데 고지 없음", { disclosure: null }, "disclosure"],
    ["도구가 만든 강의인데 고지가 공백", { disclosure: "   " }, "disclosure"],
  ];

  it.each(ONE_MISSING)(
    "🔴 조건 하나만 빠지면 그 이유 하나로만 막힌다 — %s",
    (_n, patch, code) => {
      const verdict = checkPublish({ ...READY, ...patch });
      expect(verdict.blockers.map((b) => b.code)).toEqual([code]);
      expect(verdict.canPublish).toBe(false);
    },
  );

  it("사람이 만든 강의(잡 ID 없음)는 고지 없이도 게시할 수 있다", () => {
    // 수맥 0012a 가 고지를 nullable 로 둔 이유 — 자료 대부분은 사람이 만든다.
    const verdict = checkPublish({
      ...READY,
      sourceJobId: null,
      disclosure: null,
    });
    expect(verdict.canPublish).toBe(true);
    expect(verdict.blockers).toEqual([]);
  });

  it("여럿이 빠지면 전부 말한다 — 하나 고치고 다시 눌러 다음 이유를 알게 하지 않는다", () => {
    expect(blockerCodes(NOTHING)).toEqual([
      "title",
      "seconds",
      "video_missing",
      "disclosure",
    ]);
    expect(warningCodes(NOTHING)).toEqual(["review"]);
  });
});

describe("게시 관문 — 알리는 것 (D-124 ⑻ 게시 전 시청은 권장)", () => {
  it("🔴 권장 조건은 게시를 막지 않는다 — 끝까지 시청 확인이 없어도 게시할 수 있다", () => {
    const verdict = checkPublish({ ...READY, reviewedAt: null });
    expect(verdict.canPublish).toBe(true);
    expect(verdict.blockers).toEqual([]);
  });

  it("🔴 막지는 않지만 알린다 — 시청 확인이 없으면 warnings 에 싣는다", () => {
    expect(warningCodes({ ...READY, reviewedAt: null })).toEqual(["review"]);
    expect(warningCodes(READY)).toEqual([]);
  });
});

describe("게시 관문 — 문구", () => {
  it("문구는 조건마다 다르고 비어 있지 않으며, 느낌표가 없다 (D-08)", () => {
    const all = [
      NOTHING,
      { ...READY, videoUrl: "https://vimeo.com/1" },
    ].flatMap((c) => {
      const v = checkPublish(c);
      return [...v.blockers, ...v.warnings];
    });
    const messages = all.map((b) => b.message);
    expect(messages.length).toBe(6);
    expect(messages.every((m) => m.trim().length > 0)).toBe(true);
    expect(new Set(messages).size).toBe(messages.length);
    expect(messages.some((m) => m.includes("!"))).toBe(false);
  });
});
