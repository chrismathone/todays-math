"use client";

import { useRef, useState, type ReactNode } from "react";
import { PickerDialog } from "@/components/picker-dialog/PickerDialog";
import {
  PAPER_OPTIONS,
  CAPTURE_OPTIONS,
  READ_OPTIONS,
  RESULT_OPTIONS,
  type WireOption,
} from "./options";
import type { WireSample } from "./samples";
import { SampleStrip, wirePaperPages } from "./WirePaper";
import { ReadAnswers, type ManualAnswers } from "./ReadAnswers";
import { ResultView } from "./ResultView";
import s from "./scanWire.module.css";

export function ChoiceBar({
  label,
  options,
  value,
  onChange,
  showId = true,
}: {
  label: string;
  options: readonly WireOption[];
  value: string;
  onChange: (id: string) => void;
  showId?: boolean;
}) {
  return (
    <div className={s.choices} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          key={o.id}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
        >
          {showId ? `${o.id} · ` : ""}
          {o.title}
        </button>
      ))}
    </div>
  );
}

export function OptionNotes({ option }: { option: WireOption }) {
  return (
    <div className={s.optionNotes}>
      <h2>
        {option.id} · {option.title}
      </h2>
      <p>차이 · {option.difference}</p>
      <p>약점 · {option.weakness}</p>
    </div>
  );
}

export function Phone({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      className={`${s.phone} ${wide ? s.widePhone : ""}`}
      data-wire-phone=""
    >
      {children}
    </section>
  );
}

const FACES = [
  { id: "paper", title: "가 · 지면 QR", difference: "", weakness: "" },
  { id: "capture", title: "나 · 촬영", difference: "", weakness: "" },
  { id: "read", title: "읽은 답 확인", difference: "", weakness: "" },
  { id: "result", title: "다 · 결과", difference: "", weakness: "" },
];

