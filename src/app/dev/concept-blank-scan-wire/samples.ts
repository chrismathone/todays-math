import QRCode from "qrcode";

import {
  CONCEPT_BLANK_FORMS,
  conceptBlankSelectionSchema,
  type ConceptBlankSelection,
  type ConceptBlankSheet,
} from "@/contracts/conceptBlank.contract";
import { getConceptBlankGradeBank } from "@/lib/concept-blank/bank/runtime";
import { composeSheets } from "@/lib/concept-blank/compose";
import { encodeSheetCode } from "@/lib/concept-blank/sheetCode";
import {
  planSheet,
  sheetHasContent,
} from "@/components/concept-blank/paper/paginate";
import { browserQrDataUrl } from "@/components/textbook/browserQr";

/** Wire 전용 주소 제안. 제품 라우트가 아니며 주소를 요청하지 않는다. 개인정보를 싣지 않는다. */
export function scanWireUrl(
  code: string,
  page: number,
  part: "student" | "key",
) {
  return `https://today.aywa.co.kr/concept-blank/scan?code=${code}&page=${page}&part=${part}`;
}

export type WireQr = {
  url: string;
  dataUrl: string;
  modules: number;
  version: number;
};
export type WireSample = {
  id: string;
  label: string;
  selection: ConceptBlankSelection;
  sheets: ConceptBlankSheet[];
  code: string;
  qr: { student: WireQr[]; key: WireQr[] };
};

const SECTION = "초5::2-3 합동과 대칭::2-3-3 선대칭도형과 그 성질 알아보기";
const ZERO = { 하: 0, 중: 0, 상: 0 };
// 제목 상한 40자를 실제로 채운 표본. 문항은 같은 은행 고르기이며 제목만 긴 사용자 입력이다.
const LONG_TITLE =
  "선대칭도형과 점대칭도형의 성질 비교와 대응하는 점과 변과 각 설명해 보기";

export async function loadWireSamples(): Promise<WireSample[]> {
  const bank = getConceptBlankGradeBank("초5");
  const specs = [
    {
      id: "single",
      label: "소단원 하나 · 짧은 머리",
      selection: {
        sections: [SECTION],
        title: "선대칭도형",
        date: "2026-11-24",
        forms: [
          { form: "term", counts: { 하: 3, 중: 0, 상: 0 }, extras: ZERO },
        ],
      },
    },
    {
      id: "multi",
      label: "긴 제목 40자 · 여러 쪽",
      selection: {
        sections: [SECTION],
        title: LONG_TITLE,
        date: "2026-11-24",
        forms: [
          {
            form: "term",
            counts: { 하: 6, 중: 6, 상: 6 },
            extras: { 하: 1, 중: 1, 상: 1 },
          },
        ],
      },
    },
    {
      id: "all",
      label: "A~E 다섯 형식 · 같은 소단원",
      selection: {
        sections: [SECTION],
        title: "선대칭도형과 그 성질",
        date: "2026-11-24",
        forms: CONCEPT_BLANK_FORMS.map((form) => ({
          form,
          counts: { 하: 2, 중: 1, 상: 1 },
          extras:
            form === "term" || form === "cloze"
              ? { 하: 1, 중: 0, 상: 0 }
              : ZERO,
        })),
      },
    },
  ];
  return Promise.all(
    specs.map(async (spec) => {
      const selection = conceptBlankSelectionSchema.parse(spec.selection);
      const sheets = composeSheets(selection, bank).filter(sheetHasContent);
      const plans = sheets.map(planSheet);
      const code = encodeSheetCode(selection, bank);
      const makeQrs = async (part: "student" | "key") =>
        Promise.all(
          Array.from(
            { length: plans.reduce((sum, p) => sum + p[part].length, 0) },
            async (_, i) => {
              const url = scanWireUrl(code, i + 1, part);
              const model = QRCode.create(url, { errorCorrectionLevel: "M" });
              return {
                url,
                dataUrl: await browserQrDataUrl(url),
                modules: model.modules.size,
                version: model.version,
              };
            },
          ),
        );
      const [student, key] = await Promise.all([
        makeQrs("student"),
        makeQrs("key"),
      ]);
      return { ...spec, selection, sheets, code, qr: { student, key } };
    }),
  );
}
