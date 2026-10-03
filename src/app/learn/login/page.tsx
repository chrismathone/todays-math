import { redirect } from "next/navigation";
import { normalizeStudentReturnTo } from "@/lib/learn/studentReturnTo";

export const metadata = {
  title: "로그인",
};

/**
 * 기존 학생 로그인 주소도 통합 로그인으로 연결한다. 학생 세션·권한은 기존 관문이 따로 판정한다.
 */
export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const destination = normalizeStudentReturnTo((await searchParams).returnTo);
  redirect(
    destination === "/learn"
      ? "/login"
      : `/login?${new URLSearchParams({ callbackUrl: destination })}`,
  );
}
