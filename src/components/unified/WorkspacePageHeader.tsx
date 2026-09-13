import type { ReactNode } from "react";
import s from "./WorkspacePageHeader.module.css";

type Props = {
  title: string;
  description: string;
  titleId?: string;
  hidden?: boolean;
  children?: ReactNode;
};

export default function WorkspacePageHeader({
  title,
  description,
  titleId,
  hidden,
  children,
}: Props) {
  return (
    <header className={s.header} hidden={hidden} data-workspace-page-header>
      <div className={s.copy}>
        <h1 id={titleId}>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className={s.actions}>{children}</div>}
    </header>
  );
}
