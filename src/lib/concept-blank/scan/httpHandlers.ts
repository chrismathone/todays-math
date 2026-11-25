import "server-only";
import {
  scanNameCaptureInputSchema,
  scanNameCaptureActionSchema,
  scanAssignStudentSchema,
} from "@/contracts/conceptBlankScanName.contract";
import {
  startScanNameCapture,
  getScanNameCapture,
  chooseScanNameStudent,
  retryScanNameCapture,
  runScanNameCapture,
  purgeScanNameCaptures,
} from "./nameCapture";
import { changeScanStudent } from "./name";
import { z } from "zod";
import {
  scanCorrectionInputSchema,
  scanJobInputSchema,
  scanOverrideInputSchema,
  scanPhotoInputSchema,
  scanRevisionSchema,
  scanStartInputSchema,
} from "@/contracts/conceptBlankScanApi.contract";
import { cronSecretMatches } from "@/lib/cronSecret";
import { getScanIssueView, ScanAccessError } from "./issuance";
import {
  beginScanSubmission,
  getScanSubmission,
  addScanPhoto,
  correctScanAnswer,
  overrideScanGrade,
} from "./submission";
import { beginScanJob } from "./jobs";
import { runScanJobAndQueue, runQueuedScanJobs } from "./queue";
import { signScanPhoto, deleteScanPhoto, purgeScanPhotos } from "./retention";
import { readScanJson, scanHttp, scanNoStore, scanRequestActor } from "./http";
import type { scanRuntime } from "./runtime.server";

export type ScanRouteContext = { params: Promise<{ id: string }> };
export type ScanPhotoRouteContext = {
  params: Promise<{ id: string; photoId: string }>;
};
const json = (data: unknown, status = 200) =>
  Response.json({ data }, { status, headers: scanNoStore });
