import type { Concept } from "./types";

/** Lightweight learning labels; importing these never loads a question generator. */
export const CONCEPTS: Concept[] = [
  {
    id: "balance",
    title: "등식의 성질",
    description: "등식의 뜻과 양변에 같은 연산을 하는 성질을 익혀요.",
  },
  {
    id: "two-step",
    title: "두 단계 방정식",
    description: "상수항과 계수를 정리하고 주어진 해를 대입해요.",
  },
  {
    id: "distribute",
    title: "괄호 풀기",
    description: "분배법칙으로 괄호를 풀어 방정식을 정리해요.",
  },
  {
    id: "both-sides",
    title: "양변에 x가 있는 식",
    description: "양변의 항을 모으고 방정식의 해와 조건을 살펴요.",
  },
  {
    id: "fractions",
    title: "분수가 있는 식",
    description: "분모의 공배수와 비례식의 성질로 식을 정리해요.",
  },
  {
    id: "word",
    title: "문장제",
    description: "수, 나이, 거리, 가격 등 생활 속 상황을 등식으로 바꿔요.",
  },
];
