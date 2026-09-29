import { authorizeAccount } from "@/lib/accountAccess";
import { jsonOk, validationError } from "@/lib/apiResponse";
import { recordAudit } from "@/lib/audit";
import { withErrorLog } from "@/lib/errorLog/withErrorLog";
import { readJourneyTheme, writeJourneyTheme } from "@/lib/journeyThemeStore";
import {
  journeyThemeResponseSchema,
  journeyThemeUpdateSchema,
} from "@/contracts/journeyTheme.contract";

/** 진도판 테마 — 학원 전체 한 벌(원장님 2026-09-30). 관리자만 읽고 바꾼다. */
const noStore = (response: Response) => {
  response.headers.set("Cache-Control", "no-store");
  return response;
};

async function handleGet(request: Request) {
  const access = await authorizeAccount(request, true);
  if (access.response) return access.response;
  return noStore(
    jsonOk(journeyThemeResponseSchema, { data: await readJourneyTheme() }),
  );
}

async function handlePut(request: Request) {
  const access = await authorizeAccount(request, true);
  if (access.response) return access.response;
  const parsed = journeyThemeUpdateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return noStore(validationError(parsed.error));
  const saved = await writeJourneyTheme(parsed.data.theme, access.account.id);
  await recordAudit({
    actorId: access.account.id,
    action: "admin.journey_theme_changed",
    outcome: "success",
    details: { theme: saved.theme },
  });
  return noStore(jsonOk(journeyThemeResponseSchema, { data: saved }));
}

export const GET = withErrorLog("/api/admin/journey-theme", handleGet);
export const PUT = withErrorLog("/api/admin/journey-theme", handlePut);
