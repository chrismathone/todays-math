"use client";

import Link from "next/link";
import BackLink from "@/components/ui/BackLink";
import { contextParams, shellReturn } from "@/lib/adminReturn";
import { replaceScreenQuery, useScreenQuery } from "@/hooks/useScreenQuery";
import RouteLinkStatus from "@/components/ui/RouteLinkStatus";
import { useId, useState, type FormEvent } from "react";

import { ProgressPlanFields } from "@/components/class/ProgressPlanFields";
import { ProgressPlanSection } from "@/components/class/ProgressPlanSection";
import { StudentList } from "@/components/class/StudentList";
import { ClassTable } from "@/components/class/ClassTable";
import { BulkStudentAccountButton } from "@/components/class/BulkStudentAccountButton";
import { UnitTreePicker } from "@/components/progress/UnitTreePicker";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OwnerTag } from "@/components/ui/OwnerTag";
import { ClassManageSkeleton } from "@/components/ui/PageSkeletons";
import { useClassManage } from "@/hooks/useClassManage";
import { emptyPlanDraft, type PlanDraft } from "@/lib/class/planDraft";
import { kstDateOf } from "@/lib/kstDate";
import { findUnit, type UnitNode } from "@/lib/units/groupUnits";
import type { TeachingClasses } from "@/contracts/teaching.contract";

import planStyles from "./ProgressPlan.module.css";
import s from "./ClassManage.module.css";

type ClassManageProps = {
  units: UnitNode[];
  initialClasses?: TeachingClasses;
  /** 반 추가 — 지점 전체(원장·관리자). `ownerScope.canManageRoster` */
  canManageRoster?: boolean;
  /** 학생 등록 — 담당 강사도 가능. 로그인 계정 권한과 별도로 판정한다. */
  canManageStudents?: boolean;
  /** 학생 로그인 계정 — 지점 관리자 이상만 가능. */
  canManageAccounts?: boolean;
};

type MutationFeedback = {
  pending: boolean;
  error: string | null;
  success: string | null;
};

