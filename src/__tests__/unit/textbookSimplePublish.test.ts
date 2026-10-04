import { describe, expect, it, vi } from "vitest";
import type { PublishJob } from "@/components/textbook/model";
import { finishTextbookPdf } from "@/lib/textbook/simplePublish";

const reserved: PublishJob = {
  jobId: "original-request",
  status: "reserved",
  issues: [],
  completedSteps: 0,
  totalSteps: 2,
};
describe("one-click textbook PDF", () => {
  it("advances every server step and finalizes with the reservation request ID", async () => {
    const api = {
      stepPublish: vi
        .fn()
        .mockResolvedValueOnce({
          ...reserved,
          status: "running",
          completedSteps: 1,
        })
        .mockResolvedValueOnce({
          ...reserved,
          status: "ready",
          completedSteps: 2,
        }),
      finalize: vi
        .fn()
        .mockResolvedValue({
          ...reserved,
          status: "finalized",
          completedSteps: 2,
        }),
    };
    const progress = vi.fn();
    expect(
      (await finishTextbookPdf(api, "edition", reserved, progress)).status,
    ).toBe("finalized");
    expect(api.stepPublish.mock.calls).toEqual([
      ["edition", "original-request"],
      ["edition", "original-request"],
    ]);
    expect(api.finalize).toHaveBeenCalledWith("edition", "original-request");
    expect(progress.mock.calls.map(([job]) => job.status)).toEqual([
      "reserved",
      "running",
      "ready",
      "finalized",
    ]);
  });
  it("does not finalize a failed renderer job", async () => {
    const api = {
      stepPublish: vi.fn().mockResolvedValue({ ...reserved, status: "failed" }),
      finalize: vi.fn(),
    };
    expect(
      (await finishTextbookPdf(api, "edition", reserved, () => {})).status,
    ).toBe("failed");
    expect(api.finalize).not.toHaveBeenCalled();
  });
});
