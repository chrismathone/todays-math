import "server-only";

export interface ListeningDriveConfig {
  ownerId: string;
  folderId: string;
  accessToken(): Promise<string>;
}
export const LISTENING_DRIVE_ID = /^[A-Za-z0-9_-]{10,200}$/;
let cached: { fingerprint: string; config: ListeningDriveConfig } | undefined;

export function listeningDriveOAuth(
  credentials: { clientId: string; clientSecret: string; refreshToken: string },
  fetchImpl: typeof fetch = fetch,
  now = Date.now,
) {
  let token = "",
    expiresAt = 0;
  let pending: Promise<string> | undefined;
  const refresh = async () => {
    let response: Response;
    try {
      response = await fetchImpl("https://oauth2.googleapis.com/token", {
        method: "POST",
        redirect: "error",
        cache: "no-store",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          refresh_token: credentials.refreshToken,
          grant_type: "refresh_token",
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new Error("Drive 인증 서버에 연결하지 못했습니다.");
    }
    const data = (await response.json().catch(() => null)) as {
      access_token?: unknown;
      expires_in?: unknown;
      error?: unknown;
    } | null;
    if (
      !response.ok ||
      typeof data?.access_token !== "string" ||
      !data.access_token
    )
      throw new Error(
        data?.error === "invalid_grant"
          ? "Drive 연결 허락을 다시 확인해 주세요."
          : "Drive 인증을 갱신하지 못했습니다.",
      );
    token = data.access_token;
    const lifetime = Number(data.expires_in);
    expiresAt =
      now() +
      (Number.isFinite(lifetime) && lifetime > 120 && lifetime <= 86400
        ? lifetime
        : 3600) *
        1000 -
      120_000;
    return token;
  };
  return {
    async accessToken() {
      if (token && now() < expiresAt) return token;
      pending ??= refresh().finally(() => {
        pending = undefined;
      });
      return pending;
    },
  };
}
export function readListeningDriveConfig(
  env: Record<string, string | undefined> = process.env,
): ListeningDriveConfig | null {
  const ownerId = env.ENGLISH_LISTENING_DRIVE_OWNER_ID?.trim() ?? "";
  const folderId = env.ENGLISH_LISTENING_DRIVE_FOLDER_ID?.trim() ?? "";
  const clientId = env.ENGLISH_LISTENING_DRIVE_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.ENGLISH_LISTENING_DRIVE_CLIENT_SECRET?.trim() ?? "";
  const refreshToken = env.ENGLISH_LISTENING_DRIVE_REFRESH_TOKEN?.trim() ?? "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      ownerId,
    ) ||
    !LISTENING_DRIVE_ID.test(folderId) ||
    !clientId ||
    !clientSecret ||
    !refreshToken
  )
    return null;
  const fingerprint = [
    ownerId,
    folderId,
    clientId,
    clientSecret,
    refreshToken,
  ].join("\n");
  if (cached?.fingerprint !== fingerprint)
    cached = {
      fingerprint,
      config: {
        ownerId: ownerId.toLowerCase(),
        folderId,
        ...listeningDriveOAuth({ clientId, clientSecret, refreshToken }),
      },
    };
  return cached.config;
}
