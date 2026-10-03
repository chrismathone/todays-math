/**
 * PATCH /api/textbook/books/{bookId} — 목록 제목 · 공유 · 보관. 주인만.
 */
import {
  textbookBookSummarySchema,
  textbookUpdateBookSchema,
} from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { updateBook } from "@/lib/textbook/server/books";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
  uuidParam,
} from "@/lib/textbook/server/http";

type Context = { params: Promise<{ bookId: string }> };

export const PATCH = withErrorLog(
  "/api/textbook/books/[bookId]",
  (request: Request, context: Context) =>
    textbookRoute(request, async ({ actor, db }) => {
      const bookId = uuidParam((await context.params).bookId, "교재");
      const body = await readBody(request, textbookUpdateBookSchema);
      const { book } = await updateBook(
        db,
        actor,
        bookId,
        requestKeyOf(actor, "book-update", body, { bookId }),
        body,
      );
      return data(textbookBookSummarySchema, book);
    }),
);
