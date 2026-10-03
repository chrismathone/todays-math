import { textbookBlankResultSchema } from "@/contracts/textbookBlank.contract";
import { textbookKeySchema } from "@/contracts/textbookPrimitives.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { loadTeacherBlank } from "@/lib/textbook/frozenBlank";
import { notFound } from "@/lib/textbook/server/errors";
import { data, textbookRoute, uuidParam } from "@/lib/textbook/server/http";

type Context = { params: Promise<{ editionId: string; conceptKey: string }> };

export const GET = withErrorLog(
  "/api/textbook/editions/[editionId]/concepts/[conceptKey]/blank",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const params = await context.params;
      const key = textbookKeySchema.safeParse(params.conceptKey);
      if (!key.success) throw notFound("개념");
      return data(
        textbookBlankResultSchema,
        await loadTeacherBlank(
          db,
          actor,
          uuidParam(params.editionId, "판본"),
          key.data,
        ),
      );
    }),
);
