/**
 * 자료 제작 네 단계 헤더 시안 — 원장님 2026-09-21 «4단계 헤더 구성 일치화 시킬것.
 * 단계마다 헤더 구조가 바뀌는 치명적인 ux 고칠것».
 *
 * 이 파일은 **제품이 아니다.** 시안의 높이를 추측하지 않고 실제로 재려고 만든 화면이다
 * (D-07 — 형태는 원장님이 정하신다). 세 안과 «현행»을 같은 CSS 모듈 클래스로 그려
 * `step-header.spec.ts` 가 1516px·1280px 에서 높이를 잰다.
 *
 * 보는 법: `npx vite --config e2e/studio-ai/vite.config.mts` 뒤
 *   http://127.0.0.1:4187/step-header.html            — 현행·A·B·C 를 네 단계 모두
 *   http://127.0.0.1:4187/step-header.html?plan=A     — 한 안만
 *   http://127.0.0.1:4187/step-header.html?bare=1     — 라벨 없이(높이 잴 때)
 */
import { createRoot } from "react-dom/client";
import PaperIcon from "../../src/components/unified/WorkspaceIcon";
import StudioProgressStrip from "../../src/components/unified/StudioProgressStrip";
import WorkspacePageHeader from "../../src/components/unified/WorkspacePageHeader";
import st from "../../src/components/unified/StudioView.module.css";
import ws from "../../src/components/unified/WorksheetEditor.module.css";
import "./harness.css";
import "./step-header.css";

/**
 * 작업실 띠가 쓰는 18px 아이콘 — StudioView 안의 지역 `Icon` 과 같은 길·같은 크기다.
 * (그 함수는 내보내지 않아 여기서 같은 모양으로 다시 둔다 — 폭이 같아야 높이를 제대로 잰다.)
 */
const STUDIO_ICON = {
  upload: "M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5",
  file: "M14 2H5a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V8Zm0 0v6h6M8 13h8M8 17h6",
  restart: "M3 4v6h6M3 10a9 9 0 1 1 2 8",
} as const;
function Icon({ name }: { name: keyof typeof STUDIO_ICON }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={STUDIO_ICON[name]} />
    </svg>
  );
}

/** 원장님 화면에서 잘리던 그 이름이다(35자). */
const FILE_NAME = "[경신중][2][25-2-중간][미래엔][1학기 전범위].pdf";
const CROPS = 19;
const PICKED = 5;

type Plan = "now" | "A" | "A2" | "B" | "C";
type Step = 1 | 2 | 3 | 4;

const STEP_NAME: Record<Step, string> = {
  1: "원본 가져오기",
  2: "문제&도형 잘라내기",
  3: "OCR · 디지털화",
  4: "시험지 구성",
};
const STEP_DESC: Record<Step, string> = {
  1: "자료에서 문제를 자르고, 검수한 문항을 내 시험지에 담으세요.",
  2: "문제와 도형이 들어갈 자리를 지면에서 골라 잘라내세요.",
  3: "잘라 낸 문제를 글자와 수식으로 바꾸고 내용을 확인하세요.",
  4: "문제 순서와 배치를 정하고 인쇄하세요.",
};

/* ── 조각들 — 현행과 같은 CSS 모듈 클래스를 쓴다 ───────────────────────── */

function SourcePicker() {
  return (
    <div className={st.sourcePicker}>
      <Icon name="file" />
      <select aria-label="원본 파일" title={FILE_NAME} defaultValue="s1">
        <option value="s1">{FILE_NAME}</option>
      </select>
    </div>
  );
}

function SourceGrade() {
  return (
    <label className={st.sourceGrade} data-grade="quiet">
      <span className={st.srOnly}>학년</span>
      <select aria-label="시험지 학년" defaultValue="auto">
        <option value="auto">중2</option>
      </select>
    </label>
  );
}

