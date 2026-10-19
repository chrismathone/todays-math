import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { MathText } from "@/components/math/MathText";
import { devPageVisible } from "@/lib/devPageAccess";
import { CONCEPTS } from "@/lib/math-srs/concepts";
import {
  QUICK_SHAPES,
  generateQuickItemOfShape,
  type QuickItemPreview,
} from "@/lib/math-srs/quick/generate";
import b from "./quick-items.module.css";
import {
  PREVIEW_DIFFICULTIES,
  PREVIEW_PER_DIFFICULTY,
  previewSeed,
} from "./samples";

export const metadata = {
  title: "한 걸음 문항 시안 · 오늘 수학",
  robots: { index: false, follow: false },
};

const PHONES = [
  { w: 320, h: 568, label: "320 × 568" },
  { w: 390, h: 700, label: "390 × 700" },
] as const;

/**
 * 모바일 «한 걸음» 문항 시안 — 원장님이 모양을 고르는 화면(D-07). 개발 전용, DB 없음.
 * 모양마다 번호를 붙여 «몇 번 빼 주세요»로 부를 수 있게 한다. 폰 화면은 `frame` 을 틀에 싣는다
 * (학생 화면 CSS 가 뷰포트 폭으로 갈리므로 같은 폭의 틀이어야 실제와 같다).
 */
export default async function QuickItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ set?: string }>;
}) {
  await connection();
  if (!(await devPageVisible())) notFound();
  const { set } = await searchParams;
  const base = Math.min(9, Math.max(1, Number(set) || 1));

  return (
    <main className={b.page}>
      <header className={b.head}>
        <h1>한 걸음 문항 시안</h1>
        <p>
          폰 «오늘의 복습»에서 문제 전체를 풀게 하지 않고, 그 개념의 핵심 한
          단계만 묻는 문항입니다. 모양은 {QUICK_SHAPES.length}개이고 번호가 붙어
          있습니다. 빼거나 고칠 모양은 번호로 알려 주세요.
        </p>
        <p className={b.muted}>
          난이도 1·3·5 마다 표본 {PREVIEW_PER_DIFFICULTY}개(폰 화면은 첫 표본).
          폭 320은 작은 폰, 390은 보통 폰입니다. 폰 화면의 보기를 누르면
          맞음·틀림이 보입니다 — 아무것도 기록되지 않습니다.
        </p>
        <nav className={b.nav} aria-label="다른 표본">
          <span>다른 표본</span>
          {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={`/dev/quick-items?set=${n}`}
              aria-current={n === base ? "page" : undefined}
            >
              {n}
            </Link>
          ))}
        </nav>
        <nav className={b.nav} aria-label="개념">
          <span>개념</span>
          {CONCEPTS.map((c) => (
            <Link key={c.id} href={`#${c.id}`}>
              {c.title}
            </Link>
          ))}
        </nav>
      </header>

      {CONCEPTS.map((concept) => (
        <section key={concept.id} id={concept.id} className={b.concept}>
          <h2>{concept.title}</h2>
          {QUICK_SHAPES.filter((s) => s.conceptId === concept.id).map(
            (shape) => {
              const rows = PREVIEW_DIFFICULTIES.map((difficulty) => ({
                difficulty,
                samples: Array.from(
                  { length: PREVIEW_PER_DIFFICULTY },
                  (_, i) => {
                    const seed = previewSeed(base, difficulty, i);
                    return {
                      seed,
                      item: generateQuickItemOfShape({
                        templateId: shape.templateId,
                        difficulty,
                        seed,
                      }),
                    };
                  },
                ),
              }));
              const mistakes = [
                ...new Set(
                  rows.flatMap((r) =>
                    r.samples.flatMap((x) => x.item.mistakes.filter(Boolean)),
                  ),
                ),
              ];
              return (
                <article
                  key={shape.templateId}
                  id={`shape-${shape.no}`}
                  className={b.shape}
                  data-quick-shape={shape.templateId}
                >
                  <h3>
                    <span className={b.no}>{shape.no}</span>
                    {shape.title}
                  </h3>
                  <p className={b.muted}>
                    {shape.summary} · 목표 {shape.seconds[0]}~{shape.seconds[1]}
                    초 · <code>{shape.templateId}</code>
                  </p>
                  <p className={b.rules}>오답 규칙: {mistakes.join(" · ")}</p>
                  {rows.map(({ difficulty, samples }) => (
                    <div key={difficulty} className={b.row}>
                      <div className={b.info}>
                        {samples.map(({ seed, item }) => (
                          <Sample key={seed} item={item} />
                        ))}
                      </div>
                      {PHONES.map((phone) => (
                        <figure key={phone.w} className={b.phone}>
                          <iframe
                            src={`/dev/quick-items/frame?t=${encodeURIComponent(shape.templateId)}&d=${difficulty}&s=${samples[0]!.seed}`}
                            width={phone.w}
                            height={phone.h}
                            loading="lazy"
                            title={`${shape.no}번 ${shape.title} 난이도 ${difficulty} — 폭 ${phone.w}`}
                          />
                          <figcaption>{phone.label}</figcaption>
                        </figure>
                      ))}
                    </div>
                  ))}
                </article>
              );
            },
          )}
        </section>
      ))}
    </main>
  );
}

function Sample({ item }: { item: QuickItemPreview }) {
  return (
    <div className={b.sample}>
      <p className={b.level}>
        난이도 {item.difficulty} · 목표 {item.expectedSeconds}초
      </p>
      <MathText as="div" className={b.prompt} text={item.prompt} />
      {item.equation ? (
        <MathText as="div" className={b.equation} text={item.equation} />
      ) : null}
      <ol className={b.choices}>
        {item.choices.map((choice, i) => (
          <li
            key={choice}
            data-correct={i === item.answerIndex ? "true" : undefined}
          >
            <span className={b.choiceNo}>{i + 1}</span>
            <MathText text={choice} />
            <span className={b.why}>
              {i === item.answerIndex ? "정답" : item.mistakes[i]}
            </span>
          </li>
        ))}
      </ol>
      <MathText
        as="div"
        className={b.solution}
        text={`풀이 ${item.solution.join(" ")}`}
      />
    </div>
  );
}
