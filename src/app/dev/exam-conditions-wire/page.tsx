import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { ConditionsWire } from "./ConditionsWire";

/**
 * **시험지 만들기 «구성 조건» 보강(M3) — Wire 시안** (D-07 · 절대 규칙 1, 2026-10-17).
 *
 * 계획서 `docs/planning/monthly-exam-plan-20261017.md` §4 M3 · §11.4 ② — 원장님 «제안 순서 진행»:
 * 형식별 개수 · 객관식 먼저 · «기본/실력/심화» 난이도 단계. 바탕은 지금 «구성 조건» 창(W4 Hi-fi 2).
 * DB 를 읽지 않는다 — 지어낸 작은 픽스처다.
 */
export default async function ExamConditionsWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <ConditionsWire />;
}
