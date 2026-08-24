/**
 * ① 등록된 중등 873유형을 seed 2종 × variant 2종으로 생성해 풀이 말뭉치를 만든다.
 * ② 한 표본만 보면 생성 갈래를 놓치므로 `generateMiddleSet`으로 유형별 복수 표본을 만들고,
 *    실패 유형도 분모에서 빼지 않은 채 오류와 부분 표본을 기록한다.
 * ③ DB·제품 코드·등록값은 바꾸지 않으며 큰 JSON은 저장소 밖 C:/tmp에만 쓴다.
 *
 *   npx tsx scripts/qa/build-middle-corpus.ts
 *   npx tsx scripts/qa/build-middle-corpus.ts --out=C:/tmp/middle-combo/corpus.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  generateMiddleSet,
  registeredTypes,
} from "../../src/lib/middle/generate";
import type { MidProblem, TypeEntry } from "../../src/lib/middle/types";

const EXPECTED_REGISTERED_TYPES = 873;
const DEFAULT_OUTPUT = "C:/tmp/middle-combo/corpus.json";
const SEEDS = [20260824, 20260825] as const;
const VARIANTS_PER_SEED = 2;

type CorpusSample = Pick<
  MidProblem,
  | "grade"
  | "unitSection"
  | "rpmBook"
  | "rpmMinor"
  | "rpmType"
  | "rpmTitle"
  | "content"
  | "solution"
  | "answer"
  | "facts"
> & {
  seed: number;
  /** `generateMiddleSet`이 중복 발문을 건너뛴 뒤 돌려준 표본의 자리. */
  variant: number;
};

type CorpusType = Omit<TypeEntry, "handler"> & {
  samples: CorpusSample[];
};

type GenerationFailure = Omit<TypeEntry, "handler"> & {
  samples: CorpusSample[];
  errors: { seed: number; message: string }[];
};

type CorpusFile = {
  schemaVersion: 1;
  generatedAt: string;
  config: {
    seeds: readonly number[];
    variantsPerSeed: number;
    expectedSamplesPerType: number;
  };
  denominator: {
    registered: number;
    attempted: number;
    succeeded: number;
    failed: number;
  };
  types: CorpusType[];
  failures: GenerationFailure[];
};

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv
    .slice(2)
    .find((arg) => arg.startsWith(prefix))
    ?.slice(prefix.length);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function entryMeta(entry: TypeEntry): Omit<TypeEntry, "handler"> {
  return {
    key: entry.key,
    grade: entry.grade,
    unitSection: entry.unitSection,
    rpmBook: entry.rpmBook,
    rpmMinor: entry.rpmMinor,
    rpmType: entry.rpmType,
    rpmTitle: entry.rpmTitle,
  };
}

function sampleOf(
  problem: MidProblem,
  seed: number,
  variant: number,
): CorpusSample {
  return {
    seed,
    variant,
    grade: problem.grade,
    unitSection: problem.unitSection,
    rpmBook: problem.rpmBook,
    rpmMinor: problem.rpmMinor,
    rpmType: problem.rpmType,
    rpmTitle: problem.rpmTitle,
    content: problem.content,
    solution: problem.solution,
    answer: problem.answer,
    facts: problem.facts,
  };
}

function assertEntryMatchesProblem(
  entry: TypeEntry,
  problem: MidProblem,
): void {
  const pairs: [string, string, string][] = [
    ["grade", entry.grade, problem.grade],
    ["unitSection", entry.unitSection, problem.unitSection],
    ["rpmBook", entry.rpmBook, problem.rpmBook],
    ["rpmMinor", entry.rpmMinor, problem.rpmMinor],
    ["rpmType", entry.rpmType, problem.rpmType],
    ["rpmTitle", entry.rpmTitle, problem.rpmTitle],
  ];
  const mismatch = pairs.find(
    ([, registered, generated]) => registered !== generated,
  );
  if (mismatch) {
    const [field, registered, generated] = mismatch;
    throw new Error(
      `${entry.key}: 등록 ${field}=${JSON.stringify(registered)} / 생성=${JSON.stringify(generated)}`,
    );
  }
}

function main(): void {
  const entries = registeredTypes();
  if (entries.length !== EXPECTED_REGISTERED_TYPES) {
    throw new Error(
      `등록 분모가 달라졌습니다: 기대 ${EXPECTED_REGISTERED_TYPES} / 실제 ${entries.length}`,
    );
  }

  const attempted = entries.length;
  console.log(
    `분모 — 등록 ${entries.length} == 생성 시도 ${attempted}` +
      ` (유형마다 seed ${SEEDS.length} × variant ${VARIANTS_PER_SEED}` +
      ` = 표본 ${SEEDS.length * VARIANTS_PER_SEED})`,
  );

  const types: CorpusType[] = [];
  const failures: GenerationFailure[] = [];

  for (const entry of entries) {
    const samples: CorpusSample[] = [];
    const errors: { seed: number; message: string }[] = [];

    for (const seed of SEEDS) {
      try {
        const generated = generateMiddleSet(entry.key, seed, VARIANTS_PER_SEED);
        if (generated.length !== VARIANTS_PER_SEED) {
          throw new Error(
            `표본 수 불일치: 기대 ${VARIANTS_PER_SEED} / 실제 ${generated.length}`,
          );
        }
        generated.forEach((problem, variant) => {
          assertEntryMatchesProblem(entry, problem);
          samples.push(sampleOf(problem, seed, variant));
        });
      } catch (error) {
        errors.push({ seed, message: messageOf(error) });
      }
    }

    if (errors.length > 0) {
      failures.push({ ...entryMeta(entry), samples, errors });
      continue;
    }

    const expectedSamples = SEEDS.length * VARIANTS_PER_SEED;
    if (samples.length !== expectedSamples) {
      failures.push({
        ...entryMeta(entry),
        samples,
        errors: [
          {
            seed: -1,
            message: `최종 표본 수 불일치: 기대 ${expectedSamples} / 실제 ${samples.length}`,
          },
        ],
      });
      continue;
    }
    types.push({ ...entryMeta(entry), samples });
  }

  const denominator = {
    registered: entries.length,
    attempted,
    succeeded: types.length,
    failed: failures.length,
  };
  if (
    denominator.registered !== denominator.attempted ||
    denominator.succeeded + denominator.failed !== denominator.attempted
  ) {
    throw new Error(
      `분모 불일치: 등록 ${denominator.registered} / 시도 ${denominator.attempted}` +
        ` / 성공 ${denominator.succeeded} / 실패 ${denominator.failed}`,
    );
  }

  const corpus: CorpusFile = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    config: {
      seeds: SEEDS,
      variantsPerSeed: VARIANTS_PER_SEED,
      expectedSamplesPerType: SEEDS.length * VARIANTS_PER_SEED,
    },
    denominator,
    types,
    failures,
  };

  const output = resolve(argValue("out") ?? DEFAULT_OUTPUT);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(corpus, null, 2), "utf8");

  console.log(
    `집계 — 등록 ${denominator.registered} == 시도 ${denominator.attempted}` +
      ` == 성공 ${denominator.succeeded} + 생성 실패 ${denominator.failed}`,
  );
  for (const failure of failures) {
    console.log(
      `  실패 ${failure.key} — ${failure.errors.map((e) => `seed ${e.seed}: ${e.message}`).join(" / ")}`,
    );
  }
  console.log(`JSON → ${output}`);
}

try {
  main();
} catch (error) {
  console.error(messageOf(error));
  process.exitCode = 1;
}
