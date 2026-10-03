import { useState } from "react";
import { englishExamListResponseSchema } from "@/contracts/english.contract";
import w from "@/components/unified/Workroom.module.css";
import s from "../EnglishStudio.module.css";
import { examLabel } from "../englishClient";
import { useBankQuery } from "./bankClient";
import { BankError, BankLoading } from "./BankFeedback";

export default function BankExamPicker({
  active,
  value,
  onChange,
  onNewExam,
  label = "대상 시험",
}: {
  active: boolean;
  value: string;
  onChange: (id: string) => void;
  onNewExam?: () => void;
  label?: string;
}) {
  const [generation, setGeneration] = useState(0);
  const result = useBankQuery(
    active ? "/api/english/exams" : null,
    englishExamListResponseSchema,
    generation,
  );
  if (result.status === "loading") return <BankLoading />;
  if (result.status === "error")
    return (
      <BankError
        message={result.message}
        onRetry={() => setGeneration((v) => v + 1)}
      />
    );
  if (!result.data.data.length)
    return (
      <div>
        <p className={s.footnote}>
          등록된 시험이 없습니다. 지문은 시험 없이 보관할 수 있습니다.
        </p>
        {onNewExam && (
          <button type="button" className={w.outlineButton} onClick={onNewExam}>
            새 시험 만들기
          </button>
        )}
      </div>
    );
  return (
    <label className={s.field}>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      >
        <option value="">시험을 선택하세요</option>
        {result.data.data.map((exam) => (
          <option key={exam.id} value={exam.id}>
            {exam.school} · {examLabel(exam)}
          </option>
        ))}
      </select>
    </label>
  );
}
