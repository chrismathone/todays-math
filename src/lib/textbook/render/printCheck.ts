export const textbookPrintCheck = {
  id: "textbook-a4-qr-20261003",
  title: "교재 A4 펼침면과 실제 QR 스캔",
  changed:
    "공유 지면으로 학생용·해설 PDF를 조판하고 최종 PDF의 모든 QR 픽셀을 검증합니다.",
  look: "양면 출력에서 짝수 쪽은 왼쪽, 홀수 쪽은 오른쪽인지 확인합니다. 대응 행·풀이선·하단의 오차가 0.5mm를 넘거나 수식·그림·QR이 잘리면 불합격입니다. 실제 휴대폰으로 대표 문제·개념 QR을 스캔하고 로그인 복귀·배정 범위·정확한 문제와 영상을 확인합니다.",
  lookFromSource: true,
  evidence: [
    "docs/planning/textbook-studio-20261003.md",
    "docs/planning/tracks/reports/textbook-tab-20261003/input/03_공통데이터계약_및_통합검수.md",
  ],
  status: "대기" as const,
  needs:
    "실제 발행 대상 원고·배정 학생·게시 영상과 양면 프린터. 합성 200쪽 PDF의 디지털 검사는 실물 검사와 별도입니다.",
};
