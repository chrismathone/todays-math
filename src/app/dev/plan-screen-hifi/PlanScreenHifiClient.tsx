"use client";

/**
 * `/dev/plan-screen-hifi` 의 몸 — 반 관리(수업 계획 · 이번 주 예정 · 반 만들기)와 메인 «오늘의 확인테스트»를
 * **제품 컴포넌트 그대로**, 작업실 틀(사이드바 폭 · `TeachingView` 의 `.classContent`/`.lessonContent`) 안에 띄운다.
 *
 * 반·학생·진도·계획·확인테스트 요청만 이 페이지 안에서 가로채 픽스처로 답한다(DB 를 안 읽는다 · 안 쓴다).
 * 가로채기는 **첫 렌더 안에서** 건다 — 자식 effect 가 부모 effect 보다 먼저 돌아 첫 요청이 새어 나간다
 * (`/dev/learn-hifi` 와 같은 까닭).
 */
import { useState } from "react";

import { ClassManage } from "@/components/class/ClassManage";
import { DailyReviewSection } from "@/components/main/DailyReviewSection";
import teaching from "@/components/unified/TeachingView.module.css";
import shell from "@/components/unified/Workspace.module.css";
import type { ProgressPlanEntity } from "@/contracts/dailyAutoTest.contract";
import type { ProgressPlanRule } from "@/lib/daily/progressPlan";
import type { ProgressRecordLike } from "@/lib/progressResolver";

import {
  HIFI_CLASSES,
  HIFI_STUDENTS,
  mainDaily,
  planEntity,
  planSeed,
  scheduleOf,
  type FixtureUnit,
  type MainHifiSet,
  type PlanHifiSet,
} from "./fixture";

export interface PlanScreenHifiOptions {
  screen: "classes" | "main";
  set: PlanHifiSet;
  mainSet: MainHifiSet;
}

declare global {
  interface Window {
    __planHifiFetch?: typeof fetch;
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const HIFI_DAY = "2026-09-16";

function installFixtureFetch(
  options: PlanScreenHifiOptions,
  units: readonly FixtureUnit[],
) {
  const original = window.__planHifiFetch ?? window.fetch.bind(window);
  window.__planHifiFetch = original;
  const seed = planSeed(options.set, units);
  const records: ProgressRecordLike[] = seed?.records ?? [];
  const plans = new Map<string, ProgressPlanEntity | null>([
    [HIFI_CLASSES[0]!.id, seed ? planEntity(seed, HIFI_CLASSES[0]!.id) : null],
  ]);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL
        ? String(input)
        : input.url,
      window.location.origin,
    );
    const method = init?.method ?? "GET";
    const path = url.pathname;
    const body = () => (init?.body ? JSON.parse(String(init.body)) : {});
    const meta = (total: number) => ({ page: 1, pageSize: 100, total });

    if (path === "/api/classes" && method === "GET")
      return json({ data: HIFI_CLASSES, meta: meta(HIFI_CLASSES.length) });
    if (path === "/api/classes" && method === "POST") {
      const b = body() as { name: string; grade: string };
      return json(
        {
          data: {
            ...HIFI_CLASSES[1]!,
            id: "5c000000-0000-4000-8000-000000000099",
            name: b.name,
            grade: b.grade,
          },
        },
        201,
      );
    }
    if (path === "/api/students" && method === "GET") {
      const classId = url.searchParams.get("classId");
      const rows = HIFI_STUDENTS.filter((s) => s.classId === classId);
      return json({ data: rows, meta: meta(rows.length) });
    }
    if (path === "/api/progress" && method === "GET") {
      const classId = url.searchParams.get("classId");
      const mine = records.filter((r) => r.classId === classId);
      const last = mine[mine.length - 1];
      if (!last)
        return json(
          {
            error: {
              code: "NOT_FOUND",
              message: "진도을(를) 찾을 수 없습니다.",
            },
          },
          404,
        );
      return json({
        data: {
          id: "5a000000-0000-4000-8000-000000000001",
          classId: last.classId,
          studentId: null,
          unitId: last.unitId,
          recordedAt: last.recordedAt,
          createdAt: last.createdAt,
        },
      });
    }

    const plan = /^\/api\/classes\/([^/]+)\/progress-plan(\/preview)?$/.exec(
      path,
    );
    if (plan) {
      const classId = decodeURIComponent(plan[1]!);
      const day = url.searchParams.get("day") ?? HIFI_DAY;
      const classRecords = records.filter((r) => r.classId === classId);
      if (plan[2] && method === "POST") {
        const rule = body() as ProgressPlanRule;
        return json({
          data: { schedule: scheduleOf(rule, classRecords, units, day) },
        });
      }
      if (method === "PUT") {
        const rule = body() as ProgressPlanRule;
        const saved: ProgressPlanEntity = {
          ...rule,
          weekdays: [...rule.weekdays],
          id: "5e000000-0000-4000-8000-000000000001",
          classId,
          studentId: null,
        };
        plans.set(classId, saved);
        return json({ data: saved });
      }
      const saved = plans.get(classId) ?? null;
      return json({
        data: {
          plan: saved,
          schedule: saved ? scheduleOf(saved, classRecords, units, day) : null,
          studentPlans: [],
        },
      });
    }

    if (path === "/api/tests/daily-review" && method === "GET")
      return json({ data: mainDaily(options.mainSet, units) });

    return original(input, init);
  };
}

export function PlanScreenHifiClient({
  options,
  units,
}: {
  options: PlanScreenHifiOptions;
  units: FixtureUnit[];
}) {
  useState(() => {
    if (typeof window !== "undefined") installFixtureFetch(options, units);
    return true;
  });

  return (
    <div className={shell.workspace} data-design="1">
      {/* 사이드바 자리 — 폭만 제품과 같게(내용 폭을 맞추려고). 메뉴는 그리지 않는다. */}
      <aside className={shell.sidebar} aria-hidden="true" />
      <div className={shell.main}>
        <div className={shell.teachingContent} data-plan-hifi={options.screen}>
          <div className={teaching.teaching}>
            {options.screen === "classes" ? (
              <div className={teaching.classContent}>
                <ClassManage units={units} />
              </div>
            ) : (
              <div className={teaching.lessonContent}>
                <DailyReviewSection units={units} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
