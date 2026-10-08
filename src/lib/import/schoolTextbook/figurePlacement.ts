/**
 * 교과서 이관 — 본문의 `[그림]` 표지와 그림 파일의 짝 (D-161).
 *
 * 그림 문항의 본문에는 그림이 놓이는 자리가 문제은행의 표지 `[그림]` 으로 적혀 있다(`figures.py` 가 추출의 자리를 옮겨 적는다).
 * **표지의 차례가 곧 그림 파일의 차례**다(`Problem.figureUrls`). 보기 줄(`① [그림]`)에 선 표지가 그 보기의 그림이고,
 * 그 밖의 표지는 발문의 그림이다(`Problem.choiceFigureIndex` — 0 은 발문 · 1 부터 보기 번호).
 *
 * 🔴 짝을 알 수 없으면 **모른다**(null)로 낸다 — 아무 그림이나 ① 에 붙이지 않는다(틀린 짝은 그럴듯해 보이면서 틀린다.
 *    `prisma/schema.prisma` 의 `choiceFigureIndex` 주석과 같은 규칙). 적재기는 그런 문항을 잠근다.
 */
import { FIGURE_MARKER } from "../../problem/figureMarker";

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩";

export function countMarkers(content: string): number {
  return content.split(FIGURE_MARKER).length - 1;
}

/** 본문에서 `drop` 에 든 차례(1부터)의 표지를 걷는다. 표지가 홀로 서 있던 줄은 줄째 걷는다. */
export function dropFigureMarkers(
  content: string,
  drop: ReadonlySet<number>,
): string {
  if (drop.size === 0) return content;
  let seen = 0;
  const lines: string[] = [];
  for (const line of content.split("\n")) {
    if (!line.includes(FIGURE_MARKER)) {
      lines.push(line);
      continue;
    }
    const parts = line.split(FIGURE_MARKER);
    let out = parts[0]!;
    for (const part of parts.slice(1)) {
      seen += 1;
      out += (drop.has(seen) ? "" : FIGURE_MARKER) + part;
    }
    out = out.replace(/[ \t]{2,}/g, " ").trim();
    // 표지 때문에 있던 줄만 버린다 — 원래 빈 줄은 문단을 가르는 구조다
    if (out) lines.push(out);
  }
  return lines.join("\n");
}

/** 표지의 차례대로 «몇 번 보기의 그림인가». 짝을 알 수 없으면 null. */
export function choiceIndexOf(content: string): number[] | null {
  const index: number[] = [];
  const used = new Set<number>();
  for (const line of content.split("\n")) {
    const count = countMarkers(line);
    if (count === 0) continue;
    const choice = CIRCLED.indexOf(line.trimStart().charAt(0)) + 1;
    if (choice === 0) {
      for (let n = 0; n < count; n += 1) index.push(0);
      continue;
    }
    // 한 보기에 그림이 둘이거나 같은 번호의 보기가 또 나오면 어느 그림이 그 보기인지 모른다
    if (count > 1 || used.has(choice)) return null;
    used.add(choice);
    index.push(choice);
  }
  return index;
}

/**
 * 검토자가 본 그림(그 지문들)이 지금 싣는 그림인가.
 *
 * 추출을 고치면 같은 문항 번호에 다른 그림이 붙을 수 있다 — 본문이 한 글자도 같아도 그 검토는 다른 문항에 대한 것이다
 * (2026-10-08 그림이 한 문항씩 밀렸던 것을 바로잡으면서). 차례까지 같아야 `same` 이다.
 * 그림을 본 기록이 없는 검토(`seen` 이 없다)는 그림 문항에 쓰지 않는다 — `unseen`.
 */
export function figuresSeen(
  seen: readonly string[] | undefined,
  now: readonly string[],
): "same" | "changed" | "unseen" {
  if (seen === undefined) return now.length === 0 ? "same" : "unseen";
  if (seen.length !== now.length) return "changed";
  return seen.every((key, index) => key === now[index]) ? "same" : "changed";
}
