# Plan de interfaz, rutas y carga CSV

## Alcance

Este plan cubre tres frentes:

- Corregir rutas que dejan la app en blanco.
- Cambiar la interfaz a una paleta Catppuccin Mocha/Latte.
- Agregar importacion CSV para servicios/productos y ventas pasadas.

Netlify queda fuera del alcance.

## 1. Rutas en blanco

### Objetivo

Evitar que la aplicacion quede en pantalla blanca al visitar rutas no soportadas, al refrescar una ruta, o cuando una vista falle en runtime.

### Trabajo

- Revisar las rutas actuales:
  - `/`
  - `/login`
  - `/pos`
  - `/reports`
  - `/settings`
  - rutas invalidas como `/abc` o `/settings/productos`
- Agregar una ruta fallback visual dentro del layout protegido.
- Agregar un `ErrorBoundary` para vistas lazy:
  - `PosView`
  - `ReportsView`
  - `SettingsView`
- Mostrar un estado recuperable cuando una vista falle:
  - mensaje claro
  - boton para volver a `/pos`
  - boton para recargar
- Validar refresh directo en cada ruta principal.

### Criterios de aceptacion

- Ninguna ruta deja una pantalla totalmente blanca.
- Las rutas invalidas muestran una pantalla de "Ruta no encontrada".
- Un error de componente no tumba toda la aplicacion.
- `npm run build:web` pasa.

## 2. Tema Catppuccin

### Objetivo

Reemplazar el tema actual, que se siente demasiado verde, por una paleta Catppuccin:

- Modo oscuro: Catppuccin Mocha con fondo base personalizado `#333333`.
- Modo claro: Catppuccin Latte.

### Trabajo

- Actualizar tokens en `src/modules/web/client/styles/globals.css`.
- Usar `#333333` como fondo base del modo Mocha.
- Mantener contraste suficiente en texto, bordes, inputs y paneles.
- Reducir el verde a usos semanticos:
  - exito
  - venta confirmada
  - estados positivos
- Cambiar acentos principales a colores Catppuccin mas balanceados:
  - mauve/lavender para seleccion y foco
  - peach para llamados secundarios
  - teal/sky para informacion
  - red para errores
  - yellow/peach para advertencias
- Agregar modo Latte con tokens claros.
- Agregar persistencia de tema en `localStorage`.
- Agregar un control de tema en header o sidebar.

### Criterios de aceptacion

- La interfaz ya no se percibe dominada por verde.
- Mocha usa `#333333` como base de fondo.
- Latte tiene contraste adecuado.
- El tema elegido persiste al recargar.
- Botones, foco, nav activo, inputs y estados usan los nuevos tokens.

## 3. Revision completa de interfaz

### Objetivo

Revisar la app completa despues del cambio de tema para corregir inconsistencias visuales y estados rotos.

### Pantallas a revisar

- Login.
- Sidebar.
- Header.
- Punto de venta.
- Busqueda de productos.
- Grid de productos.
- Carrito.
- Modal de pago.
- Reportes.
- Configuracion:
  - tienda
  - facturacion
  - productos
  - usuarios
  - impuestos
  - ventas
  - clientes

### Trabajo tecnico

- Corregir clases dinamicas de Tailwind como:
  - `bg-${m.color}/10`
  - `text-${m.color}`
  - `border-${m.color}/50`
- Reemplazarlas por mapas de clases estaticas.
- Revisar estados:
  - carga
  - error
  - vacio
  - deshabilitado
  - hover
  - focus
- Revisar que no haya texto o controles encimados.
- Revisar responsive basico en desktop y pantallas angostas.

### Criterios de aceptacion

- No hay clases Tailwind dinamicas fragiles en componentes principales.
- Los estados vacios y de error son visibles.
- La UI se mantiene consistente en POS, reportes y configuracion.
- Los controles interactivos tienen foco visible.

## 4. Importacion CSV de servicios/productos

### Objetivo

Permitir cargar servicios y productos desde CSV desde la interfaz.

### Ubicacion propuesta

`Configuracion > Productos > Importar CSV`

### Formato CSV propuesto

```csv
sku,name,category,price,cost,stock,unitType,minStock
SERV-CORTE,Corte de cabello,SER,250,0,999,servicio,0
SERV-BARBA,Barba,SER,150,0,999,servicio,0
PROD-SHAMPOO,Shampoo 250ml,GEN,180,90,12,pieza,3
```

### Columnas

