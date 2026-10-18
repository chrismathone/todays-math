"use client";

import Link from "next/link";
import { useMemo } from "react";

import FormatQuotaFields from "@/components/exam-builder/FormatQuotaFields";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import { onlySupportedGrades } from "@/contracts/supportedGrades";

import { UnitRangePicker } from "@/components/progress/UnitRangePicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TestSetupFieldsSkeleton } from "@/components/ui/PageSkeletons";
import type { UnitEntity } from "@/contracts/unit.contract";
import { classOptionLabel, classOptionTitle } from "@/lib/class/ownerLabel";

import { AiDraftReview } from "./AiDraftReview";
import { AiGenerateProgress } from "./AiGenerateProgress";
import { FIELD_CLASS } from "./labels";
import { describeRange } from "./rangeSummary";
import { useGenerateSetup } from "./useGenerateSetup";

const LABEL_CLASS =
  "grid gap-1 text-[14px] font-semibold text-[var(--learn-muted,#596c86)]";

/**
 * 확인테스트 범위 — **평소에는 한 줄, 고칠 때만 펼친다**(D-07 확정 2026-08-19:
 * Wire C안 → Hi-fi ④ 범위 막대 → 펼침은 Ⓐ 3열 피커 **한 벌**).
 *
 * 예전에는 소단원 select 두 개가 **735개**를 늘어놓고 기본값이 「초1 첫 소단원 ~
 * 미적분2 마지막」이었다. 원장이 손대지 않으면 전 교육과정이 범위가 되는데
 * **오류도 경고도 안 났다** — 후보가 4만 건이라 정원이 채워지기 때문이다.
 * 이제 기본값은 진도가 정하고(`/api/tests/default-range`), 화면은 그것을 읽어 준다.
 *
 * ⚠️ 펼침은 **피커 한 벌**이다(Ⓐ, 2026-08-19 원장님 확정). 시작·끝을 각각 피커로
 *    두었더니 학년 열이 16행(초1~미적분2)이라 피커 하나가 750px 이 넘고, 두 벌이면
 *    폼이 통째로 화면 밖으로 밀렸다 — 원장님이 실제 화면에서 잡아 주신 것이다.
 *    한 벌에서 **두 번 눌러** 범위를 잡고(달력의 기간 선택), 열마다 높이 상한을 준다.
 */
function RangeField({
  units,
  startUnitId,
  endUnitId,
  editing,
  loading,
  unknown,
  error,
  onToggleEdit,
  onChangeRange,
}: {
  units: UnitEntity[];
  startUnitId: string;
  endUnitId: string;
  editing: boolean;
  loading: boolean;
  unknown: boolean;
  error: boolean;
  onToggleEdit: () => void;
  onChangeRange: (startUnitId: string, endUnitId: string) => void;
}) {
  const summary = loading ? null : describeRange(units, startUnitId, endUnitId);
  /**
   * 🔴 **고르는 목록만 좁힌다** (원장님 확정 2026-09-07 「초3~중3만으로」).
   * 위의 `describeRange` 는 **좁히지 않은** `units` 를 쓴다 — 지원 밖 학년에 찍힌 옛
   * 범위도 이름을 되찾아야 한다. 좁히면 그 시험지의 범위가 조용히 「—」가 된다.
   */
  const pickableUnits = useMemo(() => onlySupportedGrades(units), [units]);
  /**
   * **아직 안 온 것 · 없는 것 · 못 불러온 것을 갈라 말한다.** 예전에는 셋이 같은
   * 문장으로 나가서, 느린 회선이나 500 을 원장이 「진도가 없다」로 읽었다.
   */
  const headline = loading
    ? "범위를 불러오는 중"
    : summary
      ? summary.text
      : error
        ? "범위를 불러오지 못했습니다"
        : "진도 기록이 없어 범위를 정하지 못했습니다";

  return (
    <div className={LABEL_CLASS}>
      범위
      <div className="flex items-baseline gap-3">
        <span className="text-[14px] font-black text-ink">{headline}</span>
        <button
          type="button"
          onClick={onToggleEdit}
          className="ml-auto cursor-pointer text-[14px] font-bold text-g-blue underline-offset-4 hover:underline"
        >
          {editing ? "접기" : "고치기"}
        </button>
      </div>
      {summary ? (
        <>
          {/* 막대는 라벨이 말하는 것을 그림으로 되풀이할 뿐이라 보조기기에서는 숨긴다. */}
          <div aria-hidden className="mt-1 h-[6px] w-full bg-seg-empty">
            <div
              className="h-full bg-g-blue"
              style={{
                marginLeft: `${summary.offsetPct}%`,
                width: `${summary.widthPct}%`,
              }}
            />
          </div>
          <span className="text-[12px] font-bold tracking-normal text-text-3">
            {summary.label}
          </span>
        </>
      ) : null}
      {(unknown || error) && !editing ? (
        <span className="text-[12px] font-bold tracking-normal text-text-3">
          {unknown
            ? "진도를 기록하거나 「고치기」로 직접 고르세요"
            : "「고치기」로 직접 고르세요"}
        </span>
      ) : null}
      {editing ? (
        <div className="mt-2">
          <UnitRangePicker
            units={pickableUnits}
            startUnitId={startUnitId || null}
            endUnitId={endUnitId || null}
            onChange={onChangeRange}
          />
        </div>
      ) : null}
    </div>
  );
}

