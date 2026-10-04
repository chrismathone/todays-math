import type { ManagedAccount } from "@/contracts/accountAccess.contract";

export class AccountRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = "FORBIDDEN",
  ) {
    super(message);
  }

  get requiresLogin() {
    return (
      this.status === 401 || (this.status === 403 && this.code === "FORBIDDEN")
    );
  }
}

export async function accountRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const serverMessage = body?.error?.message || body?.message;
    const message =
      response.status === 401
        ? "로그인이 만료되었습니다. 로그인 상태를 다시 확인해 주세요."
        : response.status === 403
          ? serverMessage ||
            "계정 관리 권한을 확인할 수 없습니다. 로그인 상태를 다시 확인해 주세요."
          : body?.message ||
            body?.error?.message ||
            "요청을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    throw new AccountRequestError(response.status, message, body?.error?.code);
  }
  return response.json() as Promise<T>;
}

export async function reloadManagedAccount(
  account: ManagedAccount,
): Promise<ManagedAccount> {
  const result = await accountRequest<{ data: ManagedAccount }>(
    `/api/admin/users/${encodeURIComponent(account.id)}`,
  );
  return result.data;
}

export function requestMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "연결을 확인한 뒤 다시 시도해 주세요.";
}
