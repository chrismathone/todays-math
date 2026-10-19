/** 실제 적재기 main을 돌린다. Prisma는 대역, 파일과 그림 복사는 임시 폴더 안에서만 돈다. */
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadExamConfig } from "../../../scripts/import/exam-paper/examConfig";
import { examRoot } from "../../../scripts/import/exam-paper/audit-bank-fix";
import {
  candidateFingerprint,
  collectRegeneration,
  prepareRegeneration,
} from "../../../scripts/import/exam-paper/regenerateExam";

const originalArgv = process.argv;
const originalExitCode = process.exitCode;
afterEach(() => {
  process.argv = originalArgv;
  process.exitCode = originalExitCode;
  vi.doUnmock("@prisma/client");
  vi.restoreAllMocks();
});
interface Row {
  questionNumber: number;
  answer: string;
  solution: string | null;
  solutionSource: string;
  directUseAllowed: boolean;
  figureUrls: string[];
  choiceFigureIndex?: number[];
}
async function load(
  options: {
    school?: string;
    number?: number;
    choices?: string[];
    mapping?: number[];
    figureCount?: number;
    solution?: string | null;
    generated?: { answer: string; solution: string };
    regenerated?: { answer: string; solution: string };
    malformedLegacy?: boolean;
    solutionNote?: string;
    answer?: string;
    figures?: { number: number; file: string; widthMm: number; px: number[] }[];
  } = {},
): Promise<{ rows: Row[]; log: string }> {
  vi.resetModules();
  const script = resolve("scripts/import/exam-paper/load-exam-paper.ts");
  const dir = fs.mkdtempSync(join(tmpdir(), "bank-decide-load-"));
  const number = options.number ?? 8;
  const config = options.school
    ? loadExamConfig(join(examRoot, `2025-${options.school}-3-2-mid`), {
        requireUnits: false,
      })
    : undefined;
  const familyKey = "mid:3-2|삼각비|01";
  const choices = options.choices ?? ["1", "2", "3", "4", "5"];
  fs.mkdirSync(join(dir, "figures"));
  fs.mkdirSync(join(dir, "sol_ai"));
  const put = (file: string, data: unknown) =>
    fs.writeFileSync(join(dir, file), JSON.stringify(data));
  put("exam.json", {
    ...config,
    examId: "bank-decision-test",
    school: "시험",
    grade: "중3",
    subject: "수학",
    ...(options.solutionNote
      ? { solutionNotes: { [number]: options.solutionNote } }
      : {}),
    units: {
      [number]: {
        section: "삼각비의 뜻",
        family: familyKey,
        why: "시험용 단원 대역",
      },
    },
  });
  put("drafts.json", [
    {
      externalId: `bank-decision-test-${number}`,
      examId: "bank-decision-test",
      questionNumber: number,
      content: `${options.regenerated ? "$1+1$의 값을 고르시오." : "값을 고르시오."}\n\n${choices.map((c, i) => `${i + 1}. ${c}`).join("\n")}`,
      answer: options.answer ?? "⑤",
      solution: options.solution ?? null,
      choiceFigureIndex: options.mapping,
      questionType: "객관식",
      difficulty: "중",
      problemType: "계산",
      unitHint: "삼각비",
    },
  ]);
  const figures =
    options.figures ??
    Array.from({ length: options.figureCount ?? 0 }, (_, i) => ({
      number,
      file: `figure-${i}.png`,
      widthMm: 20,
      px: [100, 100],
    }));
  put("figures/index.json", { figures });
  for (const f of figures)
    fs.writeFileSync(
      join(dir, "figures", f.file),
      Buffer.from("same source image"),
    );
  if (options.generated)
    put(`sol_ai/q${String(number).padStart(2, "0")}.json`, options.generated);
  if (options.malformedLegacy)
    fs.writeFileSync(
      join(dir, "sol_ai", `q${String(number).padStart(2, "0")}.json`),
      "broken JSON",
    );
  if (options.regenerated) {
    const blind = fs.mkdtempSync(join(tmpdir(), "bank-decide-blind-"));
    const manifest = prepareRegeneration(dir, blind);
    const candidate = {
      ...options.regenerated,
      solverId: "independent-solving-session",
    };
    fs.writeFileSync(
      join(blind, "out", `q${String(number).padStart(2, "0")}.json`),
      JSON.stringify(candidate),
    );
    fs.writeFileSync(
      join(blind, "verify", `q${String(number).padStart(2, "0")}.json`),
      JSON.stringify({
        status: "verified",
        sourceDigest: manifest.sourceDigest,
        candidateDigest: candidateFingerprint(candidate),
        method: "independent-solve",
        verifierId: "separate-checking-session",
        independentAnswer: "②",
        checks: {
          answerCorrect: true,
          solutionCorrect: true,
          sourceFaithful: true,
          curriculumAppropriate: true,
        },
        evidence:
          "독립적으로 1+1=2를 계산했고 선택지 ②의 값 2와 일치한다. 덧셈 과정과 원문 선택지를 대조했다.",
      }),
    );
    expect(collectRegeneration(dir).status).toBe("verified");
  }
  const disconnect = vi.fn().mockResolvedValue(undefined);
  vi.doMock("@prisma/client", () => ({
    PrismaClient: class {
      unit = {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "unit",
            grade: "중3",
            chapter: "삼각비",
            section: "삼각비의 뜻",
          },
        ]),
      };
      problem = { findMany: vi.fn().mockResolvedValue([{ familyKey }]) };
      $disconnect = disconnect;
    },
  }));
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  process.argv = [
    process.execPath,
    script,
    dir,
    ...(options.regenerated ? ["--regenerate-all"] : []),
  ];
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  await import("../../../scripts/import/exam-paper/load-exam-paper");
  await vi.waitFor(() => expect(disconnect).toHaveBeenCalled());
  expect(error.mock.calls).toEqual([]);
  const rows = fs.readFileSync(join(dir, "load_rows.json"), "utf8");
  const parsed = JSON.parse(rows) as Row[];
  for (const row of parsed)
    for (const url of row.figureUrls) {
      const name = url.split("/").at(-1)!;
      expect(fs.readFileSync(join(dir, "public", url))).toEqual(
        fs.readFileSync(join(dir, "figures", name)),
      );
    }
  return { rows: parsed, log: log.mock.calls.flat().join("\n") };
}

