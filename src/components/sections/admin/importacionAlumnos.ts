import {
  GRADOS_POR_NIVEL,
  esSalonGrupo,
  getGradoLabel,
  getGradosActivos,
  getGruposDeGrado,
  getSalonIdDeGrado,
  getSalonLabel,
  getSalones,
} from "./academicoRegistry";
import { normalizeGrupo } from "./adminShared";

/**
 * FORMATO ESTÁNDAR DE IMPORTACIÓN DE ALUMNOS (una sola hoja, "Alumnos"):
 *
 *   DNI | APELLIDOS Y NOMBRES | GRADO | SALÓN
 *
 *  - DNI y APELLIDOS Y NOMBRES y GRADO son obligatorios.
 *  - SALÓN solo se llena en los grados que se dividen en salones (6to Prim, 1ro a 5to Sec): Ciclado I, Ciclado II,
 *    Anual, Letras o Ciencias. En los demás grados se deja vacío (el salón es el propio grado).
 *    Si queda vacío en un grado con salones, el alumno se importa SIN salón y el admin se lo asigna después.
 *  - Opcionales: CORREO, TELÉFONO, INICIO PERIODO (DD/MM/AAAA), CÓDIGO.
 */

export const COLUMNAS_ESTANDAR = ["DNI", "APELLIDOS Y NOMBRES", "GRADO", "SALÓN"] as const;

export const norm = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

const ORDINAL_PALABRAS: Record<string, number> = {
  PRIMERO: 1, PRIMER: 1, SEGUNDO: 2, TERCERO: 3, TERCER: 3, CUARTO: 4, QUINTO: 5, SEXTO: 6,
};

export type GradoDetectado = { grado: string; nivel: "INICIAL" | "PRIMARIA" | "SECUNDARIA" };

const todosLosGrados = (): string[] => [
  ...GRADOS_POR_NIVEL.INICIAL, ...GRADOS_POR_NIVEL.PRIMARIA, ...GRADOS_POR_NIVEL.SECUNDARIA,
];

const nivelDeGrado = (grado: string): GradoDetectado["nivel"] =>
  grado === "INICIAL" ? "INICIAL" : grado.endsWith("_PRIMARIA") ? "PRIMARIA" : "SECUNDARIA";

/**
 * Reconoce el grado escrito de muchas formas: "1° PRIMARIA", "1ro Prim", "Primero Primaria", "3 Secundaria",
 * "5to Sec", "Inicial", o el nombre que tenga configurado en Configuración → Grados.
 * `nivelExtra` permite formatos antiguos con una columna NIVEL aparte (ej. NIVEL=Primaria, GRADO=1ro).
 */
export function parseGradoTexto(raw: unknown, nivelExtra?: unknown): GradoDetectado | null {
  const n = norm(raw);
  if (!n) return null;

  // 1) Coincidencia exacta con el nombre configurado o con el id del grado.
  for (const grado of todosLosGrados()) {
    if (n === norm(getGradoLabel(grado)) || n === norm(grado.replace(/_/g, " "))) {
      return { grado, nivel: nivelDeGrado(grado) };
    }
  }

  // 2) Interpretación del texto: nivel + número ordinal.
  const fichas = n.split(" ");
  const nivelTexto = norm(nivelExtra);
  if (n.includes("INICIAL") || nivelTexto.includes("INICIAL")) {
    return { grado: "INICIAL", nivel: "INICIAL" };
  }
  const esSecundaria = fichas.some((f) => f.startsWith("SEC")) || nivelTexto.includes("SEC");
  const esPrimaria =
    fichas.some((f) => f.startsWith("PRIM") && !(f in ORDINAL_PALABRAS)) || nivelTexto.includes("PRIM");
  const nivel = esSecundaria ? "SECUNDARIA" : esPrimaria ? "PRIMARIA" : null;
  if (!nivel) return null;

  let ordinal = 0;
  for (const ficha of fichas) {
    const digito = ficha.match(/^0*(\d)/);
    if (digito) { ordinal = Number(digito[1]); break; }
    if (ORDINAL_PALABRAS[ficha]) { ordinal = ORDINAL_PALABRAS[ficha]; break; }
  }
  const lista = GRADOS_POR_NIVEL[nivel] as readonly string[];
  if (ordinal < 1 || ordinal > lista.length) return null;
  return { grado: lista[ordinal - 1], nivel };
}

