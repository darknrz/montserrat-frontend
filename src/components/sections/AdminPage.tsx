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
    <div className="h-screen flex flex-col overflow-hidden bg-[linear-gradient(180deg,#110b0b_0%,#241112_40%,#f5eddc_40%,#f5eddc_100%)] px-4 pb-4 pt-6 sm:px-6 lg:px-8">
      <div className="flex-none mx-auto w-full max-w-7xl">
        <a href="/" className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-white/15">
          Volver al sitio publico
        </a>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="text-white">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-monserrat-gold">Portal Admin</p>
            <h1 className="mt-2 text-3xl font-black leading-tight md:text-4xl">Gestion centralizada de contenido</h1>
            <p className="mt-2 max-w-xl text-xs leading-5 text-white/70">
              Administra datos institucionales, ingresantes, redes y el carrusel multimedia desde una vista separada del sitio público.
            </p>
          </div>
          <div className="grid gap-3 rounded-[24px] border border-white/12 bg-white/10 p-4 text-white backdrop-blur">
            <div className="flex items-center gap-3">
              {institution.logoUrl ? (
                <img src={institution.logoUrl} alt={institution.nombre} className="h-10 w-10 rounded-xl object-cover ring-2 ring-monserrat-gold/50" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-monserrat-red text-base font-black text-white">M</div>
              )}
              <div>
                <p className="text-[10px] font-bold text-monserrat-gold">{institution.ciudad}</p>
                <h2 className="text-lg font-black">{institution.nombre}</h2>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-black/25 p-2">
                <p className="text-lg font-black">{ingresantes.length}</p>
                <p className="text-[9px] uppercase tracking-[0.15em] text-white/60">Ingresantes</p>
              </div>
              <div className="rounded-xl bg-black/25 p-2">
                <p className="text-lg font-black">{videos.length}</p>
                <p className="text-[9px] uppercase tracking-[0.15em] text-white/60">Medios</p>
              </div>
              <div className="rounded-xl bg-black/25 p-2">
                <p className="text-lg font-black">{redes.length}</p>
                <p className="text-[9px] uppercase tracking-[0.15em] text-white/60">Redes</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 mt-6 w-full mx-auto max-w-7xl flex flex-col">
        <AdminSection
          institution={institution}
          ingresantes={ingresantes}
          videos={videos}
          redes={redes}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
}
