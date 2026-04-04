import type { ReactNode } from "react";

interface WorkspaceSectionProps {
  title: string;
  children: ReactNode;
}

export function WorkspaceSection({ title, children }: WorkspaceSectionProps) {
  return (
    <div>
      <div className="ws-section-header">{title}</div>
      {children}
    </div>
  );
}
