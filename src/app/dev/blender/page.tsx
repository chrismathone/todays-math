import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AppChrome } from "@/components/chrome/AppChrome";

import { FoldingDemo } from "./FoldingDemo";
import styles from "./blender.module.css";

export const metadata: Metadata = {
  title: "직육면체 전개도 | 오늘 수학",
  robots: { index: false, follow: false },
};

export default async function BlenderPage() {
  // This teaching prototype is available only on the development server.
  if (process.env.NODE_ENV === "production") notFound();
  await connection();

  return (
    <AppChrome>
      <main className={styles.page}>
        <header className={styles.heading}>
          <div>
            <p className={styles.context}>Blender 실험</p>
            <h1>직육면체 전개도</h1>
            <p className={styles.intro}>
              펼쳐진 여섯 면이 어떻게 만나 직육면체가 되는지 살펴보세요.
            </p>
            <Link
              href="/dev/blender/stack-cubes"
              className="mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-g-blue print:hidden"
            >
              쌓기나무 실험
            </Link>
          </div>
          <p className={styles.dimensions}>
            <span>가로 × 세로 × 높이</span>
            <strong>4 cm × 3 cm × 2 cm</strong>
          </p>
        </header>

        <div className={styles.lesson}>
          <FoldingDemo />
          <aside
            className={styles.explanation}
            aria-labelledby="opposite-faces"
          >
            <h2 id="opposite-faces">어떤 면이 마주 볼까요?</h2>
            <p>
              같은 색의 두 면은 접었을 때 서로 마주 봅니다. 면 번호로 짝을
              따라가 보세요.
            </p>
            <ul className={styles.pairs} aria-label="마주 보는 면의 세 쌍">
              <li>
                <span className={`${styles.facePair} ${styles.blue}`}>
                  <span>1</span>
                  <span>6</span>
                </span>
                <span>
                  파란 면 <strong>1과 6</strong>
                </span>
              </li>
              <li>
                <span className={`${styles.facePair} ${styles.green}`}>
                  <span>2</span>
                  <span>4</span>
                </span>
                <span>
                  초록 면 <strong>2와 4</strong>
                </span>
              </li>
              <li>
                <span className={`${styles.facePair} ${styles.amber}`}>
                  <span>3</span>
                  <span>5</span>
                </span>
                <span>
                  노란 면 <strong>3과 5</strong>
                </span>
              </li>
            </ul>
            <div className={styles.prompt}>
              <h3>접기 전에 생각해 보세요</h3>
              <p>1번 면의 맞은편에는 어떤 면이 올까요?</p>
              <p>중간에 멈추고, 예상한 면의 위치를 확인해 보세요.</p>
            </div>
          </aside>
        </div>

        <section
          className={styles.comparison}
          aria-labelledby="comparison-title"
        >
          <div className={styles.comparisonHeading}>
            <h2 id="comparison-title">같은 크기, 다른 설명</h2>
            <p>모두 가로 4 cm, 세로 3 cm, 높이 2 cm인 직육면체입니다.</p>
          </div>
          <div className={styles.comparisonFigures}>
            <figure>
              <div className={styles.comparisonImage}>
                <Image
                  src="/dev/blender-assets/cuboid.svg"
                  alt="길이 표시와 숨은 모서리의 점선이 있는 4 cm × 3 cm × 2 cm 직육면체 그림"
                  width={640}
                  height={480}
                  unoptimized
                />
              </div>
              <figcaption>
                <h3>길이와 모서리</h3>
                <p>
                  도형 그림은 길이와 보이지 않는 모서리를 또렷하게 보여 줍니다.
                </p>
              </figcaption>
            </figure>
            <figure>
              <div className={styles.comparisonImage}>
                <Image
                  src="/dev/blender-assets/cuboid-net.svg"
                  alt="같은 직육면체의 여섯 면을 펼친 전개도 그림"
                  width={640}
                  height={480}
                  unoptimized
                />
              </div>
              <figcaption>
                <h3>면의 연결</h3>
                <p>
                  평면 전개도는 여섯 면의 크기와 이어진 위치를 한눈에 보여
                  줍니다.
                </p>
              </figcaption>
            </figure>
            <figure>
              <div className={styles.comparisonImage}>
                <Image
                  src="/dev/blender-assets/cuboid-blender.png"
                  alt="색과 번호로 면을 구별한, 모두 접힌 직육면체의 입체 장면"
                  width={640}
                  height={480}
                  unoptimized
                />
              </div>
              <figcaption>
                <h3>접힌 뒤의 모습</h3>
                <p>
                  입체 장면은 어떤 면이 앞에 오고, 뒤로 가려지는지 보여 줍니다.
                </p>
              </figcaption>
            </figure>
          </div>
          <p className={styles.comparisonNote}>
            길이와 모서리를 읽을 때는 도형 그림을, 접히는 과정을 설명할 때는
            위의 움직이는 전개도를 함께 활용해 보세요.
          </p>
        </section>
      </main>
    </AppChrome>
  );
}
