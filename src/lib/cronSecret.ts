/**
 * cron 문지기의 비교 — `Authorization: Bearer <CRON_SECRET>` 를 **걸린 시간으로 새지 않게** 견준다.
 *
 * 세 cron 라우트(`tests/auto-draft/cron` · `logs/purge/cron` · `eywa-sync/cron`)가 저마다 `!==` 로 견주고 있었다
 * (2026-10-07 검수). 문자열 `!==` 는 다른 첫 글자에서 멈춘다. 다른 서명 비교(`eywaSso.ts` ·
 * `eywa/sync-contract.ts`)는 이미 `timingSafeEqual` 을 쓴다 — 여기도 같은 결로 맞춘다.
 *
 * 길이가 다르면 `timingSafeEqual` 이 던지므로 양쪽을 해시해 같은 길이로 만든 뒤 견준다.
 * 시크릿이 없을 때(503)는 부르는 쪽이 먼저 가른다 — 여기는 «있는 시크릿과 같은가»만 본다.
 */
import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string) => createHash("sha256").update(value).digest();

export function cronSecretMatches(request: Request, secret: string): boolean {
  return timingSafeEqual(
    digest(request.headers.get("authorization") ?? ""),
    digest(`Bearer ${secret}`),
  );
}
