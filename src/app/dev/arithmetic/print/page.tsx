import { notFound } from "next/navigation";
import { connection } from "next/server";
import { devPageVisible } from "@/lib/devPageAccess";
import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
  buildArithmeticSheet,
} from "@/lib/arithmetic";
import { findArithmeticPreset } from "@/lib/arithmeticPresets";
import {
  arithmeticPaperPages,
  type ArithmeticDensity,
} from "@/components/arithmetic/ArithmeticPaper";

/** Uses the actual paper component, with all seven families and no persistence. */
export default async function ArithmeticPrintFixture({
  searchParams,
}: {
  searchParams: Promise<{ density?: string; title?: string }>;
}) {
  await connection();
  if (!(await devPageVisible())) notFound();
  const params = await searchParams;
  const requested = Number(params.density);
  const density: ArithmeticDensity =
    requested === 12 || requested === 40 ? requested : 24;
  const ids = [
    "add-one-small-0-4",
    "sub-one-small-0-5",
    "add-two-carry-2",
    "sub-two-borrow-1",
    "times-table-9",
    "multiply-two-by-9-carry-2",
    "divide-two-by-7-exact",
  ];
  const sheet = buildArithmeticSheet({
    engineVersion: ARITHMETIC_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_CATALOG_VERSION,
    seed: "arithmetic-print-fixture-v1",
    rounds: [
      {
        skills: ids.map((id) => {
          const preset = findArithmeticPreset(id)!;
          return {
            ...preset.selection,
            count: Math.min(14, preset.domainSize),
          };
        }),
      },
    ],
  });
  return (
    <main style={{ margin: 0, padding: 0 }}>
      {arithmeticPaperPages({
        sheet,
        title: params.title?.slice(0, 200) || "기초 연산 종합 연습",
        mode: "both",
        density,
      }).map((page) => page.node)}
    </main>
  );
}