/** 쪽 이동. `rotate` 는 «회전» 단추, `zoom` 은 원본 확대 비율. */
function PageTools({ rotate, zoom }: { rotate: boolean; zoom: boolean }) {
  return (
    <div className={st.pageTools} data-studio-page-tools>
      <button type="button" className={st.pageNavigationButton}>
        이전 쪽
      </button>
      <label>
        <span className={st.srOnly}>페이지</span>
        <select aria-label="페이지 선택" defaultValue="1">
          <option value="1">1</option>
        </select>
        <span>/ 5</span>
      </label>
      <button type="button" className={st.pageNavigationButton}>
        다음 쪽
      </button>
      {rotate && (
        <>
          <span className={st.divider} />
          <button type="button" className={st.pageNavigationButton}>
            회전
          </button>
        </>
      )}
      {zoom && (
        <select aria-label="원본 확대 비율" defaultValue="100">
          <option value="100">너비 맞춤</option>
        </select>
      )}
    </div>
  );
}

function BulkActions({ digitize }: { digitize: boolean }) {
  return (
    <div className={st.bulkActions} data-studio-bulk>
      <button
        type="button"
        className={`${st.secondaryButton} ${st.pageAiButton}`}
      >
        전체 페이지 자동 인식
      </button>
      <button type="button" className={st.secondaryButton}>
        이 쪽 다시 인식
      </button>
      {digitize && (
        <>
          <button type="button" className={st.secondaryButton}>
            전체 디지털화
          </button>
          <button type="button" className={st.secondaryButton}>
            전체 해설 생성
          </button>
        </>
      )}
    </div>
  );
}

function CropNav() {
  return (
    <>
      <span className={st.divider} />
      <button type="button" className={st.secondaryButton}>
        이전 문제
      </button>
      <strong>
        문제 3 <span>/ {CROPS}</span>
      </strong>
      <button type="button" className={st.secondaryButton}>
        다음 문제
      </button>
    </>
  );
}

function Strip() {
  return (
    <StudioProgressStrip
      summaries={[
        { id: "crops", label: "디지털화", done: 3, total: CROPS, active: true },
      ]}
    >
      <div />
    </StudioProgressStrip>
  );
}

/** 단계별 큰 단추 — 어느 안에서나 띠(또는 큰 제목) 오른쪽 끝에 선다. */
function StepActions({ step }: { step: Step }) {
  if (step === 1)
    return (
      <>
        <button type="button" className={st.secondaryButton}>
          <Icon name="file" />
          예제로 시작
        </button>
        <button type="button" className={st.primaryButton}>
          <Icon name="upload" />
          파일 가져오기
        </button>
        <button type="button" className={st.secondaryButton}>
          <Icon name="restart" />
          새로 시작
        </button>
      </>
    );
  if (step === 2)
    return (
      <>
        <button type="button">
          <Icon name="restart" />
          새로 시작
        </button>
        <button type="button" aria-pressed="true">
          검수 패널
        </button>
        <button type="button" className={st.primaryButton}>
          편집창 확대
        </button>
      </>
    );
  if (step === 3)
    return (
      <>
        <button type="button">
          <Icon name="restart" />
          새로 시작
        </button>
        <button type="button" className={st.primaryButton}>
          편집창 확대
        </button>
      </>
    );
  return (
    <>
      <button type="button" className={ws.secondaryButton}>
        <PaperIcon name="save" size={18} /> 작업 저장
      </button>
      <button type="button" className={ws.primaryButton}>
        <PaperIcon name="print" size={18} /> 인쇄 / PDF 저장
      </button>
      <button type="button" className={ws.secondaryButton}>
        HWPX 내보내기
      </button>
      <button type="button" className={ws.secondaryButton}>
        PDF 내려받기
      </button>
    </>
  );
}

/** 단계 탭 — 안 A·B·C 는 넷, 현행은 셋(④ 는 탭이 아예 없다). */
function StepTabs({ step, count }: { step: Step; count: 3 | 4 }) {
  return (
    <nav className={st.stepTabs} aria-label="제작 단계 이동">
      <button aria-pressed={step === 1}>원본 가져오기</button>
      <button aria-pressed={step === 2}>문제&amp;도형 잘라내기</button>
      <button aria-pressed={step === 3}>
        OCR · 디지털화 <b>{CROPS}</b>
      </button>
      {count === 4 && (
        <button aria-pressed={step === 4} disabled={PICKED === 0}>
          시험지 구성 <b>{PICKED}</b>
        </button>
      )}
    </nav>
  );
}

