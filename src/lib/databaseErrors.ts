import { Prisma } from "@prisma/client";

/** Prisma maps NO ACTION to P2003; PostgreSQL RESTRICT may surface SQLSTATE 23001. */
export function isRetainedRelationError(error: unknown): boolean {
  return (
    Boolean(
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2003",
    ) ||
    (error instanceof Prisma.PrismaClientUnknownRequestError &&
      /code: "23001"/.test(error.message) &&
      error.message.includes(
        "violates RESTRICT setting of foreign key constraint",
      ))
  );
}
