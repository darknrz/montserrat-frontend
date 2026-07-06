import { Edit3, ImagePlus, Plus, Save, Search, Trash2, Upload } from "lucide-react";
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
export function CompetenciasPanel({
  items,
  onChange,
}: {
  items: CatalogItem[];
  onChange: (items: CatalogItem[]) => void;
}) {
  const [nuevaCompetencia, setNuevaCompetencia] = useState("");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  const updateItem = (index: number, patch: Partial<CatalogItem>) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    const label = nuevaCompetencia.trim();
    if (!label) return;
    const id = `C${items.length + 1}`;
    const finalId = items.some((item) => item.id === id) ? createCatalogId(label, items) : id;
    onChange([...items, { id: finalId, label, active: true }]);
    setNuevaCompetencia("");
  };

  const deleteItem = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    setDeleteIndex(null);
  };
  const itemToDelete = deleteIndex === null ? null : items[deleteIndex];

  return (
    <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8 bg-white shadow-sm">
      <div className="border-b border-monserrat-ink/8 bg-monserrat-ink px-5 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-cream/70">Configuracion</p>
        <h4 className="font-serif text-xl font-black text-white">Competencias de primaria</h4>
      </div>

      <div className="border-b border-monserrat-ink/8 bg-monserrat-cream/15 p-4">
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
            className="flex-1 resize-none rounded-[10px] border border-monserrat-ink/10 bg-white px-3 py-2 text-sm font-semibold text-monserrat-ink outline-none focus:border-monserrat-red"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!nuevaCompetencia.trim()}
            className="inline-flex items-center justify-center gap-1 rounded-[10px] bg-monserrat-red px-4 py-2 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-40 sm:self-start"
          >
            <Plus size={14} /> Agregar
          </button>
        </div>
        <p className="mt-1.5 text-[11px] font-semibold text-monserrat-ink/40">
          Enter para agregar rapido · Shift+Enter para bajar de linea · Máximo 500 caracteres
        </p>
      </div>

      <div className="grid gap-2 p-4 max-h-[520px] overflow-y-auto">
        {items.length === 0 && (
          <p className="py-6 text-center text-sm font-semibold text-monserrat-ink/40">
            Aun no hay competencias registradas.
          </p>
        )}
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 rounded-[12px] border p-3 transition ${
              item.active ? "border-monserrat-ink/8 bg-monserrat-cream/25" : "border-monserrat-ink/8 bg-white opacity-60"
            }`}
          >
            <span className="mt-1 flex-shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-monserrat-ink/40">
              {item.id}
            </span>
            <textarea
              value={item.label}
              maxLength={500}
              onChange={(e) => updateItem(index, { label: e.target.value })}
              rows={2}
              className="flex-1 resize-none rounded-[10px] border border-monserrat-ink/10 bg-white px-3 py-2 text-sm font-bold text-monserrat-ink outline-none focus:border-monserrat-red"
            />
            <div className="flex flex-shrink-0 flex-col gap-1.5">
              <button
                type="button"
                onClick={() => updateItem(index, { active: !item.active })}
                className={`rounded-[8px] px-2.5 py-1.5 text-[10px] font-black ${
                  item.active ? "bg-emerald-600 text-white" : "bg-monserrat-ink/8 text-monserrat-ink/55"
                }`}
              >
                {item.active ? "Activo" : "Inactivo"}
              </button>
              <button
                type="button"
                onClick={() => setDeleteIndex(index)}
                className="flex h-7 w-7 items-center justify-center self-center rounded-[8px] bg-monserrat-red/8 text-monserrat-red hover:bg-monserrat-red/16"
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
  useEscapeToClose(onCancel);
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

  const catalogoOrdenado = useMemo(() => {
    // Las ya vinculadas aquí primero, luego libres, luego las de otras áreas
    return [...catalogo].sort((a, b) => {
      const rank = (id: string) => (yaVinculadas.includes(id) ? 0 : areaActualDeCompetencia[id] ? 2 : 1);
      return rank(a.id) - rank(b.id);
    });
  }, [catalogo, yaVinculadas, areaActualDeCompetencia]);

  const catalogoFiltrado = useMemo(() => {
    if (!filtro) return catalogoOrdenado;
    return catalogoOrdenado.filter(
      (c) => normalizarTexto(c.label).includes(filtro) || normalizarTexto(c.id).includes(filtro)
    );
  }, [catalogoOrdenado, filtro]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[460px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="border-b border-monserrat-ink/8 bg-monserrat-cream px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">Vincular competencias</p>
          <h3 className="mt-1 font-serif text-xl font-black text-monserrat-ink">{labelAcademico(curso)}</h3>
          <p className="mt-1 text-[11px] font-semibold text-monserrat-ink/45">
            {yaVinculadas.length} de {catalogo.length} vinculada{yaVinculadas.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="border-b border-monserrat-ink/8 bg-white px-5 py-3">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-monserrat-ink/35" />
            <input
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar competencia..."
              className="w-full rounded-[10px] border border-monserrat-ink/10 bg-white py-2 pl-9 pr-3 text-[12.5px] font-semibold text-monserrat-ink outline-none focus:border-monserrat-red"
            />
          </div>
        </div>

        <div className="grid max-h-[360px] gap-2 overflow-y-auto p-4">
          {catalogoFiltrado.length === 0 && (
            <p className="py-6 text-center text-sm font-semibold text-monserrat-ink/40">
              Ninguna competencia coincide con "{busqueda}"
            </p>
          )}
          {catalogoFiltrado.map((c) => {
            const linked = yaVinculadas.includes(c.id);
            const otraArea = areaActualDeCompetencia[c.id];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onToggle(c.id)}
                title={otraArea ? `Mover desde ${labelAcademico(otraArea)}` : undefined}
                className={`flex items-start justify-between gap-3 rounded-[10px] border px-3 py-2 text-left text-[12.5px] font-semibold transition ${
                  linked
                    ? "border-monserrat-red/30 bg-monserrat-red/8 text-monserrat-red"
                    : otraArea
                    ? "border-amber-400/40 bg-amber-50 text-monserrat-ink/60"
                    : "border-monserrat-ink/10 text-monserrat-ink/70 hover:border-monserrat-ink/25"
                }`}
              >
                <span className="min-w-0">
                  <span className="block">{c.label}</span>
                  {otraArea && (
                    <span className="mt-0.5 block text-[10px] font-black uppercase text-amber-600">
                      En {labelAcademico(otraArea)} · clic para mover aquí
                    </span>
                  )}
                </span>
                <span className="flex-shrink-0 text-[10px] font-black uppercase">
                  {linked ? "Vinculada" : otraArea ? "Mover" : "Vincular"}
                </span>
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
  docentesPorCompetencia: Record<string, string>;
  grado: string;
  curso: string;
  labelDocenteAsignado: (dni: string) => string;
  onEditRow: (competenciaId: string) => void;
  onEditCompetencia?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[16px] border border-monserrat-ink/8 bg-white shadow-sm">
      <div className="grid grid-cols-2 border-b border-monserrat-ink/8 bg-monserrat-ink">
        <p className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-cream/70">
          Competencias
        </p>
        <p className="border-l border-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-cream/70">
          Docentes
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {competencias.length === 0 ? (
          <button
            type="button"
            onClick={() => onEditCompetencia?.()}
            className="flex w-full flex-col items-center gap-1 py-8 text-center text-sm font-semibold text-monserrat-ink/40 transition hover:text-monserrat-red"
          >
            <span>Sin competencias vinculadas a esta area</span>
            <span className="text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-red/70">
              Click para vincular
            </span>
          </button>
        ) : (
          competencias.map((c, i) => {
            const key = matrixKey(grado, curso, c.id);
            const dni = docentesPorCompetencia[key];
            return (
              <div
                key={c.id}
                className={`grid grid-cols-2 border-b border-monserrat-ink/6 last:border-b-0 ${
                  i % 2 === 1 ? "bg-monserrat-cream/10" : ""
                }`}
              >
                <p
                  onClick={() => onEditCompetencia?.()}
                  className="cursor-pointer px-4 py-3 text-[12.5px] font-semibold text-monserrat-ink/80 transition hover:bg-monserrat-cream/20 hover:text-monserrat-red"
                >
                  {c.label}
                </p>
                <p
                  onClick={() => onEditRow(c.id)}
                  className={`cursor-pointer border-l border-monserrat-ink/6 px-4 py-3 text-[12.5px] font-black transition hover:bg-monserrat-cream/20 ${
                    dni ? "text-monserrat-ink" : "text-monserrat-ink/35"
                  }`}
                >
                  {dni ? labelDocenteAsignado(dni) : "Sin asignar"}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ElegirDocenteModal({
  competenciaLabel,
  docentes,
  docenteActualDni,
  onSelect,
  onClose,
}: {
  competenciaLabel: string;
  docentes: { dni: string; nombre: string }[];
  docenteActualDni?: string;
  onSelect: (dni: string) => void;
  onClose: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  useEscapeToClose(onClose);

  // El buscador solo aparece si hay varios docentes para elegir; con pocos,
  // solo estorba y hace más largo el flujo sin necesidad.
  const mostrarBuscador = docentes.length > 6;
  const filtro = normalizarTexto(busqueda.trim());
  const docentesFiltrados = !filtro
    ? docentes
    : docentes.filter((d) => normalizarTexto(d.nombre).includes(filtro));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="border-b border-monserrat-ink/8 bg-monserrat-cream px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">
            Asignar docente
          </p>
          <h3 className="mt-1 font-serif text-xl font-black text-monserrat-ink">{competenciaLabel}</h3>
        </div>

        {mostrarBuscador && (
          <div className="border-b border-monserrat-ink/8 bg-white px-5 py-3">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-monserrat-ink/35" />
              <input
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar docente..."
                className="w-full rounded-[10px] border border-monserrat-ink/10 bg-white py-2 pl-9 pr-3 text-[12.5px] font-semibold text-monserrat-ink outline-none focus:border-monserrat-red"
              />
            </div>
          </div>
        )}

        <div className="grid max-h-[360px] gap-2 overflow-y-auto p-4">
          {docenteActualDni && (
            <button
              type="button"
              onClick={() => onSelect("")}
              className="flex items-center justify-between rounded-[10px] border border-monserrat-ink/10 px-3 py-2 text-left text-[12.5px] font-semibold text-monserrat-ink/50 hover:border-monserrat-ink/25"
            >
              Quitar asignacion
            </button>
          )}
          {docentes.length === 0 && (
            <p className="py-4 text-center text-sm font-semibold text-monserrat-ink/40">
              No hay docentes disponibles
            </p>
          )}
          {docentes.length > 0 && docentesFiltrados.length === 0 && (
            <p className="py-4 text-center text-sm font-semibold text-monserrat-ink/40">
              Ningún docente coincide con la búsqueda
            </p>
          )}
          {docentesFiltrados.map((d) => {
            const selected = d.dni === docenteActualDni;
            return (
              <button
                key={d.dni}
                type="button"
                onClick={() => onSelect(d.dni)}
                className={`flex items-center justify-between rounded-[10px] border px-3 py-2 text-left text-[12.5px] font-semibold transition ${
                  selected
                    ? "border-monserrat-red/30 bg-monserrat-red/8 text-monserrat-red"
                    : "border-monserrat-ink/10 text-monserrat-ink/70 hover:border-monserrat-ink/25"
                }`}
              >
                <span>{d.nombre}</span>
                {selected && <span className="text-[10px] font-black uppercase">Asignado</span>}
              </button>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 border-t border-monserrat-ink/8 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[10px] bg-monserrat-red px-4 py-2 text-[12px] font-black text-white hover:bg-monserrat-red/85"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}