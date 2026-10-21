/**
 * 교과서 쌍둥이 시범 — 중등 엔진 쪽 일 셋 (2026-10-21 · DB 무관 · 모델 호출 없음).
 *
 *   npx tsx scripts/qa/textbook-twin/engine.ts catalog <sources.jsonl> <catalog.json>
 *       원본 묶음의 단원마다 엔진 유형 목록 — 유형마다 견본 한 문항(저자가 «같은 유형»을 고를 근거)
 *   npx tsx scripts/qa/textbook-twin/engine.ts twins <plan.jsonl> <출력 폴더>
 *       저자가 고른 유형으로 쌍둥이를 엔진이 만든다 — 씨앗은 문항 코드에서. 원본의 수를 너무 많이 물려받으면 다음 변형
 *   npx tsx scripts/qa/textbook-twin/engine.ts figures <specs.json> <출력 폴더>
 *       저자가 쓴 FigureSpec v2 를 엔진으로 그린다(엔진이 정본 검증 — 허용 밖은 실패로 남긴다)
 *   npx tsx scripts/qa/textbook-twin/engine.ts png <[svg, png] 짝 목록.json> <밀도 dpi>
 *       학생 면 그림을 PNG 로(풀이자에게 보여 줄 것)
 *
 * 정답은 엔진 생성기가 계산한 값이다. 객관식 · 서술형은 제품과 같은 파생기(`deriveFormats`)로 바꾼다.
 * 그림은 `renderFigureSpec` 하나로만 그린다 — 원본 그림을 쓰지 않는다(D-61 · 09 문서).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  asDescriptive,
  asMultipleChoice,
} from "../../../src/lib/engine/deriveFormats";
import { createRng } from "../../../src/lib/elementary/rng";
import { renderFigureSpec } from "../../../src/lib/figure/renderFigureSpec";
import {
  generateMiddleProblem,
  typesForSection,
} from "../../../src/lib/middle/generate";
import type { MidProblem } from "../../../src/lib/middle/types";
import {
  numberRetention,
  numbersIn,
  seedOf,
  sha256,
  splitChoices,
} from "./twinHelpers";

const CATALOG_SEED = 20261021;

type Source = { problemCode: string; section: string; dbContent: string };
type PlanLine = {
  problemCode: string;
  revision?: string;
  typeKey: string;
  questionType: "객관식" | "단답형" | "서술형";
  /** 원본 발문의 수 — 쌍둥이가 이만큼 물려받으면 다음 변형으로 */
  avoidNumbers: string[];
};

const readJsonl = <T>(file: string): T[] =>
  readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as T);

function catalog(sourcesFile: string, outFile: string): void {
  const sections = [
    ...new Set(readJsonl<Source>(sourcesFile).map((s) => s.section)),
  ];
  const out: Record<string, unknown[]> = {};
  for (const section of sections) {
    out[section] = typesForSection(section).map((entry) => {
      try {
        const p = generateMiddleProblem(entry.key, CATALOG_SEED, 0);
        return {
          key: entry.key,
          title: entry.rpmTitle,
          minor: entry.rpmMinor,
          difficulty: p.difficulty,
          sample: {
            content: p.content,
            answer: p.answer,
            hasFigure: !!p.figureSpec,
            // 저자가 FigureSpec v2 를 쓸 때 본뜰 실제 견본(엔진이 그리는 것이 확인된 꼴)
            figureSpec: p.figureSpec ?? null,
          },
          params: Object.keys(p.facts).length,
        };
      } catch (error) {
        return { key: entry.key, title: entry.rpmTitle, error: String(error) };
      }
    });
  }
  writeFileSync(outFile, JSON.stringify(out, null, 1));
  const types = Object.values(out).reduce((n, list) => n + list.length, 0);
  console.log(`단원 ${sections.length} · 유형 ${types} → ${outFile}`);
}

