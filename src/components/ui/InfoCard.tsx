import type { LucideIcon } from "lucide-react";

type InfoCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export function InfoCard({ icon: Icon, label, value }: InfoCardProps) {
  return (
    <div className="kid-card p-5">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-monserrat-red/10 text-monserrat-red">
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-monserrat-ink/55">{label}</p>
      <p className="break-words text-sm leading-relaxed text-monserrat-ink/85">{value}</p>
    </div>
  );
}
