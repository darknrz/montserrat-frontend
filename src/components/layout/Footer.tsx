import { Facebook, Instagram, Music2, Youtube } from "lucide-react";
import type { Institution, RedSocial } from "../../types";

const quickLinks = [
  { label: "Inicio", href: "#inicio" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Ingresantes", href: "#ingresantes" },
  { label: "Galeria", href: "#videos" },
  { label: "Ubicacion", href: "#ubicacion" }
];

type FooterProps = {
  institution: Institution;
  redes: RedSocial[];
};

export function Footer({ institution, redes }: FooterProps) {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.3fr_0.8fr_1fr_0.7fr]">
          <div>
            <div className="flex items-center gap-3">
              {institution.logoUrl ? (
                <img src={institution.logoUrl} alt={institution.nombre} className="h-12 w-12 rounded-full border-2 border-monserrat-gold object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-monserrat-gold bg-monserrat-red text-xl font-black text-monserrat-gold">
                  M
                </span>
              )}
              <p className="text-base font-black">{institution.nombre}</p>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/65">
              {institution.descripcion || `Formacion con valores, excelencia academica y compromiso con ${institution.ciudad}.`}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase text-monserrat-gold">Links rapidos</h3>
            <div className="mt-4 grid gap-2">
              {quickLinks.map((link) => (
                <a key={link.href} href={link.href} className="text-sm text-white/70 transition hover:text-white">
                  {link.label}
                </a>
              ))}
              <a href="/admin" className="text-sm text-white/70 transition hover:text-white">
                Portal Admin
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black uppercase text-monserrat-gold">Contacto</h3>
            <p className="mt-4 text-sm leading-6 text-white/70">{institution.direccion}, {institution.ciudad}</p>
            <p className="mt-2 break-words text-sm leading-6 text-white/70">{institution.email}</p>
            {institution.telefono ? <p className="mt-2 text-sm leading-6 text-white/70">{institution.telefono}</p> : null}
            {institution.horarioAtencion ? <p className="mt-2 text-sm leading-6 text-white/70">{institution.horarioAtencion}</p> : null}
          </div>

          <div>
            <h3 className="text-sm font-black uppercase text-monserrat-gold">Redes</h3>
            <div className="mt-4 flex gap-3">
              {redes.map((red) => {
                const name = red.nombre.toLowerCase();
                const Icon = name.includes("youtube")
                  ? Youtube
                  : name.includes("instagram")
                    ? Instagram
                    : name.includes("tiktok")
                      ? Music2
                      : Facebook;
                return (
                  <a
                    key={red.id}
                    href={red.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-white/20 text-white transition hover:border-monserrat-gold hover:text-monserrat-gold"
                    aria-label={red.nombre}
                  >
                    <Icon size={20} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-monserrat-gold/60 pt-6 text-center text-sm text-white/55">
          © {new Date().getFullYear()} {institution.nombre} - {institution.ciudad}
        </div>
      </div>
    </footer>
  );
}
