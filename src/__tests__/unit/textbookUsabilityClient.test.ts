/**
 * 관리자 사용성 후속 — 교재 클라이언트의 경계.
 * 구획 정답 메모가 서버 계약(`teacherAnswer`)과 화면 모델(`answer`) 사이를 오갈 때 «없음 = 칸 생략»을 지키는가,
 * 영상 주소 · 구획 키의 자동값이 서버 계약의 모양을 벗어나지 않는가.
 */
import { describe, expect, it } from "vitest";

import {
  suggestSectionKey,
  youtubeVideoId,
  type SectionDetail,
} from "@/components/textbook/model";
import { textbookKeySchema } from "@/contracts/textbookPrimitives.contract";
import { TextbookRequestError, createTextbookApi } from "@/lib/textbook/client";

const requestId = "00000000-0000-4000-8000-000000000001";
const editionId = "00000000-0000-4000-8000-000000000011";
const sectionId = "00000000-0000-4000-8000-000000000012";

const section = (answer: string): SectionDetail => ({
  sectionId,
  editionId,
  unitKey: "unit-1",
  sectionKey: "dialogue",
  templateKey: "template.dialogue",
  title: "대화",
  revision: 3,
  aggregateRevision: 3,
  status: "draft",
  parity: "even-left",
  parityMessage: null,
  blocks: [],
  answer,
  portraits: [],
  picks: [],
  items: [],
  concept: null,
});

const record = (teacherAnswer?: string) => ({
  id: sectionId,
  unitKey: "unit-1",
  revision: 4,
  section: {
    sectionKey: "dialogue",
    title: "대화",
    templateKey: "template.dialogue",
    startPolicy: "even-left",
    blocks: [],
    ...(teacherAnswer === undefined ? {} : { teacherAnswer }),
  },
  updatedAt: "2026-10-04T00:00:00.000Z",
});

async function sentSection(answer: string) {
  let body: { section?: Record<string, unknown> } = {};
  const api = createTextbookApi(async (_url, init) => {
    body = JSON.parse(String(init?.body));
    return Response.json({
      data: { section: record(), aggregateRevision: 5, replayed: false },
    });
  });
  await api.saveSection({
    editionId,
    sectionId,
    expectedRevision: 3,
    requestId,
    section: section(answer),
  });
  return body.section!;
}

describe("구획 정답 메모 — 화면 모델과 서버 계약 사이", () => {
  it("글이 있으면 teacherAnswer 로 보낸다(적은 그대로)", async () => {
    expect((await sentSection(" 11/12\n통분 ")).teacherAnswer).toBe(
      " 11/12\n통분 ",
    );
  });

  it.each([
    ["빈 글", ""],
    ["공백뿐인 글", "  \n "],
  ])("%s 이면 칸 자체를 보내지 않는다", async (_label, answer) => {
    const sent = await sentSection(answer);
    expect(Object.hasOwn(sent, "teacherAnswer")).toBe(false);
    expect(Object.hasOwn(sent, "answer")).toBe(false);
  });

  it("읽은 구획의 메모를 화면 모델에 싣고, 없으면 빈 글이다", async () => {
    const withAnswer = createTextbookApi(async () =>
      Response.json({ data: record("11/12") }),
    );
    expect((await withAnswer.getSection(editionId, sectionId)).answer).toBe(
      "11/12",
    );
    const without = createTextbookApi(async () =>
      Response.json({ data: record() }),
    );
    expect((await without.getSection(editionId, sectionId)).answer).toBe("");
  });

  it("409 가 돌려준 서버 구획에 메모가 실려 온다", async () => {
    const conflict = createTextbookApi(async () =>
      Response.json(
        {
          error: {
            message: "다른 저장",
            details: { serverRevision: 4, serverSection: record("서버 메모") },
          },
        },
        { status: 409 },
      ),
    );
    const error = await conflict
      .saveSection({
        editionId,
        sectionId,
        expectedRevision: 3,
        requestId,
        section: section("내 메모"),
      })
      .then(
        () => null,
        (reason: unknown) => reason,
      );
    expect(error).toBeInstanceOf(TextbookRequestError);
    expect((error as TextbookRequestError).serverSection?.answer).toBe(
      "서버 메모",
    );
  });

  it("서버가 빈 메모를 돌려주면 계약 위반으로 읽지 않는다", async () => {
    const broken = createTextbookApi(async () =>
      Response.json({ data: record("") }),
    );
    await expect(broken.getSection(editionId, sectionId)).rejects.toBeInstanceOf(
      TextbookRequestError,
    );
  });
});

describe("가져오기 오류의 자리", () => {
  it("서버가 짚은 경로를 화면에 넘긴다", async () => {
    const uploadId = "00000000-0000-4000-8000-000000000014";
    const api = createTextbookApi(async (url) => {
      const path = String(url);
      if (path.endsWith("/complete"))
        return Response.json({
          data: {
            uploadId,
            sha256: await digest(),
            byteLength: 2,
            asset: null,
          },
        });
      if (path.endsWith("/imports"))
        return Response.json({
          data: {
            mode: "copy",
            archiveId: null,
            bookId: null,
            editionId: null,
            idMap: [],
            issues: [
              {
                code: "duplicate-section-key",
                severity: "error",
                message: "구획 열쇠가 겹칩니다.",
                path: ["units", 0, "sections", 1],
              },
            ],
            replayed: false,
          },
        });
      return Response.json({ data: null });
    });
    async function digest() {
      const bytes = await new Blob(["{}"]).arrayBuffer();
      const out = await crypto.subtle.digest("SHA-256", bytes);
      return [...new Uint8Array(out)]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }
    const result = await api.importPackage({
      mode: "copy",
      file: new Blob(["{}"]),
      fileName: "교재.json",
      requestId,
    });
    expect(result).toMatchObject({
      rejected: true,
      issues: [
        {
          severity: "error",
          message: "구획 열쇠가 겹칩니다.",
          path: "units › 0 › sections › 1",
        },
      ],
    });
  });
});

describe("영상 주소에서 영상 ID 만", () => {
  it.each([
    ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["  dQw4w9WgXcQ  ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/watch?t=42&v=dQw4w9WgXcQ&list=PL1", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?t=10", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("%s", (input, id) => {
    expect(youtubeVideoId(input)).toBe(id);
  });

  it.each([
    "",
    "짧은글",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=too-short",
    "https://www.youtube.com/playlist?list=PL1234567890",
    "javascript:alert(1)//dQw4w9WgXcQ",
    "dQw4w9WgXcQ extra",
  ])("%s 는 받지 않는다", (input) => {
    expect(youtubeVideoId(input)).toBeNull();
  });
});

describe("구획 키의 자동값", () => {
  it("서버 계약의 키 모양이고, 있는 키와 겹치지 않는다", () => {
    const made = suggestSectionKey([]);
    expect(made).toMatch(/^s-[0-9a-f]{8}$/);
    expect(textbookKeySchema.safeParse(made).success).toBe(true);

    // 처음 지은 키가 이미 있으면 다음 것을 짓는다
    const values = [
      "11111111-0000-4000-8000-000000000000",
      "22222222-0000-4000-8000-000000000000",
    ];
    let index = 0;
    expect(
      suggestSectionKey(["s-11111111"], () => values[index++]!),
    ).toBe("s-22222222");
  });
});
