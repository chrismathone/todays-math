"use client";

import { useState, type FormEvent } from "react";
import { asDifficulty, DIFFICULTY_LADDER } from "@/contracts/difficulty";

import { Button } from "@/components/ui/Button";
import type { UnitEntity } from "@/contracts/unit.contract";
import { generateProblems } from "@/lib/problem/problemApi";

import { FieldSelect } from "./FieldSelect";

type Props = {
  units: UnitEntity[];
  defaultUnitId: string;
  onCreated: (
    count: number,
    problems: Awaited<ReturnType<typeof generateProblems>>["data"],
  ) => void;
  onError: (message: string) => void;
};

export function ProblemGenerateForm({
  units,
  defaultUnitId,
  onCreated,
  onError,
}: Props) {
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const difficulty = asDifficulty(form.get("difficulty"));
    setPending(true);
    try {
      const body = await generateProblems({
        unitId: String(form.get("unitId") ?? ""),
        difficulty,
        count: 1,
      });
      onCreated(body.data.length, body.data);
    } catch {
      onError("생성에 실패했습니다");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      aria-label="생성"
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
      </div>
      <div className="mt-4">
        <Button type="submit" disabled={pending}>
          생성하기
        </Button>
      </div>
    </form>
  );
}
