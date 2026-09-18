/**
 * 🔴 RED → 🟢 — **Wire D 가 기록을 지우지 않는다** (Hi-fi 브리프 §1 #4 · #5).
 *
 * 구현: src/app/dev/report-wire/ReportWireClient.tsx
 *
 * 1. 🔴 평균 문장이 없으면 회차 목록도 사라졌다 — **전부 결시인 달에는 결시 내역까지 증발**했고,
 *    `rounds` 가 `[]` 라 «아직 못 드리는 말씀»에도 안 잡혔다.
 * 2. 🔴 난이도 문장이 `null` 이면 숫자판도 숨었다.
 * 3. 🔴 Wire D 에는 영상 분기가 없어 «N편 중 M편»이 사라졌다.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ReportWireClient } from "@/app/dev/report-wire/ReportWireClient";
import {
  type AchievementInput,
  collectAchievement,
} from "@/lib/achievement/collect";

const input = (over: Partial<AchievementInput>): AchievementInput => ({
  student: { id: "s", name: "김하나", className: "반", classGrade: "초5" },
  period: { from: "2026-08-24", to: "2026-09-18" },
  progress: [{ unitId: "u0", recordedAt: "2026-08-25" }],
  units: [
    {
      unitId: "u0",
      grade: "초5",
      chapter: "2. 소수의 곱셈",
      section: "소단원 0",
      orderIndex: 0,
    },
  ],
  plan: null,
  results: [],
  lectures: { targets: [], views: [] },
  ...over,
});

async function openWireD(over: Partial<AchievementInput>) {
  render(
    <ReportWireClient
      real={collectAchievement(input(over))}
      candidates={1}
      anchoredOnLastProgress={false}
      weeks={4}
    />,
  );
  await userEvent.setup().click(screen.getByRole("button", { name: /^D\./ }));
}

describe("🔴 Wire D — 문장이 없어도 기록은 보인다", () => {
  it("🔴 전부 결시인 달에도 결시 날짜가 남는다", async () => {
    await openWireD({
      results: [
        {
          testId: "t1",
          testDate: "2026-08-27",
          takenAt: "2026-08-27T09:00:00.000Z",
          score: null,
          maxScore: 100,
          absent: true,
          items: [],
          recommendedUnitIds: null,
        },
      ],
    });
    expect(screen.getByText(/2026-08-27 — 결시/)).toBeInTheDocument();
  });

  it("🔴 난이도 문장이 없어도(12문항 미만) 난이도 숫자판은 남는다", async () => {
    await openWireD({
      results: [
        {
          testId: "t1",
          testDate: "2026-08-27",
          takenAt: "2026-08-27T09:00:00.000Z",
          score: 50,
          maxScore: 100,
          absent: false,
          items: [
            { unitId: "u0", difficulty: "기본", isCorrect: true },
            { unitId: "u0", difficulty: "응용", isCorrect: false },
          ],
          recommendedUnitIds: null,
        },
      ],
    });
    expect(screen.getByText("심화")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
  });

  it("🔴 영상 기록이 있으면 «N편 중 M편»이 나온다", async () => {
    await openWireD({
      lectures: {
        targets: [{ lectureId: "l1" }, { lectureId: "l2" }],
        views: [
          {
            lectureId: "l1",
            percent: 100,
            completedAt: "2026-08-26T00:00:00.000Z",
          },
        ],
      },
    });
    expect(screen.getByText(/영상 2편 중 1편/)).toBeInTheDocument();
  });
});