async function twins(planFile: string, outDir: string): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const results = [];
  for (const line of readJsonl<PlanLine>(planFile)) {
    try {
      const seed = seedOf(
        line.problemCode +
          (line.revision && line.revision !== "r1" ? `:${line.revision}` : ""),
      );
      let chosen: { p: MidProblem; variant: number; retention: number } | null =
        null;
      for (let variant = 0; variant < 30; variant += 1) {
        const p = generateMiddleProblem(line.typeKey, seed, variant);
        const retention = numberRetention(
          line.avoidNumbers,
          numbersIn(p.content),
        );
        const params = new Set(line.avoidNumbers).size;
        // 1회차 D: 독립 매개변수 ≥3 이고 보존율 ≥0.60 이면 보류 — 엔진은 다음 변형으로 피한다
        if (!(params >= 3 && retention >= 0.6)) {
          chosen = { p, variant, retention };
          break;
        }
      }
      if (!chosen) {
        results.push({
          problemCode: line.problemCode,
          typeKey: line.typeKey,
          error: "원본의 수를 피한 변형이 30 안에 없다",
        });
        continue;
      }
      const { p, variant, retention } = chosen;
      const stem = {
        content: p.content,
        answer: p.answer,
        solution: p.solution,
        familyKey: line.typeKey,
        problemType: p.rpmTitle,
      };
      const hasChoiceLines = splitChoices(p.content).choices.length > 0;
      const derived =
        line.questionType === "객관식" && !hasChoiceLines
          ? asMultipleChoice(stem, createRng(seed ^ 0x5bd1e995))
          : line.questionType === "서술형" && !hasChoiceLines
            ? asDescriptive(stem)
            : { ...stem, questionType: hasChoiceLines ? "객관식" : "단답형" };
      const { stem: content, choices } = splitChoices(derived.content);
      let figure: Record<string, unknown> | null = null;
      if (p.figureSpec) {
        const rendered = await renderFigureSpec(p.figureSpec, { strict: true });
        if (rendered.ok) {
          const file = `${line.problemCode}.engine.svg`;
          writeFileSync(join(outDir, file), rendered.svg);
          writeFileSync(
            join(outDir, `${line.problemCode}.engine.spec.json`),
            JSON.stringify(p.figureSpec, null, 1),
          );
          figure = {
            svgPath: file,
            specPath: `${line.problemCode}.engine.spec.json`,
            svgSha256: sha256(rendered.svg),
          };
        } else figure = { error: rendered.error };
      }
      results.push({
        problemCode: line.problemCode,
        typeKey: line.typeKey,
        seed,
        variant,
        numberRetention: retention,
        questionType: derived.questionType,
        formatChanged: derived.questionType !== line.questionType,
        content,
        choices,
        answer: derived.answer,
        solution: derived.solution,
        difficulty: p.difficulty,
        facts: p.facts,
        figure,
      });
    } catch (error) {
      results.push({
        problemCode: line.problemCode,
        typeKey: line.typeKey,
        error: String(error),
      });
    }
  }
  writeFileSync(
    join(outDir, "engine-twins.json"),
    JSON.stringify(results, null, 1),
  );
  const failed = results.filter(
    (r) => "error" in r || (r as { figure?: { error?: string } }).figure?.error,
  ).length;
  console.log(`엔진 쌍둥이 ${results.length} · 실패 ${failed} → ${outDir}`);
}

async function figures(specsFile: string, outDir: string): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const specs = JSON.parse(readFileSync(specsFile, "utf8")) as Record<
    string,
    unknown
  >;
  const report: Record<string, unknown> = {};
  for (const [id, spec] of Object.entries(specs)) {
    const rendered = await renderFigureSpec(spec, { strict: true });
    if (rendered.ok) {
      writeFileSync(join(outDir, `${id}.svg`), rendered.svg);
      report[id] = {
        ok: true,
        svgPath: `${id}.svg`,
        svgSha256: sha256(rendered.svg),
      };
    } else report[id] = { ok: false, error: rendered.error };
  }
  writeFileSync(
    join(outDir, "figures-report.json"),
    JSON.stringify(report, null, 1),
  );
  const bad = Object.values(report).filter(
    (r) => !(r as { ok: boolean }).ok,
  ).length;
  console.log(`그림 ${Object.keys(report).length} · 실패 ${bad} → ${outDir}`);
}

/** 학생 면 그림 — 풀이자가 학생처럼 «보고» 풀도록 SVG 를 PNG 로(엔진이 그린 바이트 그대로 래스터만) */
async function png(listFile: string, density: string): Promise<void> {
  const { default: sharp } = await import("sharp");
  const pairs = JSON.parse(readFileSync(listFile, "utf8")) as [
    string,
    string,
  ][];
  for (const [svgFile, pngFile] of pairs) {
    await sharp(readFileSync(svgFile), { density: Number(density) || 192 })
      .flatten({ background: "#ffffff" })
      .png()
      .toFile(pngFile);
  }
  console.log(`PNG ${pairs.length}`);
}

async function main(): Promise<void> {
  const [command, input, output] = process.argv.slice(2);
  if (!command || !input || !output) {
    console.error("engine.ts catalog|twins|figures|png <입력> <출력>");
    process.exit(2);
  }
  if (command === "catalog") catalog(input, output);
  else if (command === "twins") await twins(input, output);
  else if (command === "figures") await figures(input, output);
  else if (command === "png") await png(input, output);
  else throw new Error(`알 수 없는 명령: ${command}`);
}

void main();
