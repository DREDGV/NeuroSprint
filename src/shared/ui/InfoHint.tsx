import type { ReactNode } from "react";

interface InfoHintProps {
  title: string;
  children: ReactNode;
  testId?: string;
}

export function InfoHint({ title, children, testId }: InfoHintProps) {
  return (
    <details className="info-hint" data-testid={testId}>
      <summary className="info-hint-summary">
        <span className="info-hint-icon" aria-hidden="true">
          ?
        </span>
        <span>{title}</span>
      </summary>
      <div className="info-hint-body">{children}</div>
    </details>
  );
}
