import type { ScanSubmissionView } from "@/contracts/conceptBlankScanApi.contract";
import s from "./scan.module.css";
export function ScanWrittenName({ view }: { view: ScanSubmissionView }) {
  const name = view.writtenName;
  if (view.role !== "teacher") return null;
  if (!name) return <p className={s.meta}>이름 칸: 아직 읽지 않음</p>;
  const methods = {
    "name-exact": "이름 정확 일치",
    "teacher-picked": "교사가 선택",
    "teacher-selected": "촬영 전 교사가 선택",
    "student-account": "학생 계정",
  };
  const statuses = {
    read: "읽음",
    uncertain: "흐림",
    unreadable: "읽지 못함",
    blank: "빈 이름 칸",
  };
  return (
    <div className={s.notice}>
      <p>
        이름: {name.text || statuses[name.status]} → ({view.student.className}){" "}
        {view.student.name}
      </p>
      <p className={s.meta}>
        {statuses[name.status]} · 연결 방식: {methods[name.method]}
      </p>
      {name.result === "mismatch" ? (
        <p role="status">
          이름 칸과 연결한 학생의 이름이 다릅니다.
          {name.method === "student-account"
            ? " 학생 계정의 주인은 유지됩니다."
            : " 답안 주인을 확인해 주세요."}
        </p>
      ) : null}
      {name.result === "ambiguous" ? (
        <p>
          같은 이름의 학생이 여럿입니다. 교사가 선택한 학생으로 연결했습니다.
        </p>
      ) : null}
    </div>
  );
}
