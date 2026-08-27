import { AuthFormSkeleton } from "@/components/ui/PageSkeletons";

/**
 * 가입은 로그인보다 칸이 하나 많다(이름). 무리 전체에 걸린
 * `(auth)/loading.tsx` 는 2칸이라 여기서 3칸으로 덮는다 — 안 덮으면
 * 폼이 뜨는 순간 한 칸이 튄다.
 */
export default function Loading() {
  return <AuthFormSkeleton fields={3} />;
}
