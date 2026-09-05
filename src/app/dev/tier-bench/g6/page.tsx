import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

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
 * **초6 난이도 사다리 — 네 갈래를 나란히** (매쓰홀릭 벤치마킹용 검수 화면).
 *
 * ## 이 화면의 **유일한** 목적
 *
 * 원장님이 **매쓰홀릭 화면을 옆에 띄우고 한 줄씩 대 보시는 것**. 그것뿐이다.
 * 한 줄 = 한 소단원, 왼쪽부터 연산 → 기본 → 응용 → 심화.
 *
 * ## 왜 있나
 *
 * 우리 난이도 축은 `연산 < 기본 < 응용 < 심화` 4단이다(D-71/72/106). 그런데
 * 판정기들이 재는 것은 **사다리의 «모양»**이지 **«높이»**가 아니다 —
 * `probe-elem-tier-ladder.ts` 는 자기 머리말에 「'이 심화가 응용보다 어려운가'는
 * 못 묻는다」고 적어 두었고, `probe-elem-tier-4dan.ts` 도 「'그래서 4단인가'는
 * 못 잰다」고 적어 두었다.
 *
 * **난이도는 지면에 없다.** 값·조사·그림·렌더는 지면에 있는 것이라 기계가 잰다.
 * 그런데 「이 문항이 저 문항보다 어려운가」는 **학생이 무엇을 해야 하는가**이고
 * 그건 지면에 없다. 그래서 그 축은 **사람이 보는 것 말고 방법이 없고**, 벤치마킹이
 * 재려는 것이 정확히 그 축이다. 이 화면은 사람이 보기 쉽게 늘어놓는 일만 한다.
 *
 * ## ⚠️ 이 화면이 판정하지 않는 것
 *
 * 여기 나란히 놓였다는 것이 **사다리가 오른다는 뜻이 아니다.** 실제로 2026-08-23 에
 * 초5 두 소단원에서 응용과 심화가 **뒤집혀** 있었고, 값·조사·판정기가 **전부 초록**
 * 이었다. 그런 뒤집힘은 넷을 나란히 놓고 **눈으로 봐야** 보인다.
 *
 * ## D-07
 *
 * **검수용 내부 화면이지 제품 지면이 아니다.** 시험지·출력물의 모양을 정하지 않는다.
 * 제품 지면을 바꾸는 일은 원장님 확정 없이 착수 금지다(절대 규칙 1).
 */

/** 판정기들과 **같은 씨앗**이다 — 화면에서 본 것과 잰 것이 어긋나지 않게. */
const SEEDS = Array.from({ length: 12 }, (_, i) => i * 8117 + 3);

const GRADE = "초6";

/** D-72 축 표 — 원장님이 매쓰홀릭과 댈 때 「이 칸은 무엇이어야 하나」의 잣대. */
const AXIS: Record<string, string> = {
  연산: "1단 · 절차 한 번 (식·값이 그대로 주어짐)",
  기본: "2단 · 식을 스스로 세움 (문장·그림 한 겹)",
  응용: "3단 · 두 단계 (중간값·다른 개념 결합)",
  심화하: "4단 · 역산·조건 조합 (「잘못 계산했더니」·「전체가 ~일 때」)",
  // D-113 파일럿(2026-08-30) — 잣대는 `docs/planning/tracks/reports/tier-fill-g6.md` §2.
  // 🔴 **초6 은 `2-2 소수의 나눗셈` 다섯 소단원만 채웠다.** 나머지는 「아직 안 채움」이
  //    그대로 보인다 — 원장님이 이 다섯을 보시고 잣대를 확정하시면 그때 넓힌다.
  심화중: "5단 · 후보를 열거해 고름 · 역산 뒤 한 걸음 더 (파일럿: 2-2)",
  심화상: "6단 · 여러 경우를 탐색·비교 — 답이 여럿이거나 개수 (파일럿: 2-2)",
};

