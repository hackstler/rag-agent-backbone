# Frontend Rules

> **Nota**: El frontend (agent-dashboard) es un proyecto separado en `../agent-dashboard/`.
> Estas reglas aplican cuando se trabaja en ese proyecto, no en agent-grass directamente.

## React

- Componentes funcionales siempre. No class components.
- Props con `interface` tipada: `interface ChatPanelProps { ... }`
- Custom hooks en `src/hooks/` — nombrar `useXxx`
- Estado local con `useState` / `useReducer`
- `useEffect` siempre con cleanup:
  ```typescript
  useEffect(() => {
    const controller = new AbortController()
    fetchData({ signal: controller.signal })
    return () => controller.abort()
  }, [deps])
  ```
- Composición sobre herencia: usar `children`, render props, HOCs

## Tailwind CSS v4

- Entry point: `@import "tailwindcss"` en `index.css`
- Design tokens en `@theme {}` (colores, fonts)
- **Utility-first**: usar clases de Tailwind directamente en JSX
- **No** `@apply` — componer utilities en className
- Responsive mobile-first: `sm:`, `md:`, `lg:`

## API Client

- Centralizar en `src/api/` — un archivo por dominio (`channels.ts`, `chat.ts`, `auth.ts`)
- **No** usar `EventSource` para SSE — usar `ReadableStream` del `fetch` response
- Polling: pausar cuando la pestaña pierde foco (`document.hidden`)
- Base URL desde `import.meta.env["VITE_API_URL"]`
- Auth header: `Authorization: Bearer ${token}`

## Comunicación con agent-grass (backend)

Endpoints que consume el dashboard:
- `POST /auth/login`, `POST /auth/register`, `GET /auth/me`
- `POST /chat` (SSE streaming)
- `GET/POST/DELETE /conversations`
- `GET /channels/whatsapp/status`, `GET /channels/whatsapp/qr`
- `POST /channels/whatsapp/enable`, `POST /channels/whatsapp/disconnect`
- `GET/POST/DELETE /admin/users`, `/admin/organizations` (admin only)
