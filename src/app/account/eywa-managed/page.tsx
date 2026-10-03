import { redirect } from "next/navigation";
import { getAccountAccess } from "@/lib/accountAccess";
import { managedStatus } from "@/lib/eywa/managedAdministration";
import { EywaManagement } from "@/components/account/EywaManagement";
export default async function EywaManagedPage() {
  const actor = await getAccountAccess();
  if (!actor) redirect("/login?callbackUrl=%2Faccount%2Feywa-managed");
  return (
    <main style={{ maxWidth: 800, margin: "32px auto", padding: 24 }}>
      <h1>에이와 계정 연결 확인</h1>
      <EywaManagement
        initial={await managedStatus(actor, true)}
        operator={false}
        platform={false}
      />
    </main>
  );
}
