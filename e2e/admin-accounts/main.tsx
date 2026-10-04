import { createRoot } from "react-dom/client";
import AdminAccounts from "../../src/components/admin/AdminAccounts";
import AdminUserDetail from "../../src/components/admin/AdminUserDetail";
import ApprovalPending from "../../src/components/approval-pending/ApprovalPending";
import {
  adminIdentity,
  pendingAccount,
  rejectedAccount,
} from "../../src/__tests__/components/adminFixtures";
import "../../src/app/globals.css";
import "katex/dist/katex.min.css";
import "./harness.css";

const view = new URLSearchParams(location.search).get("view");
const branchId =
  new URLSearchParams(location.search).get("branchId") ?? "unassigned";
createRoot(document.getElementById("root")!).render(
  view === "pending" || view === "rejected" ? (
    <ApprovalPending
      account={view === "rejected" ? rejectedAccount : pendingAccount}
    />
  ) : view === "detail" ? (
    <AdminUserDetail
      identity={adminIdentity}
      userId={pendingAccount.id}
      branchId={branchId}
    />
  ) : (
    <AdminAccounts identity={adminIdentity} />
  ),
);
