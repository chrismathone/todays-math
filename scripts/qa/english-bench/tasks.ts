/**
 * 오늘의 영어 모델 벤치 — 과제 셋 (D-148 · 25 §12).
 *
 * 세 제작 방식(원문 유지 · 새 지문 · 원문 변형) × 여섯 유형(주제 · 내용 일치 · 어법 · 빈칸 추론 · 문장 삽입 · 서술형)
 * 각 한 문항 — 모델당 18문항. 🔴 표본 지문은 **우리가 지은 글**이다(교재·출판사·모의고사 지문 아님 — 교재 원문은 저장소 밖).
 */
import {
  type EnglishGenerateRequest,
  type EnglishGrade,
} from "@/contracts/english.contract";

import { BENCH_SIX_TYPES } from "./sixTypes";

export interface BenchTask {
  id: string;
  label: string;
  grade: EnglishGrade;
  request: Omit<EnglishGenerateRequest, "examId">;
}

const ALL_TYPES = [...BENCH_SIX_TYPES];

export const PASSAGE_CREATIVITY =
  "Many people believe that creativity arrives as a sudden flash of inspiration. Stories about inventors who solved problems in dreams or artists who painted masterpieces overnight support this belief. However, researchers who study creative work have found a different pattern. Most original ideas grow slowly out of long periods of practice, failure, and revision. A composer may write dozens of weak melodies before one of them becomes worth developing. A scientist may run the same experiment many times, adjusting a single condition each time, until an unexpected result appears. What looks like a sudden breakthrough is usually the visible end of an invisible process. This does not mean that inspiration is unimportant. Rather, inspiration tends to favor those who have already prepared their minds by collecting knowledge and testing possibilities. When the moment of insight finally comes, it connects pieces that were gathered patiently over time. For students, this finding carries a practical lesson. Instead of waiting for brilliant ideas to appear, they should build habits that make such ideas more likely: keeping notes, asking questions, and returning to unfinished work. Creativity, in this view, is less a gift that some people receive and more a skill that anyone can cultivate through steady effort.";

export const PASSAGE_SLEEP =
  "Scientists once thought that sleep was simply a time when the brain rested. Today, however, many studies show that the sleeping brain is surprisingly busy. During deep sleep, it replays the experiences of the day and moves important information from short-term storage into long-term memory. In one experiment, students who learned a list of words in the evening and then slept remembered far more the next morning than students who stayed awake for the same amount of time. Sleep also appears to help the brain throw away details that are not useful, so that the most meaningful patterns stand out. This may explain why a difficult problem sometimes seems easier after a good night's rest. Unfortunately, many teenagers sleep less than they need because of homework, smartphones, and early school hours. Losing even one or two hours of sleep each night can make it harder to concentrate and to remember what was learned. Therefore, staying up late to study may actually work against the goal it is meant to achieve. Protecting sleep, rather than sacrificing it, could be one of the smartest study strategies a student can choose.";

export const BENCH_TASKS: BenchTask[] = [
  {
    id: "A-original",
    label: "원문 유지 · 고2 · 심화",
    grade: "고2",
    request: {
      mode: "original",
      topic: "",
      passage: PASSAGE_CREATIVITY,
      difficulty: "심화",
      count: 6,
      words: 200,
      types: ALL_TYPES,
    },
  },
  {
    id: "B-new",
    label: "새 지문 · 중3 · 표준",
    grade: "중3",
    request: {
      mode: "new",
      topic: "도시 건물 옥상 정원이 주민과 환경에 주는 이점",
      passage: "",
      difficulty: "표준",
      count: 6,
      words: 180,
      types: ALL_TYPES,
    },
  },
  {
    id: "C-variation",
    label: "원문 변형 · 고1 · 표준",
    grade: "고1",
    request: {
      mode: "variation",
      topic: "",
      passage: PASSAGE_SLEEP,
      difficulty: "표준",
      count: 6,
      words: 200,
      types: ALL_TYPES,
    },
  },
];
