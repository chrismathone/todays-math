/**
 * 오늘의 개념 강의 등록 — 제작 도구 `meta.json` → **초안까지만** (D-123 ⑥′).
 *
 *   npx tsx scripts/concept/register-lectures.ts --meta=<meta.json> [--meta=…] [--unit=J30501] [--sort=N]
 *   npx tsx scripts/concept/register-lectures.ts --dir=<projects 폴더>     # <폴더>/<프로젝트>/output/meta.json
 *   npx tsx scripts/concept/register-lectures.ts … --offline              # DB 없이 — 시드 단원표, 중복 검사 없음
 *   ALLOW_CONCEPT_REGISTER=1 npx tsx scripts/concept/register-lectures.ts … --apply --actor=<관리자 이메일>
 *
 * **기본은 dry-run 이다.** 무엇을 만들고·건너뛰고·왜 실패하는지만 찍고 DB 에 쓰지 않는다.
 * `--apply` 는 두 겹으로 잠갔다(환경 변수 + 플래그) — 공유 DB 다.
 * **게시는 사람 버튼이다** — 이 CLI 는 초안만 만들고, 어떤 플래그로도 게시하지 않는다.
 *
 * 판단은 전부 `src/lib/concept/registerPlan.ts`(순수 계획기, 시험 있음)가 한다. 여기는
 * 파일을 읽고 · 차시표와 기존 강의를 가져와 · 계획을 찍고 · `--apply` 면 쓰는 껍데기다.
 * **판단을 여기 다시 적지 마라** — 수맥 CLI 는 판단과 쓰기가 한 파일에 섞여 시험이 없었다.
 *
 * ⚠️ 2026-09-15 현재 `concept_lecture` 표는 **공유 DB 에 없다**(마이그레이션 미적용 초안).
 *    dry-run 은 그 사실을 찍고 «기존 강의 없음»으로 계획한다. `--apply` 는 멈춘다.
 *
 * 쓰기는 `isAdmin` 계정만이다(강의는 서비스 공용 목록 — 브리프 §2.1). `--actor` 가 관리자가
 * 아니면 멈춘다 — 화면에서 못 하는 일은 CLI 로도 못 한다(수맥 원칙).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";

import { CURRICULUM_UNITS } from "../../prisma/seed-data/units";
import { conceptLectureDraftSchema } from "../../src/contracts/conceptLecture.contract";
import {
  planRegistration,
  summarizePlan,
  type ExistingLecture,
  type MetaSource,
  type PlanStep,
} from "../../src/lib/concept/registerPlan";
import { buildUnitCodePrefixes } from "../../src/lib/problemCode";

const USAGE = [
  "사용법: npx tsx scripts/concept/register-lectures.ts (--dir=<projects 폴더> | --meta=<meta.json> …)",
  "        [--unit=<차시 코드>] [--sort=N] [--offline] [--apply --actor=<관리자 이메일>]",
].join("\n");

const KNOWN_FLAGS = new Set([
  "dir",
  "meta",
  "unit",
  "sort",
  "offline",
  "apply",
  "actor",
]);

const args = process.argv.slice(2);
const has = (name: string) => args.includes(`--${name}`);
const valuesOf = (name: string) =>
  args
    .filter((a) => a.startsWith(`--${name}=`))
    .map((a) => a.slice(name.length + 3));
const valueOf = (name: string): string | undefined => valuesOf(name)[0];

function die(message: string, code = 2): never {
  console.error(message);
  process.exit(code);
}

/** `<projects>/<프로젝트>/output/meta.json` 을 훑는다 (렌더 산출물이 없는 프로젝트는 대상이 아니다) */
function scanDir(dir: string): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir).sort();
  } catch {
    die(`폴더를 읽을 수 없습니다: ${dir}`);
  }
  return entries
    .map((name) => path.join(dir, name, "output", "meta.json"))
    .filter((p) => {
      try {
        return statSync(p).isFile();
      } catch {
        return false;
      }
    });
}

