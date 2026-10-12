/**
 * POST /api/problems/transform/adopt — 미리보기에서 **채택한** 변형만 pending 으로 적재.
 *
 * `POST /api/problems/transform` 이 만든 후보 중 원장님이 고른 것만 여기로 온다
 * (원장님 확정 2026-08-19 "미리보기 후 채택").
 *
 * ⚠️ 분류 필드는 **전부 서버가 원본에서 물려받아 부여한다** — 요청은 본문·정답·풀이와
 *    난이도 조정만 보낸다. 특히 `source="transformed"` 와 `originProblemId` 는 클라이언트가
 *    정할 수 없다: `originProblemId` 가 NULL 인지 아닌지가 RPM 교재 이관본(source=transformed,
 *    originProblemId=NULL)과 AI 변형본을 가르는 **유일한 판별자**이고(D-51),
 *    `composePredictedPaper` 의 `SOURCE_RANK` 가 그 값으로 출제 등급을 나눈다.
 *
 * 대응 계약: src/contracts/problem.contract.ts (problemTransformAdoptRequestSchema)
 */
import type { NextRequest } from "next/server";

import type { Difficulty } from "@/contracts/common.contract";
import {
  problemTransformAdoptRequestSchema,
  problemTransformAdoptResponseSchema,
  shiftDifficulty,
} from "@/contracts/problem.contract";
import { verifiesOriginalReproduction } from "@/lib/ai/originalReproduction";
import { deriveQuestionType } from "@/lib/ai/questionType";
import {
  jsonError,
  jsonOk,
  unauthorizedError,
  validationError,
} from "@/lib/apiResponse";
import { figureFabricationReason } from "@/lib/figure/figureMatchesContent";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import {
  FIGURE_MISSING_REASON,
  originNeedsFigure,
} from "@/lib/figure/transformFigureBlock";
import { db } from "@/lib/db";
import { requireAccessibleProblem } from "@/lib/ownership";
import { pickFamilyMain } from "@/lib/problem/familyMainProblem";
import { serializeProblem } from "@/lib/serializers";
import { withProblemSourceReferences } from "@/lib/problem/sourceReference";
import { getSessionUser } from "@/lib/session";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handlePost(request: NextRequest) {
  const session = await getSessionUser();
  if (!session) return unauthorizedError();

  const body = await request.json().catch(() => undefined);
  const parsed = problemTransformAdoptRequestSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const accessible = await requireAccessibleProblem(
    parsed.data.originProblemId,
    session.id,
  );
  if (!accessible.ok) return accessible.response;

  // 🔴 문지기를 **여기서도** 세운다 — 생성 쪽과 같은 이유다. 화면이 다른 id 를
  //    보내도 저장되는 변형본은 **문항류 대표의 자식**이어야 한다. 안 그러면
  //    `originProblemId` 가 변형본을 가리켜 «변형의 변형» 사슬이 DB 에 남는다.
  const askedOrigin = accessible.data;
  const originSiblings =
    // ⚠️ `solo:` 도 **키가 있으면 조회한다.** 접두사가 «혼자»라는 뜻이 아니다 —
    //    변형본이 원본의 키를 물려받으므로 형제들이 같은 `solo:<uuid>` 를 든다
    //    (실측 `A07-001`~`A07-006`). 여기서 끊으면 원장님이 지시한 «002~ 에서
    //    누르면 001» 배선이 그 부류에 안 걸린다. 판단은 `pickFamilyMain` 하나가 한다.
    askedOrigin.familyKey?.trim()
      ? await db.problem.findMany({
          where: {
            unitId: askedOrigin.unitId,
            familyKey: askedOrigin.familyKey,
          },
          select: { id: true, unitId: true, familyKey: true, createdAt: true },
        })
      : [];
  const originMain = pickFamilyMain(askedOrigin, originSiblings);
  const origin =
    originMain.id === askedOrigin.id
      ? askedOrigin
      : ((await db.problem.findUnique({ where: { id: originMain.id } })) ??
        askedOrigin);

  // ⚠️ 문지기를 **여기서 다시** 세운다. 화면도 막지만 화면만 막으면 문지기가
  //    브라우저에 있는 것이고, 그건 없는 것과 같다(적대적 리뷰 2026-08-19).
  //
  // 도형은 **여기서 다시 그린다.** 미리보기에서 본 SVG 를 클라이언트가 실어 보내지 않는다 —
  // 브라우저가 준 마크업을 그대로 저장하면 지면과 화면에 남는 주입 통로가 된다.
  // 되돌아오는 것은 스펙뿐이고, SVG 의 유일한 생산자는 서버다.
  const figureRequired = originNeedsFigure(origin);
  let figureSvgs: (string | null)[] = parsed.data.items.map(() => null);
  if (figureRequired) {
    figureSvgs = await Promise.all(
      parsed.data.items.map(async (item) => {
        if (!item.figureSpec) return null;
        // 화면도 막지만, 화면만 막으면 문지기가 브라우저에 있는 것이다.
        if (figureFabricationReason(item.figureSpec, item.content)) return null;
        const result = await renderFigureSpec(item.figureSpec);
        return result.ok ? result.svg : null;
      }),
    );
    if (figureSvgs.some((svg) => svg === null)) {
      return jsonError("CONFLICT", FIGURE_MISSING_REASON, 409);
    }
  }

  // 원본 재현 검사 — 종전에는 변형기가 탈락 후보를 걸러 서버가 저장을 거부했다.
  // 미리보기로 갈라지며 그 자리가 비었으므로 저장 직전에 되살린다.
  const failed = parsed.data.items.filter(
    (item) => !verifiesOriginalReproduction(origin, item),
  );
  if (failed.length > 0) {
    return jsonError(
      "VALIDATION_ERROR",
      `원본 재현 검사를 통과하지 못한 변형 ${failed.length}건은 저장할 수 없습니다.`,
      400,
    );
  }

  const difficulty = shiftDifficulty(
    origin.difficulty as Difficulty,
    parsed.data.difficultyShift,
  );

  // Resolve before INSERT so a failed metadata read cannot make a saved adoption
  // look unsuccessful and encourage a duplicate retry.
  const [provenance] = await withProblemSourceReferences([
    { originProblemId: origin.id },
  ]);

  // 생성 쪽과 같은 이유로 `createManyAndReturn`(=INSERT ... RETURNING) 한 문장이다.
  // 문장이 하나뿐이므로 트랜잭션 래퍼 없이도 전부 아니면 전무다 — 채택 묶음이 반쯤
  // 저장되는 일이 없다. 반환 순서는 입력 순서라 응답 순서도 화면이 보낸 그대로다.
  // exam-wiring: 기출아님 — AI 변형본만 넣는다. 원본 시험지가 없다
  const created = await db.problem.createManyAndReturn({
    data: parsed.data.items.map((item, at) => ({
      userId: session.id,
      unitId: origin.unitId,
      source: "transformed",
      originProblemId: origin.id,
      // 🔴 **변형본은 원본과 같은 문항류다** (원장님 지적 2026-08-27:
      //    「새로운 문항류로 전부 되어버리네 사실 같은 문항류 같은데」).
      //
      //    안 적으면 트리거(`problem_code_assign`)가 `solo:<uuid>` 를 새로 만든다.
      //    실측: 원본 `J10101-A07-001` 을 5번 변형했더니 `A14-001`~`A18-001` —
      //    **다섯이 전부 다른 문항류**가 됐다. 엔진 쪽은 같은 류가
      //    `A12-001·003·005` 로 번호를 이어 가는데 변형만 어긋난다.
      //
      //    번호가 흉한 것보다 **출제가 더 문제다**: `familyIdOf` 가 문항류로
      //    묶어 「한 시험지에 한 문항류」(D-105 · 원장님 2026-08-26 「같은 문제류는
      //    1개만 출제되도록 해」)를 거는데, 류가 갈리면 그 규칙이 **변형본에는
      //    안 걸린다** — 원본과 변형 다섯이 한 장에 같이 실릴 수 있다.
      //    숫자만 다른 같은 문제가 나란히 나오는, 그 지시가 막으려던 바로 그 모습이다.
      //
      //    원본이 키가 없으면(레거시·AI 생성) `null` 을 넘겨 종전대로 트리거가
      //    `solo:` 를 만들게 둔다 — 그때는 **원본도 혼자**라 물려받을 류가 없다.
      familyKey: origin.familyKey,
      difficulty,
      problemType: origin.problemType,
      // 형식을 **여기서** 적는다. 안 적으면 `classifyFormat` 이 가를 근거를 못 찾아
      // 화면에 `[?형식]` 이 뜬다 — AI 생성 경로가 정확히 그래서 8건을 냈다
      // (원장님 지적 2026-08-26). 변형본의 `familyKey` 도 트리거가 `solo:` 로 채우므로
      // 엔진 표지로 구제되지 않는다.
      //
      // 판정은 생성 쪽과 **같은 함수**다 — 규칙을 두 벌 적으면 한쪽만 고쳐도 아무도 모른다.
      // ⚠️ 넘기는 본문은 **DB 에 들어갈 그 문자열**이어야 한다(아래 `content` 와 같은 값).
      questionType: deriveQuestionType({
        content: item.content,
        answer: item.answer,
        problemType: origin.problemType,
      }),
      content: item.content,
      answer: item.answer,
      solution: item.solution,
      solutionSource: item.solution?.trim() ? "ai" : "none",
      figureSvg: figureSvgs[at],
      figureSource: figureSvgs[at] ? "engine" : null,
      reviewStatus: "pending",
    })),
  });

  return jsonOk(
    problemTransformAdoptResponseSchema,
    {
      data: created.map((row) =>
        serializeProblem({
          ...row,
          sourceReference: provenance?.sourceReference ?? null,
        }),
      ),
    },
    { status: 201 },
  );
}

export const POST = withErrorLog("/api/problems/transform/adopt", handlePost);
