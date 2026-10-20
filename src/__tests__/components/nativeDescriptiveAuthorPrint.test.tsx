import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { NativeAuthoredTask } from "@/contracts/descriptiveAuthor.contract";
import { createNativeAuthoredTask } from "@/lib/engine/descriptiveAuthor/compose";
import { rectangleAuthor } from "@/lib/engine/descriptiveAuthor/rectangleDemo";
import { ProblemBody } from "@/components/unified/print/templates/ProblemBody";
import { AnswerPage } from "@/components/unified/print/AnswerPage";
import {
  DEFAULT_PRINT_META,
  DEFAULT_PRINT_OPTIONS,
  type ProblemReview,
} from "@/components/unified/print/types";
import { readPaper, leaksOf } from "../helpers/paperView";

let task: NativeAuthoredTask;
let problem: ProblemReview["variant"];
beforeAll(async () => {
  // Exercise the repository's local Python → SVG → MathJax path, never a remote service.
  vi.stubEnv("STUDIO_ENGINE_URL", "");
  vi.stubEnv("VERCEL", "");
  try {
    task = await createNativeAuthoredTask(rectangleAuthor, 20261020, 0);
  } finally {
    vi.unstubAllEnvs();
  }
  problem = {
    id: task.problem.externalId,
    content: task.problem.content,
    answer: task.problem.answer,
    solution: task.problem.solution,
    questionType: "descriptive",
    grade: "중2",
    chapter: task.definition.chapter,
    section: task.definition.unitSection,
    difficulty: task.definition.difficulty,
    problemCode: "",
    figureUrls: [],
    figureDims: [],
    figureSourceMm: [],
    figureSvg: task.figureSvg,
    topic: "",
  };
});

/** Opt-in local evidence capture; default test runs have no artifact writes. */
async function capture(name: string, container: HTMLElement) {
  const dir = process.env.DESCRIPTIVE_CORE_RENDER_DIR;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  const katexDir = path.resolve("node_modules/katex/dist");
  const css = readFileSync(
    path.join(katexDir, "katex.min.css"),
    "utf8",
  ).replace(
    /url\((fonts\/[^)]+)\)/g,
    (_, file: string) =>
      `url(data:font/woff2;base64,${readFileSync(path.join(katexDir, file)).toString("base64")})`,
  );
  const { buildTailwindCss, PAPER_VARS_ATTR } =
    await import("../../../scripts/qa/paperProbe");
  const appCss = await buildTailwindCss();
  writeFileSync(
    path.join(dir, `${name}.html`),
    `<!doctype html><html lang="ko"><meta charset="utf-8"><title>서술형 ${name} 렌더 검증</title><style>${appCss}</style><style>${css}</style><body style="${PAPER_VARS_ATTR};margin:24px;max-width:794px;background:white">${container.innerHTML}</body></html>`,
  );
}

describe("주 저자 시연 — 기존 학생용·교사용 렌더", () => {
  it("실제 보조 그림과 세 소문항을 인쇄하고 답·채점표는 노출하지 않는다", async () => {
    const { container } = render(
      <ProblemBody problem={problem} options={DEFAULT_PRINT_OPTIONS} />,
    );
    const paper = readPaper(container);
    expect(task.figureSvg).toContain("<svg");
    expect(container.querySelector("svg")).not.toBeNull();
    for (const question of task.definition.subquestions)
      expect(container.textContent).toContain(question.text);
    expect(container.textContent).not.toContain("채점 기준");
    expect(container.textContent).not.toContain(task.problem.answer);
    expect(paper.errors).toBe(0);
    expect(paper.mathRaw).toBe(0);
    expect(leaksOf(paper)).toEqual([]);
    await capture("student", container);
    cleanup();
  });
  it("교사용에는 모범답·8점·부분점수·허용 대안·선행 오류 규칙과 체크칸을 조판한다", async () => {
    const { container } = render(
      <AnswerPage
        page={1}
        totalPages={1}
        columns={1}
        meta={{ ...DEFAULT_PRINT_META, title: "서술형 엔진 시연" }}
        problems={[{ id: problem.id, variant: problem }]}
        startingNumber={1}
        options={{ ...DEFAULT_PRINT_OPTIONS, showAnswers: true }}
      />,
    );
    const paper = readPaper(container);
    for (const text of [
      "채점 기준 (총 8점)",
      "부분:",
      "0점:",
      "허용 다른 풀이:",
      "선행 오류:",
      "다시 감점하지 않는다",
    ])
      expect(container.textContent).toContain(text);
    expect((container.textContent!.match(/□/g) ?? []).length).toBe(3);
    expect(paper.errors).toBe(0);
    expect(paper.mathRaw).toBe(0);
    expect(leaksOf(paper)).toEqual([]);
    await capture("teacher", container);
    cleanup();
  });
});
