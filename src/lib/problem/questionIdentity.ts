/** NULL/legacy rows remain independent. Never infer identity from family or code. */
export function questionIdOf(row: {
  id: string;
  questionGroupKey?: string | null;
}): string {
  return row.questionGroupKey ?? `row:${row.id}`;
}

export function groupQuestionRows<
  T extends { id: string; questionGroupKey?: string | null },
>(rows: readonly T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const key = questionIdOf(row);
    const group = grouped.get(key);
    if (group) group.push(row);
    else grouped.set(key, [row]);
  }
  return grouped;
}
