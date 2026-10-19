import { db } from "@/lib/db";
import { pagination } from "@/lib/adminAccounts";
import { arithmeticSheetWriterEnabled } from "@/lib/arithmeticDocumentPolicy";
import {
  authorizePrivate,
  documentDto,
  documentSummarySelect,
  privateHeaders,
  readableDocumentWhere,
  privateDocumentKinds,
  privateError,
} from "@/lib/privateWorkspace";
import {
  documentKindSchema,
  LIBRARY_DOCUMENT_KINDS,
  libraryDocumentKindSchema,
  type DocumentKind,
} from "@/contracts/privateWorkspace.contract";
import {
  listDocumentWorkflows,
  workflowDocumentKey,
} from "@/lib/privateDocumentWorkflow";
import { listDocumentTags } from "@/lib/privateDocumentTags";
export async function listDocuments(request: Request, owner?: string) {
  const access = await authorizePrivate(request, owner, true);
  if (access.response) return access.response;
  const url = new URL(request.url),
    { page, pageSize } = pagination(url, 20);
  const kind = libraryDocumentKindSchema.safeParse(
    url.searchParams.get("kind"),
  );
  // 출제 조건(W5) · 내 양식(W6)은 같은 표에 있지만 자료가 아니다 — 목록 · 수 어디에도 싣지 않는다(종류를 콕 집어 물어도).
  const requested = documentKindSchema.safeParse(url.searchParams.get("kind"));
  const libraryKinds: DocumentKind[] =
    requested.success && !kind.success ? [] : [...LIBRARY_DOCUMENT_KINDS];
  const allowedKinds = owner
    ? [...LIBRARY_DOCUMENT_KINDS]
    : privateDocumentKinds(access.account!);
  if (kind.success && !allowedKinds.includes(kind.data))
    return privateError("이 자료 목록을 볼 권한이 없습니다.", 403);
  const where = {
    ...(owner || url.searchParams.get("mine") === "true"
      ? { userId: access.ownerId! }
      : readableDocumentWhere(access.account!)),
    kind: kind.success
      ? kind.data
      : { in: libraryKinds.filter((item) => allowedKinds.includes(item)) },
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
  // 시험지 태그(W8) — 진행 단계와 같은 방식(허락한 행의 짧은 글 하나).
  const tags = await listDocumentTags(items);
  return Response.json(
    {
      data: items.map((item) => ({
        ...documentDto(item, access.account!.id),
        ...(workflows.has(workflowDocumentKey(item))
          ? { workflow: workflows.get(workflowDocumentKey(item)) }
          : {}),
        ...(tags.has(workflowDocumentKey(item))
          ? { tag: tags.get(workflowDocumentKey(item)) }
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
