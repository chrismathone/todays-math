import { AuthExperience } from "./AuthExperience";
import { AuthFormSkeleton } from "@/components/ui/PageSkeletons";

export function AuthLoading({ fields = 2 }: { fields?: number }) {
  return (
    <AuthExperience>
      <AuthFormSkeleton fields={fields} />
    </AuthExperience>
  );
}
