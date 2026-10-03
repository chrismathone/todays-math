/**
 * GET  /api/textbook/books — 내 책 + 지금 내 지점에 공유된 발행본이 있는 책
 * POST /api/textbook/books — 새 책(책 + 1판 초안)
 */
import {
  textbookBookListSchema,
  textbookBookSummarySchema,
  textbookCreateBookSchema,
} from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { createBook, listBooks } from "@/lib/textbook/server/books";
import { textbookHeaders } from "@/lib/textbook/server/authorize";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
} from "@/lib/textbook/server/http";

export const GET = withErrorLog("/api/textbook/books", (request: Request) =>
  textbookRoute(request, async ({ actor, db }) =>
    Response.json(
      textbookBookListSchema.parse({ data: await listBooks(db, actor) }),
      { headers: textbookHeaders },
    ),
  ),
);

export const POST = withErrorLog("/api/textbook/books", (request: Request) =>
  textbookRoute(request, async ({ actor, db }) => {
    const body = await readBody(request, textbookCreateBookSchema);
    const { book } = await createBook(
      db,
      actor,
      requestKeyOf(actor, "book-create", body, {}),
      { config: body.config },
    );
    return data(textbookBookSummarySchema, book, 201);
  }),
);
