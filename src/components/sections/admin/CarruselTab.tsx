import { Plus, Save, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { Video } from "../../../types";
import { AdminField, AdminTable, MediaPicker } from "./adminComponents";

type CarruselTabProps = {
  videos: Video[];
  token: string;
  isBusy: boolean;
  runAdminAction: (action: () => Promise<void>, successMessage: string) => void;
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
  orden: 1,
};

export function CarruselTab({
  videos,
  token,
  isBusy,
  runAdminAction
}: CarruselTabProps) {
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [videoForm, setVideoForm] = useState<Omit<Video, "id">>(emptyVideo);
  const [videoMediaFile, setVideoMediaFile] = useState<File | null>(null);

  const uploadVideoMedia = async () => {
    if (!videoMediaFile) {
      if (!videoForm.mediaUrl || !videoForm.publicId) {
        throw new Error("Sube una imagen o video.");
      }
      return {
        mediaType: videoForm.mediaType,
        mediaUrl: videoForm.mediaUrl,
        publicId: videoForm.publicId,
        thumbnailUrl: videoForm.thumbnailUrl ?? videoForm.mediaUrl,
        formato: videoForm.formato ?? "",
      };
    }
    const u = await monserratApi.uploadMedia(videoMediaFile, "carousel", token);
    return {
      mediaType: u.resourceType,
      mediaUrl: u.secureUrl,
      publicId: u.publicId,
      thumbnailUrl: u.thumbnailUrl ?? u.secureUrl,
      formato: u.format ?? "",
    };
  };

  const submitVideo = (e: FormEvent) => {
    e.preventDefault();
    runAdminAction(async () => {
      const media = await uploadVideoMedia();
      const payload = { ...videoForm, ...media };
      if (editingVideo) {
        await monserratApi.updateVideo(editingVideo.id, payload, token);
      } else {
        await monserratApi.createVideo(payload, token);
      }
      if (videoMediaFile && editingVideo?.publicId && editingVideo.publicId !== media.publicId) {
        await monserratApi.deleteMedia(editingVideo.publicId, editingVideo.mediaType, token);
      }
      setEditingVideo(null);
      setVideoForm(emptyVideo);
      setVideoMediaFile(null);
    }, "Medio guardado correctamente");
  };

  const handleEditClick = (v: Video) => {
    setEditingVideo(v);
    setVideoForm({ ...v });
    setVideoMediaFile(null);
  };

  const handleCancelEdit = () => {
    setEditingVideo(null);
    setVideoForm(emptyVideo);
    setVideoMediaFile(null);
  };

  const handleDelete = (v: Video) => {
    runAdminAction(async () => {
      await monserratApi.deleteVideo(v.id, token);
      await monserratApi.deleteMedia(v.publicId, v.mediaType, token);
    }, "Medio eliminado");
  };

  const videoPreview = videoMediaFile
    ? {
        src: URL.createObjectURL(videoMediaFile),
        type: videoMediaFile.type.startsWith("video/") ? "video" : "image",
      }
    : {
        src: videoForm.thumbnailUrl || videoForm.mediaUrl,
        type: videoForm.mediaType,
      };

  return (
    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <form
        onSubmit={submitVideo}
        className="grid content-start gap-3 rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/40 p-5"
      >
        <h4 className="font-serif text-[16px] font-black text-monserrat-ink">
          {editingVideo ? "Editar medio" : "Nuevo medio"}
        </h4>
        <AdminField label="Título">
          <input
            value={videoForm.titulo}
            onChange={(e) => setVideoForm({ ...videoForm, titulo: e.target.value })}
            className="admin-input"
            required
          />
        </AdminField>
        <AdminField label="Descripción">
          <textarea
            value={videoForm.descripcion}
            onChange={(e) => setVideoForm({ ...videoForm, descripcion: e.target.value })}
            className="admin-input resize-y"
            rows={3}
          />
        </AdminField>
        <MediaPicker
          label="Imagen o video"
          accept="image/*,video/*"
          previewUrl={videoPreview.src}
          previewType={videoPreview.type}
          onFileChange={setVideoMediaFile}
        />
        <AdminField label="Tag">
          <select
            value={videoForm.tag}
            onChange={(e) => setVideoForm({ ...videoForm, tag: e.target.value })}
            className="admin-input"
          >
            {["Institucional", "Eventos", "Logros", "Deportes", "Académico"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Orden">
          <input
            type="number"
            value={videoForm.orden}
            onChange={(e) => setVideoForm({ ...videoForm, orden: Number(e.target.value) })}
            className="admin-input"
          />
        </AdminField>
        <div className="flex gap-2">
          <button
            disabled={isBusy}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60"
          >
            {editingVideo ? (
              <>
                <Save size={13} /> Guardar
              </>
            ) : (
              <>
                <Plus size={13} /> Crear
              </>
            )}
          </button>
          {editingVideo && (
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
        headers={["Título", "Tipo", "Orden"]}
        rows={videos.map((v) => ({
          id: v.id,
          values: [v.titulo, v.mediaType, String(v.orden ?? 0)],
          onEdit: () => handleEditClick(v),
          onDelete: () => handleDelete(v),
        }))}
        className="bg-white shadow-sm"
        bodyClassName="max-h-[70vh]"
      />
    </div>
  );
}
