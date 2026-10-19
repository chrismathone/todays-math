import { notFound } from "next/navigation";
import { connection } from "next/server";

import { devPageVisible } from "@/lib/devPageAccess";

import { OutputWire } from "./OutputWire";

/**
 * **시험지 만들기 3단계 «양식 구성·출력» 덧붙임 — Wire 시안** (D-07 · 절대 규칙 1, 2026-10-16).
 *
 * 지금 3단계(`WorksheetEditor` — 왼쪽 설정 칸 340 · 오른쪽 미리보기)는 **다시 짜지 않는다.**
 * 세 갈래를 그 안에 **덧붙이는 자리**만 그린다 — W6 내 양식 저장·불러오기 · W7 제목 추천 ·
 * W8 시험지 태그(내 시험지 탭의 거름 포함). 갈래마다 Wire 4안을 실제 폭(작업실 본문 1040px =
 * 1280 − 사이드바 240)에 놓고, 갈래마다 한 안은 폰 폭(390)으로도 그린다. 색·서체·모서리는 Hi-fi 단계다.
 *
 * DB 를 읽지 않는다 — 안마다 같은 작은 픽스처를 쓴다. 문항 본문은 회색 막대로 대신한다.
 *
 * ⚠️ 아무것도 저장·호출하지 않는다. 그림 속 단추는 누를 수 없다.
 */
export default async function ExamOutputWirePage() {
  await connection();
  if (!(await devPageVisible({ directorOnly: true }))) notFound();
  return <OutputWire />;
}
