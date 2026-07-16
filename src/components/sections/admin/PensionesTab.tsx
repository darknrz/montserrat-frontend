import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { PensionMensual, UsuarioAcademico } from "../../../types";
import { MESES_PENSION, labelFromEnum } from "./adminShared";

type PensionesTabProps = {
  usuariosAcademicos: UsuarioAcademico[];
  token: string;
  isBusy: boolean;
  runAdminAction: (action: () => Promise<void>, successMessage: string) => void;
  setErrorMessage: (msg: string | null) => void;
  gradosActivosPorNivel: (nivel?: string) => string[];
  labelAcademico: (id: string) => string;
};

export function PensionesTab({
  usuariosAcademicos,
  token,
  isBusy,
  runAdminAction,
  setErrorMessage,
  gradosActivosPorNivel,
  labelAcademico,
}: PensionesTabProps) {
  const [pensiones, setPensiones] = useState<PensionMensual[]>([]);
  const [pensionYear, setPensionYear] = useState(new Date().getFullYear());
  const [pensionSearch, setPensionSearch] = useState("");
  const [pensionNivelFiltro, setPensionNivelFiltro] = useState("");
  const [pensionGradoFiltro, setPensionGradoFiltro] = useState("");
  const [pensionEstadoFiltro, setPensionEstadoFiltro] = useState<"all" | "paid" | "pend">("all");
  const [pensionPagina, setPensionPagina] = useState(1);

  const alumnos = useMemo(
    () => usuariosAcademicos.filter((u) => u.rol === "ALUMNO"),
    [usuariosAcademicos]
  );

  // Identificador único y estable por alumno para usar como key de React.
  // `alumno.dni` por sí solo puede venir vacío o repetido (alumnos sin DNI
  // registrado aún), lo que provocaba que React reciclara mal las filas.
  const alumnoKeyOf = (alumno: UsuarioAcademico) => {
    const dni = alumno.dni?.trim();
    const codigo = alumno.codigo?.trim();
    if (dni) return `dni-${dni}`;
    if (codigo) return `cod-${codigo}`;
    return `nom-${alumno.nombre}`;
  };

  const CURRENT_YEAR = new Date().getFullYear();
  const START_YEAR = 2021;
  const endYear = Math.max(CURRENT_YEAR, START_YEAR);
  const YEARS = Array.from({ length: endYear - START_YEAR + 1 }, (_, i) => String(endYear - i));

  useEffect(() => {
    if (!token) return;
    monserratApi
      .pensionesAcademicas(pensionYear, token)
      .then(setPensiones)
      .catch((error: unknown) =>
        setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar pensiones")
      );
  }, [pensionYear, token, setErrorMessage]);

  const alumnosConPensiones = useMemo(() => {
    const term = pensionSearch.trim().toLowerCase();
    const pagosDelAnio = pensiones.filter((p) => p.anio === pensionYear);

    return alumnos
      .filter((alumno) => {
        if (
          term &&
          ![
            alumno.codigo,
            alumno.dni,
            alumno.nombre,
            alumno.nivelEducativo,
            alumno.grado,
            alumno.seccion,
          ]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(term))
        ) {
          return false;
        }

        if (pensionNivelFiltro && alumno.nivelEducativo !== pensionNivelFiltro) {
          return false;
        }

        if (pensionGradoFiltro && alumno.grado !== pensionGradoFiltro) {
          return false;
        }

        return true;
      })
      .map((alumno) => {
        const meses = Object.fromEntries(
          Array.from({ length: 12 }, (_, i) => {
            const mes = i + 1;
            return [
              mes,
              pagosDelAnio.find((p) => p.alumnoDni === alumno.dni && p.mes === mes),
            ];
          })
        ) as Record<number, PensionMensual | undefined>;

        return { alumno, meses };
      });
  }, [alumnos, pensionSearch, pensionYear, pensiones, pensionNivelFiltro, pensionGradoFiltro]);

  const actualizarPensionMensual = async (pension: PensionMensual, pagada: boolean) => {
    try {
      const saved = await monserratApi.updatePensionAcademica(
        {
          alumnoDni: pension.alumnoDni,
          anio: pensionYear,
          mes: pension.mes,
          pagada,
          observacion: pension.observacion ?? "",
        },
        token
      );
      setPensiones((current) =>
        current.map((item) =>
          item.alumnoDni === saved.alumnoDni && item.anio === saved.anio && item.mes === saved.mes
            ? saved
            : item
        )
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No se pudo actualizar la pensión"
      );
    }
  };

  const exportarPensionesExcel = async () => {
    const XLSX = await import("xlsx");
    const rows = alumnosConPensiones.map(({ alumno, meses }) => {
      const mesesActivos = MESES_PENSION.map((_, index) => meses[index + 1]).filter((m) => m?.activa !== false);
      return {
        codigo: alumno.codigo ?? "",
        dni: alumno.dni,
        alumno: alumno.nombre,
        nivel: labelFromEnum(alumno.nivelEducativo ?? ""),
        grado: labelFromEnum(alumno.grado ?? ""),
        seccion: alumno.seccion ?? "",
        ...Object.fromEntries(
          MESES_PENSION.map((mes, index) => [
            mes,
            meses[index + 1]?.activa === false ? "NO APLICA" : meses[index + 1]?.pagada ? "PAGADO" : "PENDIENTE",
          ])
        ),
        pagados: mesesActivos.filter((m) => m?.pagada).length,
        pendientes: mesesActivos.filter((m) => !m?.pagada).length,
      };
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), `Pensiones ${pensionYear}`);
    XLSX.writeFile(workbook, `pensiones_monserrat_${pensionYear}.xlsx`);
  };

  const filtradosFinal = alumnosConPensiones.filter(({ meses }) => {
    const mesesActivos = Object.values(meses).filter((m) => m?.activa !== false);
    if (pensionEstadoFiltro === "all") return true;
    const pagados = mesesActivos.filter((m) => m?.pagada).length;
    if (pensionEstadoFiltro === "paid") return mesesActivos.length > 0 && pagados === mesesActivos.length;
    return mesesActivos.some((m) => !m?.pagada);
  });

  const totalPagos = filtradosFinal.reduce(
    (acc, { meses }) => acc + Object.values(meses).filter((m) => m?.activa !== false && m?.pagada).length,
    0
  );
  const totalPend = filtradosFinal.reduce(
    (acc, { meses }) => acc + Object.values(meses).filter((m) => m?.activa !== false && !m?.pagada).length,
    0
  );
  const PENSION_POR_PAGINA = 10;
  const totalPaginas = Math.max(1, Math.ceil(filtradosFinal.length / PENSION_POR_PAGINA));
  const currentPage = Math.min(pensionPagina, totalPaginas);
  const alumnosPagina = filtradosFinal.slice(
    (currentPage - 1) * PENSION_POR_PAGINA,
    currentPage * PENSION_POR_PAGINA
  );

  useEffect(() => {
    if (pensionPagina > totalPaginas) {
      setPensionPagina(totalPaginas);
    }
  }, [pensionPagina, totalPaginas]);

  const totalActivos = filtradosFinal.reduce(
    (acc, { meses }) => acc + Object.values(meses).filter((m) => m?.activa !== false).length,
    0
  );
  const cumplimiento = totalActivos === 0 ? 0 : Math.round((totalPagos / totalActivos) * 100);

  // Cobranza acumulada por mes, sobre el conjunto ya filtrado (no paginado),
  // para alimentar el mini gráfico de barras del panel superior.
  const tendenciaMensual = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      let pagados = 0;
      let activos = 0;
      filtradosFinal.forEach(({ meses }) => {
        const registro = meses[mes];
        if (registro?.activa !== false) {
          activos += 1;
          if (registro?.pagada) pagados += 1;
        }
      });
      return { mes, pct: activos === 0 ? 0 : Math.round((pagados / activos) * 100) };
    });
  }, [filtradosFinal]);

  const anilloColor = cumplimiento >= 80 ? "#10b981" : cumplimiento >= 50 ? "#f59e0b" : "#ef4444";
  const RADIO = 30;
  const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

  const gradosDelNivel = pensionNivelFiltro ? gradosActivosPorNivel(pensionNivelFiltro) : [];

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Panel superior: anillo de cumplimiento + tendencia mensual */}
      <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-4 rounded-[14px] border border-monserrat-ink/8 bg-white px-5 py-4 shadow-sm">
          <svg viewBox="0 0 72 72" width="64" height="64" className="shrink-0">
            <circle cx="36" cy="36" r={RADIO} fill="none" stroke="#1c1a1710" strokeWidth="7" />
            <circle
              cx="36"
              cy="36"
              r={RADIO}
              fill="none"
              stroke={anilloColor}
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={`${(cumplimiento / 100) * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
              transform="rotate(-90 36 36)"
            />
            <text x="36" y="41" textAnchor="middle" fontSize="15" fontWeight="900" fill="#1c1a17">
              {cumplimiento}%
            </text>
          </svg>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">
              Cumplimiento {pensionYear}
            </p>
            <p className="text-[13px] font-black text-monserrat-ink">
              {totalPagos} pagadas · {totalPend} pendientes
            </p>
            <p className="text-[11px] font-semibold text-monserrat-ink/40">
              {filtradosFinal.length} alumno{filtradosFinal.length === 1 ? "" : "s"} en vista
            </p>
          </div>
        </div>

        <div className="rounded-[14px] border border-monserrat-ink/8 bg-white px-5 py-4 shadow-sm">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">
            Cobranza por mes
          </p>
          <div className="flex h-14 items-end gap-1.5">
            {tendenciaMensual.map((t) => (
              <div key={t.mes} className="flex flex-1 flex-col items-center gap-1" title={`${MESES_PENSION[t.mes - 1]}: ${t.pct}% cobrado`}>
                <div className="relative h-11 w-full overflow-hidden rounded-t-[4px] bg-monserrat-ink/6">
                  <div
                    className="absolute bottom-0 w-full rounded-t-[4px] bg-emerald-500"
                    style={{ height: `${t.pct}%` }}
                  />
                </div>
                <span className="text-[9px] font-black text-monserrat-ink/35">{MESES_PENSION[t.mes - 1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-[14px] border border-monserrat-ink/8 bg-white p-3 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px_auto]">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-monserrat-ink/30"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={pensionSearch}
              onChange={(e) => {
                setPensionSearch(e.target.value);
                setPensionPagina(1);
              }}
              placeholder="Nombre, DNI o código"
              className="admin-input pl-8"
            />
          </div>

          <select
            value={pensionNivelFiltro}
            onChange={(e) => {
              setPensionNivelFiltro(e.target.value);
              setPensionGradoFiltro("");
              setPensionPagina(1);
            }}
            className="admin-input"
          >
            <option value="">Todos los niveles</option>
            <option value="PRIMARIA">Primaria</option>
            <option value="SECUNDARIA">Secundaria</option>
          </select>

          <select
            value={pensionGradoFiltro}
            onChange={(e) => {
              setPensionGradoFiltro(e.target.value);
              setPensionPagina(1);
            }}
            className="admin-input"
            disabled={!pensionNivelFiltro}
          >
            <option value="">Todos los grados</option>
            {gradosDelNivel.map((g) => (
              <option key={g} value={g}>
                {labelAcademico(g)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setPensionSearch("");
              setPensionNivelFiltro("");
              setPensionGradoFiltro("");
              setPensionEstadoFiltro("all");
              setPensionPagina(1);
            }}
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-monserrat-ink/12 px-3 py-2 text-[12px] font-black text-monserrat-ink/50 hover:bg-monserrat-cream/40"
          >
            ↺ Limpiar
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {(["all", "paid", "pend"] as const).map((s) => {
            const labels = { all: "Todos", paid: "✓ Al día", pend: "⏳ Con pendientes" };
            const active = pensionEstadoFiltro === s;
            const cls = active
              ? s === "all"
                ? "bg-monserrat-ink text-white border-monserrat-ink/20"
                : s === "paid"
                  ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                  : "bg-amber-100 text-amber-700 border-amber-300"
              : "bg-transparent text-monserrat-ink/40 border-monserrat-ink/10 hover:bg-monserrat-cream/40";
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setPensionEstadoFiltro(s);
                  setPensionPagina(1);
                }}
                className={`rounded-full border px-3 py-1 text-[12px] font-black transition-all ${cls}`}
              >
                {labels[s]}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[12px] text-monserrat-ink/40">Año</span>
            <select
              value={pensionYear}
              onChange={(e) => {
                setPensionYear(Number(e.target.value));
                setPensionPagina(1);
              }}
              className="admin-input h-8 py-0 text-[12px]"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void exportarPensionesExcel()}
              className="inline-flex items-center gap-1.5 rounded-[10px] bg-monserrat-ink px-3 py-1.5 text-[11px] font-black text-white hover:bg-monserrat-ink/85"
            >
              <Download size={13} /> Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Tabla tipo hoja de cálculo */}
      {filtradosFinal.length === 0 ? (
        <div className="rounded-[12px] border border-monserrat-ink/8 bg-white py-12 text-center">
          <p className="text-[13px] font-semibold text-monserrat-ink/30">Sin alumnos con esos filtros</p>
          <button
            type="button"
            onClick={() => {
              setPensionSearch("");
              setPensionNivelFiltro("");
              setPensionGradoFiltro("");
              setPensionEstadoFiltro("all");
            }}
            className="mt-2 text-[12px] font-black text-monserrat-ink/40 underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-monserrat-ink/8 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-4 border-b border-monserrat-ink/6 px-4 py-2">
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-monserrat-ink/40">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-emerald-500" /> Pagado
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-monserrat-ink/40">
              <span className="h-2.5 w-2.5 rounded-[3px] border border-monserrat-ink/20 bg-monserrat-cream/60" /> Pendiente
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-monserrat-ink/40">
              <span className="h-2.5 w-2.5 rounded-[3px] bg-monserrat-ink/8" /> No aplica
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-monserrat-ink/40">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Con nota
            </span>
            <span className="ml-auto hidden text-[10px] font-semibold text-monserrat-ink/30 sm:inline">
              Clic en un mes para cambiar su estado
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[720px] border-collapse text-[12px]">
              <thead>
                <tr className="sticky top-0 z-10 bg-white">
                  <th className="sticky left-0 z-20 min-w-[210px] bg-white px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40 shadow-[1px_0_0_rgba(28,26,23,0.06)]">
                    Alumno
                  </th>
                  {MESES_PENSION.map((m) => (
                    <th
                      key={m}
                      className="w-[42px] px-1 py-2.5 text-center text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40"
                    >
                      {m}
                    </th>
                  ))}
                  <th className="min-w-[64px] px-3 py-2.5 text-center text-[10px] font-black uppercase tracking-wide text-monserrat-ink/40">
                    Estado
                  </th>
                </tr>
                <tr>
                  <th
                    colSpan={14}
                    className="h-px bg-monserrat-ink/8 p-0 sticky top-[33px] z-10"
                  />
                </tr>
              </thead>
              <tbody>
                {alumnosPagina.map(({ alumno, meses }) => {
                  const alumnoKey = alumnoKeyOf(alumno);
                  const mesesActivos = Object.values(meses).filter((m) => m?.activa !== false);
                  const pagados = mesesActivos.filter((m) => m?.pagada).length;
                  const totalAct = mesesActivos.length || 1;
                  const initials = alumno.nombre
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase();

                  return (
                    <tr key={alumnoKey} className="group border-t border-monserrat-ink/6">
                      <td className="sticky left-0 z-10 bg-white px-4 py-2 shadow-[1px_0_0_rgba(28,26,23,0.06)] group-hover:bg-monserrat-cream/25">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-monserrat-ink/8 text-[10px] font-black text-monserrat-ink/55">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[12px] font-black text-monserrat-ink">{alumno.nombre}</p>
                            <p className="truncate text-[10px] font-semibold text-monserrat-ink/40">
                              {labelAcademico(alumno.grado ?? "")}
                              {alumno.seccion ? ` · ${alumno.seccion}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {Array.from({ length: 12 }, (_, i) => {
                        const mes = i + 1;
                        const registro = meses[mes];
                        const activa = registro?.activa !== false;
                        const pagada = Boolean(registro?.pagada);
                        const tieneObs = Boolean(registro?.observacion);
                        const pensionBase: PensionMensual = registro ?? {
                          alumnoDni: alumno.dni,
                          alumnoCodigo: alumno.codigo,
                          alumnoNombre: alumno.nombre,
                          nivelEducativo: alumno.nivelEducativo,
                          grado: alumno.grado,
                          seccion: alumno.seccion,
                          anio: pensionYear,
                          mes,
                          pagada: false,
                          activa: true,
                        };
                        const tooltip = !activa
                          ? "Mes no aplicable"
                          : registro?.observacion
                            ? registro.observacion
                            : pagada
                              ? "Pagado — clic para marcar pendiente"
                              : "Pendiente — clic para marcar pagado";

                        return (
                          <td key={mes} className="px-1 py-2 text-center group-hover:bg-monserrat-cream/25">
                            <button
                              type="button"
                              disabled={!activa}
                              title={tooltip}
                              onClick={() => actualizarPensionMensual(pensionBase, !pagada)}
                              className={`relative mx-auto flex h-6 w-6 items-center justify-center rounded-[6px] border text-[11px] font-black ${
                                !activa
                                  ? "cursor-default border-transparent bg-monserrat-ink/6 text-monserrat-ink/20"
                                  : pagada
                                    ? "border-emerald-400 bg-emerald-500 text-white hover:bg-emerald-600"
                                    : "border-monserrat-ink/15 bg-monserrat-cream/50 text-transparent hover:border-monserrat-ink/30 hover:bg-monserrat-cream"
                              }`}
                            >
                              {activa && pagada ? "✓" : ""}
                              {tieneObs && (
                                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                              )}
                            </button>
                          </td>
                        );
                      })}

                      <td className="px-3 py-2 text-center group-hover:bg-monserrat-cream/25">
                        <span
                          className={`inline-flex min-w-[40px] items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-black ${
                            pagados === totalAct
                              ? "bg-emerald-100 text-emerald-700"
                              : pagados === 0
                                ? "bg-red-100 text-red-600"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {pagados}/{totalAct}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtradosFinal.length > 0 && (
        <div className="flex items-center justify-between rounded-[12px] border border-monserrat-ink/8 bg-white px-4 py-3">
          <p className="text-[12px] font-semibold text-monserrat-ink/45">
            <span className="font-black text-monserrat-ink">
              {(currentPage - 1) * 10 + 1}–{Math.min(currentPage * 10, filtradosFinal.length)}
            </span>{" "}
            de <span className="font-black text-monserrat-ink">{filtradosFinal.length}</span> alumnos
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPensionPagina((p) => p - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-monserrat-ink/10 text-monserrat-ink/50 transition hover:border-monserrat-ink/25 hover:text-monserrat-ink disabled:opacity-30"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - currentPage) <= 1)
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, idx) =>
                p === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-[12px] text-monserrat-ink/30">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPensionPagina(p as number)}
                    className={`h-8 min-w-[32px] rounded-[8px] px-2 text-[12px] font-black transition ${
                      currentPage === p
                        ? "bg-monserrat-ink text-white"
                        : "border border-monserrat-ink/10 text-monserrat-ink/50 hover:border-monserrat-ink/25 hover:text-monserrat-ink"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

            <button
              type="button"
              disabled={currentPage === totalPaginas}
              onClick={() => setPensionPagina((p) => Math.min(totalPaginas, p + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-monserrat-ink/10 text-monserrat-ink/50 transition hover:border-monserrat-ink/25 hover:text-monserrat-ink disabled:opacity-30"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}