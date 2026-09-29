/**
 * GET    /api/english/materials/{id} — 내려받기. 파일이면 원본 bytes, 텍스트 자료면 `content` 를
 *        `text/plain; charset=utf-8` 으로. `Content-Disposition: attachment` · `X-Content-Type-Options: nosniff`.
 * DELETE /api/english/materials/{id}
 * 소유는 부모 시험으로 판정한다(D-148 · 25 §3 — `requireOwnedEnglishExam`). JSON 계약 없음(내려받기).
 */
import type { NextRequest } from "next/server";

import {
  deleteResponseSchema,
  idParamSchema,
} from "@/contracts/common.contract";
import { jsonOk, notFoundError, validationError } from "@/lib/apiResponse";
import { db } from "@/lib/db";
import {
  attachmentDisposition,
  requireEnglishSession,
} from "@/lib/english/routeSupport";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { requireOwnedEnglishExam } from "@/lib/ownership";

type RouteContext = { params: Promise<{ id: string }> };

async function handleGet(request: NextRequest, { params }: RouteContext) {
  const gate = await requireEnglishSession(request);
  if (gate.response) return gate.response;

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const material = await db.englishMaterial.findUnique({ where: { id } });
  if (!material) return notFoundError("자료");
  const owned = await requireOwnedEnglishExam(gate.session, material.examId);
  if (!owned.ok) return owned.response;

  const headers = new Headers({
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  if (material.bytes) {
    headers.set("Content-Type", material.mimeType);
    headers.set("Content-Disposition", attachmentDisposition(material.name));
    headers.set("Content-Length", String(material.bytes.byteLength));
    return new Response(new Uint8Array(material.bytes), { headers });
  }
  const text = material.content ?? "";
  const name = /\.txt$/i.test(material.name)
    ? material.name
    : `${material.name}.txt`;
  headers.set("Content-Type", "text/plain; charset=utf-8");
  headers.set("Content-Disposition", attachmentDisposition(name));
  return new Response(text, { headers });
}

async function handleDelete(request: NextRequest, { params }: RouteContext) {
  const gate = await requireEnglishSession(request, { mutation: true });
  if (gate.response) return gate.response;

  const { id } = await params;
  const idResult = idParamSchema.safeParse({ id });
  if (!idResult.success) return validationError(idResult.error);

  const material = await db.englishMaterial.findUnique({
    where: { id },
    select: { examId: true },
  });
  if (!material) return notFoundError("자료");
  const owned = await requireOwnedEnglishExam(gate.session, material.examId);
  if (!owned.ok) return owned.response;

  await db.englishMaterial.delete({ where: { id } });
  return jsonOk(deleteResponseSchema, { data: { id } });
}

export const GET = withErrorLog("/api/english/materials/[id]", handleGet);
export const DELETE = withErrorLog("/api/english/materials/[id]", handleDelete);
