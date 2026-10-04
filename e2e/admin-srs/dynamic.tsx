import { lazy, Suspense, type ComponentType } from "react";

// Framework-only client shim; the actual shell, dashboard, form and guards run.
export default function dynamic<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> } | ComponentType<P>>,
  options?: { loading?: ComponentType; ssr?: boolean },
) {
  const Component = lazy(async () => {
    const loaded = await loader();
    return typeof loaded === "function" ? { default: loaded } : loaded;
  });
  const Loading = options?.loading;
  return function FixtureDynamic(props: P) {
    return (
      <Suspense fallback={Loading ? <Loading /> : null}>
        <Component {...props} />
      </Suspense>
    );
  };
}
