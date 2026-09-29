// @vitest-environment node
/**
 * 오늘의 영어 — 자료 API `/api/english/exams/[id]/materials` · `/api/english/materials/[id]` (D-148 · 25 §3).
 *
 * JSON 지문 · multipart 파일(pdf · docx · txt · png · jpg ≤ `ENGLISH_MATERIAL_MAX_BYTES`) · 내려받기 머리 · 상한 경계(**실제 바이트로**) ·
 * 413 은 `{error}` JSON(사유가 파서 오류로 지워지지 않게 — 교훈 2026-09-21) · 소유는 부모 시험으로.
 * 표본 지문은 우리가 지은 짧은 글이다(교재·출판사 지문 아님).
 */
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Viewer = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  branchId?: string | null;
  branchRole?: "owner" | "manager" | "teacher" | null;
};
const sessionState = vi.hoisted(() => ({ user: null as Viewer | null }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/session", () => ({
  getSessionUser: vi.fn(async () => sessionState.user),
}));
vi.mock("@/lib/db", async () => {
  const { prismaTestDouble } = await import("@/mocks/prismaTestDouble");
  const { composeEnglishDb } = await import("@/mocks/englishTestDouble");
  return { db: composeEnglishDb(prismaTestDouble) };
});

import {
  GET as listMaterials,
  POST as createMaterial,
} from "@/app/api/english/exams/[id]/materials/route";
import {
  DELETE as deleteMaterial,
  GET as downloadMaterial,
} from "@/app/api/english/materials/[id]/route";

import { errorResponseSchema } from "@/contracts/common.contract";
import {
  ENGLISH_MATERIAL_CONTENT_MAX,
  ENGLISH_MATERIAL_MAX_BYTES,
  ENGLISH_MATERIAL_MAX_LABEL,
  englishMaterialListResponseSchema,
  englishMaterialResponseSchema,
} from "@/contracts/english.contract";
import { USER_OTHER_ID, USER_TEACHER_ID } from "@/mocks/data";
import {
  englishRows,
  seedEnglishExam,
  seedEnglishMaterial,
} from "@/mocks/englishTestDouble";
import { seedUsers } from "@/mocks/prismaTestDouble";

const ORIGIN = "http://localhost";
const NOT_FOUND_ID = "00000000-0000-4000-8000-00000000dead";
const BRANCH_A = "30000000-0000-4000-8000-00000000000a";
const BRANCH_TEACHER_ID = "10000000-0000-4000-8000-0000000000a1";
const BRANCH_ADMIN_ID = "10000000-0000-4000-8000-0000000000a2";

const TEACHER: Viewer = {
  id: USER_TEACHER_ID,
  email: "teacher@example.com",
  name: "김원장",
  isAdmin: false,
};
const BRANCH_ADMIN: Viewer = {
  id: BRANCH_ADMIN_ID,
  email: "branch-admin@example.com",
  name: "지점 관리자",
  isAdmin: true,
  branchId: BRANCH_A,
  branchRole: "owner",
};

const PASSAGE =
  "Students worked together to build a small garden behind their school. They learned that cooperation makes difficult tasks easier.";

