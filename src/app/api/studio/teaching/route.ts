import { authorizeStudio } from "@/lib/studio-ai/guard";
import { loadTeachingData } from "@/lib/studio-ai/teaching";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

const headers = { "Cache-Control": "private, no-store" };

/** Bootstrap the embedded teaching area; never expose teaching data anonymously. */
async function handleGet(request: Request) {
  try {
    const access = await authorizeStudio(request);
    if (access.response) return access.response;
    const user = access.user!;

    const data = await loadTeachingData(
      user,
      new URL(request.url).searchParams.get("classes") === "1",
    );
    return Response.json({ data }, { headers });
  } catch {
    return Response.json(
      { error: "수업 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 503, headers },
    );
  }
}

export const GET = withErrorLog("/api/studio/teaching", handleGet);
