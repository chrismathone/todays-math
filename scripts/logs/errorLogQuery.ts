/**
 * 오류 기록 조회의 순수한 부분 — 인자 읽기 · 기간 · 조건 · 찍는 모양. DB 에 닿는 것은 `recent-errors.ts`.
 * 시험: src/__tests__/unit/errorLogQuery.test.ts
 */
import { ERROR_LOG_KINDS } from "../../src/contracts/errorLogValues";

export const GROUP_FIELDS = [
  "route",
  "action",
  "kind",
  "status",
  "message",
  "source",
] as const;
export type GroupField = (typeof GROUP_FIELDS)[number];

export type QueryArgs = {
  mode: "list" | "group" | "one" | "image";
  limit: number;
  since: string;
  route?: string;
  action?: string;
  kind?: string;
  status?: number;
  source?: "server" | "client";
  userId?: string;
  group?: GroupField;
  id?: string;
  out?: string;
  json: boolean;
};

const VALUE_FLAGS = new Set([
  "--limit",
  "--since",
  "--route",
  "--action",
  "--kind",
  "--status",
  "--source",
  "--user",
  "--group",
  "--id",
  "--image",
  "--out",
]);

export function parseArgs(argv: string[]): QueryArgs {
  const args: QueryArgs = {
    mode: "list",
    limit: 30,
    since: "24h",
    json: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--json") {
      args.json = true;
      continue;
    }
    if (flag === "--help" || flag === "-h") throw new Error(USAGE);
    if (!VALUE_FLAGS.has(flag))
      throw new Error(`모르는 인자: ${flag}\n\n${USAGE}`);
    const value = argv[++i];
    if (value === undefined) throw new Error(`${flag} 에 값이 없다`);
    switch (flag) {
      case "--limit": {
        const n = Number(value);
        if (!Number.isInteger(n) || n < 1 || n > 1000)
          throw new Error(`--limit 은 1~1000: ${value}`);
        args.limit = n;
        break;
      }
      case "--since":
        args.since = value;
        break;
      case "--route":
        args.route = value;
        break;
      case "--action":
        args.action = value;
        break;
      case "--kind":
        if (!(ERROR_LOG_KINDS as readonly string[]).includes(value))
          throw new Error(
            `종류는 ${ERROR_LOG_KINDS.join(" · ")} 중 하나: ${value}`,
          );
        args.kind = value;
        break;
      case "--status": {
        const n = Number(value);
        if (!Number.isInteger(n)) throw new Error(`--status 는 숫자: ${value}`);
        args.status = n;
        break;
      }
      case "--source":
        if (value !== "server" && value !== "client")
          throw new Error(`--source 는 server · client: ${value}`);
        args.source = value;
        break;
      case "--user":
        args.userId = value;
        break;
      case "--group":
        if (!(GROUP_FIELDS as readonly string[]).includes(value))
          throw new Error(
            `묶음은 ${GROUP_FIELDS.join(" · ")} 중 하나: ${value}`,
          );
        args.mode = "group";
        args.group = value as GroupField;
        break;
      case "--id":
        args.mode = "one";
        args.id = value;
        break;
      case "--image":
        args.mode = "image";
        args.id = value;
        break;
      case "--out":
        args.out = value;
        break;
    }
  }
  return args;
}

/** `6h` · `7d` · `30m` · `2026-09-20`(그날 0시 UTC) · ISO 시각 */
export function parseSince(text: string, now = new Date()): Date {
  const relative = /^(\d+)([mhd])$/.exec(text);
  if (relative) {
    const unit = { m: 60_000, h: 3_600_000, d: 86_400_000 }[
      relative[2] as "m" | "h" | "d"
    ];
    return new Date(now.getTime() - Number(relative[1]) * unit);
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const date = new Date(text.length === 10 ? `${text}T00:00:00.000Z` : text);
    if (!Number.isNaN(date.getTime())) return date;
  }
  throw new Error(`기간을 못 읽었다: ${text} (예: 6h · 7d · 30m · 2026-09-20)`);
}

export function buildWhere(args: QueryArgs, now = new Date()) {
  return {
    createdAt: { gte: parseSince(args.since, now) },
    ...(args.route ? { route: args.route } : {}),
    ...(args.action ? { action: args.action } : {}),
    ...(args.kind ? { kind: args.kind } : {}),
    ...(args.status !== undefined ? { status: args.status } : {}),
    ...(args.source ? { source: args.source } : {}),
    ...(args.userId ? { userId: args.userId } : {}),
  };
}

/** 한국 시각 `MM-DD HH:mm:ss` */
export function kst(date: Date): string {
  const shifted = new Date(date.getTime() + 9 * 3_600_000);
  return shifted.toISOString().slice(5, 19).replace("T", " ");
}

const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)}KB`;

export type ListRow = {
  id: string;
  createdAt: Date;
  source: string;
  kind: string;
  route: string | null;
  method: string | null;
  status: number | null;
  action: string | null;
  message: string | null;
  userId: string | null;
  image: { byteSize: number } | null;
};

export function formatRow(row: ListRow): string {
  const where = [row.method, row.route].filter(Boolean).join(" ") || "-";
  const message = (row.message ?? "").replace(/\s+/g, " ").slice(0, 90);
  return [
    kst(row.createdAt),
    row.kind.padEnd(21),
    String(row.status ?? "-").padStart(3),
    where,
    row.action ? `[${row.action}]` : "",
    message,
    row.image ? `[그림 ${kb(row.image.byteSize)}]` : "",
    row.id,
  ]
    .filter(Boolean)
    .join("  ");
}

export type DetailRow = ListRow & {
  detail: string | null;
  context: unknown;
  release: string | null;
  requestId: string | null;
  durationMs: number | null;
  image: { byteSize: number; mimeType?: string } | null;
};

export function formatDetail(row: DetailRow): string {
  return [
    `id        ${row.id}`,
    `시각      ${kst(row.createdAt)} (KST) · ${row.createdAt.toISOString()}`,
    `종류      ${row.source} / ${row.kind}`,
    `요청      ${[row.method, row.route].filter(Boolean).join(" ") || "-"} → ${row.status ?? "-"}${row.durationMs !== null ? ` · ${row.durationMs}ms` : ""}`,
    `작업      ${row.action ?? "-"}`,
    `사용자    ${row.userId ?? "-"}`,
    `배포      ${row.release ?? "-"} · 요청 번호 ${row.requestId ?? "-"}`,
    `그림      ${row.image ? `${row.image.mimeType ?? ""} ${kb(row.image.byteSize)} — --image ${row.id} 로 저장` : "-"}`,
    "",
    "── 화면 문구 ──",
    row.message ?? "-",
    "",
    "── 원문(detail) ──",
    row.detail ?? "-",
    "",
    "── 요약(context) ──",
    JSON.stringify(row.context, null, 2),
  ].join("\n");
}

export const USAGE = `오류 기록 조회 — npx tsx scripts/logs/recent-errors.ts [인자]
  (기본) 최근 24시간 30건            --limit N · --since 6h|7d|30m|2026-09-20
  거르기  --route /api/studio/ai · --action figure-redraw · --kind ai-rejected · --status 422
          --source server|client · --user <uuid>
  묶음    --group route|action|kind|status|message|source   (건수 · 마지막 시각 · 대표 문구)
  한 건   --id <uuid>                 (원문 전체 · 요약 JSON — 시도 기록·zod 칸·모델 응답)
  그림    --image <uuid> [--out 폴더] (크롭 이미지를 파일로)
  --json  기계용 출력`;
