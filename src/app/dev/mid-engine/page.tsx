import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { MathText } from "@/components/math/MathText";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";

/**
 * 중1~중3 자체 출제 엔진 QA — **눈으로 보는 자리**.
 *
 * `/dev/elem-engine` 의 중등 판이다. 초등만 있고 중등이 없어서, 유형을 더한 뒤
 * 「지면에서 어떻게 보이나」를 확인할 곳이 **코드와 시험밖에** 없었다. 이 저장소가
 * 여러 번 겪은 그 자리다 — 값 검산·KaTeX·렌더 성공이 셋 다 초록인 채로 지면만
 * 거짓말한다(2026-08-24 「값이 맞으면 시험이 다 초록이다」·2026-08-29 「화면에는
 * 나오는데 종이에만 없었다」).
 *
 * 공유 DB 에 넣지 않는다. 여기 나오는 것은 **엔진이 지금 내는 것**이지 적재본이
 * 아니다 — 둘은 다른 물음이다(2026-08-27).
 *
 * 그림이 안 그려지면 **빨간 사유를 그 자리에 찍는다.** 적재기는 렌더가 실패해도
 * 문항을 그림 없이 넣으므로, 여기서 안 보이면 종이에서도 안 보인다.
 */
export default async function MidEnginePage({
  searchParams,
}: {
  searchParams: Promise<{
    grade?: string;
    section?: string;
    seed?: string;
    variant?: string;
  }>;
}) {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }

  const query = await searchParams;
  const all = registeredTypes();
  const grades = [...new Set(all.map((t) => t.grade))].sort();
  const grade = grades.includes(query.grade ?? "")
    ? query.grade!
    : (grades[0] ?? "중1");
  const inGrade = all.filter((t) => t.grade === grade);
  const sections = [...new Set(inGrade.map((t) => t.unitSection))].sort();
  const section = sections.includes(query.section ?? "")
    ? query.section!
    : (sections[0] ?? "");
  const seed = Number(query.seed ?? 20260829);
  const variant = Number(query.variant ?? 0);

  const types = inGrade.filter((t) => t.unitSection === section);
  const drawn = await Promise.all(
    types.map(async (t) => {
      try {
        const p = generateMiddleProblem(t.key, seed, variant);
        if (!p.figureSpec)
          return {
            t,
            p,
            figureSvg: null as string | null,
            error: null as string | null,
          };
        const svg = await renderFigureSpec(p.figureSpec);
        return {
          t,
          p,
          figureSvg: svg.ok ? svg.svg : null,
          error: svg.ok ? null : svg.error,
        };
      } catch (e) {
        return {
          t,
          p: null,
          figureSvg: null,
          error: `문항 생성 실패: ${(e as Error).message}`,
        };
      }
    }),
  );

  const linkBase = (next: Record<string, string>): string => {
    const q = new URLSearchParams({
      grade,
      section,
      seed: String(seed),
      variant: String(variant),
      ...next,
    });
    return `/dev/mid-engine?${q.toString()}`;
  };

  return (
    <main className="mx-auto max-w-[760px] px-6 py-8">
      <p className="text-[11px] font-extrabold tracking-[0.16em] text-text-2">
        DEV · 중등 엔진
      </p>
      <h1 className="mt-2 text-xl font-black">중1 ~ 중3 자체 출제</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-text-2">
        등록 {all.length}유형. 이 소단원 <b>{types.length}유형</b> —
        일일테스트는 한 시험지에 같은 문항류를 하나만 쓰므로 이 수가 곧 시험지
        상한이다. 적재하지 않았다(엔진이 지금 내는 것이다).
      </p>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="학년">
        {grades.map((g) => (
          <Link
            key={g}
            href={`/dev/mid-engine?grade=${encodeURIComponent(g)}`}
            className={
              g === grade
                ? "border border-ink bg-ink px-2 py-1 text-[12px] font-bold text-white"
                : "border border-divider px-2 py-1 text-[12px] text-text-1"
            }
          >
            {g}
          </Link>
        ))}
      </nav>

      <nav className="mt-3 flex flex-wrap gap-1" aria-label="소단원">
        {sections.map((s) => (
          <Link
            key={s}
            href={linkBase({ section: s })}
            className={
              s === section
                ? "border border-ink bg-paper px-2 py-1 text-[12px] font-bold"
                : "border border-divider px-2 py-1 text-[12px] text-text-1"
            }
          >
            {s}
          </Link>
        ))}
      </nav>

      <nav className="mt-3 flex flex-wrap gap-2" aria-label="변형">
        {[0, 1, 2].map((v) => (
          <Link
            key={v}
            href={linkBase({ variant: String(v) })}
            className={
              v === variant
                ? "border border-ink bg-ink px-2 py-1 text-[12px] font-bold text-white"
                : "border border-divider px-2 py-1 text-[12px] text-text-1"
            }
          >
            변형 {v}
          </Link>
        ))}
        {[20260829, 7, 991].map((s) => (
          <Link
            key={s}
            href={linkBase({ seed: String(s) })}
            className={
              s === seed
                ? "border border-ink bg-ink px-2 py-1 text-[12px] font-bold text-white"
                : "border border-divider px-2 py-1 text-[12px] text-text-1"
            }
          >
            씨앗 {s}
          </Link>
        ))}
      </nav>

      <ol className="mt-8 space-y-8">
        {drawn.map(({ t, p, figureSvg, error }) => (
          <li key={t.key} className="border-t border-divider pt-5">
            <p className="mb-3 text-[11px] font-extrabold tracking-wide text-text-2">
              {t.rpmType} · {t.rpmTitle} · {p?.difficulty ?? "—"}
              {figureSvg ? " · 그림" : ""}
            </p>
            {error ? (
              <p className="mb-2 text-[12px] font-bold text-g-red-text">
                🔴 {error}
              </p>
            ) : null}
            {p ? (
              <>
                <PaperProblemView content={p.content} figureSvg={figureSvg} />
                <div className="mt-2 text-[12px] text-text-1">
                  <span className="font-extrabold tracking-wide text-text-2">
                    정답
                  </span>{" "}
                  <MathText as="span" text={p.answer} />
                </div>
                <div className="mt-1 text-[12px] text-text-2">
                  <p className="mb-1 font-extrabold tracking-wide">해설</p>
                  <PaperProblemView content={p.solution} framed={false} />
                </div>
              </>
            ) : null}
          </li>
        ))}
      </ol>
    </main>
  );
}
