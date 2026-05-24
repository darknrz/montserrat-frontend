import { Clock, Mail, MapPin, Phone } from "lucide-react";
import type { Institution } from "../../types";
import { Card } from "../ui/Card";
import { SectionHeader } from "../ui/SectionHeader";

type UbicacionProps = {
  institution: Institution;
};

export function Ubicacion({ institution }: UbicacionProps) {
  const mapQuery = encodeURIComponent(`${institution.direccion} ${institution.ciudad} Peru`);

  return (
    <section id="ubicacion" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader eyebrow="Ubicacion" title="Donde estamos" />

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="overflow-hidden rounded-lg border border-black/10 bg-gray-100 shadow-sm">
            <iframe
              src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
              className="h-[420px] w-full"
              loading="lazy"
              title={`Mapa de ${institution.nombre}`}
            />
          </div>

          <Card className="p-7">
            <h3 className="text-2xl font-black text-monserrat-ink">Contacto institucional</h3>
            <div className="mt-6 grid gap-5">
              <div className="flex gap-4">
                <MapPin className="mt-1 shrink-0 text-monserrat-red" size={22} />
                <p className="text-sm leading-6 text-monserrat-ink/75">{institution.direccion}, {institution.ciudad}</p>
              </div>
              <div className="flex gap-4">
                <Mail className="mt-1 shrink-0 text-monserrat-red" size={22} />
                <p className="break-words text-sm leading-6 text-monserrat-ink/75">{institution.email}</p>
              </div>
              {institution.telefono ? (
                <div className="flex gap-4">
                  <Phone className="mt-1 shrink-0 text-monserrat-red" size={22} />
                  <p className="text-sm leading-6 text-monserrat-ink/75">{institution.telefono}</p>
                </div>
              ) : null}
              <div className="flex gap-4">
                <Clock className="mt-1 shrink-0 text-monserrat-red" size={22} />
                <p className="text-sm leading-6 text-monserrat-ink/75">{institution.horarioAtencion}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
