// @vitest-environment node
/**
 * **운영 함수 묶음 안에서** PDF 자산 라우트가 도는가.
 *
 * ## 왜 있나
 *
 * 2026-09-19 운영 로그(원장님이 붙여 주심):
 *
 * ```
 * GET 500 /api/studio/pdf-assets/wasm/qcms_bg.wasm
 * Error: Cannot find module 'pdfjs-dist/package.json'
 * Require stack: - /var/task/package.json
 * ```
 *
 * 라우트는 패키지 뿌리를 `pdfjs-dist/package.json` 으로 찾는다. Vercel 함수에는
 * `next.config.ts` 의 `outputFileTracingIncludes` 가 실어 준 cmaps·글꼴·wasm 만 있고
 * **그 package.json 이 없었다.** 그래서 세 갈래가 전부 500 이었고, 브라우저는 빈 wasm 을
 * 받아 색 관리(qcms)를 건너뛰었다(`BufferSource argument is empty`).
 *
 * 🔴 옆 시험(`studioWorkspace.test.ts`)은 저장소의 `node_modules` **전체**를 보고 돌아서
 *    이것을 구조적으로 못 본다 — 그 시험은 그날도 초록이었다.
 *
 * ## 어떻게 흉내 내나
 *
 * 설정이 이 라우트에 싣는 파일**만** 임시 폴더에 옮겨 놓고 `process.cwd()` 를 그리로
 * 돌린다(`/var/task` 대역). 키 매칭·글롭은 Next 가 빌드 때 쓰는 것을 그대로 쓴다
 * (`next/dist/build/collect-build-traces.js` 의 apply-include-excludes 단계 —
 * `normalizeAppPath` + picomatch `{ dot, contains }` + `next/dist/compiled/glob`).
 * 그다음 설치본을 보는 라우트와 **같은 요청**을 해서 상태·바이트가 같은지 견준다.
 *
 * ## ⚠️ 이 시험이 못 보는 것
 *
 * - nft 가 import 를 따라가 **스스로** 싣는 파일은 여기 없다 — 명시한 것만 흉내 낸다(하한).
 *   그래서 «여기서 초록이면 운영 묶음에도 있다» 쪽으로만 믿는다.
 * - 실제로 실렸는지는 빌드 산출물
 *   `.next/server/app/api/studio/pdf-assets/[kind]/[filename]/route.js.nft.json` 이 증명한다.
 */
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/studio-ai/guard", () => ({
  authorizeStudio: vi.fn(async () => ({
    user: { id: "owner-17" },
    response: null,
  })),
}));

import nextConfig from "../../../next.config";
import { GET } from "@/app/api/studio/pdf-assets/[kind]/[filename]/route";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");
const require = createRequire(import.meta.url);
const picomatch = require("next/dist/compiled/picomatch") as (
  glob: string,
  options: { dot: boolean; contains: boolean },
) => (path: string) => boolean;
const glob = require("next/dist/compiled/glob") as {
  sync(
    pattern: string,
    options: { cwd: string; nodir: boolean; dot: boolean },
  ): string[];
};
const { normalizeAppPath } =
  require("next/dist/shared/lib/router/utils/app-paths") as {
    normalizeAppPath(route: string): string;
  };

/** Next 가 이 라우트의 트레이스 파일 이름에 쓰는 엔트리 이름. */
const ENTRY = "app/api/studio/pdf-assets/[kind]/[filename]/route";

/** Next 와 같은 규칙으로 이 라우트에 붙는 포함 글롭을 모은다. */
function includesFor(entryName: string): string[] {
  const route = normalizeAppPath(entryName);
  const table = nextConfig.outputFileTracingIncludes ?? {};
  return Object.keys(table)
    .filter((key) => picomatch(key, { dot: true, contains: true })(route))
    .flatMap((key) => table[key]);
}

const installedRoot = dirname(require.resolve("pdfjs-dist/package.json"));
let task = "";

beforeAll(() => {
  task = mkdtempSync(join(tmpdir(), "pdf-assets-lambda-"));
  for (const pattern of includesFor(ENTRY))
    for (const file of glob.sync(pattern, {
      cwd: ROOT,
      nodir: true,
      dot: true,
    })) {
      mkdirSync(dirname(join(task, file)), { recursive: true });
      copyFileSync(join(ROOT, file), join(task, file));
    }
});
afterAll(() => {
  if (task) rmSync(task, { recursive: true, force: true });
});

const request = new Request("https://math.example/api/studio/pdf-assets");
async function fetchAsset(cwd: string, kind: string, filename: string) {
  const stand = vi.spyOn(process, "cwd").mockReturnValue(cwd);
  try {
    const response = await GET(request, {
      params: Promise.resolve({ kind, filename }),
    });
    return {
      status: response.status,
      type: response.headers.get("content-type"),
      bytes: Buffer.from(await response.arrayBuffer()),
    };
  } finally {
    stand.mockRestore();
  }
}

/** 클라이언트(`StudioView` 의 `getDocument`)가 이 라우트로 받는 세 갈래 전부. */
const served = ["cmaps", "standard_fonts", "wasm"].flatMap((kind) =>
  readdirSync(join(installedRoot, kind)).map(
    (filename) => [kind, filename] as const,
  ),
);

describe("PDF assets inside the traced production function", () => {
  it("the stand-in function root cannot borrow pdfjs-dist from a parent node_modules", () => {
    // 부모 폴더에서 패키지를 빌려 오면 이 시험은 거짓 초록이 된다.
    const outside = createRequire(join(dirname(task), "package.json"));
    expect(() => outside.resolve("pdfjs-dist/package.json")).toThrow();
  });

  it("the configured includes reach this route at all", () => {
    expect(includesFor(ENTRY).length).toBeGreaterThan(0);
  });

  it.each([
    ["wasm", "qcms_bg.wasm", "application/wasm"],
    ["wasm", "jbig2.wasm", "application/wasm"],
    ["wasm", "openjpeg.wasm", "application/wasm"],
    ["cmaps", "UniKS-UTF16-H.bcmap", "application/octet-stream"],
    ["standard_fonts", "FoxitSerif.pfb", "application/octet-stream"],
    ["standard_fonts", "LiberationSans-Regular.ttf", "font/ttf"],
  ])(
    "serves %s/%s from the function root as the installed bytes",
    async (kind, filename, mime) => {
      const expected = await readFile(join(installedRoot, kind, filename));
      const lambda = await fetchAsset(task, kind, filename);
      expect(lambda.status).toBe(200);
      expect(lambda.type).toBe(mime);
      expect(expected.length).toBeGreaterThan(0);
      expect(lambda.bytes.equals(expected)).toBe(true);
    },
  );

  it(`answers every installed cmaps/standard_fonts/wasm file (${served.length}) exactly as the full install does`, async () => {
    expect(served.length).toBeGreaterThan(100);
    const mismatches: string[] = [];
    for (const [kind, filename] of served) {
      const full = await fetchAsset(ROOT, kind, filename);
      const lambda = await fetchAsset(task, kind, filename);
      if (
        full.status !== lambda.status ||
        full.type !== lambda.type ||
        !full.bytes.equals(lambda.bytes)
      )
        mismatches.push(
          `${kind}/${filename}: ${full.status} → ${lambda.status}`,
        );
    }
    expect(mismatches).toEqual([]);
  });
});
