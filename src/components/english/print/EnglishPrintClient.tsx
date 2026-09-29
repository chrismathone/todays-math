"use client";

/**
 * 오늘의 영어 — 인쇄 미리보기 (D-148 · 25 §5 · 브리프 english-print §1).
 *
 * 도구 줄(학생용/교사용 전환 · 인쇄하기 · 닫기)과 A4 지면 묶음. 라우트 `/english/sets/[id]/print` 가
 * 크롬 없이 이 컴포넌트 하나를 그린다. 도구 줄·지면 묶음의 모양은 수학 인쇄 미리보기(`TestPrint`)와
 * **같은 클래스**를 쓴다 — 한 자리를 고치면 두 미리보기가 같이 바뀐다(«모든 화면 일치»).
 *
 * 문구는 D-08(사무적 · 느낌표·이모지 없음). 인쇄는 `window.print()` — 수학처럼 «인쇄됨» 표시 API 가 없다.
 * 쪽 나눔을 재기 전에는 «인쇄하기»가 눌리지 않는다 — 한 쪽에 전부 올린 임시 지면이 종이로 나가면 안 된다.
 */
import { useState } from "react";

import printStyles from "@/components/print/TestPrint.module.css";
import type { EnglishExam, EnglishSet } from "@/contracts/english.contract";

import { EnglishPaper, type EnglishPaperView } from "./EnglishPaper";
import { englishPaperBlocks } from "./englishPaperLayout";
import { useEnglishPages } from "./useEnglishPages";

export const ENGLISH_NOT_REVIEWED_NOTICE =
  "아직 검토 완료하지 않은 문제입니다.";

export interface EnglishPrintClientProps {
  set: EnglishSet;
  exam: Pick<EnglishExam, "school" | "grade" | "title">;
  academyName: string;
  initialView?: EnglishPaperView;
}

/** 검색 인수 `?view=` 를 읽는다 — 모르는 값은 학생용 */
export function parseEnglishPrintView(value: unknown): EnglishPaperView {
  return value === "teacher" ? "teacher" : "student";
}

function rememberView(view: EnglishPaperView) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    window.history.replaceState(window.history.state, "", url);
  } catch {
    /* 주소를 못 고치는 환경 — 화면 상태만 바뀐다 */
  }
}

export function EnglishPrintClient({
  set,
  exam,
  academyName,
  initialView = "student",
}: EnglishPrintClientProps) {
  const [view, setView] = useState<EnglishPaperView>(initialView);
  const paper = { set, exam, view, academyName };
  const { pages, ready, layoutError, oversized, measureNode } =
    useEnglishPages(paper);
  const reviewed = set.status === "검토 완료";
  const blocks = englishPaperBlocks(set);
  const oversizedNames = oversized.map((index) => {
    const block = blocks[index];
    if (!block) return `${index + 1}번째 블록`;
    return block.kind === "passage"
      ? `지문 ${block.paragraph + 1}번째 문단`
      : `${block.index + 1}번 문항`;
  });

  function choose(next: EnglishPaperView) {
    setView(next);
    rememberView(next);
  }

  return (
    <main className={printStyles.previewShell}>
      <header className={printStyles.previewToolbar}>
        <div>
          <div className={printStyles.previewEyebrow}>
            오늘의 영어 · 인쇄 미리보기
          </div>
          <h1>{set.title}</h1>
          <p>
            {exam.school} {exam.grade} · {exam.title} · {set.questions.length}
            문항
          </p>
        </div>
        <div className={printStyles.toolbarActions}>
          <div
            aria-label="지면 종류"
            className={printStyles.modeSwitch}
            role="group"
          >
            <button
              aria-pressed={view === "student"}
              onClick={() => choose("student")}
              type="button"
            >
              학생용
            </button>
            <button
              aria-pressed={view === "teacher"}
              onClick={() => choose("teacher")}
              type="button"
            >
              교사용
            </button>
          </div>
          <button
            className={printStyles.printButton}
            disabled={!ready}
            onClick={() => window.print()}
            type="button"
          >
            {ready ? "인쇄하기" : "지면 준비 중"}
          </button>
          <button
            className={printStyles.backLink}
            onClick={() => window.close()}
            type="button"
          >
            닫기
          </button>
        </div>
        {!reviewed ? (
          <p className={printStyles.printWarning} role="status">
            {ENGLISH_NOT_REVIEWED_NOTICE}
          </p>
        ) : null}
        {layoutError ? (
          <p className={printStyles.printError} role="alert">
            지면 크기를 재지 못했습니다. 창을 새로 고친 뒤 다시 시도해 주세요.
          </p>
        ) : null}
        {oversizedNames.length ? (
          <p className={printStyles.printWarning} role="status">
            한 쪽보다 길어 지면에서 잘릴 수 있습니다 —{" "}
            {oversizedNames.join(" · ")}. 지문을 빈 줄로 나누거나 문항을 줄인 뒤
            다시 인쇄하십시오.
          </p>
        ) : null}
      </header>

      <div
        aria-label="지면 미리보기"
        className={printStyles.pageGallery}
        data-english-pages-ready={ready ? "true" : "false"}
        role="region"
        tabIndex={0}
      >
        <EnglishPaper {...paper} pages={pages} />
      </div>
      {measureNode}
    </main>
  );
}
