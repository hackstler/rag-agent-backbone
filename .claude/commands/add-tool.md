# /add-tool

Añade una nueva tool al agente siguiendo el patrón ToolEntry.

## Uso

```
/add-tool                              # modo interactivo — wizard por tipos
/add-tool <tool-name> "<description>"  # modo directo — genera con lo que ya sabes
```

Ejemplos:
```
/add-tool
/add-tool book-appointment "Creates and queries appointments via REST API"
/add-tool get-client-data "Queries client profile from PostgreSQL"
```

---

## Instrucciones para Claude

### Paso 1 — Determinar modo

**Si se invocó sin argumentos (`/add-tool` solo):**

Pregunta el tipo de tool:

> "¿Qué tipo de integración necesitas?
>
> **A) REST API externa** — llama a un endpoint HTTP de un servicio externo
> **B) Base de datos** — consulta o escribe en la PostgreSQL del proyecto
> **C) Script externo** — ejecuta un script Python, Node o bash y usa su output
> **D) Lógica interna** — computación TypeScript pura, sin dependencias externas"

Según la respuesta, haz las preguntas específicas del tipo (ver sección siguiente).
Al terminar el árbol de preguntas tienes todo lo necesario — salta al Paso 2.

**Si se invocó con argumentos:**
Infiere el tipo de la descripción y pasa directamente al Paso 2.
Si el tipo no queda claro de la descripción, pregunta antes de generar.

---

### Árboles de preguntas por tipo

#### Tipo A — REST API externa

1. ¿Nombre de la tool? (kebab-case, ej: `book-appointment`)
2. ¿Qué hace? ¿Cuándo debe llamarla el agente? (1-2 frases — esto es la `description` de la tool)
3. ¿URL base del API? (ej: `https://api.booking.io/v2`)
4. ¿Autenticación?
   - Ninguna
   - API key en header → ¿nombre del header? + ¿nombre de la env var? (ej: `X-Api-Key`, `BOOKING_API_KEY`)
   - Bearer token → ¿nombre de la env var? (ej: `BOOKING_TOKEN`)
   - Basic auth → ¿nombres de las env vars para user y password?
5. ¿Qué operaciones necesita el agente? (lista: método + path + para qué)
   Ej: `GET /slots → consultar disponibilidad`, `POST /appointments → crear cita`
6. ¿Ejemplo de response JSON de la operación principal? (pega uno o describe los campos que devuelve)

---

#### Tipo B — Base de datos (PostgreSQL del proyecto)

1. ¿Nombre de la tool? (kebab-case)
2. ¿Qué hace? ¿Cuándo debe llamarla el agente?
3. ¿Qué tabla(s) involucra?
4. ¿Qué consulta ejecuta? (describe con palabras o escribe el SQL directamente)
5. ¿Solo lectura o también escribe? (si escribe: ¿qué campos muta?)
6. ¿Qué campos devuelve al agente? (solo los relevantes, nunca `SELECT *`)

---

#### Tipo C — Script externo

1. ¿Nombre de la tool? (kebab-case)
2. ¿Qué hace? ¿Cuándo debe llamarla el agente?
3. Ruta del script relativa al proyecto (ej: `scripts/analyze.py`)
4. Runtime: `python3` / `node` / `bash`
5. ¿Qué input recibe? (lista: nombre + tipo, ej: `imageUrl: string`, `threshold: number`)
6. ¿Formato del output? `JSON en stdout` / `CSV` / `texto plano`

---

#### Tipo D — Lógica interna

1. ¿Nombre de la tool? (kebab-case)
2. ¿Qué hace? ¿Cuándo debe llamarla el agente?
3. ¿Qué input recibe? (campos con tipos y descripción breve)
4. ¿Qué devuelve? (campos con tipos)
5. ¿Algún paquete npm necesario? (si sí: nombre + para qué lo usa)

---

### Paso 2 — Leer archivos de referencia (en paralelo)

- `src/agent/tools/search-web.ts` — patrón ToolEntry sin deps (el más común)
- `src/agent/tools/base.ts` — interfaces ToolEntry + ToolRegistryDeps
- `src/agent/tools/index.ts` — ALL_TOOLS array actual
- `src/config/tools.config.ts` — toolsConfig actual

### Paso 3 — Derivar nombres

