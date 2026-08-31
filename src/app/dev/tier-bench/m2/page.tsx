import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { MathText } from "@/components/math/MathText";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import { CORE_DIFFICULTIES } from "@/contracts/difficulty";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import { generateMiddleProblem, registeredTypes } from "@/lib/middle/generate";
import type { MidProblem, TypeEntry } from "@/lib/middle/types";

/**
 * **중2 난이도 «높이» 벤치마킹 대(臺)** — 매쓰홀릭을 옆에 띄우고 한 줄씩 대 보는 자리.
 * 보고서: `docs/planning/tracks/reports/tier-bench-m2.md`.
 *
 * ## 이 화면의 유일한 목적
 *
 * 원장님이 저쪽 화면을 옆에 놓고 **한 줄씩** 우리 네 갈래와 견주실 수 있게 하는 것.
 * 판정하지 않고, 저장하지 않고, DB 를 안 본다.
 *
 * ## 🔴 초5 화면과 다른 점 — **경로가 하나다**
 *
 * 초등은 갈래(`generateElementaryProblem`)와 문형(`generateElementaryForm`)이 둘이라
 * `/dev/tier-bench/g5` 가 두 경로를 갈라 보여 준다. **중등은 하나다** — 적재기도
 * 판정기도 `generateMiddleProblem` 을 부른다(`load-engine-problems.ts:256`).
 * 그래서 이 화면이 보여 주는 것이 곧 **지면에 나가는 것**이다.
 *
 * 대신 중등에는 초등에 없는 갈림이 있다: **난이도가 «유형»이 아니라 «문항»의 성질**이다
 * (`resolveMiddleTier` 가 발문 모양을 본다). 그래서 변형을 바꿔 보실 수 있게 했다 —
 * 같은 유형이 변형에 따라 다른 칸에 앉는 일이 실제로 3유형에서 일어난다.
 *
 * ## ⚠️ D-07 — 여기서 모양을 확정하지 않는다
 *
 * 검수용 내부 화면이다. 배치·색·글자 크기는 **아무것도 확정하지 않으며** 제품 지면과
 * 무관하다. 그래서 `/dev/tier-bench/g5` 의 차림새를 그대로 따랐다 — 새 디자인 언어를
 * 여기서 만들면 그것이 확정처럼 굳는다.
 */
const GRADE = "중2";
const DEFAULT_SEED = 20260831;

/** 씨앗 하나로 보면 「그 유형이 씨앗마다 다른 문항을 낸다」를 못 본다. */
const SEED_CHOICES = [DEFAULT_SEED, 7, 1234];
const VARIANT_CHOICES = [0, 1, 2];

type Cell = {
  entry: TypeEntry;
  problem: MidProblem | null;
  figureSvg: string | null;
  figureError: string | null;
  /** 만들다 던진 것은 **숨기지 않는다** — 빈 칸은 «없다»와 «못 만들었다»를 안 가른다. */
  genError: string | null;
};

async function build(
  entry: TypeEntry,
  seed: number,
  variant: number,
): Promise<Cell> {
  let problem: MidProblem | null = null;
  let genError: string | null = null;
  try {
    problem = generateMiddleProblem(entry.key, seed, variant);
  } catch (e) {
    genError = e instanceof Error ? e.message : String(e);
  }
  if (!problem || !problem.figureSpec)
    return { entry, problem, figureSvg: null, figureError: null, genError };
  const svg = await renderFigureSpec(problem.figureSpec);
  return {
    entry,
    problem,
    figureSvg: svg.ok ? svg.svg : null,
    figureError: svg.ok ? null : svg.error,
    genError: null,
  };
}

