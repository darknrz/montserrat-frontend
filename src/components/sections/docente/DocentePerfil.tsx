import React, { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../../ui/SectionHeader";
import { monserratApi } from "../../../api/monserrat";
import type { PerfilAcademico } from "../../../types";

function labelFromEnum(value?: string | null) {
  if (!value) return "No asignado";

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateValue(value?: string | null) {
  if (!value) return "No registrado";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

export function DocentePerfil({ token }: { token: string }) {
  const [perfil, setPerfil] = useState<PerfilAcademico | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    direccion: "",
    materia: "",
    especialidad: ""
  });

  const loadPerfil = async () => {
    if (!token) return;

    try {
      const data = await monserratApi.perfilAcademico(token);
      setPerfil(data);
      setFormData({
        nombre: data.nombre || "",
        correo: data.correo || "",
        telefono: data.telefono || "",
        direccion: data.direccion || "",
        materia: data.materia || "",
        especialidad: data.especialidad || ""
      });
      setStatus(null);
    } catch (error) {
      setStatus(String(error));
    }
  };

  useEffect(() => {
    void loadPerfil();
  }, [token]);

  const profileDetails = useMemo(() => {
    if (!perfil) return [];
    return [
      { label: "Código docente", value: perfil.codigo || "No asignado" },
      { label: "Nivel educativo", value: perfil.nivelEducativo ? labelFromEnum(perfil.nivelEducativo) : "No asignado" },
      { label: "Grado", value: perfil.grado ? labelFromEnum(perfil.grado.replace(/_PRIMARIA|_SECUNDARIA/g, "")) : "No asignado" },
      { label: "Sección", value: perfil.seccion || "No asignado" },
      { label: "Materia", value: perfil.materia || "No asignada" },
      { label: "Especialidad", value: perfil.especialidad || "No registrada" }
    ];
  }, [perfil]);

  const keyFacts = useMemo(() => {
    if (!perfil) return [];

    return [
      { label: "Correo", value: perfil.correo || "Sin correo registrado" },
      { label: "Teléfono", value: perfil.telefono || "Sin teléfono registrado" },
      { label: "Dirección", value: perfil.direccion || "Sin dirección registrada" },
      { label: "Inicio de periodo", value: formatDateValue(perfil.inicioPeriodo) },
      { label: "Registro", value: formatDateValue(perfil.createdAt) },
      { label: "Estado", value: perfil.estado ? labelFromEnum(perfil.estado) : "No disponible" }
    ];
  }, [perfil]);

  const buildProfilePayload = (overrides: Partial<Record<keyof typeof formData | "fotoUrl", string>> = {}) => {
    if (!perfil) return {};

    return {
      nombre: overrides.nombre ?? (formData.nombre.trim() || perfil.nombre),
      correo: overrides.correo ?? (formData.correo.trim() || perfil.correo || undefined),
      telefono: overrides.telefono ?? (formData.telefono.trim() || perfil.telefono || undefined),
      direccion: overrides.direccion ?? (formData.direccion.trim() || perfil.direccion || undefined),
      materia: overrides.materia ?? (formData.materia.trim() || perfil.materia || undefined),
      especialidad: overrides.especialidad ?? (formData.especialidad.trim() || perfil.especialidad || undefined),
      fotoUrl: overrides.fotoUrl ?? perfil.fotoUrl,
      nivelEducativo: perfil.nivelEducativo,
      grado: perfil.grado,
      seccion: perfil.seccion,
      estadoMatricula: perfil.estadoMatricula,
      codigo: perfil.codigo,
      estado: perfil.estado,
      activo: perfil.activo
    };
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!perfil) return;

    setIsSaving(true);
    setStatus(null);

    try {
      const updated = await monserratApi.updatePerfilAcademico(buildProfilePayload(), token);

      setPerfil(updated);
      setIsEditing(false);
      setStatus("Perfil actualizado correctamente.");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !token) return;

    setIsUploading(true);
    setStatus(null);

    try {
      const uploaded = await monserratApi.uploadMedia(file, "docentes", token);
      const updated = await monserratApi.updatePerfilAcademico(buildProfilePayload({ fotoUrl: uploaded.secureUrl }), token);
      setPerfil(updated);
      setStatus("Foto de perfil actualizada correctamente.");
    } catch (error) {
      setStatus(String(error));
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  if (!perfil) {
    return <div className="rounded-xl bg-white p-4">Cargando perfil del docente...</div>;
  }

  return (
    <div className="grid gap-4">
      <SectionHeader title="Perfil docente" description="Consulta y actualiza tus datos personales, contacto y formación académica." align="left" />
      <div className="grid gap-4 rounded-[20px] border border-monserrat-ink/10 bg-white p-5 shadow-sm xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <div className="rounded-[18px] bg-monserrat-cream/60 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex items-center gap-4">
                {perfil.fotoUrl ? (
                  <img src={perfil.fotoUrl} alt={perfil.nombre} className="h-24 w-24 rounded-[18px] object-cover shadow-sm" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-[18px] bg-monserrat-red text-white shadow-sm">
                    <span className="text-2xl font-black">{perfil.nombre?.charAt(0) ?? "D"}</span>
                  </div>
                )}
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-monserrat-ink/50">Docente</p>
                  <h3 className="mt-2 text-2xl font-black text-monserrat-ink">{perfil.nombre}</h3>
                  <p className="mt-2 text-sm text-monserrat-ink/60">DNI: {perfil.dni}</p>
                  <p className="mt-1 text-sm text-monserrat-ink/60">{perfil.materia ? `Materia: ${perfil.materia}` : "Sin materia asignada"}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <label className="flex cursor-pointer items-center justify-center rounded-[999px] border border-monserrat-ink/10 bg-white px-4 py-2 text-sm font-semibold text-monserrat-ink transition hover:bg-monserrat-cream">
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={isUploading} />
                  {isUploading ? "Subiendo..." : "Cambiar foto"}
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditing((value) => !value)}
                  className="rounded-[999px] bg-monserrat-red px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  {isEditing ? "Cancelar" : "Editar perfil"}
                </button>
              </div>
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveProfile} className="rounded-[18px] border border-monserrat-ink/10 bg-monserrat-cream/40 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-semibold text-monserrat-ink">
                  Nombre
                  <input
                    value={formData.nombre}
                    onChange={(event) => handleInputChange("nombre", event.target.value)}
                    className="rounded-xl border border-monserrat-ink/10 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-monserrat-ink">
                  Correo
                  <input
                    type="email"
                    value={formData.correo}
                    onChange={(event) => handleInputChange("correo", event.target.value)}
                    className="rounded-xl border border-monserrat-ink/10 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-monserrat-ink">
                  Teléfono
                  <input
                    value={formData.telefono}
                    onChange={(event) => handleInputChange("telefono", event.target.value)}
                    className="rounded-xl border border-monserrat-ink/10 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-monserrat-ink">
                  Dirección
                  <input
                    value={formData.direccion}
                    onChange={(event) => handleInputChange("direccion", event.target.value)}
                    className="rounded-xl border border-monserrat-ink/10 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-monserrat-ink">
                  Materia
                  <input
                    value={formData.materia}
                    onChange={(event) => handleInputChange("materia", event.target.value)}
                    className="rounded-xl border border-monserrat-ink/10 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-monserrat-ink">
                  Especialidad
                  <input
                    value={formData.especialidad}
                    onChange={(event) => handleInputChange("especialidad", event.target.value)}
                    className="rounded-xl border border-monserrat-ink/10 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="submit" disabled={isSaving} className="rounded-[999px] bg-monserrat-red px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70">
                  {isSaving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {profileDetails.map((item) => (
                <div key={item.label} className="rounded-2xl border border-monserrat-ink/8 bg-monserrat-cream/50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-monserrat-ink/40">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold text-monserrat-ink">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/40 p-4">
          <h4 className="text-lg font-black text-monserrat-ink">Datos relevantes</h4>
          <p className="mt-3 text-sm leading-6 text-monserrat-ink/70">
            Aquí puedes ver la información más útil para el seguimiento académico y la organización del docente. El sistema toma estos datos directamente del backend para evitar información manual o simulada.
          </p>

          <div className="mt-6 space-y-3">
            {keyFacts.map((item) => (
              <div key={item.label} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-monserrat-ink/40">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-monserrat-ink">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[14px] border border-monserrat-red/10 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-monserrat-red">Sugerencia</p>
            <p className="mt-2 text-sm leading-6 text-monserrat-ink/70">
              Mantén actualizada tu foto y tus datos de contacto para que la información refleje mejor tu identidad institucional.
            </p>
          </div>
        </div>
      </div>

      {status && (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${status.toLowerCase().includes("correctamente") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {status}
        </div>
      )}
    </div>
  );
}

export default DocentePerfil;
