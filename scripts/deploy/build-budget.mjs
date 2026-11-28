import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * 운영 빌드 산출물 예산 (P3a — `docs/planning/build-memory-plan-20261128.md`).
 *
 * 2026-11-28 의 Vercel OOM 은 데이터가 코드로 묶여 서버 청크가 11MB 씩 두 벌, 그 위에
 * 서버 소스맵 336MB 가 얹힌 모양이었다. 그 모양(큰 청크 · 소스맵 · 새 큰 청크)이 다시
 * 생기면 빌드가 끝난 자리에서 운다. 한도와 기준선은 `build-budget.json`.
 * 시험: `src/__tests__/unit/buildBudget.test.ts`.
 */
export function measureBuild(dist, { largeChunkBytes = 3_000_000 } = {}) {
  const side = (name) => {
    const root = join(dist, name);
    let bytes = 0;
    let maps = 0;
    const chunks = [];
    for (const item of readdirSync(root, {
      recursive: true,
      withFileTypes: true,
    })) {
      if (!item.isFile()) continue;
      const path = join(item.parentPath, item.name);
      if (item.name.endsWith(".js.map")) maps++;
      if (!item.name.endsWith(".js")) continue;
      const size = statSync(path).size;
      bytes += size;
      chunks.push({ path: relative(dist, path), bytes: size });
    }
    if (chunks.length === 0) throw new Error(`No JS to measure at ${root}`);
    chunks.sort((a, b) => b.bytes - a.bytes);
    return { bytes, maps, chunks };
  };
  const server = side("server");
  const browser = side("static");
  // 경로마다 같은 내용으로 나온 청크는 한 번만 센다 — 새 데이터가 아니다.
  const large = new Map();
  for (const chunk of server.chunks) {
    if (chunk.bytes <= largeChunkBytes) break;
    const digest = createHash("sha256")
      .update(readFileSync(join(dist, chunk.path)))
      .digest("hex");
    if (!large.has(digest)) large.set(digest, chunk);
  }
  return {
    serverJsBytes: server.bytes,
    serverMaxChunk: server.chunks[0],
    serverMaps: server.maps,
    staticJsBytes: browser.bytes,
    staticMaxChunk: browser.chunks[0],
    largeServerChunks: [...large.values()],
  };
}

const mb = (bytes) => `${(bytes / 1e6).toFixed(2)}MB`;

export function judgeBuild(measured, { limits, baseline, warnGrowth }) {
  const failures = [];
  const warnings = [];
  if (measured.serverMaps > limits.serverMaps)
    failures.push(
      `서버 소스맵 ${measured.serverMaps}개 — 2026-11-28 OOM 의 한 원인이다(한도 ${limits.serverMaps})`,
    );
  if (measured.serverJsBytes > limits.serverJsBytes)
    failures.push(
      `서버 JS 합계 ${mb(measured.serverJsBytes)} > 한도 ${mb(limits.serverJsBytes)}`,
    );
  if (measured.serverMaxChunk.bytes > limits.serverMaxChunkBytes)
    failures.push(
      `서버 청크 ${measured.serverMaxChunk.path} ${mb(measured.serverMaxChunk.bytes)} > 한도 ${mb(limits.serverMaxChunkBytes)} — 데이터가 코드로 묶이지 않았나`,
    );
  if (measured.staticJsBytes > limits.staticJsBytes)
    failures.push(
      `브라우저 JS 합계 ${mb(measured.staticJsBytes)} > 한도 ${mb(limits.staticJsBytes)}`,
    );
  if (measured.staticMaxChunk.bytes > limits.staticMaxChunkBytes)
    failures.push(
      `브라우저 청크 ${measured.staticMaxChunk.path} ${mb(measured.staticMaxChunk.bytes)} > 한도 ${mb(limits.staticMaxChunkBytes)}`,
    );
  if (measured.largeServerChunks.length > limits.largeServerChunks)
    failures.push(
      `${mb(limits.largeChunkBytes)} 넘는 큰 서버 청크 ${measured.largeServerChunks.length}개 > 한도 ${limits.largeServerChunks}: ` +
        measured.largeServerChunks
          .map((c) => `${c.path} ${mb(c.bytes)}`)
          .join(", ") +
        " — 새 데이터라면 trace 된 파일로, 정말 코드라면 build-budget.json 을 고쳐 커밋한다",
    );
  for (const [key, value] of [
    ["serverJsBytes", measured.serverJsBytes],
    ["serverMaxChunkBytes", measured.serverMaxChunk.bytes],
    ["staticJsBytes", measured.staticJsBytes],
    ["staticMaxChunkBytes", measured.staticMaxChunk.bytes],
  ])
    if (value > baseline[key] * (1 + warnGrowth))
      warnings.push(
        `${key} ${mb(value)} — 기준선 ${mb(baseline[key])} 보다 ${Math.round((value / baseline[key] - 1) * 100)}% 늘었다`,
      );
  return { failures, warnings };
}
