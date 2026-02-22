# /setup

Configura rag-agent-backbone para un cliente específico.
Audiencia: el desarrollador técnico que onboarda al cliente. El cliente final nunca toca esto.

## Uso
```
/setup
```

---

## Instrucciones para Claude

### Contexto de ejecución
- El stack es **fijo**: Hono + Mastra + pgvector + Gemini. No preguntes sobre framework, infraestructura ni modelo LLM.
- Los presets de `useCasePresets` en `rag.config.ts` ya definen chunking, topK, reranking y query enhancement. No preguntes por esos parámetros individualmente.
- Estás configurando el agente para un desarrollador, no para el cliente final.

---

### Paso 0 — Leer estado previo

Lee `setup-responses.md` en la raíz del proyecto.

**Si no existe:** empieza directamente con P1 con esta introducción:
> "Configuro el agente para tu cliente. 4 preguntas:"

**Si existe:** lee los valores actuales, muestra un resumen de la config actual y pregunta qué quiere cambiar. No repitas preguntas ya respondidas.

> "Config actual: [agentName] · [useCase] · [responseLanguage] · web search [on/off]
> ¿Qué cambias?"

---

### Las 4 preguntas — una a la vez

#### P1 — Contexto del cliente
> "¿Nombre del proyecto/cliente y en qué consiste el negocio? (2-3 frases)"

Guarda: `agent_name`, `agent_description`

Infiere automáticamente — **no preguntes** si la confianza es alta:
- `use_case`:
  - Soporte a clientes, FAQs, atención → `customer-support`
  - Base de conocimiento, docs internas, manuales, catálogos → `knowledge-base`
  - Ayuda con código, APIs, docs técnicas → `code-assistant`
  - Ambiguo → `knowledge-base` por defecto
- `responseLanguage`: si mencionan "español" / "clientes españoles" / escriben en español → `es`; inglés → `en`; no claro → pregunta en P3

El `use_case` activa el preset automáticamente en `rag.config.ts` — chunking, topK, reranking, query enhancement **ya están definidos**. No preguntes por ellos.

---

#### P2 — Tipos de documento
> "¿Qué tipos de documentos se van a ingestar?"
> - PDF
> - Markdown / texto plano
> - HTML / páginas web
> - CSV / JSON (exports de bases de datos)
> - Código fuente

Guarda: `document_types`

Ajusta `chunkingStrategy` **solo** si el preset no es adecuado:
- Código fuente → `semantic` siempre (sobreescribe el preset)
- Solo CSV / JSON → `fixed` con `chunkSize: 256`
- Resto: el preset lo maneja, no toques nada

---

#### P3 — Idioma de respuesta
**Solo pregunta si no se pudo inferir de P1.**

> "¿En qué idioma responde el agente?"
> - `es` — español
> - `en` — inglés
> - `auto` — detecta el idioma de cada pregunta del usuario

---

#### P4 — Web search fallback
> "¿Habilitar búsqueda web vía Perplexity cuando los documentos no tengan respuesta?"
> - Sí → pide `PERPLEXITY_API_KEY`
> - No

---

### Confirmación previa a aplicar

Muestra resumen completo antes de tocar ningún archivo:

```
Configuración a aplicar:
────────────────────────────────────────
Agente:       [nombre]
Descripción:  [descripción]
Caso de uso:  [use_case]  →  preset activo
Documentos:   [tipos]
Idioma:       [lang]
Web search:   [activado (Perplexity) | desactivado]
────────────────────────────────────────
¿Aplico?
```

No modifiques ningún archivo hasta recibir confirmación.

---

### Aplicar cambios (en este orden)

**1. Escribe `setup-responses.md`:**
```yaml
# RAG Agent Setup — última actualización: [fecha]
agent_name: [valor]
agent_description: [valor]
use_case: [valor]
response_language: [valor]
document_types: [lista separada por comas]
chunking_strategy_override: [valor | none]
web_search: [true | false]
```

**2. Edita `src/config/rag.config.ts`:**
- `agentName`, `agentDescription`, `responseLanguage`, `useCase`
- Solo si hay override de chunking: `chunkingStrategy`, `chunkSize`
- No toques topK, reranking, queryEnhancement — los maneja el preset

**3. Edita `src/config/tools.config.ts`:**
- `searchWeb.enabled = true / false` según P4

**4. Edita `CLAUDE.md`:**
- Actualiza la sección "Propósito" con el nombre y descripción del cliente

**5. Edita `.env.example`:**
- Si web search activo: descomenta `PERPLEXITY_API_KEY=`

**6. Muestra los próximos pasos:**
```
✓ Configuración aplicada.

Próximos pasos:
1. cp .env.example .env  →  añade los valores reales
   Variables necesarias: [lista: GOOGLE_API_KEY siempre + PERPLEXITY_API_KEY si aplica]
2. docker-compose up  (o inicia el contenedor PostgreSQL existente)
3. npm run dev
4. /ingest ./docs/  para indexar los documentos del cliente
5. Prueba: POST http://localhost:3000/chat  {"query": "..."}

Para añadir integraciones:  /add-tool
Para ver el estado:         /status
```

---

### Reglas
- Stack fijo. Nunca preguntes sobre framework, modelo, proveedor de infra.
- Una pregunta a la vez. Espera la respuesta antes de continuar.
- Infiere lo que puedas del contexto de P1. Solo pregunta lo que no puedas inferir con alta confianza.
- No modifiques archivos hasta confirmación del resumen.
- Si el dev cambia de opinión tras confirmar, actualiza `setup-responses.md` y re-aplica solo los archivos afectados.
