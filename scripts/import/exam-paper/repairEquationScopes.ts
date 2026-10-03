/** HWP 변환에서 등식 뒤까지 늘어난 분모·선분·호의 범위를 복구한다. */
interface Group {
  start: number;
  end: number;
  body: string;
}

function groupAt(text: string, offset: number): Group | null {
  let start = offset;
  while (/\s/.test(text[start] ?? "") && start < text.length) start += 1;
  if (text[start] !== "{") return null;
  let depth = 1;
  for (let i = start + 1; i < text.length; i += 1) {
    if (text[i - 1] === "\\") continue;
    if (text[i] === "{") depth += 1;
    if (text[i] === "}" && --depth === 0)
      return { start, end: i + 1, body: text.slice(start + 1, i) };
    // 닫는 괄호에서만 depth를 줄인다.
  }
  return null;
}

function relationBoundary(text: string): number {
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i - 1] === "\\") continue;
    if (text[i] === "{") depth += 1;
    if (text[i] === "}") depth -= 1;
    if (depth === 0 && (text[i] === "=" || text[i] === ",")) return i;
  }
  return -1;
}

export function repairEquationScopes(text: string): string {
  const command = /\\(frac|dfrac|overline|overset)\s*(?=\{)/g;
  let out = "";
  let copied = 0;
  for (let match = command.exec(text); match; match = command.exec(text)) {
    const first = groupAt(text, command.lastIndex);
    if (!first) continue;
    const second = match[1] === "overline" ? null : groupAt(text, first.end);
    if (match[1] !== "overline" && !second) continue;
    const groups = second ? [first, second] : [first];
    const bodies = groups.map((g) => repairEquationScopes(g.body));
    let suffix = "";
    if (match[1] === "frac" || match[1] === "dfrac") {
      // 등호가 없는 정상적인 합·곱 분모는 그대로 둔다.
      const boundary = bodies[1].includes("=")
        ? relationBoundary(bodies[1])
        : -1;
      if (boundary > 0) {
        suffix = bodies[1].slice(boundary);
        bodies[1] = bodies[1].slice(0, boundary);
      }
    } else if (match[1] === "overline" || bodies[0] === "\\frown") {
      const index = match[1] === "overline" ? 0 : 1;
      const body = bodies[index];
      const label = /^((?:[A-Z]|\\mathrm\{[A-Z]{1,2}\}){1,2})([\s\S]*)$/.exec(
        body,
      );
      const letters = label?.[1].replace(/\\mathrm\{([A-Z]+)\}/g, "$1");
      if (
        letters?.length === 2 &&
        label &&
        label[2] &&
        body.includes("=") &&
        /^(?:=|,|\\times)/.test(label[2])
      ) {
        bodies[index] = letters;
        suffix = label[2];
      }
    }
    out += text.slice(copied, match.index);
    let position = match.index;
    for (let i = 0; i < groups.length; i += 1) {
      out += text.slice(position, groups[i].start + 1) + bodies[i] + "}";
      position = groups[i].end;
    }
    out += suffix;
    copied = position;
    command.lastIndex = position;
  }
  return out + text.slice(copied);
}
