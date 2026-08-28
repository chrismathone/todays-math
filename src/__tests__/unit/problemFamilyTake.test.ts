/**
 * **문항류 자리 잡기(`problem_family_take`)가 «구멍»을 견디는가.**
 *
 * ## 왜 생겼나 (2026-08-29)
 *
 * 다음 자리를 `COUNT(*) + 1` 로 정하고 있었다. 그 식은 **쓰는 자리가 1..N 으로
 * 빈틈없이 이어져 있다**고 가정한다. 무리가 하나라도 지워지면 구멍이 생기고,
 * 그때부터 그 단원은 **영원히 막힌다**:
 *
 *     자리 {5,6,7,8} · COUNT = 4  →  5 번을 쓰려 한다  →  이미 있다
 *     재시도해도 COUNT 는 4  →  **같은 5 번을 30 번 다시 시도**  →  던진다
 *
 * 재시도 고리가 「다른 트랜잭션이 먼저 가져갔다」만 상정해서, **자기 계산이
 * 틀린 경우에는 30 번을 똑같이 틀린다.**
 *
 * 실제로 났다 — `--revert` 가 **빈 무리만** 지우는데(그게 맞다) 옛 형식 적재본
 * 1,751행이 자리 5~8 을 붙들고 있어 1~4 만 비었다. **112 개 단원**이 한꺼번에
 * 막혔고, 12,762행을 넣던 적재가 6,438행에서 죽었다.
 *
 * ## 이 시험이 보는 것
 *
 * `CREATE OR REPLACE` 라 **가장 나중 마이그레이션이 살아 있는 정의**다. 그러니
 * 그 함수를 정의하는 마이그레이션 가운데 **마지막 것**을 보고, 옛 식으로 되돌아가지
 * 않았는지 본다.
 *
 * ⚠️ **검출기가 살아 있는지**를 옛 마이그레이션으로 확인한다 — 정규식이 틀리면
 *    옛 파일도 통과하고, 그러면 이 시험은 아무것도 안 지킨다.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const MIG_DIR = join(process.cwd(), "prisma", "migrations");

/** `problem_family_take` 를 정의하는 마이그레이션들 — 이름순(=시간순). */
function definitions(): { dir: string; sql: string }[] {
  return readdirSync(MIG_DIR)
    .filter((d) => !d.startsWith("."))
    .sort()
    .map((dir) => ({
      dir,
      sql: (() => {
        try {
          return readFileSync(
            join(MIG_DIR, dir, "migration.sql"),
            "utf8",
          ).replaceAll("\r", "");
        } catch {
          return "";
        }
      })(),
    }))
    .filter((m) =>
      /CREATE OR REPLACE FUNCTION "problem_family_take"/.test(m.sql),
    );
}

/** 옛 식 — 「센 수 + 1」을 그대로 자리로 쓴다. */
const COUNTS_AND_ADDS_ONE = /"problem_family_code"\(\s*v_n\s*\+\s*1\s*\)/;
/** 새 식 — 1..N+1 에서 **비어 있는 가장 작은 자리**를 고른다. */
const PICKS_SMALLEST_FREE = [
  /MIN\(\s*g\.n\s*\)/,
  /generate_series\(/,
  /NOT EXISTS\s*\(/,
];
/**
 * **«찼다»가 무리 행만 보면 안 된다.** 무리 행 없이 코드만 남은 자리가 실측
 * **448개** 있다 — `family_key` 를 옮기면(2026-08-27, 1,751행) 옛 무리 행이
 * 「빈 무리」로 보여 되돌리기가 치우는데, 그 코드를 단 문항은 살아 있기 때문이다.
 * 그 자리를 다시 내주면 `problem_code` 가 부딪혀 적재가 통째로 죽는다.
 */
const ALSO_LOOKS_AT_STAMPED_CODES = [
  /FROM "problem" p/,
  /substring\(\s*p\."problem_code"/,
];
/**
 * ⚠️ `NOT IN` 을 쓰면 안 된다. 옛 형식 코드(`J30103-4NSK`)는 정규식에 안 걸려
 *    NULL 이 되는데, 목록에 NULL 이 하나만 있어도 **전부 거짓**이 된다 —
 *    에러가 아니라 「빈자리가 없다」는 조용한 오답이다.
 */
const USES_NOT_IN = /\bNOT\s+IN\s*\(/i;

describe("[D-105] 문항류 자리 — 구멍을 메운다", () => {
  it("**검출기가 살아 있다** — 옛 마이그레이션은 옛 식으로 걸려야 한다", () => {
    const defs = definitions();
    expect(
      defs.length,
      "그 함수를 정의하는 마이그레이션이 없다",
    ).toBeGreaterThan(1);
    const first = defs[0]!;
    expect(
      COUNTS_AND_ADDS_ONE.test(first.sql),
      `${first.dir} 에 옛 식이 없다 — 정규식이 틀렸거나 파일이 바뀌었다.` +
        ` 이걸 못 잡으면 아래 검사는 아무것도 안 지킨다.`,
    ).toBe(true);
    // 반대쪽 — 옛 파일에는 새 식이 없어야 한다.
    expect(PICKS_SMALLEST_FREE.every((re) => re.test(first.sql))).toBe(false);
  });

  it("🔴 **살아 있는 정의가 «가장 작은 빈자리»를 고른다** — `COUNT(*)+1` 로 안 돌아간다", () => {
    const defs = definitions();
    const live = defs[defs.length - 1]!;
    for (const re of PICKS_SMALLEST_FREE)
      expect(
        re.test(live.sql),
        `${live.dir} — 살아 있는 정의에 ${re} 가 없다.` +
          ` 자리에 구멍이 있으면 그 단원이 통째로 막힌다(실측 112개 단원).`,
      ).toBe(true);
    expect(
      COUNTS_AND_ADDS_ONE.test(live.sql),
      `${live.dir} — 옛 식 «센 수 + 1» 로 되돌아갔다.`,
    ).toBe(false);
  });

  it("🔴 **«찼다»가 문항에 찍힌 코드도 센다** — 무리 행만 보면 448 자리에서 부딪힌다", () => {
    const live = definitions().at(-1)!;
    for (const re of ALSO_LOOKS_AT_STAMPED_CODES)
      expect(
        re.test(live.sql),
        `${live.dir} — ${re} 가 없다. 무리 행 없이 코드만 남은 자리를 다시 내주면` +
          ` \`problem_code\` 가 부딪혀 적재가 통째로 죽는다(2026-08-29 실제).`,
      ).toBe(true);
  });

  it("🔴 **`NOT IN` 을 안 쓴다** — 옛 형식 코드가 NULL 이 되어 목록을 통째로 죽인다", () => {
    const live = definitions().at(-1)!;
    expect(
      USES_NOT_IN.test(live.sql),
      `${live.dir} — \`NOT IN\` 이 있다. 목록에 NULL 이 하나만 있어도 전부 거짓이 되고,` +
        ` 그건 에러가 아니라 「빈자리가 없다」는 조용한 오답이다. \`NOT EXISTS\` 를 써라.`,
    ).toBe(false);
  });

  it("자리 번호 ↔ 코드 변환은 1 부터다 — 0 이나 음수를 자리로 쓰지 않는다", () => {
    // 새 식은 `generate_series(1, …)` 로 시작해야 한다. 0 에서 시작하면
    // `problem_family_code(0)` 이 던진다(「1 이상의 정수여야 한다」).
    const live = definitions().at(-1)!;
    expect(live.sql).toMatch(/generate_series\(\s*\n?\s*1\s*,/);
  });
});
