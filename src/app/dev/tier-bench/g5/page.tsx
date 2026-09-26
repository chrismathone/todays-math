import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { MathText } from "@/components/math/MathText";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import { solutionForDisplay } from "@/lib/solutionSteps";
import { ELEM_TIERS, TIER_PRESETS } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
  listedForms,
  supportedTiers,
} from "@/lib/elementary/generate";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import type { ElemProblem } from "@/lib/elementary/types";

/**
 * **초5 난이도 «높이» 벤치마킹 대(臺)** — 매쓰홀릭을 옆에 띄우고 한 줄씩 대 보는 자리.
 *
 * ## 이 화면의 유일한 목적
 *
 * 원장님이 매쓰홀릭 화면을 옆에 놓고 **한 줄씩** 우리 4단과 견주실 수 있게 하는 것.
 * 그것 말고는 아무것도 하지 않는다 — 판정하지 않고, 저장하지 않고, DB 를 안 본다.
 *
 * ## 왜 «화면»이어야 하나
 *
 * 「이 심화가 응용보다 어려운가」는 **지면에 없다.** 값·조사·그림·렌더는 지면에 있는
 * 것이라 코드가 잰다. 그런데 난이도는 «학생이 무엇을 해야 하는가»이고 그건 문자열에
 * 안 적혀 있다 — 그래서 이 저장소는 열쇠 셋을 재 보고 전부 버렸다
 * (`probe-elem-tier-ladder.ts` 머리말 ㉡-b, 전 학년 10,944문항 실측).
 * **사람이 보는 것이 지금으로선 유일한 그물이다.** 이 화면은 그 그물을 펴는 연장이다.
 *
 * ## 🔴 경로가 둘이다 — 반드시 둘 다 보셔야 한다
 *
 *   · **갈래**(`?path=tier`) — `generateElementaryProblem(unit, seed, tier)`.
 *     소단원당 4단 각 1개. 사다리 판정기 둘이 재는 것이 이쪽이다.
 *   · **문형**(`?path=form`) — `generateElementaryForm(unit, seed, formId)`.
 *     소단원당 10개(연산1·기본4·응용4·심화1). **적재기가 부르는 것은 이쪽이다**
 *     (`scripts/import/load-engine-problems.ts:183`).
 *
 * **지면에 나가는 난이도 분포는 문형이 정한다.** 갈래만 보면 「심화가 1/4」로 보이지만
 * 실제 문항 풀에서 심화는 **1/10** 이다. 두 경로는 서로 다른 산출물이라 한쪽이
 * 깨끗해도 다른 쪽은 아무것도 보장되지 않는다 — CLAUDE.md 2026-08-27·08-30 의
 * 「엔진을 고친 것과 적재본을 고친 것은 다른 일이다」와 같은 자리다.
 *
 * ## ⚠️ D-07 — 여기서 모양을 확정하지 않는다
 *
 * 검수용 내부 화면이다. 제품 지면·시험지·출력물이 아니다. 여기 보이는 배치·색·
 * 글자 크기는 **아무것도 확정하지 않으며**, 제품 지면을 바꾸려면 원장님 확정이 먼저다.
 * 그래서 기존 `/dev/elem-engine` 의 dev 차림새를 그대로 따랐다 — 새 디자인 언어를
 * 여기서 만들면 그것이 확정처럼 굳는다.
 */
const GRADE = "초5";
const DEFAULT_SEED = 20260830;

/** 씨앗 하나로 보면 그 갈래가 씨앗마다 다른 문형을 낸다는 것을 못 본다. */
const SEED_CHOICES = [DEFAULT_SEED, DEFAULT_SEED + 1009, DEFAULT_SEED + 2018];

type Cell = {
  tier: string;
  /** 문형 경로에서만 채운다 — 어느 문형이 낸 것인지 알아야 되짚을 수 있다. */
  formId: string | null;
  problem: ElemProblem | null;
  figureSvg: string | null;
  figureError: string | null;
  /** 만들다 던진 것은 **숨기지 않는다** — 빈 칸은 «없다»와 «못 만들었다»를 안 가른다. */
  genError: string | null;
};

type Row = { section: string; cells: Cell[] };

async function draw(
  problem: ElemProblem | null,
  genError: string | null,
  tier: string,
  formId: string | null,
): Promise<Cell> {
  if (!problem)
    return {
      tier,
      formId,
      problem: null,
      figureSvg: null,
      figureError: null,
      genError,
    };
  if (!problem.figureSpec)
    return {
      tier,
      formId,
      problem,
      figureSvg: null,
      figureError: null,
      genError: null,
    };
  const svg = await renderFigureSpec(problem.figureSpec);
  return {
    tier,
    formId,
    problem,
    figureSvg: svg.ok ? svg.svg : null,
    figureError: svg.ok ? null : svg.error,
    genError: null,
  };
}

