/**
 * 「보기 목록의 **표식**이 무엇인가」를 엔진 전량에 대고 센다 (D-80).
 *
 *   npx tsx scripts/qa/census-choice-marks.ts
 *   npx tsx scripts/qa/census-choice-marks.ts --db     # 공유 DB 의 출제 가능 문항도
 *
 * ## 왜 이 자가 따로 필요한가
 *
 * `assertChoiceCount` 는 **개수**만 본다. 그래서 ㉠~㉤ 로 낸 다섯 줄은 관문을
 * **통과한다** — 개수가 다섯이니까. 그런데 제품 파서(`parseProblemContent`)는
 * 개행 뒤 `①~⑮`·`1.` 만 보기로 읽으므로, ㉠ 목록은 지면에서 **보기 목록 대접을
 * 못 받는다**(표식이 제 자리에 안 서고, 인쇄에서 두 단으로도 안 앉는다).
 * 「개수가 맞나」로는 이 부류를 **구조적으로 못 센다** — 축이 다르다.
 *
 * ## 열쇠를 손으로 정하지 않는다
 *
 * 「㉠·㉡·㉢·㉣·㉤ 를 찾자」로 세지 않는다. 그렇게 하면 목록에 없는 표식
 * (❶ · ⓐ · ㈎ …)은 **영영 0** 이다. 대신 두 자를 **맞대어** 센다:
 *   ㉠ `markListCount` — 줄머리가 둥근 표식인 줄 (유니코드 블록으로 판정)
 *   ㉡ `choiceCountOf`  — **제품 파서**가 실제로 보기로 읽는 줄
 * 둘이 어긋나는 자리가 곧 「지면이 보기로 안 읽는 목록」이고, 그때 **실제로 쓰인
 * 표식 글자**를 산출물에서 뽑아 찍는다 — 무엇이 나올지 미리 정하지 않는다.
 */
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import {
  choiceCountOf,
  markListCount,
} from "../../src/lib/problem/choiceCountRule";

const SEEDS = Number(process.env.SEEDS ?? 40);
const SEED0 = 20260825;
const STEP = 7919;

/** 줄머리에 실제로 쓰인 표식 글자 — 미리 정하지 않고 산출물에서 뽑는다. */
function headMarks(content: string): string[] {
  const out: string[] = [];
  for (const line of content.split("\n")) {
    const t = line.trimStart();
    if (t.length === 0) continue;
    const cp = t.codePointAt(0)!;
    const round =
      (cp >= 0x2460 && cp <= 0x24ff) ||
      (cp >= 0x2776 && cp <= 0x2793) ||
      (cp >= 0x3260 && cp <= 0x327f);
    if (round) out.push(t[0]!);
  }
  return out;
}

type Row = {
  key: string;
  seen: number;
  marks: Set<string>;
  listed: number; // 표식 목록이 있는 산출물 수
  unread: number; // 그중 파서가 «보기»로 안 읽는 것
};

function note(map: Map<string, Row>, key: string, content: string): void {
  const r = map.get(key) ?? {
    key,
    seen: 0,
    marks: new Set<string>(),
    listed: 0,
    unread: 0,
  };
  r.seen += 1;
  const m = markListCount(content);
  if (m > 0) {
    r.listed += 1;
    for (const ch of headMarks(content)) r.marks.add(ch);
    if (choiceCountOf(content) !== m) r.unread += 1;
  }
  map.set(key, r);
}

async function main(): Promise<void> {
  const rows = new Map<string, Row>();
  let thrown = 0;

  for (const t of registeredTypes()) {
    for (let s = 0; s < SEEDS; s += 1) {
      try {
        note(
          rows,
          t.key,
          generateMiddleProblem(t.key, SEED0 + s * STEP).content,
        );
      } catch {
        thrown += 1;
      }
    }
  }
  for (const unit of elementaryUnits()) {
    const tiers = supportedTiers(unit);
    const asks = tiers.length > 0 ? [...tiers] : [undefined];
    for (const tier of asks) {
      for (let s = 0; s < 6; s += 1) {
        try {
          const p = generateElementaryProblem(unit, SEED0 + s * STEP, tier);
          note(rows, `초등 ${unit.section}`, p.content);
        } catch {
          thrown += 1;
        }
      }
    }
  }

  const all = [...rows.values()];
  const listed = all.filter((r) => r.listed > 0);
  const unread = listed.filter((r) => r.unread > 0);

  /**
   * 🔴 **변이 하네스가 「뜻이 바뀌었나」를 묻는 자리** (3단 판정의 ⑵).
   *
   * `probe-choose-all.ts` 의 지문은 이 축을 **못 본다** — 표식을 바꿔도 그 지문은
   * 한 글자도 안 변한다(그 유형들은 「모두 고르시오」가 아니라 「모두 몇 개인지
   * 구하시오」라 판정 밖이다). 축이 없으면 변이시킬 수 없으므로 여기 따로 둔다.
   */
  if (process.argv.includes("--fingerprint")) {
    const { createHash } = await import("node:crypto");
    const h = createHash("sha256");
    for (const r of all.sort((a, b) => a.key.localeCompare(b.key))) {
      h.update(
        JSON.stringify([
          r.key,
          r.seen,
          [...r.marks].sort(),
          r.listed,
          r.unread,
        ]),
      );
    }
    h.update(
      JSON.stringify({
        types: all.length,
        listed: listed.length,
        unread: unread.length,
        SEEDS,
      }),
    );
    console.log(
      `유형 ${all.length} · 목록 ${listed.length} · 안 읽힘 ${unread.length}`,
    );
    console.log(h.digest("hex"));
    return;
  }

  console.log(
    `엔진 유형 ${all.length} · 씨앗 ${SEEDS} · 던짐 ${thrown}\n` +
      `표식 목록을 내는 유형 ${listed.length} · 그중 파서가 보기로 **안 읽는** 유형 ${unread.length}`,
  );
  console.log("\n🔴 지면이 «보기»로 안 읽는 목록 —");
  if (unread.length === 0) console.log("  (없다)");
  for (const r of unread.sort((a, b) => a.key.localeCompare(b.key))) {
    console.log(
      `  ${r.key}  ${r.unread}/${r.listed}건  표식 ${[...r.marks].join("")}`,
    );
  }

  const marks = new Map<string, number>();
  for (const r of listed) {
    for (const ch of r.marks) marks.set(ch, (marks.get(ch) ?? 0) + 1);
  }
  console.log("\n표식별 유형 수 —");
  for (const [ch, n] of [...marks].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${ch}  ${n}유형`);
  }

  if (!process.argv.includes("--db")) return;

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    const live = await prisma.problem.findMany({
      where: { directUseAllowed: true },
      select: { id: true, problemCode: true, content: true },
    });
    const bad = live.filter(
      (p) =>
        markListCount(p.content) > 0 &&
        choiceCountOf(p.content) !== markListCount(p.content),
    );
    console.log(
      `\n공유 DB 출제 가능 ${live.length}건 · 지면이 «보기»로 안 읽는 목록 ${bad.length}건`,
    );
    for (const p of bad) {
      console.log(
        `  ${p.problemCode}  표식 ${[...new Set(headMarks(p.content))].join("")}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

void main();
