import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { DbRetryOrigin } from "../../../../src/lib/import/schoolTextbook/dbRetry.types";
import {
  figuresFromDbRetrySvg,
  loadDbRetryFigures,
} from "../../../../src/lib/import/schoolTextbook/dbRetryFigures";
import { reviewDigest } from "../../../../src/lib/import/schoolTextbook/qualification";
import { textbookVariantSourceDigest } from "../../../../src/lib/import/schoolTextbook/variants";
import {
  generateCodexGroupedPairs,
  type GroupedJsonRunner,
  type GroupedSource,
} from "./batch-generation";
import {
  codexSha256,
  type CodexJsonInput,
  type CodexJsonResult,
} from "./transport";

// Runtime regressions must fail before any paid SDK can initialize. Process spawning is also
// forbidden by the test configuration; every model result below comes from an injected runner.
vi.mock("openai", () => {
  throw new Error("paid-provider-import-forbidden");
});
vi.mock("../../../../src/lib/ai/client", () => {
  throw new Error("paid-provider-import-forbidden");
});
const empty = () => ({ images: [], digest: reviewDigest([]) });
function source(): GroupedSource {
  const origin: DbRetryOrigin = {
    grade: "공통수학1",
    chapter: "다항식",
    section: "다항식의 계산",
    problem: {
      id: randomUUID(),
      source: "school_textbook",
      pool: "shared",
      content: "$2+3$을 계산하시오.",
      answer: "$5$",
      solution: "$2+3=5$이다.",
      difficulty: "기본",
      problem_type: "계산",
      question_type: "단답형",
      direct_use_allowed: true,
      review_status: "approved",
      origin_problem_id: null,
      unit_id: randomUUID(),
      source_material_id: randomUUID(),
      family_key: "textbook:poly-1",
      external_id: "original-external",
      source_file: "books/one.hwpx",
      figure_svg: null,
      figure_urls: [],
      figure_dims: [],
      figure_source_mm: [],
      choice_figure_index: [],
    },
  };
  return { origin, figures: empty() };
}
type OutputItem = {
  sourceId: string;
  sourceDigest: string;
  originDigest: string;
  sourceFigureDigest: string;
  slot: number;
  transformation: string;
  changeSummary: string;
  content: string;
  answer: string;
  solution: string;
  originalAnswerRecomputed: string;
  figureSpecJson: string | null;
};
function output(input: CodexJsonInput): { items: OutputItem[] } {
  const sources = JSON.parse(input.prompt.split("SOURCE_DATA_JSON\n")[1]!) as {
    sourceId: string;
    sourceDigest: string;
    originDigest: string;
    sourceFigureDigest: string;
    requiresFigure: boolean;
  }[];
  return {
    items: sources.flatMap((s, i) =>
      [1, 2].map((slot) => ({
        sourceId: s.sourceId,
        sourceDigest: s.sourceDigest,
        originDigest: s.originDigest,
        sourceFigureDigest: s.sourceFigureDigest,
        slot,
        transformation: "numbers",
        changeSummary: `첫 수를 ${10 + i * 10 + slot}로 변경`,
        content: `${s.requiresFigure ? "[그림] " : ""}$${10 + i * 10 + slot}+3$을 계산하시오.`,
        answer: `$${13 + i * 10 + slot}$`,
        solution: `$${10 + i * 10 + slot}+3=${13 + i * 10 + slot}$이다.`,
        originalAnswerRecomputed: "$5$",
        figureSpecJson: s.requiresFigure
          ? JSON.stringify({
              version: 2,
              points: { A: [0, 0], B: [slot, 0] },
              segments: { AB: ["A", "B"] },
            })
          : null,
      })),
    ),
  };
}
function runner(
  edit?: (value: { items: OutputItem[] }, input: CodexJsonInput) => void,
  changeResult?: (r: CodexJsonResult) => void,
) {
  const mock = vi.fn(
    async (input: CodexJsonInput): Promise<CodexJsonResult> => {
      const value = output(input);
      edit?.(value, input);
      const images = await Promise.all(
        (input.images ?? []).map(async (url) => {
          const bytes = Buffer.from(url.split(",")[1]!, "base64"),
            meta = await sharp(bytes).metadata();
          return {
            sha256: codexSha256(bytes),
            bytes: bytes.length,
            width: meta.width!,
            height: meta.height!,
          };
        }),
      );
      const usage = {
        inputTokens: 100,
        cachedInputTokens: 20,
        outputTokens: 40,
      };
      const receipt: CodexJsonResult["receipt"] = {
        version: "codex-chatgpt-json-v1",
        id: randomUUID(),
        phase: input.phase,
        auth: "chatgpt",
        cliVersion: "injected",
        requestedModel: "codex-account-default",
        model: null,
        modelObserved: false,
        threadId: "injected-thread",
        usage,
        startedAt: new Date().toISOString(),
        elapsedMs: 1,
        exitCode: 0,
        signal: null,
        status: "succeeded",
        reason: null,
        turnCompleted: true,
        schemaValid: true,
        promptSha256: codexSha256(input.prompt),
        schemaSha256: codexSha256(JSON.stringify(input.schema)),
        images,
        outputSha256: codexSha256(JSON.stringify(value)),
        stdoutSha256: null,
        stderrSha256: null,
        receiptPath: "injected-receipt.json",
        outputPath: "injected-output.json",
      };
      const result: CodexJsonResult = {
        value,
        auth: "chatgpt",
        threadId: receipt.threadId!,
        model: null,
        usage,
        elapsedMs: 1,
        receipt,
      };
      changeResult?.(result);
      return result;
    },
  );
  return { mock, run: mock as GroupedJsonRunner };
}
const options = { outDir: "unused-injected-output" };

