import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  parseScanDestination,
  scanDestination,
} from "@/lib/concept-blank/scan/navigation";
import {
  studentLoginHref,
  studentPasswordHref,
} from "@/lib/learn/studentReturnTo";
import ScanApp from "@/components/concept-blank/scan/ScanApp";
import s from "@/components/concept-blank/scan/scan.module.css";

export const metadata = { title: "개념 백지 · 답안 촬영" };

/** Anonymous QR landing reads neither the bank nor DB. Every subsequent API checks current ownership. */
export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) value.forEach((part) => params.append(key, part));
    else if (value !== undefined) params.set(key, value);
  }
  const destination = parseScanDestination(params);
  if (!destination || destination.part === "key")
    return (
      <main className={s.app}>
        <section className={s.surface}>
          <div className={s.body}>
            <h1>개념 백지 · 답안 촬영</h1>
            <p role="alert">
              {destination?.part === "key"
                ? "채점표로는 답안을 제출할 수 없습니다. 학생지의 QR을 열어 주세요."
                : "저장된 발행 지면 주소가 필요합니다. 교사에게 새로 발행해 달라고 요청해 주세요."}
            </p>
          </div>
        </section>
      </main>
    );
  const session = await auth();
  const returnTo = scanDestination(destination);
  if (session?.student) {
    if (session.student.mustChangePassword)
      redirect(studentPasswordHref(returnTo));
    return <ScanApp destination={destination} />;
  }
  if (!session?.user?.id)
    return (
      <main className={s.app}>
        <section className={s.surface}>
          <div className={s.body}>
            <h1>로그인 후 촬영해 주세요</h1>
            <p>
              학생은 본인 계정으로, 교사는 교사 계정으로 로그인합니다. 로그인 뒤
              이 지면으로 돌아옵니다.
            </p>
            <a className={s.link} href={studentLoginHref(returnTo)}>
              로그인 후 촬영
            </a>
          </div>
        </section>
      </main>
    );
  if (
    session.user.role !== "director" ||
    session.user.approvalStatus !== "approved" ||
    !session.user.menus?.includes("conceptBlank")
  )
    notFound();
  return <ScanApp destination={destination} />;
}
