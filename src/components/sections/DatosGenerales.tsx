import { Award, BookOpen, Building2, CalendarDays, Mail, MapPin } from "lucide-react";
import { useReveal } from "../../hooks/useReveal";
import { hayTexto } from "../../lib/sitioPublico";
import type { Institution } from "../../types";
import { Card } from "../ui/Card";
import { MascotaSigue } from "../ui/MascotaSigue";
import { SectionHeader } from "../ui/SectionHeader";
import { MisionVision } from "./MisionVision";

type DatosGeneralesProps = {
  institution: Institution;
  /** Cantidad de ingresantes publicados: el "logro" solo se muestra si hay alguno. */
  totalIngresantes?: number;
};

export function DatosGenerales({ institution, totalIngresantes = 0 }: DatosGeneralesProps) {
  const ref = useReveal<HTMLElement>();
  const direccion = [institution.direccion, institution.ciudad].filter(hayTexto).join(", ");

  // Solo las tarjetas que tienen dato: nada de cajas vacías.
  const datos = [
    { icon: MapPin, title: "Dirección", value: direccion },
    { icon: CalendarDays, title: "Fundación", value: institution.anioFundacion },
    { icon: Building2, title: "Tipo", value: institution.tipo },
    { icon: BookOpen, title: "Niveles", value: institution.niveles },
    { icon: Mail, title: "Correo", value: institution.email },
    ...(totalIngresantes > 0
      ? [{ icon: Award, title: "Logro", value: "Ingresantes a diversas universidades del país" }]
      : []),
  ].filter((d) => hayTexto(d.value));

  const hayMisionVision = hayTexto(institution.mision) || hayTexto(institution.vision);
  if (datos.length === 0 && !hayMisionVision) return null;

  return (
    <section id="nosotros" ref={ref} className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="reveal relative">
          <SectionHeader
            eyebrow="Nosotros"
            title="Una comunidad educativa con identidad y resultados"
            description={hayTexto(institution.ciudad) ? `Desde ${institution.ciudad}, acompañamos el desarrollo académico y humano de nuestros estudiantes.` : "Acompañamos el desarrollo académico y humano de nuestros estudiantes."}
          />
          <MascotaSigue className="kid-bob pointer-events-none absolute -right-2 -top-6 hidden h-24 w-auto lg:block" />
        </div>

        {/* Pocas tarjetas quedan centradas; muchas se reparten en la cuadrícula */}
        {datos.length > 0 && (
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {datos.map(({ icon: Icon, title, value }, i) => (
              <Card key={title} className="reveal kid-card-hover flex w-full items-center gap-4 p-4 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.75rem)]">
                <div style={{ ["--i" as string]: i } as React.CSSProperties} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-monserrat-red/10 text-monserrat-red">
                  <Icon size={22} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <p className="mb-0.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-monserrat-ink/55">{title}</p>
                  <p className="break-words text-[14px] font-bold leading-snug text-monserrat-ink">{String(value)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        <MisionVision mision={institution.mision} vision={institution.vision} />
      </div>
    </section>
  );
}