function jsonRequest(
  url: string,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new NextRequest(url, {
    method,
    headers: {
      origin: ORIGIN,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** multipart 요청 — 브라우저처럼 `content-type` 은 undici 가 경계와 함께 붙인다 */
function fileRequest(
  url: string,
  file: { name: string; bytes: Uint8Array<ArrayBuffer>; type?: string } | null,
  headers: Record<string, string> = {},
) {
  const form = new FormData();
  if (file)
    form.set(
      "file",
      new File([file.bytes], file.name, { type: file.type ?? "" }),
    );
  return new NextRequest(url, {
    method: "POST",
    headers: { origin: ORIGIN, ...headers },
    body: form,
  });
}

const withId = (id: string) => ({ params: Promise.resolve({ id }) });
const materialsUrl = (examId: string) =>
  `${ORIGIN}/api/english/exams/${examId}/materials`;
const materialUrl = (id: string) => `${ORIGIN}/api/english/materials/${id}`;

let examId: string;
let othersExamId: string;

beforeEach(() => {
  sessionState.user = TEACHER;
  seedUsers([
    {
      id: BRANCH_TEACHER_ID,
      email: "branch-teacher@example.com",
      name: "지점 강사",
      isAdmin: false,
      branchId: BRANCH_A,
      branchRole: "teacher",
      deletedAt: null,
    },
    {
      id: BRANCH_ADMIN_ID,
      email: BRANCH_ADMIN.email,
      name: BRANCH_ADMIN.name,
      isAdmin: true,
      branchId: BRANCH_A,
      branchRole: "owner",
      deletedAt: null,
    },
  ]);
  examId = seedEnglishExam({
    userId: USER_TEACHER_ID,
    school: "한빛중학교",
    grade: "중2",
    title: "2학기 중간",
  }).id;
  othersExamId = seedEnglishExam({
    userId: USER_OTHER_ID,
    school: "남의학교",
    grade: "고1",
    title: "남의 시험",
  }).id;
});

describe("POST materials — JSON 지문", () => {
  it("201 · 파일 없음 · 글 그대로 · 크기는 UTF-8 바이트 수", async () => {
    const res = await createMaterial(
      jsonRequest(materialsUrl(examId), "POST", {
        name: "협력 지문",
        content: PASSAGE,
      }),
      withId(examId),
    );
    expect(res.status).toBe(201);
    const body = englishMaterialResponseSchema.parse(await res.json());
    expect(body.data).toMatchObject({
      examId,
      name: "협력 지문",
      mimeType: "text/plain",
      hasFile: false,
      content: PASSAGE,
      size: Buffer.byteLength(PASSAGE, "utf8"),
    });
    expect(englishRows.materials()[0]).toMatchObject({
      bytes: null,
      content: PASSAGE,
    });
  });

  it.each([
    ["이름 없음", { content: PASSAGE }],
    ["글이 빈 칸", { name: "지문", content: "   " }],
    [
      "글이 30,000자 초과",
      { name: "지문", content: "a".repeat(ENGLISH_MATERIAL_CONTENT_MAX + 1) },
    ],
    ["모르는 칸", { name: "지문", content: PASSAGE, mimeType: "text/html" }],
  ])("%s → 400", async (_label, body) => {
    const res = await createMaterial(
      jsonRequest(materialsUrl(examId), "POST", body),
      withId(examId),
    );
    expect(res.status).toBe(400);
    expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
      "VALIDATION_ERROR",
    );
  });

  it("세션 없음 401 · 없는 시험 404 · 남의 시험 403 · 다른 출처 403", async () => {
    const body = { name: "지문", content: PASSAGE };
    sessionState.user = null;
    expect(
      (
        await createMaterial(
          jsonRequest(materialsUrl(examId), "POST", body),
          withId(examId),
        )
      ).status,
    ).toBe(401);
    sessionState.user = TEACHER;
    expect(
      (
        await createMaterial(
          jsonRequest(materialsUrl(NOT_FOUND_ID), "POST", body),
          withId(NOT_FOUND_ID),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await createMaterial(
          jsonRequest(materialsUrl(othersExamId), "POST", body),
          withId(othersExamId),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await createMaterial(
          jsonRequest(materialsUrl(examId), "POST", body, {
            origin: "https://evil.test",
          }),
          withId(examId),
        )
      ).status,
    ).toBe(403);
    expect(englishRows.materials()).toHaveLength(0);
  });
});

describe("POST materials — multipart 파일", () => {
  const PNG = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3,
  ]);

  it("png 는 201 · 파일 있음 · 글 없음 · MIME 은 확장자로(브라우저가 보낸 형은 안 믿는다) · 원본 bytes 저장", async () => {
    const res = await createMaterial(
      fileRequest(materialsUrl(examId), {
        name: "시험지 사진.PNG",
        bytes: PNG,
        type: "application/octet-stream",
      }),
      withId(examId),
    );
    expect(res.status).toBe(201);
    const body = englishMaterialResponseSchema.parse(await res.json());
    expect(body.data).toMatchObject({
      name: "시험지 사진.PNG",
      mimeType: "image/png",
      size: PNG.byteLength,
      hasFile: true,
      content: null,
    });
    const [row] = englishRows.materials();
    expect(row?.bytes && Buffer.from(row.bytes).equals(Buffer.from(PNG))).toBe(
      true,
    );
  });

  it(".txt 파일은 원본과 함께 지문 글(content)도 채운다", async () => {
    const res = await createMaterial(
      fileRequest(materialsUrl(examId), {
        name: "passage.txt",
        bytes: new TextEncoder().encode(`  ${PASSAGE}\n`),
        type: "text/plain",
      }),
      withId(examId),
    );
    expect(res.status).toBe(201);
    const body = englishMaterialResponseSchema.parse(await res.json());
    expect(body.data).toMatchObject({
      mimeType: "text/plain",
      hasFile: true,
      content: PASSAGE,
    });
  });

  it.each(["exe", "hwp", "zip", "svg", "js"])(
    "허용 목록 밖 확장자 .%s 는 400",
    async (ext) => {
      const res = await createMaterial(
        fileRequest(materialsUrl(examId), {
          name: `file.${ext}`,
          bytes: PNG,
        }),
        withId(examId),
      );
      expect(res.status).toBe(400);
      expect(errorResponseSchema.parse(await res.json()).error.code).toBe(
        "VALIDATION_ERROR",
      );
    },
  );

  it("file 칸이 없으면 400 · 빈 파일은 400", async () => {
    expect(
      (
        await createMaterial(
          fileRequest(materialsUrl(examId), null),
          withId(examId),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await createMaterial(
          fileRequest(materialsUrl(examId), {
            name: "empty.pdf",
            bytes: new Uint8Array(0),
          }),
          withId(examId),
        )
      ).status,
    ).toBe(400);
    expect(englishRows.materials()).toHaveLength(0);
  });

  it("multipart 본문이 깨져 있으면 400 (500 이 아니다)", async () => {
    const res = await createMaterial(
      new NextRequest(materialsUrl(examId), {
        method: "POST",
        headers: {
          origin: ORIGIN,
          "content-type": "multipart/form-data; boundary=nope",
        },
        body: "this is not multipart",
      }),
      withId(examId),
    );
    expect(res.status).toBe(400);
  });

  it("🔴 content-length 가 상한을 넘으면 본문을 읽기 전에 413 — 사유가 JSON 으로 남는다", async () => {
    const res = await createMaterial(
      new NextRequest(materialsUrl(examId), {
        method: "POST",
        headers: {
          origin: ORIGIN,
          "content-type": "multipart/form-data; boundary=x",
          "content-length": String(ENGLISH_MATERIAL_MAX_BYTES * 3),
        },
        // 본문은 multipart 가 아니다 — 먼저 읽었다면 400 이었을 것
        body: "tiny",
      }),
      withId(examId),
    );
    expect(res.status).toBe(413);
    expect(res.headers.get("content-type")).toMatch(/json/);
    const body = errorResponseSchema.parse(await res.json());
    expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(body.error.message).toBe(
      `파일은 ${ENGLISH_MATERIAL_MAX_LABEL} 이하로 올려 주세요.`,
    );
  });

  it(`🔴 상한(${ENGLISH_MATERIAL_MAX_LABEL}) 경계를 실제 바이트로 — 정확히 상한은 201, 1바이트 넘으면 413`, async () => {
    const exact = new Uint8Array(ENGLISH_MATERIAL_MAX_BYTES);
    exact[0] = 0x25; // %PDF
    const ok = await createMaterial(
      fileRequest(materialsUrl(examId), { name: "exact.pdf", bytes: exact }),
      withId(examId),
    );
    expect(ok.status).toBe(201);
    expect(englishMaterialResponseSchema.parse(await ok.json()).data.size).toBe(
      ENGLISH_MATERIAL_MAX_BYTES,
    );

    const over = new Uint8Array(ENGLISH_MATERIAL_MAX_BYTES + 1);
    const rejected = await createMaterial(
      fileRequest(materialsUrl(examId), { name: "over.pdf", bytes: over }),
      withId(examId),
    );
    expect(rejected.status).toBe(413);
    expect(errorResponseSchema.parse(await rejected.json()).error.code).toBe(
      "PAYLOAD_TOO_LARGE",
    );
    expect(englishRows.materials()).toHaveLength(1);
  }, 60_000);
});

describe("GET materials — 목록", () => {
  it("파일 원본 없이 — hasFile 과 content 만 · 올린 차례대로 · 다른 시험 것은 안 섞인다", async () => {
    const first = seedEnglishMaterial({
      examId,
      name: "a.pdf",
      mimeType: "application/pdf",
      size: 3,
      bytes: new Uint8Array([1, 2, 3]),
      createdAt: new Date("2026-09-01T00:00:00Z"),
    });
    const second = seedEnglishMaterial({
      examId,
      name: "지문",
      content: PASSAGE,
      createdAt: new Date("2026-09-02T00:00:00Z"),
    });
    seedEnglishMaterial({
      examId: othersExamId,
      name: "남의 지문",
      content: "x",
    });

    const res = await listMaterials(
      jsonRequest(materialsUrl(examId), "GET"),
      withId(examId),
    );
    expect(res.status).toBe(200);
    const body = englishMaterialListResponseSchema.parse(await res.json());
    expect(body.data.map((m) => m.id)).toEqual([first.id, second.id]);
    expect(body.data[0]).toMatchObject({ hasFile: true, content: null });
    expect(body.data[1]).toMatchObject({ hasFile: false, content: PASSAGE });
    expect(JSON.stringify(body)).not.toContain("bytes");
  });

  it("세션 없음 401 · 없는 시험 404 · 남의 시험 403 · 지점 관리자는 지점 강사의 시험을 본다", async () => {
    sessionState.user = null;
    expect(
      (
        await listMaterials(
          jsonRequest(materialsUrl(examId), "GET"),
          withId(examId),
        )
      ).status,
    ).toBe(401);
    sessionState.user = TEACHER;
    expect(
      (
        await listMaterials(
          jsonRequest(materialsUrl(NOT_FOUND_ID), "GET"),
          withId(NOT_FOUND_ID),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await listMaterials(
          jsonRequest(materialsUrl(othersExamId), "GET"),
          withId(othersExamId),
        )
      ).status,
    ).toBe(403);
    const branchExam = seedEnglishExam({
      userId: BRANCH_TEACHER_ID,
      school: "지점학교",
      grade: "중3",
      title: "지점 시험",
    });
    sessionState.user = BRANCH_ADMIN;
    expect(
      (
        await listMaterials(
          jsonRequest(materialsUrl(branchExam.id), "GET"),
          withId(branchExam.id),
        )
      ).status,
    ).toBe(200);
  });
});

describe("GET /api/english/materials/[id] — 내려받기", () => {
  it("파일이면 원본 bytes 를 그 MIME 으로 · attachment(UTF-8 이름) · nosniff", async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 9, 8, 7]);
    const row = seedEnglishMaterial({
      examId,
      name: "2학기 시험 범위.pdf",
      mimeType: "application/pdf",
      size: bytes.byteLength,
      bytes,
    });
    const res = await downloadMaterial(
      jsonRequest(materialUrl(row.id), "GET"),
      withId(row.id),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    const disposition = res.headers.get("content-disposition") ?? "";
    expect(disposition).toMatch(/^attachment;/);
    expect(disposition).toContain(
      `filename*=UTF-8''${encodeURIComponent("2학기 시험 범위.pdf")}`,
    );
    expect(
      Buffer.from(await res.arrayBuffer()).equals(Buffer.from(bytes)),
    ).toBe(true);
  });

  it("텍스트 자료면 content 를 text/plain; charset=utf-8 로 · 이름에 .txt 를 붙인다", async () => {
    const row = seedEnglishMaterial({
      examId,
      name: "협력 지문",
      content: PASSAGE,
    });
    const res = await downloadMaterial(
      jsonRequest(materialUrl(row.id), "GET"),
      withId(row.id),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-disposition")).toContain(
      `filename*=UTF-8''${encodeURIComponent("협력 지문.txt")}`,
    );
    expect(await res.text()).toBe(PASSAGE);
  });

  it("세션 없음 401 · 없는 자료 404 · 남의 시험의 자료 403 · 지점 관리자는 받는다", async () => {
    const mine = seedEnglishMaterial({
      examId,
      name: "지문",
      content: PASSAGE,
    });
    const others = seedEnglishMaterial({
      examId: othersExamId,
      name: "남의 지문",
      content: "x",
    });
    sessionState.user = null;
    expect(
      (
        await downloadMaterial(
          jsonRequest(materialUrl(mine.id), "GET"),
          withId(mine.id),
        )
      ).status,
    ).toBe(401);
    sessionState.user = TEACHER;
    expect(
      (
        await downloadMaterial(
          jsonRequest(materialUrl(NOT_FOUND_ID), "GET"),
          withId(NOT_FOUND_ID),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await downloadMaterial(
          jsonRequest(materialUrl(others.id), "GET"),
          withId(others.id),
        )
      ).status,
    ).toBe(403);
    const branchExam = seedEnglishExam({
      userId: BRANCH_TEACHER_ID,
      school: "지점학교",
      grade: "중3",
      title: "지점 시험",
    });
    const branchMaterial = seedEnglishMaterial({
      examId: branchExam.id,
      name: "지점 지문",
      content: "y",
    });
    sessionState.user = BRANCH_ADMIN;
    expect(
      (
        await downloadMaterial(
          jsonRequest(materialUrl(branchMaterial.id), "GET"),
          withId(branchMaterial.id),
        )
      ).status,
    ).toBe(200);
  });
});

describe("DELETE /api/english/materials/[id]", () => {
  it("지우면 행이 사라진다 · 없으면 404 · 남의 것 403 · 다른 출처 403", async () => {
    const mine = seedEnglishMaterial({
      examId,
      name: "지문",
      content: PASSAGE,
    });
    const others = seedEnglishMaterial({
      examId: othersExamId,
      name: "남의 지문",
      content: "x",
    });
    expect(
      (
        await deleteMaterial(
          jsonRequest(materialUrl(others.id), "DELETE"),
          withId(others.id),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await deleteMaterial(
          jsonRequest(materialUrl(mine.id), "DELETE", undefined, {
            origin: "https://evil.test",
          }),
          withId(mine.id),
        )
      ).status,
    ).toBe(403);
    const res = await deleteMaterial(
      jsonRequest(materialUrl(mine.id), "DELETE"),
      withId(mine.id),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { id: mine.id } });
    expect(englishRows.materials().map((m) => m.id)).toEqual([others.id]);
    expect(
      (
        await deleteMaterial(
          jsonRequest(materialUrl(mine.id), "DELETE"),
          withId(mine.id),
        )
      ).status,
    ).toBe(404);
  });
});
