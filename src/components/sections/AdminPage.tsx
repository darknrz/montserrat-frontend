import type { Ingresante, Institution, RedSocial, Video } from "../../types";
import { AdminSection } from "./AdminSection";

type AdminPageProps = {
  institution: Institution;
  ingresantes: Ingresante[];
  videos: Video[];
  redes: RedSocial[];
  onRefresh: () => Promise<void>;
};

export function AdminPage({ institution, ingresantes, videos, redes, onRefresh }: AdminPageProps) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#110b0b_0%,#241112_40%,#f5eddc_40%,#f5eddc_100%)]">
      <div className="px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <a href="/" className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur transition hover:bg-white/15">
            Volver al sitio publico
          </a>
          <div className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div className="text-white">
              <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-monserrat-gold">Portal Admin</p>
              <h1 className="mt-4 text-5xl font-black leading-tight md:text-6xl">Gestion centralizada de contenido</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/76">
                Administra datos institucionales, ingresantes, redes y el carrusel multimedia desde una vista separada del sitio público.
              </p>
            </div>
            <div className="grid gap-4 rounded-[32px] border border-white/12 bg-white/10 p-6 text-white backdrop-blur">
              <div className="flex items-center gap-4">
                {institution.logoUrl ? (
                  <img src={institution.logoUrl} alt={institution.nombre} className="h-16 w-16 rounded-2xl object-cover ring-2 ring-monserrat-gold/50" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-monserrat-red text-xl font-black text-white">M</div>
                )}
                <div>
                  <p className="text-sm font-bold text-monserrat-gold">{institution.ciudad}</p>
                  <h2 className="text-2xl font-black">{institution.nombre}</h2>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-black/25 p-4">
                  <p className="text-2xl font-black">{ingresantes.length}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/65">Ingresantes</p>
                </div>
                <div className="rounded-2xl bg-black/25 p-4">
                  <p className="text-2xl font-black">{videos.length}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/65">Medios</p>
                </div>
                <div className="rounded-2xl bg-black/25 p-4">
                  <p className="text-2xl font-black">{redes.length}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-white/65">Redes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AdminSection
        institution={institution}
        ingresantes={ingresantes}
        videos={videos}
        redes={redes}
        onRefresh={onRefresh}
      />
    </div>
  );
}
