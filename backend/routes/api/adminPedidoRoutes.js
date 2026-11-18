import { Router } from "express";

import {
    getPedidos,
    getPedido,
    getPedidoComprobante,
    confirmarPedido,
    rechazarPedido,
    cancelarPedido,
    actualizarEstadoPedido
} from "../../controllers/adminPedido.controller.js";

import { verifyAdmin, verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();

// =========================
// PEDIDOS DEL ADMIN
// =========================

// Obtener todos los pedidos
router.get(
    "/admin/pedidos",
    verifyToken, verifyAdmin,
    getPedidos
);

router.get(
    "/admin/pedidos/:id/comprobante",
    verifyToken, verifyAdmin,
    getPedidoComprobante
);

// Obtener un pedido
router.get(
    "/admin/pedidos/:id",
    verifyToken, verifyAdmin,
    getPedido
);

// Confirmar pedido
router.put(
    "/admin/pedidos/:id/confirmar",
    verifyToken, verifyAdmin,
    confirmarPedido
);

// Rechazar pedido
router.put(
    "/admin/pedidos/:id/rechazar",
    verifyToken, verifyAdmin,
    rechazarPedido
);

// Cancelar pedido
router.put(
    "/admin/pedidos/:id/cancelar",
    verifyToken, verifyAdmin,
    cancelarPedido
);

// Cambiar estado manualmente
router.put(
    "/admin/pedidos/:id/estado",
    verifyToken, verifyAdmin,
    actualizarEstadoPedido
);

export default router;
