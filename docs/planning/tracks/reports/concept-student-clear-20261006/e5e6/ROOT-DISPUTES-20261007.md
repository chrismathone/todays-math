# 초5·6 현행 독립 검토 지적 처리 — 2026-10-07

현행 지적 235개 응답행을 고유 ID와 실제 조립 B/C의 Root 정규화 hash로 대조했다. 고유 ID는 235개이고 모두 현재 hash와 일치한다. 중복 ID, 과거 hash 제외, 같은 현재 hash의 유효한 독립 pass는 각각 0개였다.

Codex가 원문, 실제 B 질문·참고답·필수 의미, C 학생 문장·키·인정답, 일반설명과 학습역할 및 Claude의 원래 blind/key 지적을 25개 이하씩 출력해 읽었다. 출력이 잘린 첫 독해의 61–62행과 186–187행은 따로 다시 읽었다. 원래 전체 blind 응답도 수정 후 재독해에서 읽었으며 응답의 수학적 오류·형식 판정 불일치를 pass로 바꾸지 않았다. 유지한 82개는 실제 첫 독해 입력과 당시와 같은 지문에 연결하며, 새 지문을 붙이거나 수정 후 재독해했다고 주장하지 않는다.

실제 정규화 질문 hash가 바뀐 수정은 153개이며, 개별 이유를 쓰고 현재 질문을 유지한 ID는 82개다. Codex 판정에서 남은 미처리 ID는 0개다. 이는 독립 승인이나 생산 적용 완료가 아니다. 153개 수정본은 새 hash의 Claude 교차검토를, 82개 유지본은 같은 hash의 부정 의견과 Codex 반론에 대한 분쟁 판정을 기다린다. 따라서 독립 의견이 남은 대상은 235개이며 releaseReady는 false다.

수정에는 직접 답 노출, 미지수 □와 학생 빈칸 충돌, 한정되지 않은 범위·최대값, 형식이 열려 있는 슬롯, 물음에 없는 필수 기준, 설명·질문·기준 불일치와 막연한 제외 이유가 포함된다. 정답의 순서가 필요한 비례배분은 앞항·뒤항을 명시했다. 배율이 입력 수와 같다는 이유만으로 복사라고 하지 않았고, 주어진 결과 해석·짧은 대소 판단·표준 이름은 타당하면 유지했다. 다른 타당한 풀이를 임의로 막지 않았으며 B의 anyOf를 문자열 검색 채점으로 해석하지 않았다.

일반설명 coreAfter를 새로 고친 ID는 `e5-1-2-1-xc21`(1부터 세는 범위와 나머지를 따로 구한 몫)과 `e5-1-5-3-xc4`(최소공배수가 분모의 곱과 같을 수도 있음)이다. 교정문 없이 의도만 남아 있던 `e6-1-3-2-c1`, `e6-1-3-2-xc24`의 coreReason은 지웠다. 원본 일반설명은 별도 source에 그대로 보존했다.

재독해에서 초기 수정안 13개를 다시 보완했다. 특히 `e6-2-2-2-xc8`에서 임의의 자연수 배율이면 25도 두 수를 자연수로 만든다는 사실을 확인하여, 소수점 이동에 맞는 10·100·1000 등의 선택 조건을 명시했다. 초기 재독해 입력과 이 추가 수정의 개별 이유·최종 정규화 입력을 모두 보관했다. `e6-2-1-1-xc11`, `e6-2-1-1-xc12`의 작으면·크면 C는 원래 인계와 완전히 같고, 필수 그림이 없는 기존 제외 항목을 활성화하지 않았다.

현재 audit/partial-audit와 codex-final-editorial은 동결 인계 `ad78cd2b75d03708ef8bfef704f101d7d4304c72`와 다르다. 153개 질문 hash가 바뀌었고 235개 audit 행·ledger 행에 현재 Codex 증거가 연결되었다. 그 외 2,386개 audit 행은 동결 인계와 같다. 기존 190개 직접 독해 입력, 원본 응답, 고정 인계 summary 및 그 manifest를 포함한 기존 파일 1,244개는 변경하지 않았다. 기존 summary의 currentArtifactSha256는 동결 인계 파일의 기록이며 이번 현재본에 대한 manifest가 아니다.

전체 2,621개를 Root의 절대 경로 라이브러리와 private node_modules/tsx 및 Root tsconfig로 검증했다. sourceIndex·ID 순서·수준·원본 source·sourceFingerprint·e5e6 proposalFingerprint·editorialFingerprint·실제 캡처 B/C payload가 모두 일치한다. partial-audit의 rows가 실제 audit rows와 같고, 계약 오류·표기 오류·빈칸 충돌은 0개다. 현재 counts도 재계산했다. 기존 세 JSON 파일의 CRLF·들여쓰기를 유지하고 대상 행과 counts만 교체했다.

증거는 [evidence/root-disputes-20261007](evidence/root-disputes-20261007/)에 있다. `before-actualrows-and-normalized.json`은 변경 전 전체 대상 행과 현재 정규화 입력 및 원래 지적을, `decisions-*.json`은 배치별 수동 판정과 시각을 담는다. `after-batch-*.json`, `manual-reread-ledger.json`은 최종 실제 입력·SHA·개별 판정과 지문을 연결한다. `original-independent-files-sha256.json`은 지적의 원래 68개 packet 입력·원문·응답·출처의 SHA를 기록한다. `current-question-hashes.json`은 235개 현재 질문 hash, `full-2621-current-hashes.json`은 전체 hash 목록, `changed-vs-frozen-handoff.json`은 실제 수정·유지 및 현재 인계 대비 변경 ID 목록, `full-validation.json`은 전체 검증 결과다.

Root가 새 Claude 교차검토·전체 통합·학생 지면 및 메모리 검증·정상 push·배포를 수행한다. 이 작업자는 DB·환경·Prisma·설치·운영코드·push·main checkout을 변경하지 않았다.
