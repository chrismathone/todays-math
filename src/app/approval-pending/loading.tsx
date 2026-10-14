import s from "@/components/approval-pending/pending.module.css";

export default function Loading() {
  return (
    <div aria-busy="true" className={s.shell}>
      <header className={s.header}>
        <span className={s.brand}>오늘 수학</span>
        <span className={s.headerLabel}>가입 승인 확인</span>
      </header>
      <main className={s.main}>
        <section className={s.card} aria-labelledby="pending-loading-title">
          <div className={s.emblem} aria-hidden="true">
            ···
          </div>
          <p className={s.eyebrow}>YOUR WORKSPACE, ALMOST READY</p>
          <h1 id="pending-loading-title">
            가입 승인 상태를 확인하고 있습니다.
          </h1>
          <p className={s.description} role="status">
            계정 상태를 확인해 잠시 후 안내해 드립니다.
          </p>
        </section>
      </main>
      <footer className={s.footer}>
        오늘 수학 · 선생님의 다음 수업을 위해
      </footer>
    </div>
  );
}
