import { lazy, Suspense, type ComponentType, type ReactNode } from "react";

/**
 * `next/dynamic` 대역 — 이 하네스는 Next 없이 vite 로 **진짜 `UnifiedWorkspace`** 를 띄운다.
 * 제품의 `dynamic(() => import(...), { loading })` 을 React.lazy + Suspense 로 옮길 뿐이다
 * (RTL 시험들이 쓰는 대역과 같은 결 — `UnifiedWorkspace.*.test.tsx`).
 */
export default function dynamic<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  options?: { loading?: () => ReactNode },
) {
  const Component = lazy(loader);
  return function Dynamic(props: P) {
    return (
      <Suspense fallback={options?.loading?.() ?? null}>
        <Component {...props} />
      </Suspense>
    );
  };
}
