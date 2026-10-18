"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MathText, SolutionText } from "@/components/math/MathText";
import UnifiedProblem from "./UnifiedProblem";
import { fractionViewFor } from "./fractionDisplay";
import { addToCart } from "./studioCart";
import { questionIdentity } from "@/lib/problem/questionSelectionClient";
import type { BankData, StudioProblem } from "./types";
import s from "./Workspace.module.css";
import {
  ConceptHome,
  DesignGallery,
  DesignSwitcher,
  type DesignId,
} from "./DesignConcepts";

const BankView = dynamic(() => import("./BankView"), {
  loading: () => <p className={s.loading}>문제은행을 여는 중입니다…</p>,
});
const StudioView = dynamic(() => import("./StudioView"), {
  ssr: false,
  loading: () => <p className={s.loading}>자료 작업실을 여는 중입니다…</p>,
});
const TeachingView = dynamic(() => import("./TeachingView"), {
  ssr: false,
  loading: () => (
    <p className={s.loading}>수업 관리 화면을 불러오는 중입니다…</p>
  ),
});
type View = "home" | "bank" | "studio" | "export" | "teaching";
type IconName =
  | "home"
  | "bank"
  | "crop"
  | "paper"
  | "arrow"
  | "plus"
  | "save"
  | "print"
  | "class"
  | "check"
  | "close";
