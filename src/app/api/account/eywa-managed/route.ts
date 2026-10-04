import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import { approveManagedCandidate } from "@/lib/eywa/managedAccounts";
import { managedStatus } from "@/lib/eywa/managedAdministration";
import { readStatusPages } from "@/lib/admin/accountUsability";
import { receiverFailure } from "@/lib/eywa/managedTransport";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
async function get(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access.response;
  return Response.json(
    await managedStatus(
      access.account,
      true,
      readStatusPages(new URL(request.url)),
    ),
    { headers: { "Cache-Control": "no-store" } },
  );
}
async function post(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access.response;
  try {
    const input = z
      .object({
        id: z.uuid(),
        version: z.string().length(64),
        password: z.string().min(1).max(72),
      })
      .parse(await request.json());
    return Response.json(
      await approveManagedCandidate(access.account, {
        ...input,
        method: "owner",
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return receiverFailure(error);
  }
}
export const GET = withErrorLog("/api/account/eywa-managed", get);
export const POST = withErrorLog("/api/account/eywa-managed", post);
