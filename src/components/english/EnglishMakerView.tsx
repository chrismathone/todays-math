"use client";

import type {
  EnglishExam,
  EnglishMaterial,
} from "@/contracts/english.contract";

/**
 * «문제 만들기» — **자리표**(공통 지시 §3). 세 길(ChatGPT 붙여넣기 · 원문 복원 · DeepSeek)의 화면은 ai 트랙이
 * 같은 경로에 채우고, 병합 때 리드가 ai 판을 택한다. props 약속만 여기서 지킨다.
 * 만들기가 끝나면 세트를 `POST /api/english/exams/{id}/sets` 로 저장하고 `onSaved(id)` — 셸은 «학교별 내신 대비»
 * 뷰로 가 그 세트를 편집 화면으로 연다.
 */
export type EnglishMakerViewProps = {
  exam: EnglishExam;
  materials: EnglishMaterial[];
  onSaved: (setId: string) => void;
  onNotice: (message: string, tone: "status" | "alert") => void;
};

export default function EnglishMakerView(_props: EnglishMakerViewProps) {
  void _props;
  return <p>문제 만들기 — 준비 중</p>;
}
