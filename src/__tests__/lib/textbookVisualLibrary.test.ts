// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { textbookAssetSchema } from "@/contracts/textbookExchange.contract";
import {
  DEFAULT_TEXTBOOK_CAST,
  TEXTBOOK_CHARACTERS,
  resolveTextbookCast,
} from "@/lib/textbook/characters";
import {
  REST_STORIES,
  chooseRestStory,
  restStoryMarkdown,
  type RestStoryId,
} from "@/lib/textbook/restStories";
import { renderTextbookMarkdown } from "@/lib/textbook/render/markdown";
import { freezeTextbookVisualLibrary } from "@/lib/textbook/server/visualLibrary";
import { sha256 } from "@/lib/textbook/hash.server";
import { insertBook, openTextbookDb, type Db } from "../helpers/textbookPglite";
import {
  insertTeacher,
  pgliteTextbookDb,
  tinyPng,
} from "../helpers/textbookServerWorld";
import type { TextbookDb } from "@/lib/textbook/server/sql";

describe("client-safe textbook visual catalog", () => {
  it("exposes five identities per role/gender and rejects foreign IDs and wrong roles", () => {
    expect(TEXTBOOK_CHARACTERS).toHaveLength(20);
    expect(
      new Set(TEXTBOOK_CHARACTERS.map((character) => character.id)).size,
    ).toBe(20);
    for (const role of ["teacher", "student"])
      for (const gender of ["female", "male"])
        expect(
          TEXTBOOK_CHARACTERS.filter(
            (character) =>
              character.role === role && character.gender === gender,
          ),
        ).toHaveLength(5);
    for (const character of TEXTBOOK_CHARACTERS) {
      expect(Object.keys(character).sort()).toEqual([
        "gender",
        "id",
        "name",
        "role",
        "src",
      ]);
      expect(character.src).toBe(`/textbook/portraits/${character.id}.png`);
    }
    expect(resolveTextbookCast().teacher.id).toBe(
      DEFAULT_TEXTBOOK_CAST.teacherId,
    );
    expect(() => resolveTextbookCast({ teacherId: "student-f1" })).toThrow();
    expect(() => resolveTextbookCast({ student1Id: "teacher-m1" })).toThrow();
    expect(() =>
      resolveTextbookCast({ teacherId: "../../private.png" }),
    ).toThrow();
  });

  it.each([
    ["분수의 나눗셈", "sharing"],
    ["규칙 찾기", "patterns"],
    ["직사각형의 넓이", "garden"],
    ["비례식과 축척", "map"],
    ["일차방정식", "balance"],
    ["자료의 평균", "weather"],
  ] as const)("selects a matching original story for %s", (chapter, id) => {
    expect(chooseRestStory({ grade: "초3", chapter, section: "" }).id).toBe(id);
    expect(chooseRestStory({ grade: "중3", chapter, section: "" }).id).toBe(id);
  });

  it("renders all six stories and reflection questions through the native safe math renderer", () => {
    expect(new Set(REST_STORIES.map((story) => story.imageId)).size).toBe(6);
    for (const story of REST_STORIES) {
      expect(story.imageSrc).toBe(`/textbook/illustrations/${story.id}.png`);
      expect(story.reflectionQuestions).toHaveLength(2);
      const html = renderTextbookMarkdown(restStoryMarkdown(story));
      expect(html).toContain("생각 나누기");
      expect(html).toContain("katex");
      expect(html).not.toContain("katex-error");
    }
    const input = { grade: "초4", chapter: "새 단원", section: "첫 수업" };
    expect(chooseRestStory(input)).toEqual(chooseRestStory(input));
  });
});

