import type { LucideIcon } from "lucide-react";

type InfoCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function InfoCard({ icon: Icon, label, value }: InfoCardProps) {
  return (
    <div className="rounded-[18px] border border-monserrat-cream/9 bg-monserrat-cream/4 p-5">
      <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-monserrat-gold/25 bg-monserrat-gold/15 text-monserrat-gold">
        <Icon size={18} strokeWidth={1.6} />
      </div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-monserrat-cream/40">{label}</p>
      <p className="break-words text-sm leading-relaxed text-monserrat-cream/85">{value}</p>
    </div>
  );
}