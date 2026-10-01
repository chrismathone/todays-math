# cb-code — 개념 백지 지면 코드 (사진 채점의 첫 걸음 — 코드만 찍는다)

> 먼저 읽을 것: `docs/planning/26-concept-blank.md`(전부 · §8) · `docs/planning/tracks/reports/consult-27/consensus.md` §1 안건 7 ·
> `src/lib/concept-blank/selectionCodec.ts` · `compose.ts` · `src/components/concept-blank/paper/`(쪽 나누기 `paginate.ts` · `PaperParts.tsx`).
> 가지: 워크트리는 이미 제 가지(로컬 main 에서 갈렸다) 위에 있다 — 새 가지를 만들지 않는다.

## 왜

원장님 2026-09-30: «수학 개념백지는 사진으로 찍어 ai 채점 가능하게». 3자 합의(리드 · codex · grok 3:0) — **지금은 지면에 코드만 찍어 둔다.**
채점 기능은 실제 답안 사진으로 판독을 잰 뒤에 정한다. 코드는 기능보다 먼저 찍어야 나중에 사진과 지면이 이어진다.

## 무엇을

1. **순수 함수** `src/lib/concept-blank/sheetCode.ts` — 계약은 `src/contracts/conceptBlank.contract.ts` 옆에.
   - `encodeSheetCode(selection, bank) → string` · `decodeSheetCode(code) → { selection, bankDigest } | null`.
   - **글자 코드**다(QR 없음 — 라이브러리를 더하지 않는다). 손으로 옮겨 적거나 사진에서 읽어도 덜 틀리게: 대문자 + 숫자,
     헷갈리는 글자(`I` `L` `O` `U` · `0`/`O` · `1`/`I`)를 뺀 글자표(Crockford base32 같은 것) · 네 글자마다 끊는 점.
   - **코드만으로 선택을 되살릴 수 있어야 한다**(DB 가 없다 — 식별자만 찍고 되살릴 길이 없으면 쓸모없다). 주소의 `?s=`(base64url JSON)는 길어서 못 쓴다 —
     소단원은 단원 나무의 차례 번호로, 형식 · 난이도별 수는 촘촘하게 묶어라. 꼴 판 번호를 코드 맨 앞에 둔다(`1`).
   - **은행 판을 가른다** — 그 선택으로 뽑힌 문항의 id 와 정답에서 낸 짧은 지문(예: 네 글자). 은행이 바뀐 뒤의 지면과 옛 지면을 가를 수 있게.
     지문이 다르면 `decode` 는 선택은 돌려주되 «은행이 바뀜»을 알린다.
   - 코드는 **지면을 가리킬 뿐 학생을 가리키지 않는다** — 학생 이름 · 번호를 코드에 넣지 않는다.
   - 길이를 재서 보고서에 적어라: 소단원 하나 · 셋 · 대단원 하나 통째 · 학년을 넘는 열 개. 한 줄(지면 폭)에 안 들어가는 선택이 있으면
     어디서부터인지와 그때의 처리(두 줄 · 또는 «코드 없음»)를 **추측하지 말고 리드에게 question**.
2. **지면** — 학생지 · 채점표 모든 쪽의 아래에 `코드 · 쪽/전체쪽 · 학생지|채점표`를 작은 고딕 라벨로. 본문 자리를 먹지 않게(지금 쪽 나누기 예산을 넘기지 않는다 —
   넘기면 예산을 같이 고치고 넘침을 다시 잰다). 같은 고르기면 같은 코드(고정 문항 — D-150 ⑹).
3. **시험**(빨강 먼저): 왕복(encode → decode 가 같은 선택) · 글자표 밖 글자 0 · 은행 한 글자 바뀌면 지문이 달라짐 · 잘못된 코드는 null ·
   지면 모든 쪽에 코드와 쪽 번호가 있다 · 학생지와 채점표의 코드 몸이 같다.
4. `/dev/print-check`(`src/app/dev/print-check/items.ts`)에 항목 하나 — «개념 백지 지면 코드 — 폰으로 찍어 읽히는가»(상태 «대기»).

## 하지 않는 것

올리기 화면 · AI 호출 · 결과 저장 · DB · QR. 은행(`bank/`) 수정.

## 끝났다는 것

- 위 시험 초록 + 기존 개념 백지 시험 · 지면 e2e 가 그대로 초록(넘침 0).
- 보고서 `docs/planning/tracks/reports/cb-code.md` — 코드의 꼴 · 길이 실측 표 · 지면 자리 캡처 경로 · 남긴 물음.
- 가지에 커밋(main 에 밀지 않는다) → `worker_done`.

## 공통

node_modules 는 main 을 가리키는 정션 — `npm install` · `npx prisma generate` 금지. 전체 `npm run type-check` 금지.
vitest 는 파일 이름을 적고 `--pool=threads --maxWorkers=1`. 무거운 검사 전에 `C:\Users\user\orca\cb-verify.lock` 가 있으면 기다리고, 없으면 만들고
(내용: 트랙 이름) 돌린 뒤 지운다. 답과 보고서는 한국어.
