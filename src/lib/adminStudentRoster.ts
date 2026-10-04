import type {
  AdminRelationsQuery,
  ConnectedStudent,
} from "@/contracts/adminRelations.contract";

const collator = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});
export function compareRosterNames(a: string, b: string): number {
  return collator.compare(a, b);
}
/** Disabled accounts stay issued; an expired temporary lock is enabled again. */
export function studentAccountLoginState(
  account: { disabledAt: Date | null; lockedUntil: Date | null } | null,
  now: Date,
): ConnectedStudent["login"] {
  return !account
    ? "unissued"
    : account.disabledAt
      ? "disabled"
      : account.lockedUntil && account.lockedUntil > now
        ? "locked"
        : "enabled";
}
export function rosterGradeKey(grade: string | null): string {
  const match = grade?.match(/^([초중고])(\d+)$/);
  return match
    ? `${{ 초: 0, 중: 1, 고: 2 }[match[1] as "초" | "중" | "고"]}${match[2]}`
    : `9${grade ?? "힣"}`;
}

/** Filter and sort the complete scoped roster before slicing a page, including multi-class students. */
export function selectAdminStudents(
  rows: ConnectedStudent[],
  query: AdminRelationsQuery,
) {
  const search = query.q.toLocaleLowerCase("ko-KR");
  const filtered = rows.filter((student) => {
    const classes = student.classes.filter(
      (c) => !query.classId || c.id === query.classId,
    );
    return (
      classes.length > 0 &&
      (!search ||
        [student.name, ...student.classes.map((c) => c.name)].some((name) =>
          name.toLocaleLowerCase("ko-KR").includes(search),
        )) &&
      (query.grade === "all" ||
        (query.grade === "unregistered"
          ? !student.grade
          : student.grade === query.grade)) &&
      (query.enrollment === "all" ||
        classes.some((c) =>
          query.enrollment === "enrolled"
            ? c.membership !== "on-hold"
            : c.membership === "on-hold",
        )) &&
      (query.login === "all" || student.login === query.login) &&
      (query.sync === "all" || student.sync === query.sync)
    );
  });
  const key = (student: ConnectedStudent) => {
    switch (query.sort) {
      case "class":
        return (
          student.classes
            .filter((c) => !query.classId || c.id === query.classId)
            .map((c) => c.name)
            .sort(compareRosterNames)[0] ?? ""
        );
      case "grade":
        return rosterGradeKey(student.grade);
      case "login":
        return student.login;
      default:
        return student.name;
    }
  };
  filtered.sort(
    (a, b) =>
      (query.direction === "desc" ? -1 : 1) *
        compareRosterNames(key(a), key(b)) ||
      compareRosterNames(a.name, b.name) ||
      a.id.localeCompare(b.id),
  );
  const total = filtered.length;
  const page = Math.min(
    query.page,
    Math.max(1, Math.ceil(total / query.pageSize)),
  );
  return {
    data: filtered.slice((page - 1) * query.pageSize, page * query.pageSize),
    meta: { page, pageSize: query.pageSize, total },
  };
}
