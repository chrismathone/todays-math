import { notFound } from "next/navigation";
import { connection } from "next/server";

import { A4Page } from "@/components/print/A4Page";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import { db } from "@/lib/db";
import { devPageVisible } from "@/lib/devPageAccess";

import styles from "./ExamWire.module.css";

/**
 * **기출 시험지 2단 폼 — Wire 시안** (D-07 · 절대 규칙 1).
 *
 * 원장님이 「기출시험지용 폼을 만들어서 2단으로」라고 하셨다. 지면의 **형태를 정하는**
 * 일이므로 구현 전에 시안을 보시고 고르셔야 한다. 절차는 05 §0-3 — Wire 4~5안 →
 * 선택 → Hi-fi 4~5안 → 선택.
 *
 * ## 🔴 시안은 **실데이터**로 세운다
 *
 * 2026-08-19 에 확인테스트 범위 UI 를 중2 17개짜리 픽스처로 시안을 냈다가, 실제 시드
 * (735개)에서 폼이 화면 밖으로 밀려 원장님이 스크린샷으로 잡아 주셨다. **모양을 정하는
 * 것은 데이터의 크기다.** 그래서 이 화면은 방금 적재한 정화중 25-2-중간 **19문항 실물**을
 * DB 에서 읽어 그린다. 그리고 **레이아웃이 깨지기 쉬운 문항을 일부러 고른다** —
 *
 *   문1  가장 넓은 그림(viewBox 326)
 *   문3  ㉠~㉣ 네 줄짜리 긴 보기 + 그림 없음
 *   문6  그림 + 보기 다섯
 *   문17 서술형 · ⑴~⑷ 소문항 · 가장 긴 발문
 *   문19 그림 **두 장**을 옆으로 붙인 것
 *
 * ## 본문 렌더는 다섯 안이 **똑같다**
 *
 * 다섯 안 모두 `PaperProblemView` 하나를 거친다(그 컴포넌트의 주석: 「렌더 경로 분기
 * 금지」). 안마다 다른 것은 **문항을 감싸는 틀**뿐이다 — 그래야 비교가 틀 이야기가 되고,
 * 글자·줄바꿈이 안마다 달라 보이는 착시가 안 생긴다.
 *
 * ⚠️ DB 를 한 건도 안 바꾼다. 읽기만 한다.
 */
export const dynamic = "force-dynamic";

const EXAM_ID = "2025-jeonghwa-3-2-mid";

/** 지면이 깨지기 쉬운 자리를 일부러 고른 순서. 위 주석의 다섯 개다. */
const HARD = [1, 3, 4, 6, 12, 13, 17, 19];

/**
 * 한 장에 몰아 넣으면 `column-count` 가 **셋째 단을 만들어 지면 밖으로 흘린다** —
 * 실제로 첫 판이 그랬다(문17·19 가 종이 오른쪽 밖으로 나갔다). 지면은 유한하므로
 * 쪽을 나눈다. 나눔은 손으로 정한다 — 이 화면은 «틀»을 고르는 자리이고,
 * 자동 쪽나눔은 폼이 정해진 뒤 `TestPrint` 의 분할기가 할 일이다.
 */
const PAGES: number[][] = [
  [1, 3, 4, 6],
  [17, 19, 12, 13],
];

interface Variant {
  key: string;
  name: string;
  what: string;
  /** 이 안이 무엇을 잃는가 — 고르는 사람이 알아야 하는 대가. */
  cost: string;
}

const VARIANTS: Variant[] = [
  {
    key: "a",
    name: "A · 교과서형",
    what: "가운데 세로 구분선 · 번호와 배점을 본문 앞에 인라인으로(`1. [3.6점]`)",
    cost: "번호가 본문에 섞여 훑을 때 눈에 덜 띈다",
  },
  {
    key: "b",
    name: "B · 번호 매달기",
    what: "번호를 왼쪽 여백에 매달고(hanging) 본문은 들여쓴다 · 배점은 번호 아래 작게",
    cost: "왼쪽 여백을 쓰므로 한 단의 본문 폭이 8mm 정도 줄어든다",
  },
  {
    key: "c",
    name: "C · 머리띠형",
    what: "문항마다 위에 얇은 띠(번호 · 유형 · 배점) · 본문은 띠 아래",
    cost: "띠가 문항마다 5mm 를 먹어 한 쪽에 들어가는 문항이 줄어든다",
  },
  {
    key: "d",
    name: "D · 여백형",
    what: "선을 하나도 안 쓰고 여백만으로 나눈다 · 번호는 큰 숫자",
    cost: "긴 문항이 이어지면 어디서 끊기는지 눈으로 잡기 어렵다",
  },
  {
    key: "e",
    name: "E · 왼쪽 눈금",
    what: "문항 높이만큼 왼쪽에 얇은 세로선 · 번호를 그 위 상단에 얹는다",
    cost: "세로선이 그림 있는 문항에서 아래로 길게 늘어져 허전해 보일 수 있다",
  },
];