export type SalonDetectado = { seccion?: string; aviso?: string };

/** Salones activos que admiten un grado, según Configuración → Salones (el propio del grado y/o grupos). */
export function salonesDeGrado(grado: string) {
  return getSalones().filter((s) => s.active && s.grados.includes(grado));
}

/**
 * Interpreta la columna SALÓN. Acepta cualquier salón que la configuración relacione con el grado:
 *  - un salón tipo grupo (Ciclado I/II, Anual, Letras, Ciencias) → se guarda como sección del alumno;
 *  - el salón propio del grado (PRIMERO PRIMARIA, PRE FORMATIVO, INICIAL…) → no hay nada que guardar (se deduce del grado).
 * Vacío (o "VACÍO") = el alumno aún no tiene salón.
 */
export function parseSalonTexto(raw: unknown, grado: string): SalonDetectado {
  const texto = String(raw ?? "").trim();
  if (!texto) return {};
  const n = norm(texto);
  // El colegio escribe "VACÍO" cuando el alumno aún no tiene salón: es lo mismo que dejarlo en blanco.
  if (["VACIO", "SIN SALON", "NINGUNO", "NO TIENE", "NA", "N A"].includes(n)) return {};

  const admitidos = salonesDeGrado(grado);
  const grupo = normalizeGrupo(texto);
  const elegido = admitidos.find((s) => n === norm(s.label) || n === norm(s.id)) ?? (grupo ? admitidos.find((s) => s.id === grupo) : undefined);
  if (elegido) {
    return esSalonGrupo(elegido.id) ? { seccion: elegido.id } : {};
  }
  const existe = Boolean(grupo) || getSalones().some((s) => n === norm(s.label) || n === norm(s.id));
  const nombreGrado = getGradoLabel(grado) || grado;
  return { aviso: existe ? `el salón "${texto}" no corresponde a ${nombreGrado}` : `salón "${texto}" no reconocido` };
}

// ───────────────────────── Consolidación de hojas ─────────────────────────

/**
 * Si el archivo trae varias hojas de alumnos (como "Alumnos-por grado" y "Alumnos-por nivel"), se juntan en una
 * sola lista por DNI: cada alumno se importa una vez y los datos que falten en una hoja se completan con la otra.
 */
export function consolidarFilasAlumnos(hojas: Record<string, unknown>[][]): Record<string, unknown>[] {
  const NOMBRES_DNI = ["DNI", "D N I", "DOCUMENTO", "DOCUMENTO IDENTIDAD", "NRO DNI", "NUMERO DE DOCUMENTO", "NUMERO DOCUMENTO"];
  const claveDni = (fila: Record<string, unknown>): string => {
    for (const [k, v] of Object.entries(fila)) {
      if (NOMBRES_DNI.includes(norm(k))) return String(v ?? "").trim();
    }
    return "";
  };
  const NOMBRES_COL = ["APELLIDOS Y NOMBRES", "NOMBRES Y APELLIDOS", "NOMBRE COMPLETO", "NOMBRE", "NOMBRES", "ALUMNO", "APELLIDO Y NOMBRE"];
  const tieneNombre = (fila: Record<string, unknown>): boolean =>
    Object.entries(fila).some(([k, v]) => NOMBRES_COL.includes(norm(k)) && String(v ?? "").trim() !== "");
  const porClave = new Map<string, Record<string, unknown>>();
  const sinDni: Record<string, unknown>[] = [];
  for (const hoja of hojas) {
    for (const fila of hoja) {
      const dni = claveDni(fila);
      // Filas sin DNI ni nombre (p. ej. las instrucciones de la derecha de la plantilla) no son alumnos.
      if (!dni && !tieneNombre(fila)) continue;
      if (!dni) { sinDni.push(fila); continue; }
      const existente = porClave.get(dni);
      if (!existente) { porClave.set(dni, { ...fila }); continue; }
      for (const [k, v] of Object.entries(fila)) {
        const vacio = (x: unknown) => x === undefined || x === null || String(x).trim() === "";
        if (vacio(existente[k]) && !vacio(v)) existente[k] = v;
      }
    }
  }
  return [...porClave.values(), ...sinDni];
}