const labels: Record<View, string> = {
  home: "오늘의 작업",
  bank: "문제은행",
  studio: "자료 제작",
  export: "시험지 · 내보내기",
  teaching: "수업 · 학생 관리",
};
const STORAGE_KEY = "today-math-unified-draft-v1";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7v10H3Z" />
        <path d="M9 20v-7h6v7" />
      </>
    ),
    bank: (
      <>
        <rect x="3" y="4" width="5" height="16" rx="1" />
        <rect x="10" y="4" width="5" height="16" rx="1" />
        <path d="m18 4 3 15M4 8h3m4 0h3" />
      </>
    ),
    crop: (
      <>
        <path d="M7 3v14h14M3 7h14v14M11 3v4m10 4h-4" />
        <path d="m11 13 10-10" />
      </>
    ),
    paper: (
      <>
        <path d="M5 3h10l4 4v14H5Z" />
        <path d="M14 3v5h5M9 12h6m-6 4h6" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    plus: <path d="M12 4v16M4 12h16" />,
    save: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </>
    ),
    print: (
      <>
        <path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7Z" />
        <path d="M17 11h1" />
      </>
    ),
    class: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21v-4a6 6 0 0 1 12 0v4M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export default function LegacyUnifiedWorkspace({
  initialData,
  initialDesign = 1,
  initialCompare = false,
}: {
  initialData: BankData;
  initialDesign?: DesignId;
  initialCompare?: boolean;
}) {
  const [design, setDesign] = useState<DesignId>(initialDesign);
  const [comparing, setComparing] = useState(initialCompare);
  const [view, setView] = useState<View>("home");
  const [studioOpened, setStudioOpened] = useState(false);
  const [bankOpened, setBankOpened] = useState(false);
  const [teachingOpened, setTeachingOpened] = useState(false);
  const [homeSearch, setHomeSearch] = useState("");
  const [bankEntry, setBankEntry] = useState<{
    q?: string;
    grade?: string;
    version: number;
  }>({ version: 0 });
  const [selected, setSelected] = useState<StudioProblem[]>([]);
  const [title, setTitle] = useState("오늘 수학 학습지");
  const [columns, setColumns] = useState(2);
  const [answers, setAnswers] = useState(false);
  const [notice, setNotice] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const navigate = (next: View) => {
    setView(next);
    if (next === "studio") setStudioOpened(true);
    if (next === "bank") setBankOpened(true);
    if (next === "teaching") setTeachingOpened(true);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const openBank = (filters: { q?: string; grade?: string } = {}) => {
    setBankEntry((current) => ({ ...filters, version: current.version + 1 }));
    navigate("bank");
  };
  const chooseDesign = (next: DesignId) => {
    setDesign(next);
    setComparing(false);
    navigate("home");
    const url = new URL(window.location.href);
    url.searchParams.set("design", String(next));
    window.history.replaceState(null, "", url);
  };
  const compareDesigns = () => {
    setComparing(true);
    const url = new URL(window.location.href);
    url.searchParams.set("design", "compare");
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const toggle = (problem: StudioProblem) =>
    setSelected((current) =>
      current.some((p) => questionIdentity(p) === questionIdentity(problem))
        ? current.filter(
            (p) => questionIdentity(p) !== questionIdentity(problem),
          )
        : [...current, problem],
    );
  const add = (problems: StudioProblem[]) =>
    setSelected((current) => addToCart(current, problems));
  const count = initialData.grades.reduce((sum, item) => sum + item.count, 0);
  const date = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  }).format(new Date());

  function save() {
    try {
      const now = new Date().toISOString();
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: 1,
          title,
          problems: selected,
          updatedAt: now,
        }),
      );
      setSavedAt(now);
      setNotice("이 브라우저에 작업을 저장했습니다.");
    } catch {
      setNotice(
        "브라우저 저장 공간이 부족합니다. 작업 파일로 내려받아 보관해 주세요.",
      );
    }
  }
  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setNotice("이 브라우저에 저장한 작업이 아직 없습니다.");
        return;
      }
      const data = JSON.parse(raw);
      if (
        data.version !== 1 ||
        typeof data.title !== "string" ||
        !Array.isArray(data.problems) ||
        !data.problems.every(
          (p: StudioProblem) =>
            typeof p.id === "string" && typeof p.content === "string",
        )
      )
        throw new Error();
      setSelected(data.problems);
      setTitle(data.title);
      setSavedAt(data.updatedAt);
      setView("export");
      setNotice("저장한 작업을 불러왔습니다.");
    } catch {
      setNotice("저장한 작업을 읽지 못했습니다.");
    }
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify({ version: 1, title, problems: selected }, null, 2)],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[<>:"/\\|?*]/g, "_") || "학습지"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("문제 원문과 편집 내용을 작업 파일로 내보냈습니다.");
  }
  const move = (index: number, direction: number) =>
    setSelected((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });

  return (
    <>
      <DesignSwitcher
        design={design}
        comparing={comparing}
        onSelect={chooseDesign}
        onCompare={compareDesigns}
      />
      {comparing && <DesignGallery onSelect={chooseDesign} />}
      <div
        className={s.workspace}
        data-design={design}
        data-view={view}
        hidden={comparing}
      >
        <aside className={s.sidebar}>
          <button
            className={s.brand}
            onClick={() => navigate("home")}
            aria-label="오늘 수학 홈"
          >
            <span className={s.brandSymbol}>∑</span>
            <span>
              오늘 수학<small>수학 수업의 모든 작업</small>
            </span>
          </button>
          <button className={s.newButton} onClick={() => navigate("bank")}>
            <Icon name="plus" /> 문제 담기
          </button>
          <nav className={s.nav} aria-label="작업실 메뉴">
            {(["home", "teaching", "bank", "studio", "export"] as View[]).map(
              (item) => (
                <button
                  key={item}
                  className={view === item ? s.navActive : ""}
                  onClick={() => navigate(item)}
                  aria-current={view === item ? "page" : undefined}
                  aria-label={labels[item]}
                >
                  <Icon
                    name={
                      item === "studio"
                        ? "crop"
                        : item === "export"
                          ? "paper"
                          : item === "teaching"
                            ? "class"
                            : item
                    }
                  />
                  <span className={s.navLabel}>{labels[item]}</span>
                  <span className={s.mobileNavLabel}>
                    {
                      {
                        home: "홈",
                        teaching: "수업·학생",
                        bank: "문제은행",
                        studio: "자료 제작",
                        export: "시험지",
                      }[item]
                    }
                  </span>
                  {item === "export" && selected.length > 0 && (
                    <span className={s.navCount}>{selected.length}</span>
                  )}
                </button>
              ),
            )}
          </nav>
          <div className={s.sideBasket}>
            <div>
              <Icon name="paper" />
              <strong>내 시험지</strong>
              <span>{selected.length}</span>
            </div>
            <p>
              {selected.length
                ? "담은 문제를 확인하고 출력하세요."
                : "고른 문제와 잘라낸 자료를 한 시험지에 담아보세요."}
            </p>
            <button onClick={() => navigate("export")}>
              {selected.length ? "시험지 이어서 만들기" : "시험지 구성하기"}
              <Icon name="arrow" size={18} />
            </button>
          </div>
          <div className={s.sideBottom}>
            <span className={s.liveDot} /> 통합 작업실{" "}
            <span className={s.devPill}>DEV</span>
            <p>문제은행 · 자료 제작 · 수업 관리</p>
          </div>
        </aside>
        <div className={s.main}>
          <header className={s.topbar}>
            <div className={s.breadcrumb}>
              오늘 수학 <span>/</span>
              <strong>{labels[view]}</strong>
            </div>
            <div className={s.topRight}>
              <span className={s.date}>{date}</span>
              <button
                className={s.headerBasket}
                onClick={() => navigate("export")}
              >
                <Icon name="paper" size={18} />
                담은 문제 <strong>{selected.length}</strong>
              </button>
            </div>
          </header>
          {notice && (
            <div className={s.notice} role="status">
              <Icon name="check" />
              {notice}
              <button aria-label="알림 닫기" onClick={() => setNotice("")}>
                <Icon name="close" />
              </button>
            </div>
          )}
          {view === "home" && design !== 1 && (
            <ConceptHome
              design={design}
              data={initialData}
              selected={selected}
              title={title}
              columns={columns}
              onTitle={setTitle}
              onColumns={setColumns}
              onToggle={toggle}
              onNavigate={navigate}
              onBank={openBank}
              onRestore={restore}
            />
          )}
          {view === "home" && design === 1 && (
            <main className={s.home}>
              <div className={s.welcome}>
                <div>
                  <p className={s.eyebrow}>나의 수학 작업실</p>
                  <h1>오늘 수업을 준비해 볼까요?</h1>
                  <p className={s.intro}>
                    문제 찾기부터 자료 제작, 학생 관리까지 한곳에서 이어집니다.
                  </p>
                </div>
                <button className={s.secondaryButton} onClick={restore}>
                  <Icon name="save" size={18} />
                  저장한 작업 불러오기
                </button>
              </div>

              <div className={s.startGrid}>
                <section
                  className={s.searchPanel}
                  aria-labelledby="home-bank-heading"
                >
                  <div className={s.panelHeading}>
                    <span className={s.featureIcon}>
                      <Icon name="bank" size={25} />
                    </span>
                    <div>
                      <h2 id="home-bank-heading">문제은행에서 골라 담기</h2>
                      <p>
                        {initialData.error ? (
                          "연결 상태를 확인해 주세요"
                        ) : (
                          <>
                            <strong>{count.toLocaleString()}</strong>개의 출제
                            가능한 문제
                          </>
                        )}
                      </p>
                    </div>
                    <span className={s.readyBadge}>
                      <span className={s.liveDot} />
                      문제은행
                    </span>
                  </div>
                  <form
                    className={s.homeSearch}
                    onSubmit={(event) => {
                      event.preventDefault();
                      openBank({ q: homeSearch.trim() });
                    }}
                  >
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="10.5" cy="10.5" r="7.5" />
                      <path d="m16 16 5 5" />
                    </svg>
                    <input
                      aria-label="문제은행 바로 검색"
                      placeholder="문제 내용, 단원 또는 문제 번호 검색"
                      value={homeSearch}
                      onChange={(event) => setHomeSearch(event.target.value)}
                    />
                    <button type="submit">
                      검색
                      <Icon name="arrow" size={18} />
                    </button>
                  </form>
                  <div className={s.gradeHeading}>
                    <strong>학년으로 바로 찾기</strong>
                    <button className={s.textButton} onClick={() => openBank()}>
                      전체 문제 보기
                      <Icon name="arrow" size={17} />
                    </button>
                  </div>
                  <div className={s.gradeGrid}>
                    {[...initialData.grades]
                      .sort((a, b) => {
                        const rank = (grade: string) =>
                          (grade.startsWith("초")
                            ? 0
                            : grade.startsWith("중")
                              ? 10
                              : 20) + Number(grade.replace(/\D/g, ""));
                        return rank(a.grade) - rank(b.grade);
                      })
                      .map(({ grade, count: gradeCount }) => (
                        <button key={grade} onClick={() => openBank({ grade })}>
                          <strong>{grade}</strong>
                          <span>{gradeCount.toLocaleString()}문항</span>
                        </button>
                      ))}
                  </div>
                  {initialData.error && (
                    <p className={s.subtle} role="status">
                      {initialData.error}
                    </p>
                  )}
                </section>
                <section className={s.sourcePanel}>
                  <span className={s.sourceTag}>가지고 있는 자료가 있다면</span>
                  <div className={s.sourceHeading}>
                    <span className={s.sourceIcon}>
                      <Icon name="crop" size={30} />
                    </span>
                    <h2>
                      내 자료를
                      <br />새 시험지로.
                    </h2>
                  </div>
                  <p>
                    PDF와 이미지에서 필요한 문제를 자르고,
                    <br />
                    내용과 해설을 직접 다듬으세요.
                  </p>
                  <div className={s.sourceSteps}>
                    <span>문제 자르기</span>
                    <span>내용 편집</span>
                    <span>내보내기</span>
                  </div>
                  <button onClick={() => navigate("studio")}>
                    PDF · 이미지 가져오기
                    <Icon name="arrow" />
                  </button>
                </section>
              </div>

              <div className={s.homeLower}>
                <section
                  className={s.currentWork}
                  aria-labelledby="current-work-heading"
                >
                  <div className={s.sectionTitle}>
                    <div>
                      <h2 id="current-work-heading">
                        만들고 있는 시험지 <span>{selected.length}문항</span>
                      </h2>
                      <p>문제은행과 내 자료에서 담은 문제를 함께 구성합니다.</p>
                    </div>
                    {selected.length > 0 && (
                      <button
                        className={s.textButton}
                        onClick={() => navigate("export")}
                      >
                        전체 보기
                        <Icon name="arrow" size={18} />
                      </button>
                    )}
                  </div>
                  {selected.length ? (
                    <>
                      <div className={s.draftTitle}>
                        <Icon name="paper" />
                        <strong>{title}</strong>
                        <span>작성 중</span>
                      </div>
                      <ol className={s.draftRows}>
                        {selected.slice(0, 3).map((problem, i) => (
                          <li key={problem.id}>
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            <div>
                              <strong>
                                {problem.section ||
                                  problem.sourceLabel ||
                                  "가져온 문제"}
                              </strong>
                              <small>
                                {problem.grade} ·{" "}
                                {problem.difficulty || "내 자료"}
                              </small>
                            </div>
                            <button
                              aria-label={`${i + 1}번 담은 문제 빼기`}
                              onClick={() => toggle(problem)}
                            >
                              <Icon name="close" size={18} />
                            </button>
                          </li>
                        ))}
                      </ol>
                      <div className={s.draftFooter}>
                        <span>
                          {selected.length > 3
                            ? `외 ${selected.length - 3}문항`
                            : "순서와 배치를 정하면 출력할 수 있습니다."}
                        </span>
                        <button
                          className={s.primaryButton}
                          onClick={() => navigate("export")}
                        >
                          시험지 완성하기
                          <Icon name="arrow" size={18} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className={s.emptyDraft}>
                      <span className={s.documentShape}>
                        <Icon name="paper" size={38} />
                      </span>
                      <div>
                        <h3>첫 문제를 담아보세요</h3>
                        <p>
                          필요한 문제를 고르면 여기에 모입니다.
                          <br />
                          시험지와 정답지를 한 번에 만들 수 있어요.
                        </p>
                        <button
                          className={s.primaryButton}
                          onClick={() => navigate("bank")}
                        >
                          문제 찾아보기
                          <Icon name="arrow" size={18} />
                        </button>
                      </div>
                    </div>
                  )}
                </section>
                <section className={s.teachingCard}>
                  <div className={s.sectionTitle}>
                    <h2>내 수업 관리</h2>
                    <Icon name="class" size={25} />
                  </div>
                  <p>
                    반과 학생, 수업 진도를
                    <br />
                    같은 작업실에서 관리하세요.
                  </p>
                  <ul>
                    <li>
                      <span>01</span>
                      <div>
                        <strong>반 · 학생 관리</strong>
                        <small>반 편성과 학생 등록</small>
                      </div>
                    </li>
                    <li>
                      <span>02</span>
                      <div>
                        <strong>수업 진도 확인</strong>
                        <small>단원별 진행 상황과 다음 수업</small>
                      </div>
                    </li>
                  </ul>
                  <button
                    className={s.secondaryButton}
                    onClick={() => navigate("teaching")}
                  >
                    수업 · 학생 관리 열기
                    <Icon name="arrow" size={18} />
                  </button>
                </section>
              </div>
              <div className={s.homeFooter}>
                <span>
                  <Icon name="check" size={16} /> 초등은 대분수로 · 중등 이상은
                  원문 그대로
                </span>
                <span>원본을 보존하며 작업합니다.</span>
              </div>
            </main>
          )}
          {bankOpened && (
            <main hidden={view !== "bank"} className={s.viewContent}>
              <BankView
                key={bankEntry.version}
                initialData={initialData}
                initialFilters={bankEntry}
                selected={selected}
                onToggle={toggle}
                onSelectionChange={setSelected}
                onExport={() => navigate("export")}
              />
            </main>
          )}
          {studioOpened && (
            <main hidden={view !== "studio"} className={s.studioContent}>
              <StudioView onAdd={add} onExport={() => navigate("export")} />
            </main>
          )}
          {teachingOpened && (
            <div hidden={view !== "teaching"} className={s.teachingContent}>
              <TeachingView />
            </div>
          )}

          {view === "export" && (
            <main className={s.exportContent}>
              <div className={s.pageHeading}>
                <div>
                  <p className={s.eyebrow}>시험지 편집</p>
                  <h1>시험지 구성하기</h1>
                  <p>문제은행과 내 자료에서 가져온 문제를 함께 구성하세요.</p>
                </div>
                <button
                  className={s.secondaryButton}
                  onClick={save}
                  disabled={!selected.length}
                >
                  <Icon name="save" size={18} /> 작업 저장
                </button>
              </div>
              {!selected.length ? (
                <div className={s.emptyExport}>
                  <div className={s.emptyIcon}>
                    <Icon name="paper" size={42} />
                  </div>
                  <h2>어떤 문제로 시작할까요?</h2>
                  <p>
                    문제은행에서 고르거나, 내 자료에서 오려낸 문제를 담아
                    보세요.
                  </p>
                  <div>
                    <button
                      className={s.primaryButton}
                      onClick={() => navigate("bank")}
                    >
                      문제은행에서 담기 <Icon name="arrow" size={18} />
                    </button>
                    <button
                      className={s.secondaryButton}
                      onClick={() => navigate("studio")}
                    >
                      자료 가져오기
                    </button>
                  </div>
                  <button className={s.textButton} onClick={restore}>
                    저장한 작업 불러오기
                  </button>
                </div>
              ) : (
                <div className={s.exportGrid}>
                  <aside className={s.exportInspector}>
                    <h2>시험지 설정</h2>
                    <label className={s.field}>
                      제목
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={80}
                      />
                    </label>
                    <div className={s.field}>
                      문제 배치
                      <div className={s.segment}>
                        {[1, 2].map((n) => (
                          <button
                            key={n}
                            aria-pressed={columns === n}
                            className={columns === n ? s.segmentActive : ""}
                            onClick={() => setColumns(n)}
                          >
                            {n}단
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className={s.checkField}>
                      <input
                        type="checkbox"
                        checked={answers}
                        onChange={(e) => setAnswers(e.target.checked)}
                      />{" "}
                      정답 · 해설지 포함
                    </label>
                    <div className={s.fractionNote}>
                      <Icon name="check" size={16} />
                      <p>
                        초등 텍스트는 대분수로 표기
                        <br />
                        <span>중등 이상은 원문 유지</span>
                      </p>
                    </div>
                    <div className={s.orderHeading}>
                      <h3>문제 순서</h3>
                      <span>{selected.length}문항</span>
                    </div>
                    <ol className={s.orderList}>
                      {selected.map((p, i) => (
                        <li key={p.id}>
                          <span className={s.orderNumber}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <strong>
                              {p.section || p.sourceLabel || "가져온 문제"}
                            </strong>
                            <small>
                              {p.grade} · {p.difficulty || "내 자료"}
                            </small>
                          </div>
                          <div className={s.orderActions}>
                            <button
                              disabled={i === 0}
                              aria-label={`${i + 1}번 문제 위로`}
                              onClick={() => move(i, -1)}
                            >
                              ↑
                            </button>
                            <button
                              disabled={i === selected.length - 1}
                              aria-label={`${i + 1}번 문제 아래로`}
                              onClick={() => move(i, 1)}
                            >
                              ↓
                            </button>
                            <button
                              aria-label={`${i + 1}번 문제 빼기`}
                              onClick={() => toggle(p)}
                            >
                              ×
                            </button>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <button
                      className={s.addMore}
                      onClick={() => navigate("bank")}
                    >
                      <Icon name="plus" size={16} /> 문제 더 담기
                    </button>
                    <button
                      className={s.primaryButton}
                      onClick={() => window.print()}
                    >
                      <Icon name="print" size={18} /> 인쇄 / PDF 저장
                    </button>
                    <button className={s.secondaryButton} onClick={download}>
                      <Icon name="save" size={18} /> 작업 파일 내보내기
                    </button>
                    <p className={s.exportHint}>
                      PDF는 인쇄 창에서 저장할 수 있습니다.
                      <br />
                      HWP · HWPX 변환 엔진은 연결 준비 중입니다.
                    </p>
                    {savedAt && (
                      <p className={s.subtle}>
                        이 브라우저에 저장됨 ·{" "}
                        {new Date(savedAt).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </aside>
                  <div className={s.paperCanvas}>
                    <div className={s.paperToolbar}>
                      <span>
                        <span className={s.liveDot} /> 실시간 미리보기
                      </span>
                      <span>
                        A4 · {columns}단 · {selected.length}문항
                      </span>
                    </div>
                    <article className={s.paper} data-unified-paper>
                      <header className={s.paperHeader}>
                        <span>TODAY’S MATH</span>
                        <h2>{title || "오늘 수학 학습지"}</h2>
                        <div>
                          <span>{selected.length}문항</span>
                          <span>이름 __________________</span>
                        </div>
                      </header>
                      <div
                        className={s.paperProblems}
                        style={{ columnCount: columns }}
                      >
                        {selected.map((problem, i) => (
                          <section className={s.paperProblem} key={problem.id}>
                            <strong className={s.problemNumber}>
                              {String(i + 1).padStart(2, "0")}
                            </strong>
                            <UnifiedProblem problem={problem} print />
                          </section>
                        ))}
                      </div>
                      <footer className={s.paperFooter}>
                        오늘 수학 <span>수학의 힘을, 매일 조금씩.</span>
                      </footer>
                    </article>
                    {answers && (
                      <article
                        className={`${s.paper} ${s.answerPaper}`}
                        data-unified-paper
                      >
                        <header className={s.paperHeader}>
                          <span>ANSWERS & SOLUTIONS</span>
                          <h2>{title} · 정답과 해설</h2>
                        </header>
                        <div
                          className={s.paperProblems}
                          style={{ columnCount: columns }}
                        >
                          {selected.map((p, i) => (
                            <section className={s.answerItem} key={p.id}>
                              <strong>{String(i + 1).padStart(2, "0")}</strong>
                              <MathText
                                text={fractionViewFor(p)(
                                  p.answer || "정답 미입력",
                                )}
                              />
                              {p.solution && (
                                <SolutionText
                                  text={fractionViewFor(p)(p.solution)}
                                />
                              )}
                            </section>
                          ))}
                        </div>
                      </article>
                    )}
                  </div>
                </div>
              )}
            </main>
          )}
        </div>
      </div>
    </>
  );
}
