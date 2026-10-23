"use client";

import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";

import WorkspacePageHeader from "./WorkspacePageHeader";
import { replaceScreenQuery, useScreenQuery } from "@/hooks/useScreenQuery";
import type { WorkspaceMenu } from "@/contracts/accountAccess.contract";
import dynamic from "next/dynamic";
import { signOut } from "next-auth/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { UnitNode } from "@/lib/units/groupUnits";
import type { TeachingClasses } from "@/contracts/teaching.contract";
import { canManageClassStudents, canManageRoster } from "@/lib/ownerScope";
import { canManageStudentAccounts } from "@/lib/learn/studentAccountPolicy";
import { TeachingAuthPanel } from "./teachingAuthPanel";
import WorkProgress from "./WorkProgress";
import s from "./TeachingView.module.css";

const ClassManage = dynamic(
  () =>
    import("@/components/class/ClassManage").then(
      (module) => module.ClassManage,
    ),
  {
    loading: () => <Loading message="반과 학생 정보를 불러오는 중…" />,
  },
);
const MainScreen = dynamic(
  () =>
    import("@/components/main/MainScreen").then((module) => module.MainScreen),
  {
    loading: () => <Loading message="수업 진행 화면을 불러오는 중…" />,
  },
);
const CommercialWorkbookWorkspace = dynamic(
  () => import("@/components/commercial-workbooks/CommercialWorkbookWorkspace"),
  { loading: () => <Loading message="교재 과제 화면을 불러오는 중…" /> },
);

type TeachingTab = "classes" | "lessons" | "workbooks";
type TeachingData = {
  user: {
    id: string;
    name: string;
    email: string;
    isAdmin: boolean;
    menus?: WorkspaceMenu[];
    branchId?: string | null;
    branchRole?: "owner" | "manager" | "teacher" | null;
  };
  units: UnitNode[];
  classes?: TeachingClasses;
};
type AccessState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "error"; message: string }
  | { status: "ready"; data: TeachingData };
const tabs = [
  { id: "classes", label: "반 · 학생 관리" },
  { id: "lessons", label: "수업 진행" },
  { id: "workbooks", label: "교재 과제 · 오답" },
] as const;

