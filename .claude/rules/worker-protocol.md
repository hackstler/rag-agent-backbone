# Worker ↔ Backbone Communication Protocol

## JWT Worker Token

```typescript
// Payload del JWT que emite el worker
{
  role: "worker",    // discriminante — NO es "user"
  orgId: string,     // organización que sirve este worker
  // sin userId — los workers no representan usuarios
}
```

- El backbone valida con `requireWorker` middleware
- Secret compartido via env var `JWT_SECRET` (mismo en backbone y worker)
- El worker genera su JWT al arrancar y lo reutiliza en todas las requests

## Endpoints Internos — Body Schemas

### POST /internal/whatsapp/qr
```typescript
// Request body
{ qrData: string }  // base64 o string del QR code

// Response 200
{ data: { status: "qr", orgId: string } }
```

### POST /internal/whatsapp/status
```typescript
// Request body
{
  status: "connected" | "disconnected",
  phone?: string  // solo cuando status = "connected"
}

// Response 200
{ data: { status: string, orgId: string, phone?: string } }
```

### POST /internal/whatsapp/message
```typescript
// Request body
{
  messageId: string,   // ID único del mensaje WhatsApp
  body: string,        // texto del mensaje
  chatId: string,      // ID del chat de WhatsApp
}

// Response 200 (respuesta del RAG agent)
{ data: { reply: string } }

// Response 503 (RAG no disponible)
{ error: "RAG agent unavailable" }
```

## Flow de autenticación worker

```
1. Worker arranca con ORG_ID + JWT_SECRET en env
2. Worker genera JWT: sign({ role: "worker", orgId: ORG_ID }, JWT_SECRET)
3. Worker envía requests con: Authorization: Bearer <worker-jwt>
4. Backbone middleware `requireWorker`:
   a. Verifica JWT
   b. Extrae orgId del payload
   c. Rechaza si role !== "worker"
   d. Inyecta orgId en context: c.set("orgId", payload.orgId)
```

## Errores estándar

| Status | Significado |
|--------|------------|
| 401 | JWT inválido o expirado |
| 403 | role no es "worker" |
| 400 | Body no pasa validación Zod |
| 503 | Servicio interno no disponible |
