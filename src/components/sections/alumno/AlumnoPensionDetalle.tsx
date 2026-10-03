import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardList, Hammer, Wallet } from "lucide-react";
import { monserratApi } from "../../../api/monserrat";
import { useAnioActivo } from "../../../hooks/useAnioActivo";
import type { Matricula, PensionEstado, PensionMensual, Taller } from "../../../types";
import { STATUS_ACCENT, rise } from "./kidTheme";

const MESES_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

const COLOR_PAGADA = STATUS_ACCENT.ok.fg;
const COLOR_PENDIENTE = STATUS_ACCENT.bad.fg;
const COLOR_PARCIAL = STATUS_ACCENT.warn.fg;

// Aro de progreso: qué proporción del año ya está pagada.
function GaugePension({ porcentaje }: { porcentaje: number | null }) {
  const size = 152;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = ((porcentaje ?? 0) / 100) * circumference;
  const color =
    porcentaje === null ? "rgb(31 27 24 / 0.16)" : porcentaje === 100 ? COLOR_PAGADA : porcentaje >= 50 ? COLOR_PARCIAL : COLOR_PENDIENTE;

  return (
    <div
      className="relative mx-auto flex-none"
      style={{ height: size, width: size }}
      role="img"
      aria-label={porcentaje === null ? "Sin datos de pagos" : `${porcentaje} por ciento del año pagado`}
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
        <span className="text-3xl font-black" style={{ color: porcentaje === null ? "#1f1b18" : color }}>
          {porcentaje === null ? "—" : `${porcentaje}%`}
        </span>
        <span className="text-[11px] font-black uppercase tracking-[0.1em] text-monserrat-ink/50">del año pagado</span>
      </div>
    </div>
  );
}

function StatusPill({ ok, okLabel, pendingLabel, size = 14 }: { ok: boolean; okLabel: string; pendingLabel: string; size?: number }) {
  const tone = ok ? STATUS_ACCENT.ok : STATUS_ACCENT.warn;
  return (
    <span className="kid-chip" style={{ backgroundColor: tone.bg, color: tone.fg, border: `1.5px solid ${tone.ring}` }}>
      {ok ? <CheckCircle2 size={size} /> : <AlertTriangle size={size} />}
      {ok ? okLabel : pendingLabel}
    </span>
  );
}