export default function TeachingView({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const query = useScreenQuery();
  const requestedTab = query.get("teachingTab");
  const tab: TeachingTab =
    requestedTab === "lessons" || requestedTab === "workbooks"
      ? requestedTab
      : "classes";
  const [workbooksOpened, setWorkbooksOpened] = useState(tab === "workbooks");
  const setTab = (next: TeachingTab) => {
    if (next === "workbooks") setWorkbooksOpened(true);
    replaceScreenQuery({ teachingTab: next });
  };
  const [access, setAccess] = useState<AccessState>({ status: "loading" });
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState("");
  const requestVersion = useRef(0);
  const requestController = useRef<AbortController | null>(null);

  const load = useCallback(async (quiet = false) => {
    const version = ++requestVersion.current;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    try {
      // This endpoint checks the server session before reading any curriculum data.
      // Child components cannot request classes/students until this succeeds.
      const endpoint = getStudioEndpoints().teaching;
      // Read the current tab at request time: login/retry can happen after tab navigation.
      const requested = new URLSearchParams(window.location.search).get(
        "teachingTab",
      );
      const includeClasses =
        !quiet && requested !== "lessons" && requested !== "workbooks";
      const response = await fetch(
        includeClasses ? `${endpoint}?classes=1` : endpoint,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (version !== requestVersion.current) return;
      if (response.status === 401) {
        setAccess({ status: "anonymous" });
        return;
      }
      if (!response.ok)
        throw new Error("수업 정보를 불러오지 못했습니다. 다시 시도해 주세요.");
      const body = (await response.json()) as { data: TeachingData };
      const { unitListResponseSchema } =
        await import("@/contracts/unit.contract");
      const units = unitListResponseSchema.parse({
        data: body.data?.units,
      }).data;
      if (!body.data.user?.id || typeof body.data.user.id !== "string")
        throw new Error("로그인 정보를 확인하지 못했습니다.");
      let classes: TeachingClasses | undefined;
      if (body.data.classes !== undefined) {
        const { teachingClassesSchema } =
          await import("@/contracts/teaching.contract");
        const parsed = teachingClassesSchema.safeParse(body.data.classes);
        classes = parsed.success ? parsed.data : { status: "error" };
      }
      if (version !== requestVersion.current) return;
      setAccess((previous) =>
        quiet &&
        previous.status === "ready" &&
        previous.data.user.id === body.data.user.id
          ? previous
          : { status: "ready", data: { user: body.data.user, units, classes } },
      );
    } catch {
      if (version === requestVersion.current)
        setAccess({
          status: "error",
          message:
            "수업 정보를 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.",
        });
    }
  }, []);

  useEffect(() => {
    // The loader updates state only after the asynchronous session request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const recheck = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    window.addEventListener("focus", recheck);
    return () => {
      requestVersion.current += 1;
      requestController.current?.abort();
      window.removeEventListener("focus", recheck);
    };
  }, [load]);

  async function reload() {
    setAccess({ status: "loading" });
    await load();
  }

  async function logout() {
    if (signingOut) return;
    setSigningOut(true);
    setAccountError("");
    try {
      await signOut({ redirect: false });
      await reload();
    } catch {
      setAccountError("로그아웃하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setSigningOut(false);
    }
  }

  function moveTab(event: KeyboardEvent<HTMLButtonElement>) {
    const index = tabs.findIndex((item) => item.id === tab);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? tabs.length - 1
          : event.key === "ArrowRight"
            ? (index + 1) % tabs.length
            : event.key === "ArrowLeft"
              ? (index + tabs.length - 1) % tabs.length
              : null;
    if (next === null) return;
    event.preventDefault();
    setTab(tabs[next].id);
    document.getElementById(`teaching-tab-${tabs[next].id}`)?.focus();
  }

  return (
    <div className={`${s.teaching} ${embedded ? s.embedded : ""}`}>
      {!embedded && (
        <WorkspacePageHeader
          title="수업 관리"
          description="반과 학생을 살피고, 오늘의 수업을 준비하세요."
        >
          {access.status === "ready" ? (
            <div className={s.account}>
              <span className={s.avatar} aria-hidden="true">
                {(access.data.user.name || "선생님").slice(0, 1)}
              </span>
              <span>
                <strong>{access.data.user.name || "선생님"}</strong>
                <small>내 수업 공간</small>
              </span>
              <button
                type="button"
                className={s.secondaryButton}
                disabled={signingOut}
                onClick={() => void logout()}
              >
                {signingOut ? (
                  <WorkProgress variant="inline" label="로그아웃 중…" />
                ) : (
                  "로그아웃"
                )}
              </button>
            </div>
          ) : null}
        </WorkspacePageHeader>
      )}
      {accountError ? (
        <p role="alert" className={s.fieldError}>
          {accountError}
        </p>
      ) : null}
      <div role="tablist" aria-label="수업 관리 메뉴" className={s.tabs}>
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`teaching-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`teaching-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            onKeyDown={moveTab}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {access.status === "ready" ? (
        <div key={access.data.user.id}>
          <section
            role="tabpanel"
            id="teaching-panel-classes"
            aria-labelledby="teaching-tab-classes"
            hidden={tab !== "classes"}
            tabIndex={0}
          >
            <div className={s.sectionHeading}>
              <div>
                <h2>우리 반 관리</h2>
                <p>
                  반을 선택하면 학생 명단과 수업 진도를 함께 확인할 수 있습니다.
                </p>
              </div>
            </div>
            <div className={s.classContent}>
              <ClassManage
                units={access.data.units}
                initialClasses={access.data.classes}
                canManageRoster={canManageRoster(access.data.user)}
                canManageStudents={canManageClassStudents(access.data.user)}
                canManageAccounts={canManageStudentAccounts(access.data.user)}
              />
            </div>
          </section>
          <section
            role="tabpanel"
            id="teaching-panel-lessons"
            aria-labelledby="teaching-tab-lessons"
            hidden={tab !== "lessons"}
            tabIndex={0}
          >
            <div className={s.sectionHeading}>
              <div>
                <h2>오늘의 수업</h2>
                <p>
                  반별 할 일과 확인테스트를 확인하고 수업 진도를 기록하세요.
                </p>
              </div>
            </div>
            {tab === "lessons" ? (
              <div className={s.lessonContent}>
                <MainScreen
                  embedded
                  allowedMenus={access.data.user.menus}
                  onEmpty={() => setTab("classes")}
                />
              </div>
            ) : null}
          </section>
          <section
            role="tabpanel"
            id="teaching-panel-workbooks"
            aria-labelledby="teaching-tab-workbooks"
            hidden={tab !== "workbooks"}
            tabIndex={0}
          >
            {(workbooksOpened || tab === "workbooks") && (
              <CommercialWorkbookWorkspace ownerId={access.data.user.id} />
            )}
          </section>
        </div>
      ) : (
        <section
          role="tabpanel"
          id={`teaching-panel-${tab}`}
          aria-labelledby={`teaching-tab-${tab}`}
          tabIndex={0}
        >
          {access.status === "loading" ? (
            <Loading message="로그인 정보를 확인하는 중…" />
          ) : access.status === "anonymous" ? (
            <TeachingAuthPanel onAuthenticated={reload} />
          ) : (
            <div className={s.errorPanel}>
              <h2>수업 정보를 확인할 수 없습니다</h2>
              <p role="alert">{access.message}</p>
              <button
                type="button"
                className={s.primaryButton}
                onClick={() => void reload()}
              >
                다시 불러오기
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Loading({ message }: { message: string }) {
  return <WorkProgress label={message} />;
}
