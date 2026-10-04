import { Eye, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { hayTexto } from "../../lib/sitioPublico";
import { Card } from "../ui/Card";

const LIMITE_RESUMEN = 160;

function ExpandCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  const [open, setOpen] = useState(false);
  const esLargo = text.length > LIMITE_RESUMEN; // "Ver más" solo cuando el texto lo necesita

  return (
    <Card className="reveal p-6">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-monserrat-red text-white shadow-[0_6px_14px_rgba(159,23,27,0.25)]">
          <Icon size={20} />
        </span>
        <h3 className="text-xl font-black text-monserrat-ink">{title}</h3>
      </div>

      <p className={`text-[14px] leading-7 text-monserrat-ink/75 ${esLargo && !open ? "line-clamp-3" : ""}`}>{text}</p>

      {esLargo && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em] text-monserrat-red hover:text-monserrat-redDark">
          {open ? "Ver menos" : "Ver más"}
          <svg className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} width="12" height="12" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 6l5 5 5-5" />
          </svg>
        </button>
      )}
    </Card>
  );
}

export function MisionVision({ mision, vision }: { mision?: string; vision?: string }) {
  const items = [
    ...(hayTexto(mision) ? [{ icon: Target, title: "Misión", text: mision }] : []),
    ...(hayTexto(vision) ? [{ icon: Eye, title: "Visión", text: vision }] : []),
  ];
  if (items.length === 0) return null;

  return (
    <div className={`mt-6 grid gap-4 ${items.length > 1 ? "lg:grid-cols-2" : "mx-auto max-w-2xl"}`}>
      {items.map((item) => (
        <ExpandCard key={item.title} icon={item.icon} title={item.title} text={item.text} />
      ))}
    </div>
  );
}
