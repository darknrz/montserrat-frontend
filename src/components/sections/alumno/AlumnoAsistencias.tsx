import React, { useEffect, useMemo, useState } from "react";
import { CalendarX2, Flame, Sparkles, Trophy, UserCheck, UserX } from "lucide-react";
import { SectionHeader } from "../../ui/SectionHeader";
import { monserratApi } from "../../../api/monserrat";
import type { AsistenciaAcademica, PeriodoBimestre } from "../../../types";
import type { AcademicoConfig } from "../admin/adminShared";

// Misma paleta que el resto de la libreta académica (niveles C/B/A/AD),
// reutilizada aquí para que "presente/ausente" se sienta parte del mismo sistema.
const COLOR_PRESENTE = "#00FF00";
const COLOR_AUSENTE = "#FF0000";
const COLOR_ALERTA = "#d8a842";

const DIAS_SEMANA = ["D", "L", "M", "X", "J", "V", "S"];

function labelFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function keyFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("es-PE", { month: "long", year: "numeric" });
}

function buildMonthCells(year: number, month: number, registros: Map<string, string>) {
  const startOffset = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: { day: number | null; estado?: string }[] = [];
  for (let i = 0; i < startOffset; i += 1) cells.push({ day: null });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, estado: registros.get(key) });
  }
  return cells;
}

