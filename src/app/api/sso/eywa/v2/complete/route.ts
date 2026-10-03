import { NextResponse, type NextRequest } from "next/server";
import { signIn } from "@/lib/auth";
import { sameOriginMutation } from "@/lib/accountAccess";
import {
  EYWA_V2_PROVIDER,
  EYWA_V2_TICKET,
  ssoCookie,
} from "@/lib/eywa/managedSso";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
async function post(request: NextRequest) {
  if (!sameOriginMutation(request)) return new Response(null, { status: 403 });
  const input = await request.formData();
  let destination = "/login?eywa=retry";
  if (input.get("confirm") === "yes") {
    try {
      await signIn(EYWA_V2_PROVIDER, {
        ticket: request.cookies.get(EYWA_V2_TICKET)?.value,
        redirect: false,
      });
      destination = "/?entry=login";
    } catch {
      /* Single-use tickets are never revived. */
    }
  }
  const response = NextResponse.redirect(
    new URL(destination, request.nextUrl),
    303,
  );
  response.cookies.set(
    ssoCookie(EYWA_V2_TICKET, "", request.nextUrl.protocol === "https:", 0),
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
export const POST = withErrorLog("/api/sso/eywa/v2/complete", post);