// ───────────────────────── Plantilla ─────────────────────────

/**
 * Plantilla de UNA sola hoja ("Alumnos"): a la izquierda las 4 columnas que se importan; a la derecha
 * (separadas por una columna en blanco) las instrucciones y los valores válidos. El importador solo lee las
 * columnas estándar, así que lo de la derecha puede quedarse o borrarse.
 */
export function filasPlantillaAlumnos(): (string | number)[][] {
  const g = (id: string) => getGradoLabel(id);
  // Salón de un alumno de ejemplo: el grupo que se le indique o, si no, el propio del grado.
  const s = (grado: string, grupo?: string) => getSalonLabel(grupo ?? getSalonIdDeGrado(grado));

  const datos: string[][] = [
    [...COLUMNAS_ESTANDAR],
    ["71234567", "PEREZ GOMEZ JUAN CARLOS", g("TERCERO_PRIMARIA"), s("TERCERO_PRIMARIA")],
    ["71234568", "LOPEZ DIAZ MARIA FERNANDA", g("SEXTO_PRIMARIA"), s("SEXTO_PRIMARIA", "CICLADO_I")],
    ["71234569", "RAMOS TORRES LUIS ANGEL", g("SEGUNDO_SECUNDARIA"), s("SEGUNDO_SECUNDARIA", "ANUAL")],
    ["71234570", "QUISPE MAMANI ANA SOFIA", g("QUINTO_SECUNDARIA"), s("QUINTO_SECUNDARIA", "CIENCIAS")],
  ];

  const ayuda: string[] = [
    "CÓMO LLENAR",
    "1. Una fila por alumno, debajo de los títulos.",
    "2. DNI, APELLIDOS Y NOMBRES y GRADO son obligatorios.",
    "3. SALÓN: escribe el salón que aparece en la tabla para el grado del alumno.",
    "    Si el grado tiene varias opciones, elige una de ellas.",
    "4. Si el alumno aún no tiene salón, deja SALÓN vacío: se importa igual.",
    "5. Sube este archivo con «Importar». Los alumnos nuevos se crean y los que ya existen (mismo DNI) se actualizan.",
    "Opcional: columnas CORREO, TELÉFONO e INICIO PERIODO (DD/MM/AAAA).",
  ];

  // La tabla sale de Configuración (grados activos y salones que admite cada uno).
  const valores: string[][] = [["GRADO", "SALÓN(ES) POSIBLES"]];
  getGradosActivos().forEach((id) => {
    const opciones = salonesDeGrado(id).map((x) => x.label);
    valores.push([getGradoLabel(id), opciones.length > 0 ? opciones.join(" / ") : "(sin salón configurado)"]);
  });

  const alto = Math.max(datos.length, ayuda.length, valores.length);
  const filas: (string | number)[][] = [];
  for (let i = 0; i < alto; i++) {
    filas.push([...(datos[i] ?? ["", "", "", ""]), "", ayuda[i] ?? "", "", ...(valores[i] ?? ["", ""])]);
  }
  return filas;
}

export const ANCHOS_PLANTILLA = [14, 34, 22, 20, 3, 70, 3, 22, 38];
