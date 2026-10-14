import TodayMathMark from "@/components/brand/TodayMathMark";
import Link from "next/link";
import styles from "@/components/auth/auth.module.css";

/**
 * 로그인·가입 화면의 바깥 틀(머리·바닥). `(auth)` 묶음 밖의 화면도 같은 틀을 쓰게 따로 뺐다 —
 * eywa 연결 확인 화면(`/account/eywa-link`, D-139 ⑹)이 «로그인 화면과 같은 틀»이다.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="오늘 수학 홈">
          <TodayMathMark size={34} />
          오늘 수학
        </Link>
        <Link href="/" className={styles.homeLink}>
          홈으로<span aria-hidden="true">↗</span>
        </Link>
      </header>
      <noscript>
        <p className={styles.noScript}>
          안전한 로그인을 위해 브라우저에서 JavaScript를 켜 주세요.
        </p>
      </noscript>
      <main className={styles.content}>{children}</main>
      <footer className={styles.footer}>
        <span>© 오늘 수학</span>
        <span>EVERY GOOD LESSON STARTS WITH A PAGE.</span>
      </footer>
    </div>
  );
}
