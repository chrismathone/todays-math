import "server-only";

import { createHash } from "node:crypto";
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

/**
 * 시연 시험지 PDF 자체 — 원장님 2026-11-11 «어디서든 아이디로 접속해 시연할 수 있게». 발표하는 PC 에 파일이 없어도
 * 시연 계정이면 서버에서 받아 연다. 읽을 수 있는 것은 시연 계정뿐이다(경로가 가린다). 열쇠는 64자 안.
 */
export const studioDemoPdfKey = (sha256: string) =>
  `studio-demo-pdf:${sha256.slice(0, 48)}`;

/** 올려 둔 시연 PDF — 없거나 · 표가 없거나 · 바이트의 지문이 다르면 null. */
export async function readStudioDemoPdf(
  sha256: string,
  table: AppSettingTable = settingTable(),
): Promise<{ name: string; bytes: Uint8Array } | null> {
  let value: unknown;
  try {
    value = (
      await table.findUnique({ where: { key: studioDemoPdfKey(sha256) } })
    )?.value;
  } catch (error) {
    if (errorCode(error) === "P2021") return null;
    throw error;
  }
  const { name, base64 } = (value ?? {}) as {
    name?: unknown;
    base64?: unknown;
  };
  if (typeof name !== "string" || typeof base64 !== "string") return null;
  const bytes = Buffer.from(base64, "base64");
  if (createHash("sha256").update(bytes).digest("hex") !== sha256) return null;
  return { name, bytes: new Uint8Array(bytes) };
}

/** 시연 PDF 를 올린다 — 스크립트(`scripts/studio-demo/upload-pdf.ts`)만 쓴다. */
export async function writeStudioDemoPdf(
  sha256: string,
  name: string,
  bytes: Uint8Array,
  actorId: string | null,
  table: AppSettingTable = settingTable(),
): Promise<void> {
  const key = studioDemoPdfKey(sha256);
  const value = { name, base64: Buffer.from(bytes).toString("base64") };
  await table.upsert({
    where: { key },
    create: { key, value, updatedById: actorId },
    update: { value, updatedById: actorId },
  });
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