export function ClassManage({
  units,
  initialClasses,
  canManageRoster = false,
  canManageStudents = canManageRoster,
  canManageAccounts = false,
}: ClassManageProps) {
  const query = useScreenQuery();
  const context = contextParams(query);
  const manage = useClassManage(context.get("classId") ?? "", initialClasses);
  const current = findUnit(units, manage.currentUnitId);
  const selectedClass = manage.selectedClass;
  const progressDisabled =
    !selectedClass ||
    manage.progressStatus !== "ready" ||
    manage.progressMutation.pending ||
    units.length === 0;

  if (manage.status === "loading") {
    return <ClassManageSkeleton />;
  }

  if (manage.status === "error") {
    return (
      <main className="px-[26px] py-6">
        <p role="alert" className="mb-3 text-[12.5px] text-g-red-text">
          {manage.error}
        </p>
        <Button variant="secondary" onClick={manage.retryClasses}>
          반 목록 다시 불러오기
        </Button>
      </main>
    );
  }

  return (
    <main className={s.manage}>
      {context.has("from") ? (
        <BackLink href={shellReturn(context)}>이전 화면으로 돌아가기</BackLink>
      ) : null}
      {manage.error ? <p role="alert">{manage.error}</p> : null}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
        <section aria-label="반 관리" className={s.panel}>
          <ClassTable
            classes={manage.classes}
            selectedClassId={manage.selectedClassId}
            onSelect={(id) => {
              manage.selectClass(id);
              replaceScreenQuery({ classId: id, studentId: null });
            }}
          />
          {canManageRoster && (
            <AddClassForm
              onAdd={manage.addClass}
              feedback={manage.classMutation}
              units={units}
            />
          )}
        </section>
        <section aria-labelledby="class-students-heading" className={s.panel}>
          {selectedClass ? (
            <Link
              href={`/classes/${encodeURIComponent(selectedClass.id)}/math-srs?${contextParams({ classId: selectedClass.id, studentId: context.get("studentId") ?? undefined, from: typeof window !== "undefined" && window.location.pathname === "/" ? "teaching" : undefined, teachingTab: query.get("teachingTab") ?? "classes" })}`}
              className="mb-3 inline-flex min-h-11 items-center text-[12.5px] font-bold text-g-blue underline underline-offset-4"
            >
              {selectedClass.name} 개념 카드 복습(대수 6개 개념) →
              <RouteLinkStatus />
            </Link>
          ) : null}
          <p className="text-[12.5px] text-text-2">
            개념 카드 복습은 이 반의 대수 6개 개념 기록입니다.{" "}
            <Link href="/#srs">초3–초6 과정 SRS 열기 →</Link>
          </p>
          <StudentList
            students={manage.students}
            selectedClass={selectedClass}
            status={manage.studentsStatus}
            onRetry={manage.retryDetails}
            canManageAccounts={canManageAccounts}
            requestedStudentId={context.get("studentId") ?? ""}
          />
          {selectedClass && canManageAccounts ? (
            <div className="my-4">
              <BulkStudentAccountButton
                key={selectedClass.id}
                classId={selectedClass.id}
                className={selectedClass.name}
                onIssued={manage.retryDetails}
              />
            </div>
          ) : null}
          {selectedClass && canManageStudents ? (
            <AddStudentForm
              classId={selectedClass.id}
              onAdd={manage.addStudent}
              feedback={manage.studentMutation}
              disabled={manage.studentsStatus !== "ready"}
            />
          ) : null}
        </section>
      </div>

      {/* 수업 계획 · 이번 주 예정 — 시안 Hi-fi 2 «계기판 관»(D-131). 반을 바꾸면 칸이 새로 선다. */}
      {selectedClass ? (
        <ProgressPlanSection
          key={selectedClass.id}
          classId={selectedClass.id}
          units={units}
        />
      ) : null}

      <section
        className={`${s.panel} mt-8`}
        aria-labelledby="class-progress-heading"
      >
        <h2
          id="class-progress-heading"
          className="mb-2 border-t-[3px] border-ink pt-1.5 text-[10.5px] font-black tracking-[2.5px]"
        >
          진도
        </h2>
        {selectedClass ? (
          <p className="mb-3 break-words text-[12.5px] font-bold text-ink">
            {selectedClass.name} · {selectedClass.grade}
            {selectedClass.owner ? (
              <OwnerTag owner={selectedClass.owner} className="ml-2" />
            ) : null}
          </p>
        ) : null}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => void manage.advance()}
            disabled={progressDisabled || !manage.currentUnitId}
          >
            다음 소단원
          </Button>
          {!selectedClass ? (
            <p className="text-[12.5px] text-text-2">
              반을 추가하면 진도를 설정할 수 있습니다.
            </p>
          ) : manage.progressStatus === "loading" ? (
            <p role="status" className="text-[12.5px] text-text-2">
              진도를 불러오는 중…
            </p>
          ) : manage.progressStatus === "error" ? (
            <>
              <p role="alert" className="text-[12.5px] text-g-red-text">
                진도를 불러오지 못했습니다.
              </p>
              <Button variant="secondary" onClick={manage.retryDetails}>
                진도 다시 불러오기
              </Button>
            </>
          ) : manage.currentUnitId ? (
            <p className="text-[12.5px] text-text-2">
              현재{" "}
              <span className="font-black text-ink">
                {current?.section ?? "저장된 단원을 확인할 수 없습니다"}
              </span>
            </p>
          ) : (
            <p className="text-[12.5px] text-text-2">
              저장된 진도가 없습니다. 소단원을 선택해 시작해 주세요.
            </p>
          )}
          <Feedback
            feedback={manage.progressMutation}
            pendingText="진도를 저장하는 중…"
          />
        </div>
        {units.length === 0 ? (
          <p className="text-[12.5px] text-text-2">
            선택할 수 있는 단원이 없습니다.
          </p>
        ) : (
          <fieldset
            disabled={progressDisabled}
            aria-label="반 진도 설정"
            aria-busy={manage.progressMutation.pending}
            className="min-w-0"
          >
            <UnitTreePicker
              units={units}
              currentUnitId={manage.currentUnitId}
              onSelect={(unitId) => {
                void manage.selectUnit(unitId);
              }}
            />
          </fieldset>
        )}
      </section>
    </main>
  );
}

