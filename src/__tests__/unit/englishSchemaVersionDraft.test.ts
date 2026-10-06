// @vitest-environment node
/**
 * 오늘의 영어 — «형식 판» SQL 초안의 문지기 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §C).
 *
 * 초안은 **미적용**이다. 이 시험이 지키는 것은 둘이다.
 *   ⑴ 초안이 더하기만 한다(칸 둘 · CHECK 하나, `english_question_set` 하나에만) — 지우거나 고치는 문장이 끼면 운다.
 *   ⑵ 🔴 **초안이 적용되기 전에 코드가 새 칸을 읽지 않는다.** `prisma/schema.prisma` 에 칸이 들어가는 순간 Prisma 는 모든
 *      세트 읽기에서 그 칸을 SELECT 한다 — 칸 없는 DB 에서 «column does not exist» 로 전부 500 이다(DB 먼저 · 코드 나중).
 *      초안이 `prisma/migrations/` 에 들어가면 `prisma migrate` 가 «안 한 마이그레이션»으로 본다.
 *      M1 에서 실제로 적용할 때 이 시험의 ⑵ 를 **적용 기록과 함께** 고친다 — 그 전에 초록으로 만들려고 지우지 않는다.
 *
 * CHECK 의 동작(임시 표의 표본 · 드라이런)은 DB 가 있어야 잰다 — 여기서는 안 잰다(25번 문서가 아니라 위 문서 §C.4).
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  CONSTRAINT_PROBES,
  DRAFT_PATH,
  EXPECTED_STATEMENTS,
  NEW_CHECKS,
  NEW_COLUMNS,
  REVERT_STATEMENTS,
  TABLE,
  lintAdditiveDraft,
  splitSqlStatements,
} from "../../../scripts/qa/english-schema-version/checks";
import { withoutComments } from "../helpers/sourceComments";

const ROOT = path.resolve(__dirname, "../../..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const draft = read(DRAFT_PATH);

describe("형식 판 SQL 초안 — 더하기만 한다", () => {
  it("문장은 셋 — 칸 둘과 CHECK 하나, 전부 english_question_set 에 더하기", () => {
    const lint = lintAdditiveDraft(draft);
    expect(lint.problems).toEqual([]);
    expect(lint.statements).toHaveLength(EXPECTED_STATEMENTS);
    expect(lint.added).toEqual([
      { kind: "COLUMN", name: "schema_version" },
      { kind: "COLUMN", name: "payload_v2" },
      {
        kind: "CONSTRAINT",
        name: "english_question_set_payload_matches_version",
      },
    ]);
  });

  it("기존 행은 1판이 된다 — schema_version 은 NOT NULL DEFAULT 1, 2판 본문은 NULL 허용", () => {
    const [version, payload] = splitSqlStatements(draft);
    expect(version).toMatch(/"schema_version" SMALLINT NOT NULL DEFAULT 1$/);
    expect(payload).toMatch(/"payload_v2" JSONB$/);
  });

  it("🔴 본문의 판은 `@>` 로 잰다 — `->` 로 견주면 빈 객체가 NULL 로 통과한다", () => {
    const check = splitSqlStatements(draft)[2]!;
    expect(check).toContain(`"payload_v2" @> '{"schemaVersion": 2}'::jsonb`);
    expect(check).not.toMatch(/"payload_v2"\s*->/);
    expect(check).toContain(`"payload_v2" IS NOT NULL`);
    expect(check).toContain(`jsonb_array_length("questions") = 0`);
  });

  it.each([
    ["칸을 지운다", `ALTER TABLE "english_question_set" DROP COLUMN "meta";`],
    ["행을 고친다", `UPDATE "english_question_set" SET "status" = '초안';`],
    ["행을 지운다", `DELETE FROM "english_question_set";`],
    ["다른 표를 만진다", `ALTER TABLE "english_material" ADD COLUMN "x" INT;`],
    [
      "칸의 형을 바꾼다",
      `ALTER TABLE "english_question_set" ALTER COLUMN "passage" SET DATA TYPE VARCHAR(10);`,
    ],
    ["새 표를 만든다", `CREATE TABLE "english_asset" ("id" UUID);`],
  ])("정적 검사가 운다 — %s", (_name, statement) => {
    expect(lintAdditiveDraft(`${draft}\n${statement}\n`).problems).not.toEqual(
      [],
    );
  });

  it("칸이나 CHECK 가 하나 빠져도 운다", () => {
    const withoutCheck =
      splitSqlStatements(draft).slice(0, 2).join(";\n") + ";";
    const problems = lintAdditiveDraft(withoutCheck).problems;
    expect(problems.join("\n")).toContain(NEW_CHECKS[0]);
  });

  it("되돌리기는 더한 것만 거꾸로 지운다 — CHECK 먼저, 그다음 칸", () => {
    expect([...REVERT_STATEMENTS]).toEqual([
      `ALTER TABLE "english_question_set" DROP CONSTRAINT IF EXISTS "english_question_set_payload_matches_version"`,
      `ALTER TABLE "english_question_set" DROP COLUMN IF EXISTS "payload_v2"`,
      `ALTER TABLE "english_question_set" DROP COLUMN IF EXISTS "schema_version"`,
    ]);
  });

  it("CHECK 표본은 받을 것과 거절할 것을 다 갖고 있다", () => {
    const passing = CONSTRAINT_PROBES.filter((probe) => probe.pass);
    const failing = CONSTRAINT_PROBES.filter((probe) => !probe.pass);
    // 받을 것이 없으면 «전부 거절»이 표본의 INSERT 꼴이 틀려서인지 CHECK 때문인지 가릴 수 없다
    expect(passing).toHaveLength(2);
    expect(failing.length).toBeGreaterThanOrEqual(8);
    expect(new Set(CONSTRAINT_PROBES.map((p) => p.name)).size).toBe(
      CONSTRAINT_PROBES.length,
    );
  });
});

describe("🔴 형식 판 SQL 초안 — 미적용인 동안의 문", () => {
  it("초안은 prisma/migrations 밖에 있다 — prisma migrate 가 모른다", () => {
    expect(DRAFT_PATH.startsWith("prisma/drafts/")).toBe(true);
    const migrations = readdirSync(path.join(ROOT, "prisma/migrations"));
    expect(
      migrations.filter((name) => /schema_version|payload_v2/i.test(name)),
    ).toEqual([]);
    for (const name of migrations) {
      if (name === "migration_lock.toml") continue;
      const sql = read(`prisma/migrations/${name}/migration.sql`);
      // 초안의 칸은 영어 세트 표의 것이다 — 다른 표의 같은 이름 칸(교재 제작의 `textbook_edition.schema_version`)은 상관없다.
      if (!sql.includes(TABLE)) continue;
      for (const column of NEW_COLUMNS)
        expect(sql.includes(`"${column}"`), `${name} 에 ${column}`).toBe(false);
    }
  });

  it("schema.prisma 의 영어 세트 모델에 새 칸이 없다 — 칸 없는 DB 에서 읽기가 500 이 되지 않는다", () => {
    const schema = read("prisma/schema.prisma");
    const model = /model EnglishQuestionSet \{[\s\S]*?\n\}/.exec(schema)?.[0];
    expect(model).toBeDefined();
    expect(model).not.toMatch(/schema_version|schemaVersion/);
    expect(model).not.toMatch(/payload_v2|payloadV2/);
    // 지금 있는 칸은 그대로다(초안 때문에 모델이 바뀌지 않았다)
    for (const field of ["questions", "meta", "revision", "passage", "source"])
      expect(model).toMatch(new RegExp(`\\n\\s+${field}\\s`));
  });

  it("영어 라우트 · 영어 모듈이 새 칸을 날 SQL 로 읽지 않는다", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(path.join(ROOT, dir), {
        withFileTypes: true,
      })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walk(rel);
        else if (/\.tsx?$/.test(entry.name)) files.push(rel);
      }
    };
    walk("src/app/api/english");
    walk("src/lib/english");
    walk("src/app/(main)/english");
    expect(files.length).toBeGreaterThan(15);
    // 주석은 걷고 본다 — 관문의 주석이 «칸이 아직 없다»고 말하는 것은 읽는 것이 아니다
    const NEW_COLUMN = /\b(schema_version|payload_v2|payloadV2)\b/;
    const hits = files.filter((file) =>
      NEW_COLUMN.test(withoutComments(read(file))),
    );
    expect(hits).toEqual([]);
    // 자가 눈멀지 않았다 — 주석 밖에 칸 이름이 있으면 잡고, 주석 속이면 안 잡는다
    expect(
      NEW_COLUMN.test(
        withoutComments("const a = tx.$queryRaw`SELECT schema_version`;"),
      ),
    ).toBe(true);
    expect(
      NEW_COLUMN.test(
        withoutComments("// schema_version 칸은 아직 없다\nconst a = 1;"),
      ),
    ).toBe(false);
  });
});
