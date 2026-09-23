"use client";

import { usePathname } from "next/navigation";
import RouteRecovery from "@/components/ui/RouteRecovery";

export default function ErrorPage({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const pathname = usePathname();
  return (
    <RouteRecovery
      title="화면을 불러오지 못했습니다"
      description="잠시 후 다시 시도해 주세요. 문제가 계속되면 홈으로 돌아가 원하는 메뉴를 다시 열어 주세요."
      retry={retry}
      homeHref={pathname?.startsWith("/learn") ? "/learn" : "/"}
    />
  );
}
