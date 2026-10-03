import { describe, expect, it } from "vitest";
import { judgeAnswerChoice } from "../../../scripts/qa/answerChoiceRules";
import {
  parseProblemContent,
  parseProblemContentLabeled,
} from "../../lib/problem/parseProblemContent";
import {
  digest,
  readEvidence,
  type DraftEvidence,
} from "../helpers/bankDecideEngineEvidence";

const before = readEvidence<DraftEvidence>("bankDecideParser.before.json.gz");
const daegu = before.rows.find((row) => row.id === "2025-daegudong-3-2-mid-6")!;
const visible = (text: string) =>
  text
    .replace(/^> ?/gm, "")
    .replace(/\\([.)])/g, "$1")
    .replace(
      /<\s*(조\s*건|보\s*기)(?::cols=\d+)?\s*>/g,
      (_, name: string) => `<${name.replace(/\s/g, "")}>`,
    )
    .replace(/\s+/g, " ")
    .trim();

describe("B3: 끝의 온전한 보기 묶음", () => {
  it("서로 다른 두 5지선다를 합친 행은 계속 뭉침으로 판정한다", () => {
    const raw =
      "발문\n1. 가\n2. 나\n3. 다\n4. 라\n5. 마\n1. 바\n2. 사\n3. 아\n4. 자\n5. 차";
    expect(parseProblemContentLabeled(raw).labels).toEqual([
      1, 2, 3, 4, 5, 1, 2, 3, 4, 5,
    ]);
    expect(
      judgeAnswerChoice({ content: raw, answer: "③", figureUrls: [] }),
    ).toMatchObject({
      verdict: "정답번호중복",
      cause: "여러 문항이 한 행에 뭉쳤다",
      fixedByLabelRendering: false,
    });
  });

  it.each([{ prefix: [1, 2, 3, 4] }, { prefix: [9, 1, 2, 3, 4, 8] }])(
    "앞에 온전한 네 번호 묶음 $prefix가 있으면 현행 해석을 유지한다",
    ({ prefix }) => {
      const labels = [...prefix, 1, 2, 3, 4, 5];
      const raw = ["발문", ...labels.map((n, i) => `${n}. 항목 ${i}`)].join(
        "\n",
      );
      const parsed = parseProblemContentLabeled(raw);
      expect(parsed.question).toBe("발문");
      expect(parsed.labels).toEqual(labels);
    },
  );

  it("대구동 6의 조건 세 줄과 대화 전체를 발문에 남기고 실제 학생 조합만 보기로 낸다", () => {
    const parsed = parseProblemContentLabeled(daegu.content);
    expect(parsed.choices).toEqual([
      "영희, 철수",
      "순이, 동철",
      "철수, 미정",
      "순이, 동철, 승진",
      "철수, 미정, 승진",
    ]);
    const prefix = daegu.content.slice(0, daegu.content.lastIndexOf("\n\n1."));
    expect(visible(parsed.question)).toBe(visible(prefix));
    expect(parsed.labels).toEqual([1, 2, 3, 4, 5]);
    expect(parsed.dropped).toEqual([]);
    expect(parsed.deduped).toBe(false);
    expect(parseProblemContent(daegu.content)).toEqual({
      question: parsed.question,
      choices: parsed.choices,
    });
  });

  for (const marks of [
    ["1.", "2.", "3.", "4."],
    ["①", "②", "③", "④"],
  ]) {
    it(`${marks[0]}로 다시 시작하는 네 보기는 조건에서 분리하고 뒤의 글도 보존한다`, () => {
      const prefix =
        "조건을 만족시키는 것은?\n1. 첫째 조건\n2. 둘째 조건\n선택하시오.";
      const bodies = ["가", "나", "다", "라\n끝에 붙은 설명"];
      const raw = `${prefix}\n\n${marks.map((mark, i) => `${mark} ${bodies[i]}`).join("\n")}`;
      const parsed = parseProblemContentLabeled(raw);
      expect(visible(parsed.question)).toBe(visible(prefix));
      expect(parsed.choices).toEqual(["가", "나", "다", "라 끝에 붙은 설명"]);
      expect(parsed.labels).toEqual([1, 2, 3, 4]);
    });
  }

  it.each(["숫자", "원문자"])(
    "온전한 %s 5지선다의 인용 번호와 발문은 그대로다",
    (kind) => {
      const marks =
        kind === "숫자"
          ? ["1.", "2.", "3.", "4.", "5."]
          : ["①", "②", "③", "④", "⑤"];
      const choices = ["첫째", "③을 언급한 둘째", "셋째", "넷째", "다섯째"];
      const raw = [
        "옳은 것은?",
        ...choices.map((body, i) => `${marks[i]} ${body}`),
      ].join("\n");
      expect(parseProblemContentLabeled(raw)).toEqual({
        question: "옳은 것은?",
        choices,
        labels: [1, 2, 3, 4, 5],
        dropped: [],
        deduped: false,
      });
    },
  );

  it("조건 세 항목만 있는 서술형과 3개 이하의 재시작은 기존 해석을 유지한다", () => {
    const only = "조건 ① 양수 ② 정수 ③ 홀수에 해당하는 수를 설명하시오.";
    expect(parseProblemContent(only)).toEqual({ question: only, choices: [] });
    expect(
      parseProblemContentLabeled(
        "설명하시오.\n1. 조건 가\n2. 조건 나\n1. 항목 가\n2. 항목 나\n3. 항목 다",
      ),
    ).toEqual({
      question: "설명하시오.",
      choices: ["조건 가", "조건 나", "항목 가", "항목 나", "항목 다"],
      labels: [1, 2, 1, 2, 3],
      dropped: [],
      deduped: false,
    });
  });

  it("중간의 온전한 묶음 뒤에 어긋난 번호가 있으면 끝 묶음으로 인정하지 않는다", () => {
    const raw = "발문\n1. 조건\n1. 가\n2. 나\n3. 다\n4. 라\n6. 후속 항목";
    expect(parseProblemContentLabeled(raw).labels).toEqual([1, 1, 2, 3, 4, 6]);
  });

  it("빈 보기는 선택한 끝 묶음에서만 dropped로 세고 앞의 빈 조건 번호는 세지 않는다", () => {
    const parsed = parseProblemContentLabeled(
      "발문\n1. \n2. 조건\n1. 가\n2. 나\n3. \n4. 라",
    );
    expect(parsed.choices).toEqual(["가", "나", "라"]);
    expect(parsed.labels).toEqual([1, 2, 4]);
    expect(parsed.dropped).toEqual([3]);
    expect(parsed.deduped).toBe(false);
    expect(visible(parsed.question)).toBe("발문 1. 2. 조건");
  });

  it("R2가 복구하는 반복 보기 블록은 끝 묶음을 자르기 전에 복구·중복 제거한다", () => {
    const raw = "고르시오.\n① 가 ② 나\n③ 다\n④ 라\n① 가\n② 나\n③ 다\n④ 라";
    expect(parseProblemContentLabeled(raw)).toEqual({
      question: "고르시오.",
      choices: ["가", "나", "다", "라"],
      labels: [1, 2, 3, 4],
      dropped: [],
      deduped: true,
    });
  });

  it("이미 중복 제거로 온전해진 보기 블록은 발문으로 옮기지 않는다", () => {
    const block = "\n1. 가\n2. 나\n3. 다\n4. 라";
    expect(parseProblemContentLabeled(`발문${block}${block}`)).toEqual({
      question: "발문",
      choices: ["가", "나", "다", "라"],
      labels: [1, 2, 3, 4],
      dropped: [],
      deduped: true,
    });
  });

  it("수정 전 초안 25편 533행 중 대구동 6만 파싱이 달라진다", () => {
    expect(before.exams).toHaveLength(25);
    expect(before.rows).toHaveLength(533);
    expect(new Set(before.rows.map((row) => row.id)).size).toBe(533);
    const changed = before.rows
      .filter(
        (row) => digest(parseProblemContentLabeled(row.content)) !== row.hash,
      )
      .map((row) => row.id);
    expect(changed).toEqual(["2025-daegudong-3-2-mid-6"]);
  });
});
