// @vitest-environment node
/** Opt-in real PostgreSQL probe. Refuses anything except the dedicated loopback fixture DB.
 * Creates a fresh schema, pushes the pre-bank schema there, then applies the actual migration.
 * Never writes public or resets the coordinator's fixtures. */
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/session";

const state = vi.hoisted(() => ({
  client: null as PrismaClient | null,
  session: null as SessionUser | null,
  generated: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getSessionUser: async () => state.session }));
vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get(_target, key) {
        const value = state.client![key as keyof PrismaClient];
        return typeof value === "function" ? value.bind(state.client) : value;
      },
    },
  ),
}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_path: string, handler: unknown) => handler,
}));
vi.mock("@/lib/english/generate", async (original) => ({
  ...(await original<object>()),
  generateEnglishDraft: state.generated,
  englishGenerationModel: () => ({ name: "test", promptVersion: "test" }),
}));

import {
  createEnglishBank,
  validateBankReference,
} from "@/lib/english/bank/service";
import { exactHash } from "@/lib/english/bank/policy";
import { POST as saveSet } from "@/app/api/english/exams/[id]/sets/route";
import { POST as generate } from "@/app/api/english/generate/route";
import { POST as createPassage } from "@/app/api/english/passages/route";
import { createListeningRuntime } from "@/lib/english/listening/runtime/service";

const dsn = process.env.ENGLISH_BANK_TEST_DATABASE_URL;
const menus = [
  "english-bank",
  "english-school",
  "english-maker",
  "english-library",
  "english-listening",
] as SessionUser["menus"];
const viewer = (id: string, branchId: string | null = null): SessionUser => ({
  id,
  branchId,
  email: `${id}@test.invalid`,
  name: "Bank QA",
  isAdmin: false,
  menus,
});
const original =
  "  A teacher writes a new story about a small café.\n The children enjoy reading and discuss the story together.  ";
const question = {
  type: "서술형",
  prompt: "What do the children enjoy?",
  options: [],
  answer: "Reading",
  explanation: "The text explains the activity.",
  evidence: "The children enjoy reading",
};
const request = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify(body),
  });
