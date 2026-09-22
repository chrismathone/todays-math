/**
 * 오류 기록 조회 — 메인 세션이 «왜 안 됐나»를 찾는 도구(원장님 2026-09-22 — 관리자 화면은 나중, 지금은 스크립트).
 *
 *   npx tsx scripts/logs/recent-errors.ts                         # 최근 24시간 30건
 *   npx tsx scripts/logs/recent-errors.ts --action figure-redraw --since 7d
 *   npx tsx scripts/logs/recent-errors.ts --group route           # 경로별 건수
 *   npx tsx scripts/logs/recent-errors.ts --id <uuid>             # 한 건 전체(시도 기록·zod 칸·모델 응답)
 *   npx tsx scripts/logs/recent-errors.ts --image <uuid> --out scratch/err   # 크롭 이미지를 파일로
 *
 * 읽기만 한다. `.env`(DATABASE_URL)는 `@next/env` 가 Next 와 같은 규칙으로 읽는다 — 워크트리에는 `.env` 가 없다.
 * 인자 읽기·기간·조건·찍는 모양은 `errorLogQuery.ts`(시험 있음).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

import {
  buildWhere,
  formatDetail,
  formatRow,
  kst,
  parseArgs,
  type DetailRow,
  type ListRow,
} from "./errorLogQuery";

// Next 와 같은 규칙으로 .env · .env.local 을 읽는다(tsx 는 CommonJS 로 옮겨 이름 가져오기가 된다 — .mjs 와 다르다)
loadEnvConfig(process.cwd());

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error((error as Error).message);
    process.exitCode = 2;
    return;
  }
  const db = new PrismaClient();
  try {
    if (args.mode === "image") {
      const image = await db.errorLogImage.findUnique({
        where: { errorLogId: args.id! },
      });
      if (!image) {
        console.error(`그림이 없다: ${args.id}`);
        process.exitCode = 1;
        return;
      }
      const dir = args.out ?? path.join("scratch", "error-log-images");
      mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${args.id}.${EXT[image.mimeType] ?? "bin"}`);
      writeFileSync(file, Buffer.from(image.data));
      console.log(`${file} (${image.mimeType}, ${image.byteSize} 바이트)`);
      return;
    }
    if (args.mode === "one") {
      const row = await db.errorLog.findUnique({
        where: { id: args.id! },
        include: { image: { select: { byteSize: true, mimeType: true } } },
      });
      if (!row) {
        console.error(`줄이 없다: ${args.id}`);
        process.exitCode = 1;
        return;
      }
      console.log(
        args.json
          ? JSON.stringify(row, null, 2)
          : formatDetail(row as unknown as DetailRow),
      );
      return;
    }
    const where = buildWhere(args);
    if (args.mode === "group") {
      const field = args.group!;
      const groups = await db.errorLog.groupBy({
        by: [field],
        where,
        _count: { _all: true },
        _max: { createdAt: true },
        orderBy: { _count: { [field]: "desc" } },
        take: args.limit,
      });
      if (args.json) {
        console.log(JSON.stringify(groups, null, 2));
        return;
      }
      console.log(`${field} 별 — ${args.since} 부터`);
      for (const group of groups) {
        const key = (group as Record<string, unknown>)[field];
        const latest = await db.errorLog.findFirst({
          where: { ...where, [field]: key ?? null },
          orderBy: { createdAt: "desc" },
          select: { message: true, id: true },
        });
        console.log(
          [
            String(group._count._all).padStart(5),
            group._max.createdAt ? kst(group._max.createdAt) : "-",
            String(key ?? "(없음)"),
            (latest?.message ?? "").replace(/\s+/g, " ").slice(0, 80),
            latest?.id ?? "",
          ].join("  "),
        );
      }
      return;
    }
    const rows = await db.errorLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: args.limit,
      select: {
        id: true,
        createdAt: true,
        source: true,
        kind: true,
        route: true,
        method: true,
        status: true,
        action: true,
        message: true,
        userId: true,
        image: { select: { byteSize: true } },
      },
    });
    if (args.json) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }
    console.log(
      `최근 ${rows.length}건 — ${args.since} 부터 (한 건 전체: --id <uuid>)`,
    );
    for (const row of rows) console.log(formatRow(row as ListRow));
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  const code = (error as { code?: unknown })?.code;
  console.error(
    code === "P2021"
      ? "error_log 표가 없다 — 마이그레이션(20260922120000_error_log)이 아직 적용되지 않았다."
      : error,
  );
  process.exitCode = 1;
});
