import { createRoot } from "react-dom/client";
import CourseDashboard from "../../src/components/math-srs/CourseDashboard";
import UnifiedWorkspace from "../../src/components/unified/UnifiedWorkspace";
import { ClassManage } from "../../src/components/class/ClassManage";
import AdminUserDetail from "../../src/components/admin/AdminUserDetail";
import {
  pendingAccount,
  adminIdentity,
} from "../../src/__tests__/components/adminFixtures";
import { installFixtureApi } from "./fixture";
import "../../src/app/globals.css";
import "katex/dist/katex.min.css";
import "../admin-accounts/harness.css";

installFixtureApi();
const params = new URLSearchParams(location.search);
const user = {
  name: "검증 선생님",
  email: "fixture@example.test",
  canManageClasses: true,
};
createRoot(document.getElementById("root")!).render(
  location.pathname === "/classes/manage" ||
    location.pathname === "/branch" ||
    params.get("view") === "classes" ? (
    <ClassManage units={[]} />
  ) : params.get("view") === "return" ? (
    <AdminUserDetail
      identity={adminIdentity}
      branchId="unassigned"
      userId={pendingAccount.id}
      initialAccount={pendingAccount}
    />
  ) : params.get("view") === "shell" ? (
    <UnifiedWorkspace
      initialData={{
        problems: [],
        total: 0,
        page: 1,
        pageSize: 100,
        grades: [],
        chapters: [],
      }}
      currentUser={user}
      allowedMenus={["home", "teaching", "srs"]}
    />
  ) : (
    <main className="min-w-0 p-4 sm:p-6">
      <CourseDashboard admin />
    </main>
  ),
);
