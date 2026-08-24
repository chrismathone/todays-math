import localFont from "next/font/local";

// Pretendard 가변 폰트 — D-29 디자인 확정 서체.
// 파일 출처: eywa_refactoring(원장님 본인 프로젝트) public/fonts/PretendardVariable.woff2를
// 그대로 복사. OFL 라이선스 폰트이며 동봉 LICENSE 파일은 원본 위치에 없었음(보고 대상).
export const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  style: "normal",
  display: "swap",
  preload: true,
  // 폰트 로딩 실패/지연 시 폴백. "Malgun Gothic"은 Windows 기본 서체로 남겨
  // globals.css:57의 기존 폴백 순서(D-29 이전)와 호환한다.
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "system-ui",
    "Apple SD Gothic Neo",
    "Noto Sans KR",
    "Malgun Gothic",
    "sans-serif",
  ],
});
