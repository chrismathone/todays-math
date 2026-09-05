/**
 * **문항류 실태 조사** — 「각 문항류가 실제로 무엇을 묻고 있는가」 (읽기 전용).
 *
 * 원장님 지시 2026-09-06: *「문항류를 판단할 기준점을 잡고, 진짜 각 문항류가 어떤
 * 유형을 출제하고 있는가를 정립해야 함」* · *「정말 없는 유형은 새 문항류가 붙겠지만,
 * 그렇지 않다면 같은 문항류에 배정되는 게 현실적」*.
 *
 * ## 🔴 유형 키에는 **이름이 없다**
 *
 * `mid:3-2|삼각비의 활용|07` 의 `07` 은 **생성기의 유형 번호**다. 사람이 읽을 설명이
 * 어디에도 없다. 그러니 「무엇을 묻는가」는 **문항 자체에서 뽑아야** 한다 —
 * 문서를 읽어 적으면 그건 조사가 아니라 내 독해다(2026-08-25 교훈).
 *
 * ## 지문 만들기 — 숫자를 지운 발문
 *
 * 한 류의 문항들은 «숫자만 다른 형제»다. 그래서 발문에서 **수·수식을 지우면**
 * 남는 글이 그 류가 묻는 것이다. 이것을 지문으로 삼는다.
 *
 * ⚠️ 지문이 **여러 개**로 갈리는 류가 있으면 그 류는 한 가지를 묻는 게 아니다 —
 *    그것도 이 조사가 답해야 할 것이라 **갈래 수를 함께 찍는다.**
 *
 *     npx tsx scripts/qa/survey-families.ts [소단원id …]
 *     npx tsx scripts/qa/survey-families.ts --exam   # 기출이 속한 소단원만
 */
import { db } from "../../src/lib/db";

