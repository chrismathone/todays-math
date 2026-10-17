import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { QuotaWire } from "./QuotaWire";

/**
 * **«오늘의 기억» 학생별 하루 분량 손잡이 — Wire 시안** (D-07 · 절대 규칙 1, 2026-10-17).
 *
 * 손잡이 묶음은 codex 와 두 번 협의해 닫았다(모의 `scripts/qa/fading-simulation/` 의 `--quota` ·
 * `--relearn-stop` · `--relearn-cap`): 학생별 기본 분량 10 · 15 · 20칸 + 서비스 공통 추가 확인 종료 규칙.
 * 안끼리 다른 것은 **교사가 분량을 바꾸는 자리**와 **멈춤 신호가 보이는 자리**다. 교사 틀은 작업실 본문 1040,
 * 학생 틀은 폰 390. 색 · 서체 · 모서리는 Hi-fi 단계다.
 *
 * DB 를 읽지 않는다 — 지어낸 작은 픽스처다. ⚠️ 아무것도 저장 · 호출하지 않는다. 그림 속 단추는 누를 수 없다.
 */
export default async function FadingQuotaWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <QuotaWire />;
}
