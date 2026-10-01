import { Plus, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { RedSocial } from "../../../types";
import { AdminField } from "./adminComponents";
import { SortableAdminTable } from "./SortableAdminTable";

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
  token,
  isBusy,
  runAdminAction
}: RedesSocialesTabProps) {
  const [editingRed, setEditingRed] = useState<RedSocial | null>(null);
  const [redForm, setRedForm] = useState<Omit<RedSocial, "id">>(emptyRed);
  const [items, setItems] = useState<RedSocial[]>([]);

  const reload = async () => setItems(await monserratApi.redesSocialesAdmin(token));

  useEffect(() => {
    void reload().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
      await reload();
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
    runAdminAction(async () => {
      await monserratApi.deleteRedSocial(id, token);
      await reload();
    }, "Red social eliminada");
  };

  const handleToggle = (r: RedSocial) => {
    runAdminAction(async () => {
      const { id: _id, ...rest } = r;
      await monserratApi.updateRedSocial(r.id, { ...rest, activo: r.activo === false }, token);
      await reload();
    }, r.activo === false ? "Red social activada" : "Red social desactivada");
  };

  const handleReorder = (ids: number[]) => {
    setItems((prev) => ids.map((id, i) => ({ ...prev.find((x) => x.id === id)!, orden: i })));
    runAdminAction(async () => {
      await monserratApi.reorderRedesSociales(ids, token);
      await reload();
    }, "Orden actualizado");
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <form
        onSubmit={submitRed}
        className="grid content-start gap-3 rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/40 p-5"
      >
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
      <SortableAdminTable
        headers={["Nombre", "Ícono", "URL"]}
        rows={items.map((r) => ({
          id: r.id,
          values: [r.nombre, r.icono, r.url],
          activo: r.activo !== false,
          onToggle: () => handleToggle(r),
          onEdit: () => handleEditClick(r),
          onDelete: () => handleDelete(r.id),
        }))}
        onReorder={handleReorder}
        className="bg-white shadow-sm"
        bodyClassName="max-h-[70vh]"
      />
    </div>
  );
}
