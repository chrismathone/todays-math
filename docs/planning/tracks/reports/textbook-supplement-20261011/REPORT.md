# 교과서 미적재 보강 — 2026-10-11

현재 확보한 천재교육 미적분1(홍진곤) 평가 자료 114편에서 **정답 22개를 추가 추출했고, 그중 글 문항 20개를 준비·계산 대조·제품 문항 뷰 검사까지 마쳤다.** 적재는 coordinator 소유이며 이 작업자는 DB에 쓰지 않았다. 원본 ID·번호·출처 순서와 기존 문항·사람 수정·검수 기록을 보존했다.

최종 인계물은 [candidate-packet.json](packet/candidate-packet.json), [prepared.jsonl](packet/prepared.jsonl), [검토 화면](packet/review.html)이다. 패킷 SHA256은 `066084d27f45f1b6e4434cd2b06fc46a3f5b72ffed8a6126febcda8b487ec5e2`이다. 패킷에는 기존 `tb-<key>-<section>-<number>`, 원본 경로, 출판사 풀이에서 읽은 답, 원문·풀이 증거, 생산용 변환 결과, 실제 차시 ID, 제안 유형·난이도와 근거, 제품의 책·자료 메타데이터가 있다. `pending`·`directUseAllowed=false`이며 사람의 검수 로그나 통과 판정을 만들지 않았다.

## 실제 원본과 추출 결과

- C·D·F의 지정 프로젝트/보존/임시 자료와 N의 교육 자료 폴더에서 옛 `E:/todays-math-textbook-import` 작업물을 찾지 못했다. E·G는 마운트되지 않았다. 관련 없는 개인 파일 내용은 읽지 않았다.
- coordinator가 연결된 Google Drive 원본을 찾았고, 읽기 전용으로 천재 미적분1 홍진곤 ZIP을 확보했다. Drive 파일 ID `1KXwcRdE2WuzmObiZUG2keF1fg2nql3id`, 240,132,791바이트, SHA256 `85566a6f568a4123bb8ea58baff321fcd81f531a631aaed38ecd5dee9dbd832b`.
- ZIP의 평가 자료 HWP 114편이 기존 DB 스냅샷의 이 책 **적재 자료 경로 61개 전부**와 일치했다. 각 자료의 `source_material.external_key`도 정확한 옛 G 경로 SHA1과 일치했다. 로컬 저장 위치는 `localPath`로 분리했다. [원본 영수증](source-manifest.json).
- 변환 114편 성공, 실패 0. 구 코드의 추출을 재현하니 덩이 580개, 실제 평가 문항 445개, 정답 매핑 299개였다. 기존 보고서의 445·299와 일치했다.
- 보강 뒤 정답 매핑 **321개**, 증가 **22개**. 580개 전부 ID·순서·본문·원본 풀이 불변, 기존 정답 손실 0. [최종 대조](final-candidates/summary.json), [변경별 증거](final-candidates/answer-changes.jsonl).
- 추가 답 가운데 20개는 글로 완결된다. 기존 `figures.py`가 반복 그림의 바이트와 도형 규칙으로 장식을 분류했고, 8개가 text 경로로 풀렸다. [그림 분류 증거](figure-meta.jsonl). 실제 그림/표 2개는 보류했다.
- 이번에 읽은 책의 보고서 관측 149개는 원본과 대조해 모두 정확한 ID를 찾았다. 기존 미매핑 146개 중 22개 답을 읽었고 **124개는 여전히 미매핑**이다. 별도의 기존 검토 탈락 3개는 답이 있더라도 이 신규 후보로 넣지 않았다. [문항별 상태](final-candidates/scope-audit.jsonl).

## 고친 원인

`convert_batch.py`는 옛 출처 경로와 로컬 바이트 경로를 분리하고 경로 키·원본 SHA256을 확인한다. 기존 입력처럼 `localPath`가 없으면 기존 경로를 사용한다. Windows 콘솔의 em dash 인코딩 실패도 고쳤다.

