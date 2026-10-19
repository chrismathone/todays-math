"use client";

/**
 * 오늘의 영어 — 인쇄 미리보기 (D-148 · 25 §5 · 브리프 english-print §1 · D-151 · 25 §12.11).
 *
 * 도구 줄(묶음 고르기 · 인쇄하기 · 닫기)과 A4 지면 묶음. 라우트 `/english/sets/[id]/print` 가
 * 크롬 없이 이 컴포넌트 하나를 그린다. 도구 줄·지면 묶음의 모양은 수학 인쇄 미리보기(`TestPrint`)와
 * **같은 클래스**를 쓴다 — 한 자리를 고치면 두 미리보기가 같이 바뀐다(«모든 화면 일치»).
 *
 * 학생용 묶음(3자 합의 — 리드 · codex · grok, 2026-10-01):
 *   - 학생용은 **순서가 있는 묶음**이다(`planEnglishBundles`). 묶음을 **하나씩 골라** 미리 보고 뽑는다 — 한 묶음이 한 인쇄 작업이라
 *     양면으로 뽑아도 다른 묶음이 같은 종이에 안 붙고, 뒤 묶음은 고를 때만 종이가 된다. 처음 열리면 묶음 1. 교사용은 따로.
 *   - 도구 줄 둘째 줄이 묶음 단추(«묶음 1 / 변형 · 3~4번 · 1쪽») — 도구 줄은 위에 붙어 따라오므로 지면을 굴리는 동안에도 남는다.
 *     배부 순서 · 누출 줄은 도구 줄 아래 카드(따라오지 않는다). 누출 줄은 «까닭 → 합치면 생기는 일 → 단추» 차례다.
 *   - 🔴 어법의 밑줄 표기가 깨졌으면 학생용 묶음을 **전부** 막는다(일부만 배부하면 세트가 중간에 끊긴다). 교사용은 연다.
 *   - 🔴 화면은 순서를 막지 않는다(묶음 3 부터 뽑아도 된다) — 실사용 확인 항목으로 남겼다(`/dev/print-check`).
 *
 * 문구는 D-08(사무적 · 느낌표·이모지 없음). 인쇄는 `window.print()` — 수학처럼 «인쇄됨» 표시 API 가 없다.
 * 쪽 나눔을 재기 전에는 «인쇄하기»가 눌리지 않는다 — 한 쪽에 전부 올린 임시 지면이 종이로 나가면 안 된다.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import printStyles from "@/components/print/TestPrint.module.css";
import type { EnglishExam, EnglishSet } from "@/contracts/english.contract";
import {
  englishBundleNotices,
  englishQuestionRange,
  planEnglishBundles,
} from "@/lib/english/bundle";
import {
  englishUnderlineNotices,
  findEnglishUnderlineProblems,
} from "@/lib/english/underline";

import {
  EnglishPaper,
  englishPaperSelection,
  type EnglishPaperProps,
  type EnglishPaperView,
  type EnglishTeacherNote,
} from "./EnglishPaper";
import styles from "./EnglishPrint.module.css";
import { englishPaperBlocks } from "./englishPaperLayout";
import { useEnglishPages } from "./useEnglishPages";

export const ENGLISH_NOT_REVIEWED_NOTICE =
  "아직 검토 완료하지 않은 문제입니다.";

export interface EnglishPrintClientProps {
  set: EnglishSet;
  exam: Pick<EnglishExam, "school" | "grade" | "title">;
  academyName: string;
  initialView?: EnglishPaperView;
  /** 처음 고를 학생용 묶음(1부터) — 없는 번호면 묶음 1 */
  initialBundle?: number;
  /** 변형 문항을 한 묶음으로 합친 채로 시작한다 */
  initialMerged?: boolean;
}

/** 검색 인수 `?view=` 를 읽는다 — 모르는 값은 학생용 */
export function parseEnglishPrintView(value: unknown): EnglishPaperView {
  return value === "teacher" ? "teacher" : "student";
}

/** 검색 인수 `?bundle=` 을 읽는다 — 1 이상의 정수만, 나머지는 묶음 1 */
export function parseEnglishPrintBundle(value: unknown): number {
  return typeof value === "string" && /^[1-9]\d?$/.test(value)
    ? Number(value)
    : 1;
}

/** 검색 인수 `?merge=` 를 읽는다 — `1` 만 합침 */
export function parseEnglishPrintMerge(value: unknown): boolean {
  return value === "1";
}

function rememberSheet(
  view: EnglishPaperView,
  bundle: number,
  merged: boolean,
) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("view", view);
    if (view === "student") url.searchParams.set("bundle", String(bundle));
    else url.searchParams.delete("bundle");
    if (merged) url.searchParams.set("merge", "1");
    else url.searchParams.delete("merge");
    window.history.replaceState(window.history.state, "", url);
  } catch {
    /* 주소를 못 고치는 환경 — 화면 상태만 바뀐다 */
  }
}

type Paper = Omit<EnglishPaperProps, "pages">;