/** 계획 줄에 찍을 이름 — 도구 산출물이면 프로젝트 폴더 이름, 아니면 경로 */
function labelOf(metaPath: string): string {
  const parent = path.dirname(metaPath);
  return path.basename(parent) === "output"
    ? path.basename(path.dirname(parent))
    : metaPath;
}

function readSource(metaPath: string): MetaSource {
  try {
    return { source: labelOf(metaPath), raw: readFileSync(metaPath, "utf8") };
  } catch {
    return { source: labelOf(metaPath), raw: null };
  }
}

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function printStep(step: PlanStep): void {
  if (step.kind === "create") {
    const d = step.draft;
    console.log(`✓ 만들기  ${step.source}`);
    console.log(`    «${d.title}» → ${step.unitCode} ${step.unitLabel}`);
    console.log(
      `    길이 ${clock(d.seconds)} · 순서 ${d.sortOrder} · ` +
        `주소 ${d.videoUrl ?? "없음(주소 없는 초안)"} · 잡 ${d.sourceJobId ?? "없음"} · ` +
        `고지 ${d.disclosure ? "있음" : "없음"}`,
    );
  } else if (step.kind === "skip") {
    console.log(`- 건너뜀  ${step.source}\n    ${step.reason}`);
  } else {
    console.log(`✗ 실패    ${step.source}\n    ${step.reason}`);
  }
}

async function loadExisting(
  prisma: PrismaClient,
): Promise<{ rows: ExistingLecture[]; tableMissing: boolean }> {
  try {
    const rows = await prisma.conceptLecture.findMany({
      select: {
        id: true,
        title: true,
        status: true,
        sourceJobId: true,
        videoUrl: true,
      },
    });
    return { rows, tableMissing: false };
  } catch (e) {
    // P2021 = 표가 없다 — 마이그레이션이 아직 적용되지 않았다
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2021"
    ) {
      return { rows: [], tableMissing: true };
    }
    throw e;
  }
}

