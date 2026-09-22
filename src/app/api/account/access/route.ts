import { getAccountAccess } from "@/lib/accountAccess";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

async function handleGet() {
  const data = await getAccountAccess();
  return Response.json(
    data
      ? { data }
      : { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
    {
      status: data ? 200 : 401,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export const GET = withErrorLog("/api/account/access", handleGet);