`extract.py`는 출판사 풀이의 명시적 결론 `따라서 $k=-6$`, `…에서 $x=-5/4$`, 앞 문단의 «구하는 범위는»을 읽는다. 접선·직선 방정식은 `y=`를 유지하며 `또는`으로 이어진 답과 문단 넘김을 모두 보존한다. 여러 독립 대입값·조건부 가지·못 읽은 소문항은 추측하지 않는다. 기존 정답 짝 의심 관문은 그대로 적용했다.

`prepare.py`는 `$k$$(0<k<1)$`의 인라인 경계를 분리하고, 원본의 미터·가속도 단위에 들어 있던 `rm`과 간격기호를 보존한다. 숫자·조건은 바꾸지 않았다. 기존 손질·KaTeX 관문을 통해 최종 20개가 `bad=[]`, `solutionFigure=false`로 준비됐다.

## 검증과 한계

Python **109개 통과**, 관련 Vitest 4파일 **133개 통과**, `git diff --check` 통과. 이 책의 실제 재추출 전후 비교가 번호·순서·본문·풀이·정답 보존을 확인했다. 다른 미확보 책 전체에 대한 회귀 검증은 아니다.

로컬 SymPy 1.14.0이 조건에서 다시 계산한 답 **20개가 전부 출판사 풀이에서 읽은 답과 일치**했다. 접점의 모든 해, 극값 없는 조건의 경계, 중심 차분의 2배 계수와 정지 시각을 확인했다. 계산은 질문 SHA256에 묶여 있고 질문이 바뀌면 도구가 중지한다. [계산 패킷](packet/calculated-candidates.json). 이 작업자가 먼저 원본을 읽었으므로 이 기록을 정답 비공개 검토로 표현하지 않는다.

coordinator도 별도로 20개를 재계산했고 실패 0을 보고했다. 그 독립 증거는 main의 `scripts/qa/textbook/supplement-20261011/independent-math.py`와 `.qa-artifacts/textbook-followup-20261011/independent-supplement-math.json`에 있으며 coordinator가 관리한다. 원장/교사의 직접 검수 기록을 대신하지 않는다.

실제 `PaperProblemView`와 생산용 CSS·KaTeX 글꼴로 본문·답·풀이 60개를 렌더했다. Chromium 1440px·390px에서 문항 20개, 수식 오류 0, 본문/문서 넘침 0, 인라인 `$$` 노출 0, 깨진 이미지 0. [DOM 검사](packet/browser-qa.json), [컴포넌트 렌더 영수증](packet/component-render.json). 데스크톱·휴대폰 화면과 경계/단위를 직접 확인했다. 별도 검토 HTML 검사이며 전체 앱·최종 PDF·사람의 출제 승인 검사는 아니다.

## 남은 것과 셈의 범위

추가 답 두 개는 `tb-b8f8e88c3f395263-0-2`(실제 그림), `tb-f7cf1cee1ee2b598-0-12`(자료 표)다. 답만으로 원본의 시각 자료를 대신하지 않았다. [기계용 차단 목록](blockers.json).

10월 8일 보고서를 다시 파싱해 미매핑 **6,528개**, 검토 탈락 **997개** 관측을 재현했다. 보고서가 단일 묶음의 번호·전체 경로·자료 키를 생략한 경우 그대로 미상으로 둔다. [전체 관측](inventory/report-observations.jsonl), [집계](inventory/inventory.json). 이 옛 숫자를 현재 DB 미적재 고유 ID 수로 표현하지 않는다.

준비 보류 677개와 렌더 실패 90개는 옛 보고서에 개별 ID가 없다. 옛 추출/준비/적재 계획이 없으면 정확한 ID와 겹침을 확정할 수 없다. 옛 요약은 `13,771-677-90-997=12,007`인데 적재 수를 12,281로 적어 **274개 차이**가 있다. 숫자를 맞추기 위해 후보나 답을 만들지 않았다. 이미 적재한 잠금 475개는 신규 미적재 범위에서 제외했고 10월 9일 복구 기록도 보존했다.

