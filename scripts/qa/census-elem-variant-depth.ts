/**
 * **「문항이 충분한가」를 재는 자** — 초등 적재본의 «문항류마다 발문이 몇 개인가».
 *
 *     npx tsx scripts/qa/census-elem-variant-depth.ts
 *     npx tsx scripts/qa/census-elem-variant-depth.ts --selftest   # 이 자가 «아니오»를 낼 수 있나
 *
 * ── 🔴 왜 «행»이 아니라 «발문» 인가 ────────────────────────────────────────
 *
 * 적재기는 한 문항을 **단답형·객관식 두 벌**로 넣는다. 그래서 행으로 세면
 *   · 객관식을 못 만든 문항류는 변형이 3개인데 3행이라 «얇다»로 보이고,
 *   · 변형이 하나뿐인데 두 형식이 다 나온 문항류는 2행이라 «괜찮다»로 보인다.
 * 실측으로 두 방식이 **45 vs 147** 로 갈렸다 — 세 배 넘게 다르다.
 * 「파생물을 정본과 견줄 때 «누가 무엇을 덧붙였나»를 먼저 빼라」(2026-08-29·08-30)가
 * 여기서는 «형식을 빼라»가 된다. 그래서 **단답형만** 보고 발문을 집합으로 센다.
 *
 * ── ⚠️ 이 자는 판정기가 아니다 ────────────────────────────────────────────
 *
 * 관문 쓸기(`probe-elem-*`)에 안 걸린다. 두 가지 까닭이다:
 *   ⑴ **DB 를 읽는다.** 관문은 망 없이 돌아야 한다.
 *   ⑵ 「발문이 세 개 이상이어야 한다」를 강제하면 **늘 운다** — 「사다리꼴의
 *      꼭짓점은 몇 개인가?」처럼 씨앗이 무엇이든 한 문항인 문형이 실제로 있고,
 *      그것은 결함이 아니다. 늘 우는 가드는 꺼진다(2026-08-20).
 * 그래서 **수만 찍는다.** 줄이는 것은 사람이 문형을 넓혀서 할 일이다.
 *
 * ── 「0 은 «깨끗»과 «못 셈»을 안 가른다」 ──────────────────────────────────
 *
 * 문항류를 하나도 못 찾으면 **판정을 거부**한다(종료 2). 적재본이 비었거나
 * `familyKey` 규약이 바뀌면 이 자는 조용히 0을 낼 수 있고, 그 0 은 「충분하다」로
 * 읽힌다 — 그게 이 저장소가 여러 번 겪은 그 자리다.
 */
import { PrismaClient } from "@prisma/client";
import { isDirectScript } from "../import/isDirectScript";

export type FamilyDepth = { familyKey: string; tier: string; 발문: number };

/** 발문 집합으로 깊이를 센다 — **형식은 빼고** 본다. */
export function depthOf(
  rows: readonly { familyKey: string; difficulty: string; content: string }[],
): FamilyDepth[] {
  const per = new Map<string, { tier: string; set: Set<string> }>();
  for (const r of rows) {
    if (!per.has(r.familyKey))
      per.set(r.familyKey, { tier: r.difficulty, set: new Set() });
    per.get(r.familyKey)!.set.add(r.content.replace(/\s+/g, " ").trim());
  }
  return [...per].map(([familyKey, v]) => ({
    familyKey,
    tier: v.tier,
    발문: v.set.size,
  }));
}

const 눈금: [
  string,
  { familyKey: string; difficulty: string; content: string }[],
  number[],
][] = [
  // 양성 — 얕은 것을 실제로 얕다고 하나
  [
    "양성 · 발문이 하나뿐",
    [
      {
        familyKey: "elem:초3|1-1-1 가|f01",
        difficulty: "연산",
        content: "$1+1$ 은?",
      },
      {
        familyKey: "elem:초3|1-1-1 가|f01",
        difficulty: "연산",
        content: "$1+1$  은?",
      }, // 공백만 다르다 → 같은 발문
    ],
    [1],
  ],
  [
    "양성 · 발문 둘",
    [
      {
        familyKey: "elem:초3|1-1-1 가|f01",
        difficulty: "연산",
        content: "$1+1$",
      },
      {
        familyKey: "elem:초3|1-1-1 가|f01",
        difficulty: "연산",
        content: "$2+2$",
      },
    ],
    [2],
  ],
  // 음성 — 넉넉한 것을 얕다고 하면 안 된다
  [
    "음성 · 발문 셋",
    [
      {
        familyKey: "elem:초3|1-1-1 가|f01",
        difficulty: "연산",
        content: "$1+1$",
      },
      {
        familyKey: "elem:초3|1-1-1 가|f01",
        difficulty: "연산",
        content: "$2+2$",
      },
      {
        familyKey: "elem:초3|1-1-1 가|f01",
        difficulty: "연산",
        content: "$3+3$",
      },
    ],
    [3],
  ],
  [
    "음성 · 문항류 둘을 안 섞는다",
    [
      {
        familyKey: "elem:초3|1-1-1 가|f01",
        difficulty: "연산",
        content: "$1+1$",
      },
      {
        familyKey: "elem:초3|1-1-1 가|f02",
        difficulty: "기본",
        content: "$2+2$",
      },
    ],
    [1, 1],
  ],
  ["음성 · 빈 입력은 빈 답", [], []],
];

