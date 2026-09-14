import { SignupForm } from "@/components/auth/SignupForm";
import { AuthExperience } from "@/components/auth/AuthExperience";
import { normalizeCallbackUrl } from "@/lib/callbackUrl";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "회원가입",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const [query, session] = await Promise.all([searchParams, auth()]);
  const destination = normalizeCallbackUrl(query.callbackUrl);
  if (session?.user?.id)
    redirect(session.user.role === "reviewer" ? "/review" : destination);
  return (
    <AuthExperience>
      <SignupForm callbackUrl={destination} />
    </AuthExperience>
  );
}
