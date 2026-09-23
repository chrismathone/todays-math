import { generateCourseSession } from "@/lib/math-srs/elementary/generator";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const sectionId = query.get("sectionId") ?? "";
  const rawSeed = query.get("seed") ?? "";
  const seed = Number(rawSeed);
  const mode = query.get("mode") ?? "learn";
  if (
    !getCourseSection(sectionId) ||
    !/^\d{1,10}$/.test(rawSeed) ||
    !Number.isSafeInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !["learn", "review"].includes(mode)
  ) {
    return Response.json(
      { error: "올바른 학습 차시를 선택해 주세요." },
      { status: 400 },
    );
  }
  try {
    return Response.json(
      generateCourseSession(
        sectionId,
        seed,
        new Date(),
        mode as "learn" | "review",
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "문제를 준비하지 못했어요. 다시 시도해 주세요." },
      { status: 503 },
    );
  }
}
