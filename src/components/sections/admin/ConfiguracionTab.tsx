import { BookOpen, GraduationCap, School, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { ConfigPanel, SalonConfigPanel, AdminMetric, CompetenciasPanel } from "./adminComponents";
import { monserratApi } from "../../../api/monserrat";
import type { PeriodoBimestre } from "../../../types";
import {
  type AcademicoConfig,
  type ConfigView,
  type SalonItem,
} from "./adminShared";


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
  runAdminAction: (action: () => Promise<void>, successMessage: string) => void;
  setStatus: (status: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
};

export function ConfiguracionTab({
  academicoConfig,
  saveAcademicoConfig,
  updateSalonConfig,
  addSalonConfig,
  deleteSalonConfig,
  gradosActivosPorNivel,
  seccionesActivasPorNivel,
  labelAcademico,
  cursosPrimariaActivos,
  cursosSecundariaActivos,
  token,
  runAdminAction,
  setStatus,
  setErrorMessage,
}: ConfiguracionTabProps) {
  const [configView, setConfigView] = useState<ConfigView>("primaria-cursos");
  const [anioPeriodo, setAnioPeriodo] = useState<number>(new Date().getFullYear());
  const [periodoRows, setPeriodoRows] = useState<PeriodoBimestre[]>(
    [1, 2, 3, 4].map((numeroBimestre) => ({
      id: undefined,
      anio: new Date().getFullYear(),
      numeroBimestre,
      fechaInicio: "",
      fechaFin: "",
    }))
  );
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
    <div className="flex-1 flex flex-col min-h-0 gap-5">
      <div className="grid gap-3 md:grid-cols-4">
        <AdminMetric
          icon={<BookOpen size={18} />}
          label="Áreas curriculares"
          value={String(cursosPrimariaActivos.length)}
        />
        <AdminMetric
          icon={<School size={18} />}
          label="Grados primaria"
          value={String(gradosActivosPorNivel("PRIMARIA").length)}
        />
        <AdminMetric
          icon={<GraduationCap size={18} />}
          label="Cursos secundaria"
          value={String(cursosSecundariaActivos.length)}
        />
        <AdminMetric
          icon={<Users size={18} />}
          label="Grados secundaria"
          value={String(gradosActivosPorNivel("SECUNDARIA").length)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_1fr] flex-1 min-h-0">
        <div className="grid content-start gap-2 rounded-[16px] border border-monserrat-ink/8 bg-white p-3 shadow-sm">
          <p className="px-2 pt-1 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">
            Primaria
          </p>
          {[
            {
              id: "primaria-cursos" as const,
              icon: <BookOpen size={16} />,
              title: "Áreas curriculares",
              count: academicoConfig.cursosPrimaria.length,
            },
            {
              id: "primaria-competencias" as const,
              icon: <ShieldCheck size={16} />,
              title: "Competencias",
              count: academicoConfig.competenciasPrimaria.length,
            },
            {
              id: "primaria-grados" as const,
              icon: <School size={16} />,
              title: "Grados",
              count: academicoConfig.gradosPrimaria.length,
            },
            {
              id: "primaria-secciones" as const,
              icon: <Users size={16} />,
              title: "Secciones",
              count: academicoConfig.seccionesPrimaria.length,
            },
            {
              id: "primaria-salones" as const,
              icon: <ShieldCheck size={16} />,
              title: "Salones",
              count: academicoConfig.salones.filter((salon) => salon.nivel === "PRIMARIA").length,
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setConfigView(item.id)}
              className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${
                configView === item.id
                  ? "bg-monserrat-red text-white"
                  : "bg-monserrat-cream/45 text-monserrat-ink/65 hover:bg-monserrat-cream"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                {item.icon}
                <span className="truncate text-[13px] font-black">{item.title}</span>
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  configView === item.id ? "bg-white/18" : "bg-white"
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
          <p className="px-2 pt-3 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">
            Secundaria
          </p>
          {[
            {
              id: "secundaria-cursos" as const,
              icon: <BookOpen size={16} />,
              title: "Cursos",
              count: academicoConfig.cursosSecundaria.length,
            },
            {
              id: "secundaria-competencias" as const,
              icon: <ShieldCheck size={16} />,
              title: "Competencias",
              count: academicoConfig.competenciasSecundaria.length,
            },
            {
              id: "secundaria-grados" as const,
              icon: <GraduationCap size={16} />,
              title: "Grados",
              count: academicoConfig.gradosSecundaria.length,
            },
            {
              id: "secundaria-secciones" as const,
              icon: <Users size={16} />,
              title: "Secciones",
              count: academicoConfig.seccionesSecundaria.length,
            },
            {
              id: "secundaria-salones" as const,
              icon: <ShieldCheck size={16} />,
              title: "Salones",
              count: academicoConfig.salones.filter((salon) => salon.nivel === "SECUNDARIA").length,
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setConfigView(item.id)}
              className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${
                configView === item.id
                  ? "bg-monserrat-red text-white"
                  : "bg-monserrat-cream/45 text-monserrat-ink/65 hover:bg-monserrat-cream"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                {item.icon}
                <span className="truncate text-[13px] font-black">{item.title}</span>
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  configView === item.id ? "bg-white/18" : "bg-white"
                }`}
              >
                {item.count}
              </span>
            </button>
          ))}
          <p className="px-2 pt-3 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">
            Ajustes generales
          </p>
          <button
            type="button"
            onClick={() => setConfigView("ajustes-generales" as any)}
            className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${
              (configView as string) === "ajustes-generales"
                ? "bg-monserrat-red text-white"
                : "bg-monserrat-cream/45 text-monserrat-ink/65 hover:bg-monserrat-cream"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <ShieldCheck size={16} />
              <span className="truncate text-[13px] font-black">Asistencia mínima</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setConfigView("niveles-academicos" as any)}
            className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${
              (configView as string) === "niveles-academicos"
                ? "bg-monserrat-red text-white"
                : "bg-monserrat-cream/45 text-monserrat-ink/65 hover:bg-monserrat-cream"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <GraduationCap size={16} />
              <span className="truncate text-[13px] font-black">Niveles académicos</span>
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                (configView as string) === "niveles-academicos" ? "bg-white/18" : "bg-white"
              }`}
            >
              {academicoConfig.nivelesAcademicos?.length ?? 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setConfigView("periodos-bimestres" as any)}
            className={`flex items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${
              configView === "periodos-bimestres"
                ? "bg-monserrat-red text-white"
                : "bg-monserrat-cream/45 text-monserrat-ink/65 hover:bg-monserrat-cream"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <BookOpen size={16} />
              <span className="truncate text-[13px] font-black">Períodos bimestrales</span>
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                configView === "periodos-bimestres" ? "bg-white/18" : "bg-white"
              }`}
            >
              4
            </span>
          </button>
        </div>

        <div className="min-w-0 flex-1 flex flex-col overflow-y-auto pr-1">
          {configView === "primaria-cursos" && (
            <ConfigPanel
              title="Áreas curriculares"
              items={academicoConfig.cursosPrimaria}
              onChange={(items) => saveAcademicoConfig({ ...academicoConfig, cursosPrimaria: items })}
            />
          )}
          {configView === "primaria-competencias" && (
  <CompetenciasPanel
    items={academicoConfig.competenciasPrimaria}
    onChange={(items) => saveAcademicoConfig({ ...academicoConfig, competenciasPrimaria: items })}
  />
)}
          {configView === "primaria-secciones" && (
            <ConfigPanel
              title="Secciones de primaria"
              items={academicoConfig.seccionesPrimaria}
              onChange={(items) =>
                saveAcademicoConfig({ ...academicoConfig, seccionesPrimaria: items })
              }
            />
          )}
          {configView === "primaria-grados" && (
            <ConfigPanel
              title="Grados de primaria"
              items={academicoConfig.gradosPrimaria}
              onChange={(items) => saveAcademicoConfig({ ...academicoConfig, gradosPrimaria: items })}
            />
          )}
          {configView === "secundaria-cursos" && (
            <ConfigPanel
              title="Cursos de secundaria"
              items={academicoConfig.cursosSecundaria}
              onChange={(items) =>
                saveAcademicoConfig({ ...academicoConfig, cursosSecundaria: items })
              }
            />
          )}
          {configView === "secundaria-competencias" && (
            <CompetenciasPanel
              items={academicoConfig.competenciasSecundaria}
              onChange={(items) => saveAcademicoConfig({ ...academicoConfig, competenciasSecundaria: items })}
            />
          )}
          {configView === "secundaria-secciones" && (
            <ConfigPanel
              title="Secciones de secundaria"
              items={academicoConfig.seccionesSecundaria}
              onChange={(items) =>
                saveAcademicoConfig({ ...academicoConfig, seccionesSecundaria: items })
              }
            />
          )}
          {configView === "secundaria-grados" && (
            <ConfigPanel
              title="Grados de secundaria"
              items={academicoConfig.gradosSecundaria}
              onChange={(items) =>
                saveAcademicoConfig({ ...academicoConfig, gradosSecundaria: items })
              }
            />
          )}
          {(configView === "primaria-salones" || configView === "secundaria-salones") && (
            <SalonConfigPanel
              nivel={configView === "secundaria-salones" ? "SECUNDARIA" : "PRIMARIA"}
              salones={academicoConfig.salones.filter(
                (salon) =>
                  salon.nivel === (configView === "secundaria-salones" ? "SECUNDARIA" : "PRIMARIA")
              )}
              addSalon={(grado, seccion, aula) =>
                addSalonConfig(
                  configView === "secundaria-salones" ? "SECUNDARIA" : "PRIMARIA",
                  grado,
                  seccion,
                  aula
                )
              }
              updateSalon={updateSalonConfig}
              deleteSalon={deleteSalonConfig}
              gradosActivosPorNivel={gradosActivosPorNivel}
              seccionesActivas={seccionesActivasPorNivel(
                configView === "secundaria-salones" ? "SECUNDARIA" : "PRIMARIA"
              )}
              labelAcademico={labelAcademico}
            />
          )}
          {configView === "periodos-bimestres" && (
            <div className="rounded-[16px] border border-monserrat-ink/8 bg-white p-5 shadow-sm grid gap-5">
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
                  <span className="inline-flex items-center rounded-[10px] bg-monserrat-cream/15 px-3 py-2 text-[12px] font-semibold text-monserrat-ink/70">
                    {loadingPeriodos ? "Cargando..." : "Datos actualizados"}
                  </span>
                </div>
              </div>

              <div className="grid gap-4">
                {periodoRows.map((row) => (
                  <div key={row.numeroBimestre} className="rounded-[14px] border border-monserrat-ink/10 p-4 bg-monserrat-cream/10">
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
                          className="inline-flex items-center justify-center rounded-[10px] bg-monserrat-red px-4 py-2 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-50"
                        >
                          Guardar
                        </button>
                        {row.id && (
                          <button
                            type="button"
                            onClick={() => handleDeletePeriodo(row)}
                            disabled={savingPeriodo === row.numeroBimestre}
                            className="inline-flex items-center justify-center rounded-[10px] border border-monserrat-ink/10 bg-white px-4 py-2 text-[12px] font-black text-monserrat-ink transition hover:bg-monserrat-cream disabled:opacity-50"
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
          {configView === ("ajustes-generales" as any) && (
            <div className="rounded-[16px] border border-monserrat-ink/8 bg-white p-5 shadow-sm grid gap-4 max-w-md">
              <div>
                <h3 className="font-serif text-lg font-black text-monserrat-ink">Configuración de asistencias</h3>
                <p className="text-[12px] font-semibold text-monserrat-ink/40 mt-1">
                  Establece el límite mínimo de asistencia requerido para evitar la inhabilitación del estudiante.
                </p>
              </div>

              <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">
                Porcentaje mínimo requerido (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={academicoConfig.minAsistenciaPorcentaje ?? 70}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(0, Number(e.target.value)));
                    saveAcademicoConfig({ ...academicoConfig, minAsistenciaPorcentaje: val });
                  }}
                  className="admin-input"
                />
              </label>

              <label className="grid gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">
                Modelo de Ingresantes
                <select
                  value={academicoConfig.ingresantesModelo ?? "card-grid"}
                  onChange={(e) => saveAcademicoConfig({ ...academicoConfig, ingresantesModelo: e.target.value })}
                  className="admin-input"
                >
                  <option value="card-grid">Tabla (grid)</option>
                  <option value="card-featured">Tarjetas destacadas</option>
                </select>
              </label>
              <div className="rounded-[12px] bg-monserrat-cream/15 p-3.5 border border-monserrat-ink/6 text-[11px] font-semibold text-monserrat-ink/50 leading-relaxed">
                Este porcentaje se utilizará en el portal de los alumnos para mostrar alertas sobre su asistencia general.
              </div>
            </div>
          )}
          {configView === ("niveles-academicos" as any) && (
            <ConfigPanel
              title="Niveles académicos"
              items={academicoConfig.nivelesAcademicos ?? []}
              onChange={(items) =>
                saveAcademicoConfig({ ...academicoConfig, nivelesAcademicos: items })
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