/** 발문에서 값을 지운다 — 남는 것이 「무엇을 묻는가」다. */
export function stemFingerprint(content: string): string {
  return (
    content
      // 보기·선택지는 발문이 아니다. 첫 번째 번호 보기부터 잘라 낸다.
      .split(/\n\s*(?:[①-⑩]|\d\.\s)/)[0]!
      // 수식은 통째로 한 표식으로
      .replace(/\$[^$]*\$/g, "▦")
      // 남은 맨 숫자
      .replace(/\d+(?:\.\d+)?/g, "▦")
      .replace(/[▦\s]*▦[▦\s]*/g, "▦")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** 지문에서 **한글 낱말**만 남긴다 — 수·라틴 글자는 형제끼리도 다르다. */
function words(print: string): Set<string> {
  return new Set(
    (print.match(/[가-힣]{2,}/g) ?? []).map((w) =>
      w.replace(/[을를이가은는의에서]$/, ""),
    ),
  );
}

/** 두 지문이 얼마나 같은 것을 묻나 (자카드). 0 은 「못 잰다」가 아니라 「안 닮았다」다. */
function similarity(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (x.size === 0 || y.size === 0) return 0;
  let hit = 0;
  for (const w of x) if (y.has(w)) hit++;
  return hit / (x.size + y.size - hit);
}

/**
 * 기출 문항마다 **같은 소단원의 엔진 유형**을 닮은 순서로 늘어놓는다.
 *
 * 🔴 이것은 **자동 배정이 아니다.** 닮음은 「후보를 좁히는」 도구고, 「같은 류인가」는
 *    사람이 본다 — 낱말이 겹쳐도 묻는 것이 다를 수 있다(2026-08-18 「수가 맞는다」를
 *    「짝이 맞는다」로 읽지 말 것).
 */
async function matchMode(): Promise<number> {
  const past = await db.problem.findMany({
    where: { source: "past_exam" },
    select: {
      questionNumber: true,
      problemCode: true,
      unitId: true,
      content: true,
    },
    orderBy: { questionNumber: "asc" },
  });
  for (const p of past) {
    const unit = await db.unit.findUnique({
      where: { id: p.unitId },
      select: { section: true },
    });
    const siblings = await db.problem.findMany({
      where: { unitId: p.unitId, source: { not: "past_exam" } },
      select: { familyKey: true, content: true, problemCode: true },
    });
    const byFam = new Map<string, { print: string; code: string }[]>();
    for (const s of siblings) {
      const k = s.familyKey ?? "(NULL)";
      if (!byFam.has(k)) byFam.set(k, []);
      byFam
        .get(k)!
        .push({ print: stemFingerprint(s.content), code: s.problemCode ?? "" });
    }
    const mine = stemFingerprint(p.content);
    const ranked = [...byFam.entries()]
      .map(([key, items]) => {
        const best = items
          .map((i) => ({ ...i, score: similarity(mine, i.print) }))
          .sort((a, b) => b.score - a.score)[0]!;
        return { key, best, count: items.length };
      })
      .sort((a, b) => b.best.score - a.best.score);

    console.log(`\n${"─".repeat(78)}`);
    console.log(
      `문${p.questionNumber} ${p.problemCode}  [${unit?.section ?? "?"}]`,
    );
    console.log(`  기출 지문: ${mine.slice(0, 110)}`);
    for (const r of ranked.slice(0, 3))
      console.log(
        `   ${r.best.score.toFixed(2)}  ${r.key.replace(/^mid:/, "")} (문항 ${r.count})\n` +
          `         ${r.best.print.slice(0, 100)}`,
      );
    if (ranked.length === 0) console.log("   같은 소단원에 엔진 문항이 없다");
  }
  return 0;
}

/**
 * 무리마다 **모든** 지문을 자르지 않고 늘어놓는다.
 *
 * 🔴 `--exam` 은 상위 2가지만 찍는다. 「이 무리가 한 개념인가」를 판단하려면 **전부**
 *    봐야 한다 — 잘린 목록으로 판단하면 그건 조사가 아니라 짐작이다.
 */
async function printsMode(unitIds: string[]): Promise<number> {
  for (const unitId of unitIds) {
    const unit = await db.unit.findUnique({
      where: { id: unitId },
      select: { grade: true, chapter: true, section: true },
    });
    const rows = await db.problem.findMany({
      where: { unitId, source: { not: "past_exam" } },
      select: { familyKey: true, content: true },
    });
    const fams = await db.problemFamily.findMany({
      where: { unitId },
      select: { familyCode: true, familyKey: true },
      orderBy: { familyCode: "asc" },
    });
    const byFamily = new Map<string, string[]>();
    for (const r of rows) {
      const k = r.familyKey ?? "(NULL)";
      if (!byFamily.has(k)) byFamily.set(k, []);
      byFamily.get(k)!.push(stemFingerprint(r.content));
    }
    console.log(`\n${"═".repeat(78)}\n${unit?.section ?? unitId}`);
    for (const f of fams) {
      const mine = byFamily.get(f.familyKey) ?? [];
      if (mine.length === 0) continue;
      const prints = new Map<string, number>();
      for (const p of mine) prints.set(p, (prints.get(p) ?? 0) + 1);
      if (prints.size < 2) continue; // 한 지문뿐이면 볼 것이 없다
      console.log(
        `\n  ${f.familyCode} — 지문 ${prints.size}가지 / 문항 ${mine.length}`,
      );
      for (const [p, n] of [...prints.entries()].sort((a, b) => b[1] - a[1]))
        console.log(`      ${String(n).padStart(3)}× ${p}`);
    }
  }
  return 0;
}

/** 기출 문항 **원문 전량**. 지문으로는 「무엇을 묻는가」가 잘려 안 보인다. */
async function pastMode(): Promise<number> {
  const past = await db.problem.findMany({
    where: { source: "past_exam" },
    select: {
      questionNumber: true,
      problemCode: true,
      familyKey: true,
      questionType: true,
      content: true,
      answer: true,
      unitId: true,
    },
    orderBy: { questionNumber: "asc" },
  });
  for (const p of past) {
    const unit = await db.unit.findUnique({
      where: { id: p.unitId },
      select: { section: true },
    });
    console.log(`\n${"─".repeat(78)}`);
    console.log(
      `문${p.questionNumber} ${p.problemCode} [${unit?.section ?? "?"}] ${p.questionType} · ${p.familyKey}`,
    );
    console.log(p.content);
    console.log(`  ▸ 답: ${p.answer}`);
  }
  return 0;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args[0] === "--match") return matchMode();
  if (args[0] === "--past") return pastMode();
  const wantPrints = args[0] === "--prints";
  if (wantPrints) args.shift();
  let unitIds: string[];
  if (args[0] === "--exam" || args.length === 0) {
    const rows = await db.problem.findMany({
      where: { source: "past_exam" },
      select: { unitId: true },
    });
    unitIds = [
      ...new Set(rows.map((r) => r.unitId).filter(Boolean)),
    ] as string[];
  } else {
    unitIds = args;
  }

  if (wantPrints) return printsMode(unitIds);

  for (const unitId of unitIds) {
    const unit = await db.unit.findUnique({
      where: { id: unitId },
      select: { grade: true, chapter: true, section: true },
    });
    const rows = await db.problem.findMany({
      where: { unitId },
      select: {
        problemCode: true,
        familyKey: true,
        content: true,
        source: true,
      },
    });
    const fams = await db.problemFamily.findMany({
      where: { unitId },
      select: { familyCode: true, familyKey: true },
      orderBy: { familyCode: "asc" },
    });

    const byFamily = new Map<string, typeof rows>();
    for (const r of rows) {
      const k = r.familyKey ?? "(NULL)";
      if (!byFamily.has(k)) byFamily.set(k, []);
      byFamily.get(k)!.push(r);
    }

    console.log(
      `\n${"═".repeat(78)}\n소단원 ${unit?.grade ?? "?"} · ${unit?.chapter ?? "?"} · ${unit?.section ?? unitId}` +
        `\n  문항 ${rows.length} · 등록 무리 ${fams.length}`,
    );
    let ghost = 0;
    let multi = 0;
    for (const f of fams) {
      const mine = byFamily.get(f.familyKey) ?? [];
      if (mine.length === 0) {
        ghost++;
        continue;
      }
      const prints = new Map<string, number>();
      for (const m of mine) {
        const p = stemFingerprint(m.content);
        prints.set(p, (prints.get(p) ?? 0) + 1);
      }
      if (prints.size > 1) multi++;
      const top = [...prints.entries()].sort((a, b) => b[1] - a[1]);
      const src = [...new Set(mine.map((m) => m.source))].join(",");
      console.log(
        `  ${f.familyCode}  문항 ${String(mine.length).padStart(3)} · 지문 ${prints.size} · ${src}`,
      );
      for (const [p, n] of top.slice(0, 2))
        console.log(`        ${String(n).padStart(3)}× ${p.slice(0, 96)}`);
      if (top.length > 2) console.log(`        … 외 ${top.length - 2}가지`);
    }
    console.log(
      `  ▸ 유령 무리(문항 0) ${ghost} · 지문이 둘 이상인 무리 ${multi}`,
    );
  }
  return 0;
}

main()
  .then(async (code) => {
    await db.$disconnect();
    process.exit(code);
  })
  .catch(async (err) => {
    console.error(String(err).slice(0, 600));
    await db.$disconnect();
    process.exit(1);
  });
