import "server-only";
import { Prisma } from "@prisma/client";
import { BANK_SOURCE_GROUPS, BANK_SOURCE_GROUP_SOURCES } from "@/contracts/bankSource.contract";
import { problemVisibleWhere } from "@/lib/problemPool";

/** Source-picker tabs display held question unions only. Do not classify formats,
 * inspect eligibility, number rows, or join hidden textbook/material metadata.
 * The same question may occur in several source groups; each union is distinct.
 */
export function heldQuestionSourceGroupsSql() {
  const identity = Prisma.sql`COALESCE(p.question_group_key, 'row:' || p.id::text) COLLATE "C"`;
  return Object.assign(Prisma.sql`SELECT count(DISTINCT ${identity})::int AS total,
    ${Prisma.join(BANK_SOURCE_GROUPS.map((group) => Prisma.sql`count(DISTINCT ${identity})
      FILTER (WHERE p.source::text=ANY(${[...BANK_SOURCE_GROUP_SOURCES[group]]}::text[]))::int AS ${Prisma.raw(group)}`))}
    FROM public.problem p WHERE p.pool=${problemVisibleWhere().pool}::problem_pool`, { bankHeldSourceGroups: true });
}