export default async function TierBenchG5Page({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string; seed?: string; path?: string }>;
}) {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }

  const query = await searchParams;
  const units = elementaryUnits().filter((u) => u.grade === GRADE);
  const chapters = [...new Set(units.map((u) => u.chapter))];
  const chapter = chapters.includes(query.chapter ?? "")
    ? query.chapter!
    : (chapters[0] ?? "");
  const seed = SEED_CHOICES.includes(Number(query.seed))
    ? Number(query.seed)
    : DEFAULT_SEED;
  const byForm = query.path === "form";

  const inChapter = units.filter((u) => u.chapter === chapter);

  const rows: Row[] = await Promise.all(
    inChapter.map(async (unit) => {
      const cells: Cell[] = [];
      for (const tier of ELEM_TIERS) {
        if (byForm) {
          const forms = listedForms(unit).filter((f) => f.tier === tier);
          if (forms.length === 0) {
            cells.push(
              await draw(null, "이 갈래의 문형이 없다", tier as string, null),
            );
            continue;
          }
          for (const form of forms) {
            let p: ElemProblem | null = null;
            let err: string | null = null;
            try {
              p = generateElementaryForm(unit, seed, form.id);
            } catch (e) {
              err = e instanceof Error ? e.message : String(e);
            }
            cells.push(await draw(p, err, tier as string, form.id));
          }
        } else {
          if (supportedTiers(unit).length === 0) {
            cells.push(
              await draw(null, "갈래 등록이 없다", tier as string, null),
            );
            continue;
          }
          let p: ElemProblem | null = null;
          let err: string | null = null;
          try {
            p = generateElementaryProblem(unit, seed, tier);
          } catch (e) {
            err = e instanceof Error ? e.message : String(e);
          }
          cells.push(await draw(p, err, tier as string, null));
        }
      }
      return { section: unit.section, cells };
    }),
  );

  // 풀의 «모양» — 실측이다. 손으로 적은 수가 아니라 지금 등록부를 센 값.
  const poolByTier = new Map<string, number>();
  for (const u of units)
    for (const f of listedForms(u))
      poolByTier.set(f.tier, (poolByTier.get(f.tier) ?? 0) + 1);
  const poolTotal = [...poolByTier.values()].reduce((a, b) => a + b, 0);

  const href = (next: Record<string, string>) => {
    const p = new URLSearchParams({
      chapter,
      seed: String(seed),
      ...(byForm ? { path: "form" } : {}),
      ...next,
    });
    return `/dev/tier-bench/g5?${p.toString()}`;
  };

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <p className="text-[11px] font-extrabold tracking-[0.16em] text-text-2">
        DEV · 난이도 벤치마킹
      </p>
      <h1 className="mt-2 text-xl font-black">
        초5 난이도 사다리 — 네 갈래를 나란히
      </h1>
      <p className="mt-2 max-w-[900px] text-[13px] leading-relaxed text-text-2">
        매쓰홀릭 화면을 옆에 띄우고 <b>한 줄씩</b> 대 보시라고 만든 자리입니다.
        왼쪽부터 연산 → 기본 → 응용 → 심화입니다. 이 화면은 아무것도 판정하지
        않습니다 — 「이 심화가 응용보다 어려운가」는 코드가 못 재는 축이라,
        보시는 것이 지금으로선 유일한 그물입니다.
      </p>
      <p className="mt-2 max-w-[900px] text-[12px] leading-relaxed text-text-3">
        ※ 검수용 내부 화면입니다. 여기 배치·색·글자 크기는 아무것도 확정하지
        않으며 제품 지면과 무관합니다(D-07).
      </p>

      {/* 풀의 모양 — 이 화면에서 제일 중요한 숫자다 */}
      <section className="mt-5 border border-divider bg-surface p-4">
        <p className="text-[12px] font-extrabold tracking-wide text-text-2">
          초5 문항 풀의 난이도 구성 (문형 {poolTotal}개 · 소단원 {units.length}
          개 실측)
        </p>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
          {ELEM_TIERS.map((t) => {
            const n = poolByTier.get(t) ?? 0;
            const pct = poolTotal === 0 ? 0 : (n / poolTotal) * 100;
            return (
              <span key={t}>
                <b>{t}</b> {n}개 ({pct.toFixed(0)}%)
              </span>
            );
          })}
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-text-2">
          D-71 반 프리셋이 요구하는 비율 —{" "}
          {(Object.keys(TIER_PRESETS) as (keyof typeof TIER_PRESETS)[]).map(
            (k) => (
              <span key={k} className="mr-3">
                {k} {ELEM_TIERS.map((t) => TIER_PRESETS[k][t]).join("/")}
              </span>
            ),
          )}
          <span className="text-text-3">(연산/기본/응용/심화 %)</span>
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-g-red-text">
          풀은 심화가 10%인데 상위반은 35%를 요구합니다 — 같은 심화 문형을 거듭
          쓰게 됩니다. 매쓰홀릭과 견줄 때 <b>깊이</b>만이 아니라 <b>가짓수</b>도
          같이 보셔야 하는 까닭입니다.
        </p>
      </section>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="대단원">
        {chapters.map((c) => (
          <Link
            key={c}
            href={href({ chapter: c })}
            className={
              c === chapter
                ? "border border-ink bg-ink px-2 py-1 text-[12px] font-bold text-white"
                : "border border-divider px-2 py-1 text-[12px] text-ink"
            }
          >
            {c}
          </Link>
        ))}
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <nav className="flex flex-wrap gap-2" aria-label="생성 경로">
          <Link
            href={href({ path: "" })}
            className={
              !byForm
                ? "border border-ink bg-ink px-2 py-1 text-[12px] font-bold text-white"
                : "border border-divider px-2 py-1 text-[12px] text-ink"
            }
          >
            갈래 (판정기가 재는 것)
          </Link>
          <Link
            href={href({ path: "form" })}
            className={
              byForm
                ? "border border-ink bg-ink px-2 py-1 text-[12px] font-bold text-white"
                : "border border-divider px-2 py-1 text-[12px] text-ink"
            }
          >
            문형 (적재기가 부르는 것 · 지면에 나가는 것)
          </Link>
        </nav>
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
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-text-2">
        {byForm ? (
          <>
            <b>문형 경로</b> — 소단원마다 연산1·기본4·응용4·심화1 로 열 개가
            나옵니다. 기본·응용 칸에 넷이 쌓여 보이는 것이 정상이고,{" "}
            <b>심화 칸이 하나뿐인 것이 곧 위의 10%</b>입니다.
          </>
        ) : (
          <>
            <b>갈래 경로</b> — 소단원마다 4단 각 하나입니다. 사다리 판정기 둘이
            재는 것이 이쪽입니다. 실제 시험지에 나가는 것은 문형 쪽이니 두
            경로를 다 보셔야 합니다.
          </>
        )}
      </p>

      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[1400px]">
          <div className="grid grid-cols-[130px_repeat(4,1fr)] gap-px border-b border-divider bg-divider">
            <div className="bg-canvas px-2 py-2 text-[11px] font-extrabold tracking-wide text-text-2">
              소단원
            </div>
            {ELEM_TIERS.map((t) => (
              <div
                key={t}
                className="bg-canvas px-2 py-2 text-[11px] font-extrabold tracking-wide text-text-2"
              >
                {t}
              </div>
            ))}
          </div>

          {rows.map((row) => (
            <div
              key={row.section}
              className="grid grid-cols-[130px_repeat(4,1fr)] gap-px border-b border-divider bg-divider"
            >
              <div className="bg-canvas px-2 py-4 text-[11px] font-bold leading-snug text-text-2">
                {row.section}
              </div>
              {ELEM_TIERS.map((tier) => {
                const cells = row.cells.filter((c) => c.tier === tier);
                return (
                  <div
                    key={tier}
                    className="space-y-3 bg-canvas px-2 py-3 align-top"
                  >
                    {cells.map((cell, i) => (
                      <article
                        key={`${tier}-${cell.formId ?? i}`}
                        className="border border-divider bg-surface p-2"
                      >
                        {cell.formId ? (
                          <p className="mb-1 text-[10px] font-extrabold tracking-wide text-text-3">
                            문형 {cell.formId}
                          </p>
                        ) : null}
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
                                content={
                                  solutionForDisplay(cell.problem.solution) ??
                                  ""
                                }
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

      <p className="mt-8 text-[12px] leading-relaxed text-text-3">
        보실 때 묻는 것 — ㉠ 1 → 2 → 3 → 4 로 <b>할 일</b>이 느는가(걸음 수가
        아니라 할 일) ㉡ 기본이 식을 <b>스스로 세우는가</b> ㉢ 심화에 역산·조건
        겹침이 있는가 ㉣ 어느 갈래가 답을 발문에 그대로 두고 있지 않은가.
      </p>
    </main>
  );
}
