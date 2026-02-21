# initial-setup.md — RAG Agent Configuration Wizard

## Cómo usar este wizard

Responde las preguntas de abajo. Cuando termines, dile a Claude:

> "Aplica la configuración de initial-setup.md"

Claude leerá tus respuestas y generará:
- `src/config/rag.config.ts` — parámetros del pipeline RAG
- `.env.example` — variables de entorno adaptadas
- `docker-compose.yml` — stack local con los servicios necesarios
- Actualizará `CLAUDE.md` con el contexto de tu proyecto

---

## Responde aquí

### 1. Identidad del agente

**Nombre del agente**: [ej: "Asistente de Soporte TechCorp"]

**Descripción** (1-2 frases sobre qué hace):
[ej: "Responde preguntas sobre productos y políticas de TechCorp usando la documentación oficial."]

**Idioma de respuesta**: [español / inglés / otro]

---

### 2. Caso de uso principal

Selecciona uno:

- [ ] **customer-support** — Responder preguntas de clientes sobre productos/servicios
- [ ] **knowledge-base** — Base de conocimiento interna para empleados
- [ ] **code-assistant** — Ayuda con código, documentación técnica, APIs
- [ ] **custom** — Caso de uso personalizado (configura manualmente)

---

### 3. Modo de respuesta

- [ ] **REST** — Respuesta JSON completa (más simple)
- [ ] **SSE Streaming** — Respuesta token a token como ChatGPT
- [ ] **Ambos** — Ambos endpoints disponibles (recomendado)

---

### 4. Gestión de conversación (memoria)

- [ ] **single-turn** — Sin historial (cada pregunta es independiente)
- [ ] **fixed-window** — Últimas N interacciones (recomendado para soporte)
  - Si seleccionas esta: ¿Cuántos intercambios recordar? [5 / 10 / 20]: ___
- [ ] **summary** — Resumen comprimido del historial (para conversaciones largas)

---

### 5. Tipos de documento a ingestar

Marca todos los que apliquen:

- [ ] PDF (manuales, contratos, reports)
- [ ] Markdown (documentación técnica, wikis)
- [ ] HTML (páginas web, FAQs)
- [ ] Código fuente (JS/TS/Python/etc)
- [ ] Texto plano (.txt)
- [ ] URLs (páginas web externas)

---

### 6. Estrategia de chunking

- [ ] **Fixed 512 tokens** (recomendado para empezar) — Simple, predecible
- [ ] **Semántico** — Divide en párrafos/secciones naturales (mejor para prosa)
- [ ] **Jerárquico** — Secciones grandes + sub-chunks (mejor para docs estructurados)

*Si tienes dudas, usa Fixed 512. Puedes cambiar con `/tune-retrieval` después.*

---

### 7. Query Enhancement

Mejora el retrieval rephraseando la pregunta antes de buscar:

- [ ] **Ninguno** — La query del usuario se usa directamente (más rápido)
- [ ] **Multi-query** — Genera 3 variaciones de la pregunta (+recall, +300ms)
- [ ] **HyDE** — Genera una respuesta hipotética como query (+precisión, +400ms)
- [ ] **Step-back** — Abstrae la pregunta a nivel general (+contexto, +300ms)

---

### 8. Reranking

Re-ordena los chunks recuperados con un cross-encoder (más preciso que solo embeddings):

- [ ] **Sin reranking** — Solo embeddings (más rápido, suficiente para empezar)
- [ ] **Cross-encoder local** — Reranking por keyword overlap (+calidad, sin API key)
- [ ] **Cohere Rerank** — Cross-encoder cloud (+20-35% precisión, +200ms, requiere API key)

---

### 9. LLM y Embeddings

**Entorno de desarrollo local**:
- [ ] **Ollama** — Sin API keys, privacidad total (requiere Docker)
  - LLM: `mistral` | Embeddings: `nomic-embed-text`
- [ ] **APIs cloud** — Igual que producción (requiere API keys)

**Producción**:
- [ ] **Claude 3.5 Sonnet + OpenAI embeddings** (recomendado)
- [ ] **GPT-4o + OpenAI embeddings**
- [ ] **Personalizado** — Especifica: LLM: ___ | Embeddings: ___

---

### 10. Observabilidad

Trazas del pipeline (qué queries, qué chunks, latencias, costes):

- [ ] **Sin trazas** — Sin overhead, suficiente para desarrollo
- [ ] **Langfuse** — Open-source, auto-hostable, recomendado para producción
- [ ] **LangSmith** — Managed service de LangChain

---

## Notas adicionales (opcional)

¿Hay algo específico que necesites configurar que no está cubierto arriba?

[Escribe aquí cualquier requisito especial]

---

## Siguiente paso

Una vez respondido, escribe en Claude:

```
Aplica la configuración de initial-setup.md y genera los archivos de configuración
```

Claude leerá este archivo y ejecutará los cambios necesarios.
