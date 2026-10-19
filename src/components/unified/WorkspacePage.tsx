import UnifiedWorkspace from "./UnifiedWorkspace";
import type { BankData } from "./types";
import type { SessionUser } from "@/lib/session";
import { getAccountAccess } from "@/lib/accountAccess";
import { fadingGate } from "@/lib/fading/enabled";

/** Shared authenticated entry for the main page and existing /studio links. */
export default async function WorkspacePage({
  user,
  examReportTestId,
}: {
  user: SessionUser;
  examReportTestId?: string;
}) {
  const account = await getAccountAccess();
  // Bank consumers load their metadata through the existing authenticated API.
  // Keep the shell independent of the shared bank's full question projection.
  const initialData: BankData = {
    problems: [],
    total: 0,
    page: 1,
    pageSize: 12,
    grades: [],
    chapters: [],
  };
  return (
    <UnifiedWorkspace
      key={user.id}
      initialData={initialData}
      deferBankMetadata
      storageScope={user.id}
      fadingGate={fadingGate()}
      examReportTestId={examReportTestId}
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
