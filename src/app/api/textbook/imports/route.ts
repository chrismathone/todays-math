/**
 * POST /api/textbook/imports — 올려 둔 패키지를 보관본으로 두거나(`archive`) 새 원고로 복사한다(`copy`).
 * 패키지는 먼저 `PUT /api/textbook/uploads/{sha256}` 로 올리고 끝맺는다 — 여기에는 그 올리기의 id 가 온다.
 * 검증을 못 지난 패키지는 어느 표에도 들어가지 않고, 사유가 `issues` 로 온다.
 */
import {
  textbookImportResultSchema,
  textbookImportSchema,
} from "@/contracts/textbook.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { readTextbookArchive } from "@/lib/textbook/archive/package.server";
import { createFigureLoader } from "@/lib/textbook/server/figureBytes";
import {
  data,
  readBody,
  requestKeyOf,
  textbookRoute,
} from "@/lib/textbook/server/http";
import { importPackage } from "@/lib/textbook/server/imports";

export const runtime = "nodejs";
export const maxDuration = 300;

const loadFigure = createFigureLoader();

export const POST = withErrorLog("/api/textbook/imports", (request: Request) =>
  textbookRoute(request, async ({ actor, db }) => {
    const body = await readBody(request, textbookImportSchema);
    const result = await importPackage(
      db,
      actor,
      requestKeyOf(actor, "import", body, {}),
      body,
      readTextbookArchive,
      loadFigure,
    );
    return data(textbookImportResultSchema, result);
  }),
);
