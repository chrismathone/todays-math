import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  documentWorkflow,
  type DocumentWorkflow,
} from "@/contracts/workspaceWorkflow.contract";

type AuthorizedDocument = {
  userId: string;
  id: string;
  kind: string;
  revision: number;
};
export const workflowDocumentKey = (
  item: Pick<AuthorizedDocument, "userId" | "id">,
) => JSON.stringify([item.userId, item.id]);

/** Only call after the existing owner/branch/admin list has authorized this page.
 * Project bounded scalars in Postgres: no payload, crop, image, or asset reads.
 * Matching the revision also avoids attaching metadata from a later edit/share.
 */
export async function listDocumentWorkflows(items: AuthorizedDocument[]) {
  const eligible = items.filter((item) =>
    ["draft", "extraction", "arithmeticSheet"].includes(item.kind),
  );
  const result = new Map<string, DocumentWorkflow>();
  if (!eligible.length) return result;
  if (eligible.length > 100)
    throw new Error("Workflow projection requires a bounded list page.");
  const rows = await db.$queryRaw<
    (AuthorizedDocument & { metadata: unknown })[]
  >(Prisma.sql`
    SELECT user_id AS "userId", id, kind, revision,
      jsonb_build_object(
        'workflow', jsonb_build_object(
          'source', left(payload #>> '{workflow,source}', 16),
          'step', left(payload #>> '{workflow,step}', 16),
          'sourceDocumentId', CASE WHEN jsonb_typeof(payload #> '{workflow,sourceDocumentId}') = 'string'
            THEN left(payload #>> '{workflow,sourceDocumentId}', 101) ELSE NULL END
        ),
        'data', jsonb_build_object('step', left(payload #>> '{data,step}', 16)),
        'presentation', jsonb_build_object(
          'version', CASE WHEN payload #> '{presentation,version}' = '1'::jsonb THEN 1 ELSE NULL END,
          'step', left(payload #>> '{presentation,step}', 16)
        )
      ) AS metadata
    FROM workspace_document
    WHERE ${Prisma.join(
      eligible.map(
        (item) =>
          Prisma.sql`(user_id = ${item.userId}::uuid AND id = ${item.id} AND revision = ${item.revision})`,
      ),
      " OR ",
    )}
  `);
  const allowed = new Map(
    eligible.map((item) => [workflowDocumentKey(item), item]),
  );
  for (const row of rows) {
    const key = workflowDocumentKey(row);
    const original = allowed.get(key);
    if (
      !original ||
      row.revision !== original.revision ||
      row.kind !== original.kind
    )
      continue;
    const workflow = documentWorkflow(row.kind, row.metadata);
    if (workflow) result.set(key, workflow);
  }
  return result;
}
