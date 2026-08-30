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

/**
 * **초3 난이도 사다리 — 네 갈래를 한 줄에 나란히** (매쓰홀릭 벤치마킹용).
 *
 * ## 왜 있나
 *
 * 우리 난이도 축은 `연산 < 기본 < 응용 < 심화` 4단이다(D-71/72/106). 그런데
 * 판정기 `probe-elem-tier-ladder.ts` 가 제 머리말에 이렇게 적어 두었다 —
 *
 *   ㉡ **안 잰다 — 사다리의 «높이»**. 「이 심화가 응용보다 어려운가」는 못 묻는다.
 *
 * 벤치마킹이 재려는 것이 **정확히 그 축**이다. 그리고 그 축은 **지면에 없다** —
 * 「이 문항이 저 문항보다 어려운가」는 «학생이 무엇을 해야 하는가»이고, 같은
 * 「걸음 0」이 한쪽에서는 결함이고 다른 쪽에서는 개념이다. 열쇠가 아니라 **축이
 * 없는 자리**라 문턱을 옮겨도 안 갈린다(실측 근거는 위 판정기 머리말 ㉡-b).
 *
 * 그래서 이 화면은 **판정하지 않는다.** 사람이 보라고 늘어놓는 것이 전부다.
 * 원장님이 **매쓰홀릭 화면을 옆에 띄우고** 한 줄씩 대 보시는 것이 유일한 목적이다.
 *
 * ## 볼 때 무엇을 묻나 (D-72 축)
 *
 *   1단 연산 — 절차 한 번 (식·값이 그대로 주어짐)
 *   2단 기본 — 식을 **스스로 세움** (문장·그림 한 겹)
 *   3단 응용 — **두 단계** (중간값·다른 개념 결합)
 *   4단 심화 — **역산·조건 조합** (「잘못 계산했더니」·「전체가 ~일 때」)
 *
 *   ㉠ 왼쪽에서 오른쪽으로 **할 일이 늘어나는가** (걸음 수가 아니라 «할 일»이다)
 *   ㉡ 2단이 식을 스스로 세우는가 — 식을 그냥 주면 그건 1단이다
 *   ㉢ 4단에 역산·조건 겹침이 있는가
 *   ㉣ 어느 갈래가 **답을 발문에 그대로 두고** 있지 않은가
 *
 * ## ⚠️ 이 화면이 못 보여 주는 것
 *
 * **씨앗 하나만 그린다.** 한 갈래가 씨앗마다 다른 문형을 내므로(실측: 초3 심화
 * 213종 꼬리 / 56갈래), 여기 보이는 것은 그 갈래의 **한 표본**이지 갈래 전체가
 * 아니다. 씨앗을 바꿔 가며 여러 번 보실 것 — 위 «씨앗» 단추가 그 자리다.
 *
 * D-07: 이것은 **검수용 내부 화면**이지 제품 지면이 아니다. 여기 모양으로 시험지·
 * 출력물을 정하지 않는다. 문항 본문은 그래도 `PaperProblemView` 로 그린다 —
 * 지면과 다른 렌더 경로를 새로 만들지 않는다(2026-08-17 원장님 지시).
 */
export const dynamic = "force-dynamic";

const GRADE = "초3";

/** 갈래마다 붙이는 한 줄 설명 — D-72 축 표 그대로다. */
const TIER_NOTE: Record<string, string> = {
  연산: "1단 · 절차 한 번 (식이 그대로 주어짐)",
  기본: "2단 · 식을 스스로 세움 (문장·그림 한 겹)",
  응용: "3단 · 두 단계 (중간값·개념 결합)",
  심화: "4단 · 역산·조건 조합",
};

