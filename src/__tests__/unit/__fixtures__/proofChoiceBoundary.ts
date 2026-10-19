/**
 * Authored display fixtures, not transcriptions of bank/textbook content.
 * Metadata links their two marker shapes to FLOW-F01's read-only observations.
 */
export const PROOF_CHOICE_CASES = [
  {
    name: "empty fifth reasoning marker",
    observed: {
      code: "J20501-A70-001",
      contentLength: 508,
      contentSha256:
        "b289626af20d82f6206853902f42234007c8b24d2c01640686fb7445e770b275",
      beforeChoiceCount: 9,
      beforeQuestionLength: 230,
      beforeLabels: [1, 2, 3, 4, 1, 2, 3, 4, 5],
      beforeDropped: [5],
      parentheticalLabel: 4,
    },
    stem: [
      "새로 만든 풀이 과정을 점검한다. 표시 ①~⑤ 중 옳지 않은 곳은?",
      "[그림]에서 두 길이에 임의의 이름을 붙였다.",
      "$u=v$라고 놓고 다음 줄을 읽는다.",
      "① $u+3=v+3$",
      "② 양쪽에서 $3$을 뺀다.",
      "그러면 처음의 식으로 돌아온다.",
      "③ 식을 옮겨 적으면 $u=v$이다.",
      "이 줄에 적은 근거는(",
      "④ 같은 수를 더했다가 뺐기 때문)이다.",
      "마지막 검토 표시를 남긴다.",
      "⑤",
    ].join("\n"),
    choices: ["$p+3$", "$q-4$", "$r+5$", "$s-6$", "$t+7$"],
  },
  {
    name: "fifth reasoning marker with narrative",
    observed: {
      code: "J20506-A37-001",
      contentLength: 556,
      contentSha256:
        "91372681a21c05c7d289de1c5205b7d116825c4006298bcf8895f97a16947902",
      beforeChoiceCount: 10,
      beforeQuestionLength: 182,
      beforeLabels: [1, 2, 3, 4, 5, 1, 2, 3, 4, 5],
      beforeDropped: [],
      parentheticalLabel: 3,
    },
    stem: [
      "가상의 풀이 과정을 읽고 표시 ①~⑤에서 옳지 않은 곳을 찾으면?",
      "[그림]의 길이에 이름을 붙여 $a=b$라고 썼다.",
      "① 양쪽에 같은 수를 더한다.",
      "$a+8=b+8$이라고 적는다.",
      "② 덧셈을 되돌려 처음 식을 얻는다.",
      "적어 둔 이유는(",
      "③ 양쪽에서 같은 수를 뺐기 때문)이다.",
      "이제 별도의 계산 기록을 살펴본다.",
      "④ $2+3=5$",
      "계산 결과와 다른 수를 나란히 쓴다.",
      "⑤ $5=6$이라고 끝맺었다.",
    ].join("\n"),
    choices: ["$m+8$", "$n-9$", "$k+10$", "$j-11$", "해당 없음"],
  },
] as const;

export function withCircledChoices(stem: string, choices: readonly string[]) {
  return [
    stem,
    ...choices.map((body, i) => `${String.fromCharCode(0x2460 + i)} ${body}`),
  ].join("\n");
}
