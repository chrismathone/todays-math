/**
 * RPM 유형 색인(`scripts/rpm/rpm-type-catalog.json`) ↔ 우리 `Unit` 을 맞대어,
 * **출제 문항이 모자란 중1~3 단원을 RPM 유형으로 덮을 수 있는가**를 센다.
 *
 *   npx tsx scripts/rpm/match-units.ts            # 보고서만 (읽기 전용)
 *
 * ## 무엇을 재는가
 *
 * 우리 단원은 `chapter`(중단원 격) + `section`(소단원)으로, RPM 은 `major`(대단원)
 * + `minor`(중단원) + 유형 제목으로 쪼갠다. 둘은 **깊이가 다르다** — RPM 의 중단원
 * 하나가 우리 소단원 여럿에 걸친다. 그래서 짝은 «중단원 ↔ chapter» 로 맞추고,
 * 유형 제목은 그 안에서 소단원에 **나눠 붙는 재료**로 센다.
 *
 * ⚠️ 이름이 안 맞는다고 「없다」가 아니다. 교육과정 이름은 교재마다 다르다
 *    (우리 `정비례와 반비례` ↔ RPM `정비례와 반비례` 는 같지만, 우리 `일차방정식의
 *    활용(거리, 속력, 시간)` 은 RPM 중단원 `일차방정식의 활용` 안의 **유형 하나**다).
 *    그래서 매칭 실패는 «후보 없음»으로 따로 세어 눈으로 보게 남긴다.
 */
import { readFileSync } from "node:fs";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CatalogType = {
  page: number;
  major: string;
  minor: string;
  number: string;
  title: string;
};
type Catalog = Record<
  string,
  { grade: string; file: string; types: CatalogType[] }
>;

const GRADE_OF_BOOK: Record<string, string> = {
  "1-1": "중1",
  "1-2": "중1",
  "2-1": "중2",
  "2-2": "중2",
  "3-1": "중3",
  "3-2": "중3",
};

/** 비교용 정규화 — 괄호 안 부연·공백·중점을 떼고 뼈대만 남긴다. */
function norm(s: string): string {
  return s
    .replace(/[（(][^)）]*[)）]/g, "")
    .replace(/[⑴⑵⑶⑷⑸①②③④⑤ⅠⅡⅢⅣ]/g, "")
    .replace(/[\s·,、~〜\-–—:：]/g, "")
    .trim();
}

function bigrams(s: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2));
  if (s.length === 1) out.add(s);
  return out;
}

function dice(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (A.size === 0 || B.size === 0) return a === b ? 1 : 0;
  let hit = 0;
  for (const g of A) if (B.has(g)) hit++;
  return (2 * hit) / (A.size + B.size);
}

async function main() {
  const catalog = JSON.parse(
    readFileSync("scripts/rpm/rpm-type-catalog.json", "utf8"),
  ) as Catalog;

  // RPM 중단원 목록 (학년별)
  const rpmMinors = new Map<string, Map<string, CatalogType[]>>();
  for (const [book, data] of Object.entries(catalog)) {
    const grade = GRADE_OF_BOOK[book];
    if (!grade) continue;
    if (!rpmMinors.has(grade)) rpmMinors.set(grade, new Map());
    const g = rpmMinors.get(grade)!;
    for (const t of data.types) {
      const key = `${t.major} > ${t.minor}`;
      if (!g.has(key)) g.set(key, []);
      g.get(key)!.push(t);
    }
  }

  const units = await prisma.unit.findMany({
    where: { grade: { in: ["중1", "중2", "중3"] } },
    select: {
      id: true,
      grade: true,
      chapter: true,
      section: true,
      orderIndex: true,
    },
    orderBy: [{ grade: "asc" }, { orderIndex: "asc" }],
  });

  const counts = await prisma.problem.groupBy({
    by: ["unitId"],
    where: { directUseAllowed: true },
    _count: { id: true },
  });
  const have = new Map(counts.map((c) => [c.unitId, c._count.id]));

  const lines: string[] = [];
  let matched = 0;
  let unmatched = 0;
  const unmatchedRows: string[] = [];

  lines.push("# RPM 유형 ↔ 우리 단원 매칭 (중1~중3)\n");

  for (const grade of ["중1", "중2", "중3"]) {
    const gUnits = units.filter((u) => u.grade === grade);
    const gMinors = rpmMinors.get(grade)!;
    lines.push(
      `\n## ${grade} — 우리 단원 ${gUnits.length}개 · RPM 중단원 ${gMinors.size}개\n`,
    );

    for (const u of gUnits) {
      const n = have.get(u.id) ?? 0;
      // 우리 chapter/section 을 RPM 중단원·유형제목 양쪽에 대 본다
      let best: { key: string; score: number; types: CatalogType[] } | null =
        null;
      for (const [key, types] of gMinors) {
        const minorName = key.split(" > ")[1] ?? key;
        const s = Math.max(
          dice(norm(u.chapter), norm(minorName)),
          dice(norm(u.section), norm(minorName)),
        );
        if (!best || s > best.score) best = { key, score: s, types };
      }
      // 소단원 이름에 가장 가까운 유형들
      const typeHits = best
        ? best.types
            .map((t) => ({ t, s: dice(norm(u.section), norm(t.title)) }))
            .sort((a, b) => b.s - a.s)
            .slice(0, 3)
        : [];

      const ok = best !== null && best.score >= 0.4;
      if (ok) matched++;
      else {
        unmatched++;
        unmatchedRows.push(
          `${grade} / ${u.chapter} / ${u.section} (보유 ${n})`,
        );
      }

      const flag = n === 0 ? "🔴" : n < 8 ? "🟠" : n < 25 ? "🟡" : "  ";
      lines.push(
        `${flag} **${u.section}** (${u.chapter}) — 보유 ${n}건 → RPM \`${best?.key ?? "없음"}\`` +
          ` (${(best?.score ?? 0).toFixed(2)}, 유형 ${best?.types.length ?? 0}개)`,
      );
      for (const h of typeHits) {
        lines.push(`    - ${h.t.number} ${h.t.title} <${h.s.toFixed(2)}>`);
      }
    }
  }

  lines.push(`\n\n## 요약\n`);
  lines.push(`- 중단원 매칭 성공: ${matched} / 실패: ${unmatched}`);
  if (unmatchedRows.length) {
    lines.push(`\n### 매칭 실패 — 눈으로 볼 것\n`);
    for (const r of unmatchedRows) lines.push(`- ${r}`);
  }

  const out = "C:/tmp/rpm-unit-match.md";
  const fs = await import("node:fs");
  fs.writeFileSync(out, lines.join("\n"), "utf8");
  console.log(`매칭 성공 ${matched} · 실패 ${unmatched} → ${out}`);
}

main().finally(() => prisma.$disconnect());
