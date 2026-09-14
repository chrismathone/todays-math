import {
  authorizeStudio,
  STUDIO_HEADERS as headers,
} from "@/lib/studio-ai/guard";
import { studioApiPost, studioApiStatus } from "@/lib/studio-ai/handler";
import { recordAudit } from "@/lib/audit";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: Request) {
  try {
    const access = await authorizeStudio(request);
    return access.response ?? studioApiStatus();
  } catch {
    return Response.json(
      { error: "AI 연결 상태를 확인하지 못했습니다." },
      { status: 503, headers },
    );
  }
}
export async function POST(request: Request) {
  let owner: string | undefined;
  try {
    const access = await authorizeStudio(request);
    if (access.response) return access.response;
    owner = access.user!.id;
    const response = await studioApiPost(request, owner);
    await recordAudit({
      userId: owner,
      actorId: owner,
      action: "ai.execute",
      outcome: response.ok ? "success" : "failed",
      details: { status: response.status },
    });
    return response;
  } catch {
    if (owner)
      await recordAudit({
        userId: owner,
        actorId: owner,
        action: "ai.execute",
        outcome: "failed",
        details: { status: 503 },
      });
    return Response.json(
      { error: "AI 연결을 확인하지 못했습니다." },
      { status: 503, headers },
    );
  }
}
