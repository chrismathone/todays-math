/**
 * 보충 카드(D-147) 배포 1단계 — 계약 읽기 먼저(star-economy D-144 와 같은 두 단계).
 *
 * 2단계 코드가 학생 상태에 `explorers.profile.supplements` 를 쓰고 응답에 `supplements` 를 보낸 뒤 배포를 되돌리면,
 * 옛 코드의 strict 계약이 그 칸을 몰라 그 학생의 학습 API 전체와 **그 반 강사 현황**(`parseSrsState` 로 반 전체를 읽음)이
 * 막힌다. 그래서 이 단계는 **읽기만 넓힌다** — 저장 · 응답 둘 다 없으면 없는 대로, 있으면 모양 그대로 받아들인다.
 * 서버는 아직 쓰지도 보내지도 않는다(`explorerView` 에 `supplements` 없음).
 */
import { describe, expect, it } from "vitest";
import {
  explorerStateSchema,
  storedExplorerSchema,
} from "@/contracts/mathExplorers.contract";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";

const today = "2026-09-28";
/** 2단계가 쓰는 보충 칸 — 모은 장 · 못 모은 장 · 멈춘 장 · 지금 푸는 장 · 단원 끝 줄로 시작한 장. */
const supplements = {
  runs: 3,
  active: "sup-angle",
  offered: { date: today, cardId: "sup-line" },
  cards: {
    "sup-line": { collectedAt: today },
    "sup-square": { missedAt: today },
  },
  sessions: {
    "sup-angle": {
      id: "supplement-student-3",
      cardId: "sup-angle",
      date: today,
      queue: [0, 1, 2],
      index: 1,
      round: 0,
      next: [],
      seen: true,
      passed: [0],
    },
  },
};
const view = {
  cards: [
    {
      id: "sup-line",
      unitId: "g3-shapes",
      name: "직선",
      kind: "정의",
      prerequisiteIds: ["g3-segment"],
      collectedAt: today,
      missedAt: null,
      started: false,
      solved: 0,
    },
  ],
  session: {
    id: "supplement-student-3",
    cardId: "sup-angle",
    title: "교재에 한 장 더",
    index: 1,
    total: 3,
    round: 0,
    solved: 1,
  },
  activity: null,
  offer: { cardId: "sup-line", unitId: "g3-shapes" },
};

function stored(withSupplements: boolean) {
  const explorer = createExplorerState("student", 3);
  if (withSupplements)
    (explorer.profile as Record<string, unknown>).supplements = supplements;
  return explorer;
}
function response(withSupplements: boolean) {
  // 2단계 서버는 늘 보낸다 — «보충 칸 없는 응답»(1단계 서버 · 되돌린 뒤)은 칸을 지워 만든다.
  const base: Partial<ReturnType<typeof explorerView>> = explorerView(
    createExplorerState("student", 3),
    today,
  );
  delete base.supplements;
  return {
    ...base,
    ...(withSupplements ? { supplements: view } : {}),
    student: { id: "student", name: "학생", className: "반" },
    revision: 1,
    feedback: null,
  };
}

describe("보충 카드 계약 — 읽기 먼저(1단계)", () => {
  it("저장: 보충 칸이 없는 옛 기록과 있는 새 기록을 둘 다 읽는다", () => {
    expect(
      storedExplorerSchema.parse(stored(false)).profile,
    ).not.toHaveProperty("supplements");
    expect(storedExplorerSchema.parse(stored(true)).profile).toMatchObject({
      supplements,
    });
  });

  it("학생 상태 전체(강사 현황이 반 전체를 읽는 길)도 둘 다 읽는다", () => {
    for (const withSupplements of [false, true]) {
      const payload = {
        ...emptySrsState(),
        explorers: stored(withSupplements),
      };
      expect(() => parseSrsState(payload)).not.toThrow();
    }
    expect(
      parseSrsState({ ...emptySrsState(), explorers: stored(true) }).explorers
        ?.profile,
    ).toMatchObject({ supplements });
  });

  it("응답: 보충 칸이 없는 응답(지금 서버)과 있는 응답(2단계 서버)을 둘 다 읽는다", () => {
    expect(explorerStateSchema.parse(response(false))).not.toHaveProperty(
      "supplements",
    );
    expect(explorerStateSchema.parse(response(true)).supplements).toEqual(view);
  });

  it("넓히기만 한다 — 보충 칸 안의 모르는 칸 · 틀린 값은 그대로 막는다", () => {
    const bad = stored(true);
    (
      (bad.profile as Record<string, unknown>).supplements as Record<
        string,
        unknown
      >
    ).extra = 1;
    expect(() => storedExplorerSchema.parse(bad)).toThrow();
    const wrong = stored(true);
    (
      (wrong.profile as Record<string, unknown>).supplements as {
        sessions: Record<string, { round: number }>;
      }
    ).sessions["sup-angle"]!.round = 4;
    expect(() => storedExplorerSchema.parse(wrong)).toThrow();
    expect(() =>
      explorerStateSchema.parse({
        ...response(true),
        supplements: { ...view, extra: 1 },
      }),
    ).toThrow();
  });

  it("2단계 서버는 보충 칸을 늘 보낸다(읽기 계약이 먼저 나간 뒤 — 1단계 b0a9b0c8a)", () => {
    expect(
      explorerView(createExplorerState("student", 3), today).supplements,
    ).toMatchObject({ session: null, activity: null, offer: null });
  });
});
