import UnifiedWorkspace from "./UnifiedWorkspace";
import type { BankData } from "./types";
import type { SessionUser } from "@/lib/session";
import { loadUnifiedBank } from "@/lib/unifiedPreview";
import { getAccountAccess } from "@/lib/accountAccess";
import { fadingGate } from "@/lib/fading/enabled";

/** Shared authenticated entry for the main page and existing /studio links. */
export default async function WorkspacePage({ user }: { user: SessionUser }) {
  const account = await getAccountAccess();
  let initialData: BankData;
  try {
    initialData = account?.menus.includes("bank")
      ? await loadUnifiedBank()
      : {
          problems: [],
          total: 0,
          page: 1,
          pageSize: 12,
          grades: [],
          chapters: [],
        };
  } catch {
    initialData = {
      problems: [],
      total: 0,
      page: 1,
      pageSize: 12,
      grades: [],
      chapters: [],
      error:
        "문제은행 연결을 확인해 주세요. 문제 추출은 바로 사용할 수 있습니다.",
    };
  }
  return (
    <UnifiedWorkspace
      key={user.id}
      initialData={initialData}
      storageScope={user.id}
      fadingGate={fadingGate()}
      currentUser={{
        ...user,
        branchId: account?.branchId ?? null,
        isAdmin: account?.isAdmin ?? false,
        isSuperAdmin: account?.isSuperAdmin ?? false,
        canManageClasses: account?.menus.includes("teaching") ?? false,
      }}
      allowedMenus={
        account?.role === "reviewer" && !account.isAdmin
          ? []
          : (account?.menus ?? [])
      }
    />
  );
}
