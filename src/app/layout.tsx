import type { Metadata } from "next";
import { Suspense } from "react";
import AccountActivity from "@/components/account/AccountActivity";
import ClientErrorLog from "@/components/errorLog/ClientErrorLog";
// sumaek: KaTeX CSS 는 루트에서 한 번만. 일부 라우트만 로드하면 MathML 이 이중으로 보인다.
import "katex/dist/katex.min.css";
import "./globals.css";
import { notoSerifKR, pretendard } from "./fonts";

export const metadata: Metadata = {
  title: "오늘 수학",
  description: "진도 기반 수학 시험지 자동 출제",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ko"
      className={`h-full antialiased ${pretendard.variable} ${notoSerifKR.variable}`}
    >
      <body className="flex min-h-full flex-col">
        <Suspense fallback={null}>
          <AccountActivity />
        </Suspense>
        {/* 브라우저 오류 보고 — 그리는 것 없음(src/lib/errorLog/clientReporter.ts) */}
        <ClientErrorLog />
        {children}
      </body>
    </html>
  );
}
