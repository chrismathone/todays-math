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

/**
 * **바닥**이다 — 「같은 수」가 아니라 「이보다 적으면 멈춘다」.
 *
 * 2026-08-25 에 873 을 **같은 수**로 못 박아 두었는데, 2026-08-27 부터 네 갈래가
 * 130소단원을 10유형으로 올리려고 RPM 색인 밖 유형을 **짓는다.** 그러면 이 리터럴은
 * 갈래마다 다른 값으로 움직이는 과녁이 되어 ⑴ 네 갈래가 **같은 한 줄에서 충돌**하고
 * ⑵ 아무 갈래나 유형 하나만 더해도 말뭉치 빌더가 통째로 멈춘다(실제로 920 에서 막혔다).
 *
 * 바닥으로 바꿔도 잃는 것이 없다 — 「말뭉치가 지금 등록표를 빠짐없이 덮었나」는
 * `probe-middle-combo.ts` 의 `assertInputs` 가 **살아 있는 `registeredTypes()` 와**
 * 대조해 이미 잠근다(`entries.length !== d.registered` 면 던진다). 여기 바닥은
 * 「유형이 조용히 **사라지는**」 반대 방향만 막으면 된다.
 */
const MIN_REGISTERED_TYPES = 873;
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
  if (entries.length < MIN_REGISTERED_TYPES) {
    throw new Error(
      `등록 분모가 줄었습니다: 바닥 ${MIN_REGISTERED_TYPES} / 실제 ${entries.length}` +
        ` — 유형이 사라졌는지 보십시오(늘어난 것은 막지 않습니다)`,
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
