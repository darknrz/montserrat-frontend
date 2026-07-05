import { Edit3, ImagePlus, Plus, Save, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createCatalogId, aulaPorGradoSeccion, type CatalogItem, type SalonItem } from "./adminShared";

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
  bodyClassName = "",
  onEdit,
  selectedId,
  onSelect,
  headerAction,
}: {
  title: string;
  empty: string;
  rows: { id: string; title: string; detail: string; raw?: any }[];
  className?: string;
  bodyClassName?: string;
  onEdit?: (raw: any) => void;
  selectedId?: string;
  onSelect?: (id: string) => void;
  headerAction?: ReactNode;
}) {
  return (
    <div className={`overflow-hidden rounded-[16px] border border-monserrat-ink/8 bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-monserrat-ink/8 bg-monserrat-ink px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-cream/70">{title}</p>
        {headerAction}
      </div>
      <div className={`max-h-[420px] overflow-y-auto p-3 ${bodyClassName}`}>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-monserrat-ink/40">{empty}</p>
        ) : rows.map((row) => (
          <div
            key={row.id}
            onClick={() => onSelect?.(row.id)}
            className={`flex items-center justify-between border-b border-monserrat-ink/6 px-2 py-3 last:border-b-0 cursor-pointer transition ${selectedId === row.id ? "bg-monserrat-red/8 border-monserrat-red/20" : "hover:bg-monserrat-cream/10"}`}>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-black ${selectedId === row.id ? "text-monserrat-red" : "text-monserrat-ink"}`}>{row.title}</p>
              <p className={`mt-1 truncate text-[12px] font-semibold ${selectedId === row.id ? "text-monserrat-red/70" : "text-monserrat-ink/50"}`}>{row.detail}</p>
            </div>
            {onEdit && row.raw && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(row.raw); }}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition ml-2 cursor-pointer"
                title="Editar asignación"
              >
                <Edit3 size={13} />
              </button>
            )}
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
  addSalon: (grado: string, seccion: string, aula: string) => void;
  updateSalon: (salon: SalonItem, patch: Partial<SalonItem>) => void;
  deleteSalon: (salon: SalonItem) => void;
  gradosActivosPorNivel: (nivel?: string) => string[];
  seccionesActivas: string[];
  labelAcademico: (id: string) => string;
}) {
  const [deleteTarget, setDeleteTarget] = useState<SalonItem | null>(null);

  // Pagination states and effects
  const [pagina, setPagina] = useState(1);
  const SALONES_POR_PAGINA = 4;

  useEffect(() => {
    setPagina(1);
  }, [nivel]);

  const totalPaginas = Math.max(1, Math.ceil(salones.length / SALONES_POR_PAGINA));
  const salonesPagina = salones.slice((pagina - 1) * SALONES_POR_PAGINA, pagina * SALONES_POR_PAGINA);

  return (
    <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-monserrat-ink/8 bg-monserrat-ink px-5 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-cream/70">Configuracion</p>
          <h4 className="font-serif text-xl font-black text-white">Salones de {labelAcademico(nivel)}</h4>
        </div>
        <button type="button" onClick={() => addSalon("", "", "Nuevo")} className="inline-flex items-center gap-1 rounded-[10px] bg-white/10 px-3 py-2 text-[11px] font-black text-monserrat-cream hover:bg-white/18">
          <Plus size={12} /> Agregar
        </button>
      </div>

      <div className="grid gap-3 p-4 xl:grid-cols-2">
        {salonesPagina.map((salon) => (
          <div key={`${salon.nivel}-${salon.grado}-${salon.seccion}-${salon.aula}`} className={`rounded-[14px] border p-4 ${salon.active ? "border-monserrat-ink/8 bg-monserrat-cream/25" : "border-monserrat-ink/8 bg-white opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">{labelAcademico(salon.nivel)}</p>
                <h5 className="mt-1 font-serif text-lg font-black text-monserrat-ink">Aula {salon.aula || "(vacia)"}</h5>
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
                <input value={salon.grado ? labelAcademico(salon.grado) : "No asignado"} className="admin-input" disabled />
              </AdminField>
              <AdminField label="Seccion">
                <input value={salon.seccion ? labelAcademico(salon.seccion) : "No asignado"} className="admin-input" disabled />
              </AdminField>
            </div>
            <button type="button" onClick={() => updateSalon(salon, { active: !salon.active })}
              className={`mt-3 w-full rounded-[10px] px-3 py-2 text-[11px] font-black ${salon.active ? "bg-emerald-600 text-white" : "bg-monserrat-ink/8 text-monserrat-ink/55"}`}>
              {salon.active ? "Activo" : "Inactivo"}
            </button>
          </div>
        ))}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between border-t border-monserrat-ink/8 px-5 py-3 bg-monserrat-cream/10">
          <p className="text-[12px] font-semibold text-monserrat-ink/45">
            Página <span className="font-black text-monserrat-ink">{pagina}</span> de{" "}
            <span className="font-black text-monserrat-ink">{totalPaginas}</span>
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={pagina === 1}
              onClick={() => setPagina((p) => p - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-monserrat-ink/10 text-monserrat-ink/50 transition hover:border-monserrat-ink/25 hover:text-monserrat-ink disabled:opacity-30"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button
              type="button"
              disabled={pagina === totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-monserrat-ink/10 text-monserrat-ink/50 transition hover:border-monserrat-ink/25 hover:text-monserrat-ink disabled:opacity-30"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      )}

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
          {previewType === "video" ? (
            <video src={previewUrl} controls className="h-40 w-full bg-black object-cover" />
          ) : previewType === "image" ? (
            <img src={previewUrl} alt="" className="h-40 w-full object-cover" />
          ) : (
            <div className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-monserrat-cream/30 px-4 text-center text-sm font-semibold text-monserrat-ink/70">
              <span className="text-base font-black">Documento adjunto</span>
              <a href={previewUrl} target="_blank" rel="noreferrer" className="text-monserrat-red underline">
                Ver archivo
              </a>
            </div>
          )}
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
      <div className={`admin-table-scroll ${bodyClassName}`}>
        <table className="w-full table-fixed border-collapse text-left text-[12.5px]">
          <thead className="bg-monserrat-ink sticky top-0 z-10">
            <tr>
              {headers.map((h, i) => (
                <th key={h}
                  className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-cream/70 ${i === 0 ? "w-[12%]" :   // Codigo
                    i === 1 ? "w-[30%]" :   // Nombre
                    i === 2 ? "w-[10%]" :   // Rol
                    i === 3 ? "w-[10%]" :   // Estado
                    "w-[30%]"               // Detalle
                    }`}
                >{h}</th>
              ))}
              <th className="w-[8%] px-4 py-3 bg-monserrat-ink"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-monserrat-ink/6 hover:bg-monserrat-cream/20">
                {row.values.map((v, i) => <td key={i} className="truncate px-2 py-3 text-monserrat-ink/80">{v}</td>)}

                <td className="py-3">
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

// ---------------------------------------------------------------------------
// Modal para vincular competencias del catálogo a un área curricular
// ---------------------------------------------------------------------------

export function matrixKey(grado: string, curso: string, competencia: string) {
  return `${grado}||${curso}||${competencia}`;
}

export function CompetenciaPickerModal({
  curso,
  catalogo,
  yaVinculadas,
  labelAcademico,
  onToggle,
  onClose,
}: {
  curso: string;
  catalogo: CatalogItem[];
  yaVinculadas: string[];
  labelAcademico: (id: string) => string;
  onToggle: (competenciaId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="border-b border-monserrat-ink/8 bg-monserrat-cream px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">Vincular competencias</p>
          <h3 className="mt-1 font-serif text-xl font-black text-monserrat-ink">{labelAcademico(curso)}</h3>
        </div>
        <div className="grid max-h-[360px] gap-2 overflow-y-auto p-4">
          {catalogo.map((c) => {
            const linked = yaVinculadas.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.id)}
                className={`flex items-center justify-between rounded-[10px] border px-3 py-2 text-left text-[12.5px] font-semibold transition ${
                  linked ? "border-monserrat-red/30 bg-monserrat-red/8 text-monserrat-red" : "border-monserrat-ink/10 text-monserrat-ink/70 hover:border-monserrat-ink/25"
                }`}
              >
                <span>{c.label}</span>
                <span className="text-[10px] font-black uppercase">{linked ? "Vinculada" : "Vincular"}</span>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 border-t border-monserrat-ink/8 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-[10px] bg-monserrat-red px-4 py-2 text-[12px] font-black text-white hover:bg-monserrat-red/85">
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}