import { LoginForm } from "@/components/auth/LoginForm";
import { AuthExperience } from "@/components/auth/AuthExperience";
import { normalizeCallbackUrl } from "@/lib/callbackUrl";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "로그인",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const [query, session] = await Promise.all([searchParams, auth()]);
  const destination = normalizeCallbackUrl(query.callbackUrl);
  if (session?.user?.id)
    redirect(
      session.user.approvalStatus !== "approved"
        ? "/approval-pending"
        : session.user.role === "reviewer" && !session.user.isAdmin
          ? "/review"
          : destination,
    );
  return (
    <AuthExperience>
      <LoginForm callbackUrl={destination} />
    </AuthExperience>
  );
}
