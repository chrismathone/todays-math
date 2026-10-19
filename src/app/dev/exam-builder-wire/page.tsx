import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { BuilderWire } from "./BuilderWire";

/**
 * **시험지 만들기 개선 — Wire 시안** (D-07 · 절대 규칙 1, 2026-10-16).
 *
 * 경쟁 문제은행 두 곳(매쓰플랫 · 매쓰홀릭)의 «학습지 만들기»를 걸어 본 기록과 codex 검토가
 * 고른 세 갈래를 **구조만** 그린다 — W3 교체 개선 · W4 범위 구성 · W5 출제 조건 재사용.
 * 갈래마다 Wire 4안을 같은 실제 폭(작업실 본문 1040px = 1280 − 사이드바 240)에 놓고,
 * 고를 만한 안 하나는 폰 폭(390)으로도 그린다. 색·서체·모서리는 Hi-fi 단계다.
 *
 * DB 를 읽지 않는다 — 안마다 같은 작은 픽스처를 쓴다. 이 화면의 물음은 «어디에 무엇이
 * 놓이고 몇 번 누르나»이고, 문항 본문은 회색 막대로 대신한다.
 *
 * ⚠️ 아무것도 저장·호출하지 않는다. 그림 속 단추는 누를 수 없다.
 */
export default async function ExamBuilderWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <BuilderWire />;
}
