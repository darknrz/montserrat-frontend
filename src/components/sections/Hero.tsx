import { hayTexto } from "../../lib/sitioPublico";
import type { SeccionId } from "../../lib/sitioPublico";
import type { Ingresante, Institution, Video } from "../../types";
import { MascotaSigue } from "../ui/MascotaSigue";

type HeroProps = {
  institution: Institution;
  ingresantes: Ingresante[];
  videos: Video[];
  secciones?: Set<SeccionId>;
};

export function Hero({ institution, ingresantes, secciones }: HeroProps) {
  const foundationYear = Number(institution.anioFundacion);
  const currentYear = new Date().getFullYear();
  const fundacionValida = Number.isFinite(foundationYear) && foundationYear > 1800 && foundationYear <= currentYear;
  const years = fundacionValida ? Math.max(1, currentYear - foundationYear) : null;
  const latestYear = ingresantes.reduce((latest, item) => Math.max(latest, Number(item.anio) || 0), 0);
  const latestIngresantes = latestYear
    ? ingresantes.filter((item) => Number(item.anio) === latestYear).length
    : ingresantes.length;

  // Solo se muestran las cifras que existen y son mayores a cero.
  const stats = [
    ...(fundacionValida ? [{ val: String(foundationYear), lbl: "Fundación" }] : []),
    ...(years ? [{ val: `${years}+`, lbl: "Años de historia" }] : []),
    ...(latestIngresantes > 0 ? [{ val: `${latestIngresantes}+`, lbl: latestYear ? `Ingresantes ${latestYear}` : "Ingresantes" }] : []),
  ];

  const mostrar = (id: SeccionId) => !secciones || secciones.has(id);
  const etiqueta = [institution.ciudad, institution.niveles].filter(hayTexto).join(" · ");
  const banner = institution.bannerUrl;
  const descripcion = hayTexto(institution.descripcion)
    ? institution.descripcion
    : `Formando personas con valores, excelencia académica y vocación de servicio${hayTexto(institution.ciudad) ? ` en ${institution.ciudad}` : ""}.`;

  return (
    <section id="inicio" className="relative flex min-h-[100svh] items-center overflow-hidden px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      {/* Formas decorativas suaves */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-monserrat-gold/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-monserrat-red/12 blur-3xl" />
      <div className="pointer-events-none absolute right-1/3 top-24 h-24 w-24 rounded-full bg-monserrat-gold/30 blur-2xl" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="kid-rise">
          {etiqueta && (
            <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-monserrat-redDark ring-1 ring-monserrat-gold/45">
              <span className="h-2 w-2 rounded-full bg-monserrat-gold" />
              {etiqueta}
            </p>
          )}

          <h1 className="text-[clamp(38px,6vw,68px)] font-black leading-[1.02] tracking-[-0.02em] text-monserrat-ink">
            Institución Educativa
            {hayTexto(institution.nombre) && (
              <span className="mt-1 block bg-gradient-to-r from-monserrat-red to-monserrat-redDark bg-clip-text text-transparent">
                {institution.nombre}
              </span>
            )}
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-monserrat-ink/75 sm:text-lg">{descripcion}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {mostrar("nosotros") && <a href="#nosotros" className="kid-btn">Conoce más</a>}
            {mostrar("videos") && <a href="#videos" className="kid-btn-soft">Ver galería</a>}
            {mostrar("ingresantes") && <a href="#ingresantes" className="kid-btn-soft">Nuestros ingresantes</a>}
            {!mostrar("nosotros") && !mostrar("videos") && !mostrar("ingresantes") && (
              <a href="/portal" className="kid-btn">Ingresar al portal</a>
            )}
          </div>

          {stats.length > 0 && (
            <dl className="mt-10 flex flex-wrap gap-3">
              {stats.map((s, i) => (
                <div key={s.lbl} className="kid-pop rounded-3xl border-2 border-monserrat-gold/35 bg-white/80 px-5 py-3 shadow-[0_8px_20px_rgba(31,27,24,0.06)]"
                  style={{ ["--i" as string]: i } as React.CSSProperties}>
                  <dd className="text-3xl font-black leading-none text-monserrat-red">{s.val}</dd>
                  <dt className="mt-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-monserrat-ink/65">{s.lbl}</dt>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Mascota (y foto de portada si existe) */}
        <div className="kid-rise relative mx-auto flex w-full max-w-md items-center justify-center" style={{ ["--i" as string]: 2 } as React.CSSProperties}>
          {banner ? (
            <>
              <img src={banner} alt={`Portada de ${institution.nombre || "la institución"}`} width={640} height={480}
                className="aspect-[4/3] w-full rounded-[32px] border-4 border-white object-cover shadow-[0_24px_60px_rgba(31,27,24,0.18)]" />
              <MascotaSigue className="kid-bob absolute -bottom-8 -left-6 h-36 w-auto drop-shadow-xl sm:-left-10 sm:h-44" />
            </>
          ) : (
            <div className="relative flex aspect-square w-full max-w-[380px] items-center justify-center rounded-full bg-[radial-gradient(circle,#fff7e3_0%,#f4e7c9_70%)] ring-4 ring-white/70">
              <MascotaSigue className="kid-bob h-[78%] w-auto drop-shadow-xl" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
