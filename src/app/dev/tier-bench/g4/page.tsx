import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import {
  type Tier4Ledger,
  elemKey,
  judgeDeep,
  marksOf,
} from "../../../../../scripts/qa/tier4Rules";
import tier4Ledger from "../../../../../scripts/qa/reports/tier4-review.json";
import { MathText } from "@/components/math/MathText";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import { ELEM_TIERS } from "@/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";
import type { ElemProblem } from "@/lib/elementary/types";
import { solutionForDisplay } from "@/lib/solutionSteps";

/**
 * **초4 난이도 사다리를 한 줄씩 눈으로 보는 자리** — 매쓰홀릭 벤치마킹용 (2026-08-30).
 *
 * ## 왜 있나
 *
 * `probe-elem-tier-ladder.ts` 머리말 ㉡ 이 스스로 적어 두었다 — **사다리의 «높이»는
 * 안 잰다.** 「이 심화가 응용보다 어려운가」를 못 묻는다. 그리고 그 까닭도 같이 적어
 * 두었다: **난이도는 지면에 없다.** 같은 「걸음 0」이 한쪽에서는 결함이고 다른 쪽에서는
 * 개념이라, 문턱을 옮겨도 안 갈린다. **열쇠가 아니라 축이 없는 자리**다.
 *
 * 그래서 그물을 사람에게 남긴다. 이 화면이 하는 일은 **네 갈래를 나란히 늘어놓는 것**
 * 하나뿐이다 — 원장님이 매쓰홀릭 화면을 옆에 띄우고 한 줄씩 대 보시라고.
 *
 * ⚠️ **판정하지 않는다.** 배지는 기계가 **표지**를 봤는지를 말할 뿐, 「4단인가」를
 *    말하지 않는다(`tier4Rules` 머리말 ㉡). 초4 1-6-5 처럼 «□ 하나»로 표지가 붙어
 *    사람 눈에 아예 안 오는 자리가 있고, 그것이 이 화면이 있는 까닭이다.
 *
 * ⚠️ **D-07 — 이건 검수용 내부 화면이지 제품 지면이 아니다.** 모양을 확정하지 않는다.
 *    문항 본문만은 `PaperProblemView` 를 거친다 — 지면과 줄바꿈까지 같아야 견줄 수
 *    있기 때문이다(2026-08-17 원장님 지시 "모든 문제를 인쇄시와 동일한 뷰로").
 *
 * ## 볼 때 무엇을 묻나 (`dump-elem-tiers.ts` 머리말과 같은 물음)
 *
 *   ㉠ 연산 → 기본 → 응용 → 심화 로 **할 일이 늘어나는가** (걸음 수가 아니라 «할 일»)
 *   ㉡ 기본이 **식을 스스로 세우는가** — 식을 그냥 주면 그건 연산이다
 *   ㉢ 심화에 **역산·조건 겹침**이 있는가
 *   ㉣ 응용과 심화가 **같은 문장 틀**이고 수만 다르지 않은가
 *   ㉤ 매쓰홀릭의 같은 단원 심화와 대면 **어느 쪽이 위인가**
 */
export const dynamic = "force-dynamic";

const GRADE = "초4";

/** 다른 초등 판정기와 **같은 열두 개**. 배지가 판정기와 갈리면 안 된다. */
const JUDGE_SEEDS = Array.from({ length: 12 }, (_, i) => i * 8117 + 3);

/** 화면에 그릴 씨앗 후보. 원장님이 다른 수로 한 번 더 보실 수 있게. */
const VIEW_SEEDS = [3, 8120, 16237, 24354, 20260824];

