import { db } from "@/lib/db";
import { pagination } from "@/lib/adminAccounts";
import { arithmeticSheetWriterEnabled } from "@/lib/arithmeticDocumentPolicy";
import {
  authorizePrivate,
  documentDto,
  documentSummarySelect,
  privateHeaders,
  readableDocumentWhere,
  arithmeticDocumentsOnly,
  privateError,
} from "@/lib/privateWorkspace";
import { ARITHMETIC_SHEET_KIND } from "@/contracts/arithmetic.contract";
import {
  EXAM_CONDITION_KIND,
  LIBRARY_DOCUMENT_KINDS,
  libraryDocumentKindSchema,
} from "@/contracts/privateWorkspace.contract";
import {
  listDocumentWorkflows,
  workflowDocumentKey,
} from "@/lib/privateDocumentWorkflow";
export async function listDocuments(request: Request, owner?: string) {
  const access = await authorizePrivate(request, owner, true);
  if (access.response) return access.response;
  const url = new URL(request.url),
    { page, pageSize } = pagination(url, 20);
  const kind = libraryDocumentKindSchema.safeParse(
    url.searchParams.get("kind"),
  );
  // 출제 조건(W5)은 같은 표에 있지만 자료가 아니다 — 목록 · 수 어디에도 싣지 않는다(종류를 콕 집어 물어도).
  const libraryKinds =
    url.searchParams.get("kind") === EXAM_CONDITION_KIND
      ? { in: [] as string[] }
      : { in: [...LIBRARY_DOCUMENT_KINDS] as string[] };
  const arithmeticOnly = !owner && arithmeticDocumentsOnly(access.account!);
  if (arithmeticOnly && kind.success && kind.data !== ARITHMETIC_SHEET_KIND)
    return privateError("이 자료 목록을 볼 권한이 없습니다.", 403);
  const where = {
    ...(owner || url.searchParams.get("mine") === "true"
      ? { userId: access.ownerId! }
      : readableDocumentWhere(access.account!)),
    ...(arithmeticOnly
      ? { kind: ARITHMETIC_SHEET_KIND }
      : kind.success
        ? { kind: kind.data }
        : { kind: libraryKinds }),
  };
  const [items, total] = await Promise.all([
    db.workspaceDocument.findMany({
      where,
      select: documentSummarySelect,
      orderBy: [{ updatedAt: "desc" }, { userId: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.workspaceDocument.count({ where }),
  ]);
  const workflows = await listDocumentWorkflows(items);
  return Response.json(
    {
      data: items.map((item) => ({
        ...documentDto(item, access.account!.id),
        ...(workflows.has(workflowDocumentKey(item))
          ? { workflow: workflows.get(workflowDocumentKey(item)) }
          : {}),
      })),
      // 목록이 연산 연습지의 변경 단추를 미리 잠글 수 있게 쓰기 문의 상태를 같이 보낸다 — 열기는 그대로다.
      meta: {
        page,
        pageSize,
        total,
        arithmeticWriteEnabled: arithmeticSheetWriterEnabled(),
      },
    },
    { headers: privateHeaders },
  );
}
