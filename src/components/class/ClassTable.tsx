import { OwnerTag } from "@/components/ui/OwnerTag";
import { nameSelectionClass } from "@/components/ui/rowSelection";
import type { ClassEntity } from "@/contracts/class.contract";
import { hasOwners } from "@/lib/class/ownerLabel";

const HEAD_CLASS =
  "border-b-[2.5px] border-ink px-2.5 py-2 text-left text-[10px] font-black tracking-[1.5px] text-text-2";

type ClassTableProps = {
  classes: ClassEntity[];
  selectedClassId: string;
  onSelect: (classId: string) => void;
};

export function ClassTable({
  classes,
  selectedClassId,
  onSelect,
}: ClassTableProps) {
  // «담당» 열은 서버가 담당을 실어 보낼 때만(관리자 — D-132). 화면은 isAdmin 을 읽지 않는다.
  const withOwner = hasOwners(classes);
  return (
    <table className="w-full border-collapse text-[12.5px] tabular-nums">
      <thead>
        <tr>
          <th className={HEAD_CLASS}>반</th>
          <th className={HEAD_CLASS}>학년</th>
          {withOwner ? <th className={HEAD_CLASS}>담당</th> : null}
        </tr>
      </thead>
      <tbody>
        {classes.length === 0 ? (
          <tr>
            <td
              colSpan={2}
              className="border-b border-divider px-2.5 py-3 text-text-2"
            >
              등록된 반이 없습니다. 반 이름과 학년을 입력해 첫 반을 추가해
              주세요.
            </td>
          </tr>
        ) : null}
        {classes.map((cls) => {
          const selected = cls.id === selectedClassId;
          return (
            /*
             * 고른 반은 **이름 버튼**이 나타낸다 — 메인 `LedgerTable` 이 쓰는 확정 어법
             * (원장님 2026-08-26)을 `rowSelection.ts` 한 곳에서 가져다 쓴다.
             *
             * 🔴 예전에는 `<tr>` 에 `bg-white` 를 걸었는데 앱 배경이 흰색이라 **아무것도
             *    안 보였다.** 표시는 흰 바탕에서 보이는 것이어야 한다.
             * ⚠️ D-30: 행(`<tr>`)에는 손가락·hover 를 두지 않는다. 누르는 것은 이 버튼뿐이다.
             */
            <tr key={cls.id}>
              <td className="border-b border-divider px-2.5 py-2">
                <button
                  type="button"
                  aria-current={selected ? "true" : undefined}
                  onClick={() => onSelect(cls.id)}
                  className={`min-h-11 w-full text-left text-[15px] font-black tracking-[-0.3px] ${nameSelectionClass(selected)}`}
                >
                  {cls.name}
                </button>
              </td>
              <td className="border-b border-divider px-2.5 py-2 text-text-2">
                {cls.grade}
              </td>
              {withOwner ? (
                <td className="whitespace-nowrap border-b border-divider px-2.5 py-2">
                  {cls.owner ? <OwnerTag owner={cls.owner} /> : null}
                </td>
              ) : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
