export const TEACHER_HIFI_VARIANTS = ["H1", "H2", "H3", "H4"] as const;
export type TeacherHifiVariant = (typeof TEACHER_HIFI_VARIANTS)[number];
export const TEACHER_HIFI_PROPOSALS = {
  H1: {
    title: "작업실 기본",
    description: "익숙한 흰 면과 구분선으로 명단과 상세를 나란히 둡니다.",
  },
  H2: {
    title: "확인과 기록",
    description:
      "살펴볼 까닭은 옅은 호박색, 선택과 복습 수는 코발트로 구분합니다.",
  },
  H3: {
    title: "단정한 기록부",
    description: "촘촘한 표와 줄 맞춘 숫자로 여러 학생을 비교합니다.",
  },
  H4: {
    title: "여유 있는 명단",
    description: "넓은 행 간격과 절제한 딱지로 한 학생씩 읽습니다.",
  },
};