export default async function TierBenchG6Page({
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
  const chapter = chapters.includes(query.chapter ?? "")
    ? query.chapter!
    : (chapters[0] ?? "");
  const units = all.filter((u) => u.chapter === chapter);

  const seed = SEEDS.includes(Number(query.seed))
    ? Number(query.seed)
    : SEEDS[0]!;

  // 여섯 갈래를 **한 씨앗으로** 만든다 — 갈래끼리 견주려면 같은 자리에서 나와야
  // 한다. `심화중`·`심화상` 은 채우는 중이라(D-113) 소단원마다 있을 수도 없을 수도
  // 있다 — `supportedTiers` 로 먼저 물어보고, 없으면 만들지 않는다.
  const rows = await Promise.all(
    units.map(async (unit) => {
      const supported = new Set(supportedTiers(unit));
      return {
        unit,
        cells: await Promise.all(
          ELEM_TIERS.map(async (tier) => {
            if (!supported.has(tier)) {
              return {
                tier,
                p: null as ElemProblem | null,
                svg: null as string | null,
                err: null as string | null,
              };
            }
            const p = generateElementaryProblem(unit, seed, tier);
            if (!p.figureSpec) return { tier, p, svg: null, err: null };
            const drawn = await renderFigureSpec(p.figureSpec);
            return {
              tier,
              p,
              svg: drawn.ok ? drawn.svg : null,
              err: drawn.ok ? null : drawn.error,
            };
          }),
        ),
      };
    }),
  );

  const href = (c: string, s: number) =>
    `/dev/tier-bench/g6?chapter=${encodeURIComponent(c)}&seed=${s}`;

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <p className="text-[11px] font-extrabold tracking-[0.16em] text-text-2">
        DEV · 난이도 벤치마킹
      </p>
      <h1 className="mt-2 text-xl font-black">
        초6 난이도 사다리 — 여섯 갈래를 나란히
      </h1>
      <p className="mt-2 max-w-[820px] text-[13px] leading-relaxed text-text-2">
        매쓰홀릭 화면을 옆에 띄우고 <b>한 줄씩</b> 대 보십시오. 한 줄이 한
        소단원이고, 왼쪽부터 연산 → 기본 → 응용 → 심화입니다. 물을 것은 「우리
        심화가 저쪽 심화만큼 어려운가」입니다.
      </p>
      <p className="mt-2 max-w-[820px] text-[13px] leading-relaxed text-text-2">
        이 화면은 <b>아무것도 판정하지 않습니다.</b> 난이도는 지면에 없어 기계가
        못 잽니다 — 사다리가 뒤집혀도 판정기는 초록입니다. 그래서 눈으로 봅니다.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="대단원">
        {chapters.map((c) => (
          <Link
            key={c}
            href={href(c, seed)}
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

      <nav className="mt-3 flex flex-wrap items-center gap-2" aria-label="씨앗">
        <span className="text-[11px] font-extrabold tracking-wide text-text-2">
          씨앗
        </span>
        {SEEDS.map((s, i) => (
          <Link
            key={s}
            href={href(chapter, s)}
            className={
              s === seed
                ? "border border-ink bg-ink px-2 py-1 text-[11px] font-bold text-white"
                : "border border-divider px-2 py-1 text-[11px] text-text-1"
            }
          >
            {i + 1}
          </Link>
        ))}
        <span className="text-[11px] text-text-2">
          — 한 갈래가 씨앗마다 다른 문형을 냅니다. 하나만 보고 판단하지
          마십시오.
        </span>
      </nav>

      <div className="mt-6 overflow-x-auto">
        <div className="grid min-w-[1560px] grid-cols-6 gap-3 border-b border-divider pb-2">
          {ELEM_TIERS.map((tier) => (
            <div key={tier}>
              <p className="text-[13px] font-black">{tier}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-text-2">
                {AXIS[tier]}
              </p>
            </div>
          ))}
        </div>

        <ol className="mt-2 min-w-[1560px]">
          {rows.map(({ unit, cells }) => (
            <li key={unit.section} className="border-b border-divider py-5">
              <p className="mb-3 text-[12px] font-extrabold tracking-wide text-text-1">
                {unit.section}
              </p>
              <div className="grid grid-cols-6 gap-3 [align-items:start]">
                {cells.map(({ tier, p, svg, err }) => (
                  <div key={tier} className="border border-divider p-3">
                    <p className="mb-2 text-[10px] font-extrabold tracking-[0.14em] text-text-2">
                      {tier}
                    </p>
                    {p === null ? (
                      <p className="text-[12px] text-text-3">
                        아직 안 채움 ({tier})
                      </p>
                    ) : (
                      <>
                        {err ? (
                          <p className="mb-2 text-[12px] text-g-red-text">
                            그림 실패 — {err}
                          </p>
                        ) : null}
                        <PaperProblemView content={p.content} figureSvg={svg} />
                        <div className="mt-2 text-[12px] text-text-1">
                          <span className="font-extrabold tracking-wide text-text-2">
                            정답
                          </span>{" "}
                          <MathText as="span" text={p.answer} />
                        </div>
                        <div className="mt-1 text-[12px] text-text-2">
                          <p className="mb-1 font-extrabold tracking-wide">
                            해설
                          </p>
                          <PaperProblemView
                            content={solutionForDisplay(p.solution) ?? ""}
                            framed={false}
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-6 text-[12px] leading-relaxed text-text-2">
        소단원 {units.length}개 · 만든 문항{" "}
        {rows.reduce(
          (sum, r) => sum + r.cells.filter((c) => c.p !== null).length,
          0,
        )}
        건 ({chapter}, 축은 여섯 갈래이나 심화중·심화상은 채우는 중이라
        소단원마다 있을 수도 없을 수도 있다). 초6 전체는 소단원 {all.length}
        개입니다. 갈래별 «발문 꼴»의 실측 수치는{" "}
        <code>scripts/qa/census-tier-bench-g6.ts</code>, 심화가 4단 모양인지는{" "}
        <code>scripts/qa/probe-elem-tier-4dan.ts 초6</code> 가 찍습니다.
      </p>
    </main>
  );
}
