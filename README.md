# OPENPOS WEB

Sistema POS web para tienda/academia de belleza. Incluye caja, inventario, clientes, reportes, KPIs, configuraciones operativas, API web, seed de datos de demo y despliegue Docker con imagen publicada en GHCR.

Version actual: `v1.2.0`

## Estado Del Release

- GitHub Release: https://github.com/marcogll/openpos_web/releases/tag/v1.2.0
- Imagen GHCR: `ghcr.io/marcogll/openpos_web:v1.2.0`
- Imagen semver: `ghcr.io/marcogll/openpos_web:1.2.0`
- Imagen latest: `ghcr.io/marcogll/openpos_web:latest`
- Workflow Docker: `.github/workflows/ci-cd-ghcr.yml`
- Workflow Release: `.github/workflows/github-release.yml`

## Caracteristicas

- POS web con busqueda, carrito, ticket, metodos de pago y venta rapida.
- Inventario con tablero, bajo stock, entradas, ajustes, conteo fisico e historial de movimientos.
- Clientes con RFC, razon social, email, telefono, direccion fiscal, regimen fiscal y puntos.
- Importacion/exportacion CSV para productos y clientes desde Settings.
- KPIs visuales con ventas, dinero, salud de inventario, rotacion, top sellers, ventas por hora y categorias.
- Reportes diarios, por metodo de pago, productos y horas.
- Configuracion de tienda, apariencia, facturacion, productos, usuarios, impuestos, impresora, escaner, ventas, clientes, Telegram y referencia API.
- Autenticacion con PIN y roles `admin`, `owner-admin` y `cashier`.
- Seed de tienda/academia de belleza con productos, clientes ficticios, ventas, movimientos e inventario.
- Docker web en puerto `3001` para conservar rutas externas como Tailscale.
- CI/CD que construye y publica imagenes multi-arquitectura en GHCR.

## Stack

- Frontend: React, Vite, Tailwind CSS, Zustand, Recharts, Lucide React.
- Backend web: Bun, Hono, PostgreSQL, SQL directo.
- CLI/TUI legado: Bun, Ink.
- Base de datos local recomendada: PostgreSQL 16 via Docker Compose.
- Testing visual/manual: Playwright.

## Requisitos

- Bun
- Node.js 22+
- Docker y Docker Compose
- PostgreSQL, o el servicio `postgres` incluido en `docker-compose.yml`

## Inicio Rapido

```bash
npm install
docker compose up -d postgres
npm run seed
npm run dev:web
```

La app web queda en:

- Web/API produccion local: `http://localhost:3001`
- Vite dev: `http://localhost:5173`
- API base: `http://localhost:3001/api`

## Login De Demo

El seed crea usuarios listos para probar:

| Usuario | PIN | Rol |
|---------|-----|-----|
| `ale` | `1608` | `owner-admin` |
| `admin` | `1234` | `admin` |

Usuario principal de demo:

- Nombre: Ale Ponce
- Email: `ale@vanityexpericne.mx`
- Rol: `owner-admin`

## Base De Datos

El modo web usa PostgreSQL.

Conexion por defecto:

```text
postgresql://openpos:openpos123@localhost:5432/openpos
```

En Docker Compose, el backend usa:

```text
postgresql://openpos:openpos123@postgres:5432/openpos
```

Tablas principales:

| Tabla | Descripcion |
|-------|-------------|
| `products` | Catalogo de productos, stock, costos, categorias y codigos |
| `sales` | Tickets y ventas |
| `users` | Usuarios, PIN, email y roles |
| `clients` | Clientes fiscales y de fidelidad |
| `inventory_movements` | Entradas, ajustes, ventas y conteos |
| `receipts` | Recibos generados |
| `config` | Configuracion operativa |

## Seed

```bash
npm run seed
```

El seed carga datos de una academia/tienda de belleza:

- Productos de cabello, unas, maquillaje, herramientas y consumibles.
- Clientes ficticios con informacion fiscal y contacto.
- Ventas de ejemplo para reportes y KPIs.
- Movimientos de inventario para rotacion y alertas.
- Usuarios `ale` y `admin`.

## Docker Local

Levantar base de datos:

```bash
docker compose up -d postgres
```

