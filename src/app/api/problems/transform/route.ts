/**
 * POST /api/problems/transform — 원본 문제를 변형해 **후보만** 돌려준다.
 *
 * ⚠️ 이 엔드포인트는 **DB 를 건드리지 않는다** (원장님 확정 2026-08-19 "미리보기 후 채택").
 *    종전에는 생성과 적재가 한 몸이라, 결과를 보기도 전에 은행에 pending 이 쌓였다.
 *    채택한 후보의 저장은 `POST /api/problems/transform/adopt` 가 맡는다.
 *
 * 대응 계약: src/contracts/problem.contract.ts
 */
import type { NextRequest } from "next/server";

import {
  problemTransformRequestSchema,
  problemTransformResponseSchema,
} from "@/contracts/problem.contract";
import {
  AiCapacityError,
  AiConfigError,
  AiGenerationError,
} from "@/lib/ai/errors";
import { problemAiKeyName } from "@/lib/ai/client";
import { transformProblem } from "@/lib/ai/transformer";
import { AI_BUSY_MESSAGE, admitAiWork } from "@/lib/aiAdmission";
import {
  jsonError,
  jsonOk,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { db } from "@/lib/db";
import { figureFabricationReason } from "@/lib/figure/figureMatchesContent";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { originNeedsFigure } from "@/lib/figure/transformFigureBlock";
import { requireAccessibleProblem } from "@/lib/ownership";
import { pickFamilyMain } from "@/lib/problem/familyMainProblem";
import { getSessionUser } from "@/lib/session";
import type { ProblemType } from "@/contracts/problem.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handlePost(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const body = await request.json().catch(() => undefined);
  const parsed = problemTransformRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const accessible = await requireAccessibleProblem(
    parsed.data.originProblemId,
    session.id,
  );
  if (!accessible.ok) return accessible.response;

  // 🔴 **변형은 언제나 문항류의 대표(`-001`)에서 한다** (원장님 지시 2026-08-27:
  //    「변형된 문제는 재변형 불가능하게. 항상 001만 변형 가능하게」 ·
  //     「002~ 에서 변형 누르면 001이 변형되는 걸로 배선」).
  //
  //    변형본을 또 변형하면 **원본에서 두 걸음 멀어진 것**이 생긴다. AI 가 지은 값이
  //    맞는지 대 볼 기준은 «바로 앞 것»이 아니라 사람이 검수한 원본이어야 한다.
  //
  //    화면에서 막지 않고 **서버가 옮긴다** — 화면만 막으면 문지기가 브라우저에
  //    있는 것이고 그건 없는 것과 같다(이 파일 아래 `adopt` 가 같은 이유로 문지기를
  //    다시 세운다). 어느 문항으로 옮겼는지는 `meta.originProblemCode` 로 알린다.
  const asked = accessible.data;
  const siblings =
    // ⚠️ `solo:` 도 **키가 있으면 조회한다.** 접두사가 «혼자»라는 뜻이 아니다 —
    //    변형본이 원본의 키를 물려받으므로 형제들이 같은 `solo:<uuid>` 를 든다
    //    (실측 `A07-001`~`A07-006`). 여기서 끊으면 원장님이 지시한 «002~ 에서
    //    누르면 001» 배선이 그 부류에 안 걸린다. 판단은 `pickFamilyMain` 하나가 한다.
    asked.familyKey?.trim()
      ? await db.problem.findMany({
          where: { unitId: asked.unitId, familyKey: asked.familyKey },
          select: { id: true, unitId: true, familyKey: true, createdAt: true },
        })
      : [];
  const mainRef = pickFamilyMain(asked, siblings);
  const origin =
    mainRef.id === asked.id
      ? asked
      : ((await db.problem.findUnique({ where: { id: mainRef.id } })) ?? asked);

  const figureRequired = originNeedsFigure(origin);

  // 한 사람이 동시에 띄우는 유료 호출은 둘까지 — 생성(`generate`)과 같은 자리를 나눠 쓴다(2026-10-07 검수).
  const release = admitAiWork("problems", session.id);
  if (!release) return jsonError("AI_GENERATION_FAILED", AI_BUSY_MESSAGE, 429);

  try {
    const candidates = await transformProblem({
      origin: {
        id: origin.id,
        unitId: origin.unitId,
        difficulty: origin.difficulty,
        problemType: origin.problemType as ProblemType,
        content: origin.content,
        answer: origin.answer,
        solution: origin.solution,
      },
      count: parsed.data.count,
      mode: parsed.data.mode,
      difficultyShift: parsed.data.difficultyShift,
      figureRequired,
    });

    // 도형이 필요한 문항이면 후보마다 **서버가** 그려 본다. 여기서 그려 두는 이유는
    // 원장님이 채택 전에 도형을 눈으로 보셔야 하기 때문이다. 못 그린 후보는 사유가 남고
    // 채택할 수 없다 — 실패가 침묵하지 않는다.
    // 순차가 아니라 한꺼번에 그린다(엔진 프로세스는 후보 수만큼, 최대 10개).
    const drawn = figureRequired
      ? await Promise.all(
          candidates.map(async (candidate) => {
            if (!candidate.figureSpec) {
              return {
                ...candidate,
                figureError: "AI 가 본문만으로는 도형을 확정하지 못했습니다.",
              };
            }
            // ⚠️ **그리기 전에** 지어냈는지부터 본다. 지어낸 스펙도 엔진을 성공적으로
            //    통과한다(실측) — 그럴듯하게 그려진 오답이 제일 위험하다.
            const fabricated = figureFabricationReason(
              candidate.figureSpec,
              candidate.content,
            );
            if (fabricated) {
              return { ...candidate, figureSvg: null, figureError: fabricated };
            }
            const result = await renderFigureSpec(candidate.figureSpec);
            return result.ok
              ? { ...candidate, figureSvg: result.svg, figureError: null }
              : { ...candidate, figureSvg: null, figureError: result.error };
          }),
        )
      : candidates;

    // 201 이 아니라 **200** 이다 — 만든 것이 없다(created nothing). 아직 자원이 아니다.
    return jsonOk(problemTransformResponseSchema, {
      data: drawn,
      meta: { figureRequired, originProblemCode: origin.problemCode },
    });
  } catch (error) {
    // ⚠️ `AiCapacityError`·`AiConfigError` 는 둘 다 `AiGenerationError` 의 하위 타입이다 —
    //    **이 검사들이 먼저** 와야 한다. 순서를 뒤집으면 원인이 일반 실패로 뭉개진다.
    if (error instanceof AiCapacityError) {
      console.error("[POST /api/problems/transform] AI response truncated");
      return jsonError(
        "AI_GENERATION_FAILED",
        "AI 가 답을 내기 전에 길이 한도에 걸렸습니다 — 개수를 줄이거나 더 단순한 문항으로 다시 시도해주세요.",
        502,
      );
    }
    // ⚠️ `AiConfigError` 는 `AiGenerationError` 의 하위 타입이다 — **이 검사가 먼저** 와야
    //    한다. 순서를 뒤집으면 설정 누락이 다시 일반 실패로 뭉개져 화면에서 원인을 못 본다.
    if (error instanceof AiConfigError) {
      console.error("[POST /api/problems/transform] AI not configured");
      return jsonError(
        "AI_GENERATION_FAILED",
        // 키 이름은 지금 공급자의 것(기본 ANTHROPIC_API_KEY · 되돌리면 DEEPSEEK_API_KEY) — 값은 싣지 않는다.
        `AI 설정이 없습니다 — 서버 환경변수 ${problemAiKeyName()} 를 확인해주세요.`,
        503,
      );
    }
    if (error instanceof AiGenerationError) {
      console.error("[POST /api/problems/transform] AI transform failed");
      return jsonError(
        "AI_GENERATION_FAILED",
        "AI 문제 변형에 실패했습니다.",
        502,
      );
    }
    throw error;
  } finally {
    release();
  }
}

export const POST = withErrorLog("/api/problems/transform", handlePost);
