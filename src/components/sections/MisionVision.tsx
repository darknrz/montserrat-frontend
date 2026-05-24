import { Eye, Target } from "lucide-react";
import { useState } from "react";
import { Card } from "../ui/Card";

function ExpandCard({
  accentClass, iconBg, icon: Icon, title, text, verMasColor,
}: {
  accentClass: string; iconBg: string; icon: typeof Target;
  title: string; text: string; verMasColor: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Card className={` p-5 `}>

      <h3 className="mb-2 text-base font-black text-monserrat-ink">{title}</h3>

      <div className="relative overflow-hidden transition-all duration-500"
        style={{ maxHeight: open ? "300px" : "48px" }}>
        <p className="text-[12.5px] leading-6 text-monserrat-ink/70">{text}</p>
        {!open && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t to-transparent" />
        )}
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className={`mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] ${verMasColor}`}
      >
        {open ? "Ver menos" : "Ver más"}
        <svg className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          width="11" height="11" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 16 16">
          <path d="M3 6l5 5 5-5" />
        </svg>
      </button>
    </Card>
  );
}

export function MisionVision({ mision, vision }: { mision: string; vision: string }) {
  return (
    <div className="mt-4 grid gap-2 lg:grid-cols-2">
      <ExpandCard
        accentClass="border-t-monserrat-red"
        iconBg="bg-monserrat-red"
        icon={Target}
        title="Misión"
        text={mision}
        verMasColor="text-monserrat-red"
      />
      <ExpandCard
        accentClass="border-t-monserrat-gold"
        iconBg="bg-monserrat-gold"
        icon={Eye}
        title="Visión"
        text={vision}
        verMasColor="text-monserrat-gold"
      />
    </div>
  );
}