Construir y levantar web:

```bash
docker build -f Dockerfile.web -t openpos-web:latest .
docker run -d \
  --name openpos-web \
  --restart unless-stopped \
  --network openpos_web_default \
  -p 3001:3001 \
  -v "$PWD/assets:/app/assets" \
  -e DATABASE_URL=postgresql://openpos:openpos123@postgres:5432/openpos \
  -e NODE_ENV=production \
  openpos-web:latest
```

Verificar:

```bash
curl -I http://localhost:3001
docker ps
docker logs --tail 80 openpos-web
```

Tambien se puede usar Compose:

```bash
docker compose up -d postgres web
```

## Imagen GHCR

Pull de la imagen publicada:

```bash
docker pull ghcr.io/marcogll/openpos_web:v1.2.0
docker pull ghcr.io/marcogll/openpos_web:latest
```

Ejecutar imagen GHCR:

```bash
docker run -d \
  --name openpos-web \
  --restart unless-stopped \
  --network openpos_web_default \
  -p 3001:3001 \
  -v "$PWD/assets:/app/assets" \
  -e DATABASE_URL=postgresql://openpos:openpos123@postgres:5432/openpos \
  -e NODE_ENV=production \
  ghcr.io/marcogll/openpos_web:v1.2.0
```

Tags publicados por CI/CD:

- `latest` en `main`
- `main`
- `v1.2.0`
- `1.2.0`
- `1.2`
- `sha-<commit>`

Arquitecturas:

- `linux/amd64`
- `linux/arm64`

## CI/CD

`.github/workflows/ci-cd-ghcr.yml`

- En pull request: construye la imagen sin publicar.
- En push a `main`: publica `latest`, `main` y `sha-*`.
- En tags `v*.*.*`: publica `vX.Y.Z`, `X.Y.Z` y `X.Y`.
- En release publicado: vuelve a construir/publicar.

`.github/workflows/github-release.yml`

- Crea el GitHub Release usando las notas de `CHANGELOG.md`.
- Usa `GITHUB_TOKEN` de GitHub Actions con permiso `contents: write`.
- Puede ejecutarse manualmente con `workflow_dispatch`.

## Modulos Web

| Ruta | Vista |
|------|-------|
| `/pos` | Caja, busqueda, carrito y cobro |
| `/inventory` | Inventario, entradas, ajustes, conteos y movimientos |
| `/clients` | Clientes |
| `/reports` | Reportes operativos |
| `/kpis` | Tablero ejecutivo |
| `/settings` | Ajustes de tienda y operacion |

Settings incluye:

- Tienda
- Apariencia
- Facturacion
- Productos
- Usuarios
- Impuestos
- Impresora
- Escaner
- Ventas
- Clientes
- Telegram
- API

## API Principal

Todas las rutas `/api/*` requieren token, excepto setup/login.

| Metodo | Ruta | Uso |
|--------|------|-----|
| `GET` | `/api/auth/setup` | Revisar si falta usuario inicial |
| `POST` | `/api/auth/setup` | Crear usuario inicial |
| `POST` | `/api/auth/login` | Login con usuario y PIN |
| `GET` | `/api/auth/me` | Usuario autenticado |
| `GET` | `/api/products` | Listar/buscar productos |
| `POST` | `/api/products` | Crear producto |
| `PUT` | `/api/products/:sku` | Editar producto |
| `DELETE` | `/api/products/:sku` | Desactivar producto |
| `GET` | `/api/sales` | Listar ventas |
| `POST` | `/api/sales` | Crear venta |
| `GET` | `/api/clients` | Listar clientes |
| `POST` | `/api/clients` | Crear cliente |
| `PUT` | `/api/clients/:rfc` | Editar cliente |
| `DELETE` | `/api/clients/:rfc` | Eliminar cliente |
| `GET` | `/api/inventory/dashboard` | Resumen de inventario |
| `GET` | `/api/inventory/low-stock` | Productos en bajo stock |
| `GET` | `/api/inventory` | Productos con estado de inventario |
| `POST` | `/api/inventory/entry` | Entrada de mercancia |
| `POST` | `/api/inventory/adjustment` | Ajuste de stock |
| `POST` | `/api/inventory/count` | Conteo fisico |
| `GET` | `/api/reports/daily` | Reporte diario |
| `GET` | `/api/reports/method` | Reporte por metodo |
| `GET` | `/api/reports/products` | Reporte por producto |
| `GET` | `/api/reports/hourly` | Reporte por hora |
| `GET` | `/api/kpis` | KPIs ejecutivos |
| `GET` | `/api/kpis/products` | KPIs de productos |
| `GET` | `/api/kpis/users` | KPIs por usuario |
| `POST` | `/api/import/products` | Importar productos |
| `POST` | `/api/import/clients` | Importar clientes |
| `POST` | `/api/import/sales` | Importar ventas |
| `GET` | `/api/users` | Listar usuarios |
| `POST` | `/api/users` | Crear usuario |
| `PUT` | `/api/users/:id` | Editar usuario |
| `DELETE` | `/api/users/:id` | Desactivar usuario |
| `GET` | `/api/config` | Leer configuracion |
| `PUT` | `/api/config` | Guardar configuracion |
| `POST` | `/api/receipts/generate` | Generar recibo |
| `POST` | `/api/telegram/webhook` | Webhook Telegram |

