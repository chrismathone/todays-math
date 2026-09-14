import { AuthExperience } from "./AuthExperience";
import styles from "./auth.module.css";

export function AuthLoading({ fields = 2 }: { fields?: number }) {
  return (
    <AuthExperience>
      <div className={styles.skeleton} role="status" aria-label="화면 준비 중">
        <div className={styles.skeletonTitle} aria-hidden="true" />
        <p>선생님의 작업실을 준비하고 있어요.</p>
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className={styles.skeletonLine} aria-hidden="true" />
        ))}
        <div className={styles.skeletonLine} aria-hidden="true" />
      </div>
    </AuthExperience>
  );
}