function selfTest(): number {
  let bad = 0;
  for (const [label, input, want] of 눈금) {
    const got = depthOf(input)
      .map((d) => d.발문)
      .sort();
    const ok = JSON.stringify(got) === JSON.stringify([...want].sort());
    if (!ok) {
      console.log(
        `❌ ${label} — 기대 ${JSON.stringify(want)} · 실제 ${JSON.stringify(got)}`,
      );
      bad += 1;
    } else console.log(`  ✅ ${label}`);
  }
  console.log(`눈금 ${눈금.length}건 · 실패 ${bad}`);
  return bad;
}

async function main(): Promise<void> {
  if (process.argv.includes("--selftest")) {
    process.exit(selfTest() === 0 ? 0 : 1);
  }
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.problem.findMany({
      where: { familyKey: { startsWith: "elem:" }, questionType: "단답형" },
      select: { familyKey: true, difficulty: true, content: true },
    });
    const depths = depthOf(
      rows.map((r) => ({
        familyKey: String(r.familyKey),
        difficulty: String(r.difficulty),
        content: String(r.content),
      })),
    );
    if (depths.length === 0) {
      console.log(
        "🔴 문항류를 하나도 못 찾았다 — 이 자가 «못 셈»이다. 판정을 거부한다.",
      );
      console.log(
        "   적재본이 비었거나 `familyKey` 규약이 바뀌었다. 적재부터 확인하라.",
      );
      process.exit(2);
    }
    const dist = new Map<number, number>();
    for (const d of depths) dist.set(d.발문, (dist.get(d.발문) ?? 0) + 1);
    console.log(`초등 적재본 — 문항류 ${depths.length}개\n`);
    console.log("서로 다른 발문   문항류");
    for (const [n, c] of [...dist].sort((a, b) => a[0] - b[0]))
      console.log(
        `  ${String(n).padStart(4)}         ${String(c).padStart(5)}`,
      );
    const thin = depths.filter((d) => d.발문 < 3);
    const one = thin.filter((d) => d.발문 === 1);
    const grp = (xs: FamilyDepth[], f: (d: FamilyDepth) => string) => {
      const m = new Map<string, number>();
      for (const x of xs) m.set(f(x), (m.get(f(x)) ?? 0) + 1);
      return [...m]
        .sort()
        .map(([k, n]) => `${k} ${n}`)
        .join(" · ");
    };
    const pct = (n: number) => ((n / depths.length) * 100).toFixed(1);
    console.log(
      `\n🔴 발문이 3개 미만 ${thin.length} (${pct(thin.length)}%) · 그중 **하나뿐** ${one.length} (${pct(one.length)}%)`,
    );
    console.log(
      "   갈래별:",
      grp(thin, (d) => d.tier),
    );
    console.log(
      "   학년별:",
      grp(thin, (d) => d.familyKey.slice(5, 7)),
    );
    console.log("\n   발문이 하나뿐인 문항류 — 앞 12개");
    for (const d of one.slice(0, 12))
      console.log(
        `     ${d.familyKey.replace("elem:", "").padEnd(56)} ${d.tier}`,
      );
    console.log(
      "\n⚠️ 이것은 «자»다 — 막지 않는다. 「한 문항뿐인 문형」은 실제로 있고(값이 하나뿐인 물음)" +
        "\n   결함이 아니다. 줄이려면 그 문형의 값 공간을 사람이 넓혀야 한다.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (isDirectScript(import.meta.url)) void main();
