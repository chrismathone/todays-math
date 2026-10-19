import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AppChrome } from "@/components/chrome/AppChrome";

import { StackCubesDemo } from "./StackCubesDemo";
import styles from "./stack-cubes.module.css";

export const metadata: Metadata = {
  title: "쌓기나무 | 오늘 수학",
  robots: { index: false, follow: false },
};

const views = [
  {
    name: "위에서 본 모양",
    file: "top.svg",
    alt: "앞이 아래인 위에서 본 모양. 아래 줄부터 왼쪽에서 오른쪽으로 높이 1, 1, 빈칸; 2, 3, 1; 1, 2, 1.",
    hint: "숫자는 그 자리에 쌓인 쌓기나무의 개수예요. 앞은 그림의 아래쪽이에요.",
  },
  {
    name: "앞에서 본 모양",
    file: "front.svg",
    alt: "앞에서 본 모양. 왼쪽부터 높이가 2칸, 3칸, 1칸입니다.",
    hint: "왼쪽부터 높이가 2칸, 3칸, 1칸이에요.",
  },
  {
    name: "오른쪽에서 본 모양",
    file: "side.svg",
    alt: "오른쪽에서 본 모양. 왼쪽이 앞, 오른쪽이 뒤이며 높이는 앞부터 1칸, 3칸, 2칸입니다.",
    hint: "그림의 왼쪽이 앞, 오른쪽이 뒤예요.",
  },
] as const;

export default async function StackCubesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  await connection();

  return (
    <AppChrome>
      <main className={styles.page}>
        <header className={styles.heading}>
          <Link href="/dev/blender" className={styles.lessonLink}>
            직육면체 전개도 실험
          </Link>
          <h1>쌓기나무</h1>
          <p className={styles.screenOnly}>
            돌려 보고, 층을 벌려 보며 숨어 있는 쌓기나무를 찾아보세요.
          </p>
        </header>

        <StackCubesDemo />

        <section
          className={styles.printOnly}
          aria-label="쌓기나무 인쇄 그림과 풀이"
        >
          <div className={styles.printImage}>
            <Image
              src="/dev/blender-assets/stack-cubes/iso.svg"
              alt="쌓은 상태의 쌓기나무를 나타낸 입체 그림"
              width={640}
              height={480}
              loading="eager"
              unoptimized
            />
          </div>
          <p>쌓기나무를 아래층부터 한 층씩 나누어 세어 봅시다.</p>
          <p>1층 8개, 2층 3개, 3층 1개이므로 모두 8 + 3 + 1 = 12개입니다.</p>
        </section>

        <section
          className={styles.projections}
          aria-labelledby="exact-views-title"
        >
          <h2 id="exact-views-title">쌓은 상태를 평면 그림으로 비교해요</h2>
          <p>
            <span className={styles.screenOnly}>
              위의 입체 화면은 방향을 살펴보는 도구예요.{" "}
            </span>
            아래는 원근감 없이 칸을 맞춰 그린 정확한 위·앞·오른쪽 모양이에요.
          </p>
          <div className={styles.figureGrid}>
            {views.map((view) => (
              <figure key={view.file}>
                <div className={styles.figureImage}>
                  <Image
                    src={`/dev/blender-assets/stack-cubes/${view.file}`}
                    alt={view.alt}
                    width={640}
                    height={480}
                    loading="eager"
                    unoptimized
                  />
                </div>
                <figcaption>
                  <h3>{view.name}</h3>
                  <p>{view.hint}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </main>
    </AppChrome>
  );
}
