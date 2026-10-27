# Backend de Sublime Gracia

API REST de la tienda Sublime Gracia, construida con Node.js, Express y
Sequelize. La base de datos utilizada es PostgreSQL.

## Requisitos

- Node.js con soporte para `--env-file` (Node.js 20.6 o posterior).
- PostgreSQL y una URL de conexión válida.

## Instalación y ejecución

Desde esta carpeta (`backend`):

```bash
npm install
```

Copia `.env.example` a `.env` y completa como mínimo `DATA_BASE_URL` y
`JWT_SECRET`. Después inicia el servidor:

```bash
npm run dev
```

El modo de desarrollo reinicia el proceso cuando detecta cambios. Para iniciar
el servidor sin el modo de observación:

```bash
npm start
```

La API escucha en el puerto indicado por `PORT` (3000 si se usa el valor de
`.env.example`). Al arrancar, el servidor autentica la conexión, sincroniza los
modelos con Sequelize y aplica algunas actualizaciones de esquema necesarias.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `DATA_BASE_URL` | URL de conexión a PostgreSQL. Es obligatoria. |
| `PORT` | Puerto HTTP del servidor; se usa `3000` como valor habitual. |
| `JWT_SECRET` | Secreto para firmar y validar tokens JWT. Debe tener al menos 16 caracteres; se recomienda un mínimo de 32 en producción. |
| `UPLOADS_DIR` | Directorio raíz para archivos locales. Por defecto, `./uploads`. |
| `GITHUB_TOKEN` | Token de GitHub con permiso de escritura en el repositorio de imágenes de productos. |
| `GITHUB_OWNER` | Usuario u organización propietaria del repositorio de imágenes. |
| `GITHUB_REPO` | Repositorio público donde se guardan las imágenes. |
| `GITHUB_BRANCH` | Rama existente del repositorio de imágenes. |
| `GITHUB_IMAGES_DIRECTORY` | Directorio de imágenes dentro del repositorio; por defecto, `imagenes/productos`. |

No agregues `.env` ni tokens al repositorio. La configuración de GitHub es
opcional en desarrollo local: si las cinco variables `GITHUB_*` están vacías,
las imágenes de productos se guardan en disco. Si se configura solo una parte,
la carga falla explícitamente en lugar de guardar silenciosamente en local.

## API

Todas las rutas están bajo el prefijo `/api`. Las rutas protegidas requieren
`Authorization: Bearer <token>`; las rutas administrativas requieren además
que el token corresponda a un usuario con rol `admin`.

### Rutas públicas y de tienda

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/inicio` | Información de inicio. |
| `GET` | `/api/historia` | Información de historia. |
| `GET` | `/api/catalogo` | Listado del catálogo. |
| `GET` | `/api/catalogo/id/:id` | Producto del catálogo por ID. |
| `GET` | `/api/catalogo/categoria/:seg` | Productos de una categoría. |
| `GET` | `/api/productos` | Listado público de productos. |
| `GET` | `/api/productos/:id` | Producto por ID. |
| `GET` | `/api/promociones` | Listado de promociones. |
| `GET` | `/api/promociones/:id` | Promoción por ID. |
| `GET` | `/api/anuncio` | Anuncios. |
| `GET` | `/api/opiniones` | Opiniones y reseñas. |
| `POST` | `/api/opiniones` | Crear una reseña. |
| `POST` | `/api/auth/login` | Iniciar sesión y obtener autenticación. |
| `GET` | `/api/cart` | Consultar el carrito actual. |
| `POST` | `/api/cart/items` | Agregar un artículo al carrito. |
| `PUT` | `/api/cart/:id` | Actualizar un artículo del carrito. |
| `DELETE` | `/api/cart/:id` | Eliminar un artículo del carrito. |
| `POST` | `/api/pedidos` | Crear un pedido; acepta el campo de archivo `comprobante`. |
| `GET` | `/api/pedidos/:id` | Consultar el seguimiento de un pedido. |
| `POST` | `/api/pagos` | Crear un pago. |

El carrito se identifica con el encabezado `X-Cart-Id` o la cookie `cartId`.
Cuando no existe un identificador válido, la consulta devuelve un carrito vacío.

### Rutas administrativas

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/admin/productos` | Listado administrativo de productos. |
| `POST` | `/api/productos` | Crear un producto; acepta el campo de archivo `imagen`. |
| `PUT` | `/api/productos/:id` | Actualizar un producto; acepta opcionalmente `imagen`. |
| `PATCH` | `/api/productos/:id/estado` | Cambiar el estado de un producto. |
| `DELETE` | `/api/productos/:id` | Eliminar un producto. |
| `POST` | `/api/catalogo` | Crear un producto por la ruta heredada del catálogo. |
| `POST` | `/api/promociones` | Crear una promoción. |
| `PUT` | `/api/promociones/:id` | Actualizar una promoción. |
| `PATCH` | `/api/promociones/:id/estado` | Cambiar el estado de una promoción. |
| `DELETE` | `/api/promociones/:id` | Eliminar una promoción. |
| `GET` | `/api/admin/pedidos` | Listar pedidos. |
| `GET` | `/api/admin/pedidos/:id` | Consultar un pedido. |
| `PUT` | `/api/admin/pedidos/:id/confirmar` | Confirmar un pedido. |
| `PUT` | `/api/admin/pedidos/:id/rechazar` | Rechazar un pedido. |
| `PUT` | `/api/admin/pedidos/:id/cancelar` | Cancelar un pedido. |
| `PUT` | `/api/admin/pedidos/:id/estado` | Actualizar el estado de un pedido. |
| `GET` | `/api/users` | Listar usuarios. |
| `POST` | `/api/users` | Crear un usuario. |
| `DELETE` | `/api/users/:id` | Eliminar un usuario. |