function Feedback({
  feedback,
  pendingText,
}: {
  feedback: MutationFeedback;
  pendingText: string;
}) {
  if (feedback.error)
    return (
      <p role="alert" className="text-[12.5px] text-g-red-text">
        {feedback.error}
      </p>
    );
  if (feedback.pending || feedback.success) {
    return (
      <p role="status" className="text-[12.5px] text-text-2">
        {feedback.pending ? pendingText : feedback.success}
      </p>
    );
  }
  return null;
}

function AddClassForm({
  onAdd,
  feedback,
  units,
}: {
  onAdd: (name: string, grade: string, plan?: PlanDraft) => Promise<boolean>;
  feedback: MutationFeedback;
  units: UnitNode[];
}) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  // 🔴 계획 칸은 **접어 둔다**(D-131 ⑷) — 「수업 계획 넣기」를 눌러 연다. 접힌 채면 계획 없이 만든다.
  const [planOpen, setPlanOpen] = useState(false);
  const [plan, setPlan] = useState<PlanDraft>(() =>
    emptyPlanDraft(kstDateOf(new Date())),
  );
  const planId = useId();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (feedback.pending || !name.trim() || !grade.trim()) return;
    if (await onAdd(name, grade, planOpen ? plan : undefined)) {
      setName("");
      setGrade("");
      setPlanOpen(false);
      setPlan(emptyPlanDraft(kstDateOf(new Date())));
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      aria-label="반 추가"
      aria-busy={feedback.pending}
      className="mt-3"
    >
      <div className={s.formRow}>
        <Input
          aria-label="반 이름"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="반 이름"
          className="min-w-0 flex-1"
          required
          maxLength={100}
          disabled={feedback.pending}
        />
        <Input
          aria-label="학년"
          value={grade}
          onChange={(event) => setGrade(event.target.value)}
          placeholder="학년"
          className="max-w-24"
          required
          maxLength={10}
          disabled={feedback.pending}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={feedback.pending || !name.trim() || !grade.trim()}
        >
          {feedback.pending ? "추가 중…" : "반 추가"}
        </Button>
      </div>
      <button
        type="button"
        className={planStyles.more}
        aria-expanded={planOpen}
        aria-controls={planId}
        onClick={() => setPlanOpen((open) => !open)}
      >
        {/* 열면 «접기»(D-133 ⑿) — 누르면 무엇이 되는지를 적는다 */}
        {planOpen ? "수업 계획 접기" : "수업 계획 넣기"}
      </button>
      {planOpen ? (
        <div id={planId} className={planStyles.createPlan}>
          <ProgressPlanFields
            draft={plan}
            onChange={setPlan}
            units={units}
            disabled={feedback.pending}
          />
        </div>
      ) : null}
      <div className="mt-2">
        <Feedback feedback={feedback} pendingText="반을 추가하는 중…" />
      </div>
    </form>
  );
}

function AddStudentForm({
  classId,
  onAdd,
  feedback,
  disabled,
}: {
  classId: string;
  onAdd: (name: string) => Promise<boolean>;
  feedback: MutationFeedback;
  disabled: boolean;
}) {
  // Keep drafts with their class, including when an earlier request finishes late.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const name = drafts[classId] ?? "";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (disabled || feedback.pending || !name.trim()) return;
    if (await onAdd(name)) setDrafts((prev) => ({ ...prev, [classId]: "" }));
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      aria-label="학생 등록"
      aria-busy={feedback.pending}
      className="mt-3"
    >
      <div className={s.formRow}>
        <Input
          aria-label="학생 이름"
          value={name}
          onChange={(event) =>
            setDrafts((prev) => ({ ...prev, [classId]: event.target.value }))
          }
          placeholder="이름"
          className="min-w-0 flex-1"
          required
          maxLength={50}
          disabled={disabled || feedback.pending}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={disabled || feedback.pending || !name.trim()}
        >
          {feedback.pending ? "등록 중…" : "등록"}
        </Button>
      </div>
      <div className="mt-2">
        <Feedback feedback={feedback} pendingText="학생을 등록하는 중…" />
      </div>
    </form>
  );
}
