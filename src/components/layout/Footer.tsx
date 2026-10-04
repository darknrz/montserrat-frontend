import { ArrowUp, Clock, Facebook, FileDown, Instagram, Mail, MapPin, Music2, Phone, ShieldCheck, Youtube } from "lucide-react";
import { hayTexto } from "../../lib/sitioPublico";
import type { SeccionId } from "../../lib/sitioPublico";
import type { Institution, RedSocial } from "../../types";
import { MascotaSigue } from "../ui/MascotaSigue";

const QUICK_LINKS: { id: SeccionId; label: string; href: string }[] = [
  { id: "inicio", label: "Inicio", href: "#inicio" },
  { id: "nosotros", label: "Nosotros", href: "#nosotros" },
  { id: "ingresantes", label: "Ingresantes", href: "#ingresantes" },
  { id: "videos", label: "Galería", href: "#videos" },
  { id: "ubicacion", label: "Ubicación", href: "#ubicacion" },
];

type FooterProps = {
  institution: Institution;
  redes: RedSocial[];
  secciones?: Set<SeccionId>;
};

export function Footer({ institution, redes, secciones }: FooterProps) {
  const reglamentoPdfUrl = "/REGLAMENTO INTERNO.pdf";
  const links = QUICK_LINKS.filter((l) => !secciones || secciones.has(l.id));

  // Solo se muestran los datos de contacto que existen: sin iconos huérfanos.
  const direccion = [institution.direccion, institution.ciudad].filter(hayTexto).join(", ");
  const contactItems = [
    ...(direccion ? [{ icon: MapPin, value: direccion }] : []),
    ...(hayTexto(institution.email) ? [{ icon: Mail, value: institution.email }] : []),
    ...(hayTexto(institution.telefono) ? [{ icon: Phone, value: institution.telefono as string }] : []),
    ...(hayTexto(institution.horarioAtencion) ? [{ icon: Clock, value: institution.horarioAtencion }] : []),
  ];
  const redesConUrl = redes.filter((r) => hayTexto(r.url));
  const subtitulo = [institution.ciudad, institution.niveles].filter(hayTexto).join(" · ");
  const columnas = 1 + (links.length > 0 ? 1 : 0) + (contactItems.length > 0 ? 1 : 0) + (redesConUrl.length > 0 ? 1 : 0);

  return (
    <footer className="relative mt-10 overflow-hidden border-t-4 border-monserrat-gold/60 bg-[linear-gradient(180deg,#f4e7c9_0%,#efdfb8_100%)] text-monserrat-ink">
      <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-monserrat-gold/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-monserrat-red/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className={`grid gap-8 ${columnas >= 4 ? "lg:grid-cols-[1.25fr_0.75fr_1fr_0.9fr]" : columnas === 3 ? "lg:grid-cols-[1.3fr_1fr_1fr]" : columnas === 2 ? "lg:grid-cols-2" : ""}`}>
          <div>
            <a href="#inicio" className="inline-flex items-center gap-3">
              <img src="/logo-montserrat.png" alt={institution.nombre || "Logo del colegio"} width={64} height={64} className="h-16 w-auto object-contain" />
              <div>
                {hayTexto(institution.nombre) && <p className="text-base font-black leading-tight">{institution.nombre}</p>}
                {subtitulo && <p className="mt-1 text-xs font-bold text-monserrat-redDark">{subtitulo}</p>}
              </div>
            </a>

            {hayTexto(institution.descripcion) && (
              <p className="mt-5 max-w-sm text-sm leading-6 text-monserrat-ink/75">{institution.descripcion}</p>
            )}

            <div className="mt-5 flex items-end gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-[11px] font-extrabold text-monserrat-redDark ring-1 ring-monserrat-gold/40">
                <ShieldCheck size={14} />
                Institución educativa privada
              </span>
              <MascotaSigue className="kid-bob hidden h-16 w-auto sm:block" />
            </div>
          </div>

          {links.length > 0 && (
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-monserrat-redDark">Navegación</h3>
              <div className="mt-4 grid gap-1.5">
                {links.map((link) => (
                  <a key={link.href} href={link.href}
                    className="group inline-flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-bold text-monserrat-ink/80 transition hover:bg-white/70 hover:text-monserrat-red">
                    {link.label}
                    <span className="h-1.5 w-1.5 rounded-full bg-monserrat-gold opacity-0 transition group-hover:opacity-100" />
                  </a>
                ))}
                <a href="/portal" className="kid-btn-soft mt-2">Portal académico</a>
              </div>
            </div>
          )}

          {contactItems.length > 0 && (
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-monserrat-redDark">Contacto</h3>
              <div className="mt-4 grid gap-3">
                {contactItems.map(({ icon: Icon, value }) => (
                  <div key={value} className="flex gap-3 rounded-2xl border-2 border-monserrat-gold/25 bg-white/70 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-monserrat-red/10 text-monserrat-red">
                      <Icon size={16} />
                    </div>
                    <p className="min-w-0 break-words text-sm leading-5 text-monserrat-ink/80">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {redesConUrl.length > 0 && (
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.16em] text-monserrat-redDark">Redes sociales</h3>
              <p className="mt-4 text-sm leading-6 text-monserrat-ink/70">
                Sigue nuestras publicaciones y novedades.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {redesConUrl.map((red) => {
                  const name = red.nombre.toLowerCase();
                  const Icon = name.includes("youtube") ? Youtube : name.includes("instagram") ? Instagram : name.includes("tiktok") ? Music2 : Facebook;
                  return (
                    <a key={red.id} href={red.url} target="_blank" rel="noreferrer" aria-label={red.nombre}
                      className="kid-card-hover inline-flex items-center gap-2 rounded-2xl border-2 border-monserrat-gold/30 bg-white/75 px-3 py-2.5 text-sm font-extrabold text-monserrat-ink/85 hover:text-monserrat-red">
                      <Icon size={17} />
                      <span className="truncate">{red.nombre}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t-2 border-monserrat-gold/30 pt-6 text-sm text-monserrat-ink/70 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {[institution.nombre, institution.ciudad].filter(hayTexto).join(". ")}</p>
          <div className="flex flex-wrap items-center gap-3">
            <a href={reglamentoPdfUrl} target="_blank" rel="noreferrer" download="reglamento-interno.pdf"
              className="kid-btn-soft !min-h-[40px] !text-[13px]">
              <FileDown size={15} />
              Descargar reglamento (PDF)
            </a>
            <a href="#inicio" className="inline-flex items-center gap-2 font-extrabold text-monserrat-redDark transition hover:text-monserrat-red">
              Volver arriba
              <ArrowUp size={15} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
