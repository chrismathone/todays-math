/**
 * 워크트리 **이름에 한글이 있으면** Prisma 가 안 올라온다 — 그 자리를 메운다.
 *
 *     node scripts/qa/fix-prisma-nonascii-path.mjs           # 진단만
 *     node scripts/qa/fix-prisma-nonascii-path.mjs --apply   # 고친다
 *     node scripts/qa/fix-prisma-nonascii-path.mjs --revert  # 되돌린다
 *
 * ## 증상 — **게이트가 통째로 빨개진다**
 *
 *     Error: Cannot find module '#main-entry-point'
 *       at node_modules/.prisma/client/default.js:5:23
 *
 * `npm run test` 가 `db` 를 물고 오는 파일 전부에서 죽는다(실측: 이 워크트리에서
 * 257파일 중 256파일 · 9,746 시험). `npx tsx scripts/…` 로 DB 를 만지는 스크립트도
 * 같이 죽는다. **코드 문제가 아니다.**
 *
 * ## 뿌리 — Node 가 비ASCII 경로에서 `#imports` 를 못 푼다 (Node 22 / Windows)
 *
 * 저장소와 **무관한** 최소 재현:
 *
 *     mkdir -p /c/tmp/임프트-한글/node_modules/pkg    # package.json 에 "imports": {"#e": …}
 *     cd /c/tmp/임프트-한글 && node t.js              # 🔴 Cannot find module '#e'
 *     cd /c/tmp/impt-ascii  && node t.js              # 🟢 42
 *
 * 2026-08-19 의 「`fs.rmSync` 가 한글 경로에서 프로세스를 죽인다」와 **같은 부류**다.
 * 이 저장소는 워크트리 이름을 한글로 짓는 관례라 다음 세션도 똑같이 걸린다.
 *
 * ## 이 스크립트가 하는 일
 *
 * 생성물 `node_modules/.prisma/client/default.js` 의 `require('#main-entry-point')` 를
 * `require('./index.js')` 로 바꾼다 — 그 `imports` 항목이 가리키는 바로 그 파일이다
 * (같은 `package.json` 의 `"#main-entry-point" → "./index.js"` 를 읽어서 고른다,
 * 값을 지어내지 않는다).
 *
 * ⚠️ **`node_modules` 는 커밋 대상이 아니다.** `npx prisma generate` 를 돌리면
 *    원래대로 돌아오고, 그러면 다시 이걸 돌려야 한다.
 *    **근본 대책은 워크트리 이름을 ASCII 로 짓는 것.**
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const TARGET = path.join(
  process.cwd(),
  "node_modules",
  ".prisma",
  "client",
  "default.js",
);
const PKG = path.join(path.dirname(TARGET), "package.json");
const MARK = "// [비ASCII 경로 우회] scripts/qa/fix-prisma-nonascii-path.mjs";

function nonAscii(p) {
  return [...p].some((ch) => ch.charCodeAt(0) > 126);
}

/** `#main-entry-point` 가 실제로 가리키는 파일 — 값을 지어내지 않는다. */
function mainEntry() {
  const pkg = JSON.parse(readFileSync(PKG, "utf8"));
  const entry = pkg.imports?.["#main-entry-point"];
  const file =
    typeof entry === "string" ? entry : (entry?.require?.node ?? entry?.default);
  if (typeof file !== "string")
    throw new Error("`#main-entry-point` 가 가리키는 파일을 못 찾았다");
  return file;
}

const args = process.argv.slice(2);
if (!existsSync(TARGET)) {
  console.log(`생성물이 없다: ${TARGET}\n   먼저 \`npx prisma generate\` 를 돌려라.`);
  process.exit(2);
}
const body = readFileSync(TARGET, "utf8");
const patched = body.includes(MARK);
console.log(`워크트리: ${process.cwd()}`);
console.log(`   경로에 비ASCII: ${nonAscii(process.cwd()) ? "예 🔴" : "아니오"}`);
console.log(`   지금 상태: ${patched ? "우회 적용됨" : "생성물 그대로"}`);

if (args.includes("--revert")) {
  if (!patched) {
    console.log("되돌릴 것이 없다.");
    process.exit(0);
  }
  console.log("생성물을 되돌리려면 `npx prisma generate` 를 돌려라 (그것이 정본이다).");
  process.exit(0);
}
if (!args.includes("--apply")) {
  if (nonAscii(process.cwd()) && !patched)
    console.log("\n→ 고치려면: node scripts/qa/fix-prisma-nonascii-path.mjs --apply");
  process.exit(0);
}
if (patched) {
  console.log("이미 적용돼 있다.");
  process.exit(0);
}
const entry = mainEntry();
const next =
  `${MARK}\n// Node 22(Windows)는 경로에 비ASCII 가 있으면 \`#imports\` 를 못 푼다.\n` +
  `// \`npx prisma generate\` 를 돌리면 이 줄들은 사라진다 — 그때 다시 적용하라.\n` +
  body.replace(/require\((['"])#main-entry-point\1\)/g, `require("${entry}")`);
if (next === MARK + next.slice(MARK.length) && !next.includes(entry))
  throw new Error("치환할 자리를 못 찾았다 — 생성물 모양이 바뀌었다");
writeFileSync(TARGET, next);
console.log(`적용: '#main-entry-point' → '${entry}'`);
