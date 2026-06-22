import { Edit3, ImagePlus, Plus, Save, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { createCatalogId, type CatalogItem, type SalonItem } from "./adminShared";

export function AdminField({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label className="text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">{label}</label>
      {children}
    </div>
  );
}

export function AdminFormBtn({ isBusy }: { isBusy: boolean }) {
  return (
    <button disabled={isBusy}
      className="inline-flex items-center gap-2 rounded-[12px] bg-monserrat-red px-6 py-2.5 text-[13px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60">
      <Save size={15} /> Guardar cambios
    </button>
  );
}

export function AdminMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-monserrat-ink/8 bg-white p-4 shadow-sm">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] bg-monserrat-red/8 text-monserrat-red">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">{label}</p>
        <p className="mt-0.5 text-xl font-black text-monserrat-ink">{value}</p>
      </div>
    </div>
  );
}

export function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-white px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-ink/40">{label}</p>
      <p className="mt-1 text-lg font-black text-monserrat-ink">{value}</p>
    </div>
  );
}

export function RosterPanel({
  title,
  empty,
  rows,
  className = "",
  bodyClassName = ""
}: {
  title: string;
  empty: string;
  rows: { id: string; title: string; detail: string }[];
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-[16px] border border-monserrat-ink/8 bg-white shadow-sm ${className}`}>
      <div className="border-b border-monserrat-ink/8 bg-monserrat-ink px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-cream/70">{title}</p>
      </div>
      <div className={`max-h-[420px] overflow-y-auto p-3 ${bodyClassName}`}>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-monserrat-ink/40">{empty}</p>
        ) : rows.map((row) => (
          <div key={row.id} className="border-b border-monserrat-ink/6 px-2 py-3 last:border-b-0">
            <p className="truncate text-sm font-black text-monserrat-ink">{row.title}</p>
            <p className="mt-1 truncate text-[12px] font-semibold text-monserrat-ink/50">{row.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConfigPanel({ title, items, onChange }: { title: string; items: CatalogItem[]; onChange: (items: CatalogItem[]) => void }) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const updateItem = (index: number, patch: Partial<CatalogItem>) => {
    onChange(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };
  const addItem = () => {
    const label = `Nuevo ${title.toLowerCase()} ${items.length + 1}`;
    onChange([...items, { id: createCatalogId(label, items), label, active: true }]);
  };
  const deleteItem = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    setDeleteIndex(null);
  };
  const itemToDelete = deleteIndex === null ? null : items[deleteIndex];

  return (
    <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-monserrat-ink/8 bg-monserrat-ink px-5 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-cream/70">Configuracion</p>
          <h4 className="font-serif text-xl font-black text-white">{title}</h4>
        </div>
        <button type="button" onClick={addItem} className="inline-flex items-center gap-1 rounded-[10px] bg-white/10 px-3 py-2 text-[11px] font-black text-monserrat-cream hover:bg-white/18">
          <Plus size={12} /> Agregar
        </button>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <div key={item.id} className={`rounded-[14px] border p-4 transition ${item.active ? "border-monserrat-ink/8 bg-monserrat-cream/25" : "border-monserrat-ink/8 bg-white opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">{item.id}</p>
                <input value={item.label} onChange={(e) => updateItem(index, { label: e.target.value })} className="mt-2 w-full rounded-[10px] border border-monserrat-ink/10 bg-white px-3 py-2 text-sm font-black text-monserrat-ink outline-none focus:border-monserrat-red" />
              </div>
              <button type="button" onClick={() => setDeleteIndex(index)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-monserrat-red/8 text-monserrat-red hover:bg-monserrat-red/16">
                <Trash2 size={13} />
              </button>
            </div>
            <button type="button" onClick={() => updateItem(index, { active: !item.active })}
              className={`mt-3 w-full rounded-[10px] px-3 py-2 text-[11px] font-black ${item.active ? "bg-emerald-600 text-white" : "bg-monserrat-ink/8 text-monserrat-ink/55"}`}>
              {item.active ? "Activo" : "Inactivo"}
            </button>
          </div>
        ))}
      </div>
      {itemToDelete && (
        <ConfirmDeleteModal
          title="Eliminar configuracion"
          message={`Vas a eliminar "${itemToDelete.label}". Si hay alumnos, docentes, salones o asignaciones vinculadas, pueden quedar afectados.`}
          onCancel={() => setDeleteIndex(null)}
          onConfirm={() => {
            if (deleteIndex !== null) deleteItem(deleteIndex);
          }}
        />
      )}
    </div>
  );
}

