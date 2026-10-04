import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import s from "./BackLink.module.css";

function BackLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="m10 6-6 6 6 6M4 12h16"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{children}</span>
    </>
  );
}

export default function BackLink({
  children,
  className = "",
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link {...props} className={`${s.control} ${className}`}>
      <BackLabel>{children}</BackLabel>
    </Link>
  );
}

export function BackButton({
  children,
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} type={type} className={`${s.control} ${className}`}>
      <BackLabel>{children}</BackLabel>
    </button>
  );
}
