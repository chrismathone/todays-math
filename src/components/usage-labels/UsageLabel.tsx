import type {
  UsageArithmeticLabel,
  UsageArithmeticV2Label,
  UsageProblemLabel,
} from "@/contracts/usageLabels.contract";
import s from "./UsageLabel.module.css";

export default function UsageLabel({
  item,
  kind,
  note,
}: {
  item?: UsageArithmeticLabel | UsageProblemLabel | UsageArithmeticV2Label;
  kind: "problem" | "arithmetic";
  note?: string;
}) {
  if (
    !item ||
    (item.state !== "ranked" && item.state !== "unranked") ||
    !item.count
  )
    return null;
  const label =
    item.state === "ranked" && item.label
      ? item.label
      : kind === "problem"
        ? `내 출제 ${item.count}회`
        : `내 학습지 ${item.count}장`;
  const tooltip = [item.tooltip || `최근 30일 · ${label}`, note]
    .filter(Boolean)
    .join(" · ");
  return (
    <span
      className={item.state === "ranked" ? s.rank : s.count}
      title={tooltip}
      aria-label={`${label}. ${tooltip}`}
    >
      {label}
    </span>
  );
}
