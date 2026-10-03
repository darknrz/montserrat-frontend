import React, { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CalendarX2, Flame, PartyPopper, Trophy, UserCheck, UserX } from "lucide-react";
import { monserratApi } from "../../../api/monserrat";
import type { AsistenciaAcademica, PeriodoBimestre } from "../../../types";
import type { AcademicoConfig } from "../admin/adminShared";
import { STATUS_ACCENT, rise } from "./kidTheme";

// Semáforo suave (mismos tonos que el resto del portal del alumno).
const COLOR_PRESENTE = STATUS_ACCENT.ok.fg;
const COLOR_AUSENTE = STATUS_ACCENT.bad.fg;
const COLOR_ALERTA = STATUS_ACCENT.warn.fg;

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
    <div
      className="relative mx-auto flex-none"
      style={{ height: size, width: size }}
      role="img"
      aria-label={porcentaje === null ? "Sin datos de asistencia" : `Asistencia ${porcentaje} por ciento`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgb(216 168 66 / 0.22)" strokeWidth={stroke} />
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
            style={{ transition: "stroke-dasharray 0.9s cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-black" style={{ color: porcentaje === null ? "#1f1b18" : color, fontSize: size / 4.2 }}>
          {porcentaje === null ? "—" : `${porcentaje}%`}
        </span>
        {showLabel && <span className="text-[11px] font-black uppercase tracking-[0.12em] text-monserrat-ink/50">Asistencia</span>}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
  index
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: { bg: string; fg: string; ring: string };
  index: number;
}) {
  return (
    <div className="kid-card kid-rise flex items-center gap-3 px-4 py-3" style={rise(index)}>
      <span className="kid-icon-badge !h-11 !w-11 !rounded-[14px]" style={{ backgroundColor: accent.bg, color: accent.fg }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-black leading-tight text-monserrat-ink">{value}</p>
        <p className="truncate text-[13px] font-bold text-monserrat-ink/60">{label}</p>
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
  const lograMinimo = porcentajeGeneral !== null && porcentajeGeneral >= minAsistencia;

  return (
    <div className="grid gap-5">
      <div className="kid-rise">
        <h3 className="text-2xl font-black text-monserrat-ink">Mis asistencias</h3>
        <p className="mt-1 text-[15px] font-semibold text-monserrat-ink/60">
          Mira cuántos días viniste, tu racha y el calendario de cada mes.
        </p>
      </div>

      {status && (
        <div role="alert" className="rounded-2xl border-2 border-[#e9b3b4] bg-[#fbe9e9] px-4 py-3 text-sm font-bold text-[#9f171b]">
          {status}
        </div>
      )}

      {sinDatos ? (
        <div className="kid-card kid-rise grid place-items-center gap-3 p-10 text-center">
          <span className="kid-icon-badge kid-bob" style={{ backgroundColor: STATUS_ACCENT.warn.bg, color: STATUS_ACCENT.warn.fg }}>
            <CalendarX2 size={26} />
          </span>
          <p className="text-lg font-black text-monserrat-ink">Todavía no hay asistencias</p>
          <p className="max-w-sm text-[15px] font-semibold text-monserrat-ink/60">
            Cuando tus profesores tomen lista, aquí verás tu avance día a día.
          </p>
        </div>
      ) : (
        <>
          {/* Resumen grande: responde de inmediato a "¿cómo voy?" y los datos a su
              lado explican el porqué (racha, mejor racha, conteos). */}
          <div className="kid-card kid-rise grid gap-5 p-5 sm:p-6 md:grid-cols-[auto_1fr] md:items-center">
            <Gauge porcentaje={porcentajeGeneral} minRequerido={minAsistencia} />
            <div className="grid gap-3">
              <div>
                <p className="text-2xl font-black text-monserrat-ink sm:text-3xl">
                  Asististe <span style={{ color: COLOR_PRESENTE }}>{presentes}</span> de {totalRegistros} días
                </p>
                <p className="mt-1 flex items-center gap-2 text-[15px] font-bold" style={{ color: lograMinimo ? COLOR_PRESENTE : COLOR_ALERTA }}>
                  {lograMinimo ? <PartyPopper size={18} /> : <CalendarCheck size={18} />}
                  {lograMinimo
                    ? "¡Muy bien! Estás por encima de la asistencia mínima."
                    : `Necesitas llegar a ${minAsistencia}% de asistencia. ¡Tú puedes!`}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <StatCard index={1} icon={<Flame size={20} />} label="Racha actual (días seguidos)" value={rachaActual} accent={STATUS_ACCENT.warn} />
                <StatCard index={2} icon={<Trophy size={20} />} label="Tu mejor racha" value={mejorRacha} accent={STATUS_ACCENT.info} />
                <StatCard index={3} icon={<UserCheck size={20} />} label="Días presente" value={presentes} accent={STATUS_ACCENT.ok} />
                <StatCard index={4} icon={<UserX size={20} />} label="Días ausente" value={ausentes} accent={STATUS_ACCENT.bad} />
              </div>
            </div>
          </div>

          {/* Por bimestre: mismo aro en miniatura, para leer los cuatro períodos
              con el mismo lenguaje visual que el resumen general. */}
          {periodos.length > 0 && (
            <div className="kid-card kid-rise p-5" style={rise(2)}>
              <p className="text-lg font-black text-monserrat-ink">Por bimestre</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {periodos.map((p, i) => {
                  const stats = porcentajeEnPeriodo(p);
                  return (
                    <div
                      key={p.id ?? i}
                      className="kid-pop flex items-center gap-3 rounded-[20px] border-2 border-[#d8a842]/30 bg-[#fbf3e1] p-3"
                      style={rise(i)}
                    >
                      <Gauge porcentaje={stats.porcentaje} minRequerido={minAsistencia} size={68} stroke={8} showLabel={false} />
                      <div className="min-w-0">
                        <p className="text-sm font-black text-monserrat-ink">Bimestre {p.numeroBimestre}</p>
                        <p className="text-[13px] font-semibold text-monserrat-ink/65">
                          {stats.present} de {stats.total} días
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Calendario: el patrón de faltas se ve de un vistazo con colores de semáforo suave. */}
          <div className="kid-card kid-rise p-5" style={rise(3)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-lg font-black text-monserrat-ink">Calendario de asistencia</p>
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-monserrat-ink/70" aria-label="Leyenda de colores">
                <span className="kid-chip" style={{ backgroundColor: STATUS_ACCENT.ok.bg, color: STATUS_ACCENT.ok.fg }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_PRESENTE }} /> Presente
                </span>
                <span className="kid-chip" style={{ backgroundColor: STATUS_ACCENT.bad.bg, color: STATUS_ACCENT.bad.fg }}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_AUSENTE }} /> Ausente
                </span>
                <span className="kid-chip bg-[#f1ecdf] text-monserrat-ink/60">
                  <span className="h-2.5 w-2.5 rounded-full bg-monserrat-ink/25" /> Sin registro
                </span>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mesesConDatos.map(({ year, month }, mi) => {
                const cells = buildMonthCells(year, month, registrosPorFecha);
                return (
                  <div
                    key={`${year}-${month}`}
                    className="kid-pop rounded-[20px] border-2 border-[#d8a842]/25 bg-[#fffaf0] p-4"
                    style={rise(mi)}
                  >
                    <p className="text-[15px] font-black capitalize text-monserrat-ink">{monthLabel(year, month)}</p>
                    <div className="mt-3 grid grid-cols-7 gap-1.5">
                      {DIAS_SEMANA.map((d, i) => (
                        <span key={i} className="text-center text-[11px] font-black uppercase text-monserrat-ink/45">
                          {d}
                        </span>
                      ))}
                      {cells.map((cell, i) => {
                        if (cell.day === null) return <span key={i} />;
                        const tone =
                          cell.estado === "PRESENTE" ? STATUS_ACCENT.ok : cell.estado === "AUSENTE" ? STATUS_ACCENT.bad : undefined;
                        return (
                          <span
                            key={i}
                            title={cell.estado ? `${cell.day} · ${labelFromEnum(cell.estado)}` : `${cell.day} · Sin registro`}
                            className="flex aspect-square items-center justify-center rounded-[10px] text-[12px] font-black"
                            style={{
                              backgroundColor: tone ? tone.bg : "rgb(31 27 24 / 0.05)",
                              color: tone ? tone.fg : "rgb(31 27 24 / 0.38)",
                              border: tone ? `1.5px solid ${tone.ring}` : "1.5px solid transparent"
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

          {/* Actividad reciente */}
          <div className="kid-card kid-rise p-5" style={rise(4)}>
            <p className="text-lg font-black text-monserrat-ink">Últimos días</p>
            <div className="mt-3 grid gap-2">
              {recientes.map((a) => {
                const ok = a.estado === "PRESENTE";
                const tone = ok ? STATUS_ACCENT.ok : STATUS_ACCENT.bad;
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[16px] px-3 py-2.5"
                    style={{ backgroundColor: tone.bg }}
                  >
                    <span className="kid-chip !px-3" style={{ backgroundColor: "#fff", color: tone.fg, border: `1.5px solid ${tone.ring}` }}>
                      {ok ? <UserCheck size={14} /> : <UserX size={14} />}
                      {labelFromEnum(a.estado)}
                    </span>
                    <span className="text-sm font-black text-monserrat-ink">{a.fecha}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-monserrat-ink/60">{a.docenteNombre || "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AlumnoAsistencias;
