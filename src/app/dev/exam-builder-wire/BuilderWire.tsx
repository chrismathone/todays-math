import type { ReactNode } from "react";

import s from "./BuilderWire.module.css";

/**
 * 시험지 만들기 개선 Wire — W3 교체 · W4 범위 구성 · W5 출제 조건 재사용.
 *
 * 안끼리 다른 것은 **구조**다(조작이 어디 있나 · 몇 번 누르나 · 처음에 무엇이 보이나).
 * 색은 안 쓴다. 문구는 실제로 쓸 말로 적는다(D-08 — 간결 · 사무적 · 느낌표 없음).
 */

/* ───────────── 픽스처 (지어낸 예 — 실제 문항 · 계정이 아니다) ───────────── */

const LADDER = ["연산", "기본", "응용", "심화하", "심화중", "심화상"] as const;

const SHEET = [
  { no: "06", meta: "일차부등식의 풀이 · 기본 · 단답형" },
  { no: "07", meta: "일차부등식의 활용 · 응용 · 객관식" },
  { no: "08", meta: "일차부등식의 활용 · 심화하 · 서술형" },
];

const FAMILY = [
  { meta: "일차부등식의 활용 · 응용 · 객관식", note: "같은 문항류 2/4" },
  { meta: "일차부등식의 활용 · 응용 · 객관식", note: "같은 문항류 3/4" },
  { meta: "일차부등식의 활용 · 응용 · 단답형", note: "같은 문항류 4/4" },
];

const OTHERS = [
  { meta: "일차부등식의 활용 · 응용 · 객관식 · 교과서 비상" },
  { meta: "일차부등식의 활용 · 응용 · 단답형 · 자체 문항" },
];

type ScopeRow = {
  label: string;
  detail: string;
  avail: number;
  count: number;
  fixed?: boolean;
  tiers?: string;
};

const SCOPES: ScopeRow[] = [
  {
    label: "일차부등식의 해와 성질",
    detail: "중2-1 · 부등식",
    avail: 48,
    count: 6,
    tiers: "기본 – 응용",
  },
  {
    label: "일차부등식의 풀이",
    detail: "중2-1 · 부등식",
    avail: 62,
    count: 8,
    fixed: true,
    tiers: "기본 – 심화하",
  },
  {
    label: "일차부등식의 활용",
    detail: "중2-1 · 부등식",
    avail: 35,
    count: 6,
    tiers: "응용 – 심화하",
  },
];

const RECENT_RULE =
  "최근 14일 안에 시험 날짜가 있는 내 시험지의 문항은 고르지 않습니다 — 일일테스트와 같은 규칙입니다.";

const D111 =
  "이 시험지의 다른 자리와 같은 문항류는 뺐습니다 · 4문항. 바꿀 문항의 문항류는 남깁니다.";

const TEXTBOOK =
  "교과서 문항을 바꿀 때 — «지정 복습 변형 2/2 준비 · 일반 유사문항과 별도»는 지금처럼 문항 카드에 따로 둡니다. 이 후보 목록에 섞지 않습니다.";

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

function Card({
  no,
  meta,
  bars = 3,
  variant = "plain",
  tag,
  children,
}: {
  no?: string;
  meta: string;
  bars?: number;
  variant?: "plain" | "focus" | "ghost";
  tag?: ReactNode;
  children?: ReactNode;
}) {
  const cls =
    variant === "focus"
      ? s.cardFocus
      : variant === "ghost"
        ? s.cardGhost
        : s.card;
  return (
    <article className={cls}>
      <div className={s.cardTop}>
        {no && <span className={s.no}>{no}</span>}
        <span className={s.small}>{meta}</span>
        {tag}
      </div>
      <Bars n={bars} />
      {children && <div className={s.cardActions}>{children}</div>}
    </article>
  );
}

function StepBar({ step }: { step: 1 | 2 }) {
  return (
    <div className={s.stepBar}>
      <b>시험지 만들기</b>
      <span className={step === 1 ? s.stepOn : undefined}>1 범위 설정</span>
      <span className={step === 2 ? s.stepOn : undefined}>2 문항 검토</span>
      <span>3 양식 구성·출력</span>
      <span className={s.grow} />
      {step === 2 && <Primary>다음: 양식 구성·출력 →</Primary>}
    </div>
  );
}

