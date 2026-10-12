import type { ProblemSourceReference } from "@/contracts/problemSourceReference.contract";

export const pastExamReference: ProblemSourceReference = {
  problemId: "00000000-0000-4000-8000-000000000012",
  problemCode: "J20101-A01-012",
  source: "past_exam",
  questionNumber: 12,
  school: "OO중",
  subject: "수학",
  exam: {
    school: "OO중",
    year: 2025,
    semester: 1,
    round: "중간",
    subject: "수학",
    number: 12,
  },
  material: null,
};

export const textbookReference: ProblemSourceReference = {
  ...pastExamReference,
  source: "school_textbook",
  questionNumber: 3,
  school: null,
  exam: null,
  material: {
    publisher: "천재교육",
    author: "김화경",
    title: "수학 1",
    curriculum: "2022 개정",
    kind: "형성 평가",
    materialTitle: "1단원 평가",
    unitRaw: "소인수분해",
  },
};