export default async function TierBenchM2Page({
  searchParams,
}: {
  searchParams: Promise<{ minor?: string; seed?: string; variant?: string }>;
}) {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }

  const query = await searchParams;
  const all = registeredTypes().filter((e) => e.grade === GRADE);
  const minors = [...new Set(all.map((e) => `${e.rpmBook} ${e.rpmMinor}`))];
  const minor = minors.includes(query.minor ?? "")
    ? query.minor!
    : (minors[0] ?? "");
  const seed = SEED_CHOICES.includes(Number(query.seed))
    ? Number(query.seed)
    : DEFAULT_SEED;
  const variant = VARIANT_CHOICES.includes(Number(query.variant))
    ? Number(query.variant)
    : 0;

  const inMinor = all.filter((e) => `${e.rpmBook} ${e.rpmMinor}` === minor);
  const cells = await Promise.all(inMinor.map((e) => build(e, seed, variant)));

  const sections = [...new Set(inMinor.map((e) => e.unitSection))];

  // 이 중단원의 갈래 분포 — **손으로 적은 수가 아니라 지금 화면에 그린 것을 센 값**이다.
  const byTier = new Map<string, number>();
  for (const c of cells)
    if (c.problem)
      byTier.set(
        c.problem.difficulty,
        (byTier.get(c.problem.difficulty) ?? 0) + 1,
      );
  const drawn = [...byTier.values()].reduce((a, b) => a + b, 0);
  const emptyTiers = CORE_DIFFICULTIES.filter((t) => !byTier.get(t));

  const href = (next: Record<string, string>) => {
    const p = new URLSearchParams({
      minor,
      seed: String(seed),
      variant: String(variant),
      ...next,
    });
    return `/dev/tier-bench/m2?${p.toString()}`;
  };

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <p className="text-[11px] font-extrabold tracking-[0.16em] text-text-2">
        DEV · 난이도 벤치마킹
      </p>
      <h1 className="mt-2 text-xl font-black">
        중2 난이도 사다리 — 네 갈래를 나란히
      </h1>
      <p className="mt-2 max-w-[900px] text-[13px] leading-relaxed text-text-2">
        매쓰홀릭 화면을 옆에 띄우고 <b>한 줄씩</b> 대 보시라고 만든 자리입니다.
        왼쪽부터 연산 → 기본 → 응용 → 심화하입니다. 이 화면은 아무것도 판정하지
        않습니다 — 「이 심화가 응용보다 어려운가」는 코드가 못 재는 축이라,
        보시는 것이 지금으로선 유일한 그물입니다.
      </p>
      <p className="mt-2 max-w-[900px] text-[12px] leading-relaxed text-text-3">
        ※ 검수용 내부 화면입니다. 여기 배치·색·글자 크기는 아무것도 확정하지
        않으며 제품 지면과 무관합니다(D-07).
      </p>

      <section className="mt-5 border border-divider bg-surface p-4">
        <p className="text-[12px] font-extrabold tracking-wide text-text-2">
          이 중단원의 갈래 구성 — 유형 {inMinor.length}개 · 소단원{" "}
          {sections.length}개 (씨앗 {seed} · 변형 {variant} 로 실제로 그린 것을
          센 값)
        </p>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
          {CORE_DIFFICULTIES.map((t) => {
            const n = byTier.get(t) ?? 0;
            const pct = drawn === 0 ? 0 : (n / drawn) * 100;
            return (
              <span key={t}>
                <b>{t}</b> {n}개 ({pct.toFixed(0)}%)
              </span>
            );
          })}
        </div>
        {emptyTiers.length > 0 ? (
          <p className="mt-2 text-[12px] leading-relaxed text-g-red-text">
            이 중단원에는 <b>{emptyTiers.join(" · ")}</b> 갈래가 이
            씨앗·변형에서 한 문항도 없습니다. 중2 전체로는{" "}
            <b>연산이 56소단원 중 35개에</b> 없습니다 — 하위반 프리셋(연산
            40%)이 거기서는 계속 이웃 갈래로 대체됩니다.
          </p>
        ) : null}
        <p className="mt-2 text-[12px] leading-relaxed text-text-2">
          중2 전체 실측 — 연산 4.4% · 기본 34.6% · 응용 41.8% · 심화하 19.2% ·
          심화중·심화상 <b>0</b> (유형 572 × 씨앗 4 × 변형 3 = 6,864문항).
          자세한 것은 <code>tracks/reports/tier-bench-m2.md</code>.
        </p>
      </section>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="중단원">
        {minors.map((m) => (
          <Link
            key={m}
            href={href({ minor: m })}
            className={
              m === minor
                ? "border border-ink bg-ink px-2 py-1 text-[12px] font-bold text-white"
                : "border border-divider px-2 py-1 text-[12px] text-ink"
            }
          >
            {m}
          </Link>
        ))}
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <nav className="flex flex-wrap gap-2" aria-label="씨앗">
          {SEED_CHOICES.map((s) => (
            <Link
              key={s}
              href={href({ seed: String(s) })}
              className={
                s === seed
                  ? "border border-ink bg-ink px-2 py-1 text-[12px] font-bold text-white"
                  : "border border-divider px-2 py-1 text-[12px] text-ink"
              }
            >
              씨앗 {s}
            </Link>
          ))}
        </nav>
        <nav className="flex flex-wrap gap-2" aria-label="변형">
          {VARIANT_CHOICES.map((v) => (
            <Link
              key={v}
              href={href({ variant: String(v) })}
              className={
                v === variant
                  ? "border border-ink bg-ink px-2 py-1 text-[12px] font-bold text-white"
                  : "border border-divider px-2 py-1 text-[12px] text-ink"
              }
            >
              변형 {v}
            </Link>
          ))}
        </nav>
      </div>

      <p className="mt-3 max-w-[900px] text-[12px] leading-relaxed text-text-2">
        <b>변형을 바꿔 보십시오</b> — 중등은 난이도가 유형이 아니라 <b>문항</b>
        의 성질이라(<code>resolveMiddleTier</code> 가 발문 모양을 봅니다) 같은
        유형이 변형에 따라 다른 칸에 앉는 일이 있습니다. 실측으로 3유형이
        그렇습니다.
      </p>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[1400px]">
          <div className="grid grid-cols-[150px_repeat(4,1fr)] gap-px border-b border-divider bg-divider">
            <div className="bg-canvas px-2 py-2 text-[11px] font-extrabold tracking-wide text-text-2">
              소단원
            </div>
            {CORE_DIFFICULTIES.map((t) => (
              <div
                key={t}
                className="bg-canvas px-2 py-2 text-[11px] font-extrabold tracking-wide text-text-2"
              >
                {t}
              </div>
            ))}
          </div>

          {sections.map((section) => (
            <div
              key={section}
              className="grid grid-cols-[150px_repeat(4,1fr)] gap-px border-b border-divider bg-divider"
            >
              <div className="bg-canvas px-2 py-4 text-[11px] font-bold leading-snug text-text-2">
                {section}
              </div>
              {CORE_DIFFICULTIES.map((tier) => {
                const here = cells.filter(
                  (c) =>
                    c.entry.unitSection === section &&
                    (c.problem
                      ? c.problem.difficulty === tier
                      : tier === "기본"),
                );
                return (
                  <div
                    key={tier}
                    className="space-y-3 bg-canvas px-2 py-3 align-top"
                  >
                    {here.map((cell) => (
                      <article
                        key={cell.entry.key}
                        className="border border-divider bg-surface p-2"
                      >
                        <p className="mb-1 text-[10px] font-extrabold tracking-wide text-text-3">
                          {cell.entry.key.split("|")[2]} · {cell.entry.rpmTitle}
                        </p>
                        {cell.genError ? (
                          <p className="text-[12px] text-g-red-text">
                            생성 실패 — {cell.genError}
                          </p>
                        ) : null}
                        {cell.figureError ? (
                          <p className="mb-1 text-[12px] text-g-red-text">
                            그림 실패 — {cell.figureError}
                          </p>
                        ) : null}
                        {cell.problem ? (
                          <>
                            <PaperProblemView
                              content={cell.problem.content}
                              figureSvg={cell.figureSvg}
                              framed={false}
                            />
                            <p className="mt-2 text-[12px] text-ink">
                              <span className="font-extrabold tracking-wide text-text-2">
                                정답{" "}
                              </span>
                              <MathText as="span" text={cell.problem.answer} />
                            </p>
                            <div className="mt-1 text-[12px] text-text-2">
                              <p className="font-extrabold tracking-wide">
                                해설
                              </p>
                              <PaperProblemView
                                content={cell.problem.solution}
                                framed={false}
                              />
                            </div>
                          </>
                        ) : null}
                      </article>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 max-w-[1000px] text-[12px] leading-relaxed text-text-3">
        보실 때 묻는 것 — ㉠ 응용에서 심화하로 갈 때 <b>할 일</b>이
        느는가(계산이 길어지는 것 말고) ㉡ 저쪽 「실력(중)」과 「심화(하)」를
        가르는 것이 무엇인가 ㉢ 저쪽 「심화(중)」에 해당하는 문형이 이 중단원에
        있는가 ㉣ 연산 칸이 비어 있는 소단원에서 저쪽은 그 자리에 무엇을 두는가.
      </p>
      <p className="mt-2 max-w-[1000px] text-[12px] leading-relaxed text-g-red-text">
        🔴 이 조사가 낸 답 하나 —{" "}
        <b>D-115 의 되짚기 잣대는 중2에서 서지 않습니다.</b> 되짚기 계열 축 셋이
        전부 「심화하가 응용보다 덜 문다」로 나왔고(0.53~1.05배), 후보 축 열 개
        중 어느 것도 초등의 22~40배 근처에 못 옵니다(최대 1.55배). 그래서 중2의
        심화중·심화상 잣대는 <b>저쪽 중2 화면을 봐야</b> 정해집니다.
      </p>
    </main>
  );
}
