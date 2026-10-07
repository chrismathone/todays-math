/** Attach one part's reviewed table after its original helpers finish; returns code only. */
import ts from "typescript";

export function attachAssessmentSource(text: string, part: string): string {
  if (!/^(?:e[3-6]|m[1-3])(?:plus)?$/.test(part))
    throw new Error("알 수 없는 은행 파일");
  const file = ts.createSourceFile(
    "bank.ts",
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  const hasExport = file.statements.some(
    (statement) =>
      ts.isVariableStatement(statement) &&
      statement.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      ) &&
      statement.declarationList.declarations.some(
        (declaration) =>
          ts.isIdentifier(declaration.name) && declaration.name.text === "bank",
      ),
  );
  if (!hasExport) throw new Error("기존 bank 내보내기가 없습니다.");
  const privateNames = [
    "attachReviewedQuestions",
    "reviewedQuestionData",
    "ReviewedQuestionTable",
  ];
  let conflict = false;
  function visit(node: ts.Node) {
    if (ts.isIdentifier(node) && privateNames.includes(node.text))
      conflict = true;
    ts.forEachChild(node, visit);
  }
  visit(file);
  if (conflict)
    throw new Error("기존 질문 연결이나 생성 이름을 먼저 확인하세요.");
  const imports = file.statements.filter(ts.isImportDeclaration);
  const position = imports.at(-1)?.end ?? 0;
  const name = part.replace(/plus$/, "-plus");
  const added = `\nimport { withAssessments as attachReviewedQuestions, type AssessmentTable as ReviewedQuestionTable } from "./assessment";\nimport reviewedQuestionData from "./assessments/${name}.json";\n`;
  return (
    text.slice(0, position) +
    added +
    text.slice(position) +
    "\n// 원래 단원·그림·사례 helper가 끝난 뒤 이 파일의 검토한 질문만 붙인다.\nbank.concepts = attachReviewedQuestions(bank, reviewedQuestionData as ReviewedQuestionTable).concepts;\n"
  );
}
