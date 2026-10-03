import { NextResponse, type NextRequest } from "next/server";
import { beginSso, EYWA_V2_COOKIE, ssoCookie } from "@/lib/eywa/managedSso";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
async function get(request: NextRequest) {
  try {
    const flow = await beginSso(
      request.nextUrl.searchParams.get("bindingId") ?? "",
      request.nextUrl.origin,
    );
    const response = NextResponse.redirect(flow.url, 303);
    response.cookies.set(
      ssoCookie(
        EYWA_V2_COOKIE,
        flow.cookie,
        request.nextUrl.protocol === "https:",
      ),
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return NextResponse.redirect(
      new URL("/login?eywa=unavailable", request.nextUrl),
      303,
    );
  }
}
export const GET = withErrorLog("/api/sso/eywa/v2/start", get);
