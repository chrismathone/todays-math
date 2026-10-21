import type { DocumentKind } from "@/contracts/privateWorkspace.contract";
import type { SheetTag } from "@/contracts/sheetTag.contract";
import type { DocumentWorkflow } from "@/contracts/workspaceWorkflow.contract";

/**
 * 내 자료 거르기 줄 Wire 의 픽스처 — 지어낸 16행. DB 를 읽지 않는다.
 *
 * 태그는 일곱이 한 번 이상 나오고 «내신대비»만 0 이다(수가 0 인 항목이 어떻게 읽히는지 보려고).
 * «태그 없음» 시험지 · 연산 연습지가 있고, 학원 동료(김선생)의 공개 자료 셋이 섞여 «내 자료만 보기»가 실제로 행을 거른다.
 * 진행 단계가 있는 내 자료 넷 가운데 «내 작업 중»은 셋이다 — 출력 단계에서 저장한 연산 연습지는 작업 중이 아니다
 * (`PrivateLibrary.tsx` 의 `isWorkingDocument`). 동료의 작업 중 자료 하나는 세지 않는다.
 */
export type WireRow = {
  id: string;
  kind: DocumentKind;
  tag?: SheetTag;
  title: string;
  problemCount: number;
  /** ISO — 최근 수정순 정렬과 표의 날짜 칸 */
  updatedAt: string;
  /** 기록된 진행 단계 — 제품의 `workflow.step` 과 같은 값 */
  step?: DocumentWorkflow["step"];
  owner: "me" | "colleague";
};

export const ME = "박선생";
export const COLLEAGUE = "김선생";

export const WIRE_ROWS: WireRow[] = [
  {
    id: "r1",
    kind: "draft",
    tag: "일일TEST",
    title: "중2 일차부등식 일일TEST 10.21",
    problemCount: 10,
    updatedAt: "2026-10-21T09:12:00+09:00",
    step: "output",
    owner: "me",
  },
  {
    id: "r2",
    kind: "draft",
    tag: "일일TEST",
    title: "중2 일차부등식 일일TEST 10.20",
    problemCount: 8,
    updatedAt: "2026-10-20T17:40:00+09:00",
    owner: "me",
  },
  {
    id: "r3",
    kind: "arithmeticSheet",
    tag: "숙제",
    title: "중1 정수의 덧셈 연습 3회",
    problemCount: 40,
    updatedAt: "2026-10-20T14:21:00+09:00",
    step: "output",
    owner: "me",
  },
  {
    id: "r4",
    kind: "draft",
    tag: "주간TEST",
    title: "중2-1 부등식 주간 확인",
    problemCount: 20,
    updatedAt: "2026-10-19T21:03:00+09:00",
    step: "review",
    owner: "me",
  },
  {
    id: "r5",
    kind: "extraction",
    title: "쎈 중2 112~118쪽 추출",
    problemCount: 18,
    updatedAt: "2026-10-19T11:30:00+09:00",
    step: "crop",
    owner: "me",
  },
  {
    id: "r6",
    kind: "draft",
    tag: "단원TEST",
    title: "중3 이차방정식 단원평가 B",
    problemCount: 25,
    updatedAt: "2026-10-18T16:05:00+09:00",
    owner: "colleague",
  },
  {
    id: "r7",
    kind: "conceptBlank",
    title: "중2 부등식 개념 백지",
    problemCount: 12,
    updatedAt: "2026-10-18T10:02:00+09:00",
    owner: "me",
  },
  {
    id: "r8",
    kind: "draft",
    tag: "오답",
    title: "중2 10월 3주 오답 다시 풀기",
    problemCount: 12,
    updatedAt: "2026-10-17T18:15:00+09:00",
    owner: "me",
  },
  {
    id: "r9",
    kind: "draft",
    title: "오늘 수학 학습지",
    problemCount: 15,
    updatedAt: "2026-10-16T15:48:00+09:00",
    owner: "me",
  },
  {
    id: "r10",
    kind: "arithmeticSheet",
    tag: "복습",
    title: "중1 분수의 곱셈 복습",
    problemCount: 30,
    updatedAt: "2026-10-15T16:00:00+09:00",
    owner: "me",
  },
  {
    id: "r11",
    kind: "draft",
    tag: "입학TEST",
    title: "예비 중1 입학 진단",
    problemCount: 20,
    updatedAt: "2026-10-14T10:45:00+09:00",
    owner: "colleague",
  },
  {
    id: "r12",
    kind: "draft",
    tag: "일일TEST",
    title: "중2 연립방정식 일일TEST 10.13",
    problemCount: 8,
    updatedAt: "2026-10-13T17:10:00+09:00",
    owner: "me",
  },
  {
    id: "r13",
    kind: "arithmeticSheet",
    title: "중1 소인수분해 연습",
    problemCount: 24,
    updatedAt: "2026-10-12T19:22:00+09:00",
    owner: "me",
  },
  {
    id: "r14",
    kind: "draft",
    tag: "숙제",
    title: "중2 10월 2주 숙제",
    problemCount: 16,
    updatedAt: "2026-10-10T21:12:00+09:00",
    step: "scope",
    owner: "colleague",
  },
  {
    id: "r15",
    kind: "extraction",
    title: "개념원리 중1 정수 단원 추출",
    problemCount: 32,
    updatedAt: "2026-10-09T13:40:00+09:00",
    owner: "me",
  },
  {
    id: "r16",
    kind: "draft",
    title: "중1 정수와 유리수 형성평가",
    problemCount: 14,
    updatedAt: "2026-10-08T09:30:00+09:00",
    owner: "me",
  },
];

/**
 * 수가 세 자리일 때 — 같은 16행을 21번 되풀이한 336행(Hi-fi 의 «자료 수 많음»). 제목 끝에 회차를 붙이고 날짜를 하루씩 뒤로 민다.
 * 칸 글 «전체 자료 (336)» · «시험지 (189)»가 칸 폭을 얼마나 넓히는지 보려는 것이다.
 */
export const MANY_ROWS: WireRow[] = Array.from({ length: 21 }, (_, round) =>
  WIRE_ROWS.map((row) => {
    const updated = new Date(row.updatedAt);
    updated.setDate(updated.getDate() - round * 14);
    return {
      ...row,
      id: `${row.id}-${round}`,
      title: round ? `${row.title} · ${round + 1}회` : row.title,
      updatedAt: updated.toISOString(),
    };
  }),
).flat();
