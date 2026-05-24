import { Clock, ExternalLink, Mail, MapPin, Navigation, Phone } from "lucide-react";
import type { Institution } from "../../types";
import { SectionHeader } from "../ui/SectionHeader";

type UbicacionProps = {
  institution: Institution;
};

export function Ubicacion({ institution }: UbicacionProps) {
  const mapQuery = encodeURIComponent(`${institution.direccion} ${institution.ciudad} Peru`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  const contactItems = [
    {
      icon: MapPin,
      label: "Direccion",
      value: `${institution.direccion}, ${institution.ciudad}`
    },
    {
      icon: Mail,
      label: "Correo",
      value: institution.email
    },
    ...(institution.telefono
      ? [
          {
            icon: Phone,
            label: "Telefono",
            value: institution.telefono
          }
        ]
      : []),
    {
      icon: Clock,
      label: "Horario",
      value: institution.horarioAtencion
    }
  ];

  return (
    <section id="ubicacion" className="bg-monserrat-cream px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="Ubicacion"
          title="Visitanos en Huancayo"
          description="Encuentra nuestra sede, horarios de atencion y canales oficiales de contacto."
        />

        <div className="mt-12 overflow-hidden rounded-[28px] border border-monserrat-ink/8 bg-white shadow-[0_10px_40px_rgba(28,20,16,0.08)]">
          <div className="grid lg:grid-cols-[1.35fr_0.65fr]">
            <div className="relative min-h-[360px] overflow-hidden bg-monserrat-black lg:min-h-[500px]">
              <iframe
                src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
                className="absolute inset-0 h-full w-full"
                loading="lazy"
                title={`Mapa de ${institution.nombre}`}
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-monserrat-black/45 to-transparent" />
              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[12px] font-black text-monserrat-ink shadow-lg transition hover:bg-monserrat-gold hover:text-monserrat-black"
              >
                <Navigation size={15} />
                Abrir ruta
              </a>
            </div>

            <div className="flex flex-col justify-between p-6 sm:p-8">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-monserrat-red/8 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-monserrat-red">
                  <span className="h-1.5 w-1.5 rounded-full bg-monserrat-red" />
                  Contacto institucional
                </div>

                <h3 className="mt-5 text-3xl font-black leading-tight text-monserrat-ink">
                  Estamos cerca para atenderte
                </h3>
                <p className="mt-3 text-sm leading-6 text-monserrat-ink/60">
                  Para consultas de matricula, costos o visitas, comunicate por correo o acercate durante el horario de atencion.
                </p>
              </div>

              <div className="mt-7 grid gap-3">
                {contactItems.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex gap-3 rounded-2xl border border-monserrat-ink/8 bg-monserrat-cream/55 p-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-monserrat-red shadow-sm">
                      <Icon size={18} strokeWidth={1.9} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">{label}</p>
                      <p className="mt-1 break-words text-[13px] leading-5 text-monserrat-ink/75">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-2 sm:flex-row lg:flex-col">
                <a
                  href={`mailto:${institution.email}`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-monserrat-red px-4 py-3 text-[13px] font-black text-white transition hover:bg-red-800"
                >
                  <Mail size={16} />
                  Escribir correo
                </a>
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-monserrat-ink/10 px-4 py-3 text-[13px] font-black text-monserrat-ink/65 transition hover:border-monserrat-red/30 hover:text-monserrat-red"
                >
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
