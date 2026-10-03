/**
 * 마이그레이션 글을 문장으로 나눈다 — `$$ … $$`(함수 본문 · DO 블록) · 따옴표 · 주석 안의 `;` 는 끊지 않는다.
 *
 * 기존 적용기들은 `$$` 가 보이면 던지고 단순히 `;` 로 나눈다(그 마이그레이션에는 함수가 없었다).
 * 교재 마이그레이션에는 트리거 함수가 스물 가까이 있어 그 분할로는 못 쓴다 — 그래서 따로 둔다.
 * Prisma 의 원시 실행은 한 번에 문장 하나만 받는다.
 *
 * 시험: `src/__tests__/unit/textbookSqlStatements.test.ts` — 이 분할로 한 문장씩 적용한 DB 와 파일을 통째로 적용한
 * DB 의 표 · 트리거 · 함수 · 제약이 같은지 PGlite 에서 견준다.
 */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let index = 0;
  const push = () => {
    const trimmed = current.trim();
    if (trimmed) statements.push(trimmed);
    current = "";
  };
  while (index < sql.length) {
    const char = sql[index]!;
    const next = sql[index + 1];
    // 줄 주석 — 문장에 싣지 않는다
    if (char === "-" && next === "-") {
      const end = sql.indexOf("\n", index);
      index = end === -1 ? sql.length : end;
      continue;
    }
    // 블록 주석
    if (char === "/" && next === "*") {
      const end = sql.indexOf("*/", index + 2);
      if (end === -1) throw new Error("닫히지 않은 블록 주석");
      index = end + 2;
      continue;
    }
    // 달러 따옴표 — $$ 또는 $tag$
    if (char === "$") {
      const tag = /^\$[A-Za-z_]*\$/.exec(sql.slice(index))?.[0];
      if (tag) {
        const end = sql.indexOf(tag, index + tag.length);
        if (end === -1) throw new Error(`닫히지 않은 ${tag}`);
        current += sql.slice(index, end + tag.length);
        index = end + tag.length;
        continue;
      }
    }
    // 글자 · 식별자 따옴표 — 겹친 따옴표('' · "")는 따옴표 안의 글자다
    if (char === "'" || char === '"') {
      let end = index + 1;
      while (end < sql.length) {
        if (sql[end] === char) {
          if (sql[end + 1] === char) {
            end += 2;
            continue;
          }
          break;
        }
        end += 1;
      }
      if (end >= sql.length) throw new Error("닫히지 않은 따옴표");
      current += sql.slice(index, end + 1);
      index = end + 1;
      continue;
    }
    if (char === ";") {
      push();
      index += 1;
      continue;
    }
    current += char;
    index += 1;
  }
  push();
  return statements;
}
