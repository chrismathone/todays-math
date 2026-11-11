/**
 * 문제 추출 시연 시험지 PDF 를 서버(app_setting)에 올린다 — 원장님 2026-11-11 «어디서든 아이디로 접속해 시연할 수 있게».
 * 시연 원본(`src/lib/studio-demo/source.ts`)과 크기 · SHA-256 이 같은 파일만 받는다. 읽는 것은 시연 계정뿐이다.
 *
 *   NODE_OPTIONS=--conditions=react-server npx tsx --env-file=.env scripts/studio-demo/upload-pdf.ts "<pdf 경로>"
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { STUDIO_DEMO_SOURCE } from "@/lib/studio-demo/source";
import { readStudioDemoPdf, writeStudioDemoPdf } from "@/lib/studio-demo/store";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("PDF 경로를 주세요.");
  const bytes = readFileSync(file);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (
    bytes.length !== STUDIO_DEMO_SOURCE.bytes ||
    sha256 !== STUDIO_DEMO_SOURCE.sha256
  )
    throw new Error(
      `시연 원본이 아닙니다 — ${bytes.length}바이트 · ${sha256.slice(0, 12)}…`,
    );
  await writeStudioDemoPdf(sha256, path.basename(file), bytes, null);
  const back = await readStudioDemoPdf(sha256);
  console.log(
    back
      ? `올렸습니다 — ${back.name} · ${back.bytes.byteLength}바이트`
      : "올렸지만 다시 읽지 못했습니다.",
  );
  await db.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
