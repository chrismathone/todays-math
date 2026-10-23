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
