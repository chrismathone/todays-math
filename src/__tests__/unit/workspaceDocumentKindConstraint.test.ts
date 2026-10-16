// @vitest-environment node
/**
 * 내 시험지 자료 종류를 코드에 더하면 DB 의 CHECK 도 같이 넓혀야 한다 — `workspace_document.kind` 는
 * `workspace_document_kind_check` 로 막혀 있다(처음엔 표를 만들 때 칸 옆에 쓴 CHECK — 이름은 Postgres 가 붙였다).
 *
 * 2026-10-01 원장님 «개념 백지를 담아서 내 시험지에 저장하고 다음에 또 쓸수 있게»(26 §9 ⑾) — `conceptBlank` 를 더했다.
 * 메뉴 CHECK 와 같은 사고(`workspaceMenuConstraint.test.ts` — 코드에만 더하고 CHECK 는 그대로라 저장이 500)를 막는다.
 * 마이그레이션 파일들에서 이 제약의 마지막 정의를 읽어 계약의 종류 목록과 같은지 본다.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

import {
  DOCUMENT_KINDS,
  EXAM_CONDITION_KIND,
  documentKindLabel,
  documentKindSchema,
  libraryDocumentKindSchema,
  saveDocumentSchema,
} from "@/contracts/privateWorkspace.contract";

const MIGRATIONS = path.join(process.cwd(), "prisma", "migrations");

/** 마이그레이션을 이름 차례로 읽어 종류 CHECK 의 마지막 목록을 꺼낸다 — 칸 옆 CHECK 든 ADD CONSTRAINT 든. */
function lastKindCheck(): string[] | null {
  let last: string[] | null = null;
  for (const dir of readdirSync(MIGRATIONS).sort()) {
    let sql: string;
    try {
      sql = readFileSync(path.join(MIGRATIONS, dir, "migration.sql"), "utf8");
    } catch {
      continue;
    }
    const inline = sql.match(
      /CREATE TABLE "workspace_document"[\s\S]*?"kind"[^,]*?CHECK\s*\(\s*"kind"\s+IN\s*\(([^)]*)\)/,
    );
    const added = [
      ...sql.matchAll(
        /ADD CONSTRAINT "workspace_document_kind_check"\s+CHECK\s*\(\s*"kind"\s+IN\s*\(([^)]*)\)/g,
      ),
    ];
    for (const m of [...(inline ? [inline] : []), ...added])
      last = [...m[1]!.matchAll(/'([^']+)'/g)].map((x) => x[1]!);
  }
  return last;
}

describe("내 시험지 자료 종류 ↔ DB CHECK(workspace_document_kind_check)", () => {
  it("마지막 CHECK 의 목록이 계약의 종류 전부와 같다", () => {
    const check = lastKindCheck();
    expect(check).not.toBeNull();
    expect([...check!].sort()).toEqual([...documentKindSchema.options].sort());
  });

  it("개념 백지가 종류에 있다(26 §9 ⑾)", () => {
    expect(documentKindSchema.options).toContain("conceptBlank");
  });

  // 2026-10-16 외부 검토 §3 — 표 배지 · 종류 고르기 · 정보 창 · 저장 창이 한 정의를 읽는다.
  it("화면의 종류 정의(이름 · 차례)가 자료 종류 넷을 한 번씩 덮고, 이름이 비지 않는다", () => {
    expect(DOCUMENT_KINDS.map((entry) => entry.id).sort()).toEqual(
      [...libraryDocumentKindSchema.options].sort(),
    );
    expect(DOCUMENT_KINDS.map((entry) => entry.label)).toEqual([
      "시험지",
      "연산 연습지",
      "추출한 자료",
      "개념 백지",
    ]);
    for (const option of libraryDocumentKindSchema.options)
      expect(documentKindLabel(option)).not.toBe(option);
  });

  // 2026-10-16 W5 «이름 붙인 출제 조건» — 같은 표에 담지만 자료가 아니다.
  it("출제 조건은 표의 종류에는 있고 자료 종류 · 화면의 종류 · 자료 저장 형식에는 없다", () => {
    expect(documentKindSchema.options).toContain(EXAM_CONDITION_KIND);
    expect(libraryDocumentKindSchema.options).not.toContain(
      EXAM_CONDITION_KIND,
    );
    expect(DOCUMENT_KINDS.map((entry) => entry.id)).not.toContain(
      EXAM_CONDITION_KIND,
    );
    expect(
      saveDocumentSchema.safeParse({
        kind: EXAM_CONDITION_KIND,
        title: "조건",
        payload: {},
        expectedRevision: null,
      }).success,
    ).toBe(false);
  });

  it("widens the real PostgreSQL CHECK without losing old rows or allowing unknown kinds", async () => {
    const memory = new PGlite();
    try {
      await memory.exec(`
        CREATE TABLE "workspace_document" (
          id text PRIMARY KEY,
          kind text CONSTRAINT "workspace_document_kind_check"
            CHECK (kind IN ('draft', 'extraction', 'conceptBlank')),
          payload jsonb NOT NULL
        );
        INSERT INTO "workspace_document" VALUES
          ('old-draft', 'draft', '{"problems":[]}'),
          ('old-extraction', 'extraction', '{"data":{"crops":[]}}'),
          ('old-blank', 'conceptBlank', '{"version":1}');
      `);
      const before = await memory.query(
        'SELECT * FROM "workspace_document" ORDER BY id',
      );
      await expect(
        memory.query('INSERT INTO "workspace_document" VALUES ($1,$2,$3)', [
          "blocked",
          "arithmeticSheet",
          "{}",
        ]),
      ).rejects.toMatchObject({ code: "23514" });
      for (const migration of [
        "20261014190000_workspace_document_arithmetic_sheet",
        "20261016180000_workspace_document_exam_condition",
      ])
        await memory.exec(
          readFileSync(
            path.join(MIGRATIONS, migration, "migration.sql"),
            "utf8",
          ),
        );
      expect(
        (await memory.query('SELECT * FROM "workspace_document" ORDER BY id'))
          .rows,
      ).toEqual(before.rows);
      for (const kind of documentKindSchema.options)
        await memory.query(
          'INSERT INTO "workspace_document" VALUES ($1,$2,$3)',
          [kind, kind, "{}"],
        );
      await expect(
        memory.query('INSERT INTO "workspace_document" VALUES ($1,$2,$3)', [
          "bad",
          "arithmetic-sheet",
          "{}",
        ]),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        memory.query('UPDATE "workspace_document" SET kind=$1 WHERE id=$2', [
          "unknown",
          "old-draft",
        ]),
      ).rejects.toMatchObject({ code: "23514" });
    } finally {
      await memory.close();
    }
  });
});
