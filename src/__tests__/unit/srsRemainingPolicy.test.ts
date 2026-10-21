// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  courseDetail,
  explorerDetail,
  studentState,
} from "../../../scripts/qa/srs-remaining-policy/data";
import {
  simulateFourteenDays,
  verifyQuotaPolicy,
} from "../../../scripts/qa/srs-remaining-policy/memory";

describe("remaining SRS policy acceptance in memory", () => {
  it("uses product-created explorer and course histories in the browser fixture", () => {
    expect(explorerDetail("mixed").data.detail.recentSessions).toHaveLength(1);
    expect(courseDetail("mixed").data.activity[0].answered).toBe(5);
    expect(
      studentState.units
        .flatMap((unit) => unit.cards)
        .some((card) => card.progress?.level),
    ).toBe(true);
  });
  it("preserves long-term memory across 14 injected days and minute repeats", async () => {
    const result = await simulateFourteenDays();
    expect(result.days).toHaveLength(14);
    expect(result.mainRatings).toBeLessThan(14);
  });
  it("keeps the standalone five-question plan and integrated ten-question block distinct", async () => {
    const result = await verifyQuotaPolicy();
    expect(result.teacherPlanPreserved).toBe(true);
  });
});
