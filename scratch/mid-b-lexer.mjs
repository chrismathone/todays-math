/** 템플릿 리터럴 안의 죽은 백슬래시 — **어휘 분석**으로. (내 파일 · 시험에 옮길 판) */
export function deadBackslashes(src) {
  const out = [];
  let line = 1;
  /** "code" 바깥 · "tpl" 템플릿 리터럴 · "expr" `${` 안 · "brace" `{` 안 */
  const stack = ["code"];
  /** 지금 템플릿 리터럴 안의 `$…$` 수식 안인가 */
  let inMath = false;
  const top = () => stack[stack.length - 1];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === "\n") {
      line += 1;
      i += 1;
      continue;
    }
    if (top() === "tpl") {
      if (c === "\\") {
        if (n === "\\") {
          i += 2;
          continue;
        }
        // `\n` 은 줄바꿈이라 뜻이 산다 — **다만 뒤에 영문이 오면 아니다.**
        // `\ne`(≠) · `\neq` · `\not` · `\nu` 가 그 자리다: JS 는 `\n` 을 줄바꿈으로
        // 먹고 나머지 글자만 남겨 지면에 `<줄바꿈>e0` 이 나간다. 2026-08-27 에
        // 실제로 `$5\ne0$` 이 그렇게 나갔고, **`\n` 을 통째로 봐주던 이 가드가
        // 그 하나를 구조적으로 못 봤다** — 눈으로 훑다 걸렸다.
        //
        // ⚠️ **수식 `$…$` 안일 때만** 잡는다. 밖에서는 `\nA반의 …` 처럼 줄바꿈 뒤에
        //    영문으로 시작하는 한국어 문장이 정상이고, 그것까지 잡으면 거짓 경보가
        //    2/3 이 된다 — 거짓 경보는 가드를 끈다(CLAUDE.md 2026-08-20).
        //    실측: 전 모듈에서 이 좁힌 규칙은 1건만 잡고 그 1건이 진짜였다.
        if (inMath && n === "n" && /[A-Za-z]/.test(src[i + 2] ?? "")) {
          out.push({ line, next: "n" + src[i + 2] });
          i += 2;
          continue;
        }
        if (n !== "n" && n !== "`" && n !== "$") out.push({ line, next: n });
        i += 2;
        continue;
      }
      if (c === "$" && n === "{") {
        stack.push("expr");
        i += 2;
        continue;
      }
      if (c === "$") {
        inMath = !inMath;
        i += 1;
        continue;
      }
      if (c === "`") {
        stack.pop();
        inMath = false;
        i += 1;
        continue;
      }
      i += 1;
      continue;
    }
    // code / expr / brace — 전부 «코드» 자리다
    if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && n === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") line += 1;
        i += 1;
      }
      i += 2;
      continue;
    }
    if (c === "'" || c === '"') {
      const q = c;
      i += 1;
      while (i < src.length && src[i] !== q) {
        if (src[i] === "\\") i += 1;
        else if (src[i] === "\n") line += 1;
        i += 1;
      }
      i += 1;
      continue;
    }
    if (c === "`") {
      stack.push("tpl");
      inMath = false;
      i += 1;
      continue;
    }
    if (c === "{") {
      stack.push("brace");
      i += 1;
      continue;
    }
    if (c === "}") {
      if (top() === "brace" || top() === "expr") stack.pop();
      i += 1;
      continue;
    }
    i += 1;
  }
  return out;
}
