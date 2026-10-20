# 인쇄 템플릿 검토 도구

제품 `src/**`를 수정하지 않는 DB 없는 지면 검토다. 외부 API를 호출하거나 문제은행·학생 기록을 읽지 않는다. `npm install`, `prisma generate`를 실행하지 않는다.

## 현재 상태 (2026-10-20)

- 빠른 채점표 4안 완료: `6c52d6869`.
- `build-quick-key.mjs`는 제품의 `fractionViewFor`, `MathText`, `SolutionText`를 가져와 자체 제작 정답을 조판하고 서버 없이 여는 HTML을 저장한다.
- `verify-wires.mjs --quick-only`로 저장 HTML을 다시 열어 12사례의 문항 번호 완전성, 셀·쪽 넘침과 외부 요청을 확인했다.
- 템플릿 실측은 별도 Orca Codex 워크트리 `print-template-measure`에서 준비 중이다. 그 결과를 통합한 뒤 템플릿 Wire를 생성한다.
- **리드의 메모리 제한 지시로 새 Vite·크로뮴·측정 실행은 중지 중이다. 재개 연락이 오기 전에는 아래 명령을 실행하지 않는다.**

## 재개 뒤 차례

한 단계가 끝나고 프로세스가 종료된 것을 확인한 뒤 다음 단계를 실행한다. 작업 관리자 또는 `Get-CimInstance`로 해당 작업의 프로세스와 가용 메모리를 확인한다. 다른 작업의 프로세스는 종료하지 않는다.

1. 별도 워크트리의 실제 `WorksheetPrint` 측정 완료와 커밋을 확인하고 이 브랜치에 통합한다. 캡처 12장과 수치·코드 비교표를 검토한다.
2. `evidence/rendered-pages.json`이 준비되면 `node scripts/qa/print-templates/build-template-wire.mjs`로 Wire HTML을 만든다. 이 단계 자체는 파일을 읽어 HTML을 만드는 작업이며 브라우저를 띄우지 않는다.
3. 가용 메모리와 리드의 실행 가능 상태를 확인한 뒤 `node scripts/qa/print-templates/verify-wires.mjs`를 단독 실행한다. 종료 후 남은 Vite·크로뮴 프로세스가 없는지 확인한다.
4. 4방향의 스크린샷을 눈으로 확인하고, 넘침이 있으면 코드 수정 → 해당 검증만 다시 실행한다.
5. 최종 측정 보고와 추천을 기록하고 작업 단위 커밋. 푸시하지 않는다.

## 템플릿 Wire 입력

`evidence/rendered-pages.json`:

```json
{
  "styles": "캡처 지면에 쓰인 CSS (또는 CSS 문자열 배열)",
  "templates": {
    "pyeongga": { "first": "첫 쪽 HTML", "last": "마지막 쪽 HTML", "items": ["문항 HTML"] },
    "jeongtong": { "first": "...", "last": "...", "items": ["..."] },
    "modern": { "first": "...", "last": "...", "items": ["..."] },
    "workbook": { "first": "...", "last": "...", "items": ["..."] },
    "jaseup": { "first": "...", "last": "...", "items": ["..."] },
    "yuhyung": { "first": "...", "last": "...", "items": ["..."] }
  }
}
```

`first` / `last`는 실제 A4 루트(`[data-unified-paper]`)를 포함한다. `items`는 숨은 측정 호스트를 제외한 실제 페이지의 `[data-measure-idx]` 전체를 원래 번호순으로 담는다. CSS는 원래 지면의 토큰과 CSS 모듈을 포함하되, 캡처를 위한 전체 화면 숨김 규칙은 제외한다. 이미지와 글꼴을 외부 서버에서 가져오는 입력은 최종 저장 전 포함하거나 로컬 자원으로 바꿔야 한다.

현재 여섯 지면은 원래 DOM을 보존한다. 제안 22면은 모두 같은 정통 지면의 문항 DOM을 사용하여 머리·문항 배치·풀이 공간의 차이만 보게 한다. C안은 기존 여섯 이름의 대응표를 보여 주되, 통합 후의 네 지면만 그린다. 두 단의 문항은 왼쪽 단을 위에서 아래로 읽은 뒤 오른쪽 단으로 이어진다.

## 해석의 한계

- 빠른 채점표의 해설은 앞 3개만 보여 준다. 전체 정답·해설지의 제품 페이지 수가 아니다.
- 50·100문항은 자체 제작 25문항의 답을 반복한 스트레스 표본이다.
- 템플릿 제안은 첫 3~6문항의 첫 쪽 Wire다. 25문항 전체의 새 페이지 수나 제품 페이지 나눔의 검증 결과로 해석하지 않는다.
- 선택 전 Hi-fi나 제품 구현, `/dev/print-check` 항목 추가, 실물 검수는 하지 않는다.
