import { notFound } from "next/navigation";
import { connection } from "next/server";
import learn from "@/components/learn/learn.module.css";
import s from "@/components/math-srs/authenticated.module.css";
import { devPageVisible } from "@/lib/devPageAccess";
import { CONCEPTS } from "@/lib/math-srs/concepts";
import { QuickQuestionCard } from "../QuickPhone";
import { stressItems } from "../samples";

export const metadata = {
  title: "한 걸음 문항 넘침 측정 · 오늘 수학",
  robots: { index: false, follow: false },
};

/**
 * Playwright 넘침 측정용 — 모양 × 난이도마다 가장 빡빡한 표본(보기가 가장 넓은 둘 · 발문이 가장 긴 하나)을
 * 학생 화면과 **같은 가로 틀**(`student practiceViewport` › `practiceBody` › 문제 카드)에 줄지어 싣는다.
 * 세로는 한 화면 높이를 풀어 둔다(가로 넘침과 발문 줄 수만 잰다 — 세로 잘림은 `frame` 에서 잰다).
 */
export default async function QuickItemStressPage({
  searchParams,
}: {
  searchParams: Promise<{ pool?: string }>;
}) {
  await connection();
  if (!(await devPageVisible())) notFound();
  const { pool } = await searchParams;
  const items = stressItems(Math.min(400, Math.max(10, Number(pool) || 120)));
  return (
    <div className={learn.page}>
      {items.map((item, i) => (
        <div
          key={`${item.templateId}:${item.difficulty}:${i}`}
          className={`${s.student} ${s.practiceViewport}`}
          style={{ height: "auto", minHeight: 0, paddingBottom: 0 }}
          data-quick-stress={`${item.templateId}|${item.difficulty}|${item.prompt}`}
        >
          <main className={`${s.body} ${s.practiceBody}`}>
            <QuickQuestionCard
              item={item}
              interactive={false}
              conceptTitle={
                CONCEPTS.find((c) => c.id === item.conceptId)?.title ??
                item.conceptId
              }
            />
          </main>
        </div>
      ))}
    </div>
  );
}
