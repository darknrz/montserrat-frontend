import React, { useEffect, useMemo, useState } from "react";
import { MascotaSigue } from "../../ui/MascotaSigue";
import { AlertTriangle, Camera, CheckCircle2, GraduationCap, IdCard, KeyRound, Layers, Lightbulb, Mail, Phone, RefreshCw, Users2 } from "lucide-react";
import { monserratApi } from "../../../api/monserrat";
import type { PerfilAcademico, PensionEstado } from "../../../types";
import { STATUS_ACCENT, accentFor, primerNombre, rise, saludo } from "./kidTheme";

function labelFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Estados de matrícula conocidos, cada uno con su propio color — el color dice el
// estado antes de leer la palabra.
const ESTADO_MATRICULA_COLOR: Record<string, string> = {
  MATRICULADO: "#2f6b45",
  RETIRADO: "#9f171b",
  TRASLADADO: "#8a6a14",
  EGRESADO: "#2c5d8f"
};

function colorEstadoMatricula(estado?: string) {
  if (!estado) return "rgb(31 27 24 / 0.5)";
  return ESTADO_MATRICULA_COLOR[estado] ?? "rgb(31 27 24 / 0.5)";
}

function DetailChip({ icon, label, value, index }: { icon: React.ReactNode; label: string; value: string; index: number }) {
  const accent = accentFor(label);
  return (
    <div className="kid-pop flex items-center gap-3 rounded-[20px] border-2 border-[#d8a842]/25 bg-[#fffaf0] p-3.5" style={rise(index)}>
      <span className="kid-icon-badge !h-11 !w-11 !rounded-[14px]" style={{ backgroundColor: accent.bg, color: accent.fg }}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-monserrat-ink/55">{label}</p>
        <p className="truncate text-[15px] font-black text-monserrat-ink">{value}</p>
      </div>
    </div>
  );
}

