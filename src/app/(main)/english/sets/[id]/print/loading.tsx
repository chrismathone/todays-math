/** 세트를 읽는 동안 — 크롬 없는 지면이라 한 줄만(D-08). 도구 줄·지면은 `EnglishPrintClient` 가 그린다 */
export default function Loading() {
  return (
    <p
      role="status"
      style={{
        margin: 0,
        padding: 24,
        color: "var(--learn-muted)",
        fontFamily:
          'var(--font-pretendard), Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
        fontSize: 14,
      }}
    >
      지면을 불러오는 중입니다.
    </p>
  );
}