Las rutas para crear y eliminar anuncios (`POST /api/anuncio` y
`DELETE /api/anuncio/:id`) también están disponibles bajo `/api`.

## Imágenes y archivos

Las imágenes de productos se envían como `multipart/form-data` en el campo
`imagen`. Se aceptan PNG, JPG, JPEG, JFIF, GIF, WebP y AVIF de hasta 5 MB. El
backend valida el tipo y el contenido del archivo antes de guardarlo.

- Con la integración de GitHub configurada, el backend guarda la imagen en el
  repositorio y registra en el producto la URL pública devuelta por GitHub. El
  repositorio debe ser público para que la imagen sea accesible públicamente.
- Sin variables `GITHUB_*`, las imágenes se guardan localmente y se sirven bajo
  `/uploads/productos/...`.
- Los comprobantes de pedido son independientes de las imágenes de productos:
  se reciben en el campo `comprobante`, se guardan en
  `UPLOADS_DIR/comprobantes` y se sirven bajo `/uploads/comprobantes/...`.
  También tienen un límite de 5 MB.

En Render u otro hosting con disco efímero, los archivos locales pueden
perderse al reiniciar o volver a desplegar el servicio. Configura un disco
persistente para los comprobantes, o utiliza almacenamiento persistente
adecuado para el entorno.

### Configurar GitHub para imágenes

Configura las cinco variables `GITHUB_*` en el entorno del backend. Crea un
token de acceso fino limitado al repositorio de imágenes, con permiso
**Contents: Read and write**. No expongas el token en el frontend ni lo
incluyas en el repositorio; guárdalo como secreto del servicio y rótalo si se
expone.

Si un producto ya tiene una URL absoluta y se edita sin seleccionar otra
imagen, se conserva su URL. Si se reemplaza una imagen, se actualiza el campo
`img` del producto; el archivo anterior en GitHub no se elimina.

## Seguridad y límites

- CORS permite el frontend desplegado en `https://sublime-gracia.netlify.app`
  y el entorno local `http://localhost:5173`, con credenciales habilitadas.
- Se aplica un límite general de 300 solicitudes por ventana de 15 minutos y
  un límite de 10 intentos de inicio de sesión por ventana de 15 minutos.
- Los archivos de carga y los datos JSON tienen un límite de 5 MB y 1 MB,
  respectivamente.
- Las imágenes estáticas se sirven desde `/uploads`.

## Pruebas

Ejecuta la prueba existente de almacenamiento de imágenes con Node.js:

```bash
node --test test/productImageStorage.test.js
```
