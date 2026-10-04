import React, { useEffect, useMemo, useState } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { UsuarioAcademico, AsistenciaAcademica, AsignacionAcademica } from "../../../types";
import { getGruposPorGrado, type AcademicoConfig } from "../admin/adminShared";
import { getSalonLabel } from "../admin/academicoRegistry";

const ESTADOS_ASISTENCIA = ["PRESENTE", "AUSENTE"] as const;

type EstadoAsistencia = typeof ESTADOS_ASISTENCIA[number];

function labelFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function DocenteAsistencias({ token }: { token: string }) {
  const [alumnos, setAlumnos] = useState<UsuarioAcademico[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaAcademica[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionAcademica[]>([]);
  const [academicoConfig, setAcademicoConfig] = useState<AcademicoConfig | null>(null);
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<any | null>(null);
  const [selectedCurso, setSelectedCurso] = useState("");
  const [selectedGradoAcademico, setSelectedGradoAcademico] = useState("");
  const [selectedGrupo, setSelectedGrupo] = useState("");
  const [asistenciaFecha, setAsistenciaFecha] = useState(new Date().toISOString().slice(0, 10));
  const [asistenciaBulk, setAsistenciaBulk] = useState<Record<string, EstadoAsistencia>>({});
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const year = new Date().getFullYear();
    void Promise.all([
      monserratApi.alumnosDocenteAcademicos(token),
      monserratApi.asistenciasDocente(token),
      monserratApi.asignacionesDocente(token),
      monserratApi.academicoConfiguracion<AcademicoConfig>(token),
      monserratApi.listarPeriodosBimestres(year, token)
    ])
      .then(([al, as, asig, config, periods]) => {
        setAlumnos(al);
        setAsistencias(as);
        setAsignaciones(asig);
        setAcademicoConfig(config);
        // sort periods by fechaInicio asc so first option is primer bimestre
        const sorted = (periods || []).slice().sort((p1: any, p2: any) => new Date(p1.fechaInicio).getTime() - new Date(p2.fechaInicio).getTime());
        // auto-select period that contains today's date
        const today = new Date();
        const todayTime = today.getTime();
        const containing = sorted.find((p: any) => {
          try {
            const start = new Date(p.fechaInicio).setHours(0, 0, 0, 0);
            const end = new Date(p.fechaFin).setHours(23, 59, 59, 999);
            return todayTime >= start && todayTime <= end;
          } catch (e) {
            return false;
          }
        });
        const chosen = containing || sorted[0] || null;
        setPeriodos(sorted);
        setSelectedPeriodo(chosen);
        // default date: if today is inside chosen period use today, else use period start
        if (chosen && chosen.fechaInicio) {
          try {
            const start = new Date(chosen.fechaInicio).setHours(0, 0, 0, 0);
            const end = new Date(chosen.fechaFin).setHours(23, 59, 59, 999);
            if (todayTime >= start && todayTime <= end) {
              setAsistenciaFecha(today.toISOString().slice(0, 10));
            } else {
              setAsistenciaFecha(chosen.fechaInicio.slice(0, 10));
            }
          } catch (e) {
            setAsistenciaFecha(chosen.fechaInicio.slice(0, 10));
          }
        }
      })
      .catch((e) => setStatus(String(e)));
  }, [token]);

  const asistenciaResumen = useMemo(() => {
    const counts: Record<EstadoAsistencia, number> = {
      PRESENTE: 0,
      AUSENTE: 0
    };
    asistencias.forEach((item) => {
      const estado = item.estado as EstadoAsistencia;
      if (counts[estado] !== undefined) counts[estado] += 1;
    });
    return counts;
  }, [asistencias]);

  const toggleAsistencia = (dni: string) => {
    setAsistenciaBulk((prev) => {
      const current = prev[dni] || "PRESENTE";
      const currentIndex = ESTADOS_ASISTENCIA.indexOf(current as EstadoAsistencia);
      const next = ESTADOS_ASISTENCIA[(currentIndex + 1) % ESTADOS_ASISTENCIA.length];
      return { ...prev, [dni]: next };
    });
  };

  const marcarTodos = (estado: EstadoAsistencia) => {
    const bulk: Record<string, EstadoAsistencia> = {};
    alumnos.forEach((a) => {
      if (a.dni) bulk[a.dni] = estado;
    });
    setAsistenciaBulk(bulk);
  };

  const cursosDisponibles = useMemo(() => Array.from(new Set(asignaciones.map((a) => a.curso))).filter(Boolean), [asignaciones]);

  // Grados donde el docente realmente tiene asignaciones para el curso elegido
  // (sin pasar por el catalogo decorativo de "nivel academico").
  const gradosDelCurso = useMemo(() => {
    if (!selectedCurso) return [] as string[];
    return Array.from(
      new Set(asignaciones.filter((a) => a.curso === selectedCurso && a.grado).map((a) => a.grado as string))
    );
  }, [selectedCurso, asignaciones]);

  useEffect(() => {
    if (gradosDelCurso.length > 0) {
      const stillValid = gradosDelCurso.includes(selectedGradoAcademico);
      if (!stillValid) setSelectedGradoAcademico(gradosDelCurso[0]);
    } else {
      setSelectedGradoAcademico("");
    }
  }, [gradosDelCurso, selectedGradoAcademico]);

  // Grupo (Ciclado I/II, Anual, Letras, Ciencias): solo aplica a los grados que lo tienen.
  const gruposDelGrado = useMemo(() => getGruposPorGrado(selectedGradoAcademico), [selectedGradoAcademico]);

  useEffect(() => {
    if (gruposDelGrado.length === 0) {
      if (selectedGrupo !== "") setSelectedGrupo("");
      return;
    }
    if (!gruposDelGrado.includes(selectedGrupo)) setSelectedGrupo(gruposDelGrado[0]);
  }, [gruposDelGrado, selectedGrupo]);

  const alumnosFiltrados = useMemo(() => {
    if (!selectedCurso || !selectedGradoAcademico) return alumnos;
    return alumnos.filter(
      (al) =>
        (gruposDelGrado.length === 0 || al.seccion === selectedGrupo) &&
        asignaciones.some((a) => a.alumnoDni === al.dni && a.curso === selectedCurso && a.grado === selectedGradoAcademico)
    );
  }, [selectedCurso, selectedGradoAcademico, gruposDelGrado, selectedGrupo, alumnos, asignaciones]);

  const submitAsistenciaBulk = async () => {
    setIsBusy(true);
    setStatus(null);
    try {
      let count = 0;
      // Only submit for filtered alumnos (salón/curso)
      for (const alumno of alumnosFiltrados) {
        const estado = asistenciaBulk[alumno.dni] || "PRESENTE";
        await monserratApi.createAsistencia({ alumnoDni: alumno.dni, fecha: asistenciaFecha, estado, observacion: "" }, token);
        count++;
      }
      const updated = await monserratApi.asistenciasDocente(token);
      setAsistencias(updated);
      setStatus(`Asistencia guardada para ${count} alumnos.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar la asistencia.");
    } finally {
      setIsBusy(false);
    }
  };

  // Filtra asistencias dentro del periodo seleccionado
  const asistenciasEnPeriodo = useMemo(() => {
    if (!selectedPeriodo) return asistencias;
    const start = new Date(selectedPeriodo.fechaInicio).setHours(0, 0, 0, 0);
    const end = new Date(selectedPeriodo.fechaFin).setHours(23, 59, 59, 999);
    return asistencias.filter((a) => {
      const d = new Date(a.fecha).getTime();
      return d >= start && d <= end;
    });
  }, [asistencias, selectedPeriodo]);

  const minAsistencia = academicoConfig?.minAsistenciaPorcentaje ?? 70;

  const asistenciaPorAlumnoPeriodo = (alumnoDni: string) => {
    const registros = asistenciasEnPeriodo.filter((a) => a.alumnoDni === alumnoDni);
    const total = registros.length;
    const present = registros.filter((r) => r.estado === "PRESENTE").length;
    const porcentaje = total === 0 ? null : Math.round((present / total) * 100);
    return { total, present, porcentaje };
  };

  const bimestreLabels = ["Primer bimestre", "Segundo bimestre", "Tercer bimestre", "Cuarto bimestre"];
  const periodoLabel = (p: any, idx: number) => p?.nombre || bimestreLabels[idx] || `Periodo ${idx + 1}`;

  const nivelSummary = useMemo(() => {
    const summary = { total: alumnosFiltrados.length, below: 0 };
    alumnosFiltrados.forEach((a) => {
      const p = asistenciaPorAlumnoPeriodo(a.dni).porcentaje;
      if (p !== null && p < minAsistencia) summary.below++;
    });
    return summary;
  }, [alumnosFiltrados, asistenciasEnPeriodo, minAsistencia]);

  return (
    <div className="grid gap-4">
      <p className="mb-1 text-sm font-semibold text-monserrat-ink/60">Control de asistencias de tu grupo.</p>
      {status && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{status}</div>}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="pro-card pro-rise p-5">
          <div className="mb-4 flex flex-wrap gap-3">
            <label className="flex items-center gap-2">
              <span className="text-sm text-monserrat-ink/70">Periodo:</span>
              <select value={selectedPeriodo ? selectedPeriodo.id : ""} onChange={(e) => {
                const p = periodos.find((pp) => String(pp.id) === e.target.value) || null;
                setSelectedPeriodo(p);
                if (p && p.fechaInicio) setAsistenciaFecha(p.fechaInicio.slice(0,10));
              }} className="admin-input">
                {periodos.map((p, i) => (
                  <option key={p.id} value={p.id}>{periodoLabel(p, i)}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="text-sm text-monserrat-ink/70">Curso:</span>
              <select value={selectedCurso} onChange={(e) => setSelectedCurso(e.target.value)} className="admin-input">
                <option value="">-- Todos --</option>
                {cursosDisponibles.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="text-sm text-monserrat-ink/70">Grado:</span>
              <select value={selectedGradoAcademico} onChange={(e) => setSelectedGradoAcademico(e.target.value)} className="admin-input">
                <option value="">--</option>
                {gradosDelCurso.map((grado) => (
                  <option key={grado} value={grado}>{labelFromEnum(grado)}</option>
                ))}
              </select>
            </label>

            {gruposDelGrado.length > 0 && (
              <label className="flex items-center gap-2">
                <span className="text-sm text-monserrat-ink/70">Grupo:</span>
                <select value={selectedGrupo} onChange={(e) => setSelectedGrupo(e.target.value)} className="admin-input">
                  {gruposDelGrado.map((grupo) => (
                    <option key={grupo} value={grupo}>{getSalonLabel(grupo) || grupo}</option>
                  ))}
                </select>
              </label>
            )}

            <input type="date" value={asistenciaFecha} onChange={(e) => setAsistenciaFecha(e.target.value)} className="admin-input max-w-55" />
            <button type="button" onClick={() => marcarTodos("PRESENTE")} className="pro-btn-soft">Todos presentes</button>
            <button type="button" onClick={() => marcarTodos("AUSENTE")} className="pro-btn-soft">Todos ausentes</button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-monserrat-ink/8">
            <div className="grid grid-cols-[1.6fr_0.6fr_1fr] gap-0 border-b border-monserrat-ink/8 bg-[#f2f2f1] px-4 py-3 text-sm uppercase tracking-[0.14em] text-monserrat-ink/50">
              <span>Alumno</span>
              <span className="text-center">% Asistencia</span>
              <span className="text-right">Estado</span>
            </div>
            <div className="max-h-100 overflow-y-auto">
              {alumnosFiltrados.map((alumno) => {
                const estado = asistenciaBulk[alumno.dni] || "PRESENTE";
                const resumen = asistenciaPorAlumnoPeriodo(alumno.dni);
                const porcentaje = resumen.porcentaje;
                const debajo = porcentaje !== null && porcentaje < minAsistencia;
                return (
                  <button key={alumno.dni} type="button" onClick={() => toggleAsistencia(alumno.dni)} className="flex w-full items-center justify-between gap-4 border-b border-monserrat-ink/8 px-4 py-3 text-left hover:bg-[#f4ead2]">
                    <span className="font-semibold text-monserrat-ink">{alumno.nombre}</span>
                    <span className={`text-sm font-black ${porcentaje === null ? 'text-monserrat-ink/40' : debajo ? 'text-monserrat-ink' : 'text-monserrat-ink/70'} text-center w-14`}>{porcentaje === null ? 'N/A' : `${porcentaje}%`}</span>
                    <span className="text-sm font-black uppercase tracking-[0.12em] text-monserrat-ink/70">{labelFromEnum(estado)}</span>
                  </button>
                );
              })}
              {alumnosFiltrados.length === 0 && <div className="px-4 py-4 text-sm text-monserrat-ink/50">Aún no hay alumnos asignados para el filtro seleccionado.</div>}
            </div>
          </div>
          <button type="button" disabled={isBusy || alumnos.length === 0} onClick={submitAsistenciaBulk} className="pro-btn mt-4">
            {isBusy ? "Guardando..." : `Guardar asistencia (${alumnosFiltrados.length})`}
          </button>
        </div>

        <div className="pro-card pro-rise p-5">
          <h4 className="text-lg font-black text-monserrat-ink">Resumen histórico</h4>
          <div className="mt-4 grid gap-3">
            {Object.entries(asistenciaResumen).map(([estado, total]) => (
              <div key={estado} className="rounded-[14px] border border-monserrat-ink/8 bg-[#f6f6f5]0 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">{labelFromEnum(estado)}</p>
                <p className="mt-2 text-2xl font-black text-monserrat-ink">{total}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-monserrat-gold/25 bg-white p-4">
            <p className="text-sm font-black">Resumen del grado seleccionado</p>
            <p className="mt-2 text-sm text-monserrat-ink/70">Alumnos en filtro: <span className="font-black">{nivelSummary.total}</span></p>
            <p className="mt-1 text-sm text-monserrat-ink">Por debajo del mínimo ({minAsistencia}%): <span className="font-black">{nivelSummary.below}</span></p>
            {nivelSummary.below > 0 && <p className="mt-2 text-xs text-monserrat-ink/60">Revisa los alumnos marcados en rojo en la lista para detalles.</p>}
          </div>
          <div className="mt-6 rounded-[14px] border border-monserrat-ink/8 bg-[#f2f2f1] p-4 text-sm text-monserrat-ink/70">
            Estos valores reflejan la cantidad de registros de asistencia ya guardados en el sistema para tu rol de docente.
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocenteAsistencias;
