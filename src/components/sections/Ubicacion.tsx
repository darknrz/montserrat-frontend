import { Clock, ExternalLink, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { useReveal } from "../../hooks/useReveal";
import { hayTexto } from "../../lib/sitioPublico";
import type { Institution } from "../../types";
import { SectionHeader } from "../ui/SectionHeader";

type UbicacionProps = {
  institution: Institution;
};

export function Ubicacion({ institution }: UbicacionProps) {
  const ref = useReveal<HTMLElement>();
  const lugar = [institution.direccion, institution.ciudad].filter(hayTexto).join(", ");
  // Sin dirección ni ciudad no hay nada que ubicar: la sección se oculta.
  if (!lugar) return null;

  const mapQuery = encodeURIComponent(`${lugar} Peru`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
  const hayEmail = hayTexto(institution.email);

  // Solo los datos que existen: sin iconos ni cajas vacías.
  const contactItems = [
    { icon: MapPin, label: "Dirección", value: lugar },
    ...(hayEmail ? [{ icon: Mail, label: "Correo", value: institution.email }] : []),
    ...(hayTexto(institution.telefono) ? [{ icon: Phone, label: "Teléfono", value: institution.telefono as string }] : []),
    ...(hayTexto(institution.horarioAtencion) ? [{ icon: Clock, label: "Horario", value: institution.horarioAtencion }] : []),
  ];

  return (
    <section id="ubicacion" ref={ref} className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="reveal">
          <SectionHeader
            eyebrow="Ubicación"
            title={hayTexto(institution.ciudad) ? `Visítanos en ${institution.ciudad}` : "Visítanos"}
            description="Encuentra nuestra sede y los canales para comunicarte con nosotros."
          />
        </div>

        <div className="reveal kid-card mt-10 overflow-hidden !rounded-[32px]">
          <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
            <div className="relative min-h-[320px] overflow-hidden bg-[#f1e6cb] lg:min-h-[480px]">
              <iframe
                src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                title={`Mapa de ${institution.nombre || "la institución"}`}
              />
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="kid-btn absolute bottom-4 left-4 !min-h-[44px] !text-[13px]">
                <Navigation size={15} />
                Abrir ruta
              </a>
            </div>

            <div className="flex flex-col justify-between gap-6 p-6 sm:p-8">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-monserrat-red/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-monserrat-red">
                  <span className="h-1.5 w-1.5 rounded-full bg-monserrat-red" />
                  Contacto institucional
                </p>
                <h3 className="mt-4 text-2xl font-black leading-tight text-monserrat-ink sm:text-3xl">Estamos cerca para atenderte</h3>
                {(hayEmail || hayTexto(institution.horarioAtencion)) && (
                  <p className="mt-3 text-sm leading-6 text-monserrat-ink/70">
                    Para consultas de matrícula, costos o visitas, {hayEmail ? "escríbenos" : "acércate"}
                    {hayTexto(institution.horarioAtencion) ? " o visítanos en el horario de atención." : "."}
                  </p>
                )}
              </div>

              <div className="grid gap-3">
                {contactItems.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex gap-3 rounded-2xl border-2 border-monserrat-gold/25 bg-monserrat-cream/60 p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-monserrat-red shadow-sm">
                      <Icon size={18} strokeWidth={1.9} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-monserrat-ink/55">{label}</p>
                      <p className="mt-1 break-words text-[14px] leading-5 text-monserrat-ink/85">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                {hayEmail && (
                  <a href={`mailto:${institution.email}`} className="kid-btn">
                    <Mail size={16} />
                    Escribir correo
                  </a>
                )}
                <a href={mapsUrl} target="_blank" rel="noreferrer" className="kid-btn-soft">
                  Ver en Google Maps
                  <ExternalLink size={15} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
