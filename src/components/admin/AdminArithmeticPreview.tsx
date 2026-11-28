"use client";

import { useMemo } from "react";
import { reopenAnyArithmeticSheet } from "@/lib/arithmeticDocument";
import { listArithmeticV2PrintItems } from "@/lib/arithmetic-v2";
import { gradeArithmeticPaperPages } from "@/components/arithmetic/GradeArithmeticPaper";
import { arithmeticPaperPages } from "@/components/arithmetic/ArithmeticPaper";
import { arithmeticToStudioProblems } from "@/lib/arithmeticOutput";
import { arithmeticSheetPacks } from "@/lib/arithmetic-v2/presentation/preparePacks";
import { useArithmeticPackPreparation } from "@/components/arithmetic/useArithmeticPackPreparation";
import { PaperStrip } from "@/components/paper-strip/PaperStrip";
import { accountDate } from "./AccountReview";
import type { DocumentDetail } from "./documentTypes";
import d from "./detail.module.css";

export default function AdminArithmeticPreview({
  document,
}: {
  document: DocumentDetail;
}) {
  const sheet = useMemo(() => {
    try {
      return reopenAnyArithmeticSheet(document.payload);
    } catch {
      return undefined;
    }
  }, [document.payload]);
  const requests = useMemo(
    () => (sheet ? arithmeticSheetPacks(sheet) : []),
    [sheet],
  );
  const { ready, failed, retry } = useArithmeticPackPreparation(requests);
  if (!sheet)
    return <p role="alert">저장된 연산 명세와 정답을 확인할 수 없습니다.</p>;
  if (!ready)
    return failed ? (
      <div>
        <p role="alert">연산 그림 자료를 불러오지 못했습니다.</p>
        <button type="button" onClick={retry}>
          다시 시도
        </button>
      </div>
    ) : (
      <p role="status">연산 그림 자료를 불러오는 중입니다.</p>
    );
  let pages;
  try {
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
