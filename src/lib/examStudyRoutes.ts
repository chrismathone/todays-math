import "server-only";

import {
  EXAM_STUDY_LIMITS,
  examStudyCourseSchema,
  examStudyGenerateRequestSchema,
  examStudyResolveRequestSchema,
  type ExamStudyDraft,
  type ExamStudyGenerateRequest,
} from "@/contracts/examStudy.contract";
import { authorizeAccount } from "@/lib/accountAccess";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import { routeAccessFor } from "@/lib/routeAccess";
import { readStrictJson } from "@/lib/textbook/strictJson";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { generateExamStudy, getExamStudyCatalog } from "@/lib/examStudy";

const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const BODY_LIMITS = {
  maxBytes: EXAM_STUDY_LIMITS.maxRequestBytes,
  maxDepth: 8,
  maxTokens: 1_000,
  maxStringLength: 512,
};
const MAX_RENDER_MS = 20_000;
const MAX_RENDER_BYTES = 2 * 1024 * 1024;

function error(message: string, status: number, code = "VALIDATION_ERROR") {
  return Response.json({ error: { code, message } }, { status, headers });
}

async function authorize(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access.response;
  const account = access.account!;
  const path = new URL(request.url).pathname;
  if (
    account.role !== "director" ||
    routeAccessFor(account.role, request.method, path) !== "allow" ||
    !accountRouteAllowed(account, request.method, path)
  ) {
    return error("기출 대비 연습을 사용할 권한이 없습니다.", 403, "FORBIDDEN");
  }
  return null;
}

/** Per-request render budget. Required figures never silently lose dimensions or disappear. */
async function generate(request: Request, recipe: ExamStudyGenerateRequest) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (request.signal.aborted) cancel();
  request.signal.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(cancel, MAX_RENDER_MS);
  let renders = 0;
  let bytes = 0;
  let active = 0;
  const queue: (() => void)[] = [];
  const release = () => {
    const next = queue.shift();
    if (next) next();
    else active -= 1;
  };
  const prepare = async (item: ExamStudyDraft) => {
    if (!item.figureSpec) return { ok: true as const, figureSvg: null };
    if (
      controller.signal.aborted ||
      renders >=
        EXAM_STUDY_LIMITS.maxQuestions *
          (EXAM_STUDY_LIMITS.maxRenderRetries + 1)
    )
      return {
        ok: false as const,
        reason:
          "그림 생성 한도에 도달했습니다. 문항 수를 줄여 다시 만들어 주세요.",
      };
    if (active < EXAM_STUDY_LIMITS.maxConcurrentRenders) active += 1;
    else {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    try {
      if (
        controller.signal.aborted ||
        renders >=
          EXAM_STUDY_LIMITS.maxQuestions *
            (EXAM_STUDY_LIMITS.maxRenderRetries + 1)
      )
        return {
          ok: false as const,
          reason: "그림 생성 시간이 초과되었습니다.",
        };
      renders += 1;
      const result = await renderFigureSpec(item.figureSpec, {
        strict: true,
        signal: controller.signal,
      });
      if (!result.ok || result.droppedDimensions?.length)
        return {
          ok: false as const,
          reason: "필요한 그림을 완성하지 못해 해당 문항을 제외했습니다.",
        };
      const size = Buffer.byteLength(result.svg, "utf8");
      if (bytes + size > MAX_RENDER_BYTES)
        return {
          ok: false as const,
          reason:
            "그림 용량 한도에 도달했습니다. 문항 수를 줄여 다시 만들어 주세요.",
        };
      bytes += size;
      return { ok: true as const, figureSvg: result.svg };
    } finally {
      release();
    }
  };
  try {
    return await generateExamStudy(recipe, { prepare });
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener("abort", cancel);
  }
}

export async function examStudyCatalog(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  if (
    [...params.keys()].some((key) => key !== "course") ||
    params.getAll("course").length > 1
  )
    return error("조회할 학년·과목을 확인해 주세요.", 400);
  const course = params.get("course");
  const parsed =
    course === null ? null : examStudyCourseSchema.safeParse(course);
  if (parsed && !parsed.success)
    return error("지원하지 않는 학년·과목입니다.", 400);
  return Response.json(
    { data: getExamStudyCatalog(parsed?.success ? parsed.data : undefined) },
    { headers },
  );
}

export async function createExamStudy(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await readStrictJson(request, BODY_LIMITS);
  } catch {
    return error("생성 요청의 형식과 크기를 확인해 주세요.", 400);
  }
  const parsed = examStudyGenerateRequestSchema.safeParse(body);
  if (!parsed.success)
    return error("학년·유형·문항 수와 응답 형식을 확인해 주세요.", 400);
  try {
    return Response.json(
      { data: await generate(request, parsed.data) },
      { headers },
    );
  } catch {
    return error(
      "요청한 범위를 만들 수 없습니다. 학교·유형·형식 조건을 확인해 주세요.",
      422,
    );
  }
}

export async function resolveExamStudy(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  let body: unknown;
  try {
    body = await readStrictJson(request, BODY_LIMITS);
  } catch {
    return error("출력 확인 요청의 형식과 크기를 확인해 주세요.", 400);
  }
  const parsed = examStudyResolveRequestSchema.safeParse(body);
  if (!parsed.success)
    return error("출력할 연습 문항을 다시 확인해 주세요.", 400);
  try {
    const current = await generate(request, parsed.data.recipe);
    if (
      current.digest !== parsed.data.expectedDigest ||
      current.deliveredCount === 0 ||
      current.status === "unavailable"
    )
      return error(
        "문항이나 지원 범위가 바뀌었습니다. 다시 만든 뒤 출력해 주세요.",
        409,
        "CONFLICT",
      );
    return Response.json(
      {
        data: {
          digest: current.digest,
          deliveredCount: current.deliveredCount,
        },
      },
      { headers },
    );
  } catch {
    return error(
      "출력할 문항을 확인하지 못했습니다. 다시 만든 뒤 출력해 주세요.",
      409,
      "CONFLICT",
    );
  }
}
