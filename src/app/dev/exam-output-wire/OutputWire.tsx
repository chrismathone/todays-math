import type { ReactNode } from "react";

import s from "./OutputWire.module.css";

/**
 * 3단계 «양식 구성·출력» 덧붙임 Wire — W6 내 양식 · W7 제목 추천 · W8 시험지 태그.
 *
 * 바탕은 **지금 3단계 그대로**다(`WorksheetEditor` · `PrintOptionsPanel` 의 차례와 낱말).
 * 안끼리 다른 것은 **덧붙인 것의 자리**(설정 칸 맨 위 · 칸 속 · 맨 아래 · 단계 띠 · 저장 창 ·
 * 내 시험지 탭) · 누르는 수 · 처음에 보이는 것이다. 덧붙인 자리는 굵은 테두리로 가른다.
 * 문구는 실제로 쓸 말로 적는다(D-08 — 간결 · 사무적 · 느낌표 없음).
 */

/* ───────────── 픽스처 (지어낸 예 — 실제 문항 · 계정이 아니다) ───────────── */

const DEFAULT_TITLE = "오늘 수학 학습지"; // draftStore.DEFAULT_DRAFT_TITLE 과 같은 글

const TEMPLATES = [
  ["평가원", "수능·모평"],
  ["정통", "학교 시험지"],
  ["모던", "학교 마케팅"],
  ["워크북", "풀이공간"],
  ["자습", "개념+모눈"],
  ["유형", "유형 컴팩트"],
] as const;

/** W8 처음 목록 — 여덟 개. 학원이 실제로 부르는 이름 그대로. */
const STARTER_TAGS = [
  "일일TEST",
  "주간TEST",
  "단원TEST",
  "숙제",
  "복습",
  "오답",
  "입학TEST",
  "내신대비",
] as const;

type SavedLayout = {
  name: string;
  used: string;
  body: string;
  head: string;
  isDefault?: boolean;
};

const LAYOUTS: SavedLayout[] = [
  {
    name: "일일TEST 2단",
    used: "10/15 사용",
    body: "정통 · 2단 · 1단당 3문항 · 보기 자동 · 빠른 정답만",
    head: "인재원학원 · 출제자 박선생 · 시험 시간 20분 · 날짜 표시",
    isDefault: true,
  },
  {
    name: "주간 확인 풀이칸",
    used: "10/11 사용",
    body: "워크북 · 1단 · 오른쪽 풀이 공간 공책 줄 · 보통 여백 · 정답·해설지",
    head: "학원명 인재원학원 · 강사명 박선생 · 시험 시간 50분",
  },
  {
    name: "단원평가 학교식",
    used: "9/30 사용",
    body: "정통 · 2단 · 단 사이 구분선 · 배점 보임 · 2열 3행",
    head: "인재원학원 · 총점 100 · 시험 시간 45분",
  },
  {
    name: "오답 다시 풀기",
    used: "9/22 사용",
    body: "유형 · 2단 · 좁게 · 난이도 라벨 끔 · 단원명 보임",
    head: "인재원학원",
  },
];

type LibRow = {
  no: number;
  kind: string;
  tag?: string;
  title: string;
  count: number;
  updated: string;
};

const LIB_ROWS: LibRow[] = [
  {
    no: 1,
    kind: "시험지",
    tag: "일일TEST",
    title: "중2 일차부등식 일일TEST 10.16",
    count: 8,
    updated: "10/16",
  },
  {
    no: 2,
    kind: "시험지",
    tag: "주간TEST",
    title: "중2-1 부등식 주간 확인",
    count: 20,
    updated: "10/14",
  },
  {
    no: 3,
    kind: "연산 연습지",
    tag: "숙제",
    title: "중1 정수의 덧셈 연습 3회",
    count: 40,
    updated: "10/13",
  },
  {
    no: 4,
    kind: "시험지",
    tag: "오답",
    title: "중2 10월 2주 오답 다시 풀기",
    count: 12,
    updated: "10/11",
  },
  {
    no: 5,
    kind: "시험지",
    title: DEFAULT_TITLE,
    count: 15,
    updated: "10/09",
  },
];

const TAG_COUNTS: Record<string, number> = {
  일일TEST: 12,
  주간TEST: 4,
  단원TEST: 3,
  숙제: 6,
  복습: 2,
  오답: 5,
  입학TEST: 1,
  내신대비: 0,
};

/** W7 추천 세 가지 — 시험지에서 읽는 값만 쓴다(학년 · 범위 · 날짜 · 태그). */
const SUGGEST = [
  {
    label: "범위 이름",
    text: "중2 일차부등식의 해와 성질 외 2 일일TEST",
  },
  { label: "과정 · 대단원 · 날짜", text: "중2-1 부등식 (3차시) 10.16" },
  { label: "날짜 먼저", text: "10.16 중2 일차부등식 일일TEST" },
];

/* ───────────── 그림 부품 ───────────── */

function Btn({ children }: { children: ReactNode }) {
  return <span className={s.btn}>{children}</span>;
}
function Primary({ children }: { children: ReactNode }) {
  return <span className={s.btnPrimary}>{children}</span>;
}
function TextBtn({ children }: { children: ReactNode }) {
  return <span className={s.btnText}>{children}</span>;
}
function Chip({ on, children }: { on?: boolean; children: ReactNode }) {
  return <span className={on ? s.chipOn : s.chip}>{children}</span>;
}
function Check({ on, children }: { on?: boolean; children: ReactNode }) {
  return <span className={on ? s.checkOn : s.check}>{children}</span>;
}

const BAR_WIDTHS = ["96%", "88%", "72%", "54%", "80%"];
function Bars({ n = 3 }: { n?: number }) {
  return (
    <div className={s.bars}>
      {BAR_WIDTHS.slice(0, n).map((w, i) => (
        <span key={i} className={s.bar} style={{ width: w }} />
      ))}
    </div>
  );
}

function Frame({
  kind,
  label,
  short,
  children,
}: {
  kind: "desktop" | "phone" | "inset";
  label: string;
  short?: boolean;
  children: ReactNode;
}) {
  const size =
    kind === "desktop" ? s.desktop : kind === "phone" ? s.phone : s.inset;
  return (
    <div className={s.scrollX}>
      <p className={s.frameLabel}>{label}</p>
      <div
        className={`${s.frame} ${size} ${short ? s.short : ""}`}
        data-wire-frame={kind}
      >
        {children}
      </div>
    </div>
  );
}

function Option({
  id,
  title,
  idea,
  cost,
  clicks,
  children,
}: {
  id: string;
  title: string;
  idea: string;
  cost: string;
  clicks: string;
  children: ReactNode;
}) {
  return (
    <section className={s.option} id={id} data-wire-option={id}>
      <h3 className={s.h3}>{title}</h3>
      <dl className={s.caption}>
        <dt>이 안의 생각</dt>
        <dd>{idea}</dd>
        <dt>대가</dt>
        <dd>{cost}</dd>
        <dt>누르는 수</dt>
        <dd>{clicks}</dd>
      </dl>
      {children}
    </section>
  );
}

