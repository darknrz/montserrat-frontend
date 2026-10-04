import { BookOpen, GraduationCap, School, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfigPanel, GradosConfigPanel, SalonesConfigPanel, AdminMetric, CompetenciasPanel } from "./adminComponents";
import { getSalones, useAcademicoRegistry } from "./academicoRegistry";
import { monserratApi } from "../../../api/monserrat";
import { useAnioActivo } from "../../../hooks/useAnioActivo";
import { MigracionAnioPanel } from "./MigracionAnioPanel";
import type { PeriodoBimestre } from "../../../types";
import {
  type AcademicoConfig,
  type ConfigView,
  type CatalogItem,
  type SalonItem,
  applyAcademicoConfigToRegistry,
} from "./adminShared";

type NivelKey = "inicial" | "primaria" | "secundaria";
const NIVEL_SECCIONES: { key: NivelKey; title: string }[] = [
  { key: "inicial", title: "Inicial" },
  { key: "primaria", title: "Primaria" },
  { key: "secundaria", title: "Secundaria" },
];
const CURSOS_KEY = { inicial: "cursosInicial", primaria: "cursosPrimaria", secundaria: "cursosSecundaria" } as const;
const COMPETENCIAS_KEY = { inicial: "competenciasInicial", primaria: "competenciasPrimaria", secundaria: "competenciasSecundaria" } as const;
const GRADOS_KEY = { inicial: "gradosInicial", primaria: "gradosPrimaria", secundaria: "gradosSecundaria" } as const;