- `sku`: requerido, unico.
- `name`: requerido.
- `category`: requerido.
- `price`: requerido, numerico.
- `cost`: opcional, numerico.
- `stock`: opcional, numerico.
- `unitType`: opcional, por ejemplo `pieza`, `servicio`, `kg`, `litro`.
- `minStock`: opcional, numerico.

### Validaciones

- SKU no vacio.
- SKU no duplicado dentro del archivo.
- SKU no duplicado contra la base, salvo que se permita actualizar existentes.
- Nombre no vacio.
- Precio valido y mayor o igual a cero.
- Categoria valida.
- Servicios con categoria `SER` o `unitType=servicio`.

### Flujo

1. Usuario selecciona archivo CSV.
2. La app parsea el archivo en frontend.
3. Se muestra preview:
   - filas validas
   - filas con error
   - resumen por categoria
4. Usuario confirma importacion.
5. Backend inserta o actualiza registros.
6. Se muestra resultado:
   - productos creados
   - productos actualizados
   - filas rechazadas

### Criterios de aceptacion

- Se puede importar un CSV valido.
- Las filas invalidas se reportan con motivo.
- No se insertan duplicados accidentales.
- La pantalla muestra un resumen claro antes de confirmar.

## 5. Importacion CSV de ventas pasadas

### Objetivo

Permitir cargar historico de ventas desde CSV para migrar operaciones anteriores.

### Ubicacion propuesta

`Configuracion > Ventas > Importar historico`

### Formato CSV propuesto

```csv
ticket,createdAt,method,sku,name,qty,price,subtotal,tax,total,createdBy
0001,2026-06-01T10:30:00,efectivo,SERV-CORTE,Corte de cabello,1,250,250,40,290,Ana
0002,2026-06-01T11:10:00,tarjeta,SERV-BARBA,Barba,1,150,150,24,174,Ana
0002,2026-06-01T11:10:00,tarjeta,PROD-SHAMPOO,Shampoo 250ml,1,180,180,28.8,208.8,Ana
```

### Columnas

- `ticket`: requerido.
- `createdAt`: requerido, fecha valida.
- `method`: requerido.
- `sku`: requerido si existe catalogo.
- `name`: requerido.
- `qty`: requerido, numerico.
- `price`: requerido, numerico.
- `subtotal`: requerido o calculable.
- `tax`: requerido o calculable.
- `total`: requerido.
- `createdBy`: opcional.

### Validaciones

- Tickets no duplicados contra ventas existentes.
- Fechas validas.
- Metodo de pago valido:
  - `efectivo`
  - `tarjeta`
  - `transf.`
  - `qr/codi`
  - `otro`
- Cantidades mayores a cero.
- Precios mayores o iguales a cero.
- Totales coherentes con las lineas del ticket.
- Multiples filas con el mismo ticket se agrupan en una sola venta.

### Flujo

1. Usuario selecciona CSV historico.
2. La app parsea filas.
3. Agrupa filas por `ticket`.
4. Valida cada ticket completo.
5. Muestra preview:
   - tickets validos
   - tickets con error
   - total historico a importar
   - rango de fechas
6. Usuario confirma.
7. Backend inserta ventas e items.
8. Reportes quedan alimentados con el historico.

### Criterios de aceptacion

- Se importan ventas con una o varias lineas por ticket.
- No se duplican tickets existentes.
- Los tickets invalidos no bloquean necesariamente los validos.
- El usuario ve errores por fila o por ticket.
- Los reportes reflejan las ventas importadas.

## 6. Validacion final

### Comandos

```bash
npm run build:web
```

`npm run typecheck` actualmente falla por errores existentes en componentes compartidos/CLI Ink. No debe usarse como bloqueo directo para este cambio web hasta separar o corregir esa deuda.

### Pruebas manuales

- Abrir `/login`.
- Iniciar sesion.
- Abrir `/pos`.
- Refrescar `/pos`.
- Abrir `/reports`.
- Refrescar `/reports`.
- Abrir `/settings`.
- Refrescar `/settings`.
- Abrir ruta invalida y verificar fallback.
- Cambiar entre Mocha y Latte.
- Importar CSV valido de servicios/productos.
- Importar CSV con errores de servicios/productos.
- Importar CSV valido de ventas.
- Importar CSV con tickets duplicados o totales invalidos.

## Orden recomendado de implementacion

1. Arreglar rutas en blanco y agregar `ErrorBoundary`.
2. Cambiar tokens de tema a Catppuccin Mocha/Latte.
3. Revisar toda la UI y corregir clases Tailwind dinamicas.
4. Implementar importacion CSV de servicios/productos.
5. Implementar importacion CSV de ventas pasadas.
6. Ejecutar build y pruebas manuales.
