// Ported from mathg-gen src/lib/problemAdapter.ts; render-only, source data stays unchanged.
import {
  hideQuestionScores,
  replaceQuestionScores,
} from "./questionScoreDisplay";
export const stripLeadingProblemNumber = (
  text: string,
  num?: number,
): string => {
  if (!text || typeof num !== "number" || !Number.isInteger(num) || num <= 0)
    return text;
  return text.replace(new RegExp("^\\s*" + num + "\\s*[.)]\\s+"), "");
};

// 보기 ① 또는 소문항 (1)/(가) 줄 시작 — 본문(발문+박스) 영역의 경계.
const CHOICE_OR_SUB_LINE = /^\s*(?:[①-⑳]|\(\s*(?:\d{1,2}|[가-힣])\s*\)\s)/;

/**
 * 배점 [N점] 을 *발문 끝*(첫 보기/박스 직전)으로 통일 — 엔진 _parse_question 의 배점 캡처·재배치
 * 웹 판(§45). 웹 stripScoreText 는 박스 내 배점을 보호해 보기 박스 끝(마지막 보기 ㅁ 뒤)에 남던
 * 것(사용자 보고 #9)을 교정. 본문(발문+박스) 영역의 [N점] 을 모두 제거하고, 점수(필드 우선,
 * 없으면 본문에서 추출)를 발문 끝에 1회 삽입. *소문항((1)(2)) 줄의 배점은 보존*(그 줄부터 본문
 * 영역 밖). 점수 없으면 제거만(추가 X). HWP 출력(6 템플릿 발문 끝 통일)과 일치.
 */
export const repositionScore = (
  question: string,
  scoreField?: number | string,
  visible = true,
): string => {
  if (!question) return question;
  if (!visible) return hideQuestionScores(question);
  const lines = question.split("\n");
  let bodyEnd = lines.findIndex((l) => CHOICE_OR_SUB_LINE.test(l));
  if (bodyEnd < 0) bodyEnd = lines.length;
  let extracted: string | undefined;
  const main = replaceQuestionScores(
    lines.slice(0, bodyEnd).join("\n"),
    (score) => {
      extracted ??= score;
      return " ";
    },
  ).replace(/[ \t]+$/gm, "");
  const score =
    scoreField != null &&
    /^\d+(?:\.\d+)?$/.test(String(scoreField).trim()) &&
    Number(scoreField) > 0
      ? String(scoreField).trim()
      : extracted;
  const body = [main, ...lines.slice(bodyEnd)].join("\n");
  if (!score || !(Number(score) > 0)) return body;
  const tag = ` [${score}점]`;
  // 그림/보기 박스 내부를 공백으로 가린 뒤 마지막 발문 위치를 찾는다.
  // 빈 줄 유무와 무관하며 SVG의 좌표·라벨이나 소문항 배점에 끼어들지 않는다.
  // CommonMark allows lazy continuation lines without another ">". They are
  // still inside the condition box until a blank line ends that paragraph.
  const masked = main.replace(
    /<svg\b[\s\S]*?<\/svg>|<table\b[\s\S]*?<\/table>|<blockquote\b[\s\S]*?<\/blockquote>|\[(?:그림\s*|원본표)\d+\]|!\[[^\]]*\]\([^\n]*?\)|^[ \t]*>[^\n]*(?:\n(?![ \t]*\n)[^\n]*)*|^[ \t]*\|[^\n]*/gim,
    (value) => value.replace(/[^\n]/g, " "),
  );
  const end = masked.trimEnd().length;
  if (!end) return tag.trimStart() + "\n\n" + body.trimStart();
  return body.slice(0, end).trimEnd() + tag + body.slice(end);
};
