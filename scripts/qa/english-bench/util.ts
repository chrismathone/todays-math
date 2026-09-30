/** 오늘의 영어 모델 벤치 — 작은 도구들 */

export function flag(name: string): string | undefined {
  const args = process.argv.slice(2);
  const at = args.indexOf(name);
  return at >= 0 ? args[at + 1] : undefined;
}

/** 파일 이름에 쓸 수 있게 — `codex:gpt-6-astra` → `codex_gpt-6-astra` */
export function safeName(id: string): string {
  return id.replace(/[^A-Za-z0-9.-]+/g, "_");
}

/** 일을 `lanes` 개씩 동시에 — 하나가 실패해도 나머지는 계속 */
export async function pool(
  jobs: (() => Promise<void>)[],
  lanes: number,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      try {
        await job();
      } catch (error) {
        console.error(`작업 실패: ${(error as Error).message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, lanes) }, worker));
}

/** 닫는 괄호가 모자라면 채운다 — 채점관이 마지막 «]}» 를 빼먹는 일이 있다(codex 루브릭 4건, 2026-09-30) */
function closeBrackets(text: string): string {
  const stack: string[] = [];
  let inString = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (inString) {
      if (ch === "\\") i += 1;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  return text + stack.reverse().join("");
}

/** 응답 글에서 JSON 객체 하나를 꺼낸다(코드펜스·잡설 허용, 모자란 닫는 괄호 채움) */
export function extractJsonObject(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = fenced ? fenced[1]! : text;
  const start = body.indexOf("{");
  if (start < 0) throw new Error("JSON 객체 없음");
  const end = body.lastIndexOf("}");
  const span = end > start ? body.slice(start, end + 1) : body.slice(start);
  try {
    return JSON.parse(span);
  } catch {
    return JSON.parse(closeBrackets(body.slice(start).trim()));
  }
}
