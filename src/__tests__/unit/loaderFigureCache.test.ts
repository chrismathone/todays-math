/**
 * **같은 그림 스펙을 두 번 그리지 않는다** (2026-09-02).
 *
 * ## 이 시험이 지키는 결함 (실측)
 *
 * 적재기는 한 변형을 **단답형·객관식 두 행**으로 넣는데 그림 스펙은 같다.
 * 그런데 렌더 고리가 **행마다** 돌아서 같은 그림을 두 번 그렸다. 실측(중3 12벌)
 * 그림이 붙는 행 1,776개가 서로 다른 스펙 **745개**뿐이었다 — 중복 58.1%.
 *
 * 이것이 그냥 낭비가 아니라 **막는 것**이 되는 이유는 `renderFigure` 가 문항마다
 * 파이썬 프로세스를 띄우기 때문이다(실측 319ms/회). 12벌 전량이면 그림 행이
 * 약 13,000개라 **69분**이고, 그동안 INSERT 는 한 행도 시작하지 않는다.
 *
 * ⚠️ 이 캐시는 렌더러가 **결정적**일 때만 옳다. 같은 스펙을 두 번 그려 바이트가
 *    같은 것을 확인했다(표본 4/4). `render_spec.py` 에 무작위가 들어오면 이
 *    캐시가 **조용히 틀린 그림**을 붙인다 — 그때 여기부터 고쳐야 한다.
 *
 * ⚠️ 낱말이 아니라 **구조**를 문다. `bySpec` 이라는 이름만 세면 2026-08-18
 *    「LOOP 가 있나」와 같은 장식이 된다 — 캐시가 실제로 ⑴ 스펙으로 열쇠를 만들고
 *    ⑵ 있으면 렌더를 **건너뛰는지**를 본다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const LOADER = readFileSync(
  join(process.cwd(), "scripts/import/load-engine-problems.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("적재기의 그림 렌더 캐시 (배선)", () => {
  it("🔴 ㉠ 열쇠를 **스펙**으로 만든다 — externalId 로 만들면 캐시가 아무것도 안 막는다", () => {
    expect(LOADER).toContain("const key = JSON.stringify(r.figureSpec);");
    expect(LOADER).toContain(
      "const bySpec = new Map<string, string | null>();",
    );
  });

  it("🔴 ㉡ 캐시에 있으면 **렌더를 건너뛴다** — 부르고 나서 담으면 시간이 안 준다", () => {
    // `svg === undefined` 일 때만 renderFigure 를 부른다는 구조.
    expect(LOADER).toMatch(
      /let svg = bySpec\.get\(key\);\s*\n\s*if \(svg === undefined\) \{\s*\n\s*svg = renderFigure\(r\.figureSpec\);\s*\n\s*bySpec\.set\(key, svg\);\s*\n\s*\}/,
    );
  });

  it("🔴 ㉢ `renderFigure` 를 부르는 자리는 **한 곳**이어야 한다 — 두 곳이면 한쪽만 캐시를 탄다", () => {
    const calls = LOADER.match(/renderFigure\(/g) ?? [];
    // 선언 1 + 호출 1 = 2. 그보다 많으면 캐시를 안 타는 길이 생긴 것이다.
    expect(calls).toHaveLength(2);
  });

  it("㉣ **실패도 캐시한다** — 못 그리는 스펙을 행마다 다시 시도하면 가장 느린 자리가 가장 자주 돈다", () => {
    // 값 타입이 `string | null` 이라 실패(null)도 담긴다. `string` 이면 실패는 매번 다시 돈다.
    expect(LOADER).not.toContain("const bySpec = new Map<string, string>();");
  });

  it("㉤ 렌더 호출 수를 **찍는다** — 안 찍으면 캐시가 죽어도 아무도 모른다", () => {
    expect(LOADER).toContain("렌더 호출 ${bySpec.size}회");
  });
});