export default async function TierBenchG4Page({
  searchParams,
}: {
  searchParams: Promise<{ chapter?: string; seed?: string }>;
}) {
  await connection();
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_RENDER_QA !== "1"
  ) {
    notFound();
  }

  const query = await searchParams;
  const all = elementaryUnits().filter(
    (u) => u.grade === GRADE && supportedTiers(u).length > 0,
  );
  const chapters = [...new Set(all.map((u) => u.chapter))];
  const chapter =
    query.chapter === "전체"
      ? "전체"
      : (chapters.find((c) => c === query.chapter) ?? chapters[0] ?? "전체");
  const seed = VIEW_SEEDS.includes(Number(query.seed))
    ? Number(query.seed)
    : VIEW_SEEDS[0]!;
  const units =
    chapter === "전체" ? all : all.filter((u) => u.chapter === chapter);

  // A static import lets the build include just this ledger. Resolving an
  // imported path through process.cwd() caused the entire repo to be traced.
  const ledger = tier4Ledger as Tier4Ledger;

  // 학년 전체의 분모는 **고른 대단원과 무관하게** 찍는다 — 좁혀 본 것을 전량으로
  // 읽으면 「62 중 하나」가 「지금 화면 중 하나」로 줄어든다.
  const wholeGrade = all.map((u) => {
    const deep = JUDGE_SEEDS.map(
      (s) => generateElementaryProblem(u, s, "심화하").content,
    );
    return judgeDeep(elemKey(u.grade, u.section), deep, ledger.초등);
  });
  const tally = {
    표지있음: wholeGrade.filter((j) => j.판정 === "표지있음").length,
    검토됨: wholeGrade.filter((j) => j.판정 === "검토됨").length,
    고칠것: wholeGrade.filter((j) => j.판정 === "고칠것").length,
    미검토: wholeGrade.filter((j) => j.판정 === "미검토").length,
  };

  const rows = await Promise.all(
    units.map(async (unit) => {
      const deep = JUDGE_SEEDS.map(
        (s) => generateElementaryProblem(unit, s, "심화하").content,
      );
      const judgement = judgeDeep(
        elemKey(unit.grade, unit.section),
        deep,
        ledger.초등,
      );
      // `심화중`·`심화상` 은 채우는 중이라(D-113) 소단원마다 있을 수도 없을 수도
      // 있다 — `supportedTiers` 로 먼저 물어보고, 없으면 만들지 않는다.
      const supported = new Set(supportedTiers(unit));
      const cells = await Promise.all(
        ELEM_TIERS.map(async (tier) => {
          if (!supported.has(tier)) {
            return {
              tier,
              problem: null as ElemProblem | null,
              svg: null as string | null,
              figureError: null as string | null,
              marks: [] as string[],
            };
          }
          const p = generateElementaryProblem(unit, seed, tier);
          let svg: string | null = null;
          let figureError: string | null = null;
          if (p.figureSpec) {
            const drawn = await renderFigureSpec(p.figureSpec);
            if (drawn.ok) svg = drawn.svg;
            else figureError = drawn.error;
          }
          return {
            tier,
            problem: p as ElemProblem | null,
            svg,
            figureError,
            marks: marksOf(p.content),
          };
        }),
      );
      return { unit, judgement, cells };
    }),
  );

  return (
    <main className="mx-auto max-w-[1600px] px-5 py-7">
      <p className="text-[11px] font-extrabold tracking-[0.16em] text-text-2">
        DEV · 난이도 벤치마킹
      </p>
      <h1 className="mt-2 text-xl font-black">
        초4 — 여섯 갈래를 나란히 (연산 · 기본 · 응용 · 심화하 · 심화중 · 심화상)
      </h1>
      <p className="mt-3 max-w-[880px] text-[13px] leading-relaxed text-text-2">
        매쓰홀릭 화면을 옆에 띄우고 <b className="text-text-1">한 줄씩</b> 대
        보시라고 만든 자리입니다. 왼쪽부터 연산 → 기본 → 응용 → 심화이고, 한
        줄이 소단원 하나입니다. 판정기는 「심화가 4단{" "}
        <b className="text-text-1">표지</b>를 가졌나」까지만 볼 수 있습니다 —{" "}
        <b className="text-text-1">
          「그래서 매쓰홀릭보다 위인가」는 못 봅니다.
        </b>{" "}
        그 물음이 이 화면이 있는 까닭입니다.
      </p>

      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-y border-divider py-3 text-[12px]">
        <div className="flex gap-2">
          <dt className="font-extrabold tracking-wide text-text-2">
            초4 소단원
          </dt>
          <dd className="font-bold">
            {all.length}개 (전량 핵심 4단 등록 · 심화중·심화상은 채우는 중)
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-extrabold tracking-wide text-text-2">표지있음</dt>
          <dd>{tally.표지있음}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-extrabold tracking-wide text-text-2">
            사람이 4단이라 함
          </dt>
          <dd>{tally.검토됨}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-extrabold tracking-wide text-text-2">고칠것</dt>
          <dd>{tally.고칠것}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="font-extrabold tracking-wide text-text-2">미검토</dt>
          <dd>{tally.미검토}</dd>
        </div>
      </dl>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="대단원">
        {["전체", ...chapters].map((c) => (
          <Link
            key={c}
            href={`/dev/tier-bench/g4?chapter=${encodeURIComponent(c)}&seed=${seed}`}
            className={
              c === chapter
                ? "border border-ink bg-ink px-2 py-1 text-[12px] font-bold text-white"
                : "border border-divider px-2 py-1 text-[12px] text-text-1"
            }
          >
            {c}
          </Link>
        ))}
      </nav>
      <nav className="mt-2 flex flex-wrap items-center gap-2" aria-label="씨앗">
        <span className="text-[11px] font-extrabold tracking-wide text-text-2">
          씨앗
        </span>
        {VIEW_SEEDS.map((s) => (
          <Link
            key={s}
            href={`/dev/tier-bench/g4?chapter=${encodeURIComponent(chapter)}&seed=${s}`}
            className={
              s === seed
                ? "border border-ink bg-paper px-2 py-1 text-[12px] font-bold"
                : "border border-divider px-2 py-1 text-[12px] text-text-2"
            }
          >
            {s}
          </Link>
        ))}
        <span className="text-[11px] text-text-2">
          — 한 갈래가 씨앗마다 다른 문형을 냅니다. 하나만 보면 나머지가 안
          보입니다.
        </span>
      </nav>

      {chapter === "전체" ? (
        <p className="mt-3 text-[12px] text-text-2">
          전체는 소단원 {all.length}개 × 최대 여섯 갈래를 한 번에 그립니다 —
          그림이 있는 문항마다 도형 엔진을 부르므로 느립니다.
        </p>
      ) : null}

      <div className="mt-7 space-y-10">
        {rows.map(({ unit, judgement, cells }) => (
          <section key={unit.section} className="border-t border-divider pt-4">
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-[14px] font-black">{unit.section}</h2>
              <span className="border border-divider px-1.5 py-0.5 text-[11px] text-text-2">
                기계 판정 · {judgement.판정}
              </span>
              {judgement.판정 === "표지있음" ? (
                <span className="text-[11px] text-text-2">
                  표지 {judgement.표지.join(" + ")} — 그래서 사람 검토를 안
                  거쳤다
                </span>
              ) : null}
              {judgement.판정 === "검토됨" || judgement.판정 === "고칠것" ? (
                <span className="text-[11px] text-text-2">{judgement.왜}</span>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {cells.map(({ tier, problem, svg, figureError, marks }) => (
                <article
                  key={tier}
                  className="min-w-0 border border-divider p-3"
                >
                  <p className="mb-2 flex flex-wrap items-baseline gap-2">
                    <span className="text-[11px] font-extrabold tracking-[0.14em] text-text-2">
                      {tier}
                    </span>
                    {marks.length > 0 ? (
                      <span className="text-[10px] text-text-2">
                        4단 표지 · {marks.join(", ")}
                      </span>
                    ) : null}
                  </p>
                  {problem === null ? (
                    <p className="text-[12px] text-text-3">
                      아직 안 채움 ({tier})
                    </p>
                  ) : (
                    <>
                      {figureError ? (
                        <p className="mb-2 text-[11px] text-g-red-text">
                          그림 실패 — {figureError}
                        </p>
                      ) : null}
                      <PaperProblemView
                        content={problem.content}
                        figureSvg={svg}
                      />
                      <div className="mt-2 text-[12px]">
                        <span className="font-extrabold tracking-wide text-text-2">
                          정답
                        </span>{" "}
                        <MathText as="span" text={problem.answer} />
                      </div>
                      <div className="mt-1 text-[12px] text-text-2">
                        <p className="mb-1 font-extrabold tracking-wide">
                          해설
                        </p>
                        <PaperProblemView
                          content={solutionForDisplay(problem.solution) ?? ""}
                          framed={false}
                        />
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 border-t border-divider pt-4 text-[12px] leading-relaxed text-text-2">
        ⚠️ 이 화면은 <b className="text-text-1">아무것도 판정하지 않습니다.</b>{" "}
        배지는 기계가 <b className="text-text-1">표지</b>를 봤는지를 말할
        뿐입니다 — 표지가 있어도 한 걸음이면 4단이 아니고, 표지가 없어도 4단인
        것이 많습니다 (`scripts/qa/tier4Rules.ts` 머리말 ㉡).
      </p>
    </main>
  );
}
