import TodayMathMark from "@/components/brand/TodayMathMark";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-full flex-col bg-canvas text-ink">
      <header className="border-b-[3px] border-ink px-[26px] pt-[19px] pb-[15px]">
        <p className="flex items-center gap-2.5 text-[28.5px] font-black tracking-[-0.5px]">
          <TodayMathMark size={34} />
          오늘의수학
        </p>
      </header>
      <div className="flex flex-1 items-start justify-center px-6 py-16">
        {children}
      </div>
    </div>
  );
}
