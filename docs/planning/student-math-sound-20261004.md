# 학생 수학 무료 사운드 최종안 v3

2026-10-04 최신 사용자 요청으로 기존 v2의 사운드 제외만 변경한다. 시각·채점·1200ms·키보드·포커스·큐·경제는 v2 그대로다. Codex는 아래 Claude 필수 수정 1~10 전체를 수용한다. Claude는 모두 반영하면 재확인 없는 동의로 명시했다. Claude 최종 동의 task_32399d02803f/ctx_b503e8e72d81, Grok 최종 동의 task_c389004195ce/ctx_af12eb16fcad를 기록했다. Codex 동의와 함께 3자 합의가 완료됐고 아래 본문으로 구현한다.

1. 학생 수학 탐험 경계(은행 분기·완료 칸 재풀이 포함)에만 별도 LearningSoundsProvider와 context를 둔다. 밖은 no-op. LearningMotion 자체에 사운드를 합치지 않는다. 단답/자기 평가도 포함하지만 교사/영어/lab은 제외한다.
2. 기본 끔, 학생 id 없는 별도 기기 key, gain 0.2. 움직임 줄이기와 독립이다. 기존 홈 학습 설정의 이 기기 설정에 효과음 switch와 미리 듣기(correct) 단추를 같은 문법으로 추가한다. 학년·단원 잠금/저장 중에도 조작된다. 미리 듣기는 켜진 때만. 켜기/미리 듣기에서 준비 중·재생 불가를 설명 줄에 표시하고, 풀이 중 실패는 조용히 처리한다. 기기에 저장된 설정이라는 점을 밝힌다.
3. Kenney Interface Sounds 1.0 CC0 원본 중 correct=confirmation_003(322ms), soft=pluck_002(162ms), complete=confirmation_002(539ms) 셋을 PCM16 mono 44100Hz WAV로 변환해 public/audio/math-learning에 로컬 호스팅한다. 원본 압축본/각 OGG/배포 WAV 해시·바이트·길이·표본율·채널·피크 및 변환법·출처를 README/정본 manifest에 기록하고 License 원문을 보관한다. .gitattributes에 이 폴더 -text. node 시험이 실제 파일 정본 목록/해시를 검증한다. 이름·파형 수치로 선택했으며 청취 검수/실물 iPhone·iPad 확인은 대기다. hotlink/결제/API/생성음/BGM/VARCO/상자음/콤보 전용음/셀 클릭/지도 hop 소리는 제외한다.
4. /audio/math-learning/**의 GET|HEAD만 학생 ACTIVE_RULES와 proxy의 익명 정적 공개 경로에 허용한다. 다른 audio 경로·POST는 허용하지 않는다. 학생·익명·접두사 밖 경로 관문 단위시험을 RED→GREEN로 확인한다. Vite fixture는 실제 관문을 지나지 않으므로 이를 관문 근거로 쓰지 않는다. Next production build/start 익명 실물 GET의 200, audio/*, 배포 파일 SHA를 대조한다. 실제 학생 세션 관문은 mock 단위시험이며 운영 DB 실물 세션은 검증 대기로 적는다.
5. 발화는 렌더/AnswerFeedbackEffect/useEffect가 아니라 기존 확정 전이가 커밋되는 명령형 자리다: 탐험 confirmedAnswers 통과 블록(studentId:requestId), 초등 StudentCourseSrs after(session:problem:retryIndex), 중등 첫 풀이 after(mission:problem), 중등 재풀이(mission:problem:retryTurn), 완료 칸 replay POST(feedbackEvent). 새 서버 필드/UUID 없음. 같은 키는 중복 재생하지 않는다. 엔진은 직전 이벤트 키 하나만 보관하며 탐험 confirmedAnswers는 최근 16개 bounded로 바꿔 기존 같은 요청 가드를 유지한다. 학생 변경/로드/해설/GET replay/409/5xx/늦은 응답/재마운트/StrictMode 효과에서 소리 없음. 공개 메서드는 동기 void, 내부 예외·거절을 모두 처리해 저장 성공을 오류로 바꾸지 않는다.
6. 같은 action 의미를 결과 문구와 함께 판정한다. 실제 채점된 정답이고 자기 평가·모르겠어요가 아니면 correct, 그 외 오답/모름/자기 평가 맞음·틀림은 soft. 공방 lab-* 전체는 이번 1차에서 무음이다(Grok의 반복 조작 피로 우려 수용). 빈 답만으로 초등 자기 평가를 모름으로 추정하지 않는다. 단일 공통 deterministic cue 판정 함수를 써 caller가 실제 제출 action을 준다. 서버 채점은 변경하지 않는다.
7. complete는 기존 showTile 하루 칸 효과 한 곳에서만: 같은 학생의 완료 아님을 본 뒤 이 경계에서 확정 답을 하나 이상 냈고, 그 후 showTile이 실제 호출된 전이일 때만. 초등/중등 완료 화면과 onComplete에 중복 연결하지 않는다. 은행 exitBank의 완료 GET은 이 조건을 만족할 때 showTile의 확인 전이로 허용하는 명시 예외다. 로드 시 이미 완료·다른 기기 완료 뒤 새로고침·학생 변경은 무음. 시트로 칸 효과가 미뤄지면 소리도 같은 때. 상자음은 이번 범위에서 보류한다(1200ms 연출과 서버 확정이 어긋날 수 있음).
8. 끔이면 음원 요청 0·AudioContext 생성 0. 켬이어도 마운트에서 만들거나 resume하지 않고 설정 켜기/미리 듣기/시작·답의 동기 gesture 구간에서만 만든다. 숫자키·Enter는 document keydown에서 programmatic button.click()이므로 click.isTrusted 필터를 쓰지 않고 실제 키 gesture에서 resume한다. context running/버퍼 ready가 아니면 확정 결과 소리는 버린다. 과거 소리를 나중에 내거나 자동 queue하지 않는다. 선택한 파일 3개만 캐시, 한 source, 새 소리는 앞 소리 중지. mute·다른 탭 mute·hidden·unmount에서 source 즉시 stop, pending decode/재생 세대 무효화, fetch abort, unmount에서는 context close. 돌아와서 자동 resume하지 않고 다음 gesture를 기다린다.
9. fetch는 ok·redirected=false·Content-Type audio/*·decode 성공을 모두 요구한다. 404, 200 HTML, decode 실패, resume 거절, 없는 API 모두 풀이 영향 없음. 저장소 실패 때 이번 화면 토글은 동작한다. 동기 메서드가 던지는 가짜 context 시험에서도 실제 결과/저장 성공 유지. 무음/재생불가 상태는 시트에서 보인다.
10. 시험은 엔진/preference/외부no-op/음소거/gesture 거절/중복/취소/HTML 응답/숨김/언마운트, 실제 caller의 초기·오류·학생격리·자기 평가 mapping·완료 eligibility를 포함한다. Vite 실제 WAV decode + 사용자 gesture activation 기록 + 스위치/미리 듣기/키보드/OS독립/숨김을 확인한다. 브라우저 autoplay 허용 플래그 사용 없음. 설치/Prisma/운영학생DB/유료서비스 사용 없음. 문서 v2, 05의 음원 제외 문장을 이 변경으로 개정하고 생성음/VARCO/랩 합성음 제외는 유지한다.

출처: https://kenney.nl/assets/interface-sounds, https://kenney.nl/support, Kenney가 업로드한 https://opengameart.org/content/interface-sounds 와 다운로드 License.txt. CC0가 허용하는 교육 사용과 실제 License 원문의 교육 문구를 구분한다.

## 최소 범위 조정 3개
- 공방 lab-* 전체는 이번 1차에서 무음. 이미 확정된 보기 답/은행 답/완료 칸 재풀이에만 correct/soft. 공방의 결과 문구와 시각 효과는 v2 유지.
- 상자음은 보류. 시각 낙관 효과는 v2 유지하나 늦은 서버 확인에서 별도 소리를 내지 않는다. 완료음은 엄격한 본인 확정 답 eligibility가 있는 showTile만.
- 효과음 켜기는 준비/언락만, 미리 듣기는 별도 단추를 직접 눌러 버퍼 준비된 경우 correct를 1회 재생. 초기 끔에서 요청0이므로 켜는 동기 gesture 안에 첫 decode 완료까지 보장할 수 없다. 준비 후 자동 미리 듣기를 queue하지 않는다. 시트 설명에 준비 중/재생 불가/준비됨을 표시한다.
