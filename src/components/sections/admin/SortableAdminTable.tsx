import { Check, Edit3, GripVertical, Trash2, X } from "lucide-react";
import { useState } from "react";

export type SortableRow = {
  id: number;
  values: string[];
  activo: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

type SortableAdminTableProps = {
  headers: string[];
  rows: SortableRow[];
  onReorder: (orderedIds: number[]) => void;
  className?: string;
  bodyClassName?: string;
};

export function SortableAdminTable({ headers, rows, onReorder, className = "", bodyClassName = "" }: SortableAdminTableProps) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  const handleDrop = (targetId: number) => {
    if (dragId === null || dragId === targetId) {
      setDragId(null);
      setOverId(null);
      return;
    }
    const ids = rows.map((r) => r.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from >= 0 && to >= 0) {
      ids.splice(from, 1);
      ids.splice(to, 0, dragId);
      onReorder(ids);
    }
    setDragId(null);
    setOverId(null);
  };

  return (
    <div className={`overflow-hidden rounded-[12px] border border-[#eadfc4] bg-white ${className}`}>
      <div className={`admin-table-scroll max-h-[70vh] overflow-auto ${bodyClassName}`}>
        <table className="w-full min-w-[520px] border-collapse text-left text-[12.5px]">
          <thead className="pro-th sticky top-0 z-10">
            <tr>
              <th className="w-[36px] px-2 py-3"></th>
              {headers.map((h) => (
                <th key={h} className="px-3 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-ink/45">
                  {h}
                </th>
              ))}
              <th className="w-[120px] px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                draggable
                onDragStart={(e) => {
                  setDragId(row.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(row.id));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overId !== row.id) setOverId(row.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(row.id);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                className={`border-t border-[#eadfc4] hover:bg-[#fbf3de] ${dragId === row.id ? "opacity-40" : ""} ${
                  overId === row.id && dragId !== null && dragId !== row.id ? "bg-monserrat-red/5 shadow-[inset_0_2px_0_0_rgb(185,28,28)]" : ""
                }`}
              >
                <td className="cursor-grab px-2 py-3 text-monserrat-ink/35 active:cursor-grabbing">
                  <GripVertical size={14} />
                </td>
                {row.values.map((v, i) => (
                  <td key={i} className={`max-w-[260px] truncate px-3 py-3 text-monserrat-ink/80 ${row.activo ? "" : "opacity-50"}`}>
                    {v}
                  </td>
                ))}
                <td className="py-3 pr-3">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={row.onToggle}
                      title={row.activo ? "Activo (clic para desactivar)" : "Inactivo (clic para activar)"}
                      className={`flex h-8 w-8 items-center justify-center rounded-[8px] border ${
                        row.activo
                          ? "border-green-200 bg-green-50 text-green-600 hover:bg-green-100"
                          : "border-[#eadfc4] bg-[#f4ead2] text-monserrat-ink/45 hover:bg-[#ecdfbd]"
                      }`}
                    >
                      {row.activo ? <Check size={14} /> : <X size={14} />}
                    </button>
                    <button type="button" onClick={row.onEdit} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#eadfc4] bg-white text-monserrat-ink/60 hover:border-black/25 hover:text-monserrat-ink">
                      <Edit3 size={13} />
                    </button>
                    <button type="button" onClick={row.onDelete} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-[8px] bg-[#f4ead2] text-monserrat-ink/45 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
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
