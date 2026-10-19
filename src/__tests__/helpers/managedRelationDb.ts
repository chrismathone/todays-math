import type { Prisma } from "@prisma/client";

// Query-evaluating in-memory fixture. It models relationship filters and rollback;
// database constraints and locking are verified by the isolated PostgreSQL suite.
type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export function managedRelationDb() {
  const tables: Record<string, Row[]> = {};
  let sequence = 0;
  const names = [
    "eywaBinding",
    "eywaManagedAccount",
    "class",
    "student",
    "studentAccount",
    "classMembership",
    "studentEnrollment",
    "unit",
    "progress",
    "test",
    "testResult",
    "testProblem",
    "problemAnswer",
    "examPublication",
    "user",
    "englishExam",
  ];
  for (const name of names) tables[name] = [];
  const relation = (row: Row, key: string) => {
    if (key === "user")
      return tables.user.find((u) => u.id === row.userId) ?? null;
    if (key === "class")
      return tables.class.find((c) => c.id === row.classId) ?? null;
    if (key === "enrollments")
      return tables.studentEnrollment.filter((e) => e.studentId === row.id);
    if (key === "test")
      return tables.test.find((t) => t.id === row.testId) ?? null;
    return undefined;
  };
  const cmp = (value: unknown) =>
    value instanceof Date ? value.getTime() : value;
  const matches = (row: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([key, condition]) => {
      if (condition === undefined) return true;
      if (key === "AND")
        return (Array.isArray(condition) ? condition : [condition]).every((c) =>
          matches(row, c),
        );
      if (key === "OR") return condition.some((c: Row) => matches(row, c));
      if (key.includes("_") && !(key in row)) return matches(row, condition);
      const linked = relation(row, key);
      if (linked !== undefined)
        return Array.isArray(linked)
          ? linked.some((r) => matches(r, condition.some))
          : !!linked && matches(linked, condition);
      const value = row[key] ?? null;
      if (
        condition === null ||
        typeof condition !== "object" ||
        condition instanceof Date
      )
        return cmp(value) === cmp(condition);
      return Object.entries(condition).every(([op, operand]) => {
        if (op === "in") return (operand as unknown[]).includes(value);
        if (op === "notIn") return !(operand as unknown[]).includes(value);
        if (op === "not") return value !== operand;
        const left = cmp(value) as string | number,
          right = cmp(operand) as string | number;
        if (op === "gt") return left > right;
        if (op === "gte") return left >= right;
        if (op === "lt") return left < right;
        if (op === "lte") return left <= right;
        throw new Error(`Unsupported fixture operator: ${op}`);
      });
    });
  const include = (row: Row | undefined, spec: Row = {}): Row | null => {
    if (!row) return null;
    const out = { ...row };
    for (const [key, nested] of Object.entries(spec)) {
      const linked = relation(row, key);
      out[key] = Array.isArray(linked)
        ? linked
            .filter((r) => matches(r, nested.where))
            .map((r) => include(r, nested.include))
        : include(linked ?? undefined, nested === true ? {} : nested.include);
    }
    return out;
  };
  const models = Object.fromEntries(
    names.map((name) => [
      name,
      {
        async findMany(args: Row = {}) {
          return tables[name]
            .filter((r) => matches(r, args.where))
            .map((r) => include(r, args.include));
        },
        async findFirst(args: Row = {}) {
          return include(
            tables[name].find((r) => matches(r, args.where)),
            args.include,
          );
        },
        async findUnique(args: Row) {
          return include(
            tables[name].find((r) => matches(r, args.where)),
            args.include,
          );
        },
        async findUniqueOrThrow(args: Row) {
          const row = include(
            tables[name].find((r) => matches(r, args.where)),
            args.include,
          );
          if (!row) throw new Error("missing fixture row");
          return row;
        },
        async count(args: Row = {}) {
          return tables[name].filter((r) => matches(r, args.where)).length;
        },
        async upsert(args: Row) {
          let row = tables[name].find((r) => matches(r, args.where));
          if (row) Object.assign(row, args.update);
          else {
            row = {
              id: `local-${++sequence}`,
              createdAt: new Date(),
              updatedAt: new Date(),
              ...args.create,
            };
            tables[name].push(row!);
          }
          return { ...row };
        },
        async updateMany(args: Row) {
          const rows = tables[name].filter((r) => matches(r, args.where));
          rows.forEach((r) => Object.assign(r, args.data));
          return { count: rows.length };
        },
        async update(args: Row) {
          const row = tables[name].find((r) => matches(r, args.where));
          if (!row) throw new Error("missing fixture row");
          Object.assign(row, args.data);
          return { ...row };
        },
        async createMany(args: Row) {
          const data: Row[] = Array.isArray(args.data)
            ? args.data
            : [args.data];
          for (const item of data) {
            if (
              name === "progress" &&
              item.eywaReportId != null &&
              tables[name].some(
                (row) =>
                  row.eywaReportId === item.eywaReportId &&
                  row.unitId === item.unitId,
              )
            )
              throw new Error("duplicate progress identity");
            tables[name].push({
              id: `local-${++sequence}`,
              createdAt: new Date(),
              updatedAt: new Date(),
              ...item,
            });
          }
          return { count: data.length };
        },
        async create(args: Row) {
          const row = {
            id: `local-${++sequence}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...args.data,
          };
          tables[name].push(row);
          return row;
        },
      },
    ]),
  );
  const tx = {
    ...models,
    async $queryRaw() {
      return [];
    },
  } as unknown as Prisma.TransactionClient;
  async function transaction<T>(
    work: (client: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const before = structuredClone(tables);
    try {
      return await work(tx);
    } catch (error) {
      for (const name of names) tables[name] = before[name];
      throw error;
    }
  }
  return { tables, tx, transaction };
}