type ConfiguracionTabProps = {
  academicoConfig: AcademicoConfig;
  saveAcademicoConfig: (next: AcademicoConfig) => void;
  updateSalonConfig: (target: SalonItem, patch: Partial<SalonItem>) => void;
  addSalonConfig: (nivel: string, grado: string, seccion: string, aula: string) => void;
  deleteSalonConfig: (target: SalonItem) => void;
  gradosActivosPorNivel: (nivel?: string) => string[];
  seccionesActivasPorNivel: (nivel?: string) => string[];
  labelAcademico: (id: string) => string;
  cursosPrimariaActivos: string[];
  cursosSecundariaActivos: string[];
  token: string;
  rol?: string;
  runAdminAction: (action: () => Promise<void>, successMessage: string) => void;
  setStatus: (status: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
};

export function ConfiguracionTab({
  academicoConfig,
  saveAcademicoConfig,
  token,
  rol,
  runAdminAction,
  setStatus,
  setErrorMessage,
}: ConfiguracionTabProps) {
  useAcademicoRegistry(); // refresca contadores y nombres cuando cambian grados o salones
  const [configView, setConfigView] = useState<ConfigView>("inicial-cursos");
  // Publica el cambio en el registro al instante y luego lo guarda en el servidor.
  const saveOrganizacion = (next: AcademicoConfig) => {
    applyAcademicoConfigToRegistry(next);
    saveAcademicoConfig(next);
  };
  const getCursos = (n: NivelKey): CatalogItem[] => academicoConfig[CURSOS_KEY[n]] ?? [];
  const getCompetencias = (n: NivelKey): CatalogItem[] => academicoConfig[COMPETENCIAS_KEY[n]] ?? [];
  const getGrados = (n: NivelKey): CatalogItem[] => academicoConfig[GRADOS_KEY[n]] ?? [];
  const vistaMatch = /^(inicial|primaria|secundaria)-(cursos|competencias|grados)$/.exec(configView);
  const vistaActual = vistaMatch
    ? { nivel: vistaMatch[1] as NivelKey, seccion: vistaMatch[2] as "cursos" | "competencias" | "grados" }
    : null;
  const anioActivoCfg = useAnioActivo(token);
  const [anioPeriodo, setAnioPeriodo] = useState<number>(anioActivoCfg);
  const [periodoRows, setPeriodoRows] = useState<PeriodoBimestre[]>(
    [1, 2, 3, 4].map((numeroBimestre) => ({
      id: undefined,
      anio: new Date().getFullYear(),
      numeroBimestre,
      fechaInicio: "",
      fechaFin: "",
    }))
  );
  useEffect(() => setAnioPeriodo(anioActivoCfg), [anioActivoCfg]);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [savingPeriodo, setSavingPeriodo] = useState<number | null>(null);

  const buildPeriodoRows = (anio: number, items: PeriodoBimestre[]) =>
    [1, 2, 3, 4].map((numeroBimestre) =>
      items.find((periodo) => periodo.numeroBimestre === numeroBimestre && periodo.anio === anio) ?? {
        id: undefined,
        anio,
        numeroBimestre,
        fechaInicio: "",
        fechaFin: "",
      }
    );

  useEffect(() => {
    if (!token) return;
    setLoadingPeriodos(true);
    setErrorMessage(null);
    monserratApi
      .listarPeriodosBimestres(anioPeriodo, token)
      .then((data) => setPeriodoRows(buildPeriodoRows(anioPeriodo, data)))
      .catch((error: unknown) => {
        setErrorMessage(
          error instanceof Error ? error.message : "No se pudieron cargar los periodos bimestrales"
        );
      })
      .finally(() => setLoadingPeriodos(false));
  }, [anioPeriodo, token, setErrorMessage]);

  const handleUpdatePeriodo = async (row: PeriodoBimestre) => {
    if (!row.fechaInicio || !row.fechaFin) {
      setErrorMessage("Cada bimestre requiere fecha de inicio y fin.");
      return;
    }
    if (row.fechaInicio > row.fechaFin) {
      setErrorMessage("La fecha de inicio debe ser anterior o igual a la fecha de fin.");
      return;
    }
    setSavingPeriodo(row.numeroBimestre);
    setErrorMessage(null);
    try {
      if (row.id) {
        await monserratApi.actualizarPeriodoBimestre(row.id, {
          anio: anioPeriodo,
          numeroBimestre: row.numeroBimestre,
          fechaInicio: row.fechaInicio,
          fechaFin: row.fechaFin,
        }, token);
      } else {
        await monserratApi.crearPeriodoBimestre({
          anio: anioPeriodo,
          numeroBimestre: row.numeroBimestre,
          fechaInicio: row.fechaInicio,
          fechaFin: row.fechaFin,
        }, token);
      }
      setStatus(`Bimestre ${row.numeroBimestre} guardado`);
      const refreshed = await monserratApi.listarPeriodosBimestres(anioPeriodo, token);
      setPeriodoRows(buildPeriodoRows(anioPeriodo, refreshed));
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar el periodo bimestral");
    } finally {
      setSavingPeriodo(null);
    }
  };

  const handleDeletePeriodo = async (row: PeriodoBimestre) => {
    if (!row.id) return;
    setSavingPeriodo(row.numeroBimestre);
    setErrorMessage(null);
    try {
      await monserratApi.eliminarPeriodoBimestre(row.id, token);
      setStatus(`Bimestre ${row.numeroBimestre} eliminado`);
      const refreshed = await monserratApi.listarPeriodosBimestres(anioPeriodo, token);
      setPeriodoRows(buildPeriodoRows(anioPeriodo, refreshed));
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo eliminar el periodo bimestral");
    } finally {
      setSavingPeriodo(null);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <AdminMetric
          icon={<BookOpen size={18} />}
          label="Áreas curriculares inicial"
          value={String((academicoConfig.cursosInicial ?? []).filter((c) => c.active).length)}
        />
        <AdminMetric
          icon={<School size={18} />}
          label="Áreas curriculares primaria"
          value={String(academicoConfig.cursosPrimaria.filter((c) => c.active).length)}
        />
        <AdminMetric
          icon={<GraduationCap size={18} />}
          label="Áreas curriculares secundaria"
          value={String(academicoConfig.cursosSecundaria.filter((c) => c.active).length)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="pro-card grid content-start gap-1.5 p-2 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          {NIVEL_SECCIONES.map((nivel) => (
            <div key={nivel.key} className="grid gap-1.5">
              <p className="px-2 pt-3 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40 first:pt-1">
                {nivel.title}
              </p>
              {[
                { id: `${nivel.key}-cursos` as ConfigView, icon: <BookOpen size={16} />, title: "Áreas curriculares", count: getCursos(nivel.key).length },
                { id: `${nivel.key}-competencias` as ConfigView, icon: <ShieldCheck size={16} />, title: "Competencias", count: getCompetencias(nivel.key).length },
                { id: `${nivel.key}-grados` as ConfigView, icon: <School size={16} />, title: "Grados", count: getGrados(nivel.key).length },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setConfigView(item.id)}
                  className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${
                    configView === item.id
                      ? "pro-nav-active"
                      : "text-monserrat-ink/58 hover:bg-[#f7efd9]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {item.icon}
                    <span className="truncate text-[13px] font-black">{item.title}</span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                      configView === item.id ? "bg-white" : "bg-[#f4ead2]"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          ))}
          <p className="px-2 pt-3 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">
            Ajustes generales
          </p>
          <button
            type="button"
            onClick={() => setConfigView("salones-institucion")}
            className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${
              configView === "salones-institucion"
                ? "pro-nav-active"
                : "text-monserrat-ink/58 hover:bg-[#f7efd9]"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Users size={16} />
              <span className="truncate text-[13px] font-black">Salones</span>
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                configView === "salones-institucion" ? "bg-white" : "bg-[#f4ead2]"
              }`}
            >
              {getSalones().length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setConfigView("periodos-bimestres")}
            className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${
              configView === "periodos-bimestres"
                ? "pro-nav-active"
                : "text-monserrat-ink/58 hover:bg-[#f7efd9]"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <BookOpen size={16} />
              <span className="truncate text-[13px] font-black">Períodos bimestrales</span>
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                configView === "periodos-bimestres" ? "bg-white" : "bg-[#f4ead2]"
              }`}
            >
              4
            </span>
          </button>
          {rol === "SUPER_ADMIN" && (
            <button
              type="button"
              onClick={() => setConfigView("migracion-anio")}
              className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${
                configView === "migracion-anio"
                  ? "pro-nav-active"
                  : "text-monserrat-ink/58 hover:bg-[#f7efd9]"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <GraduationCap size={16} />
                <span className="truncate text-[13px] font-black">Migrar año escolar</span>
              </span>
            </button>
          )}
        </div>

        <div className="min-w-0">
          {vistaActual && vistaActual.seccion === "cursos" && (
            <ConfigPanel
              title="Áreas curriculares"
              items={getCursos(vistaActual.nivel)}
              onChange={(items) => saveAcademicoConfig({ ...academicoConfig, [CURSOS_KEY[vistaActual.nivel]]: items })}
            />
          )}
          {vistaActual && vistaActual.seccion === "competencias" && (
            <CompetenciasPanel
              items={getCompetencias(vistaActual.nivel)}
              onChange={(items) => saveAcademicoConfig({ ...academicoConfig, [COMPETENCIAS_KEY[vistaActual.nivel]]: items })}
            />
          )}
          {vistaActual && vistaActual.seccion === "grados" && (
            <GradosConfigPanel
              title="Grados"
              items={getGrados(vistaActual.nivel)}
              onChange={(items) => saveOrganizacion({ ...academicoConfig, [GRADOS_KEY[vistaActual.nivel]]: items })}
            />
          )}
          {configView === "salones-institucion" && (
            <SalonesConfigPanel
              onChange={({ nivelesAcademicos, salonGrados }) =>
                saveOrganizacion({ ...academicoConfig, nivelesAcademicos, salonGrados })
              }
            />
          )}
          {configView === "migracion-anio" && rol === "SUPER_ADMIN" && (
            <MigracionAnioPanel token={token} setErrorMessage={setErrorMessage} />
          )}
          {configView === "periodos-bimestres" && (
            <div className="grid gap-5 pro-card pro-rise p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-serif text-lg font-black text-monserrat-ink">Períodos bimestrales</h3>
                  <p className="text-[12px] font-semibold text-monserrat-ink/40 mt-1">
                    Define las fechas de inicio y fin para cada bimestre del año académico.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
                  <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">
                    Año
                    <input
                      type="number"
                      min="2000"
                      max="2100"
                      value={anioPeriodo}
                      onChange={(e) => setAnioPeriodo(Number(e.target.value))}
                      className="admin-input"
                    />
                  </label>
                  <span className="inline-flex items-center rounded-[9px] bg-[#f4ead2] px-3 py-2 text-[12px] font-semibold text-monserrat-ink/70">
                    {loadingPeriodos ? "Cargando..." : "Datos actualizados"}
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                {periodoRows.map((row) => (
                  <div key={row.numeroBimestre} className="pro-panel p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Bimestre {row.numeroBimestre}</p>
                        <p className="mt-1 text-sm font-semibold text-monserrat-ink/80">
                          {row.id ? "Configurado" : "Nuevo bimestre"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdatePeriodo(row)}
                          disabled={savingPeriodo === row.numeroBimestre}
                          className="inline-flex items-center justify-center rounded-[9px] bg-monserrat-red px-4 py-2 text-[12px] font-black text-white transition hover:bg-monserrat-redDark disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        {row.id && (
                          <button
                            type="button"
                            onClick={() => handleDeletePeriodo(row)}
                            disabled={savingPeriodo === row.numeroBimestre}
                            className="inline-flex items-center justify-center rounded-[9px] border border-[#d8a842]/30 bg-white px-4 py-2 text-[12px] font-black text-monserrat-ink transition hover:bg-[#f7efd9] disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">
                        Fecha inicio
                        <input
                          type="date"
                          value={row.fechaInicio}
                          onChange={(e) => {
                            const next = periodoRows.map((item) =>
                              item.numeroBimestre === row.numeroBimestre
                                ? { ...item, fechaInicio: e.target.value }
                                : item
                            );
                            setPeriodoRows(next);
                          }}
                          className="admin-input"
                        />
                      </label>
                      <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">
                        Fecha fin
                        <input
                          type="date"
                          value={row.fechaFin}
                          onChange={(e) => {
                            const next = periodoRows.map((item) =>
                              item.numeroBimestre === row.numeroBimestre
                                ? { ...item, fechaFin: e.target.value }
                                : item
                            );
                            setPeriodoRows(next);
                          }}
                          className="admin-input"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