export default async function ExamWirePage() {
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
    },
  });

  if (problems.length === 0) {
    return (
      <main className={styles.shell}>
        <h1 className={styles.h1}>기출 2단 폼 — Wire 시안</h1>
        <p className={styles.note}>
          {EXAM_ID} 문항이 DB 에 없다. 적재부터 하고 다시 볼 것.
        </p>
      </main>
    );
  }

  const byNumber = new Map(problems.map((p) => [p.questionNumber ?? 0, p]));
  const picked = HARD.map((n) => byNumber.get(n)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p),
  );
  const missing = HARD.filter((n) => !byNumber.has(n));

  return (
    <main className={styles.shell}>
      <header className={styles.head}>
        <h1 className={styles.h1}>기출 시험지 2단 폼 — Wire 시안 5안</h1>
        <p className={styles.note}>
          정화중 25-2-중간 <strong>실제 {problems.length}문항</strong> 중,
          지면이 깨지기 쉬운 <strong>{picked.length}문항</strong>(
          {picked.map((p) => `문${p.questionNumber}`).join(" · ")})을 일부러
          골라 같은 순서로 다섯 안에 그렸다. 본문 렌더는 다섯 안이 같은
          컴포넌트를 쓰므로, 다른 것은 <strong>문항을 감싸는 틀</strong>뿐이다.
          {missing.length > 0 ? ` (못 찾은 문항: ${missing.join(", ")})` : ""}
        </p>
        <p className={styles.note}>
          고르실 것은 <strong>㉠ 어느 틀</strong>인가 하나입니다.
          머리말(학교·시험명· 이름칸)과 색·서체는{" "}
          <strong>다음 단계(Hi-fi)</strong>에서 따로 냅니다.
        </p>
      </header>

      {VARIANTS.map((v) => (
        <section key={v.key} className={styles.block}>
          <h2 className={styles.h2}>{v.name}</h2>
          <p className={styles.what}>{v.what}</p>
          <p className={styles.cost}>대가 — {v.cost}</p>
          {PAGES.map((nums, pageIndex) => {
            const pageItems = nums
              .map((n) => byNumber.get(n))
              .filter((p): p is NonNullable<typeof p> => Boolean(p));
            return (
              <A4Page
                className={styles.page}
                key={`${v.key}-${pageIndex}`}
                kind="questions"
                pageNumber={pageIndex + 1}
              >
                <div className={styles.wireHeader}>
                  <span>JH중 3학년 · 2학기 중간고사 대비</span>
                  <span>
                    {pageIndex === 0
                      ? "이름 ____________"
                      : `- ${pageIndex + 1} -`}
                  </span>
                </div>
                <div className={`${styles.columns} ${styles[`v_${v.key}`]}`}>
                  {pageItems.map((p) => (
                    <article key={p.id} className={styles.item}>
                      <div className={styles.itemHead}>
                        <span className={styles.num}>{p.questionNumber}</span>
                        <span className={styles.meta}>
                          {p.questionType !== "객관식"
                            ? `${p.questionType} `
                            : ""}
                          [{p.score}점]
                        </span>
                      </div>
                      <div className={styles.body}>
                        <PaperProblemView
                          content={p.content}
                          figureDims={p.figureDims}
                          figureSourceMm={p.figureSourceMm}
                          figureSvg={p.figureSvg}
                          figureUrls={p.figureUrls}
                          framed={false}
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </A4Page>
            );
          })}
        </section>
      ))}
    </main>
  );
}
