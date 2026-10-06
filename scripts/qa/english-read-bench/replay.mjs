/**
 * 후보정을 **받아 둔 글로** 잰다 — 모델을 더 부르지 않는다. 제품 함수(`src/lib/english/readRefine.ts`)를 그대로 건다.
 *
 *   node --import tsx scripts/qa/english-read-bench/replay.mjs <결과 폴더> [--single <팔>] [--verified <팔>] [--audit]
 *
 * 기본 팔: 따로 읽은 글 = `gemini-low@r5b` 의 회차들 + `gemini-low@r5bv1` 의 첫 읽기(.pass1.txt), 대조까지 한 글 = `gemini-low@r5bv1`.
 * 제품의 길은 «(읽기 + 대조) 와 따로 한 번 읽기 → 빈칸 맞추기 → 추측 보정»이다 — 대조한 글마다, 다른 회차의 따로 읽은 글 하나씩과 짝지어 잰다.
 * `--audit` — 추측 보정을 결과 폴더의 **모든 팔 · 모든 글**에 걸어, 큰 흠이 는 글이 있는지 본다(멀쩡한 글을 망가뜨리지 않는가).
 *
 * 🔴 워크트리(정션 node_modules)에서는 `--import tsx` 가 안 돈다 — 본 저장소 폴더에서 이 파일의 경로를 주어 돌린다.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { hunks, tokens } from "./lib.mjs";
import {
  classify,
  dropIgnored,
  ignoreOf,
  norm,
  refTokens,
} from "./scorelib.mjs";

const loaded = await import(
  pathToFileURL(
    path.join(import.meta.dirname, "../../../src/lib/english/readRefine.ts"),
  ).href
);
const { polishEnglishReadText, reconcileEnglishBlanks } =
  loaded.default ?? loaded;

const args = process.argv.slice(2);
const outDir = args.shift();
const flag = (name, fallback) => {
  const at = args.indexOf(name);
  return at < 0 ? fallback : args[at + 1];
};
const SINGLE = flag("--single", "gemini-low@r5b");
const VERIFIED = flag("--verified", "gemini-low@r5bv1");
const refDir = path.join(outDir, "ref");
const stems = readdirSync(refDir)
  .filter((name) => name.endsWith(".txt") && !name.includes(".alt"))
  .map((name) => name.slice(0, -4))
  .sort();
const bare = (list) => list.join("").replace(/[.,?!()_\s·⇒]/g, "");

function judge(text, stem) {
  const ignore = ignoreOf(refDir, stem);
  const a = tokens(norm(text)).filter((token) => !ignore?.test(token));
  const list = readdirSync(refDir)
    .filter((name) => name === `${stem}.txt` || name.startsWith(`${stem}.alt`))
    .map((name) => {
      const ref = dropIgnored(
        refTokens(readFileSync(path.join(refDir, name), "utf8")),
        ignore,
      );
      return classify(hunks(a, ref.out), ref.optional);
    })
    .sort((x, y) => x.length - y.length)[0]
    .filter((hunk) => hunk.kind !== "옮김(짝)");
  const major = list.filter(
    (hunk) => hunk.kind === "옮김" || bare(hunk.a) !== bare(hunk.b),
  ).length;
  return { major, minor: list.length - major };
}

const runsOf = (arm) =>
  existsSync(path.join(outDir, arm))
    ? readdirSync(path.join(outDir, arm)).sort()
    : [];
const read = (arm, run, stem, suffix = "") => {
  const file = path.join(outDir, arm, run, `${stem}${suffix}.txt`);
  return existsSync(file) ? readFileSync(file, "utf8") : null;
};

if (args.includes("--audit")) {
  let total = 0;
  let changed = 0;
  let better = 0;
  const worse = [];
  for (const arm of readdirSync(outDir).filter((name) => name !== "ref"))
    for (const run of runsOf(arm))
      for (const stem of stems)
        for (const suffix of ["", ".pass1"]) {
          const text = read(arm, run, stem, suffix);
          if (text === null) continue;
          total++;
          const polished = polishEnglishReadText(text);
          if (polished.trim() === text.replace(/\r\n?/g, "\n").trim()) continue;
          changed++;
          const before = judge(text, stem).major;
          const after = judge(polished, stem).major;
          if (after < before) better++;
          if (after > before)
            worse.push(`${arm}/${run}/${stem}${suffix} ${before} → ${after}`);
        }
  console.log(
    `추측 보정 — 글 ${total} · 바뀐 글 ${changed} · 큰 흠이 준 글 ${better} · 는 글 ${worse.length}`,
  );
  for (const line of worse) console.log("  나빠짐:", line);
  process.exit(worse.length ? 1 : 0);
}

const singles = (stem) => [
  ...runsOf(SINGLE).map((run) => read(SINGLE, run, stem)),
  ...runsOf(VERIFIED).map((run) => read(VERIFIED, run, stem, ".pass1")),
];
const PATHS = {
  "한 번 읽기": (stem) => singles(stem).filter(Boolean),
  "한 번 읽기 + 추측 보정": (stem) =>
    singles(stem).filter(Boolean).map(polishEnglishReadText),
  "읽기 + 대조": (stem) =>
    runsOf(VERIFIED)
      .map((run) => read(VERIFIED, run, stem))
      .filter(Boolean),
  "읽기 + 대조 + 추측 보정": (stem) =>
    runsOf(VERIFIED)
      .map((run) => read(VERIFIED, run, stem))
      .filter(Boolean)
      .map(polishEnglishReadText),
  "제품의 길 — (읽기 + 대조) 와 따로 한 번 읽기 → 빈칸 맞추기 → 추측 보정": (
    stem,
  ) => {
    const out = [];
    for (const run of runsOf(VERIFIED)) {
      const final = read(VERIFIED, run, stem);
      if (!final) continue;
      // 따로 읽은 글 — 이 대조의 밑글(.pass1)이 아닌 것만
      for (const other of runsOf(SINGLE).map((r) => read(SINGLE, r, stem)))
        if (other)
          out.push(polishEnglishReadText(reconcileEnglishBlanks(final, other)));
    }
    return out;
  },
};

console.log(
  "길 | 읽은 쪽 | 흠 없는 쪽 | 비율 | 학습지 | 시험지 | 큰 흠(쪽당) | 작은 흠(쪽당)",
);
for (const [name, make] of Object.entries(PATHS)) {
  let pages = 0;
  let clean = 0;
  let major = 0;
  let minor = 0;
  // 앞의 다섯 장은 학습지, 뒤의 여섯 장은 시험지(2026-10-06 의 표본)
  const sheet = [0, 0];
  const exam = [0, 0];
  for (const [index, stem] of stems.entries())
    for (const text of make(stem)) {
      const result = judge(text, stem);
      pages++;
      major += result.major;
      minor += result.minor;
      const bucket = index < 5 ? sheet : exam;
      bucket[1]++;
      if (!result.major) {
        clean++;
        bucket[0]++;
      }
    }
  console.log(
    `${name} | ${pages} | ${clean} | ${pages ? Math.round((clean / pages) * 100) : 0}% | ${sheet[0]}/${sheet[1]} | ${exam[0]}/${exam[1]} | ${major} (${pages ? (major / pages).toFixed(2) : "-"}) | ${minor} (${pages ? (minor / pages).toFixed(2) : "-"})`,
  );
}
