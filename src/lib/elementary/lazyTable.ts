/**
 * 후보 표를 **처음 쓸 때 한 번** 만든다(`??=`) — 모듈 적재 때 계산하지 않는다.
 *
 * 🔴 2026-09-28: `g6.ts` 가 적재될 때마다 후보 표 55개를 역산 검사하며 만들어, 그 모듈을
 *    끌어오는 탐험 API 의 새 인스턴스 첫 요청이 2초 넘게 걸렸다(콜드 스타트).
 *    표는 결정적(난수·시각 없음)이라 언제 만들어도 같다 — `elemG6LazyTables.test.ts` 가
 *    옛 판(적재 때 계산)의 지문과 견준다. 새 후보 표도 이것으로 감싼다.
 */
const tables = new Map<string, () => unknown>();
let built = 0;

// 같은 이름을 다시 걸면 새것이 이긴다 — 개발 서버가 g6 만 다시 읽을 때(이 모듈은 그대로) 던지면 안 된다.
export function lazyTable<T>(name: string, build: () => T): () => T {
  let table: T | undefined;
  const get = () => (table ??= track(build));
  tables.set(name, get);
  return get;
}

function track<T>(build: () => T): T {
  built += 1;
  return build();
}

/** 시험용 — 등록된 표(이름, 게터). */
export const lazyTableEntries = (): [string, () => unknown][] => [...tables];
/** 시험용 — 이 모듈이 지금까지 실제로 만든 표의 수. */
export const lazyTablesBuilt = () => built;