describe.skipIf(!dsn)(
  "English bank: real PostgreSQL migration + HTTP integration",
  () => {
    let client: PrismaClient;
    let bank: ReturnType<typeof createEnglishBank>;
    let a: SessionUser;
    let b: SessionUser;
    let admin: SessionUser;
    let examId: string;
    let schema: string;
    let temporary: string;
    let isolatedUrl: string;
    beforeAll(async () => {
      const url = new URL(dsn!);
      if (
        url.hostname !== "127.0.0.1" ||
        url.port !== "55440" ||
        url.pathname !== "/english_bank"
      )
        throw new Error("Probe accepts only 127.0.0.1:55440/english_bank");
      schema = `bank_probe_${randomUUID().replaceAll("-", "")}`;
      url.searchParams.set("schema", schema);
      isolatedUrl = url.toString();
      temporary = mkdtempSync(path.join(tmpdir(), "english-bank-probe-"));
      const base = execFileSync(
        "git",
        ["show", "6ccd02e2d:prisma/schema.prisma"],
        { encoding: "utf8" },
      );
      const baseFile = path.join(temporary, "schema.prisma");
      writeFileSync(baseFile, base);
      const env = {
        ...process.env,
        DATABASE_URL: isolatedUrl,
        DIRECT_URL: isolatedUrl,
      };
      const prisma = path.resolve("node_modules/prisma/build/index.js");
      execFileSync(
        process.execPath,
        [prisma, "db", "push", "--schema", baseFile, "--skip-generate"],
        { env, stdio: "pipe" },
      );
      execFileSync(
        process.execPath,
        [
          prisma,
          "db",
          "execute",
          "--schema",
          baseFile,
          "--file",
          path.resolve(
            "prisma/migrations/20261003160000_english_passage_bank/migration.sql",
          ),
        ],
        { env, stdio: "pipe" },
      );
      client = new PrismaClient({ datasourceUrl: isolatedUrl });
      state.client = client;
      bank = createEnglishBank(client);
      const branch = await client.branch.create({
        data: { name: "Bank QA branch" },
      });
      a = viewer(randomUUID(), branch.id);
      b = viewer(randomUUID());
      admin = { ...viewer(randomUUID(), branch.id), isAdmin: true };
      for (const actor of [a, b, admin])
        await client.user.create({
          data: {
            id: actor.id,
            name: actor.name,
            email: actor.email,
            approvalStatus: "approved",
            branchId: actor.branchId,
            isAdmin: actor.isAdmin,
          },
        });
      const exam = await client.englishExam.create({
        data: {
          userId: a.id,
          branchId: a.branchId,
          school: "Local",
          grade: "중1",
          title: "QA exam",
        },
      });
      examId = exam.id;
      state.session = a;
    }, 120000);
    afterAll(async () => {
      if (client) {
        // Only this generated identifier on the positively checked local database is removed.
        if (!/^bank_probe_[a-f0-9]{32}$/.test(schema))
          throw new Error("Unsafe schema cleanup");
        await client.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
        await client.$disconnect();
      }
      if (temporary) {
        const resolved = path.resolve(temporary);
        if (
          !resolved.startsWith(path.resolve(tmpdir()) + path.sep) ||
          !path.basename(resolved).startsWith("english-bank-probe-")
        )
          throw new Error("Unsafe temporary directory cleanup");
        await rm(resolved, { recursive: true });
      }
      vi.unstubAllEnvs();
    });
    const register = async (text = original) =>
      (
        await bank.create(a, {
          title: "Teacher original",
          text,
          clientKey: randomUUID(),
          source: { label: "Teacher source", url: null },
        })
      ).data;
    const confirm = (
      entry: Awaited<ReturnType<typeof register>>,
      allowedUses = ["generation_input", "external_model"],
    ) =>
      bank.rights(a, entry.id, {
        revision: entry.revision,
        basis: "Teacher authored this original",
        allowedUses,
      });
    const prepare = (
      entry: Awaited<ReturnType<typeof register>>,
      path = "cloze",
    ) =>
      bank.prepare(a, entry.id, {
        examId,
        path,
        textRevision: entry.textRevision,
      });
    it("applies RLS and immutable guards on all new tables without changing existing rows", async () => {
      const rows = await client.$queryRaw<
        { relname: string; relrowsecurity: boolean }[]
      >`SELECT relname,relrowsecurity FROM pg_class WHERE relnamespace=${schema}::regnamespace AND relname IN ('english_passage','english_passage_revision','english_passage_use','english_passage_receipt')`;
      expect(rows).toHaveLength(4);
      expect(rows.every((r) => r.relrowsecurity)).toBe(true);
      const grants = await client.$queryRaw<
        { count: bigint }[]
      >`SELECT count(*) FROM information_schema.table_privileges WHERE table_schema=${schema} AND table_name LIKE 'english_passage%' AND grantee IN ('PUBLIC','anon','authenticated')`;
      expect(Number(grants[0].count)).toBe(0);
    });
    it("preserves originals, scopes normalized duplicates, and projects paged summaries", async () => {
      const entry = await register("  e\u0301\n text  ");
      expect(entry.text).toBe("  e\u0301\n text  ");
      expect(entry.rights.status).toBe("unconfirmed");
      const duplicate = await bank.create(a, {
        title: "Duplicate",
        text: "é text",
        clientKey: randomUUID(),
      });
      expect(duplicate.meta.duplicateIds).toContain(entry.id);
      const foreign = await bank.create(b, {
        title: "Foreign",
        text: "é text",
        clientKey: randomUUID(),
      });
      expect(foreign.meta.duplicateIds).toEqual([]);
      const page = await bank.list(a, { q: "text", limit: 1 });
      expect(page.data).toHaveLength(1);
      expect(page.data[0]).not.toHaveProperty("text");
      expect(page.meta.nextCursor).toBeTruthy();
      const next = await bank.list(a, {
        q: "text",
        limit: 1,
        cursor: page.meta.nextCursor,
      });
      expect(next.data[0].id).not.toBe(page.data[0].id);
      await expect(bank.get(b, entry.id)).rejects.toThrow(
        "PASSAGE_UNAVAILABLE",
      );
      await expect(bank.get(b, randomUUID())).rejects.toThrow(
        "PASSAGE_UNAVAILABLE",
      );
      expect((await bank.get(admin, entry.id)).id).toBe(entry.id);
    });
    it("serializes concurrent CAS, preserving immutable text and invalidating text/source rights", async () => {
      let entry = await confirm(await register());
      const updates = await Promise.allSettled([
        bank.update(a, entry.id, { revision: entry.revision, title: "One" }),
        bank.update(a, entry.id, { revision: entry.revision, title: "Two" }),
      ]);
      expect(updates.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      entry = await bank.get(a, entry.id);
      expect(entry.textRevision).toBe(1);
      expect(entry.rights.status).toBe("confirmed");
      const oldRef = (await prepare(entry)).passageRef;
      entry = await bank.update(a, entry.id, {
        revision: entry.revision,
        text: original + "New line.",
      });
      expect(entry.textRevision).toBe(2);
      expect(entry.rights.status).toBe("unconfirmed");
      expect(
        (
          await client.englishPassageRevision.findUniqueOrThrow({
            where: {
              passageId_textRevision: { passageId: entry.id, textRevision: 1 },
            },
          })
        ).text,
      ).toBe(original);
      await expect(
        client.englishPassageRevision.update({
          where: {
            passageId_textRevision: { passageId: entry.id, textRevision: 1 },
          },
          data: { text: "changed" },
        }),
      ).rejects.toThrow(/immutable/);
      entry = await confirm(entry);
      await expect(
        client.$transaction((tx) =>
          validateBankReference(tx, a, oldRef, original, "cloze"),
        ),
      ).rejects.toThrow("PASSAGE_TEXT_MISMATCH");
      await expect(
        bank.prepare(a, entry.id, { examId, path: "cloze", textRevision: 1 }),
      ).rejects.toThrow("PASSAGE_TEXT_MISMATCH");
      entry = await bank.update(a, entry.id, {
        revision: entry.revision,
        source: { label: "Changed source", url: null },
      });
      expect(entry.textRevision).toBe(2);
      expect(entry.rights.status).toBe("unconfirmed");
    });
    it("requires original route grants and current ownership for explicit idempotent imports", async () => {
      const content = "A source café text.";
      const material = await client.englishMaterial.create({
        data: {
          examId,
          name: "source.txt",
          mimeType: "text/plain",
          size: Buffer.byteLength(content),
          bytes: Buffer.from(content),
          content,
        },
      });
      const input = {
        clientKey: randomUUID(),
        kind: "material",
        id: material.id,
      };
      await expect(
        bank.import({ ...a, menus: ["english-bank"] }, input),
      ).rejects.toThrow("SOURCE_ACCESS_DENIED");
      await expect(bank.import(b, input)).rejects.toThrow(
        "PASSAGE_UNAVAILABLE",
      );
      const [first, second] = await Promise.all([
        bank.import(a, input),
        bank.import(a, input),
      ]);
      expect(first.data.id).toBe(second.data.id);
      expect([first.meta.replayed, second.meta.replayed].sort()).toEqual([
        false,
        true,
      ]);
      expect(
        (await bank.import(a, { ...input, clientKey: randomUUID() })).data.id,
      ).toBe(first.data.id);
      await expect(
        bank.import(a, { ...input, title: "changed request" }),
      ).rejects.toThrow("CLIENT_KEY_CONFLICT");
      await client.englishMaterial.update({
        where: { id: material.id },
        data: { content: "A source" },
      });
      await expect(
        bank.import(a, { ...input, clientKey: randomUUID() }),
      ).rejects.toThrow("IMPORT_TEXT_TRUNCATED");
      const manual = await client.englishQuestionSet.create({
        data: {
          examId,
          title: "Generated",
          source: "manual",
          passage: original,
          questions: [question],
        },
      });
      await expect(
        bank.import(
          { ...a, menus: ["english-bank", "english-maker"] },
          {
            clientKey: randomUUID(),
            kind: "set",
            id: manual.id,
            textKind: "passage",
          },
        ),
      ).rejects.toThrow("SOURCE_ACCESS_DENIED");
      await expect(
        bank.import(a, {
          clientKey: randomUUID(),
          kind: "set",
          id: manual.id,
          textKind: "sourcePassage",
        }),
      ).rejects.toThrow("IMPORT_TEXT_UNAVAILABLE");
      expect(
        (
          await bank.import(a, {
            clientKey: randomUUID(),
            kind: "set",
            id: manual.id,
            textKind: "passage",
          })
        ).data.text,
      ).toBe(original);
    });
    it("checks rights and bounds at prepare, including storage-only 30k text", async () => {
      let entry = await register();
      await expect(prepare(entry)).rejects.toThrow("RIGHTS_REQUIRED");
      entry = await confirm(entry, ["generation_input"]);
      await expect(prepare(entry, "api")).rejects.toThrow("RIGHTS_REQUIRED");
      expect((await prepare(entry)).text).toBe(original);
      await expect(
        bank.prepare({ ...a, menus: ["english-bank"] }, entry.id, {
          examId,
          path: "cloze",
          textRevision: 1,
        }),
      ).rejects.toThrow("SOURCE_ACCESS_DENIED");
      const long = await confirm(await register("x".repeat(24001)));
      await expect(prepare(long)).rejects.toThrow("PASSAGE_TOO_LONG");
      expect((await bank.get(a, long.id)).text.length).toBe(24001);
    });
    it("saves exact source snapshots atomically, replays after rights changes, and rejects changed refs", async () => {
      let entry = await confirm(await register());
      const seed = await prepare(entry);
      const meta = {
        path: "cloze",
        passageRef: seed.passageRef,
        clientKey: randomUUID(),
      };
      const body = {
        title: "Saved from bank",
        source: "cloze",
        passage: original.normalize("NFD").trim().replace(/\s+/g, " "),
        questions: [question],
        meta,
      };
      const post = (value: unknown) =>
        saveSet(request(`/api/english/exams/${examId}/sets`, value), {
          params: Promise.resolve({ id: examId }),
        });
      state.session = a;
      const [first, concurrent] = await Promise.all([post(body), post(body)]);
      expect([first.status, concurrent.status].sort()).toEqual([200, 201]);
      const saved = (await first.json()).data;
      const use = await client.englishPassageUse.findUniqueOrThrow({
        where: { setId: saved.id },
      });
      expect(use.textSnapshot).toBe(original);
      expect(use.snapshotHash).toBe(exactHash(original));
      const invalid = await post({
        ...body,
        meta: {
          ...meta,
          passageRef: { ...seed.passageRef, snapshotHash: "f".repeat(64) },
        },
      });
      expect(invalid.status).toBe(409);
      expect((await invalid.json()).error.details.reason).toBe(
        "CLIENT_KEY_CONFLICT",
      );
      entry = await bank.update(a, entry.id, {
        revision: entry.revision,
        source: { label: "Later changed source", url: null },
      });
      expect((await post(body)).status).toBe(200);
      expect(
        (
          await client.englishPassageUse.findUniqueOrThrow({
            where: { setId: saved.id },
          })
        ).sourceSnapshot,
      ).toEqual({ label: "Teacher source", url: null });
      const count = await client.englishQuestionSet.count();
      expect(
        (await post({ ...body, meta: { ...meta, clientKey: randomUUID() } }))
          .status,
      ).toBe(409);
      expect(await client.englishQuestionSet.count()).toBe(count);
      expect((await bank.get(a, entry.id)).usages).toHaveLength(1);
      expect((await bank.get(admin, entry.id)).usages).toHaveLength(1);
      await client.englishExam.update({
        where: { id: examId },
        data: { userId: b.id, branchId: null },
      });
      expect((await bank.get(a, entry.id)).usages).toHaveLength(0);
      await client.englishExam.update({
        where: { id: examId },
        data: { userId: a.id, branchId: a.branchId },
      });
      await bank.archive(a, entry.id, { revision: entry.revision });
      expect((await bank.get(a, entry.id)).usages).toHaveLength(1);
      expect((await post(body)).status).toBe(200);
      await client.englishQuestionSet.delete({ where: { id: saved.id } });
      expect(
        await client.englishPassageUse.count({ where: { setId: saved.id } }),
      ).toBe(0);
      expect(
        await client.englishPassageRevision.count({
          where: { passageId: entry.id },
        }),
      ).toBe(1);
    });
    it("rejects malformed/cross-owner/incorrect original references without persisting any rows", async () => {
      const entry = await confirm(await register());
      const seed = await prepare(entry, "api");
      const count = await client.englishQuestionSet.count();
      const base = {
        title: "Variation",
        source: "chatgpt",
        passage: original,
        questions: [question],
        meta: {
          path: "chatgpt",
          mode: "variation",
          sourcePassage: "Unrelated original",
          passageRef: seed.passageRef,
        },
      };
      const post = (value: unknown) =>
        saveSet(request(`/api/english/exams/${examId}/sets`, value), {
          params: Promise.resolve({ id: examId }),
        });
      expect((await post(base)).status).toBe(409);
      expect(
        (
          await post({
            ...base,
            meta: {
              ...base.meta,
              passageRef: { ...seed.passageRef, snapshotHash: "bad" },
            },
          })
        ).status,
      ).toBe(400);
      const hidden = await bank.create(b, {
        title: "Foreign",
        text: original,
        clientKey: randomUUID(),
      });
      for (const passageId of [hidden.data.id, randomUUID()]) {
        const response = await post({
          ...base,
          meta: {
            ...base.meta,
            sourcePassage: original,
            passageRef: { ...seed.passageRef, passageId },
          },
        });
        expect(response.status).toBe(409);
        expect((await response.json()).error.details.reason).toBe(
          "PASSAGE_UNAVAILABLE",
        );
      }
      expect(await client.englishQuestionSet.count()).toBe(count);
      expect(
        (
          await post({
            ...base,
            meta: { ...base.meta, sourcePassage: original },
          })
        ).status,
      ).toBe(201);
    });
    it("blocks bank generation before provider calls and leaves unrelated V1 generation working", async () => {
      const entry = await register();
      const input = {
        examId,
        passageRef: {
          passageId: entry.id,
          textRevision: 1,
          snapshotHash: entry.snapshotHash,
        },
        mode: "original",
        passage: original,
        difficulty: "표준",
        count: 1,
        words: 100,
        types: ["서술형"],
      };
      state.generated.mockClear();
      expect(
        (await generate(request("/api/english/generate", input))).status,
      ).toBe(409);
      expect(state.generated).not.toHaveBeenCalled();
      await confirm(entry);
      state.generated.mockResolvedValue({
        title: "Generated",
        source: "deepseek",
        passage: original,
        questions: [question],
      });
      expect(
        (await generate(request("/api/english/generate", input))).status,
      ).toBe(200);
      expect(state.generated).toHaveBeenCalledOnce();
    });
    it("cannot downgrade external source rights by forging the cloze path", async () => {
      const entry = await confirm(await register(), ["generation_input"]);
      const seed = await prepare(entry);
      const response = await saveSet(
        request(`/api/english/exams/${examId}/sets`, {
          title: "Forged path",
          source: "deepseek",
          passage: original,
          questions: [question],
          meta: { path: "cloze", passageRef: seed.passageRef },
        }),
        { params: Promise.resolve({ id: examId }) },
      );
      expect(response.status).toBe(409);
    });
    it("accepts TXT creation with exact Unicode and enforces API session gates", async () => {
      const form = new FormData();
      form.set(
        "input",
        JSON.stringify({ title: "TXT", clientKey: randomUUID() }),
      );
      form.set(
        "file",
        new File([original], "source.txt", { type: "text/plain" }),
      );
      const response = await createPassage(
        new NextRequest("http://localhost/api/english/passages", {
          method: "POST",
          headers: { Origin: "http://localhost" },
          body: form,
        }),
      );
      expect(response.status).toBe(201);
      expect((await response.json()).data.text).toBe(original);
      state.session = { ...a, menus: ["english-maker"] };
      expect(
        (
          await createPassage(
            request("/api/english/passages", {
              title: "Denied",
              text: original,
              clientKey: randomUUID(),
            }),
          )
        ).status,
      ).toBe(403);
      state.session = a;
    });
    it("keeps listening sets array compatibility and scopes bank/search/pilot/reference grants", async () => {
      vi.stubEnv("ENGLISH_LISTENING_TEACHER_IDS", a.id);
      vi.stubEnv("ENGLISH_LISTENING_ENABLED", "true");
      const runtime = createListeningRuntime(client);
      const actor = { kind: "teacher" as const, userId: a.id };
      for (let i = 0; i < 3; i++)
        await client.englishListeningSet.create({
          data: {
            id: randomUUID(),
            ownerId: a.id,
            branchId: a.branchId,
            document: {
              title: `Local listening ${i}`,
              level: "중1",
              groups: [],
            },
          },
        });
      await client.englishListeningSet.create({
        data: {
          id: randomUUID(),
          ownerId: b.id,
          document: {
            title: "Local listening foreign",
            level: "중1",
            groups: [],
          },
        },
      });
      expect(Array.isArray(await runtime.teacherList(actor, "sets"))).toBe(
        true,
      );
      const first = await runtime.teacherBank(actor, "bank", {
        q: "Local listening",
        level: "중1",
        limit: 2,
      });
      expect(first.data).toHaveLength(2);
      expect(first.meta.nextCursor).toBeTruthy();
      const next = await runtime.teacherBank(actor, "bank", {
        q: "Local listening",
        level: "중1",
        limit: 2,
        cursor: first.meta.nextCursor,
      });
      expect(next.data).toHaveLength(1);
      expect(JSON.stringify(first)).not.toMatch(/foreign|document|transcript/);
      expect(
        (
          await runtime.teacherBank(actor, "references", {
            year: "2026",
            round: "1",
          })
        ).data.length,
      ).toBeGreaterThan(0);
      await client.user.update({
        where: { id: a.id },
        data: { disabledMenus: ["english-bank"] },
      });
      await expect(runtime.teacherBank(actor, "bank", {})).rejects.toThrow();
      expect(Array.isArray(await runtime.teacherList(actor, "sets"))).toBe(
        true,
      );
      await client.user.update({
        where: { id: a.id },
        data: { disabledMenus: [] },
      });
      await expect(
        runtime.teacherBank({ kind: "teacher", userId: b.id }, "bank", {}),
      ).rejects.toThrow();
    });
  },
);
