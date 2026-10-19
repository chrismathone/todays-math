import { redirect } from "next/navigation";
import { AppChrome } from "@/components/chrome/AppChrome";
import { ExamPracticeWorkspace } from "@/components/exam-practice/ExamPracticeWorkspace";
import { getAccountAccess } from "@/lib/accountAccess";
import { accountRouteAllowed } from "@/lib/accountRouteAccess";
import { routeAccessFor } from "@/lib/routeAccess";

export default async function ExamPracticePage() {
  const account = await getAccountAccess();
  if (!account) redirect("/login");
  if (
    account.role !== "director" ||
    routeAccessFor(account.role, "GET", "/exam/practice") !== "allow" ||
    !accountRouteAllowed(account, "GET", "/exam/practice")
  )
    redirect("/");
  return (
    <AppChrome tab="exam" currentLabel="기출 대비 연습">
      <ExamPracticeWorkspace allowedMenus={account.menus} />
    </AppChrome>
  );
}
