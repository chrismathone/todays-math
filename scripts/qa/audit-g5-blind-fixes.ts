/** DB 없이 초3~초6 출력·답·그림과 기존 초5 SHA를 캡처한다. */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import {
  elementaryUnits,
  supportedTiers,
  generateElementaryProblem,
  coreForms,
  generateElementaryForm,
} from "../../src/lib/elementary/generate";
import { COURSE_SECTIONS } from "../../src/lib/math-srs/elementary/catalog";
import { generateCourseEngineRedraw } from "../../src/lib/math-srs/elementary/engineFrames";

const sha = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
const records: Record<
  string,
  { hash: string; answer: string; figure: string }
> = {};
for (const u of elementaryUnits())
  for (let i = 1; i <= 20; i++) {
    const seed = i * 7919;
    const variants = [
      ...[undefined, ...supportedTiers(u)].map(
        (t) => [t ?? "기존", generateElementaryProblem(u, seed, t)] as const,
      ),
      ...coreForms(u).map(
        (f) => [`문형${f.id}`, generateElementaryForm(u, seed, f.id)] as const,
      ),
      ...(u.grade === "초5"
        ? ["기본", "응용"].map(
            (t) =>
              [
                `SRS:${t}`,
                generateCourseEngineRedraw(u, seed, t as "기본" | "응용"),
              ] as const,
          )
        : []),
    ];
    for (const [kind, p] of variants)
      records[`${u.grade}|${u.section.split(" ")[0]}|${kind}|${seed}`] = {
        hash: sha(p),
        answer: p.answer,
        figure: sha(p.figureSpec),
      };
  }
const baseline: Record<string, string> = {};
for (const s of COURSE_SECTIONS.filter((s) => s.grade === 5)) {
  const h = createHash("sha256");
  for (const tier of [undefined, ...supportedTiers(s.unit)])
    for (let i = 1; i <= 20; i++)
      h.update(
        JSON.stringify(generateElementaryProblem(s.unit, i * 7919, tier)),
      );
  baseline[s.id] = h.digest("hex");
}
if (!process.argv[2]) throw new Error("출력 gzip JSON 경로가 필요합니다");
writeFileSync(process.argv[2], gzipSync(JSON.stringify({ records, baseline })));
console.log(`captured ${Object.keys(records).length} records`);
