import { AlertTriangle, ArrowRight, CalendarCheck, CheckCircle2, Info } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { monserratApi } from "../../../api/monserrat";
import { resetAnioActivoCache } from "../../../hooks/useAnioActivo";
import type {
  AccionMigracion,
  AnioEscolar,
  MigracionDecision,
  MigracionItem,
  MigracionPreview,
  MigracionResultado,
} from "../../../types";
import { formatGrado } from "./adminShared";

type Props = {
  token: string;
  setErrorMessage: (msg: string | null) => void;
};

const ACCIONES: { value: AccionMigracion; label: string }[] = [
  { value: "PROMOVER", label: "Promover" },
  { value: "REPETIR", label: "Repite grado" },
  { value: "EGRESAR", label: "Egresa" },
  { value: "RETIRAR", label: "Retirar" },
];

const labelGrado = (g?: string) => (g ? formatGrado(g) || g : "—");

const ESTADO_STYLES: Record<string, string> = {
  ACTIVO: "bg-[#e3f1e7] text-[#2f6b45]",
  CERRADO: "bg-[#efe6d0] text-monserrat-ink/60",
  PLANIFICADO: "bg-[#fbf0d6] text-[#8a6a14]",
};

export function MigracionAnioPanel({ token, setErrorMessage }: Props) {
  const [anios, setAnios] = useState<AnioEscolar[]>([]);
  const [anioDestino, setAnioDestino] = useState<number | null>(null);
  const [copiarBimestres, setCopiarBimestres] = useState(true);
  const [decisiones, setDecisiones] = useState<Record<number, MigracionDecision>>({});
  const [preview, setPreview] = useState<MigracionPreview | null>(null);
  const [confirmacion, setConfirmacion] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<MigracionResultado | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const anioActivo = anios.find((a) => a.estado === "ACTIVO")?.anio ?? null;

  const cargarAnios = useCallback(() => {
    if (!token) return;
    monserratApi
      .aniosEscolares(token)
      .then((data) => {
        setAnios(data);
        const activo = data.find((a) => a.estado === "ACTIVO")?.anio;
        if (activo) setAnioDestino((prev) => (prev && prev > activo ? prev : activo + 1));
      })
      .catch((e: unknown) =>
        setErrorMessage(e instanceof Error ? e.message : "No se pudieron cargar los años escolares")
      );
  }, [token, setErrorMessage]);

  useEffect(cargarAnios, [cargarAnios]);

  const generarPreview = async (nextDecisiones: Record<number, MigracionDecision>) => {
    if (!anioDestino) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await monserratApi.migracionVistaPrevia(
        { anioDestino, copiarBimestres, decisiones: Object.values(nextDecisiones) },
        token
      );
      setPreview(data);
    } catch (e) {
      setPreview(null);
      setErrorMessage(e instanceof Error ? e.message : "No se pudo generar la vista previa");
    } finally {
      setLoading(false);
    }
  };

  const iniciar = () => {
    setDecisiones({});
    setConfirmacion("");
    setResultado(null);
    void generarPreview({});
  };

  const cambiarDecision = (item: MigracionItem, accion: AccionMigracion) => {
    const next = { ...decisiones, [item.alumnoId]: { alumnoId: item.alumnoId, accion } };
    setDecisiones(next);
    void generarPreview(next);
  };

  // Resumen POR GRADO: "grado actual → grado destino: N alumnos". Los salones no intervienen.
  const resumenGrados = useMemo(() => {
    const map = new Map<string, { origen: string; destino: string; accion: AccionMigracion; total: number }>();
    (preview?.items ?? []).forEach((i) => {
      const destino = i.gradoDestino
        ? labelGrado(i.gradoDestino)
        : i.accion === "EGRESAR"
          ? "Egresan"
          : "Retirados";
      const key = `${i.gradoActual}|${destino}|${i.accion}`;
      const prev = map.get(key);
      map.set(key, prev ? { ...prev, total: prev.total + 1 } : { origen: labelGrado(i.gradoActual), destino, accion: i.accion, total: 1 });
    });
    return [...map.values()];
  }, [preview]);

  const itemsFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return [];
    return (preview?.items ?? [])
      .filter((i) => i.nombre.toLowerCase().includes(term) || i.dni.includes(term) || (i.codigo ?? "").toLowerCase().includes(term))
      .slice(0, 30);
  }, [preview, busqueda]);

  const ejecutar = async () => {
    if (!anioDestino) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await monserratApi.migracionEjecutar(
        { anioDestino, copiarBimestres, decisiones: Object.values(decisiones), confirmacion },
        token
      );
      resetAnioActivoCache();
      setResultado(res);
      setPreview(null);
      setConfirmacion("");
      cargarAnios();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "No se pudo completar la migración");
    } finally {
      setLoading(false);
    }
  };

  const frase = `MIGRAR ${anioDestino ?? ""}`;
  const puedeConfirmar = !!preview?.puedeEjecutar && confirmacion.trim() === frase && !loading;

  return (
    <div className="grid gap-5 pro-card pro-rise p-5">
      <div>
        <h3 className="font-serif text-lg font-black text-monserrat-ink">Migrar año escolar</h3>
        <p className="mt-1 text-[12px] font-semibold text-monserrat-ink/50">
          Cierra el año activo, archiva sus notas y asistencias, promueve a los alumnos de grado y abre el nuevo año.
          Solo el super admin puede ejecutarlo.
        </p>
      </div>

      <p className="flex items-start gap-2 rounded-[10px] border border-[#d8a842]/40 bg-[#fdf8ea] px-3 py-2 text-[12px] font-semibold text-monserrat-ink/75">
        <Info size={15} className="mt-0.5 shrink-0 text-[#8a6a14]" />
        <span>
          <strong>Los salones no se asignan en la migración:</strong> se definen después de los exámenes de ubicación.
          Los alumnos que pasen a un grado con varios salones (p. ej. 6to Prim, 1ro–5to Sec) quedarán{" "}
          <strong>sin salón</strong> hasta que se los asignes en Académico (editar alumno) o importando un Excel con la
          columna SALÓN.
        </span>
      </p>

      <div className="flex flex-wrap gap-2">
        {anios.map((a) => (
          <span
            key={a.id}
            className={`rounded-full px-3 py-1 text-[11px] font-black ${ESTADO_STYLES[a.estado] ?? ""}`}
            title={a.fechaCierre ? `Cerrado el ${a.fechaCierre.slice(0, 10)} por ${a.cerradoPor ?? "—"}` : undefined}
          >
            {a.anio} · {a.estado}
          </span>
        ))}
      </div>

      {resultado && (
        <div className="grid gap-2 rounded-[12px] border border-[#3f7d54]/30 bg-[#eef7f1] p-4 text-[13px] font-semibold text-monserrat-ink">
          <p className="flex items-center gap-2 font-black text-[#2f6b45]">
            <CheckCircle2 size={16} /> Migración {resultado.anioOrigen} → {resultado.anioDestino} completada
          </p>
          <p>
            {resultado.promovidos} promovidos · {resultado.repitentes} repiten · {resultado.egresados} egresados ·{" "}
            {resultado.retirados} retirados
          </p>
          <p>
            Archivadas {resultado.notasArchivadas} notas y {resultado.asistenciasArchivadas} asistencias.{" "}
            {resultado.bimestresCopiados > 0 && `${resultado.bimestresCopiados} bimestres copiados. `}
          </p>
          {(resultado.alumnosSinSalon ?? 0) > 0 && (
            <p className="text-[#8a6a14]">
              {resultado.alumnosSinSalon} alumno(s) quedaron sin salón: asígnalo en Académico (editar alumno) o
              importando un Excel con la columna SALÓN, cuando se conozcan los resultados de los exámenes de ubicación.
            </p>
          )}
          {resultado.alumnosSinAsignaciones > 0 && (
            <p className="text-[#8a6a14]">
              {resultado.alumnosSinAsignaciones} alumno(s) quedaron sin docentes: se asignan al elegir su salón.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-end">
        <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">
          Año activo
          <input className="admin-input" value={anioActivo ?? "—"} disabled />
        </label>
        <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">
          Año de destino
          <input
            type="number"
            className="admin-input"
            value={anioDestino ?? ""}
            min={(anioActivo ?? 2000) + 1}
            onChange={(e) => {
              setAnioDestino(Number(e.target.value));
              setPreview(null);
            }}
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-[12px] font-semibold text-monserrat-ink/70">
          <input
            type="checkbox"
            checked={copiarBimestres}
            onChange={(e) => {
              setCopiarBimestres(e.target.checked);
              setPreview(null);
            }}
          />
          Copiar fechas de bimestres al nuevo año
        </label>
      </div>

      <div>
        <button
          type="button"
          onClick={iniciar}
          disabled={loading || !anioDestino || !anioActivo}
          className="inline-flex items-center gap-2 rounded-[9px] bg-monserrat-red px-4 py-2 text-[12px] font-black text-white transition hover:bg-monserrat-redDark disabled:opacity-50"
        >
          <CalendarCheck size={14} /> {loading && !preview ? "Calculando..." : "Generar vista previa"}
        </button>
      </div>

      {preview && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Promovidos", preview.promovidos],
              ["Repiten", preview.repitentes],
              ["Egresan", preview.egresados],
              ["Retirados", preview.retirados],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[10px] border border-[#d8a842]/30 p-3">
                <p className="text-xl font-black text-monserrat-ink">{value}</p>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">{label}</p>
              </div>
            ))}
          </div>

          <p className="text-[12px] font-semibold text-monserrat-ink/60">
            Se archivarán {preview.notasAArchivar} notas y {preview.asistenciasAArchivar} asistencias de{" "}
            {preview.anioOrigen}
            {preview.bimestresACopiar > 0 && ` y se copiarán ${preview.bimestresACopiar} bimestres`}.
          </p>

          {preview.omitidos.length > 0 && (
            <details className="rounded-[10px] bg-[#fbf0d6] px-3 py-2 text-[12px] font-semibold text-[#8a6a14]">
              <summary className="cursor-pointer font-black">
                {preview.omitidos.length} alumno(s) activos no se migran
              </summary>
              <p className="mt-1">{preview.omitidos.join(", ")}</p>
            </details>
          )}

          {(preview.alumnosSinSalon ?? 0) > 0 && (
            <p className="flex items-center gap-2 rounded-[10px] border border-[#d8a842]/50 bg-[#fdf8ea] px-3 py-2 text-[12px] font-black text-[#8a6a14]">
              <AlertTriangle size={14} /> {preview.alumnosSinSalon} alumno(s) quedarán sin salón.
            </p>
          )}

          <div className="overflow-auto rounded-[10px] border border-[#d8a842]/30">
            <table className="w-full min-w-[520px] text-left text-[12px]">
              <thead className="bg-[#f4ead2] text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-ink/50">
                <tr>
                  <th className="px-3 py-2">Grado actual</th>
                  <th className="px-3 py-2">Grado {preview.anioDestino}</th>
                  <th className="px-3 py-2 text-right">Alumnos</th>
                </tr>
              </thead>
              <tbody>
                {resumenGrados.map((r) => (
                  <tr key={`${r.origen}|${r.destino}|${r.accion}`} className="border-t border-[#d8a842]/15">
                    <td className="px-3 py-2 font-bold text-monserrat-ink">{r.origen}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-2">
                        <ArrowRight size={12} className="text-monserrat-ink/40" />
                        {r.destino}
                        {r.accion === "REPETIR" && <span className="text-[#8a6a14]">(repite)</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-black">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-2 rounded-[10px] border border-[#d8a842]/30 p-3">
            <p className="text-[12px] font-black text-monserrat-ink">Ajustes individuales (opcional)</p>
            <p className="text-[11px] font-semibold text-monserrat-ink/50">
              Todo se calcula automáticamente por grado. Busca a un alumno solo si necesitas una excepción: que repita
              el grado, que egrese o que se retire.
            </p>
            <input
              className="admin-input"
              placeholder="Buscar por nombre, DNI o código…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {itemsFiltrados.map((item) => (
              <div
                key={item.alumnoId}
                className="flex flex-wrap items-center gap-2 border-t border-[#d8a842]/15 pt-2 text-[12px]"
              >
                <span className="min-w-[200px] flex-1 font-bold text-monserrat-ink">
                  {item.nombre}
                  <span className="ml-2 font-semibold text-monserrat-ink/50">{labelGrado(item.gradoActual)}</span>
                </span>
                <select
                  className="admin-input !w-auto"
                  value={item.accion}
                  onChange={(e) => cambiarDecision(item, e.target.value as AccionMigracion)}
                >
                  {ACCIONES.filter((a) => a.value !== "EGRESAR" || item.gradoActual === "QUINTO_SECUNDARIA").map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
                {item.gradoDestino ? (
                  <span className="inline-flex items-center gap-2">
                    <ArrowRight size={12} className="text-monserrat-ink/40" />
                    {labelGrado(item.gradoDestino)}
                  </span>
                ) : (
                  <span className="text-monserrat-ink/50">
                    {item.accion === "EGRESAR" ? "Egresado" : "Retirado"} (se desactiva la cuenta)
                  </span>
                )}
              </div>
            ))}
            {busqueda.trim() && itemsFiltrados.length === 0 && (
              <p className="text-[12px] font-semibold text-monserrat-ink/50">Sin resultados.</p>
            )}
          </div>

          <div className="grid gap-3 rounded-[12px] border border-[#9f171b]/25 bg-[#fdf6f6] p-4">
            <p className="flex items-start gap-2 text-[12px] font-semibold text-monserrat-ink/80">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#9f171b]" />
              <span>
                Esta acción es <strong>irreversible</strong>: las notas y asistencias de {preview.anioOrigen} pasan al
                histórico, se reinician las asignaciones docente-alumno de quienes cambian de grado y los egresados y
                retirados quedan inactivos. Los alumnos que pasen a un grado con varios salones quedan sin salón hasta que se los asignes. Las matrículas, pensiones y talleres de {preview.anioOrigen} se conservan.
              </span>
            </p>
            <label className="grid gap-1 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">
              Escribe «{frase}» para confirmar
              <input
                className="admin-input"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                placeholder={frase}
              />
            </label>
            <div>
              <button
                type="button"
                onClick={() => void ejecutar()}
                disabled={!puedeConfirmar}
                className="inline-flex items-center gap-2 rounded-[9px] bg-[#9f171b] px-4 py-2 text-[12px] font-black text-white transition hover:bg-[#9f171b]/90 disabled:opacity-40"
              >
                {loading ? "Migrando..." : `Migrar a ${anioDestino}`}
              </button>
              {!preview.puedeEjecutar && (
                <span className="ml-3 text-[12px] font-semibold text-[#9f171b]">
                  La migración no se puede ejecutar en este momento.
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
