import { db } from "@/lib/db";
import { pagination } from "@/lib/adminAccounts";
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
import { documentKindSchema } from "@/contracts/privateWorkspace.contract";
import {
  listDocumentWorkflows,
  workflowDocumentKey,
} from "@/lib/privateDocumentWorkflow";
export async function listDocuments(request: Request, owner?: string) {
  const access = await authorizePrivate(request, owner, true);
  if (access.response) return access.response;
  const url = new URL(request.url),
    { page, pageSize } = pagination(url, 20);
  const kind = documentKindSchema.safeParse(url.searchParams.get("kind"));
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
        : {}),
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
      meta: { page, pageSize, total },
    },
    { headers: privateHeaders },
  );
}
