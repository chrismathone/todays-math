/**
 * 판 · 모델마다, 쪽마다 «몇 번 읽어 몇 번 틀렸나» — 회차를 모아 본다.
 *   node matrix.mjs <결과 폴더> [팔 이름 필터(쉼표)]
 *
 * 흠은 둘로 가른다:
 *   - 큰 흠: 인쇄된 낱말이 빠짐 · 손글씨 낱말이 섞임 · 잘못 읽음 · 지어냄 · 자리 옮김 · 배열 문제의 «/» 가 바뀜
 *   - 작은 흠: 문장부호 · 빈칸 표시 · 괄호만 다른 것(읽은 글의 뜻이 같다)
 * 칸의 글: «큰 흠이 난 회차 수/읽은 회차 수» — 괄호 안은 그 쪽의 큰 흠 덩이 수(회차 평균).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { hunks, load, tokens } from "./lib.mjs";
import {
  classify,
  dropIgnored,
  ignoreOf,
  norm,
  refTokens,
} from "./scorelib.mjs";

const [, , outDir, filter = ""] = process.argv;
const refDir = path.join(outDir, "ref");
const stems = readdirSync(refDir)
  .filter((name) => name.endsWith(".txt") && !name.includes(".alt"))
  .map((name) => name.slice(0, -4))
  .sort();
const arms = readdirSync(outDir)
  .filter(
    (name) => name !== "ref" && existsSync(path.join(outDir, name, "run1")),
  )
  .filter((name) => !filter || filter.split(",").some((f) => name === f))
  .sort();

const bare = (list) => list.join("").replace(/[.,?!()_\s·⇒]/g, "");

function judge(arm, run, stem) {
  const text = load(outDir, arm, run, stem);
  if (text === null) return null;
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
    .filter((h) => h.kind !== "옮김(짝)");
  const major = list.filter(
    (h) => h.kind === "옮김" || bare(h.a) !== bare(h.b),
  );
  return { major: major.length, minor: list.length - major.length };
}

const rows = [];
const total = Object.fromEntries(
  arms.map((arm) => [
    arm,
    {
      runs: 0,
      pages: 0,
      clean: 0,
      major: 0,
      minor: 0,
      ms: [],
      sheet: [0, 0],
      exam: [0, 0],
    },
  ]),
);
for (const [index, stem] of stems.entries()) {
  const cells = [];
  for (const arm of arms) {
    let read = 0;
    let bad = 0;
    let major = 0;
    for (const run of ["1", "2", "3", "4", "5"]) {
      const result = judge(arm, run, stem);
      if (!result) continue;
      read++;
      total[arm].pages++;
      total[arm].major += result.major;
      total[arm].minor += result.minor;
      // 앞의 다섯 장은 학습지(손글씨가 빈칸 · 표를 채웠다), 뒤의 여섯 장은 시험지
      const group = index < 5 ? total[arm].sheet : total[arm].exam;
      group[1]++;
      if (result.major) {
        bad++;
        major += result.major;
      } else {
        total[arm].clean++;
        group[0]++;
      }
      const meta = path.join(outDir, arm, `run${run}`, `${stem}.json`);
      if (existsSync(meta))
        total[arm].ms.push(JSON.parse(readFileSync(meta, "utf8")).ms);
    }
    cells.push(
      read
        ? `${bad}/${read}${bad ? `(${(major / bad).toFixed(0)})` : ""}`
        : "-",
    );
  }
  rows.push([`${index + 1}쪽`, ...cells]);
}
const width = Math.max(...arms.map((arm) => arm.length), 8) + 2;
const line = (cells) =>
  cells.map((cell, i) => String(cell).padEnd(i ? width : 6)).join("");
console.log(line(["", ...arms]));
for (const row of rows) console.log(line(row));
console.log(
  line([
    "흠없음",
    ...arms.map((arm) => `${total[arm].clean}/${total[arm].pages}`),
  ]),
);
console.log(
  line([
    "비율",
    ...arms.map((arm) =>
      total[arm].pages
        ? `${Math.round((total[arm].clean / total[arm].pages) * 100)}%`
        : "-",
    ),
  ]),
);
console.log(
  line([
    "학습지",
    ...arms.map((arm) => `${total[arm].sheet[0]}/${total[arm].sheet[1]}`),
  ]),
);
console.log(
  line([
    "시험지",
    ...arms.map((arm) => `${total[arm].exam[0]}/${total[arm].exam[1]}`),
  ]),
);
console.log(line(["큰 흠", ...arms.map((arm) => total[arm].major)]));
console.log(line(["작은 흠", ...arms.map((arm) => total[arm].minor)]));
console.log(
  line([
    "초(중앙)",
    ...arms.map((arm) => {
      const ms = [...total[arm].ms].sort((x, y) => x - y);
      return ms.length
        ? (ms[Math.floor(ms.length / 2)] / 1000).toFixed(0)
        : "-";
    }),
  ]),
);
