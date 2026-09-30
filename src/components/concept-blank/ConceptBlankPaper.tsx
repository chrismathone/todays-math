import type { ConceptBlankSheet } from "@/contracts/conceptBlank.contract";
import { CONCEPT_BLANK_FORM_LABELS } from "@/contracts/conceptBlank.contract";

/**
 * 개념 백지 A4 지면(D-150) — 🔴 자리 표시: 트랙 cb-paper 가 이 파일의 속을 다섯 형식 지면으로 바꾼다.
 * 겉(이름 · props)은 바꾸지 않는다 — 화면 트랙(cb-app)의 미리보기와 인쇄 페이지가 이 겉으로 부른다.
 * 훅을 쓰지 않는다(서버 인쇄 페이지에서도 그린다).
 */
export type ConceptBlankPaperProps = {
  sheets: ConceptBlankSheet[];
  /** 학생지만 · 채점표만 · 둘 다(학생지 뒤에 채점표). */
  view: "student" | "key" | "both";
};

export default function ConceptBlankPaper({
  sheets,
  view,
}: ConceptBlankPaperProps) {
  return (
    <div data-concept-blank-paper={view}>
      {sheets.map((sheet, i) => (
        <section key={i} data-form={sheet.form}>
          <h2>
            {CONCEPT_BLANK_FORM_LABELS[sheet.form]} · {sheet.header.title}
          </h2>
        </section>
      ))}
    </div>
  );
}
