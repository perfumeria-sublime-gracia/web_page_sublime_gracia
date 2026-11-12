import { Router } from 'express'
import inicio from './inicio.js'
import catalogo from './catalogo.js'
import historia from './historia.js'
import pagos from './pagos.js'
import pedidos from './pedido.js'
import carrito from './carrito.js'
import anuncio from './anuncio.js'
import reseñas from './reseñas.js'
import login from './login.js'
import admin from './admin.js'
import users from './userRoutes.js'
import adminPedidoRoutes from './adminPedidoRoutes.js'
import promociones from './promociones.js'
import productos from './productos.js'
import adminOperations from "./adminOperations.js";
import temporadas from "./temporadas.js";

const router = Router()

router.use('/api', inicio)
router.use('/api', catalogo)
router.use('/api', historia)
router.use('/api', pagos)
router.use('/api', pedidos)
router.use('/api', carrito)
router.use('/api', anuncio)
router.use('/api', reseñas)
router.use('/api/auth', login)
router.use('/api', promociones)
router.use('/api', productos)
router.use('/api', temporadas)
router.use('/api/', admin)
router.use('/api/', users)
router.use('/api/', adminPedidoRoutes)
router.use('/api/', adminOperations)

export default router