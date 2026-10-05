import "server-only";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { sameOriginMutation } from "@/lib/accountAccess";
import { db } from "@/lib/db";
import {
  listeningMediaUploadSchema,
  listeningMediaChunkSchema,
  listeningMediaCompleteSchema,
} from "@/contracts/englishListeningMedia.contract";
import { ListeningMediaError } from "../media/errors";
import { createListeningMediaService } from "../media/service";
import { createListeningDriveApi } from "../media/driveApi";
import { readListeningDriveConfig } from "../media/driveConfig";
import {
  createListeningStorageApi,
  readListeningStorageConfig,
} from "../media/storageApi";
import { PrismaListeningMediaStore } from "../media/prismaStore";
import { PrismaStorageListeningMediaStore } from "../media/storageStore";
import { createListeningRuntime } from "./service";
import {
  createListeningMediaAccess,
  type ListeningMediaActor,
} from "./mediaAccess";
import {
  ListeningRuntimeError,
  denied,
  invalid,
  student,
  type ListeningActor,
} from "./database";
import { studentState } from "./students";
import { listeningJsonResponse } from "./jsonResponse";
import {
  LISTENING_MAX_UPLOAD_BYTES,
  LISTENING_MAX_DURATION_MS,
  LISTENING_MAX_DOCUMENT_BYTES,
} from "@/contracts/englishListeningSource.contract";

const driveConfig = readListeningDriveConfig();
const drive = driveConfig ? createListeningDriveApi(driveConfig) : null;
const storageConfig = readListeningStorageConfig();
const storage = storageConfig ? createListeningStorageApi(storageConfig) : null;
const runtime = createListeningRuntime(db, undefined, { drive, storage });
const media = createListeningMediaService({
  drive,
  storage,
  mp3PlaybackEncoding: "scrubbed_mp3",
  store: storage
    ? new PrismaStorageListeningMediaStore(db, storage)
    : new PrismaListeningMediaStore(db),
  ...createListeningMediaAccess(db),
  limits: {
    chunkBytes: 1024 * 1024,
    maxTotalBytes: LISTENING_MAX_UPLOAD_BYTES,
    maxDurationMs: LISTENING_MAX_DURATION_MS,
  },
});
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const ok = (data: unknown, status = 200) =>
  listeningJsonResponse(data, status, headers);
