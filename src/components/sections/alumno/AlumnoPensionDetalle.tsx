import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Wallet } from "lucide-react";
import { SectionHeader } from "../../ui/SectionHeader";
import { monserratApi } from "../../../api/monserrat";
import type { PensionEstado, PensionMensual } from "../../../types";

const YEARS = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];
const MESES_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Set", "Oct", "Nov", "Dic"];

const COLOR_PAGADA = "#3f7d54";
const COLOR_PENDIENTE = "#9f171b";
const COLOR_PARCIAL = "#d8a842";

// Mismo aro de progreso que "Mis asistencias", reescalado aquí para leer de
// un vistazo qué proporción del año ya está pagada.
function GaugePension({ porcentaje }: { porcentaje: number | null }) {
  const size = 148;
  const stroke = 13;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = ((porcentaje ?? 0) / 100) * circumference;
  const color =
    porcentaje === null ? "rgb(31 27 24 / 0.16)" : porcentaje === 100 ? COLOR_PAGADA : porcentaje >= 50 ? COLOR_PARCIAL : COLOR_PENDIENTE;

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
        <span className="text-3xl font-black" style={{ color: porcentaje === null ? "#1f1b18" : color }}>
          {porcentaje === null ? "—" : `${porcentaje}%`}
        </span>
        <span className="text-[9px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">del año pagado</span>
      </div>
    </div>
  );
}

function StatChip({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string | number; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-monserrat-ink/8 bg-monserrat-cream/30 px-4 py-3">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px]" style={{ backgroundColor: `${tone}18`, color: tone }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-black leading-tight text-monserrat-ink">{value}</p>
        <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">{label}</p>
      </div>
    </div>
  );
}

export function AlumnoPensionDetalle({ token }: { token: string }) {
  const [pensionesDetalle, setPensionesDetalle] = useState<PensionMensual[]>([]);
  const [pensionYear, setPensionYear] = useState<number>(new Date().getFullYear());
  const [pensionEstado, setPensionEstado] = useState<PensionEstado | null>(null);
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
    <div className="grid gap-4">
      <SectionHeader title="Pensiones" description="Detalle de pagos de pensiones mensuales." align="left" />
      {status && <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{status}</div>}

      {/* Hero: aro de progreso del año + estado general + selector de año como
          pastillas, en vez de un <select> nativo perdido entre las tarjetas. */}
     
      {/* Tira del año: los 12 meses como casilleros de calendario, para ver el
          patrón de pagos de un vistazo en vez de leer 12 tarjetas de texto. */}
      <div className="rounded-[20px] border border-monserrat-ink/10 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/40">Línea del año {pensionYear}</p>
        {pensionesDetalle.length === 0 ? (
          <div className="mt-4 rounded-[16px] border border-dashed border-monserrat-ink/15 bg-monserrat-cream/30 p-6 text-center text-sm text-monserrat-ink/50">
            No hay datos de pensiones para este año.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-4 gap-2.5 sm:grid-cols-6 lg:grid-cols-12">
            {MESES_LABELS.map((label, idx) => {
              const registro = registroPorMes.get(idx + 1);
              const color = !registro ? undefined : registro.pagada ? COLOR_PAGADA : COLOR_PENDIENTE;
              return (
                <div
                  key={label}
                  title={registro ? (registro.pagada ? `${label}: pagada` : `${label}: pendiente`) : `${label}: sin datos`}
                  className="flex flex-col items-center gap-1.5 rounded-[12px] border border-monserrat-ink/8 bg-monserrat-cream/25 py-3"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-black"
                    style={{ backgroundColor: color ? `${color}1f` : "rgb(31 27 24 / 0.06)", color: color ?? "rgb(31 27 24 / 0.3)" }}
                  >
                    {registro ? (registro.pagada ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />) : "—"}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wide text-monserrat-ink/45">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detalle de pendientes: solo los meses que necesitan atención, con su
          observación completa (la tira de arriba no tiene espacio para texto). */}
      {pendientesConDetalle.length > 0 && (
        <div className="rounded-[20px] border border-monserrat-red/20 bg-white p-5 shadow-sm">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">
            <AlertTriangle size={12} /> Meses pendientes
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {pendientesConDetalle.map((p) => (
              <div key={p.mes} className="rounded-[14px] border border-monserrat-red/15 bg-monserrat-red/5 p-3.5">
                <p className="text-xs font-black text-monserrat-ink">{MESES_LABELS[p.mes - 1] || `Mes ${p.mes}`}</p>
                {p.observacion && <p className="mt-1 text-xs text-monserrat-ink/60">{p.observacion}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AlumnoPensionDetalle;