/** 3단계의 단계 띠 — 지금 그대로(`StudioStepBar` + 저장 · 인쇄 · 내보내기 단추). */
function Step3Bar({ lead }: { lead?: ReactNode }) {
  return (
    <div className={s.stepBar}>
      <b>시험지 만들기</b>
      {lead}
      <span>1 범위 설정</span>
      <span>2 문항 검토</span>
      <span className={s.stepOn}>3 양식 구성·출력 20</span>
      <span className={s.grow} />
      <Btn>내 시험지에 저장</Btn>
      <Primary>인쇄 / PDF 저장</Primary>
      <Btn>HWPX 내보내기</Btn>
      <Btn>PDF 내려받기</Btn>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value?: string }) {
  return (
    <span className={s.metaField}>
      {label}
      <span className={value ? undefined : s.empty}>{value || "—"}</span>
    </span>
  );
}

/**
 * 왼쪽 설정 칸 — `PrintOptionsPanel` 의 차례 그대로. 덧붙임은 꽂는 자리(slot)로만 들어온다.
 * 아래쪽 묶음(쪽 여백 ~ 정답·해설)은 지금 그대로라 한 줄씩 줄여 그린다.
 */
function Inspector({
  top,
  titleArea,
  metaTop,
  templateExtra,
  bottom,
  title = DEFAULT_TITLE,
  titleTyped,
}: {
  top?: ReactNode;
  titleArea?: ReactNode;
  metaTop?: ReactNode;
  templateExtra?: ReactNode;
  bottom?: ReactNode;
  title?: string;
  titleTyped?: boolean;
}) {
  return (
    <div className={s.inspector}>
      <div className={s.tabs}>
        <span className={s.tabOn}>서식 설정</span>
        <span className={s.tab}>문제 순서 · 20</span>
      </div>
      {top}
      <span className={s.small}>
        설정은 미리보기와 인쇄 · PDF에 함께 적용됩니다.
      </span>
      <div className={s.group}>
        <span className={s.legend}>템플릿</span>
        <div className={s.tplGrid}>
          {TEMPLATES.map(([label, hint]) => (
            <span
              key={label}
              className={label === "정통" ? s.tplOn : undefined}
            >
              {label}
              <small>{hint}</small>
            </span>
          ))}
        </div>
        {templateExtra}
      </div>
      <div className={s.group}>
        <span className={s.legend}>▾ 시험지 정보</span>
        {metaTop}
        {titleArea ?? (
          <span className={s.metaField}>
            제목
            <span className={titleTyped ? s.metaValue : s.metaValueSoft}>
              {title}
            </span>
          </span>
        )}
        <div className={s.metaGrid}>
          <MetaField label="학교/기관명" value="인재원학원" />
          <MetaField label="학년" value="2학년" />
          <MetaField label="과목" value="수학" />
          <MetaField label="학기" />
          <MetaField label="시험일" value="2026-10-16" />
          <MetaField label="시험 시간" value="20분" />
          <MetaField label="출제자" value="박선생" />
          <MetaField label="총점" value="100" />
        </div>
      </div>
      <div className={s.group}>
        <span className={s.legend}>폰트</span>
        <div className={s.chipRow}>
          <Chip on>기본</Chip>
          <Chip>나눔</Chip>
          <Chip>본고딕</Chip>
          <Chip>고운</Chip>
          <Chip>프리텐다드</Chip>
        </div>
      </div>
      <div className={s.group}>
        <span className={s.legend}>강조 색상</span>
        <div className={s.chipRow}>
          <Chip on>기본 남색</Chip>
          <Chip>사이언</Chip>
          <Chip>파랑</Chip>
          <Chip>보라</Chip>
          <Chip>…</Chip>
        </div>
      </div>
      <div className={s.group}>
        <span className={s.legend}>문제 배치</span>
        <div className={s.chipRow}>
          <Chip>1단</Chip>
          <Chip on>2단</Chip>
        </div>
        <Check>단 사이 구분선</Check>
      </div>
      <div className={s.stubRows}>
        <span>쪽 여백 · 보통 · 좌우 15mm</span>
        <span>세로 배치 · 문항 수 지정 · 1단당 3</span>
        <span>보기 번호 배치 · 자동</span>
        <span>표시 옵션 · 날짜 · 단원명 · 난이도 · 배점 숨기기</span>
        <span>정답 · 해설 · 정답 · 해설지 포함 · 빠른 정답만</span>
      </div>
      {bottom ?? (
        <div>
          <Btn>기본값으로 재설정</Btn>
        </div>
      )}
      <div className={s.fold} aria-hidden>
        <span>여기까지 처음 보임 · 설정 칸 680</span>
      </div>
    </div>
  );
}