export function ScanWire({ samples }: { samples: WireSample[] }) {
  const [face, setFace] = useState("paper");
  const [paper, setPaper] = useState("P1");
  const [capture, setCapture] = useState("C1");
  const [read, setRead] = useState("V1");
  const [result, setResult] = useState("R1");
  const [manual, setManual] = useState<ManualAnswers>({});
  const paperOption = PAPER_OPTIONS.find((o) => o.id === paper)!;
  return (
    <main className={s.app}>
      <header className={s.pageHead}>
        <div>
          <p className={s.eyebrow}>개념 백지 · 구조 비교</p>
          <h1>QR 촬영과 답안 채점</h1>
          <p>
            Wire · 면마다 4안. 시안 선택 전이며 제품에는 반영되지 않았습니다.
          </p>
        </div>
        <span className={s.tag}>정지 화면 · 저장 없음</span>
      </header>
      <aside className={s.notice}>
        문항과 정답은 인쇄할 때 저장하는 전제입니다. 실제 은행으로 조판했으며
        사진·판독·판정은 시연 상태입니다. 카메라·AI·결과 저장은 연결하지
        않았습니다.
      </aside>
      <ChoiceBar
        label="비교할 면"
        showId={false}
        options={FACES}
        value={face}
        onChange={setFace}
      />
      {face === "paper" ? (
        <>
          <ChoiceBar
            label="지면 QR 안"
            options={PAPER_OPTIONS}
            value={paper}
            onChange={setPaper}
          />
          <OptionNotes option={paperOption} />
          <p className={s.meta}>
            A4 210 × 297mm · 제품 안쪽 여백 첫 쪽 36/50/20px, 다음 쪽 24/50/20px
            · 본문 폭 694px · 쪽 나눔 그대로
          </p>
          <p className={s.meta}>
            QR {paperOption.mm}mm(사방 4모듈 여백 포함) · 오류 정정 M · 실제
            주소 제안 길이 {samples[0].qr.student[0].url.length}~
            {samples[2].qr.student[0].url.length}자 · 주소 경로는 미구현
          </p>
          <div className={s.paperSamples}>
            {samples.map((sample) => (
              <section className={s.sample} key={sample.id}>
                <h3>{sample.label}</h3>
                <p className={s.meta}>
                  {sample.qr.student.length}쪽 · QR{" "}
                  {sample.qr.student[0].modules} ×{" "}
                  {sample.qr.student[0].modules}모듈 · 한 칸{" "}
                  {(
                    paperOption.mm /
                    (sample.qr.student[0].modules + 8)
                  ).toFixed(3)}
                  mm
                </p>
                <SampleStrip sample={sample} option={paperOption} />
              </section>
            ))}
          </div>
          <details className={s.details}>
            <summary>
              채점표 비교 ·{" "}
              {paperOption.keyQr ? "QR 있음" : "QR 없이 글자 코드만"}
            </summary>
            {samples.map((sample) => (
              <section key={sample.id}>
                <h3>{sample.label} · 채점표</h3>
                <SampleStrip sample={sample} option={paperOption} part="key" />
              </section>
            ))}
          </details>
          <details className={s.details}>
            <summary>주소·고르기와 남긴 물음</summary>
            <p>
              QR에는 코드·쪽·학생지/채점표만 싣습니다. 학생 이름이나 계정은 싣지
              않습니다. 아래 주소는 길이 측정용 제안이며 접속하지 않습니다.
            </p>
            <code className={s.code}>{samples[2].qr.student[0].url}</code>
            <p>
              QR 하나로 사진을 맞출 수 있는지, 네 모서리에 추가 표식이
              필요한지는 촬영 실험 뒤 정해야 합니다.
            </p>
            <p>
              직접 고르기(pick)는 기존 코드가 지원하지 않습니다. 인쇄 때 저장한
              지면의 식별 방식은 후속 설계 물음입니다.
            </p>
          </details>
        </>
      ) : null}
      {face === "capture" ? (
        <>
          <ChoiceBar
            label="촬영 안"
            options={CAPTURE_OPTIONS}
            value={capture}
            onChange={setCapture}
          />
          <OptionNotes
            option={CAPTURE_OPTIONS.find((o) => o.id === capture)!}
          />
          <CaptureView
            key={capture}
            sample={samples[1]}
            variant={capture}
            onRead={() => setFace("read")}
          />
        </>
      ) : null}
      {face === "read" ? (
        <>
          <ChoiceBar
            label="읽은 답 확인 안"
            options={READ_OPTIONS}
            value={read}
            onChange={setRead}
          />
          <OptionNotes option={READ_OPTIONS.find((o) => o.id === read)!} />
          <ReadAnswers
            sample={samples[1]}
            option={READ_OPTIONS.find((o) => o.id === read)!}
            manual={manual}
            onManual={setManual}
            onResult={() => setFace("result")}
          />
        </>
      ) : null}
      {face === "result" ? (
        <>
          <ChoiceBar
            label="결과 안"
            options={RESULT_OPTIONS}
            value={result}
            onChange={setResult}
          />
          <OptionNotes option={RESULT_OPTIONS.find((o) => o.id === result)!} />
          <ResultView
            sample={samples[2]}
            readingSample={samples[1]}
            variant={result}
            manual={manual}
            allowAfter={READ_OPTIONS.find((o) => o.id === read)!.after}
            onRead={() => setFace("read")}
          />
        </>
      ) : null}
      <footer className={s.pageFoot}>
        안의 선택·입력·수정은 이 화면 메모리에서만 유지됩니다. 페이지를 새로
        열면 사라집니다.
      </footer>
    </main>
  );
}

const CAPTURE_STATES = [
  ["normal", "일반 촬영"],
  ["missing", "빠진 쪽"],
  ["otherSheet", "다른 지면 QR"],
  ["otherPage", "다른 쪽 QR"],
  ["guest", "로그인 전"],
  ["legacy", "저장 전 옛 지면 · 코드 확인 필요"],
] as const;