/**
 * 단계별 도구 줄 — 안 A·B·C 에서 둘째(B 는 셋째) 줄에 선다.
 * ①④ 는 도구가 없어 줄 자체가 서지 않는다.
 */
function ToolsRow({ step, source = true }: { step: Step; source?: boolean }) {
  if (step === 2)
    return (
      <div className={st.reviewNavigation} aria-label="지면 도구">
        {source && <SourcePicker />}
        {source && <SourceGrade />}
        <PageTools rotate zoom />
        <span className={st.divider} />
        <BulkActions digitize={false} />
        <button type="button" className={st.preciseButton}>
          영역 지정
        </button>
        <Strip />
      </div>
    );
  if (step === 3)
    return (
      <div className={st.reviewNavigation} aria-label="문항 검수 이동">
        {source && <SourcePicker />}
        {source && <SourceGrade />}
        {/* 회전은 없다 — 검수 단계에서 돌리면 이 쪽의 영역·인식 결과가 지워진다. */}
        <PageTools rotate={false} zoom={false} />
        <CropNav />
        <span className={st.divider} />
        <BulkActions digitize />
        <Strip />
        <span className={st.reviewProgress}>2문항 검수 완료</span>
      </div>
    );
  return null;
}

/* ── 네 가지 안 ───────────────────────────────────────────────────────── */

/** 현행 — 세 가지 꼴이 섞여 있다. */
function Now({ step }: { step: Step }) {
  if (step === 1)
    return (
      <>
        <WorkspacePageHeader
          title="내 자료로 만드는 문제"
          description={STEP_DESC[1]}
        >
          <StepActions step={1} />
        </WorkspacePageHeader>
        <div className={st.workflow}>
          <nav className={st.steps} aria-label="제작 단계">
            {([1, 2, 3] as const).map((index) => (
              <button
                key={index}
                type="button"
                aria-current={index === 1 ? "step" : undefined}
              >
                <span className={st.stepNumber}>{index}</span>
                {STEP_NAME[index as Step]}
              </button>
            ))}
          </nav>
          <span className={st.localBadge}>
            <Icon name="file" />
            로컬 작업
          </span>
        </div>
      </>
    );
  if (step === 4)
    return (
      <WorkspacePageHeader title="시험지 구성하기" description={STEP_DESC[4]}>
        <button type="button" className={ws.secondaryButton}>
          <span aria-hidden="true">←</span> 이전 검토 단계
        </button>
        <StepActions step={4} />
      </WorkspacePageHeader>
    );
  return (
    <>
      <div className={st.editorBar} data-studio-band>
        <div className={st.editorTabs}>
          <h1>자료 제작</h1>
          <StepTabs step={step} count={3} />
        </div>
        {step === 3 && (
          <div className={st.bandTools} data-studio-band-tools>
            <SourcePicker />
            <SourceGrade />
          </div>
        )}
        <div className={st.editorTools}>
          <StepActions step={step} />
        </div>
      </div>
      {step === 2 ? (
        /*
         * 현행 ② 의 도구 줄은 캔버스 «안»에 있어 검수 패널(320px)만큼 좁다 — 실측 1516px 에서
         * 1170px. 여기서도 같은 폭으로 세워야 «1280px 에서 두 줄로 꺾인다»가 그대로 나온다.
         * (③ 은 검수 패널이 숨어 전폭 1490px 이다 — 같은 조각인데 폭이 갈린다.)
         */
        <div className={`${st.canvasToolbar} canvasWidth`}>
          <SourcePicker />
          <SourceGrade />
          <PageTools rotate zoom />
          <BulkActions digitize={false} />
          <button type="button" className={st.preciseButton}>
            영역 지정
          </button>
        </div>
      ) : (
        <div className={st.reviewNavigation} aria-label="문항 검수 이동">
          <PageTools rotate zoom={false} />
          <CropNav />
          <span className={st.divider} />
          <BulkActions digitize />
          <Strip />
          <span className={st.reviewProgress}>2문항 검수 완료</span>
        </div>
      )}
    </>
  );
}

