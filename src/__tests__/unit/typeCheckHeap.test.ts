/**
 * 타입 검사가 **캐시 없이도** 끝까지 가는가 — 힙 한도를 올려 부르는지 지킨다.
 *
 * ## 왜 있나
 *
 * 2026-10-06 에 main 을 761커밋 당겨 온 뒤 `npm run type-check` 가 약 3분 뒤
 * 「JavaScript heap out of memory」 로 죽었다. 타입 오류는 0건이었다 — Node 의
 * 기본 힙 한도(이 기계 4,144MB)를 **전체 검사**가 넘은 것이다(한도 7GB 로 재면
 * 5.3GB 사용 · 파일 5,937 · 타입 219만).
 *
 * 🔴 **증분 캐시가 이걸 가린다.** `tsconfig.json` 이 `incremental` 이라, 자주 미는
 *    체크아웃은 바뀐 파일만 검사해 21초에 초록이다. 캐시가 없는 **새 워크트리**와
 *    캐시가 통째로 무효가 되는 날(큰 병합 · 스키마가 바뀐 뒤의 `prisma generate`)에만
 *    죽는다. 그리고 죽은 실행은 캐시를 남기지 않아 다시 돌려도 또 죽는다.
 *    pre-push 가 이 명령을 쓰므로 그날은 **푸시가 막힌다.**
 *
 * ## ⚠️ 이 자가 못 보는 것
 *
 * - 한도 숫자가 «충분한가»는 못 본다. 프로그램이 더 자라 올린 한도까지 넘으면
 *   이 시험은 초록인 채 타입 검사가 다시 죽는다. 그때는 숫자를 올릴 게 아니라
 *   무엇이 자랐는지 잰다(`npx tsc --noEmit --extendedDiagnostics`).
 * - `npx tsc --noEmit` 을 손으로 치는 것은 못 막는다 — 그건 기본 한도로 돈다.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/** 2026-10-06 실측 5.3GB 에 여유를 둔 바닥 값. */
const MIN_HEAP_MB = 6144;

function typeCheckScript(): string {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
  ) as {
    scripts?: Record<string, string>;
  };
  return pkg.scripts?.["type-check"] ?? "";
}

describe("type-check 스크립트의 힙 한도", () => {
  it("힙 한도를 올려서 tsc 를 부른다", () => {
    const script = typeCheckScript();
    const heap = /--max-old-space-size=(\d+)/.exec(script);
    expect(
      heap,
      `type-check 가 힙 한도를 올리지 않는다: ${script}`,
    ).not.toBeNull();
    expect(Number(heap?.[1])).toBeGreaterThanOrEqual(MIN_HEAP_MB);
  });

  it("여전히 내보내지 않는 전체 타입 검사다", () => {
    const script = typeCheckScript();
    expect(script).toMatch(/typescript\/bin\/tsc\b/);
    expect(script).toMatch(/--noEmit\b/);
  });

  it("가리키는 tsc 가 설치돼 있다", () => {
    const bin =
      /(\S*typescript\/bin\/tsc)\b/.exec(typeCheckScript())?.[1] ?? "";
    expect(bin).not.toBe("");
    expect(fs.existsSync(path.join(ROOT, bin))).toBe(true);
  });

  it("pre-push 는 tsc 를 직접 부르지 않고 이 스크립트를 탄다", () => {
    const hook = fs.readFileSync(path.join(ROOT, ".husky", "pre-push"), "utf8");
    const commands = hook
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(
        (line) =>
          line !== "" && !line.startsWith("#") && !line.startsWith("echo "),
      );
    expect(
      commands.some((line) => /npm run( --silent)? type-check\b/.test(line)),
    ).toBe(true);
    expect(
      commands.filter((line) => /(^|\s)(npx\s+)?tsc(\s|$)/.test(line)),
    ).toEqual([]);
  });
});
