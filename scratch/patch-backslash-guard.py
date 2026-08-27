"""midTypesC.test.ts 에 «역슬래시가 한 겹 사라진 LaTeX» 가드를 붙인다 (일회용)."""

from pathlib import Path

BLOCK = r'''
describe("중등 유형 갈래 C — 지면에 날 글자가 안 나간다", () => {
  /**
   * **역슬래시가 한 겹 사라진 LaTeX** 를 막는다.
   *
   * TS 템플릿 리터럴에서 `\d` 는 «모르는 이스케이프»라 자바스크립트가 역슬래시를
   * 그냥 버린다 — `\dfrac{1}{2}` 가 `dfrac{1}{2}` 로 지면에 나간다. `\t` 는 더
   * 나쁘다: **탭 문자**가 되어 `\times` 가 «탭 + imes» 가 된다.
   *
   * 2026-08-27 에 실제로 났다. 셸 heredoc 을 거치며 `\\` 가 `\` 로 줄었고,
   * **tsc·vitest·KaTeX·값 검산이 전부 초록**이었다 — 값은 맞고 글자만 틀리기
   * 때문이다. 지면 냄새 판정기(`probe-middle-page-smells`)도 이 부류는 안 센다.
   *
   * 열쇠는 **손 목록이 아니다** — 「역슬래시 하나 + 영문 두 글자 이상」이라는
   * 모양으로 센다. 목록을 손으로 적으면 목록에 없는 명령은 구조적으로 0이 된다.
   * 주석 줄은 뺀다: 이 저장소의 주석은 LaTeX 를 한 겹으로 적어 설명하고, 그게 옳다.
   */
  const MINE = [
    "m2Func",
    "m2Center",
    "m2IneqApply",
    "m1Geo1",
    "m1Geo2",
    "m1Calc",
    "m2Counting",
    "m3Func",
  ];

  /** 자바스크립트가 실제로 아는 이스케이프 — 이건 우리가 쓴 것이 맞다. */
  const KNOWN_JS = new Set(["n"]);

  function lonelyBackslashes(src: string): string[] {
    const out: string[] = [];
    for (const rawLine of src.split("\n")) {
      const line = rawLine.trimStart();
      if (line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) {
        continue;
      }
      const code =
        rawLine.includes("//") && !rawLine.includes("://")
          ? rawLine.slice(0, rawLine.indexOf("//"))
          : rawLine;
      for (const m of code.matchAll(/(?<!\\)\\([A-Za-z]{2,})/g)) {
        if (!KNOWN_JS.has(m[1]!)) out.push(m[0]!);
      }
    }
    return out;
  }

  it("눈금 — 이 검사가 «아니오» 를 낼 수 있다", () => {
    // 양성: 한 겹짜리는 잡는다.
    expect(lonelyBackslashes('const s = `$\\dfrac{1}{2}$`;')).toEqual(["\\dfrac"]);
    // 음성: 두 겹짜리는 안 잡는다.
    expect(lonelyBackslashes('const s = `$\\\\dfrac{1}{2}$`;')).toEqual([]);
    // 음성: 주석은 한 겹이 옳다.
    expect(lonelyBackslashes(' * $\\dfrac{4}{2}$ 로 끝나면')).toEqual([]);
    // 음성: 줄바꿈은 우리가 쓴 것이 맞다.
    expect(lonelyBackslashes("const s = `가\\n나`;")).toEqual([]);
  });

  it.each(MINE)("%s.ts 의 문자열에 한 겹짜리 LaTeX 가 없다", (name) => {
    const src = readFileSync(
      path.resolve(process.cwd(), `src/lib/middle/${name}.ts`),
      "utf8",
    );
    const hits = lonelyBackslashes(src);
    expect(
      hits.slice(0, 8),
      `${name}.ts 에 역슬래시가 한 겹인 LaTeX ${hits.length}건 — 지면에 날 글자가 나간다`,
    ).toEqual([]);
  });
});
'''

path = Path('src/__tests__/unit/midTypesC.test.ts')
src = path.read_text('utf-8')

# node:fs / path import 를 맨 위에 더한다
old_head = 'import { describe, expect, it } from "vitest";'
assert src.count(old_head) == 1
src = src.replace(
    old_head,
    'import { readFileSync } from "node:fs";\nimport path from "node:path";\n\n' + old_head,
)

path.write_text(src.rstrip('\n') + '\n' + BLOCK, encoding='utf-8', newline='')
print('ok')
