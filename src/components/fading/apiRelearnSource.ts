import type { FadingRelearnAction } from "@/contracts/fadingRelearn.contract";
import type { FadingRelearnSource } from "@/lib/fading/relearnSource";
import { requestFading } from "./apiSource";

const URL = "/api/learn/fading/relearn";
const contracts = () => import("@/contracts/fadingRelearn.contract");

/** Student-bound HTTP adapter; deadlines and grading are supplied by the source. */
export function createApiFadingRelearnSource({
  studentId,
}: { studentId?: string } = {}): FadingRelearnSource {
  const action = (body: FadingRelearnAction) =>
    requestFading(
      URL,
      async (json) =>
        (await contracts()).fadingRelearnActionResponseSchema.parse(json).data,
      body,
      studentId,
    );
  return {
    queue: () =>
      requestFading(
        URL,
        async (json) =>
          (await contracts()).fadingRelearnQueueResponseSchema.parse(json).data,
        undefined,
        studentId,
      ),
    record: async (observation) => {
      const response = await action({ action: "record", observation });
      if (response.applied === null || response.result !== null)
        throw new Error("재확인 기록 응답을 확인할 수 없습니다.");
      return { queue: response.queue, applied: response.applied };
    },
    grade: async (attempt) => {
      const response = await action({ action: "grade", attempt });
      if (response.result === null || response.applied !== null)
        throw new Error("재확인 결과를 확인할 수 없습니다.");
      return { queue: response.queue, result: response.result };
    },
    judge: async (judgement) => {
      const response = await action({ action: "judge", judgement });
      if (response.result === null || response.applied !== null)
        throw new Error("재확인 결과를 확인할 수 없습니다.");
      return { queue: response.queue, result: response.result };
    },
  };
}
