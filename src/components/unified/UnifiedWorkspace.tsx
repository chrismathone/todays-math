"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { MathText } from "@/components/math/MathText";
import UnifiedProblem from "./UnifiedProblem";
import { displayFractions } from "./fractionDisplay";
import type { BankData, StudioProblem } from "./types";
import s from "./Workspace.module.css";

const BankView = dynamic(() => import("./BankView"), {
  loading: () => <p className={s.loading}>문제은행을 여는 중입니다…</p>,
});
const StudioView = dynamic(() => import("./StudioView"), {
  ssr: false,
  loading: () => <p className={s.loading}>자료 작업실을 여는 중입니다…</p>,
});
type View = "home" | "bank" | "studio" | "export";
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
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export default function UnifiedWorkspace({
  initialData,
}: {
  initialData: BankData;
}) {
  const [view, setView] = useState<View>("home");
  const [studioOpened, setStudioOpened] = useState(false);
  const [selected, setSelected] = useState<StudioProblem[]>([]);
  const [title, setTitle] = useState("오늘의 수학 학습지");
  const [columns, setColumns] = useState(2);
  const [answers, setAnswers] = useState(false);
  const [notice, setNotice] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const navigate = (next: View) => {
    setView(next);
    if (next === "studio") setStudioOpened(true);
    setNotice("");
  };
  const toggle = (problem: StudioProblem) =>
    setSelected((current) =>
      current.some((p) => p.id === problem.id)
        ? current.filter((p) => p.id !== problem.id)
        : [...current, problem],
    );
  const add = (problems: StudioProblem[]) =>
    setSelected((current) => [
      ...current,
      ...problems.filter((p) => !current.some((old) => old.id === p.id)),
    ]);
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
    <div className={s.workspace}>
      <aside className={s.sidebar}>
        <button
          className={s.brand}
          onClick={() => navigate("home")}
          aria-label="오늘의수학 홈"
        >
          <span className={s.brandSymbol}>
            m<span>·</span>
          </span>
          <span>
            오늘의수학<small>MATH WORKSPACE</small>
          </span>
        </button>
        <div className={s.workspaceLabel}>
          <span className={s.avatar}>수</span>
          <span>
            수학 선생님의 작업실<small>통합 미리보기</small>
          </span>
          <span className={s.devPill}>DEV</span>
        </div>
        <button className={s.newButton} onClick={() => navigate("studio")}>
          <Icon name="plus" size={18} /> 자료 만들기
        </button>
        <p className={s.navCaption}>WORKSPACE</p>
        <nav className={s.nav} aria-label="작업실 메뉴">
          {(["home", "bank", "studio", "export"] as View[]).map((item) => (
            <button
              key={item}
              className={view === item ? s.navActive : ""}
              onClick={() => navigate(item)}
              aria-current={view === item ? "page" : undefined}
            >
              <Icon
                name={
                  item === "studio"
                    ? "crop"
                    : item === "export"
                      ? "paper"
                      : item
                }
              />
              {labels[item]}
              {item === "export" && selected.length > 0 && (
                <span className={s.navCount}>{selected.length}</span>
              )}
            </button>
          ))}
        </nav>
        <p className={s.navCaption}>TEACHING</p>
        <Link href="/" className={s.classLink}>
          <Icon name="class" /> 수업 · 학생 관리 <span>↗</span>
        </Link>
        <div className={s.sideBottom}>
          <span className={s.liveDot} /> 하나의 수학 작업실
          <p>
            문제를 모으고, 다듬고,
            <br />
            수업에 필요한 한 장으로.
          </p>
          <Link href="/">기존 오늘의수학 열기 ↗</Link>
        </div>
      </aside>

      <div className={s.main}>
        <header className={s.topbar}>
          <div>
            <span className={s.breadcrumb}>작업실</span>
            <span className={s.slash}>/</span>
            <strong>{labels[view]}</strong>
          </div>
          <div className={s.topRight}>
            <span className={s.previewLabel}>통합 디자인 미리보기</span>
            <span className={s.profile}>T</span>
          </div>
        </header>
        {notice && (
          <div className={s.notice} role="status">
            <Icon name="check" size={18} />
            {notice}
            <button aria-label="알림 닫기" onClick={() => setNotice("")}>
              <Icon name="close" size={16} />
            </button>
          </div>
        )}

        {view === "home" && (
          <main className={s.home}>
            <div className={s.welcome}>
              <div>
                <p className={s.eyebrow}>
                  {date} <span>·</span> TODAY’S WORKSPACE
                </p>
                <h1>
                  수업의 시작부터,
                  <br />
                  <span>완성된 한 장까지.</span>
                </h1>
                <p className={s.intro}>
                  좋은 문제를 찾고, 나만의 자료로 다듬어 보세요.
                  <br />
                  오늘의 수학 준비가 이곳에서 이어집니다.
                </p>
              </div>
              <div className={s.heroArt} aria-hidden="true">
                <svg viewBox="0 0 340 230">
                  <defs>
                    <pattern
                      id="unified-grid"
                      width="20"
                      height="20"
                      patternUnits="userSpaceOnUse"
                    >
                      <path
                        d="M20 0H0V20"
                        fill="none"
                        stroke="#dce5de"
                        strokeWidth=".6"
                      />
                    </pattern>
                  </defs>
                  <rect width="340" height="230" fill="url(#unified-grid)" />
                  <circle
                    cx="179"
                    cy="117"
                    r="75"
                    fill="#d4e5d8"
                    fillOpacity=".55"
                    stroke="#608874"
                  />
                  <path
                    d="m106 137 128-77-26 143Z"
                    fill="#f1dfb8"
                    fillOpacity=".7"
                    stroke="#a38a52"
                  />
                  <path
                    d="M60 176h227M98 208V30"
                    stroke="#829989"
                    strokeWidth="1"
                  />
                  <circle cx="106" cy="137" r="4" fill="#246d54" />
                  <circle cx="234" cy="60" r="4" fill="#246d54" />
                  <circle cx="208" cy="203" r="4" fill="#246d54" />
                  <text
                    x="249"
                    y="61"
                    fill="#607b6b"
                    fontFamily="Georgia"
                    fontStyle="italic"
                    fontSize="18"
                  >
                    A
                  </text>
                  <text
                    x="217"
                    y="220"
                    fill="#607b6b"
                    fontFamily="Georgia"
                    fontStyle="italic"
                    fontSize="18"
                  >
                    B
                  </text>
                  <text
                    x="78"
                    y="132"
                    fill="#607b6b"
                    fontFamily="Georgia"
                    fontStyle="italic"
                    fontSize="18"
                  >
                    C
                  </text>
                  <text
                    x="31"
                    y="57"
                    fill="#39654e"
                    fontFamily="Georgia"
                    fontStyle="italic"
                    fontSize="21"
                  >
                    x² + y² = r²
                  </text>
                </svg>
              </div>
            </div>

            <section className={s.startGrid} aria-label="작업 시작">
              <article className={`${s.startCard} ${s.startPrimary}`}>
                <span className={s.cardNumber}>01 / FIND</span>
                <div className={s.cardIcon}>
                  <Icon name="bank" size={26} />
                </div>
                <h2>문제은행에서 시작</h2>
                <p>
                  학년과 단원을 골라
                  <br />
                  필요한 문제를 한곳에 담으세요.
                </p>
                <button onClick={() => navigate("bank")}>
                  문제 찾아보기 <Icon name="arrow" size={19} />
                </button>
              </article>
              <article className={s.startCard}>
                <span className={s.cardNumber}>02 / CREATE</span>
                <div className={s.cardIcon}>
                  <Icon name="crop" size={26} />
                </div>
                <h2>내 자료로 시작</h2>
                <p>
                  PDF와 이미지의 문제를 오려내고,
                  <br />
                  본문과 해설을 편집하세요.
                </p>
                <button onClick={() => navigate("studio")}>
                  자료 가져오기 <Icon name="arrow" size={19} />
                </button>
              </article>
              <article className={s.startCard}>
                <span className={s.cardNumber}>03 / PUBLISH</span>
                <div className={s.cardIcon}>
                  <Icon name="paper" size={26} />
                </div>
                <h2>한 장으로 완성</h2>
                <p>
                  모은 문제를 원하는 순서로 배치해
                  <br />
                  학습지와 정답지를 만드세요.
                </p>
                <button onClick={() => navigate("export")}>
                  시험지 구성하기 <Icon name="arrow" size={19} />
                </button>
              </article>
            </section>

            <div className={s.homeLower}>
              <section className={s.bankOverview}>
                <div className={s.sectionTitle}>
                  <h2>준비된 문제, 넓어진 수업</h2>
                  <button onClick={() => navigate("bank")}>
                    전체 보기 <Icon name="arrow" size={16} />
                  </button>
                </div>
                <div className={s.bankTotal}>
                  {initialData.error ? "—" : count.toLocaleString()}
                  <span>출제 가능한 문항</span>
                  <span className={s.databaseBadge}>
                    <span className={s.liveDot} />
                    {initialData.error ? "연결 확인 필요" : "문제 DB 연결됨"}
                  </span>
                </div>
                {initialData.error ? (
                  <p className={s.subtle}>{initialData.error}</p>
                ) : (
                  <div className={s.gradeStats}>
                    {["초", "중", "고"].map((prefix, index) => {
                      const n = initialData.grades
                        .filter((g) => g.grade.startsWith(prefix))
                        .reduce((sum, g) => sum + g.count, 0);
                      return (
                        <div key={prefix}>
                          <span>
                            <i
                              style={{
                                background: ["#377961", "#ae945f", "#8a97b0"][
                                  index
                                ],
                              }}
                            />
                            {["초등 수학", "중등 수학", "고등 수학"][index]}
                          </span>
                          <strong>{n.toLocaleString()}</strong>
                          <div className={s.statTrack}>
                            <div
                              style={{
                                width: `${count ? Math.max(2, (n / count) * 100) : 0}%`,
                                background: ["#377961", "#ae945f", "#8a97b0"][
                                  index
                                ],
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className={s.bankFootnote}>
                  검수를 통과하고 출제가 허용된 공용 문항을 사용합니다.
                </p>
              </section>
              <section className={s.currentWork}>
                <div className={s.sectionTitle}>
                  <h2>이어서 작업하기</h2>
                  <span className={s.tinyBadge}>내 작업</span>
                </div>
                <div className={s.miniPaper}>
                  <Icon name="paper" size={28} />
                  <div>
                    <strong>
                      {selected.length ? title : "아직 담은 문제가 없어요"}
                    </strong>
                    <p>
                      {selected.length
                        ? `${selected.length}문항 · 시험지 구성 중`
                        : "문제를 담으면 여기에 모입니다."}
                    </p>
                  </div>
                </div>
                <div className={s.workButtons}>
                  <button
                    onClick={() =>
                      selected.length ? navigate("export") : navigate("bank")
                    }
                  >
                    {selected.length ? "작업 계속하기" : "첫 문제 담기"}{" "}
                    <Icon name="arrow" size={17} />
                  </button>
                  <button onClick={restore}>저장한 작업 불러오기</button>
                </div>
                <p className={s.subtle}>
                  작업은 이 브라우저에 저장할 수 있습니다.
                </p>
              </section>
            </div>
            <footer className={s.homeFooter}>
              <span>오늘의수학</span>
              <p>찾기부터 내보내기까지, 수학 자료의 모든 과정.</p>
              <span>WORKSPACE PREVIEW / 01</span>
            </footer>
          </main>
        )}

        {view === "bank" && (
          <main className={s.viewContent}>
            <BankView
              initialData={initialData}
              selected={selected}
              onToggle={toggle}
              onExport={() => navigate("export")}
            />
          </main>
        )}
        {studioOpened && (
          <main hidden={view !== "studio"} className={s.studioContent}>
            <StudioView onAdd={add} onExport={() => navigate("export")} />
          </main>
        )}

        {view === "export" && (
          <main className={s.exportContent}>
            <div className={s.pageHeading}>
              <div>
                <p className={s.eyebrow}>PUBLISH / 내보내기</p>
                <h1>수업에 바로 쓰는 한 장.</h1>
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
                  문제은행에서 고르거나, 내 자료에서 오려낸 문제를 담아 보세요.
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
                      초등은 대분수로 자동 표기
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
                      <h2>{title || "오늘의 수학 학습지"}</h2>
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
                      오늘의수학 <span>수학의 힘을, 매일 조금씩.</span>
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
                              text={displayFractions(
                                p.answer || "정답 미입력",
                                p.grade,
                                p.content,
                              )}
                            />
                            {p.solution && (
                              <MathText
                                text={displayFractions(
                                  p.solution,
                                  p.grade,
                                  p.content,
                                )}
                                as="div"
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
  );
}
