import "server-only";
import {
  arithmeticToStudioProblems,
  type ArithmeticOutputSheet,
} from "./arithmeticOutput";
import { withArithmeticPackReader } from "./arithmetic-v2/presentation/packAssets";
import { readNodeArithmeticPack } from "./arithmetic-v2/presentation/packAssets.node";

export function arithmeticToNodeStudioProblems(sheet: ArithmeticOutputSheet) {
  return withArithmeticPackReader(readNodeArithmeticPack, () =>
    arithmeticToStudioProblems(sheet),
  );
}
