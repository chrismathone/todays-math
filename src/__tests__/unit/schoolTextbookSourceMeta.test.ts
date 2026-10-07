import { describe, expect, it } from "vitest";

import {
  SOURCE_MATERIAL_KINDS,
  sourceBookSchema,
  sourceMaterialSchema,
} from "@/contracts/sourceMaterial.contract";
import {
  parseSourceBook,
  parseSourceMaterial,
} from "@/lib/import/schoolTextbook/sourceMeta";

/**
 * 책 · 자료의 메타데이터를 폴더 · 파일 이름에서 읽는다 (D-161).
 *
 * 예는 전부 G드라이브의 **실제 이름**이다(2026-10-07 조사 — 답이 붙은 문항이 든 책 30권 · 폴더 180여 개).
 * 지어낸 이름으로 초록을 내면, 출판사가 실제로 쓰는 꼴에서 무엇이 새는지 모른다.
 */
const book = (folder: string, grade: string) =>
  parseSourceBook({ bookFolder: folder, grade });

describe("parseSourceBook — 책 폴더 이름 → 출판사 · 저자 · 제목", () => {
  it.each([
    [
      "천재교육 중학 수학1 (김동재) (22개정)-005-003",
      "중1",
      "천재교육",
      "김동재",
      "중학 수학1",
    ],
    [
      "천재교육 중학 수학1 (김화경) (22개정)",
      "중1",
      "천재교육",
      "김화경",
      "중학 수학1",
    ],
    ["YMB 중학 수학2 (류희찬) (22개정)", "중2", "YBM", "류희찬", "중학 수학2"],
    [
      "YBM 중학 수학1 (류희찬) (22개정)-002-006",
      "중1",
      "YBM",
      "류희찬",
      "중학 수학1",
    ],
    [
      "비상교과서 미적분Ⅰ (22개정) ( 김원경)",
      "미적분1",
      "비상교육",
      "김원경",
      "미적분1",
    ],
    ["미래엔 공통수학Ⅰ(황선욱)", "공통수학1", "미래엔", "황선욱", "공통수학1"],
    [
      "동아출판 공통수학Ⅰ (고호경) (22개정)]",
      "공통수학1",
      "동아출판",
      "고호경",
      "공통수학1",
    ],
    [
      "교학사 중학 수학2 (김창동) (22개정) - 미완성",
      "중2",
      "교학사",
      "김창동",
      "중학 수학2",
    ],
    [
      "NE능률 중학 수학1 (권오남) (22개정)",
      "중1",
      "NE능률",
      "권오남",
      "중학 수학1",
    ],
    [
      "지학사 중학 수학1 (장경윤) (22개정)",
      "중1",
      "지학사",
      "장경윤",
      "중학 수학1",
    ],
    [
      "천재교육 확률과 통계 (전인태) (22개정)",
      "확률과통계",
      "천재교육",
      "전인태",
      "확률과 통계",
    ],
    ["와이비엠 대수 (류희찬)", "대수", "YBM", "류희찬", "대수"],
  ])("%s", (folder, grade, publisher, author, title) => {
    const parsed = book(folder, grade);
    expect(parsed).toMatchObject({
      publisher,
      author,
      title,
      kind: "school_textbook",
      curriculum: "2022",
    });
    expect(sourceBookSchema.safeParse(parsed).success).toBe(true);
  });

  it("학년 키는 우리 차시 목록의 것으로 맞춘다 — «확률과통계» → «확률과 통계»", () => {
    expect(
      book("천재교육 확률과 통계 (전인태) (22개정)", "확률과통계").grade,
    ).toBe("확률과 통계");
    expect(book("미래엔 대수 (황선욱)(22개정)", "대수").grade).toBe("대수");
  });

  it("같은 책은 폴더 이름이 달라도 열쇠가 같다 — 오타 · 꼬리표가 책을 둘로 만들지 않는다", () => {
    const a = book("YMB 중학 수학2 (류희찬) (22개정)", "중2");
    const b = book("YBM 중학 수학2 (류희찬) (22개정)-002-006", "중2");
    expect(a.externalKey).toBe(b.externalKey);
    expect(a.externalKey).toBe("2022/YBM/중2/류희찬");
    // 같은 출판사 · 같은 과목의 다른 저자는 다른 책이다
    expect(
      book("천재교육 중학 수학1 (김동재) (22개정)-005-003", "중1").externalKey,
    ).not.toBe(
      book("천재교육 중학 수학1 (김화경) (22개정)", "중1").externalKey,
    );
  });

  it("모르는 출판사는 지어내지 않고 던진다 — 조용히 «기타»가 되면 그 책의 문항이 엉뚱한 책에 붙는다", () => {
    expect(() => book("처음보는출판 중학 수학1 (홍길동)", "중1")).toThrow(
      /출판사/,
    );
  });
});

