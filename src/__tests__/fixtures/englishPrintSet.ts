/**
 * 오늘의 영어 지면 시험의 표본 세트 (D-148). 객관식 2 · 서술형 1 · 원문 복원 1 — print-check 항목의
 * `needs` 와 같은 구성. **표본 지문은 우리가 짧게 지은 글이다** — 교과서·출판사·모의고사 지문을 붙이지 않는다
 * (공통 지시 §2 · 원장님 원칙 «교재 원문은 저장소 밖»).
 */
import type { EnglishSet } from "@/contracts/english.contract";

export const SAMPLE_PASSAGE =
  "Our town library opened a small reading room last spring.\nStudents come after school to read quietly.\n\n" +
  "The librarian noticed something interesting: the students who read together stayed longer than those who read alone.";

export const SAMPLE_SET: EnglishSet = {
  id: "30000000-0000-4000-8000-000000000001",
  examId: "30000000-0000-4000-8000-000000000002",
  title: "2학기 중간 대비 1차",
  status: "검토 완료",
  source: "chatgpt",
  questionCount: 4,
  types: ["주제", "어법", "서술형", "원문 복원"],
  revision: 1,
  createdAt: "2026-09-30T00:00:00.000Z",
  updatedAt: "2026-09-30T00:00:00.000Z",
  passage: SAMPLE_PASSAGE,
  questions: [
    {
      type: "주제",
      prompt: "다음 글의 주제로 가장 적절한 것은?",
      options: [
        "the cost of a new library",
        "why students prefer reading alone",
        "how reading together keeps students longer",
        "the history of the town",
        "rules of the reading room",
      ],
      answer: "3",
      explanation:
        "함께 읽는 학생들이 더 오래 머문다는 관찰이 글의 중심입니다.",
      evidence:
        "the students who read together stayed longer than those who read alone",
    },
    {
      type: "어법",
      prompt: "다음 중 어법상 알맞은 것은?",
      options: ["opened", "opening", "opens", "to open", "open"],
      answer: "1",
      explanation: "last spring 이라는 과거 시점이 있으므로 과거형이 맞습니다.",
      evidence: "opened a small reading room last spring",
    },
    {
      type: "서술형",
      prompt: "사서가 관찰한 내용을 우리말로 쓰시오.",
      options: [],
      answer: "함께 읽는 학생들이 혼자 읽는 학생들보다 더 오래 머물렀다.",
      explanation: "관찰 내용을 정확히 옮기면 정답으로 인정합니다.",
      evidence: "The librarian noticed something interesting",
    },
    {
      type: "원문 복원",
      prompt:
        "원문에 쓰인 단어를 넣어 문장을 완성하시오.\nStudents come after school to read ________.\n(첫 글자: q, 7글자)",
      options: [],
      answer: "quietly",
      explanation:
        "원문에 쓰인 단어는 quietly 입니다. 대소문자는 구별하지 않습니다.",
      evidence: "Students come after school to read quietly.",
    },
  ],
};

export const SAMPLE_EXAM = {
  school: "한빛중",
  grade: "중2" as const,
  title: "2학기 중간고사",
};
