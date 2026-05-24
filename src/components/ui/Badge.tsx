import type { PropsWithChildren } from "react";

type BadgeProps = PropsWithChildren<{
  className?: string;
}>;

export function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ring-1 ${className}`}>
      {children}
    </span>
  );
}
