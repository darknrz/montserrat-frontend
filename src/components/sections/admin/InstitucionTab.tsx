import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { Institution } from "../../../types";
import { AdminField, AdminFormBtn, MediaPicker } from "./adminComponents";

type InstitucionTabProps = {
  institution: Institution;
  token: string;
  isBusy: boolean;
  runAdminAction: (action: () => Promise<void>, successMessage: string) => void;
};

// Wrapper de sección reutilizando el mismo lenguaje visual que ConfigPanel /
// SalonConfigPanel: franja oscura con etiqueta + título, cuerpo blanco con padding.
function FormSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8 bg-white shadow-sm">
      <div className="border-b border-monserrat-ink/8 bg-monserrat-ink px-5 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-cream/70">{eyebrow}</p>
        <h4 className="font-serif text-xl font-black text-white">{title}</h4>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function InstitucionTab({
  institution,
  token,
  isBusy,
  runAdminAction,
}: InstitucionTabProps) {
  const [institutionForm, setInstitutionForm] = useState<Institution>(institution);
  const [institutionLogoFile, setInstitutionLogoFile] = useState<File | null>(null);

  useEffect(() => {
    setInstitutionForm(institution);
  }, [institution]);

  const uploadLogo = async () => {
    if (!institutionLogoFile) return institutionForm.logoUrl ?? "";
    return (await monserratApi.uploadMedia(institutionLogoFile, "institution", token)).secureUrl;
  };

  const submitInstitution = (e: FormEvent) => {
    e.preventDefault();
    runAdminAction(async () => {
      const logoUrl = await uploadLogo();
      await monserratApi.updateInstitution(
        institutionForm.id ?? 1,
        { ...institutionForm, logoUrl },
        token
      );
      setInstitutionLogoFile(null);
    }, "Datos institucionales actualizados");
  };

  const institutionLogoPreview = institutionLogoFile
    ? URL.createObjectURL(institutionLogoFile)
    : institutionForm.logoUrl;

  return (
    <form onSubmit={submitInstitution} className="grid gap-4">
      {/* ── Sección 1: datos generales + logo lado a lado ── */}
      <FormSection eyebrow="Institución" title="Datos generales">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px]">
          <div className="grid gap-4 lg:col-span-2 sm:grid-cols-2">
            <AdminField label="Nombre" className="sm:col-span-2">
              <input
                value={institutionForm.nombre}
                onChange={(e) => setInstitutionForm({ ...institutionForm, nombre: e.target.value })}
                className="admin-input"
                required
              />
            </AdminField>
            <AdminField label="Dirección">
              <input
                value={institutionForm.direccion}
                onChange={(e) => setInstitutionForm({ ...institutionForm, direccion: e.target.value })}
                className="admin-input"
                required
              />
            </AdminField>
            <AdminField label="Ciudad">
              <input
                value={institutionForm.ciudad}
                onChange={(e) => setInstitutionForm({ ...institutionForm, ciudad: e.target.value })}
                className="admin-input"
                required
              />
            </AdminField>
            <AdminField label="Fundación">
              <input
                value={institutionForm.anioFundacion}
                onChange={(e) =>
                  setInstitutionForm({ ...institutionForm, anioFundacion: e.target.value })
                }
                className="admin-input"
                required
              />
            </AdminField>
            <AdminField label="Correo">
              <input
                value={institutionForm.email}
                onChange={(e) => setInstitutionForm({ ...institutionForm, email: e.target.value })}
                className="admin-input"
                required
              />
            </AdminField>
            <AdminField label="Horario" className="sm:col-span-2">
              <input
                value={institutionForm.horarioAtencion ?? ""}
                onChange={(e) =>
                  setInstitutionForm({ ...institutionForm, horarioAtencion: e.target.value })
                }
                className="admin-input"
              />
            </AdminField>
          </div>

          {/* Logo compacto: mismo alto que la columna de texto, no ancho completo */}
          <div className="lg:row-span-1">
            <MediaPicker
              label="Logo institucional"
              accept="image/*"
              previewUrl={institutionLogoPreview}
              previewType="image"
              onFileChange={setInstitutionLogoFile}
            />
          </div>
        </div>
      </FormSection>

      {/* ── Sección 2: misión / visión ── */}
      <FormSection eyebrow="Identidad" title="Misión y visión">
        <div className="grid gap-4 lg:grid-cols-2">
          <AdminField label="Misión">
            <textarea
              value={institutionForm.mision}
              onChange={(e) => setInstitutionForm({ ...institutionForm, mision: e.target.value })}
              className="admin-input resize-y"
              rows={4}
              required
            />
          </AdminField>
          <AdminField label="Visión">
            <textarea
              value={institutionForm.vision}
              onChange={(e) => setInstitutionForm({ ...institutionForm, vision: e.target.value })}
              className="admin-input resize-y"
              rows={4}
              required
            />
          </AdminField>
        </div>
      </FormSection>

      {/* ── Sección 3: descripción ── */}
      <FormSection eyebrow="Presentación" title="Descripción pública">
        <AdminField label="Descripción">
          <textarea
            value={institutionForm.descripcion ?? ""}
            onChange={(e) => setInstitutionForm({ ...institutionForm, descripcion: e.target.value })}
            className="admin-input resize-y"
            rows={3}
          />
        </AdminField>
      </FormSection>

      {/* ── Barra de acción fija visualmente separada ── */}
      <div className="flex justify-end border-t border-monserrat-ink/8 pt-4">
        <AdminFormBtn isBusy={isBusy} />
      </div>
    </form>
  );
}