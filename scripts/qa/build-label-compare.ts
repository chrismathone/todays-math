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

/**
 * **크기를 박아 준다** — 안 박으면 라벨이 안 보인다.
 *
 * 코퍼스 SVG 는 `viewBox` 만 있고 `width`/`height` 가 **없다**(지면에서는
 * `figureSvgFrame` 이 등급별 폭을 씌운다). 그런 `<svg>` 를 그냥 HTML 에 넣으면
 * 기본 폭이 100% 인데, 이 페이지의 `figure` 는 flex 항목이라 **바탕이 0 으로
 * 접힌다** — 원장님 화면에서 30px 짜리 얼룩으로 나왔다(2026-08-28).
 * `max-width` 는 폭을 **정하지 않으므로** 그것으로는 못 고친다.
 *
 * ⚠️ 고정 폭으로 다 같게 그리면 **크기 변화가 지워진다** — 이 회차에서 viewBox 가
 *    넓어진 그림이 144장이고 「도형이 글자보다 작다」가 고치려던 결함 중 하나였다.
 *    그래서 **viewBox 폭에 비례**해서 키운다(1.8배). 전/후 크기 차이가 눈에 남는다.
 */
const ZOOM = 1.8;
const MAX_W = 460;

function sized(svg: string): string {
  const m = /viewBox="([\d.\-]+) +([\d.\-]+) +([\d.\-]+) +([\d.\-]+)"/.exec(
    svg,
  );
  if (!m) return svg; // 뜻을 모르면 손대지 않는다 — 조용히 0 으로 접히는 편이 낫다
  const vw = Number(m[3]);
  const vh = Number(m[4]);
  if (!(vw > 0) || !(vh > 0)) return svg;
  const w = Math.min(MAX_W, vw * ZOOM);
  const h = (w * vh) / vw;
  // ⚠️ 정규식이 아니라 **글자 그대로** 찾는다. 역슬래시를 쓰면 이 저장소의
  //    도구 층이 한 겹 먹어 **백스페이스 문자**가 되고, 그러면 아무것도 안 걸리는데
  //    **에러도 안 난다** — 페이지가 조용히 예전처럼 접힌다(실제로 그렇게 났다).
  const at = svg.indexOf("<svg ");
  if (at < 0) return svg;
  return (
    svg.slice(0, at) +
    `<svg width="${w.toFixed(1)}" height="${h.toFixed(1)}" ` +
    svg.slice(at + "<svg ".length)
  );
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
    <figure><figcaption>전</figcaption>${sized(r.b)}</figure>
    <figure><figcaption>후</figcaption>${sized(r.a)}</figure>
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
  svg { border: 1px dashed #e5e5e5; display: block; }
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
