/**
 * 학생 번호의 해시·비교와 «없는 아이디» 열쇠 — `studentLogin.ts` 에 넣는 서버 쪽 부품.
 *
 * - 해시는 원장 계정과 **같은 라이브러리·같은 비용**이다(bcryptjs · 10 — `/api/auth/signup` 의
 *   `BCRYPT_SALT_ROUNDS`. 라우트 파일은 핸들러 말고는 내보낼 수 없어 값을 여기 따로 적었다).
 * - 🔴 초기 비밀번호·새 번호는 **해시만** 저장한다(D-124 ⑷). 이 파일 밖으로 번호를 넘기는 길은 없다.
 * - 없는 아이디·꺼진 계정도 비교를 한 번 한다 — 버린 값의 해시(`DUMMY_PIN_HASH`)에 대 본다.
 *   걸리는 시간으로 아이디 존재가 새지 않게(브리프 §6 «아이디 존재를 흘리지 않는다»).
 */
import { createHmac } from "node:crypto";

import { compare, hash } from "bcryptjs";

/** 원장 가입(`src/app/api/auth/signup/route.ts` BCRYPT_SALT_ROUNDS)과 같은 값 */
export const STUDENT_PIN_BCRYPT_ROUNDS = 10;

/**
 * 버린 무작위 문자열의 bcrypt(비용 10) 해시 — 비밀이 아니다. 어떤 번호도 이것과 맞지 않는다.
 * 2026-09-15 `bcryptjs.hashSync(randomBytes(24).toString("hex"), 10)` 로 한 번 만들어 박았다.
 */
const DUMMY_PIN_HASH =
  "$2b$10$8M08eTT6QXGLbxXYJyblqO.8GjFaV28ogWWjhgV.PyOoKZLC2ai2C";

export async function hashStudentPin(pin: string): Promise<string> {
  return hash(pin, STUDENT_PIN_BCRYPT_ROUNDS);
}

/** `passwordHash` 가 null 이면 버린 해시에 대 보고 늘 false — `LoginDeps.comparePin` 의 약속 */
export async function compareStudentPin(
  pin: string,
  passwordHash: string | null,
): Promise<boolean> {
  if (passwordHash === null) {
    await compare(pin, DUMMY_PIN_HASH);
    return false;
  }
  return compare(pin, passwordHash);
}

/**
 * 없는 아이디의 열쇠 — 정규화한 아이디의 HMAC-SHA256(AUTH_SECRET). 64자 16진.
 * 입력한 글자를 그대로 DB 에 적지 않는다(학생이 번호를 아이디 칸에 적는 실수가 있다).
 */
export function studentLoginMissKey(
  normalizedLoginId: string,
  secret: string | undefined = process.env.AUTH_SECRET,
): string {
  if (!secret)
    throw new Error("AUTH_SECRET 이 없다 — 없는 아이디의 열쇠를 만들 수 없다");
  return createHmac("sha256", secret)
    .update(`student-login-miss:${normalizedLoginId}`)
    .digest("hex");
}
