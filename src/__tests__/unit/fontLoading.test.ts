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
    /*
      ⚠️ **한 이름만 들여온다고 못 박지 않는다.** 예전 정규식은
      `import { pretendard } from "./fonts"` **통째로**를 요구해서, 2026-09-08 에
      명조(`notoSerifKR`)를 같은 줄에 더하자 빨개졌다 — 지키려던 것(「레이아웃이
      fonts 에서 pretendard 를 들여온다」)은 하나도 안 깨졌는데도 그랬다.
      가드가 제 뜻보다 넓게 물면 다음 사람이 그 가드를 고치게 되고, 그러다 뜻까지 지운다.
    */
    expect(src).toMatch(
      /import\s*{[^}]*\bpretendard\b[^}]*}\s*from\s*["']\.\/fonts["']/,
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

/**
 * 시험지 명조 자체 적재 (UI-09 후속, 2026-09-08).
 *
 * 🔴 **끊겨도 아무 데서도 안 운다.** 배선이 빠지면 스택의 다음 이름으로 조용히 떨어지고,
 *    이 PC 에는 같은 글꼴이 깔려 있어 **화면이 똑같아 보인다.** 그래서 「보고 안다」가
 *    구조적으로 불가능하다 — 없는 기계에서만 6~7% 넓어지는데, 그 기계는 여기 없다.
 *    2026-08-24 에 Pretendard 가 정확히 그렇게 «선언만 하고 안 실린 채» 지나갔다.
 */
describe("시험지 명조 적재 (UI-09)", () => {
  it("부분집합 글꼴과 라이선스 고지가 public/fonts 에 실제로 있다", () => {
    const font = path.resolve(
      process.cwd(),
      "public/fonts/NotoSerifKR-subset.woff2",
    );
    expect(existsSync(font)).toBe(true);
    // 0바이트 파일도 «있다»로 통과한다 — 크기까지 본다.
    expect(statSync(font).size).toBeGreaterThan(500_000);
    // SIL OFL 은 고지 동봉을 요구한다. 파일만 싣고 고지를 빠뜨리면 라이선스 위반이다.
    const ofl = path.resolve(process.cwd(), "public/fonts/NotoSerifKR-OFL.txt");
    expect(existsSync(ofl)).toBe(true);
    expect(readSrc("public/fonts/NotoSerifKR-OFL.txt")).toMatch(
      /Open Font License/i,
    );
  });

  it("fonts.ts 가 그 파일을 가변 굵기로 싣는다", () => {
    const src = readSrc("src/app/fonts.ts");
    expect(src).toMatch(/NotoSerifKR-subset\.woff2/);
    expect(src).toMatch(/variable:\s*["']--font-noto-serif-kr["']/);
    // 지면은 700·800 을 쓴다(.dateValue · .questionNumber). 한 굵기만 실으면
    // 브라우저가 굵기를 «지어내고» 그 순간 자와 지면의 너비가 갈린다.
    expect(src).toMatch(/weight:\s*["']100 900["']/);
  });

  it("루트 레이아웃이 그 변수를 <html> 에 얹는다", () => {
    const src = readSrc("src/app/layout.tsx");
    const htmlTagMatch = src.match(/<html[^>]*>/);
    expect(htmlTagMatch?.[0]).toMatch(/notoSerifKR\.variable/);
  });

  it("🔴 지면 서체 스택의 **맨 앞**이 자체 적재분이다", () => {
    const src = readSrc("src/components/print/tokens.ts");
    // 여러 줄에 걸쳐 있을 수 있다(주석이 붙어 있다) — `[\s\S]` 로 줄바꿈까지 받는다.
    const serif = src.match(/serifKR:[\s\S]*?'([^']+)'/)?.[1] ?? "";
    expect(serif).not.toBe("");
    // 맨 앞이어야 뜻이 있다 — 뒤에 있으면 시스템에 깔린 것이 이깁니다.
    expect(serif.trimStart().startsWith("var(--font-noto-serif-kr)")).toBe(
      true,
    );
    // ⚠️ 뒤의 이름들을 지우면 안 된다: 자(paperProbe)는 Next 밖에서 그려 변수를 못 본다.
    expect(serif).toMatch(/Noto Serif KR/);
    expect(serif).toMatch(/serif\s*$/);
  });
});
