import type { StudentExamReport } from "@/contracts/examReport.contract";
import { recentExamHistory } from "@/lib/examReport/trend";

/** SVG도 처음 HTML에 있다. 세로축은 언제나 0~100이며 결시 앞뒤를 연결하지 않는다. */
export function ExamReportTrend({
  history,
}: {
  history: StudentExamReport["history"];
}) {
  const records = recentExamHistory(history);
  if (!records.length) return null;
  const x = (i: number) => 44 + (i * 576) / (records.length - 1);
  const y = (value: number) => 112 - value * 0.9;
  const segments: string[][] = [[]];
  records.forEach((record, i) => {
    if (record.score100 === null) segments.push([]);
    else segments.at(-1)!.push(`${x(i)},${y(record.score100)}`);
  });
  return (
    <div className="er-trend" data-exam-report-trend>
      <svg
        viewBox="0 0 640 144"
        role="img"
        aria-label="월말평가 추이 · 100점 환산 · 세로축 0~100점"
      >
        <title>
          {records
            .map(
              (r) =>
                `${r.date} ${r.title}: ${r.score100 === null ? "결시" : `${r.score100}점`}`,
            )
            .join(" · ")}
        </title>
        {[0, 50, 100].map((value) => (
          <g key={value}>
            <line
              x1="38"
              x2="630"
              y1={y(value)}
              y2={y(value)}
              stroke="currentColor"
              strokeWidth={value === 0 ? 1 : 0.5}
              strokeDasharray={value === 0 ? undefined : "2 4"}
            />
            <text x="27" y={y(value) + 5} textAnchor="end">
              {value}
            </text>
          </g>
        ))}
        {segments
          .filter((points) => points.length > 1)
          .map((points, i) => (
            <polyline
              key={i}
              data-trend-segment
              points={points.join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
          ))}
        {records.map((record, i) => (
          <g
            key={`${record.date}-${i}`}
            data-trend-score={record.score100 ?? "absent"}
          >
            {record.score100 === null ? (
              <text x={x(i)} y="80" textAnchor="middle">
                결시
              </text>
            ) : (
              <>
                <circle
                  cx={x(i)}
                  cy={y(record.score100)}
                  r="3"
                  fill="currentColor"
                />
                <text
                  x={x(i)}
                  y={y(record.score100) - 8}
                  textAnchor="middle"
                  fontWeight="700"
                >
                  {record.score100}
                </text>
              </>
            )}
            <text x={x(i)} y="136" textAnchor="middle">
              {record.date.slice(5).replace("-", ".")}
            </text>
          </g>
        ))}
      </svg>
      <ol
        className="er-trendTitles"
        style={{
          gridTemplateColumns: `repeat(${records.length}, minmax(0, 1fr))`,
        }}
      >
        {records.map((record, i) => (
          <li key={`${record.date}-${i}`}>{record.title}</li>
        ))}
      </ol>
    </div>
  );
}
