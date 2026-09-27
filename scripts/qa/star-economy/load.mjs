// 별 경제 시뮬레이터 적재기 (D-144) — 제품 모듈을 DB 없이 불러온다(scripts/qa/mobile-explorers-qa.mjs 와 같은 방식).
// 🔴 공유 DB 에 닿지 않는다 — `@/lib/db` 는 무엇을 읽든 던지는 대역이다.
// 원본: 병목 조사(reward-latency, 2026-09-28)의 계측기 — 저장소 뿌리를 스스로 찾게만 고쳤다.
import { createRequire } from "node:module";
import { resolve } from "node:path";

// 복습 기록 격리 울타리(D-141 ⑵ · mathSrsRecordIsolation)가 이 폴더만 허용한다 — 원장님 2026-09-28.
export const worktree = resolve(import.meta.dirname, "../../..");
export const srcRoot = process.env.SRC_ROOT ?? worktree;
process.env.TSX_TSCONFIG_PATH = resolve(srcRoot, "tsconfig.json");

// 가짜 시계 — changeSrsState 가 `new Date()` 로 updateExpedition 을 부르므로 전역 Date 를 바꾼다.
const RealDate = Date;
let fakeNow = null;
class FakeDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) super(fakeNow ?? RealDate.now());
    else super(...args);
  }
  static now() {
    return fakeNow ?? RealDate.now();
  }
}
globalThis.Date = FakeDate;
export const clock = {
  set(ms) {
    fakeNow = ms;
  },
  real() {
    fakeNow = null;
  },
};

const toolRequire = createRequire(resolve(worktree, "package.json"));
const { register } = toolRequire("tsx/cjs/api");
register();
const require = createRequire(resolve(srcRoot, "package.json"));
const dbBlocked = new Proxy(
  {},
  {
    get(_, key) {
      throw new Error(`계측은 DB 를 쓰지 않는다 (${String(key)})`);
    },
  },
);
for (const [path, exports] of [
  [toolRequire.resolve("server-only"), {}],
  [resolve(srcRoot, "src/lib/db.ts"), { db: dbBlocked }],
])
  require.cache[path] = { id: path, filename: path, loaded: true, exports, children: [], paths: [] };
export const src = (path) => require(resolve(srcRoot, "src", path));
