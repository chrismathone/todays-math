import type { ScanSubmissionView } from "@/contracts/conceptBlankScanApi.contract";
import s from "./scan.module.css";

type Photo = ScanSubmissionView["photos"][number];
type Grade = ScanSubmissionView["grades"][number];
export type ScanPhotoMark = { slotId: string; number: number; draft: boolean };
export type ScanPhotoNotePlacement = { x: number; y: number; say: string };

const verdictPaths = {
  correct: "M-2.5 0 C-2.4-3.4 3-3.7 2.7 0 S-2.8 3.4-2.5 0 Z",
  partial: "M-2.8 2.2 L0-3.1 2.9 2.1 Z",
  incorrect: "M-2.5-2.4 L2.4 2.3 M2.4-2.5 L-2.5 2.5",
};

/** Flattened photos and verified future placements share the A4 millimetre coordinate system. */
export function ScanPhotoInk({
  photo,
  grades,
  marks,
  placements = [],
}: {
  photo: Photo;
  grades: readonly Grade[];
  marks: readonly ScanPhotoMark[];
  placements?: readonly ScanPhotoNotePlacement[];
}) {
  if (photo.registration.status !== "matched") return null;
  const slots = new Map(
    photo.registration.slots.map(({ slotId, points }) => [
      slotId,
      points.map(({ x, y }) => ({ x: x * 210, y: y * 297 })),
    ]),
  );
  return (
    <svg
      className={s.markupOverlay}
      viewBox="0 0 210 297"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {grades.map((grade) => {
        const anchor = slots.get(grade.slotIds[0])?.[0];
        if (!anchor || grade.label === "review") return null;
        return (
          <path
            key={grade.id}
            className={s.redPen}
            d={verdictPaths[grade.label]}
            transform={`translate(${Math.max(5, anchor.x - 5)} ${Math.max(5, anchor.y - 4)})`}
          />
        );
      })}
      {marks.map(({ slotId, number, draft }) => {
        const points = slots.get(slotId);
        if (!points) return null;
        const x = Math.min(
          205,
          Math.max(...points.map((point) => point.x)) + 4,
        );
        const y = Math.max(5, Math.min(...points.map((point) => point.y)));
        return (
          <g key={slotId} data-markup-badge="" data-draft={draft}>
            <polygon
              className={s.redPen}
              points={points.map((point) => `${point.x},${point.y}`).join(" ")}
            />
            <circle className={s.redBadge} cx={x} cy={y} r="3.5" />
            <text
              className={s.badgeText}
              x={x}
              y={y}
              dy=".35em"
              textAnchor="middle"
            >
              {number}
            </text>
          </g>
        );
      })}
      {placements.map(({ x, y, say }, index) => (
        <text key={index} className={s.placedMarkup} x={x} y={y}>
          {say}
        </text>
      ))}
    </svg>
  );
}
