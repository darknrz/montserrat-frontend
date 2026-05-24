import { Award, BookOpen, Building2, CalendarDays, Mail, MapPin } from "lucide-react";
import type { Institution } from "../../types";
import { SectionHeader } from "../ui/SectionHeader";
import { Card } from "../ui/Card";
import { MisionVision } from "./MisionVision";

type DatosGeneralesProps = { institution: Institution };

export function DatosGenerales({ institution }: DatosGeneralesProps) {
  const datos = [
    { icon: MapPin,       title: "Dirección",  value: `${institution.direccion}, ${institution.ciudad}` },
    { icon: CalendarDays, title: "Fundación",  value: institution.anioFundacion },
    { icon: Building2,    title: "Tipo",       value: institution.tipo },
    { icon: BookOpen,     title: "Niveles",    value: institution.niveles },
    { icon: Mail,         title: "Correo",     value: institution.email },
    { icon: Award,        title: "Logro",      value: "Múltiples ingresantes a diversas universidades del país" },
  ];

  const pills = [
    { before: "Fundada en",    value: String(institution.anioFundacion) },
    { before: "Niveles",       value: institution.niveles },
    { before: institution.ciudad, value: institution.direccion.split(",")[0] },
    { before: "Ingresantes a", value: "universidades del país" },
  ];

  return (
    <>
      {/* ── Datos + Misión/Visión ── */}
      <section id="nosotros" className="bg-monserrat-cream px-8 py-20 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <SectionHeader
            eyebrow="Datos generales"
            title="Una comunidad educativa con identidad y resultados"
            description="Desde Huancayo, acompañamos el desarrollo académico y humano de nuestros estudiantes."
          />

          {/* Cards pequeñas — icono + texto en fila, 2 columnas */}
      <div className="mt-8 grid grid-cols-2 gap-2">
     {datos.map(({ icon: Icon, title, value }) => (
    <Card key={title} className="flex items-center gap-3 p-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-monserrat-red/8 text-monserrat-red">
        <Icon size={15} strokeWidth={1.8} />
      </div>
      <div>
        <p className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-monserrat-ink/40">{title}</p>
        <p className="break-words text-[12.5px] leading-snug text-monserrat-ink">{String(value)}</p>
      </div>
    </Card>
  ))}
</div>

          <MisionVision mision={institution.mision} vision={institution.vision} />
        </div>
      </section>
    </>
  );
}