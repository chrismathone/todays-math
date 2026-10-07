import type { ReactNode } from "react";
const paths = {
  home: (
    <>
      <path d="m3 10 9-7 9 7v10H3Z" />
      <path d="M9 20v-7h6v7" />
    </>
  ),
  bank: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1" />
      <rect x="10" y="4" width="5" height="16" rx="1" />
      <path d="m18 4 3 15M4 8h3m4 0h3" />
    </>
  ),
  crop: (
    <>
      <path d="M7 3v14h14M3 7h14v14M11 3v4m10 4h-4" />
      <path d="m11 13 10-10" />
    </>
  ),
  paper: (
    <>
      <path d="M5 3h10l4 4v14H5Z" />
      <path d="M14 3v5h5M9 12h6m-6 4h6" />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  plus: <path d="M12 4v16M4 12h16" />,
  save: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
    </>
  ),
  upload: <path d="M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5" />,
  print: (
    <>
      <path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7Z" />
      <path d="M17 11h1" />
    </>
  ),
  class: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-4a6 6 0 0 1 12 0v4M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2" />
    </>
  ),
  /** 오늘의 개념 — 강의 영상 */
  play: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m10 9 5 3-5 3Z" />
    </>
  ),
  headphones: (
    <>
      <path d="M4 14v-3a8 8 0 0 1 16 0v3" />
      <rect x="3" y="12" width="4" height="8" rx="2" />
      <rect x="17" y="12" width="4" height="8" rx="2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m6 6 12 12M6 18 18 6" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="7.5" />
      <path d="m16 16 5 5" />
    </>
  ),
  folder: <path d="M3 7V4h7l3 3h8v13H3Zm0 3h18" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  chevron: <path d="m9 5 7 7-7 7" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  maximize: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
  restore: <path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 8a3 3 0 1 1 5 3l-2 2v1m0 3h.01" />
    </>
  ),
  undo: <path d="m4 5-1 6h6M3 11a8 8 0 1 1 3 8" />,
  layout: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M9 9v12" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" />
    </>
  ),
  warning: (
    <>
      <path d="m12 3 10 18H2Z" />
      <path d="M12 9v5m0 3h.01" />
    </>
  ),
  /** 오늘의 영어(D-148) — 학교별 내신 대비 */
  school: (
    <>
      <path d="M3 21h18M5 21V9l7-5 7 5v12" />
      <path d="M9 21v-6h6v6" />
    </>
  ),
  /** 오늘의 영어(D-148) — 문제 만들기 */
  pen: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
  /** 브랜드 자리 고르기 단추의 ▾ (D-148 · 시안 C) */
  down: <path d="m6 9 6 6 6-6" />,
} satisfies Record<string, ReactNode>;
export type WorkspaceIconName = keyof typeof paths;
export default function WorkspaceIcon({
  name,
  size = 20,
}: {
  name: WorkspaceIconName;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
