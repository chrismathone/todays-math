/**
 * 🔴 **HWPX 순환소수 — 지면이 넘기는 TeX 가 한글 수식 `dot` 이 되어야 한다** (후보정 조사 G, 2026-09-26).
 *
 * 렌더 전처리는 순환마디 점을 `\htmlClass{repeat-dot}{3}` 로 적는다(`textPreprocess.ts` — 중2 교과서
 * 점 표기를 CSS 로 그리려고). HWPX 내보내기는 미리보기의 KaTeX 원문(annotation)을 받아 한글 수식으로
 * 옮기는데(`scripts/hwpx/writer.py` → `vendor/hwpx/latex_to_hwpeq.py`), 옮기는 쪽이 `repeat-dot` 을
 * 몰라 `0.{repeat-dot}{3}` — **클래스 이름이 글자로** — 나갔다. 호(`geom-arc-wrap`)는 이미 옮기고 있었다.
 *
 * ⚠️ 한글(HWP COM)은 돌리지 않는다(CLAUDE.md 규칙 9 — 원장님 작업 중). 재는 것은 변환 문자열까지다.
 *    한글에서 여는 확인은 `/dev/print-check` 항목으로 남긴다.
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { preprocessMathText } from "@/lib/math/textPreprocess";

const R = String.raw;

/** writer 의 `hancom_equation` 이 내는 한글 수식 스크립트. */
function hancomScripts(latex: string[]): string[] {
  const program = [
    "import json,sys,io",
    "sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')",
    `sys.path.insert(0, ${JSON.stringify(join(process.cwd(), "vendor/hwpx"))})`,
    `sys.path.insert(0, ${JSON.stringify(join(process.cwd(), "scripts/hwpx"))})`,
    "from writer import hancom_equation",
    "items=json.load(io.TextIOWrapper(sys.stdin.buffer,encoding='utf-8'))",
    "print(json.dumps([hancom_equation({'latex':t,'fontSize':14,'x':0,'y':0,'w':10,'h':10})['script'].strip() for t in items], ensure_ascii=False))",
  ].join("\n");
  const run = spawnSync(process.env.PYTHON_BIN ?? "python", ["-c", program], {
    input: JSON.stringify(latex),
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(run.stderr || "python 이 안 돌았다");
  return JSON.parse(run.stdout) as string[];
}

/** 지면(KaTeX)이 받는 TeX — 전처리가 감싼 `$…$` 안쪽. */
const paperTex = (source: string): string => {
  const out = preprocessMathText(source);
  const m = /^\$([\s\S]*)\$$/.exec(out);
  if (!m) throw new Error(`수식 하나가 아니다: ${out}`);
  return m[1]!;
};

describe("[G] 순환소수 점 — 지면 TeX 와 원문 TeX 가 같은 한글 수식이 된다", () => {
  it.each([
    [R`$0.\dot{3}$`, "0. dot {3}"],
    [R`$0.\overline{3}$`, "0. dot {3}"],
    [R`$0.\dot{1}2\dot{3}$`, "0. dot {1}2 dot {3}"],
    [R`$1.2\dot{3}\dot{4}$`, "1.2 dot {3} dot {4}"],
  ])("%s → %s", (source, expected) => {
    const tex = paperTex(source);
    // 전제 — 지면 TeX 는 정말 클래스 표기다(안 그러면 이 시험은 아무것도 안 지킨다).
    expect(tex).toContain(R`\htmlClass{repeat-dot}`);
    const [script] = hancomScripts([tex]);
    expect(script).toBe(expected);
    expect(script).not.toContain("repeat-dot");
  });

  it("호(⌒)는 그대로 `arch` — 같은 자리의 옛 옮김을 깨지 않는다", () => {
    const [script] = hancomScripts([
      R`\displaystyle \htmlClass{geom-arc-wrap}{\mathrm{AB}}`,
    ]);
    expect(script).toBe("arch {rm AB}");
  });
});
