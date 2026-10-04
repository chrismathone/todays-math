import type { PublishJob } from "@/components/textbook/model";
import type { TextbookStudioApi } from "./client";

/** Advance the existing server publication pipeline with its original request ID. */
export async function finishTextbookPdf(
  api: Pick<TextbookStudioApi, "stepPublish" | "finalize">,
  editionId: string,
  reserved: PublishJob,
  onProgress: (job: PublishJob) => void,
): Promise<PublishJob> {
  let job = reserved;
  let stalled = 0;
  const limit = (job.totalSteps ?? 200) + 10;
  onProgress(job);
  for (let attempt = 0; attempt < limit; attempt += 1) {
    if (job.status === "failed" || job.status === "finalized") return job;
    if (job.status === "ready") {
      job = await api.finalize(editionId, job.jobId);
      onProgress(job);
      return job;
    }
    const next = await api.stepPublish(editionId, job.jobId);
    if (
      next.completedSteps !== undefined &&
      next.completedSteps === job.completedSteps
    ) {
      stalled += 1;
      if (stalled > 5)
        throw new Error(
          "PDF 조판이 진행 중입니다. 잠시 후 PDF 만들기를 다시 눌러 이어서 진행해 주세요.",
        );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else stalled = 0;
    job = next;
    onProgress(job);
  }
  throw new Error(
    "PDF 조판을 이어서 진행하려면 PDF 만들기를 다시 눌러 주세요.",
  );
}
