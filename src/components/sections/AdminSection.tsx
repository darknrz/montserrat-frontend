import { Edit3, ImagePlus, LogOut, Plus, Save, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../api/monserrat";
import type { Ingresante, Institution, LoginResponse, RedSocial, Video } from "../../types";
import { SectionHeader } from "../ui/SectionHeader";

type AdminSectionProps = {
  institution: Institution;
  ingresantes: Ingresante[];
  videos: Video[];
  redes: RedSocial[];
  onRefresh: () => Promise<void>;
};

type Tab = "institucion" | "ingresantes" | "videos" | "redes";

const emptyIngresante: Omit<Ingresante, "id"> = {
  nombre: "",
  universidad: "",
  universidadSiglas: "",
  carrera: "",
  anio: "2025",
  tipoSeleccion: "1ra Seleccion",
  fotoUrl: "",
  activo: true
};

const emptyVideo: Omit<Video, "id"> = {
  titulo: "",
  descripcion: "",
  mediaType: "image",
  mediaUrl: "",
  publicId: "",
  thumbnailUrl: "",
  formato: "",
  tag: "Institucional",
  tagColor: "red",
  activo: true,
  orden: 1
};

const emptyRed: Omit<RedSocial, "id"> = {
  nombre: "",
  icono: "",
  url: "",
  activo: true,
  orden: 1
};

export function AdminSection({ institution, ingresantes, videos, redes, onRefresh }: AdminSectionProps) {
  const [session, setSession] = useState<LoginResponse | null>(() => {
    const stored = window.localStorage.getItem("monserrat_admin_session");
    return stored ? (JSON.parse(stored) as LoginResponse) : null;
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("ingresantes");
  const [status, setStatus] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [editingIngresante, setEditingIngresante] = useState<Ingresante | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editingRed, setEditingRed] = useState<RedSocial | null>(null);
  const [institutionForm, setInstitutionForm] = useState<Institution>(institution);
  const [ingresanteForm, setIngresanteForm] = useState<Omit<Ingresante, "id">>(emptyIngresante);
  const [videoForm, setVideoForm] = useState<Omit<Video, "id">>(emptyVideo);
  const [redForm, setRedForm] = useState<Omit<RedSocial, "id">>(emptyRed);
  const [institutionLogoFile, setInstitutionLogoFile] = useState<File | null>(null);
  const [ingresantePhotoFile, setIngresantePhotoFile] = useState<File | null>(null);
  const [videoMediaFile, setVideoMediaFile] = useState<File | null>(null);

  const token = session?.token ?? "";
  const sortedIngresantes = useMemo(() => [...ingresantes].sort((a, b) => Number(b.anio) - Number(a.anio) || b.id - a.id), [ingresantes]);

  useEffect(() => {
    setInstitutionForm(institution);
  }, [institution]);

  const runAdminAction = async (action: () => Promise<void>, successMessage: string) => {
    setIsBusy(true);
    setStatus(null);
    try {
      await action();
      await onRefresh();
      setStatus(successMessage);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo completar la operacion");
    } finally {
      setIsBusy(false);
    }
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsBusy(true);
    setStatus(null);
    try {
      const response = await monserratApi.login(username, password);
      window.localStorage.setItem("monserrat_admin_session", JSON.stringify(response));
      setSession(response);
      setUsername("");
      setPassword("");
      setStatus(`Sesion iniciada como ${response.nombre}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Credenciales incorrectas");
    } finally {
      setIsBusy(false);
    }
  };

  const logout = () => {
    window.localStorage.removeItem("monserrat_admin_session");
    setSession(null);
    setStatus(null);
  };

  const uploadInstitutionLogoIfNeeded = async () => {
    if (!institutionLogoFile) return institutionForm.logoUrl ?? "";
    const uploaded = await monserratApi.uploadMedia(institutionLogoFile, "institution", token);
    return uploaded.secureUrl;
  };

  const uploadIngresantePhotoIfNeeded = async () => {
    if (!ingresantePhotoFile) return ingresanteForm.fotoUrl ?? "";
    const uploaded = await monserratApi.uploadMedia(ingresantePhotoFile, "ingresantes", token);
    return uploaded.secureUrl;
  };

  const uploadVideoMediaIfNeeded = async () => {
    if (!videoMediaFile) {
      if (!videoForm.mediaUrl || !videoForm.publicId) {
        throw new Error("Debes subir una imagen o video para el carrusel.");
      }
      return {
        mediaType: videoForm.mediaType,
        mediaUrl: videoForm.mediaUrl,
        publicId: videoForm.publicId,
        thumbnailUrl: videoForm.thumbnailUrl ?? videoForm.mediaUrl,
        formato: videoForm.formato ?? ""
      };
    }

    const uploaded = await monserratApi.uploadMedia(videoMediaFile, "carousel", token);
    return {
      mediaType: uploaded.resourceType,
      mediaUrl: uploaded.secureUrl,
      publicId: uploaded.publicId,
      thumbnailUrl: uploaded.thumbnailUrl ?? uploaded.secureUrl,
      formato: uploaded.format ?? ""
    };
  };

  const submitIngresante = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAdminAction(async () => {
      const fotoUrl = await uploadIngresantePhotoIfNeeded();
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

  const submitVideo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAdminAction(async () => {
      const currentPublicId = editingVideo?.publicId;
      const currentMediaType = editingVideo?.mediaType;
      const uploadedMedia = await uploadVideoMediaIfNeeded();
      const payload = { ...videoForm, ...uploadedMedia };

      if (editingVideo) {
        await monserratApi.updateVideo(editingVideo.id, payload, token);
      } else {
        await monserratApi.createVideo(payload, token);
      }

      if (videoMediaFile && currentPublicId && currentMediaType && currentPublicId !== payload.publicId) {
        await monserratApi.deleteMedia(currentPublicId, currentMediaType, token);
      }

      setEditingVideo(null);
      setVideoForm(emptyVideo);
      setVideoMediaFile(null);
    }, "Medio del carrusel guardado correctamente");
  };

  const submitRed = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAdminAction(async () => {
      if (editingRed) {
        await monserratApi.updateRedSocial(editingRed.id, redForm, token);
      } else {
        await monserratApi.createRedSocial(redForm, token);
      }
      setEditingRed(null);
      setRedForm(emptyRed);
    }, "Red social guardada correctamente");
  };

  const submitInstitution = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAdminAction(async () => {
      const logoUrl = await uploadInstitutionLogoIfNeeded();
      await monserratApi.updateInstitution(institutionForm.id ?? 1, { ...institutionForm, logoUrl }, token);
      setInstitutionLogoFile(null);
    }, "Datos institucionales actualizados");
  };

  const resetIngresanteForm = () => {
    setEditingIngresante(null);
    setIngresanteForm(emptyIngresante);
    setIngresantePhotoFile(null);
  };

  const resetVideoForm = () => {
    setEditingVideo(null);
    setVideoForm(emptyVideo);
    setVideoMediaFile(null);
  };

  const institutionLogoPreview = institutionLogoFile ? URL.createObjectURL(institutionLogoFile) : institutionForm.logoUrl;
  const ingresantePhotoPreview = ingresantePhotoFile ? URL.createObjectURL(ingresantePhotoFile) : ingresanteForm.fotoUrl;
  const videoPreview = videoMediaFile
    ? { src: URL.createObjectURL(videoMediaFile), type: videoMediaFile.type.startsWith("video/") ? "video" : "image" }
    : { src: videoForm.thumbnailUrl || videoForm.mediaUrl, type: videoForm.mediaType };

  return (
    <section id="admin" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Administracion"
          title="Ingresar si eres administrador"
          description="Gestiona la informacion publicada en la pagina institucional y sube medios a Cloudinary."
        />

        {!session ? (
          <form onSubmit={handleLogin} className="mx-auto mt-10 max-w-md rounded-lg border border-white/15 bg-white p-6 text-monserrat-ink shadow-gold">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-monserrat-red text-white">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black">Acceso administrador</h3>
                <p className="text-sm text-monserrat-ink/65">Ingresa tus credenciales del backend.</p>
              </div>
            </div>
            <label className="grid gap-2 text-sm font-bold">
              Usuario
              <input value={username} onChange={(event) => setUsername(event.target.value)} className="rounded-md border border-black/15 px-3 py-2 font-normal outline-none focus:border-monserrat-red" required />
            </label>
            <label className="mt-4 grid gap-2 text-sm font-bold">
              Contrasena
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-md border border-black/15 px-3 py-2 font-normal outline-none focus:border-monserrat-red" required />
            </label>
            <button disabled={isBusy} className="mt-6 w-full rounded-md bg-monserrat-red px-4 py-3 font-black text-white transition hover:bg-red-800 disabled:opacity-60">
              Ingresar
            </button>
            {status && <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{status}</p>}
          </form>
        ) : (
          <div className="mt-10 rounded-lg border border-white/15 bg-white text-monserrat-ink shadow-gold">
            <div className="flex flex-col gap-4 border-b border-black/10 p-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-monserrat-red">Sesion activa</p>
                <h3 className="text-xl font-black">{session.nombre}</h3>
              </div>
              <button onClick={logout} className="inline-flex items-center justify-center gap-2 rounded-md border border-black/15 px-4 py-2 text-sm font-black hover:bg-black/5">
                <LogOut size={17} />
                Cerrar sesion
              </button>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-black/10 p-4">
              {(["institucion", "ingresantes", "videos", "redes"] as Tab[]).map((item) => (
                <button key={item} onClick={() => setTab(item)} className={`rounded-md px-4 py-2 text-sm font-black capitalize ${tab === item ? "bg-monserrat-red text-white" : "bg-monserrat-cream text-monserrat-ink"}`}>
                  {item}
                </button>
              ))}
            </div>

            <div className="p-5">
              {status && <p className="mb-5 rounded-md bg-monserrat-cream px-4 py-3 text-sm font-bold text-monserrat-ink">{status}</p>}

              {tab === "institucion" && (
                <form onSubmit={submitInstitution} className="grid gap-4 lg:grid-cols-2">
                  <AdminInput label="Nombre" value={institutionForm.nombre} onChange={(value) => setInstitutionForm({ ...institutionForm, nombre: value })} />
                  <AdminInput label="Direccion" value={institutionForm.direccion} onChange={(value) => setInstitutionForm({ ...institutionForm, direccion: value })} />
                  <AdminInput label="Ciudad" value={institutionForm.ciudad} onChange={(value) => setInstitutionForm({ ...institutionForm, ciudad: value })} />
                  <AdminInput label="Distrito" value={institutionForm.distrito ?? ""} onChange={(value) => setInstitutionForm({ ...institutionForm, distrito: value })} />
                  <AdminInput label="Fundacion" value={institutionForm.anioFundacion} onChange={(value) => setInstitutionForm({ ...institutionForm, anioFundacion: value })} />
                  <AdminInput label="Telefono" value={institutionForm.telefono ?? ""} onChange={(value) => setInstitutionForm({ ...institutionForm, telefono: value })} />
                  <AdminInput label="Correo" value={institutionForm.email} onChange={(value) => setInstitutionForm({ ...institutionForm, email: value })} />
                  <AdminInput label="Horario" value={institutionForm.horarioAtencion} onChange={(value) => setInstitutionForm({ ...institutionForm, horarioAtencion: value })} />
                  <div className="lg:col-span-2">
                    <MediaPicker
                      label="Logo institucional"
                      accept="image/*"
                      previewUrl={institutionLogoPreview}
                      previewType="image"
                      onFileChange={setInstitutionLogoFile}
                    />
                  </div>
                  <AdminTextarea label="Mision" value={institutionForm.mision} onChange={(value) => setInstitutionForm({ ...institutionForm, mision: value })} />
                  <AdminTextarea label="Vision" value={institutionForm.vision} onChange={(value) => setInstitutionForm({ ...institutionForm, vision: value })} />
                  <div className="lg:col-span-2">
                    <AdminTextarea label="Descripcion" value={institutionForm.descripcion} onChange={(value) => setInstitutionForm({ ...institutionForm, descripcion: value })} />
                  </div>
                  <AdminSaveButton isBusy={isBusy} />
                </form>
              )}

              {tab === "ingresantes" && (
                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <form onSubmit={submitIngresante} className="grid content-start gap-4 rounded-lg border border-black/10 p-4">
                    <h4 className="text-lg font-black">{editingIngresante ? "Editar ingresante" : "Nuevo ingresante"}</h4>
                    <AdminInput label="Nombre" value={ingresanteForm.nombre} onChange={(value) => setIngresanteForm({ ...ingresanteForm, nombre: value })} />
                    <AdminInput label="Universidad" value={ingresanteForm.universidad} onChange={(value) => setIngresanteForm({ ...ingresanteForm, universidad: value })} />
                    <AdminInput label="Siglas" value={ingresanteForm.universidadSiglas} onChange={(value) => setIngresanteForm({ ...ingresanteForm, universidadSiglas: value.toUpperCase() })} />
                    <AdminInput label="Carrera" value={ingresanteForm.carrera} onChange={(value) => setIngresanteForm({ ...ingresanteForm, carrera: value })} />
                    <AdminInput label="Anio" value={ingresanteForm.anio} onChange={(value) => setIngresanteForm({ ...ingresanteForm, anio: value })} />
                    <AdminInput label="Seleccion" value={ingresanteForm.tipoSeleccion} onChange={(value) => setIngresanteForm({ ...ingresanteForm, tipoSeleccion: value })} />
                    <MediaPicker
                      label="Foto del ingresante"
                      accept="image/*"
                      previewUrl={ingresantePhotoPreview}
                      previewType="image"
                      onFileChange={setIngresantePhotoFile}
                    />
                    <AdminSaveButton isBusy={isBusy} editing={Boolean(editingIngresante)} onCancel={resetIngresanteForm} />
                  </form>
                  <AdminTable
                    headers={["Nombre", "Universidad", "Carrera", "Anio"]}
                    rows={sortedIngresantes.map((item) => ({
                      id: item.id,
                      values: [item.nombre, item.universidadSiglas, item.carrera, item.anio],
                      onEdit: () => {
                        setEditingIngresante(item);
                        setIngresanteForm({ ...item });
                        setIngresantePhotoFile(null);
                      },
                      onDelete: () => void runAdminAction(() => monserratApi.deleteIngresante(item.id, token), "Ingresante eliminado")
                    }))}
                  />
                </div>
              )}

              {tab === "videos" && (
                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <form onSubmit={submitVideo} className="grid content-start gap-4 rounded-lg border border-black/10 p-4">
                    <h4 className="text-lg font-black">{editingVideo ? "Editar medio del carrusel" : "Nuevo medio del carrusel"}</h4>
                    <AdminInput label="Titulo" value={videoForm.titulo} onChange={(value) => setVideoForm({ ...videoForm, titulo: value })} />
                    <AdminTextarea label="Descripcion" value={videoForm.descripcion} onChange={(value) => setVideoForm({ ...videoForm, descripcion: value })} />
                    <MediaPicker
                      label="Imagen o video"
                      accept="image/*,video/*"
                      previewUrl={videoPreview.src}
                      previewType={videoPreview.type}
                      onFileChange={setVideoMediaFile}
                    />
                    <AdminInput label="Tag" value={videoForm.tag} onChange={(value) => setVideoForm({ ...videoForm, tag: value })} />
                    <AdminInput label="Color tag" value={videoForm.tagColor} onChange={(value) => setVideoForm({ ...videoForm, tagColor: value })} />
                    <AdminInput label="Orden" value={String(videoForm.orden ?? 0)} onChange={(value) => setVideoForm({ ...videoForm, orden: Number(value) })} />
                    <AdminSaveButton isBusy={isBusy} editing={Boolean(editingVideo)} onCancel={resetVideoForm} />
                  </form>
                  <AdminTable
                    headers={["Titulo", "Tipo", "Orden"]}
                    rows={videos.map((item) => ({
                      id: item.id,
                      values: [item.titulo, item.mediaType, String(item.orden ?? 0)],
                      onEdit: () => {
                        setEditingVideo(item);
                        setVideoForm({ ...item });
                        setVideoMediaFile(null);
                      },
                      onDelete: () => void runAdminAction(async () => {
                        await monserratApi.deleteVideo(item.id, token);
                        await monserratApi.deleteMedia(item.publicId, item.mediaType, token);
                      }, "Medio del carrusel eliminado")
                    }))}
                  />
                </div>
              )}

              {tab === "redes" && (
                <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                  <form onSubmit={submitRed} className="grid content-start gap-4 rounded-lg border border-black/10 p-4">
                    <h4 className="text-lg font-black">{editingRed ? "Editar red social" : "Nueva red social"}</h4>
                    <AdminInput label="Nombre" value={redForm.nombre} onChange={(value) => setRedForm({ ...redForm, nombre: value })} />
                    <AdminInput label="Icono" value={redForm.icono} onChange={(value) => setRedForm({ ...redForm, icono: value })} />
                    <AdminInput label="URL" value={redForm.url} onChange={(value) => setRedForm({ ...redForm, url: value })} />
                    <AdminInput label="Orden" value={String(redForm.orden ?? 0)} onChange={(value) => setRedForm({ ...redForm, orden: Number(value) })} />
                    <AdminSaveButton isBusy={isBusy} editing={Boolean(editingRed)} onCancel={() => { setEditingRed(null); setRedForm(emptyRed); }} />
                  </form>
                  <AdminTable
                    headers={["Nombre", "Icono", "URL"]}
                    rows={redes.map((item) => ({
                      id: item.id,
                      values: [item.nombre, item.icono, item.url],
                      onEdit: () => { setEditingRed(item); setRedForm({ ...item }); },
                      onDelete: () => void runAdminAction(() => monserratApi.deleteRedSocial(item.id, token), "Red social eliminada")
                    }))}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function AdminInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-black/15 px-3 py-2 font-normal outline-none focus:border-monserrat-red" required />
    </label>
  );
}

function AdminTextarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} className="resize-y rounded-md border border-black/15 px-3 py-2 font-normal outline-none focus:border-monserrat-red" required />
    </label>
  );
}

function MediaPicker({
  label,
  accept,
  previewUrl,
  previewType,
  onFileChange
}: {
  label: string;
  accept: string;
  previewUrl?: string;
  previewType?: string;
  onFileChange: (file: File | null) => void;
}) {
  return (
    <div className="grid gap-3">
      <label className="text-sm font-bold">{label}</label>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-black/20 bg-monserrat-cream px-4 py-3 text-sm font-bold text-monserrat-ink hover:border-monserrat-red">
        <Upload size={16} />
        Subir archivo
        <input type="file" accept={accept} onChange={(event) => onFileChange(event.target.files?.[0] ?? null)} className="hidden" />
      </label>
      {previewUrl ? (
        <div className="overflow-hidden rounded-md border border-black/10 bg-black/5">
          {previewType === "video" ? (
            <video src={previewUrl} controls className="h-56 w-full bg-black object-cover" />
          ) : (
            <img src={previewUrl} alt={label} className="h-56 w-full object-cover" />
          )}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-black/10 bg-monserrat-cream text-sm font-semibold text-monserrat-ink/65">
          <ImagePlus size={18} className="mr-2" />
          Sin archivo seleccionado
        </div>
      )}
    </div>
  );
}

function AdminSaveButton({ isBusy, editing = false, onCancel }: { isBusy: boolean; editing?: boolean; onCancel?: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button disabled={isBusy} className="inline-flex items-center justify-center gap-2 rounded-md bg-monserrat-red px-4 py-3 text-sm font-black text-white hover:bg-red-800 disabled:opacity-60">
        {editing ? <Save size={17} /> : <Plus size={17} />}
        {editing ? "Guardar cambios" : "Crear"}
      </button>
      {editing && onCancel && (
        <button type="button" onClick={onCancel} className="inline-flex items-center justify-center gap-2 rounded-md border border-black/15 px-4 py-3 text-sm font-black hover:bg-black/5">
          <X size={17} />
          Cancelar
        </button>
      )}
    </div>
  );
}

function AdminTable({ headers, rows }: { headers: string[]; rows: Array<{ id: number; values: string[]; onEdit: () => void; onDelete: () => void }> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-black/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-monserrat-black text-white">
            <tr>
              {headers.map((header) => <th key={header} className="px-4 py-3 font-black">{header}</th>)}
              <th className="px-4 py-3 font-black">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-black/10">
                {row.values.map((value, index) => <td key={`${row.id}-${index}`} className="max-w-[260px] truncate px-4 py-3">{value}</td>)}
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={row.onEdit} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/15 hover:bg-black/5" aria-label="Editar">
                      <Edit3 size={16} />
                    </button>
                    <button type="button" onClick={row.onDelete} className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-red-50 text-red-700 hover:bg-red-100" aria-label="Eliminar">
                      <Trash2 size={16} />
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
