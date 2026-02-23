import type { PropsWithChildren } from "react";

interface StatCardProps extends PropsWithChildren {
  title: string;
  value: string;
}

export function StatCard({ title, value, children }: StatCardProps) {
  return (
    <article className="stat-card">
      <p className="stat-card-title">{title}</p>
      <p className="stat-card-value">{value}</p>
      {children}
    </article>
  );
}