function Frame({
  kind,
  label,
  children,
}: {
  kind: "desktop" | "phone";
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={s.scrollX}>
      <p className={s.frameLabel}>{label}</p>
      <div
        className={`${s.frame} ${kind === "desktop" ? s.desktop : s.phone}`}
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

/** 왼쪽 설정 칸 — W3 의 뒤 화면용(지금 모습 그대로). */
function SettingsNow() {
  return (
    <div className={s.col}>
      <div className={s.panel}>
        <div className={s.row}>
          <span className={s.muted}>제목</span>
          <span className={s.fieldGrow}>중2 일차부등식 확인</span>
        </div>
      </div>
      <div className={s.panel}>
        <div className={s.panelHead}>
          <strong>출제 범위</strong>
          <span className={s.tagSoft}>3개 선택</span>
          <span className={s.grow} />
          <Btn>범위 변경</Btn>
        </div>
        <ScopeTable />
        <div className={s.foot}>
          <strong>합계 20문항</strong>
          <span className={s.grow} />
          <Primary>문항 검토 →</Primary>
        </div>
      </div>
    </div>
  );
}

function ScopeTable({ tiers, fixed }: { tiers?: boolean; fixed?: boolean }) {
  return (
    <table className={s.table}>
      <thead>
        <tr>
          <th>선택한 출제 범위</th>
          {tiers && <th>난이도</th>}
          <th>구성 수</th>
          <th>{fixed ? "" : "구성됨"}</th>
        </tr>
      </thead>
      <tbody>
        {SCOPES.map((row) => (
          <tr
            key={row.label}
            className={fixed && row.fixed ? s.rowFixed : undefined}
          >
            <td>
              <strong>{row.label}</strong>
              <small>
                {row.detail} · 출제 가능 {row.avail}문항
              </small>
            </td>
            {tiers && (
              <td>
                <span className={s.field}>{row.tiers} ▾</span>
              </td>
            )}
            <td>
              <span className={s.stepper}>
                <span>−</span>
                <span>{row.count}</span>
                <span>+</span>
              </span>
            </td>
            <td>
              {fixed && row.fixed ? (
                <span className={s.row}>
                  <span className={s.tag}>고정</span>
                  <TextBtn>풀기</TextBtn>
                </span>
              ) : fixed ? (
                <span className={s.small}>자동 배분</span>
              ) : (
                <span className={s.small}>{row.count}문항</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReviewNow({ focus07 }: { focus07?: boolean }) {
  return (
    <div className={s.col}>
      <div className={s.panel}>
        <div className={s.panelHead}>
          <strong>구성한 문항</strong>
          <span className={s.tagSoft}>20</span>
          <span className={s.grow} />
          <TextBtn>↶ 되돌리기</TextBtn>
          <Btn>+ 문항 추가</Btn>
        </div>
      </div>
      {SHEET.map((q) => (
        <Card
          key={q.no}
          no={q.no}
          meta={q.meta}
          variant={focus07 && q.no === "07" ? "focus" : "plain"}
        >
          <Btn>교체</Btn>
          <Btn>삭제</Btn>
          <Btn>↑</Btn>
          <Btn>↓</Btn>
        </Card>
      ))}
    </div>
  );
}

function ReviewStub() {
  return (
    <div className={s.col}>
      <div className={s.stub}>
        2 문항 검토 칸 — 이번 안에서 바뀌지 않음
        <br />
        (구성한 문항 · 교체 · 삭제 · 순서)
      </div>
    </div>
  );
}

/* ───────────── W3 교체 개선 ───────────── */

function PinnedOriginal({ bars = 4 }: { bars?: number }) {
  return (
    <div className={s.pinned}>
      <div className={s.between}>
        <strong>바꿀 문항 · 07번</strong>
        <span className={s.small}>일차부등식의 활용 · 응용 · 객관식</span>
      </div>
      <Bars n={bars} />
      <span className={s.small}>교체해도 07번 자리와 순서는 그대로입니다.</span>
    </div>
  );
}

function DifficultyChips({ current = "응용" }: { current?: string }) {
  return (
    <div className={s.row}>
      <Chip>전체 난이도</Chip>
      {LADDER.map((t) => (
        <Chip key={t} on={t === current}>
          {t}
        </Chip>
      ))}
    </div>
  );
}

function W3A() {
  return (
    <Frame
      kind="desktop"
      label="1280 화면 · 작업실 본문 1040px · 07번 [교체]를 누른 직후"
    >
      <StepBar step={2} />
      <div className={s.layout}>
        <SettingsNow />
        <ReviewNow focus07 />
      </div>
      <div className={s.scrim}>
        <div className={s.dialog880}>
          <div className={s.dialogHead}>
            <strong>문항 교체</strong>
            <Btn>닫기</Btn>
          </div>
          <div className={s.dialogBody}>
            <PinnedOriginal bars={3} />
            <div className={s.layerHead}>
              <strong>같은 문항류 · 3문항</strong>
              <span className={s.small}>
                같은 차시 · 같은 문항류의 다른 변형입니다. 숫자 · 조건만
                다릅니다.
              </span>
            </div>
            <div className={s.grid3}>
              {FAMILY.map((f) => (
                <Card
                  key={f.note}
                  meta={f.meta}
                  bars={2}
                  tag={<span className={s.tagSoft}>{f.note}</span>}
                >
                  <Primary>이 문항으로 교체</Primary>
                </Card>
              ))}
            </div>
            <div className={s.layerHead}>
              <strong>같은 차시의 다른 문항 · 18문항</strong>
              <span className={s.small}>
                바꿀 문항의 난이도(응용)로 시작합니다.
              </span>
            </div>
            <DifficultyChips />
            <div className={s.row}>
              <span className={s.field}>출제 범위 · 일차부등식의 활용 ▾</span>
              <span className={s.fieldGrow}>문제 내용으로 검색</span>
            </div>
            <div className={s.grid2}>
              {OTHERS.map((o) => (
                <Card key={o.meta} meta={o.meta} bars={2}>
                  <Primary>이 문항으로 교체</Primary>
                </Card>
              ))}
            </div>
          </div>
          <div className={s.dialogFoot}>
            <span className={s.small}>{D111}</span>
            <span className={s.grow} />
            <Btn>이전</Btn>
            <span className={s.small}>1 / 9</span>
            <Btn>다음</Btn>
            <Btn>취소</Btn>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function W3B() {
  return (
    <Frame
      kind="desktop"
      label="1280 화면 · 작업실 본문 1040px · 후보 하나를 [대조]한 상태"
    >
      <StepBar step={2} />
      <div className={s.layout}>
        <SettingsNow />
        <ReviewNow focus07 />
      </div>
      <div className={s.scrim}>
        <div className={s.dialog880}>
          <div className={s.dialogHead}>
            <strong>문항 교체 · 07번</strong>
            <Btn>닫기</Btn>
          </div>
          <div className={`${s.dialogBody} ${s.split}`}>
            <div className={s.col}>
              <PinnedOriginal bars={5} />
              <div className={s.pinned}>
                <div className={s.between}>
                  <strong>대조할 후보</strong>
                  <span className={s.small}>
                    같은 문항류 2/4 · 응용 · 객관식
                  </span>
                </div>
                <Bars n={5} />
                <div className={s.cardActions}>
                  <Primary>이 문항으로 교체</Primary>
                </div>
              </div>
            </div>
            <div className={s.col}>
              <div className={s.row}>
                <Chip on>같은 문항류 3</Chip>
                <Chip>같은 차시의 다른 문항 18</Chip>
              </div>
              <span className={s.small}>
                같은 차시 · 같은 문항류의 다른 변형입니다.
              </span>
              <div className={s.list}>
                {FAMILY.map((f, i) => (
                  <div className={s.listRow} key={f.note}>
                    <div>
                      <span className={s.small}>
                        {f.note} · {f.meta}
                      </span>
                      <Bars n={1} />
                    </div>
                    {i === 0 ? (
                      <span className={s.tag}>대조 중</span>
                    ) : (
                      <Btn>대조</Btn>
                    )}
                  </div>
                ))}
              </div>
              <div className={s.warn}>
                «같은 차시의 다른 문항»을 고르면 이 자리에 난이도 단추(응용으로
                시작) · 출제 범위 · 검색이 나오고 목록이 바뀝니다.
              </div>
            </div>
          </div>
          <div className={s.dialogFoot}>
            <span className={s.small}>{D111}</span>
            <span className={s.grow} />
            <Btn>취소</Btn>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function W3C() {
  return (
    <Frame
      kind="desktop"
      label="1280 화면 · 작업실 본문 1040px · 07번 [교체]가 카드 아래로 펼쳐진 상태(창 없음)"
    >
      <StepBar step={2} />
      <div className={s.layout}>
        <SettingsNow />
        <div className={s.col}>
          <div className={s.panel}>
            <div className={s.panelHead}>
              <strong>구성한 문항</strong>
              <span className={s.tagSoft}>20</span>
              <span className={s.grow} />
              <TextBtn>↶ 되돌리기</TextBtn>
              <Btn>+ 문항 추가</Btn>
            </div>
          </div>
          <Card no="06" meta={SHEET[0].meta}>
            <Btn>교체</Btn>
            <Btn>삭제</Btn>
          </Card>
          <Card no="07" meta={SHEET[1].meta} variant="focus">
            <span className={s.tag}>교체 후보 펼침</span>
            <Btn>접기</Btn>
          </Card>
          <div className={s.panel}>
            <div className={s.between}>
              <strong>같은 문항류 · 3문항</strong>
              <span className={s.small}>같은 차시 · 숫자 · 조건만 다름</span>
            </div>
            {FAMILY.map((f) => (
              <Card key={f.note} meta={`${f.note} · ${f.meta}`} bars={2}>
                <Btn>이 문항으로 교체</Btn>
              </Card>
            ))}
            <div className={s.between}>
              <span className={s.small}>{D111}</span>
              <Btn>같은 차시의 다른 문항에서 찾기</Btn>
            </div>
          </div>
          <Card no="08" meta={SHEET[2].meta}>
            <Btn>교체</Btn>
            <Btn>삭제</Btn>
          </Card>
        </div>
      </div>
    </Frame>
  );
}

function W3D() {
  return (
    <Frame
      kind="desktop"
      label="1280 화면 · 작업실 본문 1040px · 한 번 교체한 뒤에도 창이 열려 있는 상태"
    >
      <StepBar step={2} />
      <div className={s.layout}>
        <SettingsNow />
        <ReviewNow focus07 />
      </div>
      <div className={s.scrim}>
        <div className={s.dialog880}>
          <div className={s.dialogHead}>
            <strong>문항 교체 · 07번</strong>
            <Btn>완료</Btn>
          </div>
          <div className={s.dialogBody}>
            <div className={s.toast}>
              07번을 바꿨습니다.
              <TextBtn>원래 문항으로 되돌리기</TextBtn>
            </div>
            <div className={s.grid2}>
              <Card
                meta="지금 07번 · 같은 문항류 2/4 · 응용 · 객관식"
                variant="focus"
                bars={3}
              />
              <Card
                meta="원래 문항 · 같은 문항류 1/4 · 응용 · 객관식"
                variant="ghost"
                bars={3}
              >
                <Btn>다시 이 문항으로</Btn>
              </Card>
            </div>
            <div className={s.row}>
              <Chip on>같은 문항류 2</Chip>
              <Chip>같은 차시의 다른 문항 18</Chip>
              <span className={s.grow} />
              <span className={s.small}>난이도 · 응용 (바꿀 문항 기준)</span>
            </div>
            <div className={s.grid3}>
              {FAMILY.slice(1).map((f) => (
                <Card
                  key={f.note}
                  meta={f.meta}
                  bars={2}
                  tag={<span className={s.tagSoft}>{f.note}</span>}
                >
                  <Primary>이 문항으로 교체</Primary>
                </Card>
              ))}
              <div className={s.stub}>
                원래 문항은 위 «원래 문항» 칸으로 옮겨 둡니다.
              </div>
            </div>
          </div>
          <div className={s.dialogFoot}>
            <span className={s.small}>{D111}</span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function W3Phone() {
  return (
    <Frame kind="phone" label="390 화면 · A안 · 창이 화면을 다 덮는다">
      <div className={s.dialogFull}>
        <div className={s.dialogHead}>
          <strong>문항 교체</strong>
          <Btn>닫기</Btn>
        </div>
        <div className={s.dialogBody}>
          <PinnedOriginal bars={3} />
          <div className={s.layerHead}>
            <strong>같은 문항류 · 3문항</strong>
          </div>
          {FAMILY.slice(0, 2).map((f) => (
            <Card key={f.note} meta={`${f.note} · 응용`} bars={2}>
              <Primary>이 문항으로 교체</Primary>
            </Card>
          ))}
          <TextBtn>같은 문항류 1문항 더 보기</TextBtn>
          <div className={s.layerHead}>
            <strong>같은 차시의 다른 문항 · 18</strong>
          </div>
          <div className={s.row}>
            <span className={s.field}>난이도 · 응용 ▾</span>
            <span className={s.field}>범위 · 일차부등식의 활용 ▾</span>
          </div>
          <Card meta={OTHERS[0].meta} bars={2}>
            <Primary>이 문항으로 교체</Primary>
          </Card>
          <span className={s.small}>{D111}</span>
        </div>
      </div>
    </Frame>
  );
}

/* ───────────── W4 범위 구성 ───────────── */

function RecentLine({ on = true }: { on?: boolean }) {
  return (
    <div className={s.col}>
      <div className={s.row}>
        <Check on={on}>최근 출제 문항 빼기</Check>
        <span className={s.small}>지금 해당 31문항</span>
      </div>
      <div className={s.rule}>{RECENT_RULE}</div>
    </div>
  );
}

function LadderCounts({ phone }: { phone?: boolean }) {
  const counts: Record<string, number | null> = {
    연산: null,
    기본: 6,
    응용: 10,
    심화하: 4,
    심화중: null,
    심화상: null,
  };
  return (
    <div className={`${s.ladder} ${phone ? s.phoneLadder : ""}`}>
      {LADDER.map((t) => (
        <span key={t} className={counts[t] === null ? s.ladderOff : undefined}>
          {t}
          <b>{counts[t] ?? "–"}</b>
        </span>
      ))}
    </div>
  );
}

const REDISTRIBUTE =
  "합계를 바꾸면 «고정»이 아닌 행에만 다시 나눕니다. 손으로 고친 행에는 «고정»이 붙고 그대로 둡니다.";

const OVER_FIXED =
  "고정한 행의 합(8)이 합계보다 크면 나누지 않고 알립니다 — «합계를 올리거나 고정을 푸세요.»";

function W4A() {
  return (
    <Frame
      kind="desktop"
      label="1280 화면 · 작업실 본문 1040px · 1 범위 설정 · 표에 «난이도» 열을 더한다"
    >
      <StepBar step={1} />
      <div className={s.layout}>
        <div className={s.col}>
          <div className={s.panel}>
            <div className={s.panelHead}>
              <strong>출제 범위</strong>
              <span className={s.tagSoft}>3개 선택</span>
              <span className={s.grow} />
              <Btn>범위 변경</Btn>
            </div>
            <RecentLine />
            <ScopeTable tiers fixed />
            <div className={s.foot}>
              <span>합계</span>
              <span className={s.field}>20</span>
              <span>문항</span>
              <Btn>다시 나누기</Btn>
              <span className={s.grow} />
              <Primary>문항 검토 →</Primary>
            </div>
            <span className={s.small}>{REDISTRIBUTE}</span>
            <span className={s.small}>
              난이도 열의 기본값 — 새로 고른 범위는 «기본 – 응용». 바꾸면 그
              범위에서만 그 사이 난이도로 고릅니다.
            </span>
          </div>
        </div>
        <ReviewStub />
      </div>
    </Frame>
  );
}

function W4B() {
  return (
    <Frame
      kind="desktop"
      label="1280 화면 · 작업실 본문 1040px · 1 범위 설정 · 표 위에 «구성 조건» 세 줄"
    >
      <StepBar step={1} />
      <div className={s.layout}>
        <div className={s.col}>
          <div className={s.panel}>
            <div className={s.panelHead}>
              <strong>구성 조건</strong>
              <span className={s.small}>시험지 전체에 걸립니다</span>
            </div>
            <div className={s.row}>
              <span className={s.muted}>총 문항</span>
              <span className={s.field}>20</span>
              <span className={s.small}>비우면 범위 행의 합</span>
            </div>
            <div className={s.col}>
              <span className={s.muted}>난이도 · 몇 문항씩</span>
              <LadderCounts />
            </div>
            <RecentLine />
          </div>
          <div className={s.panel}>
            <div className={s.panelHead}>
              <strong>출제 범위</strong>
              <span className={s.tagSoft}>3개 선택</span>
              <span className={s.grow} />
              <Btn>범위 변경</Btn>
            </div>
            <ScopeTable fixed />
            <div className={s.foot}>
              <strong>합계 20문항 = 총 문항</strong>
              <span className={s.grow} />
              <Primary>문항 검토 →</Primary>
            </div>
            <span className={s.small}>{REDISTRIBUTE}</span>
            <div className={s.warn}>
              어긋날 때 — «범위 행의 합 22 · 총 문항 20» 한 줄과 [다시 나누기].
              저절로 맞추지 않습니다.
            </div>
          </div>
        </div>
        <ReviewStub />
      </div>
    </Frame>
  );
}

function W4C() {
  const cols = ["기본", "응용", "심화하"];
  const cells: Record<string, number[]> = {
    "일차부등식의 해와 성질": [3, 3, 0],
    "일차부등식의 풀이": [3, 3, 2],
    "일차부등식의 활용": [0, 4, 2],
  };
  return (
    <Frame
      kind="desktop"
      label="1280 화면 · 작업실 본문 1040px · 1 범위 설정이 본문 전폭을 쓴다(검토 칸은 구성 뒤에)"
    >
      <StepBar step={1} />
      <div className={s.wide}>
        <div className={s.panel}>
          <div className={s.panelHead}>
            <strong>출제 구성 · 범위 × 난이도</strong>
            <span className={s.grow} />
            <span className={s.muted}>총 문항</span>
            <span className={s.field}>20</span>
            <Btn>고르게 나누기</Btn>
            <Btn>범위 변경</Btn>
          </div>
          <div className={s.row}>
            <span className={s.muted}>쓸 난이도</span>
            {LADDER.map((t) => (
              <Chip key={t} on={cols.includes(t)}>
                {t}
              </Chip>
            ))}
          </div>
          <RecentLine />
          <table className={s.table}>
            <thead>
              <tr>
                <th>선택한 출제 범위</th>
                {cols.map((c) => (
                  <th key={c}>{c}</th>
                ))}
                <th>합계</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {SCOPES.map((row) => (
                <tr
                  key={row.label}
                  className={row.fixed ? s.rowFixed : undefined}
                >
                  <td>
                    <strong>{row.label}</strong>
                    <small>{row.detail}</small>
                  </td>
                  {cells[row.label].map((n, i) => (
                    <td key={cols[i]}>
                      <span className={s.row}>
                        <span className={s.field}>{n}</span>
                        <span className={s.small}>/ {[16, 20, 12][i]}</span>
                      </span>
                    </td>
                  ))}
                  <td className={s.num}>
                    <strong>
                      {cells[row.label].reduce((a, b) => a + b, 0)}
                    </strong>
                  </td>
                  <td>
                    {row.fixed ? (
                      <span className={s.row}>
                        <span className={s.tag}>고정</span>
                        <TextBtn>풀기</TextBtn>
                      </span>
                    ) : (
                      <span className={s.small}>자동 배분</span>
                    )}
                  </td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>난이도별 합</strong>
                </td>
                <td className={s.num}>6</td>
                <td className={s.num}>10</td>
                <td className={s.num}>4</td>
                <td className={s.num}>
                  <strong>20</strong>
                </td>
                <td />
              </tr>
            </tbody>
          </table>
          <span className={s.small}>
            칸의 «/ 16»은 그 범위 · 그 난이도에서 지금 고를 수 있는 문항류
            수입니다(최근 출제 · 같은 문항류 1개 규칙을 뺀 수). {REDISTRIBUTE}
          </span>
          <div className={s.foot}>
            <span className={s.small}>{OVER_FIXED}</span>
            <span className={s.grow} />
            <Primary>문항 검토 →</Primary>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function W4D() {
  return (
    <Frame
      kind="desktop"
      label="1280 화면 · 작업실 본문 1040px · 조건은 한 줄 + [구성 조건] 창"
    >
      <StepBar step={1} />
      <div className={s.layout}>
        <div className={s.col}>
          <div className={s.panel}>
            <div className={s.panelHead}>
              <strong>출제 범위</strong>
              <span className={s.tagSoft}>3개 선택</span>
              <span className={s.grow} />
              <Btn>범위 변경</Btn>
            </div>
            <div className={s.between}>
              <span className={s.summaryLine}>
                <span>20문항</span>
                <span>기본 6 · 응용 10 · 심화하 4</span>
                <span>최근 14일 출제 뺌</span>
              </span>
              <Btn>구성 조건</Btn>
            </div>
            <ScopeTable fixed />
            <div className={s.foot}>
              <strong>합계 20문항</strong>
              <span className={s.grow} />
              <Primary>문항 검토 →</Primary>
            </div>
          </div>
        </div>
        <ReviewStub />
      </div>
      <div className={s.scrim}>
        <div className={s.dialog880}>
          <div className={s.dialogHead}>
            <strong>구성 조건</strong>
            <Btn>취소</Btn>
            <Primary>적용</Primary>
          </div>
          <div className={s.dialogBody}>
            <div className={s.row}>
              <span className={s.muted}>총 문항</span>
              <span className={s.field}>20</span>
              <span className={s.small}>비우면 범위 행의 합</span>
            </div>
            <div className={s.row}>
              <span className={s.muted}>난이도</span>
              <Chip on>시험지 전체에 한 번</Chip>
              <Chip>범위마다 따로</Chip>
            </div>
            <LadderCounts />
            <RecentLine />
            <div className={s.layerHead}>
              <strong>적용하면 이렇게 나뉩니다</strong>
            </div>
            <ScopeTable fixed />
            <span className={s.small}>
              {REDISTRIBUTE} {OVER_FIXED}
            </span>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function W4Phone() {
  return (
    <Frame kind="phone" label="390 화면 · B안 · 조건 세 줄이 범위 표보다 먼저">
      <div className={s.phoneTop}>
        <b>시험지 만들기</b>
        <span className={s.grow} />
        <span>1 범위 설정</span>
      </div>
      <div className={s.phoneBody}>
        <div className={s.panel}>
          <strong>구성 조건</strong>
          <div className={s.row}>
            <span className={s.muted}>총 문항</span>
            <span className={s.field}>20</span>
          </div>
          <span className={s.muted}>난이도 · 몇 문항씩</span>
          <LadderCounts phone />
          <Check on>최근 출제 문항 빼기</Check>
          <div className={s.rule}>
            최근 14일 안 시험 날짜의 내 시험지 문항 · 31문항
          </div>
        </div>
        <div className={s.panel}>
          <div className={s.panelHead}>
            <strong>출제 범위 3</strong>
            <span className={s.grow} />
            <Btn>범위 변경</Btn>
          </div>
          {SCOPES.map((row) => (
            <div key={row.label} className={s.listRow}>
              <div>
                <strong>{row.label}</strong>
                <span className={s.small}>출제 가능 {row.avail}</span>
                {row.fixed && (
                  <span className={s.row}>
                    <span className={s.tag}>고정</span>
                    <TextBtn>풀기</TextBtn>
                  </span>
                )}
              </div>
              <span className={s.stepper}>
                <span>−</span>
                <span>{row.count}</span>
                <span>+</span>
              </span>
            </div>
          ))}
          <div className={s.foot}>
            <strong>합계 20 = 총 문항</strong>
            <span className={s.grow} />
            <Primary>문항 검토 →</Primary>
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ───────────── W5 출제 조건 재사용 ───────────── */

const COND_SUMMARY =
  "교과서 · 비상 · 자료 전부 · 범위 3 · 20문항 · 기본 6 · 응용 10 · 심화하 4 · 최근 출제 뺌";

const RESTORE_RULE =
  "조건만 가져옵니다 — 출처 · 범위 행(수 · 고정) · 난이도 · 최근 출제 빼기. 문항은 [문항 구성]으로 새로 고릅니다. 양식(지면)은 담지 않습니다.";

const RESTORE_MISS =
  "범위 1개(일차부등식의 활용)는 지금 출제 가능 문항이 없어 뺐습니다. 나머지 2개는 그대로입니다.";

function SourceBar({ extra }: { extra?: ReactNode }) {
  return (
    <div className={s.panel}>
      <div className={s.row}>
        <span className={s.small}>
          내 출제 순위 · 최근 30일 · 같은 차시 기준
        </span>
        <span className={s.grow} />
        {extra}
      </div>
      <div className={s.row}>
        <span className={s.field}>출처</span>
        <span className={s.fieldGrow}>교과서 · 비상 · 자료 전부</span>
        <Btn>고르기</Btn>
      </div>
    </div>
  );
}

function W5A() {
  return (
    <Frame
      kind="desktop"
      label="1280 화면 · 작업실 본문 1040px · 새 시험지 1 범위 설정 · [지난 조건으로 시작] 창을 연 상태"
    >
      <StepBar step={1} />
      <div className={s.wide}>
        <SourceBar extra={<Btn>지난 조건으로 시작</Btn>} />
      </div>
      <div className={s.scrim}>
        <div className={s.dialog880}>
          <div className={s.dialogHead}>
            <strong>지난 조건으로 시작</strong>
            <Btn>닫기</Btn>
          </div>
          <div className={s.dialogBody}>
            <span className={s.small}>
              최근 시험지 10개의 출제 조건입니다. 시험지를 저장할 때 조건도 같이
              저장됩니다.
            </span>
            <div className={s.list}>
              {[
                ["10/14 · 중2 일차부등식 확인", COND_SUMMARY],
                [
                  "10/13 · 중2 부등식 일일",
                  "교과서 · 범위 1 · 8문항 · 기본 4 · 응용 4 · 최근 출제 뺌",
                ],
                [
                  "10/10 · 중1 문자와 식 확인",
                  "전체 출처 · 범위 4 · 25문항 · 난이도 지정 없음",
                ],
                [
                  "10/02 · 중2 연립방정식 (조건 기록 없음)",
                  "이 기능 전에 만든 시험지 — 문항만 있고 조건이 없습니다",
                ],
              ].map(([title, cond], i) => (
                <div className={s.listRow} key={title}>
                  <div>
                    <strong>{title}</strong>
                    <span className={s.small}>{cond}</span>
                  </div>
                  {i < 3 ? (
                    <Btn>이 조건 적용</Btn>
                  ) : (
                    <span className={s.tagSoft}>적용 불가</span>
                  )}
                </div>
              ))}
            </div>
            <div className={s.rule}>{RESTORE_RULE}</div>
            <div className={s.warn}>적용 뒤 알림 — {RESTORE_MISS}</div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function W5B() {
  return (
    <Frame
      kind="desktop"
      label="1280 화면 · 작업실 본문 1040px · 이름 붙여 저장한 조건 · 저장 칸과 목록"
    >
      <StepBar step={1} />
      <div className={s.layout}>
        <div className={s.col}>
          <SourceBar extra={<Btn>저장한 조건 · 3</Btn>} />
          <div className={s.panel}>
            <div className={s.panelHead}>
              <strong>출제 범위</strong>
              <span className={s.tagSoft}>3개 선택</span>
              <span className={s.grow} />
              <Btn>범위 변경</Btn>
            </div>
            <ScopeTable />
            <div className={s.foot}>
              <strong>합계 20문항</strong>
              <span className={s.grow} />
              <Btn>조건 저장</Btn>
              <Primary>문항 검토 →</Primary>
            </div>
            <div className={s.pinned}>
              <strong>조건 저장</strong>
              <div className={s.row}>
                <span className={s.muted}>이름</span>
                <span className={s.fieldGrow}>중2 확인 20문항</span>
                <Primary>저장</Primary>
                <Btn>취소</Btn>
              </div>
              <span className={s.small}>{COND_SUMMARY}</span>
            </div>
          </div>
        </div>
        <div className={s.col}>
          <div className={s.panel}>
            <div className={s.panelHead}>
              <strong>저장한 조건</strong>
              <span className={s.small}>
                [저장한 조건]을 누르면 열리는 고르기 창의 내용
              </span>
            </div>
            <div className={s.list}>
              {[
                ["중2 확인 20문항", COND_SUMMARY],
                [
                  "일일 8문항 · 쉬운 쪽",
                  "전체 출처 · 범위 1 · 8문항 · 연산 2 · 기본 6 · 최근 출제 뺌",
                ],
                [
                  "단원 마무리 25",
                  "교과서 · 범위 4 · 25문항 · 응용 15 · 심화하 10",
                ],
              ].map(([name, cond]) => (
                <div className={s.listRow} key={name}>
                  <div>
                    <strong>{name}</strong>
                    <span className={s.small}>{cond}</span>
                  </div>
                  <span className={s.row}>
                    <Btn>적용</Btn>
                    <TextBtn>이름 바꾸기</TextBtn>
                    <TextBtn>삭제</TextBtn>
                  </span>
                </div>
              ))}
            </div>
            <div className={s.rule}>{RESTORE_RULE}</div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function W5C() {
  return (
    <Frame
      kind="desktop"
      label="1280 화면 · 작업실 본문 1040px · 반을 고르면 그 반의 기본 구성이 먼저 채워진다"
    >
      <StepBar step={1} />
      <div className={s.layout}>
        <div className={s.col}>
          <div className={s.panel}>
            <div className={s.row}>
              <span className={s.muted}>반</span>
              <span className={s.field}>중2 A반 ▾</span>
              <span className={s.small}>진도 · 일차부등식의 활용</span>
            </div>
            <div className={s.pinned}>
              <div className={s.between}>
                <strong>A반 기본 구성</strong>
                <span className={s.small}>10/14 저장</span>
              </div>
              <span className={s.small}>
                교과서 · 비상 · 20문항 · 기본 6 · 응용 10 · 심화하 4 · 최근 출제
                뺌
              </span>
              <span className={s.small}>
                범위는 담지 않습니다 — 반의 진도에서 이번 차시를 채웁니다.
              </span>
              <div className={s.cardActions}>
                <Primary>이대로 채우기</Primary>
              </div>
            </div>
          </div>
          <SettingsNow />
          <div className={s.row}>
            <span className={s.grow} />
            <Btn>지금 조건을 A반 기본 구성으로</Btn>
          </div>
        </div>
        <ReviewStub />
      </div>
    </Frame>
  );
}

function W5D() {
  return (
    <Frame
      kind="desktop"
      label="1280 화면 · 작업실 본문 1040px · 최근 작업 목록에서 «같은 조건으로 새로»"
    >
      <div className={s.stepBar}>
        <b>최근 작업</b>
      </div>
      <div className={s.wide}>
        <div className={s.panel}>
          <div className={s.list}>
            {[
              ["중2 일차부등식 확인", "10/14 · 20문항 · 출력함", true],
              ["중2 부등식 일일", "10/13 · 8문항 · 출력함", true],
              ["중2 연립방정식", "10/02 · 18문항 · 조건 기록 없음", false],
            ].map(([title, meta, has]) => (
              <div className={s.listRow} key={String(title)}>
                <div>
                  <strong>{title}</strong>
                  <span className={s.small}>{meta}</span>
                </div>
                <span className={s.row}>
                  <Btn>열기</Btn>
                  {has ? (
                    <Btn>같은 조건으로 새로</Btn>
                  ) : (
                    <span className={s.tagSoft}>조건 없음</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className={s.panel}>
          <div className={s.panelHead}>
            <strong>누른 뒤 — 새 시험지 1 범위 설정</strong>
          </div>
          <div className={s.toast}>
            «중2 일차부등식 확인»(10/14)의 조건으로 새 시험지를 열었습니다.
            문항은 아직 없습니다.
            <TextBtn>조건 비우기</TextBtn>
          </div>
          <div className={s.warn}>{RESTORE_MISS}</div>
          <div className={s.rule}>{RESTORE_RULE}</div>
        </div>
      </div>
    </Frame>
  );
}

function W5Phone() {
  return (
    <Frame kind="phone" label="390 화면 · A안 · 고르기 창이 화면을 다 덮는다">
      <div className={s.dialogFull}>
        <div className={s.dialogHead}>
          <strong>지난 조건으로 시작</strong>
          <Btn>닫기</Btn>
        </div>
        <div className={s.dialogBody}>
          {[
            [
              "10/14 · 중2 일차부등식 확인",
              "교과서 · 범위 3 · 20문항 · 기본 6 · 응용 10 · 심화하 4 · 최근 출제 뺌",
            ],
            [
              "10/13 · 중2 부등식 일일",
              "교과서 · 범위 1 · 8문항 · 기본 4 · 응용 4",
            ],
            ["10/10 · 중1 문자와 식 확인", "전체 출처 · 범위 4 · 25문항"],
          ].map(([title, cond]) => (
            <div className={s.card} key={title}>
              <strong>{title}</strong>
              <span className={s.small}>{cond}</span>
              <div className={s.cardActions}>
                <Btn>이 조건 적용</Btn>
              </div>
            </div>
          ))}
          <div className={s.rule}>
            조건만 가져옵니다. 문항은 [문항 구성]으로 새로 고릅니다.
          </div>
        </div>
      </div>
    </Frame>
  );
}

/* ───────────── 화면 ───────────── */

export function BuilderWire() {
  return (
    <main className={s.shell}>
      <header className={s.head}>
        <h1 className={s.h1}>시험지 만들기 개선 — Wire (D-07)</h1>
        <p className={s.note}>
          세 갈래를 따로 고릅니다 — <b>W3 교체</b> · <b>W4 범위 구성</b> ·{" "}
          <b>W5 출제 조건 재사용</b>. 갈래마다 4안이고, 안끼리는 색이 아니라{" "}
          <b>구조</b>(조작이 어디 있나 · 몇 번 누르나 · 처음에 무엇이 보이나)가
          다릅니다. 틀은 실제 폭입니다 — 1280 화면의 작업실 본문 1040px(사이드바
          240 제외)과 폰 390px. 문항 본문은 회색 막대로 대신했고, 그림 속 단추는
          누를 수 없습니다.
        </p>
        <p className={s.note}>
          근거: 매쓰플랫 · 매쓰홀릭 «학습지 만들기» 걸어 본 기록(2026-10-16)과
          codex 검토. 색 · 서체 · 모서리는 고르신 뒤 Hi-fi 4~5안으로 냅니다.
        </p>
        <nav className={s.jump} aria-label="갈래 바로 가기">
          <a href="#w3">W3 교체</a>
          <a href="#w4">W4 범위 구성</a>
          <a href="#w5">W5 출제 조건 재사용</a>
        </nav>
      </header>

      <section className={s.topic} id="w3" data-wire-topic="w3">
        <h2 className={s.h2}>W3 · 교체 개선</h2>
        <ul className={s.must}>
          <li>
            후보는 두 층 — <b>같은 문항류</b>(같은 차시 · 같은 문항류의 다른
            변형)와 <b>같은 차시의 다른 문항</b>(범위 · 난이도로 찾음).
          </li>
          <li>
            둘째 층의 난이도는 바꿀 문항의 난이도로 시작합니다(지금은 «전체
            난이도»).
          </li>
          <li>바꿀 문항이 비교용으로 계속 보입니다.</li>
          <li>{D111}</li>
          <li>{TEXTBOOK}</li>
        </ul>
        <Option
          id="w3-a"
          title="A · 한 창에 두 층을 위아래로"
          idea="공용 고르기 창(PickerDialog, 880) 하나. 머리에 바꿀 문항을 고정하고, 첫 층(같은 문항류)은 몇 개뿐이라 전부 펼치고, 둘째 층은 난이도 · 범위 · 검색 · 쪽 넘김으로 찾는다. 지금 교체 창을 넓히는 꼴이라 익숙하다."
          cost="둘째 층이 아래로 밀려 같은 문항류가 많으면 스크롤이 길다. 바꿀 문항과 후보를 나란히 보지는 못한다(위아래)."
          clicks="교체 1건 = [교체] → [이 문항으로 교체] 2번. 둘째 층 난이도를 바꾸면 +1."
        >
          <W3A />
        </Option>
        <Option
          id="w3-b"
          title="B · 왼쪽 원문, 오른쪽 후보 — 대조한 뒤 교체"
          idea="창을 좌우로 가른다. 왼쪽에 바꿀 문항과 «대조할 후보»를 위아래로 크게, 오른쪽에 층 전환(같은 문항류 3 / 같은 차시의 다른 문항 18)과 짧은 후보 줄. 숫자만 다른 변형을 고를 때 차이를 바로 본다."
          cost="한 번 더 누른다(대조 → 교체). 오른쪽 후보는 한 줄 요약이라 본문을 다 못 본다. 880 안에서 두 칸이라 긴 문항은 양쪽 다 스크롤."
          clicks="교체 1건 = [교체] → [대조] → [이 문항으로 교체] 3번. 층 전환 +1."
        >
          <W3B />
        </Option>
        <Option
          id="w3-c"
          title="C · 카드 아래로 펼치기 — 같은 문항류만 제자리, 나머지는 창"
          idea="창을 열지 않는다. [교체]를 누르면 그 카드 바로 아래에 같은 문항류 후보가 펼쳐지고, 원문은 바로 위 카드 그대로다. 드문 경우인 «같은 차시의 다른 문항»만 지금 창으로 보낸다."
          cost="두 층이 다른 자리(제자리 / 창)에 있어 «어디서 찾나»가 갈린다. 검토 칸 폭(약 500px)에 후보를 그려 그림 문항은 좁다. 펼친 동안 아래 카드가 밀린다."
          clicks="같은 문항류 교체 = 2번(창 없음). 다른 문항 = [교체] → [같은 차시의 다른 문항에서 찾기] → [교체] 3번."
        >
          <W3C />
        </Option>
        <Option
          id="w3-d"
          title="D · 교체해도 창이 열려 있고, 원래 문항이 옆 칸에 남는다"
          idea="매쓰플랫식. 교체를 누르면 바로 바뀌고 창은 그대로다. 원래 문항은 «원래 문항» 칸으로 옮겨져 [다시 이 문항으로] 한 번에 되돌린다. 여러 후보를 차례로 끼워 보며 고르는 사람에게 맞다."
          cost="창 뒤에서 시험지가 바뀐다 — 지금의 ↶ 되돌리기(10단계)와 할 일이 겹친다. 층은 탭이라 다른 층의 후보는 안 보인다. [완료]를 눌러야 닫힌다."
          clicks="교체 1건 = [교체] → [이 문항으로 교체] → [완료] 3번. 끼워 보기 1회마다 +1."
        >
          <W3D />
        </Option>
        <W3Phone />
      </section>

      <section className={s.topic} id="w4" data-wire-topic="w4">
        <h2 className={s.h2}>W4 · 범위 구성</h2>
        <ul className={s.must}>
          <li>
            <b>최근 출제 문항 빼기</b> — D-20 과 같은 뜻을 글로 보여 줍니다: «
            {RECENT_RULE}»
          </li>
          <li>
            처음 구성할 때 난이도 의도를 정합니다 — 우리 사다리{" "}
            {LADDER.join(" · ")}. 안마다 «범위마다»인지 «시험지 전체»인지가
            다릅니다.
          </li>
          <li>
            총 문항은 선택입니다. 바꾸면 다시 나누되,{" "}
            <b>손으로 고친 행은 «고정»</b>이고 그대로 둡니다. 저절로 덮어쓰지
            않습니다. 회색 바탕 행이 «고정» 행의 모습입니다.
          </li>
          <li>
            세 조건은 후보 · 자동 구성 · 추가 · 교체에 똑같이 걸립니다(codex
            권고).
          </li>
        </ul>
        <Option
          id="w4-a"
          title="A · 범위 표에 «난이도» 열 — 범위마다 따로"
          idea="지금 구성표에 열 하나(난이도 «기본 – 응용» 범위)를 더한다. 최근 출제 빼기는 표 위 한 칸, 합계는 입력칸 + [다시 나누기]. 단원마다 다른 난이도를 원할 때 가장 곧장."
          cost="왼쪽 칸(약 500px)에 열이 넷이라 빽빽하다. 행마다 난이도를 정해야 해 기본값이 중요하다. «시험지 전체에 응용 10문항» 같은 수는 못 정한다(범위만)."
          clicks="기본값 그대로 = 지금과 같음. 범위 하나 난이도 바꾸기 +2(열기 · 고르기)."
        >
          <W4A />
        </Option>
        <Option
          id="w4-b"
          title="B · 표 위에 «구성 조건» 세 줄 — 시험지 전체에 한 번"
          idea="총 문항 · 난이도별 몇 문항(사다리 여섯 칸) · 최근 출제 빼기를 표 위에 늘 보이게 둔다. 범위 표는 지금 그대로 + «고정». 경쟁 두 곳이 처음 화면에서 정하는 것과 같은 자리."
          cost="범위마다 다른 난이도는 못 한다. 난이도 합과 범위 합이 둘 다 총 문항에 맞아야 해 어긋남 안내가 하나 는다. 왼쪽 칸이 길어진다."
          clicks="기본값 그대로 = 지금과 같음. 난이도 하나 바꾸기 +1(칸 입력)."
        >
          <W4B />
        </Option>
        <Option
          id="w4-c"
          title="C · 범위 × 난이도 표 — 1단계가 본문 전폭"
          idea="매쓰홀릭 «단원·난이도별 맞춤». 행 = 범위, 열 = 고른 난이도, 칸 = 문항 수와 «/ 고를 수 있는 문항류 수». 무엇이 모자라는지 입력하면서 안다. [고르게 나누기]가 고정 아닌 행에 채운다."
          cost="칸이 9개 이상으로 많다. 검토 칸이 구성 뒤로 밀려 1단계와 2단계가 나란히 안 보인다(지금 구조가 바뀜). 폰에서는 표가 안 들어가 범위마다 카드로 다시 그려야 한다."
          clicks="[고르게 나누기] 1번이면 다 찬다. 칸 하나 고치기 +1."
        >
          <W4C />
        </Option>
        <Option
          id="w4-d"
          title="D · 한 줄 요약 + [구성 조건] 창"
          idea="구성표 위에 «20문항 · 기본 6 · 응용 10 · 심화하 4 · 최근 14일 출제 뺌» 한 줄과 단추 하나. 창 안에서 총 문항 · 난이도(전체에 한 번 / 범위마다 따로) · 최근 출제를 정하고, 나뉠 모습을 미리 본 뒤 [적용]. D-159 «지금 고른 것 한 줄 + 단추»와 같은 틀."
          cost="조건이 창 뒤에 있어 처음 쓰는 사람은 모른다. 정할 때마다 창을 연다. 창 안에 표가 한 번 더 나온다."
          clicks="기본값 그대로 = 지금과 같음. 조건 바꾸기 = [구성 조건] → 고치기 → [적용] 3번 이상."
        >
          <W4D />
        </Option>
        <W4Phone />
      </section>

      <section className={s.topic} id="w5" data-wire-topic="w5">
        <h2 className={s.h2}>W5 · 출제 조건 재사용</h2>
        <ul className={s.must}>
          <li>
            저장하는 것: 출처 고르기 · 범위 행(수 · 고정) · 난이도 의도 · 최근
            출제 빼기. 디자인 양식 목록은 만들지 않습니다.
          </li>
          <li>{RESTORE_RULE}</li>
          <li>
            복원할 때 사라진 범위 · 모자란 문항은 말하고 뺍니다 — 조용히 바꾸지
            않습니다.
          </li>
          <li>
            이 기능 전에 만든 시험지는 조건이 없습니다 — «조건 기록 없음»으로
            보입니다.
          </li>
        </ul>
        <Option
          id="w5-a"
          title="A · 시험지가 조건을 같이 저장 + [지난 조건으로 시작]"
          idea="이름을 붙이지 않는다. 시험지를 저장하면 조건이 따라 저장되고, 새 시험지 1단계의 [지난 조건으로 시작]이 최근 10개를 고르기 창(PickerDialog)으로 보여 준다. 새 물건(목록 · 이름 · 삭제)이 없다."
          cost="«늘 쓰는 그 조건»을 날짜 · 제목으로 찾아야 한다. 10개가 지나면 안 보인다. 이 기능 전 시험지는 못 쓴다."
          clicks="[지난 조건으로 시작] → [이 조건 적용] 2번 → [문항 검토 →]."
        >
          <W5A />
        </Option>
        <Option
          id="w5-b"
          title="B · 이름 붙여 저장한 조건"
          idea="구성표 아래 [조건 저장] → 이름 한 칸. 위의 [저장한 조건 · 3]이 목록을 연다(적용 · 이름 바꾸기 · 삭제). «일일 8문항 · 쉬운 쪽»처럼 반복 패턴을 이름으로 부른다."
          cost="이름 짓기 · 정리라는 일이 는다. 쌓이면 양식 목록처럼 된다(경계 필요 — 조건만, 지면 없음). 저장 안 한 조건은 다시 못 쓴다."
          clicks="처음 1회 저장 = 3번(조건 저장 · 이름 · 저장). 쓸 때 = [저장한 조건] → [적용] 2번."
        >
          <W5B />
        </Option>
        <Option
          id="w5-c"
          title="C · 반의 기본 구성"
          idea="조건을 반에 묶는다. 반을 고르면 «A반 기본 구성»이 먼저 보이고 [이대로 채우기]. 범위는 담지 않고 반의 진도에서 이번 차시를 채운다 — 매일 일일테스트와 가장 가깝다."
          cost="반 없이 만드는 시험지(확인테스트 · 보충)는 못 쓴다. 지금 시험지 만들기는 반을 묻지 않아 칸이 하나 는다. 반 기본 배분(이미 절반 있음)과 겹치는 결정이 필요하다."
          clicks="반 고르기 → [이대로 채우기] 2번. 처음 1회 [지금 조건을 A반 기본 구성으로]."
        >
          <W5C />
        </Option>
        <Option
          id="w5-d"
          title="D · 최근 작업에서 «같은 조건으로 새로»"
          idea="시험지 만들기 밖, 최근 작업 목록의 행 단추. 누르면 그 시험지의 조건이 든 새 시험지가 1단계로 열린다. 지난 시험지를 이미 보고 있을 때 가장 짧다."
          cost="만들기 화면 안에는 입구가 없다 — 목록으로 나가야 한다. 지난 시험지를 찾는 일이 먼저다. 원본과 새것이 헷갈리지 않게 제목 · 알림이 필요하다."
          clicks="[같은 조건으로 새로] 1번 → [문항 검토 →]."
        >
          <W5D />
        </Option>
        <W5Phone />
      </section>
    </main>
  );
}