// Aro de progreso circular: mismo componente para el gran indicador general
// y para las versiones pequeñas de cada bimestre, solo cambia el tamaño.
function Gauge({
  porcentaje,
  minRequerido,
  size = 168,
  stroke = 14,
  showLabel = true
}: {
  porcentaje: number | null;
  minRequerido: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = ((porcentaje ?? 0) / 100) * circumference;
  const color =
    porcentaje === null
      ? "rgb(31 27 24 / 0.16)"
      : porcentaje < minRequerido
      ? COLOR_AUSENTE
      : porcentaje < minRequerido + 10
      ? COLOR_ALERTA
      : COLOR_PRESENTE;

  return (
    <div className="relative mx-auto flex-none" style={{ height: size, width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(31 27 24 / 0.08)" strokeWidth={stroke} />
        {porcentaje !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: "stroke-dasharray 0.7s ease" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-black" style={{ color: porcentaje === null ? "#1f1b18" : color, fontSize: size / 4.6 }}>
          {porcentaje === null ? "—" : `${porcentaje}%`}
        </span>
        {showLabel && <span className="text-[9px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">Asistencia</span>}
      </div>
    </div>
  );
}

function StatChip({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-monserrat-ink/8 bg-[#f2f2f1] px-4 py-3">
      <span
        className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]"
        style={{ backgroundColor: `${tone}18`, color: tone }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-black leading-tight text-monserrat-ink">{value}</p>
        <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">{label}</p>
      </div>
    </div>
  );
}

export function AlumnoAsistencias({ token }: { token: string }) {
  const [asistencias, setAsistencias] = useState<AsistenciaAcademica[]>([]);
  const [academicoConfig, setAcademicoConfig] = useState<AcademicoConfig | null>(null);
  const [periodos, setPeriodos] = useState<PeriodoBimestre[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const year = new Date().getFullYear();
    void Promise.all([
      monserratApi.asistenciasAlumno(token),
      monserratApi.academicoConfiguracion<AcademicoConfig>(token),
      monserratApi.listarPeriodosBimestres(year, token)
    ])
      .then(([as, config, periods]) => {
        setAsistencias(as || []);
        setAcademicoConfig(config || null);
        const sorted = (periods || [])
          .slice()
          .sort((p1, p2) => new Date(p1.fechaInicio).getTime() - new Date(p2.fechaInicio).getTime());
        setPeriodos(sorted);
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : String(error)));
  }, [token]);

  const minAsistencia = academicoConfig?.minAsistenciaPorcentaje ?? 70;

  const totalRegistros = asistencias.length;
  const presentes = useMemo(() => asistencias.filter((a) => a.estado === "PRESENTE").length, [asistencias]);
  const ausentes = totalRegistros - presentes;
  const porcentajeGeneral = totalRegistros === 0 ? null : Math.round((presentes / totalRegistros) * 100);

  // Racha: cuántas asistencias seguidas lleva el alumno ahora mismo, y cuál fue
  // su mejor racha histórica — el tipo de dato que un número suelto no comunica.
  const { rachaActual, mejorRacha } = useMemo(() => {
    const ordenados = [...asistencias].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    let mejor = 0;
    let corrida = 0;
    ordenados.forEach((a) => {
      if (a.estado === "PRESENTE") {
        corrida += 1;
        mejor = Math.max(mejor, corrida);
      } else {
        corrida = 0;
      }
    });
    let actual = 0;
    for (let i = ordenados.length - 1; i >= 0; i -= 1) {
      if (ordenados[i].estado === "PRESENTE") actual += 1;
      else break;
    }
    return { rachaActual: actual, mejorRacha: mejor };
  }, [asistencias]);

  const asistenciasEnPeriodo = (periodo: PeriodoBimestre) => {
    const start = new Date(periodo.fechaInicio).setHours(0, 0, 0, 0);
    const end = new Date(periodo.fechaFin).setHours(23, 59, 59, 999);
    return asistencias.filter((a) => {
      const d = new Date(a.fecha).getTime();
      return d >= start && d <= end;
    });
  };

  const porcentajeEnPeriodo = (periodo: PeriodoBimestre) => {
    const regs = asistenciasEnPeriodo(periodo);
    const total = regs.length;
    const present = regs.filter((r) => r.estado === "PRESENTE").length;
    return { total, present, porcentaje: total === 0 ? null : Math.round((present / total) * 100) };
  };

  // Mapa fecha -> estado, usado tanto por el calendario como por la búsqueda de
  // registros recientes; se calcula una sola vez por cambio de datos.
  const registrosPorFecha = useMemo(() => {
    const map = new Map<string, string>();
    asistencias.forEach((a) => {
      const d = new Date(a.fecha);
      if (!Number.isNaN(d.getTime())) map.set(keyFromDate(d), a.estado);
    });
    return map;
  }, [asistencias]);

  const mesesConDatos = useMemo(() => {
    const set = new Set<string>();
    asistencias.forEach((a) => {
      const d = new Date(a.fecha);
      if (!Number.isNaN(d.getTime())) set.add(`${d.getFullYear()}-${d.getMonth()}`);
    });
    return Array.from(set)
      .map((k) => {
        const [year, month] = k.split("-").map(Number);
        return { year, month };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  }, [asistencias]);

  const recientes = useMemo(
    () => [...asistencias].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 8),
    [asistencias]
  );

  const sinDatos = totalRegistros === 0;

  return (
    <div className="grid gap-4">
      <SectionHeader title="Mis asistencias" description="Tu asistencia de un vistazo: racha, avance por bimestre y calendario." align="left" />
      {status && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{status}</div>}

      {sinDatos ? (
        <div className="grid place-items-center gap-2 rounded-[20px] border border-dashed border-monserrat-ink/15 bg-white p-10 text-center">
          <CalendarX2 size={28} className="text-monserrat-ink/30" />
          <p className="text-sm font-semibold text-monserrat-ink/50">Aún no tienes asistencias registradas.</p>
        </div>
      ) : (
        <>
          {/* Hero: el aro grande responde de inmediato a "¿cómo voy?", y los chips
              a su lado explican el porqué (racha, mejor racha, conteos). */}
        

          {/* Por bimestre: mismo aro en miniatura, para leer los cuatro períodos
              con el mismo lenguaje visual que el resumen general. */}
          {periodos.length > 0 && (
            <div className="rounded-[20px] border border-monserrat-ink/10 bg-white p-5 ">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">Por bimestre</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {periodos.map((p, i) => {
                  const stats = porcentajeEnPeriodo(p);
                  return (
                    <div key={p.id ?? i} className="flex items-center gap-3 rounded-[14px] border border-monserrat-ink/8 bg-[#f2f2f1] p-3">
                      <Gauge porcentaje={stats.porcentaje} minRequerido={minAsistencia} size={64} stroke={7} showLabel={false} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-wide text-monserrat-ink/45">Bimestre {p.numeroBimestre}</p>
                        <p className="text-xs font-semibold text-monserrat-ink/60">
                          {stats.present}/{stats.total} presencias
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calendario tipo "heatmap": el patrón de faltas se ve de un vistazo,
              algo que ni la tabla ni los números sueltos comunican bien. */}
          <div className="rounded-[20px] border border-monserrat-ink/10 bg-white p-5 ">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">Calendario de asistencia</p>
              <div className="flex items-center gap-3 text-[10px] font-bold text-monserrat-ink/50">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[4px]" style={{ backgroundColor: COLOR_PRESENTE }} /> Presente
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[4px]" style={{ backgroundColor: COLOR_AUSENTE }} /> Ausente
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-[4px] bg-[#e3e3e1]/10" /> Sin registro
                </span>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mesesConDatos.map(({ year, month }) => {
                const cells = buildMonthCells(year, month, registrosPorFecha);
                return (
                  <div key={`${year}-${month}`} className="rounded-[16px] border border-monserrat-ink/8 bg-[#f2f2f1] p-4">
                    <p className="text-xs font-black capitalize text-monserrat-ink">{monthLabel(year, month)}</p>
                    <div className="mt-3 grid grid-cols-7 gap-1.5">
                      {DIAS_SEMANA.map((d, i) => (
                        <span key={i} className="text-center text-[9px] font-black uppercase text-monserrat-ink/35">
                          {d}
                        </span>
                      ))}
                      {cells.map((cell, i) => {
                        if (cell.day === null) return <span key={i} />;
                        const color = cell.estado === "PRESENTE" ? COLOR_PRESENTE : cell.estado === "AUSENTE" ? COLOR_AUSENTE : undefined;
                        return (
                          <span
                            key={i}
                            title={cell.estado ? `${cell.day} · ${labelFromEnum(cell.estado)}` : `${cell.day} · Sin registro`}
                            className="flex aspect-square items-center justify-center rounded-[6px] text-[10px] font-bold"
                            style={{
                              backgroundColor: color ? `${color}22` : "rgb(31 27 24 / 0.05)",
                              color: color ?? "rgb(31 27 24 / 0.3)"
                            }}
                          >
                            {cell.day}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actividad reciente: lista compacta en vez de una tabla larga,
              con el punto de color como único indicador de estado. */}
          <div className="rounded-[20px] border border-monserrat-ink/10 bg-white p-5 ">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">Actividad reciente</p>
            <div className="mt-3 grid">
              {recientes.map((a, i) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 py-2.5 ${i > 0 ? "border-t border-monserrat-ink/6" : ""}`}
                >
                  <span
                    className="h-2.5 w-2.5 flex-none rounded-full"
                    style={{ backgroundColor: a.estado === "PRESENTE" ? COLOR_PRESENTE : COLOR_AUSENTE }}
                  />
                  <span className="w-24 flex-none text-xs font-black text-monserrat-ink">{a.fecha}</span>
                  <span className="w-24 flex-none text-xs font-semibold text-monserrat-ink/60">{labelFromEnum(a.estado)}</span>
                  <span className="min-w-0 flex-1 truncate text-xs text-monserrat-ink/45">{a.docenteNombre || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AlumnoAsistencias;