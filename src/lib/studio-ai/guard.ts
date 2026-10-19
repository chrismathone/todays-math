import "server-only";
import { auth } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { routeAccessFor } from "@/lib/routeAccess";
import { STUDIO_HEADERS } from "./http";
export { STUDIO_HEADERS } from "./http";
export async function authorizeStudio(request?: Request) {
  const user = await getSessionUser();
  if (!user)
    return {
      user: null,
      response: Response.json(
        { error: "로그인이 필요합니다." },
        { status: 401, headers: STUDIO_HEADERS },
      ),
    };
  const session = await auth();
  const role = session?.user?.role === "reviewer" ? "reviewer" : "director";
  if (
    !session?.user?.id ||
    (user.isAdmin !== true &&
      routeAccessFor(
        role,
        request?.method ?? "GET",
        request ? new URL(request.url).pathname : "/studio",
      ) === "deny")
  )
    return {
      user: null,
      response: Response.json(
        { error: "이 작업을 사용할 권한이 없습니다." },
        { status: 403, headers: STUDIO_HEADERS },
      ),
    };
  if (request?.method === "POST") {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    // Trust neither forwarded headers nor a client-supplied host as a new origin.
    const configured = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
    const expected = configured ? new URL(configured).origin : url.origin;
    if (
      origin !== expected ||
      request.headers.get("sec-fetch-site") === "cross-site"
    )
      return {
        user: null,
        response: Response.json(
          { error: "같은 사이트에서 요청해 주세요." },
          { status: 403, headers: STUDIO_HEADERS },
        ),
      };
  }
  return { user, response: null };
}
