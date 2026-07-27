import { Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { Ingresante, UsuarioAcademico } from "../../../types";
import { AdminField, MediaPicker } from "./adminComponents";
import { TIPOS_SELECCION, YEARS } from "./adminShared";
import type { AcademicoConfig } from "./adminShared";

type IngresantesTabProps = {
  ingresantes: Ingresante[];
  usuariosAcademicos: UsuarioAcademico[];
  token: string;
  isBusy: boolean;
  runAdminAction: (action: () => Promise<void>, successMessage: string) => void;
  academicoConfig: AcademicoConfig;
  saveAcademicoConfig: (next: AcademicoConfig) => void;
};

const emptyIngresante: Omit<Ingresante, "id"> = {
  nombre: "",
  universidad: "",
  universidadSiglas: "",
  carrera: "",
  anio: "2025",
  tipoSeleccion: "Ordinario",
  fotoUrl: "",
  activo: true,
};

export function IngresantesTab({
  ingresantes,
  usuariosAcademicos,
  token,
  isBusy,
  runAdminAction,
  academicoConfig,
  saveAcademicoConfig
}: IngresantesTabProps) {
  const [editingIngresante, setEditingIngresante] = useState<Ingresante | null>(null);
  const [ingresanteForm, setIngresanteForm] = useState<Omit<Ingresante, "id">>(emptyIngresante);
  const [ingresantePhotoFile, setIngresantePhotoFile] = useState<File | null>(null);
  const [filterYear, setFilterYear] = useState("");
  const [filterSel, setFilterSel] = useState("");
  const [vincularRegistrado, setVincularRegistrado] = useState(false);

  const alumnos = useMemo(() => {
    return (usuariosAcademicos || [])
      .filter((u) => u.rol === "ALUMNO")
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [usuariosAcademicos]);

  const sortedIngresantes = useMemo(() =>
    [...ingresantes].sort((a, b) => Number(b.anio) - Number(a.anio) || b.id - a.id),
    [ingresantes]
  );

  const filteredIngresantes = useMemo(() =>
    sortedIngresantes.filter((i) => {
      const matchYear = !filterYear || i.anio === filterYear;
      const matchSel = !filterSel || i.tipoSeleccion === filterSel;
      return matchYear && matchSel;
    }),
    [sortedIngresantes, filterYear, filterSel]
  );

  const uploadPhoto = async () => {
    if (!ingresantePhotoFile) return ingresanteForm.fotoUrl ?? "";
    return (await monserratApi.uploadMedia(ingresantePhotoFile, "ingresantes", token)).secureUrl;
  };

  const submitIngresante = (e: FormEvent) => {
    e.preventDefault();
    runAdminAction(async () => {
      const fotoUrl = await uploadPhoto();
      const payload = { ...ingresanteForm, fotoUrl };
      if (editingIngresante) {
        await monserratApi.updateIngresante(editingIngresante.id, payload, token);
      } else {
        await monserratApi.createIngresante(payload, token);
      }
      setEditingIngresante(null);
      setIngresanteForm(emptyIngresante);
      setIngresantePhotoFile(null);
    }, "Ingresante guardado correctamente");
  };

  const handleEditClick = (item: Ingresante) => {
    setEditingIngresante(item);
    setIngresanteForm({ ...item });
    setIngresantePhotoFile(null);
  };

  const handleCancelEdit = () => {
    setEditingIngresante(null);
    setIngresanteForm(emptyIngresante);
    setIngresantePhotoFile(null);
  };

  const handleDelete = (id: number) => {
    runAdminAction(
      () => monserratApi.deleteIngresante(id, token),
      "Ingresante eliminado"
    );
  };

  const ingresantePhotoPreview = ingresantePhotoFile
    ? URL.createObjectURL(ingresantePhotoFile)
    : ingresanteForm.fotoUrl;

  const model = academicoConfig?.ingresantesModelo ?? "card-grid";

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      {/* form */}
      <form
        onSubmit={submitIngresante}
        className="grid content-start gap-3 rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/40 p-5"
      >
        <div className="flex items-center justify-between">
          <h4 className="font-serif text-[16px] font-black text-monserrat-ink">
            {editingIngresante ? "Editar ingresante" : "Nuevo ingresante"}
          </h4>
          {!editingIngresante && (
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-monserrat-ink/65 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={vincularRegistrado}
                onChange={(e) => {
                  setVincularRegistrado(e.target.checked);
                  setIngresanteForm((prev) => ({ ...prev, nombre: "", fotoUrl: "" }));
                }}
              />
              Buscar en BD
            </label>
          )}
        </div>
        {vincularRegistrado && !editingIngresante ? (
          <AdminField label="Seleccionar alumno del sistema">
            <select
              className="admin-input"
              required
              onChange={(e) => {
                const selectedDni = e.target.value;
                const match = alumnos.find((a) => a.dni === selectedDni);
                if (match) {
                  setIngresanteForm((prev) => ({
                    ...prev,
                    nombre: match.nombre,
                    fotoUrl: match.fotoUrl ?? "",
                  }));
                } else {
                  setIngresanteForm((prev) => ({
                    ...prev,
                    nombre: "",
                    fotoUrl: "",
                  }));
                }
              }}
            >
              <option value="">-- Selecciona --</option>
              {alumnos.map((a) => (
                <option key={a.dni} value={a.dni}>
                  {a.nombre} ({a.dni})
                </option>
              ))}
            </select>
          </AdminField>
        ) : (
          <AdminField label="Nombre completo">
            <input
              value={ingresanteForm.nombre}
              onChange={(e) => setIngresanteForm({ ...ingresanteForm, nombre: e.target.value })}
              className="admin-input"
              required
            />
          </AdminField>
        )}
        <AdminField label="Universidad">
          <input
            value={ingresanteForm.universidad}
            onChange={(e) => setIngresanteForm({ ...ingresanteForm, universidad: e.target.value })}
            className="admin-input"
            required
          />
        </AdminField>
        <AdminField label="Siglas">
          <input
            value={ingresanteForm.universidadSiglas}
            onChange={(e) =>
              setIngresanteForm({
                ...ingresanteForm,
                universidadSiglas: e.target.value.toUpperCase(),
              })
            }
            className="admin-input"
            required
          />
        </AdminField>
        <AdminField label="Carrera">
          <input
            value={ingresanteForm.carrera}
            onChange={(e) => setIngresanteForm({ ...ingresanteForm, carrera: e.target.value })}
            className="admin-input"
            required
          />
        </AdminField>
        <AdminField label="Año">
          <select
            value={ingresanteForm.anio}
            onChange={(e) => setIngresanteForm({ ...ingresanteForm, anio: e.target.value })}
            className="admin-input"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Tipo de ingreso">
          <select
            value={ingresanteForm.tipoSeleccion}
            onChange={(e) =>
              setIngresanteForm({ ...ingresanteForm, tipoSeleccion: e.target.value })
            }
            className="admin-input"
          >
            {TIPOS_SELECCION.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </AdminField>
        <MediaPicker
          label="Foto (opcional)"
          accept="image/*"
          previewUrl={ingresantePhotoPreview}
          previewType="image"
          onFileChange={setIngresantePhotoFile}
        />
        <div className="flex gap-2">
          <button
            disabled={isBusy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60"
          >
            {editingIngresante ? (
              <>
                <Save size={13} /> Guardar
              </>
            ) : (
              <>
                <Plus size={13} /> Crear
              </>
            )}
          </button>
          {editingIngresante && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded-[10px] border border-monserrat-ink/12 px-3 text-[12px] font-bold text-monserrat-ink/60 hover:border-monserrat-ink/25"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </form>

      {/* tabla */}
      <div className="flex min-w-0 flex-col">
        {/* filtros */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2 flex-wrap">
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="rounded-full border border-monserrat-ink/10 bg-white py-1.5 pl-3 pr-7 text-[12px] font-bold text-monserrat-ink/60 outline-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%231C1410' stroke-width='2' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
                appearance: "none",
              }}
            >
              <option value="">Todos los años</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={filterSel}
              onChange={(e) => setFilterSel(e.target.value)}
              className="rounded-full border border-monserrat-ink/10 bg-white py-1.5 pl-3 pr-7 text-[12px] font-bold text-monserrat-ink/60 outline-none"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%231C1410' stroke-width='2' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 8px center",
                appearance: "none",
              }}
            >
              <option value="">Todos los ingresos</option>
              {TIPOS_SELECCION.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-full border border-monserrat-ink/10 bg-white py-1.5 pl-3 pr-3 text-[12px] font-bold text-monserrat-ink/60">
              <span className="uppercase tracking-[0.12em] text-monserrat-ink/40">Vista</span>
              <select
                value={academicoConfig.ingresantesModelo ?? "card-grid"}
                onChange={(e) => saveAcademicoConfig({ ...academicoConfig, ingresantesModelo: e.target.value })}
                className="rounded-full bg-transparent text-[12px] font-bold text-monserrat-ink outline-none"
              >
                <option value="card-grid">Tabla</option>
                <option value="card-featured">Tarjetas</option>
              </select>
            </label>
          </div>
          <p className="text-[12px] font-semibold text-monserrat-ink/50">
            <span className="font-black text-monserrat-ink">{filteredIngresantes.length}</span>{" "}
            registros
          </p>
        </div>

        <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8 bg-white p-4 shadow-sm">
          {model === "card-featured" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {filteredIngresantes.length === 0 ? (
                <div className="col-span-full py-10 text-center text-[13px] font-semibold text-monserrat-ink/35">
                  Sin resultados
                </div>
              ) : (
                filteredIngresantes.map((item) => (
                  <div
                    key={item.id}
                    className="group overflow-hidden rounded-[12px] border border-monserrat-ink/8 bg-white p-4 transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-lg"
                  >
                    <div className="mb-4 overflow-hidden rounded-[12px] bg-monserrat-cream/20">
                      {item.fotoUrl ? (
                        <img
                          src={item.fotoUrl}
                          alt={item.nombre}
                          className="h-48 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-48 items-center justify-center bg-monserrat-red text-white">
                          <span className="text-3xl font-black">{item.nombre.slice(0, 1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[14px] font-black text-monserrat-ink">{item.nombre}</p>
                        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-monserrat-ink/50">
                          {item.universidadSiglas}
                        </p>
                      </div>
                      <p className="text-[13px] text-monserrat-ink/70">{item.carrera}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-monserrat-red/10 px-3 py-1 text-[11px] font-bold text-monserrat-red">
                          {item.anio}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-monserrat-ink/5 px-3 py-1 text-[11px] font-bold text-monserrat-ink">
                          <span className="h-2.5 w-2.5 rounded-full bg-monserrat-gold" />
                          {item.tipoSeleccion}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full min-w-[600px] border-collapse text-left text-[12.5px]">
                <thead className="bg-monserrat-ink text-monserrat-cream sticky top-0 z-10">
                  <tr>
                    {['Nombre', 'Universidad', 'Carrera', 'Año', 'Ingreso', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-cream/70">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredIngresantes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[13px] font-semibold text-monserrat-ink/35">
                        Sin resultados
                      </td>
                    </tr>
                  ) : (
                    filteredIngresantes.map((item) => (
                      <tr key={item.id} className="border-t border-monserrat-ink/6 transition hover:bg-monserrat-cream/30">
                        <td className="px-4 py-3 font-bold text-monserrat-ink">{item.nombre}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1">
                            {item.universidadSiglas}
                          </span>
                        </td>
                        <td className="max-w-[180px] truncate px-4 py-3 text-monserrat-ink/70">{item.carrera}</td>
                        <td className="px-4 py-3 font-black text-monserrat-red">{item.anio}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-monserrat-gold/90">
                            <span className="h-[5px] w-[5px] rounded-full bg-monserrat-gold" />{item.tipoSeleccion}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <button type="button" onClick={() => handleEditClick(item)} className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-monserrat-ink/12 bg-white transition hover:border-monserrat-ink/30">
                              <Edit3 size={13} />
                            </button>
                            <button type="button" onClick={() => handleDelete(item.id)} className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-monserrat-red/8 text-monserrat-red transition hover:bg-monserrat-red/16">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
