import {
  authorizeStudio,
  STUDIO_HEADERS as headers,
} from "@/lib/studio-ai/guard";
import { studioApiPost, studioApiStatus } from "@/lib/studio-ai/handler";
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
  try {
    const access = await authorizeStudio(request);
    return access.response ?? (await studioApiPost(request, access.user!.id));
  } catch {
    return Response.json(
      { error: "AI 연결을 확인하지 못했습니다." },
      { status: 503, headers },
    );
  }
}
