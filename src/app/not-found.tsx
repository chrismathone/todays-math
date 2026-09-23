import RouteRecovery from "@/components/ui/RouteRecovery";

export default function NotFound() {
  return (
    <RouteRecovery
      title="페이지를 찾을 수 없습니다"
      description="주소가 바뀌었거나 더 이상 제공되지 않는 페이지입니다. 홈에서 원하는 메뉴를 찾아 주세요."
    />
  );
}