async function main(): Promise<number> {
  const unknown = args.filter(
    (a) => a.startsWith("--") && !KNOWN_FLAGS.has(a.slice(2).split("=")[0]!),
  );
  if (unknown.length > 0)
    die(`${USAGE}\n\n모르는 플래그: ${unknown.join(" ")}`);

  const apply = has("apply");
  const offline = has("offline");
  const dir = valueOf("dir");
  const metaPaths = [
    ...(dir ? scanDir(dir) : []),
    ...valuesOf("meta").map((p) => path.resolve(p)),
    // 플래그가 아닌 나머지도 meta.json 경로로 받는다 (셸 글롭 편의)
    ...args.filter((a) => !a.startsWith("--")).map((p) => path.resolve(p)),
  ];
  if (metaPaths.length === 0) {
    die(
      `${USAGE}\n\n대상을 지정하세요 — --dir=<projects 폴더> 또는 --meta=<meta.json>.`,
    );
  }
  if (apply) {
    if (offline)
      die(
        "--apply 와 --offline 은 같이 쓸 수 없습니다 — 쓰기에는 DB 의 차시 id 가 필요합니다.",
      );
    if (process.env.ALLOW_CONCEPT_REGISTER !== "1") {
      die(
        "--apply 는 ALLOW_CONCEPT_REGISTER=1 과 함께만 돕니다 — 공유 DB 에 씁니다.",
      );
    }
    if (!valueOf("actor"))
      die(
        "--apply 에는 --actor=<관리자 이메일> 이 필요합니다 — 누가 만든 강의인지 없이 쓰지 않습니다.",
      );
  }
  if (!offline && !process.env.DATABASE_URL) {
    die(
      "DATABASE_URL 이 없습니다. DB 없이 계획만 보려면 --offline 을 주세요(시드 단원표, 중복 검사 없음).",
    );
  }

  const sources = metaPaths.map(readSource);
  const sortArg = valueOf("sort");

  const prisma = offline ? null : new PrismaClient();
  try {
    /* 차시표 — 온라인은 DB 의 unit 행, 오프라인은 시드에서 같은 규칙(`buildUnitCodePrefixes`)으로.
     * `Unit.problemCodePrefix` 는 그 함수의 산출물이다(schema.prisma 주석) — 규칙을 여기 다시 적지 않는다. */
    const unitIdByCode = new Map<string, string>();
    const units = new Map<string, string>();
    if (prisma) {
      const rows = await prisma.unit.findMany({
        select: {
          id: true,
          problemCodePrefix: true,
          grade: true,
          chapter: true,
          section: true,
        },
      });
      for (const u of rows) {
        units.set(
          u.problemCodePrefix,
          `${u.grade} · ${u.chapter} · ${u.section}`,
        );
        unitIdByCode.set(u.problemCodePrefix, u.id);
      }
    } else {
      for (const u of buildUnitCodePrefixes(CURRICULUM_UNITS)) {
        units.set(u.prefix, `${u.grade} · ${u.chapter} · ${u.section}`);
      }
    }

    const existing = prisma
      ? await loadExisting(prisma)
      : { rows: [], tableMissing: false };

    const plan = planRegistration({
      sources,
      units,
      existing: existing.rows,
      unitOverride: valueOf("unit") ?? null,
      sortOverride: sortArg === undefined ? null : Number(sortArg),
    });
    if (!plan.ok) die(plan.message);

    console.log(
      `\n대상 ${sources.length}건 · ${prisma ? "DB 차시표" : "오프라인(시드 차시표)"}` +
        (apply ? " · --apply" : " · dry-run"),
    );
    if (!prisma)
      console.log(
        "  ⚠️ 오프라인 — 이미 등록된 강의와의 중복은 보지 못했습니다.",
      );
    if (existing.tableMissing) {
      console.log(
        "  ⚠️ concept_lecture 표가 공유 DB 에 아직 없습니다(마이그레이션 미적용) — 기존 강의 없음으로 계획했습니다.",
      );
    }
    console.log("─".repeat(64));
    for (const step of plan.steps) printStep(step);

    const sum = summarizePlan(plan.steps);
    console.log(`\n${"═".repeat(64)}`);
    console.log(
      `  만들기 ${sum.create}건 · 건너뜀 ${sum.skip}건 · 실패 ${sum.fail}건` +
        (apply ? "" : " (dry-run — DB 에 쓰지 않음)"),
    );

    if (apply && prisma) {
      if (existing.tableMissing) {
        die(
          "concept_lecture 표가 없어 쓰지 않았습니다 — 원장님 확인 뒤 마이그레이션을 적용하고 다시 돌리세요.",
          1,
        );
      }
      const actorEmail = valueOf("actor")!;
      const actor = await prisma.user.findFirst({
        where: {
          email: { equals: actorEmail, mode: "insensitive" },
          deletedAt: null,
        },
        select: { id: true, email: true, isAdmin: true },
      });
      if (!actor) die(`계정을 찾을 수 없습니다: ${actorEmail}`, 1);
      if (!actor.isAdmin)
        die(
          `${actor.email} 은 관리자가 아닙니다 — 강의 쓰기는 관리자만 합니다.`,
          1,
        );

      const creates = plan.steps.filter(
        (s): s is Extract<PlanStep, { kind: "create" }> => s.kind === "create",
      );
      const ids = await prisma.$transaction(async (tx) => {
        const out: string[] = [];
        for (const step of creates) {
          // 계약을 한 번 더 지난다 — 계획과 쓰기 사이에 차시 id 가 붙는 자리다.
          const data = conceptLectureDraftSchema.parse({
            ...step.draft,
            unitId: unitIdByCode.get(step.unitCode),
          });
          const row = await tx.conceptLecture.create({
            // 언제나 draft 다. 게시는 사람이 화면에서 누른다 — 이 CLI 에는 게시 길이 없다.
            data: { ...data, status: "draft", createdById: actor.id },
            select: { id: true },
          });
          out.push(row.id);
        }
        return out;
      });
      console.log(
        `  초안 ${ids.length}건을 만들었습니다 — 학생에게 보이려면 검수 후 게시하세요.`,
      );
      for (const id of ids) console.log(`    ${id}`);
    }
    console.log("═".repeat(64));
    return sum.fail > 0 ? 1 : 0;
  } finally {
    await prisma?.$disconnect();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
