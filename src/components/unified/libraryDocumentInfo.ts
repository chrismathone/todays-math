import type { PrivateDocument } from "@/contracts/privateWorkspace.contract";

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const templates: Record<string, string> = {
  pyeongga: "평가원",
  jeongtong: "정통",
  modern: "모던",
  workbook: "워크북",
  jaseup: "자습",
  yuhyung: "유형",
};

/** Read saved facts only; missing legacy metadata is never called complete. */
export function libraryDocumentInfo(
  document: PrivateDocument,
): [string, string][] {
  const payload = document.payload;
  const result: [string, string][] = [];
  const presentation =
    document.kind === "arithmeticSheet"
      ? record(payload.presentation)
      : payload;
  const meta = record(presentation.printMeta);
  for (const [key, label] of [
    ["schoolName", "학교·기관"],
    ["grade", "학년"],
    ["subject", "과목"],
    ["semester", "학기"],
    ["examDate", "시험일"],
    ["examDuration", "시험 시간"],
  ]) {
    if (typeof meta[key] === "string" && meta[key].trim())
      result.push([label, meta[key]]);
  }
  const options = record(presentation.printOptions);
  if (typeof options.template === "string" && templates[options.template])
    result.push(["양식", templates[options.template]]);
  if (options.columns === 1 || options.columns === 2)
    result.push(["단 구성", `${options.columns}단`]);
  if (typeof options.showAnswers === "boolean")
    result.push([
      "정답지",
      options.showAnswers
        ? options.quickAnswerOnly
          ? "답만 포함"
          : "정답·해설 포함"
        : "포함하지 않음",
    ]);
  if (document.kind === "arithmeticSheet" && Array.isArray(payload.rounds))
    result.push(["회차", `${payload.rounds.length}회`]);
  return result;
}
