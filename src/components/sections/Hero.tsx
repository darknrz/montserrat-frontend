import type { Ingresante, Institution, Video } from "../../types";

type HeroProps = {
  institution: Institution;
  ingresantes: Ingresante[];
  videos: Video[];
};

export function Hero({ institution, ingresantes, videos }: HeroProps) {
  const foundationYear = Number(institution.anioFundacion);
  const currentYear = new Date().getFullYear();
  const years = Number.isFinite(foundationYear) ? Math.max(1, currentYear - foundationYear) : null;
  const latestYear = ingresantes.reduce((latest, item) => Math.max(latest, Number(item.anio) || 0), 0);
  const latestIngresantes = latestYear
    ? ingresantes.filter((item) => Number(item.anio) === latestYear).length
    : ingresantes.length;

  const stats = [
    { val: institution.anioFundacion, lbl: "Fundación" },
    { val: years ? `${years}+` : "—", lbl: "Años" },
    { val: `${latestIngresantes}+`, lbl: latestYear ? `Ingresantes ${latestYear}` : "Ingresantes" },
  ];

  return (
    <section
      id="inicio"
      className="relative flex min-h-screen items-center overflow-hidden"
    >
      {/* Imagen de fondo full */}
      {institution.bannerUrl || institution.logoUrl ? (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${institution.bannerUrl ?? institution.logoUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 z-0 bg-[linear-gradient(135deg,#0d0608_0%,#1a0a0b_40%,#0e0a04_100%)]" />
      )}

      {/* Overlay oscuro izq→transparente der */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(105deg,rgba(10,4,5,0.93)_0%,rgba(13,6,8,0.83)_38%,rgba(13,6,8,0.55)_60%,rgba(13,6,8,0.18)_100%)]" />

      {/* Glow rojo ambiental */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_55%_70%_at_75%_40%,rgba(139,26,26,0.28),transparent_65%)]" />

      {/* Grid de fondo */}
      <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:38px_38px]" />

      {/* Fade inferior hacia crema */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-44 bg-gradient-to-t from-monserrat-cream to-transparent" />

      {/* Contenido */}
      <div className="relative z-30 max-w-[600px] px-16 py-24">
        {/* Pill */}
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-monserrat-gold/32 bg-monserrat-gold/7 px-4 py-1.5 backdrop-blur-sm">
          <span className="h-[5px] w-[5px] rounded-full bg-monserrat-gold" />
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-monserrat-gold/90">
            {institution.ciudad} · {institution.niveles}
          </span>
        </div>

        <h1 className="font-serif text-[clamp(44px,5.5vw,68px)] font-black leading-[0.97] tracking-[-0.03em] text-monserrat-cream">
          Institución<br />Educativa
          <em className="block font-serif italic text-monserrat-gold">{institution.nombre}</em>
        </h1>

        <p className="mt-5 max-w-[400px] text-[15px] leading-7 text-monserrat-cream/55">
          {institution.descripcion ||
            `Formando líderes con valores, excelencia académica y vocación de servicio desde ${institution.anioFundacion} en ${institution.ciudad}.`}
        </p>

        <div className="mt-8 flex flex-wrap gap-2.5">
          <a href="#nosotros"
            className="rounded-full bg-monserrat-gold px-6 py-3 text-[13px] font-black text-monserrat-black transition hover:bg-monserrat-gold/85 hover:shadow-[0_4px_24px_rgba(196,150,58,0.4)]">
            Conoce más
          </a>
          <a href="#videos"
            className="rounded-full border border-white/16 bg-white/8 px-6 py-3 text-[13px] font-black text-monserrat-cream backdrop-blur-sm transition hover:bg-white/14">
            Ver galería
          </a>
          <a href="#ingresantes"
            className="rounded-full border border-white/16 bg-white/8 px-6 py-3 text-[13px] font-black text-monserrat-cream backdrop-blur-sm transition hover:bg-white/14">
            Ingresantes
          </a>
        </div>

        {/* Stats */}
        <div className="mt-10 flex gap-0 border-t border-monserrat-cream/10 pt-7">
          {stats.map((s, i) => (
            <div key={s.lbl}
              className={`${i > 0 ? "border-l border-monserrat-cream/10 pl-7" : ""} pr-7`}>
              <p className="font-serif text-[32px] font-black leading-none text-monserrat-gold">{s.val}</p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-monserrat-cream/40">{s.lbl}</p>
            </div>
          ))}
        </div>

        {/* Tag activo */}
        <div className="mt-6 flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400 shadow-[0_0_6px_#4ade8099]" />
          <span className="text-[11px] font-semibold tracking-[0.05em] text-monserrat-cream/40">
            Institución activa · Huancayo, Perú
          </span>
        </div>
      </div>
    </section>
  );
}