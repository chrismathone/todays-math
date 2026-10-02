import { db } from "@/lib/db";
import { pagination } from "@/lib/adminAccounts";
import {
  authorizePrivate,
  documentDto,
  documentSummarySelect,
  privateHeaders,
  readableDocumentWhere,
} from "@/lib/privateWorkspace";
import { documentKindSchema } from "@/contracts/privateWorkspace.contract";
export async function listDocuments(request: Request, owner?: string) {
  const access = await authorizePrivate(request, owner);
  if (access.response) return access.response;
  const url = new URL(request.url),
    { page, pageSize } = pagination(url, 20);
  const kind = documentKindSchema.safeParse(url.searchParams.get("kind"));
  const where = {
    ...(owner || url.searchParams.get("mine") === "true"
      ? { userId: access.ownerId! }
      : readableDocumentWhere(access.account!)),
    ...(kind.success ? { kind: kind.data } : {}),
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
  return Response.json(
    {
      data: items.map((item) => documentDto(item, access.account!.id)),
      meta: { page, pageSize, total },
    },
    { headers: privateHeaders },
  );
}
