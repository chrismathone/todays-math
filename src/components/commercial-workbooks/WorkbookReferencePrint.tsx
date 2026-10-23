"use client";

import { useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import type { WorkbookWrongNotePrint } from "@/contracts/commercialWorkbook.contract";
import { A4Page } from "@/components/print/A4Page";
import { PaperStrip } from "@/components/paper-strip/PaperStrip";
import { addressLabel, editionLabel, messageOf } from "./presentation";
import s from "./CommercialWorkbooks.module.css";

export function ReferencePage({
  item,
  page,
  total,
  includesAnswers,
}: {
  item: WorkbookWrongNotePrint["items"][number];
  page: number;
  total: number;
  includesAnswers: boolean;
}) {
  return (
    <A4Page
      kind="questions"
      pageNumber={page}
      ariaLabel={`참조형 오답노트 ${page}쪽`}
      className={s.paper}
    >
      <header className={s.paperHeader}>
        <div>
          <h2>다시 풀어 보는 오답노트</h2>
          <p>
            {item.studentName} · {item.assignmentTitle}
          </p>
        </div>
        <span>참조형</span>
      </header>
      <article className={s.referenceItem}>
        <h3>{item.workbook.title}</h3>
        <p>{editionLabel(item.workbook)}</p>
        {item.workbook.isbn && <p>ISBN {item.workbook.isbn}</p>}
        <p>
          <strong>{addressLabel(item.address)}</strong> · 정답표 개정{" "}
          {item.keyRevision}
        </p>
        <p>
          원문 문제는 포함하지 않습니다. 해당 교재에서 위 문항을 찾아 풀어
          주세요. 쪽 표시는 단원의 시작 위치일 수 있으니 단원과 문항 번호를 함께
          확인하세요.
        </p>
        {includesAnswers && (
          <p className={s.printAnswer}>
            교사용 정답: {item.answerText ?? "미확보"}
            {item.answerText
              ? ` · ${item.keyStatus === "reviewed" ? "검토함" : "검토 전"}`
              : ""}
          </p>
        )}
        <div className={s.writingSpace} aria-label="풀이를 쓰는 공간" />
        <p>다시 확인할 점</p>
        <div className={s.reflectionSpace} />
      </article>
      <footer className={s.paperFooter}>
        {includesAnswers ? "교사용 · 정답 포함" : "학생용 · 정답 미포함"} ·{" "}
        {page} / {total}
      </footer>
    </A4Page>
  );
}

export default function WorkbookReferencePrint({
  plan,
  beforePrint,
  onClose,
}: {
  plan: WorkbookWrongNotePrint;
  beforePrint: () => Promise<WorkbookWrongNotePrint>;
  onClose: () => void;
}) {
  const [printing, setPrinting] = useState(false);
  const [output, setOutput] = useState<WorkbookWrongNotePrint | null>(null);
  const [error, setError] = useState("");
  const printRoot = useRef<HTMLDivElement>(null);
  async function print() {
    if (printing) return;
    setPrinting(true);
    setError("");
    try {
      const current = await beforePrint();
      // Re-resolve current authorization and note contents before every output.
      flushSync(() => setOutput(current));
      if (document.fonts) await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const pages = Array.from(
        printRoot.current?.querySelectorAll<HTMLElement>("[data-print-page]") ??
          [],
      );
      if (
        pages.some(
          (page) =>
            page.scrollHeight > page.clientHeight + 2 ||
            page.scrollWidth > page.clientWidth + 2,
        )
      )
        throw new Error(
          "긴 문구가 A4 지면을 넘습니다. 정답 포함을 해제하거나 교재 정보를 확인한 뒤 다시 출력해 주세요.",
        );
      window.print();
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setOutput(null);
      setPrinting(false);
    }
  }
  const pages = plan.items.map((item, index) => ({
    key: item.noteId,
    node: (
      <ReferencePage
        item={item}
        page={index + 1}
        total={plan.items.length}
        includesAnswers={plan.includesAnswers}
      />
    ),
    caption: `${item.studentName} · ${index + 1} / ${plan.items.length}쪽`,
    enlargeLabel: `${index + 1}쪽 확대`,
  }));
  return (
    <section className={s.stack} aria-label="참조형 오답노트 인쇄 미리보기">
      <div className={s.header}>
        <div>
          <h2>참조형 오답노트</h2>
          <p>
            {plan.items.length}문항 · A4 {plan.items.length}쪽 ·{" "}
            {plan.includesAnswers ? "교사용 정답 포함" : "학생용 정답 미포함"}
          </p>
        </div>
        <div className={s.actions}>
          <button
            type="button"
            className={s.button}
            disabled={printing}
            onClick={onClose}
          >
            미리보기 닫기
          </button>
          <button
            type="button"
            className={s.primary}
            disabled={printing}
            onClick={() => void print()}
          >
            {printing ? "출력 확인 중…" : "A4 인쇄"}
          </button>
        </div>
      </div>
      <p className={s.notice}>
        교재의 원문 문제를 보며 푸는 참조용 지면입니다. 저장한 교정 메모는
        학생용 지면에 싣지 않습니다. 출력 직전에 저장본과 접근 권한을 다시
        확인합니다.
      </p>
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}
      <PaperStrip
        pages={pages}
        label="참조형 오답노트 지면"
        hint="쪽을 누르면 크게 볼 수 있습니다. 문항마다 충분한 풀이 공간을 제공합니다."
      />
      {output &&
        createPortal(
          <div
            data-workbook-print-root
            className={s.printPortal}
            ref={printRoot}
          >
            {output.items.map((item, index) => (
              <ReferencePage
                key={item.noteId}
                item={item}
                page={index + 1}
                total={output.items.length}
                includesAnswers={output.includesAnswers}
              />
            ))}
          </div>,
          document.body,
        )}
    </section>
  );
}
