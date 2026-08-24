import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

// D-29 폰트 적재 검증. next/font/local은 Next.js 컴파일러(webpack/turbopack)가
// 있어야 실제 className/variable을 계산하므로 Vitest(Vite) 환경에서 직접 호출하면
// "default is not a function"으로 실패한다(실측 확인). 따라서 소스 레벨로
// (1) fonts.ts가 next/font/local을 올바른 인자로 호출하는지,
// (2) layout.tsx가 그 variable 클래스를 <html>에 실제로 적용하는지,
// (3) globals.css가 그 CSS 변수를 참조하는지를 검증한다.
// 이 패턴은 src/__tests__/components/TestPrint.test.tsx의 CSS 소스 검증 관례를 따른다.

const readSrc = (relPath: string) =>
  readFileSync(path.resolve(process.cwd(), relPath), "utf8");

describe("폰트 로딩 (D-29 Pretendard 적재)", () => {
  it("폰트 파일이 public/fonts에 실제로 존재한다", () => {
    const fontPath = path.resolve(
      process.cwd(),
      "public/fonts/PretendardVariable.woff2",
    );
    expect(existsSync(fontPath)).toBe(true);
    // 가변 폰트 하나 — 최소 1MB는 넘어야 정상적으로 복사된 것.
    expect(statSync(fontPath).size).toBeGreaterThan(1_000_000);
  });

  it("src/app/fonts.ts가 next/font/local로 Pretendard 가변 폰트를 로드한다", () => {
    const src = readSrc("src/app/fonts.ts");
    expect(src).toMatch(/from\s+["']next\/font\/local["']/);
    expect(src).toMatch(/src:\s*["'].*PretendardVariable\.woff2["']/);
    expect(src).toMatch(/variable:\s*["']--font-pretendard["']/);
    expect(src).toMatch(/display:\s*["']swap["']/);
    // Windows 기본 서체 폴백이 남아 있어야 한다(요구사항).
    expect(src).toMatch(/["']Malgun Gothic["']/);
  });

  it("src/app/layout.tsx가 <html>에 폰트 variable 클래스를 적용한다", () => {
    const src = readSrc("src/app/layout.tsx");
    expect(src).toMatch(
      /import\s*{\s*pretendard\s*}\s*from\s*["']\.\/fonts["']/,
    );
    // <html ... className={... pretendard.variable ...}>
    const htmlTagMatch = src.match(/<html[^>]*className=\{([^}]*)\}/);
    expect(htmlTagMatch).not.toBeNull();
    expect(htmlTagMatch?.[1]).toMatch(/pretendard\.variable/);
  });

  it("src/app/globals.css의 body font-family가 --font-pretendard 변수를 우선 참조한다", () => {
    const css = readSrc("src/app/globals.css");
    const bodyBlockMatch = css.match(/body\s*\{[^}]*\}/);
    expect(bodyBlockMatch).not.toBeNull();
    const bodyBlock = bodyBlockMatch?.[0] ?? "";
    expect(bodyBlock).toMatch(/font-family:\s*var\(--font-pretendard\)/);
    // 폴백에 Windows 기본 서체가 남아 있어야 폰트 로딩 실패 시에도 안전하다.
    expect(bodyBlock).toMatch(/"Malgun Gothic"/);
  });
});
