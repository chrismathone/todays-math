/**
 * **라벨 배치 1:1 대조 페이지** — 고치기 전/후를 나란히 놓는다.
 *
 *   npx tsx scripts/qa/build-label-compare.ts [전디렉터리] [후디렉터리] [나갈.html]
 *
 * 두 디렉터리는 `dump-figure-svgs.ts` 가 만든다(같은 코퍼스·같은 순서).
 * 파일 이름의 **번호 뒤 부분**으로 짝을 짓는다 — 번호는 렌더 실패 수에 따라
 * 밀릴 수 있으므로 번호로 짝지으면 엉뚱한 것을 견준다.
 *
 * ⚠️ `.tmp-orca/` 에 둔다. 눈으로 보려는 물건이고 커밋 대상이 아니다.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const beforeDir = process.argv[2] ?? path.join(".tmp-orca", "label-before");
const afterDir = process.argv[3] ?? path.join(".tmp-orca", "label-after");
const outPath = process.argv[4] ?? path.join(".tmp-orca", "label-compare.html");

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * 짝을 지을 열쇠 — **파일 이름 그대로**(번호 포함).
 *
 * ⚠️ 번호를 떼면 안 된다. 파일 이름은 한글을 못 담으므로(`safe`) 「중1-2|원과
 *    부채꼴|12」와 「중1-2|기본 도형|12」가 **같은 이름**이 되고, 296장이 143짝으로
 *    접힌다 — 그러면 「전부 견줬다」가 거짓인데 **에러가 안 난다.**
 *    번호는 열거 순서라 같은 코퍼스면 같은 것을 가리킨다.
 */
function key(name: string): string {
  return name;
}

function index(dir: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const name of readdirSync(dir)) {
    if (name.endsWith(".svg")) map.set(key(name), name);
  }
  return map;
}

const before = index(beforeDir);
const after = index(afterDir);
const shared = [...after.keys()].filter((k) => before.has(k)).sort();
// ⚠️ **짝이 없는 것을 말없이 버리지 않는다** — 세어 찍어야 「전부 견줬다」로 안 읽힌다.
const onlyBefore = [...before.keys()].filter((k) => !after.has(k));
const onlyAfter = [...after.keys()].filter((k) => !before.has(k));

const rows = shared.map((k) => {
  const b = readFileSync(path.join(beforeDir, before.get(k)!), "utf8");
  const a = readFileSync(path.join(afterDir, after.get(k)!), "utf8");
  return { k, b, a, same: b === a };
});
const moved = rows.filter((r) => !r.same);

const body = rows
  .map(
    (r) => `<section${r.same ? ' class="same"' : ""}>
  <h3>${esc(r.k.replace(/\.svg$/, ""))}${r.same ? " <em>그대로</em>" : ""}</h3>
  <div class="pair">
    <figure><figcaption>전</figcaption>${r.b}</figure>
    <figure><figcaption>후</figcaption>${r.a}</figure>
  </div>
</section>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>라벨 배치 1:1 대조</title>
<style>
  body { font: 14px/1.6 system-ui, sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 18px; }
  .m { color: #555; }
  section { border-top: 1px solid #ddd; padding: 14px 0; }
  section.same { opacity: .45; }
  h3 { font-size: 13px; margin: 0 0 6px; font-weight: 600; }
  h3 em { color: #888; font-style: normal; font-weight: 400; }
  .pair { display: flex; gap: 28px; align-items: flex-start; flex-wrap: wrap; }
  figure { margin: 0; }
  figcaption { font-size: 11px; color: #888; margin-bottom: 4px; }
  svg { border: 1px dashed #e5e5e5; max-width: 460px; height: auto; }
</style></head><body>
<h1>라벨 배치 1:1 대조 — 전 / 후</h1>
<p class="m">짝지은 그림 ${rows.length}장 · <b>달라진 것 ${moved.length}장</b> ·
그대로 ${rows.length - moved.length}장${
  onlyBefore.length || onlyAfter.length
    ? ` · <b>짝 없음</b> 전에만 ${onlyBefore.length} · 후에만 ${onlyAfter.length}`
    : ""
}</p>
${body}
</body></html>
`;

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, html, "utf8");
console.log(
  `짝 ${rows.length}장 · 달라진 것 ${moved.length}장 · ` +
    `짝 없음 전 ${onlyBefore.length} / 후 ${onlyAfter.length}\n→ ${outPath}`,
);
