import { createRoot } from "react-dom/client";
import AdminAccounts from "../../src/components/admin/AdminAccounts";
import AdminBranchDetail from "../../src/components/admin/AdminBranchDetail";
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
import Workbench from "./Workbench";
import { MainScreen } from "../../src/components/main/MainScreen";

const branchRoute = location.pathname.match(
  /^\/admin\/branches\/([^/]+)(?:\/users\/([^/]+))?$/,
);
const view =
  new URLSearchParams(location.search).get("view") ??
  (branchRoute?.[2] ? "detail" : branchRoute ? "branch" : null);
const branchId =
  new URLSearchParams(location.search).get("branchId") ??
  branchRoute?.[1] ??
  "unassigned";
createRoot(document.getElementById("root")!).render(
  view === "dashboard" ? (
    <MainScreen embedded allowedMenus={["teaching"]} />
  ) : view === "workbench" ? (
    <Workbench />
  ) : view === "pending" || view === "rejected" ? (
    <ApprovalPending
      account={view === "rejected" ? rejectedAccount : pendingAccount}
    />
  ) : view === "branch" ? (
    <AdminBranchDetail
      identity={adminIdentity}
      branchId={branchId}
      branchName="테스트 지점"
    />
  ) : view === "detail" ? (
    <AdminUserDetail
      identity={adminIdentity}
      userId={pendingAccount.id}
      branchId={branchId}
    />
  ) : (
    <AdminAccounts identity={adminIdentity} branchId={branchId} />
  ),
);
