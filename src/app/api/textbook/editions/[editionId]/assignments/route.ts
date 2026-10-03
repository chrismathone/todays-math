/**
 * GET  …/assignments — 이 판본을 내 반 · 내 학생에게 건 배정들
 * POST …/assignments — 배정(반 또는 학생 하나 · 판본 전체 / 구획들 / 배치들 · 시작 ~ 만료). 발행본에만
 */
import { z } from "zod";

import {
  textbookAssignmentSchema,
  textbookCreateAssignmentSchema,
} from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import {
  createAssignment,
  listAssignments,
} from "@/lib/textbook/server/assignments";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";

type Context = { params: Promise<{ editionId: string }> };

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]/assignments",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) =>
      data(
        z.array(textbookAssignmentSchema),
        await listAssignments(
          db,
          actor,
          uuidParam((await context.params).editionId, "판본"),
        ),
      ),
    ),
);

export const POST = withErrorLog(
  "/api/textbook/editions/[editionId]/assignments",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const editionId = uuidParam((await context.params).editionId, "판본");
      const body = await readBody(request, textbookCreateAssignmentSchema);
      const { assignment, replayed } = await createAssignment(
        db,
        actor,
        editionId,
        requestKeyOf(actor, "assign", body, { editionId }),
        body,
      );
      return data(textbookAssignmentSchema, assignment, replayed ? 200 : 201);
    }),
);
