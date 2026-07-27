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
    // Fondo crema sólido en toda la página; la franja oscura ya no es un
    // porcentaje de la pantalla, es simplemente el color de fondo de la
    // topbar (bg-[#1c1112] más abajo), así su alto = alto real del contenido.
    <div className="min-h-screen bg-monserrat-cream px-4 pb-6 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="flex items-center justify-between gap-3 rounded-full border border-white/15 bg-[#1c1112] px-4 py-2 text-white shadow-[0_8px_24px_rgba(28,17,18,0.25)]">
          <div className="flex items-center gap-3">
            {institution.logoUrl ? (
              <img
                src={institution.logoUrl}
                alt={institution.nombre}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-monserrat-gold/50"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-monserrat-red text-sm font-black text-white">
                M
              </div>
            )}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-monserrat-gold">
                Portal Admin
              </p>
              <p className="text-sm font-semibold">{institution.nombre}</p>
            </div>
          </div>
          <a
            href="/"
            className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/15"
          >
            Volver al sitio público
          </a>
        </div>
      </div>

      <div className="mt-6 w-full mx-auto max-w-[1600px]">
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
