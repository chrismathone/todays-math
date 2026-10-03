import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { examRoot } from "../../../scripts/import/exam-paper/audit-bank-fix";
import { loadExamConfig } from "../../../scripts/import/exam-paper/examConfig";
import {
  correctExamChoices,
  correctExamSolutions,
  appendSolutionNote,
} from "../../../scripts/import/exam-paper/examDecisions";
import {
  graphFigureFields,
  resolveGraphFigureAssignments,
  restoreGraphChoices,
} from "../../../scripts/import/exam-paper/graphChoiceFigures";
import {
  figureHashes,
  readDecideBaseline,
} from "../../../scripts/import/exam-paper/audit-bank-decide";

function pieces(school: string): Map<string, string> {
  const data = JSON.parse(
    readFileSync(
      join(examRoot, `2025-${school}-3-2-mid/hwp_fixed.json`),
      "utf8",
    ),
  ) as { id: string; text: string }[];
  return new Map(data.map((d) => [d.id, d.text]));
}
const config = (school: string) =>
  loadExamConfig(join(examRoot, `2025-${school}-3-2-mid`), {
    requireUnits: false,
  });
describe("합의된 정정은 실제 조각의 기대값과 일치할 때만 적용한다", () => {
  it("덕화 1: 20개 자료의 유일 최빈값이 ④에 있고 ①의 6은 그대로다", () => {
    const before = pieces("deokhwa");
    const repaired = correctExamChoices(
      before,
      config("deokhwa").choiceCorrections,
    );
    const stem = before.get("1-stem")!.split("\n");
    const data = stem.flatMap((line, i) =>
      line.includes("~~")
        ? [...line.matchAll(/\d/g)].map(
            (m) =>
              10 * Number(stem[i - 1].match(/\$(\d)\$/)?.[1]) + Number(m[0]),
          )
        : [],
    );
    expect(data).toHaveLength(20);
    const counts = new Map<number, number>();
    for (const v of data) counts.set(v, (counts.get(v) ?? 0) + 1);
    const modes = [...counts]
      .filter(([, count]) => count === Math.max(...counts.values()))
      .map(([v]) => v);
    const choices = [1, 2, 3, 4, 5].map((i) =>
      Number(repaired.get(`1-c${i}`)!.replace(/\$/g, "")),
    );
    expect(modes).toEqual([26]);
    expect(choices.flatMap((v, i) => (v === modes[0] ? [i + 1] : []))).toEqual([
      4,
    ]);
    expect(choices[0]).toBe(6);
    const answer = JSON.parse(
      readFileSync(join(examRoot, "2025-deokhwa-3-2-mid/answers.json"), "utf8"),
    ).questions.find((q: { number: number }) => q.number === 1).answer;
    expect(answer).toBe("④");
    expect(
      [...repaired]
        .filter(([id, value]) => value !== before.get(id))
        .map(([id]) => id),
    ).toEqual(["1-c4"]);
  });
  it.each([
    ["chilgok", "7-c4"],
    ["deokhwa", "1-c4"],
    ["saeron", "8-c5"],
  ])("%s: 빈칸·원값이 바뀌거나 자리 자체가 없으면 중단한다", (school, id) => {
    const before = pieces(school);
    const repairs = config(school).choiceCorrections;
    before.set(id, "$123$");
    expect(() => correctExamChoices(before, repairs)).toThrow();
    before.delete(id);
    expect(() => correctExamChoices(before, repairs)).toThrow();
  });
  it("해설 정정은 원문이 없거나 두 군데이면 중단하고 안내는 중복하지 않는다", () => {
    const correction = {
      "1": [{ from: "잘못된 식", to: "고친 식", why: "검토" }],
    };
    expect(() => correctExamSolutions(new Map(), correction)).toThrow();
    expect(() =>
      correctExamSolutions(new Map([["1", "잘못된 식 잘못된 식"]]), correction),
    ).toThrow();
    expect(appendSolutionNote(appendSolutionNote("풀이", "안내"), "안내")).toBe(
      "풀이\n안내",
    );
  });
});

describe("안심 8: 원본 색인과 파일을 확인한 보기 이동", () => {
  const files = ["q07.png", "q07-2.png", "q07-3.png", "q07-4.png", "q07-5.png"];
  const repair = {
    stem: null,
    sourceNumber: 7,
    choices: files,
    why: "리드가 PDF 좌표·정답을 확인",
  };
  const source = JSON.parse(
    readFileSync(
      join(examRoot, "2025-ansim-3-2-mid/figures/index.json"),
      "utf8",
    ),
  ).figures as { number: number; file: string; bbox: number[]; px: number[] }[];
  it("발문 그림 0장도 다섯 보기와 일대일로 짝지을 수 있다", () => {
    expect(
      graphFigureFields(
        repair,
        files.map((file) => ({ file })),
      ).choiceFigureIndex,
    ).toEqual([1, 2, 3, 4, 5]);
  });
  it("실제 설정이 7번의 그림 다섯을 8번 읽기 차례로 옮기고 나머지 메타·PNG는 보존한다", () => {
    const result = resolveGraphFigureAssignments(
      source,
      config("ansim").graphChoices,
    );
    const moved = result.filter((f) => f.number === 8);
    expect(result.filter((f) => f.number === 7)).toEqual([]);
    expect(moved.map((f) => f.file)).toEqual(files);
    const coordinates = moved.map((f) => [f.bbox[0], f.bbox[1]]);
    expect(coordinates).toEqual(
      [...coordinates].sort((a, b) => a[1] - b[1] || a[0] - b[0]),
    );
    for (const f of moved)
      expect(f).toEqual({
        ...source.find((original) => original.file === f.file),
        number: 8,
      });
    expect(result.filter((f) => f.number !== 8)).toEqual(
      source.filter((f) => f.number !== 7),
    );
    expect(figureHashes()).toEqual(readDecideBaseline().figures);
    expect(graphFigureFields(repair, moved).choiceFigureIndex).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });
  it("파일 하나라도 없거나 겹치거나 다른 문항에 있으면 추측하지 않고 멈춘다", () => {
    const selected = source.filter((f) => f.number === 7);
    for (const broken of [
      selected.slice(1),
      [...selected.slice(1), selected[1]],
      selected.map((f, i) => (i === 0 ? { ...f, number: 6 } : f)),
    ]) {
      expect(() =>
        resolveGraphFigureAssignments(broken, { "8": repair }),
      ).toThrow();
    }
    expect(() =>
      resolveGraphFigureAssignments(
        [...selected, { ...selected[0], number: 8, file: "extra.png" }],
        { "8": repair },
      ),
    ).toThrow();
  });
  it("실제 빈 보기 네 조각은 다섯 그림 보기로 채우되 글 보기가 섞이면 멈춘다", () => {
    const input = pieces("ansim");
    const choices = [...input]
      .filter(([id]) => /^8-c\d$/.test(id))
      .map(([, text]) => text);
    const answers = JSON.parse(
      readFileSync(join(examRoot, "2025-ansim-3-2-mid/answers.json"), "utf8"),
    ).questions;
    const answer = answers.find(
      (q: { number: number }) => q.number === 8,
    ).answer;
    expect(choices).toHaveLength(4);
    expect(answer).toBe("⑤");
    expect(restoreGraphChoices(choices, answer)).toEqual(
      Array(5).fill("[그림]"),
    );
    expect(() =>
      restoreGraphChoices(["정상 글 보기", ...choices], answer),
    ).toThrow();
    expect(() => restoreGraphChoices(choices, "(정답 없음)")).toThrow();
  });
});
