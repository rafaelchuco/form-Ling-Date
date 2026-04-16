# LingōDate Encuesta App

Aplicación completa con:

- Formulario público
- Backend Node.js + Express
- Base de datos en Supabase (PostgreSQL)
- Panel admin protegido con login
- Dashboard con métricas en tiempo real

## Estructura

- backend/
- frontend/
- supabase/migrations/
- .env

## 1) Instalar dependencias

```bash
cd backend
npm install
```

## 2) Configurar variables de entorno

En la raíz del proyecto, editar `.env`:

```env
PORT=3000
SUPABASE_URL=TU_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=TU_SUPABASE_SERVICE_ROLE_KEY
```

## 3) Crear tabla con Supabase CLI

Con proyecto vinculado:

```bash
supabase link --project-ref TU_PROJECT_REF
supabase db push
```

Esto aplicará la migración en `supabase/migrations/20260415_create_respuestas_encuesta.sql`.

## 4) Ejecutar app

```bash
cd backend
npm run dev
```

## 5) Usar app

- Encuesta: `http://localhost:3000/index.html`
- Admin: `http://localhost:3000/admin.html`

Credenciales admin:

- Usuario: `admin`
- Contraseña: `admin`

## API

- `POST /respuestas`
- `GET /respuestas?pais=&order=desc|asc`
- `GET /stats`
- `GET /health`

## Deploy en Render (acceso público)

Este proyecto ya está preparado para Render con blueprint en [render.yaml](render.yaml).

### Opción A: Deploy en 1 click con Blueprint

1. Sube este repo a GitHub.
2. En Render, elige **New +** -> **Blueprint**.
3. Selecciona tu repo y confirma.
4. Render leerá [render.yaml](render.yaml) y creará el servicio `lingodate-form`.
5. En Environment agrega:
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
6. Haz deploy.

### Opción B: Deploy manual (Web Service)

1. En Render, crea **New +** -> **Web Service**.
2. Conecta tu repositorio.
3. Configura:
	- **Name**: `lingodate-form`
	- **Runtime**: `Node`
	- **Root Directory**: `backend`
	- **Build Command**: `npm install`
	- **Start Command**: `npm start`
4. Agrega variables de entorno:
	- `SUPABASE_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy.

### Verificación post-deploy

1. Abre `https://TU-SERVICIO.onrender.com/health` y valida `{ ok: true }`.
2. Abre `https://TU-SERVICIO.onrender.com/index.html` para la encuesta.
3. Abre `https://TU-SERVICIO.onrender.com/admin.html` para el panel admin.

### Logs en Render para depuración

1. En Render entra a tu servicio -> **Logs**.
2. Envía una encuesta desde `index.html`.
3. Busca líneas como:
	- `[HTTP] ... method=POST path=/respuestas status=201`
	- `[API] ... POST /respuestas inserted`
4. Si falla, verás `[API_ERROR]` con `code`, `details`, `hint` y `requestId`.
5. Ese `requestId` también aparece en el error del frontend para cruzar exactamente el fallo en logs.

Checks rápidos si no llegan respuestas al admin:

- Confirma `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en Render.
- Verifica que `POST /respuestas` devuelva `201`.
- Verifica que `GET /respuestas` y `GET /stats` devuelvan `200`.
- Revisa en Supabase la tabla `public.respuestas_encuesta`.

### Recomendaciones de producción

- Rota la `SUPABASE_SERVICE_ROLE_KEY` si fue compartida fuera de Render.
- Mantén `.env` fuera del repositorio (ya está ignorado).
- Si el plan free duerme el servicio, considera plan de pago para evitar cold starts.