export function AlumnoPensionDetalle({ token }: { token: string }) {
  const [pensionesDetalle, setPensionesDetalle] = useState<PensionMensual[]>([]);
  const anioActivo = useAnioActivo(token);
  const YEARS = [anioActivo, anioActivo - 1, anioActivo - 2];
  const [pensionYear, setPensionYear] = useState<number>(anioActivo);
  useEffect(() => setPensionYear(anioActivo), [anioActivo]);
  const [pensionEstado, setPensionEstado] = useState<PensionEstado | null>(null);
  const [matricula, setMatricula] = useState<Matricula | null>(null);
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void Promise.all([monserratApi.pensionesAlumnoDetalle(pensionYear, token), monserratApi.pensionAlumno(token)])
      .then(([detalle, estado]) => {
        setPensionesDetalle(detalle);
        setPensionEstado(estado);
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : String(error)));
  }, [token, pensionYear]);

  useEffect(() => {
    if (!token) return;
    void Promise.all([monserratApi.matriculaAlumno(pensionYear, token), monserratApi.talleresAlumno(token)])
      .then(([matriculaData, talleresData]) => {
        setMatricula(matriculaData);
        setTalleres(talleresData);
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : String(error)));
  }, [token, pensionYear]);

  const talleresDelAnio = useMemo(() => talleres.filter((t) => t.anio === pensionYear), [talleres, pensionYear]);

  const acumulado = useMemo(() => {
    const pagos = pensionesDetalle.filter((p) => p.pagada).length;
    const total = pensionesDetalle.length;
    return {
      total,
      pagadas: pagos,
      pendientes: total - pagos,
      porcentaje: total === 0 ? null : Math.round((pagos / total) * 100)
    };
  }, [pensionesDetalle]);

  // Mapa mes -> registro, para pintar la tira de 12 casilleros sin importar
  // en qué orden vino la respuesta del backend.
  const registroPorMes = useMemo(() => {
    const map = new Map<number, PensionMensual>();
    pensionesDetalle.forEach((p) => map.set(p.mes, p));
    return map;
  }, [pensionesDetalle]);

  const pendientesConDetalle = useMemo(() => pensionesDetalle.filter((p) => !p.pagada), [pensionesDetalle]);

  const pensionAlDia = pensionEstado?.pagada ?? null;

  return (
    <div className="grid gap-5">
      <div className="kid-rise flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-2xl font-black text-monserrat-ink">Mis pagos</h3>
          <p className="mt-1 text-[15px] font-semibold text-monserrat-ink/60">Matrícula, talleres y pensiones de cada mes.</p>
        </div>
        {/* Selector de año como pastillas grandes, fáciles de tocar */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Año">
          {YEARS.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => setPensionYear(y)}
              aria-pressed={pensionYear === y}
              className={`inline-flex min-h-[44px] min-w-[72px] items-center justify-center rounded-full border-2 px-4 text-sm font-black ${
                pensionYear === y
                  ? "border-monserrat-red bg-monserrat-red text-white shadow-[0_6px_16px_rgba(159,23,27,0.25)]"
                  : "border-[#d8a842]/40 bg-white text-monserrat-ink/70 hover:border-monserrat-red/40"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {status && (
        <div role="alert" className="rounded-2xl border-2 border-[#e9b3b4] bg-[#fbe9e9] px-4 py-3 text-sm font-bold text-[#9f171b]">
          {status}
        </div>
      )}

      {/* Resumen del año: aro + estado general */}
      <div className="kid-card kid-rise grid gap-5 p-5 sm:p-6 md:grid-cols-[auto_1fr] md:items-center">
        <GaugePension porcentaje={acumulado.porcentaje} />
        <div className="grid gap-3">
          <div>
            <p className="text-2xl font-black text-monserrat-ink sm:text-3xl">
              {acumulado.total === 0 ? (
                "Aún no hay pensiones este año"
              ) : (
                <>
                  Pagaste <span style={{ color: COLOR_PAGADA }}>{acumulado.pagadas}</span> de {acumulado.total} meses
                </>
              )}
            </p>
            <p className="mt-1 flex items-center gap-2 text-[15px] font-bold" style={{ color: pensionAlDia === false ? COLOR_PENDIENTE : COLOR_PAGADA }}>
              <Wallet size={18} />
              {pensionAlDia === null
                ? "Revisando tu pensión actual…"
                : pensionAlDia
                ? "¡Tu pensión actual está al día!"
                : "Tu pensión actual está pendiente."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="kid-chip" style={{ backgroundColor: STATUS_ACCENT.ok.bg, color: STATUS_ACCENT.ok.fg }}>
              <CheckCircle2 size={14} /> {acumulado.pagadas} pagados
            </span>
            <span className="kid-chip" style={{ backgroundColor: STATUS_ACCENT.bad.bg, color: STATUS_ACCENT.bad.fg }}>
              <AlertTriangle size={14} /> {acumulado.pendientes} pendientes
            </span>
          </div>
        </div>
      </div>

      {/* Matrícula (pago único anual) y talleres */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="kid-card kid-card-hover kid-rise p-5" style={rise(1)}>
          <div className="flex items-center gap-3">
            <span className="kid-icon-badge" style={{ backgroundColor: STATUS_ACCENT.info.bg, color: STATUS_ACCENT.info.fg }}>
              <ClipboardList size={24} />
            </span>
            <p className="text-lg font-black text-monserrat-ink">Matrícula {pensionYear}</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-black text-monserrat-ink">
                {matricula?.monto != null ? `S/ ${Number(matricula.monto).toFixed(2)}` : "Sin monto asignado"}
              </p>
              {matricula?.observacion && <p className="mt-1 text-[13px] font-semibold text-monserrat-ink/60">{matricula.observacion}</p>}
            </div>
            <StatusPill ok={Boolean(matricula?.pagada)} okLabel="Matriculado" pendingLabel="Pendiente" />
          </div>
        </div>

        <div className="kid-card kid-card-hover kid-rise p-5" style={rise(2)}>
          <div className="flex items-center gap-3">
            <span className="kid-icon-badge" style={{ backgroundColor: STATUS_ACCENT.warn.bg, color: STATUS_ACCENT.warn.fg }}>
              <Hammer size={24} />
            </span>
            <p className="text-lg font-black text-monserrat-ink">Talleres {pensionYear}</p>
          </div>
          {talleresDelAnio.length === 0 ? (
            <p className="mt-4 rounded-[16px] border-2 border-dashed border-[#d8a842]/40 bg-[#fffaf0] p-4 text-center text-[14px] font-semibold text-monserrat-ink/60">
              No tienes talleres registrados este año.
            </p>
          ) : (
            <div className="mt-4 grid gap-2">
              {talleresDelAnio.map((taller) => (
                <div key={taller.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] bg-[#fffaf0] px-3 py-2.5 ring-1 ring-[#d8a842]/30">
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-black text-monserrat-ink">{taller.nombre}</p>
                    <p className="text-[13px] font-semibold text-monserrat-ink/60">S/ {Number(taller.monto).toFixed(2)}</p>
                  </div>
                  <StatusPill ok={Boolean(taller.pagada)} okLabel="Pagado" pendingLabel="Pendiente" size={13} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Los 12 meses como tarjetas tipo semáforo: el patrón de pagos se ve de un vistazo */}
      <div className="kid-card kid-rise p-5" style={rise(3)}>
        <p className="text-lg font-black text-monserrat-ink">Pensión mes a mes · {pensionYear}</p>
        {pensionesDetalle.length === 0 ? (
          <div className="mt-4 grid place-items-center gap-2 rounded-[20px] border-2 border-dashed border-[#d8a842]/40 bg-[#fffaf0] p-8 text-center">
            <Wallet size={28} className="text-[#8a6a14]" />
            <p className="text-[15px] font-bold text-monserrat-ink/65">No hay datos de pensiones para este año.</p>
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {MESES_LABELS.map((label, idx) => {
                const registro = registroPorMes.get(idx + 1);
                const tone = !registro ? undefined : registro.pagada ? STATUS_ACCENT.ok : STATUS_ACCENT.bad;
                return (
                  <div
                    key={label}
                    title={registro ? (registro.pagada ? `${label}: pagada` : `${label}: pendiente`) : `${label}: sin datos`}
                    className="kid-pop flex flex-col items-center gap-1.5 rounded-[20px] border-2 px-2 py-3.5"
                    style={{
                      ...rise(idx),
                      backgroundColor: tone ? tone.bg : "#f6f1e6",
                      borderColor: tone ? tone.ring : "#e8dcc0"
                    }}
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm"
                      style={{ color: tone ? tone.fg : "rgb(31 27 24 / 0.35)" }}
                    >
                      {registro ? registro.pagada ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} /> : "—"}
                    </span>
                    <span className="text-[15px] font-black text-monserrat-ink">{label}</span>
                    <span className="text-[12px] font-bold" style={{ color: tone ? tone.fg : "rgb(31 27 24 / 0.5)" }}>
                      {registro ? (registro.pagada ? "Pagada" : "Pendiente") : "Sin datos"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] font-bold" aria-label="Leyenda de colores">
              <span className="kid-chip" style={{ backgroundColor: STATUS_ACCENT.ok.bg, color: STATUS_ACCENT.ok.fg }}>
                <CheckCircle2 size={13} /> Pagada
              </span>
              <span className="kid-chip" style={{ backgroundColor: STATUS_ACCENT.bad.bg, color: STATUS_ACCENT.bad.fg }}>
                <AlertTriangle size={13} /> Pendiente
              </span>
              <span className="kid-chip bg-[#f1ecdf] text-monserrat-ink/60">— Sin datos</span>
            </div>
          </>
        )}
      </div>

      {/* Detalle de pendientes: solo los meses que necesitan atención, con su observación completa. */}
      {pendientesConDetalle.length > 0 && (
        <div className="kid-card kid-rise p-5" style={{ ...rise(4), borderColor: STATUS_ACCENT.bad.ring }}>
          <p className="flex items-center gap-2 text-lg font-black text-[#9f171b]">
            <AlertTriangle size={20} /> Meses pendientes
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {pendientesConDetalle.map((p) => (
              <div key={p.mes} className="rounded-[18px] border-2 p-3.5" style={{ backgroundColor: STATUS_ACCENT.bad.bg, borderColor: STATUS_ACCENT.bad.ring }}>
                <p className="text-[15px] font-black text-monserrat-ink">{MESES_LABELS[p.mes - 1] || `Mes ${p.mes}`}</p>
                {p.observacion && <p className="mt-1 text-[13px] font-semibold text-monserrat-ink/70">{p.observacion}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AlumnoPensionDetalle;