/** 고를 수 있는 지면 하나 — 학생용 묶음 또는 교사용 */
interface Sheet {
  key: string;
  view: EnglishPaperView;
  /** 학생용 묶음 번호(1부터) — 교사용은 0 */
  no: number;
  name: string;
  detail: string;
  paper: Paper;
}

/**
 * 고르지 않은 지면의 쪽 수만 잰다 — 묶음 단추가 «1쪽»을 말해야 뽑기 전에 종이 수를 안다(3자 합의 «나»).
 * 측정 틀은 화면 밖 · 인쇄 매체에서 `display: none` 이라 종이에 나가지 않는다.
 */
function SheetPageCount({
  sheet,
  onCount,
}: {
  sheet: Sheet;
  onCount: (key: string, count: number | null) => void;
}) {
  const { pages, ready, layoutError, measureNode } = useEnglishPages(
    sheet.paper,
  );
  const count = ready && !layoutError && pages ? pages.length : null;
  useEffect(() => onCount(sheet.key, count), [sheet.key, count, onCount]);
  return <>{measureNode}</>;
}

export function EnglishPrintClient({
  set,
  exam,
  academyName,
  initialView = "student",
  initialBundle = 1,
  initialMerged = false,
}: EnglishPrintClientProps) {
  const [view, setView] = useState<EnglishPaperView>(initialView);
  const [bundleNo, setBundleNo] = useState(initialBundle);
  const [merged, setMerged] = useState(initialMerged);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number | null>>({});

  const plan = useMemo(
    () => planEnglishBundles(set, { merge: merged }),
    [set, merged],
  );
  const notices = useMemo(() => englishBundleNotices(plan), [plan]);
  const underline = useMemo(
    () => englishUnderlineNotices(findEnglishUnderlineProblems(set.questions)),
    [set.questions],
  );

  const sheets = useMemo<Sheet[]>(() => {
    // 묶음이 하나뿐이면 가른 것이 없다 — 단추는 «학생용», 종이에 묶음 줄 없음
    const single = plan.bundles.length === 1;
    const teacherNotes: EnglishTeacherNote[] = [
      ...(notices.order
        ? [
            { label: "배부 순서", text: notices.order },
            { label: "답이 보이는 문항", text: notices.shown },
          ]
        : []),
      // 밑줄 구간이 아예 없는 오류는 종이에서 스스로 보이지 않는다 — 교사용에는 적는다
      ...(underline.teacherNote
        ? [{ label: "밑줄 표기", text: underline.teacherNote }]
        : []),
    ];
    const base = { set, exam, academyName };
    return [
      ...plan.bundles.map((bundle) => ({
        key: `student:${bundle.questions.join(",")}:${bundle.passage}`,
        view: "student" as const,
        no: bundle.no,
        name: single ? "학생용" : `묶음 ${bundle.no}`,
        detail: `${bundle.kind} · ${englishQuestionRange(bundle.questions)}`,
        paper: {
          ...base,
          view: "student" as const,
          bundle: {
            no: single ? null : bundle.no,
            questions: bundle.questions,
            passage: bundle.passage,
          },
        },
      })),
      {
        key: "teacher",
        view: "teacher" as const,
        no: 0,
        name: "교사용",
        detail: "정답 · 해설 · 모든 문항",
        paper: { ...base, view: "teacher" as const, teacherNotes },
      },
    ];
  }, [plan, notices, underline, set, exam, academyName]);

  const teacher = sheets[sheets.length - 1]!;
  const current =
    view === "teacher"
      ? teacher
      : (sheets.find(
          (sheet) => sheet.view === "student" && sheet.no === bundleNo,
        ) ?? sheets[0]!);

  const { pages, ready, layoutError, oversized, measureNode } = useEnglishPages(
    current.paper,
  );
  const reviewed = set.status === "검토 완료";
  const blocks = englishPaperBlocks(
    set,
    englishPaperSelection(current.paper.view, current.paper.bundle),
  );
  const oversizedNames = oversized.map((index) => {
    const block = blocks[index];
    if (!block) return `${index + 1}번째 블록`;
    return block.kind === "passage"
      ? `지문 ${block.paragraph + 1}번째 문단`
      : `${block.index + 1}번 문항`;
  });

  const report = useCallback((key: string, count: number | null) => {
    setCounts((previous) =>
      previous[key] === count ? previous : { ...previous, [key]: count },
    );
  }, []);
  const pageCount = (sheet: Sheet) =>
    sheet.key === current.key
      ? ready && !layoutError && pages
        ? pages.length
        : null
      : (counts[sheet.key] ?? null);
  const describe = (sheet: Sheet) => {
    const count = pageCount(sheet);
    return count === null ? sheet.detail : `${sheet.detail} · ${count}쪽`;
  };

  function choose(sheet: Sheet) {
    setView(sheet.view);
    if (sheet.view === "student") setBundleNo(sheet.no);
    rememberSheet(
      sheet.view,
      sheet.view === "student" ? sheet.no : bundleNo,
      merged,
    );
  }
  function toggleMerge() {
    const next = !merged;
    setMerged(next);
    // 묶음 수가 바뀐다 — 학생용을 보고 있었으면 묶음 1 로
    setBundleNo(1);
    rememberSheet(view, 1, next);
  }

  // 🔴 어법의 밑줄 표기가 깨졌으면 학생용 묶음을 전부 막는다 — 교사용은 연다(고치려고 보는 종이다)
  const blocked = current.view === "student" && underline.errors.length > 0;

  return (
    <main className={printStyles.previewShell}>
      <header className={printStyles.previewToolbar}>
        <div>
          <div className={printStyles.previewEyebrow}>
            오늘 영어 · 인쇄 미리보기
          </div>
          <h1>{set.title}</h1>
          <p>
            {exam.school} {exam.grade} · {exam.title} · {set.questions.length}
            문항
          </p>
        </div>
        <div className={printStyles.toolbarActions}>
          {/*
            🔴 잰 뒤라도 틀이 깨졌으면(layoutError) 잠근다 — 그때 `pages` 는 없고 지면은 «전부 한 쪽» 임시본이라,
               `.a4Page` 의 overflow:hidden 에 조용히 잘려 종이로 나간다(리드 검토 D1 · 수학 WorksheetPrint 의 ready && !layoutError 결).
          */}
          <button
            className={printStyles.printButton}
            disabled={!ready || layoutError || blocked}
            onClick={() => window.print()}
            type="button"
          >
            {layoutError || blocked
              ? "인쇄할 수 없음"
              : ready
                ? `인쇄하기 — ${current.name}`
                : "지면 준비 중"}
          </button>
          <button
            className={printStyles.backLink}
            onClick={() => window.close()}
            type="button"
          >
            닫기
          </button>
        </div>
        <div aria-label="지면 종류" className={styles.sheetSwitch} role="group">
          {sheets.map((sheet) => (
            <button
              aria-label={`${sheet.name} — ${describe(sheet)}`}
              aria-pressed={sheet.key === current.key}
              className={[
                styles.sheetButton,
                sheet.view === "teacher" ? styles.sheetTeacher : "",
              ].join(" ")}
              key={sheet.key}
              onClick={() => choose(sheet)}
              type="button"
            >
              <span>{sheet.name}</span>
              <span className={styles.sheetDetail}>{describe(sheet)}</span>
            </button>
          ))}
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
        {underline.errors.map((message) => (
          <p className={printStyles.printError} key={message} role="alert">
            {message}
          </p>
        ))}
        {underline.warning ? (
          <p className={printStyles.printWarning} role="status">
            {underline.warning}
          </p>
        ) : null}
        {!layoutError && oversizedNames.length ? (
          <p className={printStyles.printWarning} role="status">
            한 쪽보다 길어 지면에서 잘릴 수 있습니다 —{" "}
            {oversizedNames.join(" · ")}. 지문을 빈 줄로 나누거나 문항을 줄인 뒤
            다시 인쇄하십시오.
          </p>
        ) : null}
      </header>

      {notices.handout ? (
        <section aria-label="배부 안내" className={styles.noticeCard}>
          <p className={styles.noticeRow}>
            <span className={styles.noticeLabel}>배부 순서</span>
            <span>{notices.handout}</span>
          </p>
          <div
            className={[
              styles.noticeRow,
              notices.leak.tone === "none" ? "" : styles.noticeRowWarn,
            ].join(" ")}
          >
            <span
              className={[
                styles.noticeLabel,
                notices.leak.tone === "none" ? "" : styles.noticeLabelWarn,
              ].join(" ")}
            >
              {notices.leak.tone === "none" ? "누출 검사" : "답이 보이는 문항"}
            </span>
            <span>{notices.leak.text}</span>
            {/* 영향 문장이 단추보다 먼저 — 읽고 나서 누른다(3자 합의 «가-2») */}
            {notices.merge?.effect ? (
              <span className={styles.noticeEffect}>
                {notices.merge.effect}
              </span>
            ) : null}
            {notices.evidence.length ? (
              <button
                aria-expanded={evidenceOpen}
                className={styles.noticeButton}
                onClick={() => setEvidenceOpen((open) => !open)}
                type="button"
              >
                근거 보기
              </button>
            ) : null}
            {notices.merge ? (
              <button
                className={styles.noticeButton}
                onClick={toggleMerge}
                type="button"
              >
                {notices.merge.label}
              </button>
            ) : null}
          </div>
          {evidenceOpen && notices.evidence.length ? (
            <ul className={styles.noticeEvidence}>
              {notices.evidence.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <div
        aria-label="지면 미리보기"
        className={printStyles.pageGallery}
        data-english-pages-ready={ready && !layoutError ? "true" : "false"}
        role="region"
        tabIndex={0}
      >
        <EnglishPaper {...current.paper} pages={pages} />
      </div>
      {measureNode}
      {sheets
        .filter((sheet) => sheet.key !== current.key)
        .map((sheet) => (
          <SheetPageCount key={sheet.key} onCount={report} sheet={sheet} />
        ))}
    </main>
  );
}
