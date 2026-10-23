import {
  workbookExerciseInputSchema,
  type WorkbookAddress,
  type WorkbookExerciseInput,
} from "@/contracts/commercialWorkbook.contract";
import { fail } from "./errors";

export function workbookAddressKey(address: WorkbookAddress): string {
  return JSON.stringify(
    [
      address.volume,
      address.section,
      address.page,
      address.number,
      address.subpart,
    ].map((value) => value.trim().normalize("NFC")),
  );
}
export function assertUniqueAddresses(
  exercises: readonly WorkbookExerciseInput[],
): void {
  const seen = new Set<string>();
  for (const exercise of exercises) {
    const key = workbookAddressKey(exercise.address);
    if (seen.has(key))
      fail(
        "DUPLICATE_ADDRESS",
        "같은 권·단원·쪽·번호·소문항이 중복되었습니다.",
      );
    seen.add(key);
  }
}
export interface WorkbookImportIssue {
  row: number;
  field: string;
  message: string;
}
export interface WorkbookImportResult {
  exercises: WorkbookExerciseInput[];
  issues: WorkbookImportIssue[];
}
const headers = [
  "volume",
  "section",
  "page",
  "number",
  "subpart",
  "answerText",
  "keyStatus",
  "sourcePage",
];
/** RFC-style quoted CSV/TSV. A failed import returns no usable rows, never a partial success. */
export function parseWorkbookImport(
  text: string,
  delimiter?: "," | "\t",
): WorkbookImportResult {
  const issues: WorkbookImportIssue[] = [];
  const bad = (row: number, field: string, message: string) =>
    issues.push({ row, field, message });
  if (text.length > 2_000_000)
    return {
      exercises: [],
      issues: [
        {
          row: 0,
          field: "file",
          message: "가져오기 파일은 2MB 이하로 나누어 주세요.",
        },
      ],
    };
  text = text.replace(/^\uFEFF/, "");
  const sep =
    delimiter ?? (text.split(/\r?\n/, 1)[0].includes("\t") ? "\t" : ",");
  const rows: string[][] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === '"' && cell === "" && !closed) quoted = true;
    else if (c === sep) {
      cells.push(cell);
      cell = "";
      closed = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      cells.push(cell);
      rows.push(cells);
      cells = [];
      cell = "";
      closed = false;
    } else if (closed || c === '"') {
      bad(rows.length + 1, "file", "따옴표 구분을 확인해 주세요.");
      break;
    } else cell += c;
  }
  if (quoted) bad(rows.length + 1, "file", "닫히지 않은 따옴표가 있습니다.");
  if (cell || cells.length) {
    cells.push(cell);
    rows.push(cells);
  }
  const columns = (rows.shift() ?? []).map((v) => v.trim());
  if (
    !columns.includes("page") ||
    !columns.includes("number") ||
    new Set(columns).size !== columns.length ||
    columns.some((h) => !headers.includes(h))
  )
    bad(
      1,
      "header",
      "page, number 열이 필요합니다. 허용 열: " + headers.join(", "),
    );
  if (!rows.length || rows.length > 5000)
    bad(0, "file", "1~5000개 문항을 입력해 주세요.");
  const exercises: WorkbookExerciseInput[] = [];
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    if (row.length !== columns.length) {
      bad(index + 2, "file", "열 개수가 머리글과 다릅니다.");
      return;
    }
    const values = Object.fromEntries(
      columns.map((column, i) => [column, row[i].trim()]),
    );
    const status = values.keyStatus || "unreviewed";
    if (!values.answerText && (values.keyStatus || values.sourcePage)) {
      bad(
        index + 2,
        "keyStatus",
        "정답 없는 문항에 검토 상태·정답 출처 쪽을 지정할 수 없습니다.",
      );
      return;
    }
    const result = workbookExerciseInputSchema.safeParse({
      address: {
        volume: values.volume ?? "",
        section: values.section ?? "",
        page: values.page,
        number: values.number,
        subpart: values.subpart ?? "",
      },
      key: values.answerText
        ? {
            answerText: values.answerText,
            status,
            ...(values.sourcePage
              ? { sourcePage: Number(values.sourcePage) }
              : {}),
          }
        : null,
    });
    if (!result.success) {
      for (const issue of result.error.issues)
        bad(index + 2, issue.path.join("."), issue.message);
      return;
    }
    const key = workbookAddressKey(result.data.address);
    if (seen.has(key)) bad(index + 2, "address", "중복 문항 주소입니다.");
    seen.add(key);
    exercises.push(result.data);
  });
  return { exercises: issues.length ? [] : exercises, issues };
}
