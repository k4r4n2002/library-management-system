import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-border-soft bg-surface shadow-sm shadow-primary/5 ${className}`}
      {...props}
    />
  );
}
