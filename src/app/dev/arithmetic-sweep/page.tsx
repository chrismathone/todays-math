import { notFound } from "next/navigation";
import { connection } from "next/server";
import ArithmeticSweepFixture from "./ArithmeticSweepFixture";
import { listArithmeticV2Types } from "@/lib/arithmetic-v2/catalog";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
} from "@/contracts/arithmeticV2.contract";

export default async function ArithmeticSweepPage() {
  await connection();
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <ArithmeticSweepFixture
      catalog={{
        engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
        catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
        types: listArithmeticV2Types(),
        limits: { itemsPerRound: 200, itemsTotal: 2000, rounds: 10 },
        writerEnabled: false,
      }}
    />
  );
}
