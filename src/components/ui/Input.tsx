import type { ComponentPropsWithRef } from "react";

export function Input({
  className = "",
  ...props
}: ComponentPropsWithRef<"input">) {
  return (
    <input
      className={`h-11 w-full min-w-0 rounded-lg border border-control bg-white px-3 text-sm text-ink placeholder:text-text-3 focus:border-g-blue focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-g-blue disabled:cursor-not-allowed disabled:bg-side ${className}`}
      {...props}
    />
  );
}
