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
  const [pensionExpandido, setPensionExpandido] = useState<Record<string, boolean>>({});
  const [pensionPagina, setPensionPagina] = useState(1);

  const alumnos = useMemo(
    () => usuariosAcademicos.filter((u) => u.rol === "ALUMNO"),
    [usuariosAcademicos]
  );

  const YEARS = ["2025", "2024", "2023", "2022", "2021"];

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

  const actualizarPensionMensual = (pension: PensionMensual, pagada: boolean) => {
    runAdminAction(async () => {
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
    }, pagada ? "Pension marcada como pagada" : "Pension marcada como pendiente");
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
  const alumnosPagina = filtradosFinal.slice(
    (pensionPagina - 1) * PENSION_POR_PAGINA,
    pensionPagina * PENSION_POR_PAGINA
  );
  const totalActivos = filtradosFinal.reduce(
    (acc, { meses }) => acc + Object.values(meses).filter((m) => m?.activa !== false).length,
    0
  );
  const cumplimiento = totalActivos === 0 ? 0 : Math.round((totalPagos / totalActivos) * 100);

  const gradosDelNivel = pensionNivelFiltro ? gradosActivosPorNivel(pensionNivelFiltro) : [];

  return (
    <div className="grid gap-4 flex-1 min-h-0 flex flex-col">

      {/* Filtros */}
      <div className="rounded-[14px] border border-monserrat-ink/8 bg-white p-3 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[1fr_150px_150px_auto]">
          {/* Buscador */}
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

          {/* Nivel */}
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

          {/* Grado — solo activo cuando hay nivel */}
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

          {/* Reset */}
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

        {/* Fila inferior: tabs estado + año + exportar */}
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
                onClick={() => setPensionEstadoFiltro(s)}
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
              onChange={(e) => setPensionYear(Number(e.target.value))}
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

      {/* Lista de alumnos como cards expandibles */}
      <div className="grid gap-2 flex-1 min-h-0 overflow-y-auto pr-1">
        {filtradosFinal.length === 0 ? (
          <div className="rounded-[12px] border border-monserrat-ink/8 bg-white py-12 text-center">
            <p className="text-[13px] font-semibold text-monserrat-ink/30">
              Sin alumnos con esos filtros
            </p>
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
          alumnosPagina.map(({ alumno, meses }) => {
            const mesesActivos = Object.values(meses).filter((m) => m?.activa !== false);
            const pagados = mesesActivos.filter((m) => m?.pagada).length;
            const totalActivos = mesesActivos.length || 1;
            const pct = Math.round((pagados / totalActivos) * 100);
            const isOpen = Boolean(pensionExpandido[alumno.dni]);
            const initials = alumno.nombre
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase();

            return (
              <div
                key={alumno.dni}
                className="overflow-hidden rounded-[12px] border border-monserrat-ink/8 bg-white"
              >
                {/* Cabecera clickeable */}
                <button
                  type="button"
                  onClick={() =>
                    setPensionExpandido((prev) => ({ ...prev, [alumno.dni]: !prev[alumno.dni] }))
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-monserrat-cream/30"
                >
                  {/* Avatar */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-monserrat-ink/8 text-[12px] font-black text-monserrat-ink/55">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-black text-monserrat-ink">
                      {alumno.nombre}
                    </p>
                    <p className="text-[11px] font-semibold text-monserrat-ink/40">
                      {labelAcademico(alumno.grado ?? "")}
                      {alumno.seccion ? ` · Sec. ${alumno.seccion}` : ""}
                      {" · "}
                      {alumno.codigo ?? alumno.dni}
                    </p>
                  </div>

                  {/* Badge + barra de progreso */}
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-black ${pagados === totalActivos
                        ? "bg-emerald-100 text-emerald-700"
                        : pagados === 0
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-700"
                        }`}
                    >
                      {pagados}/{totalActivos}
                    </span>
                    <div className="h-[5px] w-14 overflow-hidden rounded-full bg-monserrat-ink/10">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`shrink-0 text-monserrat-ink/30 transition-transform ${isOpen ? "rotate-180" : ""
                      }`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {/* Grilla de 12 meses */}
                {isOpen && (
                  <div className="border-t border-monserrat-ink/6 p-3">
                    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
                      {Array.from({ length: 12 }, (_, i) => {
                        const mes = i + 1;
                        const registro = meses[mes];
                        const activa = registro?.activa !== false;
                        const pagada = Boolean(registro?.pagada);
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
                        return (
                          <button
                            key={mes}
                            type="button"
                            disabled={!activa}
                            title={!activa ? "Mes no aplicable" : pagada ? "Marcar como pendiente" : "Marcar como pagado"}
                            onClick={() => actualizarPensionMensual(pensionBase, !pagada)}
                            className={`flex flex-col items-center gap-1 rounded-[8px] border px-1 py-2 transition-all ${!activa
                              ? "border-monserrat-ink/10 bg-monserrat-ink/10/40 text-monserrat-ink/30"
                              : pagada
                              ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                              : "border-monserrat-ink/8 bg-monserrat-cream/30 hover:bg-monserrat-cream/60"
                              }`}
                          >
                            <span
                              className={`text-[13px] font-black leading-none ${!activa ? "text-monserrat-ink/30" : pagada ? "text-emerald-600" : "text-monserrat-ink/20"
                                }`}
                            >
                              {!activa ? "—" : pagada ? "✓" : "·"}
                            </span>
                            <span
                              className={`text-[10px] font-black ${!activa ? "text-monserrat-ink/40" : pagada ? "text-emerald-700" : "text-monserrat-ink/35"
                                }`}
                            >
                              {MESES_PENSION[i]}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Observaciones si las hay */}
                    {Object.values(meses).some((m) => m?.observacion) && (
                      <div className="mt-2 rounded-[8px] bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
                        {Object.entries(meses).map(([mesKey, m]) =>
                          m?.observacion ? (
                            <p key={mesKey}>
                              <strong>{MESES_PENSION[Number(mesKey) - 1]}:</strong>{" "}
                              {m.observacion}
                            </p>
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {filtradosFinal.length > 0 && (
        <div className="flex items-center justify-between rounded-[12px] border border-monserrat-ink/8 bg-white px-4 py-3">
          <p className="text-[12px] font-semibold text-monserrat-ink/45">
            <span className="font-black text-monserrat-ink">
              {(pensionPagina - 1) * 10 + 1}–
              {Math.min(pensionPagina * 10, filtradosFinal.length)}
            </span>{" "}
            de <span className="font-black text-monserrat-ink">{filtradosFinal.length}</span>{" "}
            alumnos
          </p>

          <div className="flex items-center gap-1">
            {/* Anterior */}
            <button
              type="button"
              disabled={pensionPagina === 1}
              onClick={() => setPensionPagina((p) => p - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-monserrat-ink/10 text-monserrat-ink/50 transition hover:border-monserrat-ink/25 hover:text-monserrat-ink disabled:opacity-30"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            {/* Números de página */}
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPaginas || Math.abs(p - pensionPagina) <= 1)
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
                    className={`h-8 min-w-[32px] rounded-[8px] px-2 text-[12px] font-black transition ${pensionPagina === p
                      ? "bg-monserrat-ink text-white"
                      : "border border-monserrat-ink/10 text-monserrat-ink/50 hover:border-monserrat-ink/25 hover:text-monserrat-ink"
                      }`}
                  >
                    {p}
                  </button>
                )
              )}

            {/* Siguiente */}
            <button
              type="button"
              disabled={pensionPagina === totalPaginas}
              onClick={() => setPensionPagina((p) => p + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-monserrat-ink/10 text-monserrat-ink/50 transition hover:border-monserrat-ink/25 hover:text-monserrat-ink disabled:opacity-30"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
