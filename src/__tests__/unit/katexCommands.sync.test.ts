/**
 * 입구 후보정이 쓰는 KaTeX 명령 상수(`src/lib/math/katexCommands.generated.ts`)가
 * **설치된 KaTeX 와 같다.** KaTeX 를 올리면 여기서 운다 —
 * `npx tsx scripts/qa/gen-katex-commands.ts` 로 다시 만들 것.
 *
 * 손으로 쓴 명령 목록은 조용히 낡는다(140개 목록 밖 775개가 날 글자로 샜다 —
 * 2026-09-26 후보정 감사). 생성물도 낡을 수 있으니 원천과 견준다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  censusKatexCommands,
  renderKatexCommandsModule,
} from "../../../scripts/qa/katexCommandCensus";

describe("KaTeX 명령 상수", () => {
  it("설치된 KaTeX 에서 다시 뽑은 것과 글자 하나 다르지 않다", () => {
    const root = process.cwd();
    const expected = renderKatexCommandsModule(censusKatexCommands(root));
    const actual = readFileSync(
      path.join(root, "src/lib/math/katexCommands.generated.ts"),
      "utf8",
    ).replace(/\r\n/g, "\n");
    expect(actual).toBe(expected);
  }, 120_000);
});
