# 리드 웹 조사 메모 (2026-09-30)

## 연구
- CLAIM «Architect · Adversary · Judge» arXiv 2609.26087 — 9,074문항 · 755 CCSS ELA 기준 · 전문가 통과 97.8% · 10개 LLM.
  같은 모델이 적대 비평자로 재진입 → 판정자가 규칙 사전(오류-교정 규칙 44,844개, 채택/기각 문항에서 캐냄)으로 판정.
  객관식은 기본 규칙만으로 98%+ 포화, **빈칸 채우기는 82.8~96.7% — «열린 정답 경계» 문제**(인정 답 과다/누락).
  → 우리: 서술형·원문 복원의 «인정 답안» 이 같은 구조적 약점.
- Lee et al. 2024 arXiv 2404.07720 «Automatic Generation and Evaluation of Reading Comprehension Test Items with LLMs» —
  answerability(지문 보고 맞힘) · guessability(지문 없이 맞힘) · Text Informativity = 차.
  사람 문항 TI 0.294 · GPT-4 0.267 · Llama2 0.187. GPT-4 판정-사람 κ 0.724 (사람끼리 0.683).
  → 우리: «지문 없이 풀기» 탐침이 누설·상식으로 풀리는 문항을 잡는다.
- Lee, Poon, Wang, Chu 2026 (LLMs4SSH) — LLM 이 추정한 TI 는 질문·오답 범주(PIRLS·STARC)에 따라 체계적으로 치우침 →
  같은 범주 안에서만 비교.
- STARC (Berzak et al., ACL 2020) — 오답 범주: 핵심 구간 오독 · 다른 구간을 가리킴 · 지문 근거 없음 (+ 정답 = 핵심 구간).
  → 오답 설계 틀로 프롬프트에 넣을 수 있다(유형별 오답 5개를 범주로 섞기).
- ACL 2025 long 1154 «Generating Plausible Distractors … via Student Choice Prediction» — 학생 선택 예측으로 오답 매력도.
- arXiv 2606.18709 — 42개 LLM, **문항 변별도 예측 실패**(최고 0.172, 합성-사람 오답 변별 상관 0.086).
  → LLM 판정자로 «난이도·변별도»를 숫자로 보증하려 하지 말 것. 판정자는 결함(정답 유일성·근거) 쪽에만.
- arXiv 2502.14127 (ACL 2025) «Which of These Best Describes MC Evaluation with LLMs?» — leakage · unanswerability · shortcuts · saturation.
- MCQ 결함 루브릭: IWF 19항목, Haladyna·Downing·Rodriguez 31지침(오답은 모두 그럴듯하게 · 동질·평행 · 길이 비슷 · all/none of the above 금지).
  후처리 루브릭 5개 자동 검사: 최장 보기 단서 · always/never 같은 절대어 · 빈칸형 · 참/거짓 퇴화 · all/none of the above.
- 유일정답 검증법 사례: 보기 하나씩 «이게 정답인가» 0~10 채점, 1위-2위 격차 ≥5 일 때만 유효 (SBIE 2025) ·
  다섯 번 풀어 다수결(self-consistency).
- MAFIG arXiv 2605.19316 — 난이도 특성 제약 다중 에이전트: 단일 프롬프트는 제약을 꾸준히 못 지킴, 반복 수정이 제약 만족 ↑.
- 비기능 오답: 5% 미만 선택 오답 비율 58.9%(전통 지표) — 5지선다에서 매력 없는 오답이 흔하다(Rodriguez 2005 메타분석: 3지 최적).
  수능·내신 5지는 바꿀 수 없으니 «매력 없는 오답»을 줄이는 쪽.

## 한국 현장
- 2026 수능 영어 24번(제목) 이의 약 400건 — «선지에 지문에 없는 표현» 논란. 34번 빈칸 오답률 79%, 복수정답 주장(불인정).
  2015 수능 25번 복수정답 인정. 2023 수능 33번 «지문이 짧아 복수정답» 주장.
  → 우리가 보는 결함 축(정답 유일성 · 선지 표현의 지문 근거)이 실제 분쟁 축과 같다.
- 수능 출제 기본 방향(교육부 2015 보도자료): 대의 → 세부 → 문법·어휘 → 빈칸 → 쓰기 → 복합 순 배열.
- 경쟁사: SMOAT 24유형(서술형: 조건부 영작·문장 전환·핵심표현 빈칸·요약문 완성) · 강사가 «출제 포인트 마킹»하면 반영 ·
  품질 검수 절차는 공개 안 함. AutoQM · 문제선생 · 레슨위드 · 북아이피스(29유형 · 조건부영작 · 배열영작 · 어법오류수정).
- 2022 개정 영어과 기본 어휘 3,000(초 800 · 중·고 공통 1,200 · 그 밖 1,000) — KASELL 논문(journal.kasell.or.kr 35608).

## 저장소에서 본 것
- 검증기는 모양만: 5지·중복·정답 1~5·근거 연속 인용·요청 일치. 유일정답·오답 매력·유형 구조 無.
- 🔴 어법 «밑줄 ①~⑤» 를 지면에 찍을 표기가 없다 — prompt 는 평문, EnglishPaper 에 밑줄 파서 없음.
  AI 가 뭘 쓰든 지면에는 밑줄이 안 나온다. (표기 규약 + 지면 렌더 = D-07 형태 결정 + 인쇄 검수)
- DeepSeek JSON mode(response_format json_object) — 영어는 **객체 루트**라 쓸 수 있음(client.ts 는 배열 때문에 안 씀).
  단 문서: «가끔 빈 content» 주의.
- studio-ai 에 Gemini·OpenAI·XAI 키 경로가 있다(routing.ts) — 독립 풀이자로 다른 회사 모델을 붙일 여지.
- 편집기·세트 저장(PUT)도 validateEnglishDraft 를 지난다 → 새 «막는» 규칙은 사람이 고친 세트도 막는다. 품질 경고는 따로.
