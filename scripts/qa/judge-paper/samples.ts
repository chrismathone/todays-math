/**
 * **판정형 지면 하네스의 표본** — 문항을 지면 하네스가 읽는 JSON 으로 낸다 (2026-10-08 엔진 보강 2단계).
 *
 *   npx tsx scripts/qa/judge-paper/samples.ts measure [N]      # 문항류마다 N 문항 — 폭 · 접힘 측정용(등록 + 보류)
 *   npx tsx scripts/qa/judge-paper/samples.ts plan <계획.json>  # 적재 계획 그대로의 행에서 문항류마다 여섯 — 표본 지면용
 *
 * 산출물은 저장소 밖(`.qa-artifacts/judge-paper/public/` — git 이 안 본다)에 쓴다. `plan` 은 차시별 묶음과
 * «글 그대로»(`samples.md`)를 같이 낸다. 순서는 이 파일 → `vite` → `measure.mjs` · `capture.mjs`(머리말 참고).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import {
  HELD_JUDGE_DEFINITIONS,
  JUDGE_DEFINITIONS,
} from "../../../src/lib/middle/judge/definitions";
import { createJudgeRegistry } from "../../../src/lib/middle/judge/registry";
import {
  buildTargetRows,
  type Target,
} from "../../import/load-engine-problems";

const OUT = ".qa-artifacts/judge-paper/public";
const PER_FAMILY = 6;

type Sample = {
  externalId: string;
  content: string;
  answer: string;
  solution: string;
  difficulty?: string;
};
const write = (id: string, section: string, goal: string, samples: Sample[]) =>
  writeFileSync(
    `${OUT}/samples-${id}.json`,
    JSON.stringify({ section, goal, samples }, null, 1),
  );

mkdirSync(OUT, { recursive: true });
const [mode, arg] = process.argv.slice(2);

if (mode === "measure") {
  // 등록한 것과 보류한 것을 한 등록부로 — 보류한 문항류가 지금 얼마나 접히는지도 같이 잰다.
  const registry = createJudgeRegistry([
    ...JUDGE_DEFINITIONS,
    ...HELD_JUDGE_DEFINITIONS,
  ]);
  const n = Number(arg ?? 60);
  const ids: string[] = [];
  for (const d of registry.definitions()) {
    const samples: Sample[] = [];
    for (let s = 0; s < n; s += 1) {
      const p = registry.generate(d.key, 555 + s * 7919, s % 4);
      samples.push({
        externalId: `${d.familyId}#${s}`,
        content: p.content,
        answer: p.answer,
        solution: p.solution,
      });
    }
    write(`w-${d.familyId}`, d.unitSection, d.title, samples);
    ids.push(`w-${d.familyId}`);
  }
  console.log(ids.join(" "));
} else if (mode === "plan" && arg) {
  const plan = JSON.parse(readFileSync(arg, "utf8")) as {
    label: string;
    seedBase: number;
    targets: Target[];
  };
  const rows = plan.targets.flatMap((t) => buildTargetRows(t, plan.seedBase));
  // 차시별 묶음 — 그 차시의 문항류 차례는 계획에 적힌 차례다.
  const bySection = new Map<string, Map<string, typeof rows>>();
  for (const r of rows) {
    const families = bySection.get(r.section) ?? new Map<string, typeof rows>();
    bySection.set(r.section, families);
    families.set(r.familyKey, [...(families.get(r.familyKey) ?? []), r]);
  }
  const md: string[] = [
    `# 판정형 표본 — 글 그대로 (적재 계획 \`${arg.split("/").at(-1)}\` · 씨앗 ${plan.seedBase})`,
    "",
    "지면 그림은 같은 폴더의 차시별 하위 폴더에 있다 — `questions-p*.png`(문제지) · `answers-p*.png`(정답지) · PDF 둘.",
    "제품 `TestPrint`(일일테스트 지면)와 통합 시험지 2단(`WorksheetEditor`)으로 떴다. 문항류마다 계획의 앞 여섯 벌.",
    "",
  ];
  const ids: string[] = [];
  let total = 0;
  [...bySection].forEach(([section, families], i) => {
    const id = `s${i + 1}`;
    const samples = [...families.values()].flatMap((list) => {
      if (list.length < PER_FAMILY)
        throw new Error(`${list[0]?.familyKey}: 표본이 ${list.length}개뿐이다`);
      return list.slice(0, PER_FAMILY);
    });
    const names = [...families.keys()].map((k) => k.split("|").at(-1));
    write(id, section, names.join(" · "), samples);
    ids.push(id);
    md.push(`## ${section} — \`${id}/\` (${samples.length}문항)`, "");
    samples.forEach((r, k) => {
      md.push(
        `### ${id} 문 ${k + 1} — \`${r.externalId}\` · ${r.difficulty}`,
        "",
        "```",
        r.content,
        "```",
        "",
        `답: ${r.answer}`,
        "",
        "```",
        r.solution,
        "```",
        "",
      );
    });
    total += samples.length;
  });
  writeFileSync(`${OUT}/samples.md`, md.join("\n"));
  console.log(`행 ${rows.length} · 표본 ${total} · 묶음 ${ids.join(" ")}`);
} else {
  console.error(
    "쓰는 법: samples.ts measure [N] | samples.ts plan <계획.json>",
  );
  process.exit(2);
}
