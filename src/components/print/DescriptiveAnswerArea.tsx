import {
  descriptiveWritingLayout,
  type NativeDescriptivePrint,
} from "@/lib/print/descriptive";
import { WritingArea } from "./WritingArea";
import { DescriptiveScore } from "./DescriptiveScore";

export function DescriptiveAnswerArea({
  data,
  number,
  standalone = false,
}: {
  data: NativeDescriptivePrint;
  number?: number;
  standalone?: boolean;
}) {
  return (
    <div data-descriptive-answer={number ?? ""}>
      <WritingArea
        pattern="grid"
        {...descriptiveWritingLayout(data)}
        label={`${number === undefined ? "" : `문 ${number} `}서술형 답란`}
        heading={
          standalone ? (
            <>
              문 {number} · 서술형{" "}
              <DescriptiveScore points={data.rubric.totalPoints} />
            </>
          ) : (
            <span aria-hidden="true" />
          )
        }
      />
    </div>
  );
}