describe("grouped subscription generation", () => {
  it("attributes shuffled output by source and slot, with complete hashes and no per-source shared usage", async () => {
    const sources = [source(), source(), source()];
    sources[0]!.origin.problem.extraRawProvenance = {
      untouched: "hash this full raw field too",
    };
    const fake = runner((value) => value.items.reverse());
    const result = await generateCodexGroupedPairs(sources, {
      ...options,
      run: fake.run,
    });
    expect(fake.mock).toHaveBeenCalledTimes(1);
    expect(result.pairs.map((p) => p.sourceId)).toEqual(
      sources.map((s) => s.origin.problem.id),
    );
    expect(result.pairs.map((p) => p.candidates.map((c) => c.slot))).toEqual([
      [1, 2],
      [1, 2],
      [1, 2],
    ]);
    expect(result.pairs[0]!.sourceDigest).toBe(
      textbookVariantSourceDigest(sources[0]!.origin.problem),
    );
    expect(result.pairs[1]!.candidates[0]!.content).toContain("21+3");
    expect(
      result.pairs.every(
        (p) => p.calls.length === 0 && p.mathematicalApproval === false,
      ),
    ).toBe(true);
    expect(result.receipt.usage?.inputTokens).toBe(100);
    expect(result.items).toHaveLength(6);
    for (const item of result.items)
      expect(item.candidateDigest).toBe(
        reviewDigest(
          result.pairs.find((p) => p.sourceId === item.sourceId)!.candidates[
            item.slot - 1
          ],
        ),
      );
    const request = fake.mock.mock.calls[0]![0];
    expect(
      z.fromJSONSchema(request.schema).safeParse(output(request)).success,
    ).toBe(true);
    expect(request.prompt).toContain("둘 다 수치 변형도 허용");
    expect(request.prompt).toContain("독립 검증이 아닙니다");
  });

  it.each([
    [
      "wrong source",
      (v: { items: OutputItem[] }) => {
        v.items[0]!.sourceId = randomUUID();
      },
    ],
    [
      "duplicate source",
      (v: { items: OutputItem[] }) => {
        v.items[2] = { ...v.items[0]! };
      },
    ],
    [
      "missing source",
      (v: { items: OutputItem[] }) => {
        v.items.splice(2, 2);
      },
    ],
    [
      "duplicate slot",
      (v: { items: OutputItem[] }) => {
        v.items[1]!.slot = 1;
      },
    ],
    [
      "missing slot",
      (v: { items: OutputItem[] }) => {
        v.items.pop();
      },
    ],
    [
      "wrong slot",
      (v: { items: OutputItem[] }) => {
        v.items[0]!.slot = 3;
      },
    ],
    [
      "string slot",
      (v: { items: OutputItem[] }) => {
        Object.assign(v.items[0]!, { slot: "1" });
      },
    ],
    [
      "stale source",
      (v: { items: OutputItem[] }) => {
        v.items[0]!.sourceDigest = "a".repeat(64);
      },
    ],
    [
      "wrong curriculum",
      (v: { items: OutputItem[] }) => {
        v.items[0]!.originDigest = "b".repeat(64);
      },
    ],
    [
      "stale figures",
      (v: { items: OutputItem[] }) => {
        v.items[0]!.sourceFigureDigest = "c".repeat(64);
      },
    ],
    [
      "same source text",
      (v: { items: OutputItem[] }) => {
        v.items[0]!.content = "$2+3$을 계산하시오.";
      },
    ],
    [
      "cosmetic numerical rewrite",
      (v: { items: OutputItem[] }) => {
        v.items[0]!.content = "$2+3$의 값을 구하시오.";
      },
    ],
    [
      "same pair text",
      (v: { items: OutputItem[] }) => {
        v.items[1]!.content = v.items[0]!.content;
      },
    ],
    [
      "cosmetic pair rewrite",
      (v: { items: OutputItem[] }) => {
        v.items[1]!.content = v.items[0]!.content.replace(
          "계산하시오",
          "구하시오",
        );
      },
    ],
    [
      "empty solution",
      (v: { items: OutputItem[] }) => {
        v.items[0]!.solution = " ";
      },
    ],
    [
      "unexpected field",
      (v: { items: OutputItem[] }) => {
        Object.assign(v.items[0]!, { approval: true });
      },
    ],
    [
      "unexpected figure",
      (v: { items: OutputItem[] }) => {
        v.items[0]!.figureSpecJson = "{}";
      },
    ],
  ])("rejects whole output for %s", async (_name, edit) => {
    const fake = runner(edit);
    await expect(
      generateCodexGroupedPairs([source(), source()], {
        ...options,
        run: fake.run,
      }),
    ).rejects.toThrow();
    expect(fake.mock).toHaveBeenCalledTimes(1);
  });
  it("rejects transport failures without retrying or invoking a fallback", async () => {
    const run = vi.fn(async () => {
      throw new Error("provider credential detail must not leak");
    });
    await expect(
      generateCodexGroupedPairs([source()], { ...options, run }),
    ).rejects.toMatchObject({ code: "grouped-transport-failed", stop: true });
    expect(run).toHaveBeenCalledTimes(1);
  });
  it("rejects source/curriculum mutation while a call is in flight", async () => {
    const sources = [source()];
    const fake = runner(() => {
      sources[0]!.origin.grade = "other";
    });
    await expect(
      generateCodexGroupedPairs(sources, { ...options, run: fake.run }),
    ).rejects.toThrow("grouped-source-mutated");
  });
  it("cancellation before launch makes zero calls, and cancellation during a call rejects its output", async () => {
    const controller = new AbortController(),
      fake = runner();
    controller.abort();
    await expect(
      generateCodexGroupedPairs([source()], {
        ...options,
        signal: controller.signal,
        run: fake.run,
      }),
    ).rejects.toThrow("grouped-aborted");
    expect(fake.mock).not.toHaveBeenCalled();
    const active = new AbortController(),
      during = runner(() => active.abort());
    await expect(
      generateCodexGroupedPairs([source()], {
        ...options,
        signal: active.signal,
        run: during.run,
      }),
    ).rejects.toThrow("grouped-aborted");
  });
  it.each([
    "held",
    "missing curriculum",
    "wrong provenance",
    "missing figure",
    "duplicate source",
    "too many sources",
  ])("fails closed before inference for %s", async (kind) => {
    const sources = [source()],
      fake = runner();
    if (kind === "held") sources[0]!.origin.problem.direct_use_allowed = false;
    if (kind === "missing curriculum") sources[0]!.origin.section = "";
    if (kind === "wrong provenance")
      sources[0]!.origin.problem.origin_problem_id = randomUUID();
    if (kind === "missing figure")
      sources[0]!.origin.problem.content += " [그림]";
    if (kind === "duplicate source") sources.push(sources[0]!);
    if (kind === "too many sources")
      sources.push(...Array.from({ length: 16 }, source));
    await expect(
      generateCodexGroupedPairs(sources, { ...options, run: fake.run }),
    ).rejects.toThrow();
    expect(fake.mock).not.toHaveBeenCalled();
  });
  it.each(["auth", "prompt", "schema", "thread", "usage", "incomplete"])(
    "rejects %s receipt mismatch",
    async (kind) => {
      const fake = runner(undefined, (r) => {
        if (kind === "auth") r.receipt.auth = null;
        if (kind === "prompt") r.receipt.promptSha256 = "a".repeat(64);
        if (kind === "schema") r.receipt.schemaSha256 = "a".repeat(64);
        if (kind === "thread") r.receipt.threadId = "wrong";
        if (kind === "usage") r.usage = null;
        if (kind === "incomplete") r.receipt.turnCompleted = false;
      });
      await expect(
        generateCodexGroupedPairs([source()], { ...options, run: fake.run }),
      ).rejects.toMatchObject({
        code: "grouped-transport-binding",
        stop: true,
      });
    },
  );
});