## Importacion CSV

Productos:

```csv
sku,name,price,cost,category,stock,barcode,unittype,unitqty,minstock
CAB001,Shampoo Reparacion 400ml,170,60,CAB,20,7509300100015,pza,1,8
```

Clientes:

```csv
rfc,razonSocial,email,telefono,direccion,regimenFiscal
XAXX010101000,Cliente Mostrador,cliente@example.com,8110000000,Monterrey NL,616
```

Desde la web:

- Settings > Productos > Exportar/Importar
- Settings > Clientes > Exportar/Importar

## Plan Para Manual Con Playwright

Objetivo: crear un manual de usuario con capturas reales, pasos reproducibles y verificacion automatica de que cada pantalla carga.

1. Preparar ambiente reproducible.
   - Levantar `postgres` y `openpos-web` en Docker.
   - Ejecutar `npm run seed`.
   - Usar login `ale` / `1608`.

2. Crear scripts Playwright.
   - `manual/login.spec.ts`: login y estado inicial.
   - `manual/pos.spec.ts`: venta, busqueda, carrito y cobro.
   - `manual/inventory.spec.ts`: tablero, entrada, ajuste y conteo.
   - `manual/clients.spec.ts`: alta, busqueda, import/export.
   - `manual/reports-kpis.spec.ts`: reportes, KPIs, graficos y top sellers.
   - `manual/settings.spec.ts`: ajustes principales.

3. Capturar pantallas.
   - Guardar screenshots en `docs/manual/images`.
   - Usar nombres estables: `01-login.png`, `02-pos.png`, `03-inventory.png`.
   - Capturar desktop y mobile para vistas criticas.

4. Generar el manual.
   - Crear `docs/manual/README.md`.
   - Incluir flujo por rol: owner-admin, admin y cashier.
   - Documentar pasos con imagen, objetivo, campos requeridos y resultado esperado.

5. Verificar el manual.
   - Playwright debe fallar si una ruta no carga, si hay errores JS o si falta texto clave.
   - Agregar `npm run manual:test` y `npm run manual:capture`.
   - Publicar capturas como artefacto en GitHub Actions.

6. Mantenerlo actualizado.
   - Ejecutar capturas en cada release.
   - Revisar diferencias visuales antes de publicar.
   - Actualizar `CHANGELOG.md` y el manual en el mismo PR del feature.

## Comandos Utiles

```bash
npm run build:web
npm run start:web
npm run seed
docker compose up -d postgres web
docker build -f Dockerfile.web -t openpos-web:latest .
```

## Troubleshooting

Si la app no carga:

```bash
docker ps
docker logs --tail 120 openpos-web
curl -I http://localhost:3001
```

Si no hay datos:

```bash
docker compose up -d postgres
npm run seed
```

Si GHCR no publica:

- Revisar Actions en GitHub.
- Confirmar que el workflow tenga `packages: write`.
- Confirmar que el tag cumple `v*.*.*`, por ejemplo `v1.2.0`.

## Licencia

MIT.
