import { Download, X, User, Users, GraduationCap, Building2, FileText, CheckCircle2, Search, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { NotaAcademica, UsuarioAcademico } from "../../../types";
import { monserratApi } from "../../../api/monserrat";
import { getGradosPorNivelAcademico, type AcademicoConfig } from "./adminShared";

type ReportType = "individual" | "porGrado" | "porNivelAcademico" | "porNivelEducativo" | "general";

interface Notas {
  [alumnoDni: string]: NotaAcademica[];
}

type ReportesTabProps = {
  usuariosAcademicos: UsuarioAcademico[];
  institution: { nombre: string; direccion: string; ciudad: string };
  token: string;
  academicoConfig: AcademicoConfig;
};

const BIMESTRES = ["BIMESTRE_1", "BIMESTRE_2", "BIMESTRE_3", "BIMESTRE_4"] as const;
const PARCIALES_PREFIX = "@parciales:";

const ESCUDO_URL = "https://res.cloudinary.com/dca1gayi8/image/upload/v1784494270/escudo_qketon.png";
const LOGO_URL = "https://res.cloudinary.com/dca1gayi8/image/upload/v1784494456/montserrat_yv2dhp.png";

function nivelDesdeValor(valor?: number | null): string {
  if (valor === 4) return "AD";
  if (valor === 3) return "A";
  if (valor === 2) return "B";
  if (valor === 1) return "C";
  return "";
}

function extraerComentario(raw?: string | null): string {
  if (!raw) return "";
  if (!raw.startsWith(PARCIALES_PREFIX)) return raw;
  const newlineIdx = raw.indexOf("\n");
  return newlineIdx === -1 ? "" : raw.slice(newlineIdx + 1);
}

function truncar(texto: string, max: number): string {
  if (!texto) return "";
  if (texto.length <= max) return texto;
  return texto.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

function gradoOrdinal(grado?: string) {
  if (!grado) return "";
  return grado.replace(/_PRIMARIA$|_SECUNDARIA$/, "");
}

function iniciales(nombre?: string): string {
  if (!nombre) return "?";
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

type ImagenCargada = { data: string; format: string; w: number; h: number } | null;

async function cargarImagen(url: string): Promise<ImagenCargada> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const format = blob.type.includes("jpeg") ? "JPEG" : "PNG";
    const data: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const size = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = data;
    });
    return { data, format, w: size.w, h: size.h };
  } catch {
    return null;
  }
}

function ajustarImagen(w: number, h: number, maxW: number, maxH: number) {
  let rw = maxW;
  let rh = (maxW * h) / w;
  if (rh > maxH) {
    rh = maxH;
    rw = (maxH * w) / h;
  }
  return { w: rw, h: rh };
}

const REPORT_OPTIONS: {
  value: ReportType;
  label: string;
  description: string;
  icon: typeof User;
}[] = [
  { value: "individual", label: "Individual", description: "Reporte de un solo alumno", icon: User },
  { value: "porGrado", label: "Por grado", description: "Todos los alumnos de un grado", icon: Users },
  { value: "porNivelEducativo", label: "Nivel educativo", description: "Primaria o secundaria", icon: GraduationCap },
  { value: "porNivelAcademico", label: "Nivel académico", description: "1ro prim, 2do prim, 3ro prim, etc.", icon: GraduationCap },
  { value: "general", label: "General", description: "Toda la institución", icon: Building2 },
];

