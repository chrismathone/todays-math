import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  type SharedFigureRouteContext,
  createSharedFigureAssetHandler,
} from "@/lib/sharedFigureAssets";
import { loadSharedFigureManifest } from "@/lib/sharedFigureManifest";

import type { FigureLoader } from "../snapshotFromProblem";

/** 그림 한 장의 상한 — 넘으면 못 읽은 것으로 친다(담기가 사유와 함께 뺀다) */
export const FIGURE_MAX_BYTES = 16 * 1024 * 1024;

const PUBLIC_DIR = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "public",
);

/**
 * 은행 문항의 그림 주소(`/figures/…` · `/figures-svg/…`)에서 바이트를 읽는다.
 *
 * 화면이 그 주소를 여는 차례와 같다(`next.config.ts` 의 rewrite): 배포본의 파일이 먼저, 없으면 공유 그림 저장소.
 * 저장소에서 읽을 때는 기존 `createSharedFigureAssetHandler` 를 그대로 부른다 — 명부의 해시로 바이트를 검증하는
 * 그 코드를 다시 쓰지 않는다. 주소는 DB 에 적힌 것이지만 한 번 더 본다: `public` 밖으로 못 나간다.
 *
 * ⚠️ 서버리스 배포에서 `/api/textbook/**` 가 명부 파일(`src/config/shared-figures.manifest.json`)을 읽으려면
 *    `next.config.ts` 의 `outputFileTracingIncludes` 에 그 경로가 있어야 한다(지금은 `/api/shared-figures/**` 만 있다).
 */
export function createFigureLoader(): FigureLoader {
  let shared: ReturnType<typeof createSharedFigureAssetHandler> | null = null;
  const sharedHandler = () => {
    if (shared) return shared;
    const baseUrl = process.env.SHARED_FIGURE_CDN_BASE_URL;
    if (!baseUrl) return null;
    shared = createSharedFigureAssetHandler({
      manifest: loadSharedFigureManifest(),
      baseUrl,
    });
    return shared;
  };

  return async (url) => {
    const segments = url.split("/").filter(Boolean);
    const [kind, ...rest] = segments;
    if ((kind !== "figures" && kind !== "figures-svg") || rest.length === 0)
      return null;
    if (
      segments.some(
        (part) => part === "." || part === ".." || part.includes("\\"),
      )
    )
      return null;

    const file = path.join(/* turbopackIgnore: true */ PUBLIC_DIR, ...segments);
    if (file.startsWith(PUBLIC_DIR + path.sep)) {
      try {
        const bytes = await readFile(file);
        return bytes.byteLength <= FIGURE_MAX_BYTES ? bytes : null;
      } catch {
        // 배포본에 없다 — 공유 저장소로 간다
      }
    }

    const handler = sharedHandler();
    if (!handler) return null;
    const context: SharedFigureRouteContext = {
      params: Promise.resolve({ kind, path: rest }),
    };
    const response = await handler(
      new Request(
        `https://figures.invalid/${segments.map(encodeURIComponent).join("/")}`,
      ),
      context,
    );
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.byteLength > 0 && bytes.byteLength <= FIGURE_MAX_BYTES
      ? bytes
      : null;
  };
}
