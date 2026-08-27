/**
 * **RPM 2학기 교재 x 우리 엔진 — 그림 1:1 대조 원장.**
 *
 *   npx tsx scripts/qa/rpm-figure-census.ts            # 원장을 다시 만든다(진행분 보존)
 *   npx tsx scripts/qa/rpm-figure-census.ts --next     # 다음에 볼 유형 하나
 *   npx tsx scripts/qa/rpm-figure-census.ts --done "<키>" "<한 줄 소견>"
 *
 * ## 왜 파일인가
 *
 * 이 일은 **한 번에 안 끝난다**(원장님 지시 2026-08-27 「한번에 모두 그리지말고
 * 하나씩 계속 그리면서 엔진을 업데이트해나가면서 개선시키면서 그려」).
 * 진행 상황이 스크롤백에만 있으면 창이 닫히는 순간 **어디까지 했는지가 사라진다**
 * (2026-08-21 에 실제로 겪었다 — 「셧다운이 지운 것은 일이 아니라 «어디까지 했나»였다」).
 * 그래서 **한 유형을 끝낼 때마다 파일 하나**에 적고, 그 파일을 커밋한다.
 *
 * ## 무엇이 «대조 가능»인가
 *
 * RPM 유형 목록(`scripts/rpm/rpm-type-catalog.json` — 쪽수를 안다)과 우리 등록 유형의
 * **키가 겹치고**, 우리가 그 유형에 **그림을 붙이는** 것. 그림이 없으면 1:1 로 견줄
 * 것이 없다(원본에 그림이 있어도 우리가 안 그리면 그건 다른 이야기다 — 「그리지
 * 않는다」는 판정으로 따로 적는다).
 *
 * ⚠️ **원본은 보기만 한다.** 본문·수치를 우리 자료로 옮기지 않는다(저작권).
 *    원장에 적는 것은 **우리 그림의 판정**이지 원본의 내용이 아니다.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";

type CatalogRow = {
  page: number;
  major: string;
  minor: string;
  number: string;
  title: string;
};
type Book = { grade: string; file: string; types: CatalogRow[] };

type Entry = {
  key: string;
  book: string;
  page: number;
  title: string;
  /** 아직 안 봤으면 없음. 본 회차의 한 줄 소견. */
  verdict?: string;
};

const CATALOG_PATH = path.join(
  process.cwd(),
  "scripts",
  "rpm",
  "rpm-type-catalog.json",
);
const LEDGER = path.join(
  process.cwd(),
  "docs",
  "planning",
  "tracks",
  "reports",
  "rpm-figure-census.json",
);
const BOOKS = ["1-2", "2-2", "3-2"];
const SEEDS = [20260828, 11, 777];

function build(): Entry[] {
  const catalog = JSON.parse(readFileSync(CATALOG_PATH, "utf8")) as Record<
    string,
    Book
  >;
  const keys = new Set(registeredTypes().map((e) => e.key));
  const out: Entry[] = [];
  for (const book of BOOKS) {
    for (const t of catalog[book]?.types ?? []) {
      const key = `${book}|${t.minor}|${t.number}`;
      if (!keys.has(key)) continue;
      let hasFigure = false;
      for (const seed of SEEDS) {
        for (const v of [0, 1]) {
          try {
            if (generateMiddleProblem(key, seed, v).figureSpec)
              hasFigure = true;
          } catch {
            /* 못 만드는 조합은 건너뛴다 — 그림 유무만 본다 */
          }
        }
      }
      if (!hasFigure) continue;
      out.push({ key, book, page: t.page, title: t.title });
    }
  }
  return out;
}

function load(): Entry[] {
  return existsSync(LEDGER)
    ? (JSON.parse(readFileSync(LEDGER, "utf8")) as Entry[])
    : [];
}

function save(rows: Entry[]): void {
  writeFileSync(LEDGER, `${JSON.stringify(rows, null, 1)}\n`, "utf8");
}

/**
 * 원장을 다시 만든다 — **판정은 절대 지우지 않는다.**
 * 새 유형이 생기면 뒤에 붙고, 사라진 유형은 판정이 있으면 남긴다(왜 봤는지가 기록이다).
 */
function refresh(): Entry[] {
  const old = new Map(load().map((r) => [r.key, r]));
  const fresh = build();
  const seen = new Set(fresh.map((r) => r.key));
  const rows = fresh.map((r) => ({ ...r, verdict: old.get(r.key)?.verdict }));
  for (const [key, row] of old) {
    if (!seen.has(key) && row.verdict) {
      rows.push({
        ...row,
        verdict: `${row.verdict} (유형이 목록에서 사라졌다)`,
      });
    }
  }
  return rows;
}

function main(): void {
  const args = process.argv.slice(2);

  if (args[0] === "--done") {
    const key = args[1];
    const note = args.slice(2).join(" ");
    if (!key || !note) {
      console.log('사용법: --done "<키>" "<한 줄 소견>"');
      process.exit(2);
    }
    const rows = load();
    const row = rows.find((r) => r.key === key);
    if (!row) {
      console.log(`원장에 없는 키다: ${key}`);
      process.exit(1);
    }
    row.verdict = note;
    save(rows);
    console.log(`기록: ${key} — ${note}`);
    return;
  }

  const rows = args[0] === "--next" ? load() : refresh();
  if (args[0] !== "--next") save(rows);

  const done = rows.filter((r) => r.verdict).length;
  console.log(
    `대조 대상 ${rows.length}유형 · 본 것 ${done} · 남은 것 ${rows.length - done}`,
  );
  for (const book of BOOKS) {
    const b = rows.filter((r) => r.book === book);
    console.log(`  ${book}: ${b.filter((r) => r.verdict).length}/${b.length}`);
  }

  const next = rows.find((r) => !r.verdict);
  if (!next) {
    console.log("\n✅ 전부 봤다.");
    return;
  }
  console.log(
    `\n다음: ${next.key}  (RPM ${next.book} p.${next.page} — ${next.title})\n` +
      `  원본:  python scripts/qa/rpm_page_png.py ${next.book} ${next.page} .tmp-orca/rpm.png --dpi 170\n` +
      `  우리:  npx tsx .tmp-orca/dump-svg.ts "${next.key}" 20260828 0 .tmp-orca/ours.svg\n` +
      `  판정:  node scripts/qa/probe-figure-label-collisions.mjs .tmp-orca/ours.svg`,
  );
}

if (/rpm-figure-census/.test(process.argv[1] ?? "")) main();