export function ReportesTab({
  usuariosAcademicos,
  institution,
  token,
  academicoConfig,
}: ReportesTabProps) {
  const [reportType, setReportType] = useState<ReportType>("individual");
  const [selectedAlumno, setSelectedAlumno] = useState<string>("");
  const [selectedGrado, setSelectedGrado] = useState<string>("");
  const [selectedNivelEducativo, setSelectedNivelEducativo] = useState<string>("");
  const [selectedNivelAcademico, setSelectedNivelAcademico] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [notas, setNotas] = useState<Notas>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const cargarNotasParaReporte = async () => {
    if (!token) return {} as Notas;

    try {
      const notasData = await monserratApi.notasDocente(token);
      const groupedByAlumno = notasData.reduce((acc, nota) => {
        if (!acc[nota.alumnoDni]) acc[nota.alumnoDni] = [];
        acc[nota.alumnoDni].push(nota);
        return acc;
      }, {} as Notas);

      setNotas(groupedByAlumno);
      return groupedByAlumno;
    } catch (error) {
      console.error("Error cargando notas:", error);
      return {} as Notas;
    }
  };

  useEffect(() => {
    void cargarNotasParaReporte();
  }, [token]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const alumnosActivos = usuariosAcademicos.filter(
    (u) => u.rol === "ALUMNO" && (u.activo || u.estado === "ACTIVO")
  );

  const gradosUnicos = Array.from(new Set(alumnosActivos.map((a) => a.grado).filter(Boolean)));

  const nivelesEducativos = [
    { id: "PRIMARIA", label: "Primaria" },
    { id: "SECUNDARIA", label: "Secundaria" },
  ];

  const nivelesAcademicosConfigurados = academicoConfig.nivelesAcademicos ?? [];
  const nivelesAcademicosFiltrados = nivelesAcademicosConfigurados;

  const getAlumnosFiltrados = () => {
    let filtered = [...alumnosActivos];

    if (reportType === "individual") {
      return selectedAlumno ? filtered.filter((a) => a.dni === selectedAlumno) : [];
    } else if (reportType === "porGrado") {
      return selectedGrado ? filtered.filter((a) => a.grado === selectedGrado) : [];
    } else if (reportType === "porNivelEducativo") {
      if (!selectedNivelEducativo) return [];
      return filtered.filter((a) =>
        selectedNivelEducativo === "PRIMARIA"
          ? a.grado?.endsWith("_PRIMARIA")
          : a.grado?.endsWith("_SECUNDARIA")
      );
    } else if (reportType === "porNivelAcademico") {
      if (!selectedNivelAcademico) return [];
      const gradosDelNivel = getGradosPorNivelAcademico(selectedNivelAcademico);
      return filtered.filter((a) => a.grado && gradosDelNivel.includes(a.grado));
    }
    return filtered;
  };

  const generarPDF = async () => {
    try {
      setIsGenerating(true);
      const alumnosFiltrados = getAlumnosFiltrados().filter(
        (a) => a !== undefined
      ) as UsuarioAcademico[];

      if (alumnosFiltrados.length === 0) {
        alert("No hay alumnos para generar el reporte");
        return;
      }

      const notasActualizadas = await cargarNotasParaReporte();
      const { jsPDF } = await import("jspdf");
      const autoTableModule: any = await import("jspdf-autotable");
      const autoTable = autoTableModule.default ?? autoTableModule.autoTable;

      const [escudoImg, logoImg] = await Promise.all([
        cargarImagen(ESCUDO_URL),
        cargarImagen(LOGO_URL),
      ]);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      for (let i = 0; i < alumnosFiltrados.length; i++) {
        const alumno = alumnosFiltrados[i];
        const alumnoNotas = notasActualizadas[alumno.dni] || notas[alumno.dni] || [];

        if (i > 0) pdf.addPage();

        dibujarReporte(pdf, autoTable, alumno, alumnoNotas, academicoConfig, escudoImg, logoImg);
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const blobUrl = pdf.output("bloburl") as unknown as string;
      setPreviewUrl(blobUrl);
      setPendingFileName(getNombreArchivoPDF());
    } catch (error) {
      console.error("Error generando PDF:", error);
      alert("Error al generar el PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const cerrarPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFileName("");
  };

  const confirmarDescarga = () => {
    if (!previewUrl || !pendingFileName) return;
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = pendingFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    cerrarPreview();
  };

  const getNombreArchivoPDF = () => {
    const fecha = new Date().toLocaleDateString("es-ES");
    if (reportType === "individual") {
      const alumno = alumnosActivos.find((a) => a.dni === selectedAlumno);
      return `Reporte_${alumno?.nombre}_${fecha}.pdf`;
    } else if (reportType === "porGrado") {
      return `Reporte_Grado_${selectedGrado}_${fecha}.pdf`;
    } else if (reportType === "porNivelEducativo") {
      const nivel = nivelesEducativos.find((n) => n.id === selectedNivelEducativo);
      return `Reporte_${nivel?.label}_${fecha}.pdf`;
    } else if (reportType === "porNivelAcademico") {
      const nivelAcademico = nivelesAcademicosConfigurados.find((n) => n.id === selectedNivelAcademico);
      return `Reporte_${nivelAcademico?.label ?? "NivelAcademico"}_${fecha}.pdf`;
    }
    return `Reporte_General_${fecha}.pdf`;
  };

  const cantidadAlumnos = getAlumnosFiltrados().length;
  const necesitaSeleccion =
    (reportType === "individual" && !selectedAlumno) ||
    (reportType === "porGrado" && !selectedGrado) ||
    (reportType === "porNivelEducativo" && !selectedNivelEducativo) ||
    (reportType === "porNivelAcademico" && !selectedNivelAcademico);

  const alumnoSeleccionado = useMemo(
    () => alumnosActivos.find((a) => a.dni === selectedAlumno) ?? null,
    [alumnosActivos, selectedAlumno]
  );

  const resultadosBusqueda = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return alumnosActivos.slice(0, 8);
    return alumnosActivos
      .filter(
        (a) =>
          a.nombre?.toLowerCase().includes(q) ||
          a.dni?.toLowerCase().includes(q) ||
          a.grado?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [alumnosActivos, searchQuery]);

  const gradosConConteo = useMemo(
    () =>
      gradosUnicos.map((grado) => ({
        grado: grado as string,
        count: alumnosActivos.filter((a) => a.grado === grado).length,
      })),
    [gradosUnicos, alumnosActivos]
  );

  const nivelesEducativosConConteo = useMemo(
    () =>
      nivelesEducativos.map((n) => ({
        ...n,
        count: alumnosActivos.filter((a) =>
          n.id === "PRIMARIA" ? a.grado?.endsWith("_PRIMARIA") : a.grado?.endsWith("_SECUNDARIA")
        ).length,
      })),
    [alumnosActivos]
  );

  const nivelesAcademicosConConteo = useMemo(
    () =>
      nivelesAcademicosFiltrados.map((n) => {
        const gradosDelNivel = getGradosPorNivelAcademico(n.id);
        return {
          ...n,
          count: alumnosActivos.filter((a) => a.grado && gradosDelNivel.includes(a.grado)).length,
        };
      }),
    [nivelesAcademicosFiltrados, alumnosActivos]
  );

  const resumenAlcance = (() => {
    if (reportType === "individual") return alumnoSeleccionado?.nombre ?? null;
    if (reportType === "porGrado") return selectedGrado || null;
    if (reportType === "porNivelEducativo")
      return nivelesEducativos.find((n) => n.id === selectedNivelEducativo)?.label ?? null;
    if (reportType === "porNivelAcademico")
      return nivelesAcademicosConfigurados.find((n) => n.id === selectedNivelAcademico)?.label ?? null;
    return "Toda la institución";
  })();

  const opcionActual = REPORT_OPTIONS.find((o) => o.value === reportType)!;

  const resetSelecciones = () => {
    setSelectedAlumno("");
    setSelectedGrado("");
    setSelectedNivelEducativo("");
    setSelectedNivelAcademico("");
    setSearchQuery("");
    setIsSearchOpen(false);
  };

  // Clase reutilizable: cualquier fila/celda seleccionable debe transmitir
  // con claridad que es clicable, tanto en reposo como en foco de teclado.
  const filaInteractiva =
    "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-monserrat-red/40 focus-visible:ring-offset-1";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-monserrat-ink/10 bg-white shadow-sm">
        {/* Encabezado */}
        <div className="flex items-center gap-3 border-b border-monserrat-ink/10 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-monserrat-red/10">
            <FileText size={17} className="text-monserrat-red" />
          </div>
          <div>
            <h2 className="text-[15px] font-bold text-monserrat-ink">Reportes de competencias</h2>
            <p className="text-xs text-monserrat-ink/50">Elige el alcance y descarga el PDF</p>
          </div>
        </div>

        {/* Selector de tipo: control segmentado */}
        <div className="border-b border-monserrat-ink/10 px-6 py-4">
          <div className="inline-flex flex-wrap gap-1 rounded-lg bg-monserrat-ink/[0.04] p-1">
            {REPORT_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = reportType === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setReportType(option.value);
                    resetSelecciones();
                  }}
                  className={`${filaInteractiva} flex items-center gap-1.5 rounded-md px-3.5 py-2 text-[13px] font-semibold ${
                    isSelected
                      ? "bg-white text-monserrat-red shadow-sm"
                      : "text-monserrat-ink/50 hover:bg-white/60 hover:text-monserrat-ink"
                  }`}
                >
                  <Icon size={14} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cuerpo: selección (izq) + resumen y acción (der) */}
        <div className="grid lg:grid-cols-[1fr_300px] lg:divide-x lg:divide-monserrat-ink/10">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-monserrat-ink">
                {reportType === "individual" && "Busca al alumno"}
                {reportType === "porGrado" && "Selecciona el grado"}
                {reportType === "porNivelEducativo" && "Selecciona el nivel educativo"}
                {reportType === "porNivelAcademico" && "Selecciona el nivel académico"}
                {reportType === "general" && "Alcance del reporte"}
              </h3>
              {necesitaSeleccion && (
                <span className="rounded-full bg-monserrat-red/10 px-2.5 py-1 text-[11px] font-bold text-monserrat-red">
                  Falta elegir
                </span>
              )}
            </div>

            {/* Contenedor con resalte cuando falta completar la selección */}
            <div
              className={`rounded-lg transition-shadow ${
                necesitaSeleccion ? "ring-1 ring-monserrat-red/25" : ""
              }`}
            >
              {reportType === "individual" && (
                <div className="p-1">
                  {alumnoSeleccionado ? (
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-monserrat-red/30 bg-monserrat-red/[0.04] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-monserrat-red text-[11px] font-bold text-white">
                          {iniciales(alumnoSeleccionado.nombre)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-monserrat-ink">{alumnoSeleccionado.nombre}</div>
                          <div className="text-xs text-monserrat-ink/50">
                            DNI {alumnoSeleccionado.dni} · {alumnoSeleccionado.grado}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedAlumno("");
                          setSearchQuery("");
                        }}
                        className={`${filaInteractiva} flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-monserrat-ink/40 hover:bg-monserrat-ink/10 hover:text-monserrat-ink`}
                        aria-label="Quitar alumno seleccionado"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative" ref={searchWrapRef}>
                      <div className="relative flex items-center rounded-lg border border-monserrat-ink/15 bg-white transition focus-within:border-monserrat-red focus-within:ring-2 focus-within:ring-monserrat-red/15">
                        <Search size={15} className="ml-3 shrink-0 text-monserrat-ink/35" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onFocus={() => setIsSearchOpen(true)}
                          placeholder="Busca por nombre, DNI o grado…"
                          className="w-full bg-transparent px-2.5 py-2.5 text-sm text-monserrat-ink placeholder:text-monserrat-ink/35 focus:outline-none"
                        />
                      </div>

                      {isSearchOpen && (
                        <div className="absolute z-30 mt-1.5 max-h-72 w-full overflow-y-auto rounded-lg border border-monserrat-ink/10 bg-white shadow-lg">
                          {resultadosBusqueda.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs text-monserrat-ink/50">
                              Ningún alumno coincide con "{searchQuery}"
                            </div>
                          ) : (
                            resultadosBusqueda.map((alumno) => (
                              <button
                                key={alumno.dni}
                                onClick={() => {
                                  setSelectedAlumno(alumno.dni);
                                  setSearchQuery("");
                                  setIsSearchOpen(false);
                                }}
                                className={`${filaInteractiva} flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-monserrat-red/[0.05]`}
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-monserrat-ink/8 text-[10px] font-bold text-monserrat-ink/60">
                                  {iniciales(alumno.nombre)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-semibold text-monserrat-ink">{alumno.nombre}</div>
                                  <div className="text-xs text-monserrat-ink/45">DNI {alumno.dni}</div>
                                </div>
                                <span className="shrink-0 rounded-full bg-monserrat-ink/8 px-2 py-0.5 text-[10px] font-bold text-monserrat-ink/60">
                                  {alumno.grado}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {reportType === "porGrado" && (
                <div className="grid gap-1.5 p-1 sm:grid-cols-2">
                  {gradosConConteo.map(({ grado, count }) => {
                    const isSelected = selectedGrado === grado;
                    return (
                      <button
                        key={grado}
                        onClick={() => setSelectedGrado(grado)}
                        className={`${filaInteractiva} flex items-center justify-between rounded-lg border px-4 py-3 text-left ${
                          isSelected
                            ? "border-monserrat-red/30 bg-monserrat-red/[0.05]"
                            : "border-monserrat-ink/10 hover:border-monserrat-ink/20 hover:bg-monserrat-ink/[0.02]"
                        }`}
                      >
                        <span className={`text-sm font-semibold ${isSelected ? "text-monserrat-red" : "text-monserrat-ink"}`}>
                          {grado}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-monserrat-ink/45">{count} alum.</span>
                          {isSelected && <CheckCircle2 size={15} className="text-monserrat-red" />}
                        </span>
                      </button>
                    );
                  })}
                  {gradosConConteo.length === 0 && (
                    <p className="p-3 text-xs text-monserrat-ink/50">No hay grados con alumnos activos.</p>
                  )}
                </div>
              )}

              {reportType === "porNivelEducativo" && (
                <div className="grid grid-cols-1 gap-1.5 p-1 sm:grid-cols-2">
                  {nivelesEducativosConConteo.map((nivel) => {
                    const isSelected = selectedNivelEducativo === nivel.id;
                    return (
                      <button
                        key={nivel.id}
                        onClick={() => setSelectedNivelEducativo(nivel.id)}
                        className={`${filaInteractiva} flex items-center justify-between rounded-lg border px-4 py-3.5 text-left ${
                          isSelected
                            ? "border-monserrat-red/30 bg-monserrat-red/[0.05]"
                            : "border-monserrat-ink/10 hover:border-monserrat-ink/20 hover:bg-monserrat-ink/[0.02]"
                        }`}
                      >
                        <div>
                          <div className={`text-sm font-bold ${isSelected ? "text-monserrat-red" : "text-monserrat-ink"}`}>
                            {nivel.label}
                          </div>
                          <div className="text-xs text-monserrat-ink/45">{nivel.count} alumno(s) activo(s)</div>
                        </div>
                        {isSelected && <CheckCircle2 size={16} className="shrink-0 text-monserrat-red" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {reportType === "porNivelAcademico" && (
                <div className="grid gap-1.5 p-1 sm:grid-cols-2">
                  {nivelesAcademicosConConteo.map((nivel) => {
                    const isSelected = selectedNivelAcademico === nivel.id;
                    return (
                      <button
                        key={nivel.id}
                        onClick={() => setSelectedNivelAcademico(nivel.id)}
                        className={`${filaInteractiva} flex items-center justify-between rounded-lg border px-4 py-3 text-left ${
                          isSelected
                            ? "border-monserrat-red/30 bg-monserrat-red/[0.05]"
                            : "border-monserrat-ink/10 hover:border-monserrat-ink/20 hover:bg-monserrat-ink/[0.02]"
                        }`}
                      >
                        <span className={`text-sm font-semibold ${isSelected ? "text-monserrat-red" : "text-monserrat-ink"}`}>
                          {nivel.label}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-monserrat-ink/45">{nivel.count} alum.</span>
                          {isSelected && <CheckCircle2 size={15} className="text-monserrat-red" />}
                        </span>
                      </button>
                    );
                  })}
                  {nivelesAcademicosConConteo.length === 0 && (
                    <p className="p-3 text-xs text-monserrat-ink/50">No hay niveles académicos configurados.</p>
                  )}
                </div>
              )}

              {reportType === "general" && (
                <div className="flex items-center gap-4 rounded-lg border border-monserrat-red/20 bg-monserrat-red/[0.04] p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-monserrat-red text-white">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-monserrat-red">Toda la institución</div>
                    <div className="text-xs text-monserrat-ink/50">
                      Se incluyen los {alumnosActivos.length} alumnos activos, sin filtrar.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Resumen y acción */}
          <div className="rounded-b-xl bg-monserrat-ink/[0.02] p-6 lg:rounded-bl-none lg:rounded-br-xl lg:sticky lg:top-4 lg:self-start">
            <div className="mb-4 flex items-center gap-2 text-monserrat-ink/50">
              <opcionActual.icon size={14} />
              <span className="text-[11px] font-bold uppercase tracking-wide">{opcionActual.label}</span>
            </div>

            <div className="mb-5 rounded-lg border border-monserrat-ink/10 bg-white px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-monserrat-ink/40">Alcance</div>
              <div className="mt-0.5 truncate text-sm font-bold text-monserrat-ink">
                {resumenAlcance && !necesitaSeleccion ? resumenAlcance : "Pendiente de elegir"}
              </div>
            </div>

            <div className="mb-5">
              <div className="text-4xl font-black leading-none text-monserrat-ink">{cantidadAlumnos}</div>
              <div className="mt-1 text-xs font-medium text-monserrat-ink/50">alumno(s) incluidos en el PDF</div>
            </div>

            <button
              onClick={generarPDF}
              disabled={isGenerating || necesitaSeleccion || cantidadAlumnos === 0}
              className={`${filaInteractiva} inline-flex w-full items-center justify-center gap-2 rounded-lg bg-monserrat-red px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-monserrat-red/90 hover:shadow disabled:cursor-not-allowed disabled:bg-monserrat-ink/10 disabled:text-monserrat-ink/35 disabled:shadow-none`}
            >
              {isGenerating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Generando…
                </>
              ) : (
                <>
                  <Download size={16} />
                  Generar PDF
                  <ArrowRight size={14} className="opacity-70" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <iframe ref={iframeRef} className="hidden" />

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-monserrat-ink/10 p-4">
              <div className="flex items-center gap-2">
                <FileText size={15} className="text-monserrat-red" />
                <h3 className="text-sm font-bold text-monserrat-ink">Vista previa del reporte</h3>
              </div>
              <button
                onClick={cerrarPreview}
                className={`${filaInteractiva} rounded-lg p-1.5 text-monserrat-ink/50 hover:bg-monserrat-ink/5 hover:text-monserrat-ink`}
                aria-label="Cerrar vista previa"
              >
                <X size={18} />
              </button>
            </div>

            <iframe src={previewUrl} className="w-full flex-1" title="Vista previa del PDF" />

            <div className="flex justify-end gap-2 border-t border-monserrat-ink/10 p-4">
              <button
                onClick={cerrarPreview}
                className={`${filaInteractiva} rounded-lg border border-monserrat-ink/20 px-4 py-2 text-sm font-semibold text-monserrat-ink hover:bg-monserrat-ink/5`}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarDescarga}
                className={`${filaInteractiva} inline-flex items-center gap-2 rounded-lg bg-monserrat-red px-4 py-2 text-sm font-bold text-white hover:bg-monserrat-red/90`}
              >
                <Download size={16} />
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// =====================================================================
// Dibujo del reporte con jsPDF + jspdf-autotable (vectorial)
// SIN CAMBIOS respecto al original.
// =====================================================================
function dibujarReporte(
  pdf: any,
  autoTable: any,
  alumno: UsuarioAcademico,
  notasAlumno: NotaAcademica[],
  academicoConfig: AcademicoConfig,
  escudoImg: ImagenCargada,
  logoImg: ImagenCargada
) {
  const PAGE_W = 210; // A4 mm
  const PAGE_H = 297;
  const MARGIN_X = 10;
  const MARGIN_BOTTOM = 8;
  const contentW = PAGE_W - MARGIN_X * 2; // 190

  const esSecundaria = (alumno.nivelEducativo ?? "").toUpperCase() === "SECUNDARIA"
    || (alumno.grado ?? "").endsWith("_SECUNDARIA");

  const cursosPrimaria = (academicoConfig.cursosPrimaria ?? []).filter((c) => c.active);
  const cursosSecundaria = (academicoConfig.cursosSecundaria ?? []).filter((c) => c.active);
  const cursosMap = new Map<string, (typeof cursosPrimaria)[number]>();
  cursosPrimaria.forEach((curso) => cursosMap.set(curso.id, curso));
  cursosSecundaria.forEach((curso) => {
    if (!cursosMap.has(curso.id)) {
      cursosMap.set(curso.id, curso);
    }
  });
  const cursos = Array.from(cursosMap.values());

  const competenciasPorCursoPrimaria = academicoConfig.competenciasPorCursoPrimaria ?? {};
  const competenciasPorCursoSecundaria = academicoConfig.competenciasPorCursoSecundaria ?? {};
  const compatCompetenciasPorCurso = Object.fromEntries(
    Array.from(new Set([...Object.keys(competenciasPorCursoPrimaria), ...Object.keys(competenciasPorCursoSecundaria)])).map((cursoId) => {
      const ids = Array.from(new Set([
        ...(competenciasPorCursoPrimaria[cursoId] ?? []),
        ...(competenciasPorCursoSecundaria[cursoId] ?? [])
      ]));
      return [cursoId, ids];
    })
  );
  const catalogoCompetencias = Array.from(
    new Map([
      ...((academicoConfig.competenciasPrimaria ?? []).map((item) => [item.id, item] as const)),
      ...((academicoConfig.competenciasSecundaria ?? []).map((item) => [item.id, item] as const)),
    ]).values()
  );

  const buscarNota = (cursoId: string, competenciaId: string, periodo: string) =>
    notasAlumno.find(
      (n) => n.curso === cursoId && n.competenciaId === competenciaId && n.periodo === periodo
    );

  const anioLectivo = new Date().getFullYear();
  const gradoTexto = gradoOrdinal(alumno.grado);
  const nivelTexto = alumno.nivelEducativo ?? (esSecundaria ? "SECUNDARIA" : "PRIMARIA");

  // --- Estilos base (compartidos) -----------------------------------
  const baseStyles = {
    font: "helvetica",
    fontSize: 6,
    cellPadding: 1 as any,
    lineColor: [0, 0, 0] as any,
    lineWidth: 0.1,
    valign: "middle" as const,
    overflow: "linebreak" as const,
    textColor: [17, 17, 17] as any,
  };

  const gridOpts = {
    theme: "grid" as const,
    margin: { left: MARGIN_X, right: MARGIN_X } as any,
    styles: baseStyles,
    tableLineColor: [0, 0, 0] as any,
    tableLineWidth: 0.1,
  };

  let cursorY = 10;

  // --- Encabezado: escudo | título + datos | logo -------------------
  const escudoBox = { w: 18, h: 24 };
  const logoBox = { w: 18, h: 18 };

  if (escudoImg) {
    const fit = ajustarImagen(escudoImg.w, escudoImg.h, escudoBox.w, escudoBox.h);
    const offsetY = (escudoBox.h - fit.h) / 2;
    pdf.addImage(escudoImg.data, escudoImg.format, MARGIN_X, cursorY + offsetY, fit.w, fit.h);
  }
  if (logoImg) {
    const fit = ajustarImagen(logoImg.w, logoImg.h, logoBox.w, logoBox.h);
    pdf.addImage(
      logoImg.data,
      logoImg.format,
      PAGE_W - MARGIN_X - logoBox.w,
      cursorY,
      logoBox.w,
      logoBox.h
    );
  }

  // Título centrado en la columna central (entre escudo y logo).
  const titulo = `INFORME DE PROGRESO DE LAS COMPETENCIAS DEL ESTUDIANTE - ${anioLectivo}`;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  const centroX = PAGE_W / 2;
  pdf.text(titulo, centroX, cursorY + 4, { align: "center", maxWidth: contentW - 50 });

  // --- Tabla de datos del alumno -----------------------------------
  const etiqueta = { fillColor: [242, 242, 242] as any, fontStyle: "bold" as const };
  autoTable(pdf, {
    ...gridOpts,
    startY: cursorY + 7,
    margin: { left: MARGIN_X + 20, right: MARGIN_X + 20 },
    styles: { ...baseStyles, fontSize: 6.5 },
    columnStyles: {
      0: { cellWidth: 24, ...etiqueta, halign: "left" },
      1: { cellWidth: 52, halign: "left" },
      2: { cellWidth: 34, ...etiqueta, halign: "left" },
      3: { cellWidth: "auto", halign: "left" },
    },
    body: [
      [{ content: "DRE:", ...etiqueta }, "JUNÍN", { content: "UGEL:", ...etiqueta }, "HUANCAYO"],
      [{ content: "NIVEL:", ...etiqueta }, nivelTexto, { content: "CÓDIGO MODULAR:", ...etiqueta }, "220605"],
      [{ content: "I.E.P.", ...etiqueta }, { content: "NUESTRA SEÑORA DE MONSERRAT", colSpan: 3, styles: { halign: "left" } }],
      [{ content: "GRADO:", ...etiqueta }, gradoTexto, { content: "SECCIÓN:", ...etiqueta }, "ÚNICA"],
      [{ content: "ALUMNO:", ...etiqueta }, { content: alumno.nombre, colSpan: 3, styles: { halign: "left" } }],
      [{ content: "DNI N°:", ...etiqueta }, { content: alumno.dni || "", colSpan: 3, styles: { halign: "left" } }],
    ],
  });
  cursorY = Math.max(pdf.lastAutoTable.finalY, cursorY + 24) + 3;

  // --- Escalado dinámico basado en medición REAL del texto -----------
  const COL_W = { area: 19, competencia: 47, nl: 5.7, comentario: 21.85, nlFinal: 13.3 };
  const LINE_FACTOR = 1.15;
  const MM_POR_PT = 0.3528;

  const filasCompetencias: { curso: (typeof cursos)[number]; competencia: any }[] = [];
  cursos.forEach((curso) => {
    const idsCompetencias = compatCompetenciasPorCurso[curso.id] ?? [];
    const competencias = catalogoCompetencias.filter((c) => idsCompetencias.includes(c.id));
    competencias.forEach((competencia) => filasCompetencias.push({ curso, competencia }));
  });

  const contarLineas = (texto: string, maxWidth: number, fontSize: number): number => {
    if (!texto) return 1;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(texto, Math.max(maxWidth, 3));
    return Math.max(lines.length, 1);
  };

  const comentariosPorFila = filasCompetencias.map(({ curso, competencia }) =>
    BIMESTRES.map((bimestre) => extraerComentario(buscarNota(curso.id, competencia.id, bimestre)?.observacion))
  );

  const FOOTER_RESERVE = 78; // leyenda + comentario general + asistencia + espacios (diseño sin cambios)
  const disponibleTabla = PAGE_H - MARGIN_BOTTOM - cursorY - FOOTER_RESERVE;

  const CANDIDATOS = [
    { fontSize: 6.5, padding: 1.0 },
    { fontSize: 6.0, padding: 0.9 },
    { fontSize: 5.5, padding: 0.8 },
    { fontSize: 5.0, padding: 0.7 },
    { fontSize: 4.5, padding: 0.6 },
    { fontSize: 4.0, padding: 0.5 },
    { fontSize: 3.6, padding: 0.4 },
    { fontSize: 3.2, padding: 0.35 },
    { fontSize: 3.0, padding: 0.3 },
  ];

  const alturaTablaPara = (fontSize: number, padding: number, maxChars: number) => {
    const headFontSize = Math.min(fontSize + 0.5, 6.5);
    const headLineH = headFontSize * MM_POR_PT * LINE_FACTOR;
    const row1Lineas = Math.max(
      contarLineas("ÁREA CURRICULAR", COL_W.area - 2 * padding, headFontSize),
      contarLineas("NL alcanzado al finalizar el período lectivo", COL_W.nlFinal - 2 * padding, headFontSize)
    );
    const row2Lineas = Math.max(
      contarLineas("NL", COL_W.nl - 2 * padding, headFontSize),
      contarLineas("Conclusión descriptiva", COL_W.comentario - 2 * padding, headFontSize)
    );
    const headerH = row1Lineas * headLineH + 2 * padding + (row2Lineas * headLineH + 2 * padding);

    const bodyLineH = fontSize * MM_POR_PT * LINE_FACTOR;
    let bodyH = 0;
    filasCompetencias.forEach(({ competencia }, i) => {
      const labelLineas = contarLineas(competencia.label, COL_W.competencia - 2 * padding, fontSize);
      let maxLineas = labelLineas;
      comentariosPorFila[i].forEach((c) => {
        const texto = truncar(c, maxChars);
        const lineas = contarLineas(texto, COL_W.comentario - 2 * padding, fontSize);
        if (lineas > maxLineas) maxLineas = lineas;
      });
      bodyH += maxLineas * bodyLineH + 2 * padding;
    });

    return headerH + bodyH;
  };

  let escala = { fontSize: CANDIDATOS[CANDIDATOS.length - 1].fontSize, padding: CANDIDATOS[CANDIDATOS.length - 1].padding, maxChars: 30 };
  let encontrado = false;
  for (const cand of CANDIDATOS) {
    const maxChars = Math.round(10 + cand.fontSize * 18); // más letra -> se permite más texto
    const altura = alturaTablaPara(cand.fontSize, cand.padding, maxChars);
    if (altura <= disponibleTabla) {
      escala = { ...cand, maxChars };
      encontrado = true;
      break;
    }
  }
  if (!encontrado) {
    const min = CANDIDATOS[CANDIDATOS.length - 1];
    let maxChars = 60;
    while (maxChars > 12) {
      const altura = alturaTablaPara(min.fontSize, min.padding, maxChars);
      if (altura <= disponibleTabla) break;
      maxChars -= 6;
    }
    escala = { fontSize: min.fontSize, padding: min.padding, maxChars };
  }

  // --- Tabla principal de competencias ------------------------------
  const azul = [26, 62, 140] as any;
  const areaFill = [219, 228, 240] as any;

  const head = [
    [
      { content: "ÁREA CURRICULAR", rowSpan: 2, styles: { valign: "middle", halign: "center", fillColor: areaFill, fontStyle: "bold" } },
      { content: "COMPETENCIAS", rowSpan: 2, styles: { valign: "middle", halign: "center", fontStyle: "bold" } },
      { content: "I BIMESTRE", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
      { content: "II BIMESTRE", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
      { content: "III BIMESTRE", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
      { content: "IV BIMESTRE", colSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
      { content: "NL alcanzado al finalizar el período lectivo", rowSpan: 2, styles: { halign: "center", fontStyle: "bold" } },
    ],
    [
      "NL", "Conclusión descriptiva",
      "NL", "Conclusión descriptiva",
      "NL", "Conclusión descriptiva",
      "NL", "Conclusión descriptiva",
    ],
  ];

  const body: any[][] = [];
  let cursoActual: string | null = null;
  let filasRestantesCurso = 0;
  filasCompetencias.forEach(({ curso, competencia }, i) => {
    const row: any[] = [];

    if (curso.id !== cursoActual) {
      cursoActual = curso.id;
      filasRestantesCurso = filasCompetencias.filter((f) => f.curso.id === curso.id).length;
      row.push({
        content: curso.label.toUpperCase(),
        rowSpan: filasRestantesCurso,
        styles: { valign: "middle", halign: "center", fillColor: areaFill, fontStyle: "bold" },
      });
    }

    row.push({ content: competencia.label, styles: { halign: "left", valign: "middle" } });

    BIMESTRES.forEach((bimestre, bIdx) => {
      const nota = buscarNota(curso.id, competencia.id, bimestre);
      const nl = nivelDesdeValor(nota?.valor);
      const comentario = truncar(comentariosPorFila[i][bIdx], escala.maxChars);
      row.push({ content: nl, styles: { halign: "center", valign: "middle", textColor: azul, fontStyle: "bold" } });
      row.push({ content: comentario, styles: { halign: "left", valign: "middle" } });
    });

    const notaFinal = buscarNota(curso.id, competencia.id, "GENERAL");
    const nlFinal = nivelDesdeValor(notaFinal?.valor);
    row.push({ content: nlFinal, styles: { halign: "center", valign: "middle", textColor: azul, fontStyle: "bold" } });

    body.push(row);
  });

  autoTable(pdf, {
    ...gridOpts,
    startY: cursorY,
    head,
    body,
    styles: { ...baseStyles, fontSize: escala.fontSize, cellPadding: escala.padding },
    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: "bold", halign: "center", valign: "middle", lineWidth: 0.1, lineColor: [0, 0, 0], fontSize: Math.min(escala.fontSize + 0.5, 6.5) },
    columnStyles: {
      0: { cellWidth: 19, halign: "center", valign: "middle" },
      1: { cellWidth: 47, halign: "left", valign: "middle" },
      2: { cellWidth: 5.7, halign: "center", valign: "middle" },
      3: { cellWidth: 21.85, halign: "left", valign: "middle" },
      4: { cellWidth: 5.7, halign: "center", valign: "middle" },
      5: { cellWidth: 21.85, halign: "left", valign: "middle" },
      6: { cellWidth: 5.7, halign: "center", valign: "middle" },
      7: { cellWidth: 21.85, halign: "left", valign: "middle" },
      8: { cellWidth: 5.7, halign: "center", valign: "middle" },
      9: { cellWidth: 21.85, halign: "left", valign: "middle" },
      10: { cellWidth: 13.3, halign: "center", valign: "middle" },
    },
  });
  cursorY = pdf.lastAutoTable.finalY + 3;

  // --- Leyenda de niveles de logro ---------------------------------
  autoTable(pdf, {
    ...gridOpts,
    startY: cursorY,
    styles: { ...baseStyles, fontSize: 6.5 },
    columnStyles: {
      0: { cellWidth: 12, halign: "center", valign: "middle", fillColor: [242, 242, 242], fontStyle: "bold" },
      1: { halign: "left", valign: "middle" },
    },
    body: [
      ["AD", { content: "LOGRO DESTACADO: Cuando el estudiante evidencia un nivel superior a lo esperado respecto a la competencia. Esto quiere decir que demuestra aprendizajes que van más allá del nivel esperado." }],
      ["A", { content: "LOGRO ESPERADO: Cuando el estudiante evidencia el nivel esperado respecto a la competencia, demostrando manejo satisfactorio en todas las tareas propuestas y en el tiempo programado." }],
      ["B", { content: "EN PROCESO: Cuando el estudiante está próximo o cerca al nivel esperado respecto a la competencia, para lo cual requiere acompañamiento durante un tiempo razonable para lograrlo." }],
      ["C", { content: "EN INICIO: Cuando el estudiante muestra progreso mínimo en una competencia de acuerdo al nivel esperado. Evidencia con frecuencia dificultades en el desarrollo de las tareas, por lo que necesita mayor tiempo de acompañamiento e intervención del docente." }],
    ],
  });
  cursorY = pdf.lastAutoTable.finalY + 3;

  // --- Comentario general ------------------------------------------
  autoTable(pdf, {
    ...gridOpts,
    startY: cursorY,
    styles: { ...baseStyles, fontSize: 6.5, halign: "center", fontStyle: "bold", fillColor: [242, 242, 242], minCellHeight: 12 },
    body: [["Comentario General"]],
  });
  cursorY = pdf.lastAutoTable.finalY + 3;

  // --- Tabla de asistencia -----------------------------------------
  autoTable(pdf, {
    ...gridOpts,
    startY: cursorY,
    styles: { ...baseStyles, fontSize: 6.5, halign: "center", valign: "middle" },
    headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], fontStyle: "bold", halign: "center", valign: "middle", lineWidth: 0.1, lineColor: [0, 0, 0] },
    head: [
      [
        { content: "Período", rowSpan: 2, styles: { fontStyle: "bold" } },
        { content: "Inasistencia", colSpan: 2, styles: { fontStyle: "bold" } },
        { content: "Tardanzas", colSpan: 2, styles: { fontStyle: "bold" } },
      ],
      ["Justificadas", "Injustificadas", "Justificadas", "Injustificadas"],
    ],
    body: [
      ["S1", "", "", "", ""],
      ["S2", "", "", "", ""],
    ],
    columnStyles: {
      0: { cellWidth: 20, fontStyle: "bold" },
    },
  });
  cursorY = pdf.lastAutoTable.finalY + 3;
}