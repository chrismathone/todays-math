import { z } from "zod";
import {
  workbookCreateEditionSchema,
  type WorkbookCreateEdition,
  type WorkbookMetadata,
} from "@/contracts/commercialWorkbook.contract";

export interface PublisherPackEntry {
  id: string;
  label: string;
  links: { label: string; href: string }[];
  scopeNote: string;
  load: () => Promise<{ default: unknown }>;
}

/** Small catalog only. Answer rows are loaded on explicit selection. */
export const PUBLISHER_PACKS: readonly PublisherPackEntry[] = [
  {
    id: "visang-5761-2026-ch1-v1",
    label: "비상 개념플러스유형 라이트 5-1 · 2026 · 1단원",
    links: [
      {
        label: "출판사 교재 정보",
        href: "https://book.visang.com/books/info/5761",
      },
      {
        label: "공식 정답 PDF",
        href: "https://cdn.visang.com/book/202506/20250617123239292.pdf",
      },
    ],
    scopeNote:
      "소문항은 원문 번호를 표시한 한 항목으로 함께 채점합니다. 나머지 단원·복습책·평가책은 이 자료에 포함되지 않습니다.",
    load: () =>
      import("../../../data/commercial-workbooks/visang-5761-2026-ch1-v1.json"),
  },
  {
    id: "visang-26711-2022-full-v1",
    label: "비상 개념플러스연산 라이트 5-1 · 2026 · 메인 북·클리닉 북",
    links: [
      {
        label: "출판사 교재 정보",
        href: "https://book.visang.com/books/info/5765",
      },
      {
        label: "공식 정답 PDF",
        href: "https://cdn.visang.com/book/202506/20250623163004477.pdf",
      },
    ],
    scopeNote:
      "메인 북·클리닉 북의 공식 답안 전체 범위입니다. 한 문항의 여러 값은 인쇄 순서대로 함께 표시하며, 세로 나눗셈표가 포함된 답안 67개는 미확보입니다.",
    load: () =>
      import("../../../data/commercial-workbooks/visang-26711-2022-full-v1.json"),
  },
  {
    id: "jihak-repetition-m3-2-2022-v1",
    label: "지학사 풍산자 반복수학 중학 3-2 · 2022 개정 · 전 단원",
    links: [
      {
        label: "출판사 교재 정보",
        href: "https://www.jihak.co.kr/reference-book/middle-school/HSFXztywBFQ2bis8",
      },
      {
        label: "공식 정답 PDF",
        href: "https://www.jihak.co.kr/api/v1/file/open-pdf-file?url=/public/reference-book/HSFXztywBFQ2bis8/t8Su8xAJamy0p8xc.pdf&fileName=%ED%92%8D%EC%82%B0%EC%9E%90+%EB%B0%98%EB%B3%B5%EC%88%98%ED%95%99+3-2+%EC%A0%95%EB%8B%B5%EA%B3%BC+%ED%92%80%EC%9D%B4.pdf",
      },
    ],
    scopeNote:
      "소문항은 원문 순서대로 한 항목에 함께 표시합니다. 도형·그래프 답안 7개는 미확보입니다. 발행연도·쇄·ISBN은 확인되지 않았으므로 가지고 있는 교재의 교육과정과 쪽·문항 번호를 함께 확인하세요.",
    load: () =>
      import("../../../data/commercial-workbooks/jihak-repetition-m3-2-2022-v1.json"),
  },
  {
    id: "ebs-manjeom-e5-1-2026-v1",
    label: "EBS 만점왕 수학 5-1 · 2026 · 개념책·실전책",
    links: [
      {
        label: "출판사 교재 정보",
        href: "https://book.ebs.co.kr/sub/primary/view?txbkId=TB1000013094&ebkId=EB100002640",
      },
      {
        label: "공식 정답 자료",
        href: "https://primary.ebs.co.kr/book/answer/index#answer/view/115/60000465839/0/1//0",
      },
    ],
    scopeNote:
      "개념책·실전책의 빠른 정답에 있는 문항 주소를 수록했습니다. 소문항은 원문 순서대로 함께 표시하며, 도형·풀이 참조·설명이 필요한 답안 149개는 미확보입니다.",
    load: () =>
      import("../../../data/commercial-workbooks/ebs-manjeom-e5-1-2026-v1.json"),
  },
  {
    id: "ebs-suneung-2027-math1-v1",
    label: "EBS 2027학년도 수능특강 수학영역 수학Ⅰ · 전체 정답표 주소",
    links: [
      {
        label: "공식 정답 출처",
        href: "https://www.ebsi.co.kr/ebs/pot/potg/detailBkAnsInfo.ebs?bookId=LB00000005912",
      },
      {
        label: "검토한 원본 PDF",
        href: "https://lwdw.ebsi.co.kr/UpDown/ebsi_lms/bookans/EBS_2027_수능특강_수학영역_수학Ⅰ_정답과해설[20260202133445472].pdf",
      },
    ],
    scopeNote: "181문항 주소, 검토 정답 181개, 미수록 정답 0개",
    load: () =>
      import("../../../data/commercial-workbooks/ebs-suneung-2027-math1-v1.json"),
  },
  {
    id: "ebs-suneung-2027-math2-v1",
    label: "EBS 2027학년도 수능특강 수학영역 수학Ⅱ · 전체 정답표 주소",
    links: [
      {
        label: "공식 정답 출처",
        href: "https://www.ebsi.co.kr/ebs/pot/potg/detailBkAnsInfo.ebs?bookId=LB00000005913",
      },
      {
        label: "검토한 원본 PDF",
        href: "https://lwdw.ebsi.co.kr/UpDown/ebsi_lms/bookans/EBS_2027_수능특강_수학영역_수학Ⅱ_정답과해설[20260202133517888].pdf",
      },
    ],
    scopeNote: "171문항 주소, 검토 정답 171개, 미수록 정답 0개",
    load: () =>
      import("../../../data/commercial-workbooks/ebs-suneung-2027-math2-v1.json"),
  },
  {
    id: "gilbut-calculation-7-2026-v1",
    label: "길벗스쿨 기적의 계산법 7권 · 2026개정 · 61~70단계",
    links: [
      {
        label: "출판사 교재 안내",
        href: "https://school.gilbut.co.kr/book/view?bookcode=BN004959",
      },
      {
        label: "공식 정답 PDF",
        href: "https://gfile.gilbut.co.kr/gilbut/bookpds/PD05/BN004959//%EA%B8%B0%EC%A0%81%EC%9D%98%EA%B3%84%EC%82%B0%EB%B2%95_7%EA%B6%8C_%EC%A0%95%EB%8B%B5(01~24).pdf",
      },
    ],
    scopeNote:
      "공식 정답 61~70단계 전체: 11~128쪽의 100개 답안 그룹, 주소 1,060개 · 검수 정답 1,060개",
    load: () =>
      import("../../../data/commercial-workbooks/gilbut-calculation-7-2026-v1.json"),
  },
  {
    id: "ebs-olympus-common1-2022-v1",
    label: "EBS 올림포스 공통수학1(2022 개정) · 전체 정답표 주소",
    links: [
      {
        label: "공식 정답 출처",
        href: "https://www.ebsi.co.kr/ebs/pot/potg/detailBkAnsInfo.ebs?bookId=LB00000005515",
      },
      {
        label: "검토한 원본 PDF",
        href: "https://lwdw.ebsi.co.kr/UpDown/ebsi_lms/bookans/EBS_올림포스(2022개정)_공통수학1_정답과해설[20241107181233965].pdf",
      },
    ],
    scopeNote: "281문항 주소, 검토 정답 280개, 미수록 정답 1개",
    load: () =>
      import("../../../data/commercial-workbooks/ebs-olympus-common1-2022-v1.json"),
  },
  {
    id: "mega-n-probability-165-2022-v1",
    label:
      "메가스터디 N제 수학영역 확률과 통계 4점 공략 165제 · 전체 정답표 주소",
    links: [
      {
        label: "공식 정답 출처",
        href: "https://www.megastudybooks.com/book/file/explanation?page=1",
      },
      {
        label: "검토한 원본 PDF",
        href: "https://www.megastudybooks.com/download/126353",
      },
    ],
    scopeNote: "165문항 주소, 검토 정답 165개, 미수록 정답 0개",
    load: () =>
      import("../../../data/commercial-workbooks/mega-n-probability-165-2022-v1.json"),
  },
  {
    id: "jinhak-blacklabel-common1-firstprint-2022-v1",
    label: "진학사 블랙라벨 공통수학1 · 2022개정 · 공개 1쇄 원본",
    links: [
      {
        label: "공식 정답 출처",
        href: "https://www.jinhak.com/jh/black-label/478",
      },
      {
        label: "검토한 원본 PDF",
        href: "https://board.jinhak.com/BoardV1/BlackLabel/BlackBox/Comment/%2822%EA%B0%9C%EC%A0%95%29%20%EB%B8%94%EB%9E%99%EB%9D%BC%EB%B2%A8%20%EA%B3%B5%ED%86%B5%EC%88%98%ED%95%991_%EC%9B%B9%EC%9A%A9_%ED%95%B4%EC%84%A4_1%EC%87%84.pdf",
      },
    ],
    scopeNote:
      "562문항 주소, 검토 정답 561개, 미수록 정답 1개 · 현재 첨부·정오표 미대조",
    load: () =>
      import("../../../data/commercial-workbooks/jinhak-blacklabel-common1-firstprint-2022-v1.json"),
  },
  {
    id: "sk-suryeok-geometry-public-v1",
    label: "수경출판사 수력충전 기하 · 공개 PDF 판본 미확인 · 전 단원",
    links: [
      {
        label: "출판사 정답 자료실",
        href: "https://www.book-sk.co.kr/study/answer.asp",
      },
      {
        label: "공식 정답 PDF",
        href: "https://www.book-sk.co.kr/upload/appendFile/202105111448370005K9.pdf",
      },
    ],
    scopeNote:
      "공식 공개 PDF 전 단원 답안 범위 406문항 주소 · 정답 참조 394개 · 도형·원문 이상 정답 미수록 12개",
    load: () =>
      import("../../../data/commercial-workbooks/sk-suryeok-geometry-public-v1.json"),
  },
  {
    id: "gilbut-calculation-11-2026-v1",
    label: "길벗스쿨 기적의 계산법 11권 · 2026개정 · 101~110단계",
    links: [
      {
        label: "출판사 교재 안내",
        href: "https://school.gilbut.co.kr/book/view?bookcode=BN004963",
      },
      {
        label: "공식 정답 PDF",
        href: "https://gfile.gilbut.co.kr/gilbut/bookpds/PD05/BN004963//%EA%B8%B0%EC%A0%81%EC%9D%98%EA%B3%84%EC%82%B0%EB%B2%95_11%EA%B6%8C_%EC%A0%95%EB%8B%B5(01-24).pdf",
      },
    ],
    scopeNote:
      "공식 정답 101~110단계 전체: 11~128쪽의 100개 답안 그룹, 주소 973개 · 검수 정답 973개",
    load: () =>
      import("../../../data/commercial-workbooks/gilbut-calculation-11-2026-v1.json"),
  },
  {
    id: "ne-middle1-kwon-evaluation-2022-v1",
    label: "NE능률 중학교 수학 1 · 권오남 · 2022 개정 · 평가문제집",
    links: [
      {
        label: "출판사 교재 안내",
        href: "https://www.nebooks.co.kr/pages/book/view.asp?c=BE05020001",
      },
      {
        label: "공식 정답 PDF",
        href: "https://upfile.neungyule.com/upload_admin/2025/10/%EC%A4%91%ED%95%99%EA%B5%90%20%EC%88%98%ED%95%991%20%EC%9E%90%EC%8A%B5%EC%84%9C&%ED%8F%89%EA%B0%80%EB%AC%B8%EC%A0%9C%EC%A7%91_%EA%B6%8C%EC%98%A4%EB%82%A8%20%EC%A0%80%20(2022%20%EA%B0%9C%EC%A0%95)%20%ED%8F%89%EA%B0%80%EB%AC%B8%EC%A0%9C%EC%A7%91_%EC%A0%95%EB%8B%B5%20%EB%B0%8F%20%ED%95%B4%EC%84%A4.pdf",
      },
    ],
    scopeNote:
      "평가문제집 2~49쪽의 중단원·대단원 평가 전체 296주소 · 검수 정답 294개 · 그림·표 2개 보류",
    load: () =>
      import("../../../data/commercial-workbooks/ne-middle1-kwon-evaluation-2022-v1.json"),
  },
  {
    id: "gilbut-calculation-1-2026-v1",
    label: "길벗스쿨 기적의 계산법 1권 · 2026개정 · 1~10단계",
    links: [
      {
        label: "출판사 교재 안내",
        href: "https://school.gilbut.co.kr/book/view?bookcode=BN004953",
      },
      {
        label: "공식 정답 PDF",
        href: "https://gfile.gilbut.co.kr/gilbut/bookpds/PD05/BN004953//%EA%B8%B0%EC%A0%81%EC%9D%98%EA%B3%84%EC%82%B0%EB%B2%95_1%EA%B6%8C_%EC%A0%95%EB%8B%B5(01~24).pdf",
      },
    ],
    scopeNote:
      "1~10단계 인쇄된 번호 전체 1,844주소 · 검수 정답 1,760개 · 그림 정답 84개 보류 · 번호 없는 연산표 8개 제외",
    load: () =>
      import("../../../data/commercial-workbooks/gilbut-calculation-1-2026-v1.json"),
  },
  {
    id: "arum-jjang-hard-calculus1-2026-v1",
    label: "아름다운샘 26짱 어려운 유형 미적분Ⅰ · 2022 개정 · 전 단원",
    links: [
      {
        label: "출판사 공식 자료",
        href: "http://www.a-ssam.co.kr/bbs/board.php?bo_table=table37&wr_id=308",
      },
      {
        label: "공식 정답 PDF",
        href: "http://www.a-ssam.co.kr/bbs/download.php?bo_table=table37&wr_id=308&no=0",
      },
    ],
    scopeNote: "공식 공개 PDF 전 9유형 · 207문항 주소와 정답 참조 전체",
    load: () =>
      import("../../../data/commercial-workbooks/arum-jjang-hard-calculus1-2026-v1.json"),
  },
  {
    id: "arum-jjang-hard-probability-statistics-2026-v1",
    label: "아름다운샘 26짱 어려운 유형 확률과 통계 · 2022 개정 · 전 단원",
    links: [
      {
        label: "출판사 공식 자료",
        href: "http://www.a-ssam.co.kr/bbs/board.php?bo_table=table37&wr_id=307",
      },
      {
        label: "공식 정답 PDF",
        href: "http://www.a-ssam.co.kr/bbs/download.php?bo_table=table37&wr_id=307&no=0",
      },
    ],
    scopeNote: "공식 공개 PDF 전 11유형 · 198문항 주소와 정답 참조 전체",
    load: () =>
      import("../../../data/commercial-workbooks/arum-jjang-hard-probability-statistics-2026-v1.json"),
  },
  {
    id: "sk-suryeok-probability-statistics-public-v1",
    label: "수경출판사 수력충전 확률과 통계 · 공식 공개본 · 전 단원",
    links: [
      {
        label: "출판사 공식 자료",
        href: "https://www.book-sk.co.kr/study/answer.asp",
      },
      {
        label: "공식 정답 PDF",
        href: "https://cdn.book-sk.co.kr/upload/appendFile/201808211359050001QK.pdf",
      },
    ],
    scopeNote:
      "공식 공개 정답 PDF 전 단원 264개 주소 · 검수 정답 257개 · 표·그래프 4개와 인쇄 소문항 번호 중복 3개는 정답 보류",
    load: () =>
      import("../../../data/commercial-workbooks/sk-suryeok-probability-statistics-public-v1.json"),
  },
  {
    id: "ne-dalgom-calculation-4-2-v1",
    label: "NE능률 달곰한 계산력 4-2 · Day 01~48",
    links: [
      {
        label: "출판사 교재 안내",
        href: "https://www.nebooks.co.kr/pages/book/view.asp?c=BH02050008",
      },
      {
        label: "공식 빠른 정답 PDF",
        href: "https://upfile.neungyule.com/upload_admin/2023/10/%EB%8B%AC%EA%B3%B0%ED%95%9C%EA%B3%84%EC%82%B0%EB%A0%A5%20%EB%B9%A0%EB%A5%B8%EC%A0%95%EB%8B%B5_4-2(0).pdf",
      },
    ],
    scopeNote:
      "Day 01~48의 번호 있는 975주소 · 검수 정답 916개 · 그림 59개 보류 · 본문 쪽 미기재 점검 159문항과 번호 없는 놀이 제외",
    load: () =>
      import("../../../data/commercial-workbooks/ne-dalgom-calculation-4-2-v1.json"),
  },
  {
    id: "mothertong-solt-m1-1-9353-v1",
    label: "마더텅 중학수학 쏠트 1-1 · 게시물 9353 · 판·쇄 미확인",
    links: [
      {
        label: "공식 정답 출처",
        href: "https://www.toptutor.co.kr/pds/view.jsp?id=9353&type=01",
      },
      {
        label: "검토한 원본 PDF",
        href: "https://www.toptutor.co.kr/main/download.jsp?id=249989&ek=d678abcd7c063af558a0d2ac3194d85d",
      },
    ],
    scopeNote:
      "1068문항 주소, 검토 정답 1041개, 미수록 정답 27개 · STEP 시작 쪽수와 인쇄 번호 보존",
    load: () =>
      import("../../../data/commercial-workbooks/mothertong-solt-m1-1-9353-v1.json"),
  },
  {
    id: "mega-calculation-volume12-1400-v1",
    label: "초등 메가 계산력 12권 · 자료 1400 · 판·쇄 미확인",
    links: [
      {
        label: "공식 정답 출처",
        href: "https://www.megastudybooks.com/book/file/explanation?page=27",
      },
      {
        label: "검토한 원본 PDF",
        href: "https://www.megastudybooks.com/download/1400",
      },
    ],
    scopeNote:
      "1321문항 주소, 검토 정답 1321개, 미수록 정답 0개 · 50일 번호 문항 전체, 번호 없는 생각 수학 제외",
    load: () =>
      import("../../../data/commercial-workbooks/mega-calculation-volume12-1400-v1.json"),
  },
  {
    id: "erum-summa-common-math1-4ed2print-v1",
    label: "이룸이앤비 숨마쿰라우데 공통수학1 · 2022 개정 · 4판 2쇄 · 전 단원",
    links: [
      {
        label: "출판사 공식 자료실 · 새 다운로드 제공",
        href: "https://www.erumenb.com/bookdata/index.php?section=3",
      },
    ],
    scopeNote:
      "공식 서브노트 개념 TEST·유제·연습문제 전체 774개 주소 · 검수 정답 769개 · 풀이 참조 5개 보류",
    load: () =>
      import("../../../data/commercial-workbooks/erum-summa-common-math1-4ed2print-v1.json"),
  },
  {
    id: "chun-ddapul-6-2-upper-v1",
    label: "천종현 따풀 6-2 상 · 유형별 문제·예제",
    links: [
      {
        label: "출판사 답지 자료실",
        href: "https://www.1000math.com/archive/?bmode=view&idx=155855986",
      },
    ],
    scopeNote:
      "본문 쪽이 있는 유형 01A~20B의 481주소 · 검수 정답 460개 · 그림·표 21개 보류 · 쪽 미기재 연습 문제·Quiz 제외",
    load: () =>
      import("../../../data/commercial-workbooks/chun-ddapul-6-2-upper-v1.json"),
  },
  {
    id: "ne-gak-common-math1-2023-v1",
    label: "NE능률 각 공통수학1 · 전체 번호·선택형/정수 정답",
    links: [
      {
        label: "출판사 상품 페이지",
        href: "https://www.nebooks.co.kr/pages/book/view.asp?c=BH04090001",
      },
      {
        label: "공식 정답 PDF",
        href: "https://upfile.neungyule.com/upload_admin/2026/01/%EA%B3%A0%EB%93%B1%20%EA%B0%81_%EA%B3%B5%ED%86%B5%EC%88%98%ED%95%991_%ED%95%B4%EC%84%A4_20260120.pdf",
      },
    ],
    scopeNote:
      "0001~0945 전체 번호 945주소 · 검수 선택형·정수 정답 763개 · 수식·다답·풀이 등 182주소 정답 보류 · 본문 쪽 범위 그대로 보존",
    load: () =>
      import("../../../data/commercial-workbooks/ne-gak-common-math1-2023-v1.json"),
  },
  {
    id: "chun-ddapul-3-1-upper-v1",
    label: "천종현 따풀 3-1 상 · 유형별 문제·예제",
    links: [
      {
        label: "출판사 답지 자료실",
        href: "https://www.1000math.com/archive/?bmode=view&idx=155855986",
      },
    ],
    scopeNote:
      "본문 쪽이 있는 유형 01A~20B의 558주소 · 검수 정답 502개 · 그림·표 56개 보류 · 쪽 미기재 연습 문제·Quiz 제외",
    load: () =>
      import("../../../data/commercial-workbooks/chun-ddapul-3-1-upper-v1.json"),
  },
  {
    id: "chun-ddapul-5-1-upper-v1",
    label: "천종현 따풀 5-1 상 · 유형별 문제·예제",
    links: [
      {
        label: "출판사 답지 자료실",
        href: "https://www.1000math.com/archive/?bmode=view&idx=155855986",
      },
    ],
    scopeNote:
      "본문 쪽이 있는 유형 01A~20B의 502주소 · 검수 정답 472개 · 그림·표 30개 보류 · 쪽 미기재 연습 문제·Quiz 제외",
    load: () =>
      import("../../../data/commercial-workbooks/chun-ddapul-5-1-upper-v1.json"),
  },
];

