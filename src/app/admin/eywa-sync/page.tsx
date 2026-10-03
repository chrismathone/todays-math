import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/accountAccess";
import { managedStatus } from "@/lib/eywa/managedAdministration";
import { EywaManagement } from "@/components/account/EywaManagement";
export default async function EywaSyncPage() {
  const actor = await getAccountAccess();
  if (!actor || !actor.isAdmin || actor.approvalStatus !== "approved")
    redirect("/login");
  return (
    <main style={{ maxWidth: 1000, margin: "32px auto", padding: 24 }}>
      <h1>에이와 연결 관리</h1>
      <p>지점 상태와 계정 확인, 동기화 오류를 확인합니다.</p>
      <EywaManagement
        initial={await managedStatus(actor)}
        operator
        platform={actor.isSuperAdmin === true}
      />
    </main>
  );
}