export function SalonConfigPanel({
  nivel,
  salones,
  addSalon,
  updateSalon,
  deleteSalon,
  gradosActivosPorNivel,
  seccionesActivas,
  labelAcademico
}: {
  nivel: string;
  salones: SalonItem[];
  addSalon: () => void;
  updateSalon: (salon: SalonItem, patch: Partial<SalonItem>) => void;
  deleteSalon: (salon: SalonItem) => void;
  gradosActivosPorNivel: (nivel?: string) => string[];
  seccionesActivas: string[];
  labelAcademico: (id: string) => string;
}) {
  const [deleteTarget, setDeleteTarget] = useState<SalonItem | null>(null);
  return (
    <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-monserrat-ink/8 bg-monserrat-ink px-5 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-cream/70">Configuracion</p>
          <h4 className="font-serif text-xl font-black text-white">Salones de {labelAcademico(nivel)}</h4>
        </div>
        <button type="button" onClick={addSalon} className="inline-flex items-center gap-1 rounded-[10px] bg-white/10 px-3 py-2 text-[11px] font-black text-monserrat-cream hover:bg-white/18">
          <Plus size={12} /> Agregar
        </button>
      </div>
      <div className="grid gap-3 p-4 xl:grid-cols-2">
        {salones.map((salon) => (
          <div key={`${salon.nivel}-${salon.grado}-${salon.seccion}-${salon.aula}`} className={`rounded-[14px] border p-4 ${salon.active ? "border-monserrat-ink/8 bg-monserrat-cream/25" : "border-monserrat-ink/8 bg-white opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">{labelAcademico(salon.nivel)}</p>
                <h5 className="mt-1 font-serif text-lg font-black text-monserrat-ink">Aula {salon.aula}</h5>
              </div>
              <button type="button" onClick={() => setDeleteTarget(salon)} className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-monserrat-red/8 text-monserrat-red hover:bg-monserrat-red/16">
                <Trash2 size={13} />
              </button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <AdminField label="Nivel">
                <input value={labelAcademico(salon.nivel)} className="admin-input" disabled />
              </AdminField>
              <AdminField label="Aula">
                <input value={salon.aula} onChange={(e) => updateSalon(salon, { aula: e.target.value })} className="admin-input" />
              </AdminField>
              <AdminField label="Grado">
                <select value={salon.grado} onChange={(e) => updateSalon(salon, { grado: e.target.value })} className="admin-input">
                  {gradosActivosPorNivel(salon.nivel).map((grado) => <option key={grado} value={grado}>{labelAcademico(grado)}</option>)}
                </select>
              </AdminField>
              <AdminField label="Seccion">
                <select value={salon.seccion} onChange={(e) => updateSalon(salon, { seccion: e.target.value })} className="admin-input">
                  {seccionesActivas.map((seccion) => <option key={seccion} value={seccion}>{labelAcademico(seccion)}</option>)}
                </select>
              </AdminField>
            </div>
            <button type="button" onClick={() => updateSalon(salon, { active: !salon.active })}
              className={`mt-3 w-full rounded-[10px] px-3 py-2 text-[11px] font-black ${salon.active ? "bg-emerald-600 text-white" : "bg-monserrat-ink/8 text-monserrat-ink/55"}`}>
              {salon.active ? "Activo" : "Inactivo"}
            </button>
          </div>
        ))}
      </div>
      {deleteTarget && (
        <ConfirmDeleteModal
          title="Eliminar salon"
          message={`Vas a eliminar el aula ${deleteTarget.aula}. Si hay alumnos, docentes o asignaciones vinculadas, pueden quedar afectados.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteSalon(deleteTarget);
            setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}

export function ConfirmDeleteModal({ title, message, onCancel, onConfirm }: { title: string; message: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="border-b border-monserrat-ink/8 bg-monserrat-cream px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">Confirmacion requerida</p>
          <h3 className="mt-1 font-serif text-xl font-black text-monserrat-ink">{title}</h3>
        </div>
        <div className="grid gap-4 p-5">
          <p className="text-sm font-semibold leading-6 text-monserrat-ink/70">{message}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded-[10px] border border-monserrat-ink/12 px-4 py-2 text-[12px] font-black text-monserrat-ink/60 hover:border-monserrat-ink/30">
              Cancelar
            </button>
            <button type="button" onClick={onConfirm} className="rounded-[10px] bg-monserrat-red px-4 py-2 text-[12px] font-black text-white hover:bg-monserrat-red/85">
              Si, eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MediaPicker({ label, accept, previewUrl, previewType, onFileChange }: { label: string; accept: string; previewUrl?: string; previewType?: string; onFileChange: (f: File | null) => void }) {
  return (
    <div className="grid gap-2">
      <p className="text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">{label}</p>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-monserrat-ink/18 bg-white py-2.5 text-[12px] font-bold text-monserrat-ink/60 transition hover:border-monserrat-red hover:text-monserrat-red">
        <Upload size={14} /> Subir archivo
        <input type="file" accept={accept} onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} className="hidden" />
      </label>
      {previewUrl ? (
        <div className="overflow-hidden rounded-[10px] border border-monserrat-ink/8">
          {previewType === "video"
            ? <video src={previewUrl} controls className="h-40 w-full bg-black object-cover" />
            : <img src={previewUrl} alt="" className="h-40 w-full object-cover" />}
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-[10px] border border-dashed border-monserrat-ink/10 bg-white text-[12px] font-semibold text-monserrat-ink/40">
          <ImagePlus size={16} className="mr-2" /> Sin archivo
        </div>
      )}
    </div>
  );
}

export function AdminTable({
  headers,
  rows,
  className = "",
  bodyClassName = ""
}: {
  headers: string[];
  rows: { id: number; values: string[]; onEdit: () => void; onDelete: () => void }[];
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-[16px] border border-monserrat-ink/8 ${className}`}>
      <div className={`overflow-x-auto ${bodyClassName}`}>
        <table className="w-full border-collapse text-left text-[12.5px]">
          <thead className="bg-monserrat-ink">
            <tr>{headers.map((h) => <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-cream/70">{h}</th>)}
              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-cream/70"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-monserrat-ink/6 hover:bg-monserrat-cream/20">
                {row.values.map((v, i) => <td key={i} className="max-w-[220px] truncate px-4 py-3 text-monserrat-ink/80">{v}</td>)}
                <td className="px-4 py-3">
                  <div className="flex gap-1.5">
                    <button type="button" onClick={row.onEdit} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-monserrat-ink/12 bg-white hover:border-monserrat-ink/30"><Edit3 size={13} /></button>
                    <button type="button" onClick={row.onDelete} className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-monserrat-red/8 text-monserrat-red hover:bg-monserrat-red/16"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
