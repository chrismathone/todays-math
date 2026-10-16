import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { OutputHifi } from "./OutputHifi";

/**
 * **시험지 만들기 3단계 «양식 구성·출력» 덧붙임 — Hi-fi 시안** (D-07 · 절대 규칙 1, 2026-10-16).
 *
 * 원장님이 Wire(`/dev/exam-output-wire`)에서 고르신 **W6 A · W7 A · W8 A** 위에서
 * 갈래마다 시각 처리 · 밀도가 다른 4안과 폰(390) 하나를 그린다.
 * 실제 작업실 토큰 · `WorksheetEditor.module.css` · `StudioStepBar` · `PrivateLibrary.module.css` ·
 * 지면 렌더러(`WorksheetPrint` — 여섯 템플릿 · KaTeX)를 쓴다.
 *
 * DB · API 를 읽지 않는다 — 지어낸 중2 문항 다섯과 목록 픽스처(`fixtures.ts`)뿐이다.
 * ⚠️ 아무것도 저장하지 않는다. 창 안의 단추는 이 화면 안에서만 움직인다.
 */
export default async function ExamOutputHifiPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <OutputHifi />;
}
