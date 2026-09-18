"use client";

import { useState, type FocusEvent, type FormEvent } from "react";
import { asDifficulty, DIFFICULTY_LADDER } from "@/contracts/difficulty";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { ProblemCreateRequest } from "@/contracts/problem.contract";
import type { UnitEntity } from "@/contracts/unit.contract";
import { convertHwpMathSpans } from "@/lib/math/hwpEquation";
import { createProblem } from "@/lib/problem/problemApi";

import { FieldSelect } from "./FieldSelect";
import { PROBLEM_TYPES } from "./labels";

type Props = {
  units: UnitEntity[];
  defaultUnitId: string;
  onCreated: (
    count: number,
    problems: Awaited<ReturnType<typeof createProblem>>["data"][],
  ) => void;
  onError: (message: string) => void;
};

export function ProblemRegisterForm({
  units,
  defaultUnitId,
  onCreated,
  onError,
}: Props) {
  const [pending, setPending] = useState(false);
  const [hwpNotice, setHwpNotice] = useState<string | null>(null);

  /**
   * 한글(HWP) 수식 문법 → LaTeX. `$…$` 구간 안만, 역슬래시가 없을 때만 바꾼다
   * (트랙 8, 원장님 결정 B). 변환 결과에는 역슬래시가 생겨 두 번 걸려도 그대로다.
   */
  function convertField(field: HTMLInputElement | HTMLTextAreaElement) {
    const result = convertHwpMathSpans(field.value);
    if (!result.changed) return;
    field.value = result.text;
    setHwpNotice(["한글 수식을 변환했습니다", ...result.warnings].join(" — "));
  }

  const handleMathBlur = (
    event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => convertField(event.currentTarget);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    // 칸을 안 떠나고 제출해도(정답 칸에서 Enter) 같은 변환을 거친다.
    for (const name of ["content", "answer"]) {
      const field = formElement.elements.namedItem(name);
      if (
        field instanceof HTMLInputElement ||
        field instanceof HTMLTextAreaElement
      )
        convertField(field);
    }
    const form = new FormData(formElement);
    const input: ProblemCreateRequest = {
      unitId: String(form.get("unitId") ?? ""),
      source: form.get("source") === "past_exam" ? "past_exam" : "manual",
      difficulty: asDifficulty(form.get("difficulty")),
      problemType:
        (form.get("problemType") as ProblemCreateRequest["problemType"]) ??
        "계산",
      content: String(form.get("content") ?? ""),
      answer: String(form.get("answer") ?? ""),
      pool: "shared",
    };
    setPending(true);
    try {
      const body = await createProblem(input);
      onCreated(1, [body.data]);
    } catch {
      onError("등록에 실패했습니다");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      aria-label="등록"
      className="mt-4 border border-divider bg-white p-4"
      onSubmit={handleSubmit}
    >
      <div className="flex flex-wrap gap-3">
        <FieldSelect
          name="unitId"
          label="단원"
          defaultValue={defaultUnitId}
          required
        >
          {units.map((unit) => (
            <option key={unit.id} value={unit.id}>
              {unit.section}
            </option>
          ))}
        </FieldSelect>
        <FieldSelect name="source" label="출처" defaultValue="manual" required>
          <option value="manual">자작</option>
          <option value="past_exam">기출</option>
        </FieldSelect>
        <FieldSelect
          name="difficulty"
          label="난이도"
          defaultValue="기본"
          required
        >
          {DIFFICULTY_LADDER.map((tier) => (
            <option key={tier} value={tier}>
              {tier}
            </option>
          ))}
        </FieldSelect>
        <FieldSelect
          name="problemType"
          label="유형"
          defaultValue="계산"
          required
        >
          {PROBLEM_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </FieldSelect>
      </div>
      <label className="mt-3 flex flex-col gap-1 text-[10.5px] font-black tracking-[1.5px] text-text-2">
        본문
        <textarea
          name="content"
          required
          rows={3}
          onBlur={handleMathBlur}
          className="border border-control bg-white px-3 py-2 text-[12.5px] text-ink focus:border-g-blue focus:outline focus:outline-2 focus:outline-g-blue"
        />
      </label>
      <label className="mt-3 flex flex-col gap-1 text-[10.5px] font-black tracking-[1.5px] text-text-2">
        정답
        <Input name="answer" required onBlur={handleMathBlur} />
      </label>
      {hwpNotice ? (
        <p role="status" className="mt-2 text-[10.5px] font-bold text-text-3">
          {hwpNotice}
        </p>
      ) : null}
      <div className="mt-4">
        <Button type="submit" variant="ink" disabled={pending}>
          등록하기
        </Button>
      </div>
    </form>
  );
}
