import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import TodayMathMark from "../brand/TodayMathMark";
import {
  Arrow,
  ComposeIllustration,
  DeskIllustration,
  Geometry,
  ImportIllustration,
  ReviewIllustration,
} from "./LandingIllustrations";
import styles from "./LandingPage.module.css";

const SIGNUP = "/signup?callbackUrl=%2F";
const LOGIN = "/login?callbackUrl=%2F";

export type LandingPageProps = {
  /** Generated local artwork by default; pass null to use the original paper illustration. */
  heroImageSrc?: string | null;
  /** Optional motion component owned by the media integration, with its own playback controls. */
  mathMotion?: ReactNode;
};

const questions = [
  {
    question: "어떤 자료로 시작할 수 있나요?",
    answer:
      "가지고 있는 PDF나 문제 이미지를 가져와 시작할 수 있어요. 필요한 문항 영역을 선택하고, 인식된 내용을 확인한 뒤 수업 자료로 다듬어 보세요.",
  },
  {
    question: "인식된 수식과 도형도 수정할 수 있나요?",
    answer:
      "인식된 문항과 수식을 검토하고 수정할 수 있어요. 도형은 원본 이미지와 함께 확인하고, 편집 가능한 도형은 수업에 맞게 다듬을 수 있습니다. 인식 결과는 사용하기 전에 선생님이 한 번 더 확인해 주세요.",
  },
  {
    question: "완성한 문제는 어떻게 활용하나요?",
    answer:
      "검토한 문항과 문제은행의 문제를 골라 학습지를 구성하고 내보낼 수 있어요. 수업의 흐름에 맞춰 문제를 모으고, 다음 수업에 활용할 자료도 준비해 보세요.",
  },
];

