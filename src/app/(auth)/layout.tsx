import TodayMathMark from "@/components/brand/TodayMathMark";
import Link from "next/link";
import styles from "@/components/auth/auth.module.css";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="오늘의수학 홈">
          <TodayMathMark size={34} />
          오늘의수학
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
        <span>© 오늘의수학</span>
        <span>EVERY GOOD LESSON STARTS WITH A PAGE.</span>
      </footer>
    </div>
  );
}
