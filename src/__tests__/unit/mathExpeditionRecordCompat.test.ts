// @vitest-environment node
// D-144 배포 1단계 — 계약의 «읽기 쪽 느슨화»만 먼저 배포한다(쓰기 코드 없음).
// 2단계(한 칸 보장 · 끝없는 기지)가 쓴 새 기록을 이 판이 읽고, 되돌려도 학생 기록 읽기가 막히지 않아야 한다.
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mathExpeditionSchema } from "@/contracts/mathExpedition.contract";
import { explorerViewSchema } from "@/contracts/mathExplorers.contract";
import { createExplorerState, explorerView } from "@/lib/math-explorers/engine";
import { expeditionDto } from "@/lib/math-explorers/expedition";
import { emptySrsState, parseSrsState } from "@/lib/math-srs/serverState";

const studentId = randomUUID();
const now = new Date("2026-09-28T03:00:00.000Z");
const date = "2026-09-28";

function record(options: { tileStars?: boolean; startStars?: boolean; level: number }) {
  const explorers = createExplorerState(studentId, 7);
  explorers.profile = { ...explorers.profile, level: options.level, stars: 9, earned: 60 };
  const review = {
    kind: "middle" as const,
    dayId: `expedition:${randomUUID()}`,
    title: "일차방정식",
    subtitle: "중학교 1학년",
    reviewCount: 12,
  };
  const missionId = randomUUID();
  return {
    ...emptySrsState(),
    explorers,
    expedition: {
      version: 1,
      initializedAt: "2026-09-01T00:00:00.000Z",
      mission: {
        kind: "explorers",
        route: "memory",
        unitId: "g7-equation",
        title: "기억 복습",
        subtitle: "중학교 1학년",
        goal: 15,
        id: missionId,
        date,
        answered: 15,
        retryRemaining: 0,
        status: "complete",
        sourceSessionId: "definitions-x-3",
        sourceSessionIds: ["definitions-x-3"],
        startedAt: `${date}T01:00:00.000Z`,
        completedAt: `${date}T02:00:00.000Z`,
        awardEligible: true,
        references: [],
        ...(options.startStars ? { startStars: 0 } : {}),
      },
      legacyDays: [],
      receipts: [],
      awards: [
        {
          missionId,
          references: [],
          day: {
            ...review,
            id: `expedition:${date}`,
            date,
            completedAt: `${date}T02:00:00.000Z`,
            reviews: [review],
          },
          ...(options.tileStars ? { stars: { cards: 2, bonus: 1 } } : {}),
        },
      ],
    },
  };
}

describe("expedition records written before and after D-144 both read (deploy step 1)", () => {
  it("reads a record written before D-144", () => {
    const state = parseSrsState(record({ level: 3 }));
    expect(state.expedition!.awards).toHaveLength(1);
    expect(mathExpeditionSchema.parse(expeditionDto(state, studentId, now)).completedToday).toBe(true);
  });

  it("reads a record written after D-144 — tile stars, mission start stars, a base past stage 3", () => {
    const state = parseSrsState(record({ tileStars: true, startStars: true, level: 7 }));
    expect(state.expedition!.awards[0]!.stars).toEqual({ cards: 2, bonus: 1 });
    expect(state.explorers!.profile.level).toBe(7);
    // 이 판의 응답도 새 기록에서 그대로 만들어진다(미션 기준값은 학생에게 안 나간다)
    const dto = mathExpeditionSchema.parse(expeditionDto(state, studentId, now));
    expect(dto.mission).not.toHaveProperty("startStars");
    expect(explorerViewSchema.parse(explorerView(state.explorers!, date)).profile.level).toBe(7);
  });

  it("accepts the D-144 server response field todayStars on this client", () => {
    const dto = expeditionDto(parseSrsState(record({ level: 3 })), studentId, now);
    expect(
      mathExpeditionSchema.parse({ ...dto, todayStars: { cards: 0, bonus: 3 } }).todayStars,
    ).toEqual({ cards: 0, bonus: 3 });
  });
});
