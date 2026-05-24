import type { PropsWithChildren } from "react";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ children, className = "" }: CardProps) {
  return <div className={`rounded-[28px] border border-black/8 bg-white/92 shadow-[0_24px_80px_rgba(15,12,10,0.08)] backdrop-blur ${className}`}>{children}</div>;
}
