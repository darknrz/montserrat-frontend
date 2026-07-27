import { Plus, Save, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { RedSocial } from "../../../types";
import { AdminField, AdminTable } from "./adminComponents";

type RedesSocialesTabProps = {
  redes: RedSocial[];
  token: string;
  isBusy: boolean;
  runAdminAction: (action: () => Promise<void>, successMessage: string) => void;
};

const emptyRed: Omit<RedSocial, "id"> = {
  nombre: "",
  icono: "",
  url: "",
  activo: true,
  orden: 1,
};

export function RedesSocialesTab({
  redes,
  token,
  isBusy,
  runAdminAction
}: RedesSocialesTabProps) {
  const [editingRed, setEditingRed] = useState<RedSocial | null>(null);
  const [redForm, setRedForm] = useState<Omit<RedSocial, "id">>(emptyRed);

  const submitRed = (e: FormEvent) => {
    e.preventDefault();
    runAdminAction(async () => {
      if (editingRed) {
        await monserratApi.updateRedSocial(editingRed.id, redForm, token);
      } else {
        await monserratApi.createRedSocial(redForm, token);
      }
      setEditingRed(null);
      setRedForm(emptyRed);
    }, "Red social guardada");
  };

  const handleEditClick = (r: RedSocial) => {
    setEditingRed(r);
    setRedForm({ ...r });
  };

  const handleCancelEdit = () => {
    setEditingRed(null);
    setRedForm(emptyRed);
  };

  const handleDelete = (id: number) => {
    runAdminAction(
      () => monserratApi.deleteRedSocial(id, token),
      "Red social eliminada"
    );
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <form
        onSubmit={submitRed}
        className="grid content-start gap-3 rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/40 p-5"
      >
        <h4 className="font-serif text-[16px] font-black text-monserrat-ink">
          {editingRed ? "Editar red social" : "Nueva red social"}
        </h4>
        <AdminField label="Nombre">
          <input
            value={redForm.nombre}
            onChange={(e) => setRedForm({ ...redForm, nombre: e.target.value })}
            className="admin-input"
            required
          />
        </AdminField>
        <AdminField label="Ícono">
          <input
            value={redForm.icono}
            onChange={(e) => setRedForm({ ...redForm, icono: e.target.value })}
            className="admin-input"
            placeholder="Facebook, Instagram, Youtube, etc."
            required
          />
        </AdminField>
        <AdminField label="URL">
          <input
            type="url"
            value={redForm.url}
            onChange={(e) => setRedForm({ ...redForm, url: e.target.value })}
            className="admin-input"
            required
          />
        </AdminField>
        <AdminField label="Orden">
          <input
            type="number"
            value={redForm.orden}
            onChange={(e) => setRedForm({ ...redForm, orden: Number(e.target.value) })}
            className="admin-input"
          />
        </AdminField>
        <div className="flex gap-2">
          <button
            disabled={isBusy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60"
          >
            {editingRed ? (
              <>
                <Save size={13} /> Guardar
              </>
            ) : (
              <>
                <Plus size={13} /> Crear
              </>
            )}
          </button>
          {editingRed && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-[10px] border border-monserrat-ink/12 px-3 hover:border-monserrat-ink/25"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </form>
      <AdminTable
        headers={["Nombre", "Ícono", "URL"]}
        rows={redes.map((r) => ({
          id: r.id,
          values: [r.nombre, r.icono, r.url],
          onEdit: () => handleEditClick(r),
          onDelete: () => handleDelete(r.id),
        }))}
        className="bg-white shadow-sm"
        bodyClassName="max-h-[70vh]"
      />
    </div>
  );
}
