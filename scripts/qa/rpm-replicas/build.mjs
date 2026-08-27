/**
 * **RPM 원본 그림을 우리 엔진으로 «똑같이» 그려 보는** 복제 스펙을 만든다.
 *
 *   node scripts/qa/rpm-replicas/build.mjs
 *
 * 목적은 문항 생성이 아니라 **엔진 능력 검사**다 — 원본 지면에 있는 그림을 하나씩
 * 그대로 재현해 보고 **되는 것과 안 되는 것**을 가른다(원장님 지시 2026-08-27).
 *
 * ⚠️ **좌표를 손으로 적지 마라.** 각도에서 유도해 **정확히** 계산한다. 손으로 적으면
 *    공선성이 0.001 단위로 깨지고 엔진이 「각의 광선이 그려진 선분에 안 얹혔다」로
 *    던진다(실측 — 첫 복제에서 바로 밟았다). 이 저장소가 되풀이해 밟은 자리다.
 *
 * ⚠️ 저작권 — 여기 담는 것은 **기하 구성**이고 원본 본문은 옮기지 않는다.
 *    복제 그림은 QA 산출물이며 문제은행에 넣지 않는다.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));
const RAD = Math.PI / 180;

/** 원점에서 math 각 `deg`(위가 +) 방향으로 `r` 만큼. 스펙 y 는 아래가 + 다. */
const P = (cx, cy, deg, r) => [cx + r * Math.cos(deg * RAD), cy - r * Math.sin(deg * RAD)];

const files = {};

// ── ① RPM 1-2 p.16 · 0080 — 두 직선의 맞꼭지각 ────────────────────────────
//
// 각도는 **눈대중이 아니라 원본 벡터에서 실측**했다(`get_drawings` 의 선 항목):
// 얕은 직선 173.3° · 가파른 직선 48.3° — 사잇각이 **정확히 125.0°** 다.
// RPM 은 적은 각을 그대로 그린다.
{
  const O = [120, 95];
  const shallow = 173.3;
  const steep = 48.3;
  const R = 92; // 원본은 두 선이 같은 길이(78.3pt)로 교점 양쪽에 반씩
  files["1-2-p16-0080"] = {
    source: "RPM 중학 1-2 p.16 · 0080 (유형 10 맞꼭지각의 성질)",
    what: "두 직선이 한 점에서 만난다. 한 각에 125°, 그 맞꼭지각에 3x°+5°. 점·글자 없음.",
    spec: {
      version: 2,
      points: {
        O,
        A: P(O[0], O[1], shallow, R),
        B: P(O[0], O[1], shallow - 180, R),
        C: P(O[0], O[1], steep, R),
        D: P(O[0], O[1], steep + 180, R),
      },
      segments: { AB: ["A", "B"], CD: ["C", "D"] },
      angles: {
        up: { vertex: "O", points: ["A", "C"], label: "125°" },
        // 원본은 `3x°+5°` 다 — `x` 만 이탤릭, 숫자·`°` 는 정자체, `+` 앞뒤에 여백.
        // 2026-08-28 부터 라벨을 **MathJax 가 조판**하므로 그 규칙이 그대로 나온다.
        // (그 전에는 LaTeX 가 날 글자로 나가서 유니코드 `°` 로 때웠다 — 그 자리가
        //  `rpm-engine-gaps.md` ① 표의 마지막 다섯 줄이었다.)
        down: { vertex: "O", points: ["B", "D"], label: "$3x^\\circ+5^\\circ$" },
      },
    },
  };
}

// ── ② RPM 2-2 p.82 · 0567 계열 — 삼각형 + **점선 치수 곡선** ───────────────
//
// 원본 실측(덩어리 3): B(229.12,262.14) C(285.52,262.14) A(241.07,227.42) ·
// BC = 56.4pt · 도형 선 0.80pt · 각 호 0.30pt.
// 치수선은 **점선 호**(dash `[1.5 1]`, 굵기 0.30)가 BC 아래로 부풀고
// **라벨 자리에서 끊긴다** — 우리 `dimensions` 와 같은 장치다.
// 각: ∠B = 70° · ∠C = 38° (→ ∠A = 72°).
{
  const BC = 180;
  const angB = 70;
  const angC = 38;
  const BA = (BC * Math.sin(angC * RAD)) / Math.sin((180 - angB - angC) * RAD);
  const B = [0, 120];
  const C = [BC, 120];
  const A = [B[0] + BA * Math.cos(angB * RAD), B[1] - BA * Math.sin(angB * RAD)];
  files["2-2-p82-tri"] = {
    source: "RPM 중학 2-2 p.82 (유형 09 삼각형의 닮음 조건) · 삼각형 하나",
    what: "∠B=70° ∠C=38° 인 삼각형. BC 아래에 **점선 치수 곡선**과 `5 cm`. 꼭짓점 A·B·C.",
    spec: {
      version: 2,
      points: { A, B, C },
      segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
      angles: {
        b: { vertex: "B", points: ["C", "A"], label: "70°" },
        c: { vertex: "C", points: ["A", "B"], label: "38°" },
      },
      dimensions: {
        dimBC: { points: ["B", "C"], label: "5 cm", side: "auto" },
      },
      labels: { A: "A", B: "B", C: "C" },
    },
  };
}

mkdirSync(DIR, { recursive: true });
for (const [name, doc] of Object.entries(files)) {
  writeFileSync(path.join(DIR, `${name}.json`), `${JSON.stringify(doc, null, 1)}\n`, "utf8");
  console.log(`${name}.json`);
}