export default async function TierBenchG3Page({
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
    query.chapter &&
    (query.chapter === "전체" || chapters.includes(query.chapter))
      ? query.chapter
      : (chapters[0] ?? "전체");
  const seed = Number.isFinite(Number(query.seed))
    ? Number(query.seed)
    : 20260830;

  const units =
    chapter === "전체" ? all : all.filter((u) => u.chapter === chapter);

  // 네 갈래를 만들고 그림까지 그린다. 그림 실패는 **삼키지 않고** 칸에 찍는다 —
  // 조용히 비워 두면 「그림이 없는 문항」과 「그림이 깨진 문항」이 같아 보인다.
  const rows = await Promise.all(
    units.map(async (unit) => {
      const cells = await Promise.all(
        ELEM_TIERS.map(async (tier) => {
          const p = generateElementaryProblem(unit, seed, tier);
          if (!p.figureSpec) {
            return {
              tier,
              p,
              svg: null as string | null,
              err: null as string | null,
            };
          }
          const r = await renderFigureSpec(p.figureSpec);
          return {
            tier,
            p,
            svg: r.ok ? r.svg : null,
            err: r.ok ? null : r.error,
          };
        }),
      );
      return { unit, cells };
    }),
  );

  const problemCount = rows.length * ELEM_TIERS.length;

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <p className="text-[11px] font-extrabold tracking-[0.16em] text-text-2">
        DEV · 난이도 벤치마킹
      </p>
      <h1 className="mt-2 text-xl font-black">
        초3 난이도 사다리 — 네 갈래 나란히 보기
      </h1>
      <p className="mt-2 max-w-[860px] text-[13px] leading-relaxed text-text-2">
        매쓰홀릭 화면을 옆에 띄우고 <b>한 줄씩</b> 대 보시라고 만든 화면입니다.
        왼쪽부터 연산 → 기본 → 응용 → 심화 순서이고, 오른쪽으로 갈수록{" "}
        <b>학생이 할 일이 늘어나야</b> 합니다. 늘어나지 않는 줄이 있으면 그 줄이
        사다리가 뒤집힌 자리입니다.
      </p>
      <p className="mt-2 max-w-[860px] text-[12px] leading-relaxed text-text-2">
        ⚠️ 이 화면은 <b>아무것도 판정하지 않습니다.</b> 「어느 쪽이 어려운가」는
        기계가 지면에서 읽어 낼 수 있는 것이 아니라서, 지금으로선 사람이 보는
        것이 유일한 그물입니다. 그리고 <b>씨앗 하나만</b> 그리므로 여기 보이는
        것은 그 갈래의 한 표본입니다 — 씨앗을 바꿔 여러 번 보십시오.
      </p>

      <nav className="mt-5 flex flex-wrap gap-2" aria-label="대단원">
        {["전체", ...chapters].map((c) => (
          <Link
            key={c}
            href={`/dev/tier-bench/g3?chapter=${encodeURIComponent(c)}&seed=${seed}`}
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
        {[20260830, 3, 16237, 40588, 81173].map((s) => (
          <Link
            key={s}
            href={`/dev/tier-bench/g3?chapter=${encodeURIComponent(chapter)}&seed=${s}`}
            className={
              s === seed
                ? "border border-ink bg-ink px-2 py-1 text-[12px] font-bold text-white"
                : "border border-divider px-2 py-1 text-[12px] text-text-1"
            }
          >
            {s}
          </Link>
        ))}
      </nav>

      <p className="mt-4 text-[12px] text-text-2">
        {chapter} — 소단원 {rows.length}개 · 문항 {problemCount}건 (소단원마다
        네 갈래) · 씨앗 {seed}
      </p>

      <div className="mt-6 space-y-10">
        {rows.map(({ unit, cells }) => (
          <section key={unit.section} className="border-t border-divider pt-5">
            <h2 className="mb-3 text-[13px] font-black">{unit.section}</h2>
            {/* 넓은 내용은 제 칸 안에서 가로로 구른다 — 본문이 가로로 밀리면 안 된다 */}
            <div className="overflow-x-auto">
              <div className="grid min-w-[1240px] grid-cols-4 gap-4">
                {cells.map(({ tier, p, svg, err }) => (
                  <article
                    key={tier}
                    className="border border-divider p-3 align-top"
                  >
                    <p className="text-[11px] font-extrabold tracking-wide text-text-2">
                      {tier}
                    </p>
                    <p className="mb-2 text-[10px] leading-snug text-text-2">
                      {TIER_NOTE[tier]}
                    </p>
                    {err ? (
                      <p className="mb-2 text-[12px] text-g-red-text">
                        그림 실패: {err}
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
                      <p className="mb-1 font-extrabold tracking-wide">해설</p>
                      <PaperProblemView content={p.solution} framed={false} />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 border-t border-divider pt-4 text-[12px] leading-relaxed text-text-2">
        기계가 이미 재고 있는 것: 「심화가 맨 «계산하시오» 인가」(
        <code>probe-elem-tier-ladder.ts</code>) · 「심화 발문이 4단 표지를
        가졌나」(<code>probe-elem-tier-4dan.ts</code>). 초3 은 둘 다 통과합니다
        (위반 0 · 미검토 0). <b>여기서 보시는 것은 그 둘이 못 재는 «높이»</b>{" "}
        입니다.
      </p>
    </main>
  );
}
