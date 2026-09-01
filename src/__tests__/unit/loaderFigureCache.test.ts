/**
 * **적재기의 그림 렌더 배선** — ⑴ 제품 함수를 쓴다 ⑵ 같은 스펙을 두 번 안 그린다
 * ⑶ 떨어뜨린 치수를 세어 찍는다.
 *
 * ## 이 시험이 지키는 결함 (실측)
 *
 * ### ㉮ 렌더 길이 **두 벌**이었다 (2026-09-02)
 *
 * 적재기가 제 손으로 `spawnSync` 를 부르고 있었다 — **재시도도, 치수 떨어뜨림도,
 * 시간 제한도 없다.** 제품 함수 `renderFigureSpec` 은 `no room` 사유가 치수 이름을
 * 대면 그 치수를 빼고 다시 그린다. 그래서 **제품 지면에는 나오는 그림이 적재본에만
 * 없었다** — 실측 214행 · 서로 다른 스펙 54개에서 맨손 **54/54 실패**, 제품 함수
 * **51/54 성공**. 게다가 맨손 길은 MathJax 조판을 건너뛰어 적재본이 **조판 전 판**
 * 이었다(실측: 09-02 적재 그림 10,728장 중 조판된 것 **0장**).
 *
 * 「같은 규칙을 쓰는 자리가 둘이면 한 숫자를 두 곳이 쓰게 하라」(2026-08-18).
 *
 * ### ㉯ 같은 스펙을 두 번 그렸다 (2026-09-02)
 *
 * 한 변형이 **단답형·객관식 두 행**인데 그림 스펙은 같다. 실측(계획 9벌) 그림 행
 * **34,598개**가 서로 다른 스펙 **6,715개**뿐이다 — 중복 **80.6%**. 렌더는 스펙마다
 * 파이썬을 띄우므로(실측 **220ms/회**) 그 중복이 그대로 시간이 된다.
 *
 * ### ㉰ 뺀 치수를 **조용히** 두면 안 된다 (2026-08-30)
 *
 * 떨어진 치수의 값을 발문이 말하지 않으면 그 문항은 못 푸는 문항이 되는데,
 * 그림 자체는 **멀쩡해 보인다** — 지금(그림 없음)과 달리 티가 안 난다.
 * 실측: 되살아난 51장이 **전부** 치수를 하나 이상 떨어뜨렸다(100%).
 *
 * ⚠️ 이 캐시는 렌더러가 **결정적**일 때만 옳다. 같은 스펙을 두 번 그려 바이트가
 *    같은 것을 확인했다(표본 4/4). `render_spec.py` 에 무작위가 들어오면 이
 *    캐시가 **조용히 틀린 그림**을 붙인다 — 그때 여기부터 고쳐야 한다.
 *
 * ⚠️ 낱말이 아니라 **구조**를 문다. `bySpec` 이라는 이름만 세면 2026-08-18
 *    「LOOP 가 있나」와 같은 장식이 된다.
 *    🔴 그리고 **낱말은 주석에도 있다** — 첫 판에서 `render_spec.py` 를 낱말로
 *       세었더니 캐시 주석의 그 낱말에 걸려 **모든 변이에서 빨강**이 나왔다(도장).
 *       그래서 파이썬 배선은 **import 문과 인자 목록**으로 좁혀 묻는다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const LOADER = readFileSync(
  join(process.cwd(), "scripts/import/load-engine-problems.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("적재기의 그림 렌더 배선", () => {
  it("🔴 ㉠ 열쇠를 **스펙**으로 만들고 **실패도 담는다** — externalId 로 만들면 캐시가 아무것도 안 막고, 값이 non-null 이면 못 그리는 스펙을 행마다 다시 시도한다", () => {
    expect(LOADER).toContain("const key = JSON.stringify(r.figureSpec);");
    expect(LOADER).toMatch(/const bySpec = new Map<string, \w+ \| null>\(\);/);
  });

  it("🔴 ㉡ 캐시에 있으면 **렌더를 건너뛴다** — 부르고 나서 담으면 시간이 안 준다. 그리고 **await** 를 빼면 Promise 가 캐시에 들어간다", () => {
    // 역참조(\1)로 «같은 변수»를 요구한다 — 이름은 안 문다.
    expect(LOADER).toMatch(
      /let (\w+) = bySpec\.get\(key\);\s*\n\s*if \(\1 === undefined\) \{\s*\n\s*\1 = await renderFigure\(r\.figureSpec\);\s*\n\s*bySpec\.set\(key, \1\);\s*\n\s*\}/,
    );
  });

  it("🔴 ㉢ `renderFigure` 를 부르는 자리는 **한 곳**이어야 한다 — 두 곳이면 한쪽만 캐시를 탄다", () => {
    const calls = LOADER.match(/renderFigure\(/g) ?? [];
    // 선언 1 + 호출 1 = 2. 그보다 많으면 캐시를 안 타는 길이 생긴 것이다.
    // (`renderFigureSpec(` 는 «(» 가 바로 안 붙으므로 안 걸린다.)
    expect(calls).toHaveLength(2);
  });

  it("🔴 ㉣ 적재기는 **제 손으로 파이썬을 안 띄운다** — 제품 함수 한 곳만 쓴다", () => {
    expect(LOADER).not.toContain('from "node:child_process"');
    expect(LOADER).not.toContain('"figure", "render_spec.py"');
    expect(LOADER).toContain('from "../../src/lib/figure/renderFigureSpec"');
  });

  it("🔴 ㉤ **떨어뜨린 치수를 세어 찍는다** — 조용히 빠지면 「달았다」가 거짓말이 된다", () => {
    expect(LOADER).toContain(".dropped");
    expect(LOADER).toMatch(/droppedRows/);
    expect(LOADER).toMatch(/droppedDims/);
    expect(LOADER).toContain("치수를 뺀 그림");
  });

  it("㉥ 렌더 호출 수를 **찍는다** — 안 찍으면 캐시가 죽어도 아무도 모른다", () => {
    expect(LOADER).toContain("렌더 호출 ${bySpec.size}회");
  });
});
