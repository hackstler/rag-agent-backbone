# Trampas al escribir tests de integración con vitest

## Contexto

Al añadir tests de integración para la API del agente RAG, todos los tests pasaban en
~150ms aunque incluían llamadas reales al LLM (que tardan 3–5s). Señal de que los tests
estaban pasando sin ejecutar ninguna aserción.

---

## Problema 1 — `pool: "forks"` es necesario para acceder a localhost

Por defecto, vitest ejecuta los tests en workers (hilos de Node.js, tipo `vm.runInContext`).
Estos workers tienen restricciones de red que impiden que `fetch` llegue a `localhost`.

**Síntoma**: todos los tests pasan instantáneamente porque el `beforeAll` no puede hacer
`fetch` al servidor y `serverAvailable` queda en `false`. Los tests hacen `if (!serverAvailable) return;`
y vitest los marca como pasados (sin aserciones = sin fallo).

**Solución**: configurar `pool: "forks"` en `vitest.config.ts` para ejecutar los tests en
procesos hijo reales (fork de Node.js), que sí tienen acceso completo a la red.

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
```

---

## Problema 2 — `BASE_URL` está reservada por Vite/vitest

Este fue el problema más sutil. Aunque se configuró `pool: "forks"`, los tests seguían
saltando. El diagnóstico mostró:

```
[debug] process.env.BASE_URL = "/" → BASE_URL = /
```

**Causa raíz**: Vite (sobre el que se construye vitest) inyecta automáticamente
`BASE_URL="/"` en el proceso de tests. Es la variable que Vite usa para exponer el
[`base` config option](https://vite.dev/config/shared-options.html#base) a los módulos.
Por defecto `base` es `"/"`, así que `BASE_URL` siempre vale `"/"` dentro de vitest.

El test usaba:

```ts
const BASE_URL = process.env["BASE_URL"] ?? "http://localhost:3000";
```

Como `"/"` no es `null` ni `undefined`, `??` no activa el fallback. El `fetch` se hace
a `"/health"` (ruta relativa), Node.js lo rechaza con un `TypeError`, el `catch` lo
silencia, y `serverAvailable` queda `false`. Todos los tests saltan.

**Solución**: usar un nombre de variable que no colisione con las inyectadas por Vite.

```ts
// MAL — colisiona con la variable interna de Vite
const BASE_URL = process.env["BASE_URL"] ?? "http://localhost:3000";

// BIEN — nombre propio del proyecto, sin colisión
const BASE_URL = process.env["TEST_API_URL"] || "http://localhost:3000";
```

> Variables reservadas por Vite en el entorno de tests:
> `BASE_URL`, `MODE`, `DEV`, `PROD`, `SSR`.
> Evitar usarlas como variables de configuración propia.

---

## Verificación

Después de ambas correcciones, el output del test cambió de:

```
Duration  154ms (tests 2ms)   ← todos saltando
```

a:

```
Duration  8.21s (tests 8.07s) ← tests reales ejecutándose
✓ POST /ingest — ingests a text file and creates embeddings  343ms
✓ POST /chat — returns answer with sources and metadata      3264ms
✓ POST /chat — reuses existing conversation                  2681ms
✓ GET /chat/stream — returns SSE stream with correct format  1725ms
```

---

## Reglas a recordar

1. **Vitest + `fetch` a localhost → usar `pool: "forks"`** siempre que los tests
   necesiten hablar con un servidor local.

2. **No usar `BASE_URL` como nombre de variable de configuración en vitest.** Ni
   `MODE`, `DEV`, `PROD`, `SSR`. Son inyectadas por Vite y siempre tendrán el valor
   del config de Vite, no el de tu entorno.

3. **El patrón `if (!available) return;` hace que vitest cuente el test como pasado.**
   Es útil para saltar tests opcionales, pero hay que asegurarse de que la condición
   se evalúa correctamente — si siempre es `false`, todos los tests son falsos positivos.
   Añadir un `console.log` en `beforeAll` para verificar el estado real de los servicios.

4. **El tiempo de ejecución es el mejor indicador de si los tests reales corren.**
   Tests con LLM que completan en <1s definitivamente no están haciendo llamadas reales.
