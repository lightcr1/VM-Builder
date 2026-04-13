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
        <p className="eyebrow">{title}</p>
        <p className="section-description">{description}</p>
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
