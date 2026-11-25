# 교과서 엔진 전수 대조 (0단계)

사용자가 제공한 **저장소 밖 JSONL**을 읽고, 현재 중등 엔진 등록표와 명시적 유형 규칙으로
8,502행을 빠짐없이 분류한다. DB 연결·적재·잠금·외부 모델/API 호출은 없다.
본문·정답·풀이·출처 자료 제목·그림 바이트는 출력하지 않는다. `inspect.py`만 검토를 위해
지정한 원본을 터미널에 표시한다. 그 출력을 파일로 리다이렉트하여 저장소에 넣지 않는다.

```sh
python3 scripts/qa/textbook-engine-census/census.py \
  --input '/Volumes/새 볼륨/today-backups/textbook-mid-rows.jsonl'
python3 scripts/qa/textbook-engine-census/report.py
python3 scripts/qa/textbook-engine-census/census.py \
  --input '/Volumes/새 볼륨/today-backups/textbook-mid-rows.jsonl' --check
python3 scripts/qa/textbook-engine-census/verify.py \
  --input '/Volumes/새 볼륨/today-backups/textbook-mid-rows.jsonl'
python3 -m unittest discover -s scripts/qa/textbook-engine-census -p 'test_*.py'
```

- `input-manifest.json`: 입력 바이트·SHA256·행 수·학년별 수. 다른 덤프는 거절한다.
- `export-engine.ts`: 실제 `registeredTypes`·`generateMiddleProblem` 호출. 3개 고정 씨앗의
  출력 지문을 기록한다. `--samples`는 엔진이 자체 생성한 문항도 출력한다.
- `rules_m1.py` / `rules_m2.py`: Codex가 원문과 실제 엔진을 읽어 작성한 판정 규칙과 후보 설명.
  ⓐ는 좁은 조건·연산·목표가 일치하는 구조, ⓑ는 결정적 계산법이 있는 새 유형/확장 후보다.
  ⓑ가 현재 엔진에 반드시 없다는 뜻은 아니다. 애매한 기존 대응을 ⓐ로 올리지 않는다.
- `census.py`: 입력 검증, 그림·열린 서술·자료 부족 차단, 모든 행의 1:1 분류,
  묶음·단원·전체 집계, 재현 산출물 비교. 원문은 명시적으로 골라낸 메타데이터로만 투영된다.
- `inspect.py`: 코드 또는 동결 표본을 입력에서 다시 읽는다.
- `report.py`: 집계·후보·실제 재독 원장을 보고서로 렌더한다.
- `verify.py`: 현재 산출물의 재현, 동결 표본의 선택, 검토 연결과 수정 반영을 검사한다.
  JSON 이스케이프를 풀어 검사하며, 원문 80자 창을 20자 보폭으로 비교한다
  (99자 이상 그대로 이어진 복제 탐지). 짧은 인용·변형 문구·권리 상태를 판정하는 도구가 아니다.
  원문을 출력에서 제외하는 명시적 투영과 함께 사용한다.

```sh
python3 scripts/qa/textbook-engine-census/inspect.py \
  --input '/Volumes/새 볼륨/today-backups/textbook-mid-rows.jsonl' \
  --sample-category A --offset 0 --limit 10
```

표본 선택은 `SHA256("20261125-census-audit-v1:" + id)`의 범주별 오름차순이다.
ⓐ 80·ⓑ 40·ⓒ 20을 한 번 동결하고, 표본에 없는 ⓐ 유형은 별도 보충 점검한다.
표본을 읽은 결과는 **사람/모델 판단 근거**로 남기며 재실행 스크립트가 이를 만들어내지 않는다.
규칙을 고친 뒤 표본을 새로 뽑아 처음 오분류를 숨기지 않는다.

## 판정과 사용의 경계

전수 **규칙 적용**과 전수 **수작업 완독**은 다르다. 이 작업은 전자이며 따로 표본을 다시 읽는다.
ⓒ에는 설명·상황·개념 외에 자료가 없어 엔진 가능성을 확정하지 못한 잠정 보류도 있다.
특히 `has_figure`가 거짓이어도 본문의 그림 표지는 무시하지 않는다. 원본 그림을 보지 않고
도형 엔진의 덮임이나 정답을 승인하지 않는다. 잠금은 유형 판정과 별도 열로 보존한다.
ⓐ 또한 출제 승인·대체 적재 완료·원본 정답 검산 통과를 의미하지 않는다.

결과 파일은 `docs/planning/tracks/reports/textbook-engine-census/`에만 쓰며, 경로를 바꿔도
현재 워크트리 밖 출력은 거절한다. 원본 JSONL은 읽기만 한다.
