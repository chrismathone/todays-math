/** Local author catalogue only. Deliberately absent from examStudy and DB registries. */
import type {
  NativeHelperAdapters,
  NativePrimaryAuthor,
} from "../../../contracts/descriptiveAuthor.contract";
import type { NativeGateSuite } from "../nativeDescriptiveGates";
import { batch1LowerAuthors } from "./batch1Lower";
import { batch1UpperAuthors } from "./batch1Upper";
import { rectangleAuthor, rectangleGateSuite } from "./rectangleDemo";
import { lineAreaAuthor, lineAreaGateSuite } from "./lineAreaDemo";

export type Batch1Author = {
  candidateId: string;
  author: NativePrimaryAuthor;
  variants: readonly number[];
  gateSuite(adapters: NativeHelperAdapters): Promise<NativeGateSuite>;
};

export const batch1Authors: readonly Batch1Author[] = [
  ...batch1LowerAuthors,
  {
    candidateId: "C05",
    author: rectangleAuthor,
    variants: [0, 1],
    gateSuite: rectangleGateSuite,
  },
  {
    candidateId: "C06",
    author: lineAreaAuthor,
    variants: [0, 1],
    gateSuite: lineAreaGateSuite,
  },
  ...batch1UpperAuthors,
];
