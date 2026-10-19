import { cookies } from "next/headers";
import { EYWA_V2_TICKET, getPendingSsoSwitch } from "@/lib/eywa/managedSso";
export default async function EywaSwitchPage() {
  const ticket = (await cookies()).get(EYWA_V2_TICKET)?.value;
  const handoff = await getPendingSsoSwitch(ticket);
  if (!handoff)
    return (
      <main>
        <h1>연결 요청이 만료되었습니다</h1>
        <p>에이와에서 오늘 수학을 다시 열어 주세요.</p>
      </main>
    );
  return (
    <main style={{ maxWidth: 600, margin: "64px auto", padding: 24 }}>
      <h1>로그인 계정 전환</h1>
      <p>
        현재 로그인한 계정에서 에이와의 <strong>{handoff.sourceName}</strong>{" "}
        계정으로 전환합니다.
      </p>
      <form action="/api/sso/eywa/v2/complete" method="post">
        <button name="confirm" value="yes">
          이 계정으로 전환
        </button>{" "}
        <button name="confirm" value="no">
          취소
        </button>
      </form>
    </main>
  );
}
