import { notFound } from "next/navigation";
import { connection } from "next/server";

import { A4Page } from "@/components/print/A4Page";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import { db } from "@/lib/db";
import { devPageVisible } from "@/lib/devPageAccess";
import { findSubQuestionMarkers } from "@/lib/math/subQuestion";

import styles from "./ExamHifi.module.css";

/**
 * **기출 시험지 2단 폼 — Hi-fi 시안** (D-07 · 절대 규칙 1).
 *
 * Wire 5안에서 원장님이 **C 머리띠형**을 고르셨다(2026-09-05). 이 화면은 그 골격 위에
 * 색·서체·머리띠 표현을 네 가지로 낸다. 05 §0-3 절차의 둘째 단계다.
 *
 * ## 무엇이 이미 정해져 있나 (05 §8.5 `[확정]`)
 *
 *   종이 `#FCFCF8` · 액센트 금색 `#A57F00` · 본문 명조 · 라벨·학원명은 sans
 *   학원명은 좌측 상단 작은 금색 · 색만으로 구분하지 않는다(말 병기)
 *
 * 그래서 네 안이 **그 안에서** 갈린다 — 팔레트를 새로 만들지 않는다.
 *
 * ## 이 시안이 **정하러 온 것**
 *
 * 05 §「아직 미정」에 이렇게 적혀 있다: **「배점의 지면 위치·서체 — 인쇄 시안에서
 * 별도로 정한다」.** 기출·예측 지면은 배점을 찍는다(D-41). 그 자리를 네 안이 다르게 잡는다.
 *
 * ## 🔴 서술형 답란은 **넣어 두고 여쭙는다**
 *
 * 원본 지면은 소문항마다 빈 칸을 넉넉히 둔다(문17 은 ⑴~⑷ 사이가 통째로 여백).
 * 답란이 없으면 기출 시험지로 쓸 수 없으므로 네 안 **전부에 넣었다.** 다만 높이는
 * 배점에 비례시킨 **제안**이고, 그 값은 원장님이 종이에서 보셔야 정해진다.
 * 소문항 자리는 손으로 찾지 않고 `findSubQuestionMarkers` 를 쓴다 — 그 규칙은
 * 이미 한 곳에 있고, 옮겨 적으면 조용히 갈라진다.
 *
 * ⚠️ DB 를 한 건도 안 바꾼다. 읽기만 한다.
 */
export const dynamic = "force-dynamic";

const EXAM_ID = "2025-jeonghwa-3-2-mid";

/** 지면이 깨지기 쉬운 자리를 일부러 고른다 — 넓은 그림·긴 상자·소문항 서술형·그림 두 장. */
const PAGES: number[][] = [
  // 🔴 한 장에 더 담으면 `column-count` 가 셋째 단을 만들어 **문항이 조용히 사라진다**
  //    (첫 판에서 문6 이 그렇게 잘렸다 — 지면은 반쯤 비어 보이는데 문항이 없다).
  //    시안은 «틀»을 보는 자리이므로 잘리지 않는 만큼만 담는다.
  [1, 3, 4],
  [17, 19],
];

interface Variant {
  key: string;
  name: string;
  band: string;
  score: string;
}

const VARIANTS: Variant[] = [
  {
    key: "h1",
    name: "H1 · 금색 가는 룰",
    band: "띠 배경 없이 문항 위에 금색 1px 룰 하나. 가장 조용하다",
    score: "룰 오른쪽 끝에 sans 소형 — 번호와 멀어 눈에 안 걸린다",
  },
  {
    key: "h2",
    name: "H2 · 금색 톤 띠",
    band: "금색 6% 바탕 + 좌측 3px 금색 바. 원본 인재원 지면의 붉은 띠에 대응하는 우리 판",
    score: "띠 오른쪽 안쪽에 sans 소형 — 번호와 한 줄에 묶인다",
  },
  {
    key: "h3",
    name: "H3 · 잉크 룰에 번호를 얹음",
    band:
      "문항 위 잉크 1.5px 룰을 긋고 번호가 그 룰을 **끊고 앉는다**. 시험지 고전 문법 — " +
      "네 안 중 유일하게 머리띠에 금색을 안 쓴다(금색은 머리말에만)",
    score: "룰 오른쪽 끝을 같은 방식으로 끊고 앉는다 — 번호와 좌우 대칭이다",
  },
  {
    key: "h4",
    name: "H4 · 두 줄 머리",
    band: "윗줄에 유형·배점을 작은 sans 라벨로, 아랫줄에 `문 N` 을 금색 명조로 크게",
    score: "번호보다 **위**에 온다 — 훑을 때 배점이 먼저 읽힌다",
  },
];

/** 서술형 답란 높이(mm) — 배점에 비례시킨 **제안**이다. 종이에서 보고 정한다. */
function answerBoxMm(score: number, parts: number): number {
  const perPoint = 2.6;
  const total = Math.min(96, Math.max(16, score * perPoint));
  return Math.max(12, total / Math.max(1, parts));
}

/**
 * 소문항 경계로 본문을 자른다. 마커 판정은 `findSubQuestionMarkers` 하나가 한다 —
 * 여기서 「⑴처럼 생겼으면 소문항」이라고 다시 짓지 않는다(실측 오탐이 많다).
 */
function splitSubQuestions(content: string): string[] {
  const marks = findSubQuestionMarkers(content);
  if (marks.length < 2) return [content];
  const cuts = marks.map((m) => m.index);
  const parts: string[] = [];
  const head = content.slice(0, cuts[0]).trim();
  if (head) parts.push(head);
  for (let i = 0; i < cuts.length; i += 1) {
    const end = i + 1 < cuts.length ? cuts[i + 1] : content.length;
    parts.push(content.slice(cuts[i]!, end).trim());
  }
  return parts.filter(Boolean);
}

