/**
 * POST /api/textbook/books/{bookId}/editions — 새 판본(빈 초안 또는 발행본 복제). 책마다 초안은 하나다.
 */
import {
  textbookCreateEditionSchema,
  textbookEditionDetailSchema,
} from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { createEdition } from "@/lib/textbook/server/books";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";

type Context = { params: Promise<{ bookId: string }> };

export const POST = withErrorLog(
  "/api/textbook/books/[bookId]/editions",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const bookId = uuidParam((await context.params).bookId, "교재");
      const body = await readBody(request, textbookCreateEditionSchema);
      const { edition } = await createEdition(
        db,
        actor,
        bookId,
        requestKeyOf(actor, "edition-create", body, { bookId }),
        { sourceEditionId: body.sourceEditionId, label: body.label },
      );
      return data(textbookEditionDetailSchema, edition, 201);
    }),
);