const packSchema = workbookCreateEditionSchema
  .omit({ requestId: true })
  .extend({
    id: z.string().min(1),
    label: z.string().min(1),
    coverage: z.string().min(1),
  });

export interface PublisherPackPreview {
  entry: PublisherPackEntry;
  coverage: string;
  input: WorkbookCreateEdition;
}

export async function loadPublisherPack(
  entry: PublisherPackEntry,
): Promise<PublisherPackPreview> {
  const pack = packSchema.parse((await entry.load()).default);
  if (pack.id !== entry.id)
    throw new Error("선택한 교재의 자료 식별자가 일치하지 않습니다.");
  return {
    entry,
    coverage: pack.coverage,
    input: workbookCreateEditionSchema.parse({
      requestId: `publisher-pack:${pack.id}`,
      metadata: pack.metadata,
      provenance: pack.provenance,
      exercises: pack.exercises,
    }),
  };
}

/** ISBN alone is insufficient: later printings/editions can share an ISBN. */
export function sameWorkbookEdition(
  left: WorkbookMetadata,
  right: WorkbookMetadata,
): boolean {
  const normalize = (value?: string) =>
    (value ?? "").normalize("NFC").trim().replace(/\s+/gu, " ");
  const isbn = (value?: string) =>
    normalize(value).replace(/[\s-]/gu, "").toUpperCase();
  return (
    isbn(left.isbn) === isbn(right.isbn) &&
    (["title", "publisher", "grade", "curriculum", "edition"] as const).every(
      (key) => normalize(left[key]) === normalize(right[key]),
    )
  );
}
