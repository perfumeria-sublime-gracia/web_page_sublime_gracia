# Sublime Gracia Admin

Aplicación de escritorio para gestionar la tienda de perfumes Sublime Gracia.

## Requisitos

- Node.js 20+
- Backend de Sublime Gracia en Render, o una URL alternativa configurada.

## Ejecutar en desarrollo

```bash
npm install
npm run dev
```

La app se conecta por defecto con `https://web-page-sublime-gracia.onrender.com`.
Se puede reemplazar la URL mediante `APP_API_URL` o `VITE_API_URL`, o desde
**Configuración**. Las URLs remotas deben usar HTTPS; HTTP queda limitado a
`localhost` para desarrollo.

## Generar instalador de Windows

```bash
npm install
npm run dist
```

El instalador generado queda en la carpeta `dist-electron`.
El icono de Windows se genera desde `img/logo.jpg` en `build/icon.ico` y se
aplica al ejecutable y al instalador NSIS. La edición de recursos permanece
activa; solo se omite la firma de código.

## Módulos conectados

- Dashboard: `/api/admin/dashboard`
- Catálogo: `/api/admin/productos` y CRUD en `/api/productos`
- Inventario: `/api/admin/inventario/movimientos`
- Pedidos: `/api/admin/pedidos` y `/api/admin/pedidos/:id/estado`
- Ventas presenciales: `/api/admin/ventas-presenciales`
- Promociones: `/api/promociones`
- Clientes e historial: `/api/admin/clientes`
- Opiniones: `/api/admin/opiniones`

En ventas presenciales, el buscador encuentra colonias cuyo nombre comienza por
el texto ingresado y permite filtrar por género. La opción **Venta libre** deja
registrar los ml vendidos y un precio manual; el detalle conserva esos ml y el
inventario descuenta una presentación completa.

Las sesiones guardan el token durante la sesión de la app; el backend comprueba
el rol administrador en cada ruta protegida. Los datos no se sustituyen por
ejemplos cuando falla la conexión.

## Configuración opcional del backend

Para usar otro backend, define su URL base antes de arrancar la app:

```bash
export APP_API_URL=https://tu-api.example.com
```

En Windows PowerShell:

```powershell
$env:APP_API_URL = "https://tu-api.example.com"
```

La aplicación reutiliza los endpoints del proyecto web actual; no crea una base de datos independiente.

## Versión 1.0.3

Las promociones admiten imagen publicitaria y selección automática/manual de
productos por género y presentación. El backend debe actualizarse para agregar
las columnas de promociones (el servidor aplica el cambio idempotente al
iniciar). Las imágenes se validan en JPG/JPEG/PNG/WEBP y hasta 5 MB.

Las ventas presenciales pueden guardar nombre y teléfono opcionales del cliente;
el módulo de clientes agrupa las ventas por teléfono para mostrar su historial.
Las ventas existentes sin cliente siguen siendo compatibles.
El envío multipart de promociones usa ahora campos individuales y valida el
nombre antes de guardar para evitar errores cuando se carga una imagen.