describe("native transactional visual asset freezing", () => {
  let pg: Db;
  let db: TextbookDb;
  let userId: string;
  beforeAll(async () => {
    pg = await openTextbookDb();
    db = pgliteTextbookDb(pg);
    userId = (await insertTeacher(pg)).id;
  }, 120_000);
  afterAll(async () => {
    await pg.close();
  });

  const load = async (src: string) =>
    tinyPng(1254, 1254, `original visual bytes for ${src}`);

  it("stores untouched bytes, valid content AssetRefs, selected roles and only requested stories", async () => {
    const draft = await insertBook(pg, userId);
    const result = await db.transaction((tx) =>
      freezeTextbookVisualLibrary(
        tx,
        {
          userId,
          editionId: draft.editionId,
          cast: {
            teacherId: "teacher-m3",
            student1Id: "student-f5",
            student2Id: "student-m2",
          },
          storyIds: ["garden", "garden"],
        },
        load,
      ),
    );
    expect(result.assets).toHaveLength(4);
    expect(Object.keys(result.stories)).toEqual(["garden"]);
    expect(result.cast.teacher.speakerId).toBe("tb-portrait-teacher-m3");
    for (const asset of result.assets) {
      expect(textbookAssetSchema.parse(asset)).toEqual(asset);
      const { rows } = await pg.query<{ bytes: Uint8Array }>(
        'SELECT "bytes" FROM "textbook_blob" WHERE "sha256"=$1',
        [asset.sha256],
      );
      expect(sha256(rows[0].bytes)).toBe(asset.assetId);
      expect(asset.widthPx).toBe(1254);
      expect(asset.heightPx).toBe(1254);
    }
    const original = await load(result.cast.teacher.src);
    const { rows } = await pg.query<{ bytes: Uint8Array }>(
      'SELECT "bytes" FROM "textbook_blob" WHERE "sha256"=$1',
      [result.cast.teacher.portraitAssetId],
    );
    expect(Buffer.from(rows[0].bytes)).toEqual(original);
    const { rows: links } = await pg.query(
      'SELECT "asset_id" FROM "textbook_edition_asset" WHERE "edition_id"=$1',
      [draft.editionId],
    );
    expect(links).toHaveLength(4);
    const again = await db.transaction((tx) =>
      freezeTextbookVisualLibrary(
        tx,
        {
          userId,
          editionId: draft.editionId,
          cast: {
            teacherId: "teacher-m3",
            student1Id: "student-f5",
            student2Id: "student-m2",
          },
          storyIds: ["garden"],
        },
        load,
      ),
    );
    expect(again).toEqual(result);
    const { rows: repeatedLinks } = await pg.query(
      'SELECT "asset_id" FROM "textbook_edition_asset" WHERE "edition_id"=$1',
      [draft.editionId],
    );
    expect(repeatedLinks).toHaveLength(4);
  });

  it("rolls back frozen blobs and handles when the enclosing manuscript transaction fails", async () => {
    const draft = await insertBook(pg, userId);
    const rollbackLoad = async (src: string) =>
      tinyPng(1280, 1280, `rollback unique original bytes ${src}`);
    const hash = sha256(
      await rollbackLoad("/textbook/portraits/teacher-f1.png"),
    );
    await expect(
      db.transaction(async (tx) => {
        await freezeTextbookVisualLibrary(
          tx,
          { userId, editionId: draft.editionId },
          rollbackLoad,
        );
        throw new Error("later manuscript failure");
      }),
    ).rejects.toThrow("later manuscript failure");
    expect(
      (
        await pg.query('SELECT 1 FROM "textbook_blob" WHERE "sha256"=$1', [
          hash,
        ])
      ).rows,
    ).toHaveLength(0);
    expect(
      (await pg.query('SELECT 1 FROM "textbook_asset" WHERE "id"=$1', [hash]))
        .rows,
    ).toHaveLength(0);
    expect(
      (
        await pg.query(
          'SELECT 1 FROM "textbook_edition_asset" WHERE "edition_id"=$1',
          [draft.editionId],
        )
      ).rows,
    ).toHaveLength(0);
  });

  it("validates every source before writing and refuses unknown story IDs before file access", async () => {
    const draft = await insertBook(pg, userId);
    const poisoned = vi.fn(async (src: string) =>
      src.includes("student-m1") ? Buffer.from("not a png") : await load(src),
    );
    await expect(
      db.transaction((tx) =>
        freezeTextbookVisualLibrary(
          tx,
          { userId, editionId: draft.editionId },
          poisoned,
        ),
      ),
    ).rejects.toThrow("크기");
    expect(
      (
        await pg.query(
          'SELECT 1 FROM "textbook_edition_asset" WHERE "edition_id"=$1',
          [draft.editionId],
        )
      ).rows,
    ).toHaveLength(0);
    const loader = vi.fn(load);
    await expect(
      db.transaction((tx) =>
        freezeTextbookVisualLibrary(
          tx,
          {
            userId,
            editionId: draft.editionId,
            storyIds: ["../../private" as RestStoryId],
          },
          loader,
        ),
      ),
    ).rejects.toThrow("이야기 선택");
    expect(loader).not.toHaveBeenCalled();
    await expect(
      db.transaction((tx) =>
        freezeTextbookVisualLibrary(
          tx,
          { userId, editionId: draft.editionId },
          async (src) => tinyPng(1200, 800, `non-square atlas ${src}`),
        ),
      ),
    ).rejects.toThrow("치수");
  });
});
