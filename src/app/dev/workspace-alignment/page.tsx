import { connection } from "next/server";
import { notFound } from "next/navigation";
import Preview from "./preview";
import { englishListeningFixture } from "@/mocks/englishListeningFixture";

export const metadata = {
  title: "작업실 화면 검증 · 저장되지 않는 예시",
  robots: { index: false, follow: false },
};

export default async function Page() {
  await connection();
  if (process.env.NODE_ENV !== "development") notFound();
  return <Preview listeningDocument={englishListeningFixture()} />;
}