function CaptureView({
  sample,
  variant,
  onRead,
}: {
  sample: WireSample;
  variant: string;
  onRead: () => void;
}) {
  const [role, setRole] = useState("student");
  const [scenario, setScenario] = useState("normal");
  const [captured, setCaptured] = useState<number[]>([0]);
  const [current, setCurrent] = useState(1);
  const [student, setStudent] = useState("");
  const [picker, setPicker] = useState(false);
  const [review, setReview] = useState(variant === "C3");
  const [query, setQuery] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeMessage, setCodeMessage] = useState("");
  const pickerButton = useRef<HTMLButtonElement>(null);
  const total = sample.qr.student.length;
  const missing = Array.from({ length: total }, (_, i) => i).filter(
    (i) => !captured.includes(i),
  );
  const owner = (
    <div className={s.owner}>
      <div>
        <b>답안 주인</b>
        <p>
          {role === "student"
            ? "내 답안 · 로그인한 학생"
            : student || "학생을 골라 주세요"}
        </p>
      </div>
      {role === "teacher" ? (
        <button
          type="button"
          ref={pickerButton}
          onClick={() => setPicker(true)}
        >
          학생 고르기
        </button>
      ) : null}
    </div>
  );
  const strip = captured.length ? (
    <SampleStrip
      sample={sample}
      option={PAPER_OPTIONS[0]}
      captured={captured}
    />
  ) : (
    <p className={s.notice}>아직 찍은 쪽이 없습니다.</p>
  );
  const checklist = (
    <ol className={s.pageList}>
      {Array.from({ length: total }, (_, i) => (
        <li key={i}>
          <span>
            {i + 1}쪽 · {captured.includes(i) ? "촬영됨" : "미촬영"}
          </span>
          <button
            type="button"
            onClick={() => {
              setCurrent(i);
              setReview(false);
            }}
          >
            {captured.includes(i) ? `${i + 1}쪽 다시 찍기` : `${i + 1}쪽 찍기`}
          </button>
        </li>
      ))}
    </ol>
  );
  const blocked = scenario !== "normal" && scenario !== "missing";
  return (
    <>
      <div className={s.controls}>
        <label>
          보는 계정
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">학생</option>
            <option value="teacher">교사</option>
          </select>
        </label>
        <label>
          상태 표본
          <select
            value={scenario}
            onChange={(e) => {
              setScenario(e.target.value);
              setCaptured([0]);
              setCurrent(1);
            }}
          >
            {CAPTURE_STATES.map(([id, label]) => (
              <option value={id} key={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Phone>
        <header className={s.phoneHead}>
          <b>개념 백지 · 답안 촬영</b>
          <span>
            {total}쪽 중 {captured.length}쪽 촬영
          </span>
        </header>
        {scenario === "guest" ? (
          <div className={s.phoneBody}>
            <h3>로그인 후 촬영해 주세요</h3>
            <p>
              학생은 본인 계정으로, 교사는 교사 계정으로 로그인합니다. 로그인 뒤
              이 지면으로 돌아옵니다.
            </p>
            <p className={s.meta}>코드 {sample.code} · 2쪽</p>
            <button
              type="button"
              className={s.primary}
              onClick={() => setScenario("normal")}
            >
              로그인 후 상태 보기
            </button>
          </div>
        ) : (
          <div className={s.phoneBody}>
            {variant === "C4" ? owner : null}
            <p className={s.notice}>
              <b>채점 전에 찍어 주세요.</b> 채점 표시가 없는 답안을, 모서리와
              QR까지 한 쪽 전체가 나오게 찍습니다.
            </p>
            <h3>
              선대칭도형 · {current + 1}/{total}쪽
            </h3>
            {variant !== "C4" ? owner : null}
            {variant === "C2" ? checklist : null}
            {variant === "C4" || review ? strip : null}
            {scenario === "legacy" ? (
              <div className={s.warning} role="alert">
                <b>코드 확인 필요 · 저장 전 옛 지면</b>
                <p>
                  은행 또는 쪽 나눔이 바뀌었거나 코드를 잘못 옮겼을 수 있습니다.
                  지금 은행의 정답으로 채점하지 않습니다.
                </p>
                <button type="button" onClick={() => setCodeOpen(true)}>
                  글자 코드 다시 확인
                </button>
                <p>교사에게 인쇄한 원본을 확인해 주세요.</p>
              </div>
            ) : null}
            {scenario === "otherSheet" || scenario === "otherPage" ? (
              <div className={s.warning} role="alert">
                <b>
                  {scenario === "otherSheet"
                    ? "다른 지면의 QR입니다"
                    : "3쪽 QR이 확인되었습니다"}
                </b>
                <p>
                  {scenario === "otherSheet"
                    ? "지금 찍는 답안에 이 사진을 넣지 않습니다. 같은 시험지를 다시 찍어 주세요."
                    : "현재 2쪽을 찍고 있습니다. 3쪽 자리로 옮기거나 2쪽을 다시 찍어 주세요."}
                </p>
                {scenario === "otherPage" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCaptured((v) => [...new Set([...v, 2])]);
                      setScenario("normal");
                    }}
                  >
                    3쪽 자리에 넣기
                  </button>
                ) : null}
                <button type="button" onClick={() => setScenario("normal")}>
                  이 사진 빼고 다시 찍기
                </button>
              </div>
            ) : null}
            {!review && !blocked ? (
              <>
                <div className={s.camera}>
                  <div className={s.cameraPaper}>
                    {wirePaperPages(sample, PAPER_OPTIONS[0])[current]}
                  </div>
                  <span className={s.cameraCaption}>
                    전체 쪽 촬영 틀 · 정지 지면
                  </span>
                </div>
                <button
                  type="button"
                  className={s.primary}
                  onClick={() => {
                    setCaptured((v) => [...new Set([...v, current])].sort());
                    const next = missing.find((i) => i !== current);
                    if (next !== undefined) setCurrent(next);
                    else setReview(true);
                  }}
                >
                  {current + 1}쪽 촬영 상태로 보기
                </button>
              </>
            ) : null}
            {variant === "C3" && review ? (
              <button type="button" onClick={() => setReview(false)}>
                촬영 단계로 돌아가기
              </button>
            ) : null}
            {variant !== "C4" && !review ? strip : null}
            {variant !== "C2" ? checklist : null}
            {missing.length ? (
              <p className={s.warning} role="status">
                {missing.map((i) => i + 1).join(" · ")}쪽이 빠졌습니다. 모든
                쪽을 찍은 뒤 진행합니다.
              </p>
            ) : (
              <p role="status">{total}쪽이 모두 있습니다.</p>
            )}
            <p className={s.disclosure}>
              채점을 위해 사진과 답안이 외부 AI 서비스 Claude로 전송됩니다.
            </p>
            <button
              type="button"
              className={s.primary}
              disabled={
                missing.length > 0 ||
                blocked ||
                (role === "teacher" && !student)
              }
              onClick={onRead}
            >
              읽은 답 확인 상태 보기
            </button>
            <button type="button" onClick={() => setCodeOpen(!codeOpen)}>
              QR이 안 읽히나요 · 글자 코드 입력
            </button>
            {codeOpen ? (
              <div className={s.codeEntry}>
                <label>
                  지면 아래 글자 코드
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={sample.code}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setCodeMessage(
                      code.replace(/[.\s-]/g, "").toUpperCase() ===
                        sample.code.replaceAll(".", "")
                        ? "이 시안의 지면 코드입니다. 운영 조회는 하지 않았습니다."
                        : "시안에 표시된 글자 코드를 다시 확인해 주세요.",
                    )
                  }
                >
                  표본 코드 확인
                </button>
                <p role="status">{codeMessage}</p>
              </div>
            ) : null}
          </div>
        )}
      </Phone>
      {picker ? (
        <PickerDialog
          title="답안 주인 고르기"
          returnFocus={pickerButton}
          onClose={() => setPicker(false)}
          size="fit"
        >
          <div className={s.pickerBody}>
            <p>
              선택 구조만 확인하는 가상 계정입니다. 실제 학생 목록을 읽지
              않습니다.
            </p>
            <label>
              학생 검색
              <input value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            {["학생 가 · 초5 A반", "학생 나 · 초5 B반", "학생 다 · 초5 A반"]
              .filter((name) => name.includes(query))
              .map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => {
                    setStudent(name);
                    setPicker(false);
                  }}
                >
                  {name}
                </button>
              ))}
            {![
              "학생 가 · 초5 A반",
              "학생 나 · 초5 B반",
              "학생 다 · 초5 A반",
            ].some((name) => name.includes(query)) ? (
              <p>검색 결과가 없습니다.</p>
            ) : null}
          </div>
        </PickerDialog>
      ) : null}
    </>
  );
}