const svg = (x: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><path d="M 2 2 L ${x} 20" stroke="black" fill="none"/></svg>`;
async function figured() {
  const s = source();
  s.origin.problem.figure_svg = svg(10);
  s.figures = await loadDbRetryFigures(s.origin.problem);
  return s;
}
const render = vi.fn(async (spec: unknown) => {
  const points = (spec as { points: { B: number[] } }).points;
  const result = svg(20 + points.B[0]!);
  return { svg: result, figures: await figuresFromDbRetrySvg(result) };
});
describe("actual ordered PNG source binding and generated vector validation", () => {
  it("sends each original's real PNG and retains source-byte and PNG hashes in order", async () => {
    const first = await figured(),
      second = await figured();
    second.origin.problem.figure_svg = svg(11);
    second.figures = await loadDbRetryFigures(second.origin.problem);
    const fake = runner((v) => v.items.reverse());
    const result = await generateCodexGroupedPairs([first, second], {
      ...options,
      run: fake.run,
      renderFigure: render,
    });
    expect(result.attachments.map((a) => a.sourceId)).toEqual([
      first.origin.problem.id,
      second.origin.problem.id,
    ]);
    expect(result.attachments.map((a) => a.attachment)).toEqual([1, 2]);
    expect(result.attachments[0]!.sourceSha256).toBe(
      codexSha256(first.origin.problem.figure_svg!),
    );
    expect(fake.mock.mock.calls[0]![0].images).toHaveLength(2);
    expect(
      result.pairs.every((p) =>
        p.candidates.every((c) => c.figureSvg && c.figureUrls.length === 0),
      ),
    ).toBe(true);
  });
  it.each([
    "swapped pixels",
    "bad image hash",
    "changed SVG",
    "choice mismatch",
    "wrong figure digest",
  ])("rejects %s before calling model", async (kind) => {
    const s = await figured(),
      fake = runner();
    if (kind === "swapped pixels")
      s.figures.images[0]!.dataUrl = (
        await figuresFromDbRetrySvg(svg(29))
      ).images[0]!.dataUrl;
    if (kind === "bad image hash") s.figures.images[0]!.sha256 = "0".repeat(64);
    if (kind === "changed SVG") s.origin.problem.figure_svg = svg(15);
    if (kind === "choice mismatch") s.figures.images[0]!.choiceIndex = 1;
    if (kind === "wrong figure digest") s.figures.digest = "0".repeat(64);
    await expect(
      generateCodexGroupedPairs([s], {
        ...options,
        run: fake.run,
        renderFigure: render,
      }),
    ).rejects.toThrow();
    expect(fake.mock).not.toHaveBeenCalled();
  });
  it("rejects actual receipt PNG reordering", async () => {
    const fake = runner(undefined, (r) => {
      r.receipt.images[0]!.sha256 = "1".repeat(64);
    });
    await expect(
      generateCodexGroupedPairs([await figured()], {
        ...options,
        run: fake.run,
        renderFigure: render,
      }),
    ).rejects.toThrow("grouped-transport-binding");
  });
  it.each([
    "missing spec",
    "malformed spec",
    "engine failure",
    "reused SVG",
    "embedded raster",
    "rendered evidence mismatch",
  ])("rejects whole pair for %s", async (kind) => {
    const s = await figured();
    const fake = runner((v) => {
      if (kind === "missing spec") v.items[1]!.figureSpecJson = null;
      if (kind === "malformed spec") v.items[1]!.figureSpecJson = "{";
    });
    const custom = async (spec: unknown) => {
      if (kind === "engine failure")
        throw new Error("strict engine rejects dimensions");
      if (kind === "reused SVG")
        return {
          svg: s.origin.problem.figure_svg!,
          figures: await figuresFromDbRetrySvg(s.origin.problem.figure_svg!),
        };
      if (kind === "embedded raster")
        return {
          svg: '<svg width="40" height="40"><image href="data:image/png;base64,AAAA"/></svg>',
          figures: empty(),
        };
      const result = await render(spec);
      if (kind === "rendered evidence mismatch")
        result.figures.digest = "f".repeat(64);
      return result;
    };
    await expect(
      generateCodexGroupedPairs([s], {
        ...options,
        run: fake.run,
        renderFigure: custom,
      }),
    ).rejects.toThrow();
  });
});

it("production import graph cannot reach default paid providers or a database client", () => {
  const root = process.cwd(),
    seen = new Set<string>();
  const visit = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    expect(file.replaceAll("\\", "/")).not.toMatch(
      /\/(?:dbRetryGeneration|dbRetryReview|client|prisma|db)\.ts$/,
    );
    const ast = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const dependencies: string[] = [];
    const walk = (node: ts.Node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const clause = node.importClause;
        const bindings = clause?.namedBindings;
        const onlyTypes =
          clause?.isTypeOnly ||
          (!clause?.name &&
            bindings &&
            ts.isNamedImports(bindings) &&
            bindings.elements.every((e) => e.isTypeOnly));
        if (!onlyTypes) dependencies.push(node.moduleSpecifier.text);
      }
      if (
        ts.isExportDeclaration(node) &&
        !node.isTypeOnly &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      )
        dependencies.push(node.moduleSpecifier.text);
      if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require"))
      ) {
        expect(node.arguments.length).toBeGreaterThan(0);
        expect(ts.isStringLiteral(node.arguments[0]!)).toBe(true);
        if (ts.isStringLiteral(node.arguments[0]!))
          dependencies.push(node.arguments[0].text);
      }
      ts.forEachChild(node, walk);
    };
    walk(ast);
    for (const spec of dependencies) {
      expect(spec).not.toMatch(
        /openai|deepseek|typesafe|@ai-sdk|@prisma\/client|dotenv|lib\/ai\/client/,
      );
      if (!spec.startsWith(".") && !spec.startsWith("@/")) continue;
      const base = spec.startsWith("@/")
        ? resolve(root, "src", spec.slice(2))
        : resolve(dirname(file), spec);
      const target = [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        `${base}.js`,
        resolve(base, "index.ts"),
      ].find((p) => existsSync(p) && /\.(?:ts|tsx|js)$/.test(p));
      expect(
        target,
        `unresolved runtime dependency ${file}: ${spec}`,
      ).toBeDefined();
      visit(target!);
    }
  };
  visit(
    resolve(root, "scripts/import/textbook/codex-retry-20261011/batch-cli.ts"),
  );
  expect(seen.size).toBeGreaterThan(20);
});
