/** 마지막 두 소단원의 뒷정리 — 얇은 공백이 든 키와 직각삼각형 치수. (내 파일) */
import { readFileSync, writeFileSync } from "node:fs";

const THIN = String.fromCharCode(0x2009);

// ⑴ 시험 파일의 CHECKS 키 — 두 칸 공백으로 적힌 것을 **얇은 공백**으로 바로잡는다.
{
  const p = "src/__tests__/unit/midTypesB.test.ts";
  let s = readFileSync(p, "utf8");
  const before = s;
  s = s.replaceAll(
    '"2-1|일차함수와 그 그래프  ⑵|',
    `"2-1|일차함수와 그 그래프${THIN} ⑵|`,
  );
  if (s === before) console.log("… 시험 키는 이미 바뀌어 있다");
  // ⑵ 50·51 의 값 읽기 — 지면에 실제로 적힌 이름으로.
  s = s.replace(
    "    const [total, rate] = nums(content.match(/\\$[^$]*\\$/g)!.join(\" \"));\n    // $x=0$ 이면 처음 길이",
    "    const total = Number(content.match(/길이가 \\$(\\d+)/)[1]);\n    const rate = Number(content.match(/분에 \\$(\\d+)/)[1]);\n    // $x=0$ 이면 처음 길이",
  );
  writeFileSync(p, s, "utf8");
  console.log("시험 파일 손봤다");
}

// ⑶ 직각삼각형 두 유형의 치수를 **피타고라스 세 쌍**으로 — 빗변이 가장 길어야 한다.
{
  const p = "src/lib/middle/midSupB.ts";
  let s = readFileSync(p, "utf8");
  const oldA = `          const c = intBetween(rng, 8, 20);
          const a = intBetween(rng, 3, c - 4);
          const b = intBetween(rng, 3, 15);`;
  const newA = `          // 🔴 빗변이 가장 길어야 삼각형이 된다 — 다리를 따로 뽑으면
          //    $\\overline{AC}=13$, $\\overline{AB}=10$ 같은 발문이 나온다(실측).
          const [a, b, c] = pick(rng, RIGHT_TRIPLES);`;
  const oldB = `          const c = intBetween(rng, 8, 20);
          const ang = 2 * intBetween(rng, 15, 37);
          const b = intBetween(rng, 3, 15);`;
  const newB = `          const [, b, c] = pick(rng, RIGHT_TRIPLES);
          const ang = 2 * intBetween(rng, 15, 37);`;
  if (!s.includes(oldA) || !s.includes(oldB)) {
    console.error("🔴 앵커를 못 찾았다 — 이미 고쳤는가?");
    process.exit(1);
  }
  s = s.replace(oldA, newA).replace(oldB, newB);
  // 세 쌍 표를 함수 앞에 둔다.
  const anchor = "const RIGHT_CONGRUENT_SUPPLEMENTS";
  s = s.replace(
    anchor,
    `/** 피타고라스 세 쌍 [다리, 다리, 빗변] — 빗변이 가장 길다. */\nconst RIGHT_TRIPLES = [\n  [3, 4, 5],\n  [6, 8, 10],\n  [5, 12, 13],\n  [9, 12, 15],\n  [8, 15, 17],\n  [12, 16, 20],\n] as const;\n\n${anchor}`,
  );
  writeFileSync(p, s, "utf8");
  console.log("생성기 손봤다");
}
