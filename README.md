# E-commerce Sublime Gracia — Fullstack Platform

Este repositorio alberga el ecosistema tecnológico completo de la tienda online **Sublime Gracia**, implementado bajo una arquitectura desacoplada y eficiente que divide las responsabilidades en dos módulos principales: Frontend y Backend.

---

## Estructura del Ecosistema

### 1. Frontend (`/frontend/sublime_gracia`)
Una Application moderna, fluida y altamente optimizada para la interacción del usuario y la gestión del negocio.

*   **Stack:** React, TypeScript, Vite, React Router, Oxlint.
*   **Características del Cliente:** Catálogo dinámico con filtros, sistema de opiniones/reseñas, carrito de compras persistente e interfaz para el checkout y seguimiento en tiempo real de pedidos.
*   **Módulo Administrativo:** Vistas protegidas para la gestión integral de productos, control de pedidos y administración de promociones/anuncios.
*   **Integración:** Conexión asíncrona a la API REST mediante variables de entorno (`VITE_API_URL`) y manejo avanzado de carritos a través del encabezado `X-Cart-Id` y cookies de sesión.

### ⚙️ 2. Backend (`/backend`)
Una API REST escalable, segura y estructurada que actúa como el motor central de datos y lógica del negocio.

*   **Stack:** Node.js (v20.6+), Express, Sequelize (ORM), PostgreSQL.
*   **Autenticación & Seguridad:** Control de acceso mediante tokens JWT firmados con validaciones estrictas para rutas y permisos administrativos (`role: admin`).
*   **Persistencia & Sesiones:** Gestión del estado del carrito vía `X-Cart-Id` y almacenamiento de datos relacionales en PostgreSQL.
*   **Gestión Híbrida de Medios:** Sistema flexible de carga de archivos que permite almacenar imágenes de productos de manera local en disco (`UPLOADS_DIR`) o integrarse directamente con la API de GitHub para persistencia en repositorios remotos.

---

## Requisitos del Sistema

*   **Node.js:** Versión compatible con Vite en el Frontend y versión **20.6 o posterior** en el Backend (para soporte nativo de `--env-file`).
*   **Gestor de paquetes:** `npm` activo.
*   **Base de Datos:** Instancia activa de **PostgreSQL** con una URL de conexión válida.

---

## Inicio Rápido en Desarrollo

### Configuración del Backend
1. Navega a la carpeta `/backend`.
2. Instala dependencias: `npm install`.
3. Duplica el archivo `.env.example` como `.env` y configura tus credenciales (`DATA_BASE_URL` y `JWT_SECRET`).
4. Inicia el servidor en modo *watch*: `npm run dev` (escucha por defecto en el puerto `3000`).

### Configuración del Frontend
1. Navega a la carpeta `/frontend/sublime_gracia`.
2. Instala dependencias: `npm install`.
3. Crea tu archivo `.env` local y define el origen de la API: `VITE_API_URL=http://localhost:3000` (asegúrate de que el Backend tenga configurado el CORS para permitir el origen de Vite `http://localhost:5173`).
4. Levanta el entorno local: `npm run dev`.

---

## Resumen de la API REST (`/api`)

*   **Públicas/Tienda:** Rutas para consumir información de inicio, historia, catálogo de productos, promociones, anuncios y envío de opiniones. Gestión del carrito (`GET`/`POST`/`PUT`/`DELETE` en `/api/cart`) y pasarela/creación de pedidos.
*   **Administrativas (Protegidas):** Rutas con prefijo `/api/admin/` y `/api/productos` para operaciones CRUD completas (crear, actualizar, mutar estados y eliminar registros), requiriendo un encabezado `Authorization: Bearer <token>`.