describe("원장님 결정 — 실제 적재 경로", () => {
  it("재생성 모드는 새 정답·해설을 그대로 채택하고 원본 안내와 sol_ai를 섞지 않는다", async () => {
    const regenerated = {
      answer: "②",
      solution: "$1+1=2$이다. 따라서 정답은 ②이다.",
    };
    const result = await load({
      answer: "⑤",
      solution: "원본의 이전 풀이",
      solutionNote: "이전 답안 안내",
      malformedLegacy: true,
      regenerated,
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      answer: regenerated.answer,
      solution: regenerated.solution,
      solutionSource: "ai",
      questionNumber: 8,
      // 원본 기출은 패턴 확인용이라 언제나 출제 잠금으로 싣는다(0312944df).
      directUseAllowed: false,
    });
  });
  it("A6: 대진 13은 초안이 있어도 적재 행을 만들지 않고 사유를 남긴다", async () => {
    const result = await load({ school: "daejin", number: 13 });
    expect(result.rows).toEqual([]);
    expect(result.log).toContain("문제오류");
  });
  it.each([
    [undefined, 5],
    [[], 5],
    [[], 0],
    [[1, 2, 3, 4], 5],
    [[1, 2, 3, 4, 4], 5],
    [[1, 2, 3, 4, 0], 5],
    [[1, 2, 3, 4, 6], 5],
  ] as const)(
    "그림 보기가 연결되지 않으면 출제를 잠근다: %j",
    async (mapping, figureCount) => {
      const result = await load({
        choices: Array(5).fill("[그림]"),
        mapping: mapping ? [...mapping] : undefined,
        figureCount,
      });
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].directUseAllowed).toBe(false);
      expect(result.log).toMatch(/보기.*그림.*연결/);
    },
  );
  // 원본 기출은 짝이 온전해도 출제 잠금이다(0312944df) — 짝의 판정은 잠금 사유 줄로 본다.
  it("온전한 짝은 적재 행에도 그대로 남고 보기 그림 잠금 사유를 남기지 않는다", async () => {
    const result = await load({
      choices: Array(5).fill("[그림]"),
      mapping: [1, 2, 3, 4, 5],
      figureCount: 5,
    });
    expect(result.rows[0].directUseAllowed).toBe(false);
    expect(result.log).not.toMatch(/보기.*그림.*연결/);
    expect(result.rows[0].choiceFigureIndex).toEqual([1, 2, 3, 4, 5]);
  });
  it("글 보기에는 보기 그림 잠금 사유를 남기지 않는다", async () => {
    const result = await load();
    expect(result.rows[0].directUseAllowed).toBe(false);
    expect(result.log).not.toMatch(/보기.*그림.*연결/);
  });
  it("글 보기를 가리키는 그림이 있으면 반대쪽 짝도 무효다", async () => {
    const result = await load({
      choices: ["[그림]", "[그림]", "[그림]", "[그림]", "해당 없음"],
      mapping: [1, 2, 3, 4, 5],
      figureCount: 5,
    });
    expect(result.rows[0].directUseAllowed).toBe(false);
    expect(result.log).toMatch(/보기.*그림.*연결/);
  });
  it("안심의 실제 색인은 적재할 때도 8번 보기 순서로 이동한다", async () => {
    const source = JSON.parse(
      fs.readFileSync(
        join(examRoot, "2025-ansim-3-2-mid/figures/index.json"),
        "utf8",
      ),
    );
    const result = await load({
      school: "ansim",
      choices: Array(5).fill("[그림]"),
      figures: source.figures,
    });
    expect(
      result.rows[0].figureUrls.map((url) => url.split("/").at(-1)),
    ).toEqual(["q07.png", "q07-2.png", "q07-3.png", "q07-4.png", "q07-5.png"]);
    expect(result.rows[0].choiceFigureIndex).toEqual([1, 2, 3, 4, 5]);
    expect(result.rows[0].directUseAllowed).toBe(false);
    expect(result.log).not.toMatch(/보기.*그림.*연결/);
  });
  it("원본 해설이 있는 행은 그 해설 뒤에 안내를 한 번만 둔다", async () => {
    const config = loadExamConfig(join(examRoot, "2025-dongdo-3-2-mid"), {
      requireUnits: false,
    });
    const note = config.solutionNotes!["16"];
    const solution = `원본 풀이\n${note}`;
    const result = await load({
      school: "dongdo",
      number: 16,
      solution,
      generated: { answer: "⑤", solution: "대체 풀이" },
    });
    expect(result.rows[0].solution).toBe(solution);
    expect(result.rows[0].solutionSource).toBe("original");
  });
  it("A3: 안내만 든 초안에도 검증된 풀이를 채운 뒤 안내를 한 번만 끝에 붙인다", async () => {
    const config = loadExamConfig(join(examRoot, "2025-chilgok-3-2-mid"), {
      requireUnits: false,
    });
    const note = config.solutionNotes!["7"];
    const generated = {
      answer: "②",
      solution: "$y=-3(x+1)^2+4$이므로 $a+b+c=-8$이다.",
    };
    const result = await load({
      school: "chilgok",
      number: 7,
      answer: "②",
      solution: note,
      generated,
    });
    expect(result.rows[0].solutionSource).toBe("ai");
    expect(result.rows[0].solution).toBe(`${generated.solution}\n${note}`);
  });
  it("A7: 실제 풀이자 해설과 마지막 안내가 같은 반올림 답을 말한다", async () => {
    const config = loadExamConfig(join(examRoot, "2025-saeron-3-2-mid"), {
      requireUnits: false,
    });
    const generated = JSON.parse(
      fs.readFileSync(
        join(examRoot, "2025-saeron-3-2-mid/sol_ai/q08.json"),
        "utf8",
      ),
    );
    const note = config.solutionNotes!["8"];
    const result = await load({ school: "saeron", solution: note, generated });
    expect(result.rows[0].solutionSource).toBe("ai");
    expect(result.rows[0].solution).toBe(
      `${generated.solution.trimEnd()}\n${note}`,
    );
    expect(result.rows[0].solution).not.toContain("가장 가까운 값은 $9.7$");
  });
  it("안내가 있어도 답이 틀린 풀이자는 통과하지 못한다", async () => {
    const config = loadExamConfig(join(examRoot, "2025-chilgok-3-2-mid"), {
      requireUnits: false,
    });
    const note = config.solutionNotes!["7"];
    const result = await load({
      school: "chilgok",
      number: 7,
      answer: "②",
      solution: note,
      generated: { answer: "③", solution: "틀린 풀이" },
    });
    expect(result.rows[0].solutionSource).toBe("none");
    expect(result.rows[0].solution).toBe(note);
    expect(result.log).toContain("해설을 안 넣는다");
  });
});
