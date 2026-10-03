import { lazy, Suspense, type ComponentType, type ReactNode } from "react";

/** Only the isolated Vite fixture replaces Next's code splitting. */
export default function dynamic<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  options?: { loading?: () => ReactNode },
) {
  const Component = lazy(async () => {
    const loaded = await loader();
    return { default: typeof loaded === "function" ? loaded : loaded.default };
  });
  return function FixtureDynamic(props: P) {
    return (
      <Suspense fallback={options?.loading?.() ?? null}>
        <Component {...props} />
      </Suspense>
    );
  };
}
