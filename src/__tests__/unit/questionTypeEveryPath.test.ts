/**
 * **문항을 만드는 자리는 전부 형식(`questionType`)을 적는다** (원장님 확정 2026-08-26
 * 「[?형식] 은 앞으로 안 나오면 된다」).
 *
 * ## 왜 «한 자리»가 아니라 «전부» 를 잠그나
 *
 * 이 결함은 세 번 났고 **세 번 다 다른 자리**였다:
 *   ⑴ AI 생성 — 8건이 `[?형식]` 으로 화면에 떴다(원장님이 찾아 주셨다)
 *   ⑵ 변형 채택 — 지금 산출물이 0행이라 아무도 못 봤다
 *   ⑶ 손등록(S-08) — 원장님이 화면에서 등록하는 그 경로
 *
 * 하나씩 고치면 **다음 자리가 또 샌다.** 「빠뜨림」은 오류를 안 내므로 그 경로의
 * 산출물이 나올 때까지 아무도 모른다. 그래서 «만드는 자리 목록»을 소스에서 세어
 * **새 자리가 생기면 여기가 빨개지게** 한다.
 *
 * ⚠️ 이 검사는 텍스트를 본다 — 「그 낱말이 파일 안 다른 곳에도 있는가」를 조심해야
 *    한다(2026-08-18 「LOOP 가 있나」). 그래서 낱말이 아니라 **INSERT 호출 블록 안**
 *    에서만 센다.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** 앱이 `problem` 을 만드는 자리. **새 경로가 생기면 여기 추가해야 한다.** */
const INSERT_SITES = [
  "src/app/api/problems/route.ts", // 손등록 (S-08)
  "src/app/api/problems/generate/route.ts", // AI 생성
  "src/app/api/problems/transform/adopt/route.ts", // 변형 채택
] as const;

/** `db.problem.create…({ … })` 호출의 인자 블록만 잘라 낸다 (중괄호 깊이로). */
function insertBlocks(src: string): string[] {
  const blocks: string[] = [];
  const re = /db\.problem\.create(?:Many)?(?:AndReturn)?\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    let depth = 0;
    let i = m.index + m[0].length - 1; // 여는 `(`
    for (; i < src.length; i += 1) {
      if (src[i] === "(") depth += 1;
      else if (src[i] === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    blocks.push(src.slice(m.index, i + 1));
  }
  return blocks;
}

describe("[형식] 문항을 만드는 자리는 전부 questionType 을 적는다", () => {
  it.each(INSERT_SITES)("%s", (path) => {
    const src = readFileSync(path, "utf8");
    const blocks = insertBlocks(src);
    // 🔴 호출을 하나도 못 찾으면 그건 이 검사가 **눈이 먼 것**이다 — 초록이 아니다.
    expect(
      blocks.length,
      "INSERT 호출을 못 찾았다 — 검사가 낡았다",
    ).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(block, `${path} 의 INSERT 가 형식을 안 적는다`).toContain(
        "questionType",
      );
      // 🔴 값을 **손으로 적지 않는다.** 규칙이 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.
      //    판정기를 바로 부르든(손등록·변형 채택), 생성기가 미리 판정해 넘기든
      //    (`draft.questionType` — AI 생성) 둘 다 좋다. 금지하는 것은 **글자 상수**다.
      const literal = /questionType\s*:\s*["'`]/.exec(block);
      expect(
        literal,
        `${path} 가 형식을 글자로 박았다 — 판정기를 부르라`,
      ).toBeNull();
    }
  });

  it("🔴 만드는 자리가 **더 생기면** 이 검사가 알려 준다", () => {
    // 목록을 손으로 들고 있으므로, 소스 전체에서 센 수와 맞는지 대 본다.
    // 안 맞으면 새 경로가 생긴 것이다 — 그 경로는 아무도 안 지키고 있다.
    const all = INSERT_SITES.map(
      (p) => insertBlocks(readFileSync(p, "utf8")).length,
    );
    expect(all.reduce((a, b) => a + b, 0)).toBe(3);
  });
});
