/**
 * **경로에 한글이 있으면 Node 가 `#imports` 를 못 푼다** — 최소 재현기 (2026-08-25).
 *
 *   node scripts/qa/probe-node-imports-nonascii.mjs
 *
 * ## 무엇을 재현하나
 *
 * `package.json` 의 **`imports` 맵**(`"#x": "./index.js"`)을 `require('#x')` 로 푸는데,
 * 그 패키지가 **비ASCII 가 든 경로**에 있으면 Node 가 `Cannot find module '#x'` 로 죽는다.
 * 같은 파일을 ASCII 경로에 두면 멀쩡하다.
 *
 * ## 왜 이 저장소에 있나 — **관문이 통째로 못 돌았다**
 *
 * Prisma 6.19 가 낸 클라이언트가 그 모양이다:
 *
 * ```js
 * // node_modules/.prisma/client/default.js
 * module.exports = { ...require('#main-entry-point') }
 * ```
 *
 * 그래서 워크트리 이름이 `난이도사다리` 인 곳에서는 `require('@prisma/client')` 가
 * 죽고, **vitest 파일이 setup 단계에서 함께 죽는다.** 「N passed」가 아니라
 * 「전부 실패」라 눈에는 띄지만, **원인이 내 코드로 보인다** — 실제로 처음엔 새로 쓴
 * 시험이 잘못된 줄 알았다.
 *
 * ⚠️ **「한글 경로면 다 죽는다」가 아니고, «폴더 이름»의 문제도 아니다.**
 *    같은 컴퓨터에서 `도형라벨` **워크트리**는 멀쩡한데, 이 재현기가 임시 폴더에 만든
 *    `도형라벨` 은 죽는다. 이름은 같고 **앞쪽 경로가 다르다** — 갈라 주는 것은 이름이
 *    아니라 **해석된 전체 경로**다(`가` 한 글자는 통과하니 길이가 얽힌 것으로 보인다).
 *    그래서 이 재현기는 두 가지를 따로 찍는다: ⑴ 임시 경로 표본, ⑵ **지금 이 워크트리가
 *    실제로 어떤가**. 「환경 문제」로 이름 붙이고 멈추지 말 것
 *    (CLAUDE.md 2026-08-19 「환경 문제는 결론이 아니라 아직 안 끝난 조사다」).
 *
 * ## 걸렸을 때 고치는 법 (로컬 수리 — 커밋 대상 아님)
 *
 * `node_modules` 는 커밋하지 않으므로 **저장소로는 못 고친다.** 이 워크트리에서만:
 *
 * ```bash
 * npx prisma generate                       # 먼저 클라이언트가 있어야 한다
 * node -e "const f='node_modules/.prisma/client/default.js',fs=require('fs');
 *          fs.writeFileSync(f, fs.readFileSync(f,'utf8')
 *            .replace(String.raw`#main-entry-point`, './index.js'))"
 * node -e "require('@prisma/client'); console.log('OK')"
 * ```
 *
 * 근본 해결은 **워크트리 이름을 ASCII 로** 만드는 것이다. 새 워크트리를 팔 때
 * 한글 이름을 쓰면 이 함정과 2026-08-19 의 `fs.rmSync` 함정을 같이 밟는다.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const 뿌리 = path.join(tmpdir(), "node-imports-nonascii-probe");
rmSync(뿌리, { recursive: true, force: true });

const 이름들 = ["ascii", "가", "한글폴더", "도형라벨", "난이도사다리"];
const 결과 = [];
for (const 이름 of 이름들) {
  const dir = path.join(뿌리, 이름, "pkg");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({
      name: "p",
      main: "index.js",
      imports: { "#x": "./index.js" },
    }),
  );
  writeFileSync(path.join(dir, "index.js"), "module.exports = 42;\n");
  writeFileSync(path.join(dir, "entry.js"), "module.exports = require('#x');\n");
  const entry = path.join(dir, "entry.js");
  try {
    const v = createRequire(entry)(entry);
    결과.push([이름, v === 42 ? "OK" : `이상한 값 ${v}`, true]);
  } catch (e) {
    결과.push([이름, e.message.split("\n")[0], false]);
  }
}
rmSync(뿌리, { recursive: true, force: true });

console.log(`임시 경로 표본 (${뿌리}):`);
for (const [이름, 말, 좋음] of 결과)
  console.log(`  ${좋음 ? "✅" : "❌"} ${이름.padEnd(14)} ${말}`);

if (!결과.find((r) => r[0] === "ascii")?.[2]) {
  // ⚠️ **음성 대조군이 먼저다.** ASCII 도 죽으면 이 재현기가 잰 것은 「한글」이 아니라
  //    「내 재현기가 틀렸다」이다 — 그 둘을 안 가르면 아무것도 증명하지 못한다.
  console.log("\n⛔ ASCII 경로도 죽었다 — **이 재현기가 틀렸다.** 한글 탓이 아니다.");
  process.exit(2);
}
const 죽은것 = 결과.filter((r) => !r[2]);
console.log(
  죽은것.length === 0
    ? "\n✅ 이 Node 에서는 표본의 비ASCII 경로도 `#imports` 를 푼다."
    : `\n⚠️ 표본에서 비ASCII 경로 ${죽은것.length}/${이름들.length - 1} 이 죽는다` +
        ` (Node ${process.version}, ${process.platform}).`,
);

/* ── 그래서 **이 워크트리는** 어떤가 — 표본이 아니라 진짜를 묻는다 ── */
try {
  const { PrismaClient } = createRequire(path.join(process.cwd(), "x.js"))(
    "@prisma/client",
  );
  console.log(
    typeof PrismaClient === "function"
      ? `\n✅ 이 워크트리(${process.cwd()})에서 \`require('@prisma/client')\` 는 된다 — 관문이 돈다.`
      : "\n⚠️ `@prisma/client` 가 이상한 모양이다.",
  );
} catch (e) {
  console.log(
    `\n❌ 이 워크트리에서 \`require('@prisma/client')\` 가 죽는다 — ${e.message.split("\n")[0]}` +
      "\n   **vitest 가 통째로 못 돈다.** 위 머리말의 로컬 수리를 적용할 것.",
  );
  process.exitCode = 1;
}
