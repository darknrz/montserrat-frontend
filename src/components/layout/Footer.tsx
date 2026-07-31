import { ArrowUp, Clock, Facebook, FileDown, Instagram, Mail, MapPin, Music2, Phone, ShieldCheck, Youtube } from "lucide-react";
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
  const reglamentoPdfUrl = "/REGLAMENTO INTERNO.pdf";

  const contactItems = [
    { icon: MapPin, value: `${institution.direccion}, ${institution.ciudad}` },
    { icon: Mail, value: institution.email },
    ...(institution.telefono ? [{ icon: Phone, value: institution.telefono }] : []),
    ...(institution.horarioAtencion ? [{ icon: Clock, value: institution.horarioAtencion }] : [])
  ];

  return (
    <footer className="relative overflow-hidden bg-monserrat-black text-white">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-monserrat-red via-monserrat-gold to-monserrat-red" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(216,168,66,0.14),transparent_28%),radial-gradient(circle_at_88%_18%,rgba(159,23,27,0.18),transparent_30%)]" />

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr_1fr_0.8fr]">
            <div>
              <a href="#inicio" className="inline-flex items-center gap-3">
                {institution.logoUrl ? (
                  <img
                    src={institution.logoUrl}
                    alt={institution.nombre}
                    className="h-14 w-14 rounded-2xl border border-monserrat-gold/60 object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-monserrat-gold/60 bg-monserrat-red text-xl font-black text-monserrat-gold">
                    M
                  </span>
                )}
                <div>
                  <p className="text-base font-black leading-tight">{institution.nombre}</p>
                  <p className="mt-1 text-xs font-semibold text-monserrat-gold/80">{institution.ciudad} - {institution.niveles}</p>
                </div>
              </a>

              <p className="mt-5 max-w-sm text-sm leading-6 text-white/62">
                {institution.descripcion || `Formacion con valores, excelencia academica y compromiso con ${institution.ciudad}.`}
              </p>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-monserrat-gold/25 bg-monserrat-gold/8 px-3 py-1.5 text-[11px] font-bold text-monserrat-gold">
                <ShieldCheck size={14} />
                Institucion educativa privada
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-monserrat-gold">Navegacion</h3>
              <div className="mt-4 grid gap-2">
                {quickLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="group inline-flex items-center justify-between rounded-xl px-3 py-2 text-sm text-white/68 transition hover:bg-white/7 hover:text-white"
                  >
                    {link.label}
                    <span className="h-1.5 w-1.5 rounded-full bg-monserrat-gold opacity-0 transition group-hover:opacity-100" />
                  </a>
                ))}
                <a
                  href="/admin"
                  className="mt-1 inline-flex items-center justify-center rounded-xl border border-white/12 px-3 py-2 text-sm font-bold text-white/72 transition hover:border-monserrat-gold/45 hover:text-monserrat-gold"
                >
                  Portal Admin
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-monserrat-gold">Contacto</h3>
              <div className="mt-4 grid gap-3">
                {contactItems.map(({ icon: Icon, value }) => (
                  <div key={value} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 text-monserrat-gold">
                      <Icon size={16} />
                    </div>
                    <p className="min-w-0 break-words text-sm leading-5 text-white/68">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-monserrat-gold">Redes sociales</h3>
              <p className="mt-4 text-sm leading-6 text-white/58">
                Sigue nuestras publicaciones institucionales y novedades academicas.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-2">
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
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-sm font-bold text-white/72 transition hover:border-monserrat-gold/45 hover:bg-monserrat-gold/10 hover:text-monserrat-gold"
                      aria-label={red.nombre}
                    >
                      <Icon size={17} />
                      <span className="truncate">{red.nombre}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {institution.nombre}. {institution.ciudad}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={reglamentoPdfUrl}
              target="_blank"
              rel="noreferrer"
              download="reglamento-interno.pdf"
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-2 font-bold text-white/70 transition hover:border-monserrat-gold/45 hover:text-monserrat-gold"
            >
              <FileDown size={15} />
              Descargar reglamento (PDF)
            </a>
            <a
              href="#inicio"
              className="inline-flex items-center gap-2 font-bold text-white/55 transition hover:text-monserrat-gold"
            >
              Volver arriba
              <ArrowUp size={15} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