원본 Drive에는 HWP 개별 파일 대신 큰 ZIP이 있다. 미래엔 공통수학1 ZIP(450,035,221바이트)은 connector의 268,435,456바이트 제한으로 HTTP 413이었다. 이후 사용자 지시에 따라 새 대형 ZIP 확보를 중지하고 이미 확보한 114편 범위만 마쳤다. E 추출 작업물, 다른 책의 원본/정답책, 그림·표 렌더와 미해결 검토는 남았다.

## 재현

저장소 루트의 PowerShell에서 실행한다. 기존 출력은 보존하고 **새 출력 폴더**를 사용한다. Python 3.12·Pillow·pywin32·SymPy·pytest와 저장소 Node 의존물이 필요하다. 한글 변환은 별도 데스크톱에서 숨겨 실행한다. ZIP 및 변환 산출물은 저장소 밖/무시 경로에 보존한다.

```powershell
python scripts/import/textbook/supplement-20261011/inventory.py --out .qa-artifacts/supplement-inventory-new
python scripts/import/textbook/supplement-20261011/stage_archive.py --archive .qa-artifacts/textbook-supplement-20261011/originals/chunjae-calculus1-hong.zip --logical-root 'G:\고등교과서\미적분1\천재교육 미적분1 (22개정) (홍진곤)' --snapshot C:/Creative/testautocreator/.qa-artifacts/textbook-followup-20261011/source-snapshot.json --out .qa-artifacts/supplement-stage-new --drive-id 1KXwcRdE2WuzmObiZUG2keF1fg2nql3id
python scripts/import/textbook/convert_batch.py 0 1 .qa-artifacts/supplement-converted-new .qa-artifacts/supplement-stage-new/triage.json
python scripts/import/textbook/extract.py .qa-artifacts/supplement-converted-new .qa-artifacts/supplement-extract-new
python scripts/import/textbook/figures.py .qa-artifacts/supplement-converted-new --extract ../supplement-extract-new --out ../supplement-figures-new --export
python scripts/import/textbook/supplement-20261011/build_candidates.py --baseline .qa-artifacts/textbook-supplement-20261011/extract-baseline --recovered .qa-artifacts/supplement-extract-new --staged .qa-artifacts/supplement-stage-new --snapshot C:/Creative/testautocreator/.qa-artifacts/textbook-followup-20261011/source-snapshot.json --reports docs/planning/tracks/reports/textbook-import-20261007 --figures .qa-artifacts/supplement-figures-new/meta.jsonl --out .qa-artifacts/supplement-candidates-new
python scripts/import/textbook/prepare.py .qa-artifacts/supplement-candidates-new .qa-artifacts/supplement-prepared-new --tidy --decor .qa-artifacts/supplement-figures-new/meta.jsonl
python scripts/import/textbook/supplement-20261011/calculate_packet.py --prepared .qa-artifacts/supplement-prepared-new/prepared.jsonl --snapshot C:/Creative/testautocreator/.qa-artifacts/textbook-followup-20261011/source-snapshot.json --out .qa-artifacts/supplement-calculated-new
python -m pytest scripts/import/textbook -q
```

`extract-baseline`은 이번에 c40dab263의 구 추출기로 만든 결과다. 없으면 해당 커밋의 `extract.py`를 임시 폴더에 복사하고 `PYTHONPATH`에 저장소 `scripts/import/textbook`을 넣어 동일 변환본에서 재생성한다. 질문 문안이나 생산용 변환 결과가 달라지면 `math-specs.json` 해시는 검토 없이 갱신하지 않는다. baseline/candidate 도구는 순서·본문·풀이가 바뀌거나 출처 증거가 없으면 후보 생성을 중지한다.

원본·변환·전후 추출·준비·검사 로그는 현재 작업트리 `.qa-artifacts/textbook-supplement-20261011/`에 보존되어 있다. 작업트리 정리 전에 coordinator가 필요한 원본 ZIP·증거를 보존해야 한다. 적재 직전 현재 DB ID를 다시 제외하고 패킷 지문을 확인하는 일은 coordinator가 수행한다.
