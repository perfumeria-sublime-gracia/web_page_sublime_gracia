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
