# CuentasClaras

App web para dividir gastos asimetricos entre amigos.

## Usar Vercel Postgres (paso a paso)

### 1. Crear la base en Vercel
1. Entra a `Vercel Dashboard`.
2. Abre tu proyecto `CuentasClaras`.
3. Ve a `Storage`.
4. Crea una base `Postgres` y conectala al proyecto.

Vercel te inyecta variables de entorno automaticamente (incluyendo `POSTGRES_URL` y `POSTGRES_URL_NON_POOLING`).

### 2. Verificar variables en el proyecto
En `Project Settings > Environment Variables`, confirma que existan en `Production` (y tambien `Preview`/`Development` si quieres):

- `POSTGRES_URL_NON_POOLING`
- `POSTGRES_URL`

El backend usa por prioridad:
1. `POSTGRES_URL_NON_POOLING`
2. `POSTGRES_URL`
3. `DATABASE_URL`

### 3. Desplegar
1. Haz push a GitHub.
2. En Vercel, dispara un deploy nuevo (o `Redeploy`).

### 4. Probar que la API responde
Prueba en navegador:

- `https://<tu-proyecto>.vercel.app/api/health`

Deberias obtener:

```json
{"ok": true}
```

### 5. Probar escritura en DB
1. Entra al frontend (`/`).
2. Crea un evento.
3. Agrega participantes.
4. Agrega un gasto.

Si esto funciona, la conexion a Postgres esta OK y las tablas se crearon automaticamente.

## Desarrollo local

### Variables locales
En raiz del repo, crea `.env`:

```env
POSTGRES_URL=postgresql://user:password@host:5432/database?sslmode=require
```

Tambien puedes usar:

```env
POSTGRES_URL_NON_POOLING=postgresql://...
```

### Levantar backend local
Instala dependencias Python y ejecuta:

```bash
uvicorn api.index:app --reload --port 8000
```

### Levantar frontend local

```bash
npm install
npm run dev
```

## Notas tecnicas

- El backend crea tablas al iniciar (`Base.metadata.create_all`).
- La logica de liquidacion asimetrica vive en `api/calculations.py`.
- Si en Vercel aparece error de DB, revisa primero los logs de la funcion `api/index.py` y confirma variables de entorno en el entorno correcto (Production/Preview).
