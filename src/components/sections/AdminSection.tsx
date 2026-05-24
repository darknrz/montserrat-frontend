import { Edit3, ImagePlus, LogOut, Plus, Save, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../api/monserrat";
import type { Ingresante, Institution, LoginResponse, RedSocial, Video } from "../../types";
import { SectionHeader } from "../ui/SectionHeader";

// ── Constante tipos de ingreso ──────────────────────────────
const TIPOS_SELECCION = ["Ordinario", "Primera Selección", "Ingreso Especial"] as const;
type TipoSeleccion = typeof TIPOS_SELECCION[number];

const YEARS = ["2025", "2024", "2023", "2022", "2021"];

type AdminSectionProps = {
  institution: Institution;
  ingresantes: Ingresante[];
  videos: Video[];
  redes: RedSocial[];
  onRefresh: () => Promise<void>;
};

type Tab = "institucion" | "ingresantes" | "videos" | "redes";

const emptyIngresante: Omit<Ingresante, "id"> = {
  nombre: "", universidad: "", universidadSiglas: "",
  carrera: "", anio: "2025",
  tipoSeleccion: "Ordinario",
  fotoUrl: "", activo: true,
};

const emptyVideo: Omit<Video, "id"> = {
  titulo: "", descripcion: "", mediaType: "image", mediaUrl: "",
  publicId: "", thumbnailUrl: "", formato: "",
  tag: "Institucional", tagColor: "red", activo: true, orden: 1,
};

const emptyRed: Omit<RedSocial, "id"> = {
  nombre: "", icono: "", url: "", activo: true, orden: 1,
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

  // filtros tabla ingresantes
  const [filterYear, setFilterYear] = useState("");
  const [filterSel, setFilterSel] = useState("");

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

  const sortedIngresantes = useMemo(() =>
    [...ingresantes].sort((a, b) => Number(b.anio) - Number(a.anio) || b.id - a.id),
    [ingresantes]
  );

  const filteredIngresantes = useMemo(() =>
    sortedIngresantes.filter((i) => {
      const matchYear = !filterYear || i.anio === filterYear;
      const matchSel  = !filterSel  || i.tipoSeleccion === filterSel;
      return matchYear && matchSel;
    }),
    [sortedIngresantes, filterYear, filterSel]
  );

  useEffect(() => { setInstitutionForm(institution); }, [institution]);

  const runAdminAction = async (action: () => Promise<void>, successMessage: string) => {
    setIsBusy(true); setStatus(null);
    try { await action(); await onRefresh(); setStatus(successMessage); }
    catch (e) { setStatus(e instanceof Error ? e.message : "Error al completar la operación"); }
    finally { setIsBusy(false); }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault(); setIsBusy(true); setStatus(null);
    try {
      const res = await monserratApi.login(username, password);
      window.localStorage.setItem("monserrat_admin_session", JSON.stringify(res));
      setSession(res); setUsername(""); setPassword("");
    } catch (err) { setStatus(err instanceof Error ? err.message : "Credenciales incorrectas"); }
    finally { setIsBusy(false); }
  };

  const logout = () => { window.localStorage.removeItem("monserrat_admin_session"); setSession(null); setStatus(null); };

  // uploads
  const uploadLogo = async () => {
    if (!institutionLogoFile) return institutionForm.logoUrl ?? "";
    return (await monserratApi.uploadMedia(institutionLogoFile, "institution", token)).secureUrl;
  };
  const uploadPhoto = async () => {
    if (!ingresantePhotoFile) return ingresanteForm.fotoUrl ?? "";
    return (await monserratApi.uploadMedia(ingresantePhotoFile, "ingresantes", token)).secureUrl;
  };
  const uploadVideoMedia = async () => {
    if (!videoMediaFile) {
      if (!videoForm.mediaUrl || !videoForm.publicId) throw new Error("Sube una imagen o video.");
      return { mediaType: videoForm.mediaType, mediaUrl: videoForm.mediaUrl, publicId: videoForm.publicId, thumbnailUrl: videoForm.thumbnailUrl ?? videoForm.mediaUrl, formato: videoForm.formato ?? "" };
    }
    const u = await monserratApi.uploadMedia(videoMediaFile, "carousel", token);
    return { mediaType: u.resourceType, mediaUrl: u.secureUrl, publicId: u.publicId, thumbnailUrl: u.thumbnailUrl ?? u.secureUrl, formato: u.format ?? "" };
  };

  const submitIngresante = (e: FormEvent) => {
    e.preventDefault();
    void runAdminAction(async () => {
      const fotoUrl = await uploadPhoto();
      const payload = { ...ingresanteForm, fotoUrl };
      editingIngresante
        ? await monserratApi.updateIngresante(editingIngresante.id, payload, token)
        : await monserratApi.createIngresante(payload, token);
      setEditingIngresante(null); setIngresanteForm(emptyIngresante); setIngresantePhotoFile(null);
    }, "Ingresante guardado correctamente");
  };

  const submitVideo = (e: FormEvent) => {
    e.preventDefault();
    void runAdminAction(async () => {
      const media = await uploadVideoMedia();
      const payload = { ...videoForm, ...media };
      editingVideo
        ? await monserratApi.updateVideo(editingVideo.id, payload, token)
        : await monserratApi.createVideo(payload, token);
      if (videoMediaFile && editingVideo?.publicId && editingVideo.publicId !== media.publicId)
        await monserratApi.deleteMedia(editingVideo.publicId, editingVideo.mediaType, token);
      setEditingVideo(null); setVideoForm(emptyVideo); setVideoMediaFile(null);
    }, "Medio guardado correctamente");
  };

  const submitRed = (e: FormEvent) => {
    e.preventDefault();
    void runAdminAction(async () => {
      editingRed
        ? await monserratApi.updateRedSocial(editingRed.id, redForm, token)
        : await monserratApi.createRedSocial(redForm, token);
      setEditingRed(null); setRedForm(emptyRed);
    }, "Red social guardada");
  };

  const submitInstitution = (e: FormEvent) => {
    e.preventDefault();
    void runAdminAction(async () => {
      const logoUrl = await uploadLogo();
      await monserratApi.updateInstitution(institutionForm.id ?? 1, { ...institutionForm, logoUrl }, token);
      setInstitutionLogoFile(null);
    }, "Datos institucionales actualizados");
  };

  const institutionLogoPreview = institutionLogoFile ? URL.createObjectURL(institutionLogoFile) : institutionForm.logoUrl;
  const ingresantePhotoPreview = ingresantePhotoFile ? URL.createObjectURL(ingresantePhotoFile) : ingresanteForm.fotoUrl;
  const videoPreview = videoMediaFile
    ? { src: URL.createObjectURL(videoMediaFile), type: videoMediaFile.type.startsWith("video/") ? "video" : "image" }
    : { src: videoForm.thumbnailUrl || videoForm.mediaUrl, type: videoForm.mediaType };

  const TABS: { id: Tab; label: string }[] = [
    { id: "institucion", label: "Institución" },
    { id: "ingresantes", label: "Ingresantes" },
    { id: "videos", label: "Carrusel" },
    { id: "redes", label: "Redes sociales" },
  ];

  return (
    <section id="admin" className="bg-monserrat-cream px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          eyebrow="Administración"
          title="Panel Administrador"
          description="Gestiona la información publicada en la página institucional."
        />

        {!session ? (
          /* ── LOGIN ── */
          <form onSubmit={handleLogin}
            className="mx-auto mt-10 max-w-[420px] rounded-[24px] border border-monserrat-ink/8 bg-white p-8 shadow-[0_4px_24px_rgba(28,20,16,0.07)]">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] bg-monserrat-red text-white">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-serif text-[20px] font-black text-monserrat-ink">Acceso administrador</h3>
                <p className="text-[12px] text-monserrat-ink/50">Ingresa tus credenciales del backend.</p>
              </div>
            </div>
            <AdminField label="Usuario">
              <input value={username} onChange={(e) => setUsername(e.target.value)}
                className="admin-input" placeholder="admin" required />
            </AdminField>
            <AdminField label="Contraseña" className="mt-4">
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="admin-input" required />
            </AdminField>
            <button disabled={isBusy}
              className="mt-6 w-full rounded-[12px] bg-monserrat-red py-3 text-[13px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60">
              Ingresar
            </button>
            {status && <p className="mt-4 rounded-[10px] bg-monserrat-red/8 px-4 py-2.5 text-[12px] font-bold text-monserrat-red">{status}</p>}
          </form>
        ) : (
          /* ── PANEL ── */
          <div className="mt-10 overflow-hidden rounded-[24px] border border-monserrat-ink/8 bg-white shadow-[0_4px_24px_rgba(28,20,16,0.07)]">

            {/* topbar */}
            <div className="flex items-center justify-between border-b border-monserrat-ink/7 px-6 py-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-monserrat-red">Sesión activa</p>
                <h3 className="font-serif text-[20px] font-black text-monserrat-ink">{session.nombre}</h3>
              </div>
              <button onClick={logout}
                className="inline-flex items-center gap-2 rounded-full border border-monserrat-ink/12 px-4 py-2 text-[12px] font-bold text-monserrat-ink/60 transition hover:border-monserrat-ink/30 hover:text-monserrat-ink">
                <LogOut size={14} /> Cerrar sesión
              </button>
            </div>

            {/* tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-monserrat-ink/7 bg-monserrat-cream/40 px-6 py-3">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`rounded-full px-4 py-1.5 text-[12px] font-bold whitespace-nowrap transition ${
                    tab === t.id ? "bg-monserrat-red text-white" : "text-monserrat-ink/55 hover:bg-monserrat-ink/6 hover:text-monserrat-ink"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {status && (
                <div className="mb-5 rounded-[12px] border border-monserrat-red/15 bg-monserrat-red/6 px-4 py-2.5 text-[12px] font-bold text-monserrat-red">
                  {status}
                </div>
              )}

              {/* ── TAB INSTITUCIÓN ── */}
              {tab === "institucion" && (
                <form onSubmit={submitInstitution} className="grid gap-4 lg:grid-cols-2">
                  <AdminField label="Nombre"><input value={institutionForm.nombre} onChange={(e) => setInstitutionForm({ ...institutionForm, nombre: e.target.value })} className="admin-input" required /></AdminField>
                  <AdminField label="Dirección"><input value={institutionForm.direccion} onChange={(e) => setInstitutionForm({ ...institutionForm, direccion: e.target.value })} className="admin-input" required /></AdminField>
                  <AdminField label="Ciudad"><input value={institutionForm.ciudad} onChange={(e) => setInstitutionForm({ ...institutionForm, ciudad: e.target.value })} className="admin-input" required /></AdminField>
                  <AdminField label="Fundación"><input value={institutionForm.anioFundacion} onChange={(e) => setInstitutionForm({ ...institutionForm, anioFundacion: e.target.value })} className="admin-input" required /></AdminField>
                  <AdminField label="Correo"><input value={institutionForm.email} onChange={(e) => setInstitutionForm({ ...institutionForm, email: e.target.value })} className="admin-input" required /></AdminField>
                  <AdminField label="Horario"><input value={institutionForm.horarioAtencion} onChange={(e) => setInstitutionForm({ ...institutionForm, horarioAtencion: e.target.value })} className="admin-input" /></AdminField>
                  <div className="lg:col-span-2">
                    <MediaPicker label="Logo institucional" accept="image/*" previewUrl={institutionLogoPreview} previewType="image" onFileChange={setInstitutionLogoFile} />
                  </div>
                  <AdminField label="Misión" className="lg:col-span-1">
                    <textarea value={institutionForm.mision} onChange={(e) => setInstitutionForm({ ...institutionForm, mision: e.target.value })} className="admin-input resize-y" rows={4} required />
                  </AdminField>
                  <AdminField label="Visión" className="lg:col-span-1">
                    <textarea value={institutionForm.vision} onChange={(e) => setInstitutionForm({ ...institutionForm, vision: e.target.value })} className="admin-input resize-y" rows={4} required />
                  </AdminField>
                  <div className="lg:col-span-2">
                    <AdminField label="Descripción">
                      <textarea value={institutionForm.descripcion} onChange={(e) => setInstitutionForm({ ...institutionForm, descripcion: e.target.value })} className="admin-input resize-y" rows={3} />
                    </AdminField>
                  </div>
                  <div className="lg:col-span-2">
                    <AdminFormBtn isBusy={isBusy} />
                  </div>
                </form>
              )}

              {/* ── TAB INGRESANTES ── */}
              {tab === "ingresantes" && (
                <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
                  {/* form */}
                  <form onSubmit={submitIngresante}
                    className="grid content-start gap-3 rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/40 p-5">
                    <h4 className="font-serif text-[16px] font-black text-monserrat-ink">
                      {editingIngresante ? "Editar ingresante" : "Nuevo ingresante"}
                    </h4>
                    <AdminField label="Nombre completo">
                      <input value={ingresanteForm.nombre} onChange={(e) => setIngresanteForm({ ...ingresanteForm, nombre: e.target.value })} className="admin-input" required />
                    </AdminField>
                    <AdminField label="Universidad">
                      <input value={ingresanteForm.universidad} onChange={(e) => setIngresanteForm({ ...ingresanteForm, universidad: e.target.value })} className="admin-input" required />
                    </AdminField>
                    <AdminField label="Siglas">
                      <input value={ingresanteForm.universidadSiglas} onChange={(e) => setIngresanteForm({ ...ingresanteForm, universidadSiglas: e.target.value.toUpperCase() })} className="admin-input" required />
                    </AdminField>
                    <AdminField label="Carrera">
                      <input value={ingresanteForm.carrera} onChange={(e) => setIngresanteForm({ ...ingresanteForm, carrera: e.target.value })} className="admin-input" required />
                    </AdminField>
                    <AdminField label="Año">
                      <select value={ingresanteForm.anio} onChange={(e) => setIngresanteForm({ ...ingresanteForm, anio: e.target.value })} className="admin-input">
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </AdminField>
                    {/* TIPO SELECCIÓN — solo 3 opciones */}
                    <AdminField label="Tipo de ingreso">
                      <select value={ingresanteForm.tipoSeleccion} onChange={(e) => setIngresanteForm({ ...ingresanteForm, tipoSeleccion: e.target.value })} className="admin-input">
                        {TIPOS_SELECCION.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </AdminField>
                    <MediaPicker label="Foto (opcional)" accept="image/*" previewUrl={ingresantePhotoPreview} previewType="image" onFileChange={setIngresantePhotoFile} />
                    <div className="flex gap-2">
                      <button disabled={isBusy}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60">
                        {editingIngresante ? <><Save size={13} /> Guardar</> : <><Plus size={13} /> Crear</>}
                      </button>
                      {editingIngresante && (
                        <button type="button" onClick={() => { setEditingIngresante(null); setIngresanteForm(emptyIngresante); setIngresantePhotoFile(null); }}
                          className="rounded-[10px] border border-monserrat-ink/12 px-3 text-[12px] font-bold text-monserrat-ink/60 hover:border-monserrat-ink/25">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </form>

                  {/* tabla */}
                  <div>
                    {/* filtros */}
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex gap-2 flex-wrap">
                        <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}
                          className="rounded-full border border-monserrat-ink/10 bg-white py-1.5 pl-3 pr-7 text-[12px] font-bold text-monserrat-ink/60 outline-none"
                          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%231C1410' stroke-width='2' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", appearance: "none" as const }}>
                          <option value="">Todos los años</option>
                          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select value={filterSel} onChange={(e) => setFilterSel(e.target.value)}
                          className="rounded-full border border-monserrat-ink/10 bg-white py-1.5 pl-3 pr-7 text-[12px] font-bold text-monserrat-ink/60 outline-none"
                          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%231C1410' stroke-width='2' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", appearance: "none" as const }}>
                          <option value="">Todos los ingresos</option>
                          {TIPOS_SELECCION.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <p className="text-[12px] font-semibold text-monserrat-ink/50">
                        <span className="font-black text-monserrat-ink">{filteredIngresantes.length}</span> registros
                      </p>
                    </div>

                    <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] border-collapse text-left text-[12.5px]">
                          <thead className="bg-monserrat-ink text-monserrat-cream">
                            <tr>
                              {["Nombre", "Universidad", "Carrera", "Año", "Ingreso", ""].map((h) => (
                                <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-monserrat-cream/70">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredIngresantes.length === 0 ? (
                              <tr><td colSpan={6} className="py-10 text-center text-[13px] font-semibold text-monserrat-ink/35">Sin resultados</td></tr>
                            ) : filteredIngresantes.map((item) => (
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
                                    <span className="h-[5px] w-[5px] rounded-full bg-monserrat-gold" />
                                    {item.tipoSeleccion}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1.5">
                                    <button type="button" onClick={() => { setEditingIngresante(item); setIngresanteForm({ ...item }); setIngresantePhotoFile(null); }}
                                      className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-monserrat-ink/12 bg-white transition hover:border-monserrat-ink/30">
                                      <Edit3 size={13} />
                                    </button>
                                    <button type="button" onClick={() => void runAdminAction(() => monserratApi.deleteIngresante(item.id, token), "Ingresante eliminado")}
                                      className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-monserrat-red/8 text-monserrat-red transition hover:bg-monserrat-red/16">
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
                  </div>
                </div>
              )}

              {/* ── TAB VIDEOS ── */}
              {tab === "videos" && (
                <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
                  <form onSubmit={submitVideo}
                    className="grid content-start gap-3 rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/40 p-5">
                    <h4 className="font-serif text-[16px] font-black text-monserrat-ink">
                      {editingVideo ? "Editar medio" : "Nuevo medio"}
                    </h4>
                    <AdminField label="Título"><input value={videoForm.titulo} onChange={(e) => setVideoForm({ ...videoForm, titulo: e.target.value })} className="admin-input" required /></AdminField>
                    <AdminField label="Descripción"><textarea value={videoForm.descripcion} onChange={(e) => setVideoForm({ ...videoForm, descripcion: e.target.value })} className="admin-input resize-y" rows={3} /></AdminField>
                    <MediaPicker label="Imagen o video" accept="image/*,video/*" previewUrl={videoPreview.src} previewType={videoPreview.type} onFileChange={setVideoMediaFile} />
                    <AdminField label="Tag">
                      <select value={videoForm.tag} onChange={(e) => setVideoForm({ ...videoForm, tag: e.target.value })} className="admin-input">
                        {["Institucional", "Eventos", "Logros", "Deportes", "Académico"].map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </AdminField>
                    <AdminField label="Orden"><input type="number" value={videoForm.orden} onChange={(e) => setVideoForm({ ...videoForm, orden: Number(e.target.value) })} className="admin-input" /></AdminField>
                    <div className="flex gap-2">
                      <button disabled={isBusy} className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60">
                        {editingVideo ? <><Save size={13} /> Guardar</> : <><Plus size={13} /> Crear</>}
                      </button>
                      {editingVideo && <button type="button" onClick={() => { setEditingVideo(null); setVideoForm(emptyVideo); setVideoMediaFile(null); }} className="rounded-[10px] border border-monserrat-ink/12 px-3 hover:border-monserrat-ink/25"><X size={14} /></button>}
                    </div>
                  </form>
                  <AdminTable headers={["Título", "Tipo", "Orden"]}
                    rows={videos.map((v) => ({
                      id: v.id, values: [v.titulo, v.mediaType, String(v.orden ?? 0)],
                      onEdit: () => { setEditingVideo(v); setVideoForm({ ...v }); setVideoMediaFile(null); },
                      onDelete: () => void runAdminAction(async () => { await monserratApi.deleteVideo(v.id, token); await monserratApi.deleteMedia(v.publicId, v.mediaType, token); }, "Medio eliminado"),
                    }))} />
                </div>
              )}

              {/* ── TAB REDES ── */}
              {tab === "redes" && (
                <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
                  <form onSubmit={submitRed}
                    className="grid content-start gap-3 rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/40 p-5">
                    <h4 className="font-serif text-[16px] font-black text-monserrat-ink">
                      {editingRed ? "Editar red social" : "Nueva red social"}
                    </h4>
                    <AdminField label="Nombre"><input value={redForm.nombre} onChange={(e) => setRedForm({ ...redForm, nombre: e.target.value })} className="admin-input" required /></AdminField>
                    <AdminField label="Ícono"><input value={redForm.icono} onChange={(e) => setRedForm({ ...redForm, icono: e.target.value })} className="admin-input" placeholder="facebook, tiktok..." required /></AdminField>
                    <AdminField label="URL"><input value={redForm.url} onChange={(e) => setRedForm({ ...redForm, url: e.target.value })} className="admin-input" required /></AdminField>
                    <AdminField label="Orden"><input type="number" value={redForm.orden} onChange={(e) => setRedForm({ ...redForm, orden: Number(e.target.value) })} className="admin-input" /></AdminField>
                    <div className="flex gap-2">
                      <button disabled={isBusy} className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60">
                        {editingRed ? <><Save size={13} /> Guardar</> : <><Plus size={13} /> Crear</>}
                      </button>
                      {editingRed && <button type="button" onClick={() => { setEditingRed(null); setRedForm(emptyRed); }} className="rounded-[10px] border border-monserrat-ink/12 px-3 hover:border-monserrat-ink/25"><X size={14} /></button>}
                    </div>
                  </form>
                  <AdminTable headers={["Nombre", "Ícono", "URL"]}
                    rows={redes.map((r) => ({
                      id: r.id, values: [r.nombre, r.icono, r.url],
                      onEdit: () => { setEditingRed(r); setRedForm({ ...r }); },
                      onDelete: () => void runAdminAction(() => monserratApi.deleteRedSocial(r.id, token), "Red social eliminada"),
                    }))} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ── Helpers UI ─────────────────────────────────────────── */

function AdminField({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label className="text-[11px] font-black uppercase tracking-[0.08em] text-monserrat-ink/50">{label}</label>
      {children}
    </div>
  );
}

function AdminFormBtn({ isBusy }: { isBusy: boolean }) {
  return (
    <button disabled={isBusy}
      className="inline-flex items-center gap-2 rounded-[12px] bg-monserrat-red px-6 py-2.5 text-[13px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60">
      <Save size={15} /> Guardar cambios
    </button>
  );
}

function MediaPicker({ label, accept, previewUrl, previewType, onFileChange }: { label: string; accept: string; previewUrl?: string; previewType?: string; onFileChange: (f: File | null) => void }) {
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

function AdminTable({ headers, rows }: { headers: string[]; rows: { id: number; values: string[]; onEdit: () => void; onDelete: () => void }[] }) {
  return (
    <div className="overflow-hidden rounded-[16px] border border-monserrat-ink/8">
      <div className="overflow-x-auto">
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