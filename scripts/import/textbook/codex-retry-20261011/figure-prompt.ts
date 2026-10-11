import catalog from "../../../figure/engine-catalog.json";

/** This offline path actually supplies hash-bound images; the text-only transform prompt does not. */
export function groupedFigureInstruction(): string {
  return [
    "[첨부 그림 변형] requiresFigure=true인 원문은 첨부 이미지의 조건도 문제의 일부입니다. 자기 source의 모든 attachment를 순서대로 읽고, 그림에만 있는 수치·조건·점의 역할·표의 셀·보기 내용을 빠짐없이 확인하십시오. 판독할 수 없는 조건을 추측하거나 지어내지 마십시오. 수행할 수 없다면 성공한 변형이라고 주장하지 마십시오.",
    "각 slot은 바꾼 수치와 조건에 맞는 새 FigureSpec 객체를 figureSpecJson의 JSON 문자열로 제공합니다. literal null, 문자열 null, 배열, SVG, URL, 원본 래스터 복사는 허용하지 않습니다. 그림 조건을 본문으로 옮겨도 새 그림이 필요합니다. 원문에 여러 그림이 있으면 모든 필수 정보를 하나의 새 그림에 표현하십시오. 본문에는 그림의 필수 조건도 명시해 본문과 그림을 대조할 수 있게 하십시오.",
    "새 그림이 있으면 content의 발문에서 실제 그림을 넣을 위치에 [그림] 표지를 정확히 한 번 쓰십시오. 보기 안에 넣거나 표지를 생략/중복하지 마십시오. 새 그림 한 개와 표지 한 개가 반드시 대응해야 합니다.",
    "좌표 규칙: version 2는 SVG 화면 좌표(y가 아래로 증가), 도형 크기는 대략 100~300 화면 단위로 잡습니다. graph-1은 수학 좌표(y가 위로 증가)이며 명시적인 xRange/yRange와 240~640 픽셀의 출력 크기를 사용합니다. elem-1은 종류별 자동 배치입니다. 모든 버전에 -10..10 크기를 적용하지 마십시오. 글자와 선이 겹치거나 도형이 너무 작아지지 않게 하십시오.",
    "표는 elem-1/table로 모든 행·열·셀을 보존하고, 조건 상자는 elem-1/boxedList 또는 axes:false인 graph-1의 수식 labels/segments로 표현합니다. 그래프는 graph-1의 실제 지원 curves 계약을 따르십시오. 미지원 곡선을 다항식이나 임의 선분으로 흉내 내지 마십시오. 음영은 실제 경계와 일치해야 합니다. 괄호 안 수치·식은 아래 문법 예시일 뿐 원문이나 변형 조건이 아닙니다.",
    "표의 실제 숫자 셀과 행·열 제목은 모두 보존하십시오. 생략 표시 ⋯/⋮만 들어 있는 장식용 연속 행·열은 생략할 수 있습니다. 숫자 데이터를 지우거나 작은 글씨로 숨겨 너비 제한을 피하지 마십시오. 복잡한 분수·로그 수식은 고정 폭의 boxedList 대신 graph-1의 $...$ labels로 충분한 간격을 두어 조판하십시오. JSON 문자열을 두 번 해석한 최종 수식에는 LaTeX 명령 앞 역슬래시가 한 개여야 합니다.",
    'TABLE_EXAMPLE {"version":"elem-1","kind":"table","headers":["수","0","1"],"rows":[["2.0",".3010",".3032"],["2.1",".3222",".3243"]]}',
    'BOX_EXAMPLE {"version":"elem-1","kind":"boxedList","items":["a > 0","b > 1"],"marks":["(가)","(나)"]}',
    "실제 엔진에서 생성한 계약(이 목록 밖의 키나 함수를 만들지 마십시오):",
    JSON.stringify({
      "graph-1": catalog["graph-1"],
      v2: catalog.v2,
      v2_fields: catalog.v2_fields,
      v2_example: catalog.v2_example,
      elementary: {
        table: catalog.elementary.table,
        boxedList: catalog.elementary.boxedList,
      },
    }),
  ].join("\n\n");
}
