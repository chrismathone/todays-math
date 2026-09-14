import { getAccountAccess } from "@/lib/accountAccess";

export async function GET() {
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
