# Sublime Gracia — Frontend

Aplicación web de la tienda Sublime Gracia, construida con React, TypeScript y
Vite. Permite explorar el catálogo, gestionar el carrito y los pedidos, y
ofrece vistas administrativas para productos, pedidos y promociones.

## Requisitos

- Node.js compatible con la versión instalada de Vite.
- npm.
- El backend de Sublime Gracia disponible para las funciones que consumen la
  API.

## Instalación y desarrollo

Desde esta carpeta (`frontend/sublime_gracia`), instala las dependencias:

```bash
npm install
```

Crea un archivo `.env` en esta carpeta y configura la URL del backend (ver
[variables de entorno](#variables-de-entorno)). Luego ejecuta:

```bash
npm run dev
```

Vite mostrará en la terminal la dirección local para abrir en el navegador.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `VITE_API_URL` | Origen base del backend, por ejemplo `http://localhost:3000`. No agregues `/api` al final; la aplicación añade ese prefijo a las solicitudes de API. |
| `VITE_GA_MEASUREMENT_ID` | ID de medición de Google Analytics. Si no se define, la aplicación utiliza el ID predeterminado configurado en el código. |

Ejemplo de `.env` para desarrollo:

```dotenv
VITE_API_URL=http://localhost:3000
```

Las variables con prefijo `VITE_` se incluyen en el código del navegador; no
guardes secretos ni credenciales privadas en ellas. El `.env` local está
excluido de Git.

El backend debe permitir el origen desde el que se sirve el frontend en la
configuración de CORS. El backend del proyecto ya permite
`http://localhost:5173` y el dominio desplegado actual.

## Comandos

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor de desarrollo de Vite. |
| `npm run build` | Ejecuta el chequeo de TypeScript y genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve localmente la compilación de `dist/` para previsualizarla. |
| `npm run lint` | Analiza el código con Oxlint. |

Para validar cambios antes de desplegar:

```bash
npm run lint
npm run build
```

## Secciones de la aplicación

- `/` — Inicio, anuncios, productos destacados e historia.
- `/catalogo` — Catálogo y filtros.
- `/producto/:id` — Detalle del producto y reseñas.
- `/carrito` y `/checkout` — Carrito y creación de pedidos.
- `/seguimiento` y `/seguimiento/:id` — Seguimiento de pedidos.
- `/login` — Inicio de sesión.
- `/admin` — Gestión administrativa de pedidos.
- `/admin/colonias` — Gestión de productos.
- `/admin/promos` — Gestión de promociones y anuncios.
- `/contacto`, `/envios`, `/casos-exito` — Información de la tienda.
- `/privacidad`, `/terminos`, `/cookies`, `/devoluciones` — Políticas de la tienda.

Las páginas utilizan React Router. En producción, configura el hosting para
redirigir las rutas que no correspondan a archivos estáticos hacia
`index.html`; de lo contrario, al recargar directamente una ruta como
`/catalogo` el servidor puede responder 404.

## Estructura del proyecto

```text
src/
  page/       Páginas y componentes de la interfaz
  style/      Estilos globales y tema de marca
  utils/      Utilidades compartidas, como URLs de imágenes y carrito
  assets/     Recursos importados por la aplicación
public/       Archivos estáticos servidos desde la raíz
uploads/      Imágenes y recursos locales importados por la aplicación
```

## Integración con el backend

La aplicación consulta el backend para obtener catálogo, promociones, anuncios,
reseñas, carrito y pedidos. Las operaciones administrativas envían el token
JWT en el encabezado `Authorization: Bearer <token>`. Configura `VITE_API_URL`
con la dirección del backend correspondiente a cada entorno.

El carrito conserva un identificador en el navegador y lo envía al backend
mediante el encabezado `X-Cart-Id`; también se admiten cookies para mantener la
sesión del carrito. Las URLs relativas de imágenes servidas por el backend se
resuelven usando `VITE_API_URL`.