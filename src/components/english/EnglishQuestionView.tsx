/**
 * 검토 화면의 문항 읽기 모양 — **지면과 같은 규칙**(원장님 2026-10-01 «후보정» · 같은 문제는 같은 뷰).
 * 발문은 `EnglishPromptText`(어법의 `<u>` 를 밑줄로), 보기는 `englishOptionLayout`(번호뿐인 보기 · 겹친 번호), 정답은 번호 글자.
 * 지면과 다른 것은 글꼴뿐이다 — 화면은 앱 글꼴 하나(원장님 «웹앱 안에서는 모든 곳에서 일정한 폰트»), 지면은 지면 명조.
 */
import {
  ENGLISH_OPEN_TYPES,
  type EnglishQuestion,
} from "@/contracts/english.contract";
import {
  ENGLISH_CHOICE_MARKS,
  englishOptionLayout,
} from "@/lib/english/options";

import EnglishPromptText, { EnglishMarkedText } from "./EnglishPromptText";
import s from "./EnglishStudio.module.css";

export default function EnglishQuestionView({
  question,
  number,
}: {
  question: EnglishQuestion;
  number: number;
}) {
  const open = ENGLISH_OPEN_TYPES.includes(question.type);
  const options = englishOptionLayout(question);
  const answer = open
    ? question.answer
    : (ENGLISH_CHOICE_MARKS[Number(question.answer) - 1] ?? question.answer);
  return (
    <div className={s.qView}>
      <p className={s.qPrompt}>
        <EnglishPromptText
          question={question}
          underlineClassName={s.qUnderline}
          markClassName={s.qCircled}
        />
      </p>
      {options.lines.length > 0 && !options.omitted ? (
        <ol aria-label={`${number}번 보기`} className={s.qChoices}>
          {options.lines.map((line, index) => (
            <li key={index}>
              <span className={s.qCircled}>{line.mark}</span>
              <span>
                <EnglishMarkedText
                  text={line.text}
                  markClassName={s.qCircled}
                />
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      <dl className={s.qFacts}>
        <div>
          <dt>{open ? "정답 · 인정 답안" : "정답"}</dt>
          <dd>
            <EnglishMarkedText text={answer} markClassName={s.qCircled} />
          </dd>
        </div>
        {question.explanation ? (
          <div>
            <dt>해설</dt>
            <dd>{question.explanation}</dd>
          </div>
        ) : null}
        {question.evidence ? (
          <div>
            <dt>근거</dt>
            <dd>{question.evidence}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
