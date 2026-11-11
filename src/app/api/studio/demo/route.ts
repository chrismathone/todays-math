import {
  authorizeStudio,
  STUDIO_HEADERS as headers,
} from "@/lib/studio-ai/guard";
import { isStudioDemoAccount } from "@/lib/studio-demo/accounts";
import { STUDIO_DEMO_SOURCE } from "@/lib/studio-demo/source";
import { readStudioDemo, writeStudioDemo } from "@/lib/studio-demo/store";
import {
  STUDIO_DEMO_MAX_BODY_BYTES,
  StudioDemoSaveSchema,
} from "@/contracts/studioDemo.contract";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
export const runtime = "nodejs";

/**
 * 문제 추출 시연의 녹화본(원장님 2026-11-11). 시연 계정이 시연 PDF 를 열었을 때만 읽고 쓴다 —
 * 둘 중 하나라도 아니면 없는 것처럼 404 다(다른 계정의 화면은 평소와 같이 실제로 분석한다).
 */
const notFound = () =>
  Response.json({ error: "시연 자료가 없습니다." }, { status: 404, headers });
const demoSource = (email: string, sha256: unknown) =>
  isStudioDemoAccount(email) && sha256 === STUDIO_DEMO_SOURCE.sha256;

async function handleGet(request: Request) {
  const access = await authorizeStudio(request);
  if (access.response) return access.response;
  const sha256 = new URL(request.url).searchParams.get("sha256");
  if (!demoSource(access.user!.email, sha256)) return notFound();
  return Response.json(
    { entries: await readStudioDemo(STUDIO_DEMO_SOURCE.sha256) },
    { headers },
  );
}

async function handlePost(request: Request) {
  const access = await authorizeStudio(request);
  if (access.response) return access.response;
  if (
    Number(request.headers.get("content-length")) > STUDIO_DEMO_MAX_BODY_BYTES
  )
    return Response.json(
      { error: "시연 자료가 너무 큽니다." },
      { status: 413, headers },
    );
  const raw = await request.text();
  if (raw.length > STUDIO_DEMO_MAX_BODY_BYTES)
    return Response.json(
      { error: "시연 자료가 너무 큽니다." },
      { status: 413, headers },
    );
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json(
      { error: "시연 자료를 읽지 못했습니다." },
      { status: 400, headers },
    );
  }
  const sha256 = (body as { sha256?: unknown } | null)?.sha256;
  if (!demoSource(access.user!.email, sha256)) return notFound();
  const parsed = StudioDemoSaveSchema.safeParse(body);
  if (!parsed.success)
    return Response.json(
      { error: "시연 자료의 모양이 올바르지 않습니다." },
      { status: 400, headers },
    );
  await writeStudioDemo(
    parsed.data.sha256,
    parsed.data.entries,
    access.user!.id,
  );
  return Response.json({ saved: parsed.data.entries.length }, { headers });
}

export const GET = withErrorLog("/api/studio/demo", handleGet);
export const POST = withErrorLog("/api/studio/demo", handlePost);
