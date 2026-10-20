"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TestPrint } from "@/components/print/TestPrint";
import { PastPaperPrint } from "@/components/print/PastPaperPrint";
import type { TestPrintProblem } from "@/components/print/types";
import { parseNativeDescriptiveProblem } from "@/contracts/nativeDescriptive.contract";
import { toNativeDescriptivePrint } from "@/lib/print/descriptive";
import fixture from "./rectangleFixture.json";
import { WorksheetPrint } from "@/components/unified/print/WorksheetPrint";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type PrintTemplate,
} from "@/components/unified/print/types";
import styles from "./DescriptivePaperPreview.module.css";

// Keep the local fixture in the client module instead of repeatedly streaming
// its large SVG and teacher payload through the dev route's Flight response.
const authored = parseNativeDescriptiveProblem(fixture.problem);
if (authored.revision !== 2) throw new Error("서술형 r2 견본이 필요합니다.");
const problem: TestPrintProblem = {
  id: authored.externalId,
  orderIndex: 0,
  content: authored.content,
  answer: authored.answer,
  solution: authored.solution,
  questionType: "서술형",
  figureSvg: fixture.figureSvg,
  nativeDescriptive: toNativeDescriptivePrint(authored),
};

/** Only the unregistered fixture differs; the paper itself is the product renderer. */
export function DescriptivePaperPreview({
  paper,
  audience,
  monochrome,
  mixed,
  unified = false,
  template = "jaseup",
  columns = 1,
}: {
  paper: "daily" | "review" | "past";
  audience: "student" | "teacher";
  monochrome: boolean;
  mixed: boolean;
  unified?: boolean;
  template?: PrintTemplate;
  columns?: 1 | 2;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [unifiedReady, setUnifiedReady] = useState(false);
  const problems = useMemo(
    () =>
      mixed
        ? [
            {
              id: "ordinary-demo",
              orderIndex: 0,
              content: "$1+1$을 구하시오.",
              answer: "2",
              solution: "$1+1=2$",
              questionType: "단답형",
            },
            problem,
          ]
        : [problem],
    [mixed],
  );
  const selected = useMemo(
    () =>
      problems.map((p) => ({
        id: p.id,
        content: p.content,
        answer: p.answer,
        nativeDescriptive: p.nativeDescriptive,
        solution: p.solution ?? "",
        questionType: p.nativeDescriptive
          ? ("descriptive" as const)
          : ("short-answer" as const),
        grade: "중2",
        chapter: "방정식",
        section: "연립방정식",
        difficulty: "응용",
        problemCode: "",
        figureUrls: [],
        figureDims: [],
        figureSourceMm: [],
        figureSvg: p.figureSvg ?? null,
      })),
    [problems],
  );
  const options = useMemo(
    () => ({
      ...DEFAULT_PRINT_OPTIONS,
      template,
      columns,
      showAnswers: audience === "teacher",
    }),
    [template, columns, audience],
  );

  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | undefined;
    // Grayscale print simulation preserves vector text; CSS filter would rasterize
    // the whole PDF. Reapply to newly mounted pages after the product mode switch.
    const prepare = () => {
      if (cancelled) return;
      if (monochrome) {
        const gray = (value: string) =>
          value.replace(
            /rgba?\(([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)([^)]*)\)/g,
            (_, r, g, b, alpha) => {
              const level = Math.round(
                Number(r) * 0.2126 + Number(g) * 0.7152 + Number(b) * 0.0722,
              );
              return `rgb${alpha.includes(",") ? "a" : ""}(${level}, ${level}, ${level}${alpha})`;
            },
          );
        root.current
          ?.querySelectorAll<HTMLElement>(
            "[data-print-page], [data-print-page] *, [data-unified-paper], [data-unified-paper] *",
          )
          .forEach((element) => {
            const computed = getComputedStyle(element);
            for (const key of [
              "color",
              "background-color",
              "background-image",
              "border-top-color",
              "border-right-color",
              "border-bottom-color",
              "border-left-color",
              "outline-color",
              "fill",
              "stroke",
            ]) {
              const value = computed.getPropertyValue(key);
              const converted = gray(value);
              if (converted !== value)
                element.style.setProperty(key, converted, "important");
            }
          });
      }
      setReady(true);
    };
    void document.fonts.ready.then(() => {
      prepare();
      if (!cancelled && monochrome && root.current) {
        observer = new MutationObserver(prepare);
        observer.observe(root.current, { childList: true, subtree: true });
      }
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [monochrome]);

  return (
    <div
      ref={root}
      className={styles.root}
      data-print-monochrome={monochrome}
      data-descriptive-ready={ready && (!unified || unifiedReady)}
      data-unified-ready={unified ? unifiedReady : undefined}
    >
      <header className={styles.tools}>
        <h1>서술형 답란 B 출력 검수</h1>
        <p>
          미등록 직사각형 시연 · 기준 3개 · 8점 · 답란 72mm(16·24·32mm). 실물
          검수 대기.
        </p>
        <form method="get">
          <label>
            출력 경로{" "}
            <select
              aria-label="출력 경로"
              name="renderer"
              defaultValue={unified ? "unified" : "legacy"}
            >
              <option value="legacy">일일·확인·기출</option>
              <option value="unified">통합 인쇄</option>
            </select>
          </label>
          {unified && (
            <>
              <label>
                양식{" "}
                <select
                  aria-label="양식"
                  name="template"
                  defaultValue={template}
                >
                  {(
                    [
                      "jaseup",
                      "jeongtong",
                      "modern",
                      "workbook",
                      "yuhyung",
                      "pyeongga",
                    ] as const
                  ).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                단 수{" "}
                <select
                  aria-label="단 수"
                  name="columns"
                  defaultValue={columns}
                >
                  <option value={1}>1단</option>
                  <option value={2}>2단</option>
                </select>
              </label>
            </>
          )}
          <label>
            지면{" "}
            <select aria-label="지면" name="paper" defaultValue={paper}>
              <option value="daily">일일</option>
              <option value="review">확인</option>
              <option value="past">기출형</option>
            </select>
          </label>
          <label>
            대상{" "}
            <select aria-label="대상" name="audience" defaultValue={audience}>
              <option value="student">학생용</option>
              <option value="teacher">교사용</option>
            </select>
          </label>
          <label>
            <input
              name="mono"
              type="checkbox"
              value="1"
              defaultChecked={monochrome}
            />
            흑백
          </label>
          <label>
            <input
              name="mixed"
              type="checkbox"
              value="1"
              defaultChecked={mixed}
            />
            일반 문항 함께
          </label>
          <button type="submit">견본 보기</button>
        </form>
        {(paper === "past" || unified) && (
          <button
            type="button"
            disabled={!ready || (unified && !unifiedReady)}
            onClick={() => window.print()}
          >
            인쇄하기
          </button>
        )}
      </header>
      <div className={styles.papers}>
        {unified ? (
          <WorksheetPrint
            selected={selected}
            title="직사각형 조건과 넓이"
            options={options}
            printMeta={DEFAULT_PRINT_META}
            onReady={setUnifiedReady}
          />
        ) : paper === "past" ? (
          <PastPaperPrint
            problems={problems}
            audience={audience}
            meta={{
              academyName: "오늘 수학",
              title: "직사각형 조건과 넓이",
              subtitle: "연립방정식 · 서술형",
            }}
          />
        ) : (
          <TestPrint
            key={`${paper}-${audience}`}
            initialMode={audience === "teacher" ? "answers" : "questions"}
            data={{
              testId: null,
              testType: paper,
              testDate: "2026-10-20",
              className: "검수 견본",
              section: "직사각형 조건과 넓이",
              todayGoal: "두 조건을 식으로 나타내고 과정을 설명한다.",
              conceptNote:
                "연립방정식의 해를 구한 뒤 두 조건에 맞는지 확인한다.",
              problems,
            }}
          />
        )}
      </div>
    </div>
  );
}
