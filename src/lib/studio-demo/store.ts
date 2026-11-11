import "server-only";

import { db } from "@/lib/db";
import type { AppSettingTable } from "@/lib/journeyThemeStore";
import {
  StudioDemoRecordingSchema,
  type StudioDemoEntry,
} from "@/contracts/studioDemo.contract";

/** `app_setting` 열쇠(64자 안) — 값은 `{ entries }`. 시연 원본의 지문마다 한 칸. */
export const studioDemoKey = (sha256: string) =>
  `studio-demo:${sha256.slice(0, 52)}`;

const settingTable = (): AppSettingTable =>
  (db as unknown as { appSetting: AppSettingTable }).appSetting;

const errorCode = (error: unknown) =>
  typeof error === "object" && error && "code" in error
    ? String((error as { code: unknown }).code)
    : "";

/**
 * 녹화본. 아직 없거나(첫 시연 — 이번에 녹화된다) 표가 없거나(P2021) 모양이 틀리면 빈 녹화본 —
 * 그때 시연은 실제 분석으로 흘러간다. 연결 실패 같은 다른 오류는 그대로 던진다.
 */
export async function readStudioDemo(
  sha256: string,
  table: AppSettingTable = settingTable(),
): Promise<StudioDemoEntry[]> {
  let value: unknown;
  try {
    value = (await table.findUnique({ where: { key: studioDemoKey(sha256) } }))
      ?.value;
  } catch (error) {
    if (errorCode(error) === "P2021") return [];
    throw error;
  }
  const parsed = StudioDemoRecordingSchema.safeParse(value);
  return parsed.success ? parsed.data.entries : [];
}

/** 화면이 가진 녹화본 전체로 덮어쓴다 — 쓰는 쪽은 시연 계정의 한 화면뿐이다. */
export async function writeStudioDemo(
  sha256: string,
  entries: StudioDemoEntry[],
  actorId: string,
  table: AppSettingTable = settingTable(),
): Promise<void> {
  const key = studioDemoKey(sha256);
  await table.upsert({
    where: { key },
    create: { key, value: { entries }, updatedById: actorId },
    update: { value: { entries }, updatedById: actorId },
  });
}