function Preview({ title = DEFAULT_TITLE }: { title?: string }) {
  return (
    <div className={s.preview}>
      <span className={s.small}>미리보기 · 1/3쪽</span>
      <div className={s.paper}>
        <div className={s.paperHead}>
          <span className={s.small}>인재원학원 · 2학년 · 수학</span>
          <strong>{title}</strong>
          <span className={s.small}>2026-10-16 · 20분 · 이름 ______</span>
        </div>
        <div className={s.paperBody}>
          {["01", "02", "03", "04"].map((no) => (
            <div key={no}>
              <span className={s.no}>{no}</span>
              <Bars n={4} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3({
  lead,
  inspector,
  previewTitle,
  overlay,
  notice,
}: {
  lead?: ReactNode;
  inspector: ReactNode;
  previewTitle?: string;
  overlay?: ReactNode;
  notice?: ReactNode;
}) {
  return (
    <>
      <Step3Bar lead={lead} />
      {notice}
      <div className={s.exportGrid}>
        {inspector}
        <Preview title={previewTitle} />
      </div>
      {overlay}
    </>
  );
}

/* ───────────── W6 내 양식 저장 · 불러오기 ───────────── */

function LayoutLine() {
  return (
    <div className={s.added}>
      <span className={s.addedLabel}>새로 생김 · 설정 칸 맨 위</span>
      <span>
        양식 — <b>일일TEST 2단</b> 적용함
      </span>
      <div className={s.row}>
        <Btn>저장한 양식 · 4</Btn>
        <Btn>양식 저장</Btn>
      </div>
    </div>
  );
}

function LayoutRows({ phone }: { phone?: boolean }) {
  return (
    <div className={s.list}>
      {LAYOUTS.map((l) => (
        <div className={s.pickRow} key={l.name}>
          <div>
            <span className={s.row}>
              <strong>{l.name}</strong>
              {l.isDefault && <span className={s.tag}>새 시험지 기본</span>}
              <span className={s.small}>{l.used}</span>
            </span>
            <span className={s.small}>서식 · {l.body}</span>
            <span className={s.small}>머리 정보 · {l.head}</span>
            {phone && (
              <div className={s.pickActions}>
                <Primary>적용</Primary>
                <TextBtn>이름 바꾸기</TextBtn>
                <TextBtn>삭제</TextBtn>
              </div>
            )}
          </div>
          {!phone && (
            <div className={s.pickActions}>
              <Primary>적용</Primary>
              <TextBtn>이름 바꾸기</TextBtn>
              {!l.isDefault && <TextBtn>기본으로</TextBtn>}
              <TextBtn>삭제</TextBtn>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const APPLY_RULE =
  "양식은 서식과 머리 정보의 고정 값만 바꿉니다. 문항 · 순서 · 제목 · 시험일 · 학년 · 학기는 그대로입니다.";

function W6A() {
  return (
    <>
      <Frame kind="desktop" label="1040 · A안 · [저장한 양식 · 4]를 누른 뒤">
        <Step3
          inspector={<Inspector top={<LayoutLine />} />}
          overlay={
            <div className={s.scrim}>
              <div className={s.dialog640}>
                <div className={s.dialogHead}>
                  <strong>저장한 양식</strong>
                  <span className={s.small}>마지막 사용순 · 4/50</span>
                  <Btn>닫기</Btn>
                </div>
                <div className={s.dialogBody}>
                  <span className={s.fieldGrow}>양식 이름으로 찾기</span>
                  <LayoutRows />
                  <div className={s.rule}>{APPLY_RULE}</div>
                </div>
              </div>
            </div>
          }
        />
      </Frame>
      <Frame
        kind="inset"
        label="창 560 · A안 · [양식 저장]을 누르면 (B안의 [+ 지금 설정 저장]도 같은 창)"
      >
        <div className={s.dialog560}>
          <div className={s.dialogHead}>
            <strong>양식 저장</strong>
            <Btn>닫기</Btn>
          </div>
          <div className={s.dialogBody}>
            <span className={s.metaField}>
              양식 이름
              <span className={s.metaValue}>일일TEST 2단</span>
            </span>
            <dl className={s.facts}>
              <dt>담는 서식</dt>
              <dd>
                정통 · 기본 폰트 · 기본 남색 · 2단 · 보통 여백 · 1단당 3문항 ·
                보기 자동 · 날짜 · 단원명 · 난이도 표시 · 배점 숨김 · 빠른
                정답만
              </dd>
              <dt>담는 머리 정보</dt>
              <dd>
                학교/기관명 인재원학원 · 과목 수학 · 시험 시간 20분 · 출제자
                박선생 · 총점 100
              </dd>
              <dt>담지 않음</dt>
              <dd>
                문항 20 · 순서 · 제목 · 시험일 · 학년 · 학기 — 시험지마다
                다릅니다.
              </dd>
            </dl>
            <Check>새 시험지의 기본 양식으로</Check>
            <div className={s.confirm}>
              같은 이름의 양식이 있습니다. 바꿀까요 — 지난 저장 10/15.
              <div className={s.row}>
                <Btn>바꾸기</Btn>
                <TextBtn>다른 이름으로</TextBtn>
              </div>
            </div>
          </div>
          <div className={s.dialogFoot}>
            <span className={s.grow} />
            <Btn>취소</Btn>
            <Primary>저장</Primary>
          </div>
        </div>
      </Frame>
    </>
  );
}

function W6B() {
  return (
    <Frame kind="desktop" label="1040 · B안 · 템플릿 바로 아래 «내 양식» 줄">
      <Step3
        inspector={
          <Inspector
            templateExtra={
              <div className={s.added}>
                <span className={s.addedLabel}>새로 생김 · 템플릿 아래</span>
                <div className={s.between}>
                  <span className={s.legend}>내 양식</span>
                  <TextBtn>관리</TextBtn>
                </div>
                <div className={s.chipRow}>
                  <Chip on>일일TEST 2단</Chip>
                  <Chip>주간 확인 풀이칸</Chip>
                  <Chip>단원평가 학교식</Chip>
                  <Chip>오답 다시 풀기</Chip>
                  <Chip>+ 지금 설정 저장</Chip>
                </div>
                <div className={s.confirm}>
                  «일일TEST 2단»에서 2곳 바뀜 · 단 · 보기 번호 배치
                  <div className={s.row}>
                    <Btn>양식에 덮어쓰기</Btn>
                    <TextBtn>새 이름으로</TextBtn>
                  </div>
                </div>
              </div>
            }
          />
        }
      />
    </Frame>
  );
}

function W6C() {
  return (
    <Frame kind="desktop" label="1040 · C안 · 새 시험지로 3단계에 들어왔을 때">
      <Step3
        inspector={
          <Inspector
            top={
              <div className={s.toast}>
                기본 양식으로 시작했습니다 · 10/12 저장
                <span className={s.grow} />
                <TextBtn>처음 값으로</TextBtn>
              </div>
            }
            bottom={
              <div className={s.added}>
                <span className={s.addedLabel}>
                  새로 생김 · [기본값으로 재설정] 자리
                </span>
                <span className={s.legend}>새 시험지 기본 양식</span>
                <span className={s.small}>
                  정통 · 2단 · 1단당 3문항 · 보기 자동 · 빠른 정답만 ·
                  인재원학원 · 출제자 박선생
                </span>
                <div className={s.row}>
                  <Btn>지금 설정을 기본 양식으로</Btn>
                  <Btn>기본 양식으로 되돌리기</Btn>
                </div>
                <TextBtn>처음 값으로 (정통 · 1단)</TextBtn>
              </div>
            }
          />
        }
      />
    </Frame>
  );
}

function W6D() {
  return (
    <Frame
      kind="desktop"
      label="1040 · D안 · [다른 시험지의 서식 가져오기]를 누른 뒤"
    >
      <Step3
        inspector={
          <Inspector
            top={
              <div className={s.added}>
                <span className={s.addedLabel}>새로 생김 · 설정 칸 맨 위</span>
                <Btn>다른 시험지의 서식 가져오기</Btn>
              </div>
            }
          />
        }
        overlay={
          <div className={s.scrim}>
            <div className={s.dialog640}>
              <div className={s.dialogHead}>
                <strong>서식을 가져올 시험지</strong>
                <span className={s.small}>내 시험지 · 최근 수정순</span>
                <Btn>닫기</Btn>
              </div>
              <div className={s.dialogBody}>
                <span className={s.fieldGrow}>시험지 이름으로 찾기</span>
                <div className={s.list}>
                  {[
                    ["10/15 · 중2 일차부등식 일일TEST", LAYOUTS[0].body],
                    ["10/14 · 중2-1 부등식 주간 확인", LAYOUTS[1].body],
                    ["9/30 · 중2 일차방정식 단원평가", LAYOUTS[2].body],
                    ["9/22 · 중2 9월 4주 오답", LAYOUTS[3].body],
                  ].map(([name, body]) => (
                    <div className={s.pickRow} key={name}>
                      <div>
                        <strong>{name}</strong>
                        <span className={s.small}>서식 · {body}</span>
                      </div>
                      <div className={s.pickActions}>
                        <Primary>이 서식 가져오기</Primary>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={s.rule}>
                  서식과 머리 정보의 고정 값만 가져옵니다. 고른 시험지는 바뀌지
                  않습니다. {APPLY_RULE.split(". ")[1]}
                </div>
              </div>
            </div>
          </div>
        }
      />
    </Frame>
  );
}

function W6Phone() {
  return (
    <Frame kind="phone" label="390 · A안 · 고르기 창이 화면을 다 덮는다">
      <div className={s.phoneTop}>
        <b>3 양식 구성·출력</b>
        <span className={s.grow} />
        <Primary>인쇄</Primary>
      </div>
      <div className={s.phoneBody}>
        <LayoutLine />
      </div>
      <div className={s.dialogFull}>
        <div className={s.dialogHead}>
          <strong>저장한 양식</strong>
          <Btn>닫기</Btn>
        </div>
        <div className={s.dialogBody}>
          <LayoutRows phone />
          <div className={s.rule}>{APPLY_RULE}</div>
        </div>
      </div>
    </Frame>
  );
}

/* ───────────── W7 제목 추천 ───────────── */

function SuggestRows({ confirmAt }: { confirmAt?: number }) {
  return (
    <div className={s.list}>
      {SUGGEST.map((row, i) => (
        <div key={row.label}>
          <div className={s.suggest}>
            <div>
              <span className={s.small}>{row.label}</span>
              <span>{row.text}</span>
            </div>
            <Btn>적용</Btn>
          </div>
          {confirmAt === i && (
            <div className={s.confirm}>
              직접 쓰신 제목 «중2A 화요일 시험»을 바꿉니다.
              <div className={s.row}>
                <Btn>바꾸기</Btn>
                <TextBtn>그대로 두기</TextBtn>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function W7A() {
  return (
    <Frame
      kind="desktop"
      label="1040 · A안 · 제목을 직접 쓴 뒤 둘째 추천의 [적용]을 눌렀을 때"
    >
      <Step3
        previewTitle="중2A 화요일 시험"
        inspector={
          <Inspector
            titleArea={
              <>
                <span className={s.metaField}>
                  제목
                  <span className={s.metaValue}>중2A 화요일 시험</span>
                </span>
                <div className={s.added}>
                  <span className={s.addedLabel}>새로 생김 · 제목 칸 아래</span>
                  <span className={s.legend}>추천 제목</span>
                  <SuggestRows confirmAt={1} />
                </div>
              </>
            }
          />
        }
      />
    </Frame>
  );
}

function W7B() {
  return (
    <Frame
      kind="desktop"
      label="1040 · B안 · [추천]을 누른 뒤 (제목은 직접 쓴 것)"
    >
      <Step3
        previewTitle="중2A 화요일 시험"
        inspector={
          <Inspector
            titleArea={
              <div className={s.metaField}>
                제목
                <div className={`${s.titleRow} ${s.relative}`}>
                  <span className={s.metaValue}>중2A 화요일 시험</span>
                  <span className={s.btnPrimary}>추천 ▾</span>
                  <div className={s.popover} style={{ top: 36, right: 0 }}>
                    <span className={s.addedLabel}>
                      새로 생김 · 제목 칸 옆 단추
                    </span>
                    <span className={s.warn}>
                      지금 제목은 직접 쓰신 것입니다. 고르면 바뀝니다.
                    </span>
                    {SUGGEST.map((row) => (
                      <div className={s.suggest} key={row.label}>
                        <div>
                          <span className={s.small}>{row.label}</span>
                          <span>{row.text}</span>
                        </div>
                        <Btn>이 제목으로</Btn>
                      </div>
                    ))}
                    <TextBtn>닫기</TextBtn>
                  </div>
                </div>
              </div>
            }
          />
        }
      />
    </Frame>
  );
}

function W7C() {
  return (
    <Frame
      kind="desktop"
      label="1040 · C안 · 제목 조각을 골라 짓기 (제목은 아직 기본값)"
    >
      <Step3
        inspector={
          <Inspector
            titleArea={
              <>
                <span className={s.metaField}>
                  제목
                  <span className={s.metaValueSoft}>{DEFAULT_TITLE}</span>
                </span>
                <div className={s.added}>
                  <span className={s.addedLabel}>새로 생김 · 제목 칸 아래</span>
                  <span className={s.legend}>제목 짓기 — 넣을 조각</span>
                  <div className={s.chipRow}>
                    <Chip on>학년 · 중2</Chip>
                    <Chip>과정 · 중2-1</Chip>
                    <Chip>대단원 · 부등식</Chip>
                    <Chip on>범위 · 일차부등식의 해와 성질 외 2</Chip>
                    <Chip on>종류 · 일일TEST</Chip>
                    <Chip on>날짜 · 10.16</Chip>
                  </div>
                  <span className={s.small}>이렇게 됩니다</span>
                  <span className={s.metaValue}>
                    중2 일차부등식의 해와 성질 외 2 일일TEST 10.16
                  </span>
                  <div className={s.row}>
                    <Primary>이 제목 쓰기</Primary>
                  </div>
                </div>
              </>
            }
          />
        }
      />
    </Frame>
  );
}

function W7D() {
  return (
    <Frame
      kind="desktop"
      label="1040 · D안 · 제목이 기본값 그대로인 채 [인쇄 / PDF 저장]을 눌렀을 때"
    >
      <Step3
        notice={
          <div className={s.wide}>
            <div className={s.added}>
              <span className={s.addedLabel}>
                새로 생김 · 저장 · 인쇄 · 내보내기를 누를 때만 (제목이 기본값일
                때)
              </span>
              <span>
                제목이 «{DEFAULT_TITLE}» 그대로입니다. 추천 —{" "}
                <b>{SUGGEST[0].text}</b>
              </span>
              <div className={s.row}>
                <Primary>이 제목으로 바꾸고 인쇄</Primary>
                <Btn>그대로 인쇄</Btn>
                <TextBtn>다른 추천 2</TextBtn>
              </div>
            </div>
          </div>
        }
        inspector={<Inspector />}
      />
    </Frame>
  );
}

function W7Phone() {
  return (
    <Frame
      kind="phone"
      label="390 · A안 · 설정 칸이 미리보기 위로 쌓인다 (제목은 기본값)"
    >
      <div className={s.phoneTop}>
        <b>3 양식 구성·출력</b>
        <span className={s.grow} />
        <Primary>인쇄</Primary>
      </div>
      <div className={s.phoneBody}>
        <div className={s.tabs}>
          <span className={s.tabOn}>서식 설정</span>
          <span className={s.tab}>문제 순서 · 20</span>
        </div>
        <span className={s.legend}>▾ 시험지 정보</span>
        <span className={s.metaField}>
          제목
          <span className={s.metaValueSoft}>{DEFAULT_TITLE}</span>
        </span>
        <div className={s.added}>
          <span className={s.legend}>추천 제목</span>
          <SuggestRows />
          <span className={s.small}>
            제목이 기본값이라 [적용]은 묻지 않고 바꿉니다.
          </span>
        </div>
        <div className={s.metaGrid}>
          <MetaField label="학교/기관명" value="인재원학원" />
          <MetaField label="학년" value="2학년" />
        </div>
      </div>
    </Frame>
  );
}

/* ───────────── W8 시험지 태그 ───────────── */

function LibHeader() {
  return (
    <div className={s.libHead}>
      <div>
        <strong>내 시험지</strong>
        <span className={s.small}>
          내 계정에 저장한 시험지와 추출 자료를 어느 기기에서든 이어서
          작업하세요.
        </span>
      </div>
      <Btn>작업 파일 불러오기</Btn>
      <Btn>새 시험지</Btn>
    </div>
  );
}

function KindTabs() {
  return (
    <div className={s.chipRow}>
      <Chip>전체 자료 52</Chip>
      <Chip on>시험지 38</Chip>
      <Chip>연산 연습지 6</Chip>
      <Chip>추출한 자료 5</Chip>
      <Chip>개념 백지 3</Chip>
    </div>
  );
}

function LibTools({ tagSelect }: { tagSelect?: boolean }) {
  return (
    <>
      <div className={s.row}>
        <Check>내 작업 중만 (4)</Check>
      </div>
      <div className={s.row}>
        <span className={s.fieldGrow}>자료 이름으로 찾기</span>
        {tagSelect && (
          <span className={s.addedFill}>
            <span className={s.field}>태그 · 일일TEST ▾</span>
          </span>
        )}
        <span className={s.field}>정렬 · 최근 수정순 ▾</span>
        <Btn>새로고침</Btn>
      </div>
    </>
  );
}

function LibTable({
  rows = LIB_ROWS,
  tagColumn,
  tagInTitle,
}: {
  rows?: LibRow[];
  tagColumn?: boolean;
  tagInTitle?: boolean;
}) {
  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th>번호</th>
          <th>종류</th>
          {tagColumn && <th>태그</th>}
          <th>자료 이름</th>
          <th className={s.num}>문항 수</th>
          <th>최근 수정</th>
          <th>관리</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.no}>
            <td>{r.no}</td>
            <td>
              <span className={s.tagSoft}>{r.kind}</span>
            </td>
            {tagColumn && (
              <td>
                {r.tag ? (
                  <span className={s.tag}>{r.tag}</span>
                ) : (
                  <span className={s.small}>—</span>
                )}
              </td>
            )}
            <td>
              <span className={s.titleCell}>
                <span>{r.title}</span>
                {tagInTitle && r.tag && <Btn>#{r.tag}</Btn>}
              </span>
            </td>
            <td className={s.num}>{r.count}</td>
            <td>{r.updated}</td>
            <td>
              <span className={s.row}>
                <TextBtn>열기</TextBtn>
                <TextBtn>수정</TextBtn>
                <TextBtn>삭제</TextBtn>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const COMPOSE =
  "종류 × 태그 × 내 작업 중만 × 검색은 모두 겹쳐 걸립니다. 태그 옆 수는 «그 태그를 고르면 몇 개 남나»입니다.";

function TagChipsSingle({ on = "일일TEST" }: { on?: string }) {
  return (
    <div className={s.chipRow}>
      <Chip on={!on}>없음</Chip>
      {STARTER_TAGS.map((t) => (
        <Chip key={t} on={t === on}>
          {t}
        </Chip>
      ))}
    </div>
  );
}

function W8A() {
  const rows = LIB_ROWS.filter((r) => r.tag === "일일TEST" || r.no === 1);
  return (
    <>
      <Frame
        kind="desktop"
        short
        label="1040 · A안 · 3단계 — 시험지 정보 맨 위"
      >
        <Step3
          inspector={
            <Inspector
              metaTop={
                <div className={s.added}>
                  <span className={s.addedLabel}>새로 생김 · 제목 위</span>
                  <span className={s.legend}>시험 종류</span>
                  <TagChipsSingle />
                </div>
              }
            />
          }
        />
      </Frame>
      <Frame
        kind="desktop"
        short
        label="1040 · A안 · 내 시험지 탭 — 종류 줄 아래 태그 줄"
      >
        <div className={s.lib}>
          <LibHeader />
          <KindTabs />
          <div className={s.added}>
            <span className={s.addedLabel}>
              새로 생김 · 종류 줄 아래 (종류가 전체 · 시험지 · 연산 연습지일
              때만)
            </span>
            <div className={s.chipRow}>
              <Chip>전체</Chip>
              {STARTER_TAGS.map((t) => (
                <Chip key={t} on={t === "일일TEST"}>
                  {t} {TAG_COUNTS[t]}
                </Chip>
              ))}
              <Chip>태그 없음 17</Chip>
            </div>
            <span className={s.small}>{COMPOSE}</span>
          </div>
          <LibTools />
          <span className={s.small}>저장한 자료 52개 · 검색 결과 12개</span>
          <LibTable rows={rows} />
        </div>
      </Frame>
    </>
  );
}

function W8B() {
  return (
    <>
      <Frame
        kind="desktop"
        short
        label="1040 · B안 · [내 시험지에 저장]을 누르면 — 모든 계정에 저장 창"
      >
        <Step3
          inspector={
            <Inspector
              metaTop={
                <span className={s.small}>
                  태그 — 저장할 때 정합니다 · 지금 없음
                </span>
              }
            />
          }
          overlay={
            <div className={s.scrim}>
              <div className={s.dialog560}>
                <div className={s.dialogHead}>
                  <strong>내 시험지에 저장</strong>
                  <Btn>닫기</Btn>
                </div>
                <div className={s.dialogBody}>
                  <dl className={s.facts}>
                    <dt>종류</dt>
                    <dd>시험지</dd>
                    <dt>저장 위치</dt>
                    <dd>내 시험지</dd>
                  </dl>
                  <div className={s.added}>
                    <span className={s.addedLabel}>새로 생김 · 저장 창</span>
                    <span className={s.legend}>태그 · 하나</span>
                    <TagChipsSingle on="주간TEST" />
                    <span className={s.row}>
                      <span className={s.field}>직접 입력 · 10자</span>
                      <span className={s.small}>
                        직접 쓴 태그는 다음부터 이 목록 끝에 나옵니다.
                      </span>
                    </span>
                  </div>
                  <span className={s.small}>
                    학원 공개 범위 · 학원 계정만 (지금 그대로)
                  </span>
                </div>
                <div className={s.dialogFoot}>
                  <span className={s.grow} />
                  <Btn>취소</Btn>
                  <Primary>저장 확인</Primary>
                </div>
              </div>
            </div>
          }
        />
      </Frame>
      <Frame
        kind="desktop"
        short
        label="1040 · B안 · 내 시험지 탭 — 태그 열 + 도구 줄의 [태그 ▾]"
      >
        <div className={s.lib}>
          <LibHeader />
          <KindTabs />
          <LibTools tagSelect />
          <span className={s.small}>
            저장한 자료 52개 · 검색 결과 12개 · {COMPOSE}
          </span>
          <LibTable tagColumn />
        </div>
      </Frame>
    </>
  );
}

function W8C() {
  return (
    <>
      <Frame
        kind="desktop"
        short
        label="1040 · C안 · 3단계 — 설정 칸 맨 위, 태그 여러 개 · 직접 입력"
      >
        <Step3
          inspector={
            <Inspector
              top={
                <div className={`${s.added} ${s.relative}`}>
                  <span className={s.addedLabel}>
                    새로 생김 · 설정 칸 맨 위
                  </span>
                  <div className={s.chipRow}>
                    <Chip on>일일TEST ×</Chip>
                    <Chip on>중2A반 ×</Chip>
                    <Chip>+ 태그</Chip>
                  </div>
                  <div className={s.popover} style={{ top: "100%", left: 0 }}>
                    <span className={s.fieldGrow}>태그 쓰기 · 중2</span>
                    <span className={s.small}>내가 쓴 태그</span>
                    <div className={s.chipRow}>
                      <Chip>중2A반</Chip>
                      <Chip>중2B반</Chip>
                    </div>
                    <span className={s.small}>처음 목록</span>
                    <div className={s.chipRow}>
                      {STARTER_TAGS.slice(0, 6).map((t) => (
                        <Chip key={t}>{t}</Chip>
                      ))}
                    </div>
                    <span className={s.small}>
                      Enter 로 «중2» 새 태그 · 한 시험지에 다섯 개까지
                    </span>
                  </div>
                </div>
              }
            />
          }
        />
      </Frame>
      <Frame
        kind="desktop"
        short
        label="1040 · C안 · 내 시험지 탭 — 왼쪽 태그 목록 (여러 개 고르면 «하나라도»)"
      >
        <div className={s.lib}>
          <LibHeader />
          <KindTabs />
          <div className={s.libTwo}>
            <div className={`${s.rail} ${s.added}`}>
              <span className={s.addedLabel}>새로 생김 · 왼쪽 목록</span>
              <span className={s.legend}>태그</span>
              <Check on>일일TEST 12</Check>
              <Check on>중2A반 9</Check>
              <Check>중2B반 7</Check>
              <Check>주간TEST 4</Check>
              <Check>숙제 6</Check>
              <Check>오답 5</Check>
              <Check>태그 없음 17</Check>
              <TextBtn>모두 풀기</TextBtn>
            </div>
            <div className={s.col}>
              <LibTools />
              <span className={s.small}>
                고른 태그 둘 가운데 하나라도 있는 자료 · 검색 결과 15개
              </span>
              <LibTable
                tagColumn
                rows={[
                  { ...LIB_ROWS[0], tag: "일일TEST · 중2A반" },
                  { ...LIB_ROWS[1], tag: "중2A반" },
                  {
                    ...LIB_ROWS[3],
                    no: 3,
                    title: "중2 일차부등식 일일TEST 10.15",
                    tag: "일일TEST",
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </Frame>
    </>
  );
}

function W8D() {
  const rows = LIB_ROWS.filter((r) => r.tag === "일일TEST");
  return (
    <>
      <Frame
        kind="desktop"
        short
        label="1040 · D안 · 단계 띠의 제목 옆 — 세 단계 어디서나 보인다"
      >
        <Step3
          lead={
            <div className={`${s.relative} ${s.addedFill}`}>
              <span className={s.btnPrimary}>일일TEST ▾</span>
              <div className={s.popover} style={{ top: 40, left: 0 }}>
                <span className={s.addedLabel}>새로 생김 · 단계 띠</span>
                <span className={s.legend}>시험 종류</span>
                <TagChipsSingle />
                <span className={s.small}>
                  1 · 2단계에서도 같은 자리에 있습니다.
                </span>
              </div>
            </div>
          }
          inspector={<Inspector />}
        />
      </Frame>
      <Frame
        kind="desktop"
        short
        label="1040 · D안 · 내 시험지 탭 — 행의 태그를 누르면 그 태그로 거른다"
      >
        <div className={s.lib}>
          <LibHeader />
          <KindTabs />
          <LibTools />
          <div className={s.filterOn}>
            <span className={s.addedLabel}>새로 생김 · 거를 때만</span>
            태그 <b>일일TEST</b> 로 거름 · 12개
            <Btn>풀기</Btn>
            <span className={s.small}>{COMPOSE}</span>
          </div>
          <LibTable tagInTitle rows={rows.length ? rows : LIB_ROWS} />
          <span className={s.small}>
            거르기 전 목록에서도 행마다 #태그 단추가 보입니다.
          </span>
          <LibTable tagInTitle rows={LIB_ROWS.slice(1, 4)} />
        </div>
      </Frame>
    </>
  );
}

function W8Phone() {
  return (
    <Frame
      kind="phone"
      label="390 · A안 · 내 시험지 탭 — 태그 줄이 접혀 두 줄이 된다"
    >
      <div className={s.phoneTop}>
        <b>내 시험지</b>
        <span className={s.grow} />
        <Btn>새 시험지</Btn>
      </div>
      <div className={s.phoneBody}>
        <KindTabs />
        <div className={s.added}>
          <div className={s.chipRow}>
            <Chip>전체</Chip>
            {STARTER_TAGS.slice(0, 6).map((t) => (
              <Chip key={t} on={t === "일일TEST"}>
                {t} {TAG_COUNTS[t]}
              </Chip>
            ))}
            <Chip>더 보기 3</Chip>
          </div>
        </div>
        <Check>내 작업 중만 (4)</Check>
        <span className={s.fieldGrow}>자료 이름으로 찾기</span>
        <span className={s.small}>검색 결과 12개</span>
        <div className={s.phoneRows}>
          {LIB_ROWS.filter((r) => r.tag === "일일TEST").map((r) => (
            <div key={r.no}>
              <span className={s.row}>
                <span className={s.tagSoft}>{r.kind}</span>
                <span className={s.tag}>{r.tag}</span>
              </span>
              <strong>{r.title}</strong>
              <span className={s.small}>
                {r.count}문항 · {r.updated} 수정
              </span>
            </div>
          ))}
          <div>
            <span className={s.row}>
              <span className={s.tagSoft}>시험지</span>
              <span className={s.tag}>일일TEST</span>
            </span>
            <strong>중2 일차부등식 일일TEST 10.15</strong>
            <span className={s.small}>8문항 · 10/15 수정</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ───────────── 화면 ───────────── */

export function OutputWire() {
  return (
    <main className={s.shell}>
      <header className={s.head}>
        <h1 className={s.h1}>3단계 «양식 구성·출력» 덧붙임 — Wire (D-07)</h1>
        <p className={s.note}>
          지금 3단계(왼쪽 설정 칸 340 · 오른쪽 미리보기)는 그대로 두고, 그 안에
          덧붙일 세 가지를 따로 고릅니다 — <b>W6 내 양식</b> ·{" "}
          <b>W7 제목 추천</b> · <b>W8 시험지 태그</b>. 갈래마다 4안이고,
          안끼리는 덧붙인 것의 <b>자리</b> · 누르는 수 · 처음에 보이는 것이
          다릅니다. 굵은 테두리가 새로 생긴 자리입니다. 점선은 설정 칸이 처음
          보이는 끝(1280×800 에서 680px)입니다 — 그 아래는 칸 안에서 스크롤해야
          보입니다.
        </p>
        <p className={s.note}>
          틀은 실제 폭입니다 — 작업실 본문 1040px(사이드바 240 제외)과 폰 390px.
          근거: 매쓰플랫 STEP 3(저장 템플릿 · 학습지 태그 27종) · 매쓰홀릭
          ③(제목 추천 3개 [적용] · 저장한 템플릿) 걸어 본 기록 (2026-10-16),
          그리고 막 들인 W5 «이름 붙인 출제 조건»의 저장 · 적용 · 목록 틀. 그림
          속 단추는 누를 수 없습니다.
        </p>
        <nav className={s.jump} aria-label="갈래 바로 가기">
          <a href="#w6">W6 내 양식</a>
          <a href="#w7">W7 제목 추천</a>
          <a href="#w8">W8 시험지 태그</a>
        </nav>
      </header>

      <section className={s.topic} id="w6" data-wire-topic="w6">
        <h2 className={s.h2}>W6 · 내 양식 저장 · 불러오기</h2>
        <ul className={s.must}>
          <li>
            양식은 <b>서식 설정 탭의 값</b>을 이름 붙여 담습니다. 적용은 한 번에
            — 담긴 값을 통째로 덮습니다(고른 칸만 덮지 않습니다).
          </li>
          <li>
            적용한 뒤 무엇이든 바꾸면 «적용함»이 «직접 정함»으로 바뀝니다(W5 와
            같은 규칙).
          </li>
          <li>
            시험일 · 학년 · 학기는 <b>값을 담지 않습니다</b>. 날짜를 지면에
            찍을지(«날짜 표시»)만 담고, 빈 칸이면 지금처럼 지면이 그날 날짜 ·
            범위의 학년으로 채웁니다.
          </li>
          <li>
            저장 자리 — 이름 붙인 목록(A · B)과 기본 양식 하나(C)는 새 저장
            종류가 필요합니다. D 는 이미 저장된 시험지의 서식을 읽어 새 저장이
            없습니다.
          </li>
        </ul>
        <table className={s.saveTable}>
          <tbody>
            <tr>
              <th>담는 서식</th>
              <td>
                템플릿 · 폰트 · 강조 색상 · 1단/2단 · 단 사이 구분선 · 오른쪽
                풀이 공간 · 쪽 여백 · 세로 배치(여백 지정 / 문항 수 지정과 그
                값) · 보기 번호 배치 · 표시 옵션 넷(날짜 · 문항 단원명 · 난이도
                라벨 · 배점 숨기기) · 정답 · 해설지 포함 · 빠른 정답만
              </td>
            </tr>
            <tr>
              <th>담는 머리 정보 (값까지)</th>
              <td>
                학교/기관명 · 과목 · 시험 시간 · 출제자 · 총점 · 학원명 · 강사명
                — 학원에서 잘 안 바뀌는 값
              </td>
            </tr>
            <tr>
              <th>담지 않음</th>
              <td>
                문항 · 문제 순서 · 제목 · 시험일 · 학년 · 학기 · 오늘의 목표 ·
                개념 정리 · 유형명 · 핵심 전략(시험지마다 다른 글) · 태그(W8)
              </td>
            </tr>
          </tbody>
        </table>
        <Option
          id="w6-a"
          title="A · 설정 칸 맨 위 한 줄 + 고르기 창 (W5 와 같은 틀)"
          idea="설정 칸 맨 위에 «양식 — {이름} 적용함 / 직접 정함» 한 줄과 [저장한 양식 · n] · [양식 저장]. 목록은 공용 고르기 창(PickerDialog)이고 행마다 적용 · 이름 바꾸기 · 기본으로 · 삭제. 저장 창에서 담는 것과 담지 않는 것을 글로 보여 주고, «새 시험지의 기본 양식으로»를 고를 수 있다. 1단계의 «출제 조건» 줄과 모양 · 낱말 · 동작이 같다."
          cost="적용할 때마다 창을 연다. 설정 칸 맨 위 한 줄만큼 템플릿이 아래로 밀린다(약 90px). 양식이 쌓이면 이름 정리가 일이 된다 — 50개 상한."
          clicks="쓸 때 = [저장한 양식] → [적용] 2번. 처음 저장 = [양식 저장] → 이름 → [저장] 3번. 기본 양식이 있으면 새 시험지는 0번."
        >
          <W6A />
        </Option>
        <Option
          id="w6-b"
          title="B · 템플릿 바로 아래 «내 양식» 칩 줄"
          idea="매쓰홀릭 «저장한 템플릿 적용»을 칩으로. 템플릿 여섯 칸 아래에 내 양식이 늘 보이고 칩 하나가 곧 적용이다. 적용한 뒤 바꾼 곳이 있으면 그 자리에서 [양식에 덮어쓰기] · [새 이름으로]. 이름 바꾸기 · 삭제는 [관리]가 A 의 목록 창을 연다."
          cost="«템플릿»(정통 · 모던 …)과 «내 양식»이 붙어 있어 둘이 다른 것(양식은 템플릿을 포함)임이 흐려진다. 양식이 다섯을 넘으면 칩 줄이 길어져 그 아래 시험지 정보가 더 밀린다. 칩을 잘못 누르면 서식이 통째로 바뀐다 — 되돌리기 줄이 필요하다."
          clicks="쓸 때 = 칩 1번. 고친 뒤 덮어쓰기 = 1번. 처음 저장 = [+ 지금 설정 저장] → 이름 → [저장] 3번."
        >
          <W6B />
        </Option>
        <Option
          id="w6-c"
          title="C · 기본 양식 하나만 — [기본값으로 재설정] 자리"
          idea="목록을 만들지 않는다. 설정 칸 맨 아래 [기본값으로 재설정]을 «새 시험지 기본 양식» 묶음으로 바꾼다: [지금 설정을 기본 양식으로] · [기본 양식으로 되돌리기] · [처음 값으로]. 새 시험지는 기본 양식으로 열리고 맨 위에 한 줄로 알린다. 늘 같은 지면을 쓰는 학원이면 다시 누를 일이 없다."
          cost="양식이 하나뿐이라 일일과 주간 지면이 다르면 매번 손으로 바꾼다. 묶음이 점선 아래(스크롤해야 보이는 곳)에 있어 처음엔 모른다. «기본값»이라는 낱말이 «처음 값»과 «내 기본 양식» 두 뜻으로 갈린다."
          clicks="처음 1회 = 스크롤 → [지금 설정을 기본 양식으로] 1번. 그 뒤 새 시험지마다 0번."
        >
          <W6C />
        </Option>
        <Option
          id="w6-d"
          title="D · 이름 없이 — 다른 시험지의 서식 가져오기"
          idea="양식이라는 새 물건을 만들지 않는다. 설정 칸 맨 위 [다른 시험지의 서식 가져오기]가 내 시험지 목록을 고르기 창으로 열고, 행마다 그 시험지의 서식 요약과 [이 서식 가져오기]. 시험지에 이미 서식이 저장돼 있어 저장 자리가 늘지 않는다(W5 의 A 와 같은 생각)."
          cost="«늘 쓰는 그 양식»을 시험지 이름 · 날짜로 찾아야 한다. 그 시험지를 지우면 양식도 사라진다. 기본 양식(새 시험지에 저절로)은 이 안으로는 안 된다. 목록이 서식 요약을 보이려면 목록 응답에 서식 요약을 실어야 한다."
          clicks="쓸 때 = [다른 시험지의 서식 가져오기] → [이 서식 가져오기] 2번(+ 찾기). 저장 0번."
        >
          <W6D />
        </Option>
        <W6Phone />
      </section>

      <section className={s.topic} id="w7" data-wire-topic="w7">
        <h2 className={s.h2}>W7 · 제목 추천</h2>
        <ul className={s.must}>
          <li>
            추천은 시험지에서 읽은 값만 씁니다 — 학년 · 과정 · 대단원 · 범위
            이름(첫 범위 + «외 n») · 날짜(시험일, 비었으면 오늘) · 시험 종류(W8
            을 고르시면). W8 이 없으면 종류 조각만 빠집니다.
          </li>
          <li>
            추천은 <b>단추를 눌러야만</b> 들어갑니다. 제목이 기본값 «
            {DEFAULT_TITLE}»이면 바로 바꾸고, 직접 쓰신 제목이면 바꾸기 전에 그
            자리에서 묻습니다.
          </li>
          <li>
            제목 칸과 지면의 제목은 지금처럼 한 값입니다 — 추천을 적용하면 둘이
            같이 바뀝니다.
          </li>
        </ul>
        <Option
          id="w7-a"
          title="A · 제목 칸 아래 추천 세 줄, 줄마다 [적용]"
          idea="매쓰홀릭 ③ 그대로의 구조. 제목 칸 바로 아래에 «범위 이름 / 과정 · 대단원 · 날짜 / 날짜 먼저» 세 줄이 늘 보이고 줄마다 [적용]. 직접 쓴 제목이 있으면 [적용]이 그 줄 아래에 «바꿉니다 · [바꾸기] [그대로 두기]»를 편다."
          cost="340 칸에서 긴 제목이 두 줄로 접혀 세 줄이 약 150px 를 쓴다 — 시험지 정보의 나머지 칸이 점선 아래로 밀린다. 제목을 다 정한 뒤에도 늘 보인다."
          clicks="제목이 기본값 = [적용] 1번. 직접 쓴 제목 = [적용] → [바꾸기] 2번."
        >
          <W7A />
        </Option>
        <Option
          id="w7-b"
          title="B · 제목 칸 옆 [추천 ▾] — 눌러야 펼친다"
          idea="제목 칸 오른쪽에 단추 하나. 누르면 칸 아래에 작은 목록이 펴지고 줄마다 [이 제목으로]. 제목을 직접 쓴 상태면 목록 맨 위에 «고르면 바뀝니다»를 먼저 적어, 고르는 것 자체가 확인이 된다. 평소에는 칸이 지금과 같다."
          cost="단추를 모르면 추천이 있는 줄 모른다. 제목 칸이 단추만큼 좁아진다(약 70px). 펼친 목록이 아래 칸들을 가린다."
          clicks="[추천] → [이 제목으로] 2번(제목이 기본값이든 아니든 같음)."
        >
          <W7B />
        </Option>
        <Option
          id="w7-c"
          title="C · 조각을 골라 제목 짓기"
          idea="정해진 세 문장 대신 조각(학년 · 과정 · 대단원 · 범위 · 종류 · 날짜)을 켜고 끄면 «이렇게 됩니다» 한 줄이 바로 바뀌고 [이 제목 쓰기]. 학원마다 쓰는 제목 꼴이 달라도 맞출 수 있다. 다음 시험지는 지난번에 켠 조각으로 시작한다."
          cost="칩 여섯 + 결과 줄 + 단추라 A 보다 더 길다(약 190px). 조각의 차례는 못 바꾼다(바꾸게 하면 또 한 겹). 한 번 맞춘 뒤에는 쓸 일이 적은데 자리를 늘 차지한다."
          clicks="조각을 그대로 두면 [이 제목 쓰기] 1번. 조각 하나 바꿀 때마다 +1. 직접 쓴 제목이면 +1(묻기)."
        >
          <W7C />
        </Option>
        <Option
          id="w7-d"
          title="D · 기본값 그대로 내보낼 때만 묻는다"
          idea="3단계 화면에는 아무것도 늘지 않는다. 제목이 «오늘 수학 학습지» 그대로인 채 저장 · 인쇄 · 내보내기를 누르면 단계 띠 아래에 한 줄이 뜬다 — 추천 하나와 [이 제목으로 바꾸고 인쇄] · [그대로 인쇄]. 제목을 직접 쓰신 시험지에서는 절대 나오지 않는다."
          cost="인쇄하려던 손을 한 번 멈춘다 — 매일 쓰면 귀찮을 수 있다. 미리 보고 고를 수 없고, 다른 추천은 한 번 더 눌러야 본다. 제목을 고치려면 결국 설정 칸으로 가야 한다."
          clicks="기본값일 때만 +1([이 제목으로 바꾸고 인쇄]가 곧 인쇄). 직접 쓴 제목 = 0."
        >
          <W7D />
        </Option>
        <W7Phone />
      </section>

      <section className={s.topic} id="w8" data-wire-topic="w8">
        <h2 className={s.h2}>W8 · 시험지 태그</h2>
        <ul className={s.must}>
          <li>
            처음 목록 여덟 개 — {STARTER_TAGS.join(" · ")}. 매쓰플랫의 27종에서
            학원 운영에 쓰는 것만 남겼습니다. 직접 입력은 안마다 다릅니다(A · D
            없음 · B 하나 · C 여러 개).
          </li>
          <li>
            태그는 <b>시험지 · 연산 연습지</b>에 붙습니다(3단계를 같이 쓰는 둘).
            추출한 자료 · 개념 백지에는 없어서, 그 종류를 고르면 태그 거름이
            사라집니다.
          </li>
          <li>
            태그는 <b>지면에 찍지 않습니다</b> — 학원 안에서 찾고 거르는
            용도입니다. 찍을지는 따로 여쭙니다.
          </li>
          <li>
            내 시험지 탭에서 종류 · 태그 · «내 작업 중만» · 검색은 모두 겹쳐
            걸립니다(지금 종류 · 내 작업 중만 · 검색이 겹치는 것과 같은 규칙).
          </li>
        </ul>
        <Option
          id="w8-a"
          title="A · 시험지 정보 맨 위 «시험 종류» 칩 — 하나만, 처음 목록만"
          idea="3단계 시험지 정보의 제목 바로 위에 칩 한 줄(없음 + 여덟). 하나만 고른다. 내 시험지 탭은 종류 줄 바로 아래에 같은 여덟 개가 수와 함께 칩 줄로 서고, «태그 없음»도 하나의 칩이다. 고르는 자리와 거르는 자리가 같은 모양이다."
          cost="직접 입력이 없어 «중2A반»처럼 학원마다 다른 이름은 못 붙인다. 칩 아홉 개가 설정 칸에서 두 줄(약 70px)을 쓴다. 목록 탭에 칩 줄이 하나 더 는다."
          clicks="붙이기 = 칩 1번. 거르기 = 칩 1번(종류 · 내 작업 중만과 함께 걸림)."
        >
          <W8A />
        </Option>
        <Option
          id="w8-b"
          title="B · 저장 창에서 정함 + 목록은 태그 열과 [태그 ▾]"
          idea="3단계 설정 칸은 거의 그대로이고 «저장할 때 정합니다» 한 줄만. [내 시험지에 저장]이 모든 계정에 저장 창을 열고(지금은 학원 계정만 열린다) 그 안에서 태그 하나를 고르거나 직접 쓴다. 내 시험지 탭은 표에 «태그» 열, 도구 줄의 검색 옆에 [태그 ▾] 고르기."
          cost="개인 계정은 지금 저장이 한 번에 끝나는데 창이 하나 끼어 매번 +1. 인쇄만 하고 저장 안 한 시험지에는 태그가 없다. 표 열이 하나 늘어 1040 에서 자료 이름 칸이 좁아진다."
          clicks="붙이기 = [저장] → 칩 → [저장 확인] 3번(지금보다 +2). 거르기 = [태그 ▾] → 고르기 2번."
        >
          <W8B />
        </Option>
        <Option
          id="w8-c"
          title="C · 여러 개 · 직접 입력 — 목록은 왼쪽 태그 칸"
          idea="태그를 학원 말로 자유롭게 — 시험 종류와 반을 같이 붙인다(«일일TEST» + «중2A반»). 3단계 설정 칸 맨 위 [+ 태그]가 입력 칸과 «내가 쓴 태그 / 처음 목록»을 펼친다. 내 시험지 탭은 표 왼쪽에 태그 목록(수 포함)을 세우고 여럿을 고르면 «하나라도 있는 자료»."
          cost="«일일TEST» · «일일 테스트» · «일테»처럼 같은 뜻이 여러 이름으로 갈린다 — 이름 바꾸기 · 합치기가 결국 필요하다. 왼쪽 칸 184px 만큼 표가 좁아진다. «하나라도» / «모두»를 헷갈릴 수 있다."
          clicks="처음 목록에서 붙이기 = [+ 태그] → 칩 2번. 새 태그 = [+ 태그] → 쓰기 → Enter. 거르기 = 체크 1번씩."
        >
          <W8C />
        </Option>
        <Option
          id="w8-d"
          title="D · 단계 띠의 제목 옆 배지 — 행의 태그를 눌러 거른다"
          idea="태그를 설정 칸이 아니라 단계 띠(«시험지 만들기» 옆)에 둔다 — 1 · 2 · 3단계 어디서나 같은 자리에 보이고, 1단계에서 정하면 W7 추천에 처음부터 들어간다. 내 시험지 탭에는 거름 줄을 미리 두지 않고, 행마다 #태그 단추를 눌러야 «태그 일일TEST 로 거름 · [풀기]» 한 줄이 생긴다."
          cost="띠가 이미 단추 넷으로 차 있어 1040 에서 더 빽빽하다. 거르는 길이 행 안에 숨어 있어 «태그로 거를 수 있다»를 처음엔 모른다. 행마다 단추가 하나씩 늘어 표가 시끄럽다."
          clicks="붙이기 = [태그 ▾] → 칩 2번. 거르기 = 행의 #태그 1번, 풀기 1번."
        >
          <W8D />
        </Option>
        <W8Phone />
      </section>
    </main>
  );
}