type Props = {
  initialClassId?: string;
  initialStudentId?: string;
};

export function GenerateSetup({ initialClassId, initialStudentId }: Props) {
  const form = useGenerateSetup({ initialClassId, initialStudentId });
  /** 단원 → 학년 — AI 초안 카드가 초등 가분수를 대분수로 보인다(화면·인쇄 한 함수). */
  const gradeOf = useMemo(() => {
    const grades = new Map(form.units.map((unit) => [unit.id, unit.grade]));
    return (unitId: string) => grades.get(unitId);
  }, [form.units]);
  /**
   * 배분 합계 — 갈래를 **손으로 더하지 않는다**(D-106). 사다리를 돌아 더하므로
   * 갈래가 늘어도 이 값이 저절로 따라온다.
   */
  const ratioSum = DIFFICULTY_LADDER.reduce(
    (sum, tier) => sum + (form.difficultyRatio[tier] ?? 0),
    0,
  );

  return (
    <main className="px-4 py-6 sm:px-8">
      <h1 className="text-[24px] font-bold text-[var(--learn-ink,#172b4d)]">
        출제 설정
      </h1>
      {form.loadError ? (
        <div className="mt-4 rounded-xl border border-[var(--learn-track,#dde3ec)] bg-[var(--learn-surface,#fff)] p-5">
          <p role="alert" className="text-[14px] text-g-red-text">
            {form.loadError}
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={form.retryLoad}
          >
            다시 불러오기
          </Button>
        </div>
      ) : null}
      {!form.ready && !form.loadError ? <TestSetupFieldsSkeleton /> : null}
      {form.ready && form.classes.length === 0 ? (
        <div className="mt-4 rounded-xl border border-[var(--learn-track,#dde3ec)] bg-[var(--learn-surface,#fff)] p-5 text-[14px] text-[var(--learn-muted,#596c86)]">
          <p>출제할 반이 없습니다. 반을 만든 뒤 시험지를 출제할 수 있습니다.</p>
          <Link
            href="/classes"
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--learn-accent,#3159df)] underline"
          >
            반 만들기
          </Link>
        </div>
      ) : null}
      {form.ready && form.classes.length > 0 ? (
        <form
          className="mt-6 grid max-w-none gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.generate();
          }}
        >
          <label className={LABEL_CLASS}>
            반
            {/* 담당(관리자, D-132) — «반 이름 · 담당 6자», 전체는 `title`(닫힌 상자는 지금 고른 반) */}
            <select
              className={FIELD_CLASS}
              value={form.classId}
              disabled={form.busy}
              onChange={(event) => form.selectClass(event.target.value)}
              title={classOptionTitle(
                form.classes.find((item) => item.id === form.classId),
              )}
            >
              <option value="" disabled>
                반을 선택해 주세요
              </option>
              {form.classes.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                  title={classOptionTitle(item)}
                >
                  {classOptionLabel(item)}
                </option>
              ))}
            </select>
          </label>

          <label className={LABEL_CLASS}>
            학생
            <select
              className={FIELD_CLASS}
              value={form.studentId}
              disabled={form.busy || form.studentsLoading || form.studentsError}
              onChange={(event) => form.setStudentId(event.target.value)}
            >
              <option value="">반 전체</option>
              {form.students.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          {form.studentsLoading ? (
            <p role="status">학생 명단을 불러오는 중…</p>
          ) : null}
          {form.studentsError ? (
            <div role="alert" className="flex flex-wrap items-center gap-3">
              <span>현재 반의 학생 명단을 불러오지 못했습니다.</span>
              <Button
                type="button"
                variant="secondary"
                onClick={form.retryStudents}
              >
                명단 다시 불러오기
              </Button>
            </div>
          ) : !form.studentsLoading && form.students.length === 0 ? (
            <p className="text-sm text-text-2">
              등록된 학생이 없습니다. 반 전체로 출제할 수 있습니다.
            </p>
          ) : null}
          {form.selectionWarning ? (
            <div role="alert" className="flex flex-wrap items-center gap-3">
              <span>{form.selectionWarning}</span>
              {form.classId ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={form.confirmClassScope}
                >
                  반 전체로 진행
                </Button>
              ) : null}
            </div>
          ) : null}

          <fieldset className="grid gap-2">
            <legend className="text-[14px] font-semibold text-[var(--learn-muted,#596c86)]">
              유형
            </legend>
            <div className="flex gap-4 text-[14px] font-bold">
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="testType"
                  value="daily"
                  checked={form.testType === "daily"}
                  onChange={() => form.setTestType("daily")}
                />
                일일테스트
              </label>
              <label className="inline-flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="testType"
                  value="review"
                  checked={form.testType === "review"}
                  onChange={() => form.setTestType("review")}
                />
                확인테스트
              </label>
            </div>
          </fieldset>

          <label className={LABEL_CLASS}>
            시행일
            <Input
              type="date"
              value={form.testDate}
              onChange={(event) => form.setTestDate(event.target.value)}
            />
          </label>

          <label className={LABEL_CLASS}>
            문항 수
            <Input
              type="number"
              min={1}
              max={30}
              value={form.problemCount}
              onChange={(event) =>
                form.setProblemCount(Number(event.target.value))
              }
            />
          </label>

          {/*
            난이도 배분 — 갈래를 **손으로 적지 않는다**(D-106). 사다리를 돌면
            갈래가 늘거나 이름이 바뀔 때 이 칸이 저절로 따라온다. 예전에는 하·중·상을
            세 번 적어 두어서 화면과 계약이 갈릴 자리가 셋이었다.
          */}
          {/*
            🔴 **한 줄에 다 놓는다** (UI-04, 원장님 결정 2026-09-08).
            종전에는 `grid-cols-4` 라 6갈래가 **4+2** 로 갈렸다 — 심화하가 첫 줄 끝,
            심화중·심화상이 다음 줄이라 「어디에 얼마를 줬나」를 두 줄에서 찾아야 했다.
            갈래 수(`DIFFICULTY_LADDER.length`)로 열을 잡아 사다리가 늘어도 따라온다.
            좁은 창에서는 3+3 으로 접힌다 — 한 줄을 억지로 지키면 칸이 못 읽게 좁아진다.

            ⚠️ **폼 폭은 안 건드린다.** §8.6 S-04 「전폭 폼」은 확정이고, 짧은 필드의
               배치까지 못 박은 것이 아니다. 그래서 배치만 고친다.
          */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {DIFFICULTY_LADDER.map((tier) => (
              <label
                key={tier}
                className="grid gap-1 text-[12px] font-extrabold tracking-[1.2px] text-text-2"
              >
                {tier}
                <Input
                  type="number"
                  min={0}
                  value={form.difficultyRatio[tier]}
                  onChange={(event) =>
                    form.setDifficultyRatio({
                      ...form.difficultyRatio,
                      [tier]: Number(event.target.value),
                    })
                  }
                />
              </label>
            ))}
          </div>

          {/*
            배분 합계 — **입력 중에도** 총 문항 수와 견줄 수 있게 한다(UI-04).
            종전에는 제출해야만 알았다. 문구는 상태만 적고 지시하지 않는다(D-08).
          */}
          <p
            className={`text-[14px] ${
              ratioSum === form.problemCount ? "text-text-2" : "text-g-red-text"
            }`}
          >
            배분 합계 {ratioSum} / 총 {form.problemCount}문항
            {ratioSum === form.problemCount ? "" : " — 맞지 않습니다"}
          </p>

          <FormatQuotaFields
            value={form.formats}
            onChange={form.setFormats}
            count={form.problemCount}
            disabled={form.busy}
            max={30}
          />

          {form.testType === "review" ? (
            <RangeField
              units={form.units}
              startUnitId={form.rangeStartUnitId}
              endUnitId={form.rangeEndUnitId}
              editing={form.rangeEditing}
              loading={form.rangeLoading}
              unknown={form.rangeUnknown}
              error={form.rangeError}
              onToggleEdit={() => form.setRangeEditing(!form.rangeEditing)}
              onChangeRange={form.setRange}
            />
          ) : null}

          {form.insufficient ? (
            <div
              role="alert"
              className="border border-g-red bg-white px-4 py-3 text-[14px]"
            >
              <p>{form.insufficient.message}</p>
              <p className="mt-1 font-bold text-g-red-text">
                가용 {form.insufficient.available} / 필요{" "}
                {form.insufficient.required}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={form.busy}
                  onClick={() => void form.generateAiDrafts()}
                >
                  AI 생성
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={form.busy || form.insufficient.available < 1}
                  onClick={form.reduceCount}
                >
                  문항 수 줄이기
                </Button>
              </div>
              {/*
                진행 표시는 **AI 생성이 돌 때만** 뜬다. `form.busy` 로 그리면 「출제」를
                눌러도 «AI 문제 생성 중» 이 뜬다 — 시험의 «음성 대조»가 그 자리를 지킨다.
              */}
              {form.aiBusy ? <AiGenerateProgress /> : null}
              {/*
                🔴 예전에는 여기가 「N문항을 생성했습니다. 문제은행에서 승격한 뒤
                   **다시 출제하세요**」였다. 그 한 줄이 곧 원장님이 지적한 동선이다 —
                   화면을 떠나 은행에서 대기 필터를 걸고 방금 만든 것을 찾아 승인한 뒤,
                   돌아와서 설정을 처음부터 다시. 이제 검수가 아래에 있다(D-22 는 그대로).
                   은행 링크는 남긴다 — 나중에 마저 보고 싶을 수 있고, 행은 거기에도 있다.
              */}
              {form.aiDrafts.length > 0 ? (
                <p className="mt-3">
                  {form.aiDrafts.length}문항을 생성했습니다. 아래에서
                  검수하세요.{" "}
                  <Link href="/problems" className="font-bold underline">
                    문제은행
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}

          <AiDraftReview
            drafts={form.aiDrafts}
            gradeOf={gradeOf}
            onReviewStatusChange={form.reviewAiDraft}
          />

          {form.submitError ? (
            // role 이 없으면 화면을 못 보는 사용자에겐 실패가 일어나지 않은 것과 같다.
            <p className="text-[14px] text-g-red-text" role="alert">
              {form.submitError}
            </p>
          ) : null}

          {/* 확인테스트인데 범위를 못 정했으면 누를 수 없다 — 범위 없이 출제하면
              서버가 400 을 낼 뿐이고, 원장은 무엇을 고쳐야 하는지 모른다. */}
          <Button
            type="submit"
            variant="primary"
            disabled={
              form.busy ||
              Boolean(form.formatWarning) ||
              !form.classId ||
              form.studentsLoading ||
              form.studentsError ||
              Boolean(form.selectionWarning) ||
              (form.testType === "review" &&
                (form.rangeLoading ||
                  !form.rangeStartUnitId ||
                  !form.rangeEndUnitId))
            }
          >
            출제
          </Button>
        </form>
      ) : null}
    </main>
  );
}
