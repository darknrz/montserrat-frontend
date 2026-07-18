import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, GraduationCap, IdCard, Layers, Lightbulb, Mail, Phone, Users2 } from "lucide-react";
import { SectionHeader } from "../../ui/SectionHeader";
import { monserratApi } from "../../../api/monserrat";
import type { PerfilAcademico, PensionEstado } from "../../../types";

function labelFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

// Estados de matrícula conocidos, cada uno con su propio color — el mismo
// principio que "presente/ausente" en asistencias: el color dice el estado
// antes de leer la palabra.
const ESTADO_MATRICULA_COLOR: Record<string, string> = {
  MATRICULADO: "#3f7d54",
  RETIRADO: "#9f171b",
  TRASLADADO: "#d8a842",
  EGRESADO: "#5b6b8c"
};

function colorEstadoMatricula(estado?: string) {
  if (!estado) return "rgb(31 27 24 / 0.35)";
  return ESTADO_MATRICULA_COLOR[estado] ?? "rgb(31 27 24 / 0.35)";
}

function DetailChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-monserrat-ink/8 bg-monserrat-cream/50 p-4">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-white text-monserrat-ink/50 shadow-sm">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-monserrat-ink/40">{label}</p>
        <p className="truncate text-sm font-black text-monserrat-ink">{value}</p>
      </div>
    </div>
  );
}

export function AlumnoPerfil({ token }: { token: string }) {
  const [perfil, setPerfil] = useState<PerfilAcademico | null>(null);
  const [pension, setPension] = useState<PensionEstado | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const details = useMemo(() => {
    if (!perfil) return [];
    return [
      { label: "DNI", value: perfil.dni, icon: <IdCard size={16} /> },
      { label: "Nivel educativo", value: perfil.nivelEducativo ? labelFromEnum(perfil.nivelEducativo) : "-", icon: <GraduationCap size={16} /> },
      { label: "Grado", value: perfil.grado ? labelFromEnum(perfil.grado.replace(/_PRIMARIA|_SECUNDARIA/g, "")) : "-", icon: <Layers size={16} /> },
      { label: "Sección", value: perfil.seccion || "-", icon: <Users2 size={16} /> },
      { label: "Teléfono", value: perfil.telefono || "-", icon: <Phone size={16} /> },
      { label: "Correo", value: perfil.correo || "-", icon: <Mail size={16} /> }
    ];
  }, [perfil]);

  if (!perfil) return <div className="rounded-[12px] bg-white p-4">Cargando perfil del alumno...</div>;

  const colorMatricula = colorEstadoMatricula(perfil.estadoMatricula);
  const pensionAlDia = pension?.pagada ?? null;

  return (
    <div className="grid gap-4">
      <SectionHeader title="Perfil alumno" description="Datos personales y académicos." align="left" />

      {status && <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{status}</div>}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[18px] border border-monserrat-ink/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4 md:items-start">
            {/* La foto lleva su propio botón de cámara superpuesto en vez de un
                botón "Cambiar foto" aparte, como en la mayoría de apps con perfil. */}
            <div className="relative flex-none">
              {perfil.fotoUrl ? (
                <img src={perfil.fotoUrl} alt={perfil.nombre} className="h-24 w-24 rounded-[18px] object-cover shadow-sm" />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-[18px] bg-monserrat-red text-white">
                  <span className="text-3xl font-black">{perfil.nombre?.charAt(0) ?? "A"}</span>
                </div>
              )}
              <label
                className={`absolute -bottom-2 -right-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-monserrat-ink text-white shadow-sm transition hover:bg-monserrat-red ${
                  isUploading ? "pointer-events-none opacity-60" : ""
                }`}
                title="Cambiar foto"
              >
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} />
                <Camera size={15} />
              </label>
            </div>

            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.2em] text-monserrat-ink/50">Alumno</p>
              <h3 className="mt-2 truncate text-3xl font-black text-monserrat-ink">{perfil.nombre}</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-monserrat-ink/60">{perfil.nivelEducativo ? labelFromEnum(perfil.nivelEducativo) : "Nivel no definido"}</span>
                {perfil.estadoMatricula && (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
                    style={{ backgroundColor: `${colorMatricula}18`, color: colorMatricula }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorMatricula }} />
                    {labelFromEnum(perfil.estadoMatricula)}
                  </span>
                )}
              </div>
              {isUploading && <p className="mt-2 text-xs font-semibold text-monserrat-ink/40">Subiendo foto…</p>}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {details.map((item) => (
              <DetailChip key={item.label} icon={item.icon} label={item.label} value={item.value} />
            ))}
          </div>
        </div>

        <div className="rounded-[18px] border border-monserrat-ink/10 bg-monserrat-cream/40 p-5 shadow-sm">
          <h4 className="text-lg font-black text-monserrat-ink">Resumen financiero</h4>
          <div className="mt-5 space-y-4">
            <div className="rounded-[16px] bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-monserrat-ink/40">Pensión actual</p>
              <div className="mt-2 flex items-center gap-2.5">
                {pensionAlDia === null ? null : pensionAlDia ? (
                  <CheckCircle2 size={22} className="text-[#3f7d54]" />
                ) : (
                  <AlertTriangle size={22} className="text-monserrat-red" />
                )}
                <p
                  className="text-3xl font-black"
                  style={{ color: pensionAlDia === null ? "#1f1b18" : pensionAlDia ? "#3f7d54" : "#9f171b" }}
                >
                  {pension ? (pension.pagada ? "Pagada" : "Pendiente") : "Cargando..."}
                </p>
              </div>
              {pension?.observacion && <p className="mt-2 text-sm text-monserrat-ink/60">Observación: {pension.observacion}</p>}
            </div>
            <div className="rounded-[16px] bg-white p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-monserrat-ink/40">
                <Lightbulb size={12} /> Sugerencia
              </p>
              <p className="mt-2 text-sm leading-6 text-monserrat-ink/70">
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