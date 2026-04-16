import type { ReactNode } from "react";

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-header">
      <div>
        <p className="eyebrow">Workspace</p>
        <h2 className="section-title">{title}</h2>
        <p className="section-description">{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