/** The local E2E harness uses this same HTTP boundary with explicit local dependencies. */
export function createScanHttpHandlers(deps: {
  runtime: typeof scanRuntime;
  actor?: typeof scanRequestActor;
  schedule: (run: () => Promise<void>) => void;
}) {
  const actor = deps.actor ?? scanRequestActor;
  const jobDeps = (request: Request) => {
    const runtime = deps.runtime(request);
    return {
      db: runtime.db,
      storage: runtime.storage(),
      config: runtime.config(),
      model: runtime.model,
      onError: runtime.onError,
    };
  };
  const scheduleName = (
    request: Request,
    job: { id: string; jobId: string | null },
  ) => {
    if (job.jobId)
      deps.schedule(async () => {
        const runtime = jobDeps(request),
          signal = AbortSignal.timeout(240_000);
        await runScanNameCapture(
          { id: job.id, jobId: job.jobId! },
          { ...runtime, signal },
        );
        await runQueuedScanJobs({ ...runtime, signal });
      });
  };
  return {
    nameStart: (request: Request) =>
      scanHttp(async () => {
        const who = await actor(request, true),
          input = scanNameCaptureInputSchema.parse(await readScanJson(request)),
          runtime = deps.runtime(request);
        const job = await startScanNameCapture(who, input, {
          db: runtime.db,
          storage: runtime.storage(),
          origin: runtime.origin,
        });
        scheduleName(request, job);
        return json({ id: job.id }, 202);
      }),
    nameGet: (request: Request, context: ScanRouteContext) =>
      scanHttp(async () => {
        const who = await actor(request, true),
          { id } = await context.params;
        const view = await getScanNameCapture(
          who,
          id,
          deps.runtime(request).db,
          new URL(request.url).searchParams.get("q") ?? "",
        );
        if (view.job === "waiting")
          deps.schedule(() => runQueuedScanJobs(jobDeps(request)));
        return json(view);
      }),
    nameAction: (request: Request, context: ScanRouteContext) =>
      scanHttp(async () => {
        const who = await actor(request, true),
          { id } = await context.params,
          input = scanNameCaptureActionSchema.parse(
            await readScanJson(request, 1000),
          ),
          db = deps.runtime(request).db;
        if (input.action === "choose")
          return json(
            await chooseScanNameStudent(who, id, input.studentId, db),
          );
        const job = await retryScanNameCapture(who, id, db);
        scheduleName(request, job);
        return json({ id }, 202);
      }),
    assignStudent: (request: Request, context: ScanRouteContext) =>
      scanHttp(async () => {
        const who = await actor(request, true),
          { id } = await context.params;
        return json(
          await changeScanStudent(
            who,
            id,
            scanAssignStudentSchema.parse(await readScanJson(request, 1000)),
            deps.runtime(request).db,
          ),
        );
      }),
    issue: (request: Request, context: ScanRouteContext) =>
      scanHttp(async () => {
        const who = await actor(request),
          { id } = await context.params;
        return json(
          await getScanIssueView(
            who,
            id,
            deps.runtime(request).db,
            new URL(request.url).searchParams.get("q") ?? "",
          ),
        );
      }),
    start: (request: Request) =>
      scanHttp(async () => {
        const who = await actor(request);
        return json(
          await beginScanSubmission(
            who,
            scanStartInputSchema.parse(await readScanJson(request, 20_000)),
            deps.runtime(request).db,
          ),
          201,
        );
      }),
    get: (request: Request, context: ScanRouteContext) =>
      scanHttp(async () => {
        const who = await actor(request),
          { id } = await context.params;
        const runtime = deps.runtime(request);
        const view = await getScanSubmission(who, id, runtime.db);
        if (view.job?.waiting)
          deps.schedule(() =>
            runQueuedScanJobs({
              db: runtime.db,
              storage: runtime.storage(),
              model: runtime.model,
              config: runtime.config(),
              onError: runtime.onError,
            }),
          );
        return json(view);
      }),
    photo: (request: Request, context: ScanRouteContext) =>
      scanHttp(async () => {
        const who = await actor(request),
          { id } = await context.params,
          input = scanPhotoInputSchema.parse(await readScanJson(request)),
          runtime = deps.runtime(request);
        return json(
          await addScanPhoto(who, id, input, {
            db: runtime.db,
            storage: runtime.storage(),
            origin: runtime.origin,
          }),
          201,
        );
      }),
    answer: (request: Request, context: ScanRouteContext) =>
      scanHttp(async () => {
        const who = await actor(request),
          { id } = await context.params,
          input = scanCorrectionInputSchema.parse(
            await readScanJson(request, 60_000),
          );
        return json(
          await correctScanAnswer(who, id, input, deps.runtime(request).db),
        );
      }),
    override: (request: Request, context: ScanRouteContext) =>
      scanHttp(async () => {
        const who = await actor(request, true),
          { id } = await context.params,
          input = scanOverrideInputSchema.parse(
            await readScanJson(request, 10_000),
          );
        return json(
          await overrideScanGrade(who, id, input, deps.runtime(request).db),
        );
      }),
    job: (request: Request, context: ScanRouteContext) =>
      scanHttp(async () => {
        const who = await actor(request),
          { id } = await context.params,
          input = scanJobInputSchema.parse(await readScanJson(request, 10_000)),
          runtime = deps.runtime(request);
        const jobDeps = {
          db: runtime.db,
          storage: runtime.storage(),
          config: runtime.config(),
          model: runtime.model,
          onError: runtime.onError,
        };
        const job = await beginScanJob(who, id, input, runtime.db);
        deps.schedule(() => runScanJobAndQueue(job, jobDeps));
        return json({ id: job.id, kind: job.kind }, 202);
      }),
    sign: (request: Request, context: ScanPhotoRouteContext) =>
      scanHttp(async () => {
        const who = await actor(request),
          { id, photoId } = await context.params,
          runtime = deps.runtime(request);
        return json(
          await signScanPhoto(who, id, photoId, {
            db: runtime.db,
            storage: runtime.storage(),
          }),
        );
      }),
    remove: (request: Request, context: ScanPhotoRouteContext) =>
      scanHttp(async () => {
        const who = await actor(request, true),
          { id, photoId } = await context.params,
          input = z
            .strictObject({ revision: scanRevisionSchema })
            .parse(await readScanJson(request, 1000)),
          runtime = deps.runtime(request);
        return json(
          await deleteScanPhoto(who, id, photoId, input.revision, {
            db: runtime.db,
            storage: runtime.storage(),
          }),
        );
      }),
    queue: (request: Request) =>
      scanHttp(async () => {
        if (!process.env.CRON_SECRET)
          throw new ScanAccessError("CRON_SECRET 이 설정되지 않았습니다.", 503);
        if (!cronSecretMatches(request, process.env.CRON_SECRET))
          throw new ScanAccessError("cron 시크릿이 다릅니다.", 401);
        const runtime = deps.runtime(request);
        await runQueuedScanJobs({
          db: runtime.db,
          storage: runtime.storage(),
          config: runtime.config(),
          model: runtime.model,
          onError: runtime.onError,
        });
        return json({ processed: true });
      }),
    purge: (request: Request) =>
      scanHttp(async () => {
        const secret = process.env.CRON_SECRET;
        if (!secret)
          throw new ScanAccessError("CRON_SECRET 이 설정되지 않았습니다.", 503);
        if (!cronSecretMatches(request, secret))
          throw new ScanAccessError("cron 시크릿이 다릅니다.", 401);
        const runtime = deps.runtime(request);
        const cleanup = { db: runtime.db, storage: runtime.storage() };
        const photos = await purgeScanPhotos(cleanup);
        const names = await purgeScanNameCaptures(cleanup);
        return json({ ...photos, nameCapturesDeleted: names.deleted });
      }),
  };
}
