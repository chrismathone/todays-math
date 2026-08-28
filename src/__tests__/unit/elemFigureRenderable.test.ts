/**
 * **엔진이 실어 보내는 그림 스펙을 제품이 실제로 그릴 수 있는가.**
 *
 * ## 왜 생겼나 (2026-08-28)
 *
 * 초4 2-4-1 여섯 문형이 `fig("lineRelation", { relation: "perpendicular" })` 를
 * 실어 보내는데, 엔진은 그 값을 **안 받는다**(`모르는 관계입니다: perpendicular —
 * 지금은 parallel 뿐입니다`). 그래서 33문항이 **전부 그림 없이** 적재됐고, 발문은
 * 「$5$번 그림처럼 …」이라 **있지도 않은 그림**을 가리키고 있었다.
 *
 * ## 🔴 왜 아무 자도 못 봤나 — 렌더가 축에 없었다
 *
 * - `probe-elem-figure-demand.ts` 는 스스로 「**이 도구는 그림을 그리지 않는다**」고
 *   적어 둔다. 스펙이 붙었는지와 `kind` 만 본다.
 * - 값 검산은 답만 본다. 이 문항들은 **답이 맞다.**
 * - 「발문이 없는 그림을 가리키나」(`elemFigureReference.test.ts`)도 **못 잡는다** —
 *   그 여섯은 스펙을 **붙였기** 때문이다. 실제로 그 자를 고치기 전 코드에 대 봤더니
 *   **초록이었다.** 그래서 이 파일이 따로 있다.
 *
 * 결함이 렌더에서만 나타나면, 렌더를 안 하는 자는 그 부류를 **구조적으로 못 본다.**
 *
 * ## 어떻게 싸게 하나 — 지문으로 접는다
 *
 * 전 학년·전 갈래를 씨앗 네 개로 훑으면 3,680문항이 나오는데, 그림 스펙을 **좌표를
 * 뺀 지문**(kind + 갈래를 가르는 문자열 값)으로 접으면 **74종**이다. 종마다 하나씩만
 * 그리면 관문에서 감당된다.
 *
 * ⚠️ 지문에서 **숫자는 «수» 로 접는다** — `top=124` 는 갈래가 아니라 값이다.
 *    접지 않으면 지문이 문항 수만큼 늘어나 관문이 못 견딘다.
 * ⚠️ 그래도 이 자는 **한 대표만** 본다. 같은 지문 안에서 어떤 값에서만 실패하는
 *    부류(예: 원 둘레에 치수가 안 들어가는 특정 크기)는 못 잡는다 — 중등 `J30503`
 *    8건이 그 부류다. 「74종 초록」이 「전부 그려진다」는 뜻이 아니다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryForm,
  generateElementaryProblem,
  listedForms,
  supportedTiers,
} from "@/lib/elementary/generate";
import { renderFigureSpec } from "@/lib/figure/renderFigureSpec";

/** 좌표를 뺀 지문 — kind + 갈래를 가르는 문자열·불리언 값. 숫자는 접는다. */
function signature(spec: Record<string, unknown>): string {
  const parts: string[] = [];
  const walk = (o: unknown, path: string, depth: number): void => {
    if (depth > 2 || o === null || typeof o !== "object") return;
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (typeof v === "string")
        parts.push(`${path}${k}=${/^[-+]?[\d.,\s]+$/.test(v) ? "<수>" : v}`);
      else if (typeof v === "boolean") parts.push(`${path}${k}=${String(v)}`);
      else if (v && typeof v === "object" && !Array.isArray(v))
        walk(v, `${path}${k}.`, depth + 1);
    }
  };
  walk(spec, "", 0);
  return `${String(spec.kind ?? "?")}|${[...new Set(parts)].sort().join(",")}`;
}

function collect(): Map<
  string,
  { where: string; spec: Record<string, unknown> }
> {
  const out = new Map<
    string,
    { where: string; spec: Record<string, unknown> }
  >();
  const add = (where: string, spec: unknown): void => {
    if (!spec || typeof spec !== "object") return;
    const s = spec as Record<string, unknown>;
    const sig = signature(s);
    if (!out.has(sig)) out.set(sig, { where, spec: s });
  };
  for (const unit of elementaryUnits()) {
    const tiers = supportedTiers(unit);
    for (const seed of [20260827, 20261836, 7, 12345]) {
      // ㉠ 표준·갈래 문항
      for (const tier of tiers) {
        try {
          add(
            `${unit.grade} ${unit.section} [${tier}]`,
            generateElementaryProblem(unit, seed, tier).figureSpec,
          );
        } catch {
          /* 생성 실패는 이 자의 축이 아니다 */
        }
      }
      // ㉡ 🔴 **문형** — 적재기가 부르는 것이 이쪽이다(`buildElemRows`).
      //    처음엔 ㉠ 만 훑었는데, 실제로 못 그리던 초4 2-4-1 여섯은 **전부 문형**이라
      //    고치기 전 코드에 대도 **초록**이었다. 모집단이 틀리면 자는 도장이 된다.
      for (const form of listedForms(unit)) {
        try {
          add(
            `${unit.grade} ${unit.section} 문형 ${form.id}`,
            generateElementaryForm(unit, seed, form.id).figureSpec,
          );
        } catch {
          /* 위와 같다 */
        }
      }
    }
  }
  return out;
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

describe("[엔진 문항] 실어 보내는 그림 스펙은 그려진다", () => {
  it("🔴 **모든 스펙 지문이 실제로 렌더된다** — 못 그리면 그 문항은 그림 없이 나간다", async () => {
    const sigs = collect();
    // 🔴 분모를 먼저 못 박는다 — 지문이 0이면 이 자는 아무것도 안 지킨다.
    expect(sigs.size).toBeGreaterThan(40);

    const entries = [...sigs.entries()];
    const results = await mapLimit(
      entries,
      4,
      async ([sig, { where, spec }]) => {
        const r = await renderFigureSpec(spec as never);
        return r.ok
          ? null
          : `${where}  «${sig.slice(0, 80)}»\n      ${r.error}`;
      },
    );
    const failed = results.filter((r): r is string => r !== null);

    expect(
      failed,
      failed.length
        ? `\n제품이 못 그리는 스펙 ${failed.length}종 (지문 ${sigs.size}종 중):\n` +
            failed.map((f) => `   · ${f}`).join("\n") +
            `\n\n그리도록 엔진을 고치거나, 생성기가 그 스펙을 **그만 보내야** 한다.` +
            `\n스펙만 빼면 발문이 «없는 그림»을 가리키게 되므로 발문도 같이 봐야 한다.`
        : undefined,
    ).toEqual([]);
  }, 120_000);
});
