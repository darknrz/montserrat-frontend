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

export function InstitucionTab({
  institution,
  token,
  isBusy,
  runAdminAction
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
    <form onSubmit={submitInstitution} className="grid gap-4 lg:grid-cols-2">
      <AdminField label="Nombre">
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
          onChange={(e) => setInstitutionForm({ ...institutionForm, anioFundacion: e.target.value })}
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
      <AdminField label="Horario">
        <input
          value={institutionForm.horarioAtencion ?? ""}
          onChange={(e) => setInstitutionForm({ ...institutionForm, horarioAtencion: e.target.value })}
          className="admin-input"
        />
      </AdminField>
      <div className="lg:col-span-2">
        <MediaPicker
          label="Logo institucional"
          accept="image/*"
          previewUrl={institutionLogoPreview}
          previewType="image"
          onFileChange={setInstitutionLogoFile}
        />
      </div>
      <AdminField label="Misión" className="lg:col-span-1">
        <textarea
          value={institutionForm.mision}
          onChange={(e) => setInstitutionForm({ ...institutionForm, mision: e.target.value })}
          className="admin-input resize-y"
          rows={4}
          required
        />
      </AdminField>
      <AdminField label="Visión" className="lg:col-span-1">
        <textarea
          value={institutionForm.vision}
          onChange={(e) => setInstitutionForm({ ...institutionForm, vision: e.target.value })}
          className="admin-input resize-y"
          rows={4}
          required
        />
      </AdminField>
      <div className="lg:col-span-2">
        <AdminField label="Descripción">
          <textarea
            value={institutionForm.descripcion ?? ""}
            onChange={(e) => setInstitutionForm({ ...institutionForm, descripcion: e.target.value })}
            className="admin-input resize-y"
            rows={3}
          />
        </AdminField>
      </div>
      <div className="lg:col-span-2">
        <AdminFormBtn isBusy={isBusy} />
      </div>
    </form>
  );
}