Del `<tool-name>` en kebab-case:
- Filename: `<tool-name>.ts`
- Factory: `create<PascalCase>Tool`
- Entry export: `<camelCase>Entry`
- Registry key: `<camelCase>`

### Paso 4 — Decidir deps

Los tipos A, B, C, D **no necesitan ToolRegistryDeps** (no hacen búsqueda vectorial).
Usa `(_deps)` en `Entry.create` y no incluyas `deps` en la factory function.

### Paso 5 — Generar `src/agent/tools/<tool-name>.ts`

Estructura base:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { ToolEntry, ToolRegistryDeps } from "./base.js";

/**
 * <descripción: qué hace y cuándo debe llamarla el agente>
 */
export const <camelCase>Entry: ToolEntry = {
  key: "<camelCase>",
  create: (_deps) => create<PascalCase>Tool(),
};

export function create<PascalCase>Tool() {
  return createTool({
    id: "<tool-name>",
    description: `<descripción clara.
CUÁNDO llamarla. QUÉ devuelve.>`,
    inputSchema: z.object({
      // Todos los campos con .describe()
      // campo: z.tipo().describe("descripción del campo"),
    }),
    outputSchema: z.object({
      // Shape tipado del return
    }),
    execute: async (input) => {
      // Implementación según tipo (ver plantillas abajo)
    },
  });
}
```

**Plantilla Tipo A — fetch con auth:**
```typescript
const BASE_URL = "https://api.servicio.com/v1";

execute: async ({ operationInput }) => {
  const apiKey = process.env["SERVICE_API_KEY"];
  const res = await fetch(`${BASE_URL}/endpoint`, {
    method: "GET", // o POST con body: JSON.stringify({...})
    headers: {
      "X-Api-Key": apiKey ?? "",
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const data = await res.json() as { /* shape tipado */ };
  return { /* campos del outputSchema */ };
},
```

**Plantilla Tipo B — Drizzle query:**
```typescript
import { db } from "../../db/client.js";
import { myTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";

execute: async ({ id }) => {
  const rows = await db
    .select({ field1: myTable.field1, field2: myTable.field2 })
    .from(myTable)
    .where(eq(myTable.id, id));
  return { results: rows, count: rows.length };
},
```

**Plantilla Tipo C — script externo:**
```typescript
import { execFileSync } from "child_process";
import path from "path";

execute: async ({ inputParam }) => {
  const scriptPath = path.resolve("scripts/my-script.py");
  const output = execFileSync("python3", [scriptPath, inputParam], {
    encoding: "utf8",
  });
  return JSON.parse(output) as { /* shape tipado */ };
},
```

**Plantilla Tipo D — lógica interna:**
```typescript
execute: async ({ inputFields }) => {
  // Computación TypeScript pura
  const result = /* lógica */;
  return { result };
},
```

### Paso 6 — Actualizar `src/agent/tools/index.ts`

```typescript
import { <camelCase>Entry } from "./<tool-name>.js";  // ← añadir import

const ALL_TOOLS: ToolEntry[] = [
  searchDocumentsEntry,
  searchWebEntry,
  <camelCase>Entry,  // ← añadir aquí
];
```

### Paso 7 — Actualizar `src/config/tools.config.ts`

```typescript
<camelCase>: {
  enabled: true,
  // Si depende de una API key: enabled: Boolean(process.env["MY_API_KEY"])
  description: "<descripción en una línea>",
},
```

### Paso 8 — Validar tipos

```bash
npx tsc --noEmit
```

### Paso 9 — Mostrar resumen al developer

- Archivo nuevo creado y su ruta
- Cambios en `index.ts` (líneas añadidas)
- Cambios en `tools.config.ts` (líneas añadidas)
- Variables de entorno necesarias (nombre sugerido + dónde añadirlas en `.env`)
- Paquetes npm a instalar (si aplica)

---

## Reglas

- **Open/Closed**: nunca modificar archivos de tools existentes
- `z.tipo().describe("...")` en **cada** campo de `inputSchema`
- Siempre exportar tanto el `Entry` como la factory function
- Naming: filename kebab-case · factory PascalCase · entry/key camelCase
- Si la tool requiere una env var: añadirla comentada a `.env.example`
- Si falta información para generar (ej: no sé el shape del response de la API), pregunta antes de generar código incompleto
