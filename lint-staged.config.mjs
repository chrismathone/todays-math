const affordanceTest =
  "npx vitest run src/__tests__/unit/affordanceGuard.test.ts --reporter=dot";

/**
 * 파일 목록을 **여러 명령으로 쪼갠다** — Windows 명령줄 길이 한계 때문이다.
 *
 * 🔴 2026-08-25 에 117개 파일을 한 커밋에 담자 훅이 통째로 죽었다
 *    (`eslint --fix` → 「명령줄이 너무 깁니다」, cmd.exe 는 약 8,191자).
 *    그건 **「검사가 실패」가 아니라 「검사를 못 함」**이고, 그 상태로 두면
 *    다음 사람은 큰 커밋마다 훅을 우회한다 — 늘 우는 가드는 꺼진다
 *    (CLAUDE.md 2026-08-20 「거짓 경보는 가드를 끈다」와 같은 자리).
 *
 * 검사 내용도 대상 파일도 **한 글자도 바꾸지 않는다.** 나눠 부를 뿐이다.
 * 조각 크기는 경로 길이를 넉넉히 잡아 20 — 한글·긴 경로여도 2KB 남짓이다.
 */
function chunked(command, files, size = 20) {
  const out = [];
  for (let i = 0; i < files.length; i += size) {
    const part = files
      .slice(i, i + size)
      .map((f) => JSON.stringify(f))
      .join(" ");
    out.push(`${command} ${part}`);
  }
  return out;
}

export default {
  "*.{ts,tsx}": (files) => [
    ...chunked("eslint --fix", files),
    ...chunked("prettier --write", files),
  ],
  "src/**/*.{tsx,jsx,css}": (files) =>
    chunked("node src/lint/check-affordance.mjs", files),
  "src/lint/**": () => affordanceTest,
  "src/__tests__/unit/affordanceGuard.test.ts": () => affordanceTest,
};
