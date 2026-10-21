/** SELECT only, in a verified READ ONLY snapshot — textbook rows that carry «[그림:n]» slot lines or shared-storage figures.
 * Writes their content to a LOCAL file outside the repo (textbook text is not committed); prints counts only.
 * node --env-file=<today_/.env> node_modules/tsx/dist/cli.mjs scripts/qa/dump-textbook-slot-rows-live.ts <out.json>
 */
import { lstatSync, realpathSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { readOnly, safeCode } from "../db/problem-actual-format";

async function main() {
  // 교과서 원문은 저장소에 싣지 않는다 — 출력 폴더가 저장소 밖일 때만 쓴다. 실제 경로로 견준다:
  // 외장 SSD 의 «새 볼륨»은 셸(NFC)과 Node(NFD)의 한글 정규화가 달라 글자 비교만으로는 저장소 안이 밖으로 보였다.
  const canonical = (dir: string) =>
    realpathSync.native(dir).normalize("NFC").toLowerCase();
  const repo = canonical(path.join(__dirname, "..", ".."));
  const target = process.argv[2] ? path.resolve(process.argv[2]) : "";
  const dir = target ? canonical(path.dirname(target)) : repo;
  // 이미 있는 출력이 링크면(심볼릭 · 하드) 쓰기가 링크를 따라 저장소 안 파일을 바꿀 수 있다 — 링크는 받지 않는다.
  const existing = target
    ? lstatSync(target, { throwIfNoEntry: false })
    : undefined;
  if (
    !target ||
    dir === repo ||
    dir.startsWith(repo + path.sep) ||
    existing?.isSymbolicLink() ||
    (existing && existing.nlink > 1)
  )
    throw new Error("OUTPUT_OUTSIDE_REPO_REQUIRED");
  const db = new PrismaClient({ log: [] });
  try {
    const rows = await readOnly(
      db,
      (tx) =>
        tx.$queryRaw<
          {
            id: string;
            content: string;
            figureUrls: string[];
            choiceFigureIndex: number[];
            figureSvg: boolean;
            slot: boolean;
            eligible: boolean;
          }[]
        >`
        SELECT p.id, p.content, p.figure_urls AS "figureUrls", p.choice_figure_index AS "choiceFigureIndex",
               p.figure_svg IS NOT NULL AS "figureSvg", p.content LIKE '%[그림:%' AS slot,
               (p.review_status = 'approved' AND p.direct_use_allowed AND p.answer <> '(정답 없음)') AS eligible
        FROM public.problem p
        WHERE p.pool = 'shared' AND p.source = 'school_textbook'
          AND (p.content LIKE '%[그림:%' OR cardinality(p.figure_urls) > 0)`,
    );
    const hosts = new Map<string, number>();
    for (const row of rows)
      for (const url of row.figureUrls) {
        const host = /^https?:\/\//.test(url)
          ? new URL(url).host.replace(/^[^.]+/, "<project>") +
            new URL(url).pathname.split("/").slice(0, 6).join("/")
          : url.split("/").slice(0, 2).join("/");
        hosts.set(host, (hosts.get(host) ?? 0) + 1);
      }
    await writeFile(target, JSON.stringify(rows));
    console.log(
      JSON.stringify(
        {
          rows: rows.length,
          slotRows: rows.filter((r) => r.slot).length,
          slotRowsEligible: rows.filter((r) => r.slot && r.eligible).length,
          figureRows: rows.filter((r) => r.figureUrls.length).length,
          hosts: Object.fromEntries(hosts),
        },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(`DUMP_FAILED ${safeCode(error)}`);
  process.exitCode = 1;
});
