import { Edit3, ImagePlus, Plus, Save, Search, Trash2, Upload, User, UserCheck, UserPlus, BookOpen, Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createCatalogId, aulaPorGradoSeccion, type CatalogItem, type SalonItem } from "./adminShared";

// Cierra cualquier modal con la tecla Escape. Un solo hook compartido
// evita repetir el mismo useEffect en cada modal de la app.
function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
}

function normalizarTexto(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

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
      className="inline-flex items-center gap-2 rounded-[10px] bg-monserrat-ink px-6 py-2.5 text-[13px] font-black text-white transition hover:bg-monserrat-ink/85 disabled:opacity-60">
      <Save size={15} /> Guardar cambios
    </button>
  );
}

export function AdminMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-black/10 bg-white p-4">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] bg-black/5 text-monserrat-ink/55">
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
    <div className={`overflow-hidden rounded-[12px] border border-black/10 bg-white ${className}`}>
      <div className="flex items-center justify-between gap-2 border-b border-black/12 bg-[#e9e9e8] px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/45">{title}</p>
        {headerAction}
      </div>
      <div className={`max-h-[420px] overflow-y-auto p-1.5 ${bodyClassName}`}>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm font-semibold text-monserrat-ink/40">{empty}</p>
        ) : rows.map((row) => (
          <div
            key={row.id}
            onClick={() => onSelect?.(row.id)}
            className={`flex items-center justify-between border-b border-monserrat-ink/6 pl-3 pr-2 py-3 last:border-b-0 cursor-pointer transition-all duration-200 border-l-[3px] rounded-r-lg ${
              selectedId === row.id
                ? "bg-[#e9e9e8] border-black/12 border-l-monserrat-ink"
                : "border-l-transparent hover:bg-[#eeeeec] hover:border-l-black/20"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className={`truncate text-[13px] font-black ${selectedId === row.id ? "text-monserrat-ink" : "text-monserrat-ink"}`}>{row.title}</p>
              <p className={`mt-0.5 truncate text-[11px] font-semibold ${selectedId === row.id ? "text-monserrat-ink/60" : "text-monserrat-ink/45"}`}>{row.detail}</p>
            </div>
            {onEdit && row.raw && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit(row.raw); }}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[8px] bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition ml-2 cursor-pointer"
                title="Editar asignación"
              >
                <Edit3 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConfigPanel({ title, items, onChange }: { title: string; items: CatalogItem[]; onChange: (items: CatalogItem[]) => void }) {
  const [localItems, setLocalItems] = useState(items);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // Sincroniza si el catálogo cambia desde afuera (ej. carga inicial o
  // guardado confirmado por el backend).
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const updateLabel = (index: number, label: string) => {
    setLocalItems((prev) => prev.map((item, i) => (i === index ? { ...item, label } : item)));
  };

  const commitLabel = (index: number) => {
    // Solo dispara el guardado si el texto realmente cambió.
    if (localItems[index]?.label !== items[index]?.label) {
      onChange(localItems);
    }
  };

  const updateActive = (index: number, active: boolean) => {
    const next = localItems.map((item, i) => (i === index ? { ...item, active } : item));
    setLocalItems(next);
    onChange(next);
  };

  const addItem = () => {
    const label = `Nuevo ${title.toLowerCase()} ${localItems.length + 1}`;
    const next = [...localItems, { id: createCatalogId(label, localItems), label, active: true }];
    setLocalItems(next);
    onChange(next);
  };

  const deleteItem = (index: number) => {
    const next = localItems.filter((_, itemIndex) => itemIndex !== index);
    setLocalItems(next);
    onChange(next);
    setDeleteIndex(null);
  };

  const itemToDelete = deleteIndex === null ? null : localItems[deleteIndex];

  return (
    <div className="overflow-hidden rounded-[12px] border border-black/10 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/12 bg-[#e9e9e8] px-5 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Configuracion</p>
          <h4 className="font-serif text-xl font-black text-monserrat-ink">{title}</h4>
        </div>
        <button type="button" onClick={addItem} className="inline-flex cursor-pointer items-center gap-1 rounded-[9px] border border-black/12 bg-[#f3f3f2] px-3 py-2 text-[11px] font-black text-monserrat-ink hover:bg-[#dededc]">
          <Plus size={12} /> Agregar
        </button>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {localItems.map((item, index) => (
          <div key={item.id} className={`rounded-[12px] border p-4 transition ${item.active ? "border-black/12 bg-white" : "border-black/12 bg-[#eeeeec] opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">{item.id}</p>
                <input
                  value={item.label}
                  onChange={(e) => updateLabel(index, e.target.value)}
                  onBlur={() => commitLabel(index)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  className="mt-2 w-full rounded-[9px] border border-black/10 bg-white px-3 py-2 text-sm font-black text-monserrat-ink outline-none focus:border-black/25"
                />
              </div>
              <button type="button" onClick={() => setDeleteIndex(index)} className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-[8px] bg-[#e9e9e8] text-monserrat-ink/45 hover:bg-red-50 hover:text-red-600">
                <Trash2 size={13} />
              </button>
            </div>
            <button type="button" onClick={() => updateActive(index, !item.active)}
              className={`mt-3 w-full rounded-[9px] border px-3 py-2 text-[11px] font-black ${item.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-black/10 bg-black/[0.035] text-monserrat-ink/55"}`}>
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
export function CompetenciasPanel({
  items,
  onChange,
}: {
  items: CatalogItem[];
  onChange: (items: CatalogItem[]) => void;
}) {
  const [localItems, setLocalItems] = useState(items);
  const [nuevaCompetencia, setNuevaCompetencia] = useState("");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const updateLabel = (index: number, label: string) => {
    setLocalItems((prev) => prev.map((item, i) => (i === index ? { ...item, label } : item)));
  };

  const commitLabel = (index: number) => {
    if (localItems[index]?.label !== items[index]?.label) {
      onChange(localItems);
    }
  };

  const updateActive = (index: number, active: boolean) => {
    const next = localItems.map((item, i) => (i === index ? { ...item, active } : item));
    setLocalItems(next);
    onChange(next);
  };

  const addItem = () => {
    const label = nuevaCompetencia.trim();
    if (!label) return;
    const id = `C${localItems.length + 1}`;
    const finalId = localItems.some((item) => item.id === id) ? createCatalogId(label, localItems) : id;
    const next = [...localItems, { id: finalId, label, active: true }];
    setLocalItems(next);
    onChange(next);
    setNuevaCompetencia("");
  };

  const deleteItem = (index: number) => {
    const next = localItems.filter((_, itemIndex) => itemIndex !== index);
    setLocalItems(next);
    onChange(next);
    setDeleteIndex(null);
  };
  const itemToDelete = deleteIndex === null ? null : localItems[deleteIndex];

  return (
    <div className="overflow-hidden rounded-[12px] border border-black/10 bg-white">
      <div className="border-b border-black/12 bg-[#e9e9e8] px-5 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Configuracion</p>
        <h4 className="font-serif text-xl font-black text-monserrat-ink">Competencias</h4>
      </div>

      <div className="border-b border-black/10 bg-white p-4">
        <p className="mb-2 text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">
          Escribe la nueva competencia
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <textarea
            value={nuevaCompetencia}
            onChange={(e) => setNuevaCompetencia(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder="Ej: Resuelve problemas de cantidad usando estrategias y procedimientos matematicos."
            rows={2}
            className="flex-1 resize-none rounded-[9px] border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-monserrat-ink outline-none focus:border-black/25"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!nuevaCompetencia.trim()}
            className="inline-flex items-center justify-center gap-1 rounded-[9px] bg-monserrat-ink px-4 py-2 text-[12px] font-black text-white transition hover:bg-monserrat-ink/85 disabled:opacity-40 sm:self-start"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>
        <p className="mt-1.5 text-[11px] font-semibold text-monserrat-ink/40">
          Enter para agregar rapido · Shift+Enter para bajar de linea · Máximo 500 caracteres
        </p>
      </div>

      <div className="grid gap-2 p-4 max-h-[520px] overflow-y-auto">
        {localItems.length === 0 && (
          <p className="py-6 text-center text-sm font-semibold text-monserrat-ink/40">
            Aun no hay competencias registradas.
          </p>
        )}
        {localItems.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 rounded-[12px] border p-3 transition ${
              item.active ? "border-black/12 bg-white" : "border-black/12 bg-[#eeeeec] opacity-60"
            }`}
          >
            <span className="mt-1 flex-shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-monserrat-ink/40">
              {item.id}
            </span>
            <textarea
              value={item.label}
              maxLength={500}
              onChange={(e) => updateLabel(index, e.target.value)}
              onBlur={() => commitLabel(index)}
              rows={2}
              className="flex-1 resize-none rounded-[9px] border border-black/10 bg-white px-3 py-2 text-sm font-bold text-monserrat-ink outline-none focus:border-black/25"
            />
            <div className="flex flex-shrink-0 flex-col gap-1.5">
              <button
                type="button"
                onClick={() => updateActive(index, !item.active)}
                className={`rounded-[8px] px-2.5 py-1.5 text-[10px] font-black ${
                  item.active ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-black/10 bg-black/[0.035] text-monserrat-ink/55"
                }`}
              >
                {item.active ? "Activo" : "Inactivo"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteIndex(index)}
                className="flex h-7 w-7 cursor-pointer items-center justify-center self-center rounded-[8px] bg-[#e9e9e8] text-monserrat-ink/45 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {itemToDelete && (
        <ConfirmDeleteModal
          title="Eliminar competencia"
          message={`Vas a eliminar "${itemToDelete.label}". Si esta vinculada a algun area curricular o docente, esa relacion se perdera.`}
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
    <div className="overflow-hidden rounded-[12px] border border-black/10 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/12 bg-[#e9e9e8] px-5 py-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">Configuracion</p>
          <h4 className="font-serif text-xl font-black text-monserrat-ink">Salones de {labelAcademico(nivel)}</h4>
        </div>
        <button type="button" onClick={() => addSalon("", "", "Nuevo")} className="inline-flex cursor-pointer items-center gap-1 rounded-[9px] border border-black/12 bg-[#f3f3f2] px-3 py-2 text-[11px] font-black text-monserrat-ink hover:bg-[#dededc]">
          <Plus size={12} /> Agregar
        </button>
      </div>

      <div className="grid gap-3 p-4 xl:grid-cols-2">
        {salonesPagina.map((salon) => (
          <div key={`${salon.nivel}-${salon.grado}-${salon.seccion}-${salon.aula}`} className={`rounded-[12px] border p-4 ${salon.active ? "border-black/12 bg-white" : "border-black/12 bg-[#eeeeec] opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">{labelAcademico(salon.nivel)}</p>
                <h5 className="mt-1 font-serif text-lg font-black text-monserrat-ink">Aula {salon.aula || "(vacia)"}</h5>
              </div>
              <button type="button" onClick={() => setDeleteTarget(salon)} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] bg-[#e9e9e8] text-monserrat-ink/45 hover:bg-red-50 hover:text-red-600">
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
              className={`mt-3 w-full rounded-[9px] border px-3 py-2 text-[11px] font-black ${salon.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-black/10 bg-black/[0.035] text-monserrat-ink/55"}`}>
              {salon.active ? "Activo" : "Inactivo"}
            </button>
          </div>
        ))}
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between border-t border-black/10 px-5 py-3 bg-black/[0.02]">
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
  useEscapeToClose(onCancel);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="border-b border-black/10 bg-black/[0.03] px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-ink/45">Confirmacion requerida</p>
          <h3 className="mt-1 font-serif text-xl font-black text-monserrat-ink">{title}</h3>
        </div>
        <div className="grid gap-4 p-5">
          <p className="text-sm font-semibold leading-6 text-monserrat-ink/70">{message}</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="rounded-[10px] border border-monserrat-ink/12 px-4 py-2 text-[12px] font-black text-monserrat-ink/60 hover:border-monserrat-ink/30">
              Cancelar
            </button>
            <button type="button" onClick={onConfirm} className="rounded-[10px] bg-red-600 px-4 py-2 text-[12px] font-black text-white hover:bg-red-700">
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
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-dashed border-black/15 bg-white py-2.5 text-[12px] font-bold text-monserrat-ink/60 transition hover:border-black/30 hover:text-monserrat-ink">
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
            <div className="flex h-40 w-full flex-col items-center justify-center gap-2 bg-black/[0.035] px-4 text-center text-sm font-semibold text-monserrat-ink/70">
              <span className="text-base font-black">Documento adjunto</span>
              <a href={previewUrl} target="_blank" rel="noreferrer" className="text-monserrat-ink underline">
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
    <div className={`overflow-hidden rounded-[12px] border border-black/10 bg-white ${className}`}>
      <div className={`admin-table-scroll max-h-[70vh] overflow-auto ${bodyClassName}`}>
        <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-[12.5px]">
          <thead className="sticky top-0 z-10 bg-[#e3e3e1]">
            <tr>
              {headers.map((h, i) => (
                <th key={h}
                  className={`px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-ink/45 ${i === 0 ? "w-[12%]" :   // Codigo
                    i === 1 ? "w-[30%]" :   // Nombre
                    i === 2 ? "w-[10%]" :   // Rol
                    i === 3 ? "w-[10%]" :   // Estado
                    "w-[30%]"               // Detalle
                    }`}
                >{h}</th>
              ))}
              <th className="w-[8%] px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-black/10 hover:bg-[#f0f0ef]">
                {row.values.map((v, i) => <td key={i} className="truncate px-2 py-3 text-monserrat-ink/80">{v}</td>)}

                <td className="py-3">
                  <div className="flex gap-1.5">
                    <button type="button" onClick={row.onEdit} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-black/10 bg-white text-monserrat-ink/60 hover:border-black/25 hover:text-monserrat-ink"><Edit3 size={13} /></button>
                    <button type="button" onClick={row.onDelete} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] bg-[#e9e9e8] text-monserrat-ink/45 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
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
  competenciasPorCurso,
  labelAcademico,
  onToggle,
  onClose,
}: {
  curso: string;
  catalogo: CatalogItem[];
  // Mapa completo cursoId -> ids de competencias vinculadas a ESE curso.
  // Se necesita completo (no solo las del curso actual) para saber si una
  // competencia ya pertenece a otra área y así poder "moverla" en un clic.
  competenciasPorCurso: Record<string, string[]>;
  labelAcademico: (id: string) => string;
  onToggle: (competenciaId: string) => void;
  onClose: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  useEscapeToClose(onClose);

  const yaVinculadas = competenciasPorCurso[curso] ?? [];

  // Cada competencia solo puede pertenecer a un área curricular a la vez
  // (así es en el currículo real: una competencia es de Matemática O de
  // Comunicación, no de ambas). Este mapa dice, para cada competencia que
  // NO está en el área actual, a cuál otra área pertenece hoy.
  const areaActualDeCompetencia = useMemo(() => {
    const map: Record<string, string> = {};
    Object.entries(competenciasPorCurso).forEach(([cursoId, ids]) => {
      if (cursoId === curso) return;
      (ids ?? []).forEach((id) => {
        map[id] = cursoId;
      });
    });
    return map;
  }, [competenciasPorCurso, curso]);

  const filtro = normalizarTexto(busqueda.trim());

  const catalogoFiltrado = useMemo(() => {
    if (!filtro) return catalogo;
    return catalogo.filter(
      (c) => normalizarTexto(c.label).includes(filtro) || normalizarTexto(c.id).includes(filtro)
    );
  }, [catalogo, filtro]);

  // Tres grupos fijos para escanear rapido sin leer badge por badge:
  // vinculadas a este curso, libres, y ocupadas por otra area.
  const grupos = useMemo(() => {
    const vinculadas: CatalogItem[] = [];
    const libres: CatalogItem[] = [];
    const enOtraArea: CatalogItem[] = [];
    catalogoFiltrado.forEach((c) => {
      if (yaVinculadas.includes(c.id)) vinculadas.push(c);
      else if (areaActualDeCompetencia[c.id]) enOtraArea.push(c);
      else libres.push(c);
    });
    return { vinculadas, libres, enOtraArea };
  }, [catalogoFiltrado, yaVinculadas, areaActualDeCompetencia]);

  const renderFila = (c: CatalogItem, variant: "linked" | "free" | "other") => {
    const otraArea = areaActualDeCompetencia[c.id];
    return (
      <button
        key={c.id}
        type="button"
        onClick={() => onToggle(c.id)}
        title={otraArea ? `Mover desde ${labelAcademico(otraArea)}` : undefined}
        className={`group flex w-full items-center gap-2.5 rounded-[9px] border px-2.5 py-1.5 text-left transition ${
          variant === "linked"
            ? "border-black/15 bg-black/[0.04] hover:bg-black/[0.06]"
            : variant === "other"
            ? "border-amber-400/35 bg-amber-50/70 hover:bg-amber-50"
            : "border-black/10 bg-white hover:border-black/20 hover:bg-black/[0.025]"
        }`}
      >
        <span
          className={`line-clamp-2 flex-1 text-[12px] font-semibold leading-snug ${
            variant === "linked" ? "text-monserrat-ink" : "text-monserrat-ink/75"
          }`}
        >
          {c.label}
        </span>
        <span
          className={`flex-shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.06em] ${
            variant === "linked"
              ? "bg-monserrat-ink text-white"
              : variant === "other"
              ? "bg-amber-500 text-white"
              : "bg-monserrat-ink/8 text-monserrat-ink/50 group-hover:bg-black/10 group-hover:text-monserrat-ink"
          }`}
        >
          {variant === "linked" ? "Quitar" : variant === "other" ? "Mover" : "Vincular"}
        </span>
      </button>
    );
  };

  const totalMostrado = grupos.vinculadas.length + grupos.libres.length + grupos.enOtraArea.length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="flex w-full max-w-[420px] max-h-[85vh] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        {/* Header compacto: todo en una franja, sin bloques apilados grandes */}
        <div className="flex flex-none items-center justify-between gap-3 border-b border-black/10 bg-black/[0.03] px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-[15px] font-black leading-tight text-monserrat-ink">{labelAcademico(curso)}</h3>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-monserrat-ink/40">
              {yaVinculadas.length}/{catalogo.length} vinculadas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white text-monserrat-ink/40 hover:bg-black/[0.06] hover:text-monserrat-ink"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-none border-b border-monserrat-ink/8 px-4 py-2">
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-monserrat-ink/35" />
            <input
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar competencia..."
              className="w-full rounded-[8px] border border-monserrat-ink/10 bg-white py-1.5 pl-8 pr-3 text-[12px] font-semibold text-monserrat-ink outline-none focus:border-monserrat-red"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {totalMostrado === 0 && (
            <p className="py-6 text-center text-[12.5px] font-semibold text-monserrat-ink/40">
              Ninguna competencia coincide con "{busqueda}"
            </p>
          )}

          {grupos.vinculadas.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[9px] font-black uppercase tracking-[0.1em] text-monserrat-ink/45">
                Vinculadas a esta área ({grupos.vinculadas.length})
              </p>
              <div className="grid gap-1">{grupos.vinculadas.map((c) => renderFila(c, "linked"))}</div>
            </div>
          )}

          {grupos.libres.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[9px] font-black uppercase tracking-[0.1em] text-monserrat-ink/35">
                Disponibles ({grupos.libres.length})
              </p>
              <div className="grid gap-1">{grupos.libres.map((c) => renderFila(c, "free"))}</div>
            </div>
          )}

          {grupos.enOtraArea.length > 0 && (
            <div>
              <p className="mb-1 text-[9px] font-black uppercase tracking-[0.1em] text-amber-600/80">
                En otra área ({grupos.enOtraArea.length})
              </p>
              <div className="grid gap-1">{grupos.enOtraArea.map((c) => renderFila(c, "other"))}</div>
            </div>
          )}
        </div>

        <div className="flex flex-none justify-end border-t border-monserrat-ink/8 px-4 py-2.5">
          <button type="button" onClick={onClose} className="rounded-[9px] bg-monserrat-ink px-4 py-1.5 text-[11.5px] font-black text-white hover:bg-monserrat-ink/85">
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tablero Competencia -> Docente (2 columnas) y modal para elegir el docente
// de una fila. Cada competencia (dentro de un grado/curso) tiene un solo
// docente; un mismo docente puede repetirse en varias filas (1 -> N).
// ---------------------------------------------------------------------------

export function CompetenciaDocenteBoard({
  competencias,
  docentesPorCompetencia,
  grado,
  curso,
  labelDocenteAsignado,
  onEditRow,
  onEditCompetencia,
}: {
  competencias: CatalogItem[];
  docentesPorCompetencia: Record<string, string[]>;
  grado: string;
  curso: string;
  labelDocenteAsignado: (dni: string) => string;
  onEditRow: (competenciaId: string) => void;
  onEditCompetencia?: () => void;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[12px] border border-black/10 bg-white">
      <div className="grid grid-cols-[1.4fr_1fr] border-b border-black/12 bg-[#e3e3e1]">
        <p className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/45 flex items-center gap-1.5">
          <BookOpen size={11} /> Competencias vinculadas
        </p>
        <p className="border-l border-black/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/45 flex items-center gap-1.5">
          <User size={11} /> Docente Asignado
        </p>
      </div>
      <div className="max-h-[62vh] overflow-y-auto">
        {competencias.length === 0 ? (
          <button
            type="button"
            onClick={() => onEditCompetencia?.()}
            className="flex w-full flex-col items-center gap-1.5 py-12 text-center text-sm font-semibold text-monserrat-ink/40 transition hover:text-monserrat-ink"
          >
            <span>Sin competencias vinculadas a esta área</span>
            <span className="rounded-full border border-black/10 bg-black/[0.035] px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-monserrat-ink/60">
              Click para vincular competencias
            </span>
          </button>
        ) : (
          competencias.map((c, i) => {
            const key = matrixKey(grado, curso, c.id);
            const dnis = docentesPorCompetencia[key] ?? [];
            return (
              <div
                key={c.id}
                className={`grid grid-cols-[1.4fr_1fr] border-b border-monserrat-ink/6 last:border-b-0 items-center min-h-[50px] ${
                  i % 2 === 1 ? "bg-black/[0.015]" : ""
                }`}
              >
                <div
                  onClick={() => onEditCompetencia?.()}
                  className="cursor-pointer px-4 py-3 text-[12.5px] font-semibold text-monserrat-ink/80 transition-all hover:translate-x-0.5 hover:text-monserrat-ink"
                >
                  {c.label}
                </div>
                <div className="border-l border-monserrat-ink/6 h-full px-4 py-2 flex items-center min-w-0">
                  {dnis.length > 0 ? (
                    <div
                      onClick={() => onEditRow(c.id)}
                      className="cursor-pointer w-full rounded-[10px] border border-black/10 bg-black/[0.025] px-3 py-2 text-monserrat-ink transition-all hover:bg-black/[0.045] hover:border-black/20"
                    >
                      <div className="flex items-center gap-1.5 text-[12.5px] font-black">
                        <UserCheck size={13} className="shrink-0 text-monserrat-ink/50" />
                        <span className="truncate">{dnis.map((dni) => labelDocenteAsignado(dni)).join(", ")}</span>
                      </div>
                      {dnis.length === 2 && (
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700/80">
                          Máx. 2 docentes
                        </p>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onEditRow(c.id)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-[10px] border border-dashed border-black/15 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wider text-monserrat-ink/55 transition-all hover:border-black/30 hover:bg-black/[0.025] hover:text-monserrat-ink"
                    >
                      <UserPlus size={12} /> Asignar docentes
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Paleta rotativa para los avatares de iniciales: le da variedad visual a la
// grilla de docentes en vez de que todos los circulos sean del mismo color.
const AVATAR_PALETTE = [
  "bg-black/[0.04] text-monserrat-ink/70",
  "bg-black/[0.06] text-monserrat-ink/75",
  "bg-black/[0.035] text-monserrat-ink/65",
  "bg-black/[0.05] text-monserrat-ink/70",
];

export function ElegirDocenteModal({
  competenciaLabel,
  docentes,
  docentesAsignados,
  onToggle,
  onClose,
}: {
  competenciaLabel: string;
  docentes: { dni: string; nombre: string }[];
  docentesAsignados?: string[];
  onToggle: (dni: string) => void;
  onClose: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  useEscapeToClose(onClose);

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    return parts.map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  };

  const mostrarBuscador = docentes.length > 6;
  const filtro = normalizarTexto(busqueda.trim());
  const docentesFiltrados = !filtro
    ? docentes
    : docentes.filter((d) => normalizarTexto(d.nombre).includes(filtro));

  const seleccionCount = (docentesAsignados ?? []).length;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="flex w-full max-w-[420px] max-h-[80vh] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        {/* Header en una sola franja: titulo + contador + cerrar, sin bloques apilados */}
        <div className="flex flex-none items-center justify-between gap-3 border-b border-black/10 bg-black/[0.03] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-monserrat-ink/45">Asignar docente</p>
            <h3 className="truncate font-serif text-[14px] font-black leading-tight text-monserrat-ink">{competenciaLabel}</h3>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-black ${
                seleccionCount === 2 ? "bg-black/[0.08] text-monserrat-ink" : "bg-monserrat-ink/8 text-monserrat-ink/50"
              }`}
            >
              {seleccionCount}/2
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-monserrat-ink/40 hover:bg-black/[0.06] hover:text-monserrat-ink"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {mostrarBuscador && (
          <div className="flex-none border-b border-monserrat-ink/8 px-4 py-2">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-monserrat-ink/35" />
              <input
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar docente..."
                className="w-full rounded-[8px] border border-monserrat-ink/10 bg-white py-1.5 pl-8 pr-3 text-[12px] font-semibold text-monserrat-ink outline-none focus:border-monserrat-red"
              />
            </div>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {docentes.length === 0 && (
            <p className="py-8 text-center text-[12.5px] font-semibold text-monserrat-ink/40">No hay docentes disponibles</p>
          )}
          {docentes.length > 0 && docentesFiltrados.length === 0 && (
            <p className="py-8 text-center text-[12.5px] font-semibold text-monserrat-ink/40">Ningún docente coincide con la búsqueda</p>
          )}

          {/* Grilla de "contactos": 3 columnas en vez de filas apiladas.
              El mismo listado ocupa mucha menos altura porque crece a lo ancho. */}
          <div className="grid grid-cols-3 gap-2">
            {docentesFiltrados.map((d, i) => {
              const selected = (docentesAsignados ?? []).includes(d.dni);
              const canSelect = selected || seleccionCount < 2;
              return (
                <button
                  key={d.dni}
                  type="button"
                  onClick={() => onToggle(d.dni)}
                  disabled={!canSelect}
                  title={d.nombre}
                  className={`relative flex flex-col items-center gap-1.5 rounded-[12px] border p-2.5 text-center transition-all ${
                    selected
                      ? "border-black/20 bg-black/[0.04]"
                      : "border-black/10 bg-white hover:border-black/20 hover:bg-black/[0.025]"
                  } ${!canSelect ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-black ${
                      selected ? "bg-monserrat-ink text-white" : AVATAR_PALETTE[i % AVATAR_PALETTE.length]
                    }`}
                  >
                    {getInitials(d.nombre)}
                  </div>
                  <span className={`line-clamp-2 text-[10.5px] font-bold leading-tight ${selected ? "text-monserrat-ink" : "text-monserrat-ink/70"}`}>
                    {d.nombre}
                  </span>
                  {selected && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-monserrat-ink text-white">
                      <Check size={9} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-none items-center justify-between gap-2 border-t border-monserrat-ink/8 px-4 py-2.5">
          {seleccionCount > 0 ? (
            <button
              type="button"
              onClick={() => onToggle("")}
              className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.04em] text-red-600 hover:text-red-700"
            >
              <X size={12} /> Quitar todos
            </button>
          ) : (
            <span />
          )}
          <button type="button" onClick={onClose} className="rounded-[9px] bg-monserrat-ink px-4 py-1.5 text-[11.5px] font-black text-white hover:bg-monserrat-ink/85">
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