const material = (path: string) => {
  const parts = path.split("\\");
  const bookFolder = parts[3]!;
  return parseSourceMaterial({ path, bookFolder, key: "0123456789abcdef" });
};
const G = (grade: string, rest: string) =>
  `G:\\${grade.startsWith("중") ? "중등교과서" : "고등교과서"}\\${grade}\\${rest}`;

describe("parseSourceMaterial — 파일 이름 → 자료 종류 · 교과서 단원 번호 · 회차", () => {
  it.each([
    // [경로, 종류, 원문, 대, 중, 소, 단원 이름, 회차]
    [
      G(
        "중1",
        "천재교육 중학 수학1 (김동재) (22개정)-005-003\\평가자료\\천재교육 중학 수학1 (김동재) - 형성평가\\중_수학1(김동재)_형성평가_1-1-1_1회_문제.hwp",
      ),
      "형성 평가",
      "형성평가",
      1,
      1,
      1,
      null,
      1,
    ],
    [
      G(
        "공통수학1",
        "미래엔 공통수학Ⅰ(황선욱)\\평가자료\\미래엔 공통수학1 황선욱 - 수준별문제\\미래엔_공통수학1_수준별문제_1-1-01_다항식의덧셈과뺄셈.hwp",
      ),
      "수준별 문제",
      "수준별문제",
      1,
      1,
      1,
      "다항식의덧셈과뺄셈",
      null,
    ],
    [
      G(
        "공통수학1",
        "미래엔 공통수학Ⅰ(황선욱)\\평가자료\\미래엔 공통수학1 황선욱 - 단원평가\\미래엔_공통수학1_대단원평가_2_방정식과부등식.hwp",
      ),
      "대단원 평가",
      "대단원평가",
      2,
      null,
      null,
      "방정식과부등식",
      null,
    ],
    [
      G(
        "공통수학1",
        "미래엔 공통수학Ⅰ(황선욱)\\평가자료\\미래엔 공통수학1 황선욱 - 단원평가\\미래엔_공통수학1_중단원평가_4-1_행렬.hwp",
      ),
      "중단원 평가",
      "중단원평가",
      4,
      1,
      null,
      "행렬",
      null,
    ],
    [
      G(
        "공통수학1",
        "비상교과서 공통수학1 (김원경)\\평가자료\\[비상교육] 고등_공통수학1_계산력 강화문제\\[비상교육] 고등_공통수학1_1-1-1_계산력 강화 문제(2).hwp",
      ),
      "기초 연산",
      "계산력 강화 문제",
      1,
      1,
      1,
      null,
      2,
    ],
    [
      G(
        "공통수학1",
        "비상교과서 공통수학1 (김원경)\\평가자료\\[비상교육] 고등_공통수학1_대단원 TEST\\[비상교육] 고등_공통수학1_3_대단원 TEST.hwp",
      ),
      "대단원 평가",
      "대단원 TEST",
      3,
      null,
      null,
      null,
      null,
    ],
    [
      G(
        "공통수학1",
        "천재교육 공통수학Ⅰ (홍진곤) (22개정)\\평가자료\\기초력 UP 문제\\기초력 UP 문제_Ⅰ_1_01 다항식의 덧셈과 뺄셈.hwp",
      ),
      "기초 연산",
      "기초력 UP 문제",
      1,
      1,
      1,
      "다항식의 덧셈과 뺄셈",
      null,
    ],
    [
      G(
        "공통수학1",
        "천재교육 공통수학Ⅰ (홍진곤) (22개정)\\평가자료\\중단원 평가\\중단원 평가 문제_Ⅰ_2.나머지정리와 인수분해.hwp",
      ),
      "중단원 평가",
      "중단원 평가 문제",
      1,
      2,
      null,
      "나머지정리와 인수분해",
      null,
    ],
    [
      G(
        "공통수학1",
        "천재교육 공통수학Ⅰ (전인태) (22개정)\\평가자료\\중단원 평가\\중단원 평가 문제(2-3단원).hwp",
      ),
      "중단원 평가",
      "중단원 평가 문제",
      2,
      3,
      null,
      null,
      null,
    ],
    [
      G(
        "공통수학1",
        "천재교육 공통수학Ⅰ (전인태) (22개정)\\평가자료\\대단원 평가\\대단원 기출 모의고사(2단원).hwp",
      ),
      "시험 대비",
      "대단원 기출 모의고사",
      2,
      null,
      null,
      null,
      null,
    ],
    [
      G(
        "중1",
        "NE능률 중학 수학1 (권오남) (22개정)\\02 평가자료\\03 쌍둥이 문제\\[쌍둥이 문제] Ⅱ-2. 일차방정식\\[쌍둥이 문제] Ⅱ-2-01. 방정식과 그 해.hwp",
      ),
      "쌍둥이 문제",
      "쌍둥이 문제",
      2,
      2,
      1,
      "방정식과 그 해",
      null,
    ],
    [
      G(
        "중1",
        "YBM 중학 수학1 (류희찬) (22개정)-002-006\\02 평가자료\\02 소단원 평가\\수학 1(류희찬)_01_YBM중등_수학1_1-2_소단원 평가.hwp.hwp",
      ),
      "소단원 평가",
      "소단원 평가",
      1,
      2,
      null,
      null,
      null,
    ],
    [
      G(
        "중1",
        "YBM 중학 수학1 (류희찬) (22개정)-002-006\\02 평가자료\\03 단원 평가\\수학 1(류희찬)_04_YBM중등_수학1_4_단원 평가.hwp.hwp",
      ),
      "대단원 평가",
      "단원 평가",
      4,
      null,
      null,
      null,
      null,
    ],
    [
      G(
        "중1",
        "동아출판 중학 수학1 (강옥기)(22개정)\\평가지료\\동아출판 중학수학1 (강옥기)(22개정) - 소단원학습지\\22개정_중학_수학1_소단원학습지_4_3.hwp",
      ),
      "소단원 평가",
      "소단원학습지",
      4,
      3,
      null,
      null,
      null,
    ],
    [
      G(
        "중1",
        "동아출판 중학 수학1 (강옥기)(22개정)\\평가지료\\동아출판 중학수학1 (강옥기)(22개정) - 연산학습지\\22개정_중학_수학1_연산학습지_2단원.hwp",
      ),
      "기초 연산",
      "연산학습지",
      2,
      null,
      null,
      null,
      null,
    ],
    [
      G(
        "중1",
        "지학사 중학 수학1 (장경윤) (22개정)\\평가자료\\소단원 종합문제\\지학사_중_수학1_8-01_소단원 종합 문제.hwp",
      ),
      "소단원 평가",
      "소단원 종합 문제",
      8,
      1,
      null,
      null,
      null,
    ],
    [
      G(
        "중1",
        "지학사 중학 수학1 (장경윤) (22개정)\\평가자료\\대단원 서술형평가\\지학사_중_수학1_Ⅲ_대단원 서술형 평가.hwp",
      ),
      "서술형 평가",
      "대단원 서술형 평가",
      3,
      null,
      null,
      null,
      null,
    ],
    [
      G(
        "중1",
        "지학사 중학 수학1 (장경윤) (22개정)\\평가자료\\실전 테스트\\지학사_중_수학1_실전 테스트 2회.hwp",
      ),
      "시험 대비",
      "실전 테스트",
      null,
      null,
      null,
      null,
      2,
    ],
    [
      G(
        "중1",
        "천재교육 중학 수학1 (김화경) (22개정)\\평가자료\\천재교육 중학 수학1 (김화경) - 5분TEST\\Ⅰ-3_(1)_5분 TEST.hwp",
      ),
      "기초 연산",
      "5분 TEST",
      1,
      3,
      null,
      null,
      1,
    ],
    [
      G(
        "중1",
        "천재교육 중학 수학1 (김화경) (22개정)\\평가자료\\천재교육 중학 수학1 (김화경) - 대단원평가\\Ⅰ_대단원 도전 문제.hwp",
      ),
      "수준별 문제",
      "대단원 도전 문제",
      1,
      null,
      null,
      null,
      null,
    ],
    [
      G(
        "중1",
        "천재교육 중학 수학1 (김화경) (22개정)\\평가자료\\중_수학1(김화경)_진단평가_2단원_문제.hwp",
      ),
      "진단 평가",
      "진단평가",
      2,
      null,
      null,
      null,
      null,
    ],
    [
      G(
        "중1",
        "천재교육 중학 수학1 (김동재) (22개정)-005-003\\평가자료\\천재교육 중학 수학1 (김동재) - 준비학습지\\3단원 준비 학습지_104쪽.hwp",
      ),
      "진단 평가",
      "준비 학습지",
      3,
      null,
      null,
      null,
      null,
    ],
    [
      G(
        "중1",
        "천재교육 중학 수학1 (김동재) (22개정)-005-003\\평가자료\\천재교육 중학 수학1 (김동재) - 기초연산\\중_수학1_기초연산_1단원_소인수분해_1회.hwp",
      ),
      "기초 연산",
      "기초연산",
      1,
      null,
      null,
      "소인수분해",
      1,
    ],
    [
      G(
        "공통수학1",
        "비상교과서 공통수학1 (김원경)\\평가자료\\[비상교육] 고등_공통수학1_수행과제\\[비상교육] 고등_공통수학1_1-2_수행 과제.hwp",
      ),
      "수행 과제",
      "수행 과제",
      1,
      2,
      null,
      null,
      null,
    ],
    [
      G(
        "공통수학1",
        "비상교과서 공통수학1 (김원경)\\수업자료\\문제 NOTE\\[비상교육] 고등_공통수학1_4-1_문제 NOTE.hwp",
      ),
      "수업 자료",
      "문제 NOTE",
      4,
      1,
      null,
      null,
      null,
    ],
  ])(
    "%s",
    (
      path,
      kind,
      kindRaw,
      chapterNo,
      middleNo,
      sectionNo,
      unitRaw,
      sequence,
    ) => {
      const parsed = material(path);
      expect(parsed).toMatchObject({
        kind,
        kindRaw,
        chapterNo,
        middleNo,
        sectionNo,
        unitRaw,
        sequence,
      });
      expect(sourceMaterialSchema.safeParse(parsed).success).toBe(true);
    },
  );

  it("학기 · 중간/기말 · 수준은 자료가 스스로 말할 때만 적는다", () => {
    const mid = material(
      G(
        "중2",
        "동아출판 중학 수학 2 (강옥기) (22개정)\\평가자료\\중간 기말 대비 시험문제집\\(동아출판) 중학_수학2_시험대비문제집_1학기_중간대비(1-5회).hwp",
      ),
    );
    expect(mid).toMatchObject({
      kind: "시험 대비",
      semester: 1,
      round: "중간",
      sequence: null,
      chapterNo: null,
    });
    const final = material(
      G(
        "공통수학1",
        "천재교육 공통수학Ⅰ (홍진곤) (22개정)\\평가자료\\1학기 기말고사.hwp",
      ),
    );
    expect(final).toMatchObject({
      kind: "시험 대비",
      semester: 1,
      round: "기말",
    });
    // «중간기말대비» 는 어느 쪽인지 말하지 않는다
    const both = material(
      G(
        "대수",
        "천재교육 대수(전인태)\\평가자료\\04 중간기말 대비문제\\고_대수(전)_중간기말대비_1단원_2회_문제.hwp",
      ),
    );
    expect(both).toMatchObject({
      kind: "시험 대비",
      round: null,
      semester: null,
      chapterNo: 1,
      sequence: 2,
    });
    const basic = material(
      G(
        "중2",
        "동아출판 중학 수학 2 (강옥기) (22개정)\\평가자료\\기본\\(동아출판) 중학_수학2_단원마무리_3단원_기본.hwp",
      ),
    );
    expect(basic).toMatchObject({
      kind: "대단원 평가",
      levelRaw: "기본",
      chapterNo: 3,
    });
    // «해결해요» — 종류를 말하는 낱말이 없는 이름(문항 269개가 «기타»로 떨어지고 있었다)
    expect(
      material(
        G(
          "중2",
          "동아출판 중학 수학 2 (강옥기) (22개정)\\평가자료\\기본\\(동아출판) 중학_수학2_해결해요_1_3_기본.hwp",
        ),
      ),
    ).toMatchObject({
      kind: "수준별 문제",
      kindRaw: "해결해요",
      chapterNo: 1,
      middleNo: 3,
      levelRaw: "기본",
    });
    // NE능률 «[대단원 문제] Ⅵ-A. 확률» — A · B 형으로 나뉜 대단원 문제(종류도 단원 번호도 못 읽고 있었다)
    expect(
      material(
        G(
          "중2",
          "NE능률 중학 수학2 (권오남) (22개정)\\평가자료\\대단원 문제\\[대단원 문제] Ⅵ-A. 확률.hwp",
        ),
      ),
    ).toMatchObject({
      kind: "대단원 평가",
      kindRaw: "대단원 문제",
      chapterNo: 6,
      middleNo: null,
    });
    const advanced = material(
      G(
        "중2",
        "동아출판 중학 수학 2 (강옥기) (22개정)\\평가자료\\발전\\(동아출판) 중학_수학2_단원마무리_3단원_발전.hwp",
      ),
    );
    expect(advanced.levelRaw).toBe("발전");
    // 보통 자료에는 없다
    expect(
      material(
        G(
          "중1",
          "지학사 중학 수학1 (장경윤) (22개정)\\평가자료\\소단원 형성평가\\지학사_중_수학1_1-03_소단원 형성 평가.hwp",
        ),
      ),
    ).toMatchObject({
      kind: "형성 평가",
      semester: null,
      round: null,
      levelRaw: null,
    });
  });

  it("책 이름 · 교육과정 · 쪽수의 숫자를 단원 번호로 읽지 않는다", () => {
    // «22개정» · «수학1» · «10쪽» · «(1-5회)» · «2025학년도»
    expect(
      material(
        G(
          "중1",
          "동아출판 중학 수학1 (강옥기)(22개정)\\평가지료\\동아출판 중학수학1 (강옥기)(22개정) - 준비학습지\\22개정_중학_수학1_준비학습지_1단원.hwp",
        ),
      ),
    ).toMatchObject({ chapterNo: 1, middleNo: null });
    expect(
      material(
        G(
          "중2",
          "천재교육 중학 수학2 (김동재) (22개정)\\평가자료\\준비 학습지\\1단원 준비 학습지_10쪽.hwp",
        ),
      ),
    ).toMatchObject({ chapterNo: 1, middleNo: null, sequence: null });
    expect(
      material(
        G(
          "대수",
          "비상교과서 대수 (김원경)\\평가자료\\중간기말고사\\[비상교육] 2025학년도_고등_대수_기말고사(1회).hwp",
        ),
      ),
    ).toMatchObject({ chapterNo: null, round: "기말", sequence: 1 });
    expect(
      material(
        G(
          "중1",
          "천재교육 중학 수학1 (김동재) (22개정)-005-003\\평가자료\\천재교육 중학 수학1 (김동재) - 중단원평가\\1-1 중단원 평가 문제_23쪽.hwp",
        ),
      ),
    ).toMatchObject({ chapterNo: 1, middleNo: 1, sectionNo: null });
  });

  it("열쇠 · 제목 · 원본 경로", () => {
    const parsed = material(
      G(
        "중1",
        "YBM 중학 수학1 (류희찬) (22개정)-002-006\\02 평가자료\\01 기초 다지기\\수학 1(류희찬)_02_YBM중등_수학1_2-3_기초 다지기.hwp.hwp",
      ),
    );
    expect(parsed.externalKey).toBe("tb-0123456789abcdef");
    // 확장자가 두 번 붙은 파일이 있다
    expect(parsed.title).toBe(
      "수학 1(류희찬)_02_YBM중등_수학1_2-3_기초 다지기",
    );
    expect(parsed.sourceFile).toContain("기초 다지기.hwp.hwp");
    expect(parsed).toMatchObject({
      kind: "기초 연산",
      kindRaw: "기초 다지기",
      chapterNo: 2,
      middleNo: 3,
    });
  });

  it("자료 종류 열셋 가운데 «기타» 말고는 실제 이름의 예가 있다 — 규칙 없는 종류는 영영 0 이다", () => {
    const seen = new Set<string>();
    const samples = [
      "중_수학1(김동재)_형성평가_1-1-1_1회_문제.hwp",
      "미래엔_공통수학1_수준별문제_1-1-01_다항식.hwp",
      "Ⅰ_대단원 평가.hwp",
      "중단원 평가 문제(2-1).hwp",
      "소단원 평가(2-3-1).hwp",
      "22개정_중학_수학1_연산학습지_1단원.hwp",
      "[쌍둥이 문제] Ⅱ-1-중단원 마무리.hwp",
      "1학기 중간고사.hwp",
      "지학사_중_수학1_Ⅰ_대단원 서술형 평가.hwp",
      "중_수학1(김동재)_진단평가_1단원_문제.hwp",
      "[비상교육] 고등_대수_3-2_수행 과제.hwp",
      "[비상교육] 고등_공통수학1_1-2_문제 NOTE.hwp",
    ];
    for (const name of samples) {
      seen.add(
        material(
          G("중1", `천재교육 중학 수학1 (김동재) (22개정)\\평가자료\\${name}`),
        ).kind,
      );
    }
    expect(
      [...SOURCE_MATERIAL_KINDS].filter(
        (kind) => kind !== "기타" && !seen.has(kind),
      ),
    ).toEqual([]);
    expect(
      material(
        G(
          "중1",
          "천재교육 중학 수학1 (김동재) (22개정)\\평가자료\\이름만으로는 알 수 없는 자료.hwp",
        ),
      ).kind,
    ).toBe("기타");
  });
});
