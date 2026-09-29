/**
 * GET  /api/english/exams/{id}/materials — 자료 목록(파일 원본 없이 — `hasFile`, 텍스트는 `content`)
 * POST /api/english/exams/{id}/materials — JSON `{name, content}` **또는** multipart `file`
 *      (pdf · docx · txt · png · jpg ≤ 10MB). `.txt` 는 파일 원본과 함께 `content` 도 채운다(≤30,000자).
 * 대응 계약: src/contracts/english.contract.ts (D-148 · 25 §3)
 *
 * 🔴 크기는 **받는 쪽이 재기 전에** `content-length` 로 먼저 자르고, 413 은 `{error}` JSON 으로 —
 *    사유가 파서 오류로 지워진 전례(교훈 2026-09-21). 머리가 없거나 겉봉 여유 안이면 받은 뒤 `file.size` 로 다시 잰다.
 */
import type { NextRequest } from "next/server";

import { idParamSchema } from "@/contracts/common.contract";
import {
  ENGLISH_MATERIAL_CONTENT_MAX,
  ENGLISH_MATERIAL_MAX_BYTES,
  englishMaterialListResponseSchema,
  englishMaterialResponseSchema,
  englishMaterialTextCreateSchema,
} from "@/contracts/english.contract";
import { jsonError, jsonOk, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import {
  ENGLISH_MATERIAL_MIME_BY_EXTENSION,
  ENGLISH_ROUTE_MESSAGES,
  contentLengthExceeds,
  englishMaterialExtension,
  payloadTooLarge,
  readJson,
  requireEnglishSession,
} from "@/lib/english/routeSupport";
import { serializeEnglishMaterial } from "@/lib/english/serialize";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { requireOwnedEnglishExam } from "@/lib/ownership";

type RouteContext = { params: Promise<{ id: string }> };

/** 목록·응답용 칸 — `bytes` 는 읽지 않는다(자료마다 10MB 일 수 있다) */
const MATERIAL_FIELDS = {
  id: true,
  examId: true,
  name: true,
  mimeType: true,
  size: true,
  content: true,
  createdAt: true,
} as const;

async function handleGet(request: NextRequest, { params }: RouteContext) {
  const gate = await requireEnglishSession(request);
  if (gate.response) return gate.response;

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const owned = await requireOwnedEnglishExam(gate.session, id);
  if (!owned.ok) return owned.response;

  const [rows, withFile] = await Promise.all([
    db.englishMaterial.findMany({
      where: { examId: id },
      select: MATERIAL_FIELDS,
      orderBy: { createdAt: "asc" },
    }),
    db.englishMaterial.findMany({
      where: { examId: id, bytes: { not: null } },
      select: { id: true },
    }),
  ]);
  const hasFile = new Set(withFile.map((row) => row.id));
  const res = jsonOk(englishMaterialListResponseSchema, {
    data: rows.map((row) => serializeEnglishMaterial(row, hasFile.has(row.id))),
  });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}

const BAD_REQUEST = (message: string) =>
  jsonError("VALIDATION_ERROR", message, 400);

async function createFromMultipart(request: NextRequest, examId: string) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return BAD_REQUEST(ENGLISH_ROUTE_MESSAGES.multipartUnreadable);
  }
  const file = form.get("file");
  if (!(file instanceof File))
    return BAD_REQUEST(ENGLISH_ROUTE_MESSAGES.fileFieldMissing);

  const name = file.name.trim();
  const ext = englishMaterialExtension(name);
  if (!ext || name.length > 255)
    return BAD_REQUEST(ENGLISH_ROUTE_MESSAGES.unsupportedFile);
  if (file.size > ENGLISH_MATERIAL_MAX_BYTES) return payloadTooLarge();
  if (file.size === 0) return BAD_REQUEST(ENGLISH_ROUTE_MESSAGES.emptyFile);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > ENGLISH_MATERIAL_MAX_BYTES) return payloadTooLarge();
  // .txt 는 지문 글도 같이 — 문제 제작이 바로 쓴다. 계약 상한(30,000자)을 넘는 뒷부분은 싣지 않는다(원본은 bytes 에 그대로)
  const content =
    ext === "txt"
      ? new TextDecoder("utf-8")
          .decode(bytes)
          .trim()
          .slice(0, ENGLISH_MATERIAL_CONTENT_MAX)
      : null;

  const created = await db.englishMaterial.create({
    data: {
      examId,
      name,
      mimeType: ENGLISH_MATERIAL_MIME_BY_EXTENSION[ext]!,
      size: bytes.byteLength,
      bytes,
      content: content || null,
    },
    select: MATERIAL_FIELDS,
  });
  return jsonOk(
    englishMaterialResponseSchema,
    { data: serializeEnglishMaterial(created, true) },
    { status: 201 },
  );
}

async function createFromJson(request: NextRequest, examId: string) {
  const parsed = englishMaterialTextCreateSchema.safeParse(
    await readJson(request),
  );
  if (!parsed.success) return validationError(parsed.error);
  const { name, content } = parsed.data;
  const created = await db.englishMaterial.create({
    data: {
      examId,
      name,
      mimeType: "text/plain",
      size: Buffer.byteLength(content, "utf8"),
      bytes: null,
      content,
    },
    select: MATERIAL_FIELDS,
  });
  return jsonOk(
    englishMaterialResponseSchema,
    { data: serializeEnglishMaterial(created, false) },
    { status: 201 },
  );
}

async function handlePost(request: NextRequest, { params }: RouteContext) {
  const gate = await requireEnglishSession(request, { mutation: true });
  if (gate.response) return gate.response;

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const owned = await requireOwnedEnglishExam(gate.session, id);
  if (!owned.ok) return owned.response;

  // 본문을 읽기 전에 — 큰 파일은 여기서 끝난다
  if (contentLengthExceeds(request)) return payloadTooLarge();

  const contentType = request.headers.get("content-type") ?? "";
  return /^multipart\/form-data/i.test(contentType)
    ? createFromMultipart(request, id)
    : createFromJson(request, id);
}

export const GET = withErrorLog("/api/english/exams/[id]/materials", handleGet);
export const POST = withErrorLog(
  "/api/english/exams/[id]/materials",
  handlePost,
);
