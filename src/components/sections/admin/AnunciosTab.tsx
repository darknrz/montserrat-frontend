import { Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { Anuncio } from "../../../types";
import { AdminField, AdminTable, MediaPicker } from "./adminComponents";

type AnunciosTabProps = {
  token: string;
  isBusy: boolean;
  runAdminAction: (action: () => Promise<void>, successMessage: string) => void;
};

const emptyAnuncio: Omit<Anuncio, "id"> = {
  titulo: "",
  mensaje: "",
  verMasTexto: "Ver más",
  imageUrl: "",
  imagePublicId: "",
  imageMimeType: "",
  attachmentUrl: "",
  attachmentPublicId: "",
  attachmentResourceType: "",
  attachmentMimeType: "",
  mostrarEnPopup: true,
  activo: true,
  orden: 0,
  expiresAt: "",
};

export function AnunciosTab({ token, isBusy, runAdminAction }: AnunciosTabProps) {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [editingAnuncio, setEditingAnuncio] = useState<Anuncio | null>(null);
  const [anuncioForm, setAnuncioForm] = useState<Omit<Anuncio, "id">>(emptyAnuncio);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void monserratApi
      .anuncios()
      .then((data) => setAnuncios(data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los anuncios");
      });
  }, []);

  const uploadFile = async (file: File | null, existingData: {
    url?: string;
    publicId?: string;
    resourceType?: string;
    mimeType?: string;
  }) => {
    if (!file) {
      return existingData;
    }

    const upload = await monserratApi.uploadMedia(file, "anuncios", token);
    return {
      url: upload.secureUrl,
      publicId: upload.publicId,
      resourceType: upload.resourceType,
      mimeType: file.type,
    };
  };

  const uploadImage = async () => {
    const result = await uploadFile(imageFile, {
      url: anuncioForm.imageUrl,
      publicId: anuncioForm.imagePublicId,
      mimeType: anuncioForm.imageMimeType,
    });
    return {
      imageUrl: result.url ?? "",
      imagePublicId: result.publicId ?? "",
      imageMimeType: result.mimeType ?? "",
    };
  };

  const uploadAttachment = async () => {
    const result = await uploadFile(attachmentFile, {
      url: anuncioForm.attachmentUrl,
      publicId: anuncioForm.attachmentPublicId,
      resourceType: anuncioForm.attachmentResourceType,
      mimeType: anuncioForm.attachmentMimeType,
    });
    return {
      attachmentUrl: result.url ?? "",
      attachmentPublicId: result.publicId ?? "",
      attachmentResourceType: result.resourceType ?? anuncioForm.attachmentResourceType ?? "",
      attachmentMimeType: result.mimeType ?? anuncioForm.attachmentMimeType ?? "",
    };
  };

  const submitAnuncio = (e: FormEvent) => {
    e.preventDefault();
    runAdminAction(async () => {
      const image = await uploadImage();
      const attachment = await uploadAttachment();
      const payload: Omit<Anuncio, "id"> = {
        ...anuncioForm,
        ...image,
        ...attachment,
      };

      if (editingAnuncio) {
        const updated = await monserratApi.updateAnuncio(editingAnuncio.id, payload, token);
        if (attachmentFile && editingAnuncio.attachmentPublicId && editingAnuncio.attachmentPublicId !== updated.attachmentPublicId) {
          await monserratApi.deleteMedia(editingAnuncio.attachmentPublicId, editingAnuncio.attachmentResourceType ?? "raw", token);
        }
        if (imageFile && editingAnuncio.imagePublicId && editingAnuncio.imagePublicId !== updated.imagePublicId) {
          await monserratApi.deleteMedia(editingAnuncio.imagePublicId, editingAnuncio.imageMimeType?.startsWith("image/") ? "image" : "raw", token);
        }
      } else {
        await monserratApi.createAnuncio(payload, token);
      }

      setImageFile(null);
      setAttachmentFile(null);
      setEditingAnuncio(null);
      setAnuncioForm(emptyAnuncio);
      setError(null);
      const refreshed = await monserratApi.anuncios();
      setAnuncios(refreshed);
    }, editingAnuncio ? "Anuncio actualizado" : "Anuncio creado");
  };

  const handleEdit = (anuncio: Anuncio) => {
    setEditingAnuncio(anuncio);
    setAnuncioForm({
      titulo: anuncio.titulo,
      mensaje: anuncio.mensaje ?? "",
      verMasTexto: anuncio.verMasTexto ?? "Ver más",
      imageUrl: anuncio.imageUrl ?? "",
      imagePublicId: anuncio.imagePublicId ?? "",
      imageMimeType: anuncio.imageMimeType ?? "",
      attachmentUrl: anuncio.attachmentUrl ?? "",
      attachmentPublicId: anuncio.attachmentPublicId ?? "",
      attachmentResourceType: anuncio.attachmentResourceType ?? "",
      attachmentMimeType: anuncio.attachmentMimeType ?? "",
      expiresAt: anuncio.expiresAt ?? "",
      mostrarEnPopup: anuncio.mostrarEnPopup ?? true,
      activo: anuncio.activo ?? true,
      orden: anuncio.orden ?? 0,
    });
    setImageFile(null);
    setAttachmentFile(null);
  };

  const handleCancel = () => {
    setEditingAnuncio(null);
    setAnuncioForm(emptyAnuncio);
    setImageFile(null);
    setAttachmentFile(null);
    setError(null);
  };

  const handleDelete = (anuncio: Anuncio) => {
    runAdminAction(async () => {
      await monserratApi.deleteAnuncio(anuncio.id, token);
      if (anuncio.attachmentPublicId) {
        await monserratApi.deleteMedia(anuncio.attachmentPublicId, anuncio.attachmentResourceType ?? "raw", token);
      }
      const refreshed = await monserratApi.anuncios();
      setAnuncios(refreshed);
    }, "Anuncio eliminado");
  };

  const imagePreviewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : anuncioForm.imageUrl),
    [imageFile, anuncioForm.imageUrl]
  );

  const attachmentPreviewUrl = useMemo(
    () => (attachmentFile ? URL.createObjectURL(attachmentFile) : anuncioForm.attachmentUrl),
    [attachmentFile, anuncioForm.attachmentUrl]
  );

  const attachmentPreviewType = useMemo(() => {
    if (attachmentFile) {
      return attachmentFile.type.startsWith("video/") ? "video" : attachmentFile.type.startsWith("image/") ? "image" : "raw";
    }
    if (anuncioForm.attachmentResourceType === "video") return "video";
    if (anuncioForm.attachmentResourceType === "image") return "image";
    if (anuncioForm.attachmentUrl) return "raw";
    return undefined;
  }, [attachmentFile, anuncioForm.attachmentResourceType, anuncioForm.attachmentUrl]);

  const orderedRows = useMemo(
    () => anuncios.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
    [anuncios]
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_1fr] flex-1 min-h-0">
      <form onSubmit={submitAnuncio} className="grid content-start gap-3 rounded-[18px] border border-monserrat-ink/8 bg-monserrat-cream/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="font-serif text-[16px] font-black text-monserrat-ink">
              {editingAnuncio ? "Editar anuncio" : "Nuevo anuncio"}
            </h4>
            <p className="text-[12px] text-monserrat-ink/60">
              Define el texto para el pop-up y adjunta un documento si es necesario.
            </p>
          </div>
          {editingAnuncio && (
            <button type="button" onClick={handleCancel} className="rounded-full border border-monserrat-ink/12 px-3 py-2 text-[12px] font-black text-monserrat-ink/70 hover:border-monserrat-ink/25">
              <X size={16} /> Cancelar
            </button>
          )}
        </div>

        <AdminField label="Título">
          <input
            value={anuncioForm.titulo}
            onChange={(e) => setAnuncioForm({ ...anuncioForm, titulo: e.target.value })}
            className="admin-input"
            required
          />
        </AdminField>

        <AdminField label="Mensaje">
          <textarea
            value={anuncioForm.mensaje}
            onChange={(e) => setAnuncioForm({ ...anuncioForm, mensaje: e.target.value })}
            className="admin-input resize-y"
            rows={4}
          />
        </AdminField>

        <AdminField label="Texto del botón Ver más">
          <input
            value={anuncioForm.verMasTexto}
            onChange={(e) => setAnuncioForm({ ...anuncioForm, verMasTexto: e.target.value })}
            className="admin-input"
            required
          />
        </AdminField>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Imagen del anuncio">
            <MediaPicker
              label="Seleccionar imagen"
              accept="image/*"
              previewUrl={imagePreviewUrl}
              previewType="image"
              onFileChange={(file) => {
                setImageFile(file);
              }}
            />
          </AdminField>

          <AdminField label="Documento adjunto">
            <MediaPicker
              label="Seleccionar documento"
              accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*,video/*"
              previewUrl={attachmentPreviewUrl}
              previewType={attachmentPreviewType}
              onFileChange={(file) => setAttachmentFile(file)}
            />
          </AdminField>
        </div>

        <AdminField label="Fecha de expiración">
          <input
            type="date"
            value={anuncioForm.expiresAt ?? ""}
            onChange={(e) => setAnuncioForm({ ...anuncioForm, expiresAt: e.target.value })}
            className="admin-input"
          />
        </AdminField>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Orden">
            <input
              type="number"
              value={anuncioForm.orden}
              onChange={(e) => setAnuncioForm({ ...anuncioForm, orden: Number(e.target.value) })}
              className="admin-input"
            />
          </AdminField>

          <AdminField label="Mostrar en popup">
            <label className="inline-flex items-center gap-2 text-[12px] font-bold text-monserrat-ink/70">
              <input
                type="checkbox"
                checked={anuncioForm.mostrarEnPopup ?? true}
                onChange={(e) => setAnuncioForm({ ...anuncioForm, mostrarEnPopup: e.target.checked })}
                className="h-4 w-4 rounded border-monserrat-ink/20 text-monserrat-red"
              />
              Si
            </label>
          </AdminField>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Activo">
            <label className="inline-flex items-center gap-2 text-[12px] font-bold text-monserrat-ink/70">
              <input
                type="checkbox"
                checked={anuncioForm.activo ?? true}
                onChange={(e) => setAnuncioForm({ ...anuncioForm, activo: e.target.checked })}
                className="h-4 w-4 rounded border-monserrat-ink/20 text-monserrat-red"
              />
              Publicado
            </label>
          </AdminField>
        </div>

        {error && (
          <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <button
          disabled={isBusy}
          className="flex items-center justify-center gap-2 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60"
        >
          <Save size={14} /> {editingAnuncio ? "Actualizar anuncio" : "Crear anuncio"}
        </button>
      </form>

      <AdminTable
        headers={["Título", "Popup", "Activo", "Orden"]}
        rows={orderedRows.map((anuncio) => ({
          id: anuncio.id,
          values: [
            anuncio.titulo,
            anuncio.mostrarEnPopup ? "Sí" : "No",
            anuncio.activo ? "Sí" : "No",
            String(anuncio.orden ?? 0),
          ],
          onEdit: () => handleEdit(anuncio),
          onDelete: () => handleDelete(anuncio),
        }))}
        className="bg-white shadow-sm flex-1 flex flex-col min-h-0"
        bodyClassName="overflow-auto flex-1 min-h-0 admin-table-scroll"
      />
    </div>
  );
}
