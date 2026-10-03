import { NextResponse, type NextRequest } from "next/server";
import { auth, signIn } from "@/lib/auth";
import {
  exchangeSso,
  EYWA_V2_COOKIE,
  EYWA_V2_PROVIDER,
  EYWA_V2_TICKET,
  ssoCookie,
} from "@/lib/eywa/managedSso";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
async function get(request: NextRequest) {
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  try {
    const p = request.nextUrl.searchParams;
    const result = await exchangeSso({
      cookie: request.cookies.get(EYWA_V2_COOKIE)?.value,
      code: p.get("code") ?? "",
      state: p.get("state") ?? "",
      bindingId: p.get("bindingId") ?? "",
      origin: request.nextUrl.origin,
    });
    let destination = "/?entry=login";
    const session = await auth();
    if (result.candidateId)
      destination = `/account/eywa-managed?candidate=${result.candidateId}`;
    else if (
      (session?.user?.id && session.user.id !== result.userId) ||
      session?.student
    )
      destination = "/account/eywa-switch";
    else
      await signIn(EYWA_V2_PROVIDER, {
        ticket: result.ticket,
        redirect: false,
      });
    const response = NextResponse.redirect(
      new URL(destination, request.nextUrl),
      { status: 303, headers },
    );
    response.cookies.set(
      ssoCookie(EYWA_V2_COOKIE, "", request.nextUrl.protocol === "https:", 0),
    );
    if (destination === "/account/eywa-switch" && result.ticket)
      response.cookies.set(
        ssoCookie(
          EYWA_V2_TICKET,
          result.ticket,
          request.nextUrl.protocol === "https:",
        ),
      );
    return response;
  } catch {
    const response = NextResponse.redirect(
      new URL("/login?eywa=retry", request.nextUrl),
      { status: 303, headers },
    );
    response.cookies.set(
      ssoCookie(EYWA_V2_COOKIE, "", request.nextUrl.protocol === "https:", 0),
    );
    return response;
  }
}
export const GET = withErrorLog("/api/sso/eywa/v2/callback", get);
