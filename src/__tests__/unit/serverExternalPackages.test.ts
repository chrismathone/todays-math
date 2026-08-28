/**
 * **번들되면 자기 자리를 잃는 패키지**가 `serverExternalPackages` 에 있는가.
 *
 * ## 왜 있나
 *
 * 2026-08-28 에 `npm run build` 가 「Failed to collect page data for /dev/cube-scrape」
 * 로 죽었다. 원인은 `mathjax-full/js/components/version.js` 의 이 세 줄이다:
 *
 * ```js
 * var load = eval('require');
 * var dirname = eval('__dirname');
 * return load(path.resolve(dirname, '..', '..', 'package.json')).version;
 * ```
 *
 * 번들되면 `__dirname` 이 **청크 자리**가 되어 `../../package.json` 이 엉뚱한 곳
 * (`.next/server/package.json`)을 가리킨다. 그러면 그 모듈을 물고 있는 **페이지가
 * 통째로 못 열리고** 빌드가 죽는다.
 *
 * 🔴 **이 부류는 tsc·vitest·`next dev` 어디에도 안 나타난다.** 셋 다 이 파일을
 *    Turbopack 프로덕션 청크로 묶지 않기 때문이다. 그래서 `npm run build` 를 돌리기
 *    전까지 아무도 모르고, 이 저장소에서 실제로 **배포가 조용히 빨간 채로** 있었다.
 *
 * ## 무엇을 «참»으로 쓰나
 *
 * 위험 목록을 **손으로 적지 않는다** — 손 목록은 새고, 새면 세는 쪽과 고치는 쪽이
 * 같이 눈이 먼다. 대신 `node_modules` 에 **실제로 설치된 코드**를 훑어 그 수법
 * (`eval('__dirname')` · `eval('require')`)을 쓰는 패키지를 찾는다.
 *
 * ## ⚠️ 이 자가 못 보는 것 (넓다고 읽지 말 것)
 *
 * - **직접 의존**(package.json `dependencies`)이면서 `src/` 가 부르는 것만 본다.
 *   그 아래 딸린 패키지가 같은 수법을 쓰면 못 잡는다.
 * - `eval` 을 안 쓰고 `__dirname` 을 **그냥** 쓰는 것, `require.resolve`,
 *   `fs.readFileSync(__dirname + …)` 은 못 잡는다. 이 자는 **부류 전체가 아니라
 *   오늘 실제로 문 그 수법**을 센다.
 * - 즉 이 시험이 초록이라고 「빌드가 된다」는 뜻이 아니다. 빌드는 빌드가 증명한다.
 */
import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import nextConfig from "../../../next.config";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");

/** `eval('__dirname')` · `eval('require')` — 번들되면 자리가 어긋나는 그 수법. */
const HAZARD = /eval\(\s*['"](?:__dirname|require)['"]\s*\)/;

/**
 * **`next` 는 뺀다.** 번들러 자신은 번들 대상이 아니다 — Turbopack 이 `next/dist`
 * 를 청크로 묶는 일은 없다. 예외는 이 하나뿐이고, 늘어나면 그때마다 근거를 적는다.
 */
const NOT_BUNDLED = new Set(["next"]);

function walk(dir: string, onFile: (p: string) => void): void {
  const stack = [dir];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const p = path.join(cur, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (/\.(js|cjs|mjs)$/.test(entry.name)) onFile(p);
    }
  }
}

/** `src/` 전체를 한 덩어리로 — 어떤 패키지 이름이 나오는지만 보면 된다. */
function readSrc(): string {
  const parts: string[] = [];
  const stack = [path.join(ROOT, "src")];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    for (const entry of fs.readdirSync(cur, { withFileTypes: true })) {
      const p = path.join(cur, entry.name);
      if (entry.isDirectory()) stack.push(p);
      else if (/\.(ts|tsx|mjs)$/.test(entry.name))
        parts.push(fs.readFileSync(p, "utf8"));
    }
  }
  return parts.join("\n");
}

function hazardousPackages(): string[] {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> };
  const src = readSrc();
  const used = Object.keys(pkg.dependencies ?? {}).filter(
    (dep) =>
      !NOT_BUNDLED.has(dep) &&
      (src.includes(`"${dep}"`) || src.includes(`"${dep}/`)),
  );

  const hits: string[] = [];
  for (const dep of used) {
    const dir = path.join(ROOT, "node_modules", ...dep.split("/"));
    if (!fs.existsSync(dir)) continue;
    let found = false;
    walk(dir, (file) => {
      if (found) return;
      let text: string;
      try {
        text = fs.readFileSync(file, "utf8");
      } catch {
        return;
      }
      if (HAZARD.test(text)) found = true;
    });
    if (found) hits.push(dep);
  }
  return hits;
}

describe("[배포] 번들되면 자리를 잃는 패키지", () => {
  it("**검출기가 살아 있다** — 그 수법을 실제로 문다", () => {
    // 0 이 「깨끗」인지 「못 셈」인지 갈라야 한다. 정본 그대로의 세 줄.
    expect(HAZARD.test("var dirname = eval('__dirname');")).toBe(true);
    expect(HAZARD.test('var load = eval("require");')).toBe(true);
    // 반대쪽 — 멀쩡한 코드를 물면 거짓 경보가 되고, 거짓 경보는 가드를 끈다.
    expect(HAZARD.test("const dir = __dirname;")).toBe(false);
    expect(HAZARD.test("const load = require;")).toBe(false);
  });

  it("**mathjax-full 은 실제로 그 수법을 쓴다** — 이 시험의 양성 대조군이다", () => {
    // 여기가 비면 위 시험은 아무것도 안 지킨다(모집단이 사라진 것을 알아야 한다).
    expect(hazardousPackages()).toContain("mathjax-full");
  });

  it("🔴 그런 패키지는 **전부** `serverExternalPackages` 에 있어야 한다", () => {
    const declared = new Set(nextConfig.serverExternalPackages ?? []);
    const missing = hazardousPackages().filter((dep) => !declared.has(dep));
    expect(
      missing,
      missing.length > 0
        ? `\n다음 패키지는 번들되면 «자기 자리»를 잃는다 — next.config.ts 의\n` +
            `serverExternalPackages 에 넣어라. 안 넣으면 \`npm run build\` 가\n` +
            `「Failed to collect page data」로 죽는다(tsc·vitest 는 초록이다):\n` +
            missing.map((d) => `  · ${d}`).join("\n")
        : undefined,
    ).toEqual([]);
  });
});
