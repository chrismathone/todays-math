# 영어 자료은행 공동 검토 요청

사용자 승인: A 목록+상세 배치, 기존 웹앱 컴포넌트와 디자인 재사용, 합의 후 구현. 사용자 추가 요청: 듣기 문항에 맞는 그림 보기를 Codex로 미리 준비하고 재사용. 실제 Claude·Grok 독립 검토 후 Codex가 쟁점을 정리해 재검토를 요청한다.

## 검토 대상

- `docs/planning/english-resource-bank-plan-20261003.md` (최신은 main 작업공간 파일을 읽을 것)
- `docs/planning/tracks/reports/english-passage-bank-audit-20261003.md`
- 실제 `src/contracts/english*.ts`, 영어 API/ownerScope/menu policy, `EnglishMakerView`, `EnglishStudio`, `ListeningStudio`, listening runtime, `prisma/schema.prisma`
- EBS 공식 참조 목록 `docs/listening-samples/ebs-catalog-20261003.json` (192회, 원본 재호스팅 허용 미확인)

## 결정할 것

1. 시험과 독립된 지문, 불변 원문 개정, 제작 당시 사본, 사용한 문제 세트의 연결. 구체적인 최소 DB/API와 소유 범위·CAS·삭제 동작.
2. 직접 입력/TXT, 기존 자료 및 문제 세트의 명시적 가져오기, 멱등성, 중복 후보, 원문과 변형문 구분. 저장 30,000자/생성 18,000자 차이를 조용히 자르지 않고 처리.
3. 자료은행 메뉴와 기존 영어 메뉴 차단·듣기 시범 권한 호환. 은행 이름으로 교사 전체 공유를 열지 않음.
4. 기존 자체 듣기 목록 서버 필터/페이지 나누기, 공식 링크 별도 참조, 기존 검수·발행 관문 유지.
5. 문항별 그림 보기: 소재 재사용과 문항별 보기 묶음의 구분, 자산 개정/출처, 학생 접근/중립 대체 설명, 수정 시 검수 무효화. 현재 텍스트 보기 계약에서 확장할 최소 경로와 필요한 검증. 그림 생성 대량 작업은 합의 전 실행하지 않음.
6. 구현 가능한 첫 범위와 후속 범위, 반드시 막아야 할 결함과 취향 개선을 구분. 실제 코드 경로를 인용하고 수용 테스트를 제안.

## 작업 경계

읽기와 본인 검토 보고서만 작성. 제품 코드·다른 보고서·DB·비밀정보·외부 배포 변경 금지. 유료 API, Docker, 추가 하위 에이전트 금지. 커밋하지 말고 결과 보고서 경로와 핵심 결론을 반환. live orchestration preamble의 완료 절차를 따른다. 독립 검토 뒤 정리된 합의안에 동의/수정 필요를 한 번 더 요청할 예정이다.