/**
 * 안 A — 얇은 띠 하나로 통일. 제목 줄은 네 단계가 똑같다.
 * `band` 가 참이면 파일·학년을 띠에 남긴다(안 A2 — 트랙 35 가 검수 단계에 둔 자리 그대로).
 */
function PlanA({
  step,
  hint,
  band,
}: {
  step: Step;
  hint?: boolean;
  band?: boolean;
}) {
  const inBand = Boolean(band) && (step === 2 || step === 3);
  return (
    <>
      <div className={st.editorBar} data-studio-band>
        <div className={st.editorTabs}>
          <h1>자료 제작</h1>
          <StepTabs step={step} count={4} />
        </div>
        {inBand && (
          <div className={st.bandTools} data-studio-band-tools>
            <SourcePicker />
            <SourceGrade />
          </div>
        )}
        <div className={st.editorTools}>
          <StepActions step={step} />
        </div>
      </div>
      {hint && <p className="stepHint">{STEP_DESC[step]}</p>}
      <ToolsRow step={step} source={!inBand} />
    </>
  );
}

/** 안 B — 큰 제목으로 통일. 제목이 단계 이름이 되고 탭이 그 아래 늘 선다. */
function PlanB({ step }: { step: Step }) {
  return (
    <>
      <WorkspacePageHeader
        title={STEP_NAME[step]}
        description={STEP_DESC[step]}
      >
        <StepActions step={step} />
      </WorkspacePageHeader>
      <div className={st.editorBar} data-studio-band>
        <div className={st.editorTabs}>
          <StepTabs step={step} count={4} />
        </div>
      </div>
      <ToolsRow step={step} />
    </>
  );
}

/* ── 화면 ─────────────────────────────────────────────────────────────── */

const PLAN_NAME: Record<Plan, string> = {
  now: "현행 — 세 꼴이 섞여 있다",
  A: "안 A — 얇은 띠로 통일(도구는 모두 둘째 줄)",
  A2: "안 A2 — 얇은 띠로 통일(파일·학년은 띠에 남긴다)",
  B: "안 B — 큰 제목으로 통일",
  C: "안 C — 섞기(설명 줄은 처음 들어왔을 때만)",
};

function Block({ plan, step }: { plan: Plan; step: Step }) {
  const editing = plan === "now" ? step === 2 || step === 3 : step !== 1;
  return (
    <section
      className={`${st.studio} ${editing ? st.editing : ""} ${step === 3 ? st.reviewMode : ""}`}
      data-plan={plan}
      data-step={step}
      aria-label={`${PLAN_NAME[plan]} · ${STEP_NAME[step]}`}
    >
      {plan === "now" ? (
        <Now step={step} />
      ) : plan === "B" ? (
        <PlanB step={step} />
      ) : (
        <PlanA step={step} hint={plan === "C"} band={plan === "A2"} />
      )}
    </section>
  );
}

function Page() {
  const params = new URLSearchParams(location.search);
  const bare = params.get("bare") === "1";
  const only = params.get("plan") as Plan | null;
  const plans: Plan[] = only ? [only] : ["now", "A", "A2", "B", "C"];
  return (
    <main className="fixtureRoot">
      {plans.map((plan) => (
        <div key={plan}>
          {!bare && <h2 className="fixturePlan">{PLAN_NAME[plan]}</h2>}
          {([1, 2, 3, 4] as const).map((step) => (
            <div className="fixtureStep" key={step}>
              {!bare && (
                <h3 className="fixtureStepName">
                  {step}. {STEP_NAME[step]}
                </h3>
              )}
              <Block plan={plan} step={step} />
            </div>
          ))}
        </div>
      ))}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Page />);
