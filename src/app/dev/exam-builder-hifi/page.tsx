import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { BuilderHifi } from "./BuilderHifi";

/**
 * **시험지 만들기 개선 — Hi-fi 시안** (D-07 · 절대 규칙 1, 2026-10-16).
 *
 * 원장님이 Wire(`/dev/exam-builder-wire`)에서 고르신 **W3 B · W4 D · W5 B** 위에서
 * 갈래마다 시각 처리 · 밀도가 다른 4안과 폰(390) 하나를 그린다.
 * 실제 작업실 토큰 · `ExamBuilder.module.css` · `StudioStepBar` · KaTeX(`MathText`)를 쓴다.
 *
 * DB 를 읽지 않는다 — 지어낸 중2 문항 픽스처(`fixtures.ts`)뿐이다.
 * ⚠️ 아무것도 저장 · 호출하지 않는다. 창 안의 단추는 이 화면 안에서만 움직인다.
 */
export default async function ExamBuilderHifiPage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <BuilderHifi />;
}