export default async function ExamHifiPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();

  const problems = await db.problem.findMany({
    where: { examId: EXAM_ID },
    orderBy: { questionNumber: "asc" },
    select: {
      id: true,
      questionNumber: true,
      questionType: true,
      score: true,
      content: true,
      figureSvg: true,
      figureUrls: true,
      figureDims: true,
      figureSourceMm: true,
      choiceFigureIndex: true,
    },
  });

  if (problems.length === 0) {
    return (
      <main className={styles.shell}>
        <h1 className={styles.h1}>기출 2단 폼 — Hi-fi 시안</h1>
        <p className={styles.note}>{EXAM_ID} 문항이 DB 에 없다.</p>
      </main>
    );
  }

  const byNumber = new Map(problems.map((p) => [p.questionNumber ?? 0, p]));

  return (
    <main className={styles.shell}>
      <header className={styles.head}>
        <h1 className={styles.h1}>
          기출 시험지 2단 폼 — Hi-fi 4안 (C 머리띠형 골격)
        </h1>
        <p className={styles.note}>
          Wire 에서 고르신 <strong>C 머리띠형</strong> 위에 색·서체를
          얹었습니다. 종이·금색· 명조는 05 §8.5 확정값 그대로이므로 네 안이
          같습니다. <strong>다른 것은 머리띠의 표현과 배점 자리</strong>뿐입니다
          — 배점의 지면 위치는 05 문서에 아직 미정으로 남아 있던 항목입니다.
        </p>
        <p className={styles.note}>
          정화중 25-2-중간 <strong>실제 {problems.length}문항</strong> 중 지면이
          깨지기 쉬운 여덟을 골라 A4 두 장으로 그렸습니다(넓은 그림 · 긴 상자 ·
          소문항 서술형 · 그림 두 장).
        </p>
        <p className={styles.ask}>
          같이 정해 주실 것 — <strong>㉠ 서술형 답란</strong>: 네 안 모두에 넣어
          두었습니다. 지금은 배점에 비례한 높이(10점 = 소문항당 약{" "}
          {answerBoxMm(10, 4).toFixed(0)}mm)인데, 종이에서 보시고 더 넓게/좁게
          말씀해 주시면 그 값으로 박습니다.
        </p>
      </header>

      {VARIANTS.map((v) => (
        <section className={styles.block} key={v.key}>
          <h2 className={styles.h2}>{v.name}</h2>
          <p className={styles.what}>머리띠 — {v.band}</p>
          <p className={styles.what}>배점 — {v.score}</p>
          {PAGES.map((nums, pageIndex) => {
            const items = nums
              .map((n) => byNumber.get(n))
              .filter((p): p is NonNullable<typeof p> => Boolean(p));
            return (
              <A4Page
                className={`${styles.page} ${styles[`v_${v.key}`]}`}
                key={`${v.key}-${pageIndex}`}
                kind="questions"
                pageNumber={pageIndex + 1}
              >
                {pageIndex === 0 ? (
                  <header className={styles.masthead}>
                    <div className={styles.mastLeft}>
                      <div className={styles.academy}>오늘 수학</div>
                      <div className={styles.mastEn}>PAST PAPER</div>
                    </div>
                    <div className={styles.mastMid}>
                      <h3 className={styles.paperTitle}>
                        JH중 3학년 · 2학기 중간고사 대비
                      </h3>
                      <div className={styles.paperSub}>
                        삼각비 ~ 원주각 · 100점
                      </div>
                    </div>
                    <div className={styles.mastRight}>
                      <div>이름 ____________</div>
                      <div>반 ________</div>
                    </div>
                  </header>
                ) : (
                  <header className={styles.contHead}>
                    <span>오늘 수학 · JH중 3학년 2학기 중간고사 대비</span>
                    <span>p. {pageIndex + 1}</span>
                  </header>
                )}

                <div className={styles.columns}>
                  {items.map((p) => {
                    const subjective = p.questionType !== "객관식";
                    const parts = subjective
                      ? splitSubQuestions(p.content)
                      : [p.content];
                    const boxMm = answerBoxMm(
                      p.score ?? 5,
                      subjective
                        ? Math.max(1, parts.length - (parts.length > 1 ? 1 : 0))
                        : 1,
                    );
                    return (
                      <article className={styles.item} key={p.id}>
                        <div className={styles.bandRow}>
                          <span className={styles.num}>
                            <span className={styles.numWord}>문</span>{" "}
                            {p.questionNumber}
                          </span>
                          {subjective ? (
                            <span className={styles.kind}>
                              {p.questionType}
                            </span>
                          ) : null}
                          <span className={styles.score}>{p.score}점</span>
                        </div>
                        {parts.map((part, i) => (
                          <div key={`${p.id}-${i}`}>
                            <div className={styles.body}>
                              <PaperProblemView
                                content={part}
                                figureDims={i === 0 ? p.figureDims : []}
                                figureSourceMm={i === 0 ? p.figureSourceMm : []}
                                choiceFigureIndex={
                                  i === 0 ? p.choiceFigureIndex : []
                                }
                                figureSvg={i === 0 ? p.figureSvg : null}
                                figureUrls={i === 0 ? p.figureUrls : []}
                                framed={false}
                              />
                            </div>
                            {subjective && (parts.length === 1 || i > 0) ? (
                              <div
                                className={styles.answerBox}
                                style={{ height: `${boxMm}mm` }}
                              />
                            ) : null}
                          </div>
                        ))}
                      </article>
                    );
                  })}
                </div>
              </A4Page>
            );
          })}
        </section>
      ))}
    </main>
  );
}
