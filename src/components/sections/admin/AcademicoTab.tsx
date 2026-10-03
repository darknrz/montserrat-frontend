import {
  BookOpen,
  Download,
  FileSpreadsheet,
  GraduationCap,
  School,
  Save,
  Upload,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { monserratApi } from "../../../api/monserrat";
import type { AsignacionAcademica, UsuarioAcademico } from "../../../types";
import { ConfirmForceDeleteModal } from "../../ui/ConfirmForceDeleteModal";
import { Modal } from "../../ui/Modal";
import {
  AdminField,
  AdminMetric,
  AdminTable,
  MediaPicker,
} from "./adminComponents";
import {
  GRADOS_PRIMARIA,
  GRADOS_SECUNDARIA,
  NIVELES,
  defaultGrado,
  formatGrado,
  formatSalon,
  toUpperName,
  getGradosPorNivelAcademico,
  getGruposPorGrado,
  labelFromEnum,
  normalizeGrado,
  normalizeGrupo,
  normalizeNivel,
  parseBooleanCell,
  type AcademicoConfig,
} from "./adminShared";

type AcademicoTabProps = {
  usuariosAcademicos: UsuarioAcademico[];
  asignacionesAcademicas?: AsignacionAcademica[];
  setUsuariosAcademicos: React.Dispatch<React.SetStateAction<UsuarioAcademico[]>>;
  academicoConfig: AcademicoConfig;
  token: string;
  isBusy: boolean;
  setIsBusy: (busy: boolean) => void;
  setStatus: (status: string | null) => void;
  setErrorMessage: (msg: string | null) => void;
  runAdminAction: (action: () => Promise<void>, successMessage: string) => void;
  cursosActivosPorNivel: (nivel?: string) => string[];
  seccionesActivasPorNivel: (nivel?: string) => string[];
  gradosActivosPorNivel: (nivel?: string) => string[];
  labelAcademico: (id: string) => string;
};

const emptyUsuarioAcademico: Omit<UsuarioAcademico, "id"> = {
  dni: "",
  codigo: "",
  nombre: "",
  nombres: "",
  apellidos: "",
  correo: "",
  direccion: "",
  fechaNacimiento: "",
  rol: "ALUMNO",
  estado: "ACTIVO",
  telefono: "",
  fotoUrl: "",
  nivelEducativo: "PRIMARIA",
  grado: "PRIMERO_PRIMARIA",
  seccion: "A",
  materia: "",
  especialidad: "",
  estadoMatricula: "MATRICULADO",
  pensionPagada: false,
  pensionObservacion: "",
  createdAt: "",
  inicioPeriodo: "",
};

export function AcademicoTab({
  usuariosAcademicos,
  asignacionesAcademicas = [],
  setUsuariosAcademicos,
  academicoConfig,
  token,
  isBusy,
  setIsBusy,
  setStatus,
  setErrorMessage,
  runAdminAction,
  gradosActivosPorNivel,
}: AcademicoTabProps) {
  const [editingUsuarioAcademico, setEditingUsuarioAcademico] =
    useState<UsuarioAcademico | null>(null);
  const [usuarioAcademicoForm, setUsuarioAcademicoForm] =
    useState<Omit<UsuarioAcademico, "id">>(emptyUsuarioAcademico);
  const [usuarioAcademicoPhotoFile, setUsuarioAcademicoPhotoFile] = useState<File | null>(null);
  const [academicoSearch, setAcademicoSearch] = useState("");
  const [academicoNivelFiltro, setAcademicoNivelFiltro] = useState("TODOS");
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState("Importando alumnos...");
  const [forceDeleteTarget, setForceDeleteTarget] = useState<{
    id: number;
    name: string;
    message: string;
  } | null>(null);

  const docentes = useMemo(
    () => usuariosAcademicos.filter((u) => u.rol === "DOCENTE"),
    [usuariosAcademicos]
  );
  const alumnos = useMemo(
    () => usuariosAcademicos.filter((u) => u.rol === "ALUMNO"),
    [usuariosAcademicos]
  );

  // Niveles de cada docente, derivados de sus asignaciones (alumno-aula y matriz de competencias).
  const nivelesPorDocente = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const add = (dni: string, nivel?: string) => {
      if (!dni || !nivel) return;
      if (!map.has(dni)) map.set(dni, new Set());
      map.get(dni)!.add(nivel);
    };
    asignacionesAcademicas
      .filter((a) => a.activo !== false)
      .forEach((a) => add(a.docenteDni, a.nivelEducativo));
    const nivelDeGrado = (grado: string) =>
      grado === "INICIAL" ? "INICIAL" : grado.endsWith("_PRIMARIA") ? "PRIMARIA" : grado.endsWith("_SECUNDARIA") ? "SECUNDARIA" : undefined;
    [
      academicoConfig.docentesPorCompetencia,
      academicoConfig.docentesPorCompetenciaSecundaria,
      academicoConfig.docentesPorCompetenciaInicial,
    ].forEach((matriz) => {
      Object.entries(matriz ?? {}).forEach(([key, dnis]) => {
        const nivel = nivelDeGrado(key.split("||")[0] ?? "");
        (Array.isArray(dnis) ? dnis : [dnis]).forEach((dni) => add(dni, nivel));
      });
    });
    return map;
  }, [asignacionesAcademicas, academicoConfig]);

  const nivelesDeUsuario = (u: UsuarioAcademico): string[] =>
    u.rol === "DOCENTE"
      ? NIVELES.filter((n) => nivelesPorDocente.get(u.dni)?.has(n))
      : u.nivelEducativo ? [u.nivelEducativo] : [];

  // Orden de la tabla: por defecto alfabético por nombre (columna 1); el admin puede cambiarlo con ^ / v.
  const [sortColumn, setSortColumn] = useState(1);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const handleSort = (column: number) => {
    if (column === sortColumn) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const usuariosFiltrados = useMemo(() => {
    const term = academicoSearch.trim().toLowerCase();
    const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });
    const sortKey = (u: UsuarioAcademico) =>
      sortColumn === 0 ? u.codigo || u.dni || "" : sortColumn === 2 ? labelFromEnum(u.rol) : u.nombre || "";
    return usuariosAcademicos
      .filter((u) => academicoNivelFiltro === "TODOS" || nivelesDeUsuario(u).includes(academicoNivelFiltro))
      .filter(
        (u) =>
          !term ||
          [
            u.codigo,
            u.dni,
            u.nombre,
            u.rol,
            u.nivelEducativo,
            u.grado,
            u.seccion,
            u.materia,
            u.especialidad,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(term))
      )
      .sort((a, b) => {
        const primary = collator.compare(sortKey(a), sortKey(b));
        const result = primary !== 0 ? primary : collator.compare(a.nombre || "", b.nombre || "");
        return sortDirection === "asc" ? result : -result;
      });
  }, [academicoNivelFiltro, academicoSearch, usuariosAcademicos, nivelesPorDocente, sortColumn, sortDirection]);

  const eliminarUsuarioAcademico = async (
    usuario: Pick<UsuarioAcademico, "id" | "nombre">,
    force = false
  ) => {
    setIsBusy(true);
    setStatus(null);
    setErrorMessage(null);
    try {
      await monserratApi.deleteUsuarioAcademico(usuario.id, token, force);
      setUsuariosAcademicos((prev) => prev.filter((item) => item.id !== usuario.id));
      setStatus("Usuario academico eliminado");
      setForceDeleteTarget(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar el usuario academico";
      if (!force && /datos vinculados|no se puede eliminar|dependencias/i.test(message)) {
        setForceDeleteTarget({ id: usuario.id, name: usuario.nombre, message });
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const uploadUsuarioAcademicoPhoto = async () => {
    if (!usuarioAcademicoPhotoFile) return usuarioAcademicoForm.fotoUrl ?? "";
    return (await monserratApi.uploadMedia(usuarioAcademicoPhotoFile, "academico", token))
      .secureUrl;
  };

  const submitUsuarioAcademico = (e: FormEvent) => {
    e.preventDefault();
    runAdminAction(async () => {
      const fotoUrl = await uploadUsuarioAcademicoPhoto();
      
      // Formato "APELLIDOS NOMBRES" en mayusculas (ej: RUIZ ROJAS JHON ALBERTO):
      // los dos primeros tokens son apellidos y el resto nombres.
      const nombreCompleto = toUpperName(usuarioAcademicoForm.nombre);
      let nombres = "";
      let apellidos = "";
      if (nombreCompleto) {
        const parts = nombreCompleto.split(" ").filter(Boolean);
        if (parts.length >= 3) {
          apellidos = parts.slice(0, 2).join(" ");
          nombres = parts.slice(2).join(" ");
        } else if (parts.length === 2) {
          apellidos = parts[0];
          nombres = parts[1];
        } else {
          nombres = parts[0] || "";
        }
      }

      const payload = {
        ...usuarioAcademicoForm,
        fotoUrl,
        nombre: nombreCompleto,
        nombres: nombres || toUpperName(usuarioAcademicoForm.nombres ?? ""),
        apellidos: apellidos || toUpperName(usuarioAcademicoForm.apellidos ?? ""),
        createdAt: usuarioAcademicoForm.createdAt ? usuarioAcademicoForm.createdAt : undefined,
        fechaNacimiento: usuarioAcademicoForm.fechaNacimiento ? usuarioAcademicoForm.fechaNacimiento : undefined,
      };

      if (payload.rol === "ALUMNO") {
        payload.grado = payload.grado || defaultGrado(payload.nivelEducativo ?? "PRIMARIA");
        const grupos = getGruposPorGrado(payload.grado);
        payload.seccion = grupos.length > 0 ? payload.seccion || grupos[0] : undefined;
      } else {
        delete payload.grado;
        delete payload.seccion;
      }

      if (editingUsuarioAcademico) {
        await monserratApi.updateUsuarioAcademico(editingUsuarioAcademico.id, payload, token);
      } else {
        await monserratApi.createUsuarioAcademico(payload, token);
      }
      setUsuariosAcademicos(await monserratApi.usuariosAcademicos(token));
      setEditingUsuarioAcademico(null);
      setUsuarioAcademicoForm(emptyUsuarioAcademico);
      setUsuarioAcademicoPhotoFile(null);
    }, "Usuario academico guardado");
  };

  const prepararFormularioAcademico = (rol: "ALUMNO" | "DOCENTE", nivel: string) => {
    const primerGrado = gradosActivosPorNivel(nivel)[0] ?? defaultGrado(nivel);
    const gruposPrimerGrado = getGruposPorGrado(primerGrado);
    setEditingUsuarioAcademico(null);
    setImportSummary(null);
    setUsuarioAcademicoPhotoFile(null);
    setUsuarioAcademicoForm({
      ...emptyUsuarioAcademico,
      rol,
      // El docente no tiene nivel propio: sus niveles se derivan de sus asignaciones.
      nivelEducativo: rol === "ALUMNO" ? nivel : undefined,
      grado: rol === "ALUMNO" ? primerGrado : undefined,
      seccion: rol === "ALUMNO" && gruposPrimerGrado.length > 0 ? gruposPrimerGrado[0] : undefined,
      materia: "",
      especialidad: "",
    });
  };

  const exportarAlumnosExcel = async () => {
    const XLSX = await import("xlsx");
    const data = [...alumnos]
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .map((alumno) => ({
      codigo: alumno.codigo ?? "",
      dni: alumno.dni,
      nombre: alumno.nombre,
      nombres: alumno.nombres ?? "",
      apellidos: alumno.apellidos ?? "",
      correo: alumno.correo ?? "",
      telefono: alumno.telefono ?? "",
      nivelEducativo: alumno.nivelEducativo ?? "",
      grado: alumno.grado ?? "",
      seccion: alumno.seccion ?? "",
      inicio_periodo: formatIsoDateToDmy(alumno.inicioPeriodo),
      estadoMatricula: alumno.estadoMatricula ?? "MATRICULADO",
      pensionPagada: alumno.pensionPagada ? "SI" : "NO",
      pensionObservacion: alumno.pensionObservacion ?? "",
      direccion: alumno.direccion ?? "",
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data), "Alumnos");
    XLSX.writeFile(workbook, "alumnos_monserrat.xlsx");
  };

  const descargarPlantillaAlumnos = async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();

    const instrucciones = [
      { Seccion: "Como importar", Detalle: "En 'Importar' sube este mismo archivo (con tus datos) o cualquier Excel .xlsx con una hoja de alumnos y, si quieres, hojas de docentes. Crea los alumnos nuevos y actualiza los que ya existen (se reconocen por DNI), en un solo paso." },
      { Seccion: "", Detalle: "" },
      { Seccion: "Hoja ESTUDIANTES - columnas", Detalle: "" },
      { Seccion: "DNI (obligatorio)", Detalle: "Numero de documento. Identifica al alumno para no duplicarlo." },
      { Seccion: "NOMBRE COMPLETO (obligatorio)", Detalle: "Formato APELLIDOS NOMBRES, ej: RUIZ ROJAS JHON ALBERTO (se guarda siempre en mayusculas; o usa columnas separadas NOMBRES / APELLIDOS)." },
      { Seccion: "GRADO (obligatorio)", Detalle: "Ej: '6to Primaria', '1ro Secundaria', '3 Secundaria'. Acepta con o sin tilde/grado (deg.)." },
      { Seccion: "NIVEL (opcional)", Detalle: "INICIAL, PRIMARIA o SECUNDARIA. Si no esta, se deduce del texto de GRADO." },
      { Seccion: "GRUPO / SALON (obligatorio solo en los grados de la tabla 'Grados con salon')", Detalle: "Ver la hoja 'Grados con salon'." },
      { Seccion: "SECCION / AULA (opcional)", Detalle: "Para el resto de grados. Si no se indica, se usa 'A'." },
      { Seccion: "CODIGO (opcional)", Detalle: "Codigo interno del alumno, si ya tiene uno." },
      { Seccion: "CORREO (opcional)", Detalle: "Debe contener '@' para tomarse en cuenta." },
      { Seccion: "TELEFONO (opcional)", Detalle: "" },
      { Seccion: "INICIO PERIODO (opcional)", Detalle: "Formato DD/MM/AAAA." },
      { Seccion: "ESTADO MATRICULA (opcional)", Detalle: "MATRICULADO (por defecto), RETIRADO, TRASLADADO o EGRESADO." },
      { Seccion: "", Detalle: "" },
      { Seccion: "Hojas de docentes (opcional)", Detalle: "" },
      { Seccion: "Nombre de hoja", Detalle: "Debe contener 'docente' + 'primaria' (ej: Docentes_Primaria) o 'docente' + 'secundaria' (ej: Docentes_Secundaria)." },
      { Seccion: "Columnas", Detalle: "DNI, NOMBRE COMPLETO, CORREO, TELEFONO, CURSO, CODIGO." },
      { Seccion: "", Detalle: "" },
      { Seccion: "Errores comunes", Detalle: "" },
      { Seccion: "-", Detalle: "Si el DNI ya existe, la fila actualiza ese registro en vez de crear uno duplicado." },
      { Seccion: "-", Detalle: "Un GRADO que no se puede reconocer (texto muy distinto a '1ro/2do/.../6to' + 'Primaria/Secundaria') hace que la fila se omita." },
    ];
    const hojaInstrucciones = XLSX.utils.json_to_sheet(instrucciones);
    hojaInstrucciones["!cols"] = [{ wch: 55 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(workbook, hojaInstrucciones, "Instrucciones");

    const gradosConGrupo = [...GRADOS_PRIMARIA, ...GRADOS_SECUNDARIA]
      .map((grado) => ({ grado, grupos: getGruposPorGrado(grado) }))
      .filter((g) => g.grupos.length > 0 && g.grado !== "INICIAL")
      .map((g) => ({
        Grado: formatGrado(g.grado),
        "Valores validos para SALON": g.grupos.map((grupo) => formatSalon(g.grado, grupo)).join(", "),
      }));
    const hojaGrupos = XLSX.utils.json_to_sheet(gradosConGrupo);
    hojaGrupos["!cols"] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(workbook, hojaGrupos, "Grados con salon");

    const estudiantes = [
      {
        DNI: "71234567",
        CODIGO: "2026001A",
        "NOMBRE COMPLETO": "PEREZ GOMEZ JUAN CARLOS",
        CORREO: "juan.perez@colegio.edu.pe",
        TELEFONO: "987654321",
        GRADO: "1ro Primaria",
        NIVEL: "PRIMARIA",
        SECCION: "A",
        GRUPO: "",
        "INICIO PERIODO": "10/03/2024",
      },
      {
        DNI: "71234568",
        CODIGO: "2026002A",
        "NOMBRE COMPLETO": "LOPEZ DIAZ MARIA FERNANDA",
        CORREO: "maria.lopez@colegio.edu.pe",
        TELEFONO: "987654322",
        GRADO: "1ro Secundaria",
        NIVEL: "SECUNDARIA",
        SECCION: "",
        GRUPO: "Ciclado I",
        "INICIO PERIODO": "10/03/2024",
      },
    ];

    const docentesPrimaria = [
      {
        DNI: "72345001",
        CODIGO: "DOC2026001A",
        "NOMBRE COMPLETO": "MENDOZA RUIZ CARLOS ALBERTO",
        CORREO: "carlos.mendoza@colegio.edu.pe",
        TELEFONO: "998700001",
        CURSO: "COMPETENCIAS_TRANSVERSALES",
      },
    ];

    const docentesSecundaria = [
      {
        DNI: "72345002",
        CODIGO: "DOC2026002A",
        "NOMBRE COMPLETO": "LOPEZ CASTILLO ANA MARIA",
        CORREO: "ana.lopez@colegio.edu.pe",
        TELEFONO: "998700002",
        CURSO: "MATEMATICA",
      },
    ];

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(estudiantes), "Estudiantes");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(docentesPrimaria), "Docentes_Primaria");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(docentesSecundaria), "Docentes_Secundaria");
    XLSX.writeFile(workbook, "plantilla_academico_monserrat.xlsx");
  };

  const formatIsoDateToDmy = (iso?: string): string => {
    if (!iso) return "";
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return "";
    const day = String(parsed.getDate()).padStart(2, "0");
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const year = String(parsed.getFullYear());
    return `${day}/${month}/${year}`;
  };

  const parseExcelSerialDate = (value: number): Date | undefined => {
    if (!Number.isFinite(value)) return undefined;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const days = Math.floor(value);
    const fractionalDay = value - days;
    const excelDay = days > 60 ? days - 1 : days;
    const millis = Math.round(fractionalDay * 24 * 60 * 60 * 1000);
    return new Date(excelEpoch.getTime() + excelDay * 24 * 60 * 60 * 1000 + millis);
  };

  const parseInicioPeriodo = (value: unknown): string | undefined => {
    if (value === undefined || value === null) return undefined;
    const texto = typeof value === "string" ? value.trim() : "";
    if (typeof value === "string" && !texto) return undefined;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, "0");
      const day = String(value.getDate()).padStart(2, "0");
      const hours = String(value.getHours()).padStart(2, "0");
      const minutes = String(value.getMinutes()).padStart(2, "0");
      const seconds = String(value.getSeconds()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    if (typeof value === "number") {
      const date = parseExcelSerialDate(value);
      if (date && !Number.isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const hours = String(date.getHours()).padStart(2, "0");
        const minutes = String(date.getMinutes()).padStart(2, "0");
        const seconds = String(date.getSeconds()).padStart(2, "0");
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      }
    }

    if (typeof texto === "string") {
      const isoDateTime = (() => {
        const dmy = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
        if (!dmy) return undefined;
        const [, dd, mm, yyyy, hh = "00", min = "00", ss = "00"] = dmy;
        const pad = (s: string) => s.padStart(2, "0");
        return `${yyyy}-${pad(mm)}-${pad(dd)}T${pad(hh)}:${pad(min)}:${pad(ss)}`;
      })();
      return isoDateTime;
    }

    return undefined;
  };

  const importarAlumnosExcel = async (
    file: File,
    mode: "upsert" | "create-only" | "update-only" = "upsert"
  ) => {
    const modeLabel =
      mode === "update-only"
        ? "Actualizando alumnos existentes..."
        : mode === "create-only"
        ? "Importando sólo alumnos nuevos..."
        : "Importando y actualizando alumnos...";
    setImportSummary(null);
    setImportProgress(0);
    setIsImporting(true);
    let nextGeneratedDni = 30000001;
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const alumnosPorDni = new Map(
      usuariosAcademicos.map((usuario) => [usuario.dni.trim(), usuario])
    );
    const alumnosPorCodigo = new Map(
      usuariosAcademicos
        .filter((usuario) => usuario.codigo)
        .map((usuario) => [usuario.codigo!.trim().toLowerCase(), usuario])
    );
    const alumnosPorCorreo = new Map(
      usuariosAcademicos
        .filter((usuario) => usuario.correo)
        .map((usuario) => [usuario.correo!.trim().toLowerCase(), usuario])
    );

    let alumnosCreados = 0;
    let alumnosActualizados = 0;
    let alumnosOmitidos = 0;
    let alumnosIgnorados = 0;
    let docentesPrimariaCreados = 0;
    let docentesPrimariaOmitidos = 0;
    let docentesSecundariaCreados = 0;
    let docentesSecundariaOmitidos = 0;

    const sheets = workbook.SheetNames.map((sheetName) => ({
      sheetName,
      rows: XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" }),
    }));
    const totalRows = sheets.reduce((count, sheet) => count + sheet.rows.length, 0);
    let processedRows = 0;

    await runAdminAction(async () => {
      for (const { sheetName, rows } of sheets) {
        const sheetLower = sheetName.trim().toLowerCase().replace(/\s+/g, "_");

        const isDocentePrimariaSheet =
          sheetLower === "docentes_primaria" ||
          /docente.*primaria|primaria.*docente/i.test(sheetName);
        const isDocenteSecundariaSheet =
          sheetLower === "docentes_secundaria" ||
          /docente.*secundaria|secundaria.*docente/i.test(sheetName);
        const isEstudiantesSheet =
          sheetLower === "estudiantes" ||
          sheetLower === "alumnos" ||
          (!isDocentePrimariaSheet &&
            !isDocenteSecundariaSheet &&
            /estudiante|alumno/i.test(sheetName));

        const isEstudiantes =
          isEstudiantesSheet ||
          (sheets.length === 1 && !isDocentePrimariaSheet && !isDocenteSecundariaSheet);
        const isDocentePrimaria = !isEstudiantes && isDocentePrimariaSheet;
        const isDocenteSecundaria = !isEstudiantes && !isDocentePrimaria && isDocenteSecundariaSheet;

        for (const row of rows) {
          const normalize = (s: string) =>
            s
              .trim()
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "");
          const findVal = (keys: string[]): string => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
              const normKey = normalize(key);
              const matchedKey = rowKeys.find((k) => normalize(k) === normKey);
              if (matchedKey !== undefined) return String(row[matchedKey] ?? "").trim();
            }
            return "";
          };
          const findRawValue = (keys: string[]): unknown => {
            const rowKeys = Object.keys(row);
            for (const key of keys) {
              const normKey = normalize(key);
              const matchedKey = rowKeys.find((k) => normalize(k) === normKey);
              if (matchedKey !== undefined) return row[matchedKey];
            }
            return undefined;
          };

          let dni = findVal([
            "dni",
            "d.n.i",
            "documento",
            "documento identidad",
            "numero documento",
            "numero de documento",
            "nro documento",
            "nro.dni",
          ]);
          const nombreCompleto = toUpperName(findVal([
            "alumno",
            "nombre completo",
            "nombre_completo",
            "nombres y apellidos",
            "apellidos y nombres",
            "apellido y nombre",
            "apellido completo",
            "nombres",
            "nombre",
          ]));

          if (!dni && nombreCompleto && isEstudiantes) {
            // Buscar si ya existe un estudiante con ese nombre
            const existenteByName = usuariosAcademicos.find(
              (u) =>
                u.rol === "ALUMNO" &&
                u.nombre.trim().toLowerCase() === nombreCompleto.trim().toLowerCase()
            );
            if (existenteByName) {
              dni = existenteByName.dni;
            } else {
              // Generar un DNI único
              while (
                usuariosAcademicos.some((u) => u.dni === String(nextGeneratedDni)) ||
                Array.from(alumnosPorDni.keys()).includes(String(nextGeneratedDni))
              ) {
                nextGeneratedDni++;
              }
              dni = String(nextGeneratedDni);
              nextGeneratedDni++;
            }
          }

          if (!dni || !nombreCompleto) {
            alumnosOmitidos += isEstudiantes ? 1 : 0;
            docentesPrimariaOmitidos += isDocentePrimaria ? 1 : 0;
            docentesSecundariaOmitidos += isDocenteSecundaria ? 1 : 0;
            processedRows += 1;
            setImportProgress(Math.round((processedRows / totalRows) * 100));
            continue;
          }

          const nombres_col = findVal(["nombres"]);
          const apellidos_col = findVal(["apellidos", "apellido", "apellido paterno", "apellido materno"]);
          let nombres = toUpperName(nombres_col);
          let apellidos = toUpperName(apellidos_col);
          if (!nombres || !apellidos) {
            const parts = nombreCompleto.split(/\s+/);
            if (parts.length >= 3) {
              apellidos = `${parts[0]} ${parts[1]}`;
              nombres = parts.slice(2).join(" ");
            } else if (parts.length === 2) {
              apellidos = parts[0];
              nombres = parts[1];
            } else {
              nombres = nombreCompleto;
              apellidos = "-";
            }
          }

          const rawCorreo = findVal([
            "correo",
            "correo electronico",
            "email",
            "e-mail",
            "mail",
          ]);
          const correo = rawCorreo && rawCorreo.includes("@") ? rawCorreo : undefined;
          const telefono = findVal([
            "telefono",
            "teléfono",
            "celular",
            "movil",
            "whatsapp",
          ]);
          const codigo = findVal([
            "codigo",
            "codigo_estudiante",
            "cod",
            "code",
            "codigo docente",
            "codigodocente",
          ]);
          const inicioPeriodo = findRawValue([
            "inicio periodo",
            "inicio_periodo",
            "inicio-periodo",
            "inicio",
            "fecha inicio",
            "fecha_inicio",
            "fecha-ingreso",
            "fecha de ingreso",
            "periodo inicio",
            "inicio del periodo",
            "fecha de inicio del periodo",
          ]);
          const inicioPeriodoIso = parseInicioPeriodo(inicioPeriodo);

          if (isEstudiantes) {
            const rawNivel = findVal([
              "nivel",
              "nivel educativo",
              "nivel_educativo",
              "nivel (primaria o secundaria)",
              "nivel(primaria o secundaria)",
              "nivel de estudio",
            ]);
            const rawNivelAcademico = findVal([
              "nivel academico",
              "nivel_academico",
              "nivel-academico",
              "ciclo",
            ]);
            const rawGrado = findVal([
              "grado",
              "grado_academico",
              "grado academico",
              "nivel grado",
              "grado escolar",
            ]);

            let nivelEducativo = normalizeNivel(rawNivel);
            if (!nivelEducativo && rawNivelAcademico) {
              const na = rawNivelAcademico.toLowerCase();
              if (na.includes("inicial")) {
                nivelEducativo = "INICIAL";
              } else if (na.includes("prim") || na.includes("preformativo")) {
                nivelEducativo = "PRIMARIA";
              } else if (na.includes("sec") || na.includes("anual") || na.includes("letras") || na.includes("ciencias")) {
                nivelEducativo = "SECUNDARIA";
              }
            }
            if (!nivelEducativo) nivelEducativo = normalizeNivel(rawGrado);
            if (normalizeNivel(rawGrado) === "INICIAL") nivelEducativo = "INICIAL";
            if (!nivelEducativo) nivelEducativo = "PRIMARIA";

            let grado = normalizeGrado(rawGrado, nivelEducativo);

            if (!grado && rawNivelAcademico) {
              const gradosPorNivelAc = getGradosPorNivelAcademico(rawNivelAcademico);
              if (gradosPorNivelAc.length > 0) {
                // Tomar el grado que coincida con el nivel educativo
                const matchingGrado = gradosPorNivelAc.find((g) => g.endsWith(nivelEducativo));
                grado = matchingGrado || gradosPorNivelAc[0];
              }
            }

            const gruposDelGrado = getGruposPorGrado(grado);
            let seccion = "";
            if (gruposDelGrado.length > 0) {
              const rawGrupo = findVal(["grupo", "pista", "ciclado", "grupo academico", "grupo académico", "seccion especial"]);
              seccion = normalizeGrupo(rawGrupo || rawNivelAcademico);
            }
            if (!seccion) {
              seccion = findVal(["seccion", "seccion ", "aula", "sección", "seccion/aula"]).toUpperCase().trim() || "A";
            }

            if (!nivelEducativo || !grado || !seccion) {
              alumnosOmitidos += 1;
              processedRows += 1;
              setImportProgress(Math.round((processedRows / totalRows) * 100));
              continue;
            }

            const payload = {
              ...emptyUsuarioAcademico,
              codigo: codigo || undefined,
              dni,
              nombre: nombreCompleto,
              nombres,
              apellidos,
              correo,
              telefono,
              rol: "ALUMNO",
              nivelEducativo,
              grado,
              seccion,
              estadoMatricula:
                findVal(["estado matricula", "estado_matricula", "matricula", "estado"]) ||
                "MATRICULADO",
              pensionPagada: parseBooleanCell(
                findVal(["pension", "pension pagada", "pension_pagada", "pagado"])
              ),
              pensionObservacion: findVal([
                "observacion",
                "observaciones",
                "pension observacion",
                "pension_observacion",
              ]),
              inicioPeriodo: inicioPeriodoIso,
            };

            const existenteByDni = alumnosPorDni.get(dni);
            const existenteByCodigo = codigo ? alumnosPorCodigo.get(codigo.trim().toLowerCase()) : undefined;
            const existenteByCorreo = rawCorreo ? alumnosPorCorreo.get(rawCorreo.trim().toLowerCase()) : undefined;
            const existente = existenteByDni || existenteByCodigo || existenteByCorreo;

            const codigoParaActualizar = (() => {
              if (!codigo) return existente?.codigo || dni;
              const candidato = codigo.trim();
              if (existenteByCodigo && existenteByCodigo.id !== existente?.id) {
                return existente?.codigo || dni;
              }
              return candidato;
            })();

            const correoParaActualizar = (() => {
              if (!rawCorreo || !rawCorreo.includes("@")) return existente?.correo;
              const candidato = rawCorreo.trim();
              if (existenteByCorreo && existenteByCorreo.id !== existente?.id) {
                return existente?.correo;
              }
              return candidato;
            })();

            if (mode === "update-only") {
              if (existente) {
                await monserratApi.updateUsuarioAcademico(existente.id, {
                  ...payload,
                  codigo: codigoParaActualizar,
                  correo: correoParaActualizar,
                  dni: existente.dni,
                }, token);
                alumnosActualizados += 1;
              } else {
                alumnosIgnorados += 1;
              }
            } else if (mode === "create-only") {
              if (existente) {
                alumnosIgnorados += 1;
              } else {
                await monserratApi.createUsuarioAcademico(payload, token);
                alumnosCreados += 1;
              }
            } else {
              if (existente) {
                await monserratApi.updateUsuarioAcademico(existente.id, {
                  ...payload,
                  codigo: codigoParaActualizar,
                  correo: correoParaActualizar,
                  dni: existente.dni,
                }, token);
                alumnosActualizados += 1;
              } else {
                await monserratApi.createUsuarioAcademico(payload, token);
                alumnosCreados += 1;
              }
            }
          } else if (isDocentePrimaria) {
  const rawCurso = findVal(["curso", "materia", "asignatura", "competencia"]);
  const normalizeCurso = (val: string): string => {
    const raw = val
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (raw.includes("MATEMATICA")) return "MATEMATICA";
    if (raw.includes("COMUNICACION")) return "COMUNICACION";
    if (raw.includes("CIENCIA") || raw.includes("TECNOLOGIA")) return "CIENCIA_TECNOLOGIA";
    if (raw.includes("HISTORIA")) return "HISTORIA";
    if (raw.includes("INGLES")) return "INGLES";
    if (raw.includes("ARTE")) return "ARTE_CULTURA";
    if (raw.includes("PERSONAL")) return "PERSONAL_SOCIAL";
    if (raw.includes("RELIGION") || raw.includes("RELIGIOSA")) return "EDUCACION_RELIGIOSA";
    if (raw.includes("FISICA")) return "EDUCACION_FISICA";
    if (raw.includes("CASTELLANO")) return "CASTELLANO_SEGUNDA_LENGUA";
    if (raw.includes("COMPETENCIAS")) return "COMPETENCIAS_TRANSVERSALES";
    return raw;
  };
  const materia = normalizeCurso(rawCurso || "");
  const existente =
    alumnosPorDni.get(dni) ||
    (codigo ? alumnosPorCodigo.get(codigo.trim().toLowerCase()) : undefined) ||
    (rawCorreo ? alumnosPorCorreo.get(rawCorreo.trim().toLowerCase()) : undefined);

  if (mode === "update-only") {
    if (existente) {
      await monserratApi.updateUsuarioAcademico(existente.id, {
        codigo: codigo || existente.codigo || dni,
        dni: existente.dni,
        nombre: nombreCompleto,
        nombres,
        apellidos,
        correo: correo ?? existente.correo,
        telefono,
        rol: "DOCENTE",
        nivelEducativo: "PRIMARIA",
        materia,
        especialidad: "PRIMARIA",
      }, token);
      docentesPrimariaCreados += 1; // reutilizamos el contador como "procesados"
    } else {
      docentesPrimariaOmitidos += 1;
    }
  } else if (mode === "create-only") {
    if (existente) {
      docentesPrimariaOmitidos += 1;
    } else {
      await monserratApi.createUsuarioAcademico(
        {
          ...emptyUsuarioAcademico,
          codigo: codigo || dni,
          dni,
          nombre: nombreCompleto,
          nombres,
          apellidos,
          correo,
          telefono,
          rol: "DOCENTE",
          nivelEducativo: "PRIMARIA",
          materia,
          especialidad: "PRIMARIA",
        },
        token
      );
      docentesPrimariaCreados += 1;
    }
  }
} else if (isDocenteSecundaria) {
  const rawCurso = findVal(["curso", "materia", "asignatura"]);
  const normalizeCurso = (val: string): string => {
    const raw = val
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (raw.includes("MATEMATICA")) return "MATEMATICA";
    if (raw.includes("COMUNICACION")) return "COMUNICACION";
    if (raw.includes("CIENCIA") || raw.includes("TECNOLOGIA")) return "CIENCIA_TECNOLOGIA";
    if (raw.includes("HISTORIA")) return "HISTORIA";
    if (raw.includes("INGLES")) return "INGLES";
    return raw;
  };
  const materia = normalizeCurso(rawCurso || "MATEMATICA");

  const existente =
    alumnosPorDni.get(dni) ||
    (codigo ? alumnosPorCodigo.get(codigo.trim().toLowerCase()) : undefined) ||
    (rawCorreo ? alumnosPorCorreo.get(rawCorreo.trim().toLowerCase()) : undefined);

  if (mode === "update-only") {
    if (existente) {
      await monserratApi.updateUsuarioAcademico(existente.id, {
        codigo: codigo || existente.codigo || dni,
        dni: existente.dni,
        nombre: nombreCompleto,
        nombres,
        apellidos,
        correo: correo ?? existente.correo,
        telefono,
        rol: "DOCENTE",
        nivelEducativo: "SECUNDARIA",
        materia,
        especialidad: "SECUNDARIA",
      }, token);
      docentesSecundariaCreados += 1;
    } else {
      docentesSecundariaOmitidos += 1;
    }
  } else if (mode === "create-only") {
    if (existente) {
      docentesSecundariaOmitidos += 1;
    } else {
      await monserratApi.createUsuarioAcademico(
        {
          ...emptyUsuarioAcademico,
          codigo: codigo || dni,
          dni,
          nombre: nombreCompleto,
          nombres,
          apellidos,
          correo,
          telefono,
          rol: "DOCENTE",
          nivelEducativo: "SECUNDARIA",
          materia,
          especialidad: "SECUNDARIA",
        },
        token
      );
      docentesSecundariaCreados += 1;
    }
  }
}
          processedRows += 1;
          setImportProgress(Math.round((processedRows / totalRows) * 100));
        }
      }

      setUsuariosAcademicos(await monserratApi.usuariosAcademicos(token));

      const parts = [];
      if (mode === "create-only") {
        parts.push(
          `${alumnosCreados} alumnos creados, ${alumnosIgnorados} omitidos por registro existente, ${alumnosOmitidos} omitidos por datos incompletos`
        );
      } else if (mode === "update-only") {
        parts.push(
          `${alumnosActualizados} alumnos actualizados, ${alumnosIgnorados} ignorados por no existir, ${alumnosOmitidos} omitidos por datos incompletos`
        );
      } else {
        parts.push(
          `${alumnosCreados} alumnos creados, ${alumnosActualizados} actualizados, ${alumnosOmitidos} omitidos`
        );
      }
      if (docentesPrimariaCreados > 0 || docentesPrimariaOmitidos > 0) {
        parts.push(
          `${docentesPrimariaCreados} docentes de primaria creados (${docentesPrimariaOmitidos} omitidos)`
        );
      }
      if (docentesSecundariaCreados > 0 || docentesSecundariaOmitidos > 0) {
        parts.push(
          `${docentesSecundariaCreados} docentes de secundaria creados (${docentesSecundariaOmitidos} omitidos)`
        );
      }
      setImportSummary(
        `Importación completada: ${parts.join(", ") || "ningún registro importado"}.`
      );
    }, "Importación completada con éxito");

    setIsImporting(false);
    setImportProgress(100);
  };

  const handleEditClick = (u: UsuarioAcademico) => {
    setEditingUsuarioAcademico(u);
    setUsuarioAcademicoForm({ ...u });
    setUsuarioAcademicoPhotoFile(null);
  };

  const usuarioAcademicoPhotoPreview = usuarioAcademicoPhotoFile
    ? URL.createObjectURL(usuarioAcademicoPhotoFile)
    : usuarioAcademicoForm.fotoUrl;

  return (
    <div className="flex flex-col">
      <ConfirmForceDeleteModal
        isOpen={Boolean(forceDeleteTarget)}
        title={forceDeleteTarget?.name ?? "Usuario academico"}
        message={forceDeleteTarget?.message ?? ""}
        onClose={() => setForceDeleteTarget(null)}
        onForceDelete={() => {
          if (!forceDeleteTarget) return;
          void eliminarUsuarioAcademico(
            { id: forceDeleteTarget.id, nombre: forceDeleteTarget.name },
            true
          );
        }}
      />

      <div className="grid gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">

        {/* IZQUIERDA: formulario */}
        <form
          onSubmit={submitUsuarioAcademico}
          className="grid content-start gap-4 pro-card pro-rise p-3 shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:admin-table-scroll"
        >
          <div className="flex items-start justify-between gap-3">
            <div>

              <h4 className="mt-1 font-serif text-[20px] font-black text-monserrat-ink">
                {editingUsuarioAcademico ? "Editar usuario" : "Agregar alumno o docente"}
              </h4>
            </div>
            {editingUsuarioAcademico && (
              <button
                type="button"
                onClick={() => prepararFormularioAcademico("ALUMNO", "PRIMARIA")}
                className="flex h-9 w-9 items-center justify-center rounded-[9px] border border-[#d8a842]/35 text-monserrat-ink/55 hover:border-monserrat-ink/30"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              {(["ALUMNO", "DOCENTE"] as const).map((rol) => (
                <button
                  key={rol}
                  type="button"
                  onClick={() => {
                    if (editingUsuarioAcademico) {
                      setUsuarioAcademicoForm({
                        ...usuarioAcademicoForm,
                        rol,
                        nivelEducativo: rol === "ALUMNO" && !usuarioAcademicoForm.nivelEducativo ? "PRIMARIA" : usuarioAcademicoForm.nivelEducativo
                      });
                    } else {
                      prepararFormularioAcademico(rol, (rol === "ALUMNO" && !usuarioAcademicoForm.nivelEducativo) ? "PRIMARIA" : (usuarioAcademicoForm.nivelEducativo ?? "PRIMARIA"));
                    }
                  }}
                  className={`flex items-center justify-center gap-2 rounded-[10px] border px-3 py-2.5 text-[12px] font-black transition ${usuarioAcademicoForm.rol === rol
                    ? "border-monserrat-red bg-monserrat-red text-white"
                    : "border-[#d8a842]/30 bg-monserrat-cream/45 text-monserrat-ink/65 hover:border-monserrat-ink/25"
                    }`}
                >
                  {rol === "ALUMNO" ? <Users size={14} /> : <GraduationCap size={14} />}
                  {rol === "ALUMNO" ? "Alumno" : "Docente"}
                </button>
              ))}
            </div>
            {usuarioAcademicoForm.rol === "ALUMNO" && (
              <div className="grid grid-cols-3 gap-2">
                {NIVELES.map((nivel) => (
                  <button
                    key={nivel}
                    type="button"
                    onClick={() => {
                      if (editingUsuarioAcademico) {
                        setUsuarioAcademicoForm({
                          ...usuarioAcademicoForm,
                          nivelEducativo: nivel,
                          grado: defaultGrado(nivel),
                          seccion: getGruposPorGrado(defaultGrado(nivel))[0],
                        });
                      } else {
                        prepararFormularioAcademico("ALUMNO", nivel);
                      }
                    }}
                    className={`rounded-[10px] border px-3 py-2 text-[12px] font-black transition ${usuarioAcademicoForm.nivelEducativo === nivel
                      ? "border-monserrat-red bg-monserrat-red text-white"
                      : "border-[#d8a842]/30 bg-white text-monserrat-ink/60 hover:border-monserrat-ink/25"
                      }`}
                  >
                    {labelFromEnum(nivel)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-1 sm:grid-cols-2">
            <AdminField label="DNI">
              <input
                value={usuarioAcademicoForm.dni}
                onChange={(e) =>
                  setUsuarioAcademicoForm({ ...usuarioAcademicoForm, dni: e.target.value })
                }
                className="admin-input"
                required
                disabled={Boolean(editingUsuarioAcademico)}
              />
            </AdminField>
            <AdminField label="Codigo">
              <input
                value={usuarioAcademicoForm.codigo ?? ""}
                className="admin-input"
                disabled
                title="El código se genera automáticamente"
                placeholder="Se generará automáticamente"
              />
            </AdminField>
            <AdminField label="Nombre completo" className="sm:col-span-2">
              <input
                value={usuarioAcademicoForm.nombre}
                onChange={(e) =>
                  setUsuarioAcademicoForm({
                    ...usuarioAcademicoForm,
                    nombre: e.target.value.toLocaleUpperCase("es-PE"),
                  })
                }
                className="admin-input uppercase"
                placeholder="RUIZ ROJAS JHON ALBERTO"
                required
              />
              <span className="text-[10px] font-semibold text-monserrat-ink/45">Apellidos primero, luego nombres.</span>
            </AdminField>
            <AdminField label="Correo">
              <input
                type="email"
                value={usuarioAcademicoForm.correo ?? ""}
                onChange={(e) =>
                  setUsuarioAcademicoForm({ ...usuarioAcademicoForm, correo: e.target.value })
                }
                className="admin-input"
              />
            </AdminField>
            <AdminField label="Telefono">
              <input
                value={usuarioAcademicoForm.telefono ?? ""}
                onChange={(e) =>
                  setUsuarioAcademicoForm({ ...usuarioAcademicoForm, telefono: e.target.value })
                }
                className="admin-input"
              />
            </AdminField>
            <AdminField label="Dirección" className="sm:col-span-2">
              <input
                value={usuarioAcademicoForm.direccion ?? ""}
                onChange={(e) =>
                  setUsuarioAcademicoForm({ ...usuarioAcademicoForm, direccion: e.target.value })
                }
                className="admin-input"
              />
            </AdminField>
          </div>

          <MediaPicker
            label="Foto del usuario"
            accept="image/*"
            previewUrl={usuarioAcademicoPhotoPreview}
            previewType="image"
            onFileChange={setUsuarioAcademicoPhotoFile}
          />

          {usuarioAcademicoForm.rol === "ALUMNO" ? (
            <div className="grid gap-3 rounded-[12px] border border-[#d8a842]/25 bg-monserrat-cream/35 p-3 sm:grid-cols-2">
              <AdminField label="Grado">
                <select
                  value={
                    usuarioAcademicoForm.grado ??
                    defaultGrado(usuarioAcademicoForm.nivelEducativo ?? "PRIMARIA")
                  }
                  onChange={(e) => {
                    const nuevoGrado = e.target.value;
                    const grupos = getGruposPorGrado(nuevoGrado);
                    setUsuarioAcademicoForm({
                      ...usuarioAcademicoForm,
                      grado: nuevoGrado,
                      seccion: grupos.length > 0 ? grupos[0] : undefined,
                    });
                  }}
                  className="admin-input"
                >
                  {gradosActivosPorNivel(usuarioAcademicoForm.nivelEducativo).map((grado) => (
                    <option key={grado} value={grado}>
                      {formatGrado(grado)}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Salón">
                {getGruposPorGrado(usuarioAcademicoForm.grado).length > 0 ? (
                  <select
                    value={usuarioAcademicoForm.seccion ?? getGruposPorGrado(usuarioAcademicoForm.grado)[0]}
                    onChange={(e) =>
                      setUsuarioAcademicoForm({ ...usuarioAcademicoForm, seccion: e.target.value })
                    }
                    className="admin-input"
                  >
                    {getGruposPorGrado(usuarioAcademicoForm.grado).map((grupo) => (
                      <option key={grupo} value={grupo}>
                        {formatSalon(usuarioAcademicoForm.grado, grupo)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={formatSalon(usuarioAcademicoForm.grado, null)}
                    className="admin-input"
                    disabled
                    readOnly
                  />
                )}
              </AdminField>
            </div>
          ) : null}

          <button
            disabled={isBusy}
            className="flex items-center justify-center gap-1.5 rounded-[10px] bg-monserrat-red py-2.5 text-[12px] font-black text-white transition hover:bg-monserrat-red/85 disabled:opacity-60"
          >
            {editingUsuarioAcademico ? (
              <>
                <Save size={13} /> Guardar cambios
              </>
            ) : (
              <>
                <UserPlus size={13} /> Crear registro
              </>
            )}
          </button>
          <p className="text-[11px] font-semibold leading-5 text-monserrat-ink/45">
            La contrasena inicial sera el mismo DNI y se pedira cambiarla en el primer ingreso.
          </p>
        </form>

        {/* DERECHA: métricas + panel tabla */}
        <div className="flex min-w-0 flex-col gap-5">

          {/* Métricas */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <AdminMetric icon={<Users size={18} />} label="Alumnos" value={String(alumnos.length)} />
            <AdminMetric
              icon={<GraduationCap size={18} />}
              label="Docentes"
              value={String(docentes.length)}
            />
            <AdminMetric
              icon={<School size={18} />}
              label="Inicial"
              value={String(alumnos.filter((u) => u.nivelEducativo === "INICIAL").length)}
            />
            <AdminMetric
              icon={<School size={18} />}
              label="Primaria"
              value={String(alumnos.filter((u) => u.nivelEducativo === "PRIMARIA").length)}
            />
            <AdminMetric
              icon={<BookOpen size={18} />}
              label="Secundaria"
              value={String(alumnos.filter((u) => u.nivelEducativo === "SECUNDARIA").length)}
            />
          </div>

          {/* Panel búsqueda + tabla */}
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid gap-3 pro-card pro-rise p-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-monserrat-ink/40">
                    Padron academico
                  </p>
                  <p className="mt-1 text-sm font-black text-monserrat-ink">
                    Alumnos y docentes registrados
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
  type="button"
  onClick={() => void descargarPlantillaAlumnos()}
  className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#d8a842]/35 px-2.5 py-1.5 text-[11px] font-black text-monserrat-ink/65 hover:border-monserrat-ink/30"
>
  <FileSpreadsheet size={14} /> Plantilla
</button>
<button
  type="button"
  onClick={() => void exportarAlumnosExcel()}
  className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#d8a842]/35 px-2.5 py-1.5 text-[11px] font-black text-monserrat-ink/65 hover:border-monserrat-ink/30"
>
  <Download size={14} /> Exportar alumnos
</button>
<label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[9px] bg-monserrat-red px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-monserrat-redDark">
  <Upload size={14} /> Importar
  <input
    type="file"
    accept=".csv,.xls,.xlsx"
    className="hidden"
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (file) void importarAlumnosExcel(file, "upsert");
      e.currentTarget.value = "";
    }}
  />
</label>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-[1fr_170px]">
                <AdminField label="Buscar usuario">
                  <input
                    value={academicoSearch}
                    onChange={(e) => setAcademicoSearch(e.target.value)}
                    className="admin-input"
                    placeholder="Nombre, DNI, aula o curso"
                  />
                </AdminField>
                <AdminField label="Nivel">
                  <select
                    value={academicoNivelFiltro}
                    onChange={(e) => setAcademicoNivelFiltro(e.target.value)}
                    className="admin-input"
                  >
                    <option value="TODOS">Todos</option>
                    {NIVELES.map((nivel) => (
                      <option key={nivel} value={nivel}>
                        {labelFromEnum(nivel)}
                      </option>
                    ))}
                  </select>
                </AdminField>
              </div>
              {importSummary && (
                <p className="rounded-[10px] bg-emerald-50 px-3 py-2 text-[12px] font-bold text-emerald-700">
                  {importSummary}
                </p>
              )}
              <Modal title="Importación de alumnos" isOpen={isImporting} onClose={() => setIsImporting(false)}>
                <div className="p-6">
                  <p className="text-sm font-bold text-monserrat-ink mb-4">{importMessage}</p>
                  <div className="h-4 overflow-hidden rounded-full bg-monserrat-ink/10">
                    <div
                      className="h-full rounded-full bg-monserrat-red transition-all"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs font-black text-monserrat-ink/60">
                    {importProgress}% completado
                  </p>
                </div>
              </Modal>
            </div>

            <AdminTable
              headers={["Codigo", "Nombre", "Rol", "Nivel", "GRADO", "SALÓN"]}
              columnWidths={["w-[11%]", "w-[27%]", "w-[9%]", "w-[19%]", "w-[14%]", "w-[20%]"]}
              sortableColumns={[0, 1, 2]}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              rows={usuariosFiltrados.map((u) => {
                const niveles = nivelesDeUsuario(u);
                const esDocente = u.rol === "DOCENTE";
                return {
                  id: u.id,
                  values: [
                    u.codigo || u.dni,
                    u.nombre,
                    labelFromEnum(u.rol),
                    niveles.length > 0 ? niveles.map((n) => labelFromEnum(n)).join(", ") : "-",
                    esDocente ? "-" : formatGrado(u.grado) || "-",
                    esDocente ? "-" : formatSalon(u.grado, u.seccion) || "-",
                  ],
                  onEdit: () => handleEditClick(u),
                  onDelete: () => void eliminarUsuarioAcademico(u),
                };
              })}
              className="bg-white shadow-sm"
              bodyClassName="max-h-[70vh]"
            />
          </div>

        </div>
      </div>
    </div>
  );
}
