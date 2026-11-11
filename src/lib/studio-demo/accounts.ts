import "server-only";

/**
 * 시연이 이어지는 계정 — 원장님 2026-11-11 «chrismathone@gmail.com 이 로그인해서 문제 추출 탭 들어가면
 * 자동으로 이어지게». 이 계정이라도 시연 PDF 가 아닌 파일은 평소처럼 실제로 분석한다(«시연 PDF 일 때만»).
 */
const STUDIO_DEMO_ACCOUNTS: readonly string[] = ["chrismathone@gmail.com"];

export const isStudioDemoAccount = (email: string) =>
  STUDIO_DEMO_ACCOUNTS.includes(email.trim().toLowerCase());
