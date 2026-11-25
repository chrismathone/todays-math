/**
 * 중학 유형 인구조사 — **「무엇이 남았나」를 세는 자리.**
 *
 *   npx tsx scripts/middle/type-census.ts            # RPM 색인 대비 미등록 유형
 *   npx tsx scripts/middle/type-census.ts --gap      # + DB 얇은 단원 대비 엔진 공백
 *
 * 읽기 전용. 물결 계획을 세울 때마다 손으로 세지 말 것 —
 * 손 목록은 샌다(2026-08-18 교훈). `--gap` 은 `scripts/qa/load-coverage.ts` 가
 * 먼저 만들어 둔 보고서를 읽는다(없으면 그것부터 돌리라고 말한다).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { registeredTypes } from "../../src/lib/middle/generate";
import { nonCatalogEntries } from "./listing";

type CatType = { minor: string; number: string; title: string };
const CATALOG = path.resolve(
  process.cwd(),
  "scripts/rpm/rpm-type-catalog.json",
);
const COVERAGE = path.resolve(
  process.cwd(),
  "scripts/qa/reports/load-coverage.json",
);

function census(books: string[]): void {
  const cat = JSON.parse(readFileSync(CATALOG, "utf8")) as Record<
    string,
    { types: CatType[] }
  >;
  const done = new Set(
    registeredTypes().map((e) => `${e.rpmBook}|${e.rpmMinor}|${e.rpmType}`),
  );
  let grandAll = 0;
  let grandLeft = 0;
  for (const book of books) {
    const types = cat[book]?.types;
    if (!types) throw new Error(`색인에 없는 책: ${book}`);
    const byMinor = new Map<string, { all: number; left: string[] }>();
    for (const t of types) {
      const r = byMinor.get(t.minor) ?? { all: 0, left: [] };
      r.all += 1;
      if (!done.has(`${book}|${t.minor}|${t.number}`)) r.left.push(t.number);
      byMinor.set(t.minor, r);
    }
    const left = [...byMinor.values()].reduce((s, r) => s + r.left.length, 0);
    grandAll += types.length;
    grandLeft += left;
    console.log(`\n=== ${book} — 전체 ${types.length} · 남은 ${left} ===`);
    for (const [m, r] of byMinor) {
      const mark =
        r.left.length === 0 ? "✅" : r.left.length === r.all ? "⬜" : "🔸";
      const tail =
        r.left.length && r.left.length < r.all
          ? `  남은:${r.left.join(",")}`
          : "";
      console.log(`${mark} ${m}: ${r.all - r.left.length}/${r.all}${tail}`);
    }
  }
  console.log(
    `\n합계 — 전체 ${grandAll} · 등록 ${grandAll - grandLeft} · 남은 ${grandLeft}`,
  );
  const catalogKeys = new Set(
    Object.entries(cat).flatMap(([book, row]) =>
      row.types.map((t) => `${book}|${t.minor}|${t.number}`),
    ),
  );
  const additions = nonCatalogEntries(registeredTypes(), catalogKeys);
  console.log(`\nRPM 색인 밖 추가 등록 ${additions.length}개 (위 분모와 별도)`);
  for (const entry of additions) {
    console.log(`  ${entry.key}  ${entry.rpmTitle}`);
  }
}

function gap(grades: string[]): void {
  if (!existsSync(COVERAGE)) {
    console.log(
      "보고서가 없습니다 — 먼저: npx tsx scripts/qa/load-coverage.ts",
    );
    return;
  }
  const rep = JSON.parse(readFileSync(COVERAGE, "utf8")) as {
    단원별: { grade: string; section: string; 자격: number }[];
  };
  const bySection = new Map<string, number>();
  for (const e of registeredTypes()) {
    const k = `${e.grade}|${e.unitSection}`;
    bySection.set(k, (bySection.get(k) ?? 0) + 1);
  }
  for (const g of grades) {
    const thin = rep.단원별.filter((r) => r.grade === g && r.자격 < 8);
    console.log(
      `\n=== ${g} — DB 가 얇은 단원 ${thin.length} (자격 8 미만) ===`,
    );
    for (const r of thin) {
      const n = bySection.get(`${g}|${r.section}`) ?? 0;
      const mark = n === 0 ? "🔴" : "  ";
      console.log(
        `${mark} DB ${String(r.자격).padStart(3)} · 엔진유형 ${String(n).padStart(2)}   ${r.section}`,
      );
    }
    console.log("   🔴 = 엔진도 0 — 여기가 진짜 구멍이다");
  }
}

const wantGap = process.argv.includes("--gap");
census(["1-1", "1-2", "2-1", "2-2", "3-1", "3-2"]);
if (wantGap) gap(["중1", "중2", "중3"]);
