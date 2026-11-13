"use client";

import { reopenAnyArithmeticSheet } from "@/lib/arithmeticDocument";
import { listArithmeticV2PrintItems } from "@/lib/arithmetic-v2";
import { gradeArithmeticPaperPages } from "@/components/arithmetic/GradeArithmeticPaper";
import { arithmeticPaperPages } from "@/components/arithmetic/ArithmeticPaper";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import { PaperStrip } from "@/components/paper-strip/PaperStrip";
import { accountDate } from "./AccountReview";
import type { DocumentDetail } from "./documentTypes";
import d from "./detail.module.css";

export default function AdminArithmeticPreview({
  document,
}: {
  document: DocumentDetail;
}) {
  let pages;
  try {
    const sheet = reopenAnyArithmeticSheet(document.payload);
    const items =
      sheet.payloadVersion === 2 ? listArithmeticV2PrintItems(sheet) : [];
    pages =
      sheet.payloadVersion === 2
        ? gradeArithmeticPaperPages({
            problems: arithmeticToStudioProblems(sheet),
            rounds: sheet.rounds.map((round) => ({
              round: round.round,
              items: items.filter((item) => item.round === round.round),
            })),
            title: document.title,
            mode: "both",
            density: 24,
          })
        : arithmeticPaperPages({
            sheet,
            title: document.title,
            mode: "both",
            density: 24,
          });
  } catch {
    return <p role="alert">저장된 연산 명세와 정답을 확인할 수 없습니다.</p>;
  }
  return (
    <article>
      <header className={d.previewHeading}>
        <span className={d.kind}>연산 연습지 · 읽기 전용</span>
        <h2>{document.title}</h2>
        <p>
          버전 {document.revision} · 수정 {accountDate(document.updatedAt)}
        </p>
      </header>
      <PaperStrip pages={pages} hint="저장된 식과 답을 그대로 표시합니다." />
    </article>
  );
}
