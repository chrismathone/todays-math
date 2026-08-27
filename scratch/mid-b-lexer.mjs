/** 템플릿 리터럴 안의 죽은 백슬래시 — **어휘 분석**으로. (내 파일 · 시험에 옮길 판) */
export function deadBackslashes(src) {
  const out = [];
  let line = 1;
  /** "code" 바깥 · "tpl" 템플릿 리터럴 · "expr" `${` 안 · "brace" `{` 안 */
  const stack = ["code"];
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
        if (n !== "n" && n !== "`" && n !== "$") out.push({ line, next: n });
        i += 2;
        continue;
      }
      if (c === "$" && n === "{") {
        stack.push("expr");
        i += 2;
        continue;
      }
      if (c === "`") {
        stack.pop();
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
