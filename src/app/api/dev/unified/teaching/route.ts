import { getSessionUser } from "@/lib/session";
import { loadTeachingData } from "@/lib/studio-ai/teaching";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

const headers = { "Cache-Control": "private, no-store" };

/** Bootstrap the embedded teaching area; never expose teaching data anonymously. */
async function handleGet(request?: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new Response(null, { status: 404, headers });
  }

  try {
    const user = await getSessionUser();
    if (!user) {
      return Response.json(
        { error: "수업 관리를 이용하려면 로그인해 주세요." },
        { status: 401, headers },
      );
    }

    const data = await loadTeachingData(
      user,
      Boolean(
        request && new URL(request.url).searchParams.get("classes") === "1",
      ),
    );
    return Response.json({ data }, { headers });
  } catch {
    return Response.json(
      { error: "수업 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503, headers },
    );
  }
}

export const GET = withErrorLog("/api/dev/unified/teaching", handleGet);
