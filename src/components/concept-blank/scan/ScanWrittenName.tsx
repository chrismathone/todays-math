import type { ScanSubmissionView } from "@/contracts/conceptBlankScanApi.contract";
import s from "./scan.module.css";
export function ScanWrittenName({ view }: { view: ScanSubmissionView }) {
  const name = view.writtenName;
  if (view.role !== "teacher") return null;
  if (!name) return <p className={s.meta}>이름: 아직 읽지 않음</p>;
  const methods = {
    "name-exact": "이름으로 찾음",
    "teacher-picked": "교사가 고름",
    "teacher-selected": "촬영 전에 교사가 고름",
    "student-account": "학생 계정으로 제출",
  };
  const statuses = {
    read: "읽음",
    uncertain: "흐림",
    unreadable: "읽지 못함",
    blank: "이름 칸 비어 있음",
  };
  return (
    <div className={s.notice}>
      <p>
        종이의 이름: {name.text || statuses[name.status]} · 학생:{" "}
        {view.student.name} ({view.student.className})
      </p>
      <p className={s.meta}>
        {statuses[name.status]} · {methods[name.method]}
      </p>
      {name.result === "mismatch" ? (
        <p role="status">
          종이의 이름이 이 학생과 다릅니다.
          {name.method === "student-account"
            ? " 학생 계정으로 제출해 학생은 바뀌지 않습니다."
            : " 학생이 맞는지 확인해 주세요."}
        </p>
      ) : null}
      {name.result === "ambiguous" ? (
        <p>같은 이름의 학생이 여럿이라 교사가 고른 학생으로 정했습니다.</p>
      ) : null}
    </div>
  );
}
