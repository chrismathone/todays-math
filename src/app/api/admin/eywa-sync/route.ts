import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import { approveManagedCandidate } from "@/lib/eywa/managedAccounts";
import {
  configureManagedBinding,
  managedStatus,
  previewManagedBinding,
} from "@/lib/eywa/managedAdministration";
import { receiverFailure } from "@/lib/eywa/managedTransport";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
async function get(request: Request) {
  const access = await authorizeAccount(request, true);
  if (access.response) return access.response;
  try {
    const preview = new URL(request.url).searchParams.get("preview");
    if (preview && !access.account.isSuperAdmin)
      return new Response(null, { status: 403 });
    return Response.json(
      preview
        ? await previewManagedBinding(preview)
        : await managedStatus(access.account),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return receiverFailure(error);
  }
}
async function post(request: Request) {
  const access = await authorizeAccount(request, true);
  if (access.response) return access.response;
  try {
    const input = z
      .discriminatedUnion("action", [
        z.object({
          action: z.literal("approve"),
          id: z.uuid(),
          version: z.string().length(64),
          evidence: z.string().trim().min(30).max(1000),
        }),
        z.object({
          action: z.enum([
            "register",
            "activate",
            "shadow",
            "retire",
            "rebaseline",
            "retry",
          ]),
          bindingId: z.uuid(),
          archiveOwnerUserId: z.uuid().optional(),
          evidence: z.string().max(1000).optional(),
        }),
      ])
      .parse(await request.json());
    const result =
      input.action === "approve"
        ? await approveManagedCandidate(access.account, {
            ...input,
            method: "operator",
          })
        : await configureManagedBinding(access.account, input);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return receiverFailure(error);
  }
}
export const GET = withErrorLog("/api/admin/eywa-sync", get);
export const POST = withErrorLog("/api/admin/eywa-sync", post);
