import "server-only";

import { db } from "@/lib/db";
import {
  DEFAULT_JOURNEY_THEME,
  isJourneyThemeId,
  type JourneyThemeId,
} from "@/lib/math-explorers/journeyThemes";

/** `app_setting` 의 진도판 테마 키 — 값은 `{ theme }`. */
export const JOURNEY_THEME_KEY = "journey.theme";

type SettingRow = {
  key: string;
  value: unknown;
  updatedAt: Date;
  updatedById: string | null;
};

/** 시험이 갈아 끼우는 표 — `db.appSetting` 이 쓰는 두 동작만. */
export interface AppSettingTable {
  findUnique(args: { where: { key: string } }): Promise<SettingRow | null>;
  upsert(args: {
    where: { key: string };
    create: { key: string; value: object; updatedById: string | null };
    update: { value: object; updatedById: string | null };
  }): Promise<SettingRow>;
}

const settingTable = (): AppSettingTable =>
  (db as unknown as { appSetting: AppSettingTable }).appSetting;

const errorCode = (error: unknown) =>
  typeof error === "object" && error && "code" in error
    ? String((error as { code: unknown }).code)
    : "";

export interface StoredJourneyTheme {
  theme: JourneyThemeId;
  /** 관리자가 아직 안 골랐으면 null. */
  updatedAt: string | null;
}

/**
 * 학원 전체 진도판 테마. 표가 아직 없으면(DB 먼저 배포 전 · P2021) 또는 값이 모르는 테마면 지금 판 —
 * 테마 읽기가 학생 첫 화면을 막으면 안 된다. 연결 실패 같은 다른 오류는 그대로 던진다.
 */
export async function readJourneyTheme(
  table: AppSettingTable = settingTable(),
): Promise<StoredJourneyTheme> {
  let row: SettingRow | null;
  try {
    row = await table.findUnique({ where: { key: JOURNEY_THEME_KEY } });
  } catch (error) {
    if (errorCode(error) === "P2021")
      return { theme: DEFAULT_JOURNEY_THEME, updatedAt: null };
    throw error;
  }
  const theme = (row?.value as { theme?: unknown } | undefined)?.theme;
  if (!row || !isJourneyThemeId(theme))
    return { theme: DEFAULT_JOURNEY_THEME, updatedAt: null };
  return { theme, updatedAt: row.updatedAt.toISOString() };
}

export async function writeJourneyTheme(
  theme: JourneyThemeId,
  actorId: string,
  table: AppSettingTable = settingTable(),
): Promise<StoredJourneyTheme> {
  const row = await table.upsert({
    where: { key: JOURNEY_THEME_KEY },
    create: { key: JOURNEY_THEME_KEY, value: { theme }, updatedById: actorId },
    update: { value: { theme }, updatedById: actorId },
  });
  return { theme, updatedAt: row.updatedAt.toISOString() };
}