const error = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status, headers });
export async function listeningJson(request: Request) {
  const limit = LISTENING_MAX_DOCUMENT_BYTES + 1024 * 1024;
  if (Number(request.headers.get("content-length") ?? 0) > limit)
    throw new ListeningRuntimeError(
      413,
      "VALIDATION_ERROR",
      "요청 본문이 너무 큽니다.",
    );
  const reader = request.body?.getReader();
  if (!reader) throw invalid("JSON 본문이 필요합니다.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const value = await reader.read();
      if (value.done) break;
      size += value.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw invalid("요청 본문이 너무 큽니다.");
      }
      chunks.push(value.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw invalid("JSON 본문을 확인해 주세요.");
  }
}
async function actorFor(kind: "teacher" | "student"): Promise<ListeningActor> {
  const session = await auth();
  if (kind === "student" && session?.student)
    return { kind, session: session.student };
  if (kind === "teacher" && session?.user?.id)
    return { kind, userId: session.user.id };
  throw new ListeningRuntimeError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
}
const uuid = (id: string | undefined) => z.uuid().parse(id);
export async function handleListeningHttp(
  request: Request,
  path: string[],
  kind: "teacher" | "student",
) {
  try {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
      !sameOriginMutation(request)
    )
      return error(403, "FORBIDDEN", "같은 사이트에서 요청해 주세요.");
    const actor = await actorFor(kind);
    const method = request.method;
    if (kind === "teacher") {
      const [resource, rawId, action, rawAssetId, mediaAction] = path;
      if (path.length === 1 && method === "POST" && resource === "compose")
        return ok(
          await runtime.composeSet(actor, await listeningJson(request)),
          201,
        );
      if (
        path.length === 1 &&
        method === "GET" &&
        (resource === "bank" || resource === "references")
      )
        return Response.json(
          await runtime.teacherBank(
            actor,
            resource,
            Object.fromEntries(new URL(request.url).searchParams),
          ),
          { headers },
        );
      if (
        path.length === 1 &&
        ["sets", "assignments", "classes"].includes(resource) &&
        method === "GET"
      )
        return ok(
          await runtime.teacherList(
            actor,
            resource as "sets" | "assignments" | "classes",
          ),
        );
      if (path.length === 1 && method === "POST" && resource === "sets")
        return ok(
          await runtime.createSet(actor, await listeningJson(request)),
          201,
        );
      if (path.length === 1 && method === "POST" && resource === "assignments")
        return ok(
          await runtime.createAssignment(actor, await listeningJson(request)),
          201,
        );
      const id = uuid(rawId);
      if (resource === "sets") {
        if (
          path.length === 3 &&
          method === "GET" &&
          action === "source-transcripts"
        )
          return ok(await runtime.sourceTranscripts(actor, id));
        if (
          path.length === 3 &&
          method === "GET" &&
          action === "compose-source"
        )
          return ok(await runtime.composeSource(actor, id));
        if (path.length === 2 && method === "GET")
          return ok(await runtime.setDetail(actor, id));
        if (path.length === 2 && method === "PATCH")
          return ok(
            await runtime.updateSet(actor, id, await listeningJson(request)),
          );
        if (path.length === 2 && method === "DELETE")
          return ok(
            await runtime.deleteSet(actor, id, await listeningJson(request)),
          );
        if (path.length === 3 && method === "POST" && action === "review")
          return ok(
            await runtime.reviewSet(actor, id, await listeningJson(request)),
          );
        if (path.length === 3 && method === "POST" && action === "publish")
          return ok(
            await runtime.publishSet(actor, id, await listeningJson(request)),
          );
        if (action === "media")
          return await teacherMedia(
            request,
            { actor },
            id,
            rawAssetId,
            mediaAction,
            path.length,
          );
      }
      if (resource === "assignments") {
        if (path.length === 2 && method === "GET")
          return ok(await runtime.assignmentDetail(actor, id));
        if (
          path.length === 3 &&
          method === "POST" &&
          ["targets", "cancel", "release", "broadcast", "retry"].includes(
            action,
          )
        )
          return ok(
            await runtime.mutateAssignment(
              actor,
              id,
              action as
                "targets" | "cancel" | "release" | "broadcast" | "retry",
              await listeningJson(request),
            ),
          );
      }
    } else {
      if (path.length === 0 && method === "GET")
        return ok(await runtime.studentList(actor));
      if (
        path.length === 1 &&
        path[0] === "sound-check" &&
        ["GET", "HEAD"].includes(method)
      ) {
        await db.$transaction((tx) => student(tx, actor));
        return soundCheck(method === "HEAD");
      }
      const id = uuid(path[0]);
      if (path.length === 1 && method === "GET")
        return ok(await runtime.studentDetail(actor, id));
      if (path.length === 2 && path[1] === "prepare" && method === "POST") {
        z.strictObject({}).parse(await listeningJson(request));
        return ok(await runtime.prepareStudent(actor, id));
      }
      if (path.length === 2 && path[1] === "commands" && method === "POST")
        return ok(
          await runtime.studentCommand(actor, id, await listeningJson(request)),
        );
      if (
        path.length === 3 &&
        path[1] === "media" &&
        ["GET", "HEAD"].includes(method)
      ) {
        const assetId = uuid(path[2]);
        const state = await db.$transaction((tx) =>
          studentState(tx, actor, id, new Date().toISOString()),
        );
        return await media.serve(
          { actor, assignmentId: id },
          {
            setId: state.set.id,
            assetId,
            method,
            range: request.headers.get("range"),
          },
          { signal: request.signal },
        );
      }
    }
    throw denied();
  } catch (cause) {
    if (cause instanceof ListeningRuntimeError)
      return error(cause.status, cause.code, cause.message);
    if (cause instanceof z.ZodError)
      return error(
        400,
        "VALIDATION_ERROR",
        "요청 값 또는 자료의 필수 내용을 확인해 주세요.",
      );
    if (cause instanceof ListeningMediaError) {
      const code = cause.code as string;
      return error(
        code === "not_found"
          ? 404
          : code === "conflict"
            ? 409
            : code === "too_large" || code === "quota_exceeded"
              ? 413
              : 400,
        code === "not_found"
          ? "NOT_FOUND"
          : code === "conflict"
            ? "CONFLICT"
            : "VALIDATION_ERROR",
        "음원 요청을 처리할 수 없습니다.",
      );
    }
    if (
      cause instanceof Error &&
      !("code" in cause || "clientVersion" in cause)
    )
      return error(
        409,
        "CONFLICT",
        "자료 검수 또는 응시 상태가 요청과 맞지 않습니다. 새로고침 후 확인해 주세요.",
      );
    return error(
      503,
      "INTERNAL_ERROR",
      "저장소에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
    );
  }
}
async function teacherMedia(
  request: Request,
  context: ListeningMediaActor,
  setId: string,
  rawAssetId: string | undefined,
  action: string | undefined,
  length: number,
) {
  if (length === 3 && request.method === "POST") {
    const data = listeningMediaUploadSchema
      .omit({ setId: true })
      .parse(await listeningJson(request));
    return ok(await media.beginUpload(context, { ...data, setId }), 201);
  }
  const assetId = uuid(rawAssetId);
  if (length === 4 && ["GET", "HEAD"].includes(request.method))
    return media.serve(
      context,
      {
        setId,
        assetId,
        method: request.method,
        range: request.headers.get("range"),
      },
      { signal: request.signal },
    );
  if (length === 5 && action === "complete" && request.method === "POST") {
    const data = listeningMediaCompleteSchema
      .omit({ setId: true, assetId: true })
      .parse(await listeningJson(request));
    return ok(
      await media.completeUpload(
        context,
        { ...data, setId, assetId },
        { signal: request.signal },
      ),
    );
  }
  if (length === 5 && action === "chunks" && request.method === "POST") {
    const params = new URL(request.url).searchParams;
    const data = listeningMediaChunkSchema.parse({
      setId,
      assetId,
      expectedRevision: Number(params.get("expectedRevision")),
      offset: Number(params.get("offset")),
      byteLength: Number(params.get("byteLength")),
      sha256: params.get("sha256"),
    });
    if (!request.body) throw invalid("음원 청크가 필요합니다.");
    async function* body() {
      const reader = request.body!.getReader();
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          yield chunk.value;
        }
      } finally {
        await reader.cancel();
        reader.releaseLock();
      }
    }
    return ok(
      await media.appendChunk(context, data, body(), {
        signal: request.signal,
      }),
    );
  }
  throw denied();
}
function soundCheck(head: boolean) {
  const rate = 8000;
  const samples = rate / 2;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    wav.writeInt16LE(
      Math.round(
        4000 *
          Math.sin((i * 440 * 2 * Math.PI) / rate) *
          Math.min(1, i / 200, (samples - i) / 200),
      ),
      44 + i * 2,
    );
  return new Response(head ? null : wav, {
    headers: {
      ...headers,
      "Content-Type": "audio/wav",
      "Content-Length": String(wav.length),
      "Content-Disposition": "inline; filename=sound-check.wav",
    },
  });
}