export function AlumnoPerfil({ token }: { token: string }) {
  const [perfil, setPerfil] = useState<PerfilAcademico | null>(null);
  const [pension, setPension] = useState<PensionEstado | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);

  useEffect(() => {
    if (!token) return;

    void Promise.all([monserratApi.perfilAcademico(token), monserratApi.pensionAlumno(token)])
      .then(([perfilData, pensionData]) => {
        setPerfil(perfilData);
        setPension(pensionData);
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : String(error)));
  }, [token]);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    setIsUploading(true);
    setStatus(null);
    try {
      const uploaded = await monserratApi.uploadMedia(file, "academico", token);
      const updated = await monserratApi.updatePerfilAcademico({ fotoUrl: uploaded.secureUrl }, token);
      setPerfil(updated);
      setStatus("Foto de perfil actualizada correctamente.");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = "";
    }
  };

  const handleRegenerateChatbotCode = async () => {
    if (!token) return;
    setIsRegeneratingCode(true);
    setStatus(null);
    try {
      const updated = await monserratApi.regenerarCodigoChatbot(token);
      setPerfil(updated);
      setStatus("Codigo de seguridad del chatbot actualizado.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setIsRegeneratingCode(false);
    }
  };

  const details = useMemo(() => {
    if (!perfil) return [];
    return [
      { label: "DNI", value: perfil.dni, icon: <IdCard size={20} /> },
      { label: "Nivel educativo", value: perfil.nivelEducativo ? labelFromEnum(perfil.nivelEducativo) : "-", icon: <GraduationCap size={20} /> },
      { label: "Grado", value: perfil.grado ? labelFromEnum(perfil.grado.replace(/_PRIMARIA|_SECUNDARIA/g, "")) : "-", icon: <Layers size={20} /> },
      { label: "Sección", value: perfil.seccion || "-", icon: <Users2 size={20} /> },
      { label: "Teléfono", value: perfil.telefono || "-", icon: <Phone size={20} /> },
      { label: "Correo", value: perfil.correo || "-", icon: <Mail size={20} /> }
    ];
  }, [perfil]);

  if (!perfil) {
    return (
      <div className="kid-card grid place-items-center gap-3 p-10 text-center" role="status">
        <MascotaSigue className="kid-bob h-24 w-auto" />
        <p className="text-lg font-black text-monserrat-ink">Cargando tu perfil…</p>
      </div>
    );
  }

  const colorMatricula = colorEstadoMatricula(perfil.estadoMatricula);
  const pensionAlDia = pension?.pagada ?? null;
  const nombrePila = primerNombre(perfil.nombre);

  return (
    <div className="grid gap-5">
      <div className="kid-rise">
        <h3 className="text-2xl font-black text-monserrat-ink">Mi perfil</h3>
        <p className="mt-1 text-[15px] font-semibold text-monserrat-ink/60">Tus datos personales y académicos.</p>
      </div>

      {status && (
        <div role="status" className="rounded-2xl border-2 border-[#a9d4b7] bg-[#e5f3ea] px-4 py-3 text-sm font-bold text-[#2f6b45]">
          {status}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="kid-card kid-rise overflow-hidden">
          {/* Cabecera con la mascota: saludo cercano y foto grande y redondeada */}
          <div className="relative flex flex-wrap items-center gap-5 bg-gradient-to-br from-[#fbe9e9] via-[#fbf3e1] to-[#fffdf8] px-5 py-6 sm:px-6">
            <div className="relative flex-none">
              {perfil.fotoUrl ? (
                <img
                  src={perfil.fotoUrl}
                  alt={perfil.nombre}
                  className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-[0_8px_24px_rgba(159,23,27,0.2)]"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-monserrat-red text-white shadow-[0_8px_24px_rgba(159,23,27,0.2)]">
                  <span className="text-4xl font-black">{perfil.nombre?.charAt(0) ?? "A"}</span>
                </div>
              )}
              <label
                className={`absolute -bottom-1 -right-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-[#d8a842] text-monserrat-ink shadow-md transition hover:bg-[#c99a35] focus-within:outline focus-within:outline-2 focus-within:outline-monserrat-red ${
                  isUploading ? "pointer-events-none opacity-60" : ""
                }`}
                title="Cambiar foto"
              >
                <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} disabled={isUploading} aria-label="Cambiar foto de perfil" />
                <Camera size={18} />
              </label>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-monserrat-red">
                {saludo()}{nombrePila ? `, ${nombrePila}` : ""}!
              </p>
              <h3 className="mt-1 break-words text-2xl font-black leading-tight text-monserrat-ink sm:text-3xl">{perfil.nombre}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="kid-chip bg-white text-monserrat-ink/70">
                  {perfil.nivelEducativo ? labelFromEnum(perfil.nivelEducativo) : "Nivel no definido"}
                </span>
                {perfil.estadoMatricula && (
                  <span className="kid-chip" style={{ backgroundColor: `${colorMatricula}1a`, color: colorMatricula }}>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorMatricula }} />
                    {labelFromEnum(perfil.estadoMatricula)}
                  </span>
                )}
              </div>
              {isUploading && <p className="mt-2 text-sm font-bold text-monserrat-ink/55">Subiendo foto…</p>}
            </div>

            <MascotaSigue className="kid-bob pointer-events-none hidden h-28 w-auto xl:block" />
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
            {details.map((item, i) => (
              <DetailChip key={item.label} icon={item.icon} label={item.label} value={item.value} index={i} />
            ))}
          </div>
        </div>

        <div className="grid content-start gap-5">
          <div className="kid-card kid-rise p-5" style={rise(1)}>
            <p className="flex items-center gap-2 text-lg font-black text-monserrat-ink">
              <span className="kid-icon-badge !h-10 !w-10 !rounded-[12px]" style={{ backgroundColor: STATUS_ACCENT.warn.bg, color: STATUS_ACCENT.warn.fg }}>
                <KeyRound size={18} />
              </span>
              Código del chatbot
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <code className="rounded-[14px] border-2 border-dashed border-[#d8a842] bg-[#fbf3e1] px-4 py-2.5 text-xl font-black tracking-[0.18em] text-monserrat-ink">
                {perfil.codigoChatbot || "PENDIENTE"}
              </code>
              <button
                type="button"
                onClick={handleRegenerateChatbotCode}
                disabled={isRegeneratingCode}
                className="kid-btn-soft disabled:opacity-60"
              >
                <RefreshCw size={16} className={isRegeneratingCode ? "animate-spin" : ""} />
                {isRegeneratingCode ? "Generando..." : "Regenerar"}
              </button>
            </div>
            <p className="mt-3 text-[14px] font-semibold leading-6 text-monserrat-ink/65">
              El chatbot pedira tu nombre completo, DNI o codigo institucional junto con este codigo para responder sobre tus notas, asistencia o pension.
            </p>
          </div>

          <div className="kid-card kid-rise p-5" style={rise(2)}>
            <h4 className="text-lg font-black text-monserrat-ink">Resumen financiero</h4>
            <div
              className="mt-3 rounded-[20px] border-2 p-4"
              style={{
                backgroundColor: pensionAlDia === null ? "#f6f1e6" : pensionAlDia ? STATUS_ACCENT.ok.bg : STATUS_ACCENT.bad.bg,
                borderColor: pensionAlDia === null ? "#e8dcc0" : pensionAlDia ? STATUS_ACCENT.ok.ring : STATUS_ACCENT.bad.ring
              }}
            >
              <p className="text-[13px] font-bold text-monserrat-ink/60">Pensión actual</p>
              <div className="mt-1 flex items-center gap-2.5">
                {pensionAlDia === null ? null : pensionAlDia ? (
                  <CheckCircle2 size={26} className="text-[#2f6b45]" />
                ) : (
                  <AlertTriangle size={26} className="text-[#9f171b]" />
                )}
                <p
                  className="text-3xl font-black"
                  style={{ color: pensionAlDia === null ? "#1f1b18" : pensionAlDia ? "#2f6b45" : "#9f171b" }}
                >
                  {pension ? (pension.pagada ? "Pagada" : "Pendiente") : "Cargando..."}
                </p>
              </div>
              {pension?.observacion && <p className="mt-2 text-sm font-semibold text-monserrat-ink/65">Observación: {pension.observacion}</p>}
            </div>

            <div className="mt-3 flex gap-3 rounded-[20px] border-2 border-[#d8a842]/30 bg-[#fbf3e1] p-4">
              <Lightbulb size={22} className="mt-0.5 flex-none text-[#8a6a14]" />
              <p className="text-[14px] font-semibold leading-6 text-monserrat-ink/75">
                Revisa tu historial de asistencias y notas para confirmar que estás al día. Si tienes dudas sobre tu pensión, contacta con la administración.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AlumnoPerfil;
