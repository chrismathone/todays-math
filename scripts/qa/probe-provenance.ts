/**
 * **출처 라벨 전수 조사** — 화면이 쓰는 그 판정기를 공유 DB 전량에 대 본다.
 *
 * ```
 *   npx tsx scripts/qa/probe-provenance.ts            # 갈래별 건수 + 교차 검증
 *   npx tsx scripts/qa/probe-provenance.ts --list     # 어긋난 행을 목록으로
 * ```
 *
 * ## 무엇을 재나 — 판정의 «참»은 **바깥**에서 온다
 *
 * 이 조사는 판정기가 낸 답을 판정기로 다시 확인하지 않는다. 대조군이 둘 있고 **둘 다
 * 우리가 안 만든 값**이다:
 *
 *   ㉠ **`figure_source`** — 적재기가 그림마다 적어 둔 기록(`engine`/`source`/없음).
 *      우리는 `figure_svg`·`figure_urls` 를 보고 판정하는데, 그 답이 이 기록과 어긋나면
 *      둘 중 하나가 틀린 것이다. 실측 2026-08-25 어긋남 **0건**.
 *   ㉡ **브리프가 물려준 대리 규칙**(문항 코드 모양) — 오늘은 우리 판정과 어긋남 0건이다.
 *      갈리기 시작하면 그것 자체가 새 정보다(손 등록이 들어왔다는 뜻).
 *
 * ## 무엇에 «실패»하나 — 늘 우는 가드는 꺼진다
 *
 * 건수가 기준선(`provenanceCensus.ts`)과 다르다고 실패하지 **않는다**. 문항이 늘면 당연히
 * 달라지고, 그때마다 빨개지면 다음 사람이 이 검사를 끄기 때문이다(CLAUDE.md 2026-08-20).
 * 실패는 **구조가 깨졌을 때**뿐이다:
 *
 *   ⑴ 갈래 합이 전체와 다르다        → 어느 갈래를 못 세고 있다
 *   ⑵ `family_key` 접두사가 아는 것 밖 → 엔진이 새 표지를 쓰기 시작했다
 *   ⑶ 그림 경로 뿌리가 아는 것 밖      → 그림이 새 자리에 들어왔다
 *   ⑷ `figure_source` 기록과 어긋난다  → 판정과 기록 중 하나가 틀렸다
 *
 * ⚠️ 미분류 건수는 **0이 되기를 바라는 값이 아니다.** 0이면 「깨끗」인지 「못 셈」인지
 *    안 갈린다. 그래서 그 수를 항상 찍고, 0이면 오히려 **경고**한다.
 */
import { PrismaClient } from "@prisma/client";

import {
  classifyFigure,
  classifyOrigin,
  FIGURE_ORIGINS,
  PROBLEM_ORIGINS,
  type ProvenanceInput,
} from "../../src/lib/problem/provenance";

import { isDirectScript } from "../import/isDirectScript";
import {
  LEGACY_CODE_PROXY,
  PROVENANCE_CENSUS_20260825 as BASE,
} from "./provenanceCensus";

/** 판정에 쓰는 컬럼 + **대조군 둘**. `figure_svg` 는 통째로 읽으면 수백 MB 라 유무만 읽는다. */
type Row = ProvenanceInput & {
  problemCode: string;
  /** 적재기가 적어 둔 그림 출처 — 우리 판정의 **독립 대조군**이다. */
  figureSource: string | null;
};

const KNOWN_FAMILY_PREFIX = ["elem:", "mid:", "solo:"];
const KNOWN_FIGURE_ROOT = ["/figures/", "/figures-svg/"];

export async function loadRows(prisma: PrismaClient): Promise<Row[]> {
  return prisma.$queryRaw<Row[]>`
    SELECT "source"::text                                    AS "source",
           "family_key"                                      AS "familyKey",
           "origin_problem_id"::text                         AS "originProblemId",
           "figure_urls"                                     AS "figureUrls",
           CASE WHEN "figure_svg" IS NOT NULL AND "figure_svg" <> ''
                THEN '<svg/>' ELSE NULL END                  AS "figureSvg",
           "problem_code"                                    AS "problemCode",
           "figure_source"                                   AS "figureSource"
      FROM "problem"
  `;
}

/** 대리 규칙 재현 — 「지금 규칙과 옛 규칙이 갈리는가」를 재려고 둔다. 판정에 안 쓴다. */
function legacyProxyOrigin(row: Row): string {
  if (row.source !== "manual" || !LEGACY_CODE_PROXY.test(row.problemCode)) {
    return "unknown";
  }
  if (row.problemCode.startsWith("E")) return "elem_engine";
  if (row.problemCode.startsWith("J")) return "middle_engine";
  return "unknown";
}

export interface ProbeResult {
  total: number;
  origin: Record<string, number>;
  figure: Record<string, number>;
  /** 구조가 깨진 자리 — 하나라도 있으면 0이 아닌 코드로 끝난다. */
  breakages: { kind: string; detail: string; codes: string[] }[];
  /** 갈렸지만 «깨진 것»은 아닌 자리 — 정보로만 찍는다. */
  divergence: { kind: string; detail: string; codes: string[] }[];
}

export function probe(rows: readonly Row[]): ProbeResult {
  const origin = Object.fromEntries(PROBLEM_ORIGINS.map((k) => [k, 0]));
  const figure = Object.fromEntries(
    [...FIGURE_ORIGINS, "none"].map((k) => [k, 0]),
  );
  const unknownFamily: string[] = [];
  const unknownRoot: string[] = [];
  const figureMismatch: string[] = [];
  const proxyMismatch: string[] = [];

  for (const row of rows) {
    origin[classifyOrigin(row)]! += 1;
    const fig = classifyFigure(row);
    figure[fig ?? "none"]! += 1;

    // ⑵ 엔진이 새 표지를 쓰기 시작했나
    if (
      row.familyKey !== null &&
      !KNOWN_FAMILY_PREFIX.some((p) => row.familyKey!.startsWith(p))
    ) {
      unknownFamily.push(row.problemCode);
    }
    // ⑶ 그림이 새 자리에 들어왔나
    for (const url of row.figureUrls) {
      if (!KNOWN_FIGURE_ROOT.some((p) => url.startsWith(p))) {
        unknownRoot.push(`${row.problemCode} ${url}`);
      }
    }
    // ⑷ 적재기의 기록과 우리 판정이 어긋나나 (대조군 ㉠)
    const expectedRecord =
      fig === "figure_engine"
        ? "engine"
        : fig === "svg_engine" || fig === "scan"
          ? "source"
          : fig === null
            ? null
            : "(모름)";
    if (expectedRecord !== "(모름)" && row.figureSource !== expectedRecord) {
      figureMismatch.push(
        `${row.problemCode} 판정=${fig ?? "없음"} 기록=${row.figureSource ?? "null"}`,
      );
    }
    // 대리 규칙과 갈리나 (대조군 ㉡) — 깨진 것이 아니라 «새 정보»다
    const proxied = legacyProxyOrigin(row);
    const mine = classifyOrigin(row);
    if (proxied !== "unknown" && proxied !== mine) {
      proxyMismatch.push(`${row.problemCode} 대리=${proxied} 기록=${mine}`);
    }
  }

  const breakages: ProbeResult["breakages"] = [];
  const sumOrigin = Object.values(origin).reduce((a, b) => a + b, 0);
  const sumFigure = Object.values(figure).reduce((a, b) => a + b, 0);
  if (sumOrigin !== rows.length) {
    breakages.push({
      kind: "분모",
      detail: `문항 출처 합 ${sumOrigin} ≠ 전체 ${rows.length}`,
      codes: [],
    });
  }
  if (sumFigure !== rows.length) {
    breakages.push({
      kind: "분모",
      detail: `그림 출처 합 ${sumFigure} ≠ 전체 ${rows.length}`,
      codes: [],
    });
  }
  if (unknownFamily.length) {
    breakages.push({
      kind: "family_key",
      detail: `아는 표지(${KNOWN_FAMILY_PREFIX.join(" ")}) 밖 ${unknownFamily.length}건`,
      codes: unknownFamily,
    });
  }
  if (unknownRoot.length) {
    breakages.push({
      kind: "그림 뿌리",
      detail: `아는 뿌리(${KNOWN_FIGURE_ROOT.join(" ")}) 밖 ${unknownRoot.length}건`,
      codes: unknownRoot,
    });
  }
  if (figureMismatch.length) {
    breakages.push({
      kind: "figure_source 대조",
      detail: `적재 기록과 우리 판정이 어긋난 ${figureMismatch.length}건`,
      codes: figureMismatch,
    });
  }

  const divergence: ProbeResult["divergence"] = [];
  if (proxyMismatch.length) {
    divergence.push({
      kind: "대리 규칙",
      detail: `코드 모양 규칙과 갈린 ${proxyMismatch.length}건 (손 등록이 들어왔다는 뜻일 수 있다)`,
      codes: proxyMismatch,
    });
  }
  return { total: rows.length, origin, figure, breakages, divergence };
}

function line(label: string, now: number, base: number): string {
  const delta = now - base;
  const mark = delta === 0 ? "" : ` (${delta > 0 ? "+" : ""}${delta})`;
  return `  ${label.padEnd(16)} ${String(now).padStart(7)}   기준선 ${String(base).padStart(7)}${mark}`;
}

async function main() {
  const list = process.argv.includes("--list");
  const prisma = new PrismaClient();
  try {
    const rows = await loadRows(prisma);
    const r = probe(rows);

    console.log(
      `\n전체 ${r.total}건 (기준선 ${BASE.measuredAt}: ${BASE.total})\n`,
    );
    console.log("문항 출처");
    for (const k of PROBLEM_ORIGINS) {
      console.log(
        line(k, r.origin[k]!, BASE.origin[k as keyof typeof BASE.origin]),
      );
    }
    console.log("\n그림 출처");
    for (const k of [...FIGURE_ORIGINS, "none"]) {
      console.log(
        line(k, r.figure[k]!, BASE.figure[k as keyof typeof BASE.figure]),
      );
    }

    // 미분류가 0이면 「깨끗」이 아니라 「못 셈」일 수 있다 — 조용히 넘기지 않는다.
    if (r.origin.unknown === 0) {
      console.log(
        "\n⚠️ 문항 출처 미분류가 0이다. 정말 전부 분류된 것인지, 열쇠가 눈먼 것인지 사람이 봐야 한다.",
      );
    }

    for (const d of r.divergence) {
      console.log(`\nℹ️  ${d.kind}: ${d.detail}`);
      if (list) for (const c of d.codes.slice(0, 40)) console.log(`     ${c}`);
    }

    if (r.breakages.length === 0) {
      console.log(
        "\n🟢 구조 검사 통과 — 분모·표지·뿌리·figure_source 대조 전부 깨끗.",
      );
      return;
    }
    for (const b of r.breakages) {
      console.log(`\n🔴 ${b.kind}: ${b.detail}`);
      for (const c of b.codes.slice(0, list ? 200 : 10))
        console.log(`     ${c}`);
      if (!list && b.codes.length > 10) {
        console.log(`     … --list 로 전부 본다 (${b.codes.length}건)`);
      }
    }
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (isDirectScript(import.meta.url)) {
  void main();
}
