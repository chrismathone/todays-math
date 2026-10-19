import "server-only";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { authorizeAccount } from "@/lib/accountAccess";
import { privateError, privateHeaders } from "@/lib/privateWorkspace";
import { EXAM_CONDITION_KIND } from "@/contracts/privateWorkspace.contract";
import {
  EXAM_CONDITION_ERROR,
  EXAM_CONDITION_LIMIT,
  examConditionIdSchema,
  examConditionPayloadSchema,
  patchExamConditionSchema,
  saveExamConditionSchema,
  type ExamCondition,
  type ExamConditionPayload,
} from "@/contracts/examCondition.contract";

/**
 * 시험지 만들기 «이름 붙인 출제 조건»(W5 · 원장님 2026-10-16)의 서버 — `/api/studio/exam-conditions`.
 *
 * 저장 자리는 내 시험지와 같은 표(`workspace_document`, kind `examCondition`)지만 **자료가 아니다** —
 * 늘 비공개(`visibility` private · `sharedBranchId` null)이고 주인(로그인한 계정)의 행만 읽고 쓴다.
 * 자료 목록 · 수 · 공유 · 사본 길은 이 종류를 걸러 낸다(`privateDocumentList.ts` · `privateDocumentActions.ts`).
 * 감사 기록(`material.*`)도 남기지 않는다 — 관리자 화면의 «자료» 기록에 섞이지 않게.
 */

const KIND = EXAM_CONDITION_KIND;
const BODY_LIMIT = 64 * 1024;

type Stored = { id: string; revision: number; payload: unknown };

function dto(row: Stored): ExamCondition | null {
  const parsed = examConditionPayloadSchema.safeParse(row.payload);
  return parsed.success
    ? { id: row.id, revision: row.revision, condition: parsed.data }
    : null;
}

function nameTaken(existing: { id: string; revision: number }) {
  return Response.json(
    {
      error: {
        code: EXAM_CONDITION_ERROR.NAME_TAKEN,
        message: "같은 이름의 조건이 있습니다.",
        existing,
      },
    },
    { status: 409, headers: privateHeaders },
  );
}
const changedElsewhere = () =>
  privateError(
    "다른 창에서 조건이 바뀌었습니다. 목록을 다시 연 뒤 해 주세요.",
    409,
  );

async function authorize(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return { response: access.response };
  const account = access.account!;
  if (
    request.headers.has("x-workspace-owner") &&
    request.headers.get("x-workspace-owner") !== account.id
  )
    return {
      response: privateError(
        "로그인한 계정이 변경되었습니다. 작업을 다시 열어 주세요.",
        403,
      ),
    };
  if (!account.menus.includes("bank"))
    return {
      response: privateError(
        "시험지 만들기 메뉴를 사용할 권한이 없습니다.",
        403,
      ),
    };
  // Session snapshots are not authority for a suspended or removed account.
  const current = await db.user.findFirst({
    where: {
      id: account.id,
      deletedAt: null,
      suspendedAt: null,
      approvalStatus: "approved",
    },
    select: { id: true },
  });
  if (!current)
    return { response: privateError("계정 권한을 다시 확인해 주세요.", 403) };
  return { userId: account.id };
}

