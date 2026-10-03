import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  examRoot,
  type ExamDraft,
} from "../../../scripts/import/exam-paper/audit-bank-fix";
import { checkChoiceFigureIndex } from "../../../src/lib/problem/choiceFigureIndex";
import { graphFigureFields } from "../../../scripts/import/exam-paper/graphChoiceFigures";

const output = mkdtempSync(join(tmpdir(), "bank-fix-graph-"));
function build(school: string, n: number): ExamDraft {
  const file = join(output, `${school}.json`);
  execFileSync(
    process.execPath,
    [
      resolve("node_modules/tsx/dist/cli.mjs"),
      resolve("scripts/import/exam-paper/build-exam-drafts.ts"),
      join(examRoot, `2025-${school}-3-2-mid`),
      file,
    ],
    { encoding: "utf8", stdio: "pipe" },
  );
  return (JSON.parse(readFileSync(file, "utf8")) as ExamDraft[]).find(
    (d) => d.questionNumber === n,
  )!;
}

describe("리드 추가: 원본 그래프 보기의 번호와 수학", () => {
  it("적재 필드는 원본 색인 순서를 따르고 빠지거나 중복된 그림은 거부한다", () => {
    const repair = {
      stem: "stem.png",
      choices: ["a.png", "b.png", "c.png", "d.png", "e.png"],
      why: "검토된 보기",
    };
    const figures = [
      "b.png",
      "c.png",
      "stem.png",
      "e.png",
      "a.png",
      "d.png",
    ].map((file) => ({ file }));
    expect(graphFigureFields(repair, figures).choiceFigureIndex).toEqual([
      2, 3, 0, 5, 1, 4,
    ]);
    expect(graphFigureFields(undefined, figures)).toEqual({});
    expect(() => graphFigureFields(repair, figures.slice(1))).toThrow();
    expect(() =>
      graphFigureFields(repair, [...figures.slice(1), figures[1]]),
    ).toThrow();
    expect(() =>
      graphFigureFields(repair, [...figures.slice(1), figures[2]]),
    ).toThrow();
  });
  it.each([
    ["daeguil", 3, 4],
    ["sinmyeongyeo", 9, 1],
  ] as const)(
    "%s %i: 300가지 허용 계수에서 정답 보기 하나와 원본 그림이 일치한다",
    (school, n, answer) => {
      const d = build(school, n);
      expect(d.questionType).toBe("객관식");
      expect(d.content.match(/^\d\. /gm)).toHaveLength(5);
      expect(d.content.split(/^1\. /m)[0]).not.toMatch(/[①-⑤]/);
      const index = JSON.parse(
        readFileSync(join(examRoot, d.examId, "figures/index.json"), "utf8"),
      ) as { figures: { number: number; file: string }[] };
      const figures = index.figures.filter((f) => f.number === n);
      expect(figures).toHaveLength(6);
      const mapping = d.choiceFigureIndex as number[];
      expect(checkChoiceFigureIndex(figures.length, mapping).ok).toBe(true);
      const stemFile = `q${String(n).padStart(2, "0")}.png`;
      expect(
        figures.filter((_, i) => mapping[i] === 0).map((f) => f.file),
      ).toEqual([stemFile]);
      const files = mapping
        .flatMap((choice, i) =>
          choice > 0 ? [{ choice, file: figures[i].file }] : [],
        )
        .sort((a, b) => a.choice - b.choice);
      expect(files.map((f) => f.choice)).toEqual([1, 2, 3, 4, 5]);
      for (const f of figures)
        expect(existsSync(join(examRoot, d.examId, "figures", f.file))).toBe(
          true,
        );
      // 실제 원본 q03-2…6 / q09-2…6을 눈으로 확인한 부호. 순서는 색인 대신 파일이 증명한다.
      const observed =
        school === "daeguil"
          ? [
              [-1, -1, 1],
              [-1, 1, 1],
              [1, 1, -1],
              [1, -1, -1],
              [1, -1, 1],
            ]
          : [
              [1, -1],
              [1, 1],
              [-1, 1],
              [-1, 0],
              [-1, -1],
            ];
      const signatures = new Map(
        observed.map((s, i) => [
          `q${String(n).padStart(2, "0")}-${i + 2}.png`,
          s,
        ]),
      );
      for (let scale = 1; scale <= 20; scale += 1) {
        for (let axis = 1; axis <= 15; axis += 1) {
          // 원본의 두 x절편도 양수가 되도록 잡은 300가지 서로 다른 계수.
          const a = school === "daeguil" ? -scale : scale;
          const b = -2 * a * axis;
          const c = (a * axis ** 2) / 2;
          const wanted =
            school === "daeguil"
              ? [Math.sign(b), Math.sign(c / (2 * b)), Math.sign(a)] // 개구 방향·축·y절편
              : [Math.sign(a), Math.sign(b)]; // 기울기·y절편
          const candidates = files
            .filter((f) =>
              signatures.get(f.file)?.every((sign, i) => sign === wanted[i]),
            )
            .map((f) => f.choice);
          expect(candidates).toEqual([answer]);
        }
      }
      expect(d.answer).toBe("①②③④⑤"[answer - 1]);
    },
  );
});
