import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { authorizeAccount } from "@/lib/accountAccess";
import { db } from "@/lib/db";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";

const schema = z.strictObject({
  currentPassword: z.string().min(8).max(72),
  nextPassword: z
    .string()
    .min(8)
    .max(72)
    .refine((value) => new TextEncoder().encode(value).byteLength <= 72),
});

async function handlePost(request: Request) {
  const access = await authorizeAccount(request);
  if (access.response) return access.response;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "비밀번호는 8~72자로 입력해 주세요.",
        },
      },
      { status: 400 },
    );
  const user = await db.user.findUnique({
    where: { id: access.account!.id },
    select: { passwordHash: true, authSource: true },
  });
  if (
    !user?.passwordHash ||
    user.authSource === "eywa" ||
    !(await compare(parsed.data.currentPassword, user.passwordHash))
  )
    return Response.json(
      {
        error: { code: "FORBIDDEN", message: "현재 비밀번호가 맞지 않습니다." },
      },
      { status: 403 },
    );
  const changed = await db.user.updateMany({
    where: {
      id: access.account!.id,
      passwordHash: user.passwordHash,
      deletedAt: null,
      suspendedAt: null,
    },
    data: {
      passwordHash: await hash(parsed.data.nextPassword, 10),
      sessionVersion: { increment: 1 },
    },
  });
  if (changed.count !== 1)
    return Response.json(
      {
        error: {
          code: "CONFLICT",
          message: "계정 정보가 변경됐습니다. 다시 로그인해 주세요.",
        },
      },
      { status: 409 },
    );
  return Response.json(
    { data: { changed: true } },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export const POST = withErrorLog("/api/account/password", handlePost);
