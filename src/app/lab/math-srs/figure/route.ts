import { supportedTiers } from "@/lib/elementary/generate";
import type { ElemTier } from "@/lib/elementary/difficulty";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { getCourseSection } from "@/lib/math-srs/elementary/catalog";
import { courseFigureCandidates } from "@/lib/math-srs/elementary/courseFigureCandidates";
import { courseFigureFingerprint } from "@/lib/math-srs/elementary/figureFingerprint";

export const runtime = "nodejs";
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const section = getCourseSection(query.get("sectionId") ?? "");
  const rawSeed = query.get("seed") ?? "";
  const seed = Number(rawSeed);
  const tier = query.get("tier") as ElemTier;
  if (
    !section ||
    !/^\d{1,10}$/.test(rawSeed) ||
    !Number.isSafeInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff ||
    !supportedTiers(section.unit).includes(tier)
  ) {
    return Response.json(
      { error: "그림 요청을 확인해 주세요." },
      { status: 400 },
    );
  }
  const spec = query.get("spec");
  const key = JSON.stringify([section.id, seed, tier, spec]);
  function image(svg: string) {
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  const cached = cache.get(key);
  if (cached) return image(cached);
  if (!pending.has(key)) {
    if (pending.size >= 4)
      return Response.json(
        { error: "그림을 준비 중이에요. 잠시 후 다시 시도해 주세요." },
        { status: 503, headers: { "Retry-After": "2" } },
      );
    const task = (async () => {
      const candidates = courseFigureCandidates(section.unit, seed, tier);
      const original =
        spec === null
          ? candidates[0]
          : candidates.find(
              (candidate) =>
                candidate.figureSpec &&
                courseFigureFingerprint(candidate.figureSpec) === spec,
            );
      if (!original?.figureSpec) return null;
      const result = await renderFigureSpec(original.figureSpec);
      if (!result.ok) throw new Error("Figure rendering failed");
      if (cache.size >= 128) cache.delete(cache.keys().next().value!);
      cache.set(key, result.svg);
      return result.svg;
    })();
    pending.set(key, task);
  }
  try {
    const svg = await pending.get(key)!;
    return svg
      ? image(svg)
      : Response.json({ error: "그림이 없는 문제입니다." }, { status: 404 });
  } catch {
    return Response.json(
      { error: "그림을 불러오지 못했어요. 다시 시도해 주세요." },
      { status: 503 },
    );
  } finally {
    pending.delete(key);
  }
}
