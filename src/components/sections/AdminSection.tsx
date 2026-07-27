import {
  BarChart3,
  BookOpen,
  Building2,
  Clapperboard,
  GraduationCap,
  LayoutDashboard,
  Link2,
  LogOut,
  Megaphone,
  Receipt,
  Settings,
  Share2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { monserratApi } from "../../api/monserrat";
import type {
  AsignacionAcademica,
  Ingresante,
  Institution,
  LoginResponse,
  RedSocial,
  UsuarioAcademico,
  Video,
} from "../../types";
import { FeedbackModal } from "../ui/FeedbackModal";
import {
  ADMIN_TAB_STORAGE_KEY,
  aulaPorGradoSeccion,
  defaultAcademicoConfig,
  defaultGrado,
  isAdminTab,
  labelFromEnum,
  mergeAcademicoConfig,
  type AcademicoConfig,
  type SalonItem,
  type Tab,
} from "./admin/adminShared";
import { InstitucionTab } from "./admin/InstitucionTab";
import { IngresantesTab } from "./admin/IngresantesTab";
import { AnunciosTab } from "./admin/AnunciosTab";
import { CarruselTab } from "./admin/CarruselTab";
import { RedesSocialesTab } from "./admin/RedesSocialesTab";
import { AsignacionesTab } from "./admin/AsignacionesTab";
import { AcademicoTab } from "./admin/AcademicoTab";
import { PensionesTab } from "./admin/PensionesTab";
import { ConfiguracionTab } from "./admin/ConfiguracionTab";
import { ReportesTab } from "./admin/ReportesTab";

type AdminSectionProps = {
  institution: Institution;
  ingresantes: Ingresante[];
  videos: Video[];
  redes: RedSocial[];
  onRefresh: () => Promise<void>;
};

export function AdminSection({
  institution,
  ingresantes,
  videos,
  redes,
  onRefresh,
}: AdminSectionProps) {
  const [session, setSession] = useState<LoginResponse | null>(() => {
    const stored = window.localStorage.getItem("monserrat_admin_session");
    return stored ? (JSON.parse(stored) as LoginResponse) : null;
  });
  const [tab, setTab] = useState<Tab>(() => {
    const stored = window.localStorage.getItem(ADMIN_TAB_STORAGE_KEY);
    return isAdminTab(stored) ? stored : "ingresantes";
  });
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [usuariosAcademicos, setUsuariosAcademicos] = useState<UsuarioAcademico[]>([]);
  const [asignacionesAcademicas, setAsignacionesAcademicas] = useState<AsignacionAcademica[]>([]);
  const [academicoConfig, setAcademicoConfig] = useState<AcademicoConfig>(defaultAcademicoConfig);

  const token = session?.token ?? "";
  const isAdmin = session?.rol === "ADMIN";

  useEffect(() => {
    if (session && !isAdmin) {
      window.localStorage.removeItem("monserrat_admin_session");
      setSession(null);
      setErrorMessage("Este acceso es solo para administradores");
    }
  }, [isAdmin, session]);

  useEffect(() => {
    if (!token) return;
    void Promise.all([
      monserratApi.usuariosAcademicos(token),
      monserratApi.asignacionesAcademicas(token),
    ])
      .then(([usuariosData, asignacionesData]) => {
        setUsuariosAcademicos(usuariosData);
        setAsignacionesAcademicas(asignacionesData);
      })
      .catch((error: unknown) =>
        setErrorMessage(
          error instanceof Error ? error.message : "No se pudieron cargar datos academicos"
        )
      );
  }, [token]);

  useEffect(() => {
    window.localStorage.setItem(ADMIN_TAB_STORAGE_KEY, tab);
  }, [tab]);

  useEffect(() => {
    if (!token) return;
    void monserratApi
      .academicoConfiguracion<AcademicoConfig>(token)
      .then((config) => setAcademicoConfig(mergeAcademicoConfig(config)))
      .catch((error: unknown) =>
        setErrorMessage(
          error instanceof Error ? error.message : "No se pudo cargar la configuracion academica"
        )
      );
  }, [token]);

  const runAdminAction = async (action: () => Promise<void>, successMessage: string) => {
    setIsBusy(true);
    setStatus(null);
    setErrorMessage(null);
    try {
      await action();
      await onRefresh();
      setStatus(successMessage);
    } catch (e) {
      let msg = e instanceof Error ? e.message : "Error al completar la operacion";
      if (
        msg.includes("403") ||
        msg.includes("401") ||
        msg.toLowerCase().includes("forbidden") ||
        msg.toLowerCase().includes("unauthorized")
      ) {
        msg +=
          " (Su sesión puede haber expirado. Por favor, cierre sesión e ingrese nuevamente para renovar sus credenciales).";
      }
      setStatus(msg);
      setErrorMessage(msg);
    } finally {
      setIsBusy(false);
    }
  };

  const logout = () => {
    window.localStorage.removeItem("monserrat_admin_session");
    window.location.href = "/portal";
  };

  const cursosPrimariaActivos = useMemo(
    () => academicoConfig.cursosPrimaria.filter((item) => item.active).map((item) => item.id),
    [academicoConfig.cursosPrimaria]
  );
  const cursosSecundariaActivos = useMemo(
    () => academicoConfig.cursosSecundaria.filter((item) => item.active).map((item) => item.id),
    [academicoConfig.cursosSecundaria]
  );
  const cursosActivosPorNivel = (nivel?: string) =>
    nivel === "SECUNDARIA" ? cursosSecundariaActivos : cursosPrimariaActivos;

  const seccionesPrimariaActivas = useMemo(
    () => academicoConfig.seccionesPrimaria.filter((item) => item.active).map((item) => item.id),
    [academicoConfig.seccionesPrimaria]
  );
  const seccionesSecundariaActivas = useMemo(
    () =>
      academicoConfig.seccionesSecundaria.filter((item) => item.active).map((item) => item.id),
    [academicoConfig.seccionesSecundaria]
  );
  const seccionesActivasPorNivel = (nivel?: string) =>
    nivel === "SECUNDARIA" ? seccionesSecundariaActivas : seccionesPrimariaActivas;

  const gradosActivosPorNivel = (nivel?: string) =>
    (nivel === "SECUNDARIA" ? academicoConfig.gradosSecundaria : academicoConfig.gradosPrimaria)
      .filter((item) => item.active)
      .map((item) => item.id);

  const salonesActivosPorNivel = (nivel?: string) =>
    academicoConfig.salones
      .filter(
        (item) => item.active && item.nivel === (nivel === "SECUNDARIA" ? "SECUNDARIA" : "PRIMARIA")
      )
      .map((item) => item.aula);

  const labelAcademico = (id: string) =>
    [
      ...academicoConfig.cursosPrimaria,
      ...academicoConfig.competenciasPrimaria,
      ...academicoConfig.cursosSecundaria,
      ...academicoConfig.gradosPrimaria,
      ...academicoConfig.gradosSecundaria,
      ...academicoConfig.seccionesPrimaria,
      ...academicoConfig.seccionesSecundaria,
      ...(academicoConfig.nivelesAcademicos ?? []),
    ].find((item) => item.id === id)?.label ?? labelFromEnum(id);

  const saveAcademicoConfig = (next: AcademicoConfig) => {
    setAcademicoConfig(next);
    setErrorMessage(null);
    if (!token) return;
    void monserratApi
      .updateAcademicoConfiguracion(next, token)
      .then((saved) =>
        setAcademicoConfig(
          mergeAcademicoConfig({ ...(saved as AcademicoConfig), ...next })
        )
      )
      .catch((error: unknown) => {
        setStatus(
          error instanceof Error ? error.message : "No se pudo guardar la configuracion academica"
        );
        setErrorMessage(
          error instanceof Error ? error.message : "No se pudo guardar la configuracion academica"
        );
      });
  };

  const updateSalonConfig = (target: SalonItem, patch: Partial<SalonItem>) => {
    saveAcademicoConfig({
      ...academicoConfig,
      salones: academicoConfig.salones.map((salon) =>
        salon === target ? { ...salon, ...patch } : salon
      ),
    });
  };

  const addSalonConfig = (nivel: string, grado: string, seccion: string, aula: string) => {
    saveAcademicoConfig({
      ...academicoConfig,
      salones: [...academicoConfig.salones, { nivel, grado, seccion, aula, active: true }],
    });
  };

  const deleteSalonConfig = (target: SalonItem) => {
    saveAcademicoConfig({
      ...academicoConfig,
      salones: academicoConfig.salones.filter((salon) => salon !== target),
    });
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "institucion", label: "Institución" },
    { id: "ingresantes", label: "Ingresantes" },
    { id: "anuncios", label: "Anuncios" },
    { id: "videos", label: "Carrusel" },
    { id: "redes", label: "Redes sociales" },
    { id: "asignaciones", label: "Asignaciones" },
    { id: "academico", label: "Academico" },
    { id: "pensiones", label: "Pensiones" },
    { id: "configuracion", label: "Configuracion academica" },
    { id: "reportes", label: "Reportes" },
  ];

  const SIDEBAR_TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
    { id: "institucion", label: "Institucion", icon: Building2 },
    { id: "ingresantes", label: "Ingresantes", icon: GraduationCap },
    { id: "anuncios", label: "Anuncios", icon: Megaphone },
    { id: "videos", label: "Carrusel", icon: Clapperboard },
    { id: "redes", label: "Redes sociales", icon: Share2 },
    { id: "asignaciones", label: "Asignaciones", icon: Link2 },
    { id: "academico", label: "Academico", icon: Users },
    { id: "pensiones", label: "Pensiones", icon: Receipt },
    { id: "configuracion", label: "Configuracion", icon: Settings },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
  ];

  const activeTab = SIDEBAR_TABS.find((item) => item.id === tab) ?? SIDEBAR_TABS[0];

  if (!session) return null;

  return (
    <section id="admin" className="min-h-screen bg-[#fafafa] text-monserrat-ink">
      <div className="grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
        <FeedbackModal
          isOpen={Boolean(errorMessage)}
          title="No se pudo completar la accion"
          message={errorMessage ?? ""}
          onClose={() => setErrorMessage(null)}
        />

        <aside className="border-b border-black/10 bg-[#f7f7f6] px-3 py-3 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-4">
          <div className="flex h-full flex-col">
            <div className="mb-5 flex items-center justify-between gap-3 px-2 py-1">
              <div className="flex min-w-0 items-center gap-2.5">
                {institution.logoUrl ? (
                  <img src={institution.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-monserrat-red text-sm font-black text-white">
                    M
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-black">Monserrat</p>
                  <p className="truncate text-[11px] font-semibold text-monserrat-ink/45">Portal admin</p>
                </div>
              </div>
              <LayoutDashboard size={15} className="hidden text-monserrat-ink/35 sm:block" />
            </div>

            <nav className="flex gap-1 overflow-x-auto pb-2 lg:grid lg:overflow-visible lg:pb-0">
              {SIDEBAR_TABS.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-[10px] px-3 py-2 text-left text-[13px] font-bold transition lg:w-full ${
                      active
                        ? "bg-black/8 text-monserrat-ink"
                        : "text-monserrat-ink/58 hover:bg-black/5 hover:text-monserrat-ink"
                    }`}
                  >
                    <Icon size={15} className={active ? "text-monserrat-ink" : "text-monserrat-ink/45"} />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto hidden border-t border-black/8 pt-3 lg:block">
              <a
                href="/"
                className="mb-2 flex items-center gap-2 rounded-[10px] px-3 py-2 text-[12px] font-bold text-monserrat-ink/55 hover:bg-black/5 hover:text-monserrat-ink"
              >
                <BookOpen size={14} />
                Sitio publico
              </a>
              <div className="flex items-center justify-between gap-2 rounded-[10px] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-black">{session.nombre}</p>
                  <p className="truncate text-[11px] font-semibold text-monserrat-ink/40">{session.username}</p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-monserrat-ink/45 hover:bg-black/6 hover:text-monserrat-ink"
                  aria-label="Cerrar sesion"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {/* topbar */}
          <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-black/10 bg-[#fafafa]/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div>
              <h3 className="text-[22px] font-black text-monserrat-ink">
                {activeTab.label}
              </h3>
            </div>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-[12px] font-bold text-monserrat-ink/60 transition hover:border-black/20 hover:text-monserrat-ink"
            >
              <LogOut size={14} /> Cerrar sesión
            </button>
          </div>

          {/* tabs */}
          <div className="hidden">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-full px-4 py-1.5 text-[12px] font-bold whitespace-nowrap transition ${tab === t.id
                  ? "bg-monserrat-red text-white"
                  : "text-monserrat-ink/55 hover:bg-monserrat-ink/6 hover:text-monserrat-ink"
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
            {status && (
              <div className="mb-5 rounded-[12px] border border-monserrat-red/15 bg-monserrat-red/6 px-4 py-2.5 text-[12px] font-bold text-monserrat-red">
                {status}
              </div>
            )}

            {/* ── TAB INSTITUCIÓN ── */}
            {tab === "institucion" && (
              <InstitucionTab
                institution={institution}
                token={token}
                isBusy={isBusy}
                runAdminAction={runAdminAction}
              />
            )}

            {/* ── TAB INGRESANTES ── */}
            {tab === "ingresantes" && (
              <IngresantesTab
                ingresantes={ingresantes}
                usuariosAcademicos={usuariosAcademicos}
                token={token}
                isBusy={isBusy}
                runAdminAction={runAdminAction}
                academicoConfig={academicoConfig}
                saveAcademicoConfig={saveAcademicoConfig}
              />
            )}

            {/* ── TAB ANUNCIOS ── */}
            {tab === "anuncios" && (
              <AnunciosTab
                token={token}
                isBusy={isBusy}
                runAdminAction={runAdminAction}
              />
            )}

            {/* ── TAB VIDEOS ── */}
            {tab === "videos" && (
              <CarruselTab
                videos={videos}
                token={token}
                isBusy={isBusy}
                runAdminAction={runAdminAction}
              />
            )}

            {/* ── TAB REDES ── */}
            {tab === "redes" && (
              <RedesSocialesTab
                redes={redes}
                token={token}
                isBusy={isBusy}
                runAdminAction={runAdminAction}
              />
            )}

            {/* ── TAB ASIGNACIONES ── */}
            {tab === "asignaciones" && (
              <AsignacionesTab
                usuariosAcademicos={usuariosAcademicos}
                asignacionesAcademicas={asignacionesAcademicas}
                setAsignacionesAcademicas={setAsignacionesAcademicas}
                academicoConfig={academicoConfig}
                token={token}
                isBusy={isBusy}
                runAdminAction={runAdminAction}
                cursosActivosPorNivel={cursosActivosPorNivel}
                seccionesActivasPorNivel={seccionesActivasPorNivel}
                gradosActivosPorNivel={gradosActivosPorNivel}
                salonesActivosPorNivel={salonesActivosPorNivel}
                labelAcademico={labelAcademico}
                saveAcademicoConfig={saveAcademicoConfig}
              />
            )}

            {/* ── TAB ACADEMICO ── */}
            {tab === "academico" && (
              <AcademicoTab
                usuariosAcademicos={usuariosAcademicos}
                setUsuariosAcademicos={setUsuariosAcademicos}
                academicoConfig={academicoConfig}
                token={token}
                isBusy={isBusy}
                setIsBusy={setIsBusy}
                setStatus={setStatus}
                setErrorMessage={setErrorMessage}
                runAdminAction={runAdminAction}
                cursosActivosPorNivel={cursosActivosPorNivel}
                seccionesActivasPorNivel={seccionesActivasPorNivel}
                gradosActivosPorNivel={gradosActivosPorNivel}
                labelAcademico={labelAcademico}
              />
            )}

            {/* ── TAB PENSIONES ── */}
            {tab === "pensiones" && (
              <PensionesTab
                usuariosAcademicos={usuariosAcademicos}
                token={token}
                isBusy={isBusy}
                runAdminAction={runAdminAction}
                setErrorMessage={setErrorMessage}
                gradosActivosPorNivel={gradosActivosPorNivel}
                labelAcademico={labelAcademico}
              />
            )}

            {/* ── TAB CONFIGURACION ACADEMICA ── */}
            {tab === "configuracion" && (
              <ConfiguracionTab
                academicoConfig={academicoConfig}
                saveAcademicoConfig={saveAcademicoConfig}
                updateSalonConfig={updateSalonConfig}
                addSalonConfig={addSalonConfig}
                deleteSalonConfig={deleteSalonConfig}
                gradosActivosPorNivel={gradosActivosPorNivel}
                seccionesActivasPorNivel={seccionesActivasPorNivel}
                labelAcademico={labelAcademico}
                cursosPrimariaActivos={cursosPrimariaActivos}
                cursosSecundariaActivos={cursosSecundariaActivos}
                token={token}
                runAdminAction={runAdminAction}
                setStatus={setStatus}
                setErrorMessage={setErrorMessage}
              />
            )}

            {/* ── TAB REPORTES ── */}
            {tab === "reportes" && (
              <ReportesTab
                usuariosAcademicos={usuariosAcademicos}
                institution={institution}
                token={token}
                academicoConfig={academicoConfig}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