async function readBody(request: Request): Promise<unknown> {
  const text = await request.text().catch(() => "");
  if (text.length > BODY_LIMIT) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const select = { id: true, revision: true, payload: true } as const;
const nameOf = (row: Stored) => dto(row)?.condition.name;

/** 목록 — 마지막으로 쓴 차례. 꼴이 틀린 행(다른 판)은 싣지 않는다(지어내지 않는다). */
export async function listExamConditions(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const rows = await db.workspaceDocument.findMany({
    where: { userId: auth.userId, kind: KIND },
    select,
    take: EXAM_CONDITION_LIMIT * 2,
  });
  const data = rows
    .map(dto)
    .filter((row): row is ExamCondition => row !== null)
    .sort(
      (a, b) =>
        Date.parse(b.condition.lastUsedAt) - Date.parse(a.condition.lastUsedAt),
    );
  return Response.json(
    { data, meta: { limit: EXAM_CONDITION_LIMIT } },
    { headers: privateHeaders },
  );
}

/** 저장 — 새로, 또는 화면이 «바꿀까요?»를 물은 뒤 같은 이름의 조건을 바꿔. */
export async function createExamCondition(request: Request) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const parsed = saveExamConditionSchema.safeParse(await readBody(request));
  if (!parsed.success)
    return privateError("저장할 조건의 형식을 확인해 주세요.", 400);
  const { condition, replace } = parsed.data;
  const userId = auth.userId;
  const payload: ExamConditionPayload = {
    ...condition,
    lastUsedAt: new Date().toISOString(),
  };
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.workspaceDocument.findMany({
      where: { userId, kind: KIND },
      select,
    });
    const sameName = existing.find(
      (row) => nameOf(row) === condition.name && row.id !== replace?.id,
    );
    if (sameName)
      return nameTaken({ id: sameName.id, revision: sameName.revision });
    if (replace) {
      const changed = await tx.workspaceDocument.updateMany({
        where: {
          userId,
          id: replace.id,
          kind: KIND,
          revision: replace.expectedRevision,
        },
        data: {
          title: condition.name,
          payload: payload as Prisma.InputJsonObject,
          revision: { increment: 1 },
        },
      });
      if (changed.count !== 1) return changedElsewhere();
      return {
        status: 200,
        row: {
          id: replace.id,
          revision: replace.expectedRevision + 1,
          payload,
        },
      };
    }
    if (existing.length >= EXAM_CONDITION_LIMIT)
      return privateError(
        `저장한 조건은 ${EXAM_CONDITION_LIMIT}개까지입니다. 쓰지 않는 조건을 지운 뒤 저장해 주세요.`,
        409,
        EXAM_CONDITION_ERROR.LIMIT,
      );
    const id = randomUUID();
    await tx.workspaceDocument.create({
      data: {
        userId,
        id,
        kind: KIND,
        title: condition.name,
        payload: payload as Prisma.InputJsonObject,
        problemCount: 0,
        visibility: "private",
        sharedBranchId: null,
      },
    });
    return { status: 201, row: { id, revision: 1, payload } };
  });
  if (result instanceof Response) return result;
  return Response.json(
    { data: dto(result.row) },
    { status: result.status, headers: privateHeaders },
  );
}

/** 이름 바꾸기(버전을 맞춰야) · 적용(마지막 사용을 지금으로). */
export async function patchExamCondition(request: Request, id: string) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const parsed = patchExamConditionSchema.safeParse(await readBody(request));
  if (!examConditionIdSchema.safeParse(id).success || !parsed.success)
    return privateError("바꿀 내용을 확인해 주세요.", 400);
  const userId = auth.userId;
  const patch = parsed.data;
  const result = await db.$transaction(async (tx) => {
    const previous = await tx.workspaceDocument.findFirst({
      where: { userId, id, kind: KIND },
      select,
    });
    const current = previous && dto(previous);
    if (!previous || !current)
      return privateError("조건을 찾지 못했습니다.", 404);
    let next: ExamConditionPayload;
    if (patch.action === "rename") {
      if (previous.revision !== patch.expectedRevision)
        return changedElsewhere();
      const others = await tx.workspaceDocument.findMany({
        where: { userId, kind: KIND },
        select,
      });
      const sameName = others.find(
        (row) => row.id !== id && nameOf(row) === patch.name,
      );
      if (sameName)
        return nameTaken({ id: sameName.id, revision: sameName.revision });
      next = { ...current.condition, name: patch.name };
    } else
      next = { ...current.condition, lastUsedAt: new Date().toISOString() };
    const revision = previous.revision;
    const changed = await tx.workspaceDocument.updateMany({
      where: { userId, id, kind: KIND, revision },
      data: {
        title: next.name,
        payload: next as Prisma.InputJsonObject,
        revision: { increment: 1 },
      },
    });
    if (changed.count !== 1) return changedElsewhere();
    return { id, revision: revision + 1, payload: next };
  });
  if (result instanceof Response) return result;
  return Response.json({ data: dto(result) }, { headers: privateHeaders });
}

export async function deleteExamCondition(request: Request, id: string) {
  const auth = await authorize(request);
  if (auth.response) return auth.response;
  const revision = Number(new URL(request.url).searchParams.get("revision"));
  if (
    !examConditionIdSchema.safeParse(id).success ||
    !Number.isSafeInteger(revision) ||
    revision < 1
  )
    return privateError("조건 버전을 확인해 주세요.", 400);
  const removed = await db.workspaceDocument.deleteMany({
    where: { userId: auth.userId, id, kind: KIND, revision },
  });
  return removed.count === 1
    ? Response.json({ data: { deleted: true } }, { headers: privateHeaders })
    : privateError(
        "조건이 바뀌었거나 이미 지워졌습니다. 목록을 다시 열어 주세요.",
        409,
      );
}
