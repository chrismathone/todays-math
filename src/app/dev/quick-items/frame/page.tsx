import { notFound } from "next/navigation";
import { connection } from "next/server";
import learn from "@/components/learn/learn.module.css";
import { StudentMobileNav } from "@/components/learn/StudentMobileNav";
import { devPageVisible } from "@/lib/devPageAccess";
import { CONCEPTS } from "@/lib/math-srs/concepts";
import {
  generateQuickItemOfShape,
  toQuickItem,
} from "@/lib/math-srs/quick/generate";
import { QuickPhone } from "../QuickPhone";
import { parseDifficulty, shapeByTemplate } from "../samples";

export const metadata = {
  title: "한 걸음 문항 폰 화면 · 오늘 수학",
  robots: { index: false, follow: false },
};

/**
 * 한 걸음 문항 하나를 학생 폰 화면 그대로 — `/dev/quick-items` 가 320·390 폭 틀에 싣는다.
 * `?t=<templateId>&d=<난이도>&s=<씨앗>`. DB 를 읽지 않는다.
 */
export default async function QuickItemFramePage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; d?: string; s?: string; step?: string }>;
}) {
  await connection();
  if (!(await devPageVisible())) notFound();
  const { t, d, s, step } = await searchParams;
  const shape = t ? shapeByTemplate(t) : undefined;
  const difficulty = parseDifficulty(d);
  const seed = Number(s);
  if (!shape || !difficulty || !Number.isInteger(seed)) notFound();
  const item = toQuickItem(
    generateQuickItemOfShape({
      templateId: shape.templateId,
      difficulty,
      seed,
    }),
  );
  const conceptTitle =
    CONCEPTS.find((c) => c.id === shape.conceptId)?.title ?? shape.conceptId;
  return (
    <div className={learn.page}>
      <QuickPhone
        item={item}
        conceptTitle={conceptTitle}
        step={Math.min(12, Math.max(1, Number(step) || 3))}
      />
      <StudentMobileNav previewPath="/learn/math-srs/algebra" />
    </div>
  );
}