/** Public marketing surface. Authentication, workspace routing, and media production live with their owners. */
export default function LandingPage({
  heroImageSrc = "/brand/workroom-hero.webp",
  mathMotion,
}: LandingPageProps = {}) {
  return (
    <div className={styles.landing}>
      <a className={styles.skipLink} href="#landing-main">
        본문 바로가기
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brand} aria-label="오늘 수학 홈">
            <TodayMathMark size={35} />
            <span>
              오늘 수학<span className={styles.brandDot}>.</span>
            </span>
          </Link>
          <nav className={styles.sectionNav} aria-label="서비스 소개">
            <a href="#how-it-works">이용 방법</a>
            <a href="#our-workroom">우리의 작업실</a>
            <a href="#questions">자주 묻는 질문</a>
          </nav>
          <div className={styles.headerActions}>
            <Link href={LOGIN} className={styles.loginLink}>
              로그인
            </Link>
            <Link href={SIGNUP} className={styles.headerCta}>
              시작하기 <Arrow diagonal />
            </Link>
          </div>
        </div>
      </header>

      <main id="landing-main" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.smallPlus}>+</span> 선생님의 수학 준비,
              오늘 수학
            </p>
            <h1 id="hero-title">
              좋은 수업의 시작,
              <br />
              <span className={styles.highlight}>선생님의</span>
              <br />
              <span className={styles.highlight}>작업실에서.</span>
            </h1>
            <p className={styles.heroDescription}>
              발견한 문제를, 가르치고 싶은 수업으로.
              <br />
              자료를 가져오고 다듬어 나만의 학습지를 만드는
              <br className={styles.desktopBreak} /> 수학 선생님의 작업실입니다.
            </p>
            <div className={styles.heroActions}>
              <Link href={SIGNUP} className={styles.primaryCta}>
                내 작업실 시작하기 <Arrow diagonal />
              </Link>
              <a href="#how-it-works" className={styles.textLink}>
                어떻게 만드나요? <Arrow />
              </a>
            </div>
            <p className={styles.heroFootnote}>
              PDF·이미지 가져오기 <span>→</span> 문항 검토 <span>→</span> 학습지
              완성
            </p>
          </div>
          <figure className={styles.heroVisual}>
            <div className={styles.artFrame}>
              {heroImageSrc ? (
                <Image
                  className={styles.generatedHero}
                  src={heroImageSrc}
                  alt="종이와 수학 도형이 어우러진 선생님의 알록달록한 준비 책상"
                  fill
                  sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1200px) 48vw, 610px"
                  loading="eager"
                  fetchPriority="high"
                />
              ) : (
                <DeskIllustration />
              )}
              <span className={styles.artStamp} aria-hidden="true">
                수학에
                <br />
                <b>생각을 더하다</b>
                <span>＋</span>
              </span>
            </div>
            <figcaption className={styles.artCaption}>
              <span>THE TEACHER’S WORKROOM</span>
              <span>작은 준비가, 더 나은 수업으로.</span>
            </figcaption>
          </figure>
        </section>

        <div
          className={styles.topicStrip}
          aria-label="오늘 수학으로 할 수 있는 일"
        >
          <div>
            <span>자료를 발견하고</span>
            <b aria-hidden="true">↗</b>
            <span>문제를 다듬고</span>
            <b aria-hidden="true">✳</b>
            <span>수업을 완성해요</span>
            <b aria-hidden="true">＋</b>
            <span className={styles.stripEnglish}>
              MADE FOR YOUR NEXT LESSON
            </span>
          </div>
        </div>

        <section
          id="how-it-works"
          className={styles.workflow}
          aria-labelledby="workflow-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>01 / 문제에서 수업까지</p>
              <h2 id="workflow-title">
                모아둔 좋은 문제,
                <br />
                이제 수업이 됩니다.
              </h2>
            </div>
            <p>
              자료를 옮기느라 끊겼던 생각이
              <br />
              하나의 작업실에서 자연스럽게 이어지도록.
            </p>
          </div>
          <ol className={styles.steps}>
            <li>
              <ImportIllustration />
              <div className={styles.stepCopy}>
                <span className={styles.stepNumber}>01</span>
                <div>
                  <h3>꺼내고, 가져오고.</h3>
                  <p>
                    PDF와 이미지에서 필요한 문제를 골라요. 수업에 쓰고 싶었던
                    자료가 시작점이 됩니다.
                  </p>
                </div>
              </div>
            </li>
            <li>
              <ReviewIllustration />
              <div className={styles.stepCopy}>
                <span className={styles.stepNumber}>02</span>
                <div>
                  <h3>살펴보고, 다듬고.</h3>
                  <p>
                    인식된 문항과 수식을 확인하고, 편집 가능한 도형까지 수업에
                    맞게 손봐요.
                  </p>
                </div>
              </div>
            </li>
            <li>
              <ComposeIllustration />
              <div className={styles.stepCopy}>
                <span className={styles.stepNumber}>03</span>
                <div>
                  <h3>엮어서, 수업으로.</h3>
                  <p>
                    검토한 문제를 고르고 학습지를 구성해요. 완성한 자료는 내보내
                    수업에 활용하세요.
                  </p>
                </div>
              </div>
            </li>
          </ol>
          <p className={styles.exampleNote}>
            이해를 돕기 위한 예시 문항과 구성입니다.
          </p>
        </section>

        <section
          id="our-workroom"
          className={styles.workroom}
          aria-labelledby="workroom-title"
        >
          <div className={styles.workroomInner}>
            <div className={styles.workroomCopy}>
              <p className={styles.eyebrow}>02 / 선생님의 방식으로</p>
              <h2 id="workroom-title">
                문제를 고르는 안목도,
                <br />
                <span>수업을 만드는 방식도.</span>
              </h2>
              <p className={styles.workroomDescription}>
                선생님의 생각이 자료의 중심에 있도록.
                <br />
                오늘 수학은 준비의 과정들을 한곳에 모았습니다.
              </p>
              <dl className={styles.workroomFeatures}>
                <div>
                  <dt>내 자료에서 출발</dt>
                  <dd>가지고 있는 PDF와 이미지를 수업의 재료로.</dd>
                </div>
                <div>
                  <dt>문제은행과 함께</dt>
                  <dd>필요한 문제를 찾아 오늘 가르칠 내용에 맞게.</dd>
                </div>
                <div>
                  <dt>마무리까지 한곳에서</dt>
                  <dd>문항 검토부터 학습지 구성과 내보내기까지.</dd>
                </div>
              </dl>
              <Link href={SIGNUP} className={styles.lightCta}>
                나의 다음 수업 준비하기 <Arrow diagonal />
              </Link>
            </div>
            <div className={styles.workroomVisual}>
              {mathMotion ?? (
                <div className={styles.geometryNote} aria-hidden="true">
                  <span className={styles.noteOverline}>
                    A LITTLE ROOM FOR BIG IDEAS
                  </span>
                  <Geometry className={styles.noteGeometry} />
                  <span className={styles.noteFormula}>
                    좋은 문제 + 나의 생각
                  </span>
                  <span className={styles.noteEquals}>=</span>
                  <strong>우리 반의 다음 수업</strong>
                  <span className={styles.noteStar}>✳</span>
                </div>
              )}
              <p className={styles.workroomCaption}>
                수학의 모양은 달라도, 좋은 수업을 향한 마음은 같으니까.
              </p>
            </div>
          </div>
        </section>

        <section
          id="questions"
          className={styles.faq}
          aria-labelledby="faq-title"
        >
          <div>
            <p className={styles.eyebrow}>03 / 시작하기 전에</p>
            <h2 id="faq-title">
              궁금한 점을
              <br />
              모았어요.
            </h2>
            <span className={styles.faqSymbol} aria-hidden="true">
              ?
            </span>
          </div>
          <div className={styles.faqItems}>
            {questions.map(({ question, answer }) => (
              <details key={question}>
                <summary>
                  {question}
                  <span className={styles.faqPlus} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.closing} aria-labelledby="closing-title">
          <span className={styles.closingStar} aria-hidden="true">
            ✳
          </span>
          <p className={styles.eyebrow}>다음 수업이 기다려지는 곳</p>
          <h2 id="closing-title">
            오늘의 준비가,
            <br className={styles.mobileBreak} /> 내일의 좋은 수업으로.
          </h2>
          <Link href={SIGNUP} className={styles.primaryCta}>
            오늘 수학 시작하기 <Arrow diagonal />
          </Link>
          <p className={styles.closingLogin}>
            이미 작업실이 있다면{" "}
            <Link href={LOGIN}>
              로그인 <Arrow />
            </Link>
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link href="/" className={styles.brand} aria-label="오늘 수학 홈">
            <TodayMathMark size={29} />
            <span>
              오늘 수학<span className={styles.brandDot}>.</span>
            </span>
          </Link>
          <p>선생님의 생각이 수업이 되는 곳.</p>
          <a href="#landing-main">
            맨 위로 <Arrow diagonal />
          </a>
        </div>
      </footer>
    </div>
  );
}
