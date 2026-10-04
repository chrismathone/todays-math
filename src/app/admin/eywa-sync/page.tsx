import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/accountAccess";
import { managedStatus } from "@/lib/eywa/managedAdministration";
import { EywaManagement } from "@/components/account/EywaManagement";
import AdminHeader from "@/components/admin/AdminHeader";
import BackLink from "@/components/ui/BackLink";
import s from "@/components/admin/admin.module.css";
export default async function EywaSyncPage() {
  const actor = await getAccountAccess();
  if (!actor || !actor.isAdmin || actor.approvalStatus !== "approved")
    redirect("/login");
  return (
    <div className={s.shell}>
      <AdminHeader
        identity={actor}
        isSuperAdmin={actor.isSuperAdmin === true}
        active="eywa"
      />
      <main className={s.main}>
        <BackLink href={actor.isSuperAdmin ? "/admin/branches" : "/branch"}>
          지점 관리로 돌아가기
        </BackLink>
        <h1>에이와 연결 관리</h1>
        <p>지점 상태와 계정 확인, 동기화 오류를 확인합니다.</p>
        <EywaManagement
          initial={await managedStatus(actor)}
          operator
          platform={actor.isSuperAdmin === true}
        />
      </main>
    </div>
  );
